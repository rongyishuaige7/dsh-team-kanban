#!/usr/bin/env node
import { chromium } from 'playwright-core';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FFMPEG = '/Users/rongyi/.local/bin/ffmpeg';

const outDir = resolve('docs/assets');
mkdirSync(outDir, { recursive: true });

const noBgmOut = join(outDir, 'kanban-launch-v3-nobgm.mp4');
const finalOut = join(outDir, 'kanban-launch-v3.mp4');

const totalFrames = 1080; // 18.0s @ 60fps
const fps = 60;

console.log(`[RenderLaunch] Starting Track B 60fps render (${totalFrames} frames, 18.0s, 1920x1080)...`);

const browser = await chromium.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});

const playerUrl = `file://${resolve('media/launch/player.html')}`;
await page.goto(playerUrl);
await page.waitForTimeout(500);

console.log(`[RenderLaunch] Player loaded. Spawning ffmpeg encoder for ${noBgmOut}...`);

const ffmpegArgs = [
  '-y',
  '-f', 'image2pipe',
  '-vcodec', 'png',
  '-framerate', String(fps),
  '-i', 'pipe:0',
  '-c:v', 'libx264',
  '-preset', 'fast',
  '-crf', '17',
  '-pix_fmt', 'yuv420p',
  noBgmOut,
];

const ffmpegProc = spawn(FFMPEG, ffmpegArgs, {
  stdio: ['pipe', 'inherit', 'inherit'],
});

const startPerf = Date.now();

for (let f = 0; f < totalFrames; f++) {
  await page.evaluate((idx) => window.renderFrame(idx), f);
  const buf = await page.screenshot({ type: 'png' });
  ffmpegProc.stdin.write(buf);

  if (f % 120 === 0 || f === totalFrames - 1) {
    const elapsed = ((Date.now() - startPerf) / 1000).toFixed(1);
    const speed = ((f + 1) / (Date.now() - startPerf) * 1000).toFixed(1);
    console.log(`[RenderLaunch] Frame ${f + 1}/${totalFrames} (${((f + 1) / 60).toFixed(1)}s) - ${elapsed}s elapsed (${speed} fps)`);
  }
}

ffmpegProc.stdin.end();

await new Promise((resolvePromise) => {
  ffmpegProc.on('close', (code) => {
    console.log(`[RenderLaunch] Video encoding complete (exit code: ${code}). Saved to ${noBgmOut}`);
    resolvePromise();
  });
});

await browser.close();

// Audio Mixing for kanban-launch-v3.mp4
console.log(`[RenderLaunch] Mixing 120BPM soundtrack and SFX into ${finalOut}...`);

const audioBase = '/Users/rongyi/.gemini/antigravity-cli-pro2/config/skills/video-shotcraft/assets/audio';
const bgmPath = join(audioBase, 'bgm/bgm-tech-house.mp3');
const whoosh1 = join(audioBase, 'sfx/transition/air-woosh-quick.mp3');
const click1 = join(audioBase, 'sfx/ui/ui-select-modern.mp3');
const chime1 = join(audioBase, 'sfx/ui/ui-success-soft.mp3');
const switch1 = join(audioBase, 'sfx/ui/switch-tap.mp3');
const impact1 = join(audioBase, 'sfx/impact/bass-hit-futuristic.mp3');

// Adelay milliseconds:
// t=3.0s -> 3000ms
// t=6.5s -> 6500ms
// t=10.5s -> 10500ms
// t=13.5s -> 13500ms
// t=16.8s -> 16800ms
const filterGraph = [
  '[1:a]volume=0.22,afade=t=in:ss=0:d=0.5,afade=t=out:st=17.2:d=0.8[bgm]',
  '[2:a]adelay=3000|3000,volume=0.45[sfx1]',
  '[3:a]adelay=6500|6500,volume=0.50[sfx2]',
  '[4:a]adelay=10500|10500,volume=0.50[sfx3]',
  '[5:a]adelay=13500|13500,volume=0.45[sfx4]',
  '[6:a]adelay=16800|16800,volume=0.60[sfx5]',
  '[bgm][sfx1][sfx2][sfx3][sfx4][sfx5]amix=inputs=6:duration=first:dropout_transition=2[aout]'
].join(';');

const mixArgs = [
  '-y',
  '-i', noBgmOut,
  '-i', bgmPath,
  '-i', whoosh1,
  '-i', click1,
  '-i', chime1,
  '-i', switch1,
  '-i', impact1,
  '-filter_complex', filterGraph,
  '-map', '0:v',
  '-map', '[aout]',
  '-c:v', 'copy',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-t', '18.0',
  finalOut,
];

console.log(`[RenderLaunch] Running ffmpeg audio mux...`);
execFileSync(FFMPEG, mixArgs);

console.log(`[RenderLaunch] Done! Successfully created:`);
console.log(`  - No-BGM: ${noBgmOut}`);
console.log(`  - Full:   ${finalOut}`);
