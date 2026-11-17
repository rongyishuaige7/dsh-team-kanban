import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const FF = process.env.FFMPEG || 'ffmpeg';
const SPEED = 20;
const [,, out, t0s, t1s, rateS = '0.33'] = process.argv;
const m = JSON.parse(readFileSync('capture/hero/frames.json', 'utf8'));
let prod = 0;
for (let i = 0; i < m.length; i++) {
  const next = m[i + 1] ? m[i + 1].t : m[i].t + 45;
  m[i].p0 = prod;
  prod += ((next - m[i].t) / 1000) / SPEED;
  m[i].p1 = prod;
}
const idxAt = (t) => { for (let i = 0; i < m.length; i++) if (m[i].p1 >= t) return i; return m.length - 1; };
const a = idxAt(+t0s), b = idxAt(+t1s);
const n = b - a + 1;
const dur = (m[b].p1 - m[a].p0) / +rateS;
const fps = n / dur;
console.log(`[${out}] frames ${a}..${b} (${n}) prod=${(m[b].p1-m[a].p0).toFixed(2)}s rate=${rateS} dur=${dur.toFixed(2)}s inFps=${fps.toFixed(1)}`);
execFileSync(FF, ['-y','-loglevel','error','-framerate', fps.toFixed(5), '-start_number', String(m[a].i),
  '-i', 'capture/hero/frames/%05d.jpg', '-t', (n / fps).toFixed(4),
  '-vf', 'scale=2160:1140:flags=lanczos,fps=60', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
  '-pix_fmt', 'yuv420p', `public/footage/${out}.mp4`], { stdio: 'inherit' });
