# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.5.7] - 2026-11-17

窄栏空间效率重构、卡面关键路径与写冲突信号外露、丝滑 Grid 抽屉与同首字队友消歧、正式版 `client.js` 补齐轻量 FLIP 飞行与宽屏贝塞尔血缘连线。

### Fixed

- **修复 `client.js` 停用团队控件脱离 `.tkb-head` 的层级错位**：修正渲染树括号闭合层级，使 `.tkb-team` 严格内嵌于顶部 `.tkb-head` 右侧，补充左侧视觉分割线与弹层打开时的「取消」按钮焦点自动移入，并在单测中锁死父子结构。
- **统一 `0fr → 1fr` Grid 抽屉并修复原型永久展开缺陷**：`client.js` 与原型统一采用 `.tkb-card__detail` + `.tkb-card__detail-clip` 平滑高度过渡与折叠态焦点隔离，修复原型中已完成卡片无法退化为紧凑单行胶囊及 `≥820px` 下描述文案重复渲染两遍的问题。
- **补齐原型视觉节点与边界细节**：补齐原型缺失的就绪/阻塞徽章（`.tkb-badge`）、队友运行状态点（`.tkb-mate__dot`）与活跃脉冲点（`.tkb-card__live-dot`）；消除无就绪任务时 `pending` 列顶部的孤立链条分隔线；修复标签栏关闭图标粘连与数字滚轮裁切。

### Added

- **窄栏（`<540px`）空列自动静默与泳道折叠**：窄栏单列模式下空泳道自动隐藏虚线占位框并压缩为 30px 摘要行；非空泳道支持点击或键盘折叠/展开，跨卡跳转时自动展开目标泳道。
- **卡面关键瓶颈与写冲突微标外露**：未展开卡片直接透出下游阻塞计数胶囊（`.tkb-unlocks`，`↘ N`）、写入范围冲突预警图标（`.tkb-conflict`）与悬停折叠箭头提示（`.tkb-card__chev`）。
- **队友同首字消歧、异常态可视化与窄屏锁定展开**：新增 `disambiguateMonos()` 自动将重名首字消歧为双字符（如 `W1/W2`、`SA/SB`、`探甲/探乙`）；消费名册 `phase === 'failed' | 'provisioning'` 渲染红环/启动脉冲并透出失败原因；`<820px` 下点击锁定队友时动态展开其姓名胶囊。
- **正式版 `client.js` 轻量 FLIP 位移与宽屏贝塞尔血缘连线**：基于 `useLayoutEffect` + `.tkb-flights` 实现跨列抛物线飞行与同列平滑补位，并在 `≥540px` 三列模式下绘制带描边动画的 `.tkb-wires` 贝塞尔上下游血缘曲线。
- **浅色微凹槽质感与单测扩充**：严守宿主 26 项 Token 白名单强化进度条轨道、计数胶囊与引用按钮边界质感；测试套件扩充至 43 项。

## [0.5.6] - 2026-11-16

修正宿主圆角 Token 真值与纯白缩写、危险按钮恢复破坏性文字色（双模 WCAG AA）、引入真实对比度数学计算守卫、补齐原型停用弹层 Mock 交互与全双工 100% 规则对齐。

### Fixed

- **宿主 Radius Token 修正为真实值**：
  - 从 `dsh-client-ui-theme/src/styles/base.css` 校验确认宿主真实圆角为 `--dsw-radius-sm: 8px; --dsw-radius-md: 12px;`（修正此前 6px / 10px 录入偏差）。
  - `HOST_FIXTURE` 与原型 mock 统一采用宿主原样的 `#fff` 简写与 8px / 12px 圆角值，卡片与停用弹层完全贴合宿主原生曲率。
- **危险按钮恢复破坏性文字语义且双模达标 WCAG AA**：
  - 针对 0.5.5 幽灵红边配黑/白字破坏性意图偏弱的问题，文字改用 `color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, var(--dsw-alias-label-primary))`。
  - 数学实测对比度：浅色对纯白底达到 **5.77:1**，暗色对 `#2c2c2e` 弹层底达到 **4.95:1**，双模均稳定跨越 WCAG AA 4.5:1 门槛，同时维持鲜明醒目的红色破坏警示语义。

### Added

- **真实 WCAG 对比度数学计算断言守卫**：
  - 测试套件新增基于 sRGB 线性相对亮度公式的数学检验函数，杜绝靠正则断言字符串的漏洞。
  - 断言危险按钮文字（浅色 5.77:1、暗色 4.95:1）、就绪徽章（5.31:1）、阻塞徽章（5.58:1）均超过 WCAG AA（4.5:1），完成勾圈超过图形对比度（3.35:1 ≥ 3.0:1）。
- **原型补齐停用弹层（Disarm Team Pop）Mock 预览与交互**：
  - `prototype/team-kanban-prototype.html` 中补齐 `.tkb-team` 结构（包含按钮与停用确认弹层 `.tkb-team__pop`），支持中英双语切换与弹层外点击收起。
  - 工具栏新增「停用弹层」快捷预览按钮，彻底解决此前停用弹层仅在代码中而无原型可视产物的缺口。
- **全双工 100% 规则覆盖与防脆弱断言**：
  - 原型全面集成 `.tkb-team*` 21 条样式规则，client 与原型共享规则提升至 201 条，单边差集为 0 条（除原型专属的 4 条翻页微动效规则外）。
  - 断言放宽硬编码等值判断，改用严格下界检验（`>= 180`），保留双向无未登记规则的核心防漂移防护。

## [0.5.5] - 2026-11-16

修复暗色危险按钮对比度、完成段真正有效形状通道、完善双向规则同构与出处防漂移守卫。

### Fixed

- **危险确认按钮改用高对比描边样式**：
  - 剔除实心红底白字设计（暗色下 `#f25a5a` 白字仅 3.29:1），改用宿主推荐的幽灵描边危险按钮：透明底 + 红色边框（`border: 1px solid var(--dsw-alias-state-error-primary)`）+ 文字使用 `--dsw-alias-label-primary`。
  - 文本对比度在浅色下达 **19.5:1**，暗色下达 **15.8:1**（双模均远超 WCAG AAA 7:1 极值要求），悬停时叠加 12% 红色微背景。
- **完成段改用 4px 几何形状通道**：
  - 替换不可辨的 `1.31:1` 内描边阴影，完成段 `.tkb-slot[data-s="done"] .tkb-slot__bar` 高度收敛为 `4px` 紧凑微带（槽位 6px 满高内垂直居中）。
  - 与进行中 6px 满高能量胶囊形成决定性几何反差，真正实现不依赖色相与明度的非颜色通道无障碍辨识。
- **细节对齐与冗余清理**：
  - 原型 favicon 品牌色图标替换为官方科技蓝 `%234176e6`。
  - 清除 `client.js` 中已无调用者的 `--dsw-alias-label-primary-inverted` 冗余白名单项。
  - 测试裸色关键字检测表扩充，覆盖 `orange/purple/violet/yellow/gray/grey`。

### Added

- **双向规则同构与白名单严密防护**：
  - 规则解析器扩展至 `@container` 与 `@media` 嵌套规则体，实测精确覆盖 180 条共享规则（156 条顶层规则 + 24 条响应式规则体），双向一致性 100%。
  - 设立显式 `CLIENT_ONLY_SELECTORS` 白名单（21 条团队控制与响应式规则）及 `PROTO_ONLY_SELECTORS`（4 条翻页动效规则），杜绝 client 或原型侧任何未登记的单向漂移。
- **宿主 Fixture 出处固化与版本绑定**：
  - 明确标注 fixture 来源（`DeepSeek Harness 0.2.2-rc.3 · app.asar · lib/welcome/design-platform.css`）与提取日期，固化每套 26 项 tokens（24 alias + 2 radius）。
  - 测试断言直接绑定 `package.json` 的 `dshReleases['0.2.2-rc.3'] === 'compatible'`，使宿主升级与 token 漂移强关联且即时告警。

## [0.5.4] - 2026-11-16

彻底对齐 DSH 宿主真实设计系统变量，加固防漂移测试体系，补齐暗色模式与色觉障碍非颜色通道区分，消除所有裸色关键字。

### Fixed

- **宿主 Alias Token 彻底对齐与防漂移守护**：
  - 从 DeepSeek Harness 官方安装包直接提取 24 项核心 `--dsw-alias-*` token 静态真值，作为 `HOST_FIXTURE` 固化于测试套件。
  - 原型 mock token 全面修正 26 处与宿主不一致的值（浅色 `bg-layer-1/2` 纯白、暗色三级文本与 idle 修正、浅暗模式边框透明度精准对齐）。
  - 彻底清除原型 mock 终端中残留的旧版紫罗兰色 `--dsw-alias-state-done-primary`。
- **暗色模式与色觉障碍非颜色通道区分**：
  - 针对暗色下 `#22c55e`（完成段）与 `#7aaaff`（进行中段）明度通道重叠（1.45:1）的问题，为完成段 `.tkb-slot[data-s="done"] .tkb-slot__bar` 新增 `inset 0 0 0 1px` 内描边高光微质感，不依赖纯色调即可在任何色觉条件下即时分辨。
- **浅色模式关键图形对比度达标（≥ 3:1）**：
  - 完成卡勾选图标（`.tkb-glyph--completed`）圆底压深为 `color-mix(in srgb, var(--tkb-c-done) 80%, var(--dsw-alias-label-primary))`（`#1ea14f`），内层白勾与圆底达到 3.35:1，外层圆底对白底达到 3.27:1，双向越过 3:1 门槛。
  - 标签页进度环（`.tkb-title__arc`）进度阶段默认采用科技蓝 `--tkb-c-active`（对底对比度超 4.5:1），仅在全部任务达成（`data-done`）时平滑过渡为成功绿 `--tkb-c-done`，解决未完成时 1.8px 细绿弧低对比度与语义早熟。
- **消除裸色关键字与高危暗色按钮对比度**：
  - 能量轨流光渐变移除裸 `white` 关键字，改用宿主高对比语义 token `var(--dsw-alias-label-on-color)`。
  - 停用团队协作危险确认按钮（`.tkb-team__danger`）文本从 `label-primary-inverted`（暗色下仅 3.68:1）切换至 `var(--dsw-alias-label-on-color)`，暗色下对红底保持 4.54:1，光亮模式下保持 4.79:1（均达 WCAG AA 文本标准）。
  - 完成卡（`.tkb-card[data-status="completed"]`）浅色边界强化：背景填充微调为 60%，边框切入 `color-mix(in srgb, var(--dsw-alias-border-l2) 40%, transparent)`，避免在纯白宿主底色上边界隐形。

### Added

- **宿主 Fixture 一致性测试**：在 `test/render.test.mjs` 中新增断言，强制验证原型浅暗双模 mock token 与宿主真实 fixture 100% 吻合，杜绝人工同步漂移。
- **原型 ≡ client 规则体深度同构校验**：基于 AST 深度块解析引擎，校验并断言所有 160+ 项共享 `.tkb-*` 规则体完全一致，并在测试中加固裸色/裸函数（`#hex`, `rgba()`, `hsla()`, `white/black`）与语义防塌缩守卫。测试套件增至 38 项。

## [0.5.3] - 2026-11-16

修复 0.5.2 语义色塌缩、对比度不达标、进度条热区过小与原型偏差问题，补齐 CSS 静态测试保护。

### Fixed

- **语义色恢复与完成态对齐**：
  - 进度条完成段（`[data-s="done"]`）恢复为 `--tkb-c-done` 翠绿填充，扫视一眼即可清晰辨识完成比例，不再与 active 蓝段混淆。
  - 完成卡勾选图标恢复 `--tkb-c-done`，并为小圆圈补充 `color-mix(done 60%, label-primary)` 边界描边，确保在浅色背景下非文本图形对比度 ≥ 3:1。
  - 标签页标题内嵌进度环（`TeamKanbanTitle` 的 `.tkb-title__arc` 与 `.tkb-title__check`）改用 `--tkb-c-done`，彻底清除残留的紫罗兰色 `--dsw-alias-state-done-primary`。
- **浅色主题对比度达标（WCAG AA 4.5:1）**：
  - 完成卡片移除整卡 `opacity: .80`，改为仅弱化背景与边框，标题使用 `label-secondary`，实测对比度从 2.65:1 升至 5.5:1。
  - 就绪徽章（`[data-kind="ready"]`）文本改用 `color-mix(active 75%, label-primary)`，在浅蓝底色上对比度从 3.6:1 升至 5.01:1。
  - 阻塞徽章（`[data-kind="blocked"]`）与依赖链接（`.tkb-dep`）文本改用 `color-mix(warn-label 60%, label-primary)`，在浅橙底色上对比度从 2.58:1 升至 5.21:1。
  - 队长头像首字母改用 `color-mix(business 70%, label-primary)`，对比度从 3.67:1 升至 5.5:1。
- **进度条交互热区达标（WCAG 2.5.8）**：
  - 通过 `.tkb-slot::before` 透明热区将垂直可点击/hover 高度扩展至 24px，视觉上保持 10px 微型胶囊不变，兼顾紧凑美观与点击可用性。
- **高光与 Token 纯净度**：
  - 能量轨流光改用 `color-mix(in srgb, var(--tkb-c-active) 35%, white)`，暗色主题下保持高亮微光，消除使用 `label-primary-inverted` 导致的“暗缝”语义翻转。
  - 移除所有裸 `#fff` 回退值，生产 CSS 实现零裸色值。
  - 移除声明未使用的 `--tkb-d4` 与无效选择器。
- **原型与真实环境完全对齐**：
  - 补全原型进度条中缺失的 `.tkb-slot__bar` 生成逻辑，使进度条在原型中立即可见。
  - 原型 mock token 全面对齐 DSH 宿主真实设计系统数值。
  - 同步 14 项卡片与状态样式规则，移除已废弃的「✨ 极光庆典」按钮。

### Added

- **CSS 静态测试保护**：在 `test/render.test.mjs` 中新增静态代码保护断言（包含 `--dsw-alias-*` 宿主白名单检查、裸色值检测、完成段颜色防塌缩校验、零孤儿 `@keyframes` 校验），测试套件增至 36 项。

## [0.5.2] - 2026-11-15

重构看板视觉设计系统，全面切入 DeepSeek Harness 客户端官方默认科技蓝与原生微物理质感。

### Changed

- **全面回归 DSH 官方科技蓝与原生质感**：
  - 基准主色锁定为宿主官方设计系统变量 `--dsw-alias-state-business-primary`（DeepSeek 科技蓝，明亮模式 `#4176e6` / 暗色模式 `#7aaaff`），浅色状态底锁定为 `--dsw-alias-state-business-tertiary`（`#e4edfd` / `#34415b`）。
  - 任务完成态剔除突兀的紫罗兰色（`--dsw-alias-state-done-primary`），统一采用宿主原生成功绿 `--dsw-alias-state-success-primary`（`#22c55e`），在全达成场景下计数器点亮科技蓝。
  - 顶部进度条与卡片状态全面统一为 10px / 6px 原生微胶囊设计，槽位交互自然紧凑。
  - 依赖就绪徽章（`data-kind="ready"`）与血缘高亮链路（`.tkb-root[data-lineage]`）全面切入科技蓝与浅色底，清除过度发光的 `radial-gradient`。
- **动效体系降噪与第一方克制美学**：
  - 彻底剔除全达成极光扫光庆典（`tkb-aurora-sweep`）、算力心跳呼吸（`tkb-hearth-breathe`）、头像 360° 旋转圈与卡片 45° 扫光线等过度视觉装饰，避免喧宾夺主。
  - 完整保留具有清晰状态语义的 6px 运行中能量轨（Live Micro-rail）、声呐微脉冲、血缘链路连线与聚焦矩阵。
- **原型同步更新**：[`prototype/team-kanban-prototype.html`](prototype/team-kanban-prototype.html) 全面同步新版科技蓝配色与动效降噪规范。

## [0.5.1] - 2026-11-15

修复 0.5.0 停用团队协作在宿主上的假成功与未刷新缺陷。

### Fixed

- **停用失败严格校验返回值**：宿主远程方法 `setEnabled` 失败时返回 `{ ok: false, error }` 而不抛异常。现在检查 `result.ok === true`，非 true 时保留宿主错误码并抛出宿主错误信息，不再被误当成成功关闭弹层。
- **停用成功后主动触发 settle 探测**：停用成功后触发 `requestSettle(sessionId)`，驱动 watcher 运行一轮 0 / 1.2 / 3.6 秒探测。解决任务全部完成的空闲看板在停用后因 `plan === 'off'` 不再拉取、导致看板无法自动关闭的问题；watcher 处于失败暂停态时收到通知也会重新激活。
- **缺失服务精准匹配**：未提供服务时抛出附带 `NO_TEAM_CONTROL` 的专门错误，界面仅认此标记展示 `team.unavailable`（中文显示「当前宿主没有提供团队控制接口」），宿主其他带 `unavailable` 的业务错误不再被误伤隐藏。
- **诊断日志补全**：停用成功或失败均记录至 `team-kanban:diag.v1`（`phase: 'team-disabled'` / `'team-disable-failed'`），实机验收时可直接排查。
- **按钮样式规范**：危险按钮文字色改用 `var(--dsw-alias-label-primary-inverted, #fff)`，消除硬编码白色。
- **清单测试解耦**：`test/manifest.test.mjs` 改为正则校验版本号格式，避免发版时硬编码版本导致单测失败。

### Added

- 测试增至 35 项：覆盖停用失败返回 `{ ok: false }` 的错误拦截、诊断记录沉淀，以及加固时序后能够真实守护 `requestSettle` 的空闲看板停用自动关闭测试。

## [0.5.0] - 2026-11-15

看板从「只能看」变成「能收口」：新增停用团队协作的入口。

### Added

- header 右侧「团队」按钮：点击弹板内确认，确认后调用宿主唯一暴露的团队远程方法 `agentTeams.setEnabled(sessionId, false)`。成功后投影变为 `enabled:false`，watcher 按既有 T2 语义关闭标签，不新增分支。
- 失败就地显示（`team.failed`），不吞错、不弹宿主级弹窗；宿主没有该服务时按钮仍可见，点击会提示 `team.unavailable`。
- 服务通过 `ctx.inject(['remote', 'remote.agentTeams'])` 子插件注入：宿主不带 Agent Teams 时 bundle 照常加载，只是控件不可用。
- 测试增至 33 项：按钮渲染、停用调用、缺少服务时的报错。

### Changed

- 「纯只读」的表述统一改为「除停用团队外只读」；README 的对比表、隐私边界与 PRD §2.2 同步。

## [0.4.3] - 2026-11-15

发布收尾：把已经验证过的宿主版本写进清单，并把验收结果入库。功能与 0.4.2 一致。

### Added

- `dsh.compatibility.dshReleases`：`0.2.2-rc.3` 标记为 `compatible`，附注已验收 T3/T4、T1/T2/T5/T6 待补。
- [`docs/records/2026-11-15-acceptance-t3-t4.md`](docs/records/2026-11-15-acceptance-t3-t4.md)：0.4.2 的桌面端验收记录，含「插件没加载」的根因摘要与旁证。

### Changed

- README 兼容表从「开发基线」改为「已验证：T3/T4」，路线图改为补齐 T1/T2/T5/T6。
- README 增加 `docs/assets/board.png`：DSH 0.2.2-rc.3 桌面端的真实截图。

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
