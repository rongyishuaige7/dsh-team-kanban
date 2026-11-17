#!/usr/bin/env node
// 交互镜头：真实鼠标移动到「团队」→ 点开停用弹层 → 点「停用」，同时逐帧记录光标轨迹。
// 用法: node tools/capture-cursor.mjs
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const PROTO = resolve(import.meta.dirname, '../../..', 'prototype/team-kanban-prototype.html');
const dir = resolve('capture', 'cursor');
rmSync(dir, { recursive: true, force: true });
mkdirSync(`${dir}/frames`, { recursive: true });

const b = await chromium.launch({
  executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--hide-scrollbars', '--disable-gpu'],
});
const ctx = await b.newContext({ viewport: { width: 1440, height: 760 }, deviceScaleFactor: 1.5 });
const p = await ctx.newPage();
await p.emulateMedia({ reducedMotion: 'no-preference' });
await p.goto(`file://${PROTO}?embed=1&gaze=1&speed=8&theme=light&play=1`);
await p.waitForFunction(() => !!window.__TKB, null, { timeout: 10000 });
await p.waitForTimeout(1200);

console.log('[cursor] waiting for step 9 ...');
const t0 = Date.now();
while ((await p.evaluate(() => window.__TKB.play.step)) < 9) {
  if (Date.now() - t0 > 600000) throw new Error('timeout waiting step 9');
  await new Promise(r => setTimeout(r, 150));
}

const team = await (await p.$('.tkb-team__btn')).boundingBox();
const B = { x: team.x + team.width / 2, y: team.y + team.height / 2 };
const P0 = { x: 700, y: 430 };
const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

const TOTAL = 240;
const meta = [];
let danger = null;
const start = Date.now();
for (let f = 0; f < TOTAL; f++) {
  const target = start + f * 45;
  const now = Date.now();
  if (target > now) await new Promise(r => setTimeout(r, target - now));

  const to = danger ? { x: danger.x + danger.width / 2, y: danger.y + danger.height / 2 } : B;
  let x = P0.x, y = P0.y;
  if (f >= 12 && f < 42) { const t = ease((f - 12) / 30); x = lerp(P0.x, B.x, t); y = lerp(P0.y, B.y, t); }
  else if (f >= 42 && f < 70) { x = B.x; y = B.y; }
  else if (f >= 70 && f < 88) { const t = ease((f - 70) / 18); x = lerp(B.x, to.x, t); y = lerp(B.y, to.y, t); }
  else if (f >= 88) { x = to.x; y = to.y; }
  const down = (f >= 42 && f < 46) || (f >= 88 && f < 92) ? 1 : 0;

  if (f === 42) { await p.mouse.move(B.x, B.y); await p.mouse.down(); }
  if (f === 46) await p.mouse.up();
  if (f === 50) { await p.waitForTimeout(300); danger = await (await p.$('.tkb-team__danger')).boundingBox(); }
  if (f === 88) { await p.mouse.move(to.x, to.y); await p.mouse.down(); }
  if (f === 92) await p.mouse.up();
  if (f > 12 && f !== 42 && f !== 88 && !(f >= 42 && f < 46) && !(f >= 88 && f < 92)) await p.mouse.move(x, y);

  const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
  writeFileSync(`${dir}/frames/${String(f).padStart(5, '0')}.jpg`, buf);
  meta.push({ f, t: Date.now() - start, x, y, down });
}
await b.close();
writeFileSync(`${dir}/frames.json`, JSON.stringify(meta));
console.log(`[cursor] frames=${meta.length} dur=${((Date.now() - start) / 1000).toFixed(1)}s`);
