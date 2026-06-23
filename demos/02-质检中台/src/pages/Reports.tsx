// ════════════════════════════════════════════════════════════════════════
// AI 质检中台 · 自定义报表与趋势（5.9）
// 给主管/合规官出可导出的趋势报表（图⑪：双轴趋势折线 + 渐变面积）
// 🔒 脱敏：禁 维小豆/维信/维小贷/百灵，公司=示例消费金融
// ════════════════════════════════════════════════════════════════════════
import { useMemo, useState } from 'react';
import { LineChart, FileBarChart, Download, TrendingDown, TrendingUp, ChevronDown, BarChart2 } from 'lucide-react';
import { Card, PageHeader, StatCard, Segmented, SectionTitle, Sparkline } from '../components/ui';
import { DataTable, type Col } from '../components/DataTable';
import { Toolbar, toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar, areaGradient, ANIM } from '../lib/chartTheme';

// ─── 本页 Mock 数据 ────────────────────────────────────────────────────────

type TimeRange = '7d' | '30d' | '90d';

const BUSINESS_LINES = ['提前结清', '注销合规', '银行卡管理', '逾期催收', '产品咨询', 'S客户路由'] as const;
type BizLine = typeof BUSINESS_LINES[number];

const CHANNELS = ['全部', '通话', '在线', '邮件', 'Bot'] as const;
type Channel = typeof CHANNELS[number];

// 趋势数据（每条对应一天；7d 取最后 7 条，30d 取全部 30 条，90d 合并）
const RAW_TREND: { date: string; passRate: number; violationRate: number }[] = [
  { date: '06/01', passRate: 92.1, violationRate: 4.3 },
  { date: '06/02', passRate: 91.8, violationRate: 4.7 },
  { date: '06/03', passRate: 93.4, violationRate: 3.9 },
  { date: '06/04', passRate: 94.0, violationRate: 3.4 },
  { date: '06/05', passRate: 93.2, violationRate: 3.8 },
  { date: '06/06', passRate: 93.8, violationRate: 3.5 },
  { date: '06/07', passRate: 92.5, violationRate: 4.2 },
  { date: '06/08', passRate: 94.6, violationRate: 3.1 },
  { date: '06/09', passRate: 95.1, violationRate: 2.8 },
  { date: '06/10', passRate: 94.3, violationRate: 3.3 },
  { date: '06/11', passRate: 93.7, violationRate: 3.7 },
  { date: '06/12', passRate: 95.4, violationRate: 2.6 },
  { date: '06/13', passRate: 96.0, violationRate: 2.3 },
  { date: '06/14', passRate: 95.7, violationRate: 2.5 },
  { date: '06/15', passRate: 94.9, violationRate: 2.9 },
  { date: '06/16', passRate: 96.3, violationRate: 2.1 },
  { date: '06/17', passRate: 97.1, violationRate: 1.8 },
];

// 90d 合并数据（周粒度）
const TREND_90D: { date: string; passRate: number; violationRate: number }[] = [
  { date: '03/24', passRate: 87.2, violationRate: 7.4 },
  { date: '03/31', passRate: 88.5, violationRate: 6.9 },
  { date: '04/07', passRate: 89.0, violationRate: 6.5 },
  { date: '04/14', passRate: 89.8, violationRate: 6.0 },
  { date: '04/21', passRate: 90.3, violationRate: 5.6 },
  { date: '04/28', passRate: 91.1, violationRate: 5.1 },
  { date: '05/05', passRate: 91.6, violationRate: 4.8 },
  { date: '05/12', passRate: 92.4, violationRate: 4.3 },
  { date: '05/19', passRate: 93.1, violationRate: 3.9 },
  { date: '05/26', passRate: 93.8, violationRate: 3.5 },
  { date: '06/02', passRate: 94.5, violationRate: 3.1 },
  { date: '06/09', passRate: 95.6, violationRate: 2.5 },
  { date: '06/16', passRate: 97.1, violationRate: 1.8 },
];

// 业务线汇总表（≥6 行）
interface BizRow {
  line: BizLine;
  inspected: number;
  passRate: number;
  violationRate: number;
  qoq: number; // 环比（百分点）
  trend: number[];
}

const BIZ_ROWS: BizRow[] = [
  { line: '提前结清',   inspected: 9241,  passRate: 97.8, violationRate: 1.3, qoq: +1.4, trend: [95.1,95.8,96.0,96.7,97.2,97.8] },
  { line: '注销合规',   inspected: 7812,  passRate: 96.5, violationRate: 1.8, qoq: +0.8, trend: [94.2,95.0,95.3,95.9,96.1,96.5] },
  { line: '银行卡管理', inspected: 6548,  passRate: 95.1, violationRate: 2.6, qoq: +2.1, trend: [91.5,92.8,93.4,94.0,94.6,95.1] },
  { line: '逾期催收',   inspected: 11074, passRate: 88.3, violationRate: 7.2, qoq: -0.6, trend: [89.1,88.9,88.7,88.5,88.4,88.3] },
  { line: '产品咨询',   inspected: 8360,  passRate: 98.4, violationRate: 0.9, qoq: +0.5, trend: [97.2,97.5,97.8,98.0,98.2,98.4] },
  { line: 'S客户路由',  inspected: 5585,  passRate: 94.0, violationRate: 3.7, qoq: +1.9, trend: [90.4,91.2,92.1,92.8,93.4,94.0] },
];

// 违规类型构成（用于饼/玫瑰图）
const VIOLATION_TYPES: { name: string; value: number }[] = [
  { name: '未告知年化利率', value: 34 },
  { name: '催收红线违规',   value: 22 },
  { name: '承诺越权',       value: 18 },
  { name: '冷静期未告知',   value: 12 },
  { name: '禁语命中',       value: 9  },
  { name: '其他合规漏检',   value: 5  },
];

// KPI 汇总
const KPI_DATA = {
  passRate:      { val: 97.1, change: +1.8 },
  violationRate: { val: 1.8,  change: -0.7 },
  qoq:           { val: +1.8, change: +0.4 },
  avgScore:      { val: 91.4, change: +2.3 },
};

// ─── 辅助：筛选后趋势数据 ────────────────────────────────────────────────────
function useTrendData(range: TimeRange) {
  return useMemo(() => {
    if (range === '90d') return TREND_90D;
    const n = range === '7d' ? 7 : 17;
    return RAW_TREND.slice(-n);
  }, [range]);
}

// ─── 双轴趋势折线图（图⑪）────────────────────────────────────────────────────
function TrendChart({ data }: { data: { date: string; passRate: number; violationRate: number }[] }) {
  const build = useMemo(() => () => {
    const gold    = cssVar('--gold');
    const danger  = cssVar('--danger');
    const text3   = cssVar('--text-3');

    return {
      ...baseOption(),
      ...ANIM,
      tooltip: {
        trigger: 'axis',
        ...(baseOption().tooltip as object),
        formatter: (params: { seriesName: string; value: number; color: string; name: string }[]) => {
          const date = params[0]?.name ?? '';
          return params.map(p =>
            `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:5px"></span>${p.seriesName}: <b class="tnum">${p.value.toFixed(1)}%</b>`
          ).join('<br/>') + `<div style="color:var(--text-3);font-size:11px;margin-top:4px">${date}</div>`;
        },
      },
      legend: {
        data: ['质检合格率', '违规率'],
        right: 8, top: 0,
        textStyle: { color: text3, fontSize: 12 },
        icon: 'roundRect', itemWidth: 14, itemHeight: 4,
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.date),
        ...axisStyle(),
        boundaryGap: false,
      },
      yAxis: [
        {
          type: 'value',
          name: '合格率',
          min: 80, max: 100,
          ...axisStyle(),
          axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => `${v}%` },
          position: 'left',
        },
        {
          type: 'value',
          name: '违规率',
          min: 0, max: 12,
          ...axisStyle(),
          axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => `${v}%` },
          splitLine: { show: false },
          position: 'right',
        },
      ],
      series: [
        {
          name: '质检合格率',
          type: 'line',
          data: data.map(d => d.passRate),
          smooth: 0.35,
          symbol: 'circle', symbolSize: 5,
          lineStyle: { color: gold, width: 2.5 },
          itemStyle: { color: gold },
          areaStyle: { color: areaGradient(gold, 0.24) },
          yAxisIndex: 0,
          ...ANIM,
        },
        {
          name: '违规率',
          type: 'line',
          data: data.map(d => d.violationRate),
          smooth: 0.35,
          symbol: 'circle', symbolSize: 5,
          lineStyle: { color: danger, width: 2, type: 'dashed' },
          itemStyle: { color: danger },
          areaStyle: { color: areaGradient(danger, 0.16) },
          yAxisIndex: 1,
          ...ANIM,
        },
      ],
    };
  }, [data]);

  return <Chart build={build} height={280} deps={[data]} />;
}

// ─── 违规类型构成图（玫瑰图） ────────────────────────────────────────────────
function ViolationPieChart() {
  const build = useMemo(() => () => {
    const surface1 = cssVar('--surface-1');
    const hairline  = cssVar('--hairline');
    const text1     = cssVar('--text-1');
    const text2     = cssVar('--text-2');
    const text3     = cssVar('--text-3');
    const font      = "'Geist','PingFang SC',system-ui,sans-serif";

    const colors = [
      cssVar('--danger'), cssVar('--warning'), cssVar('--gold'),
      cssVar('--c5'), cssVar('--c7'), cssVar('--c8'),
    ];

    return {
      ...ANIM,
      color: colors,
      tooltip: {
        trigger: 'item',
        backgroundColor: surface1,
        borderColor: hairline,
        borderWidth: 1,
        padding: [9, 13],
        textStyle: { color: text1, fontSize: 12, fontFamily: font },
        extraCssText: 'border-radius:10px;box-shadow:0 10px 34px rgba(0,0,0,.25);',
        formatter: '{b}: <b>{c}%</b> ({d}%)',
      },
      legend: {
        orient: 'vertical',
        right: 12, top: 'center',
        textStyle: { color: text2, fontSize: 11, fontFamily: font },
        icon: 'circle', itemWidth: 8, itemHeight: 8,
      },
      series: [
        {
          name: '违规类型构成',
          type: 'pie',
          radius: ['32%', '72%'],
          center: ['38%', '50%'],
          roseType: 'radius',
          itemStyle: { borderRadius: 4, borderColor: 'var(--surface-1)', borderWidth: 2 },
          label: { show: false },
          labelLine: { show: false },
          emphasis: {
            label: { show: true, fontSize: 12, fontWeight: 600, color: text1, fontFamily: font },
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.15)' },
          },
          data: VIOLATION_TYPES,
          ...ANIM,
        },
      ],
      textStyle: { fontFamily: font, color: text3 },
    };
  }, []);

  return <Chart build={build} height={240} />;
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────
export default function Reports() {
  const [bizLine, setBizLine]   = useState<string>('全部');
  const [channel, setChannel]   = useState<Channel>('全部');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const trendData = useTrendData(timeRange);

  function handleExport(format: 'PDF' | 'Excel') {
    toast(`正在生成 ${format} 报表，请稍候…`, 'info');
    setTimeout(() => toast(`${format} 报表已生成，正在下载`, 'success'), 1400);
  }

  // 汇总表列定义
  const bizCols: Col<BizRow>[] = [
    {
      key: 'line',
      header: '业务线',
      width: 120,
      render: row => <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{row.line}</span>,
    },
    {
      key: 'inspected',
      header: '质检量',
      num: true,
      sortable: true,
      sortAccessor: r => r.inspected,
      render: row => <span className="tnum">{row.inspected.toLocaleString('zh-CN')}</span>,
    },
    {
      key: 'passRate',
      header: '合格率',
      num: true,
      sortable: true,
      sortAccessor: r => r.passRate,
      render: row => (
        <span className="tnum" style={{ color: row.passRate >= 95 ? 'var(--success)' : row.passRate >= 90 ? 'var(--warning)' : 'var(--danger)', fontWeight: 600 }}>
          {row.passRate.toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'violationRate',
      header: '违规率',
      num: true,
      sortable: true,
      sortAccessor: r => r.violationRate,
      render: row => (
        <span className="tnum" style={{ color: row.violationRate > 5 ? 'var(--danger)' : row.violationRate > 3 ? 'var(--warning)' : 'var(--text-2)' }}>
          {row.violationRate.toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'qoq',
      header: '环比（pp）',
      num: true,
      sortable: true,
      sortAccessor: r => r.qoq,
      render: row => (
        <span className="tnum row gap-1" style={{ justifyContent: 'flex-end', color: row.qoq >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600, fontSize: 13 }}>
          {row.qoq >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {row.qoq > 0 ? '+' : ''}{row.qoq.toFixed(1)}
        </span>
      ),
    },
    {
      key: 'trend',
      header: '近 6 期趋势',
      width: 100,
      render: row => (
        <Sparkline
          data={row.trend}
          color={row.qoq >= 0 ? 'var(--success)' : 'var(--danger)'}
          width={80}
          height={26}
        />
      ),
    },
  ];

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '7d',  label: '近 7 天'  },
    { value: '30d', label: '近 30 天' },
    { value: '90d', label: '近 90 天' },
  ];

  return (
    <div className="page">
      {/* ── 页头 ────────────────────────────────────────────────────────── */}
      <PageHeader
        title="自定义报表与趋势"
        subtitle="质检合格率 / 违规率趋势分析，支持按业务线 × 渠道 × 时段多维拼装"
        actions={
          <div className="row gap-2">
            <button
              className="btn btn-ghost btn-sm row gap-1"
              onClick={() => handleExport('PDF')}
            >
              <Download size={14} />
              导出 PDF
            </button>
            <button
              className="btn btn-primary btn-sm row gap-1"
              onClick={() => handleExport('Excel')}
            >
              <FileBarChart size={14} />
              导出 Excel
            </button>
          </div>
        }
      />

      {/* ── 维度拼装控件 ─────────────────────────────────────────────────── */}
      <Card className="reveal reveal-1" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <Toolbar style={{ marginBottom: 0, alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span className="label" style={{ minWidth: 52 }}>筛选条件</span>

          {/* 业务线 */}
          <div className="col gap-1">
            <span className="t-small text-3" style={{ fontSize: 11 }}>业务线</span>
            <div className="input-wrap" style={{ minWidth: 140 }}>
              <select
                className="input"
                value={bizLine}
                onChange={e => setBizLine(e.target.value)}
                style={{ appearance: 'none', paddingRight: 28 }}
              >
                <option value="全部">全部业务线</option>
                {BUSINESS_LINES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* 渠道 */}
          <div className="col gap-1">
            <span className="t-small text-3" style={{ fontSize: 11 }}>渠道</span>
            <div className="input-wrap" style={{ minWidth: 110 }}>
              <select
                className="input"
                value={channel}
                onChange={e => setChannel(e.target.value as Channel)}
                style={{ appearance: 'none', paddingRight: 28 }}
              >
                {CHANNELS.map(c => <option key={c} value={c}>{c === '全部' ? '全部渠道' : c}</option>)}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* 时间范围 Segmented */}
          <div className="col gap-1">
            <span className="t-small text-3" style={{ fontSize: 11 }}>时间范围</span>
            <Segmented<TimeRange>
              options={timeRangeOptions}
              value={timeRange}
              onChange={(v: TimeRange) => setTimeRange(v)}
            />
          </div>
        </Toolbar>
      </Card>

      {/* ── KPI 带 ──────────────────────────────────────────────────────── */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard
          label="质检合格率"
          raw={KPI_DATA.passRate.val}
          unit="%"
          change={KPI_DATA.passRate.change}
          decimals={1}
          icon={<LineChart size={16} />}
          delayClass="reveal-1"
          spark={trendData.map(d => d.passRate)}
        />
        <StatCard
          label="违规率"
          raw={KPI_DATA.violationRate.val}
          unit="%"
          change={KPI_DATA.violationRate.change}
          decimals={1}
          icon={<BarChart2 size={16} />}
          delayClass="reveal-2"
          spark={trendData.map(d => d.violationRate)}
        />
        <StatCard
          label="合格率环比"
          raw={KPI_DATA.qoq.val}
          unit=" pp"
          change={KPI_DATA.qoq.change}
          decimals={1}
          delayClass="reveal-3"
        />
        <StatCard
          label="平均质检得分"
          raw={KPI_DATA.avgScore.val}
          unit="分"
          change={KPI_DATA.avgScore.change}
          decimals={1}
          delayClass="reveal-4"
        />
      </div>

      {/* ── 图⑪：双轴趋势折线图 ─────────────────────────────────────────── */}
      <Card className="reveal reveal-2" style={{ marginBottom: 16 }}>
        <div style={{ padding: '16px 18px 4px' }}>
          <SectionTitle right={
            <span className="t-small text-3">
              {bizLine === '全部' ? '全业务线' : bizLine}
              {channel !== '全部' ? ` · ${channel}` : ''}
              {' '}· {timeRange === '7d' ? '近 7 天' : timeRange === '30d' ? '近 30 天' : '近 90 天'}
            </span>
          }>
            质检合格率 / 违规率双轴趋势
          </SectionTitle>
        </div>
        <div style={{ padding: '0 8px 16px' }}>
          <TrendChart data={trendData} />
        </div>
        <div className="divider" style={{ margin: '0 18px' }} />
        <div className="row gap-4 wrap" style={{ padding: '10px 20px', fontSize: 12, color: 'var(--text-3)' }}>
          <span>
            <span style={{ display: 'inline-block', width: 24, height: 3, background: 'var(--gold)', borderRadius: 2, verticalAlign: 'middle', marginRight: 6 }} />
            质检合格率（左轴）
          </span>
          <span>
            <span style={{ display: 'inline-block', width: 24, height: 2, background: 'var(--danger)', borderRadius: 2, verticalAlign: 'middle', marginRight: 6, borderTop: '2px dashed var(--danger)' }} />
            违规率（右轴，越低越好）
          </span>
        </div>
      </Card>

      {/* ── 两列布局：汇总表 + 违规类型构成 ────────────────────────────── */}
      <div
        className="col"
        style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 16, alignItems: 'start' }}
      >
        {/* 左：汇总 DataTable */}
        <Card className="reveal reveal-3" style={{ gridColumn: 1 }}>
          <div style={{ padding: '16px 18px 4px' }}>
            <SectionTitle right={
              <span className="t-small text-3">共 {BIZ_ROWS.length} 个业务线</span>
            }>
              各业务线质检汇总
            </SectionTitle>
          </div>
          <DataTable<BizRow>
            cols={bizCols}
            rows={BIZ_ROWS}
            rowKey={r => r.line}
            defaultSort={{ key: 'passRate', dir: 'desc' }}
            dense
            empty={{ title: '暂无报表数据', desc: '请调整筛选条件后重试' }}
          />
          {/* 说明行 */}
          <div style={{ padding: '10px 18px', borderTop: '1px solid var(--hairline)', fontSize: 11, color: 'var(--text-3)' }}>
            环比对比上期同维度 · pp = 百分点 · 趋势取近 6 期合格率
          </div>
        </Card>

        {/* 右：违规类型构成玫瑰图 */}
        <Card className="reveal reveal-4" style={{ gridColumn: 2, minWidth: 320, maxWidth: 360 }}>
          <div style={{ padding: '16px 18px 4px' }}>
            <SectionTitle>违规类型构成</SectionTitle>
          </div>
          <ViolationPieChart />
          {/* 图例补充 */}
          <div style={{ padding: '4px 18px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {VIOLATION_TYPES.map((vt, i) => {
              const colors = [
                'var(--danger)', 'var(--warning)', 'var(--gold)',
                'var(--c5)', 'var(--c7)', 'var(--c8)',
              ];
              return (
                <div key={vt.name} className="row spread" style={{ fontSize: 12 }}>
                  <div className="row gap-2" style={{ alignItems: 'center' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i], display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-2)' }}>{vt.name}</span>
                  </div>
                  <span className="tnum text-3">{vt.value}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ── 总计行 ──────────────────────────────────────────────────────── */}
      <Card className="reveal reveal-5" style={{ padding: '14px 18px' }}>
        <div className="row spread wrap" style={{ gap: 16, fontSize: 13, color: 'var(--text-2)' }}>
          <div className="row gap-3 wrap">
            <span>
              报告周期：
              <span className="tnum" style={{ color: 'var(--text-1)', fontWeight: 600 }}>
                {timeRange === '7d' ? '2026-06-11 ~ 2026-06-17' : timeRange === '30d' ? '2026-05-19 ~ 2026-06-17' : '2026-03-19 ~ 2026-06-17'}
              </span>
            </span>
            <span>
              总质检量：
              <span className="tnum" style={{ color: 'var(--text-1)', fontWeight: 600 }}>
                {BIZ_ROWS.reduce((s, r) => s + r.inspected, 0).toLocaleString('zh-CN')} 条
              </span>
            </span>
            <span>
              综合合格率：
              <span className="tnum" style={{ color: 'var(--success)', fontWeight: 600 }}>97.1%</span>
            </span>
            <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
              数据来源：示例消费金融 AI 质检中台 · 全量 100% 质检
            </span>
          </div>
          <div className="row gap-2">
            <button className="btn btn-ghost btn-sm row gap-1" onClick={() => handleExport('PDF')}>
              <Download size={13} />导出 PDF
            </button>
            <button className="btn btn-primary btn-sm row gap-1" onClick={() => handleExport('Excel')}>
              <FileBarChart size={13} />导出 Excel
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
