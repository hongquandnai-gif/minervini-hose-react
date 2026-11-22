import React from 'react';
import { RefreshCw, Radio, Pause, SlidersHorizontal, Calendar, Layers } from 'lucide-react';
import type { BasketOption } from '../types';
import { diffDays, subtractCalendarDays } from '../utils/format';

interface SidebarProps {
  baskets: BasketOption[];
  basketChoice: string;
  onBasketChange: (label: string) => void;
  customTickers: string;
  onCustomTickersChange: (val: string) => void;
  onApplyCustomTickers: () => void;
  startDate: string;
  endDate: string;
  maxDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  showMa20Line: boolean;
  onToggleMa20Line: (val: boolean) => void;
  minVolFilter: number;
  onMinVolFilterChange: (val: number) => void;
  realtimeOn: boolean;
  onToggleRealtime: (val: boolean) => void;
  pauseLive: boolean;
  onTogglePauseLive: (val: boolean) => void;
  onRefresh: () => void;
  loading: boolean;
  loadedCount: number;
  requestedCount: number;
  sourceInfo: string;
}

export const Sidebar: React.FC<SidebarProps> = React.memo((props) => {
  const days = props.startDate && props.endDate ? diffDays(props.startDate, props.endDate) : 0;
  const dateInvalid = !props.startDate || !props.endDate || props.startDate >= props.endDate || days < 400;

  const setPresetDays = (nDays: number) => {
    const baseEnd = props.endDate || props.maxDate;
    props.onStartDateChange(subtractCalendarDays(baseEnd, nDays));
  };

  return (
    <aside className="w-full lg:w-[276px] lg:shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col">
      <div className="p-5 space-y-6">
        {/* Basket Selection */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-700">
            <Layers className="w-3.5 h-3.5 text-sky-600" />
            <span>Danh mục cổ phiếu SSI</span>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="basket-select" className="block text-xs font-medium text-slate-700">
              Chọn bảng / rổ gốc
            </label>
            <select
              id="basket-select"
              value={props.basketChoice}
              onChange={(e) => props.onBasketChange(e.target.value)}
              disabled={props.loading}
              className="w-full h-9 px-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-colors"
            >
              {props.baskets.map((b) => (
                <option key={b.label} value={b.label}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="custom-tickers" className="block text-xs font-medium text-slate-700">
              Hoặc nhập danh sách mã riêng
            </label>
            <div className="flex gap-1.5">
              <input
                id="custom-tickers"
                type="text"
                value={props.customTickers}
                onChange={(e) => props.onCustomTickersChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') props.onApplyCustomTickers();
                }}
                placeholder="VD: FPT, SSI, PC1, HPG"
                className="flex-1 min-w-0 h-9 px-2.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
              />
              <button
                type="button"
                onClick={props.onApplyCustomTickers}
                disabled={props.loading}
                className="px-3 h-9 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                Áp dụng
              </button>
            </div>
          </div>

          {props.sourceInfo && (
            <div className="text-xs text-slate-600 bg-sky-50/50 border border-sky-200/70 rounded-lg p-2.5 leading-relaxed">
              <div className="font-bold text-emerald-700 tabular-nums">
                {props.loadedCount} / {props.requestedCount} cổ phiếu hợp lệ
              </div>
              <div className="text-sky-700/90 mt-0.5 truncate" title={props.sourceInfo}>
                Nguồn: {props.sourceInfo}
              </div>
            </div>
          )}
        </section>

        <hr className="border-slate-100" />

        {/* Date Range */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Dải ngày phân tích</span>
            </div>
            <div className="flex items-center gap-1">
              {[
                { label: '1.5N', days: 550 },
                { label: '2N', days: 730 },
                { label: '3N', days: 1095 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setPresetDays(p.days)}
                  className="px-1.5 py-0.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label htmlFor="start-date" className="block text-[11px] font-medium text-slate-600">
                Từ ngày
              </label>
              <input
                id="start-date"
                type="date"
                value={props.startDate}
                max={props.maxDate}
                onChange={(e) => props.onStartDateChange(e.target.value)}
                className="w-full h-9 px-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="end-date" className="block text-[11px] font-medium text-slate-600">
                Đến ngày
              </label>
              <input
                id="end-date"
                type="date"
                value={props.endDate}
                max={props.maxDate}
                onChange={(e) => props.onEndDateChange(e.target.value)}
                className="w-full h-9 px-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
              />
            </div>
          </div>

          {dateInvalid ? (
            <p className="text-xs text-rose-600 font-semibold">
              Yêu cầu tối thiểu 400 ngày lịch ({days} ngày hiện tại).
            </p>
          ) : (
            <p className="text-xs text-slate-500 tabular-nums">
              Biên độ hiển thị: <span className="font-bold text-indigo-700">{days} ngày</span>{' '}
              <span className="text-amber-700 font-medium">(+400 ngày đệm MA200 &amp; 52T)</span>
            </p>
          )}
        </section>

        <hr className="border-slate-100" />

        {/* Chart & Liquidity Settings */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
            <span>Biểu đồ &amp; Thanh khoản</span>
          </div>

          <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={props.showMa20Line}
              onChange={(e) => props.onToggleMa20Line(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
            />
            <span>
              Hiển thị đường <span className="font-semibold text-pink-600">% Dưới MA20</span> (Ngắn hạn)
            </span>
          </label>

          <div className="space-y-1.5">
            <label htmlFor="min-vol" className="block text-xs font-medium text-slate-700">
              KLGD TB 20 phiên tối thiểu (CP)
            </label>
            <input
              id="min-vol"
              type="number"
              min={0}
              max={5000000}
              step={10000}
              value={props.minVolFilter}
              onChange={(e) => props.onMinVolFilterChange(Math.max(0, Number(e.target.value) || 0))}
              className="w-full h-9 px-2.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            />
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* Realtime Live Engine */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 text-xs font-bold ${props.realtimeOn ? 'text-emerald-700' : 'text-teal-700'}`}>
              <Radio className={`w-3.5 h-3.5 ${props.realtimeOn ? 'text-emerald-600' : 'text-teal-500'}`} />
              <span>Realtime Trong Phiên</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={props.realtimeOn}
              onClick={() => props.onToggleRealtime(!props.realtimeOn)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                props.realtimeOn ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  props.realtimeOn ? 'translate-x-4.5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {props.realtimeOn && (
            <label className="flex items-center gap-2.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={props.pauseLive}
                onChange={(e) => props.onTogglePauseLive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <Pause className="w-3 h-3 text-slate-400" />
              <span>Tạm dừng nhảy số (để soi mã)</span>
            </label>
          )}

          <button
            type="button"
            onClick={props.onRefresh}
            disabled={props.loading}
            className="w-full h-9 px-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${props.loading ? 'animate-spin' : ''}`} />
            <span>Tải mới danh mục &amp; dữ liệu</span>
          </button>
        </section>
      </div>
    </aside>
  );
});
