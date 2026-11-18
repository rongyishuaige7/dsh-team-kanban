# dsh-team-kanban v0.5.7 产品宣传片设计规范（DESIGN_SPEC）

- **工程目录**：`media/launch-v5/`
- **创作模式**：`自主自由创作`（用户明确授权：「自主自由创作，直接出片吧，你自行分析选择一个你认为不错的镜头动效，然后开始制作吧，都交给你了」）
- **画幅 / 帧率 / 时长**：`1920 × 1080` · `30 fps` · `1124 帧`（`37.47s`，严格对齐 `122.0141 BPM` 节拍网格第 `0`–`76` 拍，含实测输出音轨补偿 `OUTPUT_AUDIO_OFFSET_SEC = 0.0427s`）
- **双版本交付（同一时间线）**：
  - 带 BGM 版：`docs/assets/kanban-launch-v5.mp4`（默认 `inputProps: { bgm: true }`）
  - 纯音效无 BGM 版：`docs/assets/kanban-launch-v5-nobgm.mp4`（`--props=props-nobgm.json`，`{ bgm: false }`，画面与 SFX 逐帧一致）

---

## 阶段 0：产品视频简报与需求到执行决策表

### 0.1 产品定位与核心卖点
- **产品名称**：`dsh-team-kanban`（`v0.5.7`）
- **宿主与形态**：[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`0.2.2-rc.x` 桌面端）右侧栏原生多智能体任务看板插件。
- **目标用户**：使用 DeepSeek Harness 运行多智能体协作（Lead + Workers）的开发者与工程师。
- **核心价值主张**：**不是外部再造一套 SQLite 项目管理工具，而是直接把宿主原生的 `agentTeam` 会话投影（`blockedBy` DAG）变成右侧栏一块会呼吸的活体看板**——有团队任务时自动展开，前置完成即刻解锁换列，团队关闭或清空时自动收起零残留。

### 0.2 必须展示的核心功能（v0.5.7 全量对齐，零虚构宣称）
1. **F-AutoShell（自动显隐 + 顶部概览 + 标签角标）**：会话开启团队任务时右侧栏自动挂载「任务板」标签页，带环形完成度角标（`◎ 任务板`）、顶部凹槽完成进度条（`.tkb-strip`）与自动消歧的队友运行视窗（`主 / 探 / 构 / 设 / 审`）。
2. **F-DepConflict（依赖血缘、下游瓶颈与写冲突预警）**：卡片正面直出 `blockedBy` 前置依赖芯片、`↘ N` 下游解锁瓶颈计数（`.tkb-unlocks`）与并发写范围冲突告警（`.tkb-conflict`）。
3. **F-LiveFlip（三列实时 FLIP 流转 + SVG 贝塞尔血缘线 + 0fr→1fr 抽屉）**：悬停绘制上下游 SVG 贝塞尔血缘曲线（`.tkb-wires`），点击展开 `0fr → 1fr` 丝滑详情抽屉，前置任务完成后阻塞卡自动解锁并沿 `.tkb-flights` 跨列物理弧线飞入目标列。
4. **F-ResponsiveTheme（`@container` 360px 窄栏自适应 + `--dsw-alias-*` 深浅双色同构）**：宽屏分栏与严格 `360px` 窄栏同源适配（窄栏空泳道自动静默收敛为 `30px` 标题条、非空泳道可折叠、点击队友胶囊锁定展开全名），纯 `--dsw-alias-*` 令牌驱动 Light / Dark 像素级无缝跟随。
5. **F-Disarm（一键停用团队协作 + 防误触确认 + 收起零残留）**：`.tkb-head` 内嵌「团队」按钮，点击弹出确认气泡（焦点默认落在取消防误触），确认停用后保留历史任务并自动收起看板标签页，不留空壳。

### 0.3 数据安全与合规口径（D1–D5）
- **100% 公开演示数据**：所有截图与实机录屏全部采自仓库内开源零依赖原型 `prototype/team-kanban-prototype.html`（任务 `#1`–`#6` 均为本插件自身 UI 演进的公开技术任务，智能体名称为 `主智能体 / 探索者 / 构建者 / 设计师 / 审查员`）。
- **零敏感信息**：不含任何真实客户名、个人信息、API 密钥、私有仓库路径或外部未授权商标。

### 0.4 需求到执行决策表（P4）

| 项目事实 / 约束 | 执行决策 | 落地位置 |
|---|---|---|
| DSH 桌面端以干净浅色工作台为主，同时原生支持 `--dsw-alias-*` 深浅双色 | 全片主舞台采用 **DSH Porcelain 冷白工作台**（`#F5F8FD → #E3EBF7`）+ **DeepSeek 科技蓝 `#4176E6`**；深色模式（`#151517`）集中在 S4 主题扫场与 S6 合影代表卡展示，避免漂移成复古纸墨或赛博霓虹 | `src/tokens.ts`、`styleframe/styleframe.png` |
| 核心差异化在「单卡血缘/冲突信息密度」与「真 FLIP 流转」 | S2 用 `spotlight-hero-card`（`@4x` 高清卡切片 + `PageCam` CSS `zoom` 3D 特写）慢节奏立住 `#4` 主角卡；S3 用 `PageCam` + `ClipCard` 播放高采样真实运行流转视频（非静态图硬推） | `SceneHero.tsx`、`SceneFlow.tsx` |
| v0.5.7 新增 `360px` 窄栏空列静默收敛与 `--dsw-alias-*` 令牌对齐 | S4 将「宽屏看板 + `360px` 窄栏容器」同屏并置，用 `theme-switch-moves · theme-sweep-toggle` 15° 晨昏线斜向扫场一次性证明响应式几何与 Light/Dark 像素级同构 | `SceneTheme.tsx` |
| 插件唯一写操作为 header 内嵌「停用团队」且自动收起看板 | S5 用 `cursor-flyover` 双站引导光标 + 点击涟漪展示「点开团队按钮 → 确认停用 → 看板自动关闭还原纯净会话区」的完整因果链 | `SceneDisarm.tsx` |
| 技术开发者受众需要明确安装入口，且需兼顾有/无 BGM 场景 | S6 `outro-group-photo-launch` 8 枚真实切片合影围住 `dsh-team-kanban` 字标与 `$ dsh plugin --profile desktop add dsh-team-kanban` 单行命令，落定静止 >2s；`Root.tsx` 通过 `bgm` prop 同源输出双版本 | `SceneOutro.tsx`、`Main.tsx` |

---

## 阶段 1：视觉方向、品牌 Tokens 与动效性格

### 1.1 色彩与材质 Tokens（源自宿主 `--dsw-alias-*`，已由 `styleframe/styleframe.png` 视觉验视通过）
- **主舞台（DSH Porcelain Light）**：纵向柔光渐变 `#F5F8FD → #EDF2FB → #E3EBF7`，左上柔和顶光 + 36px 径向渐隐微点阵，干净克制。
- **界面表面**：浅色主面 `#FFFFFF`、凹槽次面 `#F4F6FA`、细发丝描边 `rgba(15,17,21,0.08)`；深色主面 `#151517`、深色卡面 `#212123`、深色描边 `rgba(255,255,255,0.09)`。
- **文字色阶**：主墨 `#0F1115`、次级 `#61666B`、弱标签 `#81858C`（深色主字 `#F5F6F8`、次字 `#A1A6B0`）。
- **语义强调色**：
  - 主品牌色（DeepSeek Tech Blue）：浅色 `#4176E6` / 柔底 `#E4EDFD`；深色 `#7AAAFF`
  - 完成 / 活跃绿：`#22C55E`（浅底文字 `#15803D`）
  - 阻塞琥珀：`#DD8629`
  - 写冲突 / 停用警示红：`#EC1313`
- **字体与字号底线（严格执行 `Q11`）**：
  - UI 无衬线：`-apple-system, BlinkMacSystemFont, "PingFang SC", "SF Pro Display", "Helvetica Neue", sans-serif`
  - 代码 / 编号等宽：`"SF Mono", ui-monospace, Menlo, monospace`
  - 叙事字幕条（`Caption`）：屏幕实测字高 **`60px`**（`≥ 56px` 硬底线）
  - 辅助说明 / CLI 安装命令 / 机器签条：屏幕实测字高 **`32px–36px`**（`≥ 32px` 硬底线）
- **圆角规范**：外窗 `14px–16px`，任务卡 `8px–10px`，状态胶囊 `6px` / `999px`，与 `.tkb-*` 一致。

### 1.2 禁用风格清单（V3 / V4）
- **严禁漂移至 Ink Press 纸墨风**：禁用暖黄纸底 `#faf7f2` / `#f2eee6`、禁用衬线大标题（Georgia / Times）、禁用琥珀棕 `#b5651d` 墨渗纹理。
- **严禁赛博霓虹与廉价特效**：禁用紫粉霓虹发光、禁用手持相机微抖（`Q3` 零相机抖动）、禁用批量卡片逐一扫光闪烁（`Q4` 光束只给 S2 单一主角卡）。

### 1.3 动效性格 Tokens
- **速度与缓动**：入场干脆 `bezier(0.16, 1, 0.3, 1)`，相机推拉平滑非对称 `bezier(0.35, 0, 0.2, 1)`，弹性落位克制单次过冲 `bezier(0.34, 1.4, 0.44, 1)`（过冲 `6%–9%`，不果冻回摆）。
- **全画面冲击预算（R4）**：全片相机/整幅级冲击共 **2 处**（`≤ 3` 硬上限，间隔 `56` 拍 `>> 16` 拍）：① `beat 8`（`f120`）剧场聚光推闸开灯；② `beat 64`（`f946`）发布会峰值收场落机位扫光。其余节拍律动 100% 落在元素层。

---

## 阶段 2：功能到镜头卡映射（Gallery 索引 + 源码核对）

| 镜头 ID | 对应功能 | 选用 Gallery 卡名 | `library.json` `style-key` | 核对文档与准确 Demo TSX 源码 | 适配说明 |
|---|---|---|---|---|---|
| `s1_open` | 品牌立名 + 版本心智 | `brand-ink-open` | `brand-ink-open` | `references/shots/opening/brand-ink-open.md`<br>`demos/typography/brand-ink-open/BrandInkOpen.tsx` | 保留准星 pathLength 描画 → 逐字压印 + 底部短划 glint → 等宽打字机副标 → `>1s` 静止 → 上浮消散；色板与字体换为 DSH 冷白 + `#4176E6` 无衬线/等宽 |
| `s2_hero` | F-AutoShell + F-DepConflict（自动挂载右侧栏 + `#4` 阻塞/瓶颈 `↘ 1`/写冲突 `⚠`） | `spotlight-hero-card` | `spotlight-hero-card` | `references/shots/opening/spotlight-hero-card.md`<br>`demos/opening/spotlight-hero-card/SpotlightHeroCard.tsx` | 完整保留推闸开灯 → 3 站寻人 → 锁定变页面空间卡形软孔 → `PageCam` CSS `zoom` 斜侧特写（`rotY 25°, rotX 6.5°`）→ `@4x` 主角卡弹起 + 双圈轮廓光束 + 同相机 3D 悬空批注 → 触地微压 + `>1s` 静止 |
| `c1_title` | 章节呼吸路标 ①（引导实时流转） | `paper-title-card` | `paper-title-card` | `references/shots/typography/paper-title-card.md`<br>`demos/typography/paper-title-card/PaperTitleCard.tsx` | 保留逐词 `scale 1.28→1 + blur 7→0` 压印、单重点词斜体强调色、`scaleX` 短横线与 `DigitRoll` 滚动数字（淡出前 18f 落定）；换 DSH 冷白舞台与科技蓝 |
| `s3_flow` | F-LiveFlip（三列实时 FLIP 弧线换列 + SVG 贝塞尔血缘线 + `0fr→1fr` 抽屉 + 顶栏进度/标签环推进） | `depth-layer-moves` | `multiplane` | `references/shots/camera/depth-layer-moves.md`<br>`demos/camera/depth-layer-moves/MultiplaneReal.tsx` | 完整保留 `0.35x` 远景退焦降饱和整页 + 空气薄雾 / `0.7x` 中景主阅读层 + 落定抬升（`lift`）+ 焦点描边 / `1.4x` 近景景深胶囊 + `SpeedBlur` / `0x` 静止眉题四层视差滑轨；中景内嵌 `4×` 慢放重采样的零重复帧实机流转视频（`clips/live-flow-light.mp4`），直出悬停血缘连线、抽屉展开、解锁跨列飞行与 `6/6 ✓` 完成态 |
| `c2_title` | 章节呼吸路标 ②（引导窄栏与换肤） | `paper-title-card` | `paper-title-card` | 同 `c1_title`（共用 `cardId: 'title-card'`） | 文案去重，数字滚轮展示 `360px` 响应式容器指标 |
| `s4_theme` | F-ResponsiveTheme（宽屏 + `360px` 窄栏空列静默收敛/锁定胶囊 + `--dsw-alias-*` 深浅同构） | `theme-switch-moves` | `theme-sweep-toggle` | `references/shots/interaction/theme-switch-moves.md`<br>`demos/interaction/theme-switch-moves/ThemeSweepToggle.tsx` | 完整保留 `zoom 1.95` 开关特写 → 指针点击日变月 → 15° 晨昏线斜边外扩 400px 从开关侧扫过全屏 → 相机同步拉开呈现昼夜同屏海报帧 → 深色轮廓光点亮 + 卸载浅色层真静止；深浅两版均为真实截图 |
| `s5_disarm` | F-Disarm（header 内嵌团队按钮 + 防误触确认气泡 + 自动关闭零残留） | `cursor-flyover` | `cursor-flyover` | `references/shots/camera/cursor-flyover.md`<br>`demos/camera/cursor-flyover/CursorFlyover.tsx` | 保留「手先于眼」解耦曲线（光标领先出发走微弧、屏幕恒定 40px 箭头、80px 点击涟漪、站间 hop + `SpeedBlur`）完成两站真实交互：点开「团队」→ 点「停用团队」收起侧栏 → 拉回纯净全景 |
| `s6_outro` | 全功能全家福召回 + 品牌字标 + CLI 安装命令 | `outro-group-photo-launch` | `outro-group-photo-launch` | `references/shots/outro/outro-group-photo-launch.md`<br>`demos/outro/outro-group-photo-launch/OutroGroupPhotoLaunch.tsx` | 完整保留 8 枚功能代表真切片四方错峰过冲飞入（`bezier(0.34,1.4,0.44,1)` + `SpeedBlur` + 落地压实）→ `crane` 落机位 → 全员退后排 → 字标逐字压印 + 射出延长线 + 单行 CLI 命令 → `2.5s+` 真静止定版海报 |

*注：全部选用样式均具备完整可执行 `demos/` TSX 源码，未使用任何 `referenceOnly` 或残缺卡片（S6 合规）。*

---

## 阶段 3：BGM 节拍网格验收与帧级分镜时间线

### 3.1 BGM 节拍分析与网格验收（详见 `analysis/beat_data.json` & `analysis/grid_drift.json`）
- **曲目**：`house-vibez.mp3` — *House Vibez* by Lily J（Mixkit Stock Music Free License，`https://assets.mixkit.co/music/745/745.mp3`）
- **最小二乘精化网格（`1x` 获胜）**：
  - `BPM` = **`122.0141`**
  - `SOURCE_BEAT0` (`t0`) = **`0.061121 s`**
  - `BEAT_INT` (`T`) = **`0.491747 s`**（每拍约 `14.75f` @ 30fps，每 4 拍一小节 = `1.967s`）
  - **四项验收指标**：瞬态命中率 `match = 100.0%`（门槛 `≥98%`）· 平均绝对误差 `mean_abs_ms = 1.59 ms`（门槛 `<10ms`）· 42s 累计漂移 `drift_ms = 0.81 ms`（门槛 `<5ms`）· 首拍落在真实底鼓瞬态（`beat0_valid = true`）。整数拍 kick 均值 `0.216` 为半拍 `0.088` 的 **2.45 倍**，排除半倍/双倍歧义。
- **音乐能量段落贴合**：
  - `Beat 0–32`（`0.06s–15.80s`，RMS `~0.206`）：稳健底鼓前奏 → 承载 `s1_open`（低能量立名）+ `s2_hero`（单主角慢速精读）+ `c1_title`。
  - `Beat 32–64`（`15.80s–31.53s`，RMS 抬升至 `0.241`）：律动爬升段 → 承载 `s3_flow`（实时流转）+ `c2_title` + `s4_theme`（主题扫场）+ `s5_disarm`（交互收起 + Riser 蓄力）。
  - `Beat 64–76`（`31.53s–37.43s`，**Bar 16 全曲最高能量 Drop，RMS `0.274`**）：精准钉死 `s6_outro` 发布会合影与品牌定版！

### 3.2 完整帧级分镜表（30fps，总长 `1124f` = `37.47s`，含实测 `OUTPUT_AUDIO_OFFSET_SEC = 0.0427s`）

| 镜头 | 拍号区间 | 帧区间 (`from`–`to`) | 时长 | 主动作与转场接缝 | 页面/素材状态 | 屏幕字幕 / 文案（字高核验） | 关键 SFX 峰值钉点（相对镜头起点，已扣 `PEAK_F + OUTPUT_AUDIO_OFFSET_F`） |
|---|---|---|---|---|---|---|---|
| **S1 `s1_open`** | `b0 – b8` | `0 – 121` | `121f` (4.03s) | 蓝线准星描画 → `dsh-team-kanban` 逐字压印（f56 齐）→ 打字机眉题（f68 齐）→ **静止 hold 42f (1.40s)** → 10f 上浮消散交棒 S2 | 纯净 DSH Porcelain 舞台 | 主字标 `116px`；眉题 `DEEPSEEK HARNESS · NATIVE AGENT-TEAM KANBAN · v0.5.7`（`32px` mono） | `+5f` `pen-write-paper` · `+22f` `transition-soft` · `to-4f` `whoosh-fast` |
| **S2 `s2_hero`** | `b8 – b20` | `121 – 298` | `177f` (5.90s) | 推闸开灯 → 光池 3 站寻人 → f34 锁定 `#4` → `PageCam` CSS `zoom` 推进斜特写（`rotY 25°, rotX 6.5°`）→ `@4x` `#4` 弹起悬浮 + 双圈光束扫描 + 3D 批注 → f144 触地微压 → **静止 hold 33f (1.10s)** | 真实 `@2x` DSH 完整桌面 + 右侧栏看板 + `@4x` `#4` 阻塞/瓶颈 `↘ 1`/写冲突 `⚠` 切片 | 3D 悬空批注（有效字高 `~65px`）：`原生血缘与瓶颈直出 / 写冲突一眼锁定` | `+3f` `switch-tap` · `+58f` `air-whoosh-powerful` · `+76f` `light-sweep-magic` (裁至72f) · `+144f` `transition-snap` |
| **C1 `c1_title`** | `b20 – b24` | `298 – 357` | `59f` (1.97s) | 逐词压印 + `*即刻*` 科技蓝斜体 + `scaleX` 短线 + `DigitRoll` 滚至 `6`（f34 落定，留 17f 阅读）→ 8f 淡出 | DSH Porcelain 章节字卡 | 主句 `98px`：`前置一收口， / 下游 *即刻* 换列流转。`；副行 `32px` mono：`6 SHARED TEAM TASKS · ZERO SQLITE SYNC` | `+8f` `swoosh-quick` |
| **S3 `s3_flow`** | `b24 – b36` | `357 – 534` | `177f` (5.90s) | `MultiplaneReal` `0.35x/0.7x/1.4x` 三层视差滑轨（远景退焦整页 + 中景实机录屏滑入居中 + f122 落定抬升描边 + 近景 `SpeedBlur` 胶囊 + `0x` 静止顶栏）：悬停绘出 SVG 贝塞尔血缘曲线 → 点击展开 `0fr→1fr` 抽屉 → 前置完成解锁 `#4` 跨列弧线飞行 → `6/6 ✓` **收尾静止 ≥25f** | 远景 `@2x` 宿主页 + 中景实机视频 `live-flow-light.mp4` | 顶部 `0x` 阶段签 `32px`；底部叙事字幕（`60px`）：`贝塞尔血缘连线 · 跨列 FLIP 实时流转` | `+8f` `transition-soft` · `+28f` `switch-click-quick` · `+105f` `wind-woosh-throw` · `+145f` `lock-quick` |
| **C2 `c2_title`** | `b36 – b40` | `534 – 593` | `59f` (1.97s) | 逐词压印 + `*原生*` 科技蓝斜体 + `scaleX` 短线 + `DigitRoll` 滚至 `360`（f36 落定）→ 8f 淡出 | DSH Porcelain 章节字卡 | 主句 `98px`：`窄栏自适应， / 深浅 *原生* 随宿主换肤。`；副行 `32px` mono：`360 PX @CONTAINER · --DSW-ALIAS-* TOKENS` | `+8f` `swoosh-quick` |
| **S4 `s4_theme`** | `b40 – b52` | `593 – 770` | `177f` (5.90s) | `zoom 1.95` 特写顶栏日夜开关 → `b41` (`+15f`) 指针点击拨向月牙 → 15° 晨昏线从开关侧斜扫全屏（同时覆盖宽屏看板与右侧 `360px` 窄栏静默空列/锁定姓名胶囊），相机同步拉开定格昼夜同屏海报帧 → 深色轮廓光亮起 → **静止 hold 62f (2.07s)** | 像素级同构真实 `@2x` 浅色/深色宽屏看板 + `@3x` `360px` 窄栏双形态截图 | 底部叙事字幕（`60px`）：`360px 窄栏静默折叠 · 深浅双色无缝同构` | `+15f` `switch-light` · `+42f` `air-woosh-deep` (裁至78f) |
| **S5 `s5_disarm`** | `b52 – b64` | `770 – 947` | `177f` (5.90s) | `cursor-flyover` 双站引导：第 1 站飞向 `.tkb-head` 内嵌「团队」在 `b55` (`+44f`) 点击弹出防误触确认框（「取消」带蓝色默认焦点环）→ 第 2 站 hop 至「停用」在 `b58` (`+89f`) 点击确认 → 12f 叠化自动关闭「任务板」标签回落至宿主「文件」标签页（历史任务保留，无残留空看板标签）→ 拉回全景 **静止 37f** + Riser 蓄力推入 Drop | 真实 `@2x` 顶栏内嵌团队确认态切片 + 真实看板标签移除还原态截图 | 底部叙事字幕（`60px`）：`一键停用团队协作 · 任务保留，收起零残留` | `+44f` `click-camera` · `+89f` `switch-tap` · `+96f` `sweep-fast-small` · `b64峰值` `riser-cine` (裁至52f) |
| **S6 `s6_outro`** | `b64 – b76` | `947 – 1124` | `177f` (5.90s) | `b64` Drop 瞬间开场光带扫过 + `crane` 落机位，8 枚代表真切片从四方过冲飞入合影 → 全员退后排 → `b67` (`+44f`) 字标压印 + 延长线射出 + 单行 CLI 命令浮现 → **完整定版静止 hold 85f (2.83s)** | 8 枚全片功能代表 `@2x/@3x/@4x` 真切片 + 景深柔焦底板 | 字标 `108px`：`dsh-team-kanban`；副标 `36px`：`原生 agentTeam 右侧栏活体看板 · v0.5.7`；CLI `35px` mono：`$ dsh plugin --profile desktop add dsh-team-kanban` | `+8f` `swoosh-quick` · `+46f` `impact-deep-whoosh` (裁至96f) · `+72f` `shimmer-sparkle-sweep` (裁至84f) |

### 3.3 渲染管线音频偏移与渲后实测回执（详见 `analysis/post_render_audit.json`，满足 `A9` & `music-beat-sync §5b`）
- **测量管线四要素**：Remotion `4.0.484` · Chromium Headless + ANGLE · FFmpeg `7.1` (`libx264` + `AAC 48kHz MP4`) · 测量日期 `2026-11-17`。
- **探针与测法**：对渲染成品 `out/kanban-launch-v5.mp4` 减去同时间线纯音效轨 `out/kanban-launch-v5-nobgm.mp4` 分离出纯渲染 BGM 底床，在 `1.0s–12.0s` 稳态窗口与源 `house-vibez.mp3` 做 `48kHz` FFT 归一化互相关，同时对 4 个尖锐拟音探针（`s3-drawer`、`s4-toggle`、`s5-click1`、`s6-impact`）做逐条互相关残差复测。
- **实测结果**：
  - 源首拍 `SOURCE_BEAT0 = 0.061121s` 与管线输出偏移 `OUTPUT_AUDIO_OFFSET_SEC = 0.0427s` 独立分账存储于 `src/timeline.ts`。
  - 渲后实测输出偏移 `0.042333s`（`1.27f`），与配置值仅差 `0.37 ms`，4 项尖锐 SFX 探针残差均 `≤ 1.0f`。
  - 全片 8 个节拍切点渲后回测最大绝对误差 **`0.49 帧`**（远优于 `≤ 3.0 帧` 硬底线），响度 `max_volume = -1.8 dB`（零削波），全部 22 条 SFX 段段清晰可辨。
