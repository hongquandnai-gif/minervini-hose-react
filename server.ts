import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BASKETS,
  fetchBasketHistory,
  fetchSymbolHistory,
  getSsiBasket,
  getSsiMasterNames,
  getVnToday,
  isValidVnTicker,
  realtimeFeed,
  resetAllCaches,
  type RawOhlcvBar,
} from './server/ssiEngine';
import {
  buildMarketAnalysis,
  getStockDetailFromDataset,
  type ComputedDataset,
} from './server/analytics';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// Keep active raw dataset + computed dataset in memory for instant stock detail & realtime delta recompute
interface BaseDatasetCache {
  key: string;
  basketLabel: string;
  sourceInfo: string;
  symbols: string[];
  symbolNames: Record<string, string>;
  rawByTicker: Map<string, RawOhlcvBar[]>;
  vnIndexBars: RawOhlcvBar[];
  startDate: string;
  endDate: string;
  createdAt: number;
}

let activeBaseCache: BaseDatasetCache | null = null;
let activeComputed: ComputedDataset | null = null;

function isValidIsoDate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', vnToday: getVnToday() });
});

app.get('/api/baskets', (_req, res) => {
  res.json({
    baskets: BASKETS,
    vnToday: getVnToday(),
    realtime: realtimeFeed.getStatus(),
  });
});

app.post('/api/market/analyze', async (req, res) => {
  const t0 = performance.now();
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const basketLabel = typeof body.basketLabel === 'string' ? body.basketLabel : 'VN30';
    const customTickersRaw = typeof body.customTickers === 'string' ? body.customTickers : '';
    const startDate = isValidIsoDate(body.startDate) ? body.startDate : '';
    const endDate = isValidIsoDate(body.endDate) ? body.endDate : getVnToday();
    const minVolFilter = Math.max(0, Number(body.minVolFilter) || 0);
    const applyRealtime = Boolean(body.realtimeOn);
    const forceRefresh = Boolean(body.forceRefresh);

    if (!startDate || startDate >= endDate) {
      res.status(400).json({ error: 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc!' });
      return;
    }

    const diffDays = Math.round(
      (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400_000
    );
    if (diffDays < 400) {
      res.status(400).json({
        error: `Dải ngày hiện tại (${diffDays} ngày) chưa đủ 400 ngày để phân tích chu kỳ dài hạn & MA200.`,
      });
      return;
    }

    if (forceRefresh) {
      resetAllCaches();
      activeBaseCache = null;
    }

    let symbols: string[] = [];
    let symbolNames: Record<string, string> = {};
    let sourceInfo = '';
    let resolvedLabel = basketLabel;

    if (customTickersRaw.trim()) {
      const tokens = customTickersRaw
        .trim()
        .split(/[\s,;]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      symbols = Array.from(new Set(tokens.filter((s) => isValidVnTicker(s))));
      if (symbols.length === 0) {
        res.status(400).json({
          error:
            'Không tìm thấy mã cổ phiếu hợp lệ (mỗi mã gồm 3 ký tự, bắt đầu bằng chữ cái, VD: FPT, PC1, HPG).',
        });
        return;
      }
      const masterNames = await getSsiMasterNames();
      symbolNames = Object.fromEntries(symbols.map((s) => [s, masterNames[s] || '']));
      sourceInfo = 'Danh sách tự nhập (map tên gốc SSI)';
      resolvedLabel = `Tự nhập (${symbols.length} mã)`;
    } else {
      const basketData = await getSsiBasket(basketLabel);
      symbols = basketData.symbols;
      symbolNames = basketData.names;
      sourceInfo = basketData.sourceInfo;
    }

    if (applyRealtime && symbols.length > 0) {
      realtimeFeed.start(symbols, basketLabel);
    }

    const baseKey = `${resolvedLabel}|${symbols.join(',')}|${startDate}|${endDate}`;
    let cacheHit = false;

    if (
      activeBaseCache &&
      activeBaseCache.key === baseKey &&
      Date.now() - activeBaseCache.createdAt < 1800_000
    ) {
      cacheHit = true;
    } else {
      const [rawByTicker, vnIndexBars] = await Promise.all([
        fetchBasketHistory(symbols, startDate, endDate, 40),
        fetchSymbolHistory('VNINDEX', startDate, endDate),
      ]);

      if (rawByTicker.size === 0) {
        res.status(502).json({
          error: 'Không tải được dữ liệu lịch sử từ API SSI / VNDirect. Vui lòng thử lại!',
        });
        return;
      }

      activeBaseCache = {
        key: baseKey,
        basketLabel: resolvedLabel,
        sourceInfo,
        symbols,
        symbolNames,
        rawByTicker,
        vnIndexBars,
        startDate,
        endDate,
        createdAt: Date.now(),
      };
    }

    const computed = buildMarketAnalysis({
      basketLabel: activeBaseCache.basketLabel,
      sourceInfo: activeBaseCache.sourceInfo,
      symbols: activeBaseCache.symbols,
      symbolNames: activeBaseCache.symbolNames,
      rawByTicker: activeBaseCache.rawByTicker,
      vnIndexBars: activeBaseCache.vnIndexBars,
      startDate,
      endDate,
      minVolFilter,
      applyRealtime,
      cacheHit,
      t0,
    });

    activeComputed = computed;
    res.json(computed.response);
  } catch (err) {
    console.error('[analyze error]', err);
    res.status(500).json({ error: 'Lỗi xử lý dữ liệu định lượng trên máy chủ.' });
  }
});

app.get('/api/market/stock/:ticker', (req, res) => {
  const ticker = String(req.params.ticker || '').trim().toUpperCase();
  if (!isValidVnTicker(ticker)) {
    res.status(400).json({ error: 'Mã cổ phiếu không hợp lệ.' });
    return;
  }
  if (!activeComputed) {
    res.status(404).json({ error: 'Chưa có dữ liệu thị trường trong phiên làm việc.' });
    return;
  }
  const detail = getStockDetailFromDataset(activeComputed, ticker);
  if (!detail) {
    res.status(404).json({ error: `Không tìm thấy dữ liệu cho mã ${ticker}.` });
    return;
  }
  res.json(detail);
});

app.post('/api/realtime/toggle', (req, res) => {
  const body = (req.body || {}) as Record<string, unknown>;
  const enabled = Boolean(body.enabled);
  const basketLabel = typeof body.basketLabel === 'string' ? body.basketLabel : 'HOSE';
  if (enabled) {
    const syms = activeBaseCache?.symbols;
    realtimeFeed.start(syms, basketLabel);
  } else {
    realtimeFeed.stop();
  }
  res.json({ realtime: realtimeFeed.getStatus() });
});

app.post('/api/cache/clear', (_req, res) => {
  resetAllCaches();
  activeBaseCache = null;
  activeComputed = null;
  res.json({ ok: true });
});

async function startServer() {
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.use((_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Minervini Pro] Server listening on http://0.0.0.0:${PORT} (${IS_PROD ? 'prod' : 'dev'})`);
  });
}

void startServer();
