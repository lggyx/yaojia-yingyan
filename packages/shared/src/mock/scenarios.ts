import type { PriceRecord, PriceHistoryPoint } from "../types";
import { CATALOG, REGIONS, HOSPITALS, makeRecord, miCode } from "./catalog";

const MONTHS = ["2025-07","2025-08","2025-09","2025-10","2025-11","2025-12",
  "2026-01","2026-02","2026-03","2026-04","2026-05","2026-06"];

export function buildDataset(): { records: PriceRecord[]; history: PriceHistoryPoint[] } {
  const records: PriceRecord[] = [];
  const history: PriceHistoryPoint[] = [];

  // 正常底数：每个品种 × 各省一条按中标价附近采购的记录
  for (const c of CATALOG) {
    for (const region of REGIONS) {
      const rec = makeRecord({
        generic: c.generic, brand: c.brand, manufacturer: c.manufacturer, spec: c.spec, form: c.form,
        category: c.cat, price: +(c.tender * 1.02).toFixed(2),
        tenderPrice: c.tender, agreedVolume: 100000, actualVolume: 92000,
        listingPrice: c.base, hospital: HOSPITALS[1], region, date: "2026-06-20",
      });
      records.push(rec);
      MONTHS.forEach((m, i) => history.push({
        miCode: rec.miCode, region, date: `${m}-15`,
        price: +(c.tender * (1.0 + Math.sin(i) * 0.02)).toFixed(2),
      }));
    }
  }

  // 取一个品种做历史/剧本锚点
  const atv = CATALOG[0]; // 阿托伐他汀钙片
  const clp = CATALOG[1]; // 氯吡格雷
  const met = CATALOG[2]; // 二甲双胍缓释片
  const ome = CATALOG[3]; // 奥美拉唑
  const stent = CATALOG[7]; // 冠脉支架

  // S1 集采落地价：采购价高于中标价 320%
  records.push(makeRecord({ id: "S1",
    generic: clp.generic, brand: clp.brand, manufacturer: clp.manufacturer, spec: clp.spec, form: clp.form,
    category: clp.cat, price: +(clp.tender * 3.2).toFixed(2),
    tenderPrice: clp.tender, agreedVolume: 80000, actualVolume: 70000,
    listingPrice: clp.base, hospital: HOSPITALS[3], region: "安徽省", date: "2026-06-22" }));

  // S2 跨区域：本省较周边均价高 2.1 倍（其余省已在底数）
  records.push(makeRecord({ id: "S2",
    generic: atv.generic, brand: atv.brand, manufacturer: atv.manufacturer, spec: atv.spec, form: atv.form,
    category: atv.cat, price: +(atv.tender * 2.1).toFixed(2),
    tenderPrice: atv.tender, agreedVolume: 120000, actualVolume: 110000,
    listingPrice: atv.base, hospital: HOSPITALS[0], region: "浙江省", date: "2026-06-21" }));

  // S3 历史跳涨：奥美拉唑历史平稳后环比 +60%
  const s3 = makeRecord({ id: "S3",
    generic: ome.generic, brand: ome.brand, manufacturer: ome.manufacturer, spec: ome.spec, form: ome.form,
    category: ome.cat, price: +(ome.tender * 1.6).toFixed(2),
    tenderPrice: ome.tender, agreedVolume: 60000, actualVolume: 55000,
    listingPrice: ome.base, hospital: HOSPITALS[2], region: "江苏省", date: "2026-06-19" });
  records.push(s3);
  MONTHS.forEach((m, i) => history.push({
    miCode: s3.miCode, region: "江苏省", date: `${m}-15`,
    price: i < 11 ? ome.tender : +(ome.tender * 1.6).toFixed(2),
  }));

  // S4 采购量落地：中选药实际采购量仅达约定量 30%
  records.push(makeRecord({ id: "S4",
    generic: met.generic, brand: met.brand, manufacturer: met.manufacturer, spec: met.spec, form: met.form,
    category: met.cat, price: met.tender,
    tenderPrice: met.tender, agreedVolume: 100000, actualVolume: 30000,
    listingPrice: met.base, hospital: HOSPITALS[1], region: "上海市", date: "2026-06-18" }));
  // 同类高价替代药挤占（不同厂家、未中选、价高）
  records.push(makeRecord({ id: "S4ALT",
    generic: met.generic, brand: "格华止", manufacturer: "中美华东", spec: met.spec, form: met.form,
    category: met.cat, price: +(met.tender * 2.4).toFixed(2),
    tenderPrice: null, agreedVolume: null, actualVolume: 70000,
    listingPrice: +(met.base * 2.2).toFixed(2), hospital: HOSPITALS[1], region: "上海市", date: "2026-06-18" }));

  // S5 标准化冲突：同一药品不同商品名/规格写法，价差悬殊
  records.push(makeRecord({ id: "S5",
    generic: "阿莫西林胶囊", brand: "阿莫仙", manufacturer: "联邦制药", spec: "0.25g×24", form: "胶囊剂",
    category: "drug", price: 9.8, tenderPrice: 3.1, agreedVolume: 50000, actualVolume: 48000,
    listingPrice: 10.0, hospital: HOSPITALS[2], region: "浙江省", date: "2026-06-17" }));

  // S6 诱饵（假阳性）：价"偏高"但剂型/规格不同不可比（缓释 vs 普通）+ 处于集采切换过渡期
  records.push(makeRecord({ id: "S6",
    generic: met.generic, brand: "迪化糖锭", manufacturer: "信谊药厂", spec: "0.5g*100片", form: "缓释片",
    category: "drug", price: +(met.tender * 1.7).toFixed(2),
    tenderPrice: met.tender, agreedVolume: 40000, actualVolume: 38000,
    listingPrice: +(met.base * 1.6).toFixed(2), hospital: HOSPITALS[0], region: "江苏省", date: "2026-06-16" }));

  return { records, history };
}
