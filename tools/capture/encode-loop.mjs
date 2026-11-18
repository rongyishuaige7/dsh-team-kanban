#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const IMG2WEBP = process.env.IMG2WEBP || '/opt/homebrew/bin/img2webp';

const OUT_W = 960;
const OUT_H = 620;
const inDir = resolve('capture/loop');
const framesJsonPath = join(inDir, 'frames.json');
const framesDir = join(inDir, 'frames');
const outWebp = resolve('docs/assets/kanban-loop-v4.webp');

const frames = JSON.parse(readFileSync(framesJsonPath, 'utf8'));
console.log(`[EncodeLoop] Loaded ${frames.length} frames from ${framesJsonPath}`);

const targetFps = 20;
const targetDurationSec = 8.0;
const totalOutFrames = Math.round(targetFps * targetDurationSec); // 160 frames

const tmpDir = resolve('capture/loop/resampled');
rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });

const firstT = frames[0].t_ms;
const lastT = frames[frames.length - 1].t_ms;
const totalRecordedMs = lastT - firstT;
console.log(`[EncodeLoop] Capture duration: ${(totalRecordedMs / 1000).toFixed(2)}s, mapping to ${targetDurationSec}s (${totalOutFrames} frames @ ${targetFps}fps)`);

for (let outIdx = 0; outIdx < totalOutFrames; outIdx++) {
  const targetT = firstT + (outIdx / (totalOutFrames - 1)) * totalRecordedMs;
  let bestFrame = frames[0];
  let minDiff = Math.abs(frames[0].t_ms - targetT);
  for (let i = 1; i < frames.length; i++) {
    const diff = Math.abs(frames[i].t_ms - targetT);
    if (diff < minDiff) {
      minDiff = diff;
      bestFrame = frames[i];
    }
  }
  const srcNum = String(bestFrame.i).padStart(6, '0');
  const srcFile = join(framesDir, `${srcNum}.png`);
  const dstNum = String(outIdx).padStart(4, '0');
  copyFileSync(srcFile, join(tmpDir, `frame_${dstNum}.png`));
}

console.log(`[EncodeLoop] Resampled ${totalOutFrames} frames. Downscaling 2x -> ${OUT_W}x${OUT_H}...`);

const scaledDir = resolve('capture/loop/scaled');
rmSync(scaledDir, { recursive: true, force: true });
mkdirSync(scaledDir, { recursive: true });

execFileSync(FFMPEG, [
  '-y',
  '-i', join(tmpDir, 'frame_%04d.png'),
  '-vf', `scale=${OUT_W}:${OUT_H}:flags=lanczos`,
  '-pix_fmt', 'rgb24',
  join(scaledDir, 'scaled_%04d.png'),
]);

// Seamless 7-frame cross-dissolve (frames 154..160) from end state back into frame 1 (zero white flash!)
console.log(`[EncodeLoop] Applying seamless 7-frame cross-dissolve on frames 154-160...`);
const toRaw = (pngPath) => spawnSync(FFMPEG, ['-v', 'error', '-i', pngPath, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { maxBuffer: 1 << 26 }).stdout;
const fromRaw = (buf, outPng) => {
  spawnSync(FFMPEG, [
    '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${OUT_W}x${OUT_H}`, '-i', 'pipe:0', outPng,
  ], { input: buf });
};
const blend = (a, b, wA) => {
  const out = Buffer.alloc(a.length);
  const wB = 1 - wA;
  for (let i = 0; i < a.length; i++) out[i] = Math.round(a[i] * wA + b[i] * wB);
  return out;
};

const bufEnd = toRaw(join(scaledDir, 'scaled_0153.png'));
const bufStart = toRaw(join(scaledDir, 'scaled_0001.png'));
const weights = [0.86, 0.72, 0.57, 0.43, 0.28, 0.14, 0.04];
weights.forEach((wEnd, idx) => {
  const fNum = String(154 + idx).padStart(4, '0');
  fromRaw(blend(bufEnd, bufStart, wEnd), join(scaledDir, `scaled_${fNum}.png`));
});

mkdirSync(resolve('docs/assets'), { recursive: true });
const webpArgs = ['-loop', '0', '-mixed', '-q', '72', '-m', '6', '-d', '50'];
for (let i = 1; i <= totalOutFrames; i++) {
  webpArgs.push(join(scaledDir, `scaled_${String(i).padStart(4, '0')}.png`));
}
webpArgs.push('-o', outWebp);

console.log(`[EncodeLoop] Running img2webp -> ${outWebp}...`);
execFileSync(IMG2WEBP, webpArgs);
console.log(`[EncodeLoop] Done! Generated ${outWebp}`);
