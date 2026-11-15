import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SOURCE = readFileSync(new URL('../client.js', import.meta.url), 'utf8');

/* Evaluate the browser module with a stub loader and return its pure helpers.
   Every call yields a fresh module, so module-level stores never leak between
   tests. React hooks are only touched at render time, which tests never do. */
function loadClient() {
  let definition;
  const window = { __ModuleLoader__: { load(value) { definition = value; } } };
  new Function('window', SOURCE)(window);
  const plugin = definition.factory((id) => {
    if (id === 'react') return { createElement: () => null };
    throw new Error(`unexpected require: ${id}`);
  });
  assert.equal(typeof plugin.apply, 'function');
  assert.ok(!Object.keys(plugin).includes('__internals'), 'internals must stay non-enumerable');
  return plugin.__internals;
}

const t = (key) => key;

/* desktop 0.2.2-rc.3: explicit switch, owner ids on tasks. */
function rcTeam(overrides = {}) {
  return {
    enabled: true,
    tasks: [
      { id: 'task-1', revision: 3, subject: 'A', description: 'a', status: 'completed', blockedBy: [], writeScopes: ['src/a'], ownerId: 'S-lead', ownerName: 'lead', ready: true, writeScopeWarnings: [] },
      { id: 'task-2', revision: 2, subject: 'B', description: '', status: 'in_progress', blockedBy: ['task-1'], writeScopes: [], ownerId: 'S-b', ownerName: 'bob', ready: true, writeScopeWarnings: [] },
      { id: 'task-3', revision: 1, subject: 'C', description: '', status: 'pending', blockedBy: ['task-2'], writeScopes: [], ready: false, writeScopeWarnings: [] },
    ],
    ...overrides,
  };
}

/* dsh 0.2.1-alpha.4: roster, no switch, no owner ids, Lead named "lead". */
function alphaTeam() {
  return {
    members: [
      { id: 'S-lead', name: 'lead', role: 'lead', phase: 'active' },
      { id: 'S-b', name: 'bob', role: 'teammate', phase: 'active' },
      { id: 'S-c', name: 'cara', role: 'teammate', phase: 'failed', error: 'spawn failed' },
    ],
    tasks: [
      { id: 'task-1', revision: 3, subject: 'A', description: '', status: 'completed', blockedBy: [], writeScopes: [], ownerName: 'lead', ready: true, writeScopeWarnings: [] },
      { id: 'task-2', revision: 2, subject: 'B', description: '', status: 'in_progress', blockedBy: ['task-1'], writeScopes: [], ownerName: 'bob', ready: true, writeScopeWarnings: [] },
    ],
  };
}

function withoutTask(team, id) {
  return { ...team, tasks: team.tasks.filter((task) => task.id !== id) };
}

function withRevision(team, id, revision) {
  return { ...team, tasks: team.tasks.map((task) => (task.id === id ? { ...task, revision } : task)) };
}

test('normalizeTeam keeps the rc.3 shape', () => {
  const { normalizeTeam } = loadClient();
  const team = normalizeTeam(rcTeam(), 'S-lead');
  assert.equal(team.enabled, true);
  assert.equal(team.members, null);
  assert.equal(team.leadId, 'S-lead');
  assert.deepEqual(team.tasks.map((task) => [task.id, task.ownerId]), [
    ['task-1', 'S-lead'],
    ['task-2', 'S-b'],
    ['task-3', undefined],
  ]);
  assert.equal(normalizeTeam(rcTeam({ enabled: false }), 'S-lead').enabled, false);
});

test('normalizeTeam reads the alpha.4 roster shape', () => {
  const { normalizeTeam } = loadClient();
  const team = normalizeTeam(alphaTeam(), 'S-lead');
  assert.equal(team.enabled, true, 'a Team with tasks is on without a switch');
  assert.equal(team.leadId, 'S-lead');
  assert.equal(team.tasks[0].ownerId, 'S-lead', 'the literal "lead" resolves to the Lead');
  assert.equal(team.tasks[1].ownerId, 'S-b', 'teammate names resolve through the roster');
  assert.deepEqual(team.members.find((member) => member.id === 'S-c'), {
    id: 'S-c', name: 'cara', role: 'teammate', phase: 'failed', error: 'spawn failed',
  });
});

test('normalizeTeam infers the implicit switch from tasks and teammates', () => {
  const { normalizeTeam } = loadClient();
  const lead = { id: 'S-lead', name: 'lead', role: 'lead', phase: 'active' };
  assert.equal(normalizeTeam({ members: [lead], tasks: [] }, 'S-lead').enabled, false);
  const mate = { id: 'S-b', name: 'bob', role: 'teammate', phase: 'provisioning' };
  assert.equal(normalizeTeam({ members: [lead, mate], tasks: [] }, 'S-lead').enabled, true);
});

test('normalizeTeam drops deleted and unknown statuses', () => {
  const { normalizeTeam } = loadClient();
  const raw = rcTeam();
  raw.tasks[1] = { ...raw.tasks[1], status: 'deleted' };
  raw.tasks[2] = { ...raw.tasks[2], status: 'cancelled' };
  assert.deepEqual(normalizeTeam(raw, 'S-lead').tasks.map((task) => task.id), ['task-1']);
});

test('normalizeTeam treats absent or unreadable values as unknown and warns once', () => {
  const { normalizeTeam } = loadClient();
  const warnings = [];
  const original = console.warn;
  console.warn = (...args) => warnings.push(args);
  try {
    assert.equal(normalizeTeam(undefined, 'S'), undefined);
    assert.equal(normalizeTeam(null, 'S'), undefined);
    assert.equal(normalizeTeam({}, 'S'), undefined);
    assert.equal(normalizeTeam({ tasks: 'nope' }, 'S'), undefined);
  } finally {
    console.warn = original;
  }
  assert.equal(warnings.length, 1);
});

test('normalizeTeam returns one object per raw value and content', () => {
  const { normalizeTeam } = loadClient();
  const raw = rcTeam();
  const first = normalizeTeam(raw, 'S-lead');
  assert.equal(normalizeTeam(raw, 'S-lead'), first);
  raw.tasks[2] = { ...raw.tasks[2], status: 'in_progress', revision: 2 };
  const second = normalizeTeam(raw, 'S-lead');
  assert.notEqual(second, first, 'an in-place change must not serve the old view');
  assert.equal(second.tasks[2].status, 'in_progress');
});

test('a pull after a deletion beats the stale projection', () => {
  const { newestTeam, storeFallbackTeam, readFallbackTeam, normalizeTeam } = loadClient();
  const stale = rcTeam();
  assert.equal(newestTeam(stale, stale, undefined), stale);
  storeFallbackTeam('S', withoutTask(stale, 'task-3'));
  const chosen = newestTeam(stale, stale, readFallbackTeam('S'));
  assert.equal(chosen, readFallbackTeam('S'));
  assert.equal(normalizeTeam(chosen, 'S').tasks.length, 2);
});

test('a pull that empties the board beats the stale projection', () => {
  const { newestTeam, storeFallbackTeam, readFallbackTeam, normalizeTeam } = loadClient();
  const stale = rcTeam();
  newestTeam(stale, undefined, undefined);
  storeFallbackTeam('S', rcTeam({ tasks: [] }));
  const chosen = newestTeam(stale, stale, readFallbackTeam('S'));
  assert.equal(normalizeTeam(chosen, 'S').tasks.length, 0);
});

test('a switch or failure change without revisions still lands', () => {
  const { newestTeam, storeFallbackTeam, readFallbackTeam, normalizeTeam } = loadClient();
  const stale = rcTeam();
  newestTeam(stale, undefined, undefined);
  storeFallbackTeam('S', rcTeam({ enabled: false }));
  assert.equal(normalizeTeam(newestTeam(stale, stale, readFallbackTeam('S')), 'S').enabled, false);

  const failing = rcTeam({ failure: 'bad record' });
  storeFallbackTeam('F', failing);
  newestTeam(stale, undefined, undefined);
  assert.equal(normalizeTeam(newestTeam(stale, undefined, readFallbackTeam('F')), 'F').failure, 'bad record');
});

test('shared task revisions outrank first sight', () => {
  const { newestTeam, compareTeams } = loadClient();
  const newer = withRevision(rcTeam(), 'task-2', 5);
  newestTeam(newer, undefined, undefined);
  const lateStaleCopy = rcTeam();
  assert.equal(compareTeams(lateStaleCopy, newer), -1);
  assert.equal(newestTeam(newer, lateStaleCopy, undefined), newer);
  assert.equal(newestTeam(lateStaleCopy, newer, undefined), newer);
});

test('a re-confirmed pull wins back over a newer-seen equal-revision value', () => {
  const { newestTeam, storeFallbackTeam, readFallbackTeam } = loadClient();
  storeFallbackTeam('S', rcTeam());
  const pulled = readFallbackTeam('S');
  const laterFrame = rcTeam({ enabled: false });
  assert.equal(newestTeam(laterFrame, undefined, pulled), laterFrame, 'seen after the pull, so newer');
  storeFallbackTeam('S', rcTeam());
  assert.equal(readFallbackTeam('S'), pulled, 'an equal pull keeps the stored object');
  assert.equal(newestTeam(laterFrame, undefined, readFallbackTeam('S')), pulled);
});

test('the fallback store keeps identity for equal pulls and stays bounded', () => {
  const { storeFallbackTeam, readFallbackTeam, FALLBACK_LIMIT } = loadClient();
  const first = rcTeam();
  storeFallbackTeam('S', first);
  storeFallbackTeam('S', rcTeam());
  assert.equal(readFallbackTeam('S'), first);
  const changed = withRevision(rcTeam(), 'task-3', 2);
  storeFallbackTeam('S', changed);
  assert.equal(readFallbackTeam('S'), changed);

  for (let index = 0; index <= FALLBACK_LIMIT; index += 1) storeFallbackTeam(`s${index}`, rcTeam());
  assert.equal(readFallbackTeam('S'), undefined, 'the oldest Session is evicted');
  assert.ok(readFallbackTeam(`s${FALLBACK_LIMIT}`));
});

test('a stored pull clears the unsupported mark', () => {
  const { markUnsupported, unsupportedSessions, storeFallbackTeam } = loadClient();
  markUnsupported('S');
  assert.ok(unsupportedSessions.has('S'));
  storeFallbackTeam('S', rcTeam());
  assert.ok(!unsupportedSessions.has('S'));
});

test('pullPlan only pulls fast for a Team at work', () => {
  const { pullPlan, normalizeTeam } = loadClient();
  const idle = { running: false, teamRunning: false, unsupported: false };
  const open = normalizeTeam(rcTeam(), 'S-lead');
  const done = normalizeTeam(rcTeam({
    tasks: rcTeam().tasks.map((task) => ({ ...task, status: 'completed' })),
  }), 'S-lead');
  const empty = normalizeTeam(rcTeam({ tasks: [] }), 'S-lead');
  const off = normalizeTeam(rcTeam({ enabled: false }), 'S-lead');

  assert.equal(pullPlan(open, { ...idle, running: true }), 'fast');
  assert.equal(pullPlan(open, { ...idle, teamRunning: true }), 'fast');
  assert.equal(pullPlan(open, idle), 'slow', 'unfinished work with unknown activity');
  assert.equal(pullPlan(open, { ...idle, unsupported: true }), 'slow', 'visible tasks override the mark');
  assert.equal(pullPlan(done, idle), 'off');
  assert.equal(pullPlan(done, { ...idle, running: true }), 'fast');

  assert.equal(pullPlan(undefined, idle), 'off');
  assert.equal(pullPlan(undefined, { ...idle, running: true }), 'slow');
  assert.equal(pullPlan(empty, { ...idle, running: true }), 'slow');
  assert.equal(pullPlan(off, { ...idle, running: true }), 'slow');
  assert.equal(pullPlan(empty, { ...idle, running: true, unsupported: true }), 'off');
});

test('buildModel takes teammates from the roster and names the Lead', () => {
  const { normalizeTeam, buildModel, ownerDisplay } = loadClient();
  const team = normalizeTeam(alphaTeam(), 'S-lead');
  const catalog = [{ id: 'S-x', name: 'plain-subagent' }];
  const statuses = new Map([['S-b', { running: true }]]);
  const model = buildModel(team, catalog, statuses, {}, 'S-lead');
  assert.equal(model.leadId, 'S-lead');
  assert.deepEqual(model.mates.map((mate) => [mate.id, mate.lead, mate.running, mate.phase]), [
    ['S-lead', true, false, 'active'],
    ['S-b', false, true, 'active'],
    ['S-c', false, false, 'failed'],
  ]);
  assert.equal(ownerDisplay(team.tasks[0], model, t), 'card.lead', 'never the raw "lead"');
  assert.equal(ownerDisplay(team.tasks[1], model, t), 'bob');
});

test('buildModel falls back to the subagent catalog without a roster', () => {
  const { normalizeTeam, buildModel } = loadClient();
  const team = normalizeTeam(rcTeam(), 'S-lead');
  const catalog = [{ id: 'S-b', label: 'Bob' }];
  const model = buildModel(team, catalog, new Map(), { 'S-b': { running: true } }, 'S-lead');
  assert.deepEqual(model.mates.map((mate) => [mate.id, mate.label, mate.running]), [
    ['S-lead', '', false],
    ['S-b', 'Bob', true],
  ]);
  assert.deepEqual(model.lanes.pending.map((task) => task.id), ['task-3']);
  assert.deepEqual(model.dependents.get('task-1'), ['task-2']);
});
