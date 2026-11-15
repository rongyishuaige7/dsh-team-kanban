# 技术设计方案与实施文档（DESIGN）：智能体任务板插件

- **包名**：`@local/dsh-client-ui-team-kanban`
- **目标运行时**：DeepSeek Harness `0.2.2-rc.3`（`DSH_PROFILE=desktop`，安装目录只读位于 `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/`）
- **关联文档**：产品需求见 [`PRD.md`](./PRD.md)
- **当前阶段**：Phase 1（工程规范与架构已定稿；UI 视觉设计与 `client.js` 界面层交由后续前端界面设计 Agent 实施）

---

## 1. 宿主环境核实基线与硬约束

1. **宿主能力（只读，不重写）**：
   - `@deepseek-ai/dsh-agent-team` 提供会话投影 `agentTeam`（`wire.view` 定义见 `dsh-agent-team/src/projection.ts:178-217`）。
   - `@deepseek-ai/dsh-subagent` 提供会话投影 `subagentCatalog`。
   - `@deepseek-ai/dsh-client-ui-sidebar-right` 提供右栏导航控制器 `ctx.sidebarRight` 与标签页类型注册表 `ctx.sidebarRightTabs`。
2. **硬约束**：
   - 团队模式关闭（`enabled !== true`）或可见任务数为 0 时，不显示任何 UI、不占位、不报错。
   - 只靠投影订阅刷新，禁止轮询、禁止直接读 `~/.dsh/sessions`。
   - 禁止修改 `app.asar` 内任何包；交付为独立 bundle，安装至 `~/.dsh/profiles/desktop` 生效。
   - 不碰任务写入路径（`remote.agentTeams.setEnabled` / `team_task_*`）。

---

## 2. 技术选型：资源型 Tab vs 页面型常驻 Tab

基于对 `@deepseek-ai/dsh-client-ui-sidebar-right`（`service.ts`、`tab-registry.ts`、`stores.ts`、`contract/seed.ts`、`contract/slots.ts`）及四个内置参考包（`dsh-client-ui-plan`、`dsh-client-ui-deliverables`、`dsh-client-ui-schedule`、`dsh-client-ui-sidebar-files`、`dsh-client-ui-sidebar-terminal`）源码的核对，对比如下：

| 对比项 | 方案 A：资源型 Tab（Resource Tab） | 方案 B：页面型常驻 Tab + 自动开闭同步器（推荐） |
|---|---|---|
| **代表参照** | `dsh-client-ui-plan`、`dsh-client-ui-deliverables` | `dsh-client-ui-sidebar-files`（页面注册）+ `dsh-client-ui-sidebar-terminal`（`AgentTerminalOpener` 自动开闭） |
| **注册机制** | 需声明 `patterns: ['dsh-resource://team-board/**']` + `canOpen`；**还必须注册** `ctx.resources.register(provider)` 处理地址解析与 pin | 不声明 `patterns`，由宿主 `contract/seed.ts` 的 `pageAddress('team-board')`（`sidebar://team-board`）唯一标识；同分栏内自动去重 |
| **数据获取** | 逻辑上绕行 `useResource`，实际仍需投影补全 | 直接读取 slot 注入的 `useProjection` / `useSessions` / `useSessionStatus` |
| **触发与显隐** | 必须改造外部触发源调用 `openResource`；仅靠 body `return null` 会留空标签占位 | 通过挂载在 `conversation.session.header.actions` 的无 UI 观察组件监听 `agentTeam` 投影，按需调用 `ctx.sidebarRight.openTabIn` / `closeIn` |
| **改动范围** | 独立 bundle + 虚拟 resource provider | **仅需一个独立 bundle**，零修改 `app.asar` |

### 2.1 最终选型与关键机制确认
选用 **方案 B**：
1. **不声明 `guide` 入口**：在 `SidebarRightTabRegistry`（`tab-registry.ts`、`GuideBody.tsx:149-158`）中，`guide` 是静态注册且会被 `GuideBody` 固定包裹在 `.entryCell` 中并加入「更多工具」列表。为严格满足「团队模式关闭或任务数为 0 时完全不占位」，本插件不向 Guide 页注入静态卡片，完全由会话级观察器自动管理标签页生命周期。
2. **`tab.actions.bindCommands` 机制确认**：`dsh-client-ui-sidebar-right/src/client/contract/slots.ts:150-162` 确认 `bindCommands` 接收 `{ refresh?: () => void }`（由全局 `page.refresh` 快捷键调用），并返回释放函数。看板组件挂载后可绑定：
   ```js
   tab.actions.bindCommands({
     refresh: () => { void ctx.sessions.refreshProjections(sessionId) },
   })
   ```
   用于响应手动刷新快捷键，平时更新完全由投影订阅自动推送。

---

## 3. 独立 Bundle 包结构与清单

项目独立部署为一个本地 bundle 目录（安装前不进入 `desktop` profile）：

```text
@local/dsh-client-ui-team-kanban/
├── package.json         # Bundle 清单（dsh.bundle + dsh.client）
├── cordis.patch.yml     # 向 profile 注入插件行
├── index.js             # Host 侧入口（export function apply() {}）
├── client.js            # 浏览器侧产物（window.__ModuleLoader__.load 格式，零构建直出）
├── icon.svg             # 插件列表图标（≤256 KiB，原创 SVG）
└── locale/
    ├── zh.json          # 中文包元数据（meta.title / meta.description）
    └── en.json          # 英文包元数据
```

### 3.1 `package.json`（含 `dsh` 字段）
```json
{
  "name": "@local/dsh-client-ui-team-kanban",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./locale/*.json": "./locale/*.json",
    "./icon": "./icon.svg"
  },
  "files": [
    "index.js",
    "client.js",
    "cordis.patch.yml",
    "locale/*.json",
    "icon.svg"
  ],
  "dsh": {
    "bundle": {
      "patch": "./cordis.patch.yml"
    },
    "client": {
      "platform": "web",
      "immediately": true,
      "inject": [
        "@deepseek-ai/dsh-api-session-controller",
        "@deepseek-ai/dsh-client-locale",
        "@deepseek-ai/dsh-client-ui-conversation",
        "@deepseek-ai/dsh-client-ui-session",
        "@deepseek-ai/dsh-client-ui-sidebar-right"
      ]
    }
  }
}
```

### 3.2 `cordis.patch.yml` 插入位置
```yaml
- insert:
    - id: team-kanban
      name: '@local/dsh-client-ui-team-kanban'
```
- 通过 `plugin_manager` `install_bundle` 安装后，该 bundle 被写入 `~/.dsh/profiles/desktop/package.json` 的 `dsh.profile.bundles`，其 `cordis.patch.yml` 在宿主基础配置之上、用户 `~/.dsh/profiles/desktop/cordis.patch.yml` 之前生效。
- Host 侧 `index.js` 仅导出 `export function apply() {}`；Client 侧由 `dsh-client-modules` 依据 `dsh.client` 自动下发并执行 `client.js`。

### 3.3 Locale 键清单

#### 包元数据 `locale/zh.json` & `locale/en.json`
```json
// locale/zh.json
{
  "meta": {
    "title": "智能体任务板",
    "description": "在右侧栏以三列看板实时展示当前会话的团队任务进度、负责人、依赖关系与队友运行状态。"
  }
}
```
```json
// locale/en.json
{
  "meta": {
    "title": "Agent team kanban",
    "description": "Displays a read-only three-column kanban board in the right sidebar for the current session's shared team tasks and teammate activity."
  }
}
```

#### 客户端字典命名空间 `teamKanban`
| 键名 | 简体中文 (`zh`) | 英文 (`en`) |
|---|---|---|
| `tab.title` | `任务板` | `Task board` |
| `tab.titleCount` | `任务板 ({completed}/{total})` | `Task board ({completed}/{total})` |
| `header.progress` | `{completed}/{total} 已完成` | `{completed}/{total} completed` |
| `header.summary` | `{completed} 已完成 · {active} 进行中 · {pending} 待处理` | `{completed} completed · {active} in progress · {pending} pending` |
| `header.teammates` | `队友运行中 {running}/{total}` | `Teammates active {running}/{total}` |
| `header.noTeammates` | `暂无活跃队友` | `No active teammates` |
| `column.pending` | `待处理` | `Pending` |
| `column.in_progress` | `进行中` | `In progress` |
| `column.completed` | `已完成` | `Completed` |
| `column.empty` | `暂无任务` | `No tasks` |
| `card.unowned` | `未分配` | `Unowned` |
| `card.ready` | `就绪` | `Ready` |
| `card.blocked` | `被依赖阻塞` | `Blocked` |
| `card.blockedBy` | `依赖` | `Blocked by` |
| `card.writeScopes` | `写入范围` | `Write scopes` |
| `card.running` | `运行中` | `Running` |
| `card.idle` | `空闲` | `Idle` |
| `error.projection` | `任务记录异常：{message}` | `Invalid task record: {message}` |

---

## 4. 客户端模块架构、组件树与数据流

### 4.1 模块格式与依赖边界
- `client.js` 必须采用 DSH 浏览器模块加载器协议（参照 `templates/decoration/client.js`）：
  ```js
  window.__ModuleLoader__.load({
    id: '@local/dsh-client-ui-team-kanban',
    factory(require) {
      const React = require('react');
      // 严禁 require('@deepseek-ai/dsh-client-ui-primitives') 或 require('@deepseek-ai/dsh-client-ui-agent-team')
      return {
        inject: ['slots', 'locale', 'sidebarRight', 'sidebarRightTabs', 'sessions'],
        apply(ctx) { /* ... */ },
      };
    },
  });
  ```
- 样式通过 `ctx.effect` 创建并挂载 `<style data-plugin="@local/dsh-client-ui-team-kanban">`，卸载时清理 DOM 节点；所有选择器使用独立前缀 `.tkb-*`。

### 4.2 组件树与 Slot 注册
```text
apply(ctx)
├─ ctx.locale.register('teamKanban', { zh, en })
├─ ctx.effect(mountStyles)
├─ ctx.effect(() => ctx.sidebarRightTabs.register({
│    id: '@local/dsh-client-ui-team-kanban',
│    kind: 'team-board',
│    priority: 'extension',
│    title: () => t('tab.title'),
│  }))
├─ ctx.slots.inject('conversation.session.header.actions', ...)
│  └─ TeamKanbanWatcher          // 无渲染组件 (return null)，按投影自动开/关 tab
├─ ctx.slots.inject('sidebar.right.pane.tab.title', { key: '@local/dsh-client-ui-team-kanban' }, ...)
│  └─ TeamKanbanTitle            // 图标 + 标题 + 完成度计数
└─ ctx.slots.inject('sidebar.right.pane.tab', { key: '@local/dsh-client-ui-team-kanban' }, ...)
   └─ TeamKanbanBoard            // 主看板视图
      ├─ KanbanHeader            // 总进度条 + 统计 + 队友运行态条
      ├─ FailureBanner           // 条件展示 team.failure
      └─ KanbanGrid              // 3 列容器
         └─ KanbanColumn × 3     // pending / in_progress / completed
            └─ TaskCard × N      // 标题、负责人(+运行点)、ready/blocked、blockedBy、展开详情
```

### 4.3 已核实的宿主投影与 Hook 数据契约

#### (1) `agentTeam` 投影（`dsh-agent-team/src/projection.ts:178-217`）
`wire.view` 发送至客户端的结构（注：`wire.view` 已提前过滤掉 `status === 'deleted'`，且仅暴露以下字段）：
```ts
interface TeamProjection {
  enabled: boolean
  tasks: Array<{
    id: string                    // 如 "task-1"
    revision: number
    subject: string
    description: string
    status: 'pending' | 'in_progress' | 'completed' | 'deleted'
    blockedBy: string[]
    writeScopes: string[]
    ownerId?: string              // 负责人 SessionId
    ownerName?: string            // 分配时捕获的智能体名称
    ready: boolean                // 是否所有 blockedBy 均已 completed
    writeScopeWarnings: string[]
  }>
  failure?: string
}
```

#### (2) `subagentCatalog` 投影与运行态判定（`SubagentHeaderLineage.tsx:507-526`）
在 `session`-scoped slot（`conversation.session.header.actions`、`sidebar.right.pane.tab`、`sidebar.right.pane.tab.title`）中，标准 props 自动提供：
- `sessionId`
- `useProjection('agentTeam')` / `useProjection('subagentCatalog')`
- `useSession(selector)`
- `useSessions(selector)`
- `useSessionStatus(selector)`
- `useTabInfo()`（仅 `sidebar.right.pane.tab*`）
- `t`（需在 `slots.register` 声明 `locale: 'teamKanban'`）

队友运行状态按宿主标准方式计算：
```js
const catalog = useProjection('subagentCatalog') ?? [];
const statuses = useSessionStatus(s => s);
const summaries = useSessions(s => s.byId);
// 每个队友 entry: { id, name?, label?, mode }
const isRunning = (id) => (statuses.get(id)?.running ?? summaries[id]?.running) === true;
```

### 4.4 自动开闭与数据流转逻辑
1. **`TeamKanbanWatcher`**（挂载于 `conversation.session.header.actions`）：
   - 先判定根会话：若 `useSession(s => s.subagent !== null)` 或 `useSessions(s => s.byId[sessionId]?.origin === 'subagent')`，直接 `return null` 不干预。
   - 订阅 `team = useProjection('agentTeam')`，计算 `visibleTasks = (team?.tasks ?? []).filter(t => t.status !== 'deleted')`。
   - `shouldShow = team?.enabled === true && visibleTasks.length > 0`。
   - 维护模块级 `dismissedSessions: Set<SessionId>` 与 `wasOpenBySession: Map<SessionId, boolean>`：
     - 当 `shouldShow === false`：清除该 `sessionId` 的 `dismissed` 标记；遍历 `ctx.sidebarRight.tabsIn(sessionId)`，若存在 `kind === 'team-board'` 则调用 `ctx.sidebarRight.closeIn(sessionId, tab.id)`。
     - 当 `shouldShow === true`：检查 `tabsIn(sessionId)` 是否已存在 `kind === 'team-board'`：
       - 若先前已打开而本次消失（说明用户手动关闭），记录进 `dismissedSessions`，不再自动重开；
       - 若未在 `dismissedSessions` 中且当前不存在该 tab，调用 `ctx.sidebarRight.openTabIn(sessionId, 'team-board')`（注意确认此时右侧栏 store 已实例化；若当前会话未挂载右侧栏 store，`openTabIn` 内部安全 noop，可在首次挂载/展开后同步）。
2. **`TeamKanbanBoard`**：
   - 首行防御性守卫：`if (!team?.enabled || visibleTasks.length === 0) return null`。
   - 单次 `useMemo` 将 `visibleTasks` 归类为 `pending`、`in_progress`、`completed` 三组，并构建 `taskMap: Map<id, Task>`（用于查出 `blockedBy` 对应的任务标题与完成态）与 `teammates` 映射（`ownerId -> running`）。
   - 组件内仅维护极简本地状态 `expandedId: string | null` 控制卡片描述展开，无任何副作用或轮询。

### 4.5 边界情况处理清单
| 边界场景 | 预期处理方式 |
|---|---|
| 团队模式关闭 (`enabled !== true`) | `Watcher` 调用 `closeIn` 移除标签；组件守卫返回 `null`，绝不占位 |
| 全部任务被删除 (`tasks.length === 0`) | 同上，`Watcher` 移除标签；若为唯一停靠标签，右侧栏自动收起 |
| 用户手动关闭看板 tab | 记入 `dismissedSessions`，后续状态流转不再强弹；直到任务 `0 -> >0` 或重开团队模式才重置 |
| 切换到子智能体（队友）会话 | `Watcher` 识别 `subagent !== null` 后跳过，不触发无效操作 |
| 看板宽度变化（窄栏 360px / 分屏 / 全屏） | CSS 采用容器查询 `@container`（`container-type: inline-size`）自适应：宽屏三列并排，窄宽提供清晰可滚动/堆叠布局，不发生水平裁剪 |
| 跨会话切换 & 重载恢复 | 右侧栏 layout 恢复后若已过时，`TeamKanbanBoard` 首位守卫防止空白渲染，`Watcher` 立即同步关闭失效标签 |
| 投影记录损坏 (`team.failure`) | 当 `enabled && tasks.length > 0` 时顶部渲染告警条；`tasks.length === 0` 时遵循无任务不展示原则 |

---

## 5. 与现有 `@deepseek-ai/dsh-client-ui-agent-team` 的关系

- **JS 代码零依赖**：不引用 `dsh-client-ui-agent-team` 或 `dsh-client-ui-primitives` 任何模块。
- **Locale 命名空间隔离**：自建 `teamKanban` 命名空间，文案术语与 `agent-team` 对齐，互不冲突。
- **CSS 变量完全共享**：直接使用宿主 `@deepseek-ai/dsh-client-ui-theme` 挂载在 `body` 的 `--dsw-alias-*` 变量，自定义类名加 `.tkb-` 前缀隔离。
- **功能互补**：保留顶栏「子智能体」菜单底部的紧凑任务列表与模型菜单中的开关；本插件专注右侧栏宽幅三列看板。

---

## 6. 给前端界面设计 Agent 的主题 Token 速查表

以下变量已从 `dsh-client-ui-theme/src/styles/design-platform.css` 核实，Light 与 Dark 模式均已由宿主定义：

- **背景与表面**：
  - `--dsw-alias-bg-base`（面板底色）
  - `--dsw-alias-bg-layer-1` / `--dsw-alias-bg-layer-2`（列容器/浮层底色）
  - `--dsw-alias-card-fill` / `--dsw-alias-card-fill-hover`（任务卡片底色与悬停）
  - `--dsw-alias-interactive-bg-hover` / `--dsw-alias-interactive-bg-active`
- **边框与圆角**：
  - `--dsw-alias-border-l1` / `--dsw-alias-border-l2` / `--dsw-alias-border-l3`
  - `--dsw-radius-sm` / `--dsw-radius-md`（参考 `TeamBoard.module.css:68`）
- **文字层级**：
  - `--dsw-alias-label-primary`（主标题）
  - `--dsw-alias-label-secondary`（描述/正文）
  - `--dsw-alias-label-tertiary`（辅助信息/计数/标签）
- **语义状态色**：
  - 运行中 / 进行中：`--dsw-alias-state-business-primary`、`--dsw-alias-state-business-tertiary`
  - 已完成：`--dsw-alias-state-done-primary`（或 `--dsw-alias-state-success-primary` / `--dsw-alias-state-success-tertiary`）
  - 阻塞 / 警告：`--dsw-alias-state-warn-primary`、`--dsw-alias-state-warn-label`、`--dsw-alias-state-warn-tertiary`
  - 空闲：`--dsw-alias-state-idle-primary`
  - 错误：`--dsw-alias-state-error-primary`

---

## 7. 分阶段实施路线

### Phase 1：工程规范与方案落地（已完成）
- 输出 `PRD.md` 与 `DESIGN.md`（当前文档）。

### Phase 2：前端界面设计与包实现（交由前端界面设计 Agent）
1. 在本项目目录补充完整可安装的 bundle 文件：
   - `package.json`、`cordis.patch.yml`、`index.js`、`icon.svg`、`locale/zh.json`、`locale/en.json`
2. 设计并实现 `client.js`：
   - `TeamKanbanWatcher`（含 `dismissedSessions` 防打扰状态机）
   - `TeamKanbanTitle`（标签页图标与进度角标）
   - `TeamKanbanBoard`（顶部总进度 + 队友运行态条 + 三列容器 + 卡片展开 + `@container` 响应式 + 主题变量 CSS）
3. 语法与清单检查：
   - Node 校验 `client.js` 与 `index.js` ES/UMD 语法、JSON 合法性、无禁止的跨插件 `require`。

### Phase 3：桌面端安装与联调验收
1. 安装进 `desktop` profile：
   - 使用 DSH `plugin_manager`（`action: install_bundle`, `target: "/Users/rongyi/Desktop/dsh-team-kanban"`）或 CLI `dsh plugin --profile desktop add /Users/rongyi/Desktop/dsh-team-kanban`。
2. 重启或刷新桌面端，执行第 8 节三场景验收与 UI/UX 审查。

---

## 8. 验收测试矩阵与回滚方式

### 8.1 验收场景
| 编号 | 场景 | 操作步骤 | 验收通过标准 |
|---|---|---|---|
| **T1** | 元数据与加载 | 打开 设置 → 插件 | 显示「智能体任务板 / Agent team kanban」、描述与 SVG 图标，无诊断错误，控制台无 `slot entry crashed` |
| **T2** | 团队模式关闭 | 新建会话并关闭团队协作开关 | 右侧栏无「任务板」标签、不自动展开、不占位、无报错 |
| **T3** | 团队开启但无任务 | 开启团队协作但未建任务；或建任务后全部删空 | 同 T2；任务清空瞬间若看板正打开则自动关闭（唯一标签时收起右栏） |
| **T4** | 状态流转与依赖 | 触发多智能体任务：创建带 `blockedBy` 的任务 → 派发队友认领 → 完成后解锁下游 | 标签自动出现；顶部实时显示进度与队友 `running` 状态；卡片随事件从待处理→进行中→已完成流转；上游完成后阻塞标签转为就绪 |
| **T5** | 主题与几何适配 | 切换 Light/Dark；切换 360px 窄栏、全屏、浮动窗口 | 无硬编码颜色失效、无水平溢出、长标题截断与展开正常 |
| **T6** | 手动关闭防打扰 | 任务进行中点击关闭「任务板」标签，等待下一步状态流转 | 看板保持关闭不强弹，直到全部任务清空后重新创建新任务 |

### 8.2 回滚方案
- **临时停用**：在 DSH「设置 → 插件」关闭「智能体任务板」，或通过 `plugin_manager` 执行 `set_bundle` 禁用。
- **彻底移除**：
  1. 执行 `plugin_manager` `remove_bundle`（或终端执行 `dsh plugin --profile desktop remove @local/dsh-client-ui-team-kanban`）；
  2. 重启 DSH 桌面端；
  3. 宿主 `app.asar` 与现有会话日志零修改、零残留。

---

## 9. 联调期间核实的宿主限制与运行时兜底（0.2.0）

### 9.1 事实：桌面端不送投影帧

> 完整排查过程、失败尝试与证据数据见 [`docs/records/2026-11-15-sidebar-open-and-live-refresh.md`](docs/records/2026-11-15-sidebar-open-and-live-refresh.md)。本节只保留结论与设计理由。

DSH 桌面端 `0.2.2-rc.3` 上，客户端**收不到 `Session` 投影的实时帧**。实测证据（同一会话、同一时间段）：

| 通道 | 载体 | 表现 |
|---|---|---|
| 会话状态 | `ctx.remote.$on('api-session/status')` | 正常：`running` 在 4 分钟任务里 0→1→0 |
| 会话投影 | 单条可重连 control stream（`createSessionControlStream`） | **静止**：`agentTeam` / `subagentCatalog` / `title` 全程无通知 |

`ProjectionValueStore` 的 `faceOf('agentTeam').subscribe` 直接订阅（绕开 React）同样一次都没有触发，因此不是组件订阅问题，而是帧没有到达客户端。结果是：投影只在**打开会话时的基线**与**会话列表的 cached 块**时更新，表现为「切走再切回才刷新」。

### 9.2 兜底：有界拉取

`useTeamKanbanWatcher` 中新增 `pull` 效果：

- 触发条件：本会话 `running` 为真，**或**看板仍有未完成任务；
- 频率：2.5 s；空闲即停，连续失败 3 次即停（不无限重试）；
- 取数：`ctx.remote.session.projections({ sessionId })` → `value.values.agentTeam`（宿主现算的整值，不是缓存）；
- 合并：`freshestTeam(projected, listed, pulled)` 以「任务 `revision` 总和」比新旧，避免过期投影盖住新数据；
- 声明：`inject` 必须显式列出 `remote.session`（Cordis 访问子服务的要求），只写 `remote` 会抛 `cannot get property "remote.session" without inject`。

代价与取舍：PRD §「严禁轮询」在此**有意破例**，因为宿主推送通道不可用，且拉取被限制在「运行中/有未完成任务」这一窗口内，空闲与完成后自动停止。

### 9.3 宿主修复后如何回退

宿主 control stream 恢复推送投影帧后：

1. 删除 `pull` 效果与 `fallbackTeams` / `useFallbackTeam` / `teamWeight` / `freshestTeam`；
2. `team` 回到 `projectedTeam || listedTeam`；
3. `inject` 移除 `remote` / `remote.session`；
4. 用 T4 场景复核实时性。

### 9.4 右侧栏打开的时序约束

`dsh-client-ui-sidebar-right` 的 Seat 中有：`if (shown && !canShow) setExpanded(false)`，而 `canShow = rightbar 轨道宽度 > 0`。因此**从收起状态程序化打开时，必须先 `ctx.layout.openRightbar(true, false)` 再 `openTabIn`**，否则同一轮 commit 里 `expanded` 会被撤回，标签留在 store、列永远不滑出。布局恢复路径（标签已在持久化布局里、但列是收起）由 `ensureColumnOnce` 一次性补轨道。
