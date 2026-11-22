# dsh-team-kanban v0.6.0 产品宣传片（`launch-v6`）终检验收报告

- **成片产物**：
  - 带 BGM 主版：`docs/assets/kanban-launch-v6.mp4`（`1920×1080` · `30fps` · `1124f` / `37.47s` · `H.264 + AAC 48kHz`）
  - 纯拟音无 BGM 版：`docs/assets/kanban-launch-v6-nobgm.mp4`（同源同一时间线 `inputProps: { bgm: false }`，画面与 SFX 逐帧一致）
- **历史资产保护**：`docs/assets/kanban-launch-v5.mp4` 与 `docs/assets/kanban-launch-v5-nobgm.mp4` 完全保留未覆盖。
- **审查执行说明**：遵循用户全局规则（未显式授权子代理委派时不启动额外子代理），采用成片逐镜头关键帧抽帧像素核验 + `tools/verify-audio-sync.py` 48kHz FFT 归一化互相关独立实测回执（详见 `analysis/post_render_audit.json`）。

---

## 一、`final-review.md` 逐项核验

### P — 产品目标
- `P1 ✓` 产品定位（DeepSeek Harness 右侧栏原生 `agentTeam` 活体看板 `v0.6.0`）与精密遥测/因果接力核心卖点清晰（`f80`、`f1060`）。
- `P2 ✓` 聚焦 `v0.6.0` 五大升级重点：机械字轮与校准进度槽、写冲突对端联动与一键复制协调指令、`920ms` 翡翠因果接力与倾角 FLIP、`360px` 窄栏左侧微弧血缘与离席追帧、暗室关键路径星图点亮与零残留停用。
- `P3 ✓` 零虚构宣称，所有状态与交互均与 `client.js` (`CLIENT_REV = '0.6.0'`) 及 `prototype/team-kanban-prototype.html` 1:1 对应。
- `P4 ✓` 融合视觉方向（光学白瓷校准台 + `15°` 晨昏扫入暗室 + 暗室星图高潮 + 白瓷发布会收尾）完整落地于 8 段序列。

### F — 功能完整性
- `F1 ✓` 五项必展功能均有独立高清镜头：`S2`（`f220` `@4x` 冲突对端虚线 + `↵ 已复制`）、`S3`（`f357–534` 实机字轮 + 翡翠接力 + 倾角 FLIP + 战报条）、`S4`（`f644` 宽屏离席追帧胶囊 + `360px` 窄栏左侧垂直 C 形微弧）、`S5`（`f826` 暗室关键路径翡翠星图 + `f880` 防误触零残留停用）。
- `F2 ✓` 每镜各司其职，无重复动画手法、无重复标语。
- `F3 ✓` 真实任务上下文（`#1`–`#6`）清楚传达上下游阻塞与解扣关系。

### V — 视觉方向
- `V1 ✓` 严格复用 `--dsw-alias-*` 冷白/碳黑表面、科技蓝 `#4176E6`、翡翠绿 `#22C55E`、琥珀 `#DD8629` 与系统无衬线 / `SF Mono` 字阶。
- `V2 ✓` 缓动、单次过冲（`bezier(0.34,1.4,0.44,1)`）与静止呼吸预算一致。
- `V3 ✓` 零漂移至暖黄纸墨或廉价赛博紫粉霓虹。
- `V4 ✓` 禁用效果（手持抖动、群发卡片泛光、合成器电子提示音）零出现。

### S — 镜头卡与 Gallery 变体
- `S1–S6 ✓` 全部 6 类选用卡片（`brand-ink-open`、`spotlight-hero-card`、`paper-title-card`、`depth-layer-moves · multiplane`、`theme-switch-moves · theme-sweep-toggle`、`cursor-flyover`、`outro-group-photo-launch`）均核对准确 Demo TSX，完整保留关键时值与防坑写法。

### B — 分镜一致性
- `B1–B4 ✓` 8 段序列严格对齐 `b0–b76`（`1124f`）；`S1` 字标静止 `48f`（`1.60s`）、`S2` 落槽静止 `33f`（`1.10s`）、`S3` 收口静止 `32f`（`1.07s`）、`S4` 暗室静止 `62f`（`2.07s`）、`S5` 星图静止展示 `56f`（`1.87s`）、`S6` 定版静止 `85f`（`2.83s`），均跨过 `R1/R2` 硬底线。

### D — 数据与素材安全
- `D1–D5 ✓` 100% 采自仓库公开脱敏原型 `prototype/team-kanban-prototype.html`（`@2x/@3x/@4x` 真实截图 + `52.9 fps` 采样流转视频），零隐私或密钥泄露。

### A — 音频与节奏（实测数据见 `analysis/post_render_audit.json`）
- `A1 ✓` `house-vibez.mp3` 底床音量 `0.31` 首尾淡入淡出，峰值 `-1.7 dB` 零削波。
- `A2 ✓` 4 项尖锐拟音探针成片实测残差：`s2-copy = +0.27f`、`s4-toggle = +0.29f`、`s5-star-click = +0.27f`、`s6-impact = +0.27f`（全部 `≤ 1.0f`）。
- `A3 ✓` 全片 8 处节拍切点渲后回测最大绝对误差 **`0.49 帧`**（远优于 `≤ 3.0 帧` 门槛）。
- `A4 ✓` 片尾 `riser-cine` → `impact-deep-whoosh` → `shimmer-sparkle-sweep` 峰值句式完整。
- `A5 ✓` 所有长样本均由 `<Sequence durationInFrames={...}>` 精确截断。
- `A6 ✓` 纯拟音轨 8 段峰值介于 `-10.30 dBFS` 至 `-4.28 dBFS`，段段清晰可闻且无削波。
- `A7 ✓` 100% 采用真实物理微动开关、快门、风声与晶体泛音，零合成 `bleep/tone`。
- `A8 ✓` 同源输出带 BGM 版与无 BGM 版。
- `A9 ✓` `SOURCE_BEAT0 = 0.061121s` 与 `OUTPUT_AUDIO_OFFSET_SEC = 0.0427s` 独立分账（渲后实测偏移 `0.042333s`，仅差 `0.37ms`）。

---

## 二、`aesthetic-rules.md` 视觉技术门禁核验

- `R1–R4 ✓` 品牌字标停留 `>1.5s`，相机级重音仅 `b8` 与 `b64` 两处（间隔 `56` 拍），零逐拍震屏。
- `Q1–Q2 ✓` 真实 `@2x/@3x/@4x` 栅格纹理配合 `PageCam` CSS `zoom` 布局级缩放，成片抽帧 `mp4-f220-verify.png` 文字刀刻锐利。
- `Q3–Q5 ✓` 零相机抖动；扫描光束与按钮波纹严格限制在单一主角圆角内（`mp4-f220-verify.png`）。
- `Q6–Q9 ✓` 列表阅读正视、单卡特写左侧微倾（`rotY 22°`），片尾 8 枚全功能真切片向心过冲落位压实（`s6-outro-v2.png`）。
- `Q10–Q11 ✓` 底部叙事字幕实测字高 `60px`（`≥56px`），阶段签与 CLI 命令 `32px–35px`（`≥32px`）；`S4 → S5` 同暗室底色无缝衔接，消除明暗闪切。
