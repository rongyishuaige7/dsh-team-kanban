import { chromium } from '/Users/rongyi/Desktop/dsh-team-kanban/node_modules/playwright-core/index.mjs';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO = path.resolve(__dirname, '../../../prototype/team-kanban-prototype.html');
const TEX_DIR = path.resolve(__dirname, '../public/textures-en');
const CLIPS_DIR = path.resolve(__dirname, '../public/clips');
const LAYOUT_OUT = path.resolve(__dirname, '../src/live-layout-en.json');
fs.mkdirSync(TEX_DIR, { recursive: true });
fs.mkdirSync(CLIPS_DIR, { recursive: true });

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Patch prototype page into 100% idiomatic English UI + English task dataset before running steps
async function setupEnglishPage(page, sideW = null) {
  await page.evaluate((sw) => {
    const langBtn = document.querySelector('[data-seg="lang"] button[data-v="en"]');
    if (langBtn) langBtn.click();

    // Translate static mock conversation shell text
    const convHead = document.querySelector('.conv__head span:last-child');
    if (convHead) convHead.textContent = 'Build "Agent Task Board" Plugin';
    const userBubble = document.querySelector('.msg--user');
    if (userBubble) {
      userBubble.textContent =
        'Build the agent-team kanban plugin: align sidebar-right contracts first, then implement watcher & theme tokens in parallel, and verify T1–T6.';
    }
    const aiLead = document.querySelector('.msg--ai');
    if (aiLead) {
      aiLead.textContent = 'Got it. Breaking down tasks with explicit dependencies and dispatching teammates in parallel.';
    }
    const footInput = document.querySelector('.conv__foot');
    if (footInput) footInput.textContent = 'Reply to lead agent...';

    if (sw) {
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
      if (side) side.style.setProperty('--side-w', `${sw}px`);
    }
  }, sideW);
}

// Translate existing tasks in DOM/state after advancing SCRIPT steps so both cards & drawer are crisp English
async function localizeTasksInPlace(page) {
  await page.evaluate(() => {
    const EN_TASKS = {
      'task-1': {
        subject: 'Map sidebar-right tab registration contract',
        description: 'Verify tab-registry.ts & contract/slots.ts;\nconfirm openTabIn / closeIn ordering and same-pane deduplication.',
      },
      'task-2': {
        subject: 'Implement TeamKanbanWatcher auto-lifecycle',
        description: 'Mount on conversation.session.header.actions; sync tab open/close from agentTeam;\nmaintain dismissedSessions guard.',
      },
      'task-3': {
        subject: 'Design --dsw-alias-* tokens & @container queries',
        description: 'Strictly use --dsw-alias-* host variables; 540px / 820px @container tiers; Light & Dark WCAG AA contrast.',
      },
      'task-4': {
        subject: 'Build TeamKanbanBoard 3-lane view & task cards',
        description: 'Three lanes, 0fr→1fr card drawer, SVG lineage curves, FLIP flights & reduced-motion fallback.',
        warnings: ['Write scope client.js overlaps with #3'],
      },
      'task-5': {
        subject: 'Author bilingual teamKanban locale dictionaries',
        description: 'Align zh/en key namespaces with DESIGN.md 3.3 and screen-reader announcements.',
      },
      'task-6': {
        subject: 'Verify end-to-end T1–T6 scenarios on desktop',
        description: 'Install into desktop profile; verify auto-open/close, manual dismiss, theme parity & team disarm.',
      },
    };
    const tkb = window.__TKB;
    if (tkb && tkb.state && Array.isArray(tkb.state.tasks)) {
      for (const t of tkb.state.tasks) {
        const tr = EN_TASKS[t.id];
        if (tr) {
          t.subject = tr.subject;
          t.description = tr.description;
          if (tr.warnings) t.writeScopeWarnings = tr.warnings;
        }
      }
    }
    // Re-trigger relabel + update via lang button click
    const langBtn = document.querySelector('[data-seg="lang"] button[data-v="en"]');
    if (langBtn) langBtn.click();
    // Also clean up any Chinese note text in conversation log
    document.querySelectorAll('.conv__body .call span').forEach((sp) => {
      sp.textContent = sp.textContent
        .replace('梳理 sidebar-right 标签页注册契约', 'Map sidebar-right tab registration contract')
        .replace('实现 TeamKanbanWatcher 自动开闭状态机', 'Implement TeamKanbanWatcher auto-lifecycle')
        .replace('设计看板主题 token 映射与容器断点', 'Design --dsw-alias-* tokens & @container queries')
        .replace('实现 TeamKanbanBoard 三列视图与任务卡片', 'Build TeamKanbanBoard 3-lane view & task cards')
        .replace('编写 teamKanban 中英文字典', 'Author bilingual teamKanban locale dictionaries')
        .replace('联调验收 T1–T6 场景', 'Verify end-to-end T1–T6 scenarios on desktop')
        .replace('探索者', 'Explorer')
        .replace('构建者', 'Builder')
        .replace('设计师', 'Designer')
        .replace('审查员', 'Reviewer')
        .replace('主智能体', 'Lead agent')
        .replace('空闲', 'Idle')
        .replace('运行中', 'Running');
    });
  });
}

async function stepN(page, n) {
  for (let i = 0; i < n; i++) {
    await page.evaluate(() => document.querySelector('#ptBar button[data-act="next"]').click());
  }
  await localizeTasksInPlace(page);
}

async function freezePulses(page) {
  await page.addStyleTag({
    content: `
      .tkb-mate[data-running]::after,
      .tkb-card__live-dot::after,
      .tkb-card[data-live] .tkb-card__rail::after {
        animation: none !important;
      }
    `,
  });
  await page.waitForTimeout(800);
}

const browser = await chromium.launch({ executablePath: CHROME });
const layout = {};

// 1. Full 1920x1080 @2x English Desktop Shell (Step 7) — Light & Dark + Outro crops
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`file://${PROTO}?play=1&gaze=1&theme=light`, { waitUntil: 'networkidle' });
  await setupEnglishPage(page, 1140);
  await stepN(page, 7);
  await freezePulses(page);

  await page.screenshot({ path: path.join(TEX_DIR, 'app-step7-light.png') });

  layout.appStep7 = await page.evaluate(() => {
    const rect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const c4El = [...document.querySelectorAll('.tkb-card')].find(
      (c) => c.querySelector('.tkb-card__id')?.textContent?.trim() === '#4',
    );
    const c4 = c4El ? c4El.getBoundingClientRect() : null;
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

  await page.evaluate(() => { document.body.dataset.theme = 'dark'; });
  await page.waitForTimeout(180);
  await page.screenshot({ path: path.join(TEX_DIR, 'app-step7-dark.png') });

  const sideBox = layout.appStep7.side;
  await page.screenshot({
    path: path.join(TEX_DIR, 'outro-dark-board.png'),
    clip: { x: sideBox.x, y: sideBox.y, width: sideBox.w, height: 640 },
  });

  await page.evaluate(() => { document.body.dataset.theme = 'light'; });
  await page.waitForTimeout(150);
  const headBox = layout.appStep7.head;
  await page.screenshot({
    path: path.join(TEX_DIR, 'outro-head-strip.png'),
    clip: { x: headBox.x, y: headBox.y, width: headBox.w, height: headBox.h },
  });

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

// 2. Hero Card #4 @4x English Cutout
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 4 });
  const page = await ctx.newPage();
  await page.goto(`file://${PROTO}?play=1&gaze=1&theme=light`, { waitUntil: 'networkidle' });
  await setupEnglishPage(page, 1140);
  await stepN(page, 7);
  await freezePulses(page);
  const c4 = layout.appStep7.card4;
  await page.screenshot({
    path: path.join(TEX_DIR, 'card4-hero-4x.png'),
    clip: { x: c4.x, y: c4.y, width: c4.w, height: c4.h },
  });
  await ctx.close();
}

// 3. Narrow 360px @3x English Board — Light & Dark
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await page.goto(`file://${PROTO}?play=1&gaze=1&embed=1&theme=light`, { waitUntil: 'networkidle' });
  await setupEnglishPage(page, null);
  await stepN(page, 4);
  await freezePulses(page);
  await page.evaluate(() => {
    const mc = document.querySelector('.tkb-mc');
    if (mc) mc.click();
  });
  await page.waitForTimeout(240);
  await page.screenshot({ path: path.join(TEX_DIR, 'narrow-360-light.png') });
  await page.evaluate(() => { document.body.dataset.theme = 'dark'; });
  await page.waitForTimeout(180);
  await page.screenshot({ path: path.join(TEX_DIR, 'narrow-360-dark.png') });
  await ctx.close();
}

// 4. Disarm Sequence (1920x1080 @2x English)
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`file://${PROTO}?play=1&gaze=1&theme=light`, { waitUntil: 'networkidle' });
  await setupEnglishPage(page, 1140);
  await stepN(page, 18);
  await freezePulses(page);

  await page.screenshot({ path: path.join(TEX_DIR, 'app-disarm-before.png') });

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

  await page.evaluate(() => {
    document.querySelector('.tkb-team__btn').click();
    const ghost = document.querySelector('.tkb-team__ghost');
    if (ghost) {
      ghost.style.outline = '2px solid #4176e6';
      ghost.style.outlineOffset = '2px';
      ghost.style.boxShadow = 'none';
    }
  });
  await page.waitForTimeout(240);
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

  await page.evaluate(() => {
    const lanes = document.querySelector('.tkb-lanes');
    if (lanes) lanes.style.visibility = 'hidden';
  });
  await page.locator('.tkb-team__pop').screenshot({ path: path.join(TEX_DIR, 'outro-disarm-pop.png') });
  await page.evaluate(() => {
    const lanes = document.querySelector('.tkb-lanes');
    if (lanes) lanes.style.visibility = '';
    document.querySelector('.tkb-team__danger').click();
  });
  await page.waitForTimeout(420);
  await page.screenshot({ path: path.join(TEX_DIR, 'app-disarm-closed.png') });
  await ctx.close();
}

// 5. Live 4x Slowed English Flow Clip (`public/clips/live-flow-en-light.mp4`)
{
  const SPEED = 4;
  const TARGET_VIDEO_SEC = 6.2;
  const REAL_WALL_MS = TARGET_VIDEO_SEC * SPEED * 1000;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tkb-v5-en-flow-'));

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`file://${PROTO}?play=1&gaze=1&embed=1&theme=light&speed=${SPEED}`, { waitUntil: 'networkidle' });
  await setupEnglishPage(page, null);
  await stepN(page, 8);
  await page.waitForTimeout(1000);

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
      await p.evaluate(() => {
        const next = document.querySelector('#ptBar button[data-act="next"]');
        next.click(); next.click(); next.click();
      });
      await localizeTasksInPlace(p);
    }},
    { at: 11400, action: async (p) => {
      await p.evaluate(() => document.querySelector('#ptBar button[data-act="next"]').click());
      await localizeTasksInPlace(p);
    }},
    { at: 13800, action: async (p) => {
      await p.evaluate(() => document.querySelector('#ptBar button[data-act="next"]').click());
      await localizeTasksInPlace(p);
    }},
    { at: 16000, action: async (p) => {
      await p.evaluate(() => {
        const next = document.querySelector('#ptBar button[data-act="next"]');
        next.click(); next.click(); next.click();
      });
      await localizeTasksInPlace(p);
    }},
    { at: 17500, action: async (p) => {
      await p.evaluate(() => document.querySelector('#ptBar button[data-act="next"]').click());
      await localizeTasksInPlace(p);
    }},
    { at: 18900, action: async (p) => {
      await p.evaluate(() => document.querySelector('#ptBar button[data-act="next"]').click());
      await localizeTasksInPlace(p);
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
  await ctx.close();

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

  const outMp4 = path.join(CLIPS_DIR, 'live-flow-en-light.mp4');
  const ff = spawnSync('ffmpeg', [
    '-y', '-f', 'concat', '-safe', '0', '-i', concatPath,
    '-vf', 'fps=30,scale=1920:1200:flags=lanczos',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outMp4,
  ], { stdio: 'inherit' });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (ff.status !== 0) process.exit(ff.status ?? 1);
}

await browser.close();
fs.writeFileSync(LAYOUT_OUT, JSON.stringify(layout, null, 2));
console.log('Saved English textures, live clip, and layout ->', LAYOUT_OUT);
