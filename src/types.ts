export interface BasketOption {
  label: string;
  sourceType: 'exchange' | 'group' | 'all' | 'ws';
  code: string;
}

export interface DailyBreadthPoint {
  date: string; // YYYY-MM-DD
  hoseIndex: number | null;
  avgPrice: number | null;
  pctAboveMa200: number | null;
  pctBelowMa20: number | null;
  pctBottoming: number | null;
  pctDropFromPeak: number;
}

export interface StockSnapshot {
  ticker: string;
  companyName: string;
  date: string;
  close: number;
  volume: number;
  ma20: number | null;
  ma50: number | null;
  ma150: number | null;
  ma200: number | null;
  ma200_20dAgo: number | null;
  volMa20: number | null;
  volMa50: number | null;
  peak52w: number | null;
  bottom52w: number | null;
  pctFromPeak: number | null;
  pctFromBottom: number | null;
  momentum: number | null;
  rsRating: number | null;
  isLive: boolean;
  isMinerviniBase: boolean; // RS >= 60 + 7 trend template criteria
  phaseTitle: string;
  phaseColor: string;
  phaseDesc: string;
}

export interface VcpItem {
  ticker: string;
  companyName: string;
  isLive: boolean;
  rsRating: number;
  close: number;
  buyPoint: number;
  pctFromPivot: number;
  numContractions: number;
  ranges: number[];
  baseDays: number;
  volRatio: number | null;
  status: string;
  priority: number; // 0: buy, 1: near, 2: wait, 3: extended
  zigzagDates: string[];
  zigzagVals: number[];
}

export interface MarketSummary {
  hasVnIndex: boolean;
  indexLabel: string;
  actualEvalDate: string;
  totalRequested: number;
  totalLoaded: number;
  latestHose: number;
  prevHose: number;
  latestPctAboveMa200: number | null;
  prevPctAboveMa200: number | null;
  latestPctBelowMa20: number | null;
  prevPctBelowMa20: number | null;
  latestPctBottoming: number | null;
  prevPctBottoming: number | null;
  peakPrice: number;
  peakDate: string;
  pctDropFromPeak: number;
}

export interface RealtimeStatus {
  isRunning: boolean;
  tickCount: number;
  wsDiscoveredCount: number;
  sourceName: string;
  lastSyncStr: string;
}

export interface MarketAnalysisResponse {
  basketLabel: string;
  sourceInfo: string;
  symbols: string[];
  summary: MarketSummary;
  dailySeries: DailyBreadthPoint[];
  stocks: StockSnapshot[];
  vcpList: VcpItem[];
  realtime: RealtimeStatus;
  computeMs: number;
  cacheHit: boolean;
}

export interface StockBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma20: number | null;
  ma50: number | null;
  ma150: number | null;
  ma200: number | null;
  volMa50: number | null;
}

export interface StockDetailResponse {
  snapshot: StockSnapshot;
  vcp: VcpItem | null;
  bars: StockBar[];
}
