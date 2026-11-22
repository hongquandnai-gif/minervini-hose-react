import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { MarketSummary } from '../types';
import { fmtDateVn, fmtNum } from '../utils/format';

interface KpiStripProps {
  summary: MarketSummary;
}

interface MetricCardProps {
  title: string;
  value: number | null;
  delta: number | null;
  isPercentage?: boolean;
  invertColor?: boolean;
  footerLabel?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  delta,
  isPercentage = false,
  invertColor = false,
  footerLabel = 'so với phiên trước',
}) => {
  const hasDelta = delta !== null && Number.isFinite(delta);
  const isUp = hasDelta && delta! > 0.0001;
  const isDown = hasDelta && delta! < -0.0001;

  let deltaColor = 'text-slate-500';
  if (isUp) deltaColor = invertColor ? 'text-red-600' : 'text-emerald-700';
  else if (isDown) deltaColor = invertColor ? 'text-emerald-700' : 'text-red-600';

  const valStr = value === null ? '—' : isPercentage ? `${fmtNum(value, 2)}%` : fmtNum(value, 2);
  const deltaStr = !hasDelta
    ? '—'
    : isPercentage
      ? `${fmtNum(Math.abs(delta!), 2)}%`
      : fmtNum(Math.abs(delta!), 2);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between min-h-[112px]">
      <div className="text-xs font-semibold text-slate-500 truncate">{title}</div>
      <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight my-1.5">{valStr}</div>
      <div className="flex items-center gap-1.5 text-xs">
        <span className={`inline-flex items-center gap-0.5 font-mono font-semibold ${deltaColor}`}>
          {isUp ? (
            <ArrowUpRight className="w-3.5 h-3.5" />
          ) : isDown ? (
            <ArrowDownRight className="w-3.5 h-3.5" />
          ) : (
            <Minus className="w-3 h-3" />
          )}
          {deltaStr}
        </span>
        <span className="text-slate-400 truncate">{footerLabel}</span>
      </div>
    </div>
  );
};

export const KpiStrip: React.FC<KpiStripProps> = React.memo(({ summary }) => {
  const deltaHose = summary.latestHose - summary.prevHose;
  const deltaMa200 =
    summary.latestPctAboveMa200 !== null && summary.prevPctAboveMa200 !== null
      ? summary.latestPctAboveMa200 - summary.prevPctAboveMa200
      : null;
  const deltaMa20 =
    summary.latestPctBelowMa20 !== null && summary.prevPctBelowMa20 !== null
      ? summary.latestPctBelowMa20 - summary.prevPctBelowMa20
      : null;
  const deltaBot =
    summary.latestPctBottoming !== null && summary.prevPctBottoming !== null
      ? summary.latestPctBottoming - summary.prevPctBottoming
      : null;

  const atPeak = summary.pctDropFromPeak < 0.01;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
      <MetricCard title={summary.indexLabel} value={summary.latestHose} delta={deltaHose} />
      <MetricCard
        title="Độ rộng (> MA200)"
        value={summary.latestPctAboveMa200}
        delta={deltaMa200}
        isPercentage
      />
      <MetricCard
        title="Ngắn hạn (< MA20)"
        value={summary.latestPctBelowMa20}
        delta={deltaMa20}
        isPercentage
        invertColor
      />
      <MetricCard
        title="% CP dò đáy (≤10% đáy 52T)"
        value={summary.latestPctBottoming}
        delta={deltaBot}
        isPercentage
        invertColor
      />
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between min-h-[112px]">
        <div className="text-xs font-semibold text-slate-500 truncate">Sụt giảm từ đỉnh chu kỳ</div>
        <div
          className={`text-2xl font-bold font-mono tracking-tight my-1.5 ${
            atPeak ? 'text-emerald-700' : 'text-red-600'
          }`}
        >
          {atPeak ? '0.00%' : `-${fmtNum(summary.pctDropFromPeak, 2)}%`}
        </div>
        <div className="text-xs text-slate-500 font-mono truncate">
          {atPeak
            ? `Đang tại đỉnh · ${fmtDateVn(summary.peakDate)}`
            : `Đỉnh ${fmtNum(summary.peakPrice, 2)} · ${fmtDateVn(summary.peakDate)}`}
        </div>
      </div>
    </div>
  );
});
