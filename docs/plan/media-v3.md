# 双线出片方案（A：README 循环图 / B：发布片）

> **归档说明**：本文描述 v3，其资产与 `media/launch/` 工程已在 media-v4 清理时移除。现行实现见 `media/launch-v4/`。

## 1. 症状 → 根因 → 对策（总表）

| 症状 | 已验证的根因 | 对策 |
|---|---|---|
| 卡顿 | 成片 25.00fps（980帧/39.2s），Playwright `recordVideo` 默认上限 | 8× 慢放 + 10fps 抓帧 + 重采样到 60fps |
| 像幻灯片 | 帧间变化面积**中位数 0.00%**，82.4% 的帧变化 <0.5% | 缩短 beat 间隔 + 全片加运镜，禁止"静止等结果" |
| 动效没展示到位 | `crowd = ev.moved.length > 6` → 超 6 张卡直接不播飞行 | 阈值提到 12 + 30ms 错峰 |
| 同上 | 460ms FLIP 在 25fps 只有 11 采样帧 | 采集端 60 采样/秒 |
| 黑底看不清 | 68.8% 像素亮度 <20；内容仅占 20.1%；1920→960 降采样把 12px 正文压成 6px | **只裁不缩**：栏宽 1:1 出图 + 浅色为主 |
| 白闪 | 16.16–16.68s 硬切到 luma 231，入切零过渡 | 改分屏同帧对照 |
| 卡片停在栏底 | FLIP `to` 矩形过期，落到 lane 之外 | 阶段 0 修复 + 断言 |
| 无因果感 | 全程无光标，剧本自动播放 | B 线加光标轨道；A 线靠运动自明 |

---

## 2. 阶段 0：共同底座（串行，先做，约 1.5h）

### 2.1 原型三处修改 `prototype/team-kanban-prototype.html`

**(a) 采集用 URL 参数**（约 20 行，放在 `const env = {...}` 之后）

```
?embed=1     隐藏 #ptBar、.pt-stage padding 归零、.conv 隐藏、.side 铺满视口
?speed=8     同时设 env.speed 与 body --tkb-speed（复用现有 speed 分支逻辑）
?theme=light / ?theme=dark
?play=1      载入后自动 startPlay()
?gaze=1      暴露只读钩子 window.__TKB（state / play / speed / reduced / beats）
```

`?speed` 必须走和工具栏 `data-seg="speed"` 完全相同的两行赋值，避免 CSS 与 JS 时钟不同步。

**(b) crowd 守卫**（第 2232 行附近）

```js
const crowd = ev.moved.length > 6;   // → > 12
```
并在 `motion()` 里对 `ev.moved` 加 `i * 30ms` 错峰；总时长上限 `F + 6*30`。超过 12 张时才退化为无飞行（此时应整批淡入淡出，不要瞬移）。

**(c) FLIP 落点越界（阻塞级，必须先复现）**

现状：卡片最终停在 lane 之外、轨道底部空白区，被视口裁断。假设是 `before` 在 `patchLanes` 之前测量、而目标矩形在 lane 重排 + `measureAll()` 之后已失效。

修复要求：
- `before` 与 `to` 在**同一轮布局**测量（`patchLanes` → `measureAll()` → 再取 `rel(el, rr)`）
- 采集时对每张飞行卡断言 `to.y + to.h <= laneBody.bottom + 2 && to.x >= laneBody.left - 1`
- 断言失败即抛错并写入 `capture/flight-fail.json`，不许静默通过

验证方法：以 `?speed=8&play=1` 跑一遍，第 10–12s（成片时间）对应母板约 80–96s，确认 `#3` 不再落到 y>800。

### 2.2 采集器 `tools/capture/record.mjs`（进仓库，可复现）

```
launch: chromium headless=new
viewport: 由参数给（A: 900×1000 / B: 1440×900）
deviceScaleFactor: 2
emulateMedia({ reducedMotion: 'no-preference' })   ← 硬性，v2 疑似踩坑
goto: file://…/team-kanban-prototype.html?embed=1&speed=8&play=1&gaze=1
loop: 每 100ms 一次 page.screenshot({type:'png'}) → frames/%06d.png
log : frames.json  [{i, t_ms, beat, step}]
```

**不做的事**：不用 `recordVideo`，不用 `Page.startScreencast`（两者都不可控帧率）。

### 2.3 60fps 的正确做法（本方案核心）

页面按 **S=8 倍慢放**跑，抓帧约 **10fps**，那么每 1 秒成片对应 8 秒真实时间 × 10fps = **80 个采样帧**，再重采样到 60fps —— 无论抓帧抖动多大，输出的运动都是平滑的，且**没有任何一帧是重复/插值出来的假帧**。

| S | 抓帧 | 每帧预算 | 80 采样/s? | 41s 母板耗时 |
|---|---|---|---|---|
| 3 | 20 | 50ms | ❌ 60 | 124s |
| 6 | 10 | 100ms | ❌ 60 | 248s |
| **8** | **10** | **100ms** | **✅ 80** | **~330s** |

编码端：`-framerate <实际 fps> -i frames/%06d.png -vf fps=60 -c:v libx264 -crf 17`。若 `frames.json` 的间隔变异系数 >8%，改用 concat demuxer 带每帧 duration 再 `fps=60`。

### 2.4 静态版式板（B 线要，A 线不用）

按 video-shotcraft 的采集规范出一套 2x 静态素材，供 `PageCam` 做 2.5D 运镜：

- 5 个关键态全页截图（1440×900 @2x）
- 元素级抠图：环形角标、能量条、单张卡面、依赖线、停用弹层、队友胶囊
- `layout.json`：上述元素在 2x 坐标系里的 box

### 2.5 验收脚本 `tools/audit/media-metrics.mjs`

复用我这次用的四组度量，输出 JSON，作为 A/B 的准入闸门：

1. fps / 帧数 / 时长 / 码率（ffprobe）
2. 逐帧变化面积（阈值 8/255）：中位数、<0.5% 帧占比、>10% 跳变帧数与时间戳
3. 逐帧亮度：均值、<20 像素占比、相邻帧 ΔLuma 极值
4. 内容占比：与背景色差 >15 的像素比例；分区（左/右/上/下四象限）

---

## 3. A 线：README 循环图 `kanban-loop-v3.webp`

**设计原则：只裁不缩。** 900 CSS px 的栏 → 900px 输出，12px 正文就是 12px。这直接解决"糊"。

| 项 | 规格 |
|---|---|
| 画布 | 900×1000，1:1 像素 |
| 主题 | **浅色**（GitHub 白底，深色在 README 里永远是黑洞） |
| 帧率 | 20fps |
| 时长 | 8.0s |
| 窗口 | 母板中**滑窗变化面积最高**的 8s（用 §2.5 脚本按 1s 窗扫，自动选段） |
| 节奏 | 窗口内按 0.6× 播放（运动放慢，20fps 才不显抽） |
| 循环 | 末尾 0.35s 淡到 #f6f7f9 再淡回首帧 |
| 字幕 | **无**（README 已有 alt + 说明，字幕只会盖住卡片） |
| 体积 | ≤ 2.2MB（`-q 68 -m 6`），超了就降到 18fps/7s |

**内容节拍（8s 内必须有 4 次可见事件，不允许出现 >0.8s 的完全静止）：**

| t | 事件 |
|---|---|
| 0.0–1.2 | 两张卡从 待处理 错峰落入（stagger 45ms） |
| 1.2–2.8 | 依赖解锁：阻塞标签淡出、卡片上移补位 |
| 2.8–5.2 | 一张卡 FLIP 跨列飞到 进行中（0.6× 慢放） |
| 5.2–6.6 | 完成打勾 + 环形角标 4/6 → 6/6 + 能量条填满 |
| 6.6–8.0 | 定格 0.6s → 淡出循环 |

编码：`img2webp -loop 0 -mixed -q 68 -m 6 -d 50`（或 ffmpeg `-c:v libwebp_anim`）。

---

## 4. B 线：发布片 `kanban-launch-v3.mp4`

**模式判定**：用户已把执行权整体交给主对话 → 记为**自主自由创作**（video-shotcraft 模式 2，读 `references/pipeline.md`）。若用户后续想逐段确认，退回共同创作。

| 项 | 规格 |
|---|---|
| 画布 | 1920×1080 / 60fps / 18.0s |
| 主题 | 浅色为主，深色仅作第 5 镜对照（占比 ≤25%） |
| 引擎 | Remotion + `PageCam`（真实 2x 截图运镜）+ `ClipCard`（包 60fps 飞行片段） |
| 音乐 | 120 BPM，4/4；切点全落半拍网格（6/13/21/27/31 拍） |
| 音效 | `assets/audio/sfx/`：ui 轻点 ×4、transition whoosh ×1、impact ×1；片尾收束 |
| 输出 | 带 BGM 版 + 无 BGM 版（`bgm` inputProp 同时间线渲两版） |

**分镜（6 镜 / 18.0s）：**

| # | 时长 | 画面 | 运镜 | 字幕 |
|---|---|---|---|---|
| 1 | 3.0s | 全页：对话 + 右栏看板，6 任务刚建立 | 1.18× + rotateY 12° → 1.0× + 0°，缓入 | 一个想法，一支团队 |
| 2 | 3.5s | 推进 待处理 列，依赖连线绘制 + blocked 标签 | 推 1.9×，轻微 rotateX 3° | 自动拆解 · 依赖即阻塞 |
| 3 | 4.0s | ClipCard 播飞行片段：卡从待处理→进行中→已完成 | 跟随横移，片段 0.5× 慢放 | 认领 · 流转 · 完成 |
| 4 | 3.0s | 微距：环形角标 3/6→6/6、能量条填满、打勾 | 推 2.2×，末帧回落到 1.6× | 进度，一直在你眼前 |
| 5 | 2.0s | 左右分屏：浅色 / 深色 同帧同步播放 | 静止 1.02× 慢推 | Light / Dark，跟随宿主 |
| 6 | 2.5s | 拉远 → 停用弹层 → 品牌卡落定（hold 1.2s） | 1.4× → 1.0×，缓出 | 一键收队 |

**第 5 镜是本方案对 v2 白闪的替代**：同帧左右对照，一眼看出主题跟随，且不会闪瞎。

**避坑（对应本片已知问题）：**
- 不用"白色冲击"转场，全片单帧 ΔLuma 跳变 >150 的次数必须为 0
- 每个镜头只讲一个动效，同一手法全片只当一次主角
- 品牌卡落定后 hold ≥1.0s；批量动效收尾留 0.5s 静止
- 渲染禁 `Math.random()`（`mulberry32` 固定种子）

---

## 5. 并行与冲突

```
阶段0（串行 1.5h）
  ├─ 修 3 个 bug → 采集器 → 母板 1 条(60fps) + 静版 1 套 + beats.json
  │
  ├─ A 线（0.5h）：切 8s → 20fps → webp → 过闸门
  └─ B 线（3–4h）：Remotion 工程 → 6 镜 → 混音 → 双版渲出 → 过闸门
        ↓
   终检（独立 subagent，0.5h）
        ↓
   一次 README 提交（避免两边各改一次）
```

| 文件 | 归属 |
|---|---|
| `prototype/*` `tools/capture/*` `tools/audit/*` | 阶段 0，双方只读 |
| `docs/assets/kanban-loop-v3.webp` | A 独占 |
| `docs/assets/kanban-launch-v3.mp4` + Remotion 工程 `media/launch/` | B 独占 |
| `README.md` | **只在终检后改一次** |

---

## 6. 验收闸门（达不到不许提交）

| # | 指标 | A 阈值 | B 阈值 |
|---|---|---|---|
| 1 | 输出 fps | 20.00 ±0.05 | 60.00 ±0.10 |
| 2 | 帧间变化面积中位数 | ≥ 1.2% | ≥ 1.5% |
| 3 | 变化<0.5% 帧占比 | ≤ 35% | ≤ 20% |
| 4 | 单帧 ΔLuma >150 的次数 | 0 | **0** |
| 5 | 最长无运动窗口（允许 1 处片尾 hold） | ≤ 0.8s | ≤ 0.6s（片尾 ≤1.2s） |
| 6 | 画面平均亮度 | ≥ 150 | 浅色镜 ≥150；全片 ≥110 |
| 7 | 内容像素占比 | ≥ 35% | ≥ 30% |
| 8 | 最小有效字号 | ≥ 11px | ≥ 28px（字幕）/ ≥12px（页面内） |
| 9 | 体积 | ≤ 2.2MB | ≤ 12MB |
| 10 | 音频 | — | -14 LUFS ±1，真峰值 ≤ -1.0 dBTP |

---

## 7. 交付物

1. `docs/assets/kanban-loop-v3.webp`（≤2.2MB）
2. `docs/assets/kanban-launch-v3.mp4`（≤12MB）+ `kanban-launch-v3-nobgm.mp4`
3. `docs/assets/board-v3-light.png` / `board-v3-dark.png`（1:1，替代现有 1920 截图）
4. `tools/capture/` `tools/audit/media-metrics.mjs`（**必须进仓库**，v2 没进导致不可复现）
5. `README.md` 视觉预览段：webp + 折叠双色图 + 一句话说明；mp4 建议改指 **GitHub Release 附件**，别再往 git 里堆二进制
6. `docs/records/2026-11-xx-media-v3.md`：采集参数、beats.json、闸门实测数据
