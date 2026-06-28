import { Hono } from "hono";
import { getDb } from "../db/client";
import { getLlmStatus, chat } from "../agent/llm";
import { generateBriefing } from "../agent/briefing";

const r = new Hono();
const ok = (data: unknown) => ({ code: 0, data, msg: "ok" });

// ─── GET /api/copilot/context ───
r.get("/copilot/context", (c) => {
  const db = getDb();

  // Stats
  const total = (db.query("SELECT COUNT(*) c FROM price_records").get() as { c: number }).c;
  const high = (db.query("SELECT COUNT(*) c FROM anomalies WHERE risk_level='high'").get() as { c: number }).c;
  const mid = (db.query("SELECT COUNT(*) c FROM anomalies WHERE risk_level='mid'").get() as { c: number }).c;
  const low = (db.query("SELECT COUNT(*) c FROM anomalies WHERE risk_level='low'").get() as { c: number }).c;
  const closed = (db.query("SELECT COUNT(*) c FROM anomalies WHERE status='closed'").get() as { c: number }).c;
  const dismissed = (db.query("SELECT COUNT(*) c FROM anomalies WHERE status='dismissed'").get() as { c: number }).c;
  const anomalyTotal = high + mid + low;
  const closedRate = anomalyTotal > 0 ? Math.round((closed / anomalyTotal) * 100) : 0;

  const stats = {
    monitoredCount: total,
    anomalyCount: anomalyTotal,
    byRisk: { high, mid, low },
    closedRate,
    dismissedCount: dismissed,
  };

  // Briefing
  const brief = generateBriefing(db);

  // Model status
  const modelStatus = getLlmStatus();

  // Tasks — same logic as App.tsx
  const tasks: Array<{
    id: string;
    type: string;
    label: string;
    targetPage: string;
    targetId?: string;
    priority: string;
    anomalyId?: string;
    workOrderId?: string;
  }> = [];

  // Briefing priorities
  for (const p of brief.priorities ?? []) {
    tasks.push({
      id: `briefing-${p.anomalyId}`,
      type: p.target === "workorder" ? "create_work_order" : "investigate",
      label: p.title,
      targetPage: "anomalies",
      targetId: p.anomalyId,
      priority: p.level,
      anomalyId: p.anomalyId,
    });
  }

  // Work orders
  const workOrders = db.query(`
    SELECT wo.id, wo.status, wo.anomaly_id anomalyId,
      p.generic, p.hospital, p.region,
      a.risk_level riskLevel
    FROM work_orders wo
    JOIN anomalies a ON a.id = wo.anomaly_id
    JOIN price_records p ON p.id = a.record_id
    WHERE wo.status != 'closed'
    ORDER BY wo.updated_at DESC
  `).all() as Array<{
    id: string; status: string; anomalyId: string;
    generic: string; hospital: string; region: string;
    riskLevel: string;
  }>;

  for (const wo of workOrders) {
    const recheckEvent = db.query(
      "SELECT to_status toStatus FROM work_order_events WHERE work_order_id=? AND to_status IN ('recheck_passed','recheck_failed') ORDER BY created_at DESC LIMIT 1"
    ).get(wo.id) as { toStatus?: string } | null;

    let type: string;
    let targetPage: string;
    if (wo.status === "done") {
      if (recheckEvent?.toStatus === "recheck_passed") {
        type = "close";
        targetPage = "recheck";
      } else {
        type = "recheck";
        targetPage = "recheck";
      }
    } else {
      type = "advance";
      targetPage = "work-orders";
    }

    tasks.push({
      id: `work-order-${wo.id}`,
      type,
      label: `${wo.status}：${wo.generic ?? wo.anomalyId}`,
      targetPage,
      targetId: wo.id,
      priority: wo.riskLevel ?? "mid",
      anomalyId: wo.anomalyId,
      workOrderId: wo.id,
    });
  }

  // Counts
  const pendingAnomalyCount = (db.query(
    "SELECT COUNT(*) c FROM anomalies WHERE status='pending'"
  ).get() as { c: number }).c;

  const pendingReviewCount = (db.query(
    `SELECT COUNT(*) c FROM work_orders wo
     WHERE wo.status='done'
     AND NOT EXISTS (SELECT 1 FROM work_order_events we WHERE we.work_order_id=wo.id AND we.to_status='recheck_passed')`
  ).get() as { c: number }).c;

  return c.json(ok({
    stats,
    brief,
    tasks,
    modelStatus,
    pendingAnomalyCount,
    pendingReviewCount,
  }));
});

// ─── POST /api/copilot/chat ───
r.post("/copilot/chat", async (c) => {
  const db = getDb();
  const body = await c.req.json().catch(() => ({}));
  const { message, page, selected, history } = body as {
    message?: string;
    page?: string;
    selected?: { type?: string; id?: string };
    history?: Array<{ role: string; content: string }>;
  };

  if (!message?.trim()) {
    return c.json({ code: 1, msg: "message is required" }, 400);
  }

  // Build context
  const totalAnomalies = (db.query("SELECT COUNT(*) c FROM anomalies").get() as { c: number }).c;
  const pendingAnomalies = (db.query("SELECT COUNT(*) c FROM anomalies WHERE status='pending'").get() as { c: number }).c;
  const pendingOrders = (db.query("SELECT COUNT(*) c FROM work_orders WHERE status!='closed'").get() as { c: number }).c;

  let contextParts = [
    `当前页面：${page ?? "未知"}`,
    `系统状态：${totalAnomalies} 条异常记录，${pendingAnomalies} 条待研判，${pendingOrders} 条未闭环工单。`,
  ];

  if (selected?.type === "anomaly" && selected.id) {
    const a = db.query(`
      SELECT a.id, a.risk_level riskLevel, a.risk_score riskScore, a.status,
        p.generic, p.brand, p.manufacturer, p.spec, p.form, p.price,
        p.tender_price tenderPrice, p.hospital, p.region, p.date
      FROM anomalies a JOIN price_records p ON p.id=a.record_id
      WHERE a.id=?
    `).get(selected.id) as any;
    if (a) {
      contextParts.push(`当前选中异常：${a.generic}（${a.brand}，${a.spec}），价格 ${a.price}，医院 ${a.hospital}，风险等级 ${a.riskLevel}，状态 ${a.status}。`);
    }
  }

  if (selected?.type === "work_order" && selected.id) {
    const wo = db.query(`
      SELECT wo.id, wo.status, wo.type, wo.assignee,
        p.generic, p.hospital, p.region
      FROM work_orders wo
      JOIN anomalies a ON a.id=wo.anomaly_id
      JOIN price_records p ON p.id=a.record_id
      WHERE wo.id=?
    `).get(selected.id) as any;
    if (wo) {
      contextParts.push(`当前选中工单：${wo.id}，药品 ${wo.generic}，状态 ${wo.status}，处置类型 ${wo.type}，负责人 ${wo.assignee ?? "未分配"}。`);
    }
  }

  const context = contextParts.join("\n");

  const systemPrompt = `你是"药价鹰眼"智能助手，专门协助医保价格监管人员处理药品/耗材价格异常研判与处置。

你的职责：
1. 回答用户关于当前系统状态、异常研判、工单处置、复核流程的问题
2. 根据上下文推荐下一步操作（研判某条异常、推进某条工单、复核某条工单等）
3. 解释价格异常的可能原因和处置建议
4. 引导用户按标准流程操作：检测异常 → 研判取证 → 交叉校验 → 生成报告 → 创建工单 → 处置推进 → 复核闭环

回答要求：
- 用简洁专业的中文回答，不超过 200 字
- 如果用户问"今天先做什么"，基于当前数据给出优先级建议
- 如果用户问"这条为什么异常"，基于上下文中的价格数据解释
- 在回答末尾，如果需要，给出 1-2 条可操作的建议任务
- 不要编造数据，只基于提供的上下文回答

当前上下文：
${context}`;

  // Build conversation history
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];
  if (history?.length) {
    for (const h of history.slice(-6)) {
      messages.push({ role: h.role, content: h.content });
    }
  }
  messages.push({ role: "user", content: message });

  try {
    // Call LLM via chat()
    const userPrompt = messages.filter(m => m.role !== "system").map(m => `[${m.role}]: ${m.content}`).join("\n");
    const chatResult = await chat(systemPrompt, userPrompt);
    const answer = chatResult.content;

    // Generate citations
    const citations: Array<{ type: string; id: string; label: string }> = [];
    if (selected?.type === "anomaly" && selected.id) {
      citations.push({ type: "anomaly", id: selected.id, label: `异常 ${selected.id}` });
    }
    if (selected?.type === "work_order" && selected.id) {
      citations.push({ type: "work_order", id: selected.id, label: `工单 ${selected.id}` });
    }

    // Generate suggested tasks based on current state
    const suggestedTasks: Array<{
      id: string; type: string; label: string;
      targetPage: string; targetId?: string;
      priority: string; anomalyId?: string; workOrderId?: string;
    }> = [];

    if (pendingAnomalies > 0) {
      const firstPending = db.query(
        "SELECT a.id, p.generic, a.risk_level riskLevel FROM anomalies a JOIN price_records p ON p.id=a.record_id WHERE a.status='pending' ORDER BY a.risk_score DESC LIMIT 1"
      ).get() as any;
      if (firstPending) {
        suggestedTasks.push({
          id: `task-investigate-${firstPending.id}`,
          type: "investigate",
          label: `研判：${firstPending.generic}`,
          targetPage: "anomalies",
          targetId: firstPending.id,
          priority: firstPending.riskLevel ?? "mid",
          anomalyId: firstPending.id,
        });
      }
    }

    if (pendingOrders > 0) {
      const firstOrder = db.query(
        `SELECT wo.id, wo.status, p.generic, a.risk_level riskLevel
         FROM work_orders wo
         JOIN anomalies a ON a.id=wo.anomaly_id
         JOIN price_records p ON p.id=a.record_id
         WHERE wo.status!='closed'
         ORDER BY CASE wo.status WHEN 'pending' THEN 0 WHEN 'processing' THEN 1 WHEN 'done' THEN 2 END, wo.updated_at DESC LIMIT 1`
      ).get() as any;
      if (firstOrder) {
        const isRecheck = firstOrder.status === "done";
        suggestedTasks.push({
          id: `task-order-${firstOrder.id}`,
          type: isRecheck ? "recheck" : "advance",
          label: `${isRecheck ? "复核" : "推进"}：${firstOrder.generic}`,
          targetPage: isRecheck ? "recheck" : "work-orders",
          targetId: firstOrder.id,
          priority: firstOrder.riskLevel ?? "mid",
          anomalyId: firstOrder.anomalyId,
          workOrderId: firstOrder.id,
        });
      }
    }

    const suggestedLinks = suggestedTasks.map(t => ({
      label: t.label,
      page: t.targetPage as "workspace" | "anomalies" | "work-orders" | "recheck" | "data-rules",
      id: t.targetId,
    }));

    return c.json(ok({
      answer,
      citations,
      suggestedTasks,
      suggestedLinks,
      usedMock: chatResult.usedMock ?? getLlmStatus().mode === "mock",
    }));
  } catch (err: any) {
    return c.json(ok({
      answer: "当前数据不足，请稍后重试。",
      citations: [],
      suggestedTasks: [],
      suggestedLinks: [],
    }));
  }
});

export default r;