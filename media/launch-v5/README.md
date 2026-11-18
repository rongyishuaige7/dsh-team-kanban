# kanban-launch-v5（dsh-team-kanban v0.5.7 产品宣传片与多规格衍生工程）

基于 Remotion `4.0.484` 与 `video-shotcraft` 全流程规范制作的自包含成片工程，接入 Shotcraft 可视化动效工作台（`src/workbench.ts`）与剪映专业版草稿导出器（`tools/export-jianying.py`）。

## 交付物矩阵
- `docs/assets/kanban-launch-v5.mp4` — 16:9 中文主发布片（带 BGM + Foley SFX，`1920×1080 @ 30fps`，`37.47s`）
- `docs/assets/kanban-launch-v5-nobgm.mp4` — 16:9 纯 SFX 无 BGM 同时间线版（`--props=props-nobgm.json`）
- `out/kanban-launch-v5-en.mp4` — 16:9 全英文国际版（英文实机 UI 截图/录屏 + 英文排版字幕，`--props=props-en.json`）
- `out/kanban-launch-v5-vertical-9x16.mp4` — 9:16 竖屏短视频卡点版（`1080×1920 @ 30fps`，`19.67s` 踩准 Bar 16 峰值 Drop）
- `out/jianying/dsh-team-kanban-v5/` — 可编辑剪映专业版草稿（8 镜分段底片 + 中英双语原生文本轨 + 分道拟音轨 + BGM）

## 目录结构
- `DESIGN_SPEC.md`：阶段 0–3 完整产品简报、决策表、视觉 Tokens、Gallery 卡映射与节拍级分镜表
- `styleframe/`：阶段 1 静态视觉方向验视页与截图
- `analysis/`：`house-vibez.mp3` 节拍网格拟合（`beat_data.json` / `grid_drift.json`）、音效包络峰值（`sfx_peaks.json`）与渲后音画同步回测报告（`post_render_audit.json`）
- `tools/`：中文真机截图采集（`capture-textures.mjs`）、中文 4× 慢放实机流转录屏（`capture-live-flow.mjs`）、全英文真机采集（`capture-en.mjs`）、剪映草稿导出（`export-jianying.py`）与渲后音轨偏移审计（`verify-audio-sync.py`）
- `src/`：横版主合成 `Main.tsx`、竖版合成 `VerticalMain.tsx`、唯一时间源 `timeline.ts`、峰值补偿音效表 `sfx.ts` 与工作台清单 `workbench.ts`

## 常用命令
```bash
# 重新采集真机截图与实机流转视频（中文 / 英文）
node tools/capture-textures.mjs
node tools/capture-live-flow.mjs
node tools/capture-en.mjs

# 渲染各规格成片
npm run render            # 16:9 中文主版
npm run render:nobgm      # 16:9 纯音效无 BGM 版
npm run render:en         # 16:9 全英文国际版
npm run render:vertical   # 9:16 竖屏短视频版

# 生成无字幕净底片并导出剪映专业版草稿
npm run render:plate
npm run export:jianying

# 渲后节拍误差与多探针响度审计
uv run --with librosa --with scipy --with numpy --python 3.11 tools/verify-audio-sync.py
```
