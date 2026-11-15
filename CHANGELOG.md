# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.4.3] - 2026-11-15

发布收尾：把已经验证过的宿主版本写进清单，并把验收结果入库。功能与 0.4.2 一致。

### Added

- `dsh.compatibility.dshReleases`：`0.2.2-rc.3` 标记为 `compatible`，附注已验收 T3/T4、T1/T2/T5/T6 待补。
- [`docs/records/2026-11-15-acceptance-t3-t4.md`](docs/records/2026-11-15-acceptance-t3-t4.md)：0.4.2 的桌面端验收记录，含「插件没加载」的根因摘要与旁证。

### Changed

- README 兼容表从「开发基线」改为「已验证：T3/T4」，路线图改为补齐 T1/T2/T5/T6。

## [0.4.2] - 2026-11-15

把「插件根本没加载」这一层失败变成可读的证据。

### Added

- `localStorage` 诊断记录 `team-kanban:diag.v1`：apply、标签类型注册、watcher 决策、打开成功/失败、拉取失败、宿主不支持，各写一条 `{ rev, phase, sessionId, error }`。没有 DevTools 也能看出卡在哪一步；对 bug report 也直接可用。
- 测试 30 项。

### Fixed

- 文档补上这次事故的完整因果：profile 里同时留着旧名 `@local/dsh-client-ui-team-kanban` 和新名 `dsh-team-kanban` 两条 bundle 时，宿主按**旧行 id** 去取 `client.js`，而改名后的文件注册的是 `dsh-team-kanban`。`dsh-client-modules` 只认「文件注册 id === 图行 id」（`system.ts:205-236`），于是该条目记为 `loaded without registering` 并静默失败——没有 watcher、没有标签、没有报错弹窗。

## [0.4.1] - 2026-11-15

修复「任务已经建好、看板却一直不出现」的一类静默失败。

### Fixed

- **空闲探测**：`plan === 'off'` 且会话不运行时，挂载或回合结束都会在 0 / 1.2 / 3.6 秒各拉一次宿主投影，再完全静默。原先只靠 `running` 1→0 的那一次收尾拉取，组件一旦重挂载（切换会话、header 重渲染）`wasRunning` ref 归零，收尾拉取就不会发生，而在投影帧不送达的宿主上没有任何其他途径能看见新任务。
- **打开重试**：`openTabIn` 失败后的重试从 3 次（1.2 秒）扩到 6 次（约 9 秒，覆盖一个 `slow` 周期）；中间的重试不再收起刚展开的右栏，避免闪动；最后一次失败在控制台留下 `gave up opening the board`。
- **注册撞车不再拖垮整个 bundle**：`sidebarRightTabs.register` 现在被 `try/catch` 包住。同一份 `client.js` 被两个 bundle 条目注册时，宿主会抛 `tab type id ... already registered`，原先这一行会中断 `apply()`，导致 title / body / watcher 的 slot 全都没注入。
- **失败不再静默**：拉取失败、宿主没有 `agentTeam` 投影、标签类型注册失败，都会打一条 `[team-kanban]` 开头的 `console.warn`。

### Added

- 测试增至 29 项：空闲挂载的探测与随后自动打开、警告只报一次。

## [0.4.0] - 2026-11-15

更名与开源工程化。功能与 0.3.1 一致。

### Changed

- 包名由本地占位 `@local/dsh-client-ui-team-kanban` 改为 `dsh-team-kanban`，去掉 `private`，补齐 `description` / `keywords` / `repository` / `homepage` / `bugs` / `license` / `engines`。
- 右侧栏标签类型由 `team-board` 改为 `dsh-team-kanban.board`（宿主把 kind 拼成 `sidebar://<kind>`，命名空间化避免与官方未来页面撞名）。
- `.agents/hooks.json` 不再纳入版本控制：它带着本机绝对路径，只属于开发者的本地环境。
- 升级时自动关掉 0.3.x 留在已保存布局里的 `team-board` 旧标签，再按新 kind 重新打开，不会留下一块空白页。

### Added

- `README.md`、`LICENSE`（MIT）、`CHANGELOG.md`。
- GitHub Actions：Node 20 / 22 上跑 `npm run check` 与 `npm test`。
- `test/manifest.test.mjs`：钉住包名、loader id、`cordis.patch.yml`、版本号与 kind 五处拼写，改名漏一处会直接测试失败。

### Migration

先移除旧插件（它的卸载钩子会清掉已保存布局里的旧标签），再安装新包：

```bash
dsh plugin --profile desktop remove @local/dsh-client-ui-team-kanban
dsh plugin --profile desktop add /path/to/dsh-team-kanban
```

## [0.3.1] - 2026-11-15

### Fixed

- 同时读懂两代宿主结构：新增 `normalizeTeam()`，缺 `enabled` 时按「有任务或有队友」推断，缺 `ownerId` 时按名字查名册，主智能体显示为本地化的「主智能体」。
- 不再卡在旧数据上：选值改为先比共有任务的 `revision`，比不出来时取最晚第一次看到的值；删除任务、全部清空、切换开关、出现 `failure` 都能正确反映。
- 标签角标与看板改读同一个值，角标不再冻结。
- 拉取节奏：有人在跑 2.5s，有未完成任务但无人运行 10s，会话在跑但还没有任务时 10s 探测，空闲 / 子会话 / 宿主无团队功能完全不拉，每轮结束补拉一次。

### Added

- `node:test` 测试套件（零依赖，22 项），含两种投影结构各渲染一次的冒烟测试。

## [0.3.0] - 2026-11-15

### Added

- 活体 UI：空间景深微物理、极光流光、心跳呼吸、双层声呐雷达、完成庆典等动效体系。
- 标签胶囊进度圆环与计数动画。

### Changed

- 移除 0.2.x 的诊断埋点。

## [0.2.0] - 2026-11-15

### Fixed

- 打开右侧栏时先展开轨道再 `openTabIn`，消除「标签在 store、列不滑出」的时序竞态。
- 使用官方关闭处理器，区分用户关闭与插件自关闭，修复误判为「已手动关闭」。
- 显式声明 `remote.session`，让兜底拉取能真正到达宿主。

### Added

- 有界投影拉取：在宿主不推送投影帧的版本上兜底刷新（[宿主讨论 #13416](https://github.com/deepseek-ai/deepseek-harness/discussions/13416)）。

## [0.1.0]

### Added

- 首个只读看板：右侧栏三列、任务自动显隐、依赖与负责人展示、中英双语与主题适配。
