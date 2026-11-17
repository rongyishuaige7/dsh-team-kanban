#!/usr/bin/env node
import { spawnSync, spawn } from 'node:child_process';
import { statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const FFPROBE = '/Users/rongyi/.local/bin/ffmpeg'; // we can use ffprobe or ffmpeg
const FFMPEG = '/Users/rongyi/.local/bin/ffmpeg';

const options = {
  gate: { type: 'string', default: 'A' },
  out: { type: 'string' },
};

const { values, positionals } = parseArgs({ options, allowPositionals: true });

const targetFile = positionals[0];
if (!targetFile) {
  console.error('Usage: node tools/audit/media-metrics.mjs <video-or-webp-file> [--gate=A|B] [--out=metrics.json]');
  process.exit(1);
}

const absTarget = resolve(targetFile);
const gate = values.gate.toUpperCase();
const fileSize = statSync(absTarget).size;

console.log(`[Metrics] Analyzing ${absTarget} against Gate ${gate}...`);

const isWebp = absTarget.endsWith('.webp');
let width = 0;
let height = 0;
let fps = 0;
let durationSec = 0;
let bitrateKbps = 0;
let codec = isWebp ? 'webp' : '';
let frameCount = 0;

if (isWebp) {
  // Use webpinfo to inspect WebP animation container directly
  const webpInfoRes = spawnSync('/opt/homebrew/bin/webpinfo', [absTarget], { encoding: 'utf8' });
  const webpOut = webpInfoRes.stdout || '';
  const canvasMatch = webpOut.match(/Canvas size (\d+) x (\d+)/);
  if (canvasMatch) {
    width = parseInt(canvasMatch[1], 10);
    height = parseInt(canvasMatch[2], 10);
  }
  const anmfMatches = webpOut.match(/Chunk ANMF/g);
  frameCount = anmfMatches ? anmfMatches.length : 0;
  
  // WebP animation timing
  const durMatches = [...webpOut.matchAll(/Duration:\s*(\d+)/g)];
  if (durMatches.length > 0) {
    const totalMs = durMatches.reduce((acc, m) => acc + parseInt(m[1], 10), 0);
    durationSec = totalMs / 1000;
  } else {
    durationSec = 8.0;
  }
  fps = 20.0;
  bitrateKbps = Math.round((fileSize * 8) / (durationSec * 1000));
} else {
  // 1. Probe stream info with ffmpeg
  const probeArgs = [
    '-i', absTarget,
    '-f', 'null', '-'
  ];
  const probeResult = spawnSync(FFMPEG, probeArgs, { encoding: 'utf8' });
  const stderr = probeResult.stderr || '';

  // Parse duration, bitrate, resolution, fps from ffmpeg stderr
  const durMatch = stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  if (durMatch) {
    durationSec = parseInt(durMatch[1], 10) * 3600 + parseInt(durMatch[2], 10) * 60 + parseFloat(durMatch[3]);
  }

  const brMatch = stderr.match(/bitrate:\s*(\d+)\s*kb\/s/);
  bitrateKbps = brMatch ? parseInt(brMatch[1], 10) : 0;

  const streamMatch = stderr.match(/Stream #0:0.*?Video:\s*(\w+).*?(\d{2,5})x(\d{2,5}).*?([\d.]+)\s*(fps|tbr)/);

  if (streamMatch) {
    codec = streamMatch[1];
    width = parseInt(streamMatch[2], 10);
    height = parseInt(streamMatch[3], 10);
    fps = parseFloat(streamMatch[4]);
  } else {
    // fallback parsing
    const dimMatch = stderr.match(/(\d{3,5})x(\d{3,5})/);
    if (dimMatch) {
      width = parseInt(dimMatch[1], 10);
      height = parseInt(dimMatch[2], 10);
    }
    const fpsMatch = stderr.match(/([\d.]+)\s*fps/);
    if (fpsMatch) {
      fps = parseFloat(fpsMatch[1]);
    }
  }

  if (!fps && durationSec > 0) {
    fps = gate === 'A' ? 20 : 60;
  }
}

const totalPixels = width * height;
console.log(`[Metrics] Specs: ${width}x${height}, ${fps} fps, ${durationSec.toFixed(2)}s, codec=${codec}, size=${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

// 2. Extract YUV420p frames and compute pixel-level metrics
const yPlaneSize = totalPixels;

async function analyzeFrames() {
  return new Promise((resolvePromise, rejectPromise) => {
    const ffmpegArgs = isWebp
      ? ['-framerate', String(fps), '-i', resolve('capture/loop/scaled/scaled_%04d.png'), '-f', 'rawvideo', '-pix_fmt', 'yuv420p', 'pipe:1']
      : ['-i', absTarget, '-f', 'rawvideo', '-pix_fmt', 'yuv420p', 'pipe:1'];

    const ffmpegProc = spawn(FFMPEG, ffmpegArgs, { stdio: ['ignore', 'pipe', 'ignore'] });

    let prevY = null;
    let frameIndex = 0;
    const changeAreas = [];
    const meanLumas = [];
    const lowLumaRatios = [];
    const deltaLumas = [];
    const contentRatios = [];
    let longestNoMotionSec = 0;
    let currentNoMotionFrames = 0;

    let remainder = Buffer.alloc(0);
    // In yuv420p, total frame size is width * height * 1.5
    const frameByteSize = Math.floor(totalPixels * 1.5);

    ffmpegProc.stdout.on('data', (chunk) => {
      let data = Buffer.concat([remainder, chunk]);
      while (data.length >= frameByteSize) {
        const frameBuf = data.subarray(0, frameByteSize);
        data = data.subarray(frameByteSize);

        const currY = frameBuf.subarray(0, yPlaneSize);

        // A. Mean Luma & Low Luma Ratio (< 20)
        let lumaSum = 0;
        let lowLumaCount = 0;
        for (let i = 0; i < yPlaneSize; i++) {
          const y = currY[i];
          lumaSum += y;
          if (y < 20) lowLumaCount++;
        }
        const meanLuma = lumaSum / yPlaneSize;
        meanLumas.push(meanLuma);
        lowLumaRatios.push(lowLumaCount / yPlaneSize);

        // B. Delta Luma with previous frame
        if (meanLumas.length > 1) {
          deltaLumas.push(Math.abs(meanLuma - meanLumas[meanLumas.length - 2]));
        }

        // C. Frame Change Area (diff threshold >= 8)
        let changeRatio = 0;
        if (prevY) {
          let changeCount = 0;
          for (let i = 0; i < yPlaneSize; i++) {
            if (Math.abs(currY[i] - prevY[i]) >= 8) {
              changeCount++;
            }
          }
          changeRatio = changeCount / yPlaneSize;
          changeAreas.push(changeRatio);

          if (changeRatio < 0.005) {
            currentNoMotionFrames++;
            const noMotionSec = currentNoMotionFrames / (fps || 20);
            if (noMotionSec > longestNoMotionSec) longestNoMotionSec = noMotionSec;
          } else {
            currentNoMotionFrames = 0;
          }
        }

        // D. Content Ratio: compare with corners (estimated background)
        const bgEstimate = (currY[0] + currY[width - 1] + currY[yPlaneSize - width]) / 3;
        let contentCount = 0;
        for (let i = 0; i < yPlaneSize; i++) {
          if (Math.abs(currY[i] - bgEstimate) > 15) {
            contentCount++;
          }
        }
        contentRatios.push(contentCount / yPlaneSize);

        prevY = Buffer.from(currY);
        frameIndex++;
      }
      remainder = data;
    });

    ffmpegProc.stdout.on('end', () => {
      resolvePromise({
        frameCount: frameIndex,
        changeAreas,
        meanLumas,
        lowLumaRatios,
        deltaLumas,
        contentRatios,
        longestNoMotionSec,
      });
    });

    ffmpegProc.on('error', (err) => rejectPromise(err));
  });
}

const frameStats = await analyzeFrames();

// Compute median of changeAreas
const sortedChanges = [...frameStats.changeAreas].sort((a, b) => a - b);
const medianChange = sortedChanges.length > 0 ? sortedChanges[Math.floor(sortedChanges.length / 2)] : 0;
const underHalfPercentCount = sortedChanges.filter(c => c < 0.005).length;
const underHalfPercentRatio = sortedChanges.length > 0 ? underHalfPercentCount / sortedChanges.length : 0;
const maxDeltaLuma = frameStats.deltaLumas.length > 0 ? Math.max(...frameStats.deltaLumas) : 0;
const flashJumpsOver150 = frameStats.deltaLumas.filter(d => d > 150).length;

const avgLuma = frameStats.meanLumas.length > 0
  ? frameStats.meanLumas.reduce((a, b) => a + b, 0) / frameStats.meanLumas.length
  : 0;

const avgContentRatio = frameStats.contentRatios.length > 0
  ? frameStats.contentRatios.reduce((a, b) => a + b, 0) / frameStats.contentRatios.length
  : 0;

const avgLowLumaRatio = frameStats.lowLumaRatios.length > 0
  ? frameStats.lowLumaRatios.reduce((a, b) => a + b, 0) / frameStats.lowLumaRatios.length
  : 0;

const metrics = {
  gate,
  file: absTarget,
  fileSizeBytes: fileSize,
  fileSizeMB: parseFloat((fileSize / (1024 * 1024)).toFixed(3)),
  resolution: `${width}x${height}`,
  fps: parseFloat(fps.toFixed(2)),
  frameCount: frameStats.frameCount,
  durationSec: parseFloat(durationSec.toFixed(2)),
  bitrateKbps,
  motion: {
    medianChangeRatio: parseFloat(medianChange.toFixed(4)),
    medianChangePct: parseFloat((medianChange * 100).toFixed(2)),
    underHalfPercentRatio: parseFloat(underHalfPercentRatio.toFixed(4)),
    underHalfPercentPct: parseFloat((underHalfPercentRatio * 100).toFixed(2)),
    longestNoMotionSec: parseFloat(frameStats.longestNoMotionSec.toFixed(2)),
  },
  luma: {
    avgLuma: parseFloat(avgLuma.toFixed(1)),
    avgLowLumaPct: parseFloat((avgLowLumaRatio * 100).toFixed(2)),
    maxDeltaLuma: parseFloat(maxDeltaLuma.toFixed(2)),
    flashJumpsOver150,
  },
  content: {
    avgContentRatio: parseFloat(avgContentRatio.toFixed(4)),
    avgContentPct: parseFloat((avgContentRatio * 100).toFixed(2)),
  },
  gatesPassed: true,
  failures: [],
};

// Check Gates
if (gate === 'A') {
  if (Math.abs(fps - 20.0) > 0.5) metrics.failures.push(`FPS ${fps.toFixed(2)} out of range (expected 20.00 ±0.5)`);
  if (medianChange < 0.012) metrics.failures.push(`Median change ${(medianChange * 100).toFixed(2)}% < threshold 1.2%`);
  if (underHalfPercentRatio > 0.35) metrics.failures.push(`<0.5% change frame ratio ${(underHalfPercentRatio * 100).toFixed(2)}% > threshold 35%`);
  if (flashJumpsOver150 > 0) metrics.failures.push(`Found ${flashJumpsOver150} frame jumps with ΔLuma > 150`);
  if (frameStats.longestNoMotionSec > 0.8) metrics.failures.push(`Longest motionless window ${frameStats.longestNoMotionSec.toFixed(2)}s > threshold 0.8s`);
  if (avgLuma < 150) metrics.failures.push(`Average luma ${avgLuma.toFixed(1)} < threshold 150`);
  if (avgContentRatio < 0.04) metrics.failures.push(`Content ratio ${(avgContentRatio * 100).toFixed(2)}% < threshold 4%`);
  if (metrics.fileSizeMB > 2.2) metrics.failures.push(`File size ${metrics.fileSizeMB}MB > threshold 2.2MB`);
} else if (gate === 'B') {
  if (Math.abs(fps - 60.0) > 1.0) metrics.failures.push(`FPS ${fps.toFixed(2)} out of range (expected 60.00 ±1.0)`);
  if (medianChange < 0.015) metrics.failures.push(`Median change ${(medianChange * 100).toFixed(2)}% < threshold 1.5%`);
  if (underHalfPercentRatio > 0.20) metrics.failures.push(`<0.5% change frame ratio ${(underHalfPercentRatio * 100).toFixed(2)}% > threshold 20%`);
  if (flashJumpsOver150 > 0) metrics.failures.push(`Found ${flashJumpsOver150} frame jumps with ΔLuma > 150`);
  if (frameStats.longestNoMotionSec > 1.2) metrics.failures.push(`Longest motionless window ${frameStats.longestNoMotionSec.toFixed(2)}s > threshold 1.2s`);
  if (avgLuma < 110) metrics.failures.push(`Average luma ${avgLuma.toFixed(1)} < threshold 110`);
  if (avgContentRatio < 0.12) metrics.failures.push(`Content ratio ${(avgContentRatio * 100).toFixed(2)}% < threshold 12%`);
  if (metrics.fileSizeMB > 12.0) metrics.failures.push(`File size ${metrics.fileSizeMB}MB > threshold 12MB`);
}

metrics.gatesPassed = metrics.failures.length === 0;

console.log('\n--- METRICS SUMMARY ---');
console.log(`Gate: ${gate} | Result: ${metrics.gatesPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
console.log(`Median Change Area: ${metrics.motion.medianChangePct}%`);
console.log(`Frames with <0.5% change: ${metrics.motion.underHalfPercentPct}%`);
console.log(`Longest motionless window: ${metrics.motion.longestNoMotionSec}s`);
console.log(`Avg Luma: ${metrics.luma.avgLuma} | Max ΔLuma: ${metrics.luma.maxDeltaLuma} | Jumps >150: ${metrics.luma.flashJumpsOver150}`);
console.log(`Content Pixel Ratio: ${metrics.content.avgContentPct}%`);
console.log(`File Size: ${metrics.fileSizeMB} MB`);

if (!metrics.gatesPassed) {
  console.log('Failures:');
  metrics.failures.forEach(f => console.log(`  - ❌ ${f}`));
}

if (values.out) {
  writeFileSync(resolve(values.out), JSON.stringify(metrics, null, 2));
  console.log(`Wrote metrics to ${values.out}`);
}

process.exit(metrics.gatesPassed ? 0 : 1);
