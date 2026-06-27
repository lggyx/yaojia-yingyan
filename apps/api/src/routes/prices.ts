import { Hono } from "hono";
import { getDb } from "../db/client";

const r = new Hono();
const ok = (data: unknown) => ({ code: 0, data, msg: "ok" });
const SEL = `SELECT id,mi_code miCode,generic,brand,manufacturer,spec,form,category,price,
  tender_price tenderPrice,agreed_volume agreedVolume,actual_volume actualVolume,
  listing_price listingPrice,hospital,region,date FROM price_records`;

r.get("/prices", (c) => {
  const db = getDb();
  const page = +(c.req.query("page") ?? 1), pageSize = +(c.req.query("pageSize") ?? 20);
  const kw = c.req.query("keyword"); const region = c.req.query("region"); const cat = c.req.query("category");
  const w: string[] = []; const p: any[] = [];
  if (kw) { w.push("(generic LIKE ? OR brand LIKE ? OR mi_code LIKE ?)"); p.push(`%${kw}%`,`%${kw}%`,`%${kw}%`); }
  if (region) { w.push("region=?"); p.push(region); }
  if (cat) { w.push("category=?"); p.push(cat); }
  const where = w.length ? " WHERE " + w.join(" AND ") : "";
  const total = (db.query(`SELECT COUNT(*) c FROM price_records${where}`).get(...p) as any).c;
  const items = db.query(`${SEL}${where} ORDER BY date DESC LIMIT ? OFFSET ?`).all(...p, pageSize, (page-1)*pageSize);
  return c.json(ok({ items, total, page, pageSize }));
});

r.get("/prices/:id", (c) => {
  const db = getDb(); const id = c.req.param("id");
  const rec: any = db.query(`${SEL} WHERE id=?`).get(id);
  if (!rec) return c.json({ code: 1, msg: "not found" }, 404);
  const history = db.query("SELECT date,price FROM price_history WHERE mi_code=? AND region=? ORDER BY date").all(rec.miCode, rec.region);
  return c.json(ok({ ...rec, history }));
});

r.get("/stats/overview", (c) => {
  const db = getDb();
  const monitoredCount = (db.query("SELECT COUNT(*) c FROM price_records").get() as any).c;
  const aRows: any[] = db.query("SELECT risk_level lvl, status FROM anomalies").all();
  const byRisk = { high: 0, mid: 0, low: 0 };
  for (const a of aRows) if (a.lvl in byRisk) byRisk[a.lvl as "high"|"mid"|"low"]++;
  const closed = aRows.filter(a => a.status === "closed").length;
  const dismissed = aRows.filter(a => a.status === "dismissed").length;
  return c.json(ok({ monitoredCount, anomalyCount: aRows.length, byRisk,
    closedRate: aRows.length ? +(closed/aRows.length).toFixed(2) : 0, dismissedCount: dismissed }));
});

// ─── Price CRUD ───

r.post("/prices", async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const id = body.id ?? crypto.randomUUID();
  db.prepare(`INSERT INTO price_records
    (id,mi_code,generic,brand,manufacturer,spec,form,category,price,tender_price,agreed_volume,actual_volume,listing_price,hospital,region,date)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, body.miCode ?? "", body.generic ?? "", body.brand ?? "", body.manufacturer ?? "",
      body.spec ?? "", body.form ?? "", body.category ?? "drug", body.price ?? 0,
      body.tenderPrice ?? null, body.agreedVolume ?? null, body.actualVolume ?? null, body.listingPrice ?? null,
      body.hospital ?? "", body.region ?? "", body.date ?? new Date().toISOString().slice(0, 10));
  return c.json(ok({ id }));
});

r.patch("/prices/:id", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const existing = db.query("SELECT id FROM price_records WHERE id=?").get(id);
  if (!existing) return c.json({ code: 1, msg: "not found" }, 404);
  const body = await c.req.json();
  const fields: string[] = [];
  const vals: any[] = [];
  const allowed = ["mi_code","generic","brand","manufacturer","spec","form","category","price","tender_price","agreed_volume","actual_volume","listing_price","hospital","region","date"];
  for (const [k, v] of Object.entries(body)) {
    const col = k.replace(/([A-Z])/g, "_$1").toLowerCase();
    if (allowed.includes(col)) { fields.push(`${col}=?`); vals.push(v); }
  }
  if (fields.length === 0) return c.json({ code: 1, msg: "no valid fields" }, 400);
  vals.push(id);
  db.prepare(`UPDATE price_records SET ${fields.join(", ")} WHERE id=?`).run(...vals);
  return c.json(ok({ id }));
});

r.delete("/prices/:id", (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const existing = db.query("SELECT id FROM price_records WHERE id=?").get(id);
  if (!existing) return c.json({ code: 1, msg: "not found" }, 404);
  const linked = db.query("SELECT COUNT(*) c FROM anomalies WHERE record_id=?").get(id) as { c: number };
  if (linked.c > 0) return c.json({ code: 1, msg: "存在关联异常记录，请先归档后再删除" }, 409);
  db.prepare("DELETE FROM price_records WHERE id=?").run(id);
  return c.json(ok({ id }));
});

export default r;
