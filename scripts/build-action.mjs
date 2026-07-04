// ============================================================================
//  build-action.mjs — v3 "anchor <-> action"
// ----------------------------------------------------------------------------
//  Spine:
//   COLD OPEN (smooth)  -> ROAD TO LA banner
//   INITIAL GLITCH-STUTTER (~12s, sets the "action" tone; banner text fractures)
//   ANCHOR  = grey 211414 tack clip: smooth SLOW-MO, unglitched, slows to ~zero
//   ACTION  = everything else, glitched + sped up
//   ANCHOR recurs (smooth slow-mo) between action bursts
//   HERO money shot (slow-mo focus) inside action
//   CLOSER  = RM monogram (unchanged)
//
//  All clips are PLACEHOLDERS from SAILING MOVIE 1.mp4 — easy to swap later.
//  Output: NEW_MASTER.mp4 (1920x886/30fps) -> encode-trailer.mjs for grade+web.
// ============================================================================
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const SRC    = process.env.SRC || `${process.env.HOME}/Desktop/robbysailing-assets/masters/SAILING MOVIE 1.mp4`
const OUTDIR = resolve(process.env.OUTDIR || '.')
const SEGDIR = resolve(OUTDIR, 'segs')
const W = 1920, H = 886, FPS = 30

// ---- effect fragments ------------------------------------------------------
const rgb   = (px) => `rgbashift=rh=${px}:bh=${-px}`
const blocks = (n) => `scale=iw/${n}:-1:flags=neighbor,scale=${W}:${H}:flags=neighbor`
const roll  = (a) => `scroll=v=${a}`
const shake = (amp, sp) => `crop=iw-${amp*3}:ih-${amp*3}:x='${amp}+${amp}*sin(${sp}*t)':y='${amp}+${amp}*cos(${sp*1.2}*t)',scale=${W}:${H}`
const smear = `tmix=frames=3`
const FLASH_FX = `eq=brightness=0.82:contrast=1.25:saturation=0.12`

// ---- UPGRADED glitch burst (~6f, escalating intensity 1..3) -----------------
//  RGB tear -> big blocks -> flash -> opposite RGB + scanline roll -> datamosh smear
const glitchBurst = (lvl, src) => [
  { t:'frames', in:src,       frames:1, fx:rgb(16 + lvl*4),                     label:`glitch L${lvl} rgb` },
  { t:'frames', in:src+0.02,  frames:1, fx:blocks(Math.max(8, 14 - lvl*2)),     label:`glitch L${lvl} blocks` },
  { t:'flash',  in:src,       frames:1,                                         label:`glitch L${lvl} flash` },
  { t:'frames', in:src+0.03,  frames:2, fx:`${rgb(-(14 + lvl*4))},${roll(0.05 + lvl*0.01)}`, label:`glitch L${lvl} rgb+roll` },
  { t:'frames', in:src+0.05,  frames:1, fx:`${smear},${blocks(18)}`,            label:`glitch L${lvl} smear` },
]

// ---- stutter unit: replay the same 0.5s, then a glitch hit (record-skip) ----
const stutter = (lvl) => [
  { t:'clip', in:11.50, dur:0.50, speed:1.0, label:`stutter replay ${lvl}` },
  ...glitchBurst(lvl, 11.96),
]

// ============================================================================
//  THE FILM
// ============================================================================
const SHOTS = [
  // ---------- COLD OPEN (smooth) : title + hero boat, ROAD TO LA drops @10.5 ----------
  { t:'keep', in:0.0, out:11.50, label:'COLD OPEN smooth (banner drops 10.5)' },

  // ---------- INITIAL GLITCH-STUTTER (sets the action tone, banner up) ----------
  ...stutter(1),
  ...stutter(2),
  ...stutter(3),
  { t:'flash', in:11.98, frames:1, label:'hard cut -> anchor' },   // clean flash into the calm

  // ---------- ANCHOR #1 : grey tack, smooth SLOW-MO, decel to ~zero ----------
  { t:'clip', in:22.70, dur:0.90, speed:0.5,  smooth:true, label:'ANCHOR1 enter slow-mo' },
  { t:'clip', in:23.60, dur:0.55, speed:0.32, smooth:true, label:'ANCHOR1 slowing' },
  { t:'clip', in:24.15, dur:0.12, speed:0.08, smooth:true, label:'ANCHOR1 NEAR-ZERO (~1.5s near-freeze)' },

  // ---------- ACTION BURST 1 : sped up + glitched (accelerando out of the freeze) ----------
  { t:'clip', in:26.30, dur:0.80, speed:1.5, fx:rgb(5),                    label:'AB1 beach 1.5x' },
  { t:'clip', in:31.90, dur:0.50, speed:2.0, fx:blocks(12),               label:'AB1 planing 2x blocks' },
  { t:'clip', in:27.70, dur:0.40, speed:2.5, fx:`${rgb(10)},${shake(8,55)}`, label:'AB1 fleet 2.5x' },
  { t:'clip', in:37.30, dur:0.33, speed:3.0, fx:`${rgb(14)},${shake(10,60)}`, label:'AB1 wide 3x' },
  ...glitchBurst(2, 32.40),

  // ---------- ANCHOR #2 : grey tack returns, smooth slow-mo, unglitched ----------
  { t:'clip', in:24.35, dur:1.00, speed:0.4, smooth:true, label:'ANCHOR2 breather' },

  // ---------- ACTION BURST 2 : sped/glitched -> HERO money shot (slow-mo focus) ----------
  { t:'clip', in:40.30, dur:0.50, speed:2.0, fx:rgb(6),        label:'AB2 buoy 2x (orange pop)' },
  { t:'clip', in:30.50, dur:0.40, speed:2.5, fx:blocks(10),    label:'AB2 fleet 2.5x' },
  ...glitchBurst(2, 33.70),
  { t:'clip', in:33.85, dur:0.70, speed:0.4,  smooth:true, label:'HERO H1 hiking (1.75s)' },
  { t:'frames', in:38.60, frames:3, fx:rgb(6),            label:'HERO flash F1' },
  { t:'clip', in:34.55, dur:0.50, speed:0.4,  smooth:true, label:'HERO H2 (1.25s)' },
  { t:'frames', in:41.40, frames:2, fx:rgb(5),            label:'HERO flash F2a' },
  { t:'frames', in:37.60, frames:2, fx:rgb(8),            label:'HERO flash F2b' },
  { t:'clip', in:35.28, dur:0.36, speed:0.35, smooth:true, label:'HERO H3 MONEY lean-back (~1.0s)' },

  // ---------- ANCHOR #3 : brief return home -> resolve ----------
  { t:'clip', in:25.30, dur:0.55, speed:0.4, smooth:true, label:'ANCHOR3 brief' },
  { t:'clip', in:41.80, dur:0.90, speed:1.0,               label:'R1 buoy/222055 resolve' },
  { t:'frames', in:42.90, frames:2, fx:rgb(10),            label:'R2 chroma hand-off' },
  { t:'flash', in:35.48, frames:1,                         label:'R3 flash -> RM' },

  // ---------- CLOSER : RM monogram (unchanged) ----------
  { t:'keep', in:43.30, out:50.00, label:'CLOSER RM (unchanged)' },
]

// ---- render machinery ------------------------------------------------------
const NORM = `setsar=1,format=yuv420p`
const ENC  = ['-an','-c:v','libx264','-crf','12','-preset','medium','-pix_fmt','yuv420p','-r',String(FPS)]
const run  = (args) => execFileSync('ffmpeg', ['-y','-hide_banner','-loglevel','error',...args], { stdio:'inherit' })
const dur  = (p) => Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',p]).toString().trim())

rmSync(SEGDIR, { recursive:true, force:true }); mkdirSync(SEGDIR, { recursive:true })
const pad = (n) => String(n).padStart(3,'0')
const segPath = (i) => resolve(SEGDIR, `seg_${pad(i)}.mp4`)

function chainFor(s) {
  if (s.t === 'clip') {
    const pts = (1/s.speed).toFixed(4)
    const speedPart = (s.speed < 1 && s.smooth)
      ? `setpts=${pts}*PTS,minterpolate=fps=${FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1`
      : `setpts=${pts}*PTS,fps=${FPS}`
    return [speedPart, s.fx, `scale=${W}:${H}:force_original_aspect_ratio=disable`, NORM].filter(Boolean).join(',')
  }
  if (s.t === 'keep') return [`fps=${FPS}`, `scale=${W}:${H}`, NORM].join(',')
  const fx = s.t === 'flash' ? FLASH_FX : s.fx     // frames | flash
  return [`fps=${FPS}`, fx, `scale=${W}:${H}:force_original_aspect_ratio=disable`, NORM].filter(Boolean).join(',')
}

console.log(`Building ${SHOTS.length} shots -> segs/\n`)
SHOTS.forEach((s, i) => {
  const chain = chainFor(s), out = segPath(i)
  if (s.t === 'clip')      run(['-ss', String(s.in), '-t', String(s.dur), '-i', SRC, '-vf', chain, ...ENC, out])
  else if (s.t === 'keep') run(['-ss', String(s.in), '-t', String((s.out - s.in).toFixed(3)), '-i', SRC, '-vf', chain, ...ENC, out])
  else                     run(['-ss', String(s.in), '-i', SRC, '-vf', chain, '-frames:v', String(s.frames), ...ENC, out])
  console.log(`  ${pad(i)}  ${dur(out).toFixed(3)}s  ${s.label || ''}`)
})

// ---- concat (identical params -> clean stream copy) ------------------------
const order = SHOTS.map((_, i) => segPath(i))
const listFile = resolve(SEGDIR, 'concat.txt')
writeFileSync(listFile, order.map(p => `file '${p}'`).join('\n') + '\n')
const NEW = resolve(OUTDIR, 'NEW_MASTER.mp4')
try {
  run(['-f','concat','-safe','0','-i',listFile,'-c','copy','-movflags','+faststart', NEW])
} catch {
  console.log('  (copy concat failed — re-encoding)')
  const inputs = order.flatMap(p => ['-i', p])
  const fc = order.map((_, i) => `[${i}:v:0]`).join('') + `concat=n=${order.length}:v=1:a=0[o]`
  run([...inputs, '-filter_complex', fc, '-map', '[o]', ...ENC, '-movflags', '+faststart', NEW])
}

console.log(`\nNEW_MASTER.mp4  ${dur(NEW).toFixed(2)}s  ${(statSync(NEW).size/1048576).toFixed(1)}MB`)
console.log(`Next: FPS=30 node scripts/encode-trailer.mjs NEW_MASTER.mp4`)
