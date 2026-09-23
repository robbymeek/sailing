# Last workout (Strava)

The home card shows Robby's most recent **public** Strava workout as one short
line, e.g. **Bike ride · 1h 12m**, with the official "Powered by Strava" mark.
The browser never talks to Strava. A scheduled GitHub Action reads Strava,
trims the activity to five harmless fields and redeploys the site with a tiny
static file, `/data/last-workout.json`.

```
Strava ──(every 30 min)──▶ workout.yml ──▶ scripts/fetch-last-workout.mjs
                                             │  PAT write-check (re-saves the current token)
                                             │  refresh token (rotated → saved back)
                                             │  every activity of the last 22 days → newest eligible
                                             │  compare with the live /data/last-workout.json
                                             ▼
                              changed? ──yes──▶ gh workflow run deploy.yml -f workout_b64=…
                                                   │
          push to main ──▶ deploy.yml ─────────────┤  npm run build
                                                   │  scripts/stage-last-workout.mjs → dist/data/last-workout.json
                                                   ▼
                                             GitHub Pages  ──▶  useLastWorkout() on the home card
```

## What gets published

Only this, ever (`src/data/workoutSchema.js` is the single gate for every
writer and reader):

```json
{ "v": 1, "source": "strava", "fetchedAt": "2026-09-23T15:17:04Z",
  "activity": { "id": "15938271650", "sportType": "Ride",
                "movingTimeS": 4310, "elapsedTimeS": 4622, "startDay": "2026-09-23" } }
```

No activity name, map, GPS points, heart rate, power, distance, speed, gear,
device, athlete or start time (only the local calendar day). The site never
links to the activity.

An activity is **eligible** only when all of these hold:

- visible to **Everyone** on Strava (`visibility: "everyone"`, not private). Followers-only and Only-You activities never show. If Strava ever stops sending the visibility field, nothing shows (fails closed).
- not marked as a **commute**
- at least **5 minutes** long

Each run reads every activity from the last **22 days** in one request (the
tile hides anything older than 21 days anyway; the extra day covers time zones)
and the newest eligible one wins. If the published one is later made
non-public or deleted, the next run replaces it with the next eligible one, or
with nothing: the site never keeps an activity Strava no longer lists as
public. The card hides the tile when there is nothing to show or the workout is
more than **21 days** old.

Duration: moving time for bike, run, walk, swim, row and paddle sports; elapsed
time for sailing, strength, mobility and everything else (a long wait between
races is still time on the water). Labels and icons: `src/data/sportTypes.js`.

## Cadence and latency

- `workout.yml` runs at **:17 and :47** every hour (off the top of the hour, when GitHub's scheduler is busiest), plus on demand.
- It only redeploys when the workout actually changed, so most runs take ~15 s and deploy nothing.
- Typical time from saving an activity on Strava to seeing it on the site: **15 to 35 minutes**. Worst case is about **1 hour**: GitHub can delay (occasionally skip) scheduled runs at busy times, and the redeploy itself takes 2 to 4 minutes.
- Every ordinary code deploy keeps the current workout: the stage step copies the live file forward (production is the last-known-good copy). If that read fails the placeholder ships, the tile hides, and the next Strava run notices and redeploys within ~30 minutes. The stage step can't fail a deploy either (it is `continue-on-error`; a broken import there leaves the placeholder, same outcome), and every PR's CI runs its self-test plus a fixture dry run of the fetch script, so a rename breaks the PR, not the deploy.

## One-time bootstrap (owner)

Everything below runs on your Mac in **zsh**. Secret values are typed at hidden
prompts and piped through stdin, so they never land in your shell history, on a
command line or in a file.

### 0. Let gh push workflow files

```zsh
gh auth refresh -h github.com -s workflow
```

### 1. Create the `strava` environment, restricted to `main`

GitHub → **sailing** repo → Settings → Environments → **New environment** →
name `strava` → Deployment branches and tags → **Selected branches and tags** →
add `main`. Or:

```zsh
gh api --method PUT repos/robbymeek/sailing/environments/strava \
  -F 'deployment_branch_policy[protected_branches]=false' \
  -F 'deployment_branch_policy[custom_branch_policies]=true'
gh api --method POST repos/robbymeek/sailing/environments/strava/deployment-branch-policies \
  -f name=main -f type=branch
```

Only workflow runs on `main` can read the secrets. (The job opts out of creating
a GitHub "deployment" every 30 minutes with `deployment: false`; the branch
restriction still applies.)

### 2. Create the Strava API application

<https://www.strava.com/settings/api>

- **Application Name:** anything that does NOT contain "Strava" (Strava's brand rules), e.g. `robbysailing.com`
- **Category:** Other (or Visualizer)
- **Website:** `https://robbysailing.com`
- **Authorization Callback Domain:** `localhost`

Keep the page open: you need its **Client ID** and **Client Secret** next.

### 3. Authorize, exchange the code, store the secrets

```zsh
R=robbymeek/sailing

# The app's Client ID and Client Secret (the secret is not echoed).
read "SID?Strava Client ID: "
read -s "SSECRET?Strava Client Secret: "; echo

# Approve in the browser, leaving the activities checkbox ticked.
# Strava then redirects to a localhost page that fails to load: that's expected.
# Check its address bar shows scope=read,activity:read and copy the code= value.
open "https://www.strava.com/oauth/authorize?client_id=${SID}&response_type=code&redirect_uri=http://localhost/exchange_token&approval_prompt=force&scope=read,activity:read"
read -s "SCODE?code= value from the address bar: "; echo

# Exchange the code. The form is built by zsh's printf builtin and fed to curl
# on stdin, so no secret appears on a command line.
SJSON=$(printf 'client_id=%s&client_secret=%s&code=%s&grant_type=authorization_code' \
  "$SID" "$SSECRET" "$SCODE" | curl -sS https://www.strava.com/oauth/token -d @-)
SREFRESH=$(print -rn -- "$SJSON" | node -e '
  let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
    let j = {}; try { j = JSON.parse(s) } catch {}
    if (!j.refresh_token) { console.error("Exchange failed: " + (j.message || "no refresh_token")); process.exit(1) }
    process.stdout.write(j.refresh_token)
  })')

# Store all three in the strava environment (values go in on stdin).
if [[ -n $SREFRESH ]]; then
  print -rn -- "$SID"      | gh secret set STRAVA_CLIENT_ID     --env strava --repo $R
  print -rn -- "$SSECRET"  | gh secret set STRAVA_CLIENT_SECRET --env strava --repo $R
  print -rn -- "$SREFRESH" | gh secret set STRAVA_REFRESH_TOKEN --env strava --repo $R
fi
unset SID SSECRET SCODE SJSON SREFRESH
```

If the exchange prints "Exchange failed", the code was already used or is more
than a few minutes old: run the `open` line again and redo the rest.

### 4. The write-back token (STRAVA_SECRETS_PAT)

Strava **rotates** the refresh token every few hours (access tokens last 6
hours) and the old one stops working the moment a new one is issued. The
workflow saves the new one back into the `strava` environment, which the
built-in Actions token cannot do, so it needs a fine-grained personal access
token that can do only that:

GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate new token
(<https://github.com/settings/personal-access-tokens/new>)

- **Resource owner:** robbymeek
- **Expiration:** the longest offered; put a reminder in the calendar a week before it
- **Repository access:** Only select repositories → `robbymeek/sailing`
- **Repository permissions:** **Environments: Read and write**. That's the exact permission GitHub documents for `PUT /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}` (and read covers the environment public-key lookup `gh secret set` does first). **Metadata: Read-only** is added automatically. Nothing else: no Secrets, Contents, Actions or Workflows permission.

```zsh
read -s "PAT?Fine-grained PAT: "; echo
print -rn -- "$PAT" | gh secret set STRAVA_SECRETS_PAT --env strava --repo robbymeek/sailing
unset PAT
```

Every run proves the PAT works **before** it contacts Strava, by re-saving the
current refresh token into the environment (an idempotent write). If the PAT is
missing, expired or lacks the permission, the run goes red and Strava is never
asked for a new token, so the stored refresh token keeps working and fixing the
PAT is all it takes. (A scheduled run that fires between steps 3 and 4 fails
this way too; that's harmless.)

### 5. Strava privacy check

The site only ever shows sport, duration and day, but an activity is eligible
only when it's public on Strava, so the activity page itself is public too:

- **Privacy zones** (Settings → Privacy Controls → Map Visibility): hide the start and end around home and anywhere else you sleep.
- **Heart rate:** hide it from others in Strava's privacy controls if you'd rather it wasn't public.
- **Activities:** only activities visible to **Everyone** can appear on the site. Use Followers or Only You for anything you don't want there, and mark commutes as Commute.

### 6. First run

Once `workout.yml` and the updated `deploy.yml` are on `main`:

```zsh
gh workflow run workout.yml --repo robbymeek/sailing -f force=true
sleep 5
gh run watch --repo robbymeek/sailing $(gh run list --repo robbymeek/sailing --workflow workout.yml --limit 1 --json databaseId -q '.[0].databaseId')
curl -s https://robbysailing.com/data/last-workout.json   # after the deploy it triggers finishes
```

The run's summary shows one line, e.g. `Ride 1h 12m id …1650 changed=true`.

## Day to day

Nothing. A green run is normal, including one with a warning annotation (a
Strava, GitHub or network blip, e.g. "GitHub could not save the strava
environment secret (HTTP 503)"; Strava is left alone and the next run retries on
its own). A red (failed) run emails you and always means something below needs
a human.

## Recovery

| Red run says | Do this |
| --- | --- |
| STRAVA_SECRETS_PAT is not set | Add it (step 4). Strava was not contacted, so the refresh token is fine. |
| STRAVA_SECRETS_PAT cannot write the strava environment secret (HTTP nnn) | Make a new PAT and store it (step 4); nothing else. Strava was not contacted, so the refresh token is fine. **401**: the PAT expired or was revoked. **403**: it lacks **Environments: Read and write**. **404**: its repository access doesn't include `robbymeek/sailing`, or the `strava` environment is gone (step 1). `gh not available` or `unknown` (no HTTP status; gh's own error text is never logged, since it could echo the input): re-run the workflow once; if it repeats, check that the `ubuntu-latest` runner image still ships `gh`. |
| Strava rejected the refresh token | Redo step 3 (authorize, exchange, store). Happens if the app's access was revoked on Strava or the stored token was lost. |
| The activity:read scope is missing | Redo step 3 and leave the activities checkbox ticked on the Strava approval page. |
| Strava rotated the refresh token and saving it failed (…), so it is lost | Rare now that the PAT is checked first (it passed seconds earlier, so this is GitHub failing mid-run or the PAT revoked in between). The new refresh token was lost and the old one is dead. If the status is 401, 403 or 404, redo step 4 first; then redo step 3. |
| Malformed JSON | A Strava outage returning junk. If it repeats for hours, check <https://status.strava.com>. |

**Workflow stopped running.** GitHub disables scheduled workflows in public
repos after 60 days without repository activity (it emails a warning first).
Turn it back on:

```zsh
gh workflow enable workout.yml --repo robbymeek/sailing
```

**Something looks wrong on the site.** `gh run list --repo robbymeek/sailing --workflow workout.yml`
shows recent runs; open one for its one-line summary.

## Kill switch

- **Stop updates:** `gh workflow disable workout.yml --repo robbymeek/sailing`. The last workout stays up and the tile hides by itself 21 days after that workout's day.
- **Hide it now:** disable the workflow first (otherwise the next run puts the workout back), then deploy the empty placeholder:
  ```zsh
  gh workflow run deploy.yml --repo robbymeek/sailing --ref main \
    -f workout_b64=$(printf '%s' '{"v":1,"source":"strava","fetchedAt":null,"activity":null}' | base64)
  ```
  Later code deploys keep it empty (they copy the live file forward).
- **Cut Strava off entirely:** revoke the app at <https://www.strava.com/settings/apps> (kills the refresh token), then `gh secret delete STRAVA_REFRESH_TOKEN --env strava --repo robbymeek/sailing`. Without secrets the workflow just logs "Strava not configured" and exits green.

## Local development

- Preview the tile without any network (dev server only): `?workout=Ride:4310`, `?workout=Sail:7260`, `?workout=WeightTraining:3000`, `?workout=none`, a third part for "days ago" (`?workout=Run:2880:30` shows the stale case), `?workout=error`, `?workout=loading`.
- Pipeline self-test (offline): `node scripts/stage-last-workout.mjs --self-test`
- Dry-run the picker on a saved activities list: `node scripts/fetch-last-workout.mjs --fixture activities.json`. The checked-in `scripts/fixtures/strava-activities.json` (fake data: one public ride among a followers-only run, a private swim, a commute and a 2-minute walk) prints the ride. CI runs both of these on every PR.
- **Never** run `fetch-last-workout.mjs` for real on your Mac (it refuses without `CI`). A local token refresh would rotate the refresh token and break the scheduled workflow until step 3 is redone.

## Strava API agreement and branding

Showing the owner's own activity data on his own site through the API sits in
a gray area of the Strava API Agreement; the owner reviewed it and accepted
that. To stay inside the brand guidelines
(<https://developers.strava.com/guidelines/>):

- The official **Powered by Strava** logo is shown next to the tile, **unmodified** and never more prominent than the site's own name/logo. Files: `public/brand/powered-by-strava.svg` (black text + orange mark, for light backgrounds; the default) and `public/brand/powered-by-strava-black.svg` (all black). Both are copied byte for byte from Strava's official logo set, `1.2-Strava-API-Logos/Powered by Strava/pwrdBy_strava_orange/api_logo_pwrdBy_strava_horiz_orange.svg` and `…/pwrdBy_strava_black/api_logo_pwrdBy_strava_horiz_black.svg`, downloaded Sep 23 2026 from <https://developers.strava.com/downloads/1.2-Strava-API-Logos.zip> (linked from the guidelines page, section 1.2).
- No link to the activity (so no "View on Strava" link is needed), and the Strava API app's name does not contain "Strava".
- Rate use is tiny: 2 requests per run, 96 a day, far under Strava's default limits.

## Files

| File | Role |
| --- | --- |
| `.github/workflows/workout.yml` | the 30-minute check (environment `strava`) |
| `.github/workflows/deploy.yml` | Pages deploy; `workflow_dispatch` input `workout_b64` + the stage step (`continue-on-error`) |
| `.github/workflows/ci.yml` | PR check: build, then the stage self-test and the fetch fixture dry run |
| `scripts/fetch-last-workout.mjs` | CI only: PAT write-check, refresh, rotate/save, pick, compare, outputs |
| `scripts/stage-last-workout.mjs` | deploy step (never fails a deploy) + `--self-test` |
| `scripts/fixtures/strava-activities.json` | fake activities list for the fixture dry run |
| `src/data/workoutSchema.js` | the whitelist: pick, trim, sanitize, compare |
| `src/data/sportTypes.js` | Strava sport → label, icon, duration basis |
| `src/utils/lastWorkout.js` | `useLastWorkout()` for the card |
| `public/data/last-workout.json` | the empty placeholder |
| `public/brand/powered-by-strava*.svg` | official Strava API logos |
