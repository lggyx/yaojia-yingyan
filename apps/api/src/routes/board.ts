import { Hono } from "hono";
import { getDb } from "../db/client";

const r = new Hono();
const ok = (data: unknown) => ({ code: 0, data, msg: "ok" });
const COLS = ["pending", "processing", "done", "closed"];

r.get("/board", (c) => {
  const db = getDb();
  const rows: any[] = db.query(`SELECT id,anomaly_id anomalyId,type,status,assignee,note,updated_at updatedAt
    FROM work_orders ORDER BY updated_at DESC`).all();
  const columns = COLS.map(status => ({ status, cards: rows.filter(workOrder => workOrder.status === status) }));
  return c.json(ok({ columns }));
});

export default r;