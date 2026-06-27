import type { Thresholds, DimensionType } from "./types";
export const DEFAULT_THRESHOLDS: Thresholds = { tenderRatio: 1.5, historyMoM: 0.3, regionalDev: 0.5, volumeRate: 0.6 };
// 单维命中得分（加权后封顶 100）
export const DIM_SCORE: Record<DimensionType, number> = {
  tender: 45, regional: 30, history: 25, alternative: 25, volume: 30, standardize: 15,
};
export const RISK_HIGH = 70;
export const RISK_MID = 40;
export const CONF_CONFIRM = 80;
export const CONF_REVIEW = 50;
