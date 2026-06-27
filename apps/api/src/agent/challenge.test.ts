import { test, expect } from "bun:test";
import { computeConfidence, verdictFromConfidence } from "./challenge";

test("无任何被驳倒→高置信", () => {
  const c = computeConfidence([
    { hypothesis: "规格不同", checked: true, refuted: false, reason: "" },
    { hypothesis: "政策调价", checked: true, refuted: false, reason: "" },
  ]);
  expect(c).toBeGreaterThanOrEqual(80);
  expect(verdictFromConfidence(c)).toBe("confirmed");
});

test("多数被驳倒→低置信→dismissed", () => {
  const c = computeConfidence([
    { hypothesis: "剂型不同不可比", checked: true, refuted: true, reason: "缓释vs普通" },
    { hypothesis: "集采过渡期", checked: true, refuted: true, reason: "切换中" },
  ]);
  expect(c).toBeLessThan(50);
  expect(verdictFromConfidence(c)).toBe("dismissed");
});
