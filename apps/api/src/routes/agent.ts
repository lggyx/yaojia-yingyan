import { Hono } from "hono";
import { getDb } from "../db/client";
import { investigate } from "../agent/orchestrator";
import { challenge } from "../agent/challenge";
import { getLlmStatus } from "../agent/llm";
import { standardize } from "../standardize/standardize";
import type { Anomaly, PriceRecord } from "@shared/types";

const r = new Hono();
const ok = (data: unknown) => ({ code: 0, data, msg: "ok" });
const SEL = `SELECT id,mi_code miCode,generic,brand,manufacturer,spec,form,category,price,
  tender_price tenderPrice,agreed_volume agreedVolume,actual_volume actualVolume,
  listing_price listingPrice,hospital,region,date FROM price_records`;

function loadAnomaly(db: any, id: string): { anomaly: Anomaly; record: PriceRecord } | null {
  const a: any = db.query(`SELECT id,record_id recordId,dimensions,risk_score riskScore,
    risk_level riskLevel,confidence,status,created_at createdAt FROM anomalies WHERE id=?`).get(id);
  if (!a) return null;
  const record: any = db.query(`${SEL} WHERE id=?`).get(a.recordId);
  return { anomaly: { ...a, dimensions: JSON.parse(a.dimensions) }, record };
}
function saveTrace(db: any, anomalyId: string, kind: string, payload: unknown) {
  db.prepare("INSERT INTO agent_traces (id,anomaly_id,kind,payload,created_at) VALUES (?,?,?,?,?)")
    .run(`T-${kind}-${anomalyId}-${crypto.randomUUID()}`, anomalyId, kind, JSON.stringify(payload), new Date().toISOString());
}

r.get("/agent/status", (c) => c.json(ok(getLlmStatus())));

r.post("/agent/investigate/:id", async (c) => {
  const db = getDb(); const x = loadAnomaly(db, c.req.param("id"));
  if (!x) return c.json({ code: 1, msg: "not found" }, 404);
  const result = await investigate(db, x.anomaly, x.record);
  saveTrace(db, x.anomaly.id, "investigate", result);
  db.prepare("UPDATE anomalies SET status='investigating' WHERE id=?").run(x.anomaly.id);
  return c.json(ok(result));
});

r.post("/agent/challenge/:id", async (c) => {
  const db = getDb(); const x = loadAnomaly(db, c.req.param("id"));
  if (!x) return c.json({ code: 1, msg: "not found" }, 404);
  const result = await challenge(db, x.anomaly, x.record);
  saveTrace(db, x.anomaly.id, "challenge", result);
  const status = result.verdict === "dismissed" ? "dismissed" : result.verdict === "review" ? "review" : "confirmed";
  db.prepare("UPDATE anomalies SET confidence=?, risk_level=?, status=? WHERE id=?")
    .run(result.confidence, result.adjustedRiskLevel, status, x.anomaly.id);
  return c.json(ok(result));
});

r.post("/tools/standardize", async (c) => {
  const body = await c.req.json().catch(() => ({ records: [] }));
  return c.json(ok(standardize(body.records ?? [])));
});

export default r;
