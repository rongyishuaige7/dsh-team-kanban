#!/usr/bin/env node
// 成片准入审计。核心是「稳像后残差」：先用 vidstab 把全局镜头运动抵消，
// 再看剩下多少真实变化——静态图推镜会掉到 0，真动效不会。
//
// 用法: node tools/audit/media-metrics.mjs <file.mp4> [--out=metrics.json] [--gate=film|loop]
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, statSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || 'ffprobe';
const W = 480, H = 270, CW = 460, CH = 250;

const GATES = {
  film: { fps: 60, dupMax: 0.5, stabMinShare: 25, maxDLuma: 40, minFrameLuma: 80, maxMB: 12 },
  loop: { fps: 20, dupMax: 5,   stabMinShare: 20, maxDLuma: 40, minFrameLuma: 80, maxMB: 3 },
};

const { values, positionals } = parseArgs({ options: { out: { type: 'string' }, gate: { type: 'string', default: 'film' }, manifest: { type: 'string' }, minLiveShare: { type: 'string', default: '50' } }, allowPositionals: true });
const file = positionals[0];
if (!file) { console.error('usage: node tools/audit/media-metrics.mjs <file> [--gate=film|loop] [--out=metrics.json]'); process.exit(1); }
const gate = GATES[values.gate] ?? GATES.film;

const run = (args, opts = {}) => {
  const r = spawnSync(args[0], args.slice(1), { maxBuffer: 1 << 30, ...opts });
  if (r.error) throw r.error;
  return r;
};

// --- probe -----------------------------------------------------------------
const probeJson = JSON.parse(run([FFPROBE, '-v', 'error', '-count_frames', '-select_streams', 'v:0',
  '-show_entries', 'stream=width,height,r_frame_rate:format=duration', '-of', 'json', file]).stdout.toString());
const s = probeJson.streams[0];
const [num, den] = s.r_frame_rate.split('/').map(Number);
const info = { width: s.width, height: s.height, fps: num / den, frames: 0,
  duration: Number(probeJson.format.duration), mb: +(statSync(file).size / 1048576).toFixed(2) };

// --- decode helpers --------------------------------------------------------
const decode = (vf, w, h) => {
  const r = run([FFMPEG, '-v', 'error', '-i', file, '-vf', vf, '-f', 'rawvideo', '-pix_fmt', 'gray', '-']);
  const buf = r.stdout;
  const n = Math.floor(buf.length / (w * h));
  return { buf, n, w, h };
};
const frameStats = ({ buf, n, w, h }, ref) => {
  const size = w * h, out = [];
  for (let i = 0; i < n; i++) {
    let sum = 0, luma = 0;
    const o = i * size, p = (i - 1) * size;
    for (let k = 0; k < size; k++) {
      const v = buf[o + k];
      luma += v;
      if (i > 0) { const d = v - (ref ? ref[p + k] : buf[p + k]); if (d > 8 || d < -8) sum++; }
    }
    out.push({ changed: i === 0 ? 100 : (sum / size) * 100, luma: luma / size });
  }
  return out;
};

const base = decode(`scale=${W}:${H}`, W, H);
info.frames = base.n;
const stats = frameStats(base, null);
const sorted = stats.slice(1).map(x => x.changed).sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)] ?? 0;

let dup = 0;
for (let i = 1; i < base.n; i++) {
  const o = i * W * H, p = (i - 1) * W * H;
  let same = true;
  for (let k = 0; k < W * H; k += 7) if (base.buf[o + k] !== base.buf[p + k]) { same = false; break; }
  if (same) dup++;
}

const lumas = stats.map(x => x.luma);
const maxDLuma = Math.max(...lumas.slice(1).map((v, i) => Math.abs(v - lumas[i])));

// --- stabilized residual ---------------------------------------------------
const tmp = mkdtempSync(join(tmpdir(), 'mm-'));
const trf = join(tmp, 't.trf');
run([FFMPEG, '-v', 'error', '-y', '-i', file, '-vf', `scale=${W}:${H},vidstabdetect=shakiness=10:accuracy=15:result=${trf}`, '-f', 'null', '-']);
const st = decode(`scale=${W}:${H},vidstabtransform=input=${trf}:smoothing=0:zoom=0:optzoom=0,crop=${CW}:${CH}`, CW, CH);
const stStats = frameStats(st, null);
const stChanged = stStats.slice(1).map(x => x.changed);
const stabShare = (stChanged.filter(v => v > 1).length / stChanged.length) * 100;

// --- verdict ---------------------------------------------------------------
const failures = [];
if (Math.abs(info.fps - gate.fps) > 0.1) failures.push(`fps ${info.fps} != ${gate.fps}`);
if (dup / info.frames * 100 > gate.dupMax) failures.push(`duplicate frames ${(dup / info.frames * 100).toFixed(1)}% > ${gate.dupMax}%`);
if (stabShare < gate.stabMinShare) failures.push(`stabilized residual share ${stabShare.toFixed(1)}% < ${gate.stabMinShare}% (看似有动效，其实是镜头在动)`);
if (maxDLuma > gate.maxDLuma) failures.push(`max frame ΔLuma ${maxDLuma.toFixed(1)} > ${gate.maxDLuma}`);
if (Math.min(...lumas) < gate.minFrameLuma) failures.push(`darkest frame luma ${Math.min(...lumas).toFixed(1)} < ${gate.minFrameLuma}`);
if (info.mb > gate.maxMB) failures.push(`size ${info.mb}MB > ${gate.maxMB}MB`);

// 出处清单才是真正拦得住「静态图 + 运镜」的判据：像素指标无法区分"界面在动"和"镜头在动"。
let liveShare = null;
if (values.manifest) {
  const man = JSON.parse(readFileSync(values.manifest, 'utf8'));
  const total = man.shots.reduce((a, s) => a + s.dur, 0);
  const live = man.shots.filter(s => s.kind === 'live').reduce((a, s) => a + s.dur, 0);
  liveShare = +((live / total) * 100).toFixed(1);
  if (liveShare < +values.minLiveShare) failures.push(`live footage share ${liveShare}% < ${values.minLiveShare}% (静态图当素材)`);
}

const metrics = {
  file: resolve(file), ...info,
  duplicateFrames: dup, duplicatePct: +((dup / info.frames) * 100).toFixed(2),
  changedMedianPct: +median.toFixed(2),
  changedMeanPct: +(sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(2),
  framesUnder0_5Pct: +((sorted.filter(v => v < 0.5).length / sorted.length) * 100).toFixed(1),
  maxFrameDLuma: +maxDLuma.toFixed(1),
  lumaMean: +(lumas.reduce((a, b) => a + b, 0) / lumas.length).toFixed(1),
  lumaMin: +Math.min(...lumas).toFixed(1),
  stabilizedResidualMedianPct: +[...stChanged].sort((a, b) => a - b)[Math.floor(stChanged.length / 2)].toFixed(2),
  stabilizedResidualShareOver1Pct: +stabShare.toFixed(1),
  liveFootageSharePct: liveShare,
  gate: values.gate, passed: failures.length === 0, failures,
};

if (values.out) writeFileSync(values.out, JSON.stringify(metrics, null, 2));
console.log(JSON.stringify(metrics, null, 2));
process.exit(failures.length ? 1 : 0);
