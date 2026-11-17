#!/usr/bin/env node
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outDir = resolve('capture/static');
const launchAssetsDir = resolve('media/launch/assets');
mkdirSync(outDir, { recursive: true });
mkdirSync(launchAssetsDir, { recursive: true });

const protoPath = resolve('prototype/team-kanban-prototype.html');

console.log('[Static] Launching Chrome for real 2x plate extraction (1440x900 @2x)...');

const browser = await chromium.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});

await page.goto(`file://${protoPath}?gaze=1&theme=light`);
await page.waitForTimeout(400);

// Helper to hide only toolbar
const hideToolbar = () => {
  const ptBar = document.getElementById('ptBar');
  if (ptBar) ptBar.style.display = 'none';
  const stage = document.querySelector('.pt-stage');
  if (stage) stage.style.padding = '0';
  const app = document.getElementById('app');
  if (app) { app.style.border = 'none'; app.style.borderRadius = '0'; }
};

// State 1: 6 tasks created (step 3)
await page.evaluate(() => {
  window.__TKB.resetAll();
  const nextBtn = document.querySelector('button[data-act="next"]');
  if (nextBtn) { nextBtn.click(); nextBtn.click(); nextBtn.click(); }
});
await page.evaluate(hideToolbar);
await page.waitForTimeout(300);

const shot1Path = join(outDir, 'shot1_overview_light.png');
await page.screenshot({ path: shot1Path });
await page.screenshot({ path: join(launchAssetsDir, 'shot1_overview_light.png') });
console.log('[Static] Captured shot1_overview_light.png');

// State 4: All 6 completed (step through remaining script)
await page.evaluate(() => {
  const nextBtn = document.querySelector('button[data-act="next"]');
  if (nextBtn) {
    for (let i = 0; i < 15; i++) nextBtn.click();
  }
});
await page.evaluate(hideToolbar);
await page.waitForTimeout(300);

const shot4Path = join(outDir, 'shot4_completed_light.png');
await page.screenshot({ path: shot4Path });
await page.screenshot({ path: join(launchAssetsDir, 'shot4_completed_light.png') });
console.log('[Static] Captured shot4_completed_light.png');

// State 5: Dark theme
await page.evaluate(() => {
  document.body.dataset.theme = 'dark';
});
await page.waitForTimeout(200);

const shot5Path = join(outDir, 'shot5_dark.png');
await page.screenshot({ path: shot5Path });
await page.screenshot({ path: join(launchAssetsDir, 'shot5_dark.png') });
console.log('[Static] Captured shot5_dark.png');

// Also save 1:1 board sidebars for README documentation
const sideEl = page.locator('.side');
await sideEl.screenshot({ path: resolve('docs/assets/board-v3-dark.png') });
await page.evaluate(() => { document.body.dataset.theme = 'light'; });
await page.waitForTimeout(100);
await sideEl.screenshot({ path: resolve('docs/assets/board-v3-light.png') });
console.log('[Static] Captured 1:1 board-v3-light.png and board-v3-dark.png');

// State 6: Disarm popover in light theme
await page.evaluate(() => {
  document.body.dataset.theme = 'light';
  if (window.__TKB && window.__TKB.host && window.__TKB.host.board) {
    window.__TKB.host.board.toggleTeamPop();
  }
});
await page.waitForTimeout(200);

const shot6Path = join(outDir, 'shot6_disarm_modal.png');
await page.screenshot({ path: shot6Path });
await page.screenshot({ path: join(launchAssetsDir, 'shot6_disarm_modal.png') });
console.log('[Static] Captured shot6_disarm_modal.png');

await browser.close();
console.log('[Static] All plates cleanly extracted and mirrored to media/launch/assets!');
