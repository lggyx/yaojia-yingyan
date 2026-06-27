import { test, expect } from "bun:test";
import { buildDataset } from "./scenarios";

test("dataset 含 6 条剧本且字段完整", () => {
  const { records, history } = buildDataset();
  for (const id of ["S1","S2","S3","S4","S5","S6"]) {
    expect(records.find(r => r.id === id)).toBeTruthy();
  }
  expect(records.length).toBeGreaterThan(30);
  expect(history.length).toBeGreaterThan(100);
  // S1 采购价显著高于中标价
  const s1 = records.find(r => r.id === "S1")!;
  expect(s1.price / s1.tenderPrice!).toBeGreaterThan(3);
});
