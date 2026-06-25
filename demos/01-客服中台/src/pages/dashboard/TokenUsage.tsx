import { useMemo } from 'react';
import { PageHeader, Card, SectionTitle } from '../../components/ui';
import { MeterBar } from '../../components/kit';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar } from '../../lib/chartTheme';
import { useCountUp, useInView, fmt } from '../../lib/hooks';
import { TOKEN_SUMMARY, TOKEN_AGENT_DIST, TOKEN_TREND } from '../../lib/mock/dash';

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, unit, sub, accent = false,
}: { label: string; value: number; unit: string; sub?: React.ReactNode; accent?: boolean }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const displayed = useCountUp(value, 900, inView);
  const isFloat = value % 1 !== 0;
  const formatted = isFloat
    ? displayed.toFixed(1)
    : fmt(Math.round(displayed));
  return (
    <div ref={ref} className="card reveal" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
        {accent && <span style={{ color: 'var(--bronze)', fontSize: 22, fontWeight: 600, lineHeight: 1 }}>¥</span>}
        <span
          className="kpi-value tnum"
          style={{ color: accent ? 'var(--bronze)' : 'var(--text-1)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}
        >
          {formatted}
        </span>
        <span className="kpi-unit" style={{ color: 'var(--text-3)', fontSize: 14, marginLeft: 2 }}>{unit}</span>
      </div>
      {sub && <div style={{ marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ── Trend chip ────────────────────────────────────────────────────────────────
function DodChip({ change }: { change: number }) {
  const up = change >= 0;
  return (
    <span
      className={up ? 'trend-up' : 'trend-down'}
      style={{ fontSize: 12, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 2 }}
    >
      {up ? '▲' : '▼'} {Math.abs(change).toFixed(1)}% 日环比
    </span>
  );
}

// ── Token Usage page ──────────────────────────────────────────────────────────
export default function TokenUsage() {
  // ── 7 日趋势图 ──
  const trendOpt = useMemo(() => () => ({
    ...baseOption(),
    tooltip: {
      trigger: 'axis',
      ...(baseOption().tooltip as object),
      formatter: (params: Array<{ name: string; value: number }>) => {
        const p = params[0];
        return `${p.name}<br/>Token：${fmt(p.value)}`;
      },
    },
    xAxis: {
      type: 'category',
      data: TOKEN_TREND.map(r => r.date),
      ...axisStyle(),
    },
    yAxis: {
      type: 'value',
      ...axisStyle(),
      axisLabel: {
        formatter: (v: number) => `${(v / 10000).toFixed(0)}w`,
        color: cssVar('--text-3'),
        fontSize: 11,
      },
    },
    series: [{
      type: 'bar',
      data: TOKEN_TREND.map(r => r.tokens),
      itemStyle: { color: cssVar('--gold'), borderRadius: [4, 4, 0, 0] },
      barMaxWidth: 48,
    }],
  }), []);

  // ── 按 Agent 横向条形图 ──
  const agentOpt = useMemo(() => () => {
    const agents = [...TOKEN_AGENT_DIST].reverse();
    return {
      ...baseOption(),
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...(baseOption().tooltip as object),
        formatter: (params: Array<{ name: string; value: number }>) => {
          const p = params[0];
          return `${p.name}<br/>${fmt(p.value)} tokens`;
        },
      },
      grid: { left: 110, right: 24, top: 12, bottom: 12, containLabel: false },
      xAxis: {
        type: 'value',
        ...axisStyle(),
        axisLabel: {
          formatter: (v: number) => `${(v / 10000).toFixed(0)}w`,
          color: cssVar('--text-3'),
          fontSize: 11,
        },
      },
      yAxis: {
        type: 'category',
        data: agents.map(r => r.agent),
        ...axisStyle(),
        axisLabel: { color: cssVar('--text-2'), fontSize: 12 },
      },
      series: [{
        type: 'bar',
        data: agents.map(r => r.tokens),
        itemStyle: {
          color: cssVar('--gold'),
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: 'right',
          formatter: (p: { dataIndex: number }) => {
            const item = agents[p.dataIndex];
            return `${item.pct}%`;
          },
          color: cssVar('--text-3'),
          fontSize: 11,
        },
        barMaxWidth: 28,
      }],
    };
  }, []);

  return (
    <div className="page">
      <PageHeader
        title="Token 用量"
        subtitle="实时监控 LLM API token 消耗 · 数据来自每次 Qwen API 调用自动记录"
      />

      {/* ── 4 KPI ────────────────────────────────────────────────────────── */}
      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}
      >
        <KpiCard
          label="今日 Token"
          value={TOKEN_SUMMARY.todayTotal}
          unit="tok"
          sub={<DodChip change={TOKEN_SUMMARY.todayChange} />}
        />
        <KpiCard
          label="本月累计 Token"
          value={TOKEN_SUMMARY.monthTotal}
          unit="tok"
        />
        <KpiCard
          label="本月估算费用"
          value={TOKEN_SUMMARY.monthCost}
          unit="元"
          accent
        />
        <KpiCard
          label="单次对话平均"
          value={TOKEN_SUMMARY.avgPerChat}
          unit="tok / 对话"
        />
      </div>

      {/* ── 按 Agent 分布 + 7 日趋势（双栏）────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Agent 分布 */}
        <div className="card reveal-1" style={{ padding: '20px 24px' }}>
          <SectionTitle>按 Agent 分布（本月）</SectionTitle>
          {/* ECharts 横向条形 */}
          <Chart build={agentOpt} height={260} />
          {/* MeterBar 补充：逐行精确数字 */}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {TOKEN_AGENT_DIST.map(row => (
              <div key={row.agent} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 110, fontSize: 12, color: 'var(--text-2)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.agent}</span>
                <div style={{ flex: 1 }}>
                  <MeterBar pct={row.pct} />
                </div>
                <span className="tnum" style={{ fontSize: 12, color: 'var(--text-3)', width: 90, textAlign: 'right', flexShrink: 0 }}>
                  {fmt(row.tokens)} <span style={{ opacity: 0.6 }}>({row.pct}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 7 日趋势 */}
        <div className="card reveal-2" style={{ padding: '20px 24px' }}>
          <SectionTitle>7 日 Token 趋势</SectionTitle>
          <Chart build={trendOpt} height={260} />
          {/* 每日费用小表 */}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {TOKEN_TREND.map(row => (
              <div key={row.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace' }}>{row.date}</span>
                <div style={{ display: 'flex', gap: 24 }}>
                  <span className="tnum" style={{ fontSize: 12, color: 'var(--text-2)' }}>{fmt(row.tokens)} tok</span>
                  <span className="tnum" style={{ fontSize: 12, color: 'var(--bronze)' }}>¥{row.cost.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 定价参考 infobox ─────────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          padding: '14px 20px',
          background: 'var(--surface-2)',
          border: '1px solid var(--hairline)',
          borderLeft: '3px solid var(--gold)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderRadius: 'var(--r-md)',
        }}
      >
        <span style={{ color: 'var(--gold)', fontSize: 14 }}>ℹ</span>
        <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text-1)' }}>定价参考</strong>
          &ensp;·&ensp;qwen-plus 输入 ¥0.004 / 千 token &ensp;·&ensp;输出 ¥0.012 / 千 token
          &ensp;·&ensp;本月费用估算基于 4:1 输入输出比
        </span>
      </div>
    </div>
  );
}
