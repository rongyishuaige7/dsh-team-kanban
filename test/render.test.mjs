import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SOURCE = readFileSync(new URL('../client.js', import.meta.url), 'utf8');

/* A hook-shaped React stand-in: renders run as plain calls, effects are
   collected and run on demand. Enough to walk every render path and catch
   reference errors that `node --check` cannot see. */
function fakeReact() {
  const effects = [];
  return {
    effects,
    React: {
      createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children } }),
      useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
      useRef: (current) => ({ current }),
      useMemo: (factory) => factory(),
      useCallback: (callback) => callback,
      useEffect: (effect) => { effects.push(effect); },
    },
  };
}

function boot(pulledValues, { tabs = [], teamControl = true, teamControlResult = { ok: true } } = {}) {
  const { React, effects } = fakeReact();
  let definition;
  const storage = new Map();
  const window = {
    __ModuleLoader__: { load(value) { definition = value; } },
    localStorage: {
      getItem: (key) => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => { storage.set(key, String(value)); },
      removeItem: (key) => { storage.delete(key); },
    },
  };
  new Function('window', SOURCE)(window);
  const plugin = definition.factory((id) => {
    if (id === 'react') return React;
    throw new Error(`unexpected require: ${id}`);
  });

  const slots = {};
  const opened = [];
  const closed = [];
  const teamCalls = [];
  const disposers = [];
  const ctx = {
    locale: { bind: () => (key) => key, register: () => () => {} },
    effect: (setup) => { disposers.push(setup()); },
    sidebarRightTabs: { register: () => () => {} },
    sidebarRight: {
      registerCloseHandler: () => () => {},
      tabsIn: () => tabs,
      openTabIn: (sessionId, kind) => opened.push([sessionId, kind]),
      closeIn: (sessionId, tabId) => {
        closed.push(tabId);
        const index = tabs.findIndex((tab) => tab && tab.id === tabId);
        if (index >= 0) tabs.splice(index, 1);
      },
    },
    layout: { openRightbar: () => {}, closeRightbar: () => {} },
    slots: {
      inject: (name, register) => register(),
      register: (options, component) => {
        slots[options.name] = component;
        return () => {};
      },
    },
    remote: {
      session: {
        projections: async () => ({
          ok: true,
          value: { values: typeof pulledValues === 'function' ? pulledValues() : pulledValues },
        }),
      },
    },
    inject: (deps, callback) => {
      if (!teamControl) return;
      callback({
        remote: {
          agentTeams: {
            setEnabled: async (sessionId, enabled) => {
              teamCalls.push([sessionId, enabled]);
              return typeof teamControlResult === 'function'
                ? teamControlResult(sessionId, enabled)
                : teamControlResult;
            },
          },
        },
        effect: () => () => {},
      });
    },
  };
  plugin.apply(ctx);
  return { plugin, slots, effects, opened, closed, teamCalls, tabs, storage, disposers, window };
}

function sessionProps(team, { running = false } = {}) {
  const sessionId = 'S-lead';
  const listState = {
    byId: { [sessionId]: { origin: 'user', running } },
    projectionsBySession: { [sessionId]: { values: { agentTeam: team } } },
  };
  return {
    sessionId,
    t: (key) => key,
    useProjection: (key) => (key === 'agentTeam' ? team : undefined),
    useSession: (select) => select({ subagent: null, running }),
    useSessions: (select) => select(listState),
    useSessionStatus: (select) => select(new Map([['S-b', { running: true }]])),
    useTabInfo: () => ({ tab: { actions: { bindCommands: () => () => {} } } }),
  };
}

/* Expand function elements depth-first, the way React would render them. */
function renderTree(node, visit) {
  if (Array.isArray(node)) {
    node.forEach((child) => renderTree(child, visit));
    return;
  }
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'function') {
    renderTree(node.type(node.props), visit);
    return;
  }
  visit(node);
  renderTree(node.props.children, visit);
}

function findByClass(node, name) {
  let found = null;
  renderTree(node, (element) => {
    if (found) return;
    const className = element.props && element.props.className;
    if (typeof className === 'string' && className.split(' ').includes(name)) found = element;
  });
  return found;
}

function textOf(node) {
  const parts = [];
  renderTree(node, (element) => {
    element.props.children.flat(Infinity).forEach((child) => {
      if (typeof child === 'string' || typeof child === 'number') parts.push(String(child));
    });
  });
  return parts.join(' ');
}

const rcTeam = {
  enabled: true,
  tasks: [
    { id: 'task-1', revision: 3, subject: 'Alpha', description: 'one', status: 'completed', blockedBy: [], writeScopes: ['src/a'], ownerId: 'S-lead', ownerName: 'lead', ready: true, writeScopeWarnings: [] },
    { id: 'task-2', revision: 2, subject: 'Beta', description: '', status: 'in_progress', blockedBy: ['task-1'], writeScopes: [], ownerId: 'S-b', ownerName: 'bob', ready: true, writeScopeWarnings: ['write scopes overlap with task-3'] },
    { id: 'task-3', revision: 1, subject: 'Gamma', description: '', status: 'pending', blockedBy: ['task-2'], writeScopes: [], ready: false, writeScopeWarnings: [] },
  ],
};

const alphaTeam = {
  members: [
    { id: 'S-lead', name: 'lead', role: 'lead', phase: 'active' },
    { id: 'S-b', name: 'bob', role: 'teammate', phase: 'active' },
  ],
  tasks: rcTeam.tasks.map(({ ownerId, ...task }) => task),
};

for (const [label, team] of [['rc.3', rcTeam], ['alpha.4', alphaTeam]]) {
  test(`board and tab chip render the ${label} shape`, () => {
    const { slots } = boot({ agentTeam: team });
    const props = sessionProps(team);

    const chip = slots['sidebar.right.pane.tab.title'](props);
    assert.match(textOf(chip), /1\/3/);

    const board = slots['sidebar.right.pane.tab'](props);
    const text = textOf(board);
    for (const subject of ['Alpha', 'Beta', 'Gamma']) assert.ok(text.includes(subject), subject);
    assert.ok(text.includes('card.lead'), 'the Lead is named through the dictionary');
    assert.ok(!/\blead\b/.test(text.replace(/card\.lead/g, '')), 'never the raw "lead"');
  });
}

test('tab chip follows a pull that the projection never delivered', () => {
  const { plugin, slots } = boot({});
  const stale = { ...rcTeam, tasks: rcTeam.tasks.slice(0, 1) };
  const props = sessionProps(stale);
  assert.match(textOf(slots['sidebar.right.pane.tab.title'](props)), /1\/1/);
  plugin.__internals.storeFallbackTeam('S-lead', rcTeam);
  assert.match(textOf(slots['sidebar.right.pane.tab.title'](props)), /1\/3/);
});

test('board stays empty for a host without tasks', () => {
  const { slots } = boot({ agentTeam: { members: [], tasks: [] } });
  const props = sessionProps({ members: [{ id: 'S-lead', name: 'lead', role: 'lead', phase: 'active' }], tasks: [] });
  const board = slots['sidebar.right.pane.tab'](props);
  let rendered = false;
  renderTree(board, () => { rendered = true; });
  assert.equal(rendered, false);
});

test('watcher pulls, stores the value, and asks to open the board', async () => {
  const stale = { ...rcTeam, tasks: rcTeam.tasks.slice(0, 1) };
  const { plugin, slots, effects, opened } = boot({ agentTeam: rcTeam });
  const props = sessionProps(stale, { running: true });
  slots['conversation.session.header.actions'](props);

  const cleanups = effects.map((effect) => effect()).filter((cleanup) => typeof cleanup === 'function');
  await new Promise((resolve) => setImmediate(resolve));
  try {
    const { readFallbackTeam, unsupportedSessions } = plugin.__internals;
    assert.equal(readFallbackTeam('S-lead').tasks.length, 3);
    assert.ok(!unsupportedSessions.has('S-lead'));
    assert.deepEqual(opened[0], ['S-lead', 'dsh-team-kanban.board']);
  } finally {
    cleanups.forEach((cleanup) => cleanup());
  }
});

test('an idle session probes once and opens a board created in its last turn', async () => {
  /* No frame ever reaches the client on rc.3, so a turn that creates its first
     task just before it ends leaves the watcher with a stale empty value. The
     idle probe is what makes that case visible at all. */
  const { plugin, slots, effects, opened } = boot({ agentTeam: rcTeam });
  const props = sessionProps(undefined, { running: false });
  slots['conversation.session.header.actions'](props);

  const cleanups = effects.map((effect) => effect()).filter((cleanup) => typeof cleanup === 'function');
  await new Promise((resolve) => setTimeout(resolve, 20));
  try {
    assert.equal(plugin.__internals.readFallbackTeam('S-lead').tasks.length, 3);

    const before = effects.length;
    slots['conversation.session.header.actions'](props);
    const late = effects.slice(before).map((effect) => effect()).filter((cleanup) => typeof cleanup === 'function');
    try {
      assert.deepEqual(opened[0], ['S-lead', 'dsh-team-kanban.board']);
    } finally {
      late.forEach((cleanup) => cleanup());
    }
  } finally {
    cleanups.forEach((cleanup) => cleanup());
  }
});

test('apply leaves a diagnostic record that needs no DevTools', () => {
  const { storage } = boot({ agentTeam: rcTeam });
  const record = JSON.parse(storage.get('team-kanban:diag.v1'));
  assert.match(record.rev, /^\d+\.\d+\.\d+$/);
  assert.equal(record.phase, 'registered');
  assert.equal(record.kind, 'dsh-team-kanban.board');
});

test('the board renders one team switch in the header', () => {
  const { slots } = boot({ agentTeam: rcTeam });
  const board = slots['sidebar.right.pane.tab'](sessionProps(rcTeam));
  const button = findByClass(board, 'tkb-team__btn');
  assert.ok(button, 'the team control sits next to the header');
  assert.equal(button.props['aria-label'], 'team.disable');
  assert.equal(button.props['aria-haspopup'], 'dialog');
});

test('disabling the team calls the only exposed remote method', async () => {
  const { plugin, teamCalls, storage } = boot({ agentTeam: rcTeam });
  await plugin.__internals.disableTeam('S-lead');
  assert.deepEqual(teamCalls, [['S-lead', false]]);
  const record = JSON.parse(storage.get('team-kanban:diag.v1'));
  assert.equal(record.phase, 'team-disabled');
});

test('a host without the team service reports the missing control', async () => {
  const { plugin, storage } = boot({ agentTeam: rcTeam }, { teamControl: false });
  await assert.rejects(
    () => plugin.__internals.disableTeam('S-lead'),
    (err) => err && err.code === 'NO_TEAM_CONTROL' && /unavailable/.test(err.message),
  );
  const record = JSON.parse(storage.get('team-kanban:diag.v1'));
  assert.equal(record.phase, 'team-disable-failed');
  assert.equal(record.code, 'NO_TEAM_CONTROL');
});

test('disabling rejects when the host reports a failure', async () => {
  const { plugin, storage } = boot({ agentTeam: rcTeam }, {
    teamControlResult: { ok: false, error: { code: 'agent-teams/denied', message: 'permission denied' } },
  });
  await assert.rejects(
    () => plugin.__internals.disableTeam('S-lead'),
    (err) => err && err.code === 'agent-teams/denied' && /permission denied/.test(err.message),
  );
  const record = JSON.parse(storage.get('team-kanban:diag.v1'));
  assert.equal(record.phase, 'team-disable-failed');
  assert.equal(record.code, 'agent-teams/denied');

  const fallbackError = boot({ agentTeam: rcTeam }, {
    teamControlResult: { ok: false },
  });
  await assert.rejects(
    () => fallbackError.plugin.__internals.disableTeam('S-lead'),
    /the Host rejected the change/,
  );
});

test('disabling an idle and fully completed board automatically closes it', async () => {
  const completedTeam = {
    enabled: true,
    tasks: [
      { id: 'task-1', revision: 3, subject: 'Done', description: '', status: 'completed', blockedBy: [], writeScopes: [] },
    ],
  };
  const disabledTeam = { ...completedTeam, enabled: false };
  const tabs = [{ id: 'board-tab-1', kind: 'dsh-team-kanban.board', sessionId: 'S-lead' }];
  let currentValues = { agentTeam: completedTeam };

  const { plugin, slots, effects, closed } = boot(
    () => currentValues,
    {
      tabs,
      teamControlResult: async () => {
        currentValues = { agentTeam: disabledTeam };
        return { ok: true };
      },
    },
  );
  const props = sessionProps(completedTeam, { running: false });
  slots['conversation.session.header.actions'](props);
  const cleanups = effects.map((effect) => effect()).filter((cleanup) => typeof cleanup === 'function');

  try {
    /* Allow the initial mount probe (at 0ms) to run and confirm that the board
       remains open while the session projection is enabled. */
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(closed.length, 0, 'the board remains open while enabled after initial mount probe');

    /* Now disable the team. Without requestSettle, an idle board with all tasks
       completed has plan === 'off' and would never probe again. */
    await plugin.__internals.disableTeam('S-lead');
    await new Promise((resolve) => setTimeout(resolve, 20));

    const before = effects.length;
    slots['conversation.session.header.actions'](props);
    const late = effects.slice(before).map((effect) => effect()).filter((cleanup) => typeof cleanup === 'function');
    try {
      assert.deepEqual(closed, ['board-tab-1'], 'the board closes once the disabled projection lands');
    } finally {
      late.forEach((cleanup) => cleanup());
    }
  } finally {
    cleanups.forEach((cleanup) => cleanup());
  }
});

test('a chip left under the 0.3.x kind is closed and replaced', async () => {
  const tabs = [{ id: 'legacy-1', kind: 'team-board', sessionId: 'S-lead' }];
  const { slots, effects, opened, closed } = boot({ agentTeam: rcTeam }, { tabs });
  slots['conversation.session.header.actions'](sessionProps(rcTeam, { running: true }));

  const cleanups = effects.map((effect) => effect()).filter((cleanup) => typeof cleanup === 'function');
  await new Promise((resolve) => setImmediate(resolve));
  try {
    assert.deepEqual(closed, ['legacy-1']);
    assert.deepEqual(opened[0], ['S-lead', 'dsh-team-kanban.board']);
  } finally {
    cleanups.forEach((cleanup) => cleanup());
  }
});

test('watcher marks a host without the Team projection and stops discovering', async () => {
  const warnings = [];
  const warn = console.warn;
  console.warn = (...args) => { warnings.push(args.join(' ')); };
  try {
    const { plugin, slots, effects } = boot({ title: 'no team here' });
    const props = sessionProps(undefined, { running: true });
    slots['conversation.session.header.actions'](props);
    const cleanups = effects.map((effect) => effect()).filter((cleanup) => typeof cleanup === 'function');
    await new Promise((resolve) => setImmediate(resolve));
    try {
      assert.ok(plugin.__internals.unsupportedSessions.has('S-lead'));
      assert.ok(warnings.some((line) => line.includes('agentTeam')), 'the missing projection is reported once');
    } finally {
      cleanups.forEach((cleanup) => cleanup());
    }
  } finally {
    console.warn = warn;
  }
});

test('CSS adheres to host token whitelist and maintains semantic color protection', () => {
  const cssMatch = SOURCE.match(/const CSS = String\.raw`([\s\S]*?)`;/);
  assert.ok(cssMatch, 'CSS constant must exist');
  const css = cssMatch[1];

  // 1. DSW tokens whitelist (only tokens actively used in production client.js)
  const ALLOWED_DSW_TOKENS = new Set([
    '--dsw-alias-bg-base',
    '--dsw-alias-bg-layer-1',
    '--dsw-alias-bg-layer-2',
    '--dsw-alias-card-fill',
    '--dsw-alias-card-fill-hover',
    '--dsw-alias-border-l1',
    '--dsw-alias-border-l2',
    '--dsw-alias-border-l3',
    '--dsw-alias-label-primary',
    '--dsw-alias-label-secondary',
    '--dsw-alias-label-tertiary',
    '--dsw-alias-label-on-color',
    '--dsw-alias-interactive-bg-hover',
    '--dsw-alias-interactive-bg-active',
    '--dsw-alias-state-business-primary',
    '--dsw-alias-state-business-tertiary',
    '--dsw-alias-state-success-primary',
    '--dsw-alias-state-warn-primary',
    '--dsw-alias-state-warn-label',
    '--dsw-alias-state-warn-tertiary',
    '--dsw-alias-state-idle-primary',
    '--dsw-alias-state-error-primary',
    '--dsw-radius-sm',
    '--dsw-radius-md',
  ]);

  const usedTokens = [...new Set([...css.matchAll(/--dsw-[a-z0-9-]+/g)].map((m) => m[0]))];
  for (const token of usedTokens) {
    assert.ok(ALLOWED_DSW_TOKENS.has(token), `token ${token} must be in DSW whitelist`);
  }
  assert.ok(!usedTokens.includes('--dsw-alias-label-primary-inverted'), 'label-primary-inverted should have no remaining callers');

  // 2. Zero naked hex color codes and visual color keywords (expanded comprehensive check)
  const hexColors = [...css.matchAll(/#([0-9a-fA-F]{3,8})\b/g)].map((m) => m[0]);
  assert.deepEqual(hexColors, [], 'CSS must contain zero naked hex color codes');

  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const decls = stripped.split(';').map((s) => s.trim()).filter(Boolean);
  const COLOR_PROPS = /^(background|background-color|color|border|border-[a-z-]+|box-shadow|stroke|fill|outline|outline-color)$/;

  for (const d of decls) {
    const parts = d.split(':');
    if (parts.length < 2) continue;
    const prop = parts[0].trim().toLowerCase();
    const val = parts.slice(1).join(':').trim();
    if (COLOR_PROPS.test(prop) || val.includes('color-mix')) {
      const naked = val.match(/\b(white|black|red|green|blue|orange|purple|violet|yellow|gray|grey)\b/gi);
      assert.ok(!naked, `Naked color keyword "${naked}" found in ${prop}: ${val}`);
      const rgbHsl = val.match(/\b(rgba?|hsla?)\s*\(/gi);
      assert.ok(!rgbHsl, `Naked rgb/hsl function found in ${prop}: ${val}`);
    }
  }

  // 3. [data-s="done"] slot bar shape & color protection (4px slim bar + --tkb-c-done)
  const doneSlotRule = css.match(/\.tkb-slot\[data-s="done"\]\s+\.tkb-slot__bar\s*\{([^}]+)\}/);
  assert.ok(doneSlotRule, 'done slot bar rule must be present');
  assert.match(doneSlotRule[1], /height:\s*4px/, 'done slot bar must have 4px slim height for non-color channel distinction');
  assert.match(doneSlotRule[1], /--tkb-c-done/, 'done slot bar must use --tkb-c-done');
  assert.doesNotMatch(doneSlotRule[1], /--tkb-c-active/, 'done slot bar must not use --tkb-c-active');

  // 4. Completed checkmark glyph contrast protection (>= 3:1)
  const completedGlyphRule = css.match(/\.tkb-glyph--completed\s*\{([^}]+)\}/);
  assert.ok(completedGlyphRule, 'completed glyph rule must exist');
  assert.match(
    completedGlyphRule[1],
    /color-mix\(in srgb, var\(--tkb-c-done\) 80%, var\(--dsw-alias-label-primary\)\)/,
    'completed glyph must darken green for >= 3:1 contrast against white background and checkmark'
  );

  // 5. Tab title arc semantic progression (active blue in progress, success green on 100% complete)
  const titleArcRule = css.match(/\.tkb-title__arc\s*\{([^}]+)\}/);
  assert.ok(titleArcRule, 'title arc rule must exist');
  assert.match(titleArcRule[1], /stroke:\s*var\(--tkb-c-active\)/, 'title arc must default to tech-blue during progress');
  const titleDoneArcRule = css.match(/\.tkb-title\[data-done\]\s+\.tkb-title__arc\s*\{([^}]+)\}/);
  assert.ok(titleDoneArcRule, 'title data-done arc rule must exist');
  assert.match(titleDoneArcRule[1], /stroke:\s*var\(--tkb-c-done\)/, 'title arc must switch to green when fully done');

  // 6. Outlined danger button high-contrast protection (color-mix 85% red with WCAG AA >= 4.5:1)
  const dangerRule = css.match(/\}\s*\.tkb-team__danger\s*\{([^}]+)\}/);
  assert.ok(dangerRule, 'danger disarm button rule must exist');
  assert.match(dangerRule[1], /border:\s*1px\s+solid\s+var\(--dsw-alias-state-error-primary\)/, 'danger button must have red border');
  assert.match(
    dangerRule[1],
    /color:\s*color-mix\(in srgb, var\(--dsw-alias-state-error-primary\) 85%, var\(--dsw-alias-label-primary\)\)/,
    'danger button text must mix 85% error red for destructive semantic cue while maintaining WCAG AA'
  );

  // 7. Completed card background & border readability
  const completedCardRule = css.match(/\.tkb-card\[data-status="completed"\]\s*\{([^}]+)\}/);
  assert.ok(completedCardRule, 'completed card rule must exist');
  assert.match(completedCardRule[1], /var\(--dsw-alias-border-l2\)\s*40%/, 'completed card must use border-l2 40% for subtle boundary');

  // 8. No orphaned keyframes
  const keyframesDefs = [...css.matchAll(/@keyframes\s+([a-z0-9-]+)/g)].map((m) => m[1]);
  assert.ok(keyframesDefs.length > 0, 'keyframes definitions should exist');
  for (const name of keyframesDefs) {
    const usages = [...css.matchAll(new RegExp(`\\b${name}\\b`, 'g'))];
    assert.ok(usages.length >= 2, `keyframe ${name} must be referenced outside its definition`);
  }
});

/**
 * Mathematical WCAG contrast verification fixtures & functions
 */
const HOST_FIXTURE = {
  metadata: {
    source: 'DeepSeek Harness 0.2.2-rc.3 · app.asar · lib/welcome/design-platform.css & base.css',
    extractedDate: '2026-11-16',
    dshRelease: '0.2.2-rc.3',
  },
  light: {
    '--dsw-alias-bg-base': '#fff',
    '--dsw-alias-bg-layer-1': '#fff',
    '--dsw-alias-bg-layer-2': '#fff',
    '--dsw-alias-card-fill': '#fafafa',
    '--dsw-alias-card-fill-hover': '#f5f5f5',
    '--dsw-alias-interactive-bg-hover': 'rgba(38, 49, 72, 0.06)',
    '--dsw-alias-interactive-bg-active': 'rgba(38, 49, 72, 0.1)',
    '--dsw-alias-border-l1': 'rgba(0, 0, 0, 0.04)',
    '--dsw-alias-border-l2': 'rgba(0, 0, 0, 0.1)',
    '--dsw-alias-border-l3': 'rgba(0, 0, 0, 0.12)',
    '--dsw-alias-label-primary': '#0f1115',
    '--dsw-alias-label-primary-inverted': '#fff',
    '--dsw-alias-label-secondary': '#61666b',
    '--dsw-alias-label-tertiary': '#81858c',
    '--dsw-alias-label-on-color': '#fff',
    '--dsw-alias-state-business-primary': '#4176e6',
    '--dsw-alias-state-business-tertiary': '#e4edfd',
    '--dsw-alias-state-success-primary': '#22c55e',
    '--dsw-alias-state-success-tertiary': '#e6faed',
    '--dsw-alias-state-warn-primary': '#f59e0b',
    '--dsw-alias-state-warn-label': '#dd8629',
    '--dsw-alias-state-warn-tertiary': '#fef5e7',
    '--dsw-alias-state-idle-primary': '#d4d4d4',
    '--dsw-alias-state-error-primary': '#ec1313',
    '--dsw-radius-sm': '8px',
    '--dsw-radius-md': '12px',
  },
  dark: {
    '--dsw-alias-bg-base': '#151517',
    '--dsw-alias-bg-layer-1': '#232324',
    '--dsw-alias-bg-layer-2': '#2c2c2e',
    '--dsw-alias-card-fill': '#212123',
    '--dsw-alias-card-fill-hover': '#292929',
    '--dsw-alias-interactive-bg-hover': 'rgba(255, 255, 255, 0.08)',
    '--dsw-alias-interactive-bg-active': 'rgba(255, 255, 255, 0.14)',
    '--dsw-alias-border-l1': 'rgba(255, 255, 255, 0.06)',
    '--dsw-alias-border-l2': 'rgba(255, 255, 255, 0.12)',
    '--dsw-alias-border-l3': 'rgba(255, 255, 255, 0.16)',
    '--dsw-alias-label-primary': '#f9fafb',
    '--dsw-alias-label-primary-inverted': '#353638',
    '--dsw-alias-label-secondary': '#cfd3d6',
    '--dsw-alias-label-tertiary': '#adb2b8',
    '--dsw-alias-label-on-color': '#fff',
    '--dsw-alias-state-business-primary': '#7aaaff',
    '--dsw-alias-state-business-tertiary': '#34415b',
    '--dsw-alias-state-success-primary': '#22c55e',
    '--dsw-alias-state-success-tertiary': '#233c2c',
    '--dsw-alias-state-warn-primary': '#f59e0b',
    '--dsw-alias-state-warn-label': '#dd8629',
    '--dsw-alias-state-warn-tertiary': '#27241f',
    '--dsw-alias-state-idle-primary': '#545557',
    '--dsw-alias-state-error-primary': '#f25a5a',
    '--dsw-radius-sm': '8px',
    '--dsw-radius-md': '12px',
  },
};

function sRGBtoLin(c) {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}
function lum(rgb) {
  return 0.2126 * sRGBtoLin(rgb[0]) + 0.7152 * sRGBtoLin(rgb[1]) + 0.0722 * sRGBtoLin(rgb[2]);
}
function cr(c1, c2) {
  const l1 = lum(c1);
  const l2 = lum(c2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
function parseHex(h) {
  if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function mix(c1, c2, p1) {
  const p2 = 1 - p1;
  return [
    Math.round(c1[0] * p1 + c2[0] * p2),
    Math.round(c1[1] * p1 + c2[1] * p2),
    Math.round(c1[2] * p1 + c2[2] * p2),
  ];
}

test('semantic elements satisfy WCAG AA / non-text mathematical contrast thresholds', () => {
  // 1. Danger button text (85% error red + 15% label-primary) against popup background (bg-layer-2)
  const lightDangerText = mix(parseHex(HOST_FIXTURE.light['--dsw-alias-state-error-primary']), parseHex(HOST_FIXTURE.light['--dsw-alias-label-primary']), 0.85);
  const lightDangerCR = cr(lightDangerText, parseHex(HOST_FIXTURE.light['--dsw-alias-bg-layer-2']));
  assert.ok(lightDangerCR >= 4.5, `light danger text contrast ${lightDangerCR.toFixed(2)}:1 must satisfy WCAG AA (>= 4.5:1)`);

  const darkDangerText = mix(parseHex(HOST_FIXTURE.dark['--dsw-alias-state-error-primary']), parseHex(HOST_FIXTURE.dark['--dsw-alias-label-primary']), 0.85);
  const darkDangerCR = cr(darkDangerText, parseHex(HOST_FIXTURE.dark['--dsw-alias-bg-layer-2']));
  assert.ok(darkDangerCR >= 4.5, `dark danger text contrast ${darkDangerCR.toFixed(2)}:1 must satisfy WCAG AA (>= 4.5:1)`);

  // 2. Ready badge text (75% tech blue + 25% label) against business-tertiary background
  const readyText = mix(parseHex(HOST_FIXTURE.light['--dsw-alias-state-business-primary']), parseHex(HOST_FIXTURE.light['--dsw-alias-label-primary']), 0.75);
  const readyCR = cr(readyText, parseHex(HOST_FIXTURE.light['--dsw-alias-state-business-tertiary']));
  assert.ok(readyCR >= 4.5, `ready badge text contrast ${readyCR.toFixed(2)}:1 must satisfy WCAG AA (>= 4.5:1)`);

  // 3. Blocked badge text (60% warn amber + 40% label) against warn-tertiary background
  const blockedText = mix(parseHex(HOST_FIXTURE.light['--dsw-alias-state-warn-label']), parseHex(HOST_FIXTURE.light['--dsw-alias-label-primary']), 0.6);
  const blockedCR = cr(blockedText, parseHex(HOST_FIXTURE.light['--dsw-alias-state-warn-tertiary']));
  assert.ok(blockedCR >= 4.5, `blocked badge text contrast ${blockedCR.toFixed(2)}:1 must satisfy WCAG AA (>= 4.5:1)`);

  // 4. Completed glyph ring (80% success green + 20% label) against white card background and checkmark
  const doneRing = mix(parseHex(HOST_FIXTURE.light['--dsw-alias-state-success-primary']), parseHex(HOST_FIXTURE.light['--dsw-alias-label-primary']), 0.8);
  const doneRingCR = cr(doneRing, [255, 255, 255]);
  assert.ok(doneRingCR >= 3.0, `completed badge ring contrast ${doneRingCR.toFixed(2)}:1 must satisfy non-text contrast (>= 3.0:1)`);
});

test('prototype mock tokens adhere strictly to host design-platform fixture (anti-drift)', () => {
  const PROTO = readFileSync(new URL('../prototype/team-kanban-prototype.html', import.meta.url), 'utf8');
  const PKG_JSON = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

  // Enforce binding between fixture version and package.json compatibility
  assert.equal(
    PKG_JSON.dsh?.compatibility?.dshReleases?.[HOST_FIXTURE.metadata.dshRelease],
    'compatible',
    `HOST_FIXTURE (${HOST_FIXTURE.metadata.dshRelease}) must be declared compatible in package.json`
  );

  function parseThemeBlock(css, selector) {
    const match = css.match(new RegExp(selector + '\\s*\\{([^}]+)\\}'));
    assert.ok(match, `theme block ${selector} must exist in prototype`);
    const map = {};
    for (const line of match[1].split(';')) {
      const parts = line.split(':');
      if (parts.length === 2 && parts[0].trim().startsWith('--dsw-')) {
        map[parts[0].trim()] = parts[1].trim();
      }
    }
    return map;
  }

  const protoLight = parseThemeBlock(PROTO, 'body\\[data-theme="light"\\]');
  const protoDark = parseThemeBlock(PROTO, 'body\\[data-theme="dark"\\]');

  assert.equal(Object.keys(HOST_FIXTURE.light).length, 26, 'light fixture must have 26 verified tokens');
  assert.equal(Object.keys(HOST_FIXTURE.dark).length, 26, 'dark fixture must have 26 verified tokens');

  for (const [token, expected] of Object.entries(HOST_FIXTURE.light)) {
    assert.equal(protoLight[token], expected, `light token ${token} must match host fixture`);
  }
  for (const [token, expected] of Object.entries(HOST_FIXTURE.dark)) {
    assert.equal(protoDark[token], expected, `dark token ${token} must match host fixture`);
  }

  // Ensure deprecated purple token is absent everywhere
  assert.ok(!PROTO.includes('--dsw-alias-state-done-primary'), 'prototype must not contain --dsw-alias-state-done-primary');
  assert.ok(!SOURCE.includes('--dsw-alias-state-done-primary'), 'client.js must not contain --dsw-alias-state-done-primary');
});

test('prototype and client.js .tkb-* rules maintain strict bidirectional parity', () => {
  const PROTO = readFileSync(new URL('../prototype/team-kanban-prototype.html', import.meta.url), 'utf8');
  const cssMatch = SOURCE.match(/const CSS = String\.raw`([\s\S]*?)`;/);
  assert.ok(cssMatch, 'CSS constant must exist');
  const clientCss = cssMatch[1];

  function extractRules(cssText) {
    const clean = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = new Map();
    let depth = 0;
    let selector = '';
    let body = '';
    let currentAtRule = '';

    let i = 0;
    while (i < clean.length) {
      const ch = clean[i];
      if (ch === '{') {
        depth++;
        if (depth === 1) {
          const lastBoundary = Math.max(clean.lastIndexOf('}', i - 1), clean.lastIndexOf(';', i - 1));
          const textBefore = clean.slice(lastBoundary + 1, i).trim();
          if (textBefore.startsWith('@')) {
            currentAtRule = textBefore.replace(/\s+/g, ' ');
          } else {
            selector = textBefore.replace(/\s+/g, ' ');
          }
        } else if (depth === 2 && currentAtRule) {
          const lastBoundary = Math.max(clean.lastIndexOf('{', i - 1), clean.lastIndexOf('}', i - 1));
          const textBefore = clean.slice(lastBoundary + 1, i).trim();
          selector = textBefore.replace(/\s+/g, ' ');
        }
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          if (!currentAtRule && selector.includes('.tkb-')) {
            rules.set(selector, body.replace(/\s+/g, ' ').trim());
          }
          selector = '';
          body = '';
          currentAtRule = '';
        } else if (depth === 1 && currentAtRule) {
          if (selector.includes('.tkb-')) {
            const qualified = `${currentAtRule} -> ${selector}`;
            rules.set(qualified, body.replace(/\s+/g, ' ').trim());
          }
          selector = '';
          body = '';
        }
      } else {
        if ((depth === 1 && !currentAtRule) || (depth === 2 && currentAtRule)) {
          body += ch;
        }
      }
      i++;
    }
    return rules;
  }

  const clientRules = extractRules(clientCss);
  const protoRules = extractRules(PROTO);

  // Whitelist of allowed unshared rules (client-only or prototype-only)
  const CLIENT_ONLY_SELECTORS = new Set();
  const PROTO_ONLY_SELECTORS = new Set(['.tkb-roll', '.tkb-roll__c', '.tkb-roll__in', '.tkb-roll__out']);

  let sharedCount = 0;
  for (const [sel, cBody] of clientRules) {
    if (protoRules.has(sel)) {
      const pBody = protoRules.get(sel).replace(/\s*\*\s*var\(--tkb-speed,\s*1\)/g, '');
      assert.equal(pBody, cBody, `rule for "${sel}" must be identical between prototype and client.js`);
      sharedCount++;
    } else {
      assert.ok(CLIENT_ONLY_SELECTORS.has(sel), `client-only rule "${sel}" must be explicitly in CLIENT_ONLY_SELECTORS whitelist`);
    }
  }

  for (const [sel] of protoRules) {
    if (!clientRules.has(sel)) {
      assert.ok(PROTO_ONLY_SELECTORS.has(sel), `prototype-only rule "${sel}" must be in PROTO_ONLY_SELECTORS`);
    }
  }

  assert.ok(sharedCount >= 180, `expected at least 180 shared rules between prototype and client.js, got ${sharedCount}`);
  assert.ok(clientRules.size >= 201, `expected at least 201 client .tkb-* rules, got ${clientRules.size}`);
  assert.ok(protoRules.size >= 184, `expected at least 184 prototype .tkb-* rules, got ${protoRules.size}`);
});
