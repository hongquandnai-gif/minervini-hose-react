import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import type { BasketOption, MarketAnalysisResponse } from './types';
import { diffDays, subtractCalendarDays } from './utils/format';
import { Sidebar } from './components/Sidebar';
import { KpiStrip } from './components/KpiStrip';
import { MarketBreadthChart } from './components/MarketBreadthChart';
import { MinerviniTab } from './components/MinerviniTab';
import { VcpTab } from './components/VcpTab';
import { DiagnosticTab } from './components/DiagnosticTab';

type ActiveTab = 'minervini' | 'vcp' | 'diagnostic';

function getClientVnToday(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export function App() {
  const initialToday = useMemo(() => getClientVnToday(), []);
  const [vnToday, setVnToday] = useState(initialToday);
  const [baskets, setBaskets] = useState<BasketOption[]>([
    { label: 'HOSE', sourceType: 'exchange', code: 'hose' },
    { label: 'VN30', sourceType: 'group', code: 'VN30' },
  ]);

  // Default to VN30? Wait: keep HOSE available, start on VN30 for <1.5s first paint OR HOSE?
  // Let's default to HOSE to preserve original app behavior, with fast 32-worker parallel fetch!
  const [basketChoice, setBasketChoice] = useState('HOSE');
  const [customTickersInput, setCustomTickersInput] = useState('');
  const [appliedCustomTickers, setAppliedCustomTickers] = useState('');

  const [startDate, setStartDate] = useState(() => subtractCalendarDays(initialToday, 550));
  const [endDate, setEndDate] = useState(initialToday);
  const [showMa20Line, setShowMa20Line] = useState(true);
  const [minVolFilter, setMinVolFilter] = useState(50000);
  const [realtimeOn, setRealtimeOn] = useState(false);
  const [pauseLive, setPauseLive] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('minervini');
  const [selectedTicker, setSelectedTicker] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  const [data, setData] = useState<MarketAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Load basket options & authoritative VN date on mount
  useEffect(() => {
    fetch('/api/baskets')
      .then((r) => r.json())
      .then((payload: { baskets?: BasketOption[]; vnToday?: string; realtime?: { isRunning: boolean } }) => {
        if (Array.isArray(payload.baskets) && payload.baskets.length > 0) {
          setBaskets(payload.baskets);
        }
        if (payload.vnToday) {
          setVnToday(payload.vnToday);
        }
        if (payload.realtime?.isRunning) {
          setRealtimeOn(true);
        }
      })
      .catch(() => {
        // fallback defaults already set
      });
  }, []);

  const fetchAnalysis = useCallback(
    async (opts?: { forceRefresh?: boolean; silent?: boolean }) => {
      if (!startDate || !endDate || startDate >= endDate) {
        setErrorMsg('Ngày bắt đầu phải nhỏ hơn ngày kết thúc!');
        setLoading(false);
        return;
      }
      const d = diffDays(startDate, endDate);
      if (d < 400) {
        setErrorMsg(`Dải ngày hiện tại (${d} ngày) chưa đủ 400 ngày để phân tích chu kỳ dài hạn & MA200.`);
        setLoading(false);
        return;
      }

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (!opts?.silent) setLoading(true);
      setErrorMsg(null);

      try {
        const resp = await fetch('/api/market/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            basketLabel: basketChoice,
            customTickers: appliedCustomTickers,
            startDate,
            endDate,
            minVolFilter,
            realtimeOn,
            forceRefresh: Boolean(opts?.forceRefresh),
          }),
        });

        const payload = await resp.json();
        if (!resp.ok) {
          setErrorMsg(payload.error || 'Không tải được dữ liệu từ API.');
          if (!opts?.silent) setLoading(false);
          return;
        }

        const analysis = payload as MarketAnalysisResponse;
        setData(analysis);
        setRefreshToken((n) => n + 1);
        setSelectedTicker((prev) => {
          if (prev && analysis.stocks.some((s) => s.ticker === prev)) return prev;
          return analysis.stocks[0]?.ticker || '';
        });
        setLoading(false);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setErrorMsg('Lỗi kết nối tới máy chủ phân tích. Vui lòng thử lại.');
        setLoading(false);
      }
    },
    [basketChoice, appliedCustomTickers, startDate, endDate, minVolFilter, realtimeOn]
  );

  // Trigger analysis whenever parameters change
  useEffect(() => {
    void fetchAnalysis();
  }, [fetchAnalysis]);

  // Realtime auto-refresh every 10s when Live Engine is active and not paused
  useEffect(() => {
    if (!realtimeOn || pauseLive) return;
    const id = setInterval(() => {
      void fetchAnalysis({ silent: true });
    }, 10_000);
    return () => clearInterval(id);
  }, [realtimeOn, pauseLive, fetchAnalysis]);

  const handleToggleRealtime = useCallback(
    async (enabled: boolean) => {
      setRealtimeOn(enabled);
      if (!enabled) setPauseLive(false);
      try {
        await fetch('/api/realtime/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled, basketLabel: basketChoice }),
        });
      } catch {
        // ignore
      }
    },
    [basketChoice]
  );

  const handleBasketChange = useCallback((label: string) => {
    setBasketChoice(label);
    setCustomTickersInput('');
    setAppliedCustomTickers('');
  }, []);

  const handleApplyCustomTickers = useCallback(() => {
    setAppliedCustomTickers(customTickersInput);
  }, [customTickersInput]);

  const handleRefresh = useCallback(() => {
    void fetchAnalysis({ forceRefresh: true });
  }, [fetchAnalysis]);

  const handleJumpToDiagnostic = useCallback((ticker: string) => {
    setSelectedTicker(ticker);
    setActiveTab('diagnostic');
  }, []);

  const vcpTickers = useMemo(() => new Set((data?.vcpList ?? []).map((v) => v.ticker)), [data?.vcpList]);

  // Market health narrative
  const healthSummary = useMemo(() => {
    if (!data) return null;
    const { latestPctAboveMa200, latestPctBelowMa20, latestPctBottoming } = data.summary;

    let shortTerm = 'Ngắn hạn: Chưa đủ dữ liệu MA20';
    if (latestPctBelowMa20 !== null) {
      if (latestPctBelowMa20 >= 80) shortTerm = `Ngắn hạn: Quá bán cực đại (${latestPctBelowMa20.toFixed(1)}% < MA20) — dễ hồi kỹ thuật`;
      else if (latestPctBelowMa20 <= 20) shortTerm = `Ngắn hạn: Hưng phấn / quá mua (${latestPctBelowMa20.toFixed(1)}% < MA20) — tránh FOMO`;
      else if (latestPctBelowMa20 >= 65) shortTerm = `Ngắn hạn: Áp lực điều chỉnh cao (${latestPctBelowMa20.toFixed(1)}% < MA20)`;
      else shortTerm = `Ngắn hạn: Cân bằng (${latestPctBelowMa20.toFixed(1)}% < MA20)`;
    }

    if (latestPctAboveMa200 === null) {
      return { tone: 'text-amber-800', longTerm: 'Dài hạn: Chưa đủ dữ liệu MA200', shortTerm };
    }
    if (latestPctAboveMa200 >= 50) {
      return { tone: 'text-emerald-800', longTerm: `Dài hạn: Uptrend (${latestPctAboveMa200.toFixed(1)}% > MA200)`, shortTerm };
    }
    if (latestPctAboveMa200 <= 20 && latestPctBottoming !== null && latestPctBottoming >= 40) {
      return { tone: 'text-red-800', longTerm: `Dài hạn: Dò đáy nguy hiểm (${latestPctBottoming.toFixed(1)}% sát đáy 52T)`, shortTerm };
    }
    if (latestPctAboveMa200 <= 20) {
      return { tone: 'text-red-800', longTerm: `Dài hạn: Quá bán (${latestPctAboveMa200.toFixed(1)}% > MA200)`, shortTerm };
    }
    return { tone: 'text-amber-800', longTerm: `Dài hạn: Đi ngang / phân hóa (${latestPctAboveMa200.toFixed(1)}% > MA200)`, shortTerm };
  }, [data]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: Brand — Single-line Tab Nav — Primary Action */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-5 h-14 flex items-center justify-between gap-6">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="text-base font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          Minervini Pro
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('minervini')}
            className={`whitespace-nowrap shrink-0 pb-0.5 border-b-2 transition-colors ${
              activeTab === 'minervini'
                ? 'text-sky-700 border-sky-600 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Quét Minervini
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vcp')}
            className={`whitespace-nowrap shrink-0 pb-0.5 border-b-2 transition-colors ${
              activeTab === 'vcp'
                ? 'text-sky-700 border-sky-600 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Mẫu hình VCP {data ? `(${data.vcpList.length})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diagnostic')}
            className={`whitespace-nowrap shrink-0 pb-0.5 border-b-2 transition-colors ${
              activeTab === 'diagnostic'
                ? 'text-sky-700 border-sky-600 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Chẩn đoán cổ phiếu
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Đồng bộ dữ liệu</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        <Sidebar
          baskets={baskets}
          basketChoice={basketChoice}
          onBasketChange={handleBasketChange}
          customTickers={customTickersInput}
          onCustomTickersChange={setCustomTickersInput}
          onApplyCustomTickers={handleApplyCustomTickers}
          startDate={startDate}
          endDate={endDate}
          maxDate={vnToday}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          showMa20Line={showMa20Line}
          onToggleMa20Line={setShowMa20Line}
          minVolFilter={minVolFilter}
          onMinVolFilterChange={setMinVolFilter}
          realtimeOn={realtimeOn}
          onToggleRealtime={handleToggleRealtime}
          pauseLive={pauseLive}
          onTogglePauseLive={setPauseLive}
          onRefresh={handleRefresh}
          loading={loading}
          loadedCount={data?.summary.totalLoaded ?? 0}
          requestedCount={data?.summary.totalRequested ?? 0}
          sourceInfo={data?.sourceInfo ?? ''}
        />

        <main className="flex-1 min-w-0 p-4 sm:p-6 space-y-5">
          {/* Page Intro & Unboxed Market Health Strip */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                Phân tích Chu kỳ Minervini &amp; Độ rộng Thị trường
              </h1>
              {data && (
                <div className="text-xs font-mono text-slate-500">
                  {data.basketLabel} · {data.summary.totalLoaded} mã · {data.computeMs}ms{data.cacheHit ? ' (cache)' : ''}
                </div>
              )}
            </div>

            {healthSummary && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {data?.realtime.isRunning && (
                  <>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      LIVE{pauseLive ? ' (Tạm dừng)' : ''}: {data.realtime.tickCount} mã · {data.realtime.sourceName} · {data.realtime.lastSyncStr}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">/</span>
                  </>
                )}
                <span className={`font-semibold ${healthSummary.tone}`}>{healthSummary.longTerm}</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="text-slate-600">{healthSummary.shortTerm}</span>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-sm text-red-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {loading && !data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-[112px] bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
                    <div className="h-3 w-24 bg-slate-200 rounded mb-4" />
                    <div className="h-7 w-28 bg-slate-200 rounded mb-3" />
                    <div className="h-3 w-32 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
              <div className="h-[460px] bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-center text-sm text-slate-500">
                Đang tải &amp; tính toán chỉ báo định lượng song song cho rổ {basketChoice}...
              </div>
            </div>
          ) : data ? (
            <>
              <div className={loading ? 'opacity-60 transition-opacity' : ''}>
                <KpiStrip summary={data.summary} />
              </div>

              <div className={loading ? 'opacity-60 transition-opacity' : ''}>
                <MarketBreadthChart
                  series={data.dailySeries}
                  summary={data.summary}
                  showMa20Line={showMa20Line}
                  startDate={startDate}
                />
              </div>

              {/* Workspace Tabs */}
              <section className="space-y-4">
                <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl w-fit max-w-full overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('minervini')}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      activeTab === 'minervini'
                        ? 'bg-white text-sky-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Quét Siêu Cổ Phiếu (Minervini)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('vcp')}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      activeTab === 'vcp'
                        ? 'bg-white text-sky-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Mẫu Hình Cốc / VCP ({data.vcpList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('diagnostic')}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      activeTab === 'diagnostic'
                        ? 'bg-white text-sky-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Chẩn Đoán Cổ Phiếu Đơn &amp; Đồ Thị
                  </button>
                </div>

                {activeTab === 'minervini' && (
                  <MinerviniTab
                    stocks={data.stocks}
                    evalDate={data.summary.actualEvalDate}
                    minVolFilter={minVolFilter}
                    vcpTickers={vcpTickers}
                    onSelectTicker={handleJumpToDiagnostic}
                  />
                )}

                {activeTab === 'vcp' && (
                  <VcpTab
                    vcpList={data.vcpList}
                    minVolFilter={minVolFilter}
                    onSelectTicker={handleJumpToDiagnostic}
                  />
                )}

                {activeTab === 'diagnostic' && (
                  <DiagnosticTab
                    stocks={data.stocks}
                    vcpTickers={vcpTickers}
                    selectedTicker={selectedTicker}
                    onSelectTicker={setSelectedTicker}
                    refreshToken={refreshToken}
                  />
                )}
              </section>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default App;
