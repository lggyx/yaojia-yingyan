import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { initSchema } from "./schema";

let _db: Database | null = null;
let _dbPath: string | null = null;
export function getDb(path = process.env.DB_PATH ?? "data/yaojia.sqlite"): Database {
  if (_db && _dbPath === path) return _db;
  if (_db) _db.close();
  mkdirSync(dirname(path), { recursive: true });
  _db = new Database(path, { create: true });
  _dbPath = path;
  _db.run("PRAGMA journal_mode = WAL;");
  initSchema(_db);
  return _db;
}
export function freshDb(path = ":memory:"): Database {
  const db = new Database(path); initSchema(db); return db;
}
