import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { MarketSummary } from '../types';
import { fmtDateVn, fmtNum } from '../utils/format';

interface KpiStripProps {
  summary: MarketSummary;
}

interface MetricCardProps {
  title: string;
  titleColor: string;
  value: number | null;
  valueColor: string;
  delta: number | null;
  isPercentage?: boolean;
  invertColor?: boolean;
  footerLabel?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  titleColor,
  value,
  valueColor,
  delta,
  isPercentage = false,
  invertColor = false,
  footerLabel = 'so với phiên trước',
}) => {
  const hasDelta = delta !== null && Number.isFinite(delta);
  const isUp = hasDelta && delta! > 0.0001;
  const isDown = hasDelta && delta! < -0.0001;

  let deltaColor = 'text-slate-500';
  if (isUp) deltaColor = invertColor ? 'text-rose-600' : 'text-emerald-600';
  else if (isDown) deltaColor = invertColor ? 'text-emerald-600' : 'text-rose-600';

  const valStr = value === null ? '—' : isPercentage ? `${fmtNum(value, 2)}%` : fmtNum(value, 2);
  const deltaStr = !hasDelta
    ? '—'
    : isPercentage
      ? `${fmtNum(Math.abs(delta!), 2)}%`
      : fmtNum(Math.abs(delta!), 2);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between min-h-[112px]">
      <div className={`text-xs font-bold truncate ${titleColor}`}>{title}</div>
      <div className={`text-2xl font-extrabold font-mono tracking-tight my-1.5 ${valueColor}`}>{valStr}</div>
      <div className="flex items-center gap-1.5 text-xs">
        <span className={`inline-flex items-center gap-0.5 font-mono font-bold ${deltaColor}`}>
          {isUp ? (
            <ArrowUpRight className="w-3.5 h-3.5" />
          ) : isDown ? (
            <ArrowDownRight className="w-3.5 h-3.5" />
          ) : (
            <Minus className="w-3 h-3" />
          )}
          {deltaStr}
        </span>
        <span className="text-slate-500 truncate">{footerLabel}</span>
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

  const hoseColor =
    deltaHose > 0.0001 ? 'text-emerald-600' : deltaHose < -0.0001 ? 'text-rose-600' : 'text-amber-600';

  const ma200Val = summary.latestPctAboveMa200;
  const ma200Color =
    ma200Val === null
      ? 'text-slate-400'
      : ma200Val >= 50
        ? 'text-emerald-600'
        : ma200Val <= 20
          ? 'text-rose-600'
          : 'text-amber-600';

  const ma20Val = summary.latestPctBelowMa20;
  const ma20Color =
    ma20Val === null
      ? 'text-slate-400'
      : ma20Val >= 70
        ? 'text-rose-600'
        : ma20Val <= 30
          ? 'text-emerald-600'
          : 'text-pink-600';

  const botVal = summary.latestPctBottoming;
  const botColor =
    botVal === null
      ? 'text-slate-400'
      : botVal >= 40
        ? 'text-rose-600'
        : 'text-violet-700';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
      <MetricCard
        title={summary.indexLabel}
        titleColor="text-sky-700"
        value={summary.latestHose}
        valueColor={hoseColor}
        delta={deltaHose}
      />
      <MetricCard
        title="Độ rộng (> MA200)"
        titleColor="text-amber-700"
        value={summary.latestPctAboveMa200}
        valueColor={ma200Color}
        delta={deltaMa200}
        isPercentage
      />
      <MetricCard
        title="Ngắn hạn (< MA20)"
        titleColor="text-pink-700"
        value={summary.latestPctBelowMa20}
        valueColor={ma20Color}
        delta={deltaMa20}
        isPercentage
        invertColor
      />
      <MetricCard
        title="% CP dò đáy (≤10% đáy 52T)"
        titleColor="text-violet-700"
        value={summary.latestPctBottoming}
        valueColor={botColor}
        delta={deltaBot}
        isPercentage
        invertColor
      />
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between min-h-[112px]">
        <div className="text-xs font-bold text-rose-700 truncate">Sụt giảm từ đỉnh chu kỳ</div>
        <div
          className={`text-2xl font-extrabold font-mono tracking-tight my-1.5 ${
            atPeak ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {atPeak ? '0.00%' : `-${fmtNum(summary.pctDropFromPeak, 2)}%`}
        </div>
        <div className="text-xs font-mono truncate">
          {atPeak ? (
            <span className="text-emerald-700 font-semibold">Đang tại đỉnh · {fmtDateVn(summary.peakDate)}</span>
          ) : (
            <>
              <span className="text-sky-700 font-semibold">Đỉnh {fmtNum(summary.peakPrice, 2)}</span>
              <span className="text-slate-400"> · {fmtDateVn(summary.peakDate)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
