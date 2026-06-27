import type { Database } from "bun:sqlite";
import type { PriceRecord } from "@shared/types";

export function getTenderPrice(db: Database, miCode: string) {
  return db.query("SELECT tender_price tenderPrice, agreed_volume agreedVolume FROM price_records WHERE mi_code=? AND tender_price IS NOT NULL LIMIT 1").get(miCode);
}
export function getHistory(db: Database, miCode: string, region: string) {
  return db.query("SELECT date, price FROM price_history WHERE mi_code=? AND region=? ORDER BY date").all(miCode, region);
}
export function getRegionalAvg(db: Database, r: PriceRecord) {
  return db.query("SELECT region, AVG(price) avg FROM price_records WHERE generic=? AND manufacturer=? AND id<>? GROUP BY region")
    .all(r.generic, r.manufacturer, r.id);
}
export function getAlternatives(db: Database, r: PriceRecord) {
  return db.query("SELECT id, brand, price, actual_volume actualVolume FROM price_records WHERE generic=? AND id<>?").all(r.generic, r.id);
}
