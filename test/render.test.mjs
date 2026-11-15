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

function boot(pulledValues, { tabs = [], teamControl = true } = {}) {
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
    remote: { session: { projections: async () => ({ ok: true, value: { values: pulledValues } }) } },
    inject: (deps, callback) => {
      if (!teamControl) return;
      callback({
        remote: {
          agentTeams: {
            setEnabled: async (sessionId, enabled) => { teamCalls.push([sessionId, enabled]); },
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
  const { plugin, teamCalls } = boot({ agentTeam: rcTeam });
  await plugin.__internals.disableTeam('S-lead');
  assert.deepEqual(teamCalls, [['S-lead', false]]);
});

test('a host without the team service reports the missing control', async () => {
  const { plugin } = boot({ agentTeam: rcTeam }, { teamControl: false });
  await assert.rejects(() => plugin.__internals.disableTeam('S-lead'), /unavailable/);
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
