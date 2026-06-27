import { test, expect } from "bun:test";
import { normalize, standardize } from "./standardize";

test("normalize 统一规格写法 ×/* 与单位", () => {
  const n = normalize({ rawName: "阿莫西林胶囊", spec: "0.25g×24", form: "胶囊剂" });
  expect(n.generic).toBe("阿莫西林胶囊");
  expect(n.spec).toBe("0.25g*24");
});
test("standardize 把同四同药品归为一组", () => {
  const { items } = standardize([
    { rawName: "阿莫西林胶囊", spec: "0.25g*24", form: "胶囊", manufacturer: "联邦制药" },
    { rawName: "阿莫西林胶囊", spec: "0.25g×24", form: "胶囊剂", manufacturer: "联邦制药" },
  ]);
  expect(items[0].sameDrugGroupId).toBe(items[1].sameDrugGroupId);
});
