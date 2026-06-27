import type { Database } from "bun:sqlite";
import { buildDataset } from "@shared/mock/scenarios";
import { DEFAULT_THRESHOLDS } from "@shared/constants";
import { getDb } from "./client";

export function seedDb(db: Database) {
  const { records, history } = buildDataset();
  db.run("DELETE FROM price_records"); db.run("DELETE FROM price_history");
  const ins = db.prepare(`INSERT INTO price_records
    (id,mi_code,generic,brand,manufacturer,spec,form,category,price,tender_price,agreed_volume,actual_volume,listing_price,hospital,region,date)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const r of records) ins.run(r.id, r.miCode, r.generic, r.brand, r.manufacturer, r.spec, r.form,
    r.category, r.price, r.tenderPrice, r.agreedVolume, r.actualVolume, r.listingPrice, r.hospital, r.region, r.date);
  const insH = db.prepare(`INSERT INTO price_history (mi_code,region,date,price) VALUES (?,?,?,?)`);
  for (const h of history) insH.run(h.miCode, h.region, h.date, h.price);

  // Seed default rule config
  const insR = db.prepare("INSERT OR REPLACE INTO rule_config (key,value) VALUES (?,?)");
  insR.run("tenderRatio", String(DEFAULT_THRESHOLDS.tenderRatio));
  insR.run("historyMoM", String(DEFAULT_THRESHOLDS.historyMoM));
  insR.run("regionalDev", String(DEFAULT_THRESHOLDS.regionalDev));
  insR.run("volumeRate", String(DEFAULT_THRESHOLDS.volumeRate));

  return { records: records.length, history: history.length };
}

if (import.meta.main) {
  const n = seedDb(getDb());
  console.log(`seeded`, n);
}
