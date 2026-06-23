import { useMemo } from 'react';
import {
  ShieldAlert, TrendingUp, Users, MessageSquareWarning,
  AlertTriangle, BarChart3, Activity, GitMerge, Radio,
} from 'lucide-react';
import { PageHeader, StatCard } from '../components/ui';
import { Panel } from '../components/sig';
import Chart from '../components/Chart';
import {
  baseOption, axisStyle, accent, areaGradient, DRAW,
  cssVar,
} from '../lib/chartTheme';
import {
  CATEGORY_STATS, TREND_14D, REGION_HEAT, DISPOSITION_FLOW, AUDITOR_ROWS,
} from '../lib/mockData';
import { SEVERITY_LABEL } from '../types';

// ─── Severity → CSS var colour ────────────────────────────────────────────────
const SEV_COLOR: Record<string, string> = {
  safe: 'var(--sev-safe)',
  low: 'var(--sev-low)',
  mid: 'var(--sev-mid)',
  high: 'var(--sev-high)',
  critical: 'var(--sev-critical)',
};

// ─── KPI 衍生值（今日态势快照）────────────────────────────────────────────────
function deriveKpis() {
  const totalFlagged = CATEGORY_STATS.reduce((s, c) => s + c.count, 0);
  const autoDisposed = DISPOSITION_FLOW[1].value;
  const totalInitial = DISPOSITION_FLOW[0].value;
  const humanReview = DISPOSITION_FLOW[2].value;
  const appeal = DISPOSITION_FLOW[4].value;
  const critical = CATEGORY_STATS.filter(c => c.severity === 'critical' || c.severity === 'high')
    .reduce((s, c) => s + c.count, 0);

  const autoRate = totalInitial > 0 ? (autoDisposed / totalInitial) * 100 : 0;
  const appealRate = DISPOSITION_FLOW[3].value > 0 ? (appeal / DISPOSITION_FLOW[3].value) * 100 : 0;
  const highRiskPct = totalFlagged > 0 ? (critical / totalFlagged) * 100 : 0;

  return { totalFlagged, autoRate, humanReview, appealRate, highRiskPct };
}

// ─── Chart builders ────────────────────────────────────────────────────────────

/** ① 违规类型分布 — 横向柱，按 severity 上色 */
function buildCategoryBar() {
  const base = baseOption();
  const ax = axisStyle();
  // 排序：count 降序，左侧为多
  const sorted = [...CATEGORY_STATS].sort((a, b) => a.count - b.count);
  return {
    ...base,
    grid: { left: 12, right: 20, top: 10, bottom: 8, containLabel: true },
    tooltip: { ...(base.tooltip as Record<string, unknown>), trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value', ...ax, splitLine: { lineStyle: { color: cssVar('--hairline'), type: 'dashed' } } },
    yAxis: {
      type: 'category',
      data: sorted.map(c => c.category),
      ...ax,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { ...ax.axisLabel, fontSize: 11 },
    },
    series: [{
      type: 'bar',
      data: sorted.map(c => ({
        value: c.count,
        itemStyle: {
          color: cssVar(SEV_COLOR[c.severity].replace('var(', '').replace(')', '')),
          borderRadius: [0, 4, 4, 0],
        },
      })),
      barMaxWidth: 22,
      label: { show: true, position: 'right', color: cssVar('--text-3'), fontSize: 10, fontFamily: "'Geist Mono','Geist',sans-serif", formatter: (p: { value: number }) => p.value.toLocaleString() },
      ...DRAW,
    }],
    backgroundColor: 'transparent',
  };
}

/** ② 旭日图 — 违规类型 by severity 层级 */
function buildSunburst() {
  const base = baseOption();
  // 按 severity 分组
  const sevGroups: Record<string, { name: string; value: number }[]> = {};
  for (const c of CATEGORY_STATS) {
    const sev = c.severity;
    if (!sevGroups[sev]) sevGroups[sev] = [];
    sevGroups[sev].push({ name: c.category, value: c.count });
  }
  const data = Object.entries(sevGroups).map(([sev, children]) => ({
    name: SEVERITY_LABEL[sev as keyof typeof SEVERITY_LABEL],
    itemStyle: { color: cssVar(SEV_COLOR[sev].replace('var(', '').replace(')', '')) },
    children: children.map(ch => ({
      name: ch.name,
      value: ch.value,
      itemStyle: {
        color: cssVar(SEV_COLOR[sev].replace('var(', '').replace(')', '')),
        opacity: 0.72,
      },
    })),
  }));
  return {
    ...base,
    tooltip: {
      ...(base.tooltip as Record<string, unknown>),
      trigger: 'item',
      formatter: (p: { name: string; value: number; treePathInfo?: { name: string }[] }) => {
        if (!p.value) return p.name;
        return `${p.name}<br/><b>${p.value.toLocaleString()}</b> 条`;
      },
    },
    series: [{
      type: 'sunburst',
      data,
      radius: ['20%', '90%'],
      sort: undefined,
      emphasis: { focus: 'ancestor' },
      levels: [
        {},
        { r0: '20%', r: '52%', itemStyle: { borderRadius: 4, borderWidth: 2, borderColor: cssVar('--surface-1') }, label: { show: true, rotate: 'tangential', fontSize: 11, color: cssVar('--text-1') } },
        { r0: '52%', r: '90%', label: { show: false }, itemStyle: { borderRadius: 4, borderWidth: 1, borderColor: cssVar('--surface-1') } },
      ],
      ...DRAW,
    }],
    backgroundColor: 'transparent',
  };
}

/** ③ 14 天趋势 — 多线 + 面积 */
function buildTrend() {
  const base = baseOption();
  const ax = axisStyle();
  const gold = accent();
  const danger = cssVar('--danger');
  const warning = cssVar('--warning');
  const dates = TREND_14D.map(p => p.date);
  return {
    ...base,
    grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
    tooltip: { ...(base.tooltip as Record<string, unknown>), trigger: 'axis' },
    legend: {
      data: ['命中总量', '已下架', '申诉量'],
      textStyle: { color: cssVar('--text-2'), fontSize: 11, fontFamily: "'Geist','PingFang SC',system-ui,sans-serif" },
      itemWidth: 14, itemHeight: 3, top: 0, left: 0,
    },
    xAxis: { type: 'category', data: dates, ...ax, boundaryGap: false },
    yAxis: { type: 'value', ...ax },
    series: [
      {
        name: '命中总量', type: 'line', data: TREND_14D.map(p => p.flagged),
        smooth: 0.4, symbol: 'circle', symbolSize: 4,
        lineStyle: { width: 2, color: gold },
        itemStyle: { color: gold },
        areaStyle: { color: areaGradient(gold, 0.22) },
        ...DRAW,
      },
      {
        name: '已下架', type: 'line', data: TREND_14D.map(p => p.removed),
        smooth: 0.4, symbol: 'circle', symbolSize: 4,
        lineStyle: { width: 2, color: danger },
        itemStyle: { color: danger },
        areaStyle: { color: areaGradient(danger, 0.15) },
        ...DRAW,
      },
      {
        name: '申诉量', type: 'line', data: TREND_14D.map(p => p.appeal),
        smooth: 0.4, symbol: 'circle', symbolSize: 4,
        lineStyle: { width: 1.5, color: warning, type: 'dashed' },
        itemStyle: { color: warning },
        ...DRAW,
      },
    ],
    backgroundColor: 'transparent',
  };
}

/** ④ 渠道分布柱 */
function buildRegionBar() {
  const base = baseOption();
  const ax = axisStyle();
  const gold = accent();
  return {
    ...base,
    grid: { left: 8, right: 16, top: 10, bottom: 8, containLabel: true },
    tooltip: { ...(base.tooltip as Record<string, unknown>), trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: {
      type: 'category',
      data: REGION_HEAT.map(r => r.region),
      ...ax,
      axisLabel: { ...ax.axisLabel, fontSize: 11 },
    },
    yAxis: { type: 'value', ...ax },
    series: [{
      type: 'bar',
      data: REGION_HEAT.map((r, i) => ({
        value: r.value,
        itemStyle: {
          color: i === 0 ? gold : `color-mix(in srgb, ${gold} ${40 + i * 10}%, ${cssVar('--surface-3')})`,
          borderRadius: [4, 4, 0, 0],
        },
      })),
      barMaxWidth: 36,
      label: { show: true, position: 'top', color: cssVar('--text-3'), fontSize: 10, fontFamily: "'Geist Mono','Geist',sans-serif", formatter: (p: { value: number }) => (p.value / 1000).toFixed(1) + 'k' },
      ...DRAW,
    }],
    backgroundColor: 'transparent',
  };
}

/** ⑤ 处置漏斗 */
function buildFunnel() {
  const base = baseOption();
  const gold = accent();
  const maxVal = DISPOSITION_FLOW[0].value;
  const colors = [
    gold,
    cssVar('--success'),
    cssVar('--info'),
    cssVar('--warning'),
    `color-mix(in srgb, ${cssVar('--danger')} 60%, ${cssVar('--warning')})`,
    cssVar('--danger'),
  ];
  return {
    ...base,
    tooltip: {
      ...(base.tooltip as Record<string, unknown>),
      trigger: 'item',
      formatter: (p: { name: string; value: number }) =>
        `${p.name}<br/><b>${p.value.toLocaleString()}</b> 条 · 占初筛 ${((p.value / maxVal) * 100).toFixed(1)}%`,
    },
    series: [{
      type: 'funnel',
      data: DISPOSITION_FLOW.map((f, i) => ({
        name: f.stage,
        value: f.value,
        itemStyle: { color: colors[i] ?? gold, borderColor: 'transparent', borderWidth: 0 },
      })),
      left: '5%', width: '90%', top: 8, bottom: 8,
      minSize: '8%',
      sort: 'descending',
      gap: 3,
      label: {
        show: true,
        position: 'inside',
        color: '#fff',
        fontSize: 11,
        fontFamily: "'Geist','PingFang SC',system-ui,sans-serif",
        fontWeight: 600,
        formatter: (p: { name: string; value: number }) => `${p.name}  ${p.value.toLocaleString()}`,
      },
      labelLine: { show: false },
      emphasis: { label: { fontSize: 13 } },
      ...DRAW,
    }],
    backgroundColor: 'transparent',
  };
}

/** ⑥ 审核员一致性雷达 */
function buildRadar() {
  const base = baseOption();
  const gold = accent();
  const hairline = cssVar('--hairline');
  const text3 = cssVar('--text-3');
  const indicators = [
    { name: '吞吐量', max: 1600 },
    { name: '准确率', max: 100 },
    { name: '一致性', max: 100 },
    { name: '质检通过', max: 100 },
    { name: '申诉率低', max: 6 },
  ];
  const colors = [gold, cssVar('--c2'), cssVar('--c3'), cssVar('--c4'), cssVar('--c5'), cssVar('--c6')];
  return {
    ...base,
    tooltip: { ...(base.tooltip as Record<string, unknown>), trigger: 'item' },
    legend: {
      data: AUDITOR_ROWS.map(a => a.name),
      textStyle: { color: text3, fontSize: 10 },
      bottom: 0, left: 'center', orient: 'horizontal',
      icon: 'circle', itemWidth: 8,
    },
    radar: {
      indicator: indicators,
      shape: 'polygon',
      radius: '66%',
      center: ['50%', '47%'],
      axisName: { color: text3, fontSize: 10, fontFamily: "'Geist','PingFang SC',system-ui,sans-serif" },
      splitLine: { lineStyle: { color: hairline } },
      splitArea: { areaStyle: { color: ['transparent', `color-mix(in srgb, ${gold} 4%, transparent)`] } },
      axisLine: { lineStyle: { color: hairline } },
    },
    series: [{
      type: 'radar',
      data: AUDITOR_ROWS.map((a, i) => ({
        name: a.name,
        value: [
          a.throughput,
          a.accuracy,
          a.consistency,
          (a.qcPassed / a.qcSampled) * 100,
          6 - a.appealReverseRate,  // 反转：越低越好 → 越高越好
        ],
        lineStyle: { width: 1.5, color: colors[i] ?? gold },
        itemStyle: { color: colors[i] ?? gold },
        areaStyle: { color: `color-mix(in srgb, ${colors[i] ?? gold} 10%, transparent)` },
      })),
      ...DRAW,
    }],
    backgroundColor: 'transparent',
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Situation() {
  const { totalFlagged, autoRate, humanReview, appealRate, highRiskPct } = useMemo(deriveKpis, []);

  // Sparkline seeds for trend cards
  const flaggedSpark = TREND_14D.map(p => p.flagged);
  const removedSpark = TREND_14D.map(p => p.removed);

  return (
    <div className="page page-wide">
      <PageHeader
        title="风险态势大屏"
        subtitle="全平台违规态势实时监控 · 类型分布 / 14 天趋势 / 渠道热力 / 处置漏斗 / 审核员一致性"
        actions={
          <div className="row gap-2">
            <span className="badge" style={{ background: 'color-mix(in srgb, var(--sev-critical) 14%, transparent)', color: 'var(--sev-critical)' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--sev-critical)', display: 'inline-block', marginRight: 5, animation: 'pulse 1.4s infinite' }} />
              实时更新
            </span>
            <span className="tag tag-mono">今日快照</span>
          </div>
        }
      />

      {/* ── KPI 行 ── */}
      <div className="grid reveal" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard
          label="今日命中总量"
          raw={totalFlagged}
          unit="条"
          change={8.4}
          spark={flaggedSpark}
          icon={<ShieldAlert size={15} />}
          delayClass="reveal-1"
        />
        <StatCard
          label="AI 自动处置率"
          raw={Number(autoRate.toFixed(1))}
          unit="%"
          decimals={1}
          change={2.1}
          icon={<Activity size={15} />}
          delayClass="reveal-2"
        />
        <StatCard
          label="人审复核量"
          raw={humanReview}
          unit="条"
          change={-3.8}
          spark={removedSpark}
          icon={<Users size={15} />}
          delayClass="reveal-3"
        />
        <StatCard
          label="申诉率"
          raw={Number(appealRate.toFixed(2))}
          unit="%"
          decimals={2}
          change={-0.4}
          icon={<MessageSquareWarning size={15} />}
          delayClass="reveal-4"
        />
        <StatCard
          label="高危内容占比"
          raw={Number(highRiskPct.toFixed(1))}
          unit="%"
          decimals={1}
          change={1.2}
          icon={<AlertTriangle size={15} />}
          delayClass="reveal-5"
        />
      </div>

      {/* ── 主图区 Row 1：趋势（宽）+ 违规类型分布（窄） ── */}
      <div className="reveal-1" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 12, marginBottom: 12 }}>
        <Panel
          title="14 天违规趋势"
          icon={<TrendingUp size={13} />}
          right={
            <div className="row gap-3 t-small text-3">
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 18, height: 2, background: 'var(--gold)', display: 'inline-block', borderRadius: 1 }} />命中
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 18, height: 2, background: 'var(--danger)', display: 'inline-block', borderRadius: 1 }} />下架
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 18, height: 0, background: 'transparent', display: 'inline-block', borderTop: '2px dashed var(--warning)', borderRadius: 0 }} />申诉
              </span>
            </div>
          }
          bodyClass="panel-body"
        >
          <Chart build={buildTrend} height={240} deps={[]} />
        </Panel>

        <Panel title="违规类型分布" icon={<BarChart3 size={13} />} bodyClass="panel-body">
          <Chart build={buildCategoryBar} height={240} deps={[]} />
        </Panel>
      </div>

      {/* ── 主图区 Row 2：旭日 + 渠道柱 + 漏斗 ── */}
      <div className="reveal-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Panel
          title="违规分层旭日"
          icon={<ShieldAlert size={13} />}
          right={<span className="t-small text-3">外环=类型 · 内环=风险阶</span>}
          bodyClass="panel-body"
        >
          <Chart build={buildSunburst} height={280} deps={[]} />
        </Panel>

        <Panel
          title="渠道命中分布"
          icon={<Radio size={13} />}
          right={<span className="t-small text-3">今日累计</span>}
          bodyClass="panel-body"
        >
          <Chart build={buildRegionBar} height={280} deps={[]} />
        </Panel>

        <Panel
          title="处置漏斗"
          icon={<GitMerge size={13} />}
          right={<span className="t-small text-3">AI 初筛 → 申诉撤销</span>}
          bodyClass="panel-body"
        >
          <Chart build={buildFunnel} height={280} deps={[]} />
        </Panel>
      </div>

      {/* ── Row 3：审核员一致性雷达 + 漏斗关键转化率数字 ── */}
      <div className="reveal-3" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12 }}>
        <Panel
          title="审核员效能一致性"
          icon={<Users size={13} />}
          right={<span className="t-small text-3">6 维雷达 · 申诉率越低越好</span>}
          bodyClass="panel-body"
        >
          <Chart build={buildRadar} height={300} deps={[]} />
        </Panel>

        <Panel
          title="漏斗关键节点"
          icon={<GitMerge size={13} />}
          bodyClass="panel-body"
        >
          <div className="col" style={{ gap: 4, height: '100%', justifyContent: 'center' }}>
            {DISPOSITION_FLOW.map((f, i) => {
              const maxVal = DISPOSITION_FLOW[0].value;
              const pct = ((f.value / maxVal) * 100).toFixed(1);
              const stepColors = [
                'var(--gold)',
                'var(--success)',
                'var(--info)',
                'var(--warning)',
                'color-mix(in srgb, var(--danger) 60%, var(--warning))',
                'var(--danger)',
              ];
              const color = stepColors[i] ?? 'var(--gold)';
              return (
                <div key={f.stage} style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
                  <div className="row spread" style={{ marginBottom: 6 }}>
                    <span className="t-small" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{f.stage}</span>
                    <span className="mononum" style={{ fontSize: 13, fontWeight: 700, color }}>{f.value.toLocaleString()}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.8s var(--ease)' }} />
                  </div>
                  <div className="t-small text-3" style={{ marginTop: 4 }}>占初筛 <span className="mononum">{pct}%</span></div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
