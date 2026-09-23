// ============================================================================
//  fetch-last-workout — ask Strava for Robby's latest workout (CI only).
// ============================================================================
//  Runs every 30 minutes in .github/workflows/workout.yml (see STRAVA.md):
//
//    0. prove STRAVA_SECRETS_PAT can write the Environment secret BEFORE
//       touching Strava, by re-saving the current refresh token (a rotation
//       in step 1 that the PAT can't save would kill the only working token),
//    1. trade the stored refresh token for an access token (Strava ROTATES the
//       refresh token; the new one is written straight back to the GitHub
//       Environment secret, because the old one dies the moment a new one is
//       issued),
//    2. read EVERY activity from the last WINDOW_DAYS (the whole span in which
//       the tile can show anything), keep the newest ELIGIBLE one (any
//       visibility per INCLUDE_PRIVATE, not a commute, 5+ minutes) and trim it
//       to the whitelist in
//       src/data/workoutSchema.js. Nothing eligible → activity: null, so an
//       activity later deleted (or marked as a commute) comes down on the
//       next run,
//    3. compare with what robbysailing.com is serving right now, and
//    4. tell the workflow `changed=true|false` plus `workout_b64` (the new file,
//       base64) on $GITHUB_OUTPUT. On `changed=true` the workflow dispatches
//       deploy.yml, which stages the file into dist/ (stage-last-workout.mjs).
//
//  The repo is PUBLIC, so its Action logs are too. This script never prints a
//  token, a secret or a Strava response body: the fresh access + refresh tokens
//  are ::add-mask::ed before anything else is written, HTTP failures log only
//  the status and Strava's errors[].code values, gh failures log only gh's
//  3-digit HTTP status, and the one summary line carries sport, duration and
//  the last 4 digits of the activity id.
//
//  Exit codes (a red run emails the owner, so only real breakage is red):
//    0  done, or a transient Strava/GitHub/network problem (::warning::,
//       changed=false)
//    1  needs the owner: STRAVA_SECRETS_PAT missing or unable to write the
//       secret (checked before Strava is contacted, so the refresh token
//       survives), refresh token rejected (re-run the STRAVA.md bootstrap),
//       activity:read_all scope missing, the rotated token couldn't be saved, or
//       Strava sent malformed JSON
//    2  refused: not in CI (a local token refresh would rotate the token CI
//       depends on). For a local dry run use --fixture <activities.json>.
//
//  Env: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN,
//  STRAVA_SECRETS_PAT (write-back; required once the three Strava secrets
//  are set, or nothing is sent to Strava), STRAVA_ENV (default 'strava'),
//  GITHUB_REPOSITORY, LIVE_URL, FORCE ('true' → changed=true). The mock test
//  may point STRAVA_OAUTH_BASE (default https://www.strava.com/oauth) and
//  STRAVA_API_BASE (default https://www.strava.com/api/v3) at http://127.0.0.1
//  or http://localhost; any other override is ignored.
//
//  Node 20, no dependencies.

import { appendFileSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import {
  fromStravaActivity,
  pickEligible,
  sameActivity,
  sanitizeWorkoutPayload,
  summarizeActivity,
} from '../src/data/workoutSchema.js'

const env = process.env
// The client hides a workout older than STALE_AFTER_DAYS (21, src/utils/
// lastWorkout.js), so these days are everything the tile could ever show; the
// extra day covers time zones (a workout just outside it is about to go stale
// anyway, so leaving it out only hides the tile a few hours early).
const WINDOW_DAYS = 22
// Strava's largest page. With `after` set Strava lists OLDEST first, so over
// 200 activities in WINDOW_DAYS (9 a day; not a real risk) would drop the
// newest ones onto a second page; that case logs a warning below.
const PER_PAGE = 200
const RETRY_DELAYS_MS = [2000, 6000] // 3 tries in all
const HTTP_TIMEOUT_MS = 15000
const DEFAULT_LIVE_URL = 'https://robbysailing.com/data/last-workout.json'
const TOKEN_RE = /^[A-Za-z0-9._~+/=-]{8,512}$/
// The GitHub Environment holding the secrets; its name goes into log lines
// only through a tight charset, like everything else this script logs.
const SECRETS_ENV = env.STRAVA_ENV || 'strava'
const SECRETS_ENV_LABEL = SECRETS_ENV.replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 40) || 'secrets'

// ---------------------------------------------------------------------------
// GitHub Actions plumbing
// ---------------------------------------------------------------------------
const log = (line) => process.stdout.write(`${line}\n`)
const notice = (msg) => log(`::notice::${msg}`)
const warning = (msg) => log(`::warning::${msg}`)
const error = (msg) => log(`::error::${msg}`)

function output(key, value) {
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `${key}=${value}\n`)
}

function stepSummary(line) {
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${line}\n`)
}

// Everything that ends a run without publishing goes through here.
function noChange(code) {
  output('changed', 'false')
  return code
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------
// HTTP helpers. Bodies are read as text and only ever parsed, never printed.
// ---------------------------------------------------------------------------
async function http(url, init = {}) {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) })
    const text = await res.text()
    return { status: res.status, ok: res.ok, text, type: res.headers.get('content-type') || '' }
  } catch {
    return { status: 0, ok: false, text: '', type: '' } // network error / timeout
  }
}

const transient = (r) => r.status === 0 || r.status >= 500

// Up to 3 tries (2 s, then 6 s apart) while the failure is transient.
async function httpWithRetry(url, init) {
  let r = await http(url, init)
  for (const ms of RETRY_DELAYS_MS) {
    if (!transient(r)) break
    await wait(ms)
    r = await http(url, init)
  }
  return r
}

function parseJson(text) {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return { ok: false, value: null }
  }
}

// Strava's error codes ('invalid', 'missing'…) are safe to log; the rest of
// the body is not. Stripped to a tight charset so nothing can smuggle a
// workflow command (::…) or a newline into the log.
function stravaCodes(text) {
  const { value } = parseJson(text)
  const errors = Array.isArray(value?.errors) ? value.errors : []
  const codes = errors
    .map((e) => String(e?.code ?? '').replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 40))
    .filter(Boolean)
    .slice(0, 5)
  return codes.length ? ` (codes: ${codes.join(', ')})` : ''
}

const describeHttp = (r) => (r.status === 0 ? 'network error or timeout' : `HTTP ${r.status}${stravaCodes(r.text)}`)

// A base-URL override is honoured only for a local mock server.
function localOverride(value, fallback, name) {
  if (!value) return fallback
  try {
    const u = new URL(value)
    if (u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost')) {
      return value.replace(/\/+$/, '')
    }
  } catch {
    // fall through
  }
  warning(`Ignoring ${name}: only http://127.0.0.1 or http://localhost overrides are allowed.`)
  return fallback
}

function liveUrl() {
  const value = env.LIVE_URL || DEFAULT_LIVE_URL
  try {
    const u = new URL(value)
    if (u.protocol === 'https:') return value
    if (u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost')) return value
  } catch {
    // fall through
  }
  warning('Ignoring LIVE_URL: it must be an https URL.')
  return DEFAULT_LIVE_URL
}

// ---------------------------------------------------------------------------
// Refresh-token write-back. `gh secret set` reads the value from STDIN (never
// argv, so it can't show up in a process list), with the owner's
// fine-grained PAT as GH_TOKEN. gh's stderr is only ever matched for its
// 'HTTP nnn' status, never printed: it could echo the request.
//   → { ok: true } | { ok: false, status: 401 | null, why: 'HTTP 401' |
//     'gh not available' | 'unknown' }
// ---------------------------------------------------------------------------
function ghFailure(r) {
  if (r.error?.code === 'ENOENT') return { ok: false, status: null, why: 'gh not available' }
  const m = /\bHTTP (\d{3})\b/.exec(String(r.stderr ?? ''))
  return m ? { ok: false, status: Number(m[1]), why: `HTTP ${m[1]}` } : { ok: false, status: null, why: 'unknown' }
}

// GitHub itself is down or throttling: nothing the owner has to fix.
const ghOutage = (f) => f.status !== null && (f.status >= 500 || f.status === 429)
// Worth another try: an outage, or no status at all (a timeout, say).
const ghTransient = (f) => ghOutage(f) || f.why === 'unknown'

async function saveRefreshToken(token) {
  const childEnv = {
    ...env,
    GH_TOKEN: env.STRAVA_SECRETS_PAT,
    GH_PROMPT_DISABLED: '1',
    GH_NO_UPDATE_NOTIFIER: '1',
  }
  for (const k of ['STRAVA_CLIENT_SECRET', 'STRAVA_REFRESH_TOKEN', 'STRAVA_SECRETS_PAT', 'GITHUB_TOKEN']) {
    delete childEnv[k]
  }
  const args = ['secret', 'set', 'STRAVA_REFRESH_TOKEN', '--env', SECRETS_ENV, '--repo', env.GITHUB_REPOSITORY]
  let fail
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = spawnSync('gh', args, {
      input: token,
      env: childEnv,
      stdio: ['pipe', 'ignore', 'pipe'],
      timeout: 30000,
    })
    if (!r.error && r.status === 0) return { ok: true }
    fail = ghFailure(r)
    if (!ghTransient(fail)) break // a 4xx or a missing gh won't fix itself
    if (attempt < 3) await wait(RETRY_DELAYS_MS[attempt - 1])
  }
  return fail
}

// ---------------------------------------------------------------------------
// What robbysailing.com serves right now.
//   { kind: 'ok', payload } | { kind: 'missing' } (404 or not a valid file)
//   | { kind: 'transient' } (anything else: don't redeploy on a blip)
// ---------------------------------------------------------------------------
async function readLive(url) {
  const r = await http(`${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`) // ?cb= skips the CDN cache
  if (r.status === 404) return { kind: 'missing' }
  if (!r.ok) return { kind: 'transient' }
  if (!r.type.includes('json')) return { kind: 'missing' }
  const { ok, value } = parseJson(r.text)
  const payload = ok ? sanitizeWorkoutPayload(value) : null
  return payload ? { kind: 'ok', payload } : { kind: 'missing' }
}

// ---------------------------------------------------------------------------
// --fixture <file>: offline dry run over a saved activities list.
// ---------------------------------------------------------------------------
function runFixture(file) {
  if (!file) {
    console.error('fetch-last-workout: --fixture needs a path to a JSON activities list')
    return 1
  }
  let list
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8'))
    list = Array.isArray(raw) ? raw : raw?.activities
  } catch {
    list = null
  }
  if (!Array.isArray(list)) {
    console.error('fetch-last-workout: the fixture must be a JSON array of Strava activities')
    return 1
  }
  const payload = fromStravaActivity(pickEligible(list), new Date())
  log(JSON.stringify(payload, null, 2))
  log(summarizeActivity(payload.activity))
  return 0
}

// ---------------------------------------------------------------------------
// The CI run.
// ---------------------------------------------------------------------------
async function main() {
  const argv = process.argv.slice(2)
  const fx = argv.indexOf('--fixture')
  if (fx !== -1) return runFixture(argv[fx + 1])

  if (!env.CI) {
    console.error(
      'fetch-last-workout: refusing to run outside CI. A local token refresh would rotate the Strava ' +
      'refresh token the scheduled workflow depends on. Dry run: --fixture <activities.json>. See STRAVA.md.'
    )
    return 2
  }

  const clientId = env.STRAVA_CLIENT_ID
  const clientSecret = env.STRAVA_CLIENT_SECRET
  const refreshToken = env.STRAVA_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) {
    notice('Strava not configured (STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET / STRAVA_REFRESH_TOKEN missing). See STRAVA.md.')
    return noChange(0)
  }

  const oauthBase = localOverride(env.STRAVA_OAUTH_BASE, 'https://www.strava.com/oauth', 'STRAVA_OAUTH_BASE')
  const apiBase = localOverride(env.STRAVA_API_BASE, 'https://www.strava.com/api/v3', 'STRAVA_API_BASE')
  const force = env.FORCE === 'true'

  // 0. Can the PAT save a rotated refresh token? Find out BEFORE Strava gets
  //    a chance to rotate it: a rotation that can't be saved kills the only
  //    working token and means redoing the whole bootstrap. The check re-saves
  //    the CURRENT token, an idempotent PUT: workout.yml's `strava`
  //    concurrency group runs one job at a time, so no other run can have
  //    rotated it since this job read it.
  if (!env.STRAVA_SECRETS_PAT) {
    error('STRAVA_SECRETS_PAT is not set, so a rotated refresh token could not be saved. Strava was not contacted; add the PAT, see STRAVA.md step 4.')
    return noChange(1)
  }
  if (!env.GITHUB_REPOSITORY) {
    error('GITHUB_REPOSITORY is not set, so a rotated refresh token could not be saved. Strava was not contacted.')
    return noChange(1)
  }
  const pre = await saveRefreshToken(refreshToken)
  if (!pre.ok && ghOutage(pre)) {
    warning(`GitHub could not save the ${SECRETS_ENV_LABEL} environment secret (${pre.why}); Strava was not contacted. Will try again next run.`)
    return noChange(0)
  }
  if (!pre.ok) {
    error(`STRAVA_SECRETS_PAT cannot write the ${SECRETS_ENV_LABEL} environment secret (${pre.why}), redo STRAVA.md step 4. Strava was not contacted, so the refresh token still works.`)
    return noChange(1)
  }

  // 1. Refresh. Form body, never the query string (query strings get logged).
  const tr = await httpWithRetry(`${oauthBase}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (tr.status === 400 || tr.status === 401) {
    error(`Strava rejected the refresh token: ${describeHttp(tr)}. Re-run the bootstrap, see STRAVA.md.`)
    return noChange(1)
  }
  if (transient(tr) || tr.status === 429) {
    warning(`Strava token refresh unavailable: ${describeHttp(tr)}. Will try again next run.`)
    return noChange(0)
  }
  if (!tr.ok) {
    error(`Strava token refresh failed: ${describeHttp(tr)}. See STRAVA.md.`)
    return noChange(1)
  }
  const tok = parseJson(tr.text).value
  const access = tok?.access_token
  const rotated = tok?.refresh_token
  if (typeof access !== 'string' || !TOKEN_RE.test(access) || typeof rotated !== 'string' || !TOKEN_RE.test(rotated)) {
    error('Strava token refresh returned malformed JSON.')
    return noChange(1)
  }
  // Mask BOTH fresh tokens before this run writes anything else.
  log(`::add-mask::${access}`)
  log(`::add-mask::${rotated}`)

  // 2. Strava rotated the refresh token: the old one is already dead, so
  //    saving the new one is not optional.
  if (rotated !== refreshToken) {
    const saved = await saveRefreshToken(rotated)
    if (!saved.ok) {
      error(`Strava rotated the refresh token and saving it failed (${saved.why}), so it is lost. Check STRAVA_SECRETS_PAT (STRAVA.md step 4), then redo step 3.`)
      return noChange(1)
    }
    log('Strava refresh token rotated and saved.')
  }

  // 3. Every activity since WINDOW_DAYS ago, in ONE request: that is the whole
  //    visible history for the span the tile can show, so an activity missing
  //    from it was made Only You or deleted and must not stay published.
  const after = Math.floor(Date.now() / 1000) - WINDOW_DAYS * 86400
  const ar = await httpWithRetry(`${apiBase}/athlete/activities?after=${after}&per_page=${PER_PAGE}`, {
    headers: { authorization: `Bearer ${access}` },
  })
  if (ar.status === 401 || ar.status === 403) {
    error(`Strava refused the activity list: ${describeHttp(ar)}. The activity:read_all scope is missing; re-run the bootstrap, see STRAVA.md.`)
    return noChange(1)
  }
  if (transient(ar) || ar.status === 429) {
    warning(`Strava activity list unavailable: ${describeHttp(ar)}. Will try again next run.`)
    return noChange(0)
  }
  if (!ar.ok) {
    error(`Strava activity list failed: ${describeHttp(ar)}.`)
    return noChange(1)
  }
  const parsed = parseJson(ar.text)
  if (!parsed.ok || !Array.isArray(parsed.value)) {
    error('Strava returned a malformed activity list.')
    return noChange(1)
  }
  const list = parsed.value
  if (list.length >= PER_PAGE) {
    warning(`Strava returned a full page (${PER_PAGE}) for the last ${WINDOW_DAYS} days; the newest activities may be on a later page.`)
  }
  const now = new Date()

  // pickEligible sorts newest first itself (with `after`, Strava lists oldest
  // first). Nothing eligible → activity: null; never carry the published one.
  const pick = pickEligible(list)
  const next = fromStravaActivity(pick, now)
  const why = pick ? `newest eligible activity in the last ${WINDOW_DAYS} days` : `nothing eligible in the last ${WINDOW_DAYS} days`

  // 4. Compare with the live site.
  const live = await readLive(liveUrl())
  const liveActivity = live.kind === 'ok' ? live.payload.activity : null

  let changed
  if (live.kind === 'transient') {
    changed = force
    if (!force) warning('Could not read the live last-workout.json; not redeploying on a blip.')
  } else if (live.kind === 'missing') {
    changed = true
  } else {
    changed = force || !sameActivity(liveActivity, next.activity)
  }

  output('changed', String(changed))
  output('workout_b64', Buffer.from(JSON.stringify(next)).toString('base64'))

  const line = `${summarizeActivity(next.activity)} changed=${changed}${force ? ' (forced)' : ''}`
  log(`${line} [${why}; live: ${live.kind}]`)
  stepSummary(`**Last workout:** ${line}  \n_${why}; live file: ${live.kind}_`)
  return 0
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch(() => {
    // Never print the exception: it could quote a response or a token.
    error('fetch-last-workout crashed unexpectedly.')
    output('changed', 'false')
    process.exitCode = 1
  })
