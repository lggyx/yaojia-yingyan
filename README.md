# 药价鹰眼

医保医药价格异常预警与闭环处置智能体。项目用规则引擎先稳定检出异常，再由 Agent 取证解释、红队对抗校验，最后进入工单看板完成整改复核。

## 功能进度

- Mock 剧本数据、SQLite seed、价格/历史/异常/统计 API 已完成。
- 多维规则引擎已覆盖中标价、历史涨幅、区域偏离、用量履约、替代药挤占。
- Agent 路由已支持推理取证、对抗校验、标准化工具。
- 工单路由和闭环看板 API 已支持创建、推进、复核、关闭。
- Web 端已具备监管驾驶舱、价格明细、趋势图、异常详情、推理轨迹、对抗校验、闭环看板。

## 技术栈

- Runtime: Bun
- API: Hono + bun:sqlite
- Web: React + Vite + Tailwind CSS + ECharts
- Workspace: Bun workspaces

## 本地运行

Windows PowerShell 可能会因执行策略拦截 `bun.ps1`，本项目脚本优先使用 `bun.cmd`。

```powershell
npm install -g bun
bun install
bun run seed
bun run dev
```

启动后访问：

- API: `http://localhost:8787`
- Web: `http://localhost:5173`

如果需要手动分开启动：

```powershell
Set-Location apps/api; bun run dev
Set-Location apps/web; bun run dev
```

## 验证

```powershell
bun test
Set-Location apps/web; bun run build
```

当前通过的核心检查：18 个 Bun tests；Web production build。

## 关键接口

- `POST /api/detect`：运行规则检测并写入异常候选。
- `GET /api/stats/overview`：监管大屏 KPI。
- `GET /api/prices`、`GET /api/prices/:id`：价格列表与历史趋势。
- `GET /api/anomalies`、`GET /api/anomalies/:id`：异常列表与详情。
- `POST /api/agent/investigate/:id`：Agent 取证解释。
- `POST /api/agent/challenge/:id`：红队对抗校验。
- `POST /api/work-orders`、`PATCH /api/work-orders/:id`、`POST /api/work-orders/:id/recheck`：工单闭环。
- `GET /api/board`：闭环看板。

## 目录

- [docs/药价鹰眼-方案设计.md](docs/药价鹰眼-方案设计.md)
- [docs/药价鹰眼-实现计划.md](docs/药价鹰眼-实现计划.md)
- [docs/药价鹰眼-Demo脚本.md](docs/药价鹰眼-Demo脚本.md)