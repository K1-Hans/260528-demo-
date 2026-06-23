// ═══════════════════════════════════════════════════════════════════════════
// 高管风险驾驶舱 · CISO 视图 · perm = cockpit:read
// 视觉签名：Obsidian Command 黑曜作战室 · 全局只读高管视角
// ═══════════════════════════════════════════════════════════════════════════

import { BarChart2, ShieldCheck, TrendingDown, AlertTriangle, Gauge, FileText, CheckCircle } from 'lucide-react';
import { PageHeader, StatCard, ProgressBar } from '../components/ui';
import { Panel } from '../components/sig';
import { DataTable, type Col } from '../components/DataTable';
import Chart from '../components/Chart';
import { baseOption, axisStyle, areaGradient, cssVar, pass, block } from '../lib/chartTheme';
import { fmt, fmtMoney } from '../lib/hooks';

// ─── 页面专属 mock 数据（顶部 const · 脱敏：示例消费金融）───────────────────

/** 近 12 个月月度数据（2025-07 ~ 2026-06）*/
const MONTHS = ['7月', '8月', '9月', '10月', '11月', '12月', '1月', '2月', '3月', '4月', '5月', '6月'];

/** 欺诈损失（万元）· 呈下降趋势（风控增效体现）*/
const FRAUD_LOSS = [128.4, 142.7, 119.3, 135.6, 108.2, 97.5, 89.3, 83.6, 76.4, 71.2, 68.5, 61.8];

/** 拦截挽损额（万元）· 呈上升趋势 */
const INTERCEPT_SAVE = [284.6, 310.2, 329.8, 298.5, 356.4, 388.2, 412.5, 430.7, 456.3, 479.8, 501.2, 528.6];

/** 近 8 周周度数据 */
const WEEKS = ['W19', 'W20', 'W21', 'W22', 'W23', 'W24', 'W25', 'W26'];

/** 近 8 周拦截率（%）*/
const INTERCEPT_RATE_W = [93.8, 94.2, 94.7, 95.1, 95.4, 95.6, 96.0, 96.3];

/** 近 8 周误报率（%）*/
const FALSE_POSITIVE_W = [1.82, 1.76, 1.71, 1.65, 1.58, 1.52, 1.47, 1.41];

/** 业务线风险敞口（万元） */
const BUSINESS_EXPOSURE = [
  { name: '信用卡', value: 284.6 },
  { name: '信用贷', value: 198.3 },
  { name: '账户安全', value: 142.5 },
  { name: '快捷支付', value: 89.4 },
];

/** 合规就绪度指标 */
const COMPLIANCE_METERS = [
  { label: 'EU AI Act 2026-08-02 强制', pct: 96, color: 'var(--success)', note: '技术文档、模型登记、人工监督全达标' },
  { label: '数据治理合规', pct: 91, color: 'var(--gold)', note: '数据溯源、保留策略、访问控制' },
  { label: '模型审计追溯', pct: 88, color: 'var(--info)', note: '决策日志、版本锁定、EU 可解释框架' },
];

/** 重大风险事件 Top */
interface RiskEvent {
  id: string;
  title: string;
  bizLine: string;
  loss: number;
  saved: number;
  status: '已处置' | '处置中' | '上报监管';
}

const RISK_EVENTS: RiskEvent[] = [
  { id: 'EVT-2026-041', title: '套现团伙批量账户接管', bizLine: '快捷支付', loss: 38.6, saved: 142.3, status: '已处置' },
  { id: 'EVT-2026-038', title: '信用贷结构化拆分可疑资金', bizLine: '信用贷', loss: 22.1, saved: 89.5, status: '上报监管' },
  { id: 'EVT-2026-035', title: '盗刷团伙境外 IP 集中尝试', bizLine: '信用卡', loss: 18.4, saved: 76.2, status: '已处置' },
  { id: 'EVT-2026-031', title: '快进快出 AML 异常资金归集', bizLine: '账户安全', loss: 15.2, saved: 58.8, status: '处置中' },
  { id: 'EVT-2026-029', title: '高危地区大额转账 PEP 命中', bizLine: '信用贷', loss: 9.7, saved: 44.1, status: '上报监管' },
];

const STATUS_TONE: Record<RiskEvent['status'], string> = {
  '已处置': 'var(--success)',
  '处置中': 'var(--warning)',
  '上报监管': 'var(--danger)',
};

// KPI StatCard 专属 spark 数组
const LOSS_SPARK = FRAUD_LOSS.slice(-8);
const SAVE_SPARK = INTERCEPT_SAVE.slice(-8);
const RATE_SPARK = INTERCEPT_RATE_W.slice(-6);
const FPR_SPARK = FALSE_POSITIVE_W.slice(-6);

// ─── 图表构建函数 ─────────────────────────────────────────────────────────────

/** ① 损失 vs 挽损 双线面积趋势（近 12 个月）*/
function buildLossSaveChart() {
  const base = baseOption();
  return {
    ...base,
    grid: { left: 10, right: 16, top: 28, bottom: 8, containLabel: true },
    legend: {
      top: 4, right: 8, itemWidth: 10, itemHeight: 10, icon: 'roundRect',
      textStyle: { color: cssVar('--text-3'), fontSize: 11 },
    },
    xAxis: {
      type: 'category', data: MONTHS, boundaryGap: false,
      ...axisStyle(),
    },
    yAxis: {
      type: 'value', name: '万元', nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 },
      ...axisStyle(),
    },
    series: [
      {
        name: '欺诈损失', type: 'line', data: FRAUD_LOSS,
        smooth: true, symbol: 'none', lineStyle: { width: 1.6, color: cssVar('--danger') },
        areaStyle: { color: areaGradient(cssVar('--danger'), 0.18) },
        animationDuration: 900, animationEasing: 'cubicOut',
      },
      {
        name: '拦截挽损', type: 'line', data: INTERCEPT_SAVE,
        smooth: true, symbol: 'none', lineStyle: { width: 1.6, color: cssVar('--success') },
        areaStyle: { color: areaGradient(cssVar('--success'), 0.18) },
        animationDuration: 900, animationEasing: 'cubicOut',
        animationDelay: 100,
      },
    ],
  };
}

/** ② 拦截率 vs 误报率 双轴（近 8 周，bar+line）*/
function buildRateTrendChart() {
  const base = baseOption();
  return {
    ...base,
    grid: { left: 10, right: 48, top: 28, bottom: 8, containLabel: true },
    legend: {
      top: 4, right: 8, itemWidth: 10, itemHeight: 10, icon: 'roundRect',
      textStyle: { color: cssVar('--text-3'), fontSize: 11 },
    },
    xAxis: {
      type: 'category', data: WEEKS,
      ...axisStyle(),
    },
    yAxis: [
      {
        type: 'value', name: '拦截率%', min: 90, max: 100,
        nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 },
        ...axisStyle(),
      },
      {
        type: 'value', name: '误报率%', min: 0, max: 3, splitLine: { show: false },
        nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 },
        axisLabel: { color: cssVar('--text-3'), fontSize: 11 },
        axisLine: { lineStyle: { color: cssVar('--hairline') } },
        axisTick: { show: false },
      },
    ],
    series: [
      {
        name: '拦截率', type: 'bar', yAxisIndex: 0, data: INTERCEPT_RATE_W,
        itemStyle: { borderRadius: [3, 3, 0, 0], color: pass() },
        barMaxWidth: 28,
        animationDuration: 800, animationEasing: 'cubicOut',
      },
      {
        name: '误报率', type: 'line', yAxisIndex: 1, data: FALSE_POSITIVE_W,
        smooth: true, symbol: 'circle', symbolSize: 5,
        lineStyle: { width: 1.6, color: cssVar('--warning') },
        itemStyle: { color: cssVar('--warning') },
        animationDuration: 900, animationEasing: 'cubicOut',
      },
    ],
  };
}

/** ③ 业务线风险敞口分布（横向条形）*/
function buildExposureChart() {
  const base = baseOption();
  const maxVal = Math.max(...BUSINESS_EXPOSURE.map(d => d.value));
  const COLORS = [cssVar('--danger'), cssVar('--warning'), cssVar('--gold'), cssVar('--info')];
  return {
    ...base,
    grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value', name: '万元',
      nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 },
      ...axisStyle(), max: maxVal * 1.15,
    },
    yAxis: {
      type: 'category',
      data: BUSINESS_EXPOSURE.map(d => d.name),
      ...axisStyle(),
    },
    series: [{
      type: 'bar',
      data: BUSINESS_EXPOSURE.map((d, i) => ({
        value: d.value,
        itemStyle: { color: COLORS[i], borderRadius: [0, 4, 4, 0], opacity: 0.85 },
      })),
      label: { show: true, position: 'right', formatter: (p: { value: number }) => `¥${fmt(p.value)}万`, color: cssVar('--text-2'), fontSize: 11 },
      barMaxWidth: 22,
      animationDuration: 800, animationEasing: 'cubicOut',
    }],
  };
}

/** ④ 合规就绪度仪表 gauge（EU AI Act · 96%）*/
function buildComplianceGauge() {
  const base = baseOption();
  return {
    ...base,
    series: [{
      type: 'gauge',
      center: ['50%', '56%'],
      radius: '82%',
      startAngle: 210, endAngle: -30,
      min: 0, max: 100,
      splitNumber: 5,
      axisLine: {
        lineStyle: {
          width: 14,
          color: [
            [0.7, cssVar('--danger')],
            [0.85, cssVar('--warning')],
            [1, cssVar('--success')],
          ],
        },
      },
      pointer: { itemStyle: { color: cssVar('--gold') }, length: '58%', width: 5 },
      axisTick: { distance: -18, length: 6, lineStyle: { color: cssVar('--surface-3'), width: 1 } },
      splitLine: { distance: -22, length: 12, lineStyle: { color: cssVar('--surface-3'), width: 2 } },
      axisLabel: { color: cssVar('--text-3'), fontSize: 10, distance: -36 },
      title: { color: cssVar('--text-3'), fontSize: 11, offsetCenter: [0, '72%'] },
      detail: {
        valueAnimation: true, color: cssVar('--gold'),
        fontSize: 26, fontWeight: 700, fontFamily: "'Geist Mono',monospace",
        formatter: '{value}%', offsetCenter: [0, '36%'],
      },
      data: [{ value: 96, name: 'EU AI Act 合规就绪' }],
      animationDuration: 1200, animationEasing: 'cubicOut',
    }],
  };
}

// ─── 风险事件表列定义 ─────────────────────────────────────────────────────────

const EVENT_COLS: Col<RiskEvent>[] = [
  { key: 'id', header: '事件编号', width: 110, render: r => <span className="mono t-small">{r.id}</span> },
  { key: 'title', header: '风险事件', render: r => <span style={{ color: 'var(--text-1)', fontSize: 13 }}>{r.title}</span> },
  { key: 'bizLine', header: '业务线', width: 80, render: r => (
    <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{r.bizLine}</span>
  )},
  { key: 'loss', header: '损失（万）', num: true, sortable: true, width: 90,
    sortAccessor: r => r.loss,
    render: r => <span className="mononum" style={{ color: 'var(--danger)' }}>¥{fmt(r.loss, 1)}</span> },
  { key: 'saved', header: '挽损（万）', num: true, sortable: true, width: 90,
    sortAccessor: r => r.saved,
    render: r => <span className="mononum" style={{ color: 'var(--success)' }}>¥{fmt(r.saved, 1)}</span> },
  { key: 'status', header: '状态', width: 80, align: 'center', render: r => (
    <span className="badge" style={{ background: `color-mix(in srgb, ${STATUS_TONE[r.status]} 14%, transparent)`, color: STATUS_TONE[r.status] }}>
      {r.status}
    </span>
  )},
];

// ─── 页面组件 ─────────────────────────────────────────────────────────────────

export default function Cockpit() {
  // 本月汇总 KPI
  const curLoss = FRAUD_LOSS[FRAUD_LOSS.length - 1];      // 61.8万
  const prevLoss = FRAUD_LOSS[FRAUD_LOSS.length - 2];     // 68.5万
  const lossChange = Number(((curLoss - prevLoss) / prevLoss * 100).toFixed(1)); // 负值 = 好事

  const curSave = INTERCEPT_SAVE[INTERCEPT_SAVE.length - 1];   // 528.6万
  const prevSave = INTERCEPT_SAVE[INTERCEPT_SAVE.length - 2];
  const saveChange = Number(((curSave - prevSave) / prevSave * 100).toFixed(1));

  const curRate = INTERCEPT_RATE_W[INTERCEPT_RATE_W.length - 1];
  const prevRate = INTERCEPT_RATE_W[INTERCEPT_RATE_W.length - 2];
  const rateChange = Number((curRate - prevRate).toFixed(1));

  const curFpr = FALSE_POSITIVE_W[FALSE_POSITIVE_W.length - 1];
  const prevFpr = FALSE_POSITIVE_W[FALSE_POSITIVE_W.length - 2];
  const fprChange = Number((curFpr - prevFpr).toFixed(2));

  return (
    <div className="page page-wide">
      <PageHeader
        title="高管风险驾驶舱"
        subtitle="CISO 全局视图 · 欺诈损失 / 拦截挽损 / 合规就绪度 · 只读高管快览"
        actions={
          <div className="row gap-2">
            <span className="live-pulse" />
            <span className="t-small text-2">示例消费金融 · 2026-06-20</span>
          </div>
        }
      />

      {/* ── KPI 行：5 大关键指标 ── */}
      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 16 }}>
        <StatCard
          label="本月欺诈损失"
          raw={curLoss}
          unit="万元"
          decimals={1}
          change={lossChange}
          spark={LOSS_SPARK}
          icon={<TrendingDown size={15} />}
          delayClass="reveal-1"
        />
        <StatCard
          label="拦截挽损额"
          raw={curSave}
          unit="万元"
          decimals={1}
          change={saveChange}
          spark={SAVE_SPARK}
          icon={<ShieldCheck size={15} />}
          delayClass="reveal-2"
        />
        <StatCard
          label="拦截率"
          raw={curRate}
          unit="%"
          decimals={2}
          change={rateChange}
          spark={RATE_SPARK}
          icon={<Gauge size={15} />}
          delayClass="reveal-3"
        />
        <StatCard
          label="误报率"
          raw={curFpr}
          unit="%"
          decimals={2}
          change={fprChange}
          spark={FPR_SPARK}
          icon={<BarChart2 size={15} />}
          delayClass="reveal-4"
        />
        <StatCard
          label="AML 合规就绪度"
          raw={96}
          unit="%"
          decimals={0}
          change={2}
          icon={<CheckCircle size={15} />}
          delayClass="reveal-5"
        />
      </div>

      {/* ── 主图区：左 2/3 趋势 · 右 1/3 仪表 ── */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 340px', gap: 14, marginBottom: 14 }}>
        {/* ① 损失 vs 挽损双线趋势 */}
        <Panel
          title="损失 vs 挽损 · 近 12 个月"
          icon={<TrendingDown size={13} />}
          right={<span className="t-small text-3">单位：万元</span>}
        >
          <Chart build={buildLossSaveChart} height={240} />
        </Panel>

        {/* ② 拦截率 vs 误报率双轴 */}
        <Panel
          title="拦截率 vs 误报率 · 近 8 周"
          icon={<BarChart2 size={13} />}
          right={<span className="t-small text-3">柱=拦截率（左轴）· 线=误报率（右轴）</span>}
        >
          <Chart build={buildRateTrendChart} height={240} />
        </Panel>

        {/* ④ 合规就绪度仪表 */}
        <Panel
          title="EU AI Act 合规就绪度"
          icon={<FileText size={13} />}
          right={
            <span className="badge" style={{ background: 'color-mix(in srgb, var(--success) 14%, transparent)', color: 'var(--success)', fontSize: 10.5 }}>
              2026-08-02 强制生效
            </span>
          }
        >
          <Chart build={buildComplianceGauge} height={168} />
          {/* 三条合规水位条 */}
          <div className="col gap-3" style={{ padding: '0 4px 4px' }}>
            {COMPLIANCE_METERS.map(m => (
              <div key={m.label}>
                <div className="row spread" style={{ marginBottom: 5 }}>
                  <span className="t-small text-2" style={{ fontSize: 11.5 }}>{m.label}</span>
                  <span className="mononum t-small" style={{ color: m.color, fontWeight: 700 }}>{m.pct}%</span>
                </div>
                <ProgressBar pct={m.pct} color={m.color} height={5} />
                <div className="t-small text-3" style={{ marginTop: 3, fontSize: 10.5 }}>{m.note}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── 下方区：业务线敞口 + 重大风险事件 ── */}
      <div className="grid" style={{ gridTemplateColumns: '340px 1fr', gap: 14, marginBottom: 14 }}>
        {/* ③ 业务线风险敞口分布 */}
        <Panel
          title="风险敞口分布 · 业务线"
          icon={<BarChart2 size={13} />}
          right={<span className="t-small text-3">本月存量（万元）</span>}
        >
          <Chart build={buildExposureChart} height={192} />
          {/* 业务线小卡：敞口占比注释 */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, padding: '8px 4px 4px' }}>
            {BUSINESS_EXPOSURE.map((d, i) => {
              const total = BUSINESS_EXPOSURE.reduce((s, x) => s + x.value, 0);
              const pct = (d.value / total * 100).toFixed(1);
              const COLORS = ['var(--danger)', 'var(--warning)', 'var(--gold)', 'var(--info)'];
              return (
                <div key={d.name} className="row gap-2" style={{ alignItems: 'center' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS[i], flexShrink: 0 }} />
                  <span className="t-small text-2">{d.name}</span>
                  <span className="mononum t-small text-3" style={{ marginLeft: 'auto' }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* 重大风险事件 Top */}
        <Panel
          title="重大风险事件 Top"
          icon={<AlertTriangle size={13} />}
          right={
            <div className="row gap-2">
              <span className="mononum t-small text-3">本季度 · {RISK_EVENTS.length} 件</span>
            </div>
          }
          bodyClass="panel-body-0"
        >
          <DataTable<RiskEvent>
            cols={EVENT_COLS}
            rows={RISK_EVENTS}
            rowKey={(r) => r.id}
            defaultSort={{ key: 'saved', dir: 'desc' }}
            dense
          />
        </Panel>
      </div>

      {/* ── 合规水位条（EU AI Act 强制时间轴）── */}
      <Panel
        title="合规就绪水位 · EU AI Act 2026-08-02 强制截止"
        icon={<FileText size={13} />}
        right={<span className="badge" style={{ background: 'color-mix(in srgb, var(--gold) 12%, transparent)', color: 'var(--gold)', fontSize: 10.5 }}>距截止 43 天</span>}
      >
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, padding: '4px 0 4px' }}>
          {[
            { label: 'EU AI Act — 技术文档（Article 11）', pct: 96, note: '所有高风险 AI 系统已完成文档归档', color: 'var(--success)' },
            { label: '模型风险管理（MRM）合规', pct: 92, note: 'KS/PSI/AUC 监控 + 季度再验证机制完备', color: 'var(--gold)' },
            { label: '人工监督（Human Oversight, Art. 14）', pct: 88, note: 'CISO 全程介入协议签署率 88%，Q3 目标 95%', color: 'var(--info)' },
            { label: '数据治理（GDPR × EU AI Act）', pct: 94, note: '数据溯源、最小化、保留策略均已实施', color: 'var(--success)' },
            { label: 'OFAC · EU · UN · PEP 名单筛查覆盖', pct: 99, note: '4 大制裁名单实时联查，覆盖率 99%', color: 'var(--success)' },
            { label: '可解释性 / SHAP 报告（Art. 13）', pct: 83, note: '欺诈模型 SHAP 报告已覆盖，信用模型补录中', color: 'var(--warning)' },
          ].map(item => (
            <div key={item.label}>
              <div className="row spread" style={{ marginBottom: 5 }}>
                <span className="t-small text-2" style={{ fontSize: 11.5 }}>{item.label}</span>
                <span className="mononum t-small" style={{ color: item.color, fontWeight: 700, marginLeft: 8, flexShrink: 0 }}>{item.pct}%</span>
              </div>
              <ProgressBar pct={item.pct} color={item.color} height={5} />
              <div className="t-small text-3" style={{ marginTop: 4, fontSize: 10.5 }}>{item.note}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
