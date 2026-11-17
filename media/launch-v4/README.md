# kanban-launch-v4 — 发布片工程

成片：`docs/assets/kanban-launch-v4.mp4`（1920×1080 / 60fps / 20.6s / H.264 + AAC）。
本目录是它的完整源码与采集链路，可从头复现。

## 为什么不用录屏

屏幕录制拿不到稳定的 60fps（`recordVideo` 默认 25fps，`-r 60` 只改时间戳会把片段拉长）。
这里改用**放慢页面时钟 + 定时截图 + 按时间戳重采样**：

```
页面速度 5× 慢放  →  每 45ms 截一张  →  按真实时间戳算帧率  →  fps=60 滤镜重采样
```

每产品秒 ≈ 100 个采样帧，慢放后依然平滑。

## 链路

```bash
npm install
# 1. 采母板（约 4 分钟/色）
npm run capture:light
npm run capture:dark
# 2. 飞行镜头单独重拍（20× 慢放，约 5 分钟）
npm run capture:hero
# 3. 交互镜头（真实鼠标轨迹，约 4 分钟）
npm run capture:cursor
# 4. 切段（产品时间窗口，见 src/Launch.tsx 的时间线注释）
node tools/cut.mjs light s1 16.2 19.7
node tools/cut.mjs light s2 9.55 12.75
node tools/cut-hero.mjs s3 1.90 2.96 0.5
node tools/cut.mjs light s4 37.15 40.62
node tools/cut.mjs light s5 20.15 23.15
node tools/cut.mjs dark  s5d 20.15 23.15 1.0167
node tools/cut.mjs cursor s6 0 3.98
# 5. 渲染 + 混音
npm run render
./tools/mix.sh out/kanban-launch-v4.mp4 out/final.mp4 1
```

`capture/` 与 `public/footage/` 是中间产物，已 gitignore。

## 镜头表

| # | 帧 | 内容 | 来源 | 备注 |
|---|---|---|---|---|
| S1 | 0–211 | 全览拉开 | 母板 16.2–19.7s | zoom 1.40→1.16 |
| S2 | 211–404 | 依赖阻塞→解锁 | 母板 9.55–12.75s | zoom 1.80→1.96 |
| S3 | 404–532 | FLIP 飞行 0.5× | hero 1.90–2.96s | 148 帧/秒有效 |
| S4 | 532–741 | 5/6 → 6/6 | 母板 37.15–40.62s | 8 帧叠化出 |
| S5 | 733–913 | 深浅同帧对照 | 母板 + 暗色母板 | 8 帧叠化进出 |
| S6 | 905–1035 | 团队→停用（带光标） | cursor 0–3.98s | 真实点击 + 轨迹 |
| S7 | 1027–1237 | 品牌卡 | 静态实机帧 | 8 帧叠化入 |

## 采集侧的两个坑

1. **不能有两条播放时间线**：原型的 `setTimeout(startPlay, 900)` 会和 `?play=1` 打架，把脚本推进成双倍速。已在原型里加 `?play` 守卫。
2. **PNG 截图会停顿**：2160×1140 PNG 每帧约 80ms 且 p99 达 750ms，直接毁掉飞行镜头。换 JPEG q95 后降到 42ms。

## 验收

`docs/records/` 里有当次实测数据。关键指标是**稳像后残差**：用 `vidstabdetect → vidstabtransform` 把镜头运动完全抵消后再算帧间差异——静态图推镜会掉到 0，真动效不会。

## 验收

```bash
node tools/audit/media-metrics.mjs docs/assets/kanban-launch-v4.mp4 \
  --manifest=media/launch-v4/timeline.json
```

门槛分两层：
- **出处清单**（主判据）：`timeline.json` 逐镜声明 `kind: live|still`，要求 live 片长 ≥50%（本片 83.3%）
- **像素指标**（辅助）：重复帧、单帧 ΔLuma、最低帧亮度、体积

只靠像素指标拦不住「静态图 + 运镜」——所以清单是必须的。这条教训写在 `docs/records/2026-11-17-media-v4.md`。
