import React from 'react';
import type { VcpItem } from '../types';
import { fmtInt, fmtNum, fmtPct } from '../utils/format';

interface VcpTabProps {
  vcpList: VcpItem[];
  minVolFilter: number;
  onSelectTicker: (ticker: string) => void;
}

function statusStyle(priority: number): string {
  if (priority === 0) return 'text-emerald-800 bg-emerald-50 font-semibold';
  if (priority === 1) return 'text-sky-800 bg-sky-50 font-semibold';
  if (priority === 2) return 'text-amber-800 bg-amber-50 font-semibold';
  return 'text-red-800 bg-red-50 font-semibold';
}

function rsStyle(rs: number): string {
  if (rs >= 90) return 'text-violet-700 bg-violet-50 font-bold';
  if (rs >= 80) return 'text-emerald-700 bg-emerald-50 font-bold';
  if (rs >= 70) return 'text-amber-700 bg-amber-50 font-bold';
  return 'text-slate-600';
}

export const VcpTab: React.FC<VcpTabProps> = React.memo(({ vcpList, minVolFilter, onSelectTicker }) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900">
          Tín hiệu điểm mua mô hình thu hẹp biến động (VCP)
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Quét các cổ phiếu thỏa mãn Trend Template (RS ≥ 60, KLGD TB 20P ≥ {fmtInt(minVolFilter)} CP) hình thành cấu trúc VCP (Lookback 150 ngày, nền giá ≥ 15 ngày, chưa gãy đáy thu hẹp cuối). Click vào dòng để xem sóng VCP trên đồ thị.
        </p>
      </div>

      {vcpList.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          Chưa phát hiện cổ phiếu nào hình thành cấu trúc VCP hợp lệ trong danh mục tại ngày này.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-2.5 px-3 text-left font-semibold whitespace-nowrap">Nguồn</th>
                <th className="py-2.5 px-3 text-left font-semibold whitespace-nowrap">Mã CP</th>
                <th className="py-2.5 px-3 text-left font-semibold min-w-[180px]">Tên DN (SSI)</th>
                <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">RS Rating</th>
                <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">Giá hiện tại</th>
                <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">Điểm Pivot</th>
                <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">% Cách Pivot</th>
                <th className="py-2.5 px-3 text-left font-semibold whitespace-nowrap">Vòng thu hẹp</th>
                <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">Nền giá</th>
                <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">KL / MA50</th>
                <th className="py-2.5 px-3 text-left font-semibold whitespace-nowrap">Trạng thái mua</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vcpList.map((item) => (
                <tr
                  key={item.ticker}
                  onClick={() => onSelectTicker(item.ticker)}
                  className="hover:bg-sky-50/50 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">
                    <span className={item.isLive ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                      {item.isLive ? 'LIVE' : 'EOD'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {item.ticker}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 max-w-[230px] truncate" title={item.companyName}>
                    {item.companyName || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    <span className={`inline-block px-2 py-0.5 rounded ${rsStyle(item.rsRating)}`}>
                      {item.rsRating}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                    {fmtNum(item.close, 2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-violet-700">
                    {fmtNum(item.buyPoint, 2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800">
                    {fmtPct(item.pctFromPivot, 1, true)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                    {item.numContractions}T ({item.ranges.map((r) => `${r}%`).join(' → ')})
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                    {item.baseDays} ngày
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                    {item.volRatio !== null ? `${Math.round(item.volRatio)}%` : '—'}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] ${statusStyle(item.priority)}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});
