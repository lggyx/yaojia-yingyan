function canonSpec(spec = ""): string {
  return spec.replace(/[×xX]/g, "*").replace(/\s+/g, "").replace(/片|粒|支|盒/g, "");
}
function canonForm(form = ""): string {
  return form.replace(/剂$/, "").replace(/胶囊剂/, "胶囊");
}
export function normalize(raw: { rawName: string; spec?: string; form?: string; manufacturer?: string }) {
  return { generic: raw.rawName.trim(), form: canonForm(raw.form ?? ""),
    spec: canonSpec(raw.spec ?? ""), manufacturer: (raw.manufacturer ?? "").trim() };
}
export function standardize(records: Array<{ rawName: string; spec?: string; form?: string; manufacturer?: string }>) {
  const groups = new Map<string, string>();
  let seq = 0;
  const items = records.map((raw, i) => {
    const n = normalize(raw);
    const key = `${n.generic}|${n.form}|${n.spec}|${n.manufacturer}`;
    if (!groups.has(key)) groups.set(key, `G${++seq}`);
    const groupId = groups.get(key)!;
    // 演示用编码：组内一致
    const miCode = "C" + String(1000 + parseInt(groupId.slice(1))).padStart(14, "0");
    const confidence = n.manufacturer ? 0.95 : 0.7;
    return { raw: raw.rawName, miCode, generic: n.generic, form: n.form, spec: n.spec,
      manufacturer: n.manufacturer, sameDrugGroupId: groupId, confidence };
  });
  return { items };
}
