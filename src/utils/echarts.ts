import * as echarts from 'echarts/core';
import { LineChart, CandlestickChart, BarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkPointComponent,
  AxisPointerComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ComposeOption } from 'echarts/core';
import type {
  LineSeriesOption,
  CandlestickSeriesOption,
  BarSeriesOption,
} from 'echarts/charts';
import type {
  GridComponentOption,
  TooltipComponentOption,
  LegendComponentOption,
  DataZoomComponentOption,
  MarkLineComponentOption,
  MarkPointComponentOption,
  AxisPointerComponentOption,
} from 'echarts/components';

echarts.use([
  LineChart,
  CandlestickChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkPointComponent,
  AxisPointerComponent,
  CanvasRenderer,
]);

export type SeriesOption = LineSeriesOption | CandlestickSeriesOption | BarSeriesOption;

export type EChartsOption = ComposeOption<
  | LineSeriesOption
  | CandlestickSeriesOption
  | BarSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | DataZoomComponentOption
  | MarkLineComponentOption
  | MarkPointComponentOption
  | AxisPointerComponentOption
>;

export type EChartsInstance = echarts.ECharts;

export default echarts;
