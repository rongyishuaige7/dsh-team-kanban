# 0.4.2 桌面端验收：T3 / T4

- **日期**：2026-11-15
- **宿主**：DeepSeek Harness `0.2.2-rc.3` 桌面端（macOS arm64，`desktop` profile）
- **插件**：`dsh-team-kanban@0.4.2`，以 `link:` 方式安装
- **操作者**：仓库作者，在本机桌面端手动执行
- **关联**：验收矩阵见 [`DESIGN.md` §8.1](../../DESIGN.md)；迁移步骤见 [`README.md`](../../README.md)

---

## 1. 前置：先修掉“插件根本没加载”

0.4.2 之前，团队任务建出来后看板始终不出现，且没有任何报错。根因不在看板逻辑：

- profile 里同时保留了改名前的 `@local/dsh-client-ui-team-kanban` 与改名后的 `dsh-team-kanban` 两条 bundle；
- 宿主按**旧行 id** 去取 `client.js`，而改名后的文件注册的是 `dsh-team-kanban`；
- `dsh-client-modules` 只认「文件注册 id === 宿主图行 id」（`system.ts` 的 `factories.has(id)`），于是该条目被记为 `loaded without registering`，插件从未 apply。

清理 profile 的三处旧引用后（`dependencies`、`dsh.profile.bundles`、`cordis.patch.yml` 的旧 insert 块），0.4.2 正常加载。细节见 [`CHANGELOG.md`](../../CHANGELOG.md) 的 0.4.2 段落。

## 2. T3：建任务后全部删空，看板自动关闭

**步骤**

1. 根会话开启团队协作，确认右侧栏没有「任务板」标签。
2. 只让 Lead 建两个占位任务，`task-2` 的 `blocked_by` 指向 `task-1`，不派发、不执行。
3. 观察看板出现后，用 `team_task_update` 的 `delete` 先删 `task-2`、再删 `task-1`（被依赖的任务必须先删下游）。

**结果：通过**

- 任务建出后，看板自动出现在右侧栏，两张卡片分别在「待处理」，`task-2` 标记为阻塞。
- 两个任务删空后，标签自动关闭；作为唯一标签时右侧栏随之收起。

**旁证**：渲染器存储里出现 `dsh-team-kanban.board` 标签记录，说明标签确实由本插件创建，而不是用户手动打开。

## 3. T4：任务流转时角标与看板同步

**步骤**

1. 建三个任务，其中 `task-2` 依赖 `task-1`。
2. 派一个 continuable 子智能体认领并完成 `task-1`。
3. 继续让同一个子智能体认领 `task-2`。

**结果：通过**

- `task-1` 从「待处理」进入「进行中」，负责人显示为队友名字，顶部队友条显示运行中。
- 完成 `task-1` 后，`task-2` 从「阻塞」转为「就绪」，可被认领。
- 标签角标与看板顶部进度同步递增，未出现其中一个停滞的情况。

## 4. 本次未覆盖

| 编号 | 场景 | 状态 |
|---|---|---|
| T1 | 插件列表元数据（标题、描述、图标） | 待补 |
| T2 | 关闭团队协作后不占位 | 待补 |
| T5 | Light / Dark、360px 窄栏、全屏、浮动窗 | 待补 |
| T6 | 手动关闭后不被状态流转反复弹开 | 待补 |
| — | `0.2.1-alpha.4` 的 Team 结构 | 仅单测覆盖，未实机 |

T5、T6 是发布前最值得补的两项：前者覆盖纯视觉回归，后者覆盖 `dismissedSessions` 状态机。
