import WebSocket from 'ws';
import type { BasketOption, RealtimeStatus } from '../src/types';

export interface RawOhlcvBar {
  date: string; // YYYY-MM-DD (VN UTC+7)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface RealtimeTick {
  price: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  date: string; // YYYY-MM-DD
  updatedAt: number;
}

const VN_OFFSET_MS = 7 * 3600 * 1000;

export function getVnNow(): Date {
  return new Date(Date.now() + VN_OFFSET_MS);
}

export function getVnToday(): string {
  return getVnNow().toISOString().slice(0, 10);
}

export function formatVnTime(): string {
  return getVnNow().toISOString().slice(11, 19);
}

export function isVnMarketHours(): boolean {
  const vn = getVnNow();
  const day = vn.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const mins = vn.getUTCHours() * 60 + vn.getUTCMinutes();
  return mins >= 8 * 60 + 45 && mins <= 15 * 60 + 15;
}

const BASE_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
};

const SSI_HEADERS: Record<string, string> = {
  ...BASE_HEADERS,
  Origin: 'https://iboard.ssi.com.vn',
  Referer: 'https://iboard.ssi.com.vn/',
};

export const BASKETS: BasketOption[] = [
  { label: 'HOSE', sourceType: 'exchange', code: 'hose' },
  { label: 'VN30', sourceType: 'group', code: 'VN30' },
  { label: 'VN100', sourceType: 'group', code: 'VN100' },
  { label: 'VNAllShare (VNALL)', sourceType: 'group', code: 'VNALL' },
  { label: 'VNMidCap (VNMID)', sourceType: 'group', code: 'VNMID' },
  { label: 'VNSmallCap (VNSML)', sourceType: 'group', code: 'VNSML' },
  { label: 'HNX', sourceType: 'exchange', code: 'hnx' },
  { label: 'HNX30', sourceType: 'group', code: 'HNX30' },
  { label: 'UPCOM', sourceType: 'exchange', code: 'upcom' },
  { label: 'HOSE + HNX + UPCOM', sourceType: 'all', code: 'ALL' },
  { label: 'WebSocket SSI (Trực tiếp trong phiên)', sourceType: 'ws', code: 'WS_LIVE' },
];

export const HOSE_FULL_FALLBACK: string[] = [
  'AAA', 'AAM', 'AAT', 'ABR', 'ABS', 'ABT', 'ACB', 'ACC', 'ACG', 'ACL', 'ADG', 'ADP', 'ADS', 'AGG', 'AGM', 'AGR',
  'AMD', 'ANV', 'APC', 'APG', 'APH', 'ASG', 'ASM', 'ASP', 'AST', 'BAF', 'BBC', 'BCE', 'BCG', 'BCM', 'BFC', 'BHN',
  'BIC', 'BID', 'BKG', 'BMC', 'BMI', 'BMP', 'BRC', 'BSI', 'BTP', 'BTT', 'BVH', 'BWE', 'C32', 'C47', 'CCI', 'CCL',
  'CDC', 'CHP', 'CIG', 'CII', 'CKG', 'CLC', 'CLL', 'CLW', 'CMG', 'CMV', 'CMX', 'CNG', 'COM', 'CRC', 'CRE', 'CSM',
  'CSV', 'CTD', 'CTF', 'CTG', 'CTI', 'CTR', 'CTS', 'CVT', 'D2D', 'DAG', 'DAH', 'DAT', 'DBC', 'DBD', 'DBT', 'DC4',
  'DCL', 'DCM', 'DGC', 'DGW', 'DHA', 'DHC', 'DHG', 'DHM', 'DIG', 'DLG', 'DMC', 'DPG', 'DPM', 'DPR', 'DQC', 'DRC',
  'DRH', 'DRL', 'DSE', 'DSN', 'DTA', 'DTL', 'DTT', 'DVP', 'DXG', 'DXS', 'DXV', 'EIB', 'ELC', 'EMC', 'EVE', 'EVF',
  'EVG', 'FCM', 'FCN', 'FDC', 'FIR', 'FIT', 'FMC', 'FPT', 'FRT', 'FTS', 'GAB', 'GAS', 'GDT', 'GEG', 'GEX', 'GIL',
  'GMC', 'GMD', 'GMH', 'GSP', 'GTA', 'GVR', 'HAG', 'HAH', 'HAI', 'HAP', 'HAR', 'HAS', 'HAX', 'HBC', 'HCD', 'HCM',
  'HDB', 'HDC', 'HDG', 'HHP', 'HHS', 'HHV', 'HID', 'HII', 'HMC', 'HNA', 'HNG', 'HPG', 'HPX', 'HQC', 'HRC', 'HSG',
  'HSL', 'HT1', 'HTI', 'HTL', 'HTN', 'HTV', 'HU1', 'HU3', 'HUB', 'HVH', 'HVN', 'HVX', 'ICT', 'IDI', 'IJC', 'ILB',
  'IMP', 'ITA', 'ITC', 'ITD', 'JVC', 'KBC', 'KDC', 'KDH', 'KHG', 'KHP', 'KMR', 'KOS', 'KPF', 'KSB', 'L10', 'LAF',
  'LBM', 'LCG', 'LCM', 'LDG', 'LEC', 'LGC', 'LGL', 'LHG', 'LIX', 'LM8', 'LPB', 'LSS', 'MBB', 'MCG', 'MCP', 'MDG',
  'MHC', 'MIG', 'MSB', 'MSH', 'MSN', 'MWG', 'NAB', 'NAF', 'NAV', 'NBB', 'NCT', 'NHA', 'NHH', 'NHT', 'NKG', 'NLG',
  'NNC', 'NO1', 'NSC', 'NT2', 'NTL', 'NVL', 'NVT', 'OCB', 'OGC', 'OPC', 'ORS', 'PAC', 'PAN', 'PC1', 'PDN', 'PDR',
  'PET', 'PGC', 'PGD', 'PGI', 'PGV', 'PHC', 'PHR', 'PIT', 'PJT', 'PLP', 'PLX', 'PMG', 'PNC', 'PNJ', 'POM', 'POW',
  'PPC', 'PSH', 'PTB', 'PTC', 'PTL', 'PVD', 'PVP', 'PVT', 'QBS', 'QCG', 'RAL', 'RDP', 'REE', 'S4A', 'SAB', 'SAM',
  'SAV', 'SBA', 'SBT', 'SBV', 'SC5', 'SCD', 'SCR', 'SCS', 'SFC', 'SFG', 'SFI', 'SGN', 'SGR', 'SGT', 'SHA', 'SHB',
  'SHI', 'SHP', 'SIP', 'SJD', 'SJF', 'SJS', 'SKG', 'SMA', 'SMB', 'SMC', 'SPM', 'SRC', 'SRF', 'SSB', 'SSC', 'SSI',
  'ST8', 'STB', 'STG', 'STK', 'SVC', 'SVD', 'SVI', 'SVT', 'SZC', 'SZL', 'TBC', 'TCB', 'TCD', 'TCH', 'TCI', 'TCL',
  'TCM', 'TCO', 'TCR', 'TCT', 'TDC', 'TDG', 'TDH', 'TDM', 'TDP', 'TDW', 'TEG', 'VGG', 'THG', 'THI', 'TIP', 'TIX',
  'TLD', 'TLG', 'TLH', 'TMP', 'TMS', 'TMT', 'TN1', 'TNA', 'TNC', 'TNH', 'TNI', 'TNT', 'TPB', 'TPC', 'TRA', 'TRC',
  'TSC', 'TTA', 'TTE', 'TTF', 'TV2', 'TVB', 'TVS', 'TVT', 'TYA', 'UIC', 'VAF', 'VCA', 'VCB', 'VCF', 'VCG', 'VCI',
  'VDP', 'VDS', 'VFG', 'VGC', 'VHC', 'VHM', 'VIB', 'VIC', 'VID', 'VIP', 'VIX', 'VJC', 'VMD', 'VND', 'VNE', 'VNG',
  'VNL', 'VNM', 'VNS', 'VOS', 'VPB', 'VPD', 'VPG', 'VPH', 'VPI', 'VPS', 'VRC', 'VRE', 'VSC', 'VSH', 'VSI', 'VTB',
  'VTO', 'VTP', 'YBM', 'YEG',
];

export const VN30_FALLBACK: string[] = [
  'ACB', 'BCM', 'BID', 'BVH', 'CTG', 'FPT', 'GAS', 'GVR', 'HDB', 'HPG',
  'LPB', 'MBB', 'MSN', 'MWG', 'PLX', 'SAB', 'SHB', 'SSB', 'SSI', 'STB',
  'TCB', 'TPB', 'VCB', 'VHM', 'VIB', 'VIC', 'VJC', 'VNM', 'VPB', 'VRE',
];

export const HNX30_FALLBACK: string[] = [
  'BVS', 'CAP', 'CEO', 'DHT', 'DP3', 'DTD', 'DVM', 'DXP', 'HGM', 'HUT',
  'IDC', 'IDV', 'L14', 'L18', 'LAS', 'LHC', 'MBS', 'NTP', 'NVB', 'PLC',
  'PSD', 'PVB', 'PVC', 'PVI', 'PVS', 'SHS', 'SLS', 'TMB', 'TNG', 'VC3',
];

export function isValidVnTicker(sym: string): boolean {
  const s = String(sym || '').trim().toUpperCase();
  return /^[A-Z][A-Z0-9]{2}$/.test(s);
}

// Circuit breakers for SSI & VNDirect Finfo endpoints when cloud IPs get 403/429/timeout
let ssiChartFailStreak = 0;
let ssiChartBlockedUntil = 0;
let ssiIboardBlockedUntil = 0;
let vndFinfoBlockedUntil = 0;

// In-memory TTL caches for ultra-fast repeat queries
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const basketCache = new Map<string, CacheEntry<{ symbols: string[]; names: Record<string, string>; sourceInfo: string }>>();
let masterNamesCache: CacheEntry<Record<string, string>> | null = null;
const symbolHistoryCache = new Map<string, CacheEntry<RawOhlcvBar[]>>();
const inFlightHistory = new Map<string, Promise<RawOhlcvBar[]>>();

export function resetAllCaches(): void {
  ssiChartFailStreak = 0;
  ssiChartBlockedUntil = 0;
  ssiIboardBlockedUntil = 0;
  vndFinfoBlockedUntil = 0;
  basketCache.clear();
  masterNamesCache = null;
  symbolHistoryCache.clear();
}

async function fetchJsonWithTimeout(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<{ status: number; data: unknown | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { headers, signal: controller.signal });
    if (!resp.ok) {
      return { status: resp.status, data: null };
    }
    const data = await resp.json();
    return { status: resp.status, data };
  } catch {
    return { status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

function extractSsiItems(items: unknown[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const sym = String(item.stockSymbol || item.sym || item.code || '').trim().toUpperCase();
    if (!isValidVnTicker(sym)) continue;

    const stockType = String(item.stockType || '').trim().toLowerCase();
    if (stockType && stockType !== 's' && stockType !== 'stock' && stockType !== 'st') {
      continue;
    }

    const compName = String(
      item.companyNameVi || item.companyName || item.companyNameEn || item.stockName || ''
    ).trim();

    if (!(sym in map) || (!map[sym] && compName)) {
      map[sym] = compName;
    }
  }
  return map;
}

async function fetchSsiEndpoint(url: string): Promise<Record<string, string>> {
  if (Date.now() < ssiIboardBlockedUntil) return {};
  const { status, data } = await fetchJsonWithTimeout(url, SSI_HEADERS, 2000);
  if (status === 200 && data && typeof data === 'object') {
    const items = (data as Record<string, unknown>).data;
    if (Array.isArray(items) && items.length > 0) {
      return extractSsiItems(items);
    }
  } else if (status === 401 || status === 403 || status === 429 || status === 0) {
    ssiIboardBlockedUntil = Date.now() + 300_000;
  }
  return {};
}

async function fetchVndFallback(floors: string): Promise<Record<string, string>> {
  if (Date.now() < vndFinfoBlockedUntil) return {};
  const url = `https://finfo-api.vndirect.com.vn/v4/stocks?q=type:stock~status:listed~floor:${floors}&size=3000`;
  const { status, data } = await fetchJsonWithTimeout(url, BASE_HEADERS, 2000);
  if (status === 200 && data && typeof data === 'object') {
    const items = (data as Record<string, unknown>).data;
    if (Array.isArray(items)) {
      const res: Record<string, string> = {};
      for (const raw of items) {
        if (!raw || typeof raw !== 'object') continue;
        const item = raw as Record<string, unknown>;
        const code = String(item.code || '').trim().toUpperCase();
        if (isValidVnTicker(code)) {
          res[code] = String(item.companyName || item.shortName || '').trim();
        }
      }
      return res;
    }
  } else if (status === 0 || status === 401 || status === 403 || status >= 500) {
    vndFinfoBlockedUntil = Date.now() + 300_000;
  }
  return {};
}

export async function getSsiMasterNames(): Promise<Record<string, string>> {
  if (masterNamesCache && Date.now() < masterNamesCache.expiresAt) {
    return masterNamesCache.value;
  }
  const urls = [
    'https://iboard-query.ssi.com.vn/stock/exchange/hose?boardId=MAIN',
    'https://iboard-query.ssi.com.vn/stock/exchange/hnx?boardId=MAIN',
    'https://iboard-query.ssi.com.vn/stock/exchange/upcom?boardId=MAIN',
  ];
  const results = await Promise.all(urls.map((u) => fetchSsiEndpoint(u)));
  let master: Record<string, string> = {};
  for (const r of results) {
    master = { ...master, ...r };
  }
  if (Object.keys(master).length === 0) {
    master = await fetchVndFallback('HOSE,HNX,UPCOM');
  }
  masterNamesCache = { value: master, expiresAt: Date.now() + 3600_000 };
  return master;
}

export async function getSsiBasket(
  basketLabel: string
): Promise<{ symbols: string[]; names: Record<string, string>; sourceInfo: string }> {
  const basket = BASKETS.find((b) => b.label === basketLabel) || BASKETS[0];

  if (basket.sourceType !== 'ws') {
    const cached = basketCache.get(basket.label);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }
  }

  let result: { symbols: string[]; names: Record<string, string>; sourceInfo: string };

  if (basket.sourceType === 'ws') {
    const wsMap = await realtimeFeed.discoverWsSymbols(3000);
    if (Object.keys(wsMap).length > 0) {
      const masterNames = await getSsiMasterNames();
      const enriched: Record<string, string> = {};
      for (const [sym, nm] of Object.entries(wsMap)) {
        enriched[sym] = nm || masterNames[sym] || '';
      }
      return {
        symbols: Object.keys(enriched),
        names: enriched,
        sourceInfo: 'WebSocket SSI (wss://iboard-pushstream.ssi.com.vn)',
      };
    }
    const hoseMap = await fetchSsiEndpoint('https://iboard-query.ssi.com.vn/stock/exchange/hose?boardId=MAIN');
    if (Object.keys(hoseMap).length > 0) {
      return {
        symbols: Object.keys(hoseMap),
        names: hoseMap,
        sourceInfo: 'WebSocket ngoài giờ → Tự đồng bộ bảng HOSE gốc SSI',
      };
    }
    const vndHose = await fetchVndFallback('HOSE');
    if (Object.keys(vndHose).length > 0) {
      return {
        symbols: Object.keys(vndHose),
        names: vndHose,
        sourceInfo: 'WebSocket ngoài giờ → Dự phòng bảng HOSE (VNDirect)',
      };
    }
    return {
      symbols: [...HOSE_FULL_FALLBACK],
      names: Object.fromEntries(HOSE_FULL_FALLBACK.map((s) => [s, ''])),
      sourceInfo: 'Dự phòng cục bộ (WebSocket & SSI không phản hồi)',
    };
  }

  let stockMap: Record<string, string> = {};
  if (basket.sourceType === 'exchange') {
    stockMap = await fetchSsiEndpoint(`https://iboard-query.ssi.com.vn/stock/exchange/${basket.code}?boardId=MAIN`);
  } else if (basket.sourceType === 'group') {
    stockMap = await fetchSsiEndpoint(`https://iboard-query.ssi.com.vn/stock/group/${basket.code}`);
  } else if (basket.sourceType === 'all') {
    const results = await Promise.all([
      fetchSsiEndpoint('https://iboard-query.ssi.com.vn/stock/exchange/hose?boardId=MAIN'),
      fetchSsiEndpoint('https://iboard-query.ssi.com.vn/stock/exchange/hnx?boardId=MAIN'),
      fetchSsiEndpoint('https://iboard-query.ssi.com.vn/stock/exchange/upcom?boardId=MAIN'),
    ]);
    for (const r of results) {
      stockMap = { ...stockMap, ...r };
    }
  }

  if (Object.keys(stockMap).length > 0) {
    let sourceInfo = `SSI iBoard Gốc (${basket.code.toUpperCase()})`;
    if (basket.sourceType === 'all') {
      const wsLive = realtimeFeed.getWsDiscoveredSymbols();
      let added = 0;
      for (const [sym, nm] of Object.entries(wsLive)) {
        if (!(sym in stockMap)) {
          stockMap[sym] = nm;
          added++;
        }
      }
      if (added > 0) sourceInfo += ` + ${added} mã WebSocket`;
    }
    result = { symbols: Object.keys(stockMap), names: stockMap, sourceInfo };
  } else if (basket.code === 'VN30') {
    const vndNames = await fetchVndFallback('HOSE');
    const vn30Map = Object.fromEntries(VN30_FALLBACK.map((s) => [s, vndNames[s] || '']));
    result = {
      symbols: [...VN30_FALLBACK],
      names: vn30Map,
      sourceInfo: 'Dự phòng rổ VN30 (VNDirect — SSI iBoard tạm chặn IP)',
    };
  } else if (basket.code === 'HNX30') {
    const vndNames = await fetchVndFallback('HNX');
    const hnx30Map = Object.fromEntries(HNX30_FALLBACK.map((s) => [s, vndNames[s] || '']));
    result = {
      symbols: [...HNX30_FALLBACK],
      names: hnx30Map,
      sourceInfo: 'Dự phòng rổ HNX30 (VNDirect — SSI iBoard tạm chặn IP)',
    };
  } else {
    const floorMap: Record<string, string> = {
      hose: 'HOSE',
      hnx: 'HNX',
      upcom: 'UPCOM',
      ALL: 'HOSE,HNX,UPCOM',
    };
    const vndFloor = floorMap[basket.code] || 'HOSE';
    const vndMap = await fetchVndFallback(vndFloor);
    if (Object.keys(vndMap).length > 0) {
      const note = basket.code in floorMap ? basket.code.toUpperCase() : `sàn ${vndFloor}`;
      result = {
        symbols: Object.keys(vndMap),
        names: vndMap,
        sourceInfo: `Dự phòng VNDirect (${note} — SSI iBoard tạm chặn IP)`,
      };
    } else {
      result = {
        symbols: [...HOSE_FULL_FALLBACK],
        names: Object.fromEntries(HOSE_FULL_FALLBACK.map((s) => [s, ''])),
        sourceInfo: 'Dự phòng danh sách HOSE cục bộ',
      };
    }
  }

  basketCache.set(basket.label, { value: result, expiresAt: Date.now() + 3600_000 });
  return result;
}

function isRawVndCloses(closes: number[]): boolean {
  if (closes.length === 0) return false;
  const sorted = [...closes].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  if (med >= 2000) return true;
  if (med >= 300) {
    let intCount = 0;
    let mult10Count = 0;
    for (const v of closes) {
      if (Math.abs(v % 1) < 1e-6) intCount++;
      if (Math.abs(v % 10) < 1e-6) mult10Count++;
    }
    return intCount / closes.length > 0.95 && mult10Count / closes.length > 0.9;
  }
  return false;
}

function buildOhlcvBars(payload: Record<string, unknown>, sym: string): RawOhlcvBar[] {
  const tArr = Array.isArray(payload.t) ? payload.t : [];
  const oArr = Array.isArray(payload.o) ? payload.o : [];
  const hArr = Array.isArray(payload.h) ? payload.h : [];
  const lArr = Array.isArray(payload.l) ? payload.l : [];
  const cArr = Array.isArray(payload.c) ? payload.c : [];
  const vArr = Array.isArray(payload.v) ? payload.v : [];

  const n = Math.min(tArr.length, oArr.length, hArr.length, lArr.length, cArr.length);
  if (n === 0) return [];

  const byDate = new Map<string, RawOhlcvBar>();
  const closesForScale: number[] = [];

  for (let i = 0; i < n; i++) {
    const ts = Number(tArr[i]);
    const close = Number(cArr[i]);
    if (!Number.isFinite(ts) || !Number.isFinite(close) || close <= 0) continue;

    const dateStr = new Date((ts + 25200) * 1000).toISOString().slice(0, 10);
    const rawOpen = Number(oArr[i]);
    const rawHigh = Number(hArr[i]);
    const rawLow = Number(lArr[i]);
    const rawVol = i < vArr.length ? Number(vArr[i]) : 0;

    const open = Number.isFinite(rawOpen) && rawOpen > 0 ? rawOpen : close;
    const high = Number.isFinite(rawHigh) && rawHigh > 0 ? Math.max(rawHigh, open, close) : Math.max(open, close);
    const low = Number.isFinite(rawLow) && rawLow > 0 ? Math.min(rawLow, open, close) : Math.min(open, close);
    const volume = Number.isFinite(rawVol) && rawVol > 0 ? rawVol : 0;

    byDate.set(dateStr, { date: dateStr, open, high, low, close, volume });
    closesForScale.push(close);
  }

  if (byDate.size === 0) return [];

  const bars = Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (sym !== 'VNINDEX' && isRawVndCloses(closesForScale)) {
    for (const b of bars) {
      b.open = b.open / 1000;
      b.high = b.high / 1000;
      b.low = b.low / 1000;
      b.close = b.close / 1000;
    }
  }

  return bars;
}

function dateToVnUnix(dateStr: string, endOfDay: boolean): number {
  const suffix = endOfDay ? 'T23:59:59+07:00' : 'T00:00:00+07:00';
  return Math.floor(new Date(`${dateStr}${suffix}`).getTime() / 1000);
}

function subtractDays(dateStr: string, days: number): string {
  const dt = new Date(`${dateStr}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() - days);
  return dt.toISOString().slice(0, 10);
}

export async function fetchSymbolHistory(
  symbol: string,
  startDate: string,
  endDate: string
): Promise<RawOhlcvBar[]> {
  const sym = symbol.toUpperCase();
  // 400 calendar-day buffer (~265 trading days) for MA200, MA200_20D_ago, 52W High/Low, and 252-day Momentum
  const bufferStart = subtractDays(startDate, 400);
  const cacheKey = `${sym}|${bufferStart}|${endDate}`;

  const cached = symbolHistoryCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }

  const pending = inFlightHistory.get(cacheKey);
  if (pending) return pending;

  const task = (async (): Promise<RawOhlcvBar[]> => {
    const fromTs = dateToVnUnix(bufferStart, false);
    const toTs = dateToVnUnix(endDate, true);

    // 1. SSI Chart API with fast circuit breaker
    if (Date.now() >= ssiChartBlockedUntil) {
      const ssiSym = sym === 'VNINDEX' ? 'VN-INDEX' : sym;
      const ssiUrl = `https://iboard-api.ssi.com.vn/statistics/charts/history?resolution=1D&symbol=${ssiSym}&from=${fromTs}&to=${toTs}`;
      const { status, data } = await fetchJsonWithTimeout(ssiUrl, SSI_HEADERS, 2000);
      if (status === 200 && data && typeof data === 'object') {
        const outer = data as Record<string, unknown>;
        const payload = (outer.data && typeof outer.data === 'object' ? outer.data : outer) as Record<string, unknown>;
        if (payload.s === 'ok' && Array.isArray(payload.t) && payload.t.length > 0) {
          ssiChartFailStreak = 0;
          const bars = buildOhlcvBars(payload, sym);
          if (bars.length > 0) {
            symbolHistoryCache.set(cacheKey, { value: bars, expiresAt: Date.now() + 1800_000 });
            return bars;
          }
        }
      } else if (status === 401 || status === 403 || status === 429) {
        // Immediate trip on WAF/auth block to avoid wasting parallel round-trips
        ssiChartBlockedUntil = Date.now() + 300_000;
      } else if (status === 0) {
        ssiChartFailStreak++;
        if (ssiChartFailStreak >= 3) {
          ssiChartBlockedUntil = Date.now() + 180_000;
        }
      }
    }

    // 2. VNDirect Chart API fallback (fast & reliable from cloud IPs)
    const vndUrl = `https://dchart-api.vndirect.com.vn/dchart/history?resolution=D&symbol=${sym}&from=${fromTs}&to=${toTs}`;
    const { status, data } = await fetchJsonWithTimeout(
      vndUrl,
      { ...BASE_HEADERS, Referer: 'https://dchart.vndirect.com.vn/' },
      5500
    );
    if (status === 200 && data && typeof data === 'object') {
      const payload = data as Record<string, unknown>;
      if (payload.s === 'ok' && Array.isArray(payload.t) && payload.t.length > 0) {
        const bars = buildOhlcvBars(payload, sym);
        if (bars.length > 0) {
          symbolHistoryCache.set(cacheKey, { value: bars, expiresAt: Date.now() + 1800_000 });
          return bars;
        }
      }
    }

    return [];
  })();

  inFlightHistory.set(cacheKey, task);
  try {
    return await task;
  } finally {
    inFlightHistory.delete(cacheKey);
  }
}

export async function fetchBasketHistory(
  symbols: string[],
  startDate: string,
  endDate: string,
  concurrency = 40
): Promise<Map<string, RawOhlcvBar[]>> {
  const result = new Map<string, RawOhlcvBar[]>();
  const queue = [...symbols];

  // Probe the first symbol once if SSI circuit breaker is open so WAF-blocked clouds skip SSI on remaining symbols
  if (queue.length > 2 && Date.now() >= ssiChartBlockedUntil) {
    const firstSym = queue.shift()!;
    const firstBars = await fetchSymbolHistory(firstSym, startDate, endDate);
    if (firstBars.length > 0) {
      result.set(firstSym, firstBars);
    }
  }

  const workerCount = Math.min(concurrency, queue.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (queue.length > 0) {
      const sym = queue.shift();
      if (!sym) break;
      const bars = await fetchSymbolHistory(sym, startDate, endDate);
      if (bars.length > 0) {
        result.set(sym, bars);
      }
    }
  });

  await Promise.all(workers);
  return result;
}

class SSIRealtimeFeed {
  private isRunning = false;
  private ws: WebSocket | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private marketData = new Map<string, RealtimeTick>();
  private wsDiscoveredSymbols = new Map<string, string>();
  private activeSymbols: string[] = [...VN30_FALLBACK];
  private activeExchanges: string[] = ['hose'];
  private sourceName = 'Đang khởi tạo...';
  private lastSyncStr = '--:--:--';

  setSymbols(symbols: string[], basketLabel = 'HOSE'): void {
    if (symbols.length > 0) {
      this.activeSymbols = Array.from(new Set(symbols));
    }
    if (basketLabel === 'HNX' || basketLabel === 'HNX30') {
      this.activeExchanges = ['hnx'];
    } else if (basketLabel === 'UPCOM') {
      this.activeExchanges = ['upcom'];
    } else if (basketLabel.includes('HNX') || basketLabel.includes('WS') || basketLabel.includes('WebSocket')) {
      this.activeExchanges = ['hose', 'hnx', 'upcom'];
    } else {
      this.activeExchanges = ['hose'];
    }
  }

  private recordWsSymbol(ticker: string, companyName = ''): void {
    const sym = String(ticker || '').trim().toUpperCase();
    if (!isValidVnTicker(sym)) return;
    if (!this.wsDiscoveredSymbols.has(sym) || (companyName && !this.wsDiscoveredSymbols.get(sym))) {
      this.wsDiscoveredSymbols.set(sym, companyName);
    }
  }

  getWsDiscoveredSymbols(): Record<string, string> {
    return Object.fromEntries(this.wsDiscoveredSymbols.entries());
  }

  async discoverWsSymbols(waitMs = 3000): Promise<Record<string, string>> {
    if (this.wsDiscoveredSymbols.size >= 10) {
      return this.getWsDiscoveredSymbols();
    }
    const wasRunning = this.isRunning;
    if (!wasRunning) {
      this.start();
    }
    const deadline = Date.now() + waitMs;
    while (Date.now() < deadline && this.wsDiscoveredSymbols.size < 30) {
      await new Promise((r) => setTimeout(r, 250));
    }
    const discovered = this.getWsDiscoveredSymbols();
    if (!wasRunning) {
      this.stop();
    }
    return discovered;
  }

  private normalizeAndStore(
    rawTicker: string,
    rawPrice: number,
    vol: number,
    rawHigh: number,
    rawLow: number,
    rawOpen = 0,
    dateStr?: string,
    isVndUnit = true
  ): void {
    if (!Number.isFinite(rawPrice) || rawPrice <= 0) return;
    let ticker = String(rawTicker || '').trim().toUpperCase();
    if (ticker === 'VN-INDEX' || ticker === 'VNINDEX' || ticker === '10') {
      ticker = 'VNINDEX';
    } else if (!isValidVnTicker(ticker)) {
      return;
    }

    let price = rawPrice;
    let high = rawHigh;
    let low = rawLow;
    let open = rawOpen;

    if (ticker !== 'VNINDEX' && isVndUnit) {
      price /= 1000;
      high = high > 0 ? high / 1000 : price;
      low = low > 0 ? low / 1000 : price;
      open = open > 0 ? open / 1000 : price;
    }

    high = high > 0 ? Math.max(high, price) : price;
    low = low > 0 ? Math.min(low, price) : price;
    open = open > 0 ? open : price;

    this.marketData.set(ticker, {
      price: Math.round(price * 100) / 100,
      volume: Number.isFinite(vol) ? vol : 0,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      open: Math.round(open * 100) / 100,
      date: dateStr || getVnToday(),
      updatedAt: Date.now(),
    });
  }

  private async pollSsiIboardSnapshot(): Promise<number> {
    if (Date.now() < ssiIboardBlockedUntil) return 0;
    let count = 0;
    for (const ex of this.activeExchanges) {
      if (!this.isRunning) break;
      const url = `https://iboard-query.ssi.com.vn/stock/exchange/${ex}?boardId=MAIN`;
      const { status, data } = await fetchJsonWithTimeout(url, SSI_HEADERS, 4000);
      if (status === 401 || status === 403 || status === 429) {
        ssiIboardBlockedUntil = Date.now() + 180_000;
        break;
      }
      if (status === 200 && data && typeof data === 'object') {
        const items = (data as Record<string, unknown>).data;
        if (!Array.isArray(items)) continue;
        for (const raw of items) {
          if (!raw || typeof raw !== 'object') continue;
          const item = raw as Record<string, unknown>;
          const sym = String(item.stockSymbol || item.sym || item.code || '').trim().toUpperCase();
          if (!isValidVnTicker(sym)) continue;
          const matchedPrice = Number(item.matchedPrice || item.lastPrice || 0);
          const vol = Number(item.nmTotalTradedQty || item.totalVol || 0);
          if (matchedPrice <= 0 || vol <= 0) continue;
          const high = Number(item.highest || item.highPrice || matchedPrice);
          const low = Number(item.lowest || item.lowPrice || matchedPrice);
          const open = Number(item.openPrice || matchedPrice);
          const rawDate = String(item.tradingDate || '').trim();
          const dateStr =
            rawDate.length === 8 && /^\d{8}$/.test(rawDate)
              ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
              : getVnToday();
          this.normalizeAndStore(sym, matchedPrice, vol, high, low, open, dateStr, true);
          count++;
        }
      }
    }
    return count;
  }

  private async fetchSingleIntradayVnd(sym: string): Promise<boolean> {
    const toTs = Math.floor(Date.now() / 1000);
    const fromTs = toTs - 7 * 86400;
    const url = `https://dchart-api.vndirect.com.vn/dchart/history?resolution=D&symbol=${sym}&from=${fromTs}&to=${toTs}`;
    const { status, data } = await fetchJsonWithTimeout(
      url,
      { ...BASE_HEADERS, Referer: 'https://dchart.vndirect.com.vn/' },
      4000
    );
    if (status === 200 && data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      const tArr = Array.isArray(d.t) ? d.t : [];
      const cArr = Array.isArray(d.c) ? d.c : [];
      if (d.s === 'ok' && tArr.length > 0 && cArr.length > 0) {
        const idx = Math.min(tArr.length, cArr.length) - 1;
        const price = Number(cArr[idx]);
        if (price <= 0) return false;
        const lastDt = new Date((Number(tArr[idx]) + 25200) * 1000).toISOString().slice(0, 10);
        const vArr = Array.isArray(d.v) ? d.v : [];
        const hArr = Array.isArray(d.h) ? d.h : [];
        const lArr = Array.isArray(d.l) ? d.l : [];
        const oArr = Array.isArray(d.o) ? d.o : [];
        this.normalizeAndStore(
          sym,
          price,
          Number(vArr[idx] ?? 0),
          Number(hArr[idx] ?? price),
          Number(lArr[idx] ?? price),
          Number(oArr[idx] ?? price),
          lastDt,
          false
        );
        return true;
      }
    }
    return false;
  }

  private async pollVndIntradayBatch(): Promise<number> {
    // Poll VNINDEX + active symbols (capped concurrency for smoothness)
    const targets = ['VNINDEX', ...this.activeSymbols.slice(0, 120)];
    let updated = 0;
    const queue = [...targets];
    const workers = Array.from({ length: Math.min(20, queue.length) }, async () => {
      while (queue.length > 0 && this.isRunning) {
        const s = queue.shift();
        if (!s) break;
        if (await this.fetchSingleIntradayVnd(s)) updated++;
      }
    });
    await Promise.all(workers);
    return updated;
  }

  private scheduleNextPoll(delayMs: number): void {
    if (!this.isRunning) return;
    this.pollTimer = setTimeout(() => {
      void this.runPollCycle();
    }, delayMs);
  }

  private async runPollCycle(): Promise<void> {
    if (!this.isRunning) return;
    try {
      await this.fetchSingleIntradayVnd('VNINDEX');
      const ssiCnt = await this.pollSsiIboardSnapshot();
      if (ssiCnt > 10) {
        this.sourceName = 'SSI iBoard Live Stream';
        this.lastSyncStr = formatVnTime();
        this.scheduleNextPoll(3500);
        return;
      }
      const vndCnt = await this.pollVndIntradayBatch();
      if (vndCnt > 0) {
        this.sourceName = 'Intraday Realtime (SSI/VND Hybrid)';
        this.lastSyncStr = formatVnTime();
      }
      this.scheduleNextPoll(6000);
    } catch {
      this.scheduleNextPoll(4000);
    }
  }

  private connectWebSocket(): void {
    if (!this.isRunning) return;
    try {
      const ws = new WebSocket('wss://iboard-pushstream.ssi.com.vn/realtime', {
        headers: {
          Origin: 'https://iboard.ssi.com.vn',
          'User-Agent': BASE_HEADERS['User-Agent'],
        },
        handshakeTimeout: 6000,
      });
      this.ws = ws;

      ws.on('open', () => {
        try {
          ws.send(JSON.stringify({ type: 'sub', ads: 'all' }));
        } catch {
          // ignore
        }
      });

      ws.on('message', (raw: WebSocket.RawData) => {
        try {
          const msg = raw.toString('utf-8');
          if (msg.startsWith('S#')) {
            const parts = msg.split('|');
            const candidate = parts[0].replace('S#', '').trim().toUpperCase();
            if (isValidVnTicker(candidate)) {
              this.recordWsSymbol(candidate);
            } else if (parts.length > 1 && isValidVnTicker(parts[1])) {
              this.recordWsSymbol(parts[1]);
            }
            return;
          }
          const parsed = JSON.parse(msg) as Record<string, unknown>;
          const payload = parsed.data ?? parsed;
          const items = Array.isArray(payload) ? payload : payload && typeof payload === 'object' ? [payload] : [];
          for (const rawItem of items) {
            if (!rawItem || typeof rawItem !== 'object') continue;
            const item = rawItem as Record<string, unknown>;
            const ticker = String(item.sym || item.stockSymbol || item.symbol || item.indexId || '').trim();
            if (!ticker) continue;
            const compName = String(item.companyNameVi || item.companyName || '').trim();
            this.recordWsSymbol(ticker, compName);

            if (!isVnMarketHours()) continue;

            const rawPrice = Number(
              item.lastPrice || item.matchedPrice || item.matchPrice || item.price || item.indexValue || 0
            );
            const vol = Number(item.totalVol || item.nmTotalTradedQty || item.totalVolume || 0);
            const high = Number(item.highPrice || item.highest || rawPrice);
            const low = Number(item.lowPrice || item.lowest || rawPrice);
            if (rawPrice > 0 && vol > 0) {
              this.normalizeAndStore(ticker, rawPrice, vol, high, low, 0, undefined, true);
              this.sourceName = 'SSI Pushstream WSS';
              this.lastSyncStr = formatVnTime();
            }
          }
        } catch {
          // ignore malformed frames
        }
      });

      ws.on('close', () => {
        if (this.isRunning) {
          this.wsReconnectTimer = setTimeout(() => this.connectWebSocket(), 5000);
        }
      });

      ws.on('error', () => {
        // handled by close
      });
    } catch {
      if (this.isRunning) {
        this.wsReconnectTimer = setTimeout(() => this.connectWebSocket(), 5000);
      }
    }
  }

  start(symbols?: string[], basketLabel = 'HOSE'): void {
    if (symbols && symbols.length > 0) {
      this.setSymbols(symbols, basketLabel);
    }
    if (this.isRunning) return;
    this.isRunning = true;
    this.connectWebSocket();
    void this.runPollCycle();
  }

  stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.terminate();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  getAllRealtime(): Map<string, RealtimeTick> {
    return new Map(this.marketData);
  }

  getStatus(): RealtimeStatus {
    return {
      isRunning: this.isRunning,
      tickCount: this.marketData.size,
      wsDiscoveredCount: this.wsDiscoveredSymbols.size,
      sourceName: this.sourceName,
      lastSyncStr: this.lastSyncStr,
    };
  }
}

export const realtimeFeed = new SSIRealtimeFeed();
