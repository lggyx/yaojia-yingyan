export interface StatsOverview {
  monitoredCount: number;
  anomalyCount: number;
  byRisk: { high: number; mid: number; low: number };
  closedRate: number;
  dismissedCount: number;
}

export interface PriceRecord {
  id: string;
  miCode: string;
  generic: string;
  brand: string;
  manufacturer: string;
  spec: string;
  form: string;
  category: "drug" | "consumable";
  price: number;
  tenderPrice: number | null;
  agreedVolume: number | null;
  actualVolume: number | null;
  listingPrice: number | null;
  hospital: string;
  region: string;
  date: string;
}

export interface PriceDetail extends PriceRecord {
  history: Array<{ date: string; price: number }>;
}

export interface DimensionResult {
  type: string;
  base: number;
  actual: number;
  deviation: number;
  hit: boolean;
  detail: string;
}

export interface Anomaly {
  id: string;
  recordId: string;
  dimensions: DimensionResult[];
  riskScore: number;
  riskLevel: "high" | "mid" | "low";
  confidence: number;
  status: string;
  createdAt: string;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
}