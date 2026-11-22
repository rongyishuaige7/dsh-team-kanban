import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openCdpPage } from './cdp-helper.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO = path.resolve(__dirname, '../../../prototype/team-kanban-prototype.html');
const CLIPS_DIR = path.resolve(__dirname, '../public/clips');
fs.mkdirSync(CLIPS_DIR, { recursive: true });

const SPEED = 5;
const TARGET_VIDEO_SEC = 6.2;
const REAL_WALL_MS = TARGET_VIDEO_SEC * SPEED * 1000;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tkb-v6-flow-'));
console.log('Recording slowed v0.6.0 live flow frames into', tmpDir);

const { page, cdp, close } = await openCdpPage({ width: 1280, height: 800, scale: 2 });
await page.goto(`file://${PROTO}?gaze=1&embed=1&theme=light&speed=${SPEED}`, { waitUntil: 'load' });

for (let i = 0; i < 9; i++) {
  await page.evaluate(() => document.querySelector('#ptBar button[data-act="next"]').click());
}
await page.waitForTimeout(1000);

const scaleMs = (msBase) => Math.round((msBase / 4) * SPEED);
const cues = [
  {
    at: scaleMs(600),
    action: async (p) => {
      const box = await p.evaluate(() => {
        const c4 = [...document.querySelectorAll('.tkb-card')].find(
          (c) => c.querySelector('.tkb-card__id')?.textContent?.trim() === '#4',
        );
        if (!c4) return null;
        const r = c4.getBoundingClientRect();
        return { x: r.x + 48, y: r.y + 38 };
      });
      if (box) await p.mouse.move(box.x, box.y);
    },
  },
  {
    at: scaleMs(5400),
    action: async (p) => {
      await p.mouse.move(16, 16);
      await p.evaluate(() => {
        const next = document.querySelector('#ptBar button[data-act="next"]');
        next.click();
        next.click();
      });
    },
  },
  {
    at: scaleMs(8600),
    action: async (p) => {
      await p.evaluate(() => document.querySelector('#ptBar button[data-act="next"]').click());
    },
  },
  {
    at: scaleMs(12400),
    action: async (p) => {
      await p.evaluate(() => document.querySelector('#ptBar button[data-act="next"]').click());
    },
  },
  {
    at: scaleMs(15200),
    action: async (p) => {
      await p.evaluate(() => {
        const next = document.querySelector('#ptBar button[data-act="next"]');
        next.click();
        next.click();
        next.click();
      });
    },
  },
  {
    at: scaleMs(17000),
    action: async (p) => {
      await p.evaluate(() => document.querySelector('#ptBar button[data-act="next"]').click());
    },
  },
  {
    at: scaleMs(18600),
    action: async (p) => {
      await p.evaluate(() => document.querySelector('#ptBar button[data-act="next"]').click());
    },
  },
];

const frames = [];
let cueIdx = 0;
const tStart = performance.now();
let idx = 0;

while (true) {
  const elapsed = performance.now() - tStart;
  if (elapsed >= REAL_WALL_MS) break;
  while (cueIdx < cues.length && elapsed >= cues[cueIdx].at) {
    await cues[cueIdx].action(page);
    cueIdx++;
  }
  const file = path.join(tmpDir, `f_${String(idx).padStart(5, '0')}.jpg`);
  const tBefore = performance.now() - tStart;
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 92,
    optimizeForSpeed: true,
  });
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  const tAfter = performance.now() - tStart;
  frames.push({ file, videoSec: ((tBefore + tAfter) * 0.5) / (1000 * SPEED) });
  idx++;
  const wait = Math.max(0, 42 - (performance.now() - tStart - tBefore));
  if (wait > 2) await page.waitForTimeout(wait);
}

await close();
console.log(
  `Captured ${frames.length} raw 2x frames across ${(REAL_WALL_MS / 1000).toFixed(1)}s wall time (~${(frames.length / TARGET_VIDEO_SEC).toFixed(1)} eff fps)`,
);

const concatLines = ['ffconcat version 1.0'];
for (let i = 0; i < frames.length; i++) {
  const nextSec = i + 1 < frames.length ? frames[i + 1].videoSec : TARGET_VIDEO_SEC;
  const dur = Math.max(0.004, nextSec - frames[i].videoSec);
  concatLines.push(`file '${frames[i].file}'`);
  concatLines.push(`duration ${dur.toFixed(6)}`);
}
concatLines.push(`file '${frames[frames.length - 1].file}'`);
const concatPath = path.join(tmpDir, 'frames.ffconcat');
fs.writeFileSync(concatPath, concatLines.join('\n'));

const outMp4 = path.join(CLIPS_DIR, 'live-flow-v6-light.mp4');
const ff = spawnSync(
  'ffmpeg',
  [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatPath,
    '-vf',
    'fps=30,scale=1920:1200:flags=lanczos',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '15',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outMp4,
  ],
  { stdio: 'inherit' },
);

fs.rmSync(tmpDir, { recursive: true, force: true });
if (ff.status !== 0) process.exit(ff.status ?? 1);
console.log('Saved v6 live flow MP4 ->', outMp4);
process.exit(0);
