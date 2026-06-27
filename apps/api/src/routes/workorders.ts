import { Hono } from "hono";
import { getDb } from "../db/client";

const r = new Hono();
const ok = (data: unknown) => ({ code: 0, data, msg: "ok" });
const TS = "2026-06-27T00:00:00.000Z";
const nextStatus: Record<string, string> = { pending: "processing", processing: "done", done: "closed" };

r.post("/work-orders", async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const id = `WO-${body.anomalyId}`;
  const anomaly = db.query("SELECT id FROM anomalies WHERE id=?").get(body.anomalyId);
  if (!anomaly) return c.json({ code: 1, msg: "anomaly not found" }, 404);
  const existing = db.query("SELECT id,status FROM work_orders WHERE anomaly_id=?").get(body.anomalyId);
  if (existing) return c.json({ code: 1, msg: "work order already exists", data: existing }, 409);
  db.prepare(`INSERT INTO work_orders
    (id,anomaly_id,type,status,assignee,sla,corrected_price,note,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, body.anomalyId, body.type, "pending", body.assignee ?? null, body.sla ?? null, null, body.note ?? null, TS, TS);
  db.prepare("UPDATE anomalies SET status='disposing' WHERE id=?").run(body.anomalyId);
  return c.json(ok({ id, status: "pending" }));
});

r.get("/work-orders", (c) => {
  const db = getDb();
  const rows = db.query(`SELECT id,anomaly_id anomalyId,type,status,assignee,sla,
    corrected_price correctedPrice,note,created_at createdAt,updated_at updatedAt
    FROM work_orders ORDER BY updated_at DESC`).all();
  return c.json(ok({ items: rows, total: rows.length }));
});

r.get("/work-orders/:id", (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const workOrder = db.query(`SELECT id,anomaly_id anomalyId,type,status,assignee,sla,
    corrected_price correctedPrice,note,created_at createdAt,updated_at updatedAt
    FROM work_orders WHERE id=?`).get(id);
  if (!workOrder) return c.json({ code: 1, msg: "not found" }, 404);
  const events = db.query(`SELECT from_status fromStatus,to_status toStatus,note,created_at createdAt
    FROM work_order_events WHERE work_order_id=? ORDER BY created_at`).all(id);
  return c.json(ok({ ...workOrder, events }));
});

r.patch("/work-orders/:id", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const body = await c.req.json();
  const current = db.query("SELECT status FROM work_orders WHERE id=?").get(id) as { status: string } | null;
  if (!current) return c.json({ code: 1, msg: "not found" }, 404);
  if (nextStatus[current.status] !== body.status) return c.json({ code: 1, msg: "invalid status transition" }, 400);
  if (body.status === "closed") {
    const passed = db.query(`SELECT 1 FROM work_order_events
      WHERE work_order_id=? AND to_status='recheck_passed' ORDER BY created_at DESC LIMIT 1`).get(id);
    if (!passed) return c.json({ code: 1, msg: "AI recheck required before closing" }, 400);
  }

  db.prepare(`UPDATE work_orders SET status=?, corrected_price=COALESCE(?,corrected_price),
    note=COALESCE(?,note), updated_at=? WHERE id=?`)
    .run(body.status, body.correctedPrice ?? null, body.note ?? null, TS, id);
  db.prepare("INSERT INTO work_order_events (id,work_order_id,from_status,to_status,note,created_at) VALUES (?,?,?,?,?,?)")
    .run(`E-${id}-${body.status}`, id, current.status, body.status, body.note ?? null, TS);

  if (body.status === "closed") {
    const workOrder = db.query("SELECT anomaly_id anomalyId FROM work_orders WHERE id=?").get(id) as { anomalyId: string };
    db.prepare("UPDATE anomalies SET status='closed' WHERE id=?").run(workOrder.anomalyId);
  }
  return c.json(ok({ id, status: body.status }));
});

r.post("/work-orders/:id/recheck", (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const workOrder = db.query("SELECT anomaly_id anomalyId,corrected_price correctedPrice FROM work_orders WHERE id=?").get(id) as
    | { anomalyId: string; correctedPrice: number | null }
    | null;
  if (!workOrder) return c.json({ code: 1, msg: "not found" }, 404);
  const anomaly = db.query("SELECT record_id recordId FROM anomalies WHERE id=?").get(workOrder.anomalyId) as { recordId: string };
  const record = db.query("SELECT price,tender_price tenderPrice FROM price_records WHERE id=?").get(anomaly.recordId) as { price: number; tenderPrice: number | null };
  const latestPrice = workOrder.correctedPrice ?? record.price;
  const deviationNow = record.tenderPrice ? +(latestPrice / record.tenderPrice).toFixed(2) : null;
  const corrected = deviationNow != null && deviationNow <= 1.5;
  db.prepare("INSERT INTO work_order_events (id,work_order_id,from_status,to_status,note,created_at) VALUES (?,?,?,?,?,?)")
    .run(`E-${id}-recheck-${crypto.randomUUID()}`, id, "done", corrected ? "recheck_passed" : "recheck_failed", `AI复核：${corrected ? "可闭环" : "需继续处置"}`, TS);
  return c.json(ok({ corrected, latestPrice, deviationNow, canClose: corrected }));
});

export default r;