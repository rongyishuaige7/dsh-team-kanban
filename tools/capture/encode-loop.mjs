#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const FFMPEG = '/Users/rongyi/.local/bin/ffmpeg';
const IMG2WEBP = '/opt/homebrew/bin/img2webp';

const inDir = resolve('capture/loop');
const framesJsonPath = join(inDir, 'frames.json');
const framesDir = join(inDir, 'frames');
const outWebp = resolve('docs/assets/kanban-loop-v3.webp');

const frames = JSON.parse(readFileSync(framesJsonPath, 'utf8'));
console.log(`[EncodeLoop] Loaded ${frames.length} frames from ${framesJsonPath}`);

const targetFps = 20;
const targetDurationSec = 8.0;
const totalOutFrames = Math.round(targetFps * targetDurationSec); // 160 frames

// Create temp workspace
const tmpDir = resolve('capture/loop/resampled');
rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });

// Resample frames based on timestamp
const firstT = frames[0].t_ms;
const lastT = frames[frames.length - 1].t_ms;
const totalRecordedMs = lastT - firstT;
console.log(`[EncodeLoop] Capture duration: ${(totalRecordedMs / 1000).toFixed(2)}s, mapping to ${targetDurationSec}s (${totalOutFrames} frames @ ${targetFps}fps)`);

for (let outIdx = 0; outIdx < totalOutFrames; outIdx++) {
  // Target time in real capture timeline
  const targetT = firstT + (outIdx / (totalOutFrames - 1)) * totalRecordedMs;
  
  // Find frame closest to targetT
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
  const dstFile = join(tmpDir, `frame_${dstNum}.png`);
  copyFileSync(srcFile, dstFile);
}

console.log(`[EncodeLoop] Resampled ${totalOutFrames} frames. Now scaling to 900x1000...`);

const scaledDir = resolve('capture/loop/scaled');
rmSync(scaledDir, { recursive: true, force: true });
mkdirSync(scaledDir, { recursive: true });

// Use ffmpeg to downscale 1800x2000 -> 900x1000 lanczos
execFileSync(FFMPEG, [
  '-y',
  '-i', join(tmpDir, 'frame_%04d.png'),
  '-vf', 'scale=900:1000:flags=lanczos',
  '-pix_fmt', 'rgb24',
  join(scaledDir, 'scaled_%04d.png')
]);

console.log(`[EncodeLoop] Scaled ${totalOutFrames} frames to 900x1000.`);

// Apply 0.35s (7 frames) loop fade: fade out to #f6f7f9 then fade into initial frame
console.log(`[EncodeLoop] Blending 0.35s loop transition on frames 154-160...`);
const toRaw = (pngPath) => spawnSync(FFMPEG, ['-i', pngPath, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1']).stdout;
const fromRaw = (buf, outPng) => {
  const proc = spawnSync(FFMPEG, [
    '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '900x1000', '-i', 'pipe:0', outPng
  ], { input: buf });
};

const bufEnd = toRaw(join(scaledDir, 'scaled_0153.png'));
const bufStart = toRaw(join(scaledDir, 'scaled_0001.png'));

const blank = Buffer.alloc(bufEnd.length);
for (let i = 0; i < blank.length; i += 3) {
  blank[i] = 246;     // R
  blank[i + 1] = 247; // G
  blank[i + 2] = 249; // B
}

const blend = (a, b, weightA) => {
  const out = Buffer.alloc(a.length);
  const wA = weightA;
  const wB = 1 - weightA;
  for (let i = 0; i < a.length; i++) {
    out[i] = Math.round(a[i] * wA + b[i] * wB);
  }
  return out;
};

// 154-156 fade out to blank
fromRaw(blend(bufEnd, blank, 0.70), join(scaledDir, 'scaled_0154.png'));
fromRaw(blend(bufEnd, blank, 0.40), join(scaledDir, 'scaled_0155.png'));
fromRaw(blend(bufEnd, blank, 0.15), join(scaledDir, 'scaled_0156.png'));
// 157 blank hold
fromRaw(blank, join(scaledDir, 'scaled_0157.png'));
// 158-160 fade in from blank to start
fromRaw(blend(bufStart, blank, 0.25), join(scaledDir, 'scaled_0158.png'));
fromRaw(blend(bufStart, blank, 0.60), join(scaledDir, 'scaled_0159.png'));
fromRaw(blend(bufStart, blank, 0.90), join(scaledDir, 'scaled_0160.png'));

console.log(`[EncodeLoop] Loop transition applied.`);

// Build img2webp args:
// img2webp -loop 0 -mixed -q 68 -m 6 -d 50 (50ms per frame = 20fps)
mkdirSync(resolve('docs/assets'), { recursive: true });

const webpArgs = [
  '-loop', '0',
  '-mixed',
  '-q', '68',
  '-m', '6',
  '-d', '50', // 50ms = 20fps
];

for (let i = 1; i <= totalOutFrames; i++) {
  const num = String(i).padStart(4, '0');
  webpArgs.push(join(scaledDir, `scaled_${num}.png`));
}

webpArgs.push('-o', outWebp);

console.log(`[EncodeLoop] Running img2webp to encode ${outWebp}...`);
execFileSync(IMG2WEBP, webpArgs);

console.log(`[EncodeLoop] Done! Generated ${outWebp}`);
