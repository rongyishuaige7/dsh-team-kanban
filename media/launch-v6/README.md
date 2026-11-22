# dsh-team-kanban v0.6.0 产品宣传片工程（`launch-v6`）

基于 `video-shotcraft` 自主自由创作流水线构建的 `v0.6.0` 官方宣传片工程，独立于 `launch-v5`（零覆盖既有资产）。

- **视觉与物理隐喻**：「光学白瓷校准台（Optical Porcelain Bench）」 → 「`15°` 晨昏扫掠与 `360px` 窄栏左侧微弧/离席追帧」 → 「暗室关键路径翡翠星图峰值（Darkroom Constellation Climax）」 → 「8 枚 `v0.6.0` 真切片发布会全家福」
- **规格**：`1920 × 1080` · `30 fps` · `1124 帧`（`37.47s`，对齐 `122.0141 BPM` 节拍网格 `b0–b76`）
- **同源双版本输出**：
  - 带 BGM 主版：`docs/assets/kanban-launch-v6.mp4`
  - 纯物理拟音无 BGM 版：`docs/assets/kanban-launch-v6-nobgm.mp4`

## 常用命令

```bash
cd media/launch-v6
node tools/capture-textures.mjs      # 采集全套 @2x/@3x/@4x 真机截图与 live-layout.json
node tools/recapture-polish.mjs      # 精调跨三列因果接力与暗室关键路径星图切片
node tools/capture-live-flow.mjs     # 采集慢放重采样实机流转视频 clips/live-flow-v6-light.mp4
npm run render                       # 渲染带 BGM 主版 -> out/kanban-launch-v6.mp4
npm run render:nobgm                 # 渲染纯拟音无 BGM 版 -> out/kanban-launch-v6-nobgm.mp4
```
