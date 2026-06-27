import { test, expect } from "bun:test";
import { freshDb } from "./client";
import { seedDb } from "./seed";

test("seed 灌入记录与历史", () => {
  const db = freshDb();
  const n = seedDb(db);
  expect(n.records).toBeGreaterThan(30);
  const cnt = db.query("SELECT COUNT(*) c FROM price_records").get() as { c: number };
  expect(cnt.c).toBe(n.records);
  const s1 = db.query("SELECT * FROM price_records WHERE id='S1'").get();
  expect(s1).toBeTruthy();
});
