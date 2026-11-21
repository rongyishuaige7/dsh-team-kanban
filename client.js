window.__ModuleLoader__.load({
  id: 'dsh-team-kanban',
  factory(require) {
    'use strict';

    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useMemo, useRef, useState } = React;
    const useLayout = React.useLayoutEffect || useEffect;

    const PKG = 'dsh-team-kanban';
    const NS = 'teamKanban';
    /* Stamped on the board root and on `window` so a running host can be told
       apart from the repository without reading the served bundle. */
    const CLIENT_REV = '0.5.7';
    const TAB_ID = PKG;
    /* Namespaced on purpose: the host turns a kind into the opaque page
       address `sidebar://<kind>`, and a bare `team-board` would be the first
       name an official Inbox-style page would reach for. */
    const KIND = 'dsh-team-kanban.board';
    /* 0.3.x wrote its chips under this bare kind. A saved layout can still
       carry them after the upgrade and nothing else would ever close them. */
    const LEGACY_KINDS = ['team-board'];
    const isBoardKind = (kind) => kind === KIND || LEGACY_KINDS.includes(kind);
    /* The Host's entry loader reports a module registering under the wrong id
       only to its own diagnostic store, which a user cannot read without
       DevTools. One small localStorage record makes that class of silent
       failure readable from outside and from a bug report. */
    const DIAG_KEY = 'team-kanban:diag.v1';
    let diagState = {};
    function diag(patch) {
      try {
        if (typeof window === 'undefined' || !window.localStorage) return;
        diagState = Object.assign({}, diagState, patch, {
          rev: CLIENT_REV,
          at: new Date().toISOString(),
        });
        window.localStorage.setItem(DIAG_KEY, JSON.stringify(diagState));
      } catch (error) {
        /* Storage can be unavailable; diagnostics must never affect the board. */
      }
    }
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
      'team.label': '团队',
      'team.disable': '停用智能体团队协作',
      'team.confirmTitle': '停用智能体团队协作？',
      'team.confirmBody': '本会话将不再使用共享任务工具；已有任务会保留，看板会关闭。',
      'team.confirm': '停用',
      'team.cancel': '取消',
      'team.working': '正在停用…',
      'team.failed': '停用失败：{message}',
      'team.unavailable': '当前宿主没有提供团队控制接口',
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
      'card.provisioning': '启动中',
      'card.failed': '启动失败',
      'card.lead': '主智能体',
      'column.collapse': '折叠{lane}',
      'column.expand': '展开{lane}',
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
      'team.label': 'Team',
      'team.disable': 'Disable agent teamwork',
      'team.confirmTitle': 'Disable agent teamwork?',
      'team.confirmBody': 'This session stops using shared task tools. Existing tasks are kept and the board closes.',
      'team.confirm': 'Disable',
      'team.cancel': 'Cancel',
      'team.working': 'Disabling…',
      'team.failed': 'Could not disable: {message}',
      'team.unavailable': 'This host does not offer the team control API',
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
      'card.provisioning': 'Starting',
      'card.failed': 'Failed',
      'card.lead': 'Lead agent',
      'column.collapse': 'Collapse {lane}',
      'column.expand': 'Expand {lane}',
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

    function upperChar(ch) {
      return /[a-z]/i.test(ch) ? ch.toUpperCase() : ch;
    }

    function secondaryOf(value) {
      const text = String(value == null ? '' : value).trim();
      if (!text) return '';
      const parts = text.split(/[-_.\s/#:]+/).filter(Boolean);
      if (parts.length >= 2) return initialOf(parts[parts.length - 1]);
      const chars = Array.from(text);
      return chars.length >= 2 ? upperChar(chars[chars.length - 1]) : '';
    }

    /* Disambiguate colliding teammate initials (e.g. "worker-1"/"worker-2" -> "W1"/"W2",
       "subagent-alpha"/"subagent-beta" -> "SA"/"SB") while keeping unique names 1-char. */
    function disambiguateMonos(entries) {
      const map = new Map();
      const groups = new Map();
      (Array.isArray(entries) ? entries : EMPTY).forEach((entry) => {
        if (!entry || !entry.id) return;
        const ch = initialOf(entry.label);
        if (!groups.has(ch)) groups.set(ch, []);
        groups.get(ch).push(entry);
      });
      groups.forEach((group, ch) => {
        if (group.length === 1) {
          map.set(group[0].id, ch);
          return;
        }
        const candidates = group.map((entry) => {
          const sec = secondaryOf(entry.label);
          return sec ? ch + sec : ch;
        });
        const counts = new Map();
        candidates.forEach((cand) => counts.set(cand, (counts.get(cand) || 0) + 1));
        group.forEach((entry, index) => {
          const cand = candidates[index];
          map.set(entry.id, cand.length > 1 && counts.get(cand) === 1 ? cand : ch + (index + 1));
        });
      });
      return map;
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

    function ChevronIcon({ className }) {
      return h('svg', {
        viewBox: '0 0 12 12',
        className: className,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      },
      h('path', { d: 'M3 4.5 6 7.5 9 4.5' }));
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
      diag({ phase: 'unsupported', sessionId });
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

      const monoEntries = [];
      const monoSeen = new Set();
      mates.forEach((mate) => {
        if (mate.lead || monoSeen.has(mate.id)) return;
        monoSeen.add(mate.id);
        monoEntries.push({ id: mate.id, label: mate.label });
      });
      tasks.forEach((task) => {
        if (!task.ownerId || task.ownerId === leadId || monoSeen.has(task.ownerId)) return;
        monoSeen.add(task.ownerId);
        const cat = catalogById.get(task.ownerId);
        const label = task.ownerName || (cat && (cat.label || cat.name)) || task.ownerId;
        monoEntries.push({ id: task.ownerId, label });
      });
      const monoById = disambiguateMonos(monoEntries);
      mates.forEach((mate) => {
        mate.mono = mate.lead ? '' : (monoById.get(mate.id) || initialOf(mate.label));
      });
      const mateById = new Map(mates.map((mate) => [mate.id, mate]));

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
        mateById,
        monoById,
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

    function mateStatusText(mate, running, t) {
      if (mate && mate.phase === 'failed') {
        return mate.error ? t('card.failed') + ' · ' + mate.error : t('card.failed');
      }
      if (running) return t('card.running');
      if (mate && mate.phase === 'provisioning') return t('card.provisioning');
      return t('card.idle');
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
      const [collapsed, setCollapsed] = useState({});
      const [spot, setSpot] = useState(null);
      const [pinned, setPinned] = useState(false);
      const [lineageId, setLineageId] = useState(null);
      const [focusedDepId, setFocusedDepId] = useState(null);
      const [conflictPair, setConflictPair] = useState(null);
      const [unlockedIds, setUnlockedIds] = useState(null);
      const [wires, setWires] = useState(EMPTY);
      const [relayWires, setRelayWires] = useState(EMPTY);
      const [flashId, setFlashId] = useState(null);
      const [tip, setTip] = useState(null);
      const [entering, setEntering] = useState(true);
      const [announcement, setAnnouncement] = useState('');
      const [teamMenu, setTeamMenu] = useState(false);
      const [teamBusy, setTeamBusy] = useState(false);
      const [teamError, setTeamError] = useState(null);
      const [narrowMates, setNarrowMates] = useState(false);
      const [showAllMates, setShowAllMates] = useState(false);

      const rootRef = useRef(null);
      const gridRef = useRef(null);
      const flightsRef = useRef(null);
      const tipRef = useRef(null);
      const cardRectsRef = useRef(null);
      const activeFlightsRef = useRef([]);
      const tipTimer = useRef(0);
      const lineageTimer = useRef(0);
      const uiTimers = useRef({});
      const previousTasks = useRef(null);
      const pinnedRef = useRef(false);
      const teamRef = useRef(null);
      const cancelBtnRef = useRef(null);

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

      useEffect(() => {
        const stale = LANES.some((key) => collapsed[key] && model.lanes[key].length === 0);
        if (!stale) return;
        setCollapsed((prev) => {
          const next = Object.assign({}, prev);
          LANES.forEach((key) => {
            if (model.lanes[key].length === 0) delete next[key];
          });
          return next;
        });
      }, [model, collapsed]);

      const hideTip = useCallback(() => {
        clearTimeout(tipTimer.current);
        tipTimer.current = 0;
        setTip(null);
      }, []);

      const closeTeamMenu = useCallback(() => {
        setTeamMenu(false);
        setTeamError(null);
      }, []);

      const confirmDisarm = useCallback(() => {
        if (teamBusy) return;
        setTeamBusy(true);
        setTeamError(null);
        disableTeam(sessionId).then(() => {
          setTeamBusy(false);
          setTeamMenu(false);
        }, (error) => {
          setTeamBusy(false);
          const isUnavailable = error && error.code === 'NO_TEAM_CONTROL';
          setTeamError(isUnavailable ? t('team.unavailable') : t('team.failed', { message: error && error.message ? error.message : String(error) }));
        });
      }, [sessionId, teamBusy, t]);

      useEffect(() => {
        if (!teamMenu) return undefined;
        const cancelBtn = cancelBtnRef.current;
        if (cancelBtn && typeof cancelBtn.focus === 'function') {
          try { cancelBtn.focus({ preventScroll: true }); } catch (error) { cancelBtn.focus(); }
        }
        const onDown = (event) => {
          const node = teamRef.current;
          if (node && typeof node.contains === 'function' && event.target && node.contains(event.target)) return;
          closeTeamMenu();
        };
        document.addEventListener('pointerdown', onDown, true);
        return () => document.removeEventListener('pointerdown', onDown, true);
      }, [teamMenu, closeTeamMenu]);

      useEffect(() => {
        const root = rootRef.current;
        if (!root || typeof ResizeObserver !== 'function') return undefined;
        const update = (w) => {
          const narrow = w > 0 && w < 520;
          setNarrowMates(narrow);
          if (!narrow) setShowAllMates(false);
        };
        if (typeof root.getBoundingClientRect === 'function') {
          update(root.getBoundingClientRect().width);
        }
        const ro = new ResizeObserver((entries) => {
          const entry = entries && entries[0];
          if (entry && entry.contentRect) update(entry.contentRect.width);
        });
        ro.observe(root);
        return () => ro.disconnect();
      }, []);

      const queueTip = useCallback((target, title, sub, opts) => {
        if (!target) return;
        if (!(opts && opts.keepLineage)) {
          clearTimeout(lineageTimer.current);
          setLineageId(null);
          setFocusedDepId(null);
        }
        clearTimeout(tipTimer.current);
        tipTimer.current = setTimeout(() => {
          const root = rootRef.current;
          if (!root) return;
          const rootRect = root.getBoundingClientRect();
          const rect = target.getBoundingClientRect();
          if (!rect.width && !rect.height) return;
          const tipNode = tipRef.current;
          const tipW = tipNode && tipNode.offsetWidth ? tipNode.offsetWidth : 180;
          const tipH = tipNode && tipNode.offsetHeight ? tipNode.offsetHeight : 34;
          const centerX = rect.left - rootRect.left + rect.width / 2;
          const left = clamp(centerX - tipW / 2, 8, Math.max(8, rootRect.width - tipW - 8));
          let top = rect.top - rootRect.top - tipH - 8;
          let place = 'top';
          if (top < 6) {
            top = rect.bottom - rootRect.top + 8;
            place = 'bottom';
          }
          const arrowLeft = clamp(centerX - left - 3.5, 10, Math.max(10, tipW - 17));
          setTip({
            left,
            top,
            place,
            arrowLeft,
            centerX,
            targetTop: rect.top - rootRect.top,
            targetBottom: rect.bottom - rootRect.top,
            rootW: rootRect.width,
            title: String(title || ''),
            sub: String(sub || ''),
          });
        }, 160);
      }, []);

      useLayout(() => {
        const tipNode = tipRef.current;
        if (!tip || !tipNode || !tipNode.offsetWidth) return;
        const tipW = tipNode.offsetWidth;
        const tipH = tipNode.offsetHeight;
        const left = clamp(tip.centerX - tipW / 2, 8, Math.max(8, tip.rootW - tipW - 8));
        let top = tip.targetTop - tipH - 8;
        let place = 'top';
        if (top < 6) {
          top = tip.targetBottom + 8;
          place = 'bottom';
        }
        const arrowLeft = clamp(tip.centerX - left - 3.5, 10, Math.max(10, tipW - 17));
        if (Math.abs(left - tip.left) > 1 || Math.abs(top - tip.top) > 1 || place !== tip.place) {
          setTip((prev) => (prev ? Object.assign({}, prev, { left, top, place, arrowLeft }) : prev));
        }
      }, [tip]);

      const cleanupFlights = useCallback(() => {
        activeFlightsRef.current.forEach((fn) => {
          try { fn(); } catch (error) {}
        });
        activeFlightsRef.current = [];
        if (flightsRef.current && typeof flightsRef.current.replaceChildren === 'function') {
          flightsRef.current.replaceChildren();
        }
      }, []);

      const snapshotRects = useCallback((root) => {
        const rects = new Map();
        if (!root || typeof root.getBoundingClientRect !== 'function') return rects;
        const rr = root.getBoundingClientRect();
        if (!rr.width && !rr.height) return rects;
        Array.from(root.querySelectorAll('.tkb-card')).forEach((el) => {
          const id = el.getAttribute('data-task-id');
          if (!id) return;
          const lane = el.closest && el.closest('.tkb-lane');
          if (lane && lane.hasAttribute('data-collapsed')) return;
          const r = el.getBoundingClientRect();
          if (!r.width && !r.height) return;
          rects.set(id, {
            x: r.left - rr.left,
            y: r.top - rr.top,
            w: r.width,
            h: r.height,
            status: el.getAttribute('data-status') || '',
            el,
          });
        });
        return rects;
      }, []);

      const motionKey = model.tasks
        .map((task) => task.id + ':' + task.status + ':' + (task.ready ? '1' : '0'))
        .join('|');

      useLayout(() => {
        const root = rootRef.current;
        if (!root || typeof root.getBoundingClientRect !== 'function') return undefined;
        cleanupFlights();
        const nextRects = snapshotRects(root);
        const prevRects = cardRectsRef.current;
        if (prevRects && prevRects.size > 0 && !reducedMotion() && nextRects.size > 0) {
          let crossCount = 0;
          nextRects.forEach((next, id) => {
            const prev = prevRects.get(id);
            if (prev && prev.status !== next.status) crossCount += 1;
          });
          let staggerIndex = 0;
          nextRects.forEach((next, id) => {
            const prev = prevRects.get(id);
            if (!prev) return;
            const dx = prev.x - next.x;
            const dy = prev.y - next.y;
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
            const el = next.el;
            if (prev.status !== next.status && crossCount <= 12
              && flightsRef.current && typeof el.cloneNode === 'function' && typeof el.animate === 'function') {
              const ghost = el.cloneNode(true);
              ghost.removeAttribute('data-task-id');
              ghost.setAttribute('aria-hidden', 'true');
              ghost.className = 'tkb-card tkb-flight-card';
              Object.assign(ghost.style, {
                position: 'absolute',
                left: next.x + 'px',
                top: next.y + 'px',
                width: next.w + 'px',
                height: next.h + 'px',
                margin: '0',
                pointerEvents: 'none',
              });
              flightsRef.current.appendChild(ghost);
              el.style.visibility = 'hidden';
              const dist = Math.hypot(dx, dy) || 1;
              const lift = Math.min(20, 6 + dist * 0.045);
              const tilt = dx < 0 ? 1.25 : -1.25;
              const delay = Math.min(staggerIndex * 30, 180);
              staggerIndex += 1;
              const anim = ghost.animate([
                { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(0.985)' },
                { transform: 'translate(' + (dx * 0.48) + 'px, ' + (dy * 0.48 - lift) + 'px) scale(1.028) rotate(' + tilt + 'deg)', offset: 0.45 },
                { transform: 'none' },
              ], { duration: 430, delay, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'both' });
              let settled = false;
              const finish = () => {
                if (settled) return;
                settled = true;
                try { anim.cancel(); } catch (error) {}
                if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
                el.style.visibility = '';
                if (el.classList) {
                  el.classList.add('is-landed');
                  setTimeout(() => el.classList.remove('is-landed'), 220);
                }
              };
              activeFlightsRef.current.push(finish);
              if (anim && anim.finished && typeof anim.finished.then === 'function') {
                anim.finished.then(finish, finish);
              } else {
                const tid = setTimeout(finish, 440 + delay);
                activeFlightsRef.current.push(() => clearTimeout(tid));
              }
            } else if (typeof el.animate === 'function') {
              el.animate([
                { transform: 'translate(' + dx + 'px, ' + dy + 'px)' },
                { transform: 'none' },
              ], { duration: 340, easing: 'cubic-bezier(.2, .8, .2, 1)' });
            }
          });
        }
        const stored = new Map();
        nextRects.forEach((val, id) => {
          stored.set(id, { x: val.x, y: val.y, w: val.w, h: val.h, status: val.status });
        });
        cardRectsRef.current = stored;
        return undefined;
      }, [motionKey, collapsed, cleanupFlights, snapshotRects]);

      useEffect(() => {
        const timer = setTimeout(() => setEntering(false), 1000);
        return () => clearTimeout(timer);
      }, []);

      useEffect(() => {
        const timers = uiTimers.current;
        return () => {
          cleanupFlights();
          clearTimeout(tipTimer.current);
          clearTimeout(lineageTimer.current);
          Object.keys(timers).forEach((key) => clearTimeout(timers[key]));
        };
      }, [cleanupFlights]);

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

      const computeBezierWires = useCallback((root, edges) => {
        if (!root || typeof root.getBoundingClientRect !== 'function') return EMPTY;
        const rr = root.getBoundingClientRect();
        if (rr.width < 540) return EMPTY;
        const cardMap = new Map();
        Array.from(root.querySelectorAll('.tkb-card')).forEach((node) => {
          const id = node.getAttribute('data-task-id');
          if (id) cardMap.set(id, node);
        });
        const anchorOf = (id) => {
          const card = cardMap.get(id);
          if (!card || !card.parentElement) return null;
          const lane = card.closest && card.closest('.tkb-lane');
          if (lane && lane.hasAttribute('data-collapsed')) return null;
          const r = card.getBoundingClientRect();
          if (!r.width && !r.height) return null;
          const br = card.parentElement.getBoundingClientRect();
          let cy = (r.top - rr.top) + Math.min(r.height / 2, 20);
          let off = false;
          const minY = br.top - rr.top + 4;
          const maxY = br.bottom - rr.top - 4;
          if (cy < minY) { cy = minY; off = true; }
          else if (cy > maxY) { cy = maxY; off = true; }
          return {
            l: r.left - rr.left,
            r: r.right - rr.left,
            cx: r.left - rr.left + r.width / 2,
            cy,
            off,
          };
        };
        const out = [];
        edges.forEach((edge) => {
          const start = anchorOf(edge.from);
          const end = anchorOf(edge.to);
          if (!start || !end) return;
          let x1;
          let x2;
          let c1x;
          let c2x;
          if (Math.abs(start.cx - end.cx) > 24) {
            const dir = start.cx < end.cx ? 1 : -1;
            x1 = dir > 0 ? start.r : start.l;
            x2 = dir > 0 ? end.l : end.r;
            const k = Math.max(28, Math.abs(x2 - x1) * 0.5);
            c1x = x1 + dir * k;
            c2x = x2 - dir * k;
          } else {
            x1 = start.r - 6;
            x2 = end.r - 6;
            const k = 26 + Math.min(40, Math.abs(end.cy - start.cy) * 0.15);
            c1x = x1 + k;
            c2x = x2 + k;
          }
          out.push({
            key: edge.key,
            kind: edge.kind,
            dim: !!edge.dim,
            focus: !!edge.focus,
            off: start.off || end.off,
            x1,
            y1: start.cy,
            x2,
            y2: end.cy,
            d: 'M' + x1 + ',' + start.cy + ' C' + c1x + ',' + start.cy + ' ' + c2x + ',' + end.cy + ' ' + x2 + ',' + end.cy,
          });
        });
        return out.length ? out : EMPTY;
      }, []);

      useEffect(() => {
        const previous = previousTasks.current;
        const current = new Map(model.tasks.map((task) => [task.id, task]));
        if (previous !== null) {
          const parts = [];
          const justUnlocked = [];
          const justCompleted = [];
          model.tasks.forEach((task) => {
            const before = previous.get(task.id);
            const id = '#' + shortId(task.id);
            if (!before) {
              parts.push(t('a11y.created', { id }));
              return;
            }
            if (before.status !== task.status) {
              parts.push(t('a11y.moved.' + task.status, { id }));
              if (task.status === 'completed') justCompleted.push(task.id);
            }
            if (before.status === 'pending' && task.status === 'pending' && !before.ready && task.ready) {
              parts.push(t('a11y.unlocked', { id }));
              justUnlocked.push(task.id);
            }
          });
          previous.forEach((task, id) => {
            if (!current.has(id)) parts.push(t('a11y.deleted', { id: '#' + shortId(id) }));
          });
          if (parts.length) setAnnouncement(parts.join(t('a11y.listSeparator')));
          if (justUnlocked.length && !reducedMotion()) {
            setUnlockedIds(new Set(justUnlocked));
            clearTimeout(uiTimers.current.unlock);
            uiTimers.current.unlock = setTimeout(() => setUnlockedIds(null), 680);
          }
          if (justCompleted.length && !reducedMotion()) {
            const edges = [];
            justCompleted.forEach((cid) => {
              (model.dependents.get(cid) || EMPTY).forEach((did) => {
                edges.push({ key: 'relay:' + cid + ':' + did, from: cid, to: did, kind: 'relay' });
              });
            });
            if (edges.length) {
              const nextRelays = computeBezierWires(rootRef.current, edges);
              if (nextRelays.length) {
                setRelayWires(nextRelays);
                clearTimeout(uiTimers.current.relay);
                uiTimers.current.relay = setTimeout(() => setRelayWires(EMPTY), 920);
              }
            }
          }
        }
        previousTasks.current = current;
      }, [model, t, computeBezierWires]);

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

      useEffect(() => {
        if (!lineage) {
          setWires(EMPTY);
          return;
        }
        const edges = [];
        lineage.up.forEach((uid) => {
          const ut = model.map.get(uid);
          const kind = ut && ut.status === 'completed' ? 'up-done' : 'up-open';
          edges.push({
            key: kind + ':' + uid,
            from: uid,
            to: lineage.id,
            kind,
            dim: !!(focusedDepId && focusedDepId !== uid),
            focus: focusedDepId === uid,
          });
        });
        lineage.down.forEach((did) => {
          edges.push({
            key: 'down:' + did,
            from: lineage.id,
            to: did,
            kind: 'down',
            dim: !!focusedDepId,
          });
        });
        setWires(computeBezierWires(rootRef.current, edges));
      }, [lineage, focusedDepId, model, collapsed, expandedId, computeBezierWires]);

      const focusCard = useCallback((taskId) => {
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

      const jumpTo = useCallback((taskId) => {
        const target = model.map.get(taskId);
        if (target && collapsed[target.status]) {
          setCollapsed((prev) => Object.assign({}, prev, { [target.status]: false }));
          clearTimeout(uiTimers.current.jump);
          uiTimers.current.jump = setTimeout(() => focusCard(taskId), 40);
          return;
        }
        focusCard(taskId);
      }, [model, collapsed, focusCard]);

      const toggleLane = useCallback((key) => {
        hideTip();
        setLineageId(null);
        setCollapsed((prev) => Object.assign({}, prev, { [key]: !prev[key] }));
      }, [hideTip]);

      const toggleTask = useCallback((taskId) => {
        if (typeof window !== 'undefined' && typeof window.getSelection === 'function') {
          const sel = window.getSelection();
          if (sel && sel.toString().trim().length > 0) return;
        }
        setExpandedId((current) => (current === taskId ? null : taskId));
        setLineageId(null);
        setFocusedDepId(null);
      }, []);

      const enterCard = useCallback((task) => {
        hideTip();
        if (spot) return;
        clearTimeout(lineageTimer.current);
        lineageTimer.current = setTimeout(() => {
          setLineageId(task.id);
          setFocusedDepId(null);
        }, 150);
      }, [spot, hideTip]);

      const leaveCard = useCallback(() => {
        clearTimeout(lineageTimer.current);
        setLineageId(null);
        setFocusedDepId(null);
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
        const cardsIn = (index) => (lanes[index] && !lanes[index].hasAttribute('data-collapsed')
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
        if (activeFlightsRef.current.length === 0 && rootRef.current) {
          const fresh = snapshotRects(rootRef.current);
          const stored = new Map();
          fresh.forEach((val, id) => {
            stored.set(id, { x: val.x, y: val.y, w: val.w, h: val.h, status: val.status });
          });
          cardRectsRef.current = stored;
        }
      }, [hideTip, snapshotRects]);

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

      function renderDetail(task, expanded) {
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
                  tabIndex: expanded ? undefined : -1,
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

        return h('div', {
          className: 'tkb-card__detail',
          'aria-hidden': expanded ? undefined : 'true',
        },
        h('div', { className: 'tkb-card__detail-clip' },
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
            h('span', null, warning))))));
      }

      function renderCard(task, laneIndex, cardIndex) {
        const owner = ownerDisplay(task, model, t);
        const running = task.ownerId ? model.isRunning(task.ownerId) : false;
        const expanded = expandedId === task.id;
        const status = statusText(task, t, owner);
        const blockers = Array.isArray(task.blockedBy) ? task.blockedBy : EMPTY;
        const warnings = Array.isArray(task.writeScopeWarnings) ? task.writeScopeWarnings : EMPTY;
        const openDownstream = task.status === 'completed'
          ? EMPTY
          : (model.dependents.get(task.id) || EMPTY).filter((id) => {
            const dep = model.map.get(id);
            return dep && dep.status !== 'completed';
          });
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
        if (unlockedIds && unlockedIds.has(task.id)) className += ' is-unlocked';
        if (conflictPair && conflictPair.has(task.id)) className += ' is-conflict-pair';

        const ownerChildren = [];
        if (task.ownerId) {
          const isLead = task.ownerId === model.leadId;
          const mateInfo = model.mateById.get(task.ownerId);
          const mono = isLead
            ? initialOf(owner)
            : (model.monoById.get(task.ownerId) || initialOf(owner));
          const subText = mateStatusText(mateInfo, running, t);
          if (live) ownerChildren.push(h('span', { key: 'live', className: 'tkb-card__live-dot', 'aria-hidden': 'true' }));
          ownerChildren.push(h('span', { key: 'name', className: 'tkb-card__owner-name', title: owner }, owner));
          ownerChildren.push(h('button', {
            key: 'mate',
            type: 'button',
            className: 'tkb-mate',
            'data-lead': isLead ? '' : undefined,
            'data-running': running ? '' : undefined,
            'data-phase': mateInfo && mateInfo.phase !== 'active' ? mateInfo.phase : undefined,
            'data-wide': mono.length > 1 ? '' : undefined,
            'aria-pressed': pinned && spot === task.ownerId,
            'aria-label': owner + ' · ' + subText,
            onPointerEnter: (event) => {
              hoverMate(task.ownerId);
              queueTip(event.currentTarget, owner, subText);
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
          mono));
        } else if (task.status === 'in_progress') {
          ownerChildren.push(h('span', { key: 'name', className: 'tkb-card__owner-name' }, t('card.unowned')));
          ownerChildren.push(h('span', {
            key: 'none',
            className: 'tkb-mate',
            'data-none': '',
            'aria-label': t('card.unowned'),
            title: t('card.unowned'),
          }, '?'));
        }
        ownerChildren.push(h(ChevronIcon, { key: 'chev', className: 'tkb-card__chev' }));

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
                onPointerEnter: (event) => {
                  clearTimeout(lineageTimer.current);
                  setLineageId(task.id);
                  setFocusedDepId(depId);
                  queueTip(
                    event.currentTarget,
                    related ? '#' + shortId(depId) + ' ' + related.subject : '#' + shortId(depId),
                    related ? statusText(related, t, ownerDisplay(related, model, t)) : '',
                    { keepLineage: true },
                  );
                },
                onPointerLeave: () => {
                  setFocusedDepId(null);
                  hideTip();
                },
                onClick: (event) => {
                  event.stopPropagation();
                  jumpTo(depId);
                },
              }, '#' + shortId(depId));
            })
            : null,
          openDownstream.length > 0
            ? h('span', {
              className: 'tkb-unlocks',
              'data-critical': openDownstream.length >= 2 ? '' : undefined,
              onPointerEnter: (event) => queueTip(
                event.currentTarget,
                t('card.blocks'),
                openDownstream.map((id) => '#' + shortId(id)).join(' · '),
              ),
              onPointerLeave: hideTip,
            },
            h(DownIcon, { className: 'tkb-unlocks__icon' }),
            String(openDownstream.length))
            : null,
          task.status !== 'completed' && warnings.length > 0
            ? h('span', {
              className: 'tkb-conflict',
              onPointerEnter: (event) => {
                const peers = new Set([task.id]);
                warnings.forEach((msg) => {
                  const matches = String(msg || '').match(/task-\d+/g);
                  if (matches) matches.forEach((m) => { if (model.map.has(m)) peers.add(m); });
                });
                if (peers.size > 1) setConflictPair(peers);
                queueTip(
                  event.currentTarget,
                  t('card.writeScopes'),
                  warnings[0],
                );
              },
              onPointerLeave: () => {
                setConflictPair(null);
                hideTip();
              },
            }, h(WarnIcon, { className: 'tkb-conflict__icon' }))
            : null),
        h('span', { className: 'tkb-card__owner' }, ownerChildren),
        h('div', { className: 'tkb-card__title', title: task.subject }, task.subject),
        firstLine(task.description)
          ? h('div', { className: 'tkb-card__preview' }, firstLine(task.description))
          : null,
        renderDetail(task, expanded));
      }

      function renderLane(key, laneIndex) {
        const laneTasks = model.lanes[key];
        const isEmpty = laneTasks.length === 0;
        const isCollapsed = !isEmpty && !!collapsed[key];
        const laneName = t('column.' + key);
        const children = [];
        if (isEmpty) {
          children.push(h('div', { key: 'empty', className: 'tkb-empty' },
            h(StatusGlyph, { status: key }),
            h('span', null, t('column.empty'))));
        } else if (key === 'pending') {
          model.ready.forEach((task) => {
            children.push(renderCard(task, laneIndex, children.length));
          });
          if (model.ready.length && model.blocked.length) {
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
          'data-collapsed': isCollapsed ? '' : undefined,
          'aria-label': laneName,
        },
        h('div', {
          className: 'tkb-lane__head',
          style: { '--i': laneIndex },
          role: isEmpty ? undefined : 'button',
          tabIndex: isEmpty ? undefined : 0,
          'aria-expanded': isEmpty ? undefined : !isCollapsed,
          'aria-label': isEmpty
            ? undefined
            : t(isCollapsed ? 'column.expand' : 'column.collapse', { lane: laneName }),
          onClick: isEmpty ? undefined : () => toggleLane(key),
          onKeyDown: isEmpty ? undefined : (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggleLane(key);
            }
          },
        },
        h(StatusGlyph, { status: key }),
        h('span', { className: 'tkb-lane__name' }, laneName),
        h('span', { className: 'tkb-lane__count' }, String(laneTasks.length)),
        !isEmpty ? h(ChevronIcon, { className: 'tkb-lane__chev' }) : null),
        h('div', { className: 'tkb-lane__body' }, children));
      }

      const visibleMates = narrowMates && !showAllMates && model.mates.length > 3
        ? model.mates.slice(0, 3)
        : model.mates;
      const hiddenMatesCount = model.mates.length - visibleMates.length;
      const activeWires = wires.length ? wires : relayWires;

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
        h('span', { className: 'tkb-score__done' },
          String(counts.completed).split('').map((digit, index) => h('span', {
            key: index,
            className: 'tkb-odo',
            style: { transform: 'translateY(' + (-Number(digit) * 22) + 'px)' },
          },
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => h('span', { key: n }, String(n)))))),
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
        h('div', { className: 'tkb-mates-wrap' },
          h('div', {
            className: 'tkb-mates',
            role: 'group',
            'aria-label': matesLabel,
            'data-overflow': hiddenMatesCount > 0 ? '' : undefined,
          },
          visibleMates.length
            ? visibleMates.map((mate) => {
              const label = mate.lead ? t('card.lead') : mate.label;
              const mono = mate.lead ? initialOf(label) : (mate.mono || initialOf(label));
              const subText = mateStatusText(mate, mate.running, t);
              const active = pinned && spot === mate.id;
              return h('button', {
                key: mate.id,
                type: 'button',
                className: 'tkb-mc'
                  + (spot === mate.id ? ' is-spot' : '')
                  + (active ? ' is-pinned' : ''),
                'aria-pressed': active,
                'aria-label': label + ' · ' + subText,
                onPointerEnter: (event) => {
                  hoverMate(mate.id);
                  queueTip(event.currentTarget, label, subText);
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
                'data-phase': mate.phase !== 'active' ? mate.phase : undefined,
                'data-wide': mono.length > 1 ? '' : undefined,
              },
              h('span', { className: 'tkb-mate__dot', 'aria-hidden': 'true' }),
              mono),
              h('span', { className: 'tkb-mc__name' }, label));
            })
            : h('span', { className: 'tkb-mates__empty' }, t('header.noTeammates'))),
          hiddenMatesCount > 0
            ? h('button', {
              type: 'button',
              className: 'tkb-mates__more',
              'aria-label': '+' + hiddenMatesCount,
              onClick: (event) => {
                event.stopPropagation();
                hideTip();
                setShowAllMates(true);
              },
            }, '+' + hiddenMatesCount)
            : null),
        h('div', {
          className: 'tkb-team',
          ref: teamRef,
          onKeyDown: (event) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            closeTeamMenu();
          },
        },
        h('button', {
          type: 'button',
          className: 'tkb-team__btn',
          'aria-haspopup': 'dialog',
          'aria-expanded': teamMenu ? 'true' : 'false',
          'aria-label': t('team.disable'),
          title: t('team.disable'),
          onClick: (event) => {
            event.stopPropagation();
            hideTip();
            setTeamError(null);
            setTeamMenu((open) => !open);
          },
        },
        h('svg', {
          className: 'tkb-team__icon',
          viewBox: '0 0 16 16',
          width: 12,
          height: 12,
          'aria-hidden': 'true',
        },
        h('path', {
          d: 'M8 2.3v5.2',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
        }),
        h('path', {
          d: 'M4.4 4.2a4.9 4.9 0 1 0 7.2 0',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
        })),
        h('span', { className: 'tkb-team__label' }, t('team.label'))),
        teamMenu ? h('div', {
          className: 'tkb-team__pop',
          role: 'dialog',
          'aria-label': t('team.confirmTitle'),
        },
        h('p', { className: 'tkb-team__title' }, t('team.confirmTitle')),
        h('p', { className: 'tkb-team__body' }, t('team.confirmBody')),
        teamError ? h('p', { className: 'tkb-team__err', role: 'alert' }, teamError) : null,
        h('div', { className: 'tkb-team__actions' },
          h('button', {
            ref: cancelBtnRef,
            type: 'button',
            className: 'tkb-team__ghost',
            disabled: teamBusy || undefined,
            onClick: (event) => {
              event.stopPropagation();
              closeTeamMenu();
            },
          }, t('team.cancel')),
          h('button', {
            type: 'button',
            className: 'tkb-team__danger',
            disabled: teamBusy || undefined,
            onClick: (event) => {
              event.stopPropagation();
              confirmDisarm();
            },
          }, teamBusy ? t('team.working') : t('team.confirm')))) : null)),
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
      activeWires.length
        ? h('svg', { className: 'tkb-wires', 'aria-hidden': 'true' },
          activeWires.map((wire) => h('g', { key: wire.key },
            h('path', {
              d: wire.d,
              pathLength: 100,
              className: 'tkb-wire tkb-wire--' + wire.kind
                + (wire.off ? ' is-off' : '')
                + (wire.dim ? ' is-dim' : '')
                + (wire.focus ? ' is-focus' : ''),
            }),
            h('circle', {
              cx: wire.x1,
              cy: wire.y1,
              r: 2.6,
              className: 'tkb-wire-dot tkb-wire--' + wire.kind,
            }),
            h('circle', {
              cx: wire.x2,
              cy: wire.y2,
              r: 2.6,
              className: 'tkb-wire-dot tkb-wire--' + wire.kind,
            }))))
        : null,
      h('div', { ref: flightsRef, className: 'tkb-flights', 'aria-hidden': 'true' }),
      tip
        ? h('div', {
          ref: tipRef,
          className: 'tkb-tip',
          'data-show': '',
          'data-place': tip.place || 'top',
          'aria-hidden': 'true',
          style: { left: tip.left, top: tip.top },
        },
        h('b', null, tip.title),
        tip.sub ? h('span', null, tip.sub) : null,
        h('i', { className: 'tkb-tip__arrow', style: { left: tip.arrowLeft } }))
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
    /* Agent Teams exposes exactly one remote method, the per-Session mode
       switch; `ctx.inject` in `apply` fills this in only where it exists. */
    let teamControl = null;

    /* Settle listeners notified when a Session's team state changes
       out-of-band (e.g. after a disable request), so watchers can pull the
       fresh projection immediately without waiting for a turn. */
    const settleListeners = new Set();

    function requestSettle(sessionId) {
      settleListeners.forEach((listener) => {
        try {
          listener(sessionId);
        } catch (error) {
          /* Listeners must never fail callers. */
        }
      });
    }

    async function disableTeam(sessionId) {
      if (typeof teamControl !== 'function') {
        const err = new Error('team control is unavailable on this Host');
        err.code = 'NO_TEAM_CONTROL';
        diag({ phase: 'team-disable-failed', sessionId, error: err.message, code: err.code });
        throw err;
      }
      let result;
      try {
        result = await teamControl(sessionId, false);
      } catch (error) {
        const message = error && error.message ? error.message : String(error);
        const err = new Error(message);
        if (error && error.code) err.code = error.code;
        diag({ phase: 'team-disable-failed', sessionId, error: message, code: err.code });
        throw err;
      }
      if (!result || result.ok !== true) {
        const message = result && result.error && result.error.message
          ? result.error.message
          : (result && result.error ? String(result.error) : 'the Host rejected the change');
        const err = new Error(message);
        if (result && result.error && result.error.code) err.code = result.error.code;
        diag({ phase: 'team-disable-failed', sessionId, error: message, code: err.code });
        throw err;
      }
      diag({ phase: 'team-disabled', sessionId });
      unsupportedSessions.delete(sessionId);
      requestSettle(sessionId);
    }
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
        const extraTimers = [];
        const stop = () => {
          live = false;
          clearTimeout(timer);
          clearInterval(timer);
          extraTimers.forEach(clearTimeout);
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
            const message = failure || 'no values returned';
            console.warn('[team-kanban] could not pull projections for', sessionId, '-', message);
            diag({ phase: 'pull-failed', sessionId, error: message });
          }
          if (failures >= 3) stop();
        };

        const runProbes = () => {
          failures = 0;
          live = true;
          [0, 1200, 3600].forEach((delay) => {
            if (!live) return;
            const probeTimer = setTimeout(pull, delay);
            extraTimers.push(probeTimer);
          });
        };

        const onSettle = (id) => {
          if (id === sessionId) runProbes();
        };
        settleListeners.add(onSettle);

        if (settle) {
          /* 0 s catches a projection that landed while the view was closed,
             1.2 s and 3.6 s catch a task record the Host flushed just after
             the turn ended. Then the board goes quiet again. */
          runProbes();
          return () => {
            settleListeners.delete(onSettle);
            stop();
          };
        }

        pull();
        timer = setInterval(pull, plan === 'fast' ? PULL_FAST_MS : PULL_SLOW_MS);
        return () => {
          settleListeners.delete(onSettle);
          stop();
        };
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

        diag({
          phase: 'watch',
          sessionId,
          running: runningNow === 1,
          tasks: absent ? -1 : team.tasks.length,
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
          diag({ phase: 'opened', sessionId });
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
              diag({ phase: 'opened', sessionId });
              return;
            }
            if (last) {
              const message = lastOpenError && lastOpenError.message
                ? lastOpenError.message
                : 'the tab type is registered but this Session never adopted it';
              console.warn('[team-kanban] gave up opening the board for', sessionId, '-', message);
              diag({ phase: 'open-failed', sessionId, error: message });
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
  --tkb-ease: cubic-bezier(.2, .8, .2, 1);
  --tkb-ease-spring: cubic-bezier(.34, 1.42, .64, 1);
  --tkb-mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;
  --tkb-c-pending: var(--dsw-alias-state-idle-primary);
  --tkb-c-active: var(--dsw-alias-state-business-primary);
  --tkb-c-done: var(--dsw-alias-state-success-primary);
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
.tkb-glyph--completed { color: color-mix(in srgb, var(--tkb-c-done) 80%, var(--dsw-alias-label-primary)); }
.tkb-glyph--completed circle {
  stroke: color-mix(in srgb, var(--tkb-c-done) 60%, var(--dsw-alias-label-primary));
  stroke-width: 0.8;
}
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
  align-items: baseline;
  gap: 1px;
  cursor: default;
}
.tkb-score__done {
  position: relative;
  display: inline-flex;
  overflow: hidden;
  height: 22px;
  line-height: 22px;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -.02em;
  font-variant-numeric: tabular-nums;
  transition: color var(--tkb-d3) var(--tkb-ease);
}
.tkb-odo {
  display: inline-flex;
  flex-direction: column;
  transition: transform 340ms ease-out;
  transition: transform 380ms linear(0, .14 5%, .48 13%, .78 23%, .95 34%, 1.03 48%, 1.01 68%, 1);
}
.tkb-odo span {
  height: 22px;
  line-height: 22px;
  display: block;
  text-align: center;
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
}

/* 顶部进度条（校准游标槽） */
.tkb-strip {
  position: relative;
  flex: 1 1 auto;
  min-width: 48px;
  height: 12px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 3px;
  border-radius: 6px;
  overflow: hidden;
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 4%, var(--dsw-alias-bg-base));
  border: 1px solid var(--dsw-alias-border-l2);
  box-shadow: inset 0 1px 2px color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);
}
.tkb-root[data-alldone] .tkb-strip::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--tkb-c-done) 45%, var(--dsw-alias-label-on-color)), transparent);
  transform: translateX(-100%);
  animation: tkb-alldone-sweep 900ms var(--tkb-ease) 1;
  pointer-events: none;
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
  border-radius: 3px;
  appearance: none;
  transition: flex-grow var(--tkb-d3) var(--tkb-ease);
}
.tkb-slot::before {
  content: "";
  position: absolute;
  top: -9px;
  bottom: -9px;
  left: -1px;
  right: -1px;
  pointer-events: auto;
}
.tkb-slot__bar {
  position: relative;
  width: 100%;
  height: 6px;
  border-radius: 2px;
  overflow: hidden;
  background-color: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);
  transition: height var(--tkb-d2) var(--tkb-ease),
              background-color var(--tkb-d3) var(--tkb-ease),
              transform var(--tkb-d1) var(--tkb-ease),
              box-shadow var(--tkb-d2) var(--tkb-ease);
}
.tkb-slot:hover .tkb-slot__bar {
  transform: scaleY(1.3);
  box-shadow: 0 0 4px color-mix(in srgb, var(--tkb-c-active) 35%, transparent);
}
.tkb-slot[data-s="blocked"] .tkb-slot__bar {
  background-color: color-mix(in srgb, var(--tkb-c-warn) 22%, transparent);
  background-image: repeating-linear-gradient(
    -45deg,
    color-mix(in srgb, var(--tkb-c-warn) 50%, transparent) 0 3px,
    color-mix(in srgb, var(--tkb-c-warn) 18%, transparent) 3px 6px
  );
}
.tkb-slot[data-s="ready"] .tkb-slot__bar {
  background-color: transparent;
  box-shadow: inset 0 0 0 1.2px color-mix(in srgb, var(--tkb-c-active) 55%, transparent);
}
.tkb-slot[data-s="active"] .tkb-slot__bar {
  background: var(--tkb-c-active);
  box-shadow: 0 0 6px color-mix(in srgb, var(--tkb-c-active) 40%, transparent);
}
.tkb-slot[data-s="done"] .tkb-slot__bar {
  height: 4px;
  background-color: var(--tkb-c-done);
}
.tkb-slot[data-s="done"]:hover .tkb-slot__bar {
  box-shadow: 0 0 4px color-mix(in srgb, var(--tkb-c-done) 40%, transparent);
}

/* =====================================================================
   智能体指挥官视窗 (Agent Cockpit Strip)
   ===================================================================== */
.tkb-mates-wrap {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  min-width: 0;
  max-width: calc(100% - 140px);
}
.tkb-mates {
  flex: none;
  display: flex;
  align-items: center;
  padding-left: 4px;
  min-width: 0;
  max-width: 100%;
  overflow: clip;
  overflow-clip-margin: 8px;
}
.tkb-mates[data-overflow] {
  -webkit-mask-image: linear-gradient(to right, var(--dsw-alias-label-primary) calc(100% - 18px), transparent 100%);
  mask-image: linear-gradient(to right, var(--dsw-alias-label-primary) calc(100% - 18px), transparent 100%);
}
.tkb-mates__more {
  flex: none;
  height: 22px;
  padding: 0 6px;
  margin-left: 2px;
  border-radius: 11px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-secondary);
  font-family: var(--tkb-mono);
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  appearance: none;
  transition: background-color var(--tkb-d1) var(--tkb-ease), color var(--tkb-d1) var(--tkb-ease), transform var(--tkb-d1) var(--tkb-ease);
}
.tkb-mates__more:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.tkb-mates__more:active { transform: scale(0.95); }
.tkb-mates__empty {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
}

/* =====================================================================
   团队控制（本插件唯一的写入口：停用团队协作）
   ===================================================================== */
.tkb-team {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  padding-left: 8px;
  border-left: 1px solid var(--dsw-alias-border-l2);
}
.tkb-team__btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 22px;
  padding: 0 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 11px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  appearance: none;
  transition: background-color var(--tkb-d2) var(--tkb-ease),
              border-color var(--tkb-d2) var(--tkb-ease),
              color var(--tkb-d2) var(--tkb-ease);
}
.tkb-team__btn:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.tkb-team__btn:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 2px;
}
.tkb-team__btn[aria-expanded="true"] {
  border-color: var(--dsw-alias-border-l3);
  color: var(--dsw-alias-label-primary);
}
.tkb-team__icon { display: block; flex: none; color: currentColor; }
.tkb-team__label { white-space: nowrap; }
.tkb-team__pop {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 6;
  width: 232px;
  padding: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-2);
  box-shadow: 0 12px 32px color-mix(in srgb, var(--dsw-alias-label-primary) 18%, transparent);
  transform-origin: top right;
  animation: tkb-pop-in 180ms ease-out both;
  animation: tkb-pop-in 260ms linear(0, .45 18%, 1.04 48%, .99 72%, 1) both;
}
.tkb-team__title {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}
.tkb-team__body {
  margin: 0 0 10px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}
.tkb-team__err {
  margin: 0 0 8px;
  font-size: 11px;
  line-height: 1.4;
  color: var(--dsw-alias-state-error-primary);
}
.tkb-team__actions { display: flex; justify-content: flex-end; gap: 6px; }
.tkb-team__ghost,
.tkb-team__danger {
  height: 24px;
  padding: 0 10px;
  border-radius: 6px;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  appearance: none;
}
.tkb-team__ghost {
  border: 1px solid var(--dsw-alias-border-l2);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
}
.tkb-team__ghost:hover { background: var(--dsw-alias-interactive-bg-hover); }
.tkb-team__danger {
  border: 1px solid var(--dsw-alias-state-error-primary);
  background: transparent;
  color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, var(--dsw-alias-label-primary));
}
.tkb-team__danger:hover {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);
}
.tkb-team__ghost:disabled,
.tkb-team__danger:disabled { opacity: .55; cursor: default; }
@keyframes tkb-pop-in {
  from { opacity: 0; transform: translateY(-4px) scale(.98); }
  to { opacity: 1; transform: none; }
}
@container tkb (max-width: 520px) {
  .tkb-head { gap: 8px; padding: 10px 12px 9px; }
  .tkb-team { padding-left: 6px; }
  .tkb-team__label { display: none; }
  .tkb-team__btn { padding: 0 6px; }
  .tkb-mates-wrap { max-width: calc(100% - 156px); }
  .tkb-mc + .tkb-mc { margin-left: 5px; }
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
.tkb-mc + .tkb-mc { margin-left: 8px; }
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
.tkb-mc.is-pinned {
  padding: 2px 8px 2px 2px;
  background: color-mix(in srgb, var(--tkb-c-active) 10%, var(--dsw-alias-bg-base));
}
.tkb-mc.is-pinned .tkb-mc__name {
  display: inline;
  max-width: 9ch;
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}
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
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, var(--dsw-alias-bg-base));
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
.tkb-mate[data-wide] { font-size: 9.5px; letter-spacing: -.04em; }
.tkb-mate[data-lead] {
  border-radius: 7px;
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, var(--dsw-alias-bg-layer-2));
  color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 70%, var(--dsw-alias-label-primary));
}
.tkb-mate[data-running] {
  box-shadow: 0 0 0 2px var(--dsw-alias-bg-base), 0 0 0 3px color-mix(in srgb, var(--tkb-c-active) 65%, transparent);
}
.tkb-mate[data-phase="failed"] {
  box-shadow: 0 0 0 2px var(--dsw-alias-bg-base), 0 0 0 3px color-mix(in srgb, var(--tkb-c-error) 55%, transparent);
  color: color-mix(in srgb, var(--tkb-c-error) 80%, var(--dsw-alias-label-primary));
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
  box-shadow: 0 0 6px var(--tkb-c-active), 0 0 0 2px var(--dsw-alias-bg-base);
  animation: tkb-blink calc(1400ms) ease-in-out infinite;
}
.tkb-mate[data-phase="failed"] .tkb-mate__dot {
  background: var(--tkb-c-error);
}
.tkb-mate[data-phase="provisioning"] .tkb-mate__dot {
  background: var(--tkb-c-warn);
  animation: tkb-blink calc(1400ms) ease-in-out infinite;
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
  transition: color var(--tkb-d1) var(--tkb-ease);
}
.tkb-lane__head[role="button"] { cursor: pointer; user-select: none; }
.tkb-lane__head[role="button"]:hover { color: var(--dsw-alias-label-primary); }
.tkb-lane__head:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--tkb-c-active) 60%, transparent);
  outline-offset: -2px;
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
  color: var(--dsw-alias-label-secondary);
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 5%, var(--dsw-alias-bg-base));
  box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1);
  font-variant-numeric: tabular-nums;
  transition: color var(--tkb-d2);
}
.tkb-lane__chev {
  width: 12px;
  height: 12px;
  color: var(--dsw-alias-label-tertiary);
  transition: transform var(--tkb-d2) var(--tkb-ease), color var(--tkb-d1);
}
.tkb-lane__head:hover .tkb-lane__chev { color: var(--dsw-alias-label-secondary); }
.tkb-lane[data-collapsed] .tkb-lane__chev { transform: rotate(-90deg); }
.tkb-lane[data-collapsed] .tkb-lane__body { display: none !important; }
.tkb-lane[data-empty] .tkb-lane__head { height: 30px; color: var(--dsw-alias-label-tertiary); }
.tkb-lane[data-empty] .tkb-lane__count { opacity: .55; }
.tkb-lane[data-empty] .tkb-lane__body { display: none; }
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
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--dsw-alias-label-on-color) 10%, transparent),
              0 1px 2px color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent),
              0 4px 10px -4px color-mix(in srgb, var(--dsw-alias-label-primary) 5%, transparent);
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
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--dsw-alias-label-on-color) 12%, transparent),
              0 8px 20px -3px color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent),
              0 2px 6px -1px color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent);
}
.tkb-card:active {
  transform: translateY(0) scale(0.992);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);
  transition-duration: 70ms;
}
.tkb-card[data-expanded] {
  z-index: 3;
  border-color: color-mix(in srgb, var(--tkb-c-active) 48%, var(--dsw-alias-border-l2));
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--tkb-c-active) 16%, transparent),
              0 10px 26px -6px color-mix(in srgb, var(--dsw-alias-label-primary) 14%, transparent),
              0 0 0 1px color-mix(in srgb, var(--tkb-c-active) 18%, transparent);
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
  font-variant-numeric: tabular-nums;
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
.tkb-card__owner .tkb-mate[data-wide] { font-size: 8.5px; }
.tkb-card__owner .tkb-mate[data-lead] { border-radius: 6px; }
.tkb-card__owner .tkb-mate__dot { right: -2px; bottom: -2px; width: 6px; height: 6px; box-shadow: none; }
.tkb-card__chev {
  width: 11px;
  height: 11px;
  color: var(--dsw-alias-label-tertiary);
  opacity: 0;
  transition: opacity var(--tkb-d1) var(--tkb-ease), transform var(--tkb-d2) var(--tkb-ease);
}
.tkb-card:hover .tkb-card__chev,
.tkb-card:focus-within .tkb-card__chev { opacity: .55; }
@media (hover: none) {
  .tkb-card__chev { opacity: .55; }
}
.tkb-card[data-expanded] .tkb-card__chev { opacity: .8; transform: rotate(180deg); }

/* 活跃运行指示器 */
.tkb-card__live-dot {
  position: relative;
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--tkb-c-active);
  box-shadow: 0 0 8px var(--tkb-c-active);
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
  text-wrap: pretty;
  transition: color var(--tkb-d2) var(--tkb-ease);
}
.tkb-card[data-expanded] .tkb-card__title { -webkit-line-clamp: unset; }
.tkb-card__preview { grid-area: preview; display: none; }
.tkb-card__detail {
  grid-area: detail;
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: 0fr;
  pointer-events: auto;
  cursor: auto;
  transition: grid-template-rows var(--tkb-d2) var(--tkb-ease);
}
.tkb-card[data-expanded] .tkb-card__detail { grid-template-rows: 1fr; }
.tkb-card__detail-clip {
  min-height: 0;
  overflow: hidden;
  visibility: hidden;
  opacity: 0;
  transition: opacity var(--tkb-d1) var(--tkb-ease), visibility 0ms var(--tkb-d2);
}
.tkb-card[data-expanded] .tkb-card__detail-clip {
  visibility: visible;
  opacity: 1;
  transition: opacity var(--tkb-d2) var(--tkb-ease), visibility 0ms;
}

/* ---------------------------------------------------------------------
   状态 1：待处理（Pending）—— 阻塞暗哑 vs 就绪轻盈
   --------------------------------------------------------------------- */
.tkb-card[data-status="pending"][data-ready="false"] {
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 2.2%, var(--dsw-alias-bg-base));
  border-style: dashed;
  border-color: var(--dsw-alias-border-l2);
  box-shadow: inset 0 1px 3px color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent);
}
.tkb-card[data-status="pending"][data-ready="false"]:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  border-color: var(--dsw-alias-border-l3);
}
.tkb-card[data-status="pending"][data-ready="false"] .tkb-card__title {
  color: var(--dsw-alias-label-secondary);
}

/* 就绪卡片：DSH 科技蓝微边框与轻微提升 */
.tkb-card[data-status="pending"][data-ready="true"] {
  border-color: color-mix(in srgb, var(--tkb-c-active) 28%, var(--dsw-alias-border-l1));
}
.tkb-card[data-status="pending"][data-ready="true"]:hover {
  border-color: color-mix(in srgb, var(--tkb-c-active) 45%, var(--dsw-alias-border-l2));
  box-shadow: 0 3px 10px -2px color-mix(in srgb, var(--tkb-c-active) 12%, transparent);
}

/* ---------------------------------------------------------------------
   状态 2：进行中（In Progress）—— DSH 科技蓝纯净质感与低噪呼吸
   --------------------------------------------------------------------- */
.tkb-card[data-status="in_progress"] {
  padding-left: 15px;
  background: color-mix(in srgb, var(--dsw-alias-state-business-tertiary) 18%, var(--dsw-alias-card-fill));
  border-color: color-mix(in srgb, var(--tkb-c-active) 36%, var(--dsw-alias-border-l1));
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--tkb-c-active) 18%, transparent),
              0 4px 14px -4px color-mix(in srgb, var(--tkb-c-active) 18%, transparent),
              0 1px 2px color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent);
}
.tkb-card[data-status="in_progress"][data-live] {
  animation: tkb-breath calc(2800ms) ease-in-out infinite;
}
.tkb-card[data-status="in_progress"]:hover {
  background: color-mix(in srgb, var(--dsw-alias-state-business-tertiary) 28%, var(--dsw-alias-card-fill-hover));
  border-color: color-mix(in srgb, var(--tkb-c-active) 52%, var(--dsw-alias-border-l2));
  box-shadow: 0 4px 14px -2px color-mix(in srgb, var(--tkb-c-active) 18%, transparent);
}

/* 左侧内嵌式圆角能量槽 */
.tkb-card__rail {
  position: absolute;
  left: 5px;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 3px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  background: color-mix(in srgb, var(--tkb-c-active) 40%, transparent);
  transition: opacity var(--tkb-d3) var(--tkb-ease), background-color var(--tkb-d3) var(--tkb-ease);
}
.tkb-card[data-status="in_progress"] .tkb-card__rail { opacity: 1; }
.tkb-card[data-status="in_progress"][data-live] .tkb-card__rail {
  background: var(--tkb-c-active);
  box-shadow: 0 0 6px var(--tkb-c-active);
}
.tkb-card__rail::after {
  content: "";
  position: absolute;
  left: 0; right: 0; top: 0; height: 60%;
  opacity: 0;
  background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--tkb-c-active) 35%, var(--dsw-alias-label-on-color)) 50%, transparent);
  transform: translateY(-100%);
  transition: opacity var(--tkb-d3) var(--tkb-ease);
}
.tkb-card[data-live] .tkb-card__rail::after {
  opacity: 0.8;
  animation: tkb-flow calc(1800ms) cubic-bezier(.45, 0, .55, 1) infinite;
}

/* ---------------------------------------------------------------------
   状态 3：已完成（Completed）—— 紧凑通透，自然退入背景
   --------------------------------------------------------------------- */
.tkb-card[data-status="completed"] {
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  grid-template-areas:
    "glyph id title owner"
    "detail detail detail detail";
  padding: 6px 9px 6px 11px;
  background: color-mix(in srgb, var(--dsw-alias-card-fill) 60%, transparent);
  border-color: color-mix(in srgb, var(--dsw-alias-border-l2) 40%, transparent);
  box-shadow: none;
  position: relative;
}
.tkb-card[data-status="completed"]:hover {
  background: var(--dsw-alias-card-fill-hover);
  border-color: var(--dsw-alias-border-l2);
  transform: translateY(-1px);
}
.tkb-card[data-status="completed"][data-expanded] {
  background: var(--dsw-alias-bg-layer-1);
  border-color: var(--dsw-alias-border-l2);
}
.tkb-card[data-status="completed"] .tkb-card__glyph { display: block; }
.tkb-card[data-status="completed"] .tkb-glyph--completed {
  color: color-mix(in srgb, var(--tkb-c-done) 80%, var(--dsw-alias-label-primary));
}

.tkb-card[data-status="completed"] .tkb-card__deps,
.tkb-card[data-status="completed"] .tkb-card__preview,
.tkb-card[data-status="completed"] .tkb-card__owner-name { display: none !important; }
.tkb-card[data-status="completed"] .tkb-card__title {
  margin-top: 0;
  font-size: 12.5px;
  font-weight: 400;
  color: var(--dsw-alias-label-secondary);
  -webkit-line-clamp: 1;
}
.tkb-card[data-status="completed"][data-expanded] .tkb-card__title {
  -webkit-line-clamp: unset;
  color: var(--dsw-alias-label-primary);
}
.tkb-card[data-status="completed"] .tkb-card__owner .tkb-mate {
  width: 18px;
  height: 18px;
  font-size: 9.5px;
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
  color: color-mix(in srgb, var(--tkb-c-active) 75%, var(--dsw-alias-label-primary));
  background: var(--dsw-alias-state-business-tertiary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--tkb-c-active) 24%, transparent);
}
.tkb-badge[data-kind="blocked"] {
  color: color-mix(in srgb, var(--dsw-alias-state-warn-label) 60%, var(--dsw-alias-label-primary));
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
  color: color-mix(in srgb, var(--dsw-alias-state-warn-label) 60%, var(--dsw-alias-label-primary));
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
.tkb-unlocks {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 18px;
  padding: 0 5px;
  border-radius: 5px;
  pointer-events: auto;
  font-family: var(--tkb-mono);
  font-size: 10px;
  font-weight: 600;
  color: var(--dsw-alias-label-secondary);
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, var(--dsw-alias-bg-base));
}
.tkb-unlocks[data-critical] {
  color: color-mix(in srgb, var(--tkb-c-active) 75%, var(--dsw-alias-label-primary));
  background: var(--dsw-alias-state-business-tertiary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--tkb-c-active) 32%, transparent);
}
.tkb-unlocks__icon { width: 10px; height: 10px; opacity: .8; }
.tkb-conflict {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  pointer-events: auto;
  color: color-mix(in srgb, var(--dsw-alias-state-warn-label) 60%, var(--dsw-alias-label-primary));
  background: var(--dsw-alias-state-warn-tertiary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--tkb-c-warn) 22%, transparent);
}
.tkb-conflict__icon { width: 11px; height: 11px; }

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
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px;
  background: color-mix(in srgb, var(--dsw-alias-label-primary) 4.5%, var(--dsw-alias-bg-base));
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
  border-left: 2.5px solid var(--tkb-c-warn);
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
  transform: translateY(-2px);
  border-color: var(--tkb-c-active);
  box-shadow: 0 4px 16px -2px color-mix(in srgb, var(--tkb-c-active) 24%, transparent),
              0 0 0 1px var(--tkb-c-active);
}

/* 依赖血缘链路悬停 */
.tkb-root[data-lineage] .tkb-card:not(.is-lin) {
  opacity: .36;
  filter: saturate(0.7);
  transform: scale(0.99);
}
.tkb-root[data-lineage] .tkb-card.is-lin {
  z-index: 2;
  transform: translateY(-1.5px);
  box-shadow: 0 4px 14px -2px color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent);
}
/* 上游卡片（前置供给者）：警示橙微边框与浅底 / 翡翠绿完成底 */
.tkb-root[data-lineage] .tkb-card.is-up-open {
  border-color: var(--tkb-c-warn);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-tertiary) 45%, var(--dsw-alias-card-fill));
  box-shadow: 0 2px 8px color-mix(in srgb, var(--tkb-c-warn) 15%, transparent);
}
.tkb-root[data-lineage] .tkb-card.is-up-done {
  border-color: var(--tkb-c-done);
  background: color-mix(in srgb, var(--tkb-c-done) 10%, var(--dsw-alias-card-fill));
  box-shadow: 0 2px 8px color-mix(in srgb, var(--tkb-c-done) 15%, transparent);
}
/* 下游卡片（后置消费端）：DSH 科技蓝微边框与浅蓝底 */
.tkb-root[data-lineage] .tkb-card.is-down {
  border-color: var(--tkb-c-active);
  background: color-mix(in srgb, var(--dsw-alias-state-business-tertiary) 45%, var(--dsw-alias-card-fill));
  box-shadow: 0 2px 8px color-mix(in srgb, var(--tkb-c-active) 18%, transparent);
}

/* 卡片跳转高亮、冲突成对高亮、解扣脉冲与贝塞尔血缘连线 / 飞行层 */
.tkb-card.is-flash { animation: tkb-flash 1100ms var(--tkb-ease) 1; }
.tkb-card.is-unlocked { animation: tkb-unlock-pulse 640ms var(--tkb-ease) 1; }
.tkb-card.is-landed { animation: tkb-land 200ms ease-out 1; }
.tkb-card.is-conflict-pair {
  z-index: 3;
  border-style: dashed;
  border-color: var(--tkb-c-warn);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--tkb-c-warn) 28%, transparent),
              0 6px 18px -4px color-mix(in srgb, var(--tkb-c-warn) 24%, transparent);
}
.tkb-wires {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
  overflow: visible;
}
.tkb-wire {
  fill: none;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-dasharray: 100;
  stroke-dashoffset: 0;
  animation: tkb-wire-draw var(--tkb-d2) var(--tkb-ease) both;
  transition: opacity var(--tkb-d1) var(--tkb-ease), stroke-width var(--tkb-d1) var(--tkb-ease);
}
.tkb-wire.is-off {
  stroke-dasharray: 3 3;
  opacity: .55;
  animation: none;
}
.tkb-wire.is-dim { opacity: .2; }
.tkb-wire.is-focus { stroke-width: 2.6; }
.tkb-wire--up-open {
  stroke: var(--tkb-c-warn);
  stroke-dasharray: 4 3;
  animation: tkb-wire-flow calc(1200ms) linear infinite;
}
.tkb-wire--up-done { stroke: var(--tkb-c-done); }
.tkb-wire--down {
  stroke: var(--tkb-c-active);
  stroke-dasharray: 6 3;
  animation: tkb-wire-flow calc(1600ms) linear infinite;
}
.tkb-wire--relay {
  stroke: var(--tkb-c-done);
  stroke-width: 2.2;
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--tkb-c-done) 55%, transparent));
  animation: tkb-relay-pulse calc(900ms) var(--tkb-ease) both;
}
.tkb-wire-dot {
  stroke: var(--dsw-alias-bg-base);
  stroke-width: 1.5;
}
.tkb-wire-dot.tkb-wire--up-open { fill: var(--tkb-c-warn); }
.tkb-wire-dot.tkb-wire--up-done,
.tkb-wire-dot.tkb-wire--relay { fill: var(--tkb-c-done); }
.tkb-wire-dot.tkb-wire--down { fill: var(--tkb-c-active); }
.tkb-flights {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  overflow: hidden;
}
.tkb-flight-card {
  box-shadow: 0 14px 32px -6px color-mix(in srgb, var(--dsw-alias-label-primary) 20%, transparent);
}

/* 提示气泡（实测边界 + 光学方向箭头） */
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
  transform: translateY(2px);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--dsw-alias-label-primary) 20%, transparent);
  transition: opacity var(--tkb-d1) var(--tkb-ease), transform var(--tkb-d1) var(--tkb-ease);
}
.tkb-tip[data-show] { opacity: 1; transform: none; }
.tkb-tip b { display: block; font-weight: 600; }
.tkb-tip span { display: block; margin-top: 1px; opacity: .75; }
.tkb-tip span:empty { display: none; }
.tkb-tip__arrow {
  position: absolute;
  width: 7px;
  height: 7px;
  background: var(--dsw-alias-label-primary);
  transform: rotate(45deg);
}
.tkb-tip[data-place="top"] .tkb-tip__arrow { bottom: -3px; }
.tkb-tip[data-place="bottom"] .tkb-tip__arrow { top: -3px; }

/* =====================================================================
   动画关键帧清单（硬件加速，零强制 Repaint）
   ===================================================================== */
@keyframes tkb-flow {
  from { transform: translateY(-100%); }
  to { transform: translateY(220%); }
}
@keyframes tkb-breath {
  0%, 100% { border-color: color-mix(in srgb, var(--tkb-c-active) 34%, var(--dsw-alias-border-l1)); }
  50% { border-color: color-mix(in srgb, var(--tkb-c-active) 68%, var(--dsw-alias-border-l1)); }
}
@keyframes tkb-blink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .3; transform: scale(0.85); }
}
@keyframes tkb-num-in {
  from { opacity: 0; transform: translateY(35%); }
  to { opacity: 1; transform: none; }
}
@keyframes tkb-wire-draw {
  from { stroke-dashoffset: 100; opacity: .2; }
  to { stroke-dashoffset: 0; opacity: .9; }
}
@keyframes tkb-wire-flow {
  from { stroke-dashoffset: 18; }
  to { stroke-dashoffset: 0; }
}
@keyframes tkb-relay-pulse {
  0% { stroke-dashoffset: 100; opacity: 0; }
  25% { stroke-dashoffset: 0; opacity: 1; }
  75% { stroke-dashoffset: 0; opacity: .9; }
  100% { stroke-dashoffset: 0; opacity: 0; }
}
@keyframes tkb-unlock-pulse {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--tkb-c-active) 55%, transparent);
    border-color: var(--tkb-c-active);
  }
  45% {
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--tkb-c-active) 16%, transparent);
    background: color-mix(in srgb, var(--dsw-alias-state-business-tertiary) 55%, var(--dsw-alias-card-fill));
  }
  100% { box-shadow: 0 0 0 0 transparent; }
}
@keyframes tkb-land {
  0% { transform: scale(0.985); }
  50% { transform: scale(1.012); }
  100% { transform: none; }
}
@keyframes tkb-alldone-sweep {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
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
  .tkb-card__rail::after { opacity: 0 !important; }
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
  .tkb-lane[data-empty] .tkb-lane__head { height: 38px; }
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
  .tkb-lane[data-empty] .tkb-lane__body { display: flex; }
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
  .tkb-lane[data-empty] .tkb-lane__head { height: 42px; }
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
  stroke: var(--tkb-c-active);
  stroke-width: 1.8;
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 8px 8px;
  transition: stroke-dashoffset 620ms var(--tkb-ease), stroke var(--tkb-d2) var(--tkb-ease);
}
.tkb-title[data-done] .tkb-title__arc {
  stroke: var(--tkb-c-done);
}
.tkb-title__check {
  fill: none;
  stroke: var(--tkb-c-done);
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
      diag({ phase: 'apply' });
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

      /* A sub-plugin waits for the service instead of failing the bundle on a
         Host without Agent Teams. The board only shows when the `agentTeam`
         projection exists, so in practice the service is there when the
         control is visible; this keeps the load path defensive anyway. */
      ctx.inject(['remote', 'remote.agentTeams'], (scope) => {
        const control = (sessionId, enabled) => scope.remote.agentTeams.setEnabled(sessionId, enabled);
        teamControl = control;
        scope.effect(() => () => {
          /* A reload may already have installed the next control. */
          if (teamControl === control) teamControl = null;
        }, 'team-kanban: team control');
      });

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
          const dispose = ctx.sidebarRightTabs.register({
            id: TAB_ID,
            kind: KIND,
            priority: 'extension',
            title: () => t('tab.title'),
          });
          diag({ phase: 'registered', kind: KIND });
          return dispose;
        } catch (error) {
          const message = error && error.message ? error.message : String(error);
          console.warn('[team-kanban] could not register the sidebar tab type -', message);
          diag({ phase: 'register-failed', error: message });
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
        disambiguateMonos,
        ownerDisplay,
        disableTeam,
        requestSettle,
        FALLBACK_LIMIT,
      }),
    });
    return plugin;
  },
});
