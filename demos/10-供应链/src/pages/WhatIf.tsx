import { useState, useMemo } from 'react';
import { Sliders, TrendingDown, TrendingUp, BarChart2, Zap } from 'lucide-react';
import { PageHeader, StatCard } from '../components/ui';
import { Panel } from '../components/sig';
import Chart from '../components/Chart';
import { baseOption, cssVar, accent, axisStyle, DRAW } from '../lib/chartTheme';
import { WHATIF_LEVERS, WHATIF_BASE, WHATIF_KPIS } from '../lib/mockData';
import type { WhatIfLever } from '../types';

const KPI_ICONS = [
  <Zap size={16} />,
  <BarChart2 size={16} />,
  <Sliders size={16} />,
  <TrendingUp size={16} />,
];

// ─── 涟漪估算（基于拉杆值做简单系数模拟）─────────────────────────────────────────
function computeSim(
  lever: Record<string, number>,
  base: typeof WHATIF_BASE,
): typeof WHATIF_BASE {
  // demand: % change from 0 baseline (lever value, e.g. 20 = +20%)
  const demandDelta = lever['demand'] / 100; // e.g. 0.20
  // leadtime: % change from 0 baseline
  const leadtimeDelta = lever['leadtime'] / 100; // e.g. 0.10
  // safety: coefficient as % (baseline=100)
  const safetyFactor = lever['safety'] / 100; // e.g. 1.0

  return base.map(o => {
    let sim = o.base;
    if (o.label === '准时履约率') {
      // demand up → fillrate down; leadtime up → fillrate down; safety up → fillrate slightly up
      sim = o.base
        - demandDelta * 4.5
        - leadtimeDelta * 6.0
        + (safetyFactor - 1) * 2.0;
      sim = Math.max(60, Math.min(100, sim));
    } else if (o.label === '缺货 SKU') {
      // demand up → more stockouts; safety up → fewer stockouts; leadtime up → more
      sim = o.base
        + demandDelta * 18
        + leadtimeDelta * 22
        - (safetyFactor - 1) * 14;
      sim = Math.max(0, Math.round(sim));
    } else if (o.label === '库存持有成本') {
      // demand up → holding cost up (need more stock); safety up → holding cost up; leadtime up slightly up
      sim = o.base
        + demandDelta * 680
        + (safetyFactor - 1) * 820
        + leadtimeDelta * 240;
      sim = Math.max(0, Math.round(sim));
    } else if (o.label === '安全库存占用') {
      // safety factor is direct multiplier; demand slightly raises it; leadtime up → buffer needed
      sim = o.base * safetyFactor
        + demandDelta * 180
        + leadtimeDelta * 140;
      sim = Math.max(0, Math.round(sim));
    }
    return { ...o, sim };
  });
}

function leverColor(lever: WhatIfLever, val: number): string {
  const mid = lever.min + (lever.max - lever.min) * 0.5;
  if (val === lever.value) return 'var(--text-3)';
  if (lever.id === 'safety') {
    return val > mid ? 'var(--success)' : 'var(--warning)';
  }
  return val > 0 ? 'var(--warning)' : 'var(--success)';
}

export default function WhatIf() {
  // 初始拉杆值 = mockData 默认值
  const [leverValues, setLeverValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(WHATIF_LEVERS.map(l => [l.id, l.value])),
  );

  const simOutcomes = useMemo(
    () => computeSim(leverValues, WHATIF_BASE),
    [leverValues],
  );

  function setLever(id: string, val: number) {
    setLeverValues(prev => ({ ...prev, [id]: val }));
  }

  return (
    <div className="page page-wide">
      <PageHeader
        title="What-if 情景模拟"
        subtitle="计划员在下单前看见涟漪 · 拉动拉杆，瞬间感知需求/交期/安全库存变化对全链路的连锁冲击"
        actions={<span className="tag tag-mono"><Sliders size={12} style={{ marginRight: 4 }} />情景推演</span>}
      />

      {/* KPI 带 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {WHATIF_KPIS.map((k, i) => (
          <StatCard key={k.label} {...k} icon={KPI_ICONS[i]} delayClass={`d${i + 1}`} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 14, alignItems: 'start' }}>
        {/* 左：拉杆 + 涟漪卡片 */}
        <div className="col gap-4">
          {/* 拉杆区域 */}
          <Panel
            title={<><Sliders size={13} />情景拉杆</>}
            right={
              <button
                className="btn btn-sm"
                style={{ fontSize: 11 }}
                onClick={() =>
                  setLeverValues(Object.fromEntries(WHATIF_LEVERS.map(l => [l.id, l.value])))
                }
              >
                重置
              </button>
            }
          >
            <div className="col gap-4" style={{ padding: '4px 0' }}>
              {WHATIF_LEVERS.map(lever => {
                const val = leverValues[lever.id];
                const pct = ((val - lever.min) / (lever.max - lever.min)) * 100;
                return (
                  <div key={lever.id} className="whatif-row">
                    <div className="row spread" style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                        {lever.label}
                      </span>
                      <span
                        className="mononum"
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: leverColor(lever, val),
                          minWidth: 56,
                          textAlign: 'right',
                        }}
                      >
                        {val > 0 && lever.id !== 'safety' ? '+' : ''}{val}{lever.unit}
                      </span>
                    </div>
                    <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
                      {/* 轨道背景 */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          height: 4,
                          borderRadius: 2,
                          background: 'var(--surface-3)',
                        }}
                      />
                      {/* 填充段 */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          width: `${pct}%`,
                          height: 4,
                          borderRadius: 2,
                          background: 'var(--gold)',
                          transition: 'width 0.2s var(--ease)',
                        }}
                      />
                      <input
                        type="range"
                        className="whatif-slider"
                        min={lever.min}
                        max={lever.max}
                        step={lever.step}
                        value={val}
                        onChange={e => setLever(lever.id, Number(e.target.value))}
                        style={{ position: 'relative', zIndex: 1, width: '100%' }}
                      />
                    </div>
                    <div className="row spread" style={{ marginTop: 4 }}>
                      <span className="t-small text-3 mononum" style={{ fontSize: 10 }}>
                        {lever.min}{lever.unit}
                      </span>
                      <span className="t-small text-3 mononum" style={{ fontSize: 10 }}>
                        {lever.max}{lever.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 14,
                padding: '10px 12px',
                background: 'var(--surface-2)',
                borderRadius: 'var(--r-md)',
                borderLeft: '3px solid var(--gold)',
                fontSize: 11.5,
                color: 'var(--text-2)',
                lineHeight: 1.6,
              }}
            >
              拨动拉杆即刻看见全链路涟漪。计划员无需下单即可感知"需求上涨 20% + 交期延误"会把履约率压到哪个水位。
            </div>
          </Panel>

          {/* 涟漪结果卡片 */}
          <Panel
            title={<><Zap size={13} />涟漪影响 · 基线 vs 模拟</>}
            right={
              <span className="t-small text-3" style={{ fontSize: 10.5 }}>
                实时联动
              </span>
            }
          >
            <div className="col gap-2">
              {simOutcomes.map(o => {
                const delta = o.sim - o.base;
                const isGood =
                  delta === 0
                    ? null
                    : o.better === 'up'
                    ? delta > 0
                    : delta < 0;
                const deltaColor =
                  delta === 0
                    ? 'var(--text-3)'
                    : isGood
                    ? 'var(--success)'
                    : 'var(--danger)';
                const changed = Math.abs(delta) > 0.01;
                const DeltaIcon =
                  delta === 0 ? null : delta > 0 ? TrendingUp : TrendingDown;

                return (
                  <div
                    key={o.label}
                    className="ripple-card"
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--r-md)',
                      background: changed
                        ? 'color-mix(in srgb, var(--gold) 6%, var(--surface-2))'
                        : 'var(--surface-2)',
                      borderLeft: changed ? '3px solid var(--gold)' : '3px solid transparent',
                      transition: 'background 0.3s var(--ease), border-color 0.3s var(--ease)',
                    }}
                  >
                    <div className="row spread" style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>
                        {o.label}
                      </span>
                      {DeltaIcon && (
                        <DeltaIcon size={13} style={{ color: deltaColor }} />
                      )}
                    </div>
                    <div className="row gap-3" style={{ alignItems: 'baseline' }}>
                      <div>
                        <span className="t-small text-3" style={{ fontSize: 10 }}>基线</span>
                        <div
                          className="mononum"
                          style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-2)', marginTop: 2 }}
                        >
                          {o.base.toLocaleString()}
                          <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 2 }}>{o.unit}</span>
                        </div>
                      </div>
                      <span style={{ color: 'var(--text-3)', fontSize: 14 }}>→</span>
                      <div>
                        <span className="t-small text-3" style={{ fontSize: 10 }}>模拟</span>
                        <div
                          className="mononum"
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: changed ? (isGood ? 'var(--success)' : 'var(--danger)') : 'var(--text-2)',
                            marginTop: 2,
                          }}
                        >
                          {typeof o.sim === 'number' && !Number.isInteger(o.sim)
                            ? o.sim.toFixed(1)
                            : o.sim.toLocaleString()}
                          <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 2 }}>{o.unit}</span>
                        </div>
                      </div>
                      {changed && (
                        <div
                          className="mononum"
                          style={{
                            marginLeft: 'auto',
                            fontSize: 12,
                            fontWeight: 700,
                            color: deltaColor,
                          }}
                        >
                          {delta > 0 ? '+' : ''}
                          {typeof delta === 'number' && Math.abs(delta) < 5
                            ? delta.toFixed(1)
                            : Math.round(delta).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* 右：双柱对比图 */}
        <Panel
          title={<><BarChart2 size={13} />基线 vs 模拟对比</>}
          right={
            <span className="t-small text-3" style={{ fontSize: 10.5 }}>
              随拉杆实时联动
            </span>
          }
        >
          <CompareChart simOutcomes={simOutcomes} leverValues={leverValues} />

          {/* 图例说明 */}
          <div className="row gap-4" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
            <LegendDot color="var(--text-3)" label="基线（当前状态）" />
            <LegendDot color="var(--gold)" label="模拟（情景推演）" />
          </div>

          {/* 情景洞察 */}
          <InsightCard simOutcomes={simOutcomes} leverValues={leverValues} />
        </Panel>
      </div>
    </div>
  );
}

// ─── 双柱对比图 ────────────────────────────────────────────────────────────────
function CompareChart({
  simOutcomes,
  leverValues,
}: {
  simOutcomes: typeof WHATIF_BASE;
  leverValues: Record<string, number>;
}) {
  const deps = [
    leverValues['demand'],
    leverValues['leadtime'],
    leverValues['safety'],
  ];

  return (
    <Chart
      height={340}
      deps={deps}
      build={() => {
        const acc = accent();
        const text3 = cssVar('--text-3');
        const surface1 = cssVar('--surface-1');
        const hairline = cssVar('--hairline');
        const successColor = cssVar('--success');

        const labels = simOutcomes.map(o => o.label);
        const baseVals = simOutcomes.map(o => o.base);
        const simVals = simOutcomes.map(o =>
          typeof o.sim === 'number' && !Number.isInteger(o.sim)
            ? +o.sim.toFixed(1)
            : o.sim,
        );

        return {
          ...baseOption(),
          grid: { left: 12, right: 24, top: 16, bottom: 8, containLabel: true },
          tooltip: {
            trigger: 'axis',
            backgroundColor: surface1,
            borderColor: hairline,
            borderWidth: 1,
            padding: [9, 13],
            textStyle: { color: cssVar('--text-1'), fontSize: 12, fontFamily: "'Geist','PingFang SC',sans-serif" },
            extraCssText: 'border-radius:11px;box-shadow:0 10px 34px rgba(0,0,0,.30);',
            axisPointer: { type: 'shadow' },
          },
          legend: {
            show: false,
          },
          xAxis: {
            type: 'category',
            data: labels,
            ...axisStyle(),
            axisLabel: {
              color: text3,
              fontSize: 11,
              fontFamily: "'Geist','PingFang SC',sans-serif",
              interval: 0,
              width: 72,
              overflow: 'break',
            },
          },
          yAxis: {
            type: 'value',
            ...axisStyle(),
            splitLine: { lineStyle: { color: hairline, type: 'dashed' } },
          },
          series: [
            {
              name: '基线',
              type: 'bar',
              data: baseVals,
              barGap: '8%',
              barMaxWidth: 36,
              itemStyle: { color: text3, borderRadius: [4, 4, 0, 0] },
              label: {
                show: true,
                position: 'top',
                color: text3,
                fontSize: 10,
                fontFamily: "'Geist Mono','Geist',monospace",
                formatter: (p: { value: number }) =>
                  p.value >= 1000 ? `${(p.value / 1000).toFixed(1)}k` : String(p.value),
              },
              ...DRAW,
            },
            {
              name: '模拟',
              type: 'bar',
              data: simVals,
              barMaxWidth: 36,
              itemStyle: {
                color: acc,
                borderRadius: [4, 4, 0, 0],
              },
              label: {
                show: true,
                position: 'top',
                color: successColor,
                fontSize: 10,
                fontFamily: "'Geist Mono','Geist',monospace",
                formatter: (p: { value: number }) =>
                  p.value >= 1000 ? `${(p.value / 1000).toFixed(1)}k` : String(p.value),
              },
              ...DRAW,
            },
          ],
        };
      }}
    />
  );
}

// ─── 情景洞察 ──────────────────────────────────────────────────────────────────
function InsightCard({
  simOutcomes,
  leverValues,
}: {
  simOutcomes: typeof WHATIF_BASE;
  leverValues: Record<string, number>;
}) {
  const fillRate = simOutcomes.find(o => o.label === '准时履约率');
  const stockout = simOutcomes.find(o => o.label === '缺货 SKU');
  const demandVal = leverValues['demand'];
  const leadtimeVal = leverValues['leadtime'];
  const safetyVal = leverValues['safety'];
  const isDefault =
    demandVal === WHATIF_LEVERS.find(l => l.id === 'demand')!.value &&
    leadtimeVal === WHATIF_LEVERS.find(l => l.id === 'leadtime')!.value &&
    safetyVal === WHATIF_LEVERS.find(l => l.id === 'safety')!.value;

  if (isDefault || !fillRate || !stockout) {
    return (
      <div
        style={{
          marginTop: 14,
          padding: '12px 14px',
          background: 'var(--surface-2)',
          borderRadius: 'var(--r-md)',
          fontSize: 12,
          color: 'var(--text-3)',
          lineHeight: 1.6,
        }}
      >
        拨动左侧拉杆开始情景推演。系统将即刻计算需求/交期/安全库存变化对全链路的涟漪影响。
      </div>
    );
  }

  const fillDelta = fillRate.sim - fillRate.base;
  const stockDelta = stockout.sim - stockout.base;
  const insights: string[] = [];

  if (demandVal > 0)
    insights.push(
      `需求上浮 ${demandVal}% 带来额外压力：履约率预计下移 ${Math.abs(fillDelta).toFixed(1)} 个百分点`,
    );
  if (leadtimeVal > 0)
    insights.push(`交期延长 ${leadtimeVal}% 将使缺货 SKU 增加 ${Math.abs(stockDelta).toFixed(0)} 个`);
  if (safetyVal > 100)
    insights.push(
      `将安全库存系数提高至 ${safetyVal}% 可降低缺货风险，但持有成本同步上升`,
    );
  if (demandVal < 0)
    insights.push(`需求下滑 ${Math.abs(demandVal)}% 会改善履约率，但需警惕积压风险`);
  if (leadtimeVal < 0)
    insights.push(`交期缩短可有效降低缓冲库存需求，建议与供应商谈合同条款`);

  if (insights.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 14,
        padding: '12px 14px',
        background: 'color-mix(in srgb, var(--gold) 8%, var(--surface-2))',
        borderRadius: 'var(--r-md)',
        borderLeft: '3px solid var(--gold)',
        fontSize: 12,
        color: 'var(--text-2)',
        lineHeight: 1.8,
      }}
    >
      <div style={{ fontWeight: 600, color: 'var(--gold)', marginBottom: 6, fontSize: 12 }}>
        计划建议
      </div>
      {insights.map((ins) => (
        <div key={ins} style={{ marginBottom: 4 }}>
          · {ins}
        </div>
      ))}
    </div>
  );
}

// ─── 图例 ──────────────────────────────────────────────────────────────────────
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="row gap-2 t-small text-3" style={{ fontSize: 11 }}>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          background: color,
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
}
