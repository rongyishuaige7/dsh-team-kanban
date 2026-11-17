#!/usr/bin/env node
// 采集母板：页面时钟放慢 5 倍 + 定时截图，供 cut.mjs 切分。
// 用法: node tools/capture-master.mjs light|dark [intervalMs]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const PROTO = resolve(import.meta.dirname, '../../..', 'prototype/team-kanban-prototype.html');
const SPEED = 5;
const [,, theme = 'light', interval = '45'] = process.argv;
const dir = resolve('capture', theme);
rmSync(dir, { recursive: true, force: true });
mkdirSync(`${dir}/frames`, { recursive: true });

const b = await chromium.launch({
  executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--hide-scrollbars', '--disable-gpu'],
});
const ctx = await b.newContext({ viewport: { width: 1440, height: 760 }, deviceScaleFactor: 1.5 });
const p = await ctx.newPage();
await p.emulateMedia({ reducedMotion: 'no-preference' });
await p.goto(`file://${PROTO}?embed=1&gaze=1&speed=${SPEED}&theme=${theme}&play=1`);
await p.waitForFunction(() => !!window.__TKB, null, { timeout: 10000 });
await p.waitForTimeout(1200);

const meta = [];
const start = Date.now();
const stopAt = Date.now() + 42000 * SPEED * 0.75;
for (let i = 0; Date.now() < stopAt && i < 20000; i++) {
  const target = start + i * +interval;
  const now = Date.now();
  if (target > now) await new Promise(r => setTimeout(r, target - now));
  const step = await p.evaluate(() => window.__TKB.play.step);
  const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
  writeFileSync(`${dir}/frames/${String(i).padStart(5, '0')}.jpg`, buf);
  meta.push({ i, t: Date.now() - start, step });
  if (i % 500 === 0) console.log(`[${theme}] f${i} t=${((Date.now() - start) / 1000).toFixed(1)}s step=${step}`);
}
await b.close();
writeFileSync(`${dir}/frames.json`, JSON.stringify(meta));
const dur = (Date.now() - start) / 1000;
console.log(`[${theme}] frames=${meta.length} dur=${dur.toFixed(1)}s fps=${(meta.length / dur).toFixed(2)}`);
