import { Database } from "bun:sqlite";
import { initSchema } from "./schema";

let _db: Database | null = null;
export function getDb(path = process.env.DB_PATH ?? "data/yaojia.sqlite"): Database {
  if (_db) return _db;
  _db = new Database(path, { create: true });
  _db.run("PRAGMA journal_mode = WAL;");
  initSchema(_db);
  return _db;
}
export function freshDb(path = ":memory:"): Database {
  const db = new Database(path); initSchema(db); return db;
}
