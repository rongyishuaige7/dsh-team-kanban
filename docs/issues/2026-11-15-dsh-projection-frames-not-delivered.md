> 已提交：https://github.com/deepseek-ai/deepseek-harness/discussions/13416（General）

**环境**

- DeepSeek Harness `0.2.2-rc.3`（desktop profile，Electron 44.7.0 / Node 24.21.0），macOS arm64
- 第三方客户端插件，用 `useProjection('agentTeam')` 读取团队任务投影，渲染在右侧栏标签页

**现象**

团队会话运行中，任务从 `pending → in_progress → completed` 推进时，插件读到的投影值完全不变；只有「切到别的会话再切回」或「重启后重新打开该会话」才变成最新状态。

**关键证据**

1. 会话状态是实时的：`ctx.remote.$on('api-session/status')` 正常，`running` 在一次约 4 分钟的任务里 `0 → 1 → 0`。

2. 投影推送全程为零：直接订阅（绕开 React，排除组件订阅问题）

   ```js
   const binding = ctx.sessions.binding(sessionId)
   const face = binding.session.projections.faceOf('agentTeam')
   face.subscribe(() => console.log('changed', face.getSnapshot()))
   ```

   在 `06:15:30 → 06:19:39` 之间**没有任何回调**；而同一时段该会话日志里有 12 条 `team/task` 事件（完整的 pending → in_progress → completed 生命周期）。

3. 重开即恢复：重启后重新打开同一会话，基线里立刻是 4 个「已完成」任务。

**排除项**

- 不是 hook 绑定错误：同一时段内 `title` 投影在该会话出现过更新（基线来源）。
- 不是组件不重渲染：face 直订同样零通知，说明 store 没有被写入。
- 不是加载了旧代码：桌面端以符号链接安装插件，宿主启动时间晚于最后一次改动。

**宿主侧计算是正常的**

通过主进程方法主动读取，返回的是**正确的最新值**：

```js
const r = await ctx.remote.session.projections({ sessionId })
// r.value.values.agentTeam.tasks 的状态逐跳变化：ccpp → ccip → cccp → ccci → cccc
```

也就是说投影计算正常，缺的是 **control stream 上的 `projection` 帧投递**（`createSessionControlStream` → `manager.handleControlFrame`）。客户端因此只在「打开会话的基线」和「会话列表 cached 块」时更新。

**期望行为**

对已 follow 的 Session，control stream 应持续投递 `type: "projection"` 帧，使 `useProjection(key)` 能反映运行中的状态变化。

**影响范围**

任何依赖 `useProjection` 的实时 UI 都会冻结，包括官方 TeamBoard（会话标题栏 subagent 面板里的任务列表）。建议用官方团队模式跑一次多智能体任务即可观察：任务推进时该面板是否停在初始状态。

**临时绕过（供参考）**

在 `running` 为真或仍有未完成任务时，每 2.5 s 调 `remote.session.projections()` 拉一次整值；空闲即停、失败 3 次即停。这能恢复实时性，但属于对宿主缺陷的兜底，不是首选方案。

如果这是已知问题或需要更多日志（我可以提供带时间戳的事件序列、face 订阅计数、会话几何采样），请告知。
