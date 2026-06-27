import { Hono } from "hono";
import { getDb } from "../db/client";
import { DEFAULT_THRESHOLDS } from "@shared/constants";
import type { Thresholds } from "@shared/types";

const r = new Hono();
const ok = (data: unknown) => ({ code: 0, data, msg: "ok" });

function loadConfig(db: any): Thresholds {
  const rows = db.query("SELECT key, value FROM rule_config").all() as Array<{ key: string; value: string }>;
  const map: Record<string, number> = {};
  for (const row of rows) map[row.key] = Number(row.value);
  return {
    tenderRatio: map.tenderRatio ?? DEFAULT_THRESHOLDS.tenderRatio,
    historyMoM: map.historyMoM ?? DEFAULT_THRESHOLDS.historyMoM,
    regionalDev: map.regionalDev ?? DEFAULT_THRESHOLDS.regionalDev,
    volumeRate: map.volumeRate ?? DEFAULT_THRESHOLDS.volumeRate,
  };
}

r.get("/rules/config", (c) => {
  const db = getDb();
  return c.json(ok(loadConfig(db)));
});

r.patch("/rules/config", async (c) => {
  const db = getDb();
  const body = await c.req.json().catch(() => ({}));
  const upd = db.prepare("INSERT OR REPLACE INTO rule_config (key,value) VALUES (?,?)");
  if (body.tenderRatio !== undefined) upd.run("tenderRatio", String(body.tenderRatio));
  if (body.historyMoM !== undefined) upd.run("historyMoM", String(body.historyMoM));
  if (body.regionalDev !== undefined) upd.run("regionalDev", String(body.regionalDev));
  if (body.volumeRate !== undefined) upd.run("volumeRate", String(body.volumeRate));
  return c.json(ok(loadConfig(db)));
});

export default r;