import type { PriceRecord, Category } from "../types";

// 15位医保药品编码：1位类别(C药品) + 14位分类流水（演示用，结构合理即可）
export function miCode(seq: number, cat: Category): string {
  const head = cat === "drug" ? "C" : "H";
  return head + String(seq).padStart(14, "0");
}

export const REGIONS = ["浙江省", "江苏省", "安徽省", "上海市"];
export const HOSPITALS = ["省人民医院", "市第一医院", "市中医院", "县人民医院"];

// 真实通用名/商品名/厂家/规格/剂型（量级贴近现实）
export const CATALOG = [
  { generic: "阿托伐他汀钙片", brand: "立普妥", manufacturer: "辉瑞制药", spec: "20mg*7片", form: "片剂", cat: "drug", tender: 6.6, base: 8.0 },
  { generic: "硫酸氢氯吡格雷片", brand: "波立维", manufacturer: "赛诺菲", spec: "75mg*7片", form: "片剂", cat: "drug", tender: 17.8, base: 22.0 },
  { generic: "盐酸二甲双胍缓释片", brand: "君力达", manufacturer: "正大天晴", spec: "0.5g*30片", form: "缓释片", cat: "drug", tender: 4.2, base: 5.5 },
  { generic: "奥美拉唑肠溶胶囊", brand: "洛赛克", manufacturer: "阿斯利康", spec: "20mg*14粒", form: "肠溶胶囊", cat: "drug", tender: 9.0, base: 12.0 },
  { generic: "阿莫西林胶囊", brand: "再林", manufacturer: "联邦制药", spec: "0.25g*24粒", form: "胶囊", cat: "drug", tender: 3.1, base: 4.0 },
  { generic: "注射用头孢曲松钠", brand: "罗氏芬", manufacturer: "上海罗氏", spec: "1g*1支", form: "注射剂", cat: "drug", tender: 12.5, base: 16.0 },
  { generic: "孟鲁司特钠片", brand: "顺尔宁", manufacturer: "默沙东", spec: "10mg*5片", form: "片剂", cat: "drug", tender: 7.4, base: 9.0 },
  { generic: "冠脉药物洗脱支架", brand: "Firebird2", manufacturer: "微创医疗", spec: "标准型", form: "植入耗材", cat: "consumable", tender: 590, base: 750 },
] as const;

let _seq = 1000;
export function nextSeq() { return ++_seq; }

export function makeRecord(p: Partial<PriceRecord> & {
  generic: string; brand: string; manufacturer: string; spec: string; form: string;
  category: Category; price: number; region: string; hospital: string; date: string;
}): PriceRecord {
  const seq = nextSeq();
  return {
    id: p.id ?? `R${seq}`, miCode: p.miCode ?? miCode(seq, p.category),
    generic: p.generic, brand: p.brand, manufacturer: p.manufacturer, spec: p.spec, form: p.form,
    category: p.category, price: p.price,
    tenderPrice: p.tenderPrice ?? null, agreedVolume: p.agreedVolume ?? null,
    actualVolume: p.actualVolume ?? null, listingPrice: p.listingPrice ?? null,
    hospital: p.hospital, region: p.region, date: p.date,
  };
}
