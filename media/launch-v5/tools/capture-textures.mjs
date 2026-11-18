import { chromium } from '/Users/rongyi/Desktop/dsh-team-kanban/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO = path.resolve(__dirname, '../../../prototype/team-kanban-prototype.html');
const TEX_DIR = path.resolve(__dirname, '../public/textures');
const LAYOUT_OUT = path.resolve(__dirname, '../src/live-layout.json');
fs.mkdirSync(TEX_DIR, { recursive: true });
fs.mkdirSync(path.dirname(LAYOUT_OUT), { recursive: true });

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const protoUrl = (q = '') => `file://${PROTO}?play=1&gaze=1${q ? '&' + q : ''}`;

async function prepFullShell(page, sideW = 1140) {
  await page.evaluate((sw) => {
    const ptBar = document.getElementById('ptBar');
    if (ptBar) ptBar.style.display = 'none';
    const stage = document.querySelector('.pt-stage');
    if (stage) {
      stage.style.padding = '0';
      stage.style.height = '100vh';
    }
    const app = document.getElementById('app');
    if (app) {
      app.style.height = '100vh';
      app.style.borderRadius = '0';
      app.style.border = 'none';
    }
    const side = document.getElementById('side');
    if (side) {
      side.style.setProperty('--side-w', `${sw}px`);
    }
  }, sideW);
}

async function stepN(page, n) {
  for (let i = 0; i < n; i++) {
    await page.evaluate(() => {
      document.querySelector('#ptBar button[data-act="next"]').click();
    });
  }
}

async function disableAnimationsForCleanStill(page) {
  await page.addStyleTag({
    content: `
      .tkb-mate[data-running]::after,
      .tkb-card__live-dot::after,
      .tkb-card[data-live] .tkb-card__rail::after {
        animation: none !important;
      }
    `,
  });
  await page.waitForTimeout(900);
}

const browser = await chromium.launch({ executablePath: CHROME });
const layout = {};

// 1. Full 1920x1080 @2x Desktop Shell (Step 7: 1 done, 3 active, #4 blocked + ↘1 + ⚠) — Light & Dark
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(protoUrl('theme=light'), { waitUntil: 'networkidle' });
  await prepFullShell(page, 1140);
  await stepN(page, 7);
  await disableAnimationsForCleanStill(page);

  await page.screenshot({ path: path.join(TEX_DIR, 'app-step7-light.png') });

  // Measure layout bboxes in 1920x1080 CSS space
  layout.appStep7 = await page.evaluate(() => {
    const rect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    // Find card #4
    const cards = [...document.querySelectorAll('.tkb-card')];
    const card4El = cards.find((c) => c.querySelector('.tkb-card__id')?.textContent?.trim() === '#4');
    const c4 = card4El ? card4El.getBoundingClientRect() : null;
    return {
      pageW: 1920,
      pageH: 1080,
      side: rect('#side'),
      tabs: rect('#sideTabs'),
      boardChip: rect('.chip[data-tab="board"]'),
      head: rect('.tkb-head'),
      teamBtn: rect('.tkb-team__btn'),
      card4: c4 ? { x: Math.round(c4.x), y: Math.round(c4.y), w: Math.round(c4.width), h: Math.round(c4.height) } : null,
    };
  });

  // Switch to Dark theme on exact same DOM state (pixel-identical layout!)
  await page.evaluate(() => { document.body.dataset.theme = 'dark'; });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(TEX_DIR, 'app-step7-dark.png') });

  // Crop Dark board 3-column cutout for Outro
  const sideBox = layout.appStep7.side;
  await page.screenshot({
    path: path.join(TEX_DIR, 'outro-dark-board.png'),
    clip: { x: sideBox.x, y: sideBox.y, width: sideBox.w, height: 640 },
  });

  // Switch back to Light and capture header strip + lineage/drawer crop for Outro
  await page.evaluate(() => { document.body.dataset.theme = 'light'; });
  await page.waitForTimeout(150);
  const headBox = layout.appStep7.head;
  await page.screenshot({
    path: path.join(TEX_DIR, 'outro-head-strip.png'),
    clip: { x: headBox.x, y: headBox.y, width: headBox.w, height: headBox.h },
  });

  // Expand card #4 drawer AND hover over title (avoiding ⚠ tooltip) to trigger SVG Bézier lineage wires!
  const c4Box = layout.appStep7.card4;
  await page.mouse.click(c4Box.x + 48, c4Box.y + 46);
  await page.mouse.move(c4Box.x + 48, c4Box.y + 46);
  await page.waitForTimeout(550);
  await page.screenshot({
    path: path.join(TEX_DIR, 'outro-lineage-drawer.png'),
    clip: { x: sideBox.x + 8, y: sideBox.y + 88, width: sideBox.w - 16, height: 520 },
  });

  await ctx.close();
}

// 2. Hero Card #4 @4x Cutout (exact same width as in 1140px 3-column board, rendered at deviceScaleFactor: 4!)
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 4 });
  const page = await ctx.newPage();
  await page.goto(protoUrl('theme=light'), { waitUntil: 'networkidle' });
  await prepFullShell(page, 1140);
  await stepN(page, 7);
  await disableAnimationsForCleanStill(page);
  const c4 = layout.appStep7.card4;
  await page.screenshot({
    path: path.join(TEX_DIR, 'card4-hero-4x.png'),
    clip: { x: c4.x, y: c4.y, width: c4.w, height: c4.h },
  });
  await ctx.close();
}

// 3. Narrow 360px @container Board (Step 4: empty Completed lane in 30px quiet mode + pinned teammate capsule!) — Light & Dark @3x
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await page.goto(protoUrl('embed=1&theme=light'), { waitUntil: 'networkidle' });
  await stepN(page, 4);
  await disableAnimationsForCleanStill(page);
  // Click first teammate capsule to pin & expand its full name in narrow mode!
  await page.evaluate(() => {
    const mc = document.querySelector('.tkb-mc');
    if (mc) mc.click();
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(TEX_DIR, 'narrow-360-light.png') });

  await page.evaluate(() => { document.body.dataset.theme = 'dark'; });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(TEX_DIR, 'narrow-360-dark.png') });
  await ctx.close();
}

// 4. Disarm Sequence (1920x1080 @2x): All 6 tasks completed -> Open Disarm Popover -> Confirm Disarm (auto-closes board!)
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(protoUrl('theme=light'), { waitUntil: 'networkidle' });
  await prepFullShell(page, 1140);
  await stepN(page, 17); // Run full script to 6/6 completed!
  await disableAnimationsForCleanStill(page);

  await page.screenshot({ path: path.join(TEX_DIR, 'app-disarm-before.png') });

  // Capture completed lane & checkmarked tab ring for Outro!
  const tabsBox = await page.evaluate(() => {
    const r = document.querySelector('#sideTabs').getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  await page.screenshot({
    path: path.join(TEX_DIR, 'outro-tab-ring.png'),
    clip: { x: tabsBox.x, y: tabsBox.y, width: Math.min(480, tabsBox.w), height: tabsBox.h },
  });

  const doneLaneBox = await page.evaluate(() => {
    const r = document.querySelector('.tkb-lane[data-lane="completed"]').getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  await page.screenshot({
    path: path.join(TEX_DIR, 'outro-done-lane.png'),
    clip: { x: doneLaneBox.x, y: doneLaneBox.y, width: doneLaneBox.w, height: Math.min(420, doneLaneBox.h) },
  });

  // Click .tkb-team__btn to open confirmation popover & show single crisp anti-misfire focus ring on 取消!
  await page.evaluate(() => {
    document.querySelector('.tkb-team__btn').click();
    const ghost = document.querySelector('.tkb-team__ghost');
    if (ghost) {
      ghost.style.outline = '2px solid #4176e6';
      ghost.style.outlineOffset = '2px';
      ghost.style.boxShadow = 'none';
    }
  });
  await page.waitForTimeout(260);
  await page.screenshot({ path: path.join(TEX_DIR, 'app-disarm-pop.png') });

  layout.disarm = await page.evaluate(() => {
    const rect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        cx: Math.round(r.x + r.width / 2),
        cy: Math.round(r.y + r.height / 2),
      };
    };
    return {
      teamBtn: rect('.tkb-team__btn'),
      pop: rect('.tkb-team__pop'),
      ghostBtn: rect('.tkb-team__ghost'),
      dangerBtn: rect('.tkb-team__danger'),
    };
  });

  // Capture clean standalone .tkb-team__pop element screenshot for Outro (zero background text behind corners)!
  await page.evaluate(() => {
    const lanes = document.querySelector('.tkb-lanes');
    if (lanes) lanes.style.visibility = 'hidden';
  });
  await page.locator('.tkb-team__pop').screenshot({
    path: path.join(TEX_DIR, 'outro-disarm-pop.png'),
  });
  await page.evaluate(() => {
    const lanes = document.querySelector('.tkb-lanes');
    if (lanes) lanes.style.visibility = '';
  });

  // Click .tkb-team__danger ("停用") -> board auto-closes cleanly!
  await page.evaluate(() => { document.querySelector('.tkb-team__danger').click(); });
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(TEX_DIR, 'app-disarm-closed.png') });

  await ctx.close();
}

await browser.close();
fs.writeFileSync(LAYOUT_OUT, JSON.stringify(layout, null, 2));
console.log('Captured all textures and wrote layout ->', LAYOUT_OUT);
console.log(JSON.stringify(layout, null, 2));
