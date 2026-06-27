import { test, expect } from "bun:test";
import { tenderDim, historyDim, regionalDim, volumeDim, alternativeDim } from "./dimensions";
import { DEFAULT_THRESHOLDS as T } from "@shared/constants";
import type { PriceRecord } from "@shared/types";

const base: PriceRecord = { id:"x", miCode:"C0", generic:"g", brand:"b", manufacturer:"m",
  spec:"s", form:"f", category:"drug", price:10, tenderPrice:5, agreedVolume:100, actualVolume:90,
  listingPrice:8, hospital:"h", region:"浙江省", date:"2026-06-01" };

test("tenderDim 命中: 采购价/中标价 > 1.5", () => {
  const d = tenderDim(base, T)!;
  expect(d.type).toBe("tender"); expect(d.deviation).toBeCloseTo(2); expect(d.hit).toBe(true);
});
test("tenderDim 无中标价返回 null", () => {
  expect(tenderDim({ ...base, tenderPrice: null }, T)).toBeNull();
});
test("historyDim 命中: 末值较前均值环比 > 30%", () => {
  const hist = [8,8,8,8,13].map((p,i)=>({ miCode:"C0", region:"浙江省", date:`2026-0${i+1}-15`, price:p }));
  const d = historyDim({ ...base, price: 13 }, hist, T)!;
  expect(d.hit).toBe(true);
});
test("volumeDim 命中: 完成率 < 60%", () => {
  const d = volumeDim({ ...base, agreedVolume: 100, actualVolume: 30 }, T)!;
  expect(d.hit).toBe(true); expect(d.deviation).toBeCloseTo(0.3);
});
test("regionalDim 命中: 偏离同厂家周边均价 > 50%", () => {
  const peers: PriceRecord[] = [
    { ...base, id:"peer1", region:"江苏省", price:5 },
    { ...base, id:"peer2", region:"安徽省", price:5 },
  ];
  const d = regionalDim({ ...base, price: 10 }, peers, T)!;
  expect(d.hit).toBe(true);
});
test("alternativeDim 命中: 中选药被高价替代药挤占", () => {
  const sel = { ...base, id:"sel", generic:"二甲双胍", tenderPrice:5, price:5, actualVolume:30 };
  const alt = { ...base, id:"alt", generic:"二甲双胍", tenderPrice:null, price:12, actualVolume:70 };
  const d = alternativeDim(sel, [sel, alt])!;
  expect(d.type).toBe("alternative");
  expect(d.hit).toBe(true);
});
test("alternativeDim 无替代药→null", () => {
  expect(alternativeDim({ ...base, tenderPrice:5 }, [{ ...base, tenderPrice:5 }])).toBeNull();
});
