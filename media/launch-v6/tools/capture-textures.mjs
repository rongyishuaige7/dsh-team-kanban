import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openCdpPage } from './cdp-helper.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO = path.resolve(__dirname, '../../../prototype/team-kanban-prototype.html');
const TEX_DIR = path.resolve(__dirname, '../public/textures');
const LAYOUT_OUT = path.resolve(__dirname, '../src/live-layout.json');
fs.mkdirSync(TEX_DIR, { recursive: true });
fs.mkdirSync(path.dirname(LAYOUT_OUT), { recursive: true });

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

async function freezeCleanStill(page) {
  await page.addStyleTag({
    content: `
      .tkb-mate[data-running]::after,
      .tkb-card__live-dot::after,
      .tkb-card[data-live],
      .tkb-card[data-live] .tkb-card__rail::after,
      .tkb-wire {
        animation: none !important;
      }
      .tkb-wire {
        stroke-dashoffset: 0 !important;
      }
    `,
  });
  await page.waitForTimeout(650);
}

const layout = {};

// 1. S2 Hero + S3 Far Plane: 1920x1080 @2x Desktop Shell (Step 7: 1 done, 3 active, #4/#6 blocked, #4 write-scope conflict with #2)
{
  const { page, close } = await openCdpPage({ width: 1920, height: 1080, scale: 2 });
  await page.goto(protoUrl('theme=light'), { waitUntil: 'load' });
  await prepFullShell(page, 1140);
  await stepN(page, 7);
  await freezeCleanStill(page);

  await page.screenshot({ path: path.join(TEX_DIR, 'app-base-light.png') });

  // Expand Card #4 drawer to expose .tkb-scope + .tkb-nudge__btn, and highlight conflict peer #2!
  await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.tkb-card')];
    const c4 = cards.find((c) => c.querySelector('.tkb-card__id')?.textContent?.trim() === '#4');
    const c2 = cards.find((c) => c.querySelector('.tkb-card__id')?.textContent?.trim() === '#2');
    if (c4) c4.click();
    if (c2) c2.classList.add('is-conflict-pair');
    if (c4) c4.classList.add('is-conflict-pair');
  });
  await page.waitForTimeout(420);

  await page.screenshot({ path: path.join(TEX_DIR, 'app-hero-conflict-light.png') });

  layout.hero = await page.evaluate(() => {
    const rect = (el) => {
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
    const cards = [...document.querySelectorAll('.tkb-card')];
    const card4El = cards.find((c) => c.querySelector('.tkb-card__id')?.textContent?.trim() === '#4');
    const nudgeEl = card4El ? card4El.querySelector('.tkb-nudge__btn') : null;
    const c4 = rect(card4El);
    const nb = rect(nudgeEl);
    return {
      pageW: 1920,
      pageH: 1080,
      side: rect(document.querySelector('#side')),
      head: rect(document.querySelector('.tkb-head')),
      card4: c4,
      nudgeBtn:
        nb && c4
          ? { ...nb, rx: nb.x - c4.x, ry: nb.y - c4.y, rcx: nb.cx - c4.x, rcy: nb.cy - c4.y }
          : null,
    };
  });

  await close();
  console.log('1/5 Hero & Base @2x done');
}

// 2. @4x Ultra-Sharp Cutouts of Expanded Card #4 (default & emerald Copied state!)
{
  const { page, close } = await openCdpPage({ width: 1920, height: 1080, scale: 4 });
  await page.goto(protoUrl('theme=light'), { waitUntil: 'load' });
  await prepFullShell(page, 1140);
  await stepN(page, 7);
  await freezeCleanStill(page);

  await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.tkb-card')];
    const c4 = cards.find((c) => c.querySelector('.tkb-card__id')?.textContent?.trim() === '#4');
    if (c4) c4.click();
  });
  await page.waitForTimeout(420);

  const c4 = layout.hero.card4;
  await page.screenshot({
    path: path.join(TEX_DIR, 'card4-expanded-4x.png'),
    clip: { x: c4.x, y: c4.y, width: c4.w, height: c4.h },
  });

  await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.tkb-card')];
    const c4El = cards.find((c) => c.querySelector('.tkb-card__id')?.textContent?.trim() === '#4');
    const btn = c4El?.querySelector('.tkb-nudge__btn');
    if (btn) btn.click();
  });
  await page.waitForTimeout(160);
  await page.screenshot({
    path: path.join(TEX_DIR, 'card4-copied-4x.png'),
    clip: { x: c4.x, y: c4.y, width: c4.w, height: c4.h },
  });

  await close();
  console.log('2/5 Card #4 @4x done');
}

// 3. S4 Wide Board with Away Catch-up Pill (.tkb-catchup) + Outro Emerald Relay Cutout (@2x Light & Dark pixel-identical!)
{
  const { page, close } = await openCdpPage({ width: 1920, height: 1080, scale: 2 });
  await page.goto(protoUrl('theme=light'), { waitUntil: 'load' });
  await prepFullShell(page, 1140);
  await stepN(page, 8);
  await page.waitForTimeout(450);

  await page.evaluate(() => {
    document.querySelector('.chip[data-tab="files"]').click();
  });
  await page.waitForTimeout(120);
  await stepN(page, 4); // #2 & #3 complete, #4 unlocked!
  await page.evaluate(() => {
    document.querySelector('.chip[data-tab="board"]').click();
  });
  await page.waitForTimeout(220);
  await page.evaluate(() => {
    const cu = document.querySelector('.tkb-catchup');
    if (cu) cu.setAttribute('data-open', '');
  });
  await freezeCleanStill(page);

  await page.screenshot({ path: path.join(TEX_DIR, 'app-catchup-light.png') });

  const sideBox = layout.hero.side;
  await page.screenshot({
    path: path.join(TEX_DIR, 'outro-catchup-head.png'),
    clip: { x: sideBox.x, y: sideBox.y + 36, width: sideBox.w, height: 220 },
  });

  await page.evaluate(() => {
    document.body.dataset.theme = 'dark';
  });
  await page.waitForTimeout(180);
  await page.screenshot({ path: path.join(TEX_DIR, 'app-catchup-dark.png') });

  await page.evaluate(() => {
    document.body.dataset.theme = 'light';
    const cu = document.querySelector('.tkb-catchup');
    if (cu) cu.removeAttribute('data-open');
    const root = document.querySelector('.tkb-root');
    const cards = [...document.querySelectorAll('.tkb-card')];
    const c3 = cards.find((c) => c.querySelector('.tkb-card__id')?.textContent?.trim() === '#3');
    const c4 = cards.find((c) => c.querySelector('.tkb-card__id')?.textContent?.trim() === '#4');
    if (c4) c4.classList.add('is-unlocked');
    if (root && c3 && c4) {
      const rr = root.getBoundingClientRect();
      const s = c3.getBoundingClientRect();
      const e = c4.getBoundingClientRect();
      const wires = root.querySelector('.tkb-wires');
      wires.setAttribute('width', rr.width);
      wires.setAttribute('height', rr.height);
      wires.setAttribute('viewBox', `0 0 ${rr.width} ${rr.height}`);
      wires.innerHTML = '';
      const x1 = s.left - rr.left,
        y1 = s.top - rr.top + 18;
      const x2 = e.right - rr.left,
        y2 = e.top - rr.top + 18;
      const k = Math.max(28, Math.abs(x2 - x1) * 0.5);
      const ns = 'http://www.w3.org/2000/svg';
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', `M${x1},${y1} C${x1 - k},${y1} ${x2 + k},${y2} ${x2},${y2}`);
      p.setAttribute('pathLength', '100');
      p.setAttribute('class', 'tkb-wire tkb-wire--relay');
      wires.appendChild(p);
      [
        [x1, y1],
        [x2, y2],
      ].forEach(([cx, cy]) => {
        const dot = document.createElementNS(ns, 'circle');
        dot.setAttribute('cx', cx);
        dot.setAttribute('cy', cy);
        dot.setAttribute('r', '3');
        dot.setAttribute('class', 'tkb-wire-dot tkb-wire--relay');
        wires.appendChild(dot);
      });
    }
  });
  await page.waitForTimeout(160);
  await page.screenshot({
    path: path.join(TEX_DIR, 'outro-relay-unlock.png'),
    clip: { x: sideBox.x + 8, y: sideBox.y + 84, width: sideBox.w - 16, height: 420 },
  });

  await close();
  console.log('3/5 Wide Catch-up & Relay @2x done');
}

// 4. S4 Narrow 360px @container Board WITH Left-Gutter Vertical C-Arc Lineage Curves! (@3x Light & Dark pixel-identical)
{
  const { page, close } = await openCdpPage({ width: 360, height: 780, scale: 3 });
  await page.goto(protoUrl('embed=1&theme=light'), { waitUntil: 'load' });
  await stepN(page, 4);
  await freezeCleanStill(page);

  await page.evaluate(() => {
    if (window.__TKB && window.__TKB.host && window.__TKB.host.board) {
      window.__TKB.host.board.showLineage('task-4');
    }
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(TEX_DIR, 'narrow-360-light.png') });

  await page.evaluate(() => {
    document.body.dataset.theme = 'dark';
  });
  await page.waitForTimeout(180);
  await page.screenshot({ path: path.join(TEX_DIR, 'narrow-360-dark.png') });

  await close();
  console.log('4/5 Narrow 360px Left-Arc @3x done');
}

// 5. S5 Darkroom Constellation Climax + Clean Disarm Sequence (1920x1080 @2x) + Outro Cutouts
{
  const { page, close } = await openCdpPage({ width: 1920, height: 1080, scale: 2 });
  await page.goto(protoUrl('theme=light'), { waitUntil: 'load' });
  await prepFullShell(page, 1140);
  await stepN(page, 17);
  await freezeCleanStill(page);

  const tabsBox = await page.evaluate(() => {
    const r = document.querySelector('#sideTabs').getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  await page.screenshot({
    path: path.join(TEX_DIR, 'outro-tab-ring.png'),
    clip: { x: tabsBox.x, y: tabsBox.y, width: Math.min(480, tabsBox.w), height: tabsBox.h },
  });

  const headDebriefBox = await page.evaluate(() => {
    const h = document.querySelector('.tkb-head').getBoundingClientRect();
    const d = document.querySelector('.tkb-debrief').getBoundingClientRect();
    return {
      x: Math.round(h.x),
      y: Math.round(h.y),
      w: Math.round(h.width),
      h: Math.round((d.bottom || h.bottom) - h.top),
    };
  });
  await page.screenshot({
    path: path.join(TEX_DIR, 'outro-head-debrief.png'),
    clip: { x: headDebriefBox.x, y: headDebriefBox.y, width: headDebriefBox.w, height: headDebriefBox.h },
  });
  layout.outro = {
    headDebrief: headDebriefBox,
    tabs: tabsBox,
  };

  await page.evaluate(() => {
    document.querySelector('.tkb-team__btn').click();
    const ghost = document.querySelector('.tkb-team__ghost');
    if (ghost) {
      ghost.style.outline = '2px solid #4176e6';
      ghost.style.outlineOffset = '2px';
    }
    const lanes = document.querySelector('.tkb-lanes');
    const db = document.querySelector('.tkb-debrief');
    if (lanes) lanes.style.visibility = 'hidden';
    if (db) db.style.visibility = 'hidden';
  });
  await page.waitForTimeout(180);
  await page.locator('.tkb-team__pop').screenshot({
    path: path.join(TEX_DIR, 'outro-disarm-pop.png'),
  });
  await page.evaluate(() => {
    const lanes = document.querySelector('.tkb-lanes');
    const db = document.querySelector('.tkb-debrief');
    if (lanes) lanes.style.visibility = '';
    if (db) db.style.visibility = '';
    document.querySelector('.tkb-team__ghost').click();
  });
  await page.waitForTimeout(140);

  await page.evaluate(() => {
    document.body.dataset.theme = 'dark';
  });
  await page.waitForTimeout(180);

  await page.screenshot({ path: path.join(TEX_DIR, 'app-dark-debrief.png') });

  layout.constellation = await page.evaluate(() => {
    const rect = (el) => {
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
    const btns = [...document.querySelectorAll('.tkb-debrief__btn')];
    return {
      replayBtn: rect(btns[0]),
      copyBtn: rect(btns[1]),
      teamBtn: rect(document.querySelector('.tkb-team__btn')),
      side: rect(document.querySelector('#side')),
    };
  });

  await page.evaluate(() => {
    document.querySelectorAll('.tkb-debrief__btn')[0].click();
  });
  await page.waitForTimeout(680);
  await page.screenshot({ path: path.join(TEX_DIR, 'app-dark-constellation.png') });

  const cSide = layout.constellation.side;
  await page.screenshot({
    path: path.join(TEX_DIR, 'outro-constellation-dark.png'),
    clip: { x: cSide.x, y: cSide.y + 36, width: cSide.w, height: 540 },
  });

  await page.waitForTimeout(880);
  await page.evaluate(() => {
    document.querySelector('.tkb-team__btn').click();
    const ghost = document.querySelector('.tkb-team__ghost');
    if (ghost) {
      ghost.style.outline = '2px solid #7aaaff';
      ghost.style.outlineOffset = '2px';
    }
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(TEX_DIR, 'app-dark-disarm-pop.png') });

  const dangerInfo = await page.evaluate(() => {
    const el = document.querySelector('.tkb-team__danger');
    const pop = document.querySelector('.tkb-team__pop');
    const r = el.getBoundingClientRect();
    const pr = pop.getBoundingClientRect();
    return {
      dangerBtn: {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        cx: Math.round(r.x + r.width / 2),
        cy: Math.round(r.y + r.height / 2),
      },
      pop: {
        x: Math.round(pr.x),
        y: Math.round(pr.y),
        w: Math.round(pr.width),
        h: Math.round(pr.height),
      },
    };
  });
  layout.constellation.dangerBtn = dangerInfo.dangerBtn;
  layout.constellation.pop = dangerInfo.pop;

  await page.evaluate(() => {
    document.querySelector('.tkb-team__danger').click();
  });
  await page.waitForTimeout(420);
  await page.screenshot({ path: path.join(TEX_DIR, 'app-dark-disarm-closed.png') });

  await close();
  console.log('5/5 Darkroom Constellation & Disarm @2x done');
}

fs.writeFileSync(LAYOUT_OUT, JSON.stringify(layout, null, 2));
console.log('ALL V6 TEXTURES CAPTURED ->', LAYOUT_OUT);
process.exit(0);
