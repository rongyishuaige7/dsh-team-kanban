# 2026-11-15 右侧栏不自动弹出、看板不实时刷新

- 状态：已解决（workaround 依赖宿主缺陷）
- 关联提交：`94d8a92`（打开时序与自关闭）、`4f31467`/`a026b22`（兜底拉取）、`7836666`（0.2.0 发布）
- 影响版本：插件 `0.1.0 ~ 0.1.3`（故障）→ `0.2.0`（解决）
- 宿主：DeepSeek Harness `0.2.2-rc.3`，`desktop` profile

## 1. 一句话结论

两个互不相干的缺陷叠在一起：**(A)** 右侧栏从收起状态程序化打开时，宿主的 Seat 会把 `expanded` 当场撤回，导致「标签进了 store、列永远不滑出」；**(B)** 桌面端客户端收不到 Session 投影的实时帧，`agentTeam` 只在打开会话时的基线里出现，表现为「切走再切回才刷新」。A 用「先占轨道再开标签」修掉，B 用「运行期有界拉取」兜底。

## 2. 原始现象

1. 主智能体派发任务后，右侧栏不会自动滑出「任务板」；手动切到别的会话再切回来，看板才出现。
2. 看板一旦打开，任务从 `pending → in_progress → completed` 推进时，卡片、计数、进度条、标题角标全部冻结；切会话回来才一次性变成最新。

## 3. 环境与关键配置

| 项 | 值 |
|---|---|
| 宿主 | `/Applications/DeepSeek Harness.app`，`0.2.2-rc.3`（asar 内 `src/` 未压缩，可直接读宿主源码） |
| profile | `~/.dsh/profiles/desktop`；插件以 **symlink** 指向仓库，磁盘即运行代码 |
| 插件声明 | `inject: [slots, locale, sidebarRight, sidebarRightTabs, sessions, layout, remote, remote.session]` |
| 客户端模块 | 启动时快照 `client.js`（rev 按 mtime/size），**改完必须完整退出宿主** |
| 可观测性 | 渲染器无日志落盘 → 诊断走 localStorage 旁路写入，再从磁盘读 |

## 4. 排查时间线

| 时间 | 动作 | 结果 |
|---|---|---|
| 第 1~3 轮 | `useProjection` → `useSessions` 组合；`openTabIn` 多重试；唤醒侧栏 | 全部无效 |
| 第 4 轮 `a2bcf41` | 改「优先 projectedTeam」、接 `registerCloseHandler`、加 500ms 强制重渲染 | 全部无效 |
| 11-15 03:5x | 确认 profile 是 symlink、应用启动时间晚于最后一次改动 | 排除「装的是旧拷贝」 |
| 11-15 04:2x | 反读宿主 `dsh-client-ui-sidebar-right` 源码，定位 `if (shown && !canShow) setExpanded(false)` | 得到根因 A 的模型 |
| 11-15 04:42 `94d8a92` | 改为「先 `ctx.layout.openRightbar` 再 `openTabIn`」+ 三态判定 + 自关闭标记 | 仍未弹出 |
| 11-15 05:36 | 读 localStorage 布局记录：`kind:"team-board"`、`expanded:true` **已写入** | 证明打开指令到达了 store，问题在渲染层 |
| 11-15 05:38~05:41 | 加 localStorage 诊断（rev/几何/任务签名） | 看到列宽 0→2→6→576、`checkVisibility:true`；也看到 3 分钟「零日志」窗口 |
| 11-15 05:50 | 对照会话日志：3 分钟内 12 次 `team/task`，客户端 watcher 一次未触发 | 指向根因 B |
| 11-15 05:56 | 探针写错 API（`ctx.sessions.projectionValues` 不存在），结论作废 | 误判，已修正 |
| 11-15 06:05 | 对照 `title` / `subagentCatalog` 同通道投影 | 同会话 `title` 曾实时变化 → 通道不是全死 |
| 11-15 06:15 `abb2d08` | 直接订阅 `binding.session.projections.faceOf('agentTeam')` + `running` 对照 | **`running` 0→1→0 正常，face 四分钟零通知** → 帧未到达 |
| 11-15 06:25 `4f31467` | 兜底：`remote.session.projections()` 有界拉取 | 首次报 `cannot get property "remote.session" without inject` |
| 11-15 06:38 `a026b22` | `inject` 补 `remote.session` | 拉取生效，`st` 逐跳 `ccpp→ccip→cccp→ccci→cccc` 并触发重渲染 |
| 11-15 06:5x | 新会话复测 | 自动弹出 + 实时变化均通过 |

## 5. 失败尝试与误判（避免重走）

1. **以为是模块缓存**：profile 是 symlink、启动时间晚于改动，已排除；再靠 localStorage 里的插件痕迹确认「新代码确实在跑」。
2. **以为 `useProjection` 不重渲染**：给面板加 500ms `setTick` 仍无变化 → 说明是数据层没到，不是渲染层。
3. **以为右侧栏折叠时丢弃打开指令**：布局已持久化 `expanded:true`，指令没丢，丢的是「列」。
4. **误用 `ctx.sessions.projectionValues`**：`ISessions` 没有该方法（`pv:"undefined"`），据此得出的「store 没动」结论无效，必须用 `binding().session.projections.faceOf()`。
5. **只加 `remote` 不够**：Cordis 要求子服务显式声明，`ctx.remote.session` 必须配 `'remote.session'`。

## 6. 根因分析

### 根因 A：打开时序竞态（渲染层）

`dsh-client-ui-sidebar-right/src/client/shell/SidebarRight.tsx`：

```ts
const shown = active && surface !== undefined && surface.layout.expanded
useEffect(() => { if (shown && !fullscreen && !canShow) actions.setExpanded(sessionId, false) }, …)
useEffect(() => { syncPresentation({ shown, track, fullscreen }) }, …)
```

`canShow` 来自 `AppFrame`：`rightbarTrack ? 宽度 : 0`。列收起时 `canShow=false`，插件 `openTabIn` 置 `expanded=true` 后，同一轮 commit 里 `setExpanded(false)` 把打开撤销，另一条 effect 又把列打开 → 下一轮 `shown=false` 再关列。净结果：标签在 store（并被持久化），列不滑出。切会话能出现，是因为走的是「布局恢复 + Seat 重新挂载」的另一条路径。

### 根因 B：投影帧不投递（数据层）

- 会话状态走 `ctx.remote.$on('api-session/status')`，**正常**（`running` 0→1→0）。
- 投影帧走**单条可重连 control stream**（`createSessionControlStream` → `manager.handleControlFrame`），在桌面端 `0.2.2-rc.3` **全程静止**。
- 直接订阅 `faceOf('agentTeam')` 四分钟零通知；重新打开会话时由历史基线 `seed()` 补上 → 表现为「切会话才刷新」。

## 7. 最终解决方案（对应 `client.js`）

| 措施 | 位置 | 说明 |
|---|---|---|
| 先占轨道再开标签 | `attemptOpen()` | `ctx.layout.openRightbar(true,false)` → `openTabIn`；失败则 `closeRightbar()` 回收 |
| 布局恢复补轨道 | `ensureColumnOnce()` | 标签已存在但列宽 <8px 时一次性补轨道；用户之后手动折叠不再干扰 |
| 三态判定 | `absent / hasTask` | `team === undefined` 视为「未知」不动作，只有明确为空才关标签 |
| 自关闭标记 | `closeBoardTab()` + close handler | 插件自己关的不记入 `dismissedSessions`，避免「关一次永不复活」 |
| 有界拉取兜底 | `pull` 效果 + `useFallbackTeam` | `running` 或仍有未完成任务时每 2.5s 取 `remote.session.projections()`；空闲即停，连续失败 3 次即停 |
| 新旧合并 | `teamWeight()` / `freshestTeam()` | 按任务 `revision` 总和取最新，过期投影不会盖住新拉取 |
| 版本可核对 | `CLIENT_REV` / `data-tkb-rev` / `window.__teamKanbanRev` | 实机一眼确认加载的是哪一版 |

同时删除：500ms 空转 `refreshProjections` 轮询、标题常驻 `setInterval`、全部临时诊断代码。

## 8. 验证方法与证据

1. **版本**：`window.__teamKanbanRev === '0.2.0'`；`document.querySelector('[data-tkb-rev]').dataset.tkbRev`。
2. **自动弹出**：新会话派任务 → 2~4s 内右栏滑出；日志/几何采样中列宽 `0 → 576`、`checkVisibility: true`。
3. **实时刷新**：任务状态逐跳触发重渲染（实测 `ccpp → ccip → cccp → ccci → cccc`）。
4. **不打扰**：手动关闭后不再自动弹回；手动折叠后不被强制撑开；任务清空后自动关闭。
5. **成本**：会话空闲时零拉取；完成后停止。

## 9. 复用经验

1. **先证伪「装的不是这份代码」**：symlink/启动时间/localStorage 痕迹，比读代码更快。
2. **区分「渲染层」与「数据层」**：加一个不经过 React 的 store 订阅（`faceOf().subscribe`），一次就能定性。
3. **找同通道的对照量**：`title` / `subagentCatalog` / `running` 走不同载体，对照它们能判断「通道死」还是「某个 key 没推」。
4. **宿主没有可观测性时，用 localStorage 做旁路日志**，再用脚本从 leveldb 里解码读回（值为 ASCII 时 UTF-8、含中文时整段 UTF-16LE，且 ldb 有前缀压缩、退出会触发压缩 → 让应用保持运行再读）。
5. **程序化打开侧栏要按宿主 effect 的顺序思考**：任何「A 置真、B 又依赖 C」的 UI 状态，都要先把 C 准备好。
6. **Cordis 子服务必须显式 inject**（`remote.session`），错误信息是 `cannot get property "…" without inject`。

## 10. 后续事项

- [ ] 向 DSH 反馈：桌面端 control stream 不向客户端投递投影帧（证据：`running` 正常、face 零通知、重开即恢复、官方 TeamBoard 同样受影响）。
- [ ] 宿主修复后按 `DESIGN.md §9.3` 移除兜底拉取，恢复纯投影驱动。
- [ ] 视需要给「任务完成后清空」增加快照保留（当前按 PRD T3 自动关闭）。
