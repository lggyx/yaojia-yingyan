# 药价鹰眼 — 页面重构与全局 AI 助手执行计划

**前置**：设计文档已定稿，见 `docs/superpowers/specs/2026-06-27-workspace-chat-assistant-design.md`

当前分支 `feat/ai-copilot-workflow`，66 个文件已修改（格式/风格统一）但**未 commit**。执行前先确认这些改动是否要保留。

---

## 分期总览

| 阶段 | 内容 | 依赖 |
|------|------|------|
| **P1** | 页面框架 + 任务流（导航、5 页面、迁移现有内容） | 无 |
| **P2** | 全局 AI 助手（后端 copilot 路由 + 前端助手侧栏） | P1 |
| **P3** | 数据与规则 CRUD（价格、规则、异常状态） | P1 |
| **P4** | 测试 + 验证 + 更新文档 | P1-P3 |

---

## P1：页面框架与任务流

### 1.1 新增前端类型（`apps/web/src/types.ts`）

追加以下接口：

```typescript
// ——— 页面路由 ———
export type PageKey = "workspace" | "anomalies" | "work-orders" | "recheck" | "data-rules";

// ——— 全局 AI 助手 ———
export interface TaskItem {
  id: string;
  type: "investigate" | "create_work_order" | "advance" | "recheck" | "close";
  label: string;
  targetPage: PageKey;
  targetId?: string;
  priority: "high" | "mid" | "low";
  anomalyId?: string;
  workOrderId?: string;
}

export interface SuggestedLink {
  label: string;
  page: PageKey;
  id?: string;
}

export interface CopilotContext {
  stats: StatsOverview;
  brief: AiBriefing | null;
  tasks: TaskItem[];
  modelStatus: AiModelStatus;
  pendingAnomalyCount: number;
  pendingReviewCount: number;
}

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CopilotChatResponse {
  answer: string;
  citations: Array<{ type: string; id: string; label: string }>;
  suggestedTasks: TaskItem[];
  suggestedLinks: SuggestedLink[];
}

// ——— 数据维护 ———  P3 会用
export interface RuleConfig {
  tenderRatio: number;
  historyMoM: number;
  regionalDev: number;
  volumeRate: number;
}
```

### 1.2 左侧全局导航（`apps/web/src/components/SideNav.tsx`）

新文件。硬编码 5 个页面入口：

```
┌─────────────────────┐
│  药价鹰眼 (logo)     │
│─────────────────────│
│  ◉ 今日工作台        │ ← workspace
│  ○ 异常研判          │ ← anomalies
│  ○ 处置工单          │ ← work-orders
│  ○ 复核闭环          │ ← recheck
│  ○ 数据与规则        │ ← data-rules
└─────────────────────┘
```

- Props: `activePage: PageKey, onNavigate: (page: PageKey) => void`
- 当前页高亮，点击触发 `onNavigate`
- 纯左侧固定，宽度 ~200px，全屏高度

### 1.3 5 个页面组件（`apps/web/src/components/`）

#### WorkspacePage.tsx
迁移自当前 `Dashboard.tsx` 内容：
- KPI 卡片（`KpiCards.tsx`）
- AI 简报（`AiBriefingPanel.tsx`）
- 任务列表（内联渲染，无需独立组件）
- 模型状态指示器
- 快捷操作按钮（"开始处理第一项"→跳转对应页面）

#### AnomaliesPage.tsx
三区布局：
- **左侧**：异常队列列表（过滤条件：风险级别、状态）
- **中间**：异常详情 + 价格记录 + 趋势图
- **右侧/底部**：研判步骤流步骤条（4 步：命中规则 → AI 取证 → 红队校验 → 研判结论 → 创建工单）
- 步骤 2/3/4 的按钮逻辑从 `App.tsx`（`investigateSelected`, `challengeSelected`, `reportSelected`）搬过来
- 步骤 5 的创建工单从 `App.tsx`（`createWorkOrderFromReport`）搬过来
- 复用现有 `AnomalyDetail.tsx`, `AgentTrace.tsx`, `ChallengePanel.tsx`, `TrendChart.tsx`

#### WorkOrdersPage.tsx
- 看板 4 列（迁移自 `KanbanBoard.tsx`）
- 右侧工单详情面板：时间线、关联异常、下一步动作
- 推进按钮：按 `pending→processing→done→closed` 状态机
- `done→closed` 必须先通过复核

#### RecheckPage.tsx
- 待复核工单列表
- 点击"AI 复核"调 `POST /api/work-orders/:id/recheck`
- 显示复核结果（最新价格、偏离度、是否可闭环）
- 复核通过后允许"闭环"按钮（调 `PATCH /api/work-orders/:id`）
- 不能闭环原因展示

#### DataRulesPage.tsx
- P3 填充。P1 先放占位 UI
- Tab 分组：价格记录 / 规则配置 / 标准化工具
- 每个 Tab 显示页面标题和"建设中"状态

### 1.4 重构 `App.tsx`

从单页大屏改为多页路由：

```typescript
export default function App() {
  const [activePage, setActivePage] = useState<PageKey>("workspace");
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);

  // 全局数据加载（stats, records, anomalies, board, aiStatus, aiBriefing）— 保留现有 useEffect
  // 但改为懒加载或按页面加载，减少首屏请求

  const pageContent = {
    workspace: <WorkspacePage ... />,
    anomalies: <AnomaliesPage ... />,
    "work-orders": <WorkOrdersPage ... />,
    recheck: <RecheckPage ... />,
    "data-rules": <DataRulesPage ... />,
  };

  return (
    <div className="flex h-screen">
      <SideNav activePage={activePage} onNavigate={setActivePage} />
      <main className="flex-1 overflow-auto">
        {pageContent[activePage]}
      </main>
    </div>
  );
}
```

保留全局状态提升：
- `selectedAnomalyId`, `selectedWorkOrderId` — 页面间跳转用
- 异常、工单、看板数据仍由 App level 管理（或抽到 context）

### 1.5 后端新增接口

**价格记录 CRUD**（`apps/api/src/routes/prices.ts` 追加）：

```typescript
r.post("/prices", async (c) => { /* 新增 */ });
r.patch("/prices/:id", async (c) => { /* 编辑 */ });
r.delete("/prices/:id", async (c) => { /* 硬删除拒绝+软删除 */ });
```

**规则配置**（新文件 `apps/api/src/routes/rules.ts` 或追加到 `prices.ts`）：

```typescript
// GET /api/rules/config — 返回当前阈值
// PATCH /api/rules/config — 更新阈值
```

**异常更新**（`apps/api/src/routes/anomalies.ts` 追加）：

```typescript
r.patch("/anomalies/:id", async (c) => { /* 更新 status/note */ });
```

**RULES 路由注册到 `index.ts`**：

```typescript
import rules from "./routes/rules";
app.route("/api", rules);
```

---

## P2：全局 AI 助手

### 2.1 后端 Copilot 路由

新文件 `apps/api/src/routes/copilot.ts`，两个接口：

**`GET /api/copilot/context`**
- 聚合返回：KPI + AI 简报 + 任务列表 + 模型状态
- 任务列表基于异常/工单数据生成：
  - 待研判：status=pending 的异常
  - 待创建工单：status=confirmed 但无工单的异常
  - 待推进：work_orders status in (pending, processing, done)
  - 待复核：work_orders status=done 且未 recheck 或 recheck_failed
  - 可闭环：work_orders 已 recheck_passed 但未 closed

```typescript
interface CopilotContextResponse {
  stats: StatsOverview;
  brief: AiBriefing | null;
  tasks: TaskItem[];
  modelStatus: AiModelStatus;
}
```

**`POST /api/copilot/chat`**
- 请求：`{ message, page, selected?, history? }`
- 构造 system prompt + 上下文注入当前页面 + 选中对象数据
- 调用现有 `llm.ts` 的 `chat()` 方法
- 响应：`{ answer, citations, suggestedTasks, suggestedLinks }`
- 超时兜底：返回模板答案 "当前数据不足，请稍后重试"

### 2.2 前端助手侧栏

新组件 `apps/web/src/components/CopilotSidebar.tsx`：
- 折叠/展开按钮（默认折叠）
- 输入框 + 发送按钮
- 消息气泡列表（用户 question → 助手 answer）
- assistant 消息下方展示 suggestedTasks 和 suggestedLinks 作为可点击卡片
- citations 展示为引用标签（可点击跳转）

集成到 `App.tsx` 的全局布局中：

```typescript
<div className="flex h-screen">
  <SideNav />
  <main>{pageContent}</main>
  <CopilotSidebar />
</div>
```

### 2.3 扩展 `api.ts`

```typescript
getCopilotContext: () => call("/copilot/context"),
postCopilotChat: (body: unknown) => call("/copilot/chat", jsonInit("POST", body)),
```

### 2.4 copilot 路由注册到 `index.ts`

```typescript
import copilot from "./routes/copilot";
app.route("/api", copilot);
```

---

## P3：数据与规则 CRUD

### 3.1 价格记录 CRUD（前端）

`DataRulesPage.tsx` 的"价格记录"Tab：
- 列表：复用现有价格表样式，每行加编辑/删除按钮
- 新增：弹窗表单（miCode, generic, brand, manufacturer, spec, form, category, price, tenderPrice, etc.）
- 编辑：弹窗预填现有值
- 删除：二次确认；若有关联异常/工单，后端返回 409 提示先归档

### 3.2 规则配置读写

`DataRulesPage.tsx` 的"规则配置"Tab：
- 4 个阈值输入框：tenderRatio, historyMoM, regionalDev, volumeRate
- 保存按钮 → `PATCH /api/rules/config`
- 重新检测按钮 → `POST /api/detect` 带自定义阈值
- 后端读/写存储：SQLite `rule_config` 表或内存文件

### 3.3 标准化工具

`DataRulesPage.tsx` 的"标准化工具"Tab：
- 输入框：输入原始药品/耗材描述
- 输出：展示标准化结果（医保编码、通用名、规格、剂型、置信度）
- 复用已有 `POST /api/tools/standardize`

### 3.4 异常状态更新

`AnomaliesPage.tsx` 追加操作：
- 异常详情底部：状态修正按钮（人工消解、重检测）
- 调 `PATCH /api/anomalies/:id` → 更新 status 或 note

### 3.5 SQLite 规则配置存储

`apps/api/src/db/schema.ts` 追加：

```sql
CREATE TABLE IF NOT EXISTS rule_config (
  key TEXT PRIMARY KEY, value TEXT
);
```

种子数据在 `seed.ts` 写入默认阈值。

---

## P4：测试、验证与文档更新

### 4.1 后端测试

新增测试文件：
- `apps/api/src/routes/copilot.test.ts` — context 返回结构和 chat 响应
- `apps/api/src/routes/prices.test.ts` — CRUD 操作验证
- `apps/api/src/routes/rules.test.ts` — 配置读写验证
- `apps/api/src/routes/workorders.test.ts` — 追加非状态字段编辑的测试

验证清单：
- Copilot context 能返回任务列表和模型状态
- Copilot chat 在 mock LLM 下能回答调度问题
- 价格记录 CRUD 正常
- 规则配置读写正常
- 状态机规则不被 CRUD 绕过（删除有关联异常的记录被拒）

### 4.2 前端验证

- `bun run build:web` 通过
- 每个页面打开并加载对应 API 数据（无白屏、无 404）
- 从今日工作台任务链接能跳转到对应页面和对象
- 异常研判步骤流：生成报告 → 创建工单（或识别已有工单）
- 工单处置：推进状态 → 复核 → 闭环
- 数据与规则：价格记录新增/编辑/删除 → 标准化测试
- 全局助手回答"今天先做什么"和"这条为什么异常"

### 4.3 更新 Demo 脚本

`docs/药价鹰眼-Demo脚本.md` 更新：
- 加入页面跳转流程（工作台→异常研判→工单处置→复核→数据管理）
- 加入全局 AI 助手交互演示
- 加入数据 CRUD 演示

### 4.4 更新实现计划

`docs/药价鹰眼-实现计划.md` 更新为当前进度。

---

## 文件变更清单

### 新文件
| 文件 | 归属阶段 |
|------|---------|
| `apps/web/src/components/SideNav.tsx` | P1 |
| `apps/web/src/components/WorkspacePage.tsx` | P1 |
| `apps/web/src/components/AnomaliesPage.tsx` | P1 |
| `apps/web/src/components/WorkOrdersPage.tsx` | P1 |
| `apps/web/src/components/RecheckPage.tsx` | P1 |
| `apps/web/src/components/DataRulesPage.tsx` | P1 (P3 填充) |
| `apps/web/src/components/CopilotSidebar.tsx` | P2 |
| `apps/api/src/routes/copilot.ts` | P2 |
| `apps/api/src/routes/rules.ts` | P1 (后端) |
| `apps/api/src/routes/agents.md`（可选日志） | P4 |

### 修改文件
| 文件 | 变更 |
|------|------|
| `apps/web/src/App.tsx` | 从单页改为多页路由 + 全局布局 |
| `apps/web/src/types.ts` | 追加 PageKey, TaskItem, Copilot* 等类型 |
| `apps/web/src/lib/api.ts` | 追加 copilot, prices CRUD, rules 等 API |
| `apps/api/src/index.ts` | 追加 copilot, rules 路由注册 |
| `apps/api/src/routes/prices.ts` | 追加 POST/PATCH/DELETE |
| `apps/api/src/routes/anomalies.ts` | 追加 PATCH |
| `apps/api/src/db/schema.ts` | 追加 rule_config 表 |
| `apps/api/src/db/seed.ts` | 写入默认阈值数据 |

### 删除（可选）
- `apps/web/src/components/Dashboard.tsx` — 内容迁移到 WorkspacePage 后可删
- `apps/web/src/components/KanbanBoard.tsx` — 内容迁移到 WorkOrdersPage 后可删

---

## 执行顺序建议

```
P1.1 新增 types + SideNav + 5 个页面骨架 (先占位)
P1.2 重构 App.tsx 为多页路由
P1.3 逐个填充页面内容（Workspace → Anomalies → WorkOrders → Recheck）
P1.4 后端新增 rules route + prices CRUD + anomalies PATCH

P2.1 后端 copilot route
P2.2 前端 CopilotSidebar
P2.3 App.tsx 集成侧栏

P3 填充 DataRulesPage（价格 CRUD + 规则配置 + 标准化工具）

P4 测试 + 文档
```

每一阶段以 `bun test` + `bun run build:web` 通过为验收标准。