import React, { useEffect, useMemo, useState } from 'react';
import { Check, X, Search } from 'lucide-react';
import type { StockDetailResponse, StockSnapshot } from '../types';
import { fmtDateVn, fmtInt, fmtNum, fmtPct } from '../utils/format';
import { StockDiagnosticChart } from './StockDiagnosticChart';

interface DiagnosticTabProps {
  stocks: StockSnapshot[];
  vcpTickers: Set<string>;
  selectedTicker: string;
  onSelectTicker: (ticker: string) => void;
  refreshToken: number;
}

export const DiagnosticTab: React.FC<DiagnosticTabProps> = React.memo(
  ({ stocks, vcpTickers, selectedTicker, onSelectTicker, refreshToken }) => {
    const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
    const [searchText, setSearchText] = useState('');
    const [detail, setDetail] = useState<StockDetailResponse | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const filteredOptions = useMemo(() => {
      const q = searchText.trim().toLowerCase();
      if (!q) return stocks;
      return stocks.filter(
        (s) => s.ticker.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q)
      );
    }, [stocks, searchText]);

    useEffect(() => {
      if (!selectedTicker) return;
      let cancelled = false;
      setLoadingDetail(true);

      fetch(`/api/market/stock/${encodeURIComponent(selectedTicker)}`)
        .then(async (r) => {
          if (!r.ok) return null;
          return (await r.json()) as StockDetailResponse;
        })
        .then((data) => {
          if (!cancelled) {
            setDetail(data);
            setLoadingDetail(false);
          }
        })
        .catch(() => {
          if (!cancelled) setLoadingDetail(false);
        });

      return () => {
        cancelled = true;
      };
    }, [selectedTicker, refreshToken]);

    const tk = detail?.snapshot ?? stocks.find((s) => s.ticker === selectedTicker) ?? null;
    const vcp = detail?.vcp ?? null;

    if (!tk) {
      return (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          Chưa có cổ phiếu nào trong danh mục để phân tích.
        </div>
      );
    }

    const ma20Ok = tk.ma20 !== null && tk.close >= tk.ma20;
    const ma50Ok = tk.ma50 !== null && tk.close > tk.ma50;
    const maLongOk = tk.ma150 !== null && tk.ma200 !== null && tk.close > tk.ma150 && tk.close > tk.ma200;
    const ma200Up = tk.ma200 !== null && tk.ma200_20dAgo !== null && tk.ma200 > tk.ma200_20dAgo;

    const StatusIcon = ({ ok }: { ok: boolean }) =>
      ok ? (
        <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold">
          <Check className="w-3.5 h-3.5" /> Nằm trên
        </span>
      ) : (
        <span className="inline-flex items-center gap-0.5 text-red-600 font-semibold">
          <X className="w-3.5 h-3.5" /> Nằm dưới
        </span>
      );

    return (
      <div className="space-y-4">
        {/* Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredOptions.length > 0) {
                    onSelectTicker(filteredOptions[0].ticker);
                  }
                }}
                placeholder="Lọc nhanh mã..."
                className="w-full h-9 pl-8 pr-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
              />
            </div>

            <select
              value={selectedTicker}
              onChange={(e) => onSelectTicker(e.target.value)}
              className="flex-1 min-w-[240px] max-w-lg h-9 px-3 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            >
              {filteredOptions.map((s) => {
                const rsStr = s.rsRating !== null ? String(s.rsRating) : 'N/A';
                const tag = vcpTickers.has(s.ticker)
                  ? `[VCP · RS ${rsStr}]`
                  : s.isMinerviniBase
                    ? `[Minervini · RS ${rsStr}]`
                    : `(RS ${rsStr})`;
                const namePart = s.companyName ? ` — ${s.companyName}` : '';
                return (
                  <option key={s.ticker} value={s.ticker}>
                    {s.ticker}{namePart} {tag}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-center p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setChartType('candlestick')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                chartType === 'candlestick'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Biểu đồ nến (OHLC)
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                chartType === 'line'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Biểu đồ đường (Close)
            </button>
          </div>
        </div>

        {/* Title & Phase Summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900">
              <span className="font-mono">{tk.ticker}</span>
              {tk.companyName ? <span className="font-semibold text-slate-600"> — {tk.companyName}</span> : null}
            </h3>
            <span className="text-xs font-mono text-slate-500">Phiên {fmtDateVn(tk.date)}</span>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="text-sm font-bold" style={{ color: tk.phaseColor }}>
              {tk.phaseTitle}
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{tk.phaseDesc}</p>
          </div>

          {vcp && (
            <div className="pt-2.5 border-t border-slate-100 text-xs text-slate-700 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-bold text-violet-700">Mô hình VCP hợp lệ ({vcp.baseDays} ngày)</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>
                Thu hẹp: <strong className="font-mono">{vcp.numContractions}T ({vcp.ranges.map((r) => `${r}%`).join(' → ')})</strong>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>
                Pivot: <strong className="font-mono text-violet-700">{fmtNum(vcp.buyPoint, 2)}</strong> ({fmtPct(vcp.pctFromPivot, 1, true)})
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-semibold text-slate-900">{vcp.status}</span>
            </div>
          )}
        </div>

        {/* 3 Diagnostic Detail Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
            <div className="font-bold text-slate-900 pb-1.5 border-b border-slate-100">Cấu trúc xu hướng &amp; MA</div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600">
                Giá (<span className="font-mono font-semibold text-slate-900">{fmtNum(tk.close, 2)}</span>) vs MA20 ({fmtNum(tk.ma20, 2)})
              </span>
              <StatusIcon ok={ma20Ok} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600">Giá vs MA50 ({fmtNum(tk.ma50, 2)})</span>
              <StatusIcon ok={ma50Ok} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600">
                MA150 / MA200 ({fmtNum(tk.ma150, 2)} / {fmtNum(tk.ma200, 2)})
              </span>
              <StatusIcon ok={maLongOk} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
            <div className="font-bold text-slate-900 pb-1.5 border-b border-slate-100">Vị thế đỉnh / đáy 52 tuần</div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600">Đỉnh 52 tuần</span>
              <span className="font-mono text-slate-900">
                <strong>{fmtNum(tk.peak52w, 2)}</strong> ({fmtPct(tk.pctFromPeak, 1, true)})
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600">Đáy 52 tuần</span>
              <span className="font-mono text-slate-900">
                <strong>{fmtNum(tk.bottom52w, 2)}</strong> ({fmtPct(tk.pctFromBottom, 1, true)})
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600">Độ dốc MA200 (20P)</span>
              {ma200Up ? (
                <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold">
                  <Check className="w-3.5 h-3.5" /> Dốc lên
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-red-600 font-semibold">
                  <X className="w-3.5 h-3.5" /> Đi ngang / Dốc xuống
                </span>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
            <div className="font-bold text-slate-900 pb-1.5 border-b border-slate-100">Sức mạnh &amp; Thanh khoản</div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600">Điểm RS Rating</span>
              <span className="font-mono">
                <strong className="text-lg font-bold text-violet-700">{tk.rsRating ?? 'N/A'}</strong>
                <span className="text-slate-400"> / 99</span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600">KLGD phiên gần nhất</span>
              <span className="font-mono font-semibold text-slate-900">{fmtInt(tk.volume)} CP</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600">KLGD TB 20 phiên</span>
              <span className="font-mono font-semibold text-slate-900">{fmtInt(tk.volMa20)} CP</span>
            </div>
          </div>
        </div>

        {/* Candlestick / Line Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          {loadingDetail && !detail ? (
            <div className="h-[520px] flex items-center justify-center text-xs text-slate-400">
              Đang tải đồ thị kỹ thuật {selectedTicker}...
            </div>
          ) : detail && detail.bars.length > 0 ? (
            <StockDiagnosticChart
              ticker={detail.snapshot.ticker}
              bars={detail.bars}
              vcp={detail.vcp}
              chartType={chartType}
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-xs text-slate-400">
              Không có dữ liệu nến cho mã {selectedTicker}.
            </div>
          )}
        </div>
      </div>
    );
  }
);
