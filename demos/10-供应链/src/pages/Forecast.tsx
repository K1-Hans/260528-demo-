import { useState } from 'react';
import { TrendingUp, BarChart2, Target, Activity } from 'lucide-react';
import { PageHeader, StatCard, TrendChip } from '../components/ui';
import { Panel } from '../components/sig';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar, accent, chanColor, areaGradient, DRAW } from '../lib/chartTheme';
import { FORECAST_SERIES, FORECAST_KPIS } from '../lib/mockData';

const KPI_ICONS = [
  <Target size={16} />,
  <BarChart2 size={16} />,
  <TrendingUp size={16} />,
  <Activity size={16} />,
];

export default function Forecast() {
  const [selSku, setSelSku] = useState(FORECAST_SERIES[0].sku);
  const selSeries = FORECAST_SERIES.find(s => s.sku === selSku) ?? FORECAST_SERIES[0];

  return (
    <div className="page page-wide">
      <PageHeader
        title="需求预测"
        subtitle="AI 时序模型 · 带置信区间 · 历史实际 vs 未来预测 · SKU 级精度监控"
        actions={<span className="tag tag-mono"><Activity size={12} style={{ marginRight: 4 }} />实时推演</span>}
      />

      {/* KPI 带 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {FORECAST_KPIS.map((k, i) => (
          <StatCard key={k.label} {...k} icon={KPI_ICONS[i]} delayClass={`d${i + 1}`} />
        ))}
      </div>

      {/* 主体：左侧 SKU 列表 + 右侧图表区 */}
      <div style={{ display: 'grid', gridTemplateColumns: '264px 1fr', gap: 14, alignItems: 'start' }}>

        {/* 左：SKU 列表 */}
        <div className="col gap-2">
          <Panel
            title={<><BarChart2 size={13} />SKU 列表</>}
            right={<span className="t-small text-3">{FORECAST_SERIES.length} 个</span>}
          >
            <div className="col gap-2">
              {FORECAST_SERIES.map(s => {
                const isOk = s.accuracy >= 90;
                const accColor = isOk ? 'var(--success)' : 'var(--warning)';
                return (
                  <button
                    key={s.sku}
                    onClick={() => setSelSku(s.sku)}
                    style={{
                      textAlign: 'left',
                      background: selSku === s.sku ? 'color-mix(in srgb, var(--gold) 10%, var(--surface-2))' : 'var(--surface-2)',
                      border: selSku === s.sku ? '1px solid var(--gold)' : '1px solid var(--hairline)',
                      borderRadius: 'var(--r-md)',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      transition: 'background 0.18s var(--ease), border-color 0.18s var(--ease)',
                    }}
                  >
                    <div className="row spread" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{s.name}</span>
                    </div>
                    <div className="row spread" style={{ marginBottom: 6 }}>
                      <span className="t-small text-3" style={{ fontSize: 10.5 }}>{s.category} · {s.sku}</span>
                    </div>
                    <div className="row spread" style={{ alignItems: 'center' }}>
                      <span style={{ fontSize: 11.5, color: accColor }}>
                        准确率 <span className="mononum" style={{ fontWeight: 700 }}>{s.accuracy.toFixed(1)}%</span>
                      </span>
                      <TrendChip change={s.trend} suffix="同比" />
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* 右：图表区 */}
        <div className="col gap-4">

          {/* 签名：置信区间预测图 */}
          <Panel
            title={<><Activity size={13} />需求预测置信区间 · {selSeries.name}</>}
            right={
              <span className="t-small text-3" style={{ fontSize: 10.5 }}>
                预测准确率 <span className="mononum" style={{ color: selSeries.accuracy >= 90 ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>{selSeries.accuracy.toFixed(1)}%</span>
              </span>
            }
          >
            <Chart
              height={320}
              deps={[selSku]}
              build={() => {
                const acc = accent();
                const text3 = cssVar('--text-3');
                const hairline = cssVar('--hairline');
                const surface1 = cssVar('--surface-1');
                const text1 = cssVar('--text-1');
                const text2 = cssVar('--text-2');
                const font = "'Geist','PingFang SC',system-ui,sans-serif";

                // Confidence band color: semi-transparent amber
                const bandColor = `color-mix(in srgb, ${acc} 18%, transparent)`;
                const bandColorTop = `color-mix(in srgb, ${acc} 22%, transparent)`;

                const months = selSeries.months;

                // Build upper series data (non-null for future region)
                const upperData = selSeries.upper.map((v, i) => {
                  if (v !== null) return v;
                  // In the actual region, stack on actual so band starts there
                  return selSeries.actual[i] ?? null;
                });

                // For the lower band, we use null in history region
                const lowerData = selSeries.lower.map((v, i) => {
                  if (v !== null) return v;
                  return selSeries.actual[i] ?? null;
                });

                return {
                  ...baseOption(),
                  grid: { left: 12, right: 16, top: 28, bottom: 8, containLabel: true },
                  xAxis: {
                    type: 'category',
                    data: months,
                    ...axisStyle(),
                  },
                  yAxis: {
                    type: 'value',
                    ...axisStyle(),
                    axisLabel: {
                      color: text3,
                      fontSize: 11,
                      fontFamily: font,
                      formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v),
                    },
                  },
                  tooltip: {
                    trigger: 'axis',
                    backgroundColor: surface1,
                    borderColor: hairline,
                    borderWidth: 1,
                    padding: [9, 13],
                    textStyle: { color: text1, fontSize: 12, fontFamily: font },
                    extraCssText: 'border-radius:11px;box-shadow:0 10px 34px rgba(0,0,0,.30);',
                    axisPointer: { type: 'line', lineStyle: { color: hairline } },
                    formatter: (params: { seriesName: string; value: number | null; axisValueLabel: string }[]) => {
                      const x = params[0]?.axisValueLabel ?? '';
                      const lines = params
                        .filter(p => p.value !== null && !['置信上界', '置信下界'].includes(p.seriesName))
                        .map(p => `<div style="display:flex;justify-content:space-between;gap:16px"><span style="color:${text2}">${p.seriesName}</span><span class="mononum" style="font-weight:700;color:${text1}">${p.value?.toLocaleString()}</span></div>`)
                        .join('');
                      return `<div style="font-family:${font};font-size:12px"><div style="color:${text3};margin-bottom:4px">${x}</div>${lines}</div>`;
                    },
                  },
                  legend: {
                    data: ['历史实际', '需求预测'],
                    top: 4,
                    right: 16,
                    textStyle: { color: text2, fontSize: 11, fontFamily: font },
                    itemWidth: 16,
                    itemHeight: 2,
                    itemGap: 16,
                  },
                  series: [
                    // Confidence band upper boundary (invisible, only for areaStyle base)
                    {
                      name: '置信上界',
                      type: 'line',
                      data: upperData,
                      symbol: 'none',
                      lineStyle: { width: 0, opacity: 0 },
                      areaStyle: {
                        color: bandColorTop,
                        origin: 'auto',
                      },
                      stack: 'band',
                      silent: true,
                      ...DRAW,
                    },
                    // Confidence band lower boundary — fills between lower and upper
                    {
                      name: '置信下界',
                      type: 'line',
                      data: lowerData,
                      symbol: 'none',
                      lineStyle: { width: 0.8, opacity: 0.35, color: acc, type: 'dashed' as const },
                      areaStyle: {
                        color: bandColor,
                        origin: 'auto',
                      },
                      silent: true,
                      ...DRAW,
                    },
                    // Historical actual — solid amber line
                    {
                      name: '历史实际',
                      type: 'line',
                      data: selSeries.actual,
                      symbol: 'circle',
                      symbolSize: 5,
                      lineStyle: { color: acc, width: 2.5 },
                      itemStyle: { color: acc, borderColor: surface1, borderWidth: 2 },
                      areaStyle: areaGradient(acc, 0.13),
                      ...DRAW,
                    },
                    // Future forecast — dashed amber line
                    {
                      name: '需求预测',
                      type: 'line',
                      data: selSeries.forecast,
                      symbol: 'emptyCircle',
                      symbolSize: 5,
                      lineStyle: { color: acc, width: 2, type: 'dashed' as const },
                      itemStyle: { color: acc },
                      ...DRAW,
                    },
                  ],
                };
              }}
            />
            <div className="row gap-3" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--hairline)' }}>
              <span className="row gap-2 t-small text-3" style={{ fontSize: 11 }}>
                <span style={{ display: 'inline-block', width: 20, height: 2, background: accent(), verticalAlign: 'middle', borderRadius: 1 }} />
                历史实际
              </span>
              <span className="row gap-2 t-small text-3" style={{ fontSize: 11 }}>
                <span style={{ display: 'inline-block', width: 20, height: 2, borderTop: '2px dashed var(--gold)', verticalAlign: 'middle' }} />
                需求预测
              </span>
              <span className="row gap-2 t-small text-3" style={{ fontSize: 11 }}>
                <span style={{ display: 'inline-block', width: 16, height: 10, background: 'color-mix(in srgb, var(--gold) 18%, transparent)', borderRadius: 2, verticalAlign: 'middle' }} />
                置信区间（87% – 114%）
              </span>
            </div>
          </Panel>

          {/* 副图：各 SKU 预测准确率对比横向条形 */}
          <Panel
            title={<><Target size={13} />各 SKU 预测准确率对比</>}
            right={<span className="t-small text-3">近 3 个月均值</span>}
          >
            <Chart
              height={164}
              deps={[]}
              build={() => {
                const text3 = cssVar('--text-3');
                const hairline = cssVar('--hairline');
                const surface1 = cssVar('--surface-1');
                const text1 = cssVar('--text-1');
                const text2 = cssVar('--text-2');
                const font = "'Geist','PingFang SC',system-ui,sans-serif";

                // Pre-resolve per-SKU colors by accuracy
                const barColors = FORECAST_SERIES.map(s =>
                  s.accuracy >= 92 ? chanColor('--c2') :
                  s.accuracy >= 88 ? chanColor('--c4') :
                  chanColor('--c6')
                );

                return {
                  ...baseOption(),
                  grid: { left: 8, right: 72, top: 8, bottom: 8, containLabel: true },
                  xAxis: {
                    type: 'value',
                    min: 80,
                    max: 100,
                    ...axisStyle(),
                    axisLabel: {
                      color: text3,
                      fontSize: 10,
                      fontFamily: font,
                      formatter: (v: number) => `${v}%`,
                    },
                  },
                  yAxis: {
                    type: 'category',
                    data: FORECAST_SERIES.map(s => s.name.length > 9 ? s.name.slice(0, 9) + '…' : s.name),
                    inverse: true,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: { color: text3, fontSize: 11, fontFamily: font },
                    splitLine: { show: false },
                  },
                  tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' },
                    backgroundColor: surface1,
                    borderColor: hairline,
                    borderWidth: 1,
                    padding: [9, 13],
                    textStyle: { color: text1, fontSize: 12, fontFamily: font },
                    extraCssText: 'border-radius:11px;box-shadow:0 10px 34px rgba(0,0,0,.30);',
                    formatter: (params: { name: string; value: number }[]) => {
                      const p = params[0];
                      return `<div style="font-family:${font};font-size:12px"><span style="color:${text2}">${p.name}</span><br/><span class="mononum" style="font-weight:700;color:${text1}">${p.value.toFixed(1)}%</span></div>`;
                    },
                  },
                  series: [
                    {
                      type: 'bar',
                      data: FORECAST_SERIES.map((s, i) => ({
                        value: s.accuracy,
                        itemStyle: {
                          color: barColors[i],
                          borderRadius: [0, 4, 4, 0],
                        },
                        label: {
                          show: true,
                          position: 'right' as const,
                          formatter: '{c}%',
                          color: text2,
                          fontSize: 11,
                          fontFamily: font,
                          fontVariantNumeric: 'tabular-nums',
                        },
                      })),
                      barWidth: 20,
                      barGap: '30%',
                      ...DRAW,
                    },
                  ],
                };
              }}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}
