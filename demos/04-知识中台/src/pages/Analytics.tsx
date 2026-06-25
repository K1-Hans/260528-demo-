import { useMemo, useState } from 'react';
import {
  BarChart2, Clock, TrendingUp, Users, CheckCircle, ShieldCheck, Zap, Activity,
} from 'lucide-react';
import { PageHeader, Card, StatCard, SectionTitle, ProgressBar, Segmented } from '../components/ui';
import Chart from '../components/Chart';
import {
  baseOption, axisStyle, accent, trust, sem, areaGradient, DRAW,
} from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import {
  ROI_KPIS, ADOPTION_SERIES, DEPT_ACTIVITY, TOPIC_TREE, SOURCE_DIST,
} from '../lib/mockData';

type TimeRange = '7d' | '14d' | '30d';
type DeptFilter = 'all' | string;

const TIME_OPTS: { value: TimeRange; label: string }[] = [
  { value: '7d', label: '近 7 天' },
  { value: '14d', label: '近 14 天' },
  { value: '30d', label: '近 30 天' },
];

const DEPT_FILTER_OPTS: { value: string; label: string }[] = [
  { value: 'all', label: '全部' },
  ...DEPT_ACTIVITY.map(d => ({ value: d.dept, label: d.dept })),
];

// ─── ROI 洞察计算 ─────────────────────────────────────────────────────────────
const HOURS_PER_MONTH = 3200;
const HOURLY_COST_RMB = 200; // 元/工时（顾问均价估算）
const MONTHLY_SAVING_RMB = Math.round((HOURS_PER_MONTH * HOURLY_COST_RMB) / 10000); // 万元

// ─── Analytics 页面 ──────────────────────────────────────────────────────────
export default function Analytics() {
  const { currentRole } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [deptFilter, setDeptFilter] = useState<DeptFilter>('all');

  const seriesLen = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
  const adoptionSlice = useMemo(
    () => ADOPTION_SERIES.slice(-seriesLen),
    [seriesLen],
  );
  const deptRows = useMemo(
    () => deptFilter === 'all' ? DEPT_ACTIVITY : DEPT_ACTIVITY.filter(d => d.dept === deptFilter),
    [deptFilter],
  );

  // 图表 deps 绑定数据版本（角色切换/过滤也会触发重绘）
  const chartDeps = useMemo(() => [currentRole?.id, timeRange, deptFilter], [currentRole, timeRange, deptFilter]);

  // ── ECharts ①：采用率 + 查询量趋势（双轴面积线）────────────────────────────
  const buildAdoptionChart = () => {
    const dates = adoptionSlice.map(p => p.date);
    const wauData = adoptionSlice.map(p => p.wau);
    const qData = adoptionSlice.map(p => p.queries);
    const a = accent();
    const t = trust();
    return {
      ...baseOption(),
      ...DRAW,
      legend: {
        right: 0,
        top: 0,
        textStyle: { fontSize: 11, color: 'var(--text-2)' },
        itemHeight: 8,
        data: ['周活跃率 WAU', '查询量'],
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        ...axisStyle(),
      },
      yAxis: [
        {
          type: 'value',
          name: 'WAU',
          nameTextStyle: { fontSize: 10, color: 'var(--text-3)' },
          min: 55,
          ...axisStyle(),
        },
        {
          type: 'value',
          name: '查询量',
          nameTextStyle: { fontSize: 10, color: 'var(--text-3)' },
          position: 'right',
          ...axisStyle(),
        },
      ],
      series: [
        {
          name: '周活跃率 WAU',
          type: 'line',
          yAxisIndex: 0,
          data: wauData,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 2, color: a },
          areaStyle: { color: areaGradient(a) },
          itemStyle: { color: a },
        },
        {
          name: '查询量',
          type: 'line',
          yAxisIndex: 1,
          data: qData,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1.5, color: t, type: 'dashed' as const },
          areaStyle: { color: areaGradient(t, 0.12) },
          itemStyle: { color: t },
        },
      ],
    };
  };

  // ── ECharts ②：各部门活跃水平（水平条形图，按 queries 排序）───────────────
  const buildDeptChart = () => {
    const sorted = [...deptRows].sort((a, b) => b.queries - a.queries);
    const depts = sorted.map(d => d.dept);
    const queries = sorted.map(d => d.queries);
    const adoptions = sorted.map(d => d.adoption);
    const a = accent();
    const t = trust();
    return {
      ...baseOption(),
      ...DRAW,
      grid: { left: 16, right: 56, top: 12, bottom: 8, containLabel: true },
      legend: {
        right: 0,
        top: 0,
        textStyle: { fontSize: 11, color: 'var(--text-2)' },
        itemHeight: 8,
        data: ['查询量', '采纳率 %'],
      },
      xAxis: [
        {
          type: 'value',
          name: '查询量',
          nameTextStyle: { fontSize: 10, color: 'var(--text-3)' },
          ...axisStyle(),
        },
        {
          type: 'value',
          name: '采纳率 %',
          nameTextStyle: { fontSize: 10, color: 'var(--text-3)' },
          min: 0,
          max: 100,
          position: 'top',
          ...axisStyle(),
        },
      ],
      yAxis: {
        type: 'category',
        data: depts,
        ...axisStyle(),
      },
      series: [
        {
          name: '查询量',
          type: 'bar',
          xAxisIndex: 0,
          data: queries,
          barMaxWidth: 28,
          itemStyle: {
            color: a,
            borderRadius: [0, 4, 4, 0],
          },
          label: {
            show: true,
            position: 'right' as const,
            formatter: (p: { value: number }) => p.value.toLocaleString(),
            fontSize: 10,
            color: 'var(--text-3)',
          },
        },
        {
          name: '采纳率 %',
          type: 'scatter',
          xAxisIndex: 1,
          data: adoptions.map((v, i) => ({ value: v, name: depts[i] })),
          symbolSize: 10,
          itemStyle: { color: t },
          label: {
            show: true,
            formatter: (p: { value: number }) => `${p.value}%`,
            position: 'right' as const,
            fontSize: 10,
            color: t,
          },
        },
      ],
    };
  };

  // ── ECharts ③：查询主题旭日图 ────────────────────────────────────────────────
  const buildSunburstChart = () => {
    const a = accent();
    // 将 TopicNode 树转为旭日图数据
    const palette = [a, trust(), sem('info'), sem('restricted')];
    const mapNode = (node: { name: string; value?: number; children?: typeof node[] }, depth: number): Record<string, unknown> => ({
      name: node.name,
      value: node.value,
      itemStyle: depth === 0 ? undefined : { color: palette[(depth - 1) % palette.length] },
      children: node.children?.map(c => mapNode(c, depth + 1)),
    });
    return {
      ...baseOption(),
      ...DRAW,
      series: [
        {
          type: 'sunburst',
          data: TOPIC_TREE.children?.map(c => mapNode(c, 1)) ?? [],
          radius: ['20%', '92%'],
          sort: undefined,
          emphasis: { focus: 'ancestor' },
          levels: [
            {},
            {
              r0: '20%', r: '55%',
              itemStyle: { borderWidth: 2, borderColor: 'var(--surface-1)' },
              label: { fontSize: 11, fontFamily: "'Geist','PingFang SC',sans-serif" },
            },
            {
              r0: '55%', r: '92%',
              itemStyle: { borderWidth: 2, borderColor: 'var(--surface-1)' },
              label: { fontSize: 10, fontFamily: "'Geist','PingFang SC',sans-serif", overflow: 'truncate' },
            },
          ],
          label: { color: 'var(--text-1)', fontFamily: "'Geist','PingFang SC',sans-serif" },
        },
      ],
    };
  };

  // ── ECharts ④：来源分布环形图 ─────────────────────────────────────────────
  const buildDonutChart = () => {
    const total = SOURCE_DIST.reduce((s, d) => s + d.value, 0);
    return {
      ...baseOption(),
      ...DRAW,
      legend: {
        orient: 'vertical' as const,
        right: 8,
        top: 'center',
        textStyle: { fontSize: 11, color: 'var(--text-2)' },
        itemHeight: 8,
      },
      series: [
        {
          type: 'pie',
          radius: ['44%', '72%'],
          center: ['38%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 4, borderColor: 'var(--surface-1)', borderWidth: 2 },
          label: {
            show: true,
            position: 'center' as const,
            formatter: () => `${(total / 10000).toFixed(0)}万\n文档`,
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-1)',
            lineHeight: 20,
          },
          emphasis: {
            label: { show: true, fontSize: 13 },
            itemStyle: { shadowBlur: 12, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' },
          },
          labelLine: { show: false },
          data: SOURCE_DIST.map(d => ({ name: d.name, value: d.value })),
        },
      ],
    };
  };

  return (
    <div className="page">
      <PageHeader
        title="使用分析 · ROI"
        subtitle="平台采纳率、节省工时与答案质量——向买方证明知识中台的真实价值"
        actions={
          <span className="row gap-2">
            <span className="badge" style={{ background: 'color-mix(in srgb, var(--emerald) 14%, transparent)', color: 'var(--emerald)' }}>
              <ShieldCheck size={11} /> 可溯源率 100%
            </span>
            <Segmented options={TIME_OPTS} value={timeRange} onChange={setTimeRange} />
          </span>
        }
      />

      {/* ── KPI 条 ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-4 gap-3" style={{ marginBottom: 20 }}>
        {ROI_KPIS.map((kpi, i) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            raw={kpi.raw}
            unit={kpi.unit}
            change={kpi.change}
            spark={kpi.spark}
            decimals={kpi.decimals}
            delayClass={`reveal-${i + 1}`}
            icon={i === 0 ? <Users size={15} /> : i === 1 ? <BarChart2 size={15} /> : i === 2 ? <CheckCircle size={15} /> : <Clock size={15} />}
          />
        ))}
        {/* 第 5 个 KPI：可溯源率 */}
        <div className="card card-hover reveal reveal-5">
          <div className="spread" style={{ marginBottom: 10 }}>
            <span className="label">可溯源率</span>
            <span style={{ color: 'var(--emerald)', opacity: 0.7 }}><ShieldCheck size={15} /></span>
          </div>
          <div className="row spread" style={{ alignItems: 'flex-end' }}>
            <div>
              <div className="kpi-value">
                <span className="mononum">100</span>
                <span className="kpi-unit">%</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <span className="row gap-1" style={{ fontSize: 12, fontWeight: 600, color: 'var(--emerald)' }}>
                  <TrendingUp size={12} /> 每条答案有据可查
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROI 洞察条 ──────────────────────────────────────────────────────── */}
      <div
        className="reveal reveal-2"
        style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '13px 18px',
          borderRadius: 'var(--r-md)', marginBottom: 20,
          background: 'color-mix(in srgb, var(--gold) 7%, var(--surface-2))',
          border: '1px solid color-mix(in srgb, var(--gold) 22%, var(--hairline))',
        }}
      >
        <Zap size={16} style={{ color: 'var(--gold)', flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: 13.5, color: 'var(--text-1)' }}>
          月省 <b className="mononum" style={{ color: 'var(--gold)' }}>3,200</b> 工时
          ≈ 折算约 <b className="mononum" style={{ color: 'var(--gold)' }}>{MONTHLY_SAVING_RMB} 万元</b> 人力成本节约；
          答案可溯源率 <b style={{ color: 'var(--emerald)' }}>100%</b>，满足金融合规审计要求。
        </div>
        <span className="t-small text-3" style={{ flexShrink: 0 }}>按顾问均价 {HOURLY_COST_RMB} 元/工时估算</span>
      </div>

      {/* ── 图表区第一行：趋势 + 部门 ───────────────────────────────────────── */}
      <div className="grid grid-cols-auto gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 20 }}>
        <Card className="reveal reveal-2">
          <SectionTitle right={<span className="t-small text-3">WAU（靛蓝）+ 查询量（绿虚线）</span>}>
            <span className="row gap-2"><Activity size={13} /> 采用率 · 查询量趋势</span>
          </SectionTitle>
          <Chart build={buildAdoptionChart} height={240} deps={chartDeps} />
        </Card>

        <Card className="reveal reveal-3">
          <SectionTitle right={
            <Segmented
              options={DEPT_FILTER_OPTS.slice(0, 4)}
              value={DEPT_FILTER_OPTS.slice(0, 4).some(o => o.value === deptFilter) ? deptFilter : 'all'}
              onChange={setDeptFilter}
            />
          }>
            <span className="row gap-2"><BarChart2 size={13} /> 各部门活跃度</span>
          </SectionTitle>
          <Chart build={buildDeptChart} height={240} deps={chartDeps} />
        </Card>
      </div>

      {/* ── 图表区第二行：旭日图 + 来源环形 ─────────────────────────────────── */}
      <div className="grid grid-cols-auto gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 20 }}>
        <Card className="reveal reveal-3">
          <SectionTitle right={<span className="t-small text-3">点击扇区展开下钻</span>}>
            <span className="row gap-2"><Zap size={13} /> 查询主题分布（旭日图）</span>
          </SectionTitle>
          <Chart build={buildSunburstChart} height={300} deps={chartDeps} />
        </Card>

        <Card className="reveal reveal-4">
          <SectionTitle right={<span className="t-small text-3 mononum">{(SOURCE_DIST.reduce((s, d) => s + d.value, 0) / 10000).toFixed(0)} 万文档总量</span>}>
            <span className="row gap-2"><ShieldCheck size={13} /> 知识来源分布</span>
          </SectionTitle>
          <Chart build={buildDonutChart} height={300} deps={chartDeps} />
        </Card>
      </div>

      {/* ── 部门采纳明细表格 ─────────────────────────────────────────────────── */}
      <Card className="reveal reveal-4">
        <SectionTitle right={<span className="badge" style={{ background: 'color-mix(in srgb, var(--emerald) 12%, transparent)', color: 'var(--emerald)' }}>{deptRows.length} 个部门</span>}>
          <span className="row gap-2"><Users size={13} /> 部门采纳明细</span>
        </SectionTitle>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
                {(['部门', '活跃用户', '月查询量', '采纳率', '采纳进度'] as const).map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...deptRows].sort((a, b) => b.queries - a.queries).map((row, i) => (
                <tr
                  key={row.dept}
                  style={{
                    borderBottom: '1px solid var(--hairline)',
                    background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)',
                    transition: 'background 0.15s',
                  }}
                >
                  <td style={{ padding: '10px 10px', fontWeight: 500, color: 'var(--text-1)' }}>{row.dept}</td>
                  <td style={{ padding: '10px 10px' }}>
                    <span className="mononum" style={{ color: 'var(--text-2)' }}>{row.users}</span>
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    <span className="mononum" style={{ color: 'var(--text-2)' }}>{row.queries.toLocaleString()}</span>
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    <span
                      className="mononum"
                      style={{
                        fontWeight: 700,
                        color: row.adoption >= 85 ? 'var(--emerald)' : row.adoption >= 75 ? 'var(--gold)' : 'var(--text-2)',
                      }}
                    >
                      {row.adoption}%
                    </span>
                  </td>
                  <td style={{ padding: '10px 10px', minWidth: 120 }}>
                    <ProgressBar
                      pct={row.adoption}
                      color={row.adoption >= 85 ? 'var(--emerald)' : 'var(--gold)'}
                      height={5}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── 角色感知提示 ─────────────────────────────────────────────────────── */}
      <div
        className="row gap-2"
        style={{
          marginTop: 16, padding: '10px 14px',
          borderRadius: 'var(--r-md)',
          background: 'var(--surface-2)',
          border: '1px solid var(--hairline)',
        }}
      >
        <ShieldCheck size={14} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
        <span className="t-small text-2">
          以 <b style={{ color: currentRole?.color }}>{currentRole?.name}（密级 {currentRole?.clearance}）</b> 查看 ——
          切换角色后图表数据刷新；本页数据仅在持有 <b>analytics:read</b> 权限时可见。
        </span>
      </div>
    </div>
  );
}
