import React, { useEffect, useRef } from 'react';
import echarts, { type EChartsInstance, type EChartsOption, type SeriesOption } from '../utils/echarts';
import type { DailyBreadthPoint, MarketSummary } from '../types';
import { fmtDateVn, fmtNum } from '../utils/format';

interface MarketBreadthChartProps {
  series: DailyBreadthPoint[];
  summary: MarketSummary;
  showMa20Line: boolean;
  startDate: string;
}

export const MarketBreadthChart: React.FC<MarketBreadthChartProps> = React.memo(
  ({ series, summary, showMa20Line, startDate }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<EChartsInstance | null>(null);

    useEffect(() => {
      if (!containerRef.current) return;
      const chart = echarts.init(containerRef.current, undefined, { renderer: 'canvas' });
      chartRef.current = chart;

      const observer = new ResizeObserver(() => {
        chart.resize();
      });
      observer.observe(containerRef.current);

      return () => {
        observer.disconnect();
        chart.dispose();
        chartRef.current = null;
      };
    }, []);

    useEffect(() => {
      const chart = chartRef.current;
      if (!chart || series.length === 0) return;

      const dates = series.map((p) => p.date);
      const hoseVals = series.map((p) => (p.hoseIndex !== null ? Number(p.hoseIndex.toFixed(2)) : null));
      const ma200Vals = series.map((p) => (p.pctAboveMa200 !== null ? Number(p.pctAboveMa200.toFixed(1)) : null));
      const ma20Vals = series.map((p) => (p.pctBelowMa20 !== null ? Number(p.pctBelowMa20.toFixed(1)) : null));
      const botVals = series.map((p) => (p.pctBottoming !== null ? Number(p.pctBottoming.toFixed(1)) : null));

      const validHose = hoseVals.filter((v): v is number => v !== null);
      const hoseMin = validHose.length > 0 ? Math.min(...validHose) : 0;
      const hoseMax = validHose.length > 0 ? Math.max(...validHose) : 100;
      const hosePad = Math.max((hoseMax - hoseMin) * 0.15, hoseMax * 0.03, 1);

      const peakIdx = series.findIndex((p) => p.date === summary.peakDate);

      const chartSeries: SeriesOption[] = [
        {
          name: summary.indexLabel,
          type: 'line',
          yAxisIndex: 0,
          data: hoseVals,
          showSymbol: false,
          smooth: false,
          lineStyle: { color: '#0284c7', width: 2.5 },
          itemStyle: { color: '#0284c7' },
          markPoint:
            peakIdx >= 0
              ? {
                  symbol: 'circle',
                  symbolSize: 8,
                  itemStyle: { color: '#ef4444', borderColor: '#ffffff', borderWidth: 2 },
                  label: {
                    show: true,
                    position: peakIdx > series.length * 0.82 ? 'left' : peakIdx < series.length * 0.18 ? 'right' : 'top',
                    formatter: `Đỉnh ${fmtNum(summary.peakPrice, 2)}`,
                    color: '#b91c1c',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 11,
                    fontWeight: 600,
                    backgroundColor: 'rgba(255,255,255,0.88)',
                    padding: [2, 5],
                    borderRadius: 4,
                  },
                  data: [{ name: 'Đỉnh chu kỳ', coord: [summary.peakDate, Number(summary.peakPrice.toFixed(2))] }],
                }
              : undefined,
        },
        {
          name: '% Trên MA200 (Dài hạn)',
          type: 'line',
          yAxisIndex: 1,
          data: ma200Vals,
          showSymbol: false,
          lineStyle: { color: '#f59e0b', width: 2 },
          itemStyle: { color: '#f59e0b' },
          markLine: {
            silent: true,
            symbol: 'none',
            data: [
              {
                yAxis: 80,
                lineStyle: { color: 'rgba(236, 72, 153, 0.45)', type: 'dotted', width: 1.2 },
                label: {
                  formatter: '80% Quá bán ngắn hạn',
                  position: 'insideStartTop',
                  color: '#db2777',
                  fontSize: 10,
                },
              },
              {
                yAxis: 50,
                lineStyle: { color: 'rgba(148, 163, 184, 0.6)', type: 'dashed', width: 1.2 },
                label: {
                  formatter: '50% Cân bằng',
                  position: 'insideStartTop',
                  color: '#64748b',
                  fontSize: 10,
                },
              },
              {
                yAxis: 20,
                lineStyle: { color: 'rgba(239, 68, 68, 0.55)', type: 'dashed', width: 1.2 },
                label: {
                  formatter: '20% Hoảng loạn dài hạn',
                  position: 'insideStartBottom',
                  color: '#dc2626',
                  fontSize: 10,
                },
              },
            ],
          },
        },
      ];

      if (showMa20Line) {
        chartSeries.push({
          name: '% Dưới MA20 (Ngắn hạn)',
          type: 'line',
          yAxisIndex: 1,
          data: ma20Vals,
          showSymbol: false,
          lineStyle: { color: 'rgba(236, 72, 153, 0.55)', width: 1.3, type: 'dotted' },
          itemStyle: { color: '#ec4899' },
        });
      }

      chartSeries.push({
        name: '% Đang Dò Đáy 52T',
        type: 'line',
        yAxisIndex: 1,
        data: botVals,
        showSymbol: false,
        lineStyle: { color: '#8b5cf6', width: 1.7, type: 'dashed' },
        itemStyle: { color: '#8b5cf6' },
      });

      const option: EChartsOption = {
        animation: false,
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255,255,255,0.97)',
          borderColor: '#cbd5e1',
          borderWidth: 1,
          textStyle: { color: '#0f172a', fontSize: 12, fontFamily: 'Plus Jakarta Sans, sans-serif' },
          formatter: (params: unknown) => {
            const list = Array.isArray(params) ? params : [];
            if (list.length === 0) return '';
            const idx = (list[0] as { dataIndex?: number }).dataIndex ?? 0;
            const pt = series[idx];
            if (!pt) return '';
            const lines = [
              `<div style="font-weight:700;margin-bottom:6px;font-family:JetBrains Mono,monospace;">${fmtDateVn(pt.date)}</div>`,
            ];
            for (const item of list as Array<{ seriesName: string; color: string; value: number | null }>) {
              const val = item.value;
              if (val === null || val === undefined) continue;
              const isIndex = item.seriesName === summary.indexLabel;
              const formatted = isIndex
                ? `${fmtNum(val, 2)} <span style="color:#64748b;">(cách đỉnh -${pt.pctDropFromPeak.toFixed(2)}%)</span>`
                : `${val.toFixed(1)}%`;
              lines.push(
                `<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin:2px 0;">
                  <span style="display:inline-flex;align-items:center;gap:6px;color:#475569;">
                    <span style="width:8px;height:8px;border-radius:2px;background:${item.color};display:inline-block;"></span>
                    ${item.seriesName}
                  </span>
                  <span style="font-family:JetBrains Mono,monospace;font-weight:600;color:#0f172a;">${formatted}</span>
                </div>`
              );
            }
            return lines.join('');
          },
        },
        legend: {
          top: 4,
          right: 8,
          itemWidth: 16,
          itemHeight: 3,
          textStyle: { color: '#475569', fontSize: 11.5, fontFamily: 'Plus Jakarta Sans, sans-serif' },
        },
        grid: {
          left: 56,
          right: 52,
          top: 40,
          bottom: 48,
        },
        dataZoom: [
          { type: 'inside', xAxisIndex: 0 },
          {
            type: 'slider',
            xAxisIndex: 0,
            height: 18,
            bottom: 8,
            borderColor: '#e2e8f0',
            fillerColor: 'rgba(2, 132, 199, 0.12)',
            handleStyle: { color: '#0284c7' },
          },
        ],
        xAxis: {
          type: 'category',
          data: dates,
          boundaryGap: false,
          axisLine: { lineStyle: { color: '#cbd5e1' } },
          axisLabel: {
            color: '#64748b',
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            formatter: (v: string) => `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(2, 4)}`,
          },
          splitLine: { show: true, lineStyle: { color: '#f1f5f9' } },
        },
        yAxis: [
          {
            type: 'value',
            name: summary.indexLabel,
            nameTextStyle: { color: '#0284c7', fontSize: 11, fontWeight: 600, padding: [0, 0, 0, 14] },
            min: Math.max(0, Math.floor(hoseMin - hosePad)),
            max: Math.ceil(hoseMax + hosePad * 1.25),
            axisLabel: { color: '#0284c7', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' },
            splitLine: { lineStyle: { color: '#f1f5f9' } },
          },
          {
            type: 'value',
            name: 'Độ rộng (%)',
            nameTextStyle: { color: '#d97706', fontSize: 11, fontWeight: 600, padding: [0, 10, 0, 0] },
            min: 0,
            max: 105,
            axisLabel: {
              color: '#d97706',
              fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace',
              formatter: '{value}%',
            },
            splitLine: { show: false },
          },
        ],
        series: chartSeries,
      };

      chart.setOption(option, true);
    }, [series, summary, showMa20Line]);

    return (
      <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 mb-2 border-b border-slate-100">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            Biểu đồ tương quan <span className="text-sky-700">{summary.indexLabel}</span> &amp;{' '}
            <span className="text-amber-600">độ rộng nội tại</span>{' '}
            <span className="text-emerald-700 font-mono text-xs sm:text-sm">
              ({summary.totalLoaded}/{summary.totalRequested} mã)
            </span>
          </h2>
          <span className="text-xs font-mono font-semibold text-indigo-600">
            {fmtDateVn(startDate)} — {fmtDateVn(summary.actualEvalDate)}
          </span>
        </div>
        <div ref={containerRef} className="w-full h-[420px]" />
      </section>
    );
  }
);
