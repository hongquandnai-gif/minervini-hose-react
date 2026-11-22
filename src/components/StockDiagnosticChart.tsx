import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { StockBar, VcpItem } from '../types';
import { fmtDateVn, fmtInt, fmtNum } from '../utils/format';

interface StockDiagnosticChartProps {
  ticker: string;
  bars: StockBar[];
  vcp: VcpItem | null;
  chartType: 'candlestick' | 'line';
}

export const StockDiagnosticChart: React.FC<StockDiagnosticChartProps> = React.memo(
  ({ ticker, bars, vcp, chartType }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<echarts.ECharts | null>(null);

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
      if (!chart || bars.length === 0) return;

      const dates = bars.map((b) => b.date);
      const dateIndexMap = new Map<string, number>();
      dates.forEach((d, idx) => dateIndexMap.set(d, idx));

      // ECharts candlestick expects [open, close, lowest, highest]
      const ohlcData = bars.map((b) => [b.open, b.close, b.low, b.high]);
      const closeData = bars.map((b) => b.close);
      const ma20Data = bars.map((b) => (b.ma20 !== null ? Number(b.ma20.toFixed(2)) : null));
      const ma50Data = bars.map((b) => (b.ma50 !== null ? Number(b.ma50.toFixed(2)) : null));
      const ma150Data = bars.map((b) => (b.ma150 !== null ? Number(b.ma150.toFixed(2)) : null));
      const ma200Data = bars.map((b) => (b.ma200 !== null ? Number(b.ma200.toFixed(2)) : null));

      const volData = bars.map((b) => ({
        value: b.volume,
        itemStyle: { color: b.close >= b.open ? 'rgba(16, 185, 129, 0.72)' : 'rgba(239, 68, 68, 0.72)' },
      }));
      const volMa50Data = bars.map((b) => (b.volMa50 !== null ? Math.round(b.volMa50) : null));

      const priceSeries: echarts.SeriesOption =
        chartType === 'candlestick'
          ? {
              name: `${ticker} (OHLC)`,
              type: 'candlestick',
              xAxisIndex: 0,
              yAxisIndex: 0,
              data: ohlcData,
              itemStyle: {
                color: '#10b981',
                color0: '#ef4444',
                borderColor: '#10b981',
                borderColor0: '#ef4444',
              },
              markLine: vcp
                ? {
                    silent: true,
                    symbol: 'none',
                    data: [
                      {
                        yAxis: Number(vcp.buyPoint.toFixed(2)),
                        lineStyle: { color: '#7c3aed', type: 'dotted', width: 2 },
                        label: {
                          formatter: `Pivot: ${fmtNum(vcp.buyPoint, 2)}`,
                          position: 'insideEndTop',
                          color: '#6d28d9',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 11,
                          fontWeight: 600,
                        },
                      },
                    ],
                  }
                : undefined,
            }
          : {
              name: `${ticker} (Close)`,
              type: 'line',
              xAxisIndex: 0,
              yAxisIndex: 0,
              data: closeData,
              showSymbol: false,
              lineStyle: { color: '#0284c7', width: 2.3 },
              itemStyle: { color: '#0284c7' },
              markLine: vcp
                ? {
                    silent: true,
                    symbol: 'none',
                    data: [
                      {
                        yAxis: Number(vcp.buyPoint.toFixed(2)),
                        lineStyle: { color: '#7c3aed', type: 'dotted', width: 2 },
                        label: {
                          formatter: `Pivot: ${fmtNum(vcp.buyPoint, 2)}`,
                          position: 'insideEndTop',
                          color: '#6d28d9',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 11,
                          fontWeight: 600,
                        },
                      },
                    ],
                  }
                : undefined,
            };

      const seriesList: echarts.SeriesOption[] = [
        priceSeries,
        {
          name: 'MA20',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: ma20Data,
          showSymbol: false,
          lineStyle: { color: '#10b981', width: 1.3, type: 'dotted' },
          itemStyle: { color: '#10b981' },
        },
        {
          name: 'MA50',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: ma50Data,
          showSymbol: false,
          lineStyle: { color: '#f97316', width: 1.5, type: 'dashed' },
          itemStyle: { color: '#f97316' },
        },
        {
          name: 'MA150',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: ma150Data,
          showSymbol: false,
          lineStyle: { color: '#8b5cf6', width: 1.5, type: 'dashed' },
          itemStyle: { color: '#8b5cf6' },
        },
        {
          name: 'MA200',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: ma200Data,
          showSymbol: false,
          lineStyle: { color: '#ef4444', width: 2 },
          itemStyle: { color: '#ef4444' },
        },
      ];

      if (vcp && vcp.zigzagDates.length > 0) {
        const zzSeriesData: Array<[number, number]> = [];
        for (let i = 0; i < vcp.zigzagDates.length; i++) {
          const idx = dateIndexMap.get(vcp.zigzagDates[i]);
          if (idx !== undefined) {
            zzSeriesData.push([idx, Number(vcp.zigzagVals[i].toFixed(2))]);
          }
        }
        if (zzSeriesData.length >= 2) {
          seriesList.push({
            name: `Sóng VCP (${vcp.numContractions}T)`,
            type: 'line',
            xAxisIndex: 0,
            yAxisIndex: 0,
            data: zzSeriesData,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: { color: '#6d28d9', width: 2, type: 'dotted' },
            itemStyle: { color: '#6d28d9' },
            z: 10,
          });
        }
      }

      seriesList.push(
        {
          name: 'Khối lượng',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volData,
        },
        {
          name: 'MA50 Volume',
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volMa50Data,
          showSymbol: false,
          lineStyle: { color: '#0284c7', width: 1.5 },
          itemStyle: { color: '#0284c7' },
        }
      );

      const option: echarts.EChartsOption = {
        animation: false,
        axisPointer: { link: [{ xAxisIndex: 'all' }] },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross' },
          backgroundColor: 'rgba(255,255,255,0.97)',
          borderColor: '#cbd5e1',
          borderWidth: 1,
          textStyle: { color: '#0f172a', fontSize: 12 },
          formatter: (params: unknown) => {
            const list = Array.isArray(params) ? params : [];
            if (list.length === 0) return '';
            const idx = (list[0] as { dataIndex?: number }).dataIndex ?? 0;
            const b = bars[idx];
            if (!b) return '';
            const color = b.close >= b.open ? '#059669' : '#dc2626';
            return `
              <div style="font-family:JetBrains Mono,monospace;font-size:11.5px;min-width:190px;">
                <div style="font-weight:700;margin-bottom:6px;color:#0f172a;">${ticker} · ${fmtDateVn(b.date)}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 12px;margin-bottom:6px;">
                  <span style="color:#64748b;">Mở: <b>${fmtNum(b.open, 2)}</b></span>
                  <span style="color:#64748b;">Cao: <b>${fmtNum(b.high, 2)}</b></span>
                  <span style="color:#64748b;">Thấp: <b>${fmtNum(b.low, 2)}</b></span>
                  <span style="color:${color};">Đóng: <b>${fmtNum(b.close, 2)}</b></span>
                </div>
                <div style="border-top:1px solid #f1f5f9;padding-top:4px;display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;color:#475569;">
                  <span>MA20: ${fmtNum(b.ma20, 2)}</span>
                  <span>MA50: ${fmtNum(b.ma50, 2)}</span>
                  <span>MA150: ${fmtNum(b.ma150, 2)}</span>
                  <span>MA200: ${fmtNum(b.ma200, 2)}</span>
                </div>
                <div style="border-top:1px solid #f1f5f9;padding-top:4px;margin-top:4px;color:#475569;">
                  KL: <b>${fmtInt(b.volume)}</b> · MA50 KL: ${fmtInt(b.volMa50)}
                </div>
              </div>
            `;
          },
        },
        legend: {
          top: 4,
          right: 8,
          itemWidth: 14,
          itemHeight: 3,
          textStyle: { color: '#475569', fontSize: 11 },
        },
        grid: [
          { left: 54, right: 20, top: 40, height: '58%' },
          { left: 54, right: 20, top: '73%', height: '18%' },
        ],
        dataZoom: [
          { type: 'inside', xAxisIndex: [0, 1] },
          {
            type: 'slider',
            xAxisIndex: [0, 1],
            height: 16,
            bottom: 6,
            borderColor: '#e2e8f0',
            fillerColor: 'rgba(2, 132, 199, 0.12)',
          },
        ],
        xAxis: [
          {
            type: 'category',
            gridIndex: 0,
            data: dates,
            axisLine: { lineStyle: { color: '#e2e8f0' } },
            axisLabel: { show: false },
            splitLine: { show: true, lineStyle: { color: '#f1f5f9' } },
          },
          {
            type: 'category',
            gridIndex: 1,
            data: dates,
            axisLine: { lineStyle: { color: '#e2e8f0' } },
            axisLabel: {
              color: '#64748b',
              fontSize: 10.5,
              fontFamily: 'JetBrains Mono, monospace',
              formatter: (v: string) => `${v.slice(8, 10)}/${v.slice(5, 7)}`,
            },
            splitLine: { show: false },
          },
        ],
        yAxis: [
          {
            type: 'value',
            gridIndex: 0,
            scale: true,
            axisLabel: { color: '#475569', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' },
            splitLine: { lineStyle: { color: '#f1f5f9' } },
          },
          {
            type: 'value',
            gridIndex: 1,
            splitNumber: 2,
            axisLabel: {
              color: '#64748b',
              fontSize: 10,
              fontFamily: 'JetBrains Mono, monospace',
              formatter: (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)),
            },
            splitLine: { lineStyle: { color: '#f8fafc' } },
          },
        ],
        series: seriesList,
      };

      chart.setOption(option, true);
    }, [ticker, bars, vcp, chartType]);

    return <div ref={containerRef} className="w-full h-[520px]" />;
  }
);
