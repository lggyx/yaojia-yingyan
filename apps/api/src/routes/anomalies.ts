import { Hono } from "hono";
import { getDb } from "../db/client";
import { detectAll } from "../rules/engine";
import { DEFAULT_THRESHOLDS } from "@shared/constants";
import type { PriceRecord, PriceHistoryPoint } from "@shared/types";

const r = new Hono();
const ok = (data: unknown) => ({ code: 0, data, msg: "ok" });
const SEL = `SELECT id,mi_code miCode,generic,brand,manufacturer,spec,form,category,price,
  tender_price tenderPrice,agreed_volume agreedVolume,actual_volume actualVolume,
  listing_price listingPrice,hospital,region,date FROM price_records`;

r.post("/detect", async (c) => {
  const db = getDb();
  const body = await c.req.json().catch(() => ({}));
  const t = { ...DEFAULT_THRESHOLDS, ...(body.thresholds ?? {}) };
  const records = db.query(SEL).all() as PriceRecord[];
  const history = db.query("SELECT mi_code miCode,region,date,price FROM price_history").all() as PriceHistoryPoint[];
  const anomalies = detectAll(records, history, t);
  const ins = db.prepare(`INSERT OR REPLACE INTO anomalies
    (id,record_id,dimensions,risk_score,risk_level,confidence,status,created_at) VALUES (?,?,?,?,?,?,?,?)`);
  for (const a of anomalies) ins.run(a.id, a.recordId, JSON.stringify(a.dimensions), a.riskScore, a.riskLevel, a.confidence, a.status, a.createdAt);
  return c.json(ok({ anomalies, summary: { total: anomalies.length } }));
});

function rowToAnomaly(a: any) { return { ...a, dimensions: JSON.parse(a.dimensions) }; }

r.get("/anomalies", (c) => {
  const db = getDb();
  const lvl = c.req.query("riskLevel"); const st = c.req.query("status");
  const w: string[] = []; const p: any[] = [];
  if (lvl) { w.push("risk_level=?"); p.push(lvl); }
  if (st) { w.push("status=?"); p.push(st); }
  const where = w.length ? " WHERE " + w.join(" AND ") : "";
  const rows: any[] = db.query(`SELECT id,record_id recordId,dimensions,risk_score riskScore,
    risk_level riskLevel,confidence,status,created_at createdAt FROM anomalies${where} ORDER BY risk_score DESC`).all(...p);
  return c.json(ok({ items: rows.map(rowToAnomaly), total: rows.length }));
});

r.get("/anomalies/:id", (c) => {
  const db = getDb();
  const a: any = db.query(`SELECT id,record_id recordId,dimensions,risk_score riskScore,
    risk_level riskLevel,confidence,status,created_at createdAt FROM anomalies WHERE id=?`).get(c.req.param("id"));
  if (!a) return c.json({ code: 1, msg: "not found" }, 404);
  const record: any = db.query(`${SEL} WHERE id=?`).get(a.recordId);
  return c.json(ok({ ...rowToAnomaly(a), record }));
});

r.patch("/anomalies/:id", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const existing = db.query("SELECT id FROM anomalies WHERE id=?").get(id);
  if (!existing) return c.json({ code: 1, msg: "not found" }, 404);
  const body = await c.req.json();
  if (body.status) {
    db.prepare("UPDATE anomalies SET status=? WHERE id=?").run(body.status, id);
  }
  if (body.note !== undefined) {
    db.prepare("INSERT INTO agent_traces (id,anomaly_id,kind,payload,created_at) VALUES (?,?,?,?,?)")
      .run(`T-note-${id}-${crypto.randomUUID()}`, id, "note", JSON.stringify({ note: body.note }), new Date().toISOString());
  }
  return c.json(ok({ id }));
});

export default r;
