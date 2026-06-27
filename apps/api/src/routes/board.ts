import { Hono } from "hono";
import { getDb } from "../db/client";

const r = new Hono();
const ok = (data: unknown) => ({ code: 0, data, msg: "ok" });
const COLS = ["pending", "processing", "done", "closed"];
const workflowText: Record<string, { currentStep: string; nextStep: string }> = {
  pending: { currentStep: "待处置", nextStep: "开始处置" },
  processing: { currentStep: "处置中", nextStep: "标记已整改" },
  done: { currentStep: "已整改", nextStep: "AI复核" },
  closed: { currentStep: "已闭环", nextStep: "归档复盘" },
};

r.get("/board", (c) => {
  const db = getDb();
  const rows: any[] = db.query(`SELECT wo.id,wo.anomaly_id anomalyId,wo.type,wo.status,wo.assignee,wo.note,
    wo.updated_at updatedAt,a.risk_level riskLevel,a.risk_score riskScore,p.generic,p.hospital,p.region,
    (SELECT note FROM work_order_events e WHERE e.work_order_id=wo.id ORDER BY e.created_at DESC LIMIT 1) lastEvent
    FROM work_orders wo
    LEFT JOIN anomalies a ON a.id=wo.anomaly_id
    LEFT JOIN price_records p ON p.id=a.record_id
    ORDER BY wo.updated_at DESC`).all()
    .map(row => ({ ...row, ...workflowText[row.status], lastEvent: row.note ?? row.lastEvent ?? null }));
  const columns = COLS.map(status => ({ status, cards: rows.filter(workOrder => workOrder.status === status) }));
  return c.json(ok({ columns }));
});

export default r;