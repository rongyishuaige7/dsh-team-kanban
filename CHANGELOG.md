# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.4.0] - 2026-11-15

更名与开源工程化。功能与 0.3.1 一致。

### Changed

- 包名由本地占位 `@local/dsh-client-ui-team-kanban` 改为 `dsh-team-kanban`，去掉 `private`，补齐 `description` / `keywords` / `repository` / `homepage` / `bugs` / `license` / `engines`。
- 右侧栏标签类型由 `team-board` 改为 `dsh-team-kanban.board`（宿主把 kind 拼成 `sidebar://<kind>`，命名空间化避免与官方未来页面撞名）。
- `.agents/hooks.json` 不再纳入版本控制：它带着本机绝对路径，只属于开发者的本地环境。

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
