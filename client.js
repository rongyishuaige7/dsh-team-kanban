window.__ModuleLoader__.load({
  id: 'dsh-team-kanban',
  factory(require) {
    'use strict';

    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useMemo, useRef, useState } = React;

    const PKG = 'dsh-team-kanban';
    const NS = 'teamKanban';
    /* Stamped on the board root and on `window` so a running host can be told
       apart from the repository without reading the served bundle. */
    const CLIENT_REV = '0.4.1';
    const TAB_ID = PKG;
    /* Namespaced on purpose: the host turns a kind into the opaque page
       address `sidebar://<kind>`, and a bare `team-board` would be the first
       name an official Inbox-style page would reach for. */
    const KIND = 'dsh-team-kanban.board';
    /* 0.3.x wrote its chips under this bare kind. A saved layout can still
       carry them after the upgrade and nothing else would ever close them. */
    const LEGACY_KINDS = ['team-board'];
    const isBoardKind = (kind) => kind === KIND || LEGACY_KINDS.includes(kind);
    const LANES = ['pending', 'in_progress', 'completed'];
    const EMPTY = Object.freeze([]);

    /* ------------------------------------------------------------------ *
     * Dictionaries (client namespace `teamKanban`)
     * ------------------------------------------------------------------ */

    const zh = {
      'tab.title': '任务板',
      'tab.titleCount': '任务板（{completed}/{total}）',
      'header.progress': '{completed}/{total} 已完成',
      'header.summary': '{completed} 已完成 · {active} 进行中 · {pending} 待处理',
      'header.teammates': '队友运行中 {running}/{total}',
      'header.noTeammates': '暂无活跃队友',
      'column.pending': '待处理',
      'column.in_progress': '进行中',
      'column.completed': '已完成',
      'column.empty': '暂无任务',
      'card.unowned': '未分配',
      'card.ready': '就绪',
      'card.blocked': '被依赖阻塞',
      'card.blockedShort': '阻塞',
      'card.blockedBy': '依赖',
      'card.blocks': '解锁后续',
      'card.writeScopes': '写入范围',
      'card.running': '运行中',
      'card.idle': '空闲',
      'card.lead': '主智能体',
      'error.title': '任务记录异常',
      'error.projection': '任务记录异常：{message}',
      'a11y.board': '智能体任务板',
      'a11y.task': '{id} {subject}，{status}',
      'a11y.created': '新任务 {id}',
      'a11y.moved.pending': '{id} 退回待处理',
      'a11y.moved.in_progress': '{id} 开始执行',
      'a11y.moved.completed': '{id} 已完成',
      'a11y.unlocked': '{id} 已就绪',
      'a11y.deleted': '{id} 已删除',
      'a11y.listSeparator': '；',
    };

    const en = {
      'tab.title': 'Task board',
      'tab.titleCount': 'Task board ({completed}/{total})',
      'header.progress': '{completed}/{total} completed',
      'header.summary': '{completed} completed · {active} in progress · {pending} pending',
      'header.teammates': 'Teammates active {running}/{total}',
      'header.noTeammates': 'No active teammates',
      'column.pending': 'Pending',
      'column.in_progress': 'In progress',
      'column.completed': 'Completed',
      'column.empty': 'No tasks',
      'card.unowned': 'Unowned',
      'card.ready': 'Ready',
      'card.blocked': 'Blocked',
      'card.blockedShort': 'Blocked',
      'card.blockedBy': 'Blocked by',
      'card.blocks': 'Unblocks',
      'card.writeScopes': 'Write scopes',
      'card.running': 'Running',
      'card.idle': 'Idle',
      'card.lead': 'Lead agent',
      'error.title': 'Invalid task record',
      'error.projection': 'Invalid task record: {message}',
      'a11y.board': 'Agent team kanban',
      'a11y.task': '{id} {subject}, {status}',
      'a11y.created': 'New task {id}',
      'a11y.moved.pending': '{id} moved back to pending',
      'a11y.moved.in_progress': '{id} started',
      'a11y.moved.completed': '{id} completed',
      'a11y.unlocked': '{id} is ready',
      'a11y.deleted': '{id} deleted',
      'a11y.listSeparator': '; ',
    };

    /* ------------------------------------------------------------------ *
     * Small helpers
     * ------------------------------------------------------------------ */

    const numId = (id) => {
      const value = parseInt(String(id).replace(/\D+/g, ''), 10);
      return Number.isFinite(value) ? value : 0;
    };
    const shortId = (id) => String(id).replace(/^task-/, '');
    const byNum = (left, right) => numId(left.id) - numId(right.id);
    const firstLine = (value) => String(value || '').split('\n')[0];
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const selectAddressedChild = (snapshot) => snapshot.subagent != null;
    const selectStatusMap = (state) => state;
    const selectSummaries = (state) => state.byId;

    function sessionRunning(statuses, summaries, id) {
      if (!id) return false;
      const status = statuses && typeof statuses.get === 'function' ? statuses.get(id) : undefined;
      const summary = summaries ? summaries[id] : undefined;
      const value = status && status.running !== undefined && status.running !== null
        ? status.running
        : (summary ? summary.running : undefined);
      return value === true;
    }

    function initialOf(value) {
      const text = String(value == null ? '' : value).trim();
      if (!text) return '?';
      const first = Array.from(text)[0];
      return /[a-z]/i.test(first) ? first.toUpperCase() : first;
    }

    function reducedMotion() {
      return typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /* ------------------------------------------------------------------ *
     * Icons (inline SVG only; no primitives package)
     * ------------------------------------------------------------------ */

    function StatusGlyph({ status }) {
      if (status === 'completed') {
        return h('svg', {
          viewBox: '0 0 12 12',
          className: 'tkb-glyph tkb-glyph--completed',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        h('circle', { cx: 6, cy: 6, r: 5.6, fill: 'currentColor' }),
        h('path', {
          className: 'tkb-glyph__check',
          d: 'M3.6 6.1 5.2 7.7 8.4 4.5',
          fill: 'none',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }));
      }
      if (status === 'in_progress') {
        return h('svg', {
          viewBox: '0 0 12 12',
          className: 'tkb-glyph tkb-glyph--in_progress',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        h('circle', { cx: 6, cy: 6, r: 4.6, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 }),
        h('path', { d: 'M6 2.6a3.4 3.4 0 0 1 0 6.8z', fill: 'currentColor' }));
      }
      return h('svg', {
        viewBox: '0 0 12 12',
        className: 'tkb-glyph tkb-glyph--pending',
        'aria-hidden': 'true',
        focusable: 'false',
      },
      h('circle', { cx: 6, cy: 6, r: 4.6, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 }));
    }

    function ChainIcon({ className }) {
      return h('svg', {
        viewBox: '0 0 16 16',
        className: className,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      },
      h('path', { d: 'M6.5 9.5 9.5 6.5' }),
      h('path', { d: 'M7.2 4.6 8.3 3.5a2.5 2.5 0 0 1 3.5 3.5l-1.1 1.1' }),
      h('path', { d: 'M8.8 11.4 7.7 12.5a2.5 2.5 0 0 1-3.5-3.5l1.1-1.1' }));
    }

    function DepArrowIcon({ className }) {
      return h('svg', {
        viewBox: '0 0 12 12',
        className: className,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      },
      h('path', { d: 'M9.5 9.5 3 3' }),
      h('path', { d: 'M3 7.5V3h4.5' }));
    }

    function DownIcon({ className }) {
      return h('svg', {
        viewBox: '0 0 12 12',
        className: className,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      },
      h('path', { d: 'M2.5 2.5 9 9' }),
      h('path', { d: 'M9 4.5V9H4.5' }));
    }

    function ScopeIcon({ className }) {
      return h('svg', {
        viewBox: '0 0 16 16',
        className: className,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.4,
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      },
      h('path', {
        d: 'M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0 1 14 6v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z',
      }));
    }

    function WarnIcon({ className }) {
      return h('svg', {
        viewBox: '0 0 16 16',
        className: className,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      },
      h('path', { d: 'M8 2.5 14 13H2z' }),
      h('path', { d: 'M8 6.5v3' }),
      h('path', { d: 'M8 11.4v.1' }));
    }

    function ErrorIcon({ className }) {
      return h('svg', {
        viewBox: '0 0 16 16',
        className: className,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      },
      h('circle', { cx: 8, cy: 8, r: 6 }),
      h('path', { d: 'M8 5v3.5' }),
      h('path', { d: 'M8 10.8v.1' }));
    }

    /* ------------------------------------------------------------------ *
     * Projection compatibility
     *
     * The experimental `agentTeam` wire view has already shipped in two shapes:
     *   - `{ enabled, tasks[ownerId, ownerName, ...], failure? }`
     *     (desktop 0.2.2-rc.3);
     *   - `{ members[id, name, role, phase, error?], tasks[ownerName, ...],
     *     failure? }` (dsh 0.2.1-alpha.4: implicit-root Teams, no `enabled`,
     *     no `ownerId`, and the Lead's `ownerName` is the literal "lead").
     * Every reader goes through `normalizeTeam`, so the board, the tab chip and
     * the watcher agree on one shape whichever host serves them.
     * ------------------------------------------------------------------ */

    const LEAD_NAME = 'lead';
    const normalizedCache = new WeakMap();
    let shapeWarned = false;

    const listOf = (value) => (Array.isArray(value)
      ? value.filter((item) => typeof item === 'string')
      : []);

    /* Content fingerprint of a raw value. Every task mutation bumps its
       `revision`, so the id/status/revision triple carries most changes; the
       rest covers fields that move without a revision. */
    function teamSignature(raw) {
      if (!raw || typeof raw !== 'object') return 'absent';
      const tasks = Array.isArray(raw.tasks) ? raw.tasks : EMPTY;
      const members = Array.isArray(raw.members) ? raw.members : EMPTY;
      return [
        typeof raw.enabled === 'boolean' ? (raw.enabled ? '1' : '0') : '-',
        raw.failure == null ? '' : String(raw.failure),
        members.map((member) => (member
          ? [member.id, member.name, member.role, member.phase, member.error || ''].join(':')
          : '')).join(','),
        tasks.map((task) => (task
          ? [
            task.id,
            task.status,
            task.revision,
            task.ready ? 1 : 0,
            task.ownerId || '',
            task.ownerName || '',
            task.subject || '',
            Array.isArray(task.blockedBy) ? task.blockedBy.join('+') : '',
          ].join(':')
          : '')).join(','),
      ].join('|');
    }

    function warnShape(raw) {
      if (shapeWarned) return;
      shapeWarned = true;
      try {
        console.warn(
          '[team-kanban] unrecognized agentTeam projection; the board stays hidden.',
          raw && typeof raw === 'object' ? Object.keys(raw) : typeof raw,
        );
      } catch (error) {
        /* A diagnostic only. */
      }
    }

    /* `undefined` means "unknown": the value is absent or unreadable, and the
       watcher must not read that as "no tasks". */
    function normalizeTeam(raw, sessionId) {
      if (raw === undefined || raw === null) return undefined;
      if (typeof raw !== 'object' || !Array.isArray(raw.tasks)) {
        warnShape(raw);
        return undefined;
      }
      const signature = teamSignature(raw);
      const cached = normalizedCache.get(raw);
      if (cached && cached.signature === signature && cached.sessionId === sessionId) return cached.value;

      const members = Array.isArray(raw.members)
        ? raw.members
          .filter((member) => member && typeof member.id === 'string' && member.id)
          .map((member) => ({
            id: member.id,
            name: typeof member.name === 'string' ? member.name : '',
            role: member.role === 'lead' ? 'lead' : 'teammate',
            phase: typeof member.phase === 'string' ? member.phase : 'active',
            error: typeof member.error === 'string' && member.error ? member.error : undefined,
          }))
        : null;
      const leadMember = members ? members.find((member) => member.role === 'lead') : undefined;
      const leadId = leadMember ? leadMember.id : sessionId;
      const idByName = new Map();
      (members || EMPTY).forEach((member) => {
        if (member.role !== 'lead' && member.name && !idByName.has(member.name)) {
          idByName.set(member.name, member.id);
        }
      });

      const tasks = [];
      raw.tasks.forEach((task) => {
        if (!task || typeof task.id !== 'string' || !LANES.includes(task.status)) return;
        const ownerName = typeof task.ownerName === 'string' && task.ownerName ? task.ownerName : undefined;
        let ownerId = typeof task.ownerId === 'string' && task.ownerId ? task.ownerId : undefined;
        if (!ownerId && ownerName) {
          ownerId = idByName.get(ownerName) || (ownerName === LEAD_NAME ? leadId : undefined);
        }
        const revision = Number(task.revision);
        tasks.push({
          id: task.id,
          revision: Number.isFinite(revision) ? revision : 0,
          subject: task.subject == null ? '' : String(task.subject),
          description: task.description == null ? '' : String(task.description),
          status: task.status,
          blockedBy: listOf(task.blockedBy),
          writeScopes: listOf(task.writeScopes),
          writeScopeWarnings: listOf(task.writeScopeWarnings),
          ready: task.ready === true,
          ownerId,
          ownerName,
        });
      });

      const value = {
        /* Implicit-root hosts have no switch: a Team exists once it has tasks
           or teammates. */
        enabled: typeof raw.enabled === 'boolean'
          ? raw.enabled
          : tasks.length > 0 || (members || EMPTY).some((member) => member.role !== 'lead'),
        tasks,
        members,
        leadId,
        failure: raw.failure == null || raw.failure === '' ? undefined : String(raw.failure),
      };
      normalizedCache.set(raw, { signature, sessionId, value });
      return value;
    }

    /* ------------------------------------------------------------------ *
     * Source selection
     *
     * One Session's Team can reach the client by three roads: the per-key face
     * (`useProjection`), the session-list snapshot, and the bounded pull below.
     * Revision sums cannot pick the newest one: deleting a task drops its
     * revisions from the view, and toggling `enabled` or recording a `failure`
     * moves no revision at all. Instead:
     *   1. tasks present in both values decide, since a task's revision only
     *      grows;
     *   2. otherwise the value this plugin first saw latest wins. Host values
     *      are replaced, never mutated, so first sight tracks production time,
     *      and a confirmed pull is re-stamped as the host's value of "now".
     * ------------------------------------------------------------------ */

    let observeClock = 0;
    const observedAt = new WeakMap();

    function observe(value) {
      if (!value || typeof value !== 'object') return -1;
      let stamp = observedAt.get(value);
      if (stamp === undefined) {
        observeClock += 1;
        stamp = observeClock;
        observedAt.set(value, stamp);
      }
      return stamp;
    }

    function restamp(value) {
      if (!value || typeof value !== 'object') return;
      observeClock += 1;
      observedAt.set(value, observeClock);
    }

    /* 1 when `left` is provably newer, -1 when provably older, 0 when the
       shared tasks cannot tell. */
    function compareTeams(left, right) {
      const revisions = new Map();
      (right && Array.isArray(right.tasks) ? right.tasks : EMPTY).forEach((task) => {
        if (task && task.id !== undefined) revisions.set(task.id, Number(task.revision) || 0);
      });
      let newer = false;
      let older = false;
      (left && Array.isArray(left.tasks) ? left.tasks : EMPTY).forEach((task) => {
        if (!task || !revisions.has(task.id)) return;
        const mine = Number(task.revision) || 0;
        const theirs = revisions.get(task.id);
        if (mine > theirs) newer = true;
        else if (mine < theirs) older = true;
      });
      if (newer === older) return 0;
      return newer ? 1 : -1;
    }

    /* Candidates seen for the first time in the same call are stamped in
       argument order, so later arguments win that tie. */
    function newestTeam() {
      let best;
      for (let index = 0; index < arguments.length; index += 1) {
        const candidate = arguments[index];
        if (!candidate || typeof candidate !== 'object') continue;
        const stamp = observe(candidate);
        if (best === undefined) {
          best = candidate;
          continue;
        }
        const order = compareTeams(candidate, best);
        if (order > 0 || (order === 0 && stamp > observe(best))) best = candidate;
      }
      return best;
    }

    /* ------------------------------------------------------------------ *
     * Projection fallback store
     *
     * The Session control stream is the only carrier of projection frames, and
     * on desktop 0.2.2-rc.3 it stops delivering them for a live Session: the
     * board keeps the baseline it was opened with while `running` still moves,
     * because that rides the remote event channel. The watcher pulls the Host's
     * current whole values on a bounded timer (see `pullPlan`) and parks them
     * here, one entry per Session, most recent last.
     * ------------------------------------------------------------------ */

    const FALLBACK_LIMIT = 32;
    const fallbackTeams = new Map();
    const fallbackListeners = new Set();
    /* Sessions whose host answered a pull without any `agentTeam` value: the
       Team feature is not installed there, so discovery stops. */
    const unsupportedSessions = new Set();

    function notifyFallback(sessionId, changed) {
      fallbackListeners.forEach((listener) => listener(sessionId, changed));
    }

    function readFallbackTeam(sessionId) {
      const entry = fallbackTeams.get(sessionId);
      return entry ? entry.value : undefined;
    }

    function storeFallbackTeam(sessionId, value) {
      const signature = teamSignature(value);
      const current = fallbackTeams.get(sessionId);
      const changed = !current || current.signature !== signature;
      /* An equal pull keeps the stored object so memoized views stay put. */
      const kept = changed ? value : current.value;
      restamp(kept);
      fallbackTeams.delete(sessionId);
      fallbackTeams.set(sessionId, { value: kept, signature });
      while (fallbackTeams.size > FALLBACK_LIMIT) {
        fallbackTeams.delete(fallbackTeams.keys().next().value);
      }
      unsupportedSessions.delete(sessionId);
      notifyFallback(sessionId, changed);
    }

    function markUnsupported(sessionId) {
      if (unsupportedSessions.has(sessionId)) return;
      unsupportedSessions.add(sessionId);
      console.warn('[team-kanban] this Host serves no agentTeam projection for', sessionId, '- stopping discovery for it');
      notifyFallback(sessionId, true);
    }

    const PULL_FAST_MS = 2500;
    const PULL_SLOW_MS = 10000;

    /* Pull cadence for one Session:
       - 'fast' while the Team has tasks and the Lead or a teammate runs;
       - 'slow' while tasks are unfinished but nobody is known to run (status
         for a child Session may be missing), or while the Session runs with
         no visible task, so a turn's first `team_task_create` is still seen
         on a host that delivers no projection frames;
       - 'off' when idle, or once a pull showed that this host serves no
         `agentTeam` projection at all. */
    function pullPlan(team, state) {
      const hasTask = !!team && team.enabled === true && team.tasks.length > 0;
      if (hasTask) {
        if (state.running || state.teamRunning) return 'fast';
        return team.tasks.some((task) => task.status !== 'completed') ? 'slow' : 'off';
      }
      if (state.unsupported) return 'off';
      return state.running ? 'slow' : 'off';
    }

    /* The one road every reader takes to the Team value: newest raw value
       among face, list snapshot and pull, then normalized. */
    function useTeamSource(props) {
      const { sessionId, useProjection, useSessions } = props;
      const projected = useProjection('agentTeam');
      const listed = useSessions((state) => {
        const entry = state.projectionsBySession && state.projectionsBySession[sessionId];
        return entry && entry.values ? entry.values.agentTeam : undefined;
      });
      const selected = useRef(undefined);
      const [, bump] = useState(0);
      useEffect(() => {
        const listener = (id, changed) => {
          if (id !== sessionId) return;
          /* A re-confirmed pull only matters when another road is shadowing it. */
          if (changed || selected.current !== readFallbackTeam(id)) bump((count) => count + 1);
        };
        fallbackListeners.add(listener);
        return () => {
          fallbackListeners.delete(listener);
        };
      }, [sessionId]);
      const raw = newestTeam(projected, listed, readFallbackTeam(sessionId));
      selected.current = raw;
      return normalizeTeam(raw, sessionId);
    }

    /* ------------------------------------------------------------------ *
     * Projection -> view model
     * ------------------------------------------------------------------ */

    /* `team` is a `normalizeTeam` value. */
    function buildModel(team, catalog, statuses, summaries, sessionId) {
      const tasks = team ? team.tasks : EMPTY;
      const leadId = team && team.leadId ? team.leadId : sessionId;
      const map = new Map();
      tasks.forEach((task) => map.set(task.id, task));

      const isRunning = (id) => sessionRunning(statuses, summaries, id);

      const ready = [];
      const blocked = [];
      const active = [];
      const done = [];
      tasks.forEach((task) => {
        if (task.status === 'pending') (task.ready ? ready : blocked).push(task);
        else if (task.status === 'in_progress') active.push(task);
        else if (task.status === 'completed') done.push(task);
      });
      ready.sort(byNum);
      blocked.sort(byNum);
      active.sort(byNum);
      done.sort((left, right) => (right.revision || 0) - (left.revision || 0) || byNum(left, right));

      const dependents = new Map();
      tasks.forEach((task) => {
        task.blockedBy.forEach((id) => {
          if (!dependents.has(id)) dependents.set(id, []);
          dependents.get(id).push(task.id);
        });
      });

      const catalogById = new Map();
      (Array.isArray(catalog) ? catalog : EMPTY).forEach((entry) => {
        if (entry && entry.id && !catalogById.has(entry.id)) catalogById.set(entry.id, entry);
      });

      /* A Team roster, when the host publishes one, lists exactly the
         teammates; the subagent catalog also carries ordinary subagents and
         is only the fallback for hosts without a roster. */
      const mates = [];
      const seen = new Set();
      if (team && team.members) {
        team.members.forEach((member) => {
          if (member.role === 'lead' || seen.has(member.id)) return;
          seen.add(member.id);
          mates.push({
            id: member.id,
            label: member.name || member.id,
            running: isRunning(member.id),
            lead: false,
            phase: member.phase,
            error: member.error,
          });
        });
      } else {
        catalogById.forEach((entry) => {
          seen.add(entry.id);
          mates.push({
            id: entry.id,
            label: entry.label || entry.name || entry.id,
            running: isRunning(entry.id),
            lead: false,
            phase: 'active',
            error: undefined,
          });
        });
      }
      const leadOwned = tasks.some((task) => task.ownerId === leadId);
      if (leadOwned && !seen.has(leadId)) {
        mates.unshift({
          id: leadId,
          label: '',
          running: isRunning(leadId),
          lead: true,
          phase: 'active',
          error: undefined,
        });
      }

      const counts = {
        pending: ready.length + blocked.length,
        in_progress: active.length,
        completed: done.length,
      };

      return {
        sessionId,
        leadId,
        tasks,
        map,
        ready,
        blocked,
        active,
        done,
        dependents,
        counts,
        total: tasks.length,
        allDone: tasks.length > 0 && done.length === tasks.length,
        catalogById,
        mates,
        isRunning,
        lanes: { pending: ready.concat(blocked), in_progress: active, completed: done },
      };
    }

    function ownerDisplay(task, model, t) {
      if (!task.ownerId) return null;
      /* Before `ownerName`: hosts name the Lead with the untranslated "lead". */
      if (task.ownerId === model.leadId) return t('card.lead');
      if (task.ownerName) return task.ownerName;
      const entry = model.catalogById.get(task.ownerId);
      if (entry) return entry.label || entry.name || entry.id;
      return task.ownerId;
    }

    function statusText(task, t, owner) {
      if (task.status === 'pending') return task.ready ? t('card.ready') : t('card.blocked');
      if (task.status === 'in_progress') {
        return t('column.in_progress') + ' · ' + (owner || t('card.unowned'));
      }
      return t('column.completed');
    }

    /* ------------------------------------------------------------------ *
     * Board
     * ------------------------------------------------------------------ */

    function TeamKanbanBoard(props) {
      const { sessionId, runtime, useProjection, useSessions, useSessionStatus, useTabInfo, t } = props;

      /* `normalizeTeam` keeps one object per raw value and content, so the
         memo below follows the task data, not only container identity. */
      const team = useTeamSource(props);
      const projectedCatalog = useProjection('subagentCatalog');
      const listedCatalog = useSessions((state) => {
        const entry = state.projectionsBySession && state.projectionsBySession[sessionId];
        return entry && entry.values ? entry.values.subagentCatalog : undefined;
      });
      const catalog = projectedCatalog || listedCatalog;
      const catalogSignature = Array.isArray(catalog)
        ? catalog.map((entry) => (entry
          ? [entry.id, entry.label || '', entry.name || '', entry.mode || ''].join(':')
          : '')).join('|')
        : 'absent';
      const statuses = useSessionStatus(selectStatusMap);
      const summaries = useSessions(selectSummaries);
      const tabInfo = useTabInfo();

      const [expandedId, setExpandedId] = useState(null);
      const [spot, setSpot] = useState(null);
      const [pinned, setPinned] = useState(false);
      const [lineageId, setLineageId] = useState(null);
      const [flashId, setFlashId] = useState(null);
      const [tip, setTip] = useState(null);
      const [entering, setEntering] = useState(true);
      const [announcement, setAnnouncement] = useState('');

      const rootRef = useRef(null);
      const gridRef = useRef(null);
      const tipTimer = useRef(0);
      const lineageTimer = useRef(0);
      const uiTimers = useRef({});
      const previousTasks = useRef(null);
      const pinnedRef = useRef(false);

      const model = useMemo(
        () => buildModel(team, catalog, statuses, summaries, sessionId),
        [team, catalog, catalogSignature, statuses, summaries, sessionId],
      );

      useEffect(() => {
        if (!spot) return;
        const known = model.mates.some((mate) => mate.id === spot)
          || model.tasks.some((task) => task.ownerId === spot);
        if (known) return;
        pinnedRef.current = false;
        setPinned(false);
        setSpot(null);
      }, [model, spot]);

      useEffect(() => {
        if (expandedId && !model.map.has(expandedId)) setExpandedId(null);
      }, [model, expandedId]);

      useEffect(() => {
        if (lineageId && !model.map.has(lineageId)) setLineageId(null);
      }, [model, lineageId]);

      const hideTip = useCallback(() => {
        clearTimeout(tipTimer.current);
        tipTimer.current = 0;
        setTip(null);
      }, []);

      const queueTip = useCallback((target, title, sub) => {
        if (!target) return;
        clearTimeout(lineageTimer.current);
        setLineageId(null);
        clearTimeout(tipTimer.current);
        tipTimer.current = setTimeout(() => {
          const root = rootRef.current;
          if (!root) return;
          const rootRect = root.getBoundingClientRect();
          const rect = target.getBoundingClientRect();
          if (!rect.width && !rect.height) return;
          const half = 110;
          const left = clamp(
            rect.left - rootRect.left + rect.width / 2,
            half + 6,
            Math.max(half + 6, rootRect.width - half - 6),
          );
          let top = rect.top - rootRect.top - 36;
          if (top < 4) top = rect.bottom - rootRect.top + 6;
          setTip({ left, top, title: String(title || ''), sub: String(sub || '') });
        }, 190);
      }, []);

      useEffect(() => {
        const timer = setTimeout(() => setEntering(false), 1000);
        return () => clearTimeout(timer);
      }, []);

      useEffect(() => {
        const timers = uiTimers.current;
        return () => {
          clearTimeout(tipTimer.current);
          clearTimeout(lineageTimer.current);
          Object.keys(timers).forEach((key) => clearTimeout(timers[key]));
        };
      }, []);

      useEffect(() => {
        const tab = tabInfo && tabInfo.tab;
        const actions = tab && tab.actions;
        if (!actions || typeof actions.bindCommands !== 'function') return undefined;
        return actions.bindCommands({
          refresh: () => {
            try {
              const pending = runtime.sessions.refreshProjections(sessionId);
              if (pending && typeof pending.catch === 'function') pending.catch(() => {});
            } catch (error) {
              /* A refresh is best effort; projections still arrive on their own. */
            }
          },
        });
      }, [tabInfo, runtime, sessionId]);

      useEffect(() => {
        const previous = previousTasks.current;
        const current = new Map(model.tasks.map((task) => [task.id, task]));
        if (previous !== null) {
          const parts = [];
          model.tasks.forEach((task) => {
            const before = previous.get(task.id);
            const id = '#' + shortId(task.id);
            if (!before) {
              parts.push(t('a11y.created', { id }));
              return;
            }
            if (before.status !== task.status) {
              parts.push(t('a11y.moved.' + task.status, { id }));
            }
            if (before.status === 'pending' && task.status === 'pending' && !before.ready && task.ready) {
              parts.push(t('a11y.unlocked', { id }));
            }
          });
          previous.forEach((task, id) => {
            if (!current.has(id)) parts.push(t('a11y.deleted', { id: '#' + shortId(id) }));
          });
          if (parts.length) setAnnouncement(parts.join(t('a11y.listSeparator')));
        }
        previousTasks.current = current;
      }, [model, t]);

      const lineage = useMemo(() => {
        if (!lineageId) return null;
        const task = model.map.get(lineageId);
        if (!task) return null;
        const blockers = Array.isArray(task.blockedBy) ? task.blockedBy : EMPTY;
        const upstream = blockers.filter((id) => model.map.has(id));
        const downstream = model.dependents.get(lineageId) || EMPTY;
        if (!upstream.length && !downstream.length) return null;
        return {
          id: lineageId,
          up: new Set(upstream),
          down: new Set(downstream),
        };
      }, [lineageId, model]);

      const jumpTo = useCallback((taskId) => {
        const root = rootRef.current;
        if (!root) return;
        const card = Array.from(root.querySelectorAll('.tkb-card'))
          .find((element) => element.getAttribute('data-task-id') === taskId);
        if (!card) return;
        card.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
        const hit = card.querySelector('.tkb-card__hit');
        if (hit && typeof hit.focus === 'function') {
          try { hit.focus({ preventScroll: true }); } catch (error) { hit.focus(); }
        }
        setFlashId(taskId);
        clearTimeout(uiTimers.current.flash);
        uiTimers.current.flash = setTimeout(() => setFlashId(null), 1100);
      }, []);

      const toggleTask = useCallback((taskId) => {
        setExpandedId((current) => (current === taskId ? null : taskId));
        setLineageId(null);
      }, []);

      const enterCard = useCallback((task) => {
        hideTip();
        if (spot) return;
        clearTimeout(lineageTimer.current);
        lineageTimer.current = setTimeout(() => setLineageId(task.id), 150);
      }, [spot, hideTip]);

      const leaveCard = useCallback(() => {
        clearTimeout(lineageTimer.current);
        setLineageId(null);
      }, []);

      const hoverMate = useCallback((id) => {
        if (!pinnedRef.current) setSpot(id);
      }, []);

      const leaveMate = useCallback(() => {
        if (!pinnedRef.current) setSpot(null);
      }, []);

      const togglePin = useCallback((id) => {
        const active = pinnedRef.current && spot === id;
        pinnedRef.current = !active;
        if (active) {
          setPinned(false);
          setSpot(null);
        } else {
          setPinned(true);
          setSpot(id);
        }
      }, [spot]);

      const handleKeyDown = useCallback((event) => {
        if (event.key === 'Escape') {
          if (expandedId) {
            const id = expandedId;
            setExpandedId(null);
            const root = rootRef.current;
            const card = root
              ? Array.from(root.querySelectorAll('.tkb-card')).find((element) => element.getAttribute('data-task-id') === id)
              : null;
            const hit = card && card.querySelector('.tkb-card__hit');
            if (hit) hit.focus({ preventScroll: true });
            event.preventDefault();
          } else if (spot) {
            pinnedRef.current = false;
            setPinned(false);
            setSpot(null);
            event.preventDefault();
          }
          return;
        }
        const target = event.target;
        if (!target || !target.classList || !target.classList.contains('tkb-card__hit')) return;
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp'
          && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        const grid = gridRef.current;
        if (!grid) return;
        const lane = target.closest('.tkb-lane');
        const lanes = Array.from(grid.querySelectorAll('.tkb-lane'));
        const laneIndex = lane ? lanes.indexOf(lane) : -1;
        if (!lane || laneIndex < 0) return;
        const cardsIn = (index) => (lanes[index]
          ? Array.from(lanes[index].querySelectorAll('.tkb-card__hit'))
          : []);
        const current = cardsIn(laneIndex);
        const position = current.indexOf(target);
        if (position < 0) return;
        let next = null;
        if (event.key === 'ArrowDown') {
          next = current[position + 1] || cardsIn(laneIndex + 1)[0] || null;
        } else if (event.key === 'ArrowUp') {
          const previous = cardsIn(laneIndex - 1);
          next = current[position - 1] || (previous.length ? previous[previous.length - 1] : null);
        } else {
          const step = event.key === 'ArrowRight' ? 1 : -1;
          for (let cursor = laneIndex + step; cursor >= 0 && cursor < lanes.length; cursor += step) {
            const candidates = cardsIn(cursor);
            if (candidates.length) {
              next = candidates[Math.min(position, candidates.length - 1)];
              break;
            }
          }
        }
        if (!next) return;
        event.preventDefault();
        next.focus({ preventScroll: true });
        next.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
      }, [expandedId, spot]);

      const handleScroll = useCallback(() => {
        hideTip();
        clearTimeout(lineageTimer.current);
        setLineageId(null);
      }, [hideTip]);

      if (!team || team.enabled !== true || model.tasks.length === 0) return null;

      const counts = model.counts;
      const total = model.total;
      const failure = team.failure === undefined ? null : team.failure;
      const summary = t('header.summary', {
        completed: counts.completed,
        active: counts.in_progress,
        pending: counts.pending,
      });
      const progressLabel = t('header.progress', { completed: counts.completed, total });
      const runningMates = model.mates.filter((mate) => mate.running).length;
      const matesLabel = model.mates.length
        ? t('header.teammates', { running: runningMates, total: model.mates.length })
        : t('header.noTeammates');

      const segments = total > 24
        ? [
          { key: 'done', state: 'done', count: counts.completed, title: t('column.completed'), sub: String(counts.completed) },
          { key: 'active', state: 'active', count: counts.in_progress, title: t('column.in_progress'), sub: String(counts.in_progress) },
          { key: 'ready', state: 'ready', count: model.ready.length, title: t('card.ready'), sub: String(model.ready.length) },
          { key: 'blocked', state: 'blocked', count: model.blocked.length, title: t('card.blocked'), sub: String(model.blocked.length) },
        ].filter((segment) => segment.count > 0)
        : [
          ...model.done.map((task) => ({
            key: task.id,
            state: 'done',
            task,
            title: '#' + shortId(task.id) + ' ' + task.subject,
            sub: statusText(task, t, ownerDisplay(task, model, t)),
          })),
          ...model.active.map((task) => ({
            key: task.id,
            state: 'active',
            task,
            title: '#' + shortId(task.id) + ' ' + task.subject,
            sub: statusText(task, t, ownerDisplay(task, model, t)),
          })),
          ...model.ready.map((task) => ({
            key: task.id,
            state: 'ready',
            task,
            title: '#' + shortId(task.id) + ' ' + task.subject,
            sub: statusText(task, t, ownerDisplay(task, model, t)),
          })),
          ...model.blocked.map((task) => ({
            key: task.id,
            state: 'blocked',
            task,
            title: '#' + shortId(task.id) + ' ' + task.subject,
            sub: statusText(task, t, ownerDisplay(task, model, t)),
          })),
        ];

      function renderDetail(task) {
        const blockers = Array.isArray(task.blockedBy) ? task.blockedBy : EMPTY;
        const scopes = Array.isArray(task.writeScopes) ? task.writeScopes : EMPTY;
        const warnings = Array.isArray(task.writeScopeWarnings) ? task.writeScopeWarnings : EMPTY;
        const downstream = model.dependents.get(task.id) || EMPTY;

        function refRow(kind, label, ids) {
          return h('div', { className: 'tkb-detail__row' },
            h('span', { className: 'tkb-detail__icw', title: label },
              kind === 'dep' ? h(DepArrowIcon) : h(DownIcon)),
            h('div', { className: 'tkb-detail__items' },
              ids.map((id) => {
                const related = model.map.get(id);
                return h('button', {
                  key: id,
                  type: 'button',
                  className: 'tkb-ref',
                  onClick: (event) => {
                    event.stopPropagation();
                    jumpTo(id);
                  },
                },
                h(StatusGlyph, { status: related ? related.status : 'pending' }),
                h('span', { className: 'tkb-ref__id' }, '#' + shortId(id)),
                h('span', { className: 'tkb-ref__t' }, related ? related.subject : ''));
              })));
        }

        return h('div', { className: 'tkb-card__detail' },
          h('div', { className: 'tkb-detail' },
            h('p', { className: 'tkb-detail__desc' }, task.description || '—'),
            blockers.length ? refRow('dep', t('card.blockedBy'), blockers) : null,
            downstream.length ? refRow('down', t('card.blocks'), downstream) : null,
            scopes.length
              ? h('div', { className: 'tkb-detail__row' },
                h('span', { className: 'tkb-detail__icw', title: t('card.writeScopes') }, h(ScopeIcon)),
                h('div', { className: 'tkb-detail__items' },
                  scopes.map((scope, index) => h('span', {
                    key: scope + ':' + index,
                    className: 'tkb-scope',
                  }, scope))))
              : null,
            warnings.map((warning, index) => h('div', {
              key: warning + ':' + index,
              className: 'tkb-warnline',
            },
            h(WarnIcon),
            h('span', null, warning)))));
      }

      function renderCard(task, laneIndex, cardIndex) {
        const owner = ownerDisplay(task, model, t);
        const running = task.ownerId ? model.isRunning(task.ownerId) : false;
        const expanded = expandedId === task.id;
        const status = statusText(task, t, owner);
        const blockers = Array.isArray(task.blockedBy) ? task.blockedBy : EMPTY;
        const showDeps = task.status === 'pending' && !task.ready && blockers.length > 0;
        const live = task.status === 'in_progress' && running;

        let className = 'tkb-card';
        if (spot && task.ownerId === spot) className += ' is-spot';
        if (lineage) {
          if (lineage.id === task.id) className += ' is-lin';
          if (lineage.up.has(task.id)) {
            className += ' is-lin ';
            className += model.map.get(task.id) && model.map.get(task.id).status === 'completed'
              ? 'is-up-done'
              : 'is-up-open';
          }
          if (lineage.down.has(task.id)) className += ' is-lin is-down';
        }
        if (flashId === task.id) className += ' is-flash';

        let ownerNode = null;
        if (task.ownerId) {
          ownerNode = h('span', { className: 'tkb-card__owner' },
            live ? h('span', { className: 'tkb-card__live-dot', 'aria-hidden': 'true' }) : null,
            h('span', { className: 'tkb-card__owner-name', title: owner }, owner),
            h('button', {
              type: 'button',
              className: 'tkb-mate',
              'data-lead': task.ownerId === model.leadId ? '' : undefined,
              'data-running': running ? '' : undefined,
              'aria-pressed': pinned && spot === task.ownerId,
              'aria-label': owner + ' · ' + (running ? t('card.running') : t('card.idle')),
              onPointerEnter: (event) => {
                hoverMate(task.ownerId);
                queueTip(event.currentTarget, owner, running ? t('card.running') : t('card.idle'));
              },
              onPointerLeave: () => {
                leaveMate();
                hideTip();
              },
              onClick: (event) => {
                event.stopPropagation();
                togglePin(task.ownerId);
              },
            },
            h('span', { className: 'tkb-mate__dot', 'aria-hidden': 'true' }),
            initialOf(owner)));
        } else if (task.status === 'in_progress') {
          ownerNode = h('span', { className: 'tkb-card__owner' },
            h('span', { className: 'tkb-card__owner-name' }, t('card.unowned')),
            h('span', {
              className: 'tkb-mate',
              'data-none': '',
              'aria-label': t('card.unowned'),
              title: t('card.unowned'),
            }, '?'));
        }

        return h('article', {
          key: task.id,
          className,
          'data-task-id': task.id,
          'data-status': task.status,
          'data-ready': task.ready ? 'true' : 'false',
          'data-live': live ? '' : undefined,
          'data-expanded': expanded ? '' : undefined,
          style: { '--i': Math.min(laneIndex + 2 + cardIndex, 10) },
          onPointerEnter: () => enterCard(task),
          onPointerLeave: leaveCard,
        },
        h('button', {
          type: 'button',
          className: 'tkb-card__hit',
          'aria-expanded': expanded,
          'aria-label': t('a11y.task', { id: '#' + shortId(task.id), subject: task.subject, status }),
          onClick: () => toggleTask(task.id),
        }),
        h('span', { className: 'tkb-card__rail', 'aria-hidden': 'true' }),
        h('span', { className: 'tkb-card__glyph', 'aria-hidden': 'true' },
          h(StatusGlyph, { status: 'completed' })),
        h('span', { className: 'tkb-card__id' }, '#' + shortId(task.id)),
        h('span', { className: 'tkb-card__deps' },
          task.status === 'pending'
            ? h('span', {
              className: 'tkb-badge',
              'data-kind': task.ready ? 'ready' : 'blocked',
              title: task.ready ? t('card.ready') : t('card.blocked'),
            }, task.ready ? t('card.ready') : t('card.blockedShort'))
            : null,
          showDeps ? h(DepArrowIcon, { className: 'tkb-card__deps-arrow' }) : null,
          showDeps
            ? blockers.map((depId) => {
              const related = model.map.get(depId);
              const done = !!related && related.status === 'completed';
              return h('button', {
                key: depId,
                type: 'button',
                className: 'tkb-dep',
                'data-done': done ? '' : undefined,
                'aria-label': t('card.blockedBy') + ' #' + shortId(depId)
                  + (related ? ' ' + related.subject : ''),
                onPointerEnter: (event) => queueTip(
                  event.currentTarget,
                  related ? '#' + shortId(depId) + ' ' + related.subject : '#' + shortId(depId),
                  related ? statusText(related, t, ownerDisplay(related, model, t)) : '',
                ),
                onPointerLeave: hideTip,
                onClick: (event) => {
                  event.stopPropagation();
                  jumpTo(depId);
                },
              }, '#' + shortId(depId));
            })
            : null),
        ownerNode,
        h('div', { className: 'tkb-card__title', title: task.subject }, task.subject),
        firstLine(task.description)
          ? h('div', { className: 'tkb-card__preview' }, firstLine(task.description))
          : null,
        expanded ? renderDetail(task) : null);
      }

      function renderLane(key, laneIndex) {
        const laneTasks = model.lanes[key];
        const isEmpty = laneTasks.length === 0;
        const children = [];
        if (isEmpty) {
          children.push(h('div', { key: 'empty', className: 'tkb-empty' },
            h(StatusGlyph, { status: key }),
            h('span', null, t('column.empty'))));
        } else if (key === 'pending') {
          model.ready.forEach((task) => {
            children.push(renderCard(task, laneIndex, children.length));
          });
          if (model.blocked.length) {
            children.push(h('div', {
              key: 'divider',
              className: 'tkb-divider',
              role: 'separator',
              'aria-label': t('card.blocked'),
              onPointerEnter: (event) => queueTip(event.currentTarget, t('card.blocked'), ''),
              onPointerLeave: hideTip,
            }, h(ChainIcon)));
            model.blocked.forEach((task) => {
              children.push(renderCard(task, laneIndex, children.length));
            });
          }
        } else {
          laneTasks.forEach((task) => {
            children.push(renderCard(task, laneIndex, children.length));
          });
        }

        return h('section', {
          key,
          className: 'tkb-lane',
          'data-lane': key,
          'data-empty': isEmpty ? '' : undefined,
          'aria-label': t('column.' + key),
        },
        h('div', { className: 'tkb-lane__head', style: { '--i': laneIndex } },
          h(StatusGlyph, { status: key }),
          h('span', { className: 'tkb-lane__name' }, t('column.' + key)),
          h('span', { className: 'tkb-lane__count' }, String(laneTasks.length))),
        h('div', { className: 'tkb-lane__body' }, children));
      }

      return h('div', {
        ref: rootRef,
        className: 'tkb-root',
        tabIndex: -1,
        role: 'region',
        'aria-label': t('a11y.board'),
        'data-tkb-rev': CLIENT_REV,
        'data-alldone': model.allDone ? '' : undefined,
        'data-spot': spot || undefined,
        'data-lineage': lineage ? '' : undefined,
        'data-entering': entering ? '' : undefined,
        onKeyDown: handleKeyDown,
      },
      h('div', { className: 'tkb-head' },
        h('div', {
          className: 'tkb-score',
          role: 'img',
          'aria-label': progressLabel,
          title: summary,
        },
        h('span', {
          key: 'done-' + counts.completed,
          className: 'tkb-score__done',
        }, String(counts.completed)),
        h('span', { className: 'tkb-score__total' }, '/' + total)),
        h('div', { className: 'tkb-strip', role: 'group', 'aria-label': summary },
          segments.map((segment) => h('button', {
            key: segment.key,
            type: 'button',
            className: 'tkb-slot',
            'data-s': segment.state,
            style: { flexGrow: segment.count != null ? segment.count : 1 },
            tabIndex: -1,
            'aria-hidden': 'true',
            onPointerEnter: (event) => queueTip(event.currentTarget, segment.title, segment.sub),
            onPointerLeave: hideTip,
            onClick: segment.task ? () => jumpTo(segment.task.id) : undefined,
          }, h('span', { className: 'tkb-slot__bar' })))),
        h('div', { className: 'tkb-mates', role: 'group', 'aria-label': matesLabel },
          model.mates.length
            ? model.mates.map((mate) => {
              const label = mate.lead ? t('card.lead') : mate.label;
              const active = pinned && spot === mate.id;
              return h('button', {
                key: mate.id,
                type: 'button',
                className: 'tkb-mc'
                  + (spot === mate.id ? ' is-spot' : '')
                  + (active ? ' is-pinned' : ''),
                'aria-pressed': active,
                'aria-label': label + ' · ' + (mate.running ? t('card.running') : t('card.idle')),
                onPointerEnter: (event) => {
                  hoverMate(mate.id);
                  queueTip(event.currentTarget, label, mate.running ? t('card.running') : t('card.idle'));
                },
                onPointerLeave: () => {
                  leaveMate();
                  hideTip();
                },
                onClick: (event) => {
                  event.stopPropagation();
                  togglePin(mate.id);
                },
              },
              h('span', {
                className: 'tkb-mate',
                'data-lead': mate.lead ? '' : undefined,
                'data-running': mate.running ? '' : undefined,
              },
              h('span', { className: 'tkb-mate__dot', 'aria-hidden': 'true' }),
              initialOf(label)),
              h('span', { className: 'tkb-mc__name' }, label));
            })
            : h('span', { className: 'tkb-mates__empty' }, t('header.noTeammates')))),
      h('div', {
        className: 'tkb-banner',
        'data-open': failure !== null ? '' : undefined,
      },
      h('div', { className: 'tkb-banner__clip', 'aria-hidden': failure === null ? 'true' : undefined },
        h('div', {
          className: 'tkb-banner__box',
          role: failure !== null ? 'alert' : undefined,
          title: failure === null ? undefined : t('error.projection', { message: failure }),
        },
        h(ErrorIcon, { className: 'tkb-banner__icon' }),
        h('div', { className: 'tkb-banner__text' },
          h('div', { className: 'tkb-banner__title' }, t('error.title')),
          h('div', { className: 'tkb-banner__msg' }, failure === null ? '' : failure))))),
      h('div', { ref: gridRef, className: 'tkb-lanes', onScrollCapture: handleScroll },
        LANES.map((key, index) => renderLane(key, index))),
      tip
        ? h('div', {
          className: 'tkb-tip',
          'data-show': '',
          'aria-hidden': 'true',
          style: { left: tip.left, top: tip.top },
        },
        h('b', null, tip.title),
        tip.sub ? h('span', null, tip.sub) : null)
        : null,
      h('div', { className: 'tkb-sr', 'aria-live': 'polite' }, announcement));
    }

    /* ------------------------------------------------------------------ *
     * Tab chip title
     * ------------------------------------------------------------------ */

    function TeamKanbanTitle(props) {
      const { t } = props;
      /* Same road as the board, so the chip count never lags the board. */
      const team = useTeamSource(props);
      const tasks = team && team.enabled === true ? team.tasks : EMPTY;
      const total = tasks.length;
      const completed = tasks.filter((task) => task.status === 'completed').length;
      const ratio = total > 0 ? completed / total : 0;
      const circumference = 2 * Math.PI * 6;

      return h('span', {
        className: 'tkb-title',
        'data-done': total > 0 && completed === total ? '' : undefined,
        'aria-label': total > 0 ? t('tab.titleCount', { completed, total }) : t('tab.title'),
        title: total > 0 ? t('tab.titleCount', { completed, total }) : t('tab.title'),
      },
      h('svg', {
        viewBox: '0 0 16 16',
        className: 'tkb-title__ring',
        'aria-hidden': 'true',
        focusable: 'false',
      },
      h('circle', { className: 'tkb-title__track', cx: 8, cy: 8, r: 6 }),
      h('circle', {
        className: 'tkb-title__arc',
        cx: 8,
        cy: 8,
        r: 6,
        style: {
          strokeDasharray: circumference,
          strokeDashoffset: circumference * (1 - ratio),
        },
      }),
      h('path', { className: 'tkb-title__check', d: 'M5.4 8.2 7.2 10 10.8 6.3' })),
      h('span', { className: 'tkb-title__label' }, t('tab.title')),
      total > 0
        ? h('span', {
          key: completed + '/' + total,
          className: 'tkb-title__count',
        }, completed + '/' + total)
        : null);
    }

    /* ------------------------------------------------------------------ *
     * Visibility watcher (no rendering)
     * ------------------------------------------------------------------ */

    const dismissedSessions = new Set();
    const openConfirmed = new Map();
    /* Sessions whose board this plugin is closing itself; the host runs the
       close handler inside `closeIn`, so an unflagged close would read as a
       user dismissal and keep the board shut for the rest of the process. */
    const selfClosing = new Set();
    /* Sessions whose restored board already had its column reserved once. */
    const columnEnsured = new Set();

    function closeBoardTab(ctx, sessionId, tabId) {
      selfClosing.add(sessionId);
      try {
        ctx.sidebarRight.closeIn(sessionId, tabId);
      } catch (error) {
        /* The Session surface is already gone; nothing remains to close. */
      } finally {
        selfClosing.delete(sessionId);
      }
    }

    /* Reserve the right column once for a board that a saved layout restored,
       because the seat folds `expanded` back while the frame still reports zero
       track width. One shot only: a column the user folds later stays folded. */
    function ensureColumnOnce(ctx, sessionId) {
      if (columnEnsured.has(sessionId)) return;
      columnEnsured.add(sessionId);
      try {
        if (typeof document === 'undefined') return;
        if (document.querySelector('[data-rightbar-fullscreen]')) return;
        const column = document.querySelector('[data-rightbar-col]');
        const width = column ? column.getBoundingClientRect().width : 0;
        if (width >= 8) return;
        if (ctx.layout && typeof ctx.layout.openRightbar === 'function') {
          ctx.layout.openRightbar(true, false);
        }
      } catch (error) {
        /* The column is a convenience; a failed reservation changes nothing. */
      }
    }

    function useTeamKanbanWatcher(ctx, props) {
      const { sessionId, useSession, useSessions, useSessionStatus } = props;
      const addressedChild = useSession(selectAddressedChild);
      const selectListedChild = useCallback(
        (state) => state.byId[sessionId] && state.byId[sessionId].origin === 'subagent',
        [sessionId],
      );
      const listedChild = useSessions(selectListedChild);
      const child = !!(addressedChild || listedChild);
      const team = useTeamSource(props);
      const runningNow = useSession((state) => (state && state.running ? 1 : 0));
      const statuses = useSessionStatus(selectStatusMap);
      const summaries = useSessions(selectSummaries);
      const teamRunning = !!team && (
        (team.members || EMPTY).some((member) => member.role !== 'lead'
          && sessionRunning(statuses, summaries, member.id))
        || team.tasks.some((task) => task.status === 'in_progress' && task.ownerId
          && task.ownerId !== team.leadId && sessionRunning(statuses, summaries, task.ownerId)));
      const plan = child ? 'off' : pullPlan(team, {
        running: runningNow === 1,
        teamRunning,
        unsupported: unsupportedSessions.has(sessionId),
      });

      /* Bounded pull of the Host's current values on the cadence `pullPlan`
         picks; an idle board normally costs nothing. This is the fallback for
         the control stream that never lands a projection frame on desktop
         0.2.2-rc.3. */
      useEffect(() => {
        if (child) return undefined;
        if (unsupportedSessions.has(sessionId)) return undefined;
        /* Idle is not the same as "nothing happened". A turn can create its
           first task in the last second before `running` flips to 0, and the
           frame that would announce it never reaches this client. Mounting an
           idle Session, or ending a turn, therefore asks the Host a bounded
           number of times instead of trusting the last value it happened to
           hold. Bounded on purpose: an idle board must not become a poller. */
        const settle = plan === 'off' && runningNow !== 1;
        if (plan === 'off' && !settle) return undefined;

        let live = true;
        let busy = false;
        let failures = 0;
        let reported = false;
        let timer = 0;
        const stop = () => {
          live = false;
          clearTimeout(timer);
          clearInterval(timer);
        };
        const pull = async () => {
          if (busy || !live) return;
          busy = true;
          let values;
          let failure;
          try {
            const result = await ctx.remote.session.projections({ sessionId });
            values = result && result.ok && result.value ? result.value.values : undefined;
            if (!result || result.ok !== true) failure = result && result.error ? result.error.message : 'the Host rejected the read';
          } catch (error) {
            failure = error && error.message ? error.message : String(error);
          }
          busy = false;
          if (!live) return;
          if (values && typeof values === 'object') {
            failures = 0;
            if (values.agentTeam && typeof values.agentTeam === 'object') {
              storeFallbackTeam(sessionId, values.agentTeam);
            } else if (!('agentTeam' in values)) {
              markUnsupported(sessionId);
            }
            return;
          }
          /* A host that rejects the read stays rejected until the Session
             changes state; stop hammering it after a few tries. */
          failures += 1;
          if (!reported) {
            reported = true;
            console.warn('[team-kanban] could not pull projections for', sessionId, '-', failure || 'no values returned');
          }
          if (failures >= 3) stop();
        };

        if (settle) {
          /* 0 s catches a projection that landed while the view was closed,
             1.2 s and 3.6 s catch a task record the Host flushed just after
             the turn ended. Then the board goes quiet again. */
          const probes = [0, 1200, 3600].map((delay) => setTimeout(pull, delay));
          return () => {
            live = false;
            probes.forEach(clearTimeout);
          };
        }

        pull();
        timer = setInterval(pull, plan === 'fast' ? PULL_FAST_MS : PULL_SLOW_MS);
        return stop;
      }, [ctx, sessionId, child, plan, runningNow]);

      /* Three states, never two. An absent projection means the frame or the
         Session baseline has not landed yet, which must not be read as "no
         tasks": doing so closed the board on reconnect and cold start, and the
         close handler then kept it closed. Only an explicit empty board closes. */
      const absent = team === undefined;
      const hasTask = !absent && team.enabled === true && team.tasks.length > 0;

      useEffect(() => {
        if (addressedChild || listedChild) return undefined;

        const listTabs = () => {
          try {
            return ctx.sidebarRight.tabsIn(sessionId) || [];
          } catch (error) {
            return [];
          }
        };
        const findBoardTab = () => listTabs().find((tab) => tab && isBoardKind(tab.kind));

        /* Close chips written under a previous kind before deciding anything
           else: the current tab type cannot render them, so they would sit in
           the layout as blank pages for as long as the session lives. */
        listTabs().forEach((tab) => {
          if (tab && tab.id && LEGACY_KINDS.includes(tab.kind)) closeBoardTab(ctx, sessionId, tab.id);
        });

        if (absent) return undefined;

        if (!hasTask) {
          dismissedSessions.delete(sessionId);
          columnEnsured.delete(sessionId);
          const tab = findBoardTab();
          if (tab) closeBoardTab(ctx, sessionId, tab.id);
          return undefined;
        }

        if (dismissedSessions.has(sessionId)) return undefined;
        /* An open board belongs to the user: a later frame must not force the
           column back open after they folded it. The one exception is the first
           sight of a board restored from the saved layout — that tab can arrive
           while the column is still closed, because the seat folds `expanded`
           back before the frame reserves its grid track. */
        if (findBoardTab()) {
          ensureColumnOnce(ctx, sessionId);
          return undefined;
        }

        /* The column must reserve its grid track before the tab asks the seat
           to expand. `shell/SidebarRight.tsx` folds `expanded` straight back
           while `canShow` (rightbar track width > 0) is still false, so opening
           the tab alone can never slide a closed column out. */
        let lastOpenError = null;
        const attemptOpen = (keepColumn) => {
          if (findBoardTab()) return true;
          const layout = ctx.layout;
          try {
            if (layout && typeof layout.openRightbar === 'function') layout.openRightbar(true, false);
          } catch (error) {
            /* Presentation is best effort; the tab still lands in the store. */
          }
          try {
            ctx.sidebarRight.openTabIn(sessionId, KIND);
          } catch (error) {
            lastOpenError = error;
          }
          if (findBoardTab()) return true;
          if (keepColumn) return false;
          try {
            if (layout && typeof layout.closeRightbar === 'function') layout.closeRightbar();
          } catch (error) {}
          return false;
        };

        if (attemptOpen(false)) {
          openConfirmed.set(sessionId, true);
          return undefined;
        }

        /* A freshly adopted Session mounts its right-sidebar controller a
           moment after the watcher, and a session opened straight from the
           launcher may take a beat longer still. Keep asking for the length of
           one slow pull instead of giving up after 1.2 s: the tab is the only
           surface this plugin has, so a silent miss is a dead feature. */
        const delays = [120, 400, 1200, 2500, 5000, 9000];
        const timers = delays.map((delay, index) =>
          setTimeout(() => {
            if (dismissedSessions.has(sessionId)) return;
            const last = index === delays.length - 1;
            if (attemptOpen(!last)) {
              openConfirmed.set(sessionId, true);
              return;
            }
            if (last) {
              console.warn('[team-kanban] gave up opening the board for', sessionId, '-',
                lastOpenError && lastOpenError.message
                  ? lastOpenError.message
                  : 'the tab type is registered but this Session never adopted it');
            }
          }, delay)
        );

        return () => timers.forEach(clearTimeout);
      }, [sessionId, addressedChild, listedChild, absent, hasTask, team, ctx]);

      return null;
    }

    /* ------------------------------------------------------------------ *
     * Styles
     * ------------------------------------------------------------------ */

    const CSS = String.raw`
.tkb-root, .tkb-title {
  --tkb-d1: calc(140ms);
  --tkb-d2: calc(240ms);
  --tkb-d3: calc(480ms);
  --tkb-d4: calc(1400ms);
  --tkb-ease: cubic-bezier(.2, .8, .2, 1);
  --tkb-ease-spring: cubic-bezier(.34, 1.42, .64, 1);
  --tkb-mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;
  --tkb-c-pending: var(--dsw-alias-state-idle-primary);
  --tkb-c-active: var(--dsw-alias-state-business-primary);
  --tkb-c-done: var(--dsw-alias-state-done-primary);
  --tkb-c-warn: var(--dsw-alias-state-warn-primary);
  --tkb-c-error: var(--dsw-alias-state-error-primary);
}
@supports (transition-timing-function: linear(0, 1)) {
  .tkb-root, .tkb-title {
    --tkb-ease-spring: linear(0, .12 4%, .42 11%, .72 20%, .9 29%, .99 38%, 1.03 47%, 1.035 54%, 1.02 64%, 1.005 78%, 1);
  }
}

.tkb-root {
  container: tkb / inline-size;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  outline: none;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}
.tkb-root *, .tkb-root *::before, .tkb-root *::after { box-sizing: border-box; }
.tkb-root svg { display: block; flex: none; }
.tkb-root [hidden] { display: none !important; }
.tkb-sr {
  position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap;
}

/* =====================================================================
   状态图标族与动效
   ===================================================================== */
.tkb-glyph { width: 12px; height: 12px; }
.tkb-glyph--pending { color: var(--tkb-c-pending); }
.tkb-glyph--in_progress { color: var(--tkb-c-active); }
.tkb-glyph--completed { color: var(--tkb-c-done); }
.tkb-glyph__check {
  stroke: var(--dsw-alias-bg-base);
  stroke-dasharray: 10;
  stroke-dashoffset: 0;
}

/* =====================================================================
   顶部全局状态条（Omni Header & Quantum Fuel Strip）
   ===================================================================== */
.tkb-head {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 12px 14px 11px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-base);
  transition: background-color var(--tkb-d3) var(--tkb-ease);
}
.tkb-score {
  flex: none;
  display: inline-flex;
  align-items: flex-end;
  gap: 1px;
  cursor: default;
}
.tkb-score__done {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -.02em;
  font-variant-numeric: tabular-nums;
  animation: tkb-num-in 300ms var(--tkb-ease-spring) both;
  transition: color var(--tkb-d3) var(--tkb-ease);
}
.tkb-score__total {
  font-size: 12px;
  font-weight: 500;
  color: var(--dsw-alias-label-tertiary);
  padding-bottom: 2px;
  font-variant-numeric: tabular-nums;
}
.tkb-root[data-alldone] .tkb-score__done {
  color: var(--tkb-c-done);
  text-shadow: 0 0 16px color-mix(in srgb, var(--tkb-c-done) 60%, transparent);
}

/* 量子能量进度槽 (Quantum Lumen Strip) */
.tkb-strip {
  position: relative;
  flex: 1 1 auto;
  min-width: 48px;
  height: 20px;
  display: flex;
  align-items: center;
  gap: 2.5px;
  padding: 2px 3px;
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 60%, transparent);
  box-shadow: inset 0 1px 2px color-mix(in srgb, var(--dsw-alias-label-primary) 4%, transparent);
}
.tkb-slot {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  display: flex;
  align-items: center;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  appearance: none;
  transition: flex-grow var(--tkb-d3) var(--tkb-ease);
}
.tkb-slot:focus-visible { outline: none; }
.tkb-slot__bar {
  position: relative;
  width: 100%;
  height: 8px;
  border-radius: 3px;
  overflow: hidden;
  background-color: color-mix(in srgb, var(--tkb-c-pending) 30%, transparent);
  transition: background-color var(--tkb-d3) var(--tkb-ease),
              transform var(--tkb-d1) var(--tkb-ease),
              box-shadow var(--tkb-d2) var(--tkb-ease);
}
.tkb-slot:hover .tkb-slot__bar {
  transform: scaleY(1.5);
  box-shadow: 0 0 8px color-mix(in srgb, var(--tkb-c-active) 40%, transparent);
}
.tkb-slot[data-s="blocked"] .tkb-slot__bar {
  background-color: color-mix(in srgb, var(--tkb-c-pending) 12%, transparent);
}
.tkb-slot[data-s="blocked"] .tkb-slot__bar::before {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(135deg,
    color-mix(in srgb, var(--tkb-c-pending) 70%, transparent) 0 2px,
    transparent 2px 5px);
}
.tkb-slot[data-s="ready"] .tkb-slot__bar {
  background-color: color-mix(in srgb, var(--tkb-c-pending) 68%, transparent);
}
.tkb-slot[data-s="active"] .tkb-slot__bar {
  background: linear-gradient(90deg,
    var(--tkb-c-active) 0%,
    color-mix(in srgb, var(--tkb-c-active) 65%, var(--dsw-alias-label-primary)) 50%,
    var(--tkb-c-active) 100%);
  background-size: 200% 100%;
  animation: tkb-shimmer calc(2200ms) linear infinite;
  box-shadow: 0 0 10px color-mix(in srgb, var(--tkb-c-active) 55%, transparent);
}
.tkb-slot[data-s="done"] .tkb-slot__bar {
  background-color: var(--tkb-c-done);
  box-shadow: 0 0 6px color-mix(in srgb, var(--tkb-c-done) 35%, transparent);
}

/* 全达成极光庆典 (单次扫光，平息后留存微光，不无限死循环) */
.tkb-root[data-alldone] .tkb-head::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 90% 100% at 20% 0%,
    color-mix(in srgb, var(--tkb-c-done) 16%, transparent) 0%,
    transparent 70%);
  pointer-events: none;
}
.tkb-root[data-alldone] .tkb-head::after {
  content: "";
  position: absolute;
  top: 0; left: -100%; width: 50%; height: 100%;
  background: linear-gradient(90deg,
    transparent 0%,
    color-mix(in srgb, var(--tkb-c-done) 24%, transparent) 50%,
    transparent 100%);
  transform: skewX(-20deg);
  animation: tkb-aurora-sweep calc(2600ms) ease-out 1 forwards;
  pointer-events: none;
}

/* =====================================================================
   智能体指挥官视窗 (Agent Cockpit Strip)
   ===================================================================== */
.tkb-mates {
  flex: none;
  display: flex;
  align-items: center;
  padding-left: 4px;
  min-width: 0;
  max-width: calc(100% - 140px);
  overflow: clip;
  overflow-clip-margin: 8px;
}
.tkb-mates__empty {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
}
.tkb-mc {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: opacity var(--tkb-d2) var(--tkb-ease),
              background-color var(--tkb-d2) var(--tkb-ease),
              transform var(--tkb-d1) var(--tkb-ease);
}
.tkb-mc + .tkb-mc { margin-left: 7px; }
.tkb-mc:hover { z-index: 3; }
.tkb-mc:hover .tkb-mate {
  transform: translateY(-2px) scale(1.06);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);
}
.tkb-mc__name {
  display: none;
  max-width: 12ch;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}
.tkb-root[data-spot] .tkb-mc:not(.is-spot) { opacity: .35; filter: saturate(0.6); }
.tkb-mc.is-pinned .tkb-mate {
  background: color-mix(in srgb, var(--tkb-c-active) 25%, var(--dsw-alias-bg-layer-2));
  color: var(--tkb-c-active);
  box-shadow: 0 0 0 2px var(--tkb-c-active), 0 4px 12px color-mix(in srgb, var(--tkb-c-active) 35%, transparent);
}

.tkb-mate {
  position: relative;
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  user-select: none;
  font-size: 11px;
  font-weight: 700;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-2);
  box-shadow: 0 0 0 2px var(--dsw-alias-bg-base);
  border: 0;
  padding: 0;
  font-family: inherit;
  transition: transform var(--tkb-d1) var(--tkb-ease),
              opacity var(--tkb-d2) var(--tkb-ease),
              background-color var(--tkb-d2),
              color var(--tkb-d2),
              box-shadow var(--tkb-d2);
}
.tkb-mate[data-lead] {
  border-radius: 7px;
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 10%, var(--dsw-alias-bg-layer-2));
}
/* 纯 GPU 合成层旋转极光环 (transform: rotate，零 Repaint) */
.tkb-mate::before {
  content: "";
  position: absolute;
  inset: -3px;
  border-radius: inherit;
  padding: 1.5px;
  pointer-events: none;
  background: conic-gradient(
    transparent 0deg 110deg,
    color-mix(in srgb, var(--tkb-c-active) 35%, transparent) 200deg,
    var(--tkb-c-active) 330deg,
    transparent 360deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity var(--tkb-d3) var(--tkb-ease);
}
.tkb-mate[data-lead]::before { border-radius: 10px; }
.tkb-mate[data-running]::before {
  opacity: 1;
  animation: tkb-spin calc(2200ms) linear infinite;
}
.tkb-mate[data-none] {
  background: transparent;
  box-shadow: none;
  border: 1px dashed var(--dsw-alias-border-l3);
  color: var(--dsw-alias-label-tertiary);
  cursor: default;
}
.tkb-mate__dot {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--dsw-alias-state-idle-primary);
  box-shadow: 0 0 0 2px var(--dsw-alias-bg-base);
  transition: background-color var(--tkb-d2), transform var(--tkb-d1);
}
.tkb-mate[data-running] .tkb-mate__dot {
  background: var(--tkb-c-active);
  box-shadow: 0 0 8px var(--tkb-c-active), 0 0 0 2px var(--dsw-alias-bg-base);
  animation: tkb-blink calc(1400ms) ease-in-out infinite;
}
/* 智能体运行态：声呐外扩雷达波纹（收敛尺度 + 提前淡出，杜绝边缘切平） */
.tkb-mate[data-running]::after {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  border: 1.5px solid var(--tkb-c-active);
  pointer-events: none;
  animation: tkb-sonar-ping calc(2200ms) cubic-bezier(0, .2, .8, 1) infinite;
}

/* =====================================================================
   异常横幅
   ===================================================================== */
.tkb-banner {
  flex: none;
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--tkb-d3) var(--tkb-ease);
}
.tkb-banner[data-open] { grid-template-rows: 1fr; }
.tkb-banner__clip { min-height: 0; overflow: hidden; }
.tkb-banner__box {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 10px 10px 2px;
  padding: 8px 10px;
  border-radius: var(--dsw-radius-md);
  font-size: 12px;
  color: var(--tkb-c-error);
  background: color-mix(in srgb, var(--tkb-c-error) 8%, var(--dsw-alias-bg-base));
  border: 1px solid color-mix(in srgb, var(--tkb-c-error) 22%, transparent);
}
.tkb-banner__icon { width: 14px; height: 14px; margin-top: 1px; }
.tkb-banner__text { min-width: 0; }
.tkb-banner__title { font-weight: 600; }
.tkb-banner__msg {
  margin-top: 2px;
  font-family: var(--tkb-mono);
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
  overflow-wrap: anywhere;
}

/* =====================================================================
   泳道与容器
   ===================================================================== */
.tkb-lanes {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-border-l3) transparent;
}
.tkb-lane { position: relative; }
.tkb-lane__head {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--dsw-alias-label-secondary);
  background: color-mix(in srgb, var(--dsw-alias-bg-base) 80%, transparent);
  -webkit-backdrop-filter: blur(12px) saturate(1.5);
  backdrop-filter: blur(12px) saturate(1.5);
  border-bottom: 1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 40%, transparent);
}
.tkb-lane__name { white-space: nowrap; }
.tkb-lane__count {
  margin-left: auto;
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--dsw-alias-label-tertiary);
  background: var(--dsw-alias-bg-layer-1);
  font-variant-numeric: tabular-nums;
  transition: color var(--tkb-d2);
}
.tkb-lane[data-empty] .tkb-lane__head { color: var(--dsw-alias-label-tertiary); }
.tkb-lane[data-empty] .tkb-lane__count { opacity: .55; }
.tkb-lane__body {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 4px 10px 14px;
}
.tkb-lane[data-lane="completed"] .tkb-lane__body { gap: 2px; }
.tkb-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 42px;
  border: 1px dashed var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
}
.tkb-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 18px;
  margin: 3px 2px 1px;
  color: var(--dsw-alias-label-tertiary);
}
.tkb-divider::before, .tkb-divider::after {
  content: "";
  flex: 1;
  border-top: 1px dashed var(--dsw-alias-border-l2);
}
.tkb-divider svg { width: 12px; height: 12px; opacity: .85; }

/* =====================================================================
   卡片体系：空间景深与高阶微物理（Spatial Card Physics）
   ===================================================================== */
.tkb-card {
  position: relative;
  display: grid;
  align-items: center;
  column-gap: 8px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas:
    "id deps owner"
    "title title title"
    "preview preview preview"
    "detail detail detail";
  padding: 9px 11px 10px 12px;
  border-radius: var(--dsw-radius-md);
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-card-fill);
  cursor: pointer;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 1px 3px color-mix(in srgb, var(--dsw-alias-label-primary) 4%, transparent);
  transition: transform var(--tkb-d2) var(--tkb-ease),
              box-shadow var(--tkb-d2) var(--tkb-ease),
              background-color var(--tkb-d1) var(--tkb-ease),
              border-color var(--tkb-d2) var(--tkb-ease),
              opacity var(--tkb-d2) var(--tkb-ease);
}
.tkb-card:hover {
  transform: translateY(-2px);
  background: var(--dsw-alias-card-fill-hover);
  border-color: color-mix(in srgb, var(--dsw-alias-border-l2) 80%, transparent);
  box-shadow: 0 8px 20px -3px color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent),
              0 2px 6px -1px color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent);
}
.tkb-card:active {
  transform: translateY(-0.5px) scale(0.997);
  transition-duration: 80ms;
}
.tkb-card__hit {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: inherit;
  background: transparent;
  cursor: pointer;
  appearance: none;
}
.tkb-card__hit:focus-visible { outline: none; }
.tkb-card:focus-within {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--tkb-c-active) 60%, transparent),
              0 6px 18px -2px color-mix(in srgb, var(--tkb-c-active) 20%, transparent);
}
.tkb-card > :not(.tkb-card__hit):not(.tkb-card__rail):not(.tkb-card__detail) {
  position: relative;
  z-index: 1;
  pointer-events: none;
}
.tkb-card button { pointer-events: auto; }

.tkb-card__glyph { grid-area: glyph; display: none; }
.tkb-card__id {
  grid-area: id;
  font-family: var(--tkb-mono);
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  letter-spacing: -.01em;
  white-space: nowrap;
}
.tkb-card__deps {
  grid-area: deps;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
}
.tkb-card__deps-arrow {
  width: 11px;
  height: 11px;
  margin-right: 1px;
  color: var(--dsw-alias-label-tertiary);
}
.tkb-card__owner {
  grid-area: owner;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  min-height: 20px;
  justify-self: end;
}
.tkb-card__owner-name {
  display: none;
  max-width: 11ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11.5px;
  color: var(--dsw-alias-label-tertiary);
}
.tkb-card[data-status="in_progress"] .tkb-card__owner-name {
  display: inline;
  color: var(--dsw-alias-label-secondary);
  font-weight: 500;
}
.tkb-card__owner .tkb-mate {
  width: 20px;
  height: 20px;
  font-size: 10px;
  box-shadow: none;
}
.tkb-card__owner .tkb-mate[data-lead] { border-radius: 6px; }
.tkb-card__owner .tkb-mate__dot { right: -2px; bottom: -2px; width: 6px; height: 6px; box-shadow: none; }

/* 活跃运行脉冲指示器 */
.tkb-card__live-dot {
  position: relative;
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--tkb-c-active);
  box-shadow: 0 0 8px var(--tkb-c-active);
}
.tkb-card__live-dot::after {
  content: "";
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 1.5px solid var(--tkb-c-active);
  pointer-events: none;
  animation: tkb-sonar-ping calc(1800ms) cubic-bezier(0, .2, .8, 1) infinite;
}

.tkb-card__title {
  grid-area: title;
  margin-top: 4px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.44;
  color: var(--dsw-alias-label-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  transition: color var(--tkb-d2) var(--tkb-ease);
}
.tkb-card[data-expanded] .tkb-card__title { -webkit-line-clamp: unset; }
.tkb-card__preview { grid-area: preview; display: none; }
.tkb-card__detail { grid-area: detail; position: relative; z-index: 1; pointer-events: auto; cursor: auto; }

/* ---------------------------------------------------------------------
   状态 1：待处理（Pending）—— 阻塞暗哑 vs 就绪亮泽
   --------------------------------------------------------------------- */
.tkb-card[data-status="pending"][data-ready="false"] {
  background: color-mix(in srgb, var(--dsw-alias-card-fill) 60%, transparent);
  border-style: dashed;
  border-color: var(--dsw-alias-border-l3);
  box-shadow: none;
}
.tkb-card[data-status="pending"][data-ready="false"]:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: var(--dsw-alias-border-l2);
}
.tkb-card[data-status="pending"][data-ready="false"] .tkb-card__title {
  color: var(--dsw-alias-label-secondary);
}

/* 就绪卡片：边框通透，带有微光浮起 */
.tkb-card[data-status="pending"][data-ready="true"] {
  border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 32%, var(--dsw-alias-border-l1));
}
.tkb-card[data-status="pending"][data-ready="true"]:hover {
  box-shadow: 0 8px 22px -3px color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent),
              0 2px 6px color-mix(in srgb, var(--dsw-alias-state-business-primary) 6%, transparent);
}

/* ---------------------------------------------------------------------
   状态 2：进行中（In Progress）—— 算力呼吸与能量流槽
   --------------------------------------------------------------------- */
.tkb-card[data-status="in_progress"] {
  background: radial-gradient(130% 90% at 0% 0%,
    color-mix(in srgb, var(--tkb-c-active) 12%, var(--dsw-alias-card-fill)) 0%,
    var(--dsw-alias-card-fill) 90%);
  border-color: color-mix(in srgb, var(--tkb-c-active) 32%, var(--dsw-alias-border-l1));
  box-shadow: 0 4px 16px -2px color-mix(in srgb, var(--tkb-c-active) 15%, transparent);
}
.tkb-card[data-status="in_progress"]:hover {
  background: radial-gradient(130% 90% at 0% 0%,
    color-mix(in srgb, var(--tkb-c-active) 16%, var(--dsw-alias-card-fill-hover)) 0%,
    var(--dsw-alias-card-fill-hover) 90%);
  box-shadow: 0 10px 24px -3px color-mix(in srgb, var(--tkb-c-active) 22%, transparent);
}

/* 运行中卡片算力心跳呼吸动效 */
.tkb-card[data-status="in_progress"][data-live] {
  animation: tkb-hearth-breathe calc(3600ms) ease-in-out infinite alternate;
}

/* 左侧能量槽与粒子流光 */
.tkb-card__rail {
  position: absolute;
  left: -1px;
  top: 9px;
  bottom: 9px;
  width: 2.5px;
  border-radius: 0 2px 2px 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  background: color-mix(in srgb, var(--tkb-c-active) 35%, transparent);
  transition: opacity var(--tkb-d3) var(--tkb-ease), background-color var(--tkb-d3) var(--tkb-ease);
}
.tkb-card[data-status="in_progress"] .tkb-card__rail { opacity: 1; }
.tkb-card[data-status="in_progress"][data-live] .tkb-card__rail {
  background: color-mix(in srgb, var(--tkb-c-active) 60%, transparent);
  box-shadow: 0 0 6px var(--tkb-c-active);
}
.tkb-card__rail::after {
  content: "";
  position: absolute;
  left: 0; right: 0; top: 0; height: 60%;
  opacity: 0;
  background: linear-gradient(to bottom, transparent, var(--dsw-alias-label-primary) 50%, transparent);
  transform: translateY(-100%);
  transition: opacity var(--tkb-d3) var(--tkb-ease);
}
.tkb-card[data-live] .tkb-card__rail::after {
  opacity: 1;
  animation: tkb-flow calc(1600ms) cubic-bezier(.45, 0, .55, 1) infinite;
}

/* ---------------------------------------------------------------------
   状态 3：已完成（Completed）—— 紧凑晶体、弹性勾选与晶体扫光
   --------------------------------------------------------------------- */
.tkb-card[data-status="completed"] {
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  grid-template-areas:
    "glyph id title owner"
    "detail detail detail detail";
  padding: 6px 9px 6px 11px;
  background: color-mix(in srgb, var(--dsw-alias-card-fill) 60%, transparent);
  border-color: color-mix(in srgb, var(--dsw-alias-border-l1) 50%, transparent);
  box-shadow: none;
  position: relative;
  overflow: hidden;
}
.tkb-card[data-status="completed"]:hover {
  background: var(--dsw-alias-card-fill-hover);
  border-color: var(--dsw-alias-border-l2);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px -2px color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);
}
.tkb-card[data-status="completed"][data-expanded] {
  background: var(--dsw-alias-bg-layer-1);
  border-color: var(--dsw-alias-border-l2);
}
.tkb-card[data-status="completed"] .tkb-card__glyph { display: block; }
.tkb-card[data-status="completed"] .tkb-glyph--completed {
  animation: tkb-spring-pop 420ms var(--tkb-ease-spring) both;
}
.tkb-card[data-status="completed"] .tkb-glyph__check {
  stroke-dasharray: 10;
  stroke-dashoffset: 10;
  animation: tkb-draw-check 360ms var(--tkb-ease) 80ms both;
}

/* 完成态 45° 晶体抛光横扫 (Phosphor Sweep) 真实生效 */
.tkb-card[data-status="completed"]::after {
  content: "";
  position: absolute;
  top: -50%;
  left: -60%;
  width: 35%;
  height: 200%;
  background: linear-gradient(90deg,
    transparent 0%,
    color-mix(in srgb, var(--tkb-c-done) 30%, transparent) 50%,
    transparent 100%);
  transform: rotate(25deg) translateX(-150%);
  pointer-events: none;
  opacity: 0;
}
.tkb-card[data-status="completed"]:hover::after,
.tkb-card[data-status="completed"].is-flash::after {
  animation: tkb-glint-pass 700ms var(--tkb-ease) 1;
}

.tkb-card[data-status="completed"] .tkb-card__deps,
.tkb-card[data-status="completed"] .tkb-card__preview,
.tkb-card[data-status="completed"] .tkb-card__owner-name { display: none !important; }
.tkb-card[data-status="completed"] .tkb-card__title {
  margin-top: 0;
  font-size: 12.5px;
  font-weight: 400;
  color: var(--dsw-alias-label-tertiary);
  -webkit-line-clamp: 1;
}
.tkb-card[data-status="completed"][data-expanded] .tkb-card__title {
  -webkit-line-clamp: unset;
  color: var(--dsw-alias-label-secondary);
}
.tkb-card[data-status="completed"] .tkb-card__owner .tkb-mate {
  width: 18px;
  height: 18px;
  font-size: 9.5px;
  opacity: .7;
}

/* =====================================================================
   依赖徽章与链接胶囊
   ===================================================================== */
.tkb-badge {
  flex: none;
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 6px;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
  transition: transform var(--tkb-d1), box-shadow var(--tkb-d2);
}
.tkb-badge[data-kind="ready"] {
  color: var(--tkb-c-done);
  background: color-mix(in srgb, var(--tkb-c-done) 14%, var(--dsw-alias-bg-layer-1));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--tkb-c-done) 25%, transparent);
}
.tkb-badge[data-kind="blocked"] {
  color: var(--dsw-alias-state-warn-label);
  background: var(--dsw-alias-state-warn-tertiary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--tkb-c-warn) 20%, transparent);
}
.tkb-dep {
  position: relative;
  flex: none;
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 6px;
  border: 0;
  border-radius: 5px;
  font-family: var(--tkb-mono);
  font-size: 10.5px;
  cursor: pointer;
  white-space: nowrap;
  color: var(--dsw-alias-state-warn-label);
  background: var(--dsw-alias-state-warn-tertiary);
  transition: transform var(--tkb-d1), background-color var(--tkb-d1);
}
.tkb-dep::after {
  content: "";
  position: absolute;
  left: 4px; right: 4px; top: 50%; height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform var(--tkb-d3) var(--tkb-ease);
}
.tkb-dep[data-done] {
  color: var(--dsw-alias-label-tertiary);
  background: transparent;
}
.tkb-dep[data-done]::after { transform: scaleX(1); }
.tkb-dep:hover {
  transform: scale(1.06);
  background: color-mix(in srgb, var(--tkb-c-warn) 25%, transparent);
}
.tkb-dep[data-done]:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

/* =====================================================================
   展开抽屉（Drawer Physics）
   ===================================================================== */
.tkb-detail {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  animation: tkb-detail-in var(--tkb-d2) var(--tkb-ease) both;
}
.tkb-detail__desc {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.62;
  color: var(--dsw-alias-label-secondary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  user-select: text;
}
.tkb-detail__row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  column-gap: 4px;
  align-items: start;
}
.tkb-detail__items { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
.tkb-detail__icw {
  flex: none;
  width: 18px;
  height: 22px;
  display: grid;
  place-items: center;
  color: var(--dsw-alias-label-tertiary);
}
.tkb-detail__icw svg { width: 12px; height: 12px; }
.tkb-ref {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  max-width: 100%;
  height: 22px;
  padding: 0 8px 0 6px;
  border: 0;
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-family: inherit;
  font-size: 11.5px;
  cursor: pointer;
  transition: transform var(--tkb-d1), background-color var(--tkb-d1), color var(--tkb-d1);
}
.tkb-ref:hover {
  transform: translateY(-1px);
  background: var(--dsw-alias-interactive-bg-active);
  color: var(--dsw-alias-label-primary);
}
.tkb-ref:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--tkb-c-active) 60%, transparent);
  outline-offset: 1px;
}
.tkb-ref .tkb-glyph { width: 10px; height: 10px; }
.tkb-ref__id { font-family: var(--tkb-mono); font-size: 10.5px; color: var(--dsw-alias-label-tertiary); }
.tkb-ref__t {
  min-width: 0;
  max-width: 22ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tkb-scope {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  height: 20px;
  padding: 0 7px;
  border-radius: 5px;
  border: 1px solid var(--dsw-alias-border-l2);
  font-family: var(--tkb-mono);
  font-size: 10.5px;
  color: var(--dsw-alias-label-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tkb-warnline {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 8px;
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-state-warn-tertiary);
  color: var(--dsw-alias-state-warn-label);
  font-size: 11.5px;
  line-height: 1.5;
}
.tkb-warnline svg { width: 13px; height: 13px; margin-top: 2px; }

/* =====================================================================
   神经网络血缘与聚焦矩阵（免除 blur 离屏卷积开销，保持字体锐利）
   ===================================================================== */
/* 队友聚光灯 */
.tkb-root[data-spot] .tkb-card:not(.is-spot) {
  opacity: .32;
  filter: saturate(0.65);
  transform: scale(0.99);
}
.tkb-card.is-spot {
  z-index: 2;
  transform: translateY(-2.5px) scale(1.01);
  border-color: var(--tkb-c-active);
  box-shadow: 0 10px 28px -4px color-mix(in srgb, var(--tkb-c-active) 32%, transparent),
              0 0 0 1.5px var(--tkb-c-active);
}

/* 依赖血缘链路悬停 */
.tkb-root[data-lineage] .tkb-card:not(.is-lin) {
  opacity: .36;
  filter: saturate(0.7);
  transform: scale(0.99);
}
.tkb-root[data-lineage] .tkb-card.is-lin {
  z-index: 2;
  transform: translateY(-2px);
  box-shadow: 0 8px 22px -3px color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);
}
/* 上游卡片（前置供给者）：点亮金橙色/翡翠绿能量流动 */
.tkb-root[data-lineage] .tkb-card.is-up-open {
  border-color: var(--tkb-c-warn);
  background: radial-gradient(120% 80% at 0% 0%,
    color-mix(in srgb, var(--tkb-c-warn) 10%, var(--dsw-alias-card-fill)) 0%,
    var(--dsw-alias-card-fill) 100%);
  box-shadow: 0 0 16px color-mix(in srgb, var(--tkb-c-warn) 25%, transparent);
}
.tkb-root[data-lineage] .tkb-card.is-up-done {
  border-color: var(--tkb-c-done);
  background: radial-gradient(120% 80% at 0% 0%,
    color-mix(in srgb, var(--tkb-c-done) 10%, var(--dsw-alias-card-fill)) 0%,
    var(--dsw-alias-card-fill) 100%);
  box-shadow: 0 0 16px color-mix(in srgb, var(--tkb-c-done) 25%, transparent);
}
/* 下游卡片（后置消费端）：点亮科技蓝能量流 */
.tkb-root[data-lineage] .tkb-card.is-down {
  border-color: var(--tkb-c-active);
  background: radial-gradient(120% 80% at 0% 0%,
    color-mix(in srgb, var(--tkb-c-active) 10%, var(--dsw-alias-card-fill)) 0%,
    var(--dsw-alias-card-fill) 100%);
  box-shadow: 0 0 16px color-mix(in srgb, var(--tkb-c-active) 25%, transparent);
}

/* 卡片跳转高亮闪光 */
.tkb-card.is-flash { animation: tkb-flash 1100ms var(--tkb-ease) 1; }

/* 提示气泡 */
.tkb-tip {
  position: absolute;
  left: 0; top: 0;
  z-index: 20;
  max-width: 240px;
  padding: 6px 9px;
  pointer-events: none;
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-label-primary);
  color: var(--dsw-alias-bg-base);
  font-size: 11.5px;
  line-height: 1.4;
  opacity: 0;
  transform: translate(-50%, 2px);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--dsw-alias-label-primary) 20%, transparent);
  transition: opacity var(--tkb-d1) var(--tkb-ease), transform var(--tkb-d1) var(--tkb-ease);
}
.tkb-tip[data-show] { opacity: 1; transform: translate(-50%, 0); }
.tkb-tip b { display: block; font-weight: 600; }
.tkb-tip span { display: block; margin-top: 1px; opacity: .75; }
.tkb-tip span:empty { display: none; }

/* =====================================================================
   动画关键帧清单（硬件加速，零强制 Repaint）
   ===================================================================== */
@keyframes tkb-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes tkb-flow {
  from { transform: translateY(-100%); }
  to { transform: translateY(220%); }
}
@keyframes tkb-sonar-ping {
  0% { transform: scale(0.9); opacity: 0.85; }
  60% { opacity: 0.25; }
  100% { transform: scale(1.32); opacity: 0; }
}
@keyframes tkb-blink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .3; transform: scale(0.85); }
}
@keyframes tkb-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@keyframes tkb-hearth-breathe {
  0% {
    box-shadow: 0 4px 14px -2px color-mix(in srgb, var(--tkb-c-active) 14%, transparent);
    border-color: color-mix(in srgb, var(--tkb-c-active) 26%, var(--dsw-alias-border-l1));
  }
  100% {
    box-shadow: 0 8px 24px -2px color-mix(in srgb, var(--tkb-c-active) 26%, transparent);
    border-color: color-mix(in srgb, var(--tkb-c-active) 46%, var(--dsw-alias-border-l1));
  }
}
@keyframes tkb-aurora-sweep {
  0% { left: -60%; opacity: 0; }
  25% { opacity: 0.8; }
  60% { opacity: 0.8; }
  100% { left: 140%; opacity: 0; }
}
@keyframes tkb-glint-pass {
  0% { transform: rotate(25deg) translateX(-150%); opacity: 0; }
  35% { opacity: 0.8; }
  100% { transform: rotate(25deg) translateX(360%); opacity: 0; }
}
@keyframes tkb-spring-pop {
  0% { transform: scale(0.6); opacity: 0; }
  70% { transform: scale(1.18); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes tkb-draw-check {
  to { stroke-dashoffset: 0; }
}
@keyframes tkb-num-in {
  from { opacity: 0; transform: translateY(35%); }
  to { opacity: 1; transform: none; }
}
@keyframes tkb-detail-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: none; }
}
@keyframes tkb-flash {
  0%, 40% {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--tkb-c-active) 70%, transparent),
                0 0 20px color-mix(in srgb, var(--tkb-c-active) 40%, transparent);
  }
  20%, 60% {
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--tkb-c-active) 25%, transparent),
                0 0 30px color-mix(in srgb, var(--tkb-c-active) 20%, transparent);
  }
  100% { box-shadow: 0 0 0 2px transparent; }
}
@keyframes tkb-rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

.tkb-root[data-entering] .tkb-lane__head,
.tkb-root[data-entering] .tkb-lane__body > * {
  animation: tkb-rise calc(480ms) var(--tkb-ease) both;
  animation-delay: calc(var(--i, 0) * 45ms);
}

@media (prefers-reduced-motion: reduce) {
  .tkb-root *, .tkb-title * {
    animation-duration: 1ms !important;
    animation-delay: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    transition-delay: 0ms !important;
  }
  .tkb-card__rail::after,
  .tkb-mate[data-running]::after,
  .tkb-mate::before { opacity: 0 !important; }
}

/* =====================================================================
   宽屏适配：≥540px 三列并排
   ===================================================================== */
@container tkb (min-width: 540px) {
  .tkb-lanes {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    overflow: hidden;
  }
  .tkb-lane { display: flex; flex-direction: column; min-height: 0; }
  .tkb-lane + .tkb-lane { border-left: 1px solid var(--dsw-alias-border-l1); }
  .tkb-lane[data-lane="in_progress"] {
    background: color-mix(in srgb, var(--tkb-c-active) 2.5%, var(--dsw-alias-bg-base));
  }
  .tkb-lane__head {
    position: relative;
    height: 38px;
    padding: 0 12px;
    background: transparent;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
  .tkb-lane__body {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 6px 8px 20px;
    scrollbar-width: thin;
    scrollbar-color: var(--dsw-alias-border-l3) transparent;
    -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 6px, black calc(100% - 18px), transparent 100%);
    mask-image: linear-gradient(to bottom, transparent 0, black 6px, black calc(100% - 18px), transparent 100%);
  }
  .tkb-empty { min-height: 52px; }
}

/* =====================================================================
   超宽屏适配：≥820px 全屏或大浮窗
   ===================================================================== */
@container tkb (min-width: 820px) {
  .tkb-head { gap: 16px; padding: 14px 18px 13px; }
  .tkb-score__done { font-size: 22px; }
  .tkb-mc { padding: 2px 9px 2px 2px; background: var(--dsw-alias-bg-layer-1); }
  .tkb-mc + .tkb-mc { margin-left: 6px; }
  .tkb-mc__name { display: inline; }
  .tkb-mc .tkb-mate { box-shadow: none; }
  .tkb-mc .tkb-mate__dot { box-shadow: 0 0 0 2px var(--dsw-alias-bg-layer-1); }
  .tkb-lane__head { height: 42px; padding: 0 16px; }
  .tkb-lane__body { gap: 8px; padding: 6px 12px 22px; }
  .tkb-lane[data-lane="completed"] .tkb-lane__body { gap: 2px; }
  .tkb-card { padding: 11px 12px 12px 14px; }
  .tkb-card__owner-name { display: inline; }
  .tkb-card__preview {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-top: 3px;
    font-size: 12px;
    color: var(--dsw-alias-label-tertiary);
  }
  .tkb-card[data-expanded] .tkb-card__preview { display: none; }
}

/* =====================================================================
   标签页胶囊标题（TeamKanbanTitle）
   ===================================================================== */
.tkb-title { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
.tkb-title__ring { width: 15px; height: 15px; overflow: visible; }
.tkb-title__track { fill: none; stroke: var(--dsw-alias-border-l3); stroke-width: 1.8; }
.tkb-title__arc {
  fill: none;
  stroke: var(--dsw-alias-state-done-primary);
  stroke-width: 1.8;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 8px 8px;
  transition: stroke-dashoffset 620ms var(--tkb-ease);
}
.tkb-title__check {
  fill: none;
  stroke: var(--dsw-alias-state-done-primary);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 9;
  stroke-dashoffset: 9;
  transition: stroke-dashoffset 360ms var(--tkb-ease) 500ms;
}
.tkb-title[data-done] .tkb-title__check { stroke-dashoffset: 0; }
.tkb-title__label { white-space: nowrap; }
.tkb-title__count {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
  animation: tkb-num-in 300ms var(--tkb-ease) both;
}
`;

    /* ------------------------------------------------------------------ *
     * Plugin body
     * ------------------------------------------------------------------ */

    function apply(ctx) {
      const t = ctx.locale.bind(NS);
      if (typeof window !== 'undefined') window.__teamKanbanRev = CLIENT_REV;
      /* Disabling or unloading the bundle must not leave a dead board chip in
         the saved right-sidebar layout: close what this plugin opened. */
      ctx.effect(() => () => {
        const sessions = new Set(openConfirmed.keys());
        openConfirmed.clear();
        dismissedSessions.clear();
        selfClosing.clear();
        try {
          const openTabs = ctx.sidebarRight.openTabs && ctx.sidebarRight.openTabs.getSnapshot
            ? ctx.sidebarRight.openTabs.getSnapshot()
            : [];
          (openTabs || []).forEach((entry) => {
            if (entry && isBoardKind(entry.kind) && entry.sessionId) sessions.add(entry.sessionId);
          });
        } catch (error) {
          /* Older controllers may not expose the open-tab inventory. */
        }
        sessions.forEach((sessionId) => {
          try {
            const tab = (ctx.sidebarRight.tabsIn(sessionId) || []).find((entry) => entry && isBoardKind(entry.kind));
            if (tab) closeBoardTab(ctx, sessionId, tab.id);
          } catch (error) {
            /* The Session surface is already gone; nothing remains to close. */
          }
        });
      }, 'team-kanban: release open tabs');

      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'team-kanban: dictionaries');

      ctx.effect(() => {
        if (typeof document === 'undefined') return () => {};
        const style = document.createElement('style');
        style.setAttribute('data-plugin', PKG);
        style.textContent = CSS;
        document.head.appendChild(style);
        return () => {
          style.remove();
        };
      }, 'team-kanban: styles');

      /* A duplicate registration (two bundle rows pointing at the same
         package, or another plugin holding this id) throws from the registry.
         Catching it keeps the title, body and watcher slots alive and makes
         the failure visible instead of folding the whole bundle. */
      ctx.effect(() => {
        try {
          return ctx.sidebarRightTabs.register({
            id: TAB_ID,
            kind: KIND,
            priority: 'extension',
            title: () => t('tab.title'),
          });
        } catch (error) {
          console.warn('[team-kanban] could not register the sidebar tab type -', error && error.message ? error.message : error);
          return () => {};
        }
      }, 'team-kanban: tab type');

      ctx.effect(() => {
        try {
          return ctx.sidebarRight.registerCloseHandler(KIND, (sessionId) => {
            /* The host runs this handler inside every `closeIn`, including the
               ones this plugin issues to clear an empty board. Only a close the
               plugin did not start counts as the user dismissing it. */
            if (selfClosing.has(sessionId)) return;
            dismissedSessions.add(sessionId);
          });
        } catch (e) {
          return () => {};
        }
      }, 'team-kanban: close handler');

      function BoardSlot(props) {
        return h(TeamKanbanBoard, Object.assign({}, props, { runtime: ctx }));
      }

      function WatcherSlot(props) {
        useTeamKanbanWatcher(ctx, props);
        return null;
      }

      ctx.effect(
        () => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab.title',
          key: TAB_ID,
          locale: NS,
        }, TeamKanbanTitle)),
        'team-kanban: tab title',
      );

      ctx.effect(
        () => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab',
          key: TAB_ID,
          locale: NS,
        }, BoardSlot)),
        'team-kanban: tab body',
      );

      ctx.effect(
        () => ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
          name: 'conversation.session.header.actions',
          id: 'team-kanban-watcher',
          order: 50,
        }, WatcherSlot)),
        'team-kanban: visibility watcher',
      );

    }

    const plugin = {
      inject: ['slots', 'locale', 'sidebarRight', 'sidebarRightTabs', 'sessions', 'layout', 'remote', 'remote.session'],
      apply,
    };
    /* Pure helpers for `test/`; non-enumerable, so Cordis never sees them. */
    Object.defineProperty(plugin, '__internals', {
      value: Object.freeze({
        normalizeTeam,
        teamSignature,
        compareTeams,
        newestTeam,
        storeFallbackTeam,
        readFallbackTeam,
        markUnsupported,
        unsupportedSessions,
        pullPlan,
        buildModel,
        ownerDisplay,
        FALLBACK_LIMIT,
      }),
    });
    return plugin;
  },
});
