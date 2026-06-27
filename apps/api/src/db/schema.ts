import type { Database } from "bun:sqlite";
export function initSchema(db: Database) {
  db.run(`CREATE TABLE IF NOT EXISTS price_records(
    id TEXT PRIMARY KEY, mi_code TEXT, generic TEXT, brand TEXT, manufacturer TEXT,
    spec TEXT, form TEXT, category TEXT, price REAL,
    tender_price REAL, agreed_volume REAL, actual_volume REAL, listing_price REAL,
    hospital TEXT, region TEXT, date TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS price_history(
    id INTEGER PRIMARY KEY AUTOINCREMENT, mi_code TEXT, region TEXT, date TEXT, price REAL)`);
  db.run(`CREATE TABLE IF NOT EXISTS anomalies(
    id TEXT PRIMARY KEY, record_id TEXT, dimensions TEXT, risk_score REAL,
    risk_level TEXT, confidence REAL, status TEXT, created_at TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS agent_traces(
    id TEXT PRIMARY KEY, anomaly_id TEXT, kind TEXT, payload TEXT, created_at TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS work_orders(
    id TEXT PRIMARY KEY, anomaly_id TEXT, type TEXT, status TEXT, assignee TEXT,
    sla TEXT, corrected_price REAL, note TEXT, created_at TEXT, updated_at TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS work_order_events(
    id TEXT PRIMARY KEY, work_order_id TEXT, from_status TEXT, to_status TEXT, note TEXT, created_at TEXT)`);
}
