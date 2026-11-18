import { chromium } from '/Users/rongyi/Desktop/dsh-team-kanban/node_modules/playwright-core/index.mjs';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO = path.resolve(__dirname, '../../../prototype/team-kanban-prototype.html');
const CLIPS_DIR = path.resolve(__dirname, '../public/clips');
fs.mkdirSync(CLIPS_DIR, { recursive: true });

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// Slow page CSS/WAAPI motion by 4x so 45ms screenshot loop captures ~180 effective fps of real DOM motion!
const SPEED = 4;
const TARGET_VIDEO_SEC = 6.2; // 186 frames @ 30fps (more than enough for 177f s3_flow)
const REAL_WALL_MS = TARGET_VIDEO_SEC * SPEED * 1000;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tkb-v5-flow-'));
console.log('Recording slowed live flow frames into', tmpDir);

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(`file://${PROTO}?gaze=1&embed=1&theme=light&speed=${SPEED}`, { waitUntil: 'networkidle' });

// Advance deterministically to Step 8 (SCRIPT[0..7]: #1/#5 completed, #2/#3 in_progress, #4/#6 blocked)
for (let i = 0; i < 8; i++) {
  await page.evaluate(() => document.querySelector('#ptBar button[data-act="next"]').click());
}
await page.waitForTimeout(1200);

// Schedule deterministic live choreography in wall-clock ms (scaled by SPEED = 4):
// video 0.15s (f4,  wall 600ms):   hover #4 title -> SVG Bézier lineage curves draw on!
// video 0.90s (f27, wall 3600ms):  click #4 -> smooth 0fr -> 1fr detail drawer expands!
// video 1.75s (f52, wall 7000ms):  click #4 again -> detail drawer closes + clear lineage
// video 2.25s (f67, wall 9000ms):  SCRIPT[8..10] -> #2 completes (FLIP to completed)
// video 2.85s (f85, wall 11400ms): SCRIPT[11]    -> #3 completes (FLIP) + #4 unlocks from 阻塞 to 就绪!
// video 3.45s (f103, wall 13800ms): SCRIPT[12]   -> #4 claimed by 构建者 (cross-lane FLIP arc into 进行中!)
// video 4.00s (f120, wall 16000ms): SCRIPT[13..15] -> skip failure/recover synchronously -> #4 completes + #6 unlocks!
// video 4.38s (f131, wall 17500ms): SCRIPT[16]   -> #6 claimed by 审查员 (FLIP into 进行中!)
// video 4.72s (f142, wall 18900ms): SCRIPT[17]   -> #6 completes -> 6/6 ✓! Holds settled through f177!
const cues = [
  { at: 600, action: async (p) => {
    const box = await p.evaluate(() => {
      const c4 = [...document.querySelectorAll('.tkb-card')].find(c => c.querySelector('.tkb-card__id')?.textContent?.trim() === '#4');
      if (!c4) return null;
      const r = c4.getBoundingClientRect();
      return { x: r.x + 48, y: r.y + 46 };
    });
    if (box) await p.mouse.move(box.x, box.y);
  }},
  { at: 3600, action: async (p) => {
    const box = await p.evaluate(() => {
      const c4 = [...document.querySelectorAll('.tkb-card')].find(c => c.querySelector('.tkb-card__id')?.textContent?.trim() === '#4');
      if (!c4) return null;
      const r = c4.getBoundingClientRect();
      return { x: r.x + 48, y: r.y + 46 };
    });
    if (box) await p.mouse.click(box.x, box.y);
  }},
  { at: 7000, action: async (p) => {
    const box = await p.evaluate(() => {
      const c4 = [...document.querySelectorAll('.tkb-card')].find(c => c.querySelector('.tkb-card__id')?.textContent?.trim() === '#4');
      if (!c4) return null;
      const r = c4.getBoundingClientRect();
      return { x: r.x + 48, y: r.y + 46 };
    });
    if (box) await p.mouse.click(box.x, box.y);
    await p.mouse.move(20, 20);
  }},
  { at: 9000, action: async (p) => {
    // Advance past stall/unstall (SCRIPT[8], SCRIPT[9]) to SCRIPT[10]: complete #2 -> FLIP to completed!
    await p.evaluate(() => {
      const next = document.querySelector('#ptBar button[data-act="next"]');
      next.click(); next.click(); next.click();
    });
  }},
  { at: 11400, action: async (p) => {
    // SCRIPT[11]: complete #3 -> unlocks #4!
    await p.evaluate(() => document.querySelector('#ptBar button[data-act="next"]').click());
  }},
  { at: 13800, action: async (p) => {
    // SCRIPT[12]: claim #4 -> cross-lane FLIP flight into 进行中!
    await p.evaluate(() => document.querySelector('#ptBar button[data-act="next"]').click());
  }},
  { at: 16000, action: async (p) => {
    // Skip failure/recover (SCRIPT[13], SCRIPT[14]) synchronously to SCRIPT[15]: complete #4!
    await p.evaluate(() => {
      const next = document.querySelector('#ptBar button[data-act="next"]');
      next.click(); next.click(); next.click();
    });
  }},
  { at: 17500, action: async (p) => {
    // SCRIPT[16]: spawn reviewer & claim #6
    await p.evaluate(() => document.querySelector('#ptBar button[data-act="next"]').click());
  }},
  { at: 18900, action: async (p) => {
    // SCRIPT[17]: complete #6 -> 6/6 done!
    await p.evaluate(() => document.querySelector('#ptBar button[data-act="next"]').click());
  }},
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
  await page.screenshot({ path: file, type: 'jpeg', quality: 95 });
  const tAfter = performance.now() - tStart;
  frames.push({ file, videoSec: ((tBefore + tAfter) * 0.5) / (1000 * SPEED) });
  idx++;
  const wait = Math.max(0, 42 - (performance.now() - tStart - tBefore));
  if (wait > 2) await page.waitForTimeout(wait);
}

await browser.close();
console.log(`Captured ${frames.length} raw 2x frames across ${(REAL_WALL_MS / 1000).toFixed(1)}s wall time (~${(frames.length / TARGET_VIDEO_SEC).toFixed(1)} eff fps)`);

// Build ffconcat file with exact per-frame video durations and resample cleanly to 30fps H.264!
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

const outMp4 = path.join(CLIPS_DIR, 'live-flow-light.mp4');
const ff = spawnSync('ffmpeg', [
  '-y',
  '-f', 'concat',
  '-safe', '0',
  '-i', concatPath,
  '-vf', 'fps=30,scale=1920:1200:flags=lanczos',
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '15',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  outMp4,
], { stdio: 'inherit' });

fs.rmSync(tmpDir, { recursive: true, force: true });
if (ff.status !== 0) process.exit(ff.status ?? 1);
console.log('Saved live flow MP4 ->', outMp4);
