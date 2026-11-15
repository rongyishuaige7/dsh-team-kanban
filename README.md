# dsh-team-kanban

> 给 DeepSeek Harness 的多智能体团队，在右侧栏放一块会呼吸的活体任务看板。

三列流转、依赖血缘、负责人运行态、标签页进度角标，全部直接读宿主原生的 `agentTeam` 会话投影（`team_task_*` 写出的那份 DAG），不做二次同步、不落盘、不调外部服务。团队没开或没有任务时，它完全不出现。

A living three-column kanban board for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) agent teams. It renders the native `agentTeam` session projection inside the right sidebar — dependency-aware cards, teammate liveness, tab progress badge — and stays invisible when there is no team to show.

![status](https://img.shields.io/badge/DSH-0.2.2--rc.3-4b6bfb) ![license](https://img.shields.io/badge/license-MIT-green)

---

## 它不是又一个外部看板

生态里已有的 Kanban 插件大多解决「人怎么给 Agent 派活」：卡片存在插件自己的 SQLite 里，靠自定义的 `kanban_*` 工具维护。这个插件解决的是另一件事——**一个复杂任务里，多个智能体如何认领、阻塞、解锁**：

| | 外部项目管理型看板 | dsh-team-kanban |
|---|---|---|
| 数据来源 | 插件自建存储 + 自定义工具 | 宿主 `agentTeam` 投影，唯一事实源 |
| 卡片粒度 | 一次派发 = 一个独立会话 | 会话内 Lead + Workers 的共享任务 |
| 依赖关系 | 通常没有 | 原生 `blockedBy` DAG，实时算就绪/阻塞 |
| 生命周期 | 常驻，需要手动管理 | 有团队任务才出现，清空即消失 |
| 写入 | 自己写库 | 只读，一个字节都不写 |

## 功能

- **自动显隐**：根会话开启团队协作且出现任务时，自动在右侧栏打开；任务清空或关闭团队时自动关闭，不留空标签、不占位。
- **三列流转**：待处理 / 进行中 / 已完成，卡片随投影实时换列；`pending` 列区分「就绪」与「被依赖阻塞」。
- **依赖血缘**：卡片显示 `blockedBy` 前置任务与解锁关系，前置完成后阻塞态自动解除。
- **顶部概览**：完成进度条 + 分类统计 + 队友运行态（名册 `phase`、`useSessionStatus`、子会话运行态三路合一）。
- **标签角标**：标签页标题内嵌完成度圆环与计数，停留在文件树或浏览器标签时也能看到进度。
- **几何与主题**：`@container` 响应式适配 360px 窄栏 / 分栏 / 全屏 / 浮动窗；只用宿主 `--dsw-alias-*` token，Light / Dark 自动跟随；中英双语。
- **手动关闭防打扰**：你亲手关掉的看板不会因为下一次状态流转又弹回来。

## 视觉预览

仓库里的 [`prototype/team-kanban-prototype.html`](prototype/team-kanban-prototype.html) 是一个零依赖的离线原型（假数据 + 真实动效），直接用浏览器打开即可看到看板形态与动效，不需要安装插件。

## 安装

要求：DeepSeek Harness **0.2.2-rc.x 桌面端**（`desktop` profile）。

```bash
# 本地目录（开发中）
dsh plugin --profile desktop add /path/to/dsh-team-kanban

# npm（0.4.0 尚未发布，发布后可用）
dsh plugin --profile desktop add dsh-team-kanban

# git
dsh plugin --profile desktop add github:rongyishuaige7/dsh-team-kanban
```

也可以在 DSH 的插件管理里用 `install_bundle` 指向仓库目录。安装后重启桌面端，控制台里 `window.__teamKanbanRev` 应等于当前版本号。

### 从旧名迁移（0.4.0）

0.4.0 之前的包名是本地占位 `@local/dsh-client-ui-team-kanban`，标签类型是 `team-board`。升级时**先移除旧插件再装新包**——旧插件卸载时会顺手清掉已保存布局里残留的旧标签：

```bash
dsh plugin --profile desktop remove @local/dsh-client-ui-team-kanban
dsh plugin --profile desktop add /path/to/dsh-team-kanban
```

`dsh plugin` 只转发给 pnpm，**不会**清理 profile 自己的配置。装完请核对两处，否则同一份 `client.js` 会被注册两次，第二次注册会撞上宿主「tab type id already registered」并中断该实例的 watcher：

- `~/.dsh/profiles/desktop/package.json`
  - `dependencies` 与 `dsh.profile.bundles` 里都不应再有 `@local/dsh-client-ui-team-kanban`
- `~/.dsh/profiles/desktop/cordis.patch.yml`
  - 删掉 `# >>> 智能体任务板 (@local/dsh-client-ui-team-kanban) >>>` 到 `# <<< 智能体任务板 <<<` 那几行

然后 ⌘Q 完全退出 DSH（不是关窗口）再打开，确认 `window.__teamKanbanRev`。0.4.1 起，注册撞车会在控制台留下 `[team-kanban] could not register the sidebar tab type` 的警告，不再静默。

## 兼容性

| 宿主版本 | 状态 |
|---|---|
| `0.2.2-rc.3`（desktop） | 开发基线 |
| `0.2.1-alpha.4` 的 Team 结构（隐式根团队、名册、无 `ownerId`） | 读取路径已兼容（`normalizeTeam`），未实机验证 |
| 其他版本 | 未验证 |

`package.json` 声明 `engines.dsh: ">=0.2.2-rc.1 <0.3.0"`。宿主侧目前有一个已上报的缺陷会让桌面端收不到投影帧（[discussion #13416](https://github.com/deepseek-ai/deepseek-harness/discussions/13416)），排查过程见 [`docs/issues/`](docs/issues/)。

## 工作原理

```text
index.js                Host 侧空实现：不提供服务、不注册工具、不持久化
client.js               Client 侧 bundle：注册标签类型 team kind、标题、正文与观察器
  ├─ TeamKanbanWatcher  挂在 conversation.session.header.actions，按投影开/关标签
  ├─ TeamKanbanTitle    标签胶囊：图标 + 标题 + 完成度角标
  └─ TeamKanbanBoard    三列看板：概览、队友条、卡片、展开详情
```

- **数据**：`useProjection('agentTeam')` 是唯一事实源；队友名册与运行态来自 `agentTeam.members` / `subagentCatalog` / `useSessionStatus`。
- **统一入口**：三条来源（投影 face、会话列表快照、兜底拉取）都经 `newestTeam` → `normalizeTeam` 汇聚成一个值，看板与角标读同一份，不会互相落后。
- **兜底拉取**：因为上面那个宿主缺陷，watcher 按 `pullPlan` 有节奏地补拉——有人干活时 2.5s，有未完成任务但没人在跑时 10s。空闲或子会话不做周期轮询，但挂载和每轮结束时各做三次有界探测（0 / 1.2 / 3.6 秒），兜住「回合最后一秒才建出第一个任务、而投影帧根本没送到」的情况；宿主没装团队功能时探测一次就停。
- **样式**：`ctx.effect` 注入 `<style data-plugin="dsh-team-kanban">`，卸载时移除；所有类名走 `.tkb-*` 前缀，语言包走独立命名空间 `teamKanban`。

## 隐私与边界

- 不写会话、不调 `team_task_*`、不改团队开关，纯只读。
- 不读 `~/.dsh/sessions`，不发任何网络请求；唯一的宿主 RPC 是只读的 `ctx.remote.session.projections({ sessionId })`。
- 不 require 宿主的内部 UI 包（`dsh-client-ui-primitives`、`dsh-client-ui-agent-team` 等），只依赖公开的 slot / projection / locale / sidebarRight 契约。
- 唯一写入是浏览器内的 UI 状态（卡片展开、手动关闭标记）以及一条排障记录 `localStorage['team-kanban:diag.v1']`；两者都不含对话内容，也不离开本机。

## 开发

Node ≥ 20，无第三方依赖，无构建步骤——`client.js` 是手写的 `__ModuleLoader__` bundle。

```bash
npm run check   # node --check 两个入口
npm test        # node:test，30 项：纯函数、双结构渲染冒烟、清单一致性、旧标签清理、空闲探测、诊断记录
```

测试用假的 `__ModuleLoader__` 加载 `client.js`，用 hook 形状的 React 替身走完渲染路径，不需要浏览器或宿主。

```text
dsh-team-kanban/
├── client.js            # 浏览器侧全部实现（UI + watcher + 拉取兜底）
├── index.js             # Host 侧空实现
├── cordis.patch.yml     # 向 profile 注入插件行
├── locale/{zh,en}.json  # 插件市场元数据
├── test/                # node:test
├── prototype/           # 离线视觉原型
├── PRD.md / DESIGN.md   # 需求与技术设计（含宿主契约核实记录）
└── docs/                # 排查记录与宿主缺陷报告
```

## 排障

看板不出现时，先看 `localStorage['team-kanban:diag.v1']`（DevTools → Application → Local Storage，或插件报障时附上这一条）：

| `phase` | 含义 |
|---|---|
| 键不存在 | 客户端半根本没执行：宿主图里的行 id 与 `client.js` 注册的 id 不一致（常见于改名后旧包条目没清干净） |
| `apply` | 客户端模块跑起来了，但停在标签类型注册之前 |
| `registered` | 标签类型注册成功；看 `kind` 是否等于 `dsh-team-kanban.board` |
| `register-failed` | 宿主拒绝注册，`error` 通常含 `already registered`（同一份代码被注册两次） |
| `watch` | watcher 已在跑，`tasks` / `running` 是它当时的判断；`tasks: -1` 表示投影还没到 |
| `opened` / `open-failed` | 打开成功 / 9 秒内重试都失败，`error` 是最后一次的原因 |
| `pull-failed` / `unsupported` | 拉投影失败 / 宿主没有 `agentTeam` 投影 |

## 已知限制

- 桌面端投影帧不推送（宿主缺陷），实时性靠有界拉取兜底：回合中新建的任务最坏要等一个 10 秒慢周期，回合结束后建立的约 1–4 秒内出现。
- 只读：不能在界面里建任务、认领、改状态——这些仍走 `team_task_*` 与对话。
- 只在根会话显示，与官方顶部 `TeamBoard` 的范围一致。

## 路线图

- 等宿主修复投影推送后，删掉拉取兜底，回到纯事件驱动。
- 在只读看板稳定后，评估认领 / 完成等最小写操作。
- 补齐 `dsh.compatibility` 的实机验收矩阵。

## License

[MIT](LICENSE) © 2026 rongyishuaige7
