# dsh-team-kanban v0.6.0 产品宣传片设计规范（DESIGN_SPEC）

- **工程目录**：`media/launch-v6/`（独立于 `launch-v5`，严守已生成媒体资产零覆盖铁律）
- **创作模式**：`自主自由创作` + 用户拍板的融合视觉方向（**「光学白瓷校准台」主骨架 + 「15° 晨昏扫掠与 360px 窄栏微弧/离席追帧」 + 「暗室关键路径翡翠星图峰值」 + 「发布会全家福收尾」**）
- **画幅 / 帧率 / 时长**：`1920 × 1080` · `30 fps` · `1124 帧`（`37.47s`，对齐 `122.0141 BPM` 节拍网格第 `0`–`76` 拍，含实测输出音轨补偿 `OUTPUT_AUDIO_OFFSET_SEC = 0.0427s`）
- **双版本同源交付**：
  - 带 BGM 主版：`docs/assets/kanban-launch-v6.mp4`（`inputProps: { bgm: true }`）
  - 纯物理拟音无 BGM 版：`docs/assets/kanban-launch-v6-nobgm.mp4`（`--props=props-nobgm.json`，`{ bgm: false }`，画面与 SFX 逐帧 100% 一致）

---

## 阶段 0：产品简报与执行约束

### 0.1 产品定位与 v0.6.0 核心卖点
- **产品名称**：`dsh-team-kanban`（`v0.6.0`）
- **宿主与形态**：DeepSeek Harness（`0.2.2-rc.x` 桌面端）右侧栏原生多智能体任务看板插件。
- **核心价值主张**：把宿主原生的 `agentTeam` 投影（`blockedBy` DAG）化作右侧栏的精密遥测与因果接力台——前置收口即刻发射翡翠因果曲线解锁下游，切走再切回自动浮现离席追帧，阻塞冲突一键复制协调指令，全员收口一键点亮关键路径星图与战报。

### 0.2 必须展示的核心功能（v0.6.0 全量对齐，零虚构宣称）
1. **F-PrecisionTelemetry（精密遥测顶栏 + 双层内斜切能量轨卡片）**：垂直机械字轮（`.tkb-score__done`）、`45°` 斜纹阻塞槽/空心就绪槽/完成微带校准进度条（`.tkb-strip`）、`3px` 内缩圆角能量轨（`.tkb-card__rail`）。
2. **F-ConflictSteer（写冲突对端联动高亮 + 一键复制协调指令）**：悬停 `⚠` 写冲突徽章联动高亮冲突对端卡片（`is-conflict-pair` 琥珀虚线框），展开 `0fr→1fr` 抽屉直出可复制 `.tkb-scope` 路径与 `.tkb-nudge__btn`（「复制协调指令」→ 翡翠 `✓ 已复制`）。
3. **F-LiveRelayFlip（运行停滞嗅探 + 完工翡翠因果接力 + 解扣脉冲 + 倾角 FLIP）**：空闲超时透出 `待确认`（`.tkb-stall`）；前置任务落入已完成时自动发射 `920ms` 翡翠贝塞尔脉冲（`tkb-wire--relay`），触发下游 `640ms` 解扣光环（`is-unlocked`）与 `±1.25°` 迎风倾角跨列 FLIP 落位回弹。
4. **F-NarrowArcsCatchup（`360px` 窄侧栏左侧垂直微弧血缘 + 离席追帧胶囊 + 深浅同构）**：`360px` 窄侧栏保留左侧留白槽垂直 C 形微弧血缘（不再仅限宽屏）与空列静默折叠；宽屏顶栏展示 `.tkb-catchup` 离席追帧摘要；`--dsw-alias-*` 驱动 Light / Dark 逐像素同构。
5. **F-ConstellationDisarm（全员收口战报 + 1.5s 关键路径翡翠星图回放 + 一键零残留停用）**：`6/6` 收口滑出 `.tkb-debrief` 战报条，点击「星图」点亮 `data-constellation` 翡翠关键路径主干（`#1 → #3 → #4 → #6`），随后点击「团队 → 停用」保留历史任务并干净关闭看板。

### 0.3 数据安全与合规口径（D1–D5）
- 全部 `@2x/@3x/@4x` 截图与 `4×` 慢放实机流转视频均采自仓库内开源零依赖原型 `prototype/team-kanban-prototype.html` 的公开脱敏演示任务（`#1`–`#6`），零客户数据、零个人信息、零私钥或私有路径。

---

## 阶段 1：视觉方向、品牌 Tokens 与动效性格

### 1.1 光学白瓷 × 暗室星图双舞台色板（严格源自 `--dsw-alias-*`）
- **白瓷主舞台（Optical Porcelain，用于 S1 / S2 / C1 / S3 / C2 / S6）**：`#F5F8FD → #EDF2FB → #E3EBF7` + `1.8%` 银盐微噪点 + 桌面地平线漫反射暗影。
- **暗室光纤舞台（Darkroom Fiber-Optic，用于 S4 晨昏扫掠后半段 → 无缝衔接 S5 星图高潮）**：`#101420 → #0B0E17 → #070910`，面板 `#151517` / 卡片 `#212123`，实现 S4 → S5 跨镜头 `ΔLuma ≈ 0` 零闪白接缝。
- **三支高纯度语义光色**：
  - 科技蓝 `#4176E6`（深色 `#7AAAFF`）：运行能量轨、输入脉冲与主品牌识别
  - 翡翠绿 `#22C55E`（浅底文字 `#15803D`）：完工因果接力曲线、解扣光环、已复制态与星图关键路径主干
  - 琥珀 `#DD8629` / 朱砂 `#EC1313`：写冲突对端虚线联动、`待确认` 停滞徽章与防误触停用确认
- **字号硬底线（Q11）**：叙事字幕固定 `60px`（`≥56px`），辅助副标 / 阶段签 / CLI 命令固定 `32px–36px`（`≥32px`）。

### 1.2 动效性格与魔鬼细节门禁
- **3D 文字 4x 锐度（Q2）**：`PageCam` 布局级 CSS `zoom` + `@4x` 原生切片叠化，零 `transform: scale` 糊字。
- **光效圆角内裁切与单主角克制（Q4）**：严禁群发卡片闪烁，扫描光束与星图辉光严格裁进圆角边界。
- **卡拍不震屏（R4）**：全画面冲击仅 2 处（`b8` 开灯、`b64` 终章 Drop，间隔 `56` 拍），其余拍点全部落在组件内部机械动作。
- **手引眼 `2f` 提前量 + 屏幕恒定 `38px` 指针**：指针沿 `12%` 法向微弓弧先行，点击配 `0.88x` 微压与单圈波纹。

---

## 阶段 2：功能到镜头卡映射（Gallery 索引 + 准确 Demo TSX）

| 镜头 ID | 展示功能 | Gallery 卡名 | `style-key` | 参考文档与 Demo TSX |
|---|---|---|---|---|
| `s1_open` | 品牌校准立名 (`v0.6.0`) | `brand-ink-open` | `brand-ink-open` | `references/shots/opening/brand-ink-open.md` · `BrandInkOpen.tsx` |
| `s2_hero` | F-PrecisionTelemetry + F-ConflictSteer | `spotlight-hero-card` | `spotlight-hero-card` | `references/shots/opening/spotlight-hero-card.md` · `SpotlightHeroCard.tsx` |
| `c1_title` | 章节呼吸路标 ①（`920ms` 因果接力） | `paper-title-card` | `paper-title-card` | `references/shots/typography/paper-title-card.md` · `PaperTitleCard.tsx` |
| `s3_flow` | F-LiveRelayFlip（字轮+停滞徽章+翡翠接力+倾角 FLIP+战报展开） | `depth-layer-moves` | `multiplane` | `references/shots/camera/depth-layer-moves.md` · `MultiplaneReal.tsx` |
| `c2_title` | 章节呼吸路标 ②（`360px` 窄栏微弧与追帧） | `paper-title-card` | `paper-title-card` | `references/shots/typography/paper-title-card.md` · `PaperTitleCard.tsx` |
| `s4_theme` | F-NarrowArcsCatchup（`15°` 晨昏扫入暗室 + `360px` 左侧微弧 + 离席追帧） | `theme-switch-moves` | `theme-sweep-toggle` | `references/shots/interaction/theme-switch-moves.md` · `ThemeSweepToggle.tsx` |
| `s5_constellation` | F-ConstellationDisarm（暗室点击「星图」点亮关键路径主干 → 零残留停用） | `cursor-flyover` | `cursor-flyover` | `references/shots/camera/cursor-flyover.md` · `CursorFlyover.tsx` |
| `s6_outro` | 8 枚 `v0.6.0` 真切片发布会合影 + 字标 + CLI | `outro-group-photo-launch` | `outro-group-photo-launch` | `references/shots/outro/outro-group-photo-launch.md` · `OutroGroupPhotoLaunch.tsx` |

---

## 阶段 3：帧级分镜时间轴（`30fps`，`0..1124f` = `37.47s`）

| 镜头 | 拍号 | 帧区间 | 时长 | 主动作与静止呼吸预算 | 屏幕字幕 / 核心文案 |
|---|---|---|---|---|---|
| **S1 `s1_open`** | `b0–b8` | `0–121` | `121f` (4.03s) | 光学十字准星与微刻度描画 → `dsh-team-kanban` 逐字压印 → 等宽眉题打字机 → **完全静止 47f (1.57s)** → 10f 上浮交棒 | `dsh-team-kanban` (`118px`)<br>`DEEPSEEK HARNESS · PRECISION TELEMETRY & DAG RELAY · v0.6.0` (`32px`) |
| **S2 `s2_hero`** | `b8–b20` | `121–298` | `177f` (5.90s) | 聚光 3 站巡检锁死 `#4`（背景对端 `#2` 同步亮琥珀虚线 `is-conflict-pair`）→ `PageCam` CSS `zoom` 侧推 → `@4x` 展开卡 `#4` 悬浮 + 双圈圆角内光束 + `f92` 轻点「复制协调指令」翻转为翡翠 `✓ 已复制` → `f144` 落槽微压 → **静止 33f (1.10s)** | 3D 悬空注记（有效字高 `~68px`）：`写冲突对端联动 / 一键复制协调指令` |
| **C1 `c1_title`** | `b20–b24` | `298–357` | `59f` (1.97s) | 逐词压印 + `*即刻*` 科技蓝斜体 + `DigitRoll` 滚至 `920`（f34 落定）→ 8f 淡出 | `前置一收口， / 因果脉冲 *即刻* 接力。`<br>`920 MS EMERALD DAG RELAY · ODOMETER + FLIP` |
| **S3 `s3_flow`** | `b24–b36` | `357–534` | `177f` (5.90s) | `0.35x/0.7x/1.4x` 三平面滑轨滑入屏心：实机 `4×` 慢放呈现 `#2` `待确认` 恢复收口 → `#3` 完成触发字轮翻滚 + `920ms` 翡翠因果曲线飞渡 + `#4` 解扣光环与 `±1.25°` 倾角跨列 FLIP → `6/6` 收口展开顶栏战报条 → **静止 32f (1.07s)** | 底部字幕（`60px`）：`机械字轮跳变 · 翡翠因果接力与倾角 FLIP` |
| **C2 `c2_title`** | `b36–b40` | `534–593` | `59f` (1.97s) | 逐词压印 + `*原生*` 科技蓝斜体 + `DigitRoll` 滚至 `360`（f34 落定）→ 8f 淡出 | `窄栏不断线， / 晨昏 *原生* 同构追帧。`<br>`360 PX LEFT-ARC LINEAGE · AWAY CATCH-UP` |
| **S4 `s4_theme`** | `b40–b52` | `593–770` | `177f` (5.90s) | `1.95x` 特写日夜拨杆 → `b41` 点击日变月 → `15°` 晨昏线斜扫全屏（左窗宽屏含 `.tkb-catchup` 离席追帧胶囊，右窗 `360px` 窄栏含**左侧垂直 C 形微弧血缘**与静默空列），拉开定格半日半夜海报帧 → 卸载浅色层进入暗室 **静止 62f (2.07s)** | 底部字幕（`60px` 暗色）：`360px 左侧微弧血缘 · 离席追帧与深浅同构` |
| **S5 `s5_constellation`** | `b52–b64` | `770–947` | `177f` (5.90s) | 暗室零闪切接续：第 1 站光标提前 `2f` 飞抵顶栏战报条「星图」在 `b54` (`+30f`) 点击 → 点亮 `data-constellation` 翡翠关键路径星图主干（**静止展示 >42f = 1.4s**）→ 第 2 站飞抵「团队 → 停用」在 `b59` (`+104f`) 点击零残留收起 → 拉回全景 + 拂晓地平光衔接 Riser 推入 `b64` Drop | 底部字幕（`60px` 暗色）：`一键点亮关键路径星图 · 战报归档与零残留停用` |
| **S6 `s6_outro`** | `b64–b76` | `947–1124` | `177f` (5.90s) | `b64` 峰值 Drop 8 枚 `v0.6.0` 核心真切片四方过冲飞入落地压实 → 全员退后排 → `b67` (`+44f`) 字标压印 + 延长线射出 + CLI 命令浮现 → **完整定版静止 85f (2.83s)** | `dsh-team-kanban` (`108px`)<br>`原生 agentTeam 右侧栏活体看板 · 精密遥测与因果接力 v0.6.0` (`34px`)<br>`$ dsh plugin --profile desktop add dsh-team-kanban` (`35px`) |
