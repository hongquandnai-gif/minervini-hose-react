import type {
  DailyBreadthPoint,
  MarketAnalysisResponse,
  MarketSummary,
  StockBar,
  StockDetailResponse,
  StockSnapshot,
  VcpItem,
} from '../src/types';
import type { RawOhlcvBar, RealtimeTick } from './ssiEngine';
import { getVnToday, realtimeFeed } from './ssiEngine';

export interface ComputedBar extends StockBar {
  ma200_20dAgo: number | null;
  volMa20: number | null;
  peak52w: number | null;
  bottom52w: number | null;
  pctFromPeak: number | null;
  pctFromBottom: number | null;
  momentum: number | null;
}

/** O(N) sliding window SMA */
function rollingMean(values: Float64Array, window: number, minPeriods = window): (number | null)[] {
  const n = values.length;
  const out = new Array<number | null>(n).fill(null);
  let sum = 0;
  let count = 0;

  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (Number.isFinite(v)) {
      sum += v;
      count++;
    }
    if (i >= window) {
      const old = values[i - window];
      if (Number.isFinite(old)) {
        sum -= old;
        count--;
      }
    }
    if (count >= minPeriods) {
      out[i] = sum / count;
    }
  }
  return out;
}

/** O(N) monotonic deque rolling max */
function rollingMax(values: Float64Array, window: number, minPeriods: number): (number | null)[] {
  const n = values.length;
  const out = new Array<number | null>(n).fill(null);
  const dq: number[] = [];
  let head = 0;

  for (let i = 0; i < n; i++) {
    while (head < dq.length && dq[head] <= i - window) head++;
    const v = values[i];
    while (dq.length > head && values[dq[dq.length - 1]] <= v) dq.pop();
    dq.push(i);
    if (i + 1 >= minPeriods) {
      out[i] = values[dq[head]];
    }
  }
  return out;
}

/** O(N) monotonic deque rolling min */
function rollingMin(values: Float64Array, window: number, minPeriods: number): (number | null)[] {
  const n = values.length;
  const out = new Array<number | null>(n).fill(null);
  const dq: number[] = [];
  let head = 0;

  for (let i = 0; i < n; i++) {
    while (head < dq.length && dq[head] <= i - window) head++;
    const v = values[i];
    while (dq.length > head && values[dq[dq.length - 1]] >= v) dq.pop();
    dq.push(i);
    if (i + 1 >= minPeriods) {
      out[i] = values[dq[head]];
    }
  }
  return out;
}

export function applyRealtimeTick(
  rawBars: RawOhlcvBar[],
  tick: RealtimeTick | undefined,
  vnToday: string
): { bars: RawOhlcvBar[]; isLive: boolean } {
  if (!tick || rawBars.length === 0) {
    return { bars: rawBars, isLive: false };
  }

  const last = rawBars[rawBars.length - 1];
  const prevClose = last.close;
  if (prevClose <= 0) return { bars: rawBars, isLive: false };

  let tPrice = tick.price;
  let tHigh = tick.high;
  let tLow = tick.low;
  let tOpen = tick.open > 0 ? tick.open : tPrice;
  const tVol = tick.volume > 0 ? tick.volume : 0;

  if (tPrice / prevClose > 100) {
    tPrice /= 1000;
    tHigh /= 1000;
    tLow /= 1000;
    tOpen /= 1000;
  }

  if (tPrice <= 0 || Math.abs(tPrice - prevClose) / prevClose > 0.2) {
    return { bars: rawBars, isLive: false };
  }

  if (tHigh <= 0 || Math.abs(tHigh - tPrice) / tPrice > 0.2) tHigh = tPrice;
  if (tLow <= 0 || Math.abs(tLow - tPrice) / tPrice > 0.2) tLow = tPrice;
  if (tOpen <= 0 || Math.abs(tOpen - tPrice) / tPrice > 0.2) tOpen = tPrice;

  tHigh = Math.max(tHigh, tPrice, tOpen);
  tLow = Math.min(tLow, tPrice, tOpen);

  const tickDate = tick.date || last.date;

  if (tickDate > last.date && tickDate <= vnToday) {
    const updated = rawBars.slice();
    updated.push({
      date: tickDate,
      open: Math.round(tOpen * 100) / 100,
      high: Math.round(tHigh * 100) / 100,
      low: Math.round(tLow * 100) / 100,
      close: Math.round(tPrice * 100) / 100,
      volume: tVol,
    });
    return { bars: updated, isLive: true };
  }

  if (tickDate === last.date) {
    const updated = rawBars.slice();
    updated[updated.length - 1] = {
      ...last,
      close: Math.round(tPrice * 100) / 100,
      high: Math.round(Math.max(last.high, tHigh) * 100) / 100,
      low: Math.round((last.low > 0 ? Math.min(last.low, tLow) : tLow) * 100) / 100,
      volume: tVol > 0 ? Math.max(last.volume, tVol) : last.volume,
    };
    return { bars: updated, isLive: true };
  }

  return { bars: rawBars, isLive: false };
}

export function computeIndicators(bars: RawOhlcvBar[]): ComputedBar[] {
  const n = bars.length;
  if (n === 0) return [];

  const closes = new Float64Array(n);
  const highs = new Float64Array(n);
  const lows = new Float64Array(n);
  const vols = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    closes[i] = bars[i].close;
    highs[i] = bars[i].high;
    lows[i] = bars[i].low;
    vols[i] = bars[i].volume;
  }

  const ma20 = rollingMean(closes, 20, 20);
  const ma50 = rollingMean(closes, 50, 50);
  const ma150 = rollingMean(closes, 150, 150);
  const ma200 = rollingMean(closes, 200, 200);
  const volMa20 = rollingMean(vols, 20, 5);
  const volMa50 = rollingMean(vols, 50, 10);
  const peak52w = rollingMax(highs, 252, 60);
  const bottom52w = rollingMin(lows, 252, 60);

  const out: ComputedBar[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const c = closes[i];
    const p52 = peak52w[i];
    const b52 = bottom52w[i];

    const c63 = i >= 63 && closes[i - 63] > 0 ? closes[i - 63] : null;
    const c126 = i >= 126 && closes[i - 126] > 0 ? closes[i - 126] : null;
    const c252 = i >= 252 && closes[i - 252] > 0 ? closes[i - 252] : null;

    let momentum: number | null = null;
    if (c63 !== null) {
      const r63 = c / c63 - 1;
      if (c252 !== null && c126 !== null) {
        const r126 = c / c126 - 1;
        const r252 = c / c252 - 1;
        momentum = (r63 * 0.4 + r126 * 0.3 + r252 * 0.3) * 100;
      } else if (c126 !== null) {
        const r126 = c / c126 - 1;
        momentum = (r63 * 0.6 + r126 * 0.4) * 100;
      } else {
        momentum = r63 * 100;
      }
    }

    out[i] = {
      date: bars[i].date,
      open: bars[i].open,
      high: bars[i].high,
      low: bars[i].low,
      close: bars[i].close,
      volume: bars[i].volume,
      ma20: ma20[i],
      ma50: ma50[i],
      ma150: ma150[i],
      ma200: ma200[i],
      ma200_20dAgo: i >= 20 ? ma200[i - 20] : null,
      volMa20: volMa20[i],
      volMa50: volMa50[i],
      peak52w: p52,
      bottom52w: b52,
      pctFromPeak: p52 !== null && p52 > 0 ? ((c - p52) / p52) * 100 : null,
      pctFromBottom: b52 !== null && b52 > 0 ? ((c - b52) / b52) * 100 : null,
      momentum,
    };
  }

  return out;
}

function diffCalendarDays(dateA: string, dateB: string): number {
  const a = Date.parse(`${dateA}T00:00:00Z`);
  const b = Date.parse(`${dateB}T00:00:00Z`);
  return Math.round((a - b) / 86400_000);
}

export function evaluateStockPhase(bar: ComputedBar): {
  phaseTitle: string;
  phaseColor: string;
  phaseDesc: string;
} {
  const { ma200, ma200_20dAgo, close, ma50, pctFromPeak, pctFromBottom } = bar;
  const ma200Slope =
    ma200 !== null && ma200_20dAgo !== null && ma200_20dAgo > 0
      ? ((ma200 - ma200_20dAgo) / ma200_20dAgo) * 100
      : 0;

  if (ma200 === null || ma50 === null || ma200 <= 0) {
    return {
      phaseTitle: 'CHƯA ĐỦ DỮ LIỆU MA200',
      phaseColor: '#64748b',
      phaseDesc: 'Cổ phiếu mới niêm yết hoặc chưa đủ lịch sử 200 phiên giao dịch để phân loại chu kỳ.',
    };
  }

  if (close > ma50 && ma50 > ma200 && close > ma200 && ma200Slope >= 0) {
    if (pctFromBottom !== null && pctFromPeak !== null && pctFromBottom >= 25 && pctFromPeak >= -25) {
      return {
        phaseTitle: 'GIAI ĐOẠN 2 (TĂNG TỐC - UPTREND MẠNH)',
        phaseColor: '#10b981',
        phaseDesc:
          'Cổ phiếu đạt chuẩn Stage 2 của Minervini: Cấu trúc xu hướng hoàn hảo, MA dốc lên, sát đỉnh 52 tuần. Ưu tiên điểm MUA theo đà tăng.',
      };
    }
    return {
      phaseTitle: 'GIAI ĐOẠN 2 (ĐANG TRONG XU HƯỚNG TĂNG)',
      phaseColor: '#059669',
      phaseDesc: 'Nằm trên MA50 & MA200 dốc lên. Xu hướng tăng chủ đạo, có thể xuất hiện nhịp tích lũy tự nhiên.',
    };
  }

  if (close <= ma50 && close > ma200 && ma50 > ma200 && ma200Slope >= 0.3) {
    return {
      phaseTitle: 'GIAI ĐOẠN 2 (ĐIỀU CHỈNH LÀNH MẠNH)',
      phaseColor: '#0284c7',
      phaseDesc:
        'Cổ phiếu đang kéo ngược về hỗ trợ MA50 trong khi MA200 vẫn dốc lên. Đây là nhịp tích lũy tự nhiên của Giai đoạn 2.',
    };
  }

  if (pctFromPeak !== null && pctFromPeak >= -25 && Math.abs(ma200Slope) < 0.6 && (close < ma50 || close < ma200)) {
    return {
      phaseTitle: 'GIAI ĐOẠN 3 (PHÂN PHỐI - TẠO ĐỈNH)',
      phaseColor: '#f59e0b',
      phaseDesc:
        'MA200 bắt đầu đi ngang, mất đà tăng trưởng. Giá dao động lỏng lẻo quanh MA50/MA200. Cân nhắc chốt lời từng phần.',
    };
  }

  if (
    Math.abs(ma200Slope) <= 0.8 &&
    Math.abs(close - ma200) / ma200 <= 0.12 &&
    (pctFromPeak === null || pctFromPeak < -25)
  ) {
    return {
      phaseTitle: 'GIAI ĐOẠN 1 (TÍCH LŨY - TẠO ĐÁY)',
      phaseColor: '#3b82f6',
      phaseDesc: 'Giá dao động biên hẹp quanh đường MA200 đang phẳng ra sau chu kỳ giảm dài.',
    };
  }

  if (close < ma200 && ma50 < ma200) {
    return {
      phaseTitle: 'GIAI ĐOẠN 4 (SUY THOÁI - DOWNTREND)',
      phaseColor: '#ef4444',
      phaseDesc:
        'Cổ phiếu trong xu hướng giảm dài hạn (Stage 4). Giá và MA50 nằm hoàn toàn dưới MA200. TUYỆT ĐỐI KHÔNG BẮT ĐÁY!',
    };
  }

  if (close < ma200 && close < ma50) {
    return {
      phaseTitle: 'CHUYỂN GIAO SANG GIAI ĐOẠN 4',
      phaseColor: '#f97316',
      phaseDesc: 'Giá đã xuyên thủng MA200 và MA50, cảnh báo rủi ro cao rơi vào chu kỳ giảm giá dài hạn.',
    };
  }

  if (close > ma200) {
    return {
      phaseTitle: 'CHUYỂN GIAO (TỪ GIAI ĐOẠN 1 SANG 2)',
      phaseColor: '#8b5cf6',
      phaseDesc: 'Giá đã bứt lên trên MA200, các đường trung bình ngắn hạn đang chuẩn bị giao cắt vàng.',
    };
  }

  return {
    phaseTitle: 'GIAI ĐOẠN 4 (SUY THOÁI)',
    phaseColor: '#ef4444',
    phaseDesc: 'Xu hướng giảm chi phối, giá nằm dưới MA200.',
  };
}

export function detectVcpPattern(
  bars: ComputedBar[],
  evalDate: string,
  lookbackDays = 150
): Omit<VcpItem, 'ticker' | 'companyName' | 'isLive' | 'rsRating'> | null {
  const cutoffDate = new Date(Date.parse(`${evalDate}T00:00:00Z`) - lookbackDays * 86400_000)
    .toISOString()
    .slice(0, 10);

  const data = bars.filter((b) => b.date >= cutoffDate && b.date <= evalDate && b.close > 0);
  if (data.length < 35) return null;

  const reversalPct = 0.028;
  type Swing = { mode: 'peak' | 'valley'; date: string; val: number };
  const swings: Swing[] = [];
  let currentMode: 'peak' | 'valley' = 'peak';
  let extremeVal = data[0].high > 0 ? data[0].high : data[0].close;
  let extremeDate = data[0].date;

  for (let i = 1; i < data.length; i++) {
    const hi = data[i].high > 0 ? data[i].high : data[i].close;
    const lo = data[i].low > 0 ? data[i].low : data[i].close;
    if (currentMode === 'peak') {
      if (hi >= extremeVal) {
        extremeVal = hi;
        extremeDate = data[i].date;
      } else if (extremeVal > 0 && (extremeVal - lo) / extremeVal >= reversalPct) {
        swings.push({ mode: 'peak', date: extremeDate, val: extremeVal });
        currentMode = 'valley';
        extremeVal = lo;
        extremeDate = data[i].date;
      }
    } else {
      if (lo <= extremeVal) {
        extremeVal = lo;
        extremeDate = data[i].date;
      } else if (extremeVal > 0 && (hi - extremeVal) / extremeVal >= reversalPct) {
        swings.push({ mode: 'valley', date: extremeDate, val: extremeVal });
        currentMode = 'peak';
        extremeVal = hi;
        extremeDate = data[i].date;
      }
    }
  }
  swings.push({ mode: currentMode, date: extremeDate, val: extremeVal });

  const cleanSwings: Swing[] = [];
  for (const s of swings) {
    if (cleanSwings.length === 0) {
      cleanSwings.push(s);
    } else if (cleanSwings[cleanSwings.length - 1].mode === s.mode) {
      if (s.mode === 'peak' && s.val > cleanSwings[cleanSwings.length - 1].val) {
        cleanSwings[cleanSwings.length - 1] = s;
      } else if (s.mode === 'valley' && s.val < cleanSwings[cleanSwings.length - 1].val) {
        cleanSwings[cleanSwings.length - 1] = s;
      }
    } else {
      cleanSwings.push(s);
    }
  }

  interface Contraction {
    peakDate: string;
    peakVal: number;
    valleyDate: string;
    valleyVal: number;
    depth: number;
  }

  const contractions: Contraction[] = [];
  for (let i = 0; i < cleanSwings.length - 1; i++) {
    if (cleanSwings[i].mode === 'peak' && cleanSwings[i + 1].mode === 'valley') {
      const pVal = cleanSwings[i].val;
      const vVal = cleanSwings[i + 1].val;
      if (pVal <= 0 || vVal <= 0) continue;
      contractions.push({
        peakDate: cleanSwings[i].date,
        peakVal: pVal,
        valleyDate: cleanSwings[i + 1].date,
        valleyVal: vVal,
        depth: ((pVal - vVal) / pVal) * 100,
      });
    }
  }

  if (contractions.length < 2) return null;

  const lastBar = data[data.length - 1];
  const currPrice = lastBar.close;

  for (const numC of [4, 3, 2]) {
    if (contractions.length < numC) continue;
    const cand = contractions.slice(-numC);
    const depths = cand.map((c) => c.depth);
    const valleys = cand.map((c) => c.valleyVal);
    const peaks = cand.map((c) => c.peakVal);

    const baseDays = diffCalendarDays(cand[cand.length - 1].valleyDate, cand[0].peakDate);
    const daysSinceLastValley = diffCalendarDays(lastBar.date, cand[cand.length - 1].valleyDate);
    const pivot = cand[cand.length - 1].peakVal;
    const lastValley = cand[cand.length - 1].valleyVal;

    const strictlyContracting = depths.every((d, idx) => idx === depths.length - 1 || d > depths[idx + 1]);
    const higherLows = valleys.every((v, idx) => idx === valleys.length - 1 || v <= valleys[idx + 1] * 1.015);
    const boundedPeaks = peaks.every((p) => p <= peaks[0] * 1.04);

    if (
      pivot > 0 &&
      baseDays >= 15 &&
      daysSinceLastValley <= 35 &&
      currPrice >= lastValley * 0.98 &&
      strictlyContracting &&
      higherLows &&
      depths[depths.length - 1] <= 8.5 &&
      boundedPeaks
    ) {
      const pctFromPivot = ((currPrice - pivot) / pivot) * 100;
      const volRatio =
        lastBar.volMa50 !== null && lastBar.volMa50 > 0 ? (lastBar.volume / lastBar.volMa50) * 100 : null;

      let status: string;
      let priority: number;
      if (pctFromPivot >= 0 && pctFromPivot <= 5.0) {
        status = 'Điểm Mua Chuẩn (<= 5%)';
        priority = 0;
      } else if (pctFromPivot >= -5.0 && pctFromPivot < 0) {
        status = `Sát Pivot (${pctFromPivot.toFixed(1)}%)`;
        priority = 1;
      } else if (pctFromPivot < -5.0) {
        status = `Chờ Pivot (${pctFromPivot.toFixed(1)}%)`;
        priority = 2;
      } else {
        status = `Quá Điểm Mua (+${pctFromPivot.toFixed(1)}%)`;
        priority = 3;
      }

      const zigzagDates: string[] = [];
      const zigzagVals: number[] = [];
      for (const c of cand) {
        zigzagDates.push(c.peakDate, c.valleyDate);
        zigzagVals.push(c.peakVal, c.valleyVal);
      }

      return {
        close: currPrice,
        buyPoint: pivot,
        pctFromPivot,
        numContractions: numC,
        ranges: depths.map((d) => Math.round(d * 10) / 10),
        baseDays,
        volRatio,
        status,
        priority,
        zigzagDates,
        zigzagVals,
      };
    }
  }

  return null;
}

export function isMinerviniTrendTemplate(s: StockSnapshot, minRs: number, minVol: number): boolean {
  if (
    s.ma50 === null ||
    s.ma150 === null ||
    s.ma200 === null ||
    s.ma200_20dAgo === null ||
    s.pctFromBottom === null ||
    s.pctFromPeak === null ||
    s.rsRating === null
  ) {
    return false;
  }
  return (
    s.close > s.ma150 &&
    s.close > s.ma200 &&
    s.ma150 > s.ma200 &&
    s.ma200 > s.ma200_20dAgo &&
    s.ma50 > s.ma150 &&
    s.ma50 > s.ma200 &&
    s.close > s.ma50 &&
    s.pctFromBottom >= 25 &&
    s.pctFromPeak >= -25 &&
    s.rsRating >= minRs &&
    (s.volMa20 ?? 0) >= minVol
  );
}

/** Matches pandas rank(pct=True, ascending=True, method='average') -> [1..99] */
function assignRsRatings(snapshots: StockSnapshot[]): void {
  const validIndices: number[] = [];
  for (let i = 0; i < snapshots.length; i++) {
    if (snapshots[i].momentum !== null && Number.isFinite(snapshots[i].momentum!)) {
      validIndices.push(i);
    }
  }
  const total = validIndices.length;
  if (total === 0) return;

  validIndices.sort((a, b) => snapshots[a].momentum! - snapshots[b].momentum!);

  let i = 0;
  while (i < total) {
    let j = i;
    const val = snapshots[validIndices[i]].momentum!;
    while (j + 1 < total && snapshots[validIndices[j + 1]].momentum! === val) {
      j++;
    }
    const avgRank = (i + j) / 2 + 1; // 1-based average rank
    const pct = avgRank / total;
    const rs = Math.round(pct * 98) + 1;
    for (let k = i; k <= j; k++) {
      snapshots[validIndices[k]].rsRating = rs;
    }
    i = j + 1;
  }
}

export interface ComputedDataset {
  basketLabel: string;
  sourceInfo: string;
  symbols: string[];
  symbolNames: Record<string, string>;
  computedByTicker: Map<string, ComputedBar[]>;
  liveTickers: Set<string>;
  vcpByTicker: Map<string, VcpItem>;
  snapshotByTicker: Map<string, StockSnapshot>;
  response: MarketAnalysisResponse;
}

export function buildMarketAnalysis(params: {
  basketLabel: string;
  sourceInfo: string;
  symbols: string[];
  symbolNames: Record<string, string>;
  rawByTicker: Map<string, RawOhlcvBar[]>;
  vnIndexBars: RawOhlcvBar[];
  startDate: string;
  endDate: string;
  minVolFilter: number;
  applyRealtime: boolean;
  cacheHit: boolean;
  t0: number;
}): ComputedDataset {
  const vnToday = getVnToday();
  const rtTicks = params.applyRealtime && params.endDate >= vnToday ? realtimeFeed.getAllRealtime() : new Map<string, RealtimeTick>();
  const effectiveEnd = rtTicks.size > 0 && vnToday > params.endDate ? vnToday : params.endDate;

  const computedByTicker = new Map<string, ComputedBar[]>();
  const liveTickers = new Set<string>();
  let actualEvalDate = '';

  // Daily breadth accumulators
  interface DayAcc {
    priceSum: number;
    priceCount: number;
    total52w: number;
    bottoming: number;
    totalMa200: number;
    aboveMa200: number;
    totalMa20: number;
    belowMa20: number;
    tickersPresent: Set<string>;
  }
  const dayAccMap = new Map<string, DayAcc>();

  const getAcc = (d: string): DayAcc => {
    let acc = dayAccMap.get(d);
    if (!acc) {
      acc = {
        priceSum: 0,
        priceCount: 0,
        total52w: 0,
        bottoming: 0,
        totalMa200: 0,
        aboveMa200: 0,
        totalMa20: 0,
        belowMa20: 0,
        tickersPresent: new Set<string>(),
      };
      dayAccMap.set(d, acc);
    }
    return acc;
  };

  let maxBaseDate = '';
  for (const bars of params.rawByTicker.values()) {
    const last = bars[bars.length - 1];
    if (last && last.date <= params.endDate && last.date > maxBaseDate) {
      maxBaseDate = last.date;
    }
  }

  for (const [ticker, rawBars] of params.rawByTicker.entries()) {
    const { bars: mergedBars, isLive } = applyRealtimeTick(rawBars, rtTicks.get(ticker), vnToday);
    if (isLive) liveTickers.add(ticker);
    const computed = computeIndicators(mergedBars);
    computedByTicker.set(ticker, computed);

    for (const b of computed) {
      if (b.date > effectiveEnd) break;
      if (b.date > actualEvalDate) actualEvalDate = b.date;
      if (b.date < params.startDate) continue;

      const acc = getAcc(b.date);
      acc.priceSum += b.close;
      acc.priceCount++;
      acc.tickersPresent.add(ticker);
      if (b.bottom52w !== null) {
        acc.total52w++;
        if (b.pctFromBottom !== null && b.pctFromBottom <= 10) acc.bottoming++;
      }
      if (b.ma200 !== null) {
        acc.totalMa200++;
        if (b.close > b.ma200) acc.aboveMa200++;
      }
      if (b.ma20 !== null) {
        acc.totalMa20++;
        if (b.close < b.ma20) acc.belowMa20++;
      }
    }
  }

  // Carry forward untouched tickers' latest bar (within 14 days) for brand-new intraday date so breadth doesn't jump artificially
  if (maxBaseDate && actualEvalDate > maxBaseDate) {
    const intradayAcc = dayAccMap.get(actualEvalDate);
    if (intradayAcc) {
      for (const [ticker, computed] of computedByTicker.entries()) {
        if (intradayAcc.tickersPresent.has(ticker)) continue;
        // find latest bar < actualEvalDate
        let prevBar: ComputedBar | null = null;
        for (let i = computed.length - 1; i >= 0; i--) {
          if (computed[i].date < actualEvalDate) {
            prevBar = computed[i];
            break;
          }
        }
        if (prevBar && diffCalendarDays(actualEvalDate, prevBar.date) <= 14) {
          intradayAcc.priceSum += prevBar.close;
          intradayAcc.priceCount++;
          if (prevBar.bottom52w !== null) {
            intradayAcc.total52w++;
            if (prevBar.pctFromBottom !== null && prevBar.pctFromBottom <= 10) intradayAcc.bottoming++;
          }
          if (prevBar.ma200 !== null) {
            intradayAcc.totalMa200++;
            if (prevBar.close > prevBar.ma200) intradayAcc.aboveMa200++;
          }
          if (prevBar.ma20 !== null) {
            intradayAcc.totalMa20++;
            if (prevBar.close < prevBar.ma20) intradayAcc.belowMa20++;
          }
        }
      }
    }
  }

  // Build VNINDEX lookup map
  const hasVnIndex = params.vnIndexBars.length > 0;
  const vniMap = new Map<string, number>();
  for (const b of params.vnIndexBars) {
    vniMap.set(b.date, b.close);
  }

  const sortedDates = Array.from(dayAccMap.keys()).sort();
  const dailySeries: DailyBreadthPoint[] = [];

  // Forward-fill & back-fill VNINDEX
  let lastKnownVni: number | null = null;
  for (const b of params.vnIndexBars) {
    if (b.date <= (sortedDates[0] || '')) lastKnownVni = b.close;
  }

  for (const d of sortedDates) {
    const acc = dayAccMap.get(d)!;
    const avgPrice = acc.priceCount > 0 ? acc.priceSum / acc.priceCount : null;
    if (vniMap.has(d)) {
      lastKnownVni = vniMap.get(d)!;
    }
    const hoseIndex = hasVnIndex ? lastKnownVni : avgPrice;
    dailySeries.push({
      date: d,
      hoseIndex,
      avgPrice,
      pctAboveMa200: acc.totalMa200 > 0 ? (acc.aboveMa200 / acc.totalMa200) * 100 : null,
      pctBelowMa20: acc.totalMa20 > 0 ? (acc.belowMa20 / acc.totalMa20) * 100 : null,
      pctBottoming: acc.total52w > 0 ? (acc.bottoming / acc.total52w) * 100 : null,
      pctDropFromPeak: 0,
    });
  }

  // Back-fill initial null hoseIndex if VNINDEX started slightly after sortedDates[0]
  if (hasVnIndex && dailySeries.length > 0 && dailySeries[0].hoseIndex === null) {
    const firstNonNull = dailySeries.find((p) => p.hoseIndex !== null)?.hoseIndex ?? null;
    for (const p of dailySeries) {
      if (p.hoseIndex === null) p.hoseIndex = firstNonNull;
      else break;
    }
  }

  // Apply realtime VNINDEX tick on last date
  const vniTick = rtTicks.get('VNINDEX');
  if (hasVnIndex && vniTick && dailySeries.length > 0) {
    const lastPt = dailySeries[dailySeries.length - 1];
    if (
      vniTick.date === lastPt.date &&
      lastPt.hoseIndex !== null &&
      lastPt.hoseIndex > 0 &&
      Math.abs(vniTick.price - lastPt.hoseIndex) / lastPt.hoseIndex <= 0.1
    ) {
      lastPt.hoseIndex = vniTick.price;
    }
  }

  // Running cumulative peak & peak stats
  let cumPeak = 0;
  let peakPrice = 0;
  let peakDate = dailySeries[0]?.date || actualEvalDate;

  for (const p of dailySeries) {
    if (p.hoseIndex !== null && p.hoseIndex > 0) {
      if (p.hoseIndex > cumPeak) cumPeak = p.hoseIndex;
      if (p.hoseIndex >= peakPrice) {
        peakPrice = p.hoseIndex;
        peakDate = p.date;
      }
      p.pctDropFromPeak = cumPeak > 0 ? ((cumPeak - p.hoseIndex) / cumPeak) * 100 : 0;
    }
  }

  // Build latest snapshot per ticker (within 14 calendar days of actualEvalDate)
  const stocks: StockSnapshot[] = [];
  const latestBarByTicker = new Map<string, ComputedBar>();

  for (const [ticker, computed] of computedByTicker.entries()) {
    let latest: ComputedBar | null = null;
    for (let i = computed.length - 1; i >= 0; i--) {
      if (computed[i].date <= effectiveEnd) {
        latest = computed[i];
        break;
      }
    }
    if (!latest) continue;
    if (actualEvalDate && diffCalendarDays(actualEvalDate, latest.date) > 14) continue;

    latestBarByTicker.set(ticker, latest);
    const phase = evaluateStockPhase(latest);
    stocks.push({
      ticker,
      companyName: params.symbolNames[ticker] || '',
      date: latest.date,
      close: latest.close,
      volume: latest.volume,
      ma20: latest.ma20,
      ma50: latest.ma50,
      ma150: latest.ma150,
      ma200: latest.ma200,
      ma200_20dAgo: latest.ma200_20dAgo,
      volMa20: latest.volMa20,
      volMa50: latest.volMa50,
      peak52w: latest.peak52w,
      bottom52w: latest.bottom52w,
      pctFromPeak: latest.pctFromPeak,
      pctFromBottom: latest.pctFromBottom,
      momentum: latest.momentum,
      rsRating: null,
      isLive: liveTickers.has(ticker),
      isMinerviniBase: false,
      phaseTitle: phase.phaseTitle,
      phaseColor: phase.phaseColor,
      phaseDesc: phase.phaseDesc,
    });
  }

  assignRsRatings(stocks);

  const snapshotByTicker = new Map<string, StockSnapshot>();
  const vcpList: VcpItem[] = [];
  const vcpByTicker = new Map<string, VcpItem>();

  for (const s of stocks) {
    s.isMinerviniBase = isMinerviniTrendTemplate(s, 60, params.minVolFilter);
    snapshotByTicker.set(s.ticker, s);

    if (s.isMinerviniBase && s.rsRating !== null) {
      const bars = computedByTicker.get(s.ticker);
      if (bars) {
        const resVcp = detectVcpPattern(bars, actualEvalDate, 150);
        if (resVcp) {
          const item: VcpItem = {
            ...resVcp,
            ticker: s.ticker,
            companyName: s.companyName,
            isLive: s.isLive,
            rsRating: s.rsRating,
          };
          vcpList.push(item);
          vcpByTicker.set(s.ticker, item);
        }
      }
    }
  }

  vcpList.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const distDiff = Math.abs(a.pctFromPivot) - Math.abs(b.pctFromPivot);
    if (Math.abs(distDiff) > 1e-9) return distDiff;
    return b.rsRating - a.rsRating;
  });

  // Sort stocks: VCP first -> Minervini base -> remaining by RS desc
  const vcpRank = new Map<string, number>();
  vcpList.forEach((v, idx) => vcpRank.set(v.ticker, idx));

  stocks.sort((a, b) => {
    const aVcp = vcpRank.has(a.ticker) ? vcpRank.get(a.ticker)! : Infinity;
    const bVcp = vcpRank.has(b.ticker) ? vcpRank.get(b.ticker)! : Infinity;
    if (aVcp !== bVcp) return aVcp - bVcp;
    if (a.isMinerviniBase !== b.isMinerviniBase) return a.isMinerviniBase ? -1 : 1;
    const aRs = a.rsRating ?? -1;
    const bRs = b.rsRating ?? -1;
    if (aRs !== bRs) return bRs - aRs;
    return a.ticker.localeCompare(b.ticker);
  });

  const validHose = dailySeries.filter((p) => p.hoseIndex !== null);
  const latestHose = validHose.length > 0 ? validHose[validHose.length - 1].hoseIndex! : 0;
  const prevHose = validHose.length > 1 ? validHose[validHose.length - 2].hoseIndex! : latestHose;

  const lastDay = dailySeries[dailySeries.length - 1];
  const prevDay = dailySeries.length > 1 ? dailySeries[dailySeries.length - 2] : lastDay;

  const summary: MarketSummary = {
    hasVnIndex,
    indexLabel: hasVnIndex ? 'Chỉ Số HOSE (VN-INDEX)' : 'Giá TB Rổ Cổ Phiếu',
    actualEvalDate,
    totalRequested: params.symbols.length,
    totalLoaded: stocks.length,
    latestHose,
    prevHose,
    latestPctAboveMa200: lastDay?.pctAboveMa200 ?? null,
    prevPctAboveMa200: prevDay?.pctAboveMa200 ?? null,
    latestPctBelowMa20: lastDay?.pctBelowMa20 ?? null,
    prevPctBelowMa20: prevDay?.pctBelowMa20 ?? null,
    latestPctBottoming: lastDay?.pctBottoming ?? null,
    prevPctBottoming: prevDay?.pctBottoming ?? null,
    peakPrice,
    peakDate,
    pctDropFromPeak: peakPrice > 0 ? ((peakPrice - latestHose) / peakPrice) * 100 : 0,
  };

  const response: MarketAnalysisResponse = {
    basketLabel: params.basketLabel,
    sourceInfo: params.sourceInfo,
    symbols: params.symbols,
    summary,
    dailySeries,
    stocks,
    vcpList,
    realtime: realtimeFeed.getStatus(),
    computeMs: Math.round(performance.now() - params.t0),
    cacheHit: params.cacheHit,
  };

  return {
    basketLabel: params.basketLabel,
    sourceInfo: params.sourceInfo,
    symbols: params.symbols,
    symbolNames: params.symbolNames,
    computedByTicker,
    liveTickers,
    vcpByTicker,
    snapshotByTicker,
    response,
  };
}

export function getStockDetailFromDataset(dataset: ComputedDataset, ticker: string): StockDetailResponse | null {
  const sym = ticker.toUpperCase();
  const snapshot = dataset.snapshotByTicker.get(sym);
  const allBars = dataset.computedByTicker.get(sym);
  if (!snapshot || !allBars) return null;

  const evalDate = dataset.response.summary.actualEvalDate;
  const filtered = allBars.filter((b) => b.date <= evalDate);
  const tail = filtered.slice(-160);

  let vcp = dataset.vcpByTicker.get(sym) ?? null;
  if (!vcp) {
    const rawVcp = detectVcpPattern(allBars, evalDate, 150);
    if (rawVcp) {
      vcp = {
        ...rawVcp,
        ticker: sym,
        companyName: snapshot.companyName,
        isLive: snapshot.isLive,
        rsRating: snapshot.rsRating ?? 0,
      };
    }
  }

  return {
    snapshot,
    vcp,
    bars: tail.map((b) => ({
      date: b.date,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume,
      ma20: b.ma20,
      ma50: b.ma50,
      ma150: b.ma150,
      ma200: b.ma200,
      volMa50: b.volMa50,
    })),
  };
}
