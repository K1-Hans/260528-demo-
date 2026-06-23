import { useMemo, useState } from 'react';
import { ShieldCheck, Percent, Gauge, AlertTriangle, FileSearch, Download } from 'lucide-react';
import { Card, PageHeader, StatCard, SectionTitle } from '../components/ui';
import { Drawer, MeterBar, toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar, DRAW } from '../lib/chartTheme';
import { useInView, fmt } from '../lib/hooks';

// ─── 本地类型 ─────────────────────────────────────────────────────────────────
interface CoverageItem {
  id: string;
  name: string;
  desc: string;
  required: boolean;
  coverage: number;    // 0–100
  total: number;       // 今日该话术应命中会话数
  missing: number;     // 缺漏会话数
  category: '合规必读' | '风险提示' | '服务规范';
}

interface MissingSession {
  sessionId: string;
  agent: string;
  businessLine: string;
  channel: string;
  time: string;
  duration: string;
}

// ─── Mock 数据（真实消金质检场景）────────────────────────────────────────────
const COVERAGE_ITEMS: CoverageItem[] = [
  {
    id: 'c01', name: '年化利率告知', category: '合规必读', required: true,
    desc: '坐席须在通话开始告知客户年化综合利率及还款计划，禁止隐瞒或模糊表达',
    coverage: 94.2, total: 12840, missing: 742,
  },
  {
    id: 'c02', name: '冷静期权利告知', category: '合规必读', required: true,
    desc: '告知客户签约后 24 小时冷静期内可无条件解约，不得设置障碍',
    coverage: 100, total: 12840, missing: 0,
  },
  {
    id: 'c03', name: '个人信息授权说明', category: '合规必读', required: true,
    desc: '征得客户明确同意后方可采集、使用、共享个人金融信息，需逐项口头确认',
    coverage: 98.7, total: 12840, missing: 167,
  },
  {
    id: 'c04', name: '逾期后果告知', category: '合规必读', required: true,
    desc: '明确说明逾期将产生罚息、影响征信，并告知逾期上报时间节点',
    coverage: 91.5, total: 12840, missing: 1092,
  },
  {
    id: 'c05', name: '催收红线声明', category: '合规必读', required: true,
    desc: '催收坐席须声明不会采用威胁、骚扰及联系无关第三方等违规方式',
    coverage: 100, total: 3210, missing: 0,
  },
  {
    id: 'c06', name: '费率全额告知', category: '合规必读', required: true,
    desc: '须告知客户除年化利率外全部费用：手续费、服务费、提前还款违约金等',
    coverage: 87.3, total: 12840, missing: 1632,
  },
  {
    id: 'c07', name: '征信查询授权', category: '合规必读', required: true,
    desc: '授信前须取得客户书面或口头明确同意后方可向征信机构查询信息',
    coverage: 99.1, total: 4280, missing: 38,
  },
  {
    id: 'c08', name: '产品风险提示', category: '风险提示', required: true,
    desc: '提示客户根据自身还款能力谨慎借款，过度负债可能影响个人及家庭财务',
    coverage: 82.6, total: 12840, missing: 2239,
  },
  {
    id: 'c09', name: '申诉渠道告知', category: '服务规范', required: false,
    desc: '告知客户如有质疑可拨打 400-800-1234 或向银保监/金管局投诉举报',
    coverage: 76.4, total: 8560, missing: 2019,
  },
  {
    id: 'c10', name: '录音录像知情', category: '合规必读', required: true,
    desc: '通话开始须告知客户本次通话将被录音/录像，符合双录合规要求',
    coverage: 100, total: 12840, missing: 0,
  },
  {
    id: 'c11', name: '贷款用途确认', category: '风险提示', required: false,
    desc: '信用贷款坐席须确认客户借款用途，禁止用于非法或监管限制场景',
    coverage: 88.4, total: 12840, missing: 1490,
  },
  {
    id: 'c12', name: '还款方式说明', category: '服务规范', required: false,
    desc: '说明等额本息/等额本金/随借随还等还款方式差异及适用场景',
    coverage: 93.8, total: 9630, missing: 597,
  },
];

const MISSING_SESSIONS: Record<string, MissingSession[]> = {
  c01: [
    { sessionId: 'S-20240617-08142', agent: '赵越', businessLine: '产品咨询', channel: '通话', time: '09:14', duration: '3m 22s' },
    { sessionId: 'S-20240617-08288', agent: '孙琪', businessLine: '注销合规', channel: '在线', time: '09:37', duration: '5m 08s' },
    { sessionId: 'S-20240617-08401', agent: '赵越', businessLine: '提前结清', channel: '通话', time: '10:02', duration: '2m 47s' },
    { sessionId: 'S-20240617-08556', agent: '李航', businessLine: '产品咨询', channel: '通话', time: '10:29', duration: '4m 15s' },
    { sessionId: 'S-20240617-08793', agent: '孙琪', businessLine: '银行卡管理', channel: '在线', time: '11:03', duration: '3m 55s' },
  ],
  c04: [
    { sessionId: 'S-20240617-09021', agent: '赵越', businessLine: '逾期催收', channel: '通话', time: '09:50', duration: '6m 11s' },
    { sessionId: 'S-20240617-09147', agent: '孙琪', businessLine: '提前结清', channel: '通话', time: '10:14', duration: '4m 32s' },
    { sessionId: 'S-20240617-09283', agent: '李航', businessLine: '产品咨询', channel: '在线', time: '10:48', duration: '3m 09s' },
    { sessionId: 'S-20240617-09412', agent: '赵越', businessLine: 'S客户路由', channel: 'Bot', time: '11:22', duration: '1m 58s' },
    { sessionId: 'S-20240617-09630', agent: '孙琪', businessLine: '注销合规', channel: '通话', time: '12:07', duration: '5m 44s' },
  ],
  c06: [
    { sessionId: 'S-20240617-10001', agent: '李航', businessLine: '产品咨询', channel: '通话', time: '09:08', duration: '2m 53s' },
    { sessionId: 'S-20240617-10089', agent: '赵越', businessLine: '注销合规', channel: '通话', time: '09:31', duration: '4m 20s' },
    { sessionId: 'S-20240617-10234', agent: '孙琪', businessLine: '提前结清', channel: '在线', time: '10:55', duration: '6m 02s' },
    { sessionId: 'S-20240617-10388', agent: '赵越', businessLine: '产品咨询', channel: '通话', time: '11:43', duration: '3m 38s' },
    { sessionId: 'S-20240617-10521', agent: '李航', businessLine: 'S客户路由', channel: '在线', time: '14:16', duration: '2m 14s' },
  ],
  c08: [
    { sessionId: 'S-20240617-11002', agent: '赵越', businessLine: '产品咨询', channel: '通话', time: '08:52', duration: '3m 07s' },
    { sessionId: 'S-20240617-11148', agent: '孙琪', businessLine: '银行卡管理', channel: '在线', time: '09:44', duration: '4m 41s' },
    { sessionId: 'S-20240617-11279', agent: '李航', businessLine: '产品咨询', channel: '通话', time: '10:36', duration: '2m 22s' },
    { sessionId: 'S-20240617-11401', agent: '赵越', businessLine: '注销合规', channel: '通话', time: '11:28', duration: '5m 16s' },
    { sessionId: 'S-20240617-11582', agent: '孙琪', businessLine: '提前结清', channel: '在线', time: '13:05', duration: '3m 59s' },
  ],
  c09: [
    { sessionId: 'S-20240617-12003', agent: '李航', businessLine: '逾期催收', channel: '通话', time: '10:22', duration: '7m 14s' },
    { sessionId: 'S-20240617-12191', agent: '赵越', businessLine: '产品咨询', channel: '在线', time: '11:15', duration: '3m 48s' },
    { sessionId: 'S-20240617-12334', agent: '孙琪', businessLine: '注销合规', channel: '通话', time: '12:33', duration: '4m 27s' },
    { sessionId: 'S-20240617-12489', agent: '赵越', businessLine: 'S客户路由', channel: 'Bot', time: '14:08', duration: '2m 02s' },
    { sessionId: 'S-20240617-12651', agent: '李航', businessLine: '产品咨询', channel: '通话', time: '15:44', duration: '3m 31s' },
  ],
  c11: [
    { sessionId: 'S-20240617-13001', agent: '赵越', businessLine: '产品咨询', channel: '通话', time: '09:18', duration: '2m 44s' },
    { sessionId: 'S-20240617-13158', agent: '孙琪', businessLine: '注销合规', channel: '在线', time: '10:41', duration: '3m 55s' },
    { sessionId: 'S-20240617-13302', agent: '李航', businessLine: '银行卡管理', channel: '通话', time: '11:59', duration: '4m 12s' },
    { sessionId: 'S-20240617-13447', agent: '赵越', businessLine: '产品咨询', channel: 'Bot', time: '13:37', duration: '1m 28s' },
    { sessionId: 'S-20240617-13590', agent: '孙琪', businessLine: '提前结清', channel: '通话', time: '14:52', duration: '3m 05s' },
  ],
};

// 覆盖率水平条形图（图表⑨）
function CoverageBarChart({ items }: { items: CoverageItem[] }) {
  const opt = useMemo(() => () => {
    const sorted = [...items].sort((a, b) => a.coverage - b.coverage);
    const names = sorted.map(i => i.name);
    const values = sorted.map(i => i.coverage);
    const colors = sorted.map(i =>
      i.coverage >= 100 ? cssVar('--success')
      : i.coverage < 90 ? cssVar('--danger')
      : cssVar('--warning')
    );
    return {
      ...baseOption(),
      ...DRAW,
      tooltip: {
        trigger: 'axis' as const,
        ...(baseOption().tooltip as object),
        formatter: (params: { name: string; value: number }[]) => {
          const p = params[0];
          const item = sorted.find(i => i.name === p.name);
          return `<div style="font-size:12px;line-height:1.7">
            <b>${p.name}</b><br/>
            覆盖率：<b>${p.value.toFixed(1)}%</b><br/>
            缺漏会话：${item ? fmt(item.missing) : '—'} 条
          </div>`;
        },
      },
      grid: { left: 8, right: 80, top: 12, bottom: 8, containLabel: true },
      xAxis: {
        type: 'value' as const,
        max: 100,
        ...axisStyle(),
        axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => `${v}%` },
        splitLine: { lineStyle: { color: cssVar('--hairline'), type: 'dashed' as const } },
      },
      yAxis: {
        type: 'category' as const,
        data: names,
        ...axisStyle(),
        axisLabel: {
          ...axisStyle().axisLabel,
          fontSize: 12,
          width: 110,
          overflow: 'truncate' as const,
        },
      },
      series: [
        {
          type: 'bar',
          data: values.map((v, i) => ({
            value: v,
            itemStyle: { color: colors[i], borderRadius: [0, 4, 4, 0] },
          })),
          barMaxWidth: 18,
          label: {
            show: true,
            position: 'right' as const,
            color: cssVar('--text-2'),
            fontSize: 11,
            fontFamily: "'Geist',monospace",
            formatter: (p: { value: number }) => `${p.value.toFixed(1)}%`,
          },
          markLine: {
            silent: true,
            symbol: ['none', 'none'],
            lineStyle: { color: cssVar('--gold'), type: 'dashed' as const, width: 1.5 },
            label: {
              show: true,
              position: 'insideEndTop' as const,
              color: cssVar('--gold'),
              fontSize: 10,
              formatter: '目标 100%',
            },
            data: [{ xAxis: 100 }],
          },
        },
      ],
    };
  }, [items]);

  return <Chart build={opt} height={320} deps={[items]} />;
}

// 双录覆盖率仪表盘 gauge（图表⑩）
function DualRecordGauge({ value }: { value: number }) {
  const opt = useMemo(() => () => {
    const isComplete = value >= 100;
    const color = isComplete ? cssVar('--success') : value >= 95 ? cssVar('--warning') : cssVar('--danger');
    return {
      ...baseOption(),
      ...DRAW,
      series: [
        {
          type: 'gauge',
          center: ['50%', '60%'],
          radius: '85%',
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max: 100,
          splitNumber: 5,
          axisLine: {
            lineStyle: {
              width: 16,
              color: [
                [value / 100, color],
                [1, cssVar('--surface-3')],
              ],
            },
          },
          pointer: {
            show: true,
            length: '55%',
            width: 4,
            itemStyle: { color },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: {
            color: cssVar('--text-3'),
            fontSize: 10,
            fontFamily: "'Geist',monospace",
            distance: -28,
            formatter: (v: number) => `${v}%`,
          },
          anchor: {
            show: true,
            size: 10,
            itemStyle: { color, borderWidth: 2, borderColor: cssVar('--surface-1') },
          },
          detail: {
            valueAnimation: true,
            formatter: (v: number) => `{val|${v.toFixed(1)}}{unit|%}`,
            rich: {
              val: {
                fontSize: 28,
                fontWeight: 700,
                fontFamily: "'Geist',monospace",
                color: cssVar('--text-1'),
              },
              unit: {
                fontSize: 14,
                color: cssVar('--text-3'),
                padding: [0, 0, 0, 3],
              },
            },
            offsetCenter: [0, '20%'],
          },
          title: {
            offsetCenter: [0, '48%'],
            fontSize: 12,
            color: cssVar('--text-3'),
            fontFamily: "'Geist','PingFang SC',sans-serif",
          },
          data: [{ value, name: '双录覆盖率' }],
        },
      ],
    };
  }, [value]);

  return <Chart build={opt} height={240} deps={[value]} />;
}

// 缺漏会话抽屉
function MissingDrawer({
  open, onClose, item,
}: {
  open: boolean;
  onClose: () => void;
  item: CoverageItem | null;
}) {
  const sessions = item ? (MISSING_SESSIONS[item.id] ?? []) : [];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={item ? `缺漏会话 · ${item.name}` : '缺漏会话'}
      sub={item ? `今日缺漏 ${fmt(item.missing)} 条 · 覆盖率 ${item.coverage.toFixed(1)}%` : undefined}
      width={500}
    >
      {item && (
        <div style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', border: '1px solid var(--hairline)' }}>
          <div className="label" style={{ marginBottom: 4 }}>合规要求</div>
          <div className="t-small text-2">{item.desc}</div>
        </div>
      )}
      {sessions.length === 0 ? (
        <div className="text-3 t-small" style={{ textAlign: 'center', padding: '40px 0' }}>
          暂无缺漏会话
        </div>
      ) : (
        <div className="col gap-2">
          {sessions.map(s => (
            <div
              key={s.sessionId}
              className="card card-hover"
              style={{ padding: '12px 14px', cursor: 'pointer' }}
              onClick={() => {
                toast(`已跳转至会话 ${s.sessionId}`, 'info');
                onClose();
              }}
            >
              <div className="row spread" style={{ marginBottom: 6 }}>
                <span className="mono tnum" style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.sessionId}</span>
                <span className="t-small text-3 tnum">{s.time} · {s.duration}</span>
              </div>
              <div className="row gap-3" style={{ fontSize: 12, color: 'var(--text-3)' }}>
                <span>坐席：<span style={{ color: 'var(--text-2)' }}>{s.agent}</span></span>
                <span>业务线：<span style={{ color: 'var(--text-2)' }}>{s.businessLine}</span></span>
                <span>渠道：<span style={{ color: 'var(--text-2)' }}>{s.channel}</span></span>
              </div>
            </div>
          ))}
          <div className="t-small text-3" style={{ textAlign: 'center', paddingTop: 8 }}>
            展示前 {sessions.length} 条 · 共 {item ? fmt(item.missing) : 0} 条缺漏
          </div>
        </div>
      )}
    </Drawer>
  );
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────
export default function Coverage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<CoverageItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('全部');
  const [ref, inView] = useInView<HTMLDivElement>();

  const dualRecordCoverage = 100;

  // 筛选后的列表
  const filtered = categoryFilter === '全部'
    ? COVERAGE_ITEMS
    : COVERAGE_ITEMS.filter(i => i.category === categoryFilter);

  // 汇总 KPI
  const totalRequired = COVERAGE_ITEMS.filter(i => i.required);
  const fullyCovered = totalRequired.filter(i => i.coverage >= 100).length;
  const totalMissing = COVERAGE_ITEMS.reduce((sum, i) => sum + i.missing, 0);
  const riskItems = COVERAGE_ITEMS.filter(i => i.coverage < 90 && i.required).length;

  function openDrillDown(item: CoverageItem) {
    if (item.missing === 0) {
      toast(`${item.name} 覆盖率 100%，无缺漏会话`, 'success');
      return;
    }
    setActiveItem(item);
    setDrawerOpen(true);
  }

  const categories = ['全部', '合规必读', '风险提示', '服务规范'];

  return (
    <div className="page">
      <PageHeader
        title="合规话术覆盖率"
        subtitle="双录刚需可视化 · 必读合规话术 100% 覆盖率监控 · 示例消费金融 · 信用贷"
        actions={
          <div className="row gap-2">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => toast('报告导出功能即将上线', 'info')}
            >
              <Download size={14} />
              导出报告
            </button>
          </div>
        }
      />

      {/* KPI 带 */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }} ref={ref}>
        <StatCard
          label="双录覆盖率"
          raw={dualRecordCoverage}
          unit="%"
          icon={<Gauge size={16} />}
          delayClass="reveal-1"
          decimals={1}
          change={0}
        />
        <StatCard
          label="必读项总数"
          raw={totalRequired.length}
          unit="项"
          icon={<ShieldCheck size={16} />}
          delayClass="reveal-2"
        />
        <StatCard
          label="达标项（100%覆盖）"
          raw={fullyCovered}
          unit="项"
          icon={<Percent size={16} />}
          delayClass="reveal-3"
        />
        <StatCard
          label="风险红区（覆盖率<90%）"
          raw={riskItems}
          unit="项"
          icon={<AlertTriangle size={16} />}
          delayClass="reveal-4"
          change={riskItems > 0 ? riskItems : 0}
        />
      </div>

      {/* 图表区：双录 Gauge + 覆盖率条形 */}
      <div className="grid" style={{ gridTemplateColumns: '280px 1fr', gap: 14, marginBottom: 20 }}>
        <Card className="reveal-1">
          <SectionTitle>
            <div className="row gap-2">
              <Gauge size={14} style={{ color: 'var(--gold)' }} />
              双录覆盖率 Gauge
            </div>
          </SectionTitle>
          <DualRecordGauge value={dualRecordCoverage} />
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <span
              style={{
                display: 'inline-block',
                padding: '3px 10px',
                borderRadius: 'var(--r-sm)',
                background: dualRecordCoverage >= 100
                  ? 'color-mix(in srgb, var(--success) 14%, transparent)'
                  : 'color-mix(in srgb, var(--danger) 14%, transparent)',
                color: dualRecordCoverage >= 100 ? 'var(--success)' : 'var(--danger)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {dualRecordCoverage >= 100 ? '达标 · 符合监管双录要求' : `未达标 · 差 ${(100 - dualRecordCoverage).toFixed(1)}%`}
            </span>
          </div>
          <div
            className="t-small text-3"
            style={{ textAlign: 'center', marginTop: 10, lineHeight: 1.6 }}
          >
            金管总局要求双录 100% 覆盖<br />数据留存 10 年
          </div>
        </Card>

        <Card className="reveal-2">
          <SectionTitle>
            <div className="row gap-2">
              <ShieldCheck size={14} style={{ color: 'var(--gold)' }} />
              合规话术覆盖率总览
            </div>
            <div className="row gap-2">
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--success)', display: 'inline-block' }} />
              <span className="t-small text-3">100%</span>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--warning)', display: 'inline-block', marginLeft: 8 }} />
              <span className="t-small text-3">90–99%</span>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--danger)', display: 'inline-block', marginLeft: 8 }} />
              <span className="t-small text-3">&lt;90%（红区）</span>
            </div>
          </SectionTitle>
          <CoverageBarChart items={COVERAGE_ITEMS} />
        </Card>
      </div>

      {/* 必读合规话术清单 */}
      <Card className="reveal-3">
        <div className="row spread" style={{ marginBottom: 16 }}>
          <SectionTitle>
            <div className="row gap-2">
              <FileSearch size={14} style={{ color: 'var(--gold)' }} />
              必读合规话术清单
            </div>
          </SectionTitle>
          <div className="row gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                className="btn btn-sm"
                style={{
                  background: categoryFilter === cat ? 'var(--gold-glow)' : 'var(--surface-2)',
                  color: categoryFilter === cat ? 'var(--gold)' : 'var(--text-3)',
                  border: `1px solid ${categoryFilter === cat ? 'var(--hairline-strong)' : 'var(--hairline)'}`,
                }}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 表头 */}
        <div
          className="row"
          style={{
            padding: '8px 14px',
            background: 'var(--surface-2)',
            borderRadius: 'var(--r-sm)',
            borderBottom: '1px solid var(--hairline)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-3)',
            letterSpacing: '0.04em',
            marginBottom: 2,
          }}
        >
          <span style={{ flex: '0 0 160px' }}>话术名称</span>
          <span style={{ flex: '0 0 60px', textAlign: 'center' }}>类别</span>
          <span style={{ flex: '0 0 48px', textAlign: 'center' }}>必读</span>
          <span style={{ flex: 1, paddingLeft: 12 }}>今日覆盖率</span>
          <span style={{ flex: '0 0 100px', textAlign: 'right' }}>缺漏会话</span>
          <span style={{ flex: '0 0 80px' }} />
        </div>

        <div className="col" style={{ gap: 2 }}>
          {filtered.map((item, idx) => {
            const isComplete = item.coverage >= 100;
            const isRisk = item.coverage < 90;
            const barColor = isComplete
              ? 'var(--success)'
              : isRisk
              ? 'var(--danger)'
              : 'var(--warning)';

            return (
              <div
                key={item.id}
                className={`row reveal reveal-${Math.min(idx + 1, 6)}`}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--r-sm)',
                  border: `1px solid ${isRisk && item.required ? 'color-mix(in srgb, var(--danger) 30%, transparent)' : 'var(--hairline)'}`,
                  background: isRisk && item.required
                    ? 'color-mix(in srgb, var(--danger) 4%, var(--surface-1))'
                    : 'var(--surface-1)',
                  alignItems: 'center',
                  gap: 0,
                  transition: 'background 0.15s',
                }}
              >
                {/* 话术名 */}
                <div style={{ flex: '0 0 160px' }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isRisk && item.required ? 'var(--danger)' : 'var(--text-1)',
                      marginBottom: 2,
                    }}
                  >
                    {item.name}
                  </div>
                  <div className="t-small text-3" style={{ lineHeight: 1.4, maxWidth: 140 }}>
                    {item.desc.slice(0, 28)}…
                  </div>
                </div>

                {/* 类别 */}
                <div style={{ flex: '0 0 60px', textAlign: 'center' }}>
                  <span
                    className="badge"
                    style={{
                      fontSize: 10,
                      background: item.category === '合规必读'
                        ? 'color-mix(in srgb, var(--gold) 12%, transparent)'
                        : item.category === '风险提示'
                        ? 'color-mix(in srgb, var(--warning) 12%, transparent)'
                        : 'color-mix(in srgb, var(--success) 12%, transparent)',
                      color: item.category === '合规必读'
                        ? 'var(--gold)'
                        : item.category === '风险提示'
                        ? 'var(--warning)'
                        : 'var(--success)',
                    }}
                  >
                    {item.category}
                  </span>
                </div>

                {/* 必读标记 */}
                <div style={{ flex: '0 0 48px', textAlign: 'center' }}>
                  {item.required ? (
                    <ShieldCheck size={14} style={{ color: 'var(--gold)' }} />
                  ) : (
                    <span className="t-small text-3">—</span>
                  )}
                </div>

                {/* 覆盖率进度 */}
                <div style={{ flex: 1, paddingLeft: 12 }}>
                  <div className="row spread" style={{ marginBottom: 5 }}>
                    <span
                      className="tnum"
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: barColor,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {item.coverage.toFixed(1)}%
                    </span>
                    <span className="t-small text-3 tnum">
                      {fmt(item.total - item.missing)} / {fmt(item.total)}
                    </span>
                  </div>
                  <MeterBar pct={item.coverage} color={barColor} />
                </div>

                {/* 缺漏数 */}
                <div style={{ flex: '0 0 100px', textAlign: 'right', paddingLeft: 12 }}>
                  {item.missing > 0 ? (
                    <span
                      className="tnum"
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: isRisk ? 'var(--danger)' : 'var(--warning)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {fmt(item.missing)} 条
                    </span>
                  ) : (
                    <span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 600 }}>
                      全覆盖
                    </span>
                  )}
                </div>

                {/* 钻取按钮 */}
                <div style={{ flex: '0 0 80px', textAlign: 'right' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 12 }}
                    onClick={() => openDrillDown(item)}
                  >
                    {item.missing > 0 ? '钻取 →' : '已达标'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 汇总行 */}
        <div
          style={{
            marginTop: 12,
            padding: '10px 14px',
            background: 'var(--surface-2)',
            borderRadius: 'var(--r-sm)',
            border: '1px solid var(--hairline)',
          }}
        >
          <div className="row spread">
            <span className="label">今日汇总</span>
            <div className="row gap-4">
              <span className="t-small text-3">
                总缺漏会话：<span className="tnum" style={{ color: totalMissing > 0 ? 'var(--warning)' : 'var(--success)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(totalMissing)} 条</span>
              </span>
              <span className="t-small text-3">
                必读达标率：<span className="tnum" style={{ color: 'var(--gold)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fullyCovered}/{totalRequired.length} 项</span>
              </span>
              {riskItems > 0 && (
                <span
                  className="badge"
                  style={{
                    background: 'color-mix(in srgb, var(--danger) 12%, transparent)',
                    color: 'var(--danger)',
                    fontSize: 11,
                  }}
                >
                  {riskItems} 项红区需处理
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 合规标注说明 */}
      <div
        className="reveal"
        style={{
          marginTop: 16,
          padding: '12px 16px',
          background: 'color-mix(in srgb, var(--gold) 6%, var(--surface-1))',
          borderRadius: 'var(--r-md)',
          border: '1px solid color-mix(in srgb, var(--gold) 20%, transparent)',
          fontSize: 12,
          color: 'var(--text-3)',
          lineHeight: 1.7,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <ShieldCheck size={15} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }} />
        <span>
          本仪表盘数据基于今日 <span className="tnum" style={{ fontWeight: 600, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>48,620</span> 条全量质检记录（100% AI 质检）。
          覆盖率 &lt; 90% 标记为红区，对应合规风险须在次日 17:00 前由质检主管确认处置。
          依据：金管总局《消费者权益保护监管评价办法》2025-09 施行 · 双录留存 10 年要求。
        </span>
      </div>

      {/* 缺漏会话抽屉 */}
      <MissingDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} item={activeItem} />

      {/* 挂载辅助：避免 inView 警告 */}
      <span ref={ref} style={{ display: 'none' }} />
    </div>
  );
}
