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
  for (const a of aRows) byRisk[a.lvl as "high"|"mid"|"low"]++;
  const closed = aRows.filter(a => a.status === "closed").length;
  const dismissed = aRows.filter(a => a.status === "dismissed").length;
  return c.json(ok({ monitoredCount, anomalyCount: aRows.length, byRisk,
    closedRate: aRows.length ? +(closed/aRows.length).toFixed(2) : 0, dismissedCount: dismissed }));
});

export default r;
