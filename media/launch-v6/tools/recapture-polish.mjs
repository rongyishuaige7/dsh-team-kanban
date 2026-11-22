import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openCdpPage } from './cdp-helper.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO = path.resolve(__dirname, '../../../prototype/team-kanban-prototype.html');
const TEX_DIR = path.resolve(__dirname, '../public/textures');
const protoUrl = (q = '') => `file://${PROTO}?play=1&gaze=1${q ? '&' + q : ''}`;

// Polish 1: Recapture `outro-relay-unlock.png` right at Step 11 (#3 completed -> 920ms emerald relay curve spans across 3 lanes to #4 in Pending with `is-unlocked`!)
{
  const { page, close } = await openCdpPage({ width: 1920, height: 1080, scale: 2 });
  await page.goto(protoUrl('theme=light'), { waitUntil: 'load' });
  await page.evaluate(() => {
    document.getElementById('ptBar').style.display = 'none';
    const stage = document.querySelector('.pt-stage');
    stage.style.padding = '0';
    stage.style.height = '100vh';
    const app = document.getElementById('app');
    app.style.height = '100vh';
    app.style.borderRadius = '0';
    app.style.border = 'none';
    document.getElementById('side').style.setProperty('--side-w', '1140px');
  });
  for (let i = 0; i < 11; i++) {
    await page.evaluate(() => document.querySelector('#ptBar button[data-act="next"]').click());
  }
  await page.addStyleTag({
    content: `.tkb-wire { animation: none !important; stroke-dashoffset: 0 !important; }`,
  });
  await page.waitForTimeout(600);

  await page.evaluate(() => {
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
        y2 = e.top - rr.top + 22;
      const k = Math.max(40, Math.abs(x2 - x1) * 0.45);
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
        dot.setAttribute('r', '3.2');
        dot.setAttribute('class', 'tkb-wire-dot tkb-wire--relay');
        wires.appendChild(dot);
      });
    }
  });
  await page.waitForTimeout(120);
  await page.screenshot({
    path: path.join(TEX_DIR, 'outro-relay-unlock.png'),
    clip: { x: 788, y: 84, width: 1124, height: 420 },
  });
  await close();
  console.log('Polished outro-relay-unlock.png');
}

// Polish 2: Recapture `app-dark-constellation.png` & `outro-constellation-dark.png` with ALL 4 critical-path nodes (#1 -> #2 -> #4 -> #6) lit AND left-bowed emerald constellation arcs inside viewport!
{
  const { page, close } = await openCdpPage({ width: 1920, height: 1080, scale: 2 });
  await page.goto(protoUrl('theme=dark'), { waitUntil: 'load' });
  await page.evaluate(() => {
    document.getElementById('ptBar').style.display = 'none';
    const stage = document.querySelector('.pt-stage');
    stage.style.padding = '0';
    stage.style.height = '100vh';
    const app = document.getElementById('app');
    app.style.height = '100vh';
    app.style.borderRadius = '0';
    app.style.border = 'none';
    document.getElementById('side').style.setProperty('--side-w', '1140px');
  });
  for (let i = 0; i < 17; i++) {
    await page.evaluate(() => document.querySelector('#ptBar button[data-act="next"]').click());
  }
  await page.addStyleTag({
    content: `.tkb-wire { animation: none !important; stroke-dashoffset: 0 !important; }`,
  });
  await page.waitForTimeout(600);

  await page.evaluate(() => {
    const root = document.querySelector('.tkb-root');
    const replayBtn = document.querySelectorAll('.tkb-debrief__btn')[0];
    root.setAttribute('data-constellation', '');
    replayBtn.setAttribute('data-active', '');
    const critIds = ['#1', '#2', '#4', '#6'];
    const byNum = new Map();
    document.querySelectorAll('.tkb-card').forEach((c) => {
      const idTxt = c.querySelector('.tkb-card__id')?.textContent?.trim();
      byNum.set(idTxt, c);
      if (critIds.includes(idTxt)) {
        c.classList.add('is-crit-node');
        c.classList.remove('is-stage-lit');
      } else {
        c.classList.remove('is-crit-node', 'is-stage-lit');
      }
    });
    const rr = root.getBoundingClientRect();
    const wires = root.querySelector('.tkb-wires');
    wires.setAttribute('width', rr.width);
    wires.setAttribute('height', rr.height);
    wires.setAttribute('viewBox', `0 0 ${rr.width} ${rr.height}`);
    wires.innerHTML = '';
    const ns = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < critIds.length - 1; i++) {
      const a = byNum.get(critIds[i]).getBoundingClientRect();
      const b = byNum.get(critIds[i + 1]).getBoundingClientRect();
      const x1 = a.left - rr.left + 2;
      const y1 = a.top - rr.top + a.height / 2;
      const x2 = b.left - rr.left + 2;
      const y2 = b.top - rr.top + b.height / 2;
      const bow = 26 + i * 7;
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', `M${x1},${y1} C${x1 - bow},${y1} ${x2 - bow},${y2} ${x2},${y2}`);
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
        dot.setAttribute('r', '3.2');
        dot.setAttribute('class', 'tkb-wire-dot tkb-wire--relay');
        wires.appendChild(dot);
      });
    }
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(TEX_DIR, 'app-dark-constellation.png') });
  await page.screenshot({
    path: path.join(TEX_DIR, 'outro-constellation-dark.png'),
    clip: { x: 780, y: 36, width: 1140, height: 540 },
  });
  await close();
  console.log('Polished app-dark-constellation.png & outro-constellation-dark.png');
}

process.exit(0);
