#!/usr/bin/env node
// 高采样重拍：飞行镜头单独用 20 倍慢放采一次，慢放后仍有足够帧。
// 用法: node tools/capture-hero.mjs
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const PROTO = resolve(import.meta.dirname, '../../..', 'prototype/team-kanban-prototype.html');
const dir = resolve('capture', 'hero');
rmSync(dir, { recursive: true, force: true });
mkdirSync(`${dir}/frames`, { recursive: true });

const b = await chromium.launch({
  executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--hide-scrollbars', '--disable-gpu'],
});
const ctx = await b.newContext({ viewport: { width: 1440, height: 760 }, deviceScaleFactor: 1.5 });
const p = await ctx.newPage();
await p.emulateMedia({ reducedMotion: 'no-preference' });
await p.goto(`file://${PROTO}?embed=1&gaze=1&speed=20&theme=light&play=1`);
await p.waitForFunction(() => !!window.__TKB, null, { timeout: 10000 });
await p.waitForTimeout(1200);

console.log('[hero] waiting for step 5 ...');
const t0 = Date.now();
while ((await p.evaluate(() => window.__TKB.play.step)) < 5) {
  if (Date.now() - t0 > 600000) throw new Error('timeout waiting step 5');
  await new Promise(r => setTimeout(r, 150));
}

const meta = [];
const start = Date.now();
for (let i = 0; i < 4000; i++) {
  const target = start + i * 45;
  const now = Date.now();
  if (target > now) await new Promise(r => setTimeout(r, target - now));
  const step = await p.evaluate(() => window.__TKB.play.step);
  const buf = await p.screenshot({ type: 'jpeg', quality: 96 });
  writeFileSync(`${dir}/frames/${String(i).padStart(5, '0')}.jpg`, buf);
  meta.push({ i, t: Date.now() - start, step });
  if (step >= 8 && i > 30) break;
}
await b.close();
writeFileSync(`${dir}/frames.json`, JSON.stringify(meta));
console.log(`[hero] frames=${meta.length} dur=${((Date.now() - start) / 1000).toFixed(1)}s`);
