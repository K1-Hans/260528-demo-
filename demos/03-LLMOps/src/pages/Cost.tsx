import { useState } from 'react';
import {
  DollarSign, Wallet, TrendingUp, Gauge, Coins, Layers3,
  GitFork, SlidersHorizontal, Lock, Zap, Flame,
} from 'lucide-react';
import { PageHeader, StatCard, Card, SectionTitle, ProgressBar, TrendChip, Segmented } from '../components/ui';
import { Field, Modal, toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cost, areaGradient, cssVar } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import {
  COST_BY_MODEL, COST_BY_APP, COST_BY_TEAM, COST_STACK, BUDGET, COST_TREE,
} from '../lib/mockData';
import type { CostSlice, CostNode } from '../types';

type Dim = 'model' | 'app' | 'team';
const DIM_DATA: Record<Dim, CostSlice[]> = {
  model: COST_BY_MODEL,
  app: COST_BY_APP,
  team: COST_BY_TEAM,
};
const DIM_LABEL: Record<Dim, string> = { model: '模型', app: '应用', team: '团队' };

const usd = (n: number) => '$' + n.toLocaleString('en-US');

export default function Cost() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('cost:manage');
  const [dim, setDim] = useState<Dim>('model');
  const [budgetModal, setBudgetModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(BUDGET.budgetUsd));

  const budgetPct = Math.round((BUDGET.mtdUsd / BUDGET.budgetUsd) * 100);
  const forecastPct = Math.round((BUDGET.forecastUsd / BUDGET.budgetUsd) * 100);
  const overBudget = BUDGET.forecastUsd > BUDGET.budgetUsd;
  const overshootUsd = BUDGET.forecastUsd - BUDGET.budgetUsd;

  // 进度条颜色：>100% 红 · >80% 黄 · 否则金
  const barColor = budgetPct >= 100 ? 'var(--danger)' : budgetPct >= 80 ? 'var(--warning)' : 'var(--cost)';

  const slices = DIM_DATA[dim];
  const maxUsd = Math.max(...slices.map(s => s.usd));

  const kpis = [
    { label: '本月成本 MTD', raw: BUDGET.mtdUsd, prefix: '$', change: 5.4, icon: <DollarSign size={15} />, invert: true },
    { label: '月度预算', raw: BUDGET.budgetUsd, prefix: '$', icon: <Wallet size={15} /> },
    { label: '预测月末', raw: BUDGET.forecastUsd, prefix: '$', change: 6.8, icon: <TrendingUp size={15} />, invert: true, danger: overBudget },
    { label: '预算用量', raw: budgetPct, suffix: '%', change: 4.1, icon: <Gauge size={15} />, invert: true },
  ];

  function applyBudget() {
    const v = Number(budgetInput.replace(/[^0-9.]/g, ''));
    if (!v || v < 1000) { toast('预算需 ≥ $1,000', 'warn'); return; }
    setBudgetModal(false);
    toast(`月度预算已更新为 $${v.toLocaleString('en-US')} · 已同步 FinOps 告警阈值`, 'success');
  }

  return (
    <div className="page">
      <PageHeader
        title="成本仪表盘"
        subtitle="推理成本占企业 AI 预算 85% — 按模型 / 应用 / 团队拆解，归因到版本，超支前预警"
        actions={
          <button
            className="btn btn-cost"
            disabled={!canManage}
            title={canManage ? '设定月度预算与分摊' : '需 FinOps / 平台负责人权限'}
            onClick={() => canManage ? setBudgetModal(true) : toast('设预算需 FinOps / 平台负责人权限', 'warn')}
          >
            {canManage ? <SlidersHorizontal size={14} /> : <Lock size={14} />} 设预算
          </button>
        }
      />

      {/* ── KPI 条（成本页主锚色 = 金）── */}
      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {kpis.map((k, i) => (
          <CostKpi key={k.label} {...k} delayClass={`reveal-${i + 1}`} />
        ))}
      </div>

      {/* ── 预算进度 + 燃尽 ── */}
      <Card className="reveal reveal-2" style={{ marginTop: 14 }}>
        <SectionTitle
          right={
            <span className="row gap-2">
              <span className="tag tag-mono">第 {BUDGET.burnActual.length} / {BUDGET.days.length} 天</span>
              {overBudget && (
                <span className="badge" style={{ background: 'color-mix(in srgb, var(--danger) 15%, transparent)', color: 'var(--danger)' }}>
                  <Flame size={11} /> 预测超支 {usd(overshootUsd)}
                </span>
              )}
            </span>
          }
        >
          <span className="row gap-2"><Wallet size={13} /> 月度预算燃尽 · 理想匀速 vs 实际累计</span>
        </SectionTitle>

        {/* 预算用量进度条 */}
        <div className="spread" style={{ marginBottom: 8 }}>
          <span className="t-small text-2">已用 <b className="mononum" style={{ color: 'var(--cost)' }}>{usd(BUDGET.mtdUsd)}</b><span className="text-3"> / {usd(BUDGET.budgetUsd)}</span></span>
          <span className="mononum t-small" style={{ color: barColor, fontWeight: 700 }}>{budgetPct}%</span>
        </div>
        <ProgressBar pct={budgetPct} color={barColor} height={8} />
        <div className="row gap-3 wrap" style={{ marginTop: 9 }}>
          <span className="statpill">理想日均 <b className="cost">{usd(Math.round(BUDGET.budgetUsd / BUDGET.days.length))}</b></span>
          <span className="statpill">预测月末 <b style={{ color: overBudget ? 'var(--danger)' : 'var(--text-1)' }}>{usd(BUDGET.forecastUsd)}</b> <span className="text-3">({forecastPct}%)</span></span>
        </div>

        {/* 燃尽折线（真 ECharts） */}
        <Chart height={252} className="reveal" deps={[]} build={() => burndownOption()} />
        <div className="row gap-2" style={{ marginTop: 6, padding: '8px 10px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
          <Zap size={13} style={{ color: 'var(--cost)', flexShrink: 0 }} />
          <span className="t-small text-2">实际累计已越过理想线（染色区段），按当前燃尽速率预测月末触及红线 <b className="mononum" style={{ color: 'var(--danger)' }}>{usd(BUDGET.forecastUsd)}</b>，需在本周内压成本或上调预算。</span>
        </div>
      </Card>

      {/* ── 维度拆解 + 堆叠 双列 ── */}
      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: '1fr 1.15fr', gap: 14, marginTop: 14, alignItems: 'stretch' }}>
        {/* 维度切换拆解榜 */}
        <Card className="reveal reveal-3">
          <SectionTitle right={<Segmented options={(['model', 'app', 'team'] as Dim[]).map(d => ({ value: d, label: DIM_LABEL[d] }))} value={dim} onChange={setDim} />}>
            <span className="row gap-2"><Coins size={13} /> 成本拆解 · 按{DIM_LABEL[dim]}</span>
          </SectionTitle>
          <div className="col gap-3" style={{ marginTop: 2 }}>
            {slices.map((s, i) => (
              <div key={s.key} className="reveal" style={{ animationDelay: `${60 + i * 40}ms` }}>
                <div className="spread" style={{ marginBottom: 5 }}>
                  <span className="row gap-2" style={{ minWidth: 0 }}>
                    <span className="t-small" style={{ color: 'var(--text-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                    <span className="tag tag-mono" style={{ flexShrink: 0 }}>{s.tokensK.toLocaleString()}K tok</span>
                  </span>
                  <span className="row gap-2" style={{ flexShrink: 0 }}>
                    <span className="mononum" style={{ fontSize: 13, color: 'var(--cost)', fontWeight: 600 }}>{usd(s.usd)}</span>
                    <span className="mononum t-small text-3" style={{ minWidth: 40, textAlign: 'right' }}>{s.pct}%</span>
                    <TrendChip change={s.trend} invert suffix="" />
                  </span>
                </div>
                {/* 金渐变占比条 */}
                <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(s.usd / maxUsd) * 100}%`,
                    borderRadius: 4,
                    background: 'linear-gradient(90deg, color-mix(in srgb, var(--cost) 55%, transparent), var(--cost))',
                    transition: 'width 0.8s var(--ease)',
                  }} />
                </div>
              </div>
            ))}
          </div>
          <div className="spread" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
            <span className="label">合计</span>
            <span className="mononum" style={{ fontSize: 14, color: 'var(--cost)', fontWeight: 700 }}>
              {usd(slices.reduce((a, b) => a + b.usd, 0))}
            </span>
          </div>
        </Card>

        {/* 30 天按模型堆叠面积 */}
        <Card className="reveal reveal-4">
          <SectionTitle right={<span className="tag tag-mono">近 30 天</span>}>
            <span className="row gap-2"><Layers3 size={13} /> 按模型成本堆叠 · 日累计</span>
          </SectionTitle>
          <Chart height={230} build={() => costStackOption()} />
          <div className="row gap-3 wrap" style={{ marginTop: 10 }}>
            {[
              { c: cost(), label: 'gpt-4o', note: '主力 · 58%' },
              { c: cssVar('--c7'), label: 'claude-3.5', note: '抽取 · 24%' },
              { c: cssVar('--c8'), label: 'Qwen2.5-72B', note: '自托管 · 18%' },
            ].map(l => (
              <span key={l.label} className="row gap-2">
                <span style={{ width: 9, height: 9, borderRadius: 2, background: l.c, flexShrink: 0 }} />
                <span className="t-small text-2">{l.label}</span>
                <span className="t-small text-3">{l.note}</span>
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* ── 成本构成下钻（旭日图）── */}
      <Card className="reveal reveal-5" style={{ marginTop: 14 }}>
        <SectionTitle right={<span className="tag tag-mono">应用 → 版本 → 模型</span>}>
          <span className="row gap-2"><GitFork size={13} /> 成本构成下钻 · 三层归因</span>
        </SectionTitle>
        <div className="grid grid-cols-auto" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 14, alignItems: 'center' }}>
          <Chart height={320} build={() => sunburstOption()} />
          <div className="col gap-2">
            <div className="t-small text-3" style={{ marginBottom: 2 }}>点击环段下钻，归因到具体应用的某版本跑在哪个模型上。</div>
            {topLeaves(COST_TREE, 5).map((leaf, i) => (
              <div key={leaf.path} className="spread" style={{ padding: '8px 11px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
                <span className="row gap-2" style={{ minWidth: 0 }}>
                  <span className="mononum t-small text-3" style={{ width: 16 }}>{i + 1}</span>
                  <span className="t-small" style={{ color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{leaf.path}</span>
                </span>
                <span className="mononum t-small" style={{ color: 'var(--cost)', fontWeight: 600, flexShrink: 0 }}>{usd(leaf.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── 设预算 Modal ── */}
      <Modal
        open={budgetModal}
        onClose={() => setBudgetModal(false)}
        title="设定月度预算"
        sub="调整后将自动同步「月度预算超限」告警阈值（80% 预警）"
        width={460}
        footer={
          <>
            <button className="btn btn-subtle" onClick={() => setBudgetModal(false)}>取消</button>
            <button className="btn btn-cost" onClick={applyBudget}><SlidersHorizontal size={14} /> 确认设定</button>
          </>
        }
      >
        <Field label="月度预算上限（USD）" hint="当前 MTD 已用 $42,180 · 预测月末 $53,400">
          <div className="row gap-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--r-sm)', padding: '0 12px' }}>
            <span className="mononum" style={{ color: 'var(--cost)', fontSize: 15 }}>$</span>
            <input
              className="mononum"
              value={budgetInput}
              onChange={e => setBudgetInput(e.target.value)}
              inputMode="numeric"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 15, padding: '10px 0' }}
            />
            <span className="t-small text-3">/ 月</span>
          </div>
        </Field>
        <div className="row gap-2 wrap" style={{ marginTop: -4 }}>
          {[50000, 55000, 60000].map(v => (
            <button key={v} className="btn btn-sm btn-subtle mononum" onClick={() => setBudgetInput(String(v))}>{usd(v)}</button>
          ))}
        </div>
        <div className="row gap-2" style={{ marginTop: 16, padding: '10px 12px', borderRadius: 8, background: 'color-mix(in srgb, var(--warning) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--warning) 26%, transparent)' }}>
          <Flame size={14} style={{ color: 'var(--warning)', flexShrink: 0 }} />
          <span className="t-small text-2">预算设定为关键 FinOps 操作，变更将记入审计日志并通知平台负责人（双签）。</span>
        </div>
      </Modal>
    </div>
  );
}

// ── 成本 KPI 卡（封装：金锚色 + $ 前缀） ──────────────────────────────────────
function CostKpi({ label, raw, prefix, suffix, change, icon, invert, danger, delayClass }: {
  label: string; raw: number; prefix?: string; suffix?: string; change?: number;
  icon: React.ReactNode; invert?: boolean; danger?: boolean; delayClass?: string;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <StatCard
        label={label}
        raw={raw}
        unit={suffix}
        change={change}
        icon={icon}
        accentVar={danger ? 'var(--danger)' : 'var(--cost)'}
        invertTrend={invert}
        delayClass={delayClass}
      />
      {prefix && (
        <span className="mononum" style={{
          position: 'absolute', left: 18, bottom: 22, fontSize: 18, fontWeight: 600,
          color: danger ? 'var(--danger)' : 'var(--text-3)', pointerEvents: 'none',
        }}>{prefix}</span>
      )}
    </div>
  );
}

// ── COST_TREE → 扁平 top-N 叶子（应用 / 版本 / 模型） ─────────────────────────
function topLeaves(tree: CostNode, n: number): { path: string; value: number }[] {
  const out: { path: string; value: number }[] = [];
  const walk = (node: CostNode, trail: string[]) => {
    if (node.value !== undefined && !node.children) {
      out.push({ path: trail.concat(node.name).join(' · '), value: node.value });
      return;
    }
    node.children?.forEach(c => walk(c, node.name === '总成本' ? [] : trail.concat(node.name)));
  };
  walk(tree, []);
  return out.sort((a, b) => b.value - a.value).slice(0, n);
}

// ════════════════════════════════════════════════════════════════════════
// ECharts builders
// ════════════════════════════════════════════════════════════════════════

// 预算燃尽：理想匀速虚线 vs 实际累计实线，实际越过理想区段染色，预测延伸触红线 markLine
function burndownOption() {
  const days = BUDGET.days;
  const ideal = BUDGET.burnIdeal;
  const actual = BUDGET.burnActual;
  const lastIdx = actual.length - 1;
  const lastActual = actual[lastIdx];
  const remainingDays = days.length - actual.length;
  // 预测延伸：从最后实际点匀速爬到 forecast（月末）
  const step = remainingDays > 0 ? (BUDGET.forecastUsd - lastActual) / remainingDays : 0;
  const forecast: (number | null)[] = days.map((_, i) => {
    if (i < lastIdx) return null;
    if (i === lastIdx) return lastActual;
    return Math.round(lastActual + step * (i - lastIdx));
  });
  // 实际越过理想线的染色区段（数据 markArea 需起止 day index）
  let overStart = -1;
  for (let i = 0; i <= lastIdx; i++) {
    if (actual[i] > ideal[i]) { overStart = i; break; }
  }
  const markAreas = overStart >= 0
    ? [[{ xAxis: days[overStart] }, { xAxis: days[lastIdx] }]]
    : [];

  return {
    ...baseOption(),
    legend: {
      show: true, top: 0, right: 0, itemWidth: 16, itemHeight: 2,
      textStyle: { color: cssVar('--text-3'), fontSize: 11 },
      data: ['理想匀速', '实际累计', '预测'],
    },
    grid: { left: 8, right: 16, top: 30, bottom: 22, containLabel: true },
    tooltip: {
      ...(baseOption().tooltip as object), trigger: 'axis',
      valueFormatter: (v: number | null) => (v == null ? '—' : '$' + v.toLocaleString('en-US')),
    },
    xAxis: {
      type: 'category', boundaryGap: false, data: days,
      axisLabel: { ...axisStyle().axisLabel, interval: 4 },
      axisLine: axisStyle().axisLine, axisTick: { show: false }, splitLine: { show: false },
    },
    yAxis: {
      type: 'value', ...axisStyle(),
      axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => '$' + (v / 1000) + 'k' },
    },
    series: [
      {
        name: '理想匀速', type: 'line', smooth: false, showSymbol: false, z: 1,
        data: ideal,
        lineStyle: { color: cssVar('--text-3'), width: 1.5, type: 'dashed' },
      },
      {
        name: '实际累计', type: 'line', smooth: true, showSymbol: false, z: 3,
        data: actual.concat(Array(days.length - actual.length).fill(null)),
        lineStyle: { color: cost(), width: 2.4 },
        areaStyle: { color: areaGradient(cost(), 0.22) },
        markArea: markAreas.length
          ? {
              silent: true,
              itemStyle: { color: 'color-mix(in srgb, ' + cost() + ' 10%, transparent)' },
              label: { show: true, position: 'insideTop', color: cssVar('--cost'), fontSize: 10, formatter: '已越过理想线' },
              data: markAreas,
            }
          : undefined,
      },
      {
        name: '预测', type: 'line', smooth: false, z: 2,
        data: forecast,
        showSymbol: true, symbol: 'circle', symbolSize: 5,
        lineStyle: { color: cssVar('--danger'), width: 1.8, type: 'dotted' },
        itemStyle: { color: cssVar('--danger') },
        markLine: {
          silent: true, symbol: 'none',
          lineStyle: { color: cssVar('--danger'), width: 1.2, type: 'dashed' },
          label: {
            position: 'insideEndTop', color: cssVar('--danger'), fontSize: 10,
            fontFamily: 'Geist Mono, monospace',
            formatter: () => '预算上限 $' + (BUDGET.budgetUsd / 1000) + 'k',
          },
          data: [{ yAxis: BUDGET.budgetUsd }],
        },
      },
    ],
    animationDuration: 850, animationEasing: 'cubicOut',
  };
}

// 按模型成本堆叠面积（金 / 琥珀 / 灰），复用 Overview 调性
function costStackOption() {
  const models = ['gpt-4o', 'claude-3.5-sonnet', 'Qwen2.5-72B'];
  const colors = [cost(), cssVar('--c7'), cssVar('--c8')];
  return {
    ...baseOption(),
    legend: { show: false },
    grid: { left: 6, right: 10, top: 16, bottom: 18, containLabel: true },
    tooltip: { ...(baseOption().tooltip as object), trigger: 'axis', valueFormatter: (v: number) => '$' + v.toLocaleString('en-US') },
    xAxis: {
      type: 'category', boundaryGap: false, data: COST_STACK.map(p => p.date),
      axisLabel: { ...axisStyle().axisLabel, interval: 6 },
      axisLine: axisStyle().axisLine, axisTick: { show: false }, splitLine: { show: false },
    },
    yAxis: { type: 'value', ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, formatter: '${value}' } },
    series: models.map((m, i) => ({
      name: m, type: 'line', stack: 'cost', smooth: true, showSymbol: false,
      data: COST_STACK.map(p => p.values[m]),
      lineStyle: { width: 1, color: colors[i] },
      areaStyle: { color: areaGradient(colors[i], i === 0 ? 0.36 : 0.22), opacity: 1 },
      emphasis: { focus: 'series' },
    })),
    animationDuration: 850, animationEasing: 'cubicOut',
  };
}

// 成本构成下钻 旭日（金色系：层级渐变 金→琥珀→灰）
function sunburstOption() {
  const goldStops = [cost(), cssVar('--c7'), cssVar('--c8'), cssVar('--c6')];
  // 应用层用金调色板（每个一级节点一个色），子层继承父色不同明度
  const appColors = [cost(), cssVar('--c7'), cssVar('--c6'), cssVar('--c8'), cssVar('--c5')];
  const root = COST_TREE.children ?? [];
  const data = root.map((app, i) => colorize(app, appColors[i % appColors.length]));

  return {
    ...baseOption(),
    tooltip: {
      ...(baseOption().tooltip as object),
      formatter: (p: { name: string; value: number; treePathInfo?: { name: string }[] }) => {
        const path = (p.treePathInfo ?? []).map(t => t.name).filter(n => n && n !== '总成本').join(' · ');
        return `${path || p.name}<br/><b style="color:${cssVar('--cost')}">$${(p.value ?? 0).toLocaleString('en-US')}</b>`;
      },
    },
    series: [{
      type: 'sunburst',
      radius: ['16%', '92%'],
      center: ['50%', '50%'],
      data,
      sort: 'desc',
      emphasis: { focus: 'ancestor' },
      itemStyle: { borderColor: cssVar('--surface-1'), borderWidth: 2 },
      label: {
        color: cssVar('--text-1'), fontSize: 11, fontFamily: 'Geist, sans-serif',
        minAngle: 14,
      },
      levels: [
        {},
        { r0: '16%', r: '46%', label: { rotate: 'tangential', fontWeight: 600 } },
        { r0: '46%', r: '70%', label: { fontSize: 10 } },
        { r0: '70%', r: '92%', label: { position: 'outside', fontSize: 10, color: cssVar('--text-2'), silent: false } },
      ],
    }],
    animationDuration: 800, animationEasing: 'cubicOut',
    color: goldStops,
  };
}

// 递归给 sunburst 节点上色（父色，子层降明度）
function colorize(node: CostNode, color: string, depth = 0): CostNode & { itemStyle?: { color: string } } {
  const mixPct = [100, 78, 58][Math.min(depth, 2)];
  const c = mixPct === 100 ? color : `color-mix(in srgb, ${color} ${mixPct}%, var(--surface-3))`;
  return {
    name: node.name,
    value: node.value,
    itemStyle: { color: c },
    children: node.children?.map(ch => colorize(ch, color, depth + 1)),
  } as CostNode & { itemStyle?: { color: string } };
}
