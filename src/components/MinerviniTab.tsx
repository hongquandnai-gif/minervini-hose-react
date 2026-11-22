import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Search } from 'lucide-react';
import type { StockSnapshot } from '../types';
import { fmtDateVn, fmtInt, fmtNum, fmtPct } from '../utils/format';

interface MinerviniTabProps {
  stocks: StockSnapshot[];
  evalDate: string;
  minVolFilter: number;
  vcpTickers: Set<string>;
  onSelectTicker: (ticker: string) => void;
}

type SortKey = 'rsRating' | 'close' | 'pctFromPeak' | 'pctFromBottom' | 'volMa20' | 'ticker';

function checkTrendTemplate(s: StockSnapshot, minRs: number, minVol: number): boolean {
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

function rsColorClass(rs: number | null): string {
  if (rs === null) return 'text-slate-400';
  if (rs >= 90) return 'text-violet-700 bg-violet-50 font-bold';
  if (rs >= 80) return 'text-emerald-700 bg-emerald-50 font-bold';
  if (rs >= 70) return 'text-amber-700 bg-amber-50 font-bold';
  return 'text-slate-600';
}

export const MinerviniTab: React.FC<MinerviniTabProps> = React.memo(
  ({ stocks, evalDate, minVolFilter, vcpTickers, onSelectTicker }) => {
    const [rsThreshold, setRsThreshold] = useState(70);
    const [query, setQuery] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('rsRating');
    const [sortAsc, setSortAsc] = useState(false);

    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      const matched = stocks.filter((s) => {
        if (!checkTrendTemplate(s, rsThreshold, minVolFilter)) return false;
        if (!q) return true;
        return s.ticker.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q);
      });

      matched.sort((a, b) => {
        let diff = 0;
        if (sortKey === 'ticker') {
          diff = a.ticker.localeCompare(b.ticker);
        } else {
          const av = (a[sortKey] ?? -Infinity) as number;
          const bv = (b[sortKey] ?? -Infinity) as number;
          diff = av - bv;
        }
        return sortAsc ? diff : -diff;
      });
      return matched;
    }, [stocks, rsThreshold, minVolFilter, query, sortKey, sortAsc]);

    const toggleSort = (key: SortKey) => {
      if (sortKey === key) setSortAsc((p) => !p);
      else {
        setSortKey(key);
        setSortAsc(key === 'ticker');
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Bảng xếp hạng cổ phiếu dẫn dắt (Ngày {fmtDateVn(evalDate)})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Phát hiện <strong className="text-slate-900 font-mono">{filtered.length} / {stocks.length}</strong> cổ phiếu thỏa mãn Trend Template (RS ≥ {rsThreshold}, KLGD TB 20P ≥ {fmtInt(minVolFilter)} CP). Click vào dòng để soi đồ thị.
            </p>
            {stocks.length < 10 && (
              <p className="text-xs text-amber-700 mt-0.5">
                Lưu ý: Điểm RS Rating được xếp hạng tương đối trong phạm vi rổ cổ phiếu đang chọn.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2.5">
              <label htmlFor="rs-slider" className="text-xs font-medium text-slate-600 whitespace-nowrap">
                RS tối thiểu: <span className="font-mono font-bold text-slate-900">{rsThreshold}</span>
              </label>
              <input
                id="rs-slider"
                type="range"
                min={50}
                max={95}
                step={5}
                value={rsThreshold}
                onChange={(e) => setRsThreshold(Number(e.target.value))}
                className="w-32 accent-sky-600 cursor-pointer"
              />
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm mã hoặc tên DN..."
                className="h-8 pl-8 pr-3 w-48 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
            Không có mã cổ phiếu nào đạt đủ 8 tiêu chí Minervini Trend Template với RS Rating ≥ {rsThreshold} và KLGD TB 20P ≥ {fmtInt(minVolFilter)} CP.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-2.5 px-3 text-left font-semibold whitespace-nowrap">
                    <button type="button" onClick={() => toggleSort('ticker')} className="inline-flex items-center gap-1 hover:text-slate-900">
                      Mã CP <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-left font-semibold min-w-[200px]">Tên DN (SSI)</th>
                  <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                    <button type="button" onClick={() => toggleSort('close')} className="inline-flex items-center gap-1 hover:text-slate-900">
                      Giá hiện tại <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                    <button type="button" onClick={() => toggleSort('rsRating')} className="inline-flex items-center gap-1 hover:text-slate-900">
                      RS Rating <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                    <button type="button" onClick={() => toggleSort('pctFromPeak')} className="inline-flex items-center gap-1 hover:text-slate-900">
                      % Từ đỉnh 52T <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                    <button type="button" onClick={() => toggleSort('pctFromBottom')} className="inline-flex items-center gap-1 hover:text-slate-900">
                      % Hồi từ đáy 52T <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                    <button type="button" onClick={() => toggleSort('volMa20')} className="inline-flex items-center gap-1 hover:text-slate-900">
                      KLGD TB 20P <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">MA20</th>
                  <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">MA50</th>
                  <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">MA150</th>
                  <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">MA200</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr
                    key={s.ticker}
                    onClick={() => onSelectTicker(s.ticker)}
                    className="hover:bg-sky-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <span>{s.ticker}</span>
                      {vcpTickers.has(s.ticker) && (
                        <span className="ml-1.5 text-[10px] font-sans font-semibold text-violet-700">VCP</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-[260px] truncate" title={s.companyName}>
                      {s.companyName || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                      {fmtNum(s.close, 2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      <span className={`inline-block px-2 py-0.5 rounded ${rsColorClass(s.rsRating)}`}>
                        {s.rsRating ?? '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {fmtPct(s.pctFromPeak, 1, true)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-medium">
                      {fmtPct(s.pctFromBottom, 1, true)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {fmtInt(s.volMa20)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">{fmtNum(s.ma20, 2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">{fmtNum(s.ma50, 2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">{fmtNum(s.ma150, 2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">{fmtNum(s.ma200, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }
);
