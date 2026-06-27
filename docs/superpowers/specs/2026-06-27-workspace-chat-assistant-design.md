# 药价鹰眼页面重构与全局 AI 助手设计规格

## 目标

把当前单页大屏重构为清晰的监管工作台流程，并增加全局 AI 助手。用户进入系统后应能立刻知道：今天要处理什么、当前在哪个环节、下一步是什么、为什么这样判断、哪些数据可以维护。

第一版采用 **A+C 折中方案**：业务页面负责明确流程，全局 AI 助手负责解释、调度和上下文问答。助手第一版只做解释型和调度型能力，不直接执行会改变状态的危险操作。

## 当前问题

当前页面把 KPI、AI 简报、价格表、趋势图、异常详情、AI 报告、工单看板、复核动作放在同一屏幕内。它能完成 Demo 链路，但用户难以判断自己正在做监测、研判、处置还是复核。

主要问题：

- 页面没有稳定的信息架构，所有模块平铺在一个大 Dashboard 中。
- 异常研判、工单处置、复核闭环是三个不同任务，却混在一起。
- AI 简报展示了分析结果，但没有转化为持续可操作的任务列表。
- 用户遇到阻塞时只能猜下一步，例如工单为什么不能闭环。
- 数据维护入口不足，价格记录、异常、工单、规则/标准化数据缺少正常 CRUD 流程。
- 各 API 环节虽有接口，但缺少逐环节可视化验证入口。

## 信息架构

系统拆成五个主页面，保留全局导航和全局 AI 助手。

### 1. 今日工作台

用户一进入系统看到今日监管任务，不再先面对完整大屏。

内容：

- KPI：监测记录、异常候选、高风险、待处置、待复核、闭环率。
- AI 今日简报：总结异常、优先级、推荐动作。
- 我的任务列表：按优先级列出待研判、待创建工单、待推进、待复核、可闭环任务。
- 快捷入口：开始处理第一项、查看全部异常、查看待复核工单。
- 模型状态：远程模型/本地模拟、Base/Key 配置状态、超时兜底状态。

关键交互：

- 点击任务进入对应页面和目标对象。
- 点击“开始处理第一项”进入优先级最高的异常或工单。
- AI 助手可解释任务排序原因。

### 2. 异常研判

专门完成异常从发现到形成研判结论的过程。

布局：

- 左侧：异常队列，支持风险、状态、地区、品种筛选。
- 中间：异常详情，包括价格、医院、地区、风险分、命中维度、历史趋势。
- 右侧或下方：研判步骤流。

步骤流：

1. 命中规则：展示 tender/history/regional/volume/standardize 等维度。
2. AI 取证：调用工具并展示 trace。
3. 红队校验：展示反驳假设、是否挡回、原因和置信度。
4. 研判结论：生成 verdict、riskLevel、confidence、suggestedDisposition。
5. 创建工单：如果已存在工单，显示已进入看板并提供跳转。

关键交互：

- 每一步有明确按钮和状态：未开始、执行中、已完成、失败可重试。
- 点击“生成 AI 研判报告”一次性执行取证和红队校验。
- 创建工单前显示即将创建的类型、负责人、备注。
- 已有工单时不能重复创建。

### 3. 处置工单

专门处理工单状态流转。

布局：

- 看板列：待处置、处置中、已整改、已闭环。
- 右侧工单详情：时间线、关联异常、AI 研判摘要、下一步动作。

关键交互：

- 每张卡显示当前阶段、下一步、阻塞原因。
- 推进状态必须遵守 `pending -> processing -> done -> closed`。
- `done -> closed` 必须先通过复核。
- 已存在工单可从异常研判页面跳转定位。

### 4. 复核闭环

专门处理整改后的复核和归档。

内容：

- 待复核工单列表。
- 复核结果：最新价格、当前偏离度、是否回到阈值内。
- 可闭环工单列表。
- 不能闭环原因。
- 工单事件时间线。

关键交互：

- 点击“AI 复核”调用 `/api/work-orders/:id/recheck`。
- 复核通过后允许闭环。
- 复核不通过时提示继续处置，并保留复核结果。

### 5. 数据与规则

承载数据维护和规则验证，避免把基础数据管理混在监管主流程中。

内容：

- 价格记录 CRUD：列表、详情、新增、编辑、删除。
- 异常记录管理：查看、重新检测、状态修正、人工消解。
- 工单管理：列表、详情、编辑负责人/备注/SLA、查看时间线。
- 规则配置：阈值查看和编辑，包括 tenderRatio、historyMoM、regionalDev、volumeRate。
- 标准化工具：输入原始药品/耗材描述，调用 `/api/tools/standardize`，展示标准医保编码、通用名、规格、剂型、置信度。

CRUD 第一版范围：

- 价格记录：Create、Read、Update、Delete。
- 工单：Read、Update 非状态字段、Archive 需二次确认；不做硬删除，状态流转仍走状态机按钮。
- 异常：Read、Update status/note、重新检测；Delete 不做硬删除，采用 dismissed/archived 状态。
- 规则配置：Read、Update 阈值，保存后可重新检测。

## 全局 AI 助手

助手常驻在全局布局中，可折叠为侧栏或浮动面板。第一版提供解释型和调度型能力，不直接改变业务状态。

### 能力范围

解释型问题：

- “这条为什么异常？”
- “AI 调用了哪些工具？”
- “红队校验挡回了哪些反驳？”
- “这个工单为什么不能闭环？”
- “模型现在是远程还是本地模拟？”
- “这个规则维度是什么意思？”

调度型问题：

- “今天先做什么？”
- “帮我列一个处置任务列表。”
- “哪些工单卡住了？”
- “哪些异常还没有研判？”
- “下一步应该去哪个页面？”

不做的事情：

- 不直接创建工单。
- 不直接推进工单状态。
- 不直接删除或修改价格数据。
- 不暴露 API Key 或完整 `.env` 内容。

### 上下文来源

助手回答必须基于结构化上下文，而不是只靠自由聊天。

上下文包括：

- 当前页面：workspace、anomalies、work-orders、recheck、data-rules。
- 当前选中对象：anomalyId、workOrderId、recordId。
- 当前任务列表：待研判、待处置、待复核、可闭环。
- AI 状态：model、mode、baseConfigured、keyConfigured。
- 规则结果：命中维度、风险分、置信度。
- 研判报告：trace、evidence、challenge、conclusion。
- 工单状态：status、lastEvent、recheck result。

### 后端接口设计

新增接口：

- `GET /api/copilot/context`
  - 返回全局摘要：KPI、任务列表、模型状态、待处理对象摘要。
- `POST /api/copilot/chat`
  - 请求：`{ message, page, selected?: { anomalyId?, workOrderId?, recordId? }, history?: Array<{ role, content }> }`
  - 响应：`{ answer, citations, suggestedTasks, suggestedLinks }`

其中：

- `answer` 是面向监管人员的自然语言回答。
- `citations` 指向结构化对象，例如异常、工单、工具 trace，不使用文件引用。
- `suggestedTasks` 是可展示在助手中的任务卡。
- `suggestedLinks` 是前端路由跳转建议，例如进入异常研判 A-S3。

LLM 策略：

- 优先使用现有 OpenAI-compatible `chat()`。
- 继续使用 `LLM_TIMEOUT_MS` 防止请求拖垮页面。
- 失败时返回模板兜底答案。
- 系统提示必须要求：只基于提供的上下文回答，不编造不存在的数据。

## 路由与前端状态

前端引入轻量页面路由，不必第一版引入完整路由库。如果现有 Vite 应用结构允许，可用 React state 管理页面和选中对象；如果后续需要分享链接，再升级到 React Router。

页面键：

- `workspace`
- `anomalies`
- `work-orders`
- `recheck`
- `data-rules`

全局状态：

- `activePage`
- `selectedAnomalyId`
- `selectedWorkOrderId`
- `selectedRecordId`
- `taskList`
- `copilotOpen`
- `copilotMessages`

## 数据模型补充

新增前端类型：

- `CopilotContext`
- `CopilotMessage`
- `CopilotChatResponse`
- `TaskItem`
- `SuggestedLink`
- `RuleConfig`

新增或扩展后端数据：

- 规则配置表或内存配置持久化到 SQLite。
- 工单备注、SLA、负责人更新接口。
- 异常 note/status 更新接口。
- 价格记录新增、编辑、删除接口。

## API 调用验证清单

每个页面必须有至少一个可验证 API 调用链。

今日工作台：

- `POST /api/detect`
- `GET /api/stats/overview`
- `GET /api/agent/briefing`
- `GET /api/copilot/context`

异常研判：

- `GET /api/anomalies`
- `GET /api/anomalies/:id`
- `POST /api/agent/report/:id`
- `POST /api/work-orders`

处置工单：

- `GET /api/board`
- `GET /api/work-orders`
- `GET /api/work-orders/:id`
- `PATCH /api/work-orders/:id`

复核闭环：

- `POST /api/work-orders/:id/recheck`
- `PATCH /api/work-orders/:id` for closing after successful recheck

数据与规则：

- `GET /api/prices`
- `GET /api/prices/:id`
- `POST /api/prices`
- `PATCH /api/prices/:id`
- `DELETE /api/prices/:id`，价格记录删除需二次确认；如记录已关联异常或工单，则后端拒绝硬删除并提示先归档/关闭关联对象。
- `POST /api/detect`
- `POST /api/tools/standardize`
- `GET /api/rules/config`
- `PATCH /api/rules/config`

全局助手：

- `GET /api/copilot/context`
- `POST /api/copilot/chat`

## 视觉与交互方向

整体不做营销页，不做大英雄区。它是监管工作台，应当安静、明确、可重复操作。

设计原则：

- 左侧全局导航固定，明确当前页面。
- 每页顶部显示“当前任务”和“下一步动作”。
- 主流程使用步骤条或任务轨道，不让用户猜当前阶段。
- AI 助手侧栏使用任务卡和引用对象，而不是只有聊天气泡。
- 对危险操作使用确认或页面按钮，不由助手直接执行。
- 表格和看板保持密度，但每个卡片必须显示下一步。

建议布局：

```text
┌────────────┬──────────────────────────────────────┬────────────────────┐
│ Global Nav │ Page Header: 当前任务 / 下一步        │ AI Assistant        │
│            ├──────────────────────────────────────┤                    │
│ 工作台     │ Main Page Content                    │ 问答 + 任务建议     │
│ 异常研判   │ 列表 / 详情 / 步骤流                 │ 引用当前对象        │
│ 工单处置   │                                      │                    │
│ 复核闭环   │                                      │                    │
│ 数据规则   │                                      │                    │
└────────────┴──────────────────────────────────────┴────────────────────┘
```

## 错误处理

- 全局 API Error 页面只用于启动失败或不可恢复错误。
- 页面内业务错误展示在对应模块，不吞掉整个应用。
- 409 重复工单显示为“已存在工单”，并给跳转。
- LLM 超时显示“模型响应超时，已使用规则兜底”，不阻断主流程。
- CRUD 删除或归档需要确认；已进入监管流程的数据优先归档，不做硬删除。
- 表单校验错误必须指出具体字段。

## 测试与验收

后端测试：

- Copilot context 能返回任务列表和模型状态。
- Copilot chat 在 mock LLM 下能回答调度问题。
- 价格记录 CRUD 正常。
- 工单详情、编辑非状态字段正常。
- 规则配置读写正常。
- 状态机规则不被 CRUD 绕过。

前端验证：

- Web build 通过。
- 每个页面能打开并加载对应 API 数据。
- 从今日工作台任务能跳到对应页面和对象。
- 异常研判能生成报告并创建或识别已有工单。
- 工单处置能推进状态。
- 复核闭环能完成 recheck，并在通过后闭环。
- 数据与规则页能完成价格记录新增、编辑、删除，以及标准化测试。
- 全局助手能回答“今天先做什么”和“这条为什么异常”。

浏览器验证：

- 桌面宽度下全局导航、主内容、AI 侧栏不重叠。
- 移动宽度下 AI 助手收起为抽屉，导航不遮挡内容。
- 所有按钮文字不溢出。
- 异常、工单、复核流程的当前阶段明显可见。

## 分期建议

第一期：页面框架和任务流

- 建立五页面导航。
- 今日工作台任务列表。
- 异常研判页面迁移现有详情、报告、创建工单。
- 工单处置和复核闭环拆页。

第二期：全局 AI 助手

- 新增 `/api/copilot/context` 和 `/api/copilot/chat`。
- 前端助手侧栏。
- 支持解释型和调度型问题。
- 支持跳转建议，不直接执行写操作。

第三期：数据与规则 CRUD

- 价格记录 CRUD。
- 工单非状态字段编辑。
- 异常状态/备注更新。
- 规则配置读写和重新检测。

第四期：验证与演示脚本更新

- 补后端测试。
- 浏览器流程验证。
- 更新 Demo 脚本和实现计划。
