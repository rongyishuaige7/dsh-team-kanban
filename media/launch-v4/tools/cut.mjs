#!/usr/bin/env node
// 按产品时间切段并重采样到 60fps。
// 用法: node tools/cut.mjs <light|dark> <名字> <起> <止> [倍率]
// 帧率换算: 输入帧率 = 帧数 / 目标时长，再用 fps=60 滤镜真正重采样（只写 -r 60 只会改时间戳、把片段拉长）
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const FF = process.env.FFMPEG || 'ffmpeg';
const SPEED = 5;
const [,, name, out, t0s, t1s, rateS = '1'] = process.argv;
const dir = resolve('capture', name);
const m = JSON.parse(readFileSync(`${dir}/frames.json`, 'utf8'));

let prod = 0;
for (let i = 0; i < m.length; i++) {
  const next = m[i + 1] ? m[i + 1].t : m[i].t + 60;
  m[i].p0 = prod;
  prod += ((next - m[i].t) / 1000) / SPEED;
  m[i].p1 = prod;
}
const idxAt = t => { for (let i = 0; i < m.length; i++) if (m[i].p1 >= t) return i; return m.length - 1; };

const a = idxAt(+t0s), b = idxAt(+t1s);
const n = b - a + 1;
const dur = (m[b].p1 - m[a].p0) / +rateS;
const fps = n / dur;
console.log(`[${out}] frames ${a}..${b} (${n}) prod=${(m[b].p1 - m[a].p0).toFixed(2)}s rate=${rateS} dur=${dur.toFixed(2)}s inFps=${fps.toFixed(1)}`);
execFileSync(FF, [
  '-y', '-loglevel', 'error',
  '-framerate', fps.toFixed(5), '-start_number', String(m[a].i), '-i', `${dir}/frames/%05d.jpg`,
  '-t', (n / fps).toFixed(4),
  '-vf', 'scale=2160:1140:flags=lanczos,fps=60',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
  resolve('public/footage', `${out}.mp4`),
], { stdio: 'inherit' });
