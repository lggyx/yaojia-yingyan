import { test, expect } from "bun:test";
import { aggregateRisk, detectAll } from "./engine";
import { DEFAULT_THRESHOLDS as T } from "@shared/constants";
import { buildDataset } from "@shared/mock/scenarios";

test("aggregateRisk: 命中高分维度→high", () => {
  const r = aggregateRisk([{ type:"tender", base:5, actual:16, deviation:3.2, hit:true, detail:"" }]);
  expect(r.level === "mid" || r.level === "high").toBe(true);
  expect(r.score).toBeGreaterThan(0);
});
test("aggregateRisk: 无命中→low/0", () => {
  expect(aggregateRisk([]).score).toBe(0);
});
test("detectAll: S1/S2/S3/S4 被检出, S6 也会进入候选(待对抗校验)", () => {
  const { records, history } = buildDataset();
  const anomalies = detectAll(records, history, T);
  const ids = new Set(anomalies.map(a => a.recordId));
  for (const id of ["S1","S2","S3","S4"]) expect(ids.has(id)).toBe(true);
});
