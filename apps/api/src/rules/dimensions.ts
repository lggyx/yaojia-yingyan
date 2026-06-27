import type { PriceRecord, PriceHistoryPoint, Thresholds, DimensionResult } from "@shared/types";

export function tenderDim(r: PriceRecord, t: Thresholds): DimensionResult | null {
  if (r.tenderPrice == null || r.tenderPrice <= 0) return null;
  const dev = r.price / r.tenderPrice;
  return { type: "tender", base: r.tenderPrice, actual: r.price, deviation: +dev.toFixed(3),
    hit: dev > t.tenderRatio, detail: `采购价/中标价=${dev.toFixed(2)}` };
}

export function historyDim(r: PriceRecord, hist: PriceHistoryPoint[], t: Thresholds): DimensionResult | null {
  const series = hist.filter(h => h.miCode === r.miCode && h.region === r.region)
    .sort((a,b)=>a.date.localeCompare(b.date));
  if (series.length < 3) return null;
  const prev = series.slice(0, -1);
  const avg = prev.reduce((s,h)=>s+h.price,0) / prev.length;
  const last = series[series.length-1].price;
  const mom = (last - avg) / avg;
  return { type: "history", base: +avg.toFixed(2), actual: last, deviation: +mom.toFixed(3),
    hit: mom > t.historyMoM, detail: `环比历史均值 +${(mom*100).toFixed(0)}%` };
}

export function regionalDim(r: PriceRecord, peers: PriceRecord[], t: Thresholds): DimensionResult | null {
  const others = peers.filter(p => p.generic === r.generic && p.manufacturer === r.manufacturer);
  if (others.length === 0) return null;
  const avg = others.reduce((s,p)=>s+p.price,0) / others.length;
  if (avg <= 0) return null;
  const dev = (r.price - avg) / avg;
  return { type: "regional", base: +avg.toFixed(2), actual: r.price, deviation: +dev.toFixed(3),
    hit: dev > t.regionalDev, detail: `较周边${others.length}地均价 +${(dev*100).toFixed(0)}%` };
}

export function volumeDim(r: PriceRecord, t: Thresholds): DimensionResult | null {
  if (r.agreedVolume == null || r.agreedVolume <= 0 || r.actualVolume == null) return null;
  if (r.tenderPrice == null) return null; // 仅对集采中选品种考核落地量
  const rate = r.actualVolume / r.agreedVolume;
  return { type: "volume", base: r.agreedVolume, actual: r.actualVolume, deviation: +rate.toFixed(3),
    hit: rate < t.volumeRate, detail: `采购量完成率 ${(rate*100).toFixed(0)}%` };
}

export function alternativeDim(r: PriceRecord, sameGeneric: PriceRecord[]): DimensionResult | null {
  // 中选品种被未中选高价替代药挤占：存在同通用名、无中标价、价更高、实际采购量更大的品种
  if (r.tenderPrice == null) return null;
  const alt = sameGeneric.find(p => p.id !== r.id && p.generic === r.generic
    && p.tenderPrice == null && p.price > r.price && (p.actualVolume ?? 0) > (r.actualVolume ?? 0));
  if (!alt) return null;
  return { type: "alternative", base: r.price, actual: alt.price, deviation: +(alt.price/r.price).toFixed(3),
    hit: true, detail: `疑被高价替代药「${alt.brand}」挤占` };
}
