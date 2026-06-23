import { useNavigate } from 'react-router-dom';
import {
  Activity, Timer, DollarSign, Gauge, AlertTriangle, ArrowRight,
  Waypoints, Grid3x3, TrendingDown, Zap,
} from 'lucide-react';
import { PageHeader, StatCard, Card, SectionTitle, ProgressBar } from '../components/ui';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, cost, sem, areaGradient, cssVar } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import {
  OVERVIEW_KPIS, TRACES, MONITOR_SERIES, COST_STACK, BUDGET,
  SCORE_MATRIX, EVAL_DIMS, ALERT_EVENTS, appName,
} from '../lib/mockData';
import type { Span } from '../types';

const KIND_VAR: Record<Span['kind'], string> = {
  retrieve: '--c2', prompt: '--c5', llm: '--gold', tool: '--c6', parse: '--c8', guard: '--danger',
};
const KPI_ICON = [<Activity size={15} />, <Timer size={15} />, <DollarSign size={15} />, <Gauge size={15} />];

export default function Overview() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const slowTrace = TRACES[0]; // v4 canary 慢链路（故事 trace）
  const fire = ALERT_EVENTS.find(e => e.state === 'firing');
  const budgetPct = Math.round((BUDGET.mtdUsd / BUDGET.budgetUsd) * 100);

  // 监控时序 X 轴稀疏标签
  const mon = MONITOR_SERIES;
  const xLabels = mon.map((p, i) => (i % 12 === 0 ? p.t : ''));

  return (
    <div className="page">
      <PageHeader
        title="运营总览大盘"
        subtitle="一屏看清 — 系统是否健康 · 钱花在哪 · 质量有没有退 · 现在哪里着火"
        actions={
          <div className="row gap-2">
            <span className="live-pill"><span className="live-dot" />实时刷新</span>
          </div>
        }
      />

      {/* ── 旗舰故事入口：质量回归告警红条 ── */}
      {fire && (
        <button className="alert-banner reveal" onClick={() => navigate(fire.jumpTo || '/scoreboard')}>
          <span className="alert-banner-ico"><AlertTriangle size={18} /></span>
          <div className="flex-1" style={{ textAlign: 'left', minWidth: 0 }}>
            <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{fire.title}</span>
              <span className="badge" style={{ background: 'color-mix(in srgb, var(--danger) 16%, transparent)', color: 'var(--danger)' }}>{fire.ruleType}</span>
              <span className="tag tag-mono">{appName(fire.app)} · v4 canary 20%</span>
            </div>
            <div className="t-small text-3" style={{ marginTop: 3 }}>{fire.detail}</div>
          </div>
          <span className="alert-banner-cta">查看事件链路 <ArrowRight size={14} /></span>
        </button>
      )}

      {/* ── KPI 条 ── */}
      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 14 }}>
        {OVERVIEW_KPIS.map((k, i) => (
          <StatCard
            key={k.label}
            label={k.label} raw={k.raw} unit={k.unit} change={k.change} decimals={k.decimals} spark={k.spark}
            icon={KPI_ICON[i]}
            accentVar={k.tone === 'cost' ? 'var(--cost)' : 'var(--gold)'}
            invertTrend={k.tone === 'bad' || k.tone === 'cost'}
            delayClass={`reveal-${i + 1}`}
          />
        ))}
      </div>

      {/* ── 主区：左 trace+监控 / 右 成本+评分矩阵 ── */}
      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: '1.45fr 1fr', gap: 14, marginTop: 14, alignItems: 'stretch' }}>
        {/* 左列 */}
        <div className="col gap-3" style={{ minWidth: 0 }}>
          {/* trace 瀑布缩略 */}
          <Card className="reveal reveal-2">
            <SectionTitle right={<button className="btn btn-subtle btn-sm" onClick={() => navigate('/tracing')}>进入 Tracing <ArrowRight size={12} /></button>}>
              <span className="row gap-2"><Waypoints size={13} /> 最近异常调用链 · 瀑布</span>
            </SectionTitle>
            <div className="row gap-2 wrap" style={{ marginBottom: 10 }}>
              <span className="tag tag-mono">trace {slowTrace.traceId}</span>
              <span className="tag tag-mono">{appName(slowTrace.app)} · {slowTrace.model}</span>
              <span className="badge" style={{ background: 'color-mix(in srgb, var(--warning) 15%, transparent)', color: 'var(--warning)' }}>slow {slowTrace.latencyMs.toLocaleString()}ms</span>
              <span className="statpill">tokens <b>{(slowTrace.tokensIn + slowTrace.tokensOut).toLocaleString()}</b></span>
              <span className="statpill cost">cost <b className="cost">${slowTrace.costUsd.toFixed(4)}</b></span>
            </div>
            <Chart height={232} build={() => waterfallOption(slowTrace.spans)} />
            <div className="t-small text-3" style={{ marginTop: 6 }}>
              关键路径（金描边）触发忠实度 guard 失败 → 重试，token 与延迟双双翻倍。
            </div>
          </Card>

          {/* 在线监控双轴 */}
          <Card className="reveal reveal-3">
            <SectionTitle right={<span className="live-pill"><span className="live-dot" />近 6h</span>}>
              <span className="row gap-2"><Activity size={13} /> 在线监控 · QPS / 错误率</span>
            </SectionTitle>
            <Chart height={196} deps={[]} build={() => monitorOption(mon, xLabels)} />
          </Card>
        </div>

        {/* 右列 */}
        <div className="col gap-3" style={{ minWidth: 0 }}>
          {/* 成本（按模型拆分 + 预算）— 唯一「花钱」金色 */}
          <Card className="reveal reveal-3">
            <SectionTitle right={<button className="btn btn-subtle btn-sm" onClick={() => navigate('/cost')}>成本仪表盘 <ArrowRight size={12} /></button>}>
              <span className="row gap-2"><DollarSign size={13} /> 成本 · 按模型拆分（30d）</span>
            </SectionTitle>
            <Chart height={150} build={() => costStackOption(COST_STACK)} />
            <div className="spread" style={{ margin: '12px 0 6px' }}>
              <span className="t-small text-2">月度预算用量</span>
              <span className="mononum" style={{ fontSize: 13 }}>
                <b style={{ color: 'var(--cost)' }}>${BUDGET.mtdUsd.toLocaleString()}</b>
                <span className="text-3"> / ${BUDGET.budgetUsd.toLocaleString()}</span>
              </span>
            </div>
            <ProgressBar pct={budgetPct} color="var(--cost)" height={7} />
            <div className="row gap-2" style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
              <Zap size={13} style={{ color: 'var(--cost)', flexShrink: 0 }} />
              <span className="t-small text-2">洞察：v4 省单次 token，却用重试把成本 <b className="mononum" style={{ color: 'var(--text-1)' }}>$0.74 → $0.92</b>（省 token ≠ 省钱）</span>
            </div>
          </Card>

          {/* Eval 评分矩阵缩略 */}
          <Card className="reveal reveal-4">
            <SectionTitle right={<button className="btn btn-subtle btn-sm" onClick={() => navigate('/scoreboard')}>评分看板 <ArrowRight size={12} /></button>}>
              <span className="row gap-2"><Grid3x3 size={13} /> 评分矩阵 · v3 vs v4</span>
            </SectionTitle>
            <Chart height={150} build={() => heatmapOption()} />
            <div className="row gap-2" style={{ marginTop: 8 }}>
              <TrendingDown size={13} style={{ color: 'var(--danger)', flexShrink: 0 }} />
              <span className="t-small" style={{ color: 'var(--text-2)' }}>v4 的 <b style={{ color: 'var(--danger)' }}>忠实度</b> 列泛红：0.90 → 0.80，是本次回归的来源。</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── ECharts builders ──────────────────────────────────────────────────────
function waterfallOption(spans: Span[]) {
  const names = spans.map(s => s.name);
  return {
    ...baseOption(),
    grid: { left: 8, right: 56, top: 6, bottom: 22, containLabel: true },
    tooltip: {
      ...(baseOption().tooltip as object),
      formatter: (p: { dataIndex: number }) => {
        const s = spans[p.dataIndex];
        const parts = [
          `<b>${s.name}</b> · ${s.kind}`,
          `耗时 ${s.durMs}ms · 起 +${s.startMs}ms`,
          s.tokensOut !== undefined ? `tokens ${(s.tokensIn || 0)}/${s.tokensOut}` : '',
          s.costUsd !== undefined ? `cost $${s.costUsd.toFixed(4)}` : '',
          s.status === 'error' ? `<span style="color:${cssVar('--danger')}">● ${s.detail || '失败'}</span>` : (s.detail || ''),
        ].filter(Boolean);
        return parts.join('<br/>');
      },
    },
    xAxis: { type: 'value', ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, formatter: '{value}ms' } },
    yAxis: { type: 'category', inverse: true, data: names, ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, fontSize: 11, width: 120, overflow: 'truncate' } },
    series: [
      { type: 'bar', stack: 't', silent: true, itemStyle: { color: 'transparent' }, data: spans.map(s => s.startMs), barWidth: 12 },
      {
        type: 'bar', stack: 't', barWidth: 12,
        data: spans.map(s => ({
          value: s.durMs,
          itemStyle: {
            color: cssVar(KIND_VAR[s.kind] || '--c8'),
            borderRadius: 3,
            borderColor: s.status === 'error' ? cssVar('--danger') : (s.critical ? accent() : 'transparent'),
            borderWidth: s.status === 'error' || s.critical ? 1.5 : 0,
            opacity: s.status === 'error' ? 1 : 0.92,
          },
        })),
        label: { show: true, position: 'right', formatter: (p: { dataIndex: number }) => `${spans[p.dataIndex].durMs}ms`, color: cssVar('--text-3'), fontSize: 10, fontFamily: 'Geist Mono, monospace' },
        animationDelay: (i: number) => i * 60,
      },
    ],
    animationDuration: 700, animationEasing: 'cubicOut',
  };
}

function monitorOption(mon: typeof MONITOR_SERIES, xLabels: string[]) {
  return {
    ...baseOption(),
    legend: { show: true, right: 0, top: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: cssVar('--text-3'), fontSize: 11 }, data: ['QPS', '错误率 %'] },
    grid: { left: 8, right: 8, top: 28, bottom: 22, containLabel: true },
    tooltip: { ...(baseOption().tooltip as object), trigger: 'axis' },
    xAxis: { type: 'category', boundaryGap: false, data: mon.map(p => p.t), axisLabel: { ...axisStyle().axisLabel, interval: (i: number) => i % 12 === 0, formatter: (v: string, i: number) => xLabels[i] || v }, axisLine: axisStyle().axisLine, axisTick: { show: false }, splitLine: { show: false } },
    yAxis: [
      { type: 'value', ...axisStyle(), name: '', position: 'left' },
      { type: 'value', ...axisStyle(), splitLine: { show: false }, max: 6, position: 'right', axisLabel: { ...axisStyle().axisLabel, formatter: '{value}%' } },
    ],
    series: [
      { name: 'QPS', type: 'line', smooth: true, showSymbol: false, data: mon.map(p => p.qps), lineStyle: { color: accent(), width: 2 }, areaStyle: { color: areaGradient(accent(), 0.2) }, yAxisIndex: 0 },
      {
        name: '错误率 %', type: 'line', smooth: true, showSymbol: false, yAxisIndex: 1,
        data: mon.map(p => p.errRate), lineStyle: { color: sem('error'), width: 1.6 },
        markArea: { silent: true, itemStyle: { color: 'color-mix(in srgb, ' + sem('error') + ' 9%, transparent)' }, data: [[{ xAxis: mon[48].t }, { xAxis: mon[56].t }]] },
      },
    ],
    animationDuration: 800, animationEasing: 'cubicOut',
  };
}

function costStackOption(stack: typeof COST_STACK) {
  const models = ['gpt-4o', 'claude-3.5-sonnet', 'Qwen2.5-72B'];
  const colors = [cost(), cssVar('--c7'), cssVar('--c8')];
  return {
    ...baseOption(),
    legend: { show: true, top: 0, right: 0, itemWidth: 9, itemHeight: 9, textStyle: { color: cssVar('--text-3'), fontSize: 10 }, data: models },
    grid: { left: 6, right: 8, top: 24, bottom: 18, containLabel: true },
    tooltip: { ...(baseOption().tooltip as object), trigger: 'axis', valueFormatter: (v: number) => '$' + v },
    xAxis: { type: 'category', boundaryGap: false, data: stack.map(p => p.date), axisLabel: { ...axisStyle().axisLabel, interval: 6 }, axisLine: axisStyle().axisLine, axisTick: { show: false }, splitLine: { show: false } },
    yAxis: { type: 'value', ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, formatter: '${value}' } },
    series: models.map((m, i) => ({
      name: m, type: 'line', stack: 'cost', smooth: true, showSymbol: false,
      data: stack.map(p => p.values[m]),
      lineStyle: { width: 1, color: colors[i] },
      areaStyle: { color: areaGradient(colors[i], i === 0 ? 0.34 : 0.22), opacity: 1 },
    })),
    animationDuration: 800,
  };
}

function heatmapOption() {
  const rows = ['v3 (prod)', 'v4 (canary)'];
  const data: [number, number, number][] = [];
  SCORE_MATRIX.filter(c => rows.includes(c.row)).forEach(c => {
    data.push([EVAL_DIMS.indexOf(c.dim), rows.indexOf(c.row), c.score]);
  });
  return {
    ...baseOption(),
    grid: { left: 8, right: 12, top: 6, bottom: 40, containLabel: true },
    tooltip: { ...(baseOption().tooltip as object), formatter: (p: { value: [number, number, number] }) => `${rows[p.value[1]]} · ${EVAL_DIMS[p.value[0]]}<br/><b>${p.value[2].toFixed(2)}</b>` },
    xAxis: { type: 'category', data: EVAL_DIMS, axisLabel: { ...axisStyle().axisLabel, fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false }, splitArea: { show: false } },
    yAxis: { type: 'category', data: rows, axisLabel: { ...axisStyle().axisLabel, fontFamily: 'Geist Mono, monospace' }, axisLine: { show: false }, axisTick: { show: false } },
    visualMap: { min: 0.78, max: 1, show: false, inRange: { color: [cssVar('--danger'), cssVar('--warning'), cssVar('--emerald')] } },
    series: [{
      type: 'heatmap', data,
      label: { show: true, formatter: (p: { value: [number, number, number] }) => p.value[2].toFixed(2), color: cssVar('--bg-base'), fontSize: 10, fontFamily: 'Geist Mono, monospace', fontWeight: 600 },
      itemStyle: { borderColor: cssVar('--surface-1'), borderWidth: 3, borderRadius: 4 },
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.4)' } },
    }],
    animationDuration: 700,
  };
}
