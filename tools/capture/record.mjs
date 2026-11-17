#!/usr/bin/env node
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const options = {
  profile: { type: 'string', default: 'A' },
  width: { type: 'string' },
  height: { type: 'string' },
  theme: { type: 'string', default: 'light' },
  speed: { type: 'string', default: '8' },
  duration: { type: 'string', default: '42' }, // nominal seconds (at speed=8, actual run time is ~42s * speed)
  out: { type: 'string' },
  interval: { type: 'string', default: '100' }, // capture interval in ms
  script: { type: 'string', default: 'full' },
  loopfade: { type: 'string', default: '0' },
};

const { values } = parseArgs({ options, allowPositionals: true });

const profile = values.profile.toUpperCase();
const width = values.width ? parseInt(values.width, 10) : (profile === 'B' ? 1440 : 900);
const height = values.height ? parseInt(values.height, 10) : (profile === 'B' ? 900 : 1000);
const theme = values.theme;
const speed = parseInt(values.speed, 10);
const intervalMs = parseInt(values.interval, 10);
const scriptMode = values.script;
const loopfade = values.loopfade;
const outDir = resolve(values.out || `capture/${profile.toLowerCase()}`);
const framesDir = join(outDir, 'frames');

mkdirSync(framesDir, { recursive: true });

const protoPath = resolve('prototype/team-kanban-prototype.html');
const url = `file://${protoPath}?embed=1&speed=${speed}&gaze=1&theme=${theme}${scriptMode ? `&script=${scriptMode}` : ''}${loopfade === '1' ? '&loopfade=1' : ''}`;

console.log(`[Capture] Launching Chrome for Profile ${profile} (${width}x${height} @2x, theme=${theme}, speed=${speed})...`);
console.log(`[Capture] URL: ${url}`);
console.log(`[Capture] Output directory: ${outDir}`);

const browser = await chromium.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: 2,
});

const page = await context.newPage();
await page.emulateMedia({ reducedMotion: 'no-preference' });

await page.goto(url);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Explicitly reset and start playback so frame 0 matches step 0
await page.evaluate(() => window.__TKB.resetAll());
await sleep(300);
await page.evaluate(() => window.__TKB.startPlay());

const frames = [];
let frameIdx = 0;
const startPerf = Date.now();

console.log(`[Capture] Recording frames at ~${intervalMs}ms interval...`);

// Run capture loop
let completed = false;
let failData = null;

while (!completed) {
  const frameStart = Date.now();
  const frameNum = String(frameIdx).padStart(6, '0');
  const framePath = join(framesDir, `${frameNum}.png`);

  await page.screenshot({ path: framePath, type: 'png' });

  const info = await page.evaluate(() => {
    const tkb = window.__TKB;
    const fail = window.__FLIGHT_FAIL || null;
    return {
      step: tkb ? tkb.play.step : -1,
      totalSteps: tkb ? tkb.totalSteps : 17,
      done: tkb ? tkb.done : false,
      fail,
      beats: tkb ? tkb.beats : [],
    };
  });

  if (info.fail && !failData) {
    failData = info.fail;
  }

  frames.push({
    i: frameIdx,
    t_ms: frameStart - startPerf,
    step: info.step,
    beat: info.beats.length,
  });

  frameIdx++;

  if (info.done) {
    console.log(`[Capture] SCRIPT completed at frame ${frameIdx}.`);
    // Capture 10 more frames to allow landing hold
    for (let extra = 0; extra < 10; extra++) {
      const extraNum = String(frameIdx).padStart(6, '0');
      await page.screenshot({ path: join(framesDir, `${extraNum}.png`), type: 'png' });
      frames.push({
        i: frameIdx,
        t_ms: Date.now() - startPerf,
        step: info.step,
        beat: info.beats.length,
      });
      frameIdx++;
      await sleep(intervalMs);
    }
    completed = true;
    break;
  }

  const elapsed = (Date.now() - startPerf) / 1000;
  // Safety timeout: 45s nominal at speed 8 is ~360s real
  if (elapsed > 400) {
    console.log(`[Capture] Timeout reached (${elapsed.toFixed(1)}s).`);
    completed = true;
    break;
  }

  const processTime = Date.now() - frameStart;
  const delay = Math.max(5, intervalMs - processTime);
  await sleep(delay);
}

// Check beats from page
const finalBeats = await page.evaluate(() => (window.__TKB ? window.__TKB.beats : []));

await browser.close();

// Write logs
writeFileSync(join(outDir, 'frames.json'), JSON.stringify(frames, null, 2));
writeFileSync(join(outDir, 'beats.json'), JSON.stringify(finalBeats, null, 2));

console.log(`[Capture] Total captured: ${frames.length} frames.`);
console.log(`[Capture] Wrote frames.json and beats.json.`);

if (failData) {
  const failPath = resolve('capture/flight-fail.json');
  mkdirSync(resolve('capture'), { recursive: true });
  writeFileSync(failPath, JSON.stringify(failData, null, 2));
  console.error(`[Capture] FLIP flight boundary violation detected! Details written to ${failPath}`);
  process.exit(1);
} else {
  console.log(`[Capture] All flight assertions passed (zero out-of-bounds drops).`);
}
