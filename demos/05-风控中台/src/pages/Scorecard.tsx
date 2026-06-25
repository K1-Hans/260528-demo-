import { useMemo, useState } from 'react';
import {
  Gauge, Activity, TrendingDown, AlertTriangle, RefreshCw, Layers,
  ShieldCheck, CircuitBoard, Crosshair, Info,
} from 'lucide-react';
import { PageHeader, StatCard, ProgressBar } from '../components/ui';
import { Panel } from '../components/sig';
import { StatusBadge, MeterBar, toast } from '../components/kit';
import { DataTable, type Col } from '../components/DataTable';
import Chart from '../components/Chart';
import { baseOption, axisStyle, areaGradient, cssVar } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import type { ScoreBand, ModelHealth, PsiPoint } from '../types';

// ════════════════════════════════════════════════════════════════════════
// 风险评分卡 + 模型表现监控（页面专属 mock · 全脱敏：示例消费金融 / 信用贷）
// 上半 = 信用评分卡 A–E 风险档；下半 = 欺诈/信用/AML 模型健康度（KS·AUC·PSI·误报漏报）。
// ════════════════════════════════════════════════════════════════════════

// ─── 评分分段 A–E（分越高越优质，badRate 越低）─────────────────────────────
const SCORE_BANDS: ScoreBand[] = [
  { band: 'A', range: '760–850', count: 184620, badRate: 0.42, advice: '优先授信 · 提额 / 低费率' },
  { band: 'B', range: '700–759', count: 263180, badRate: 1.18, advice: '常规准入 · 标准额度' },
  { band: 'C', range: '640–699', count: 198940, badRate: 3.64, advice: '限额准入 · 加强贷后监测' },
  { band: 'D', range: '580–639', count: 96370, badRate: 8.91, advice: '审慎准入 · 担保 / 共债核查' },
  { band: 'E', range: '300–579', count: 41260, badRate: 19.37, advice: '建议拒绝 · 转人工复核' },
];

// 风险档配色：A 绿 → E 红渐进（语义锁，只取三态 + 中间过渡）
const BAND_COLOR: Record<string, string> = {
  A: 'var(--success)',
  B: 'var(--emerald)',
  C: 'var(--warning)',
  D: 'var(--bronze)',
  E: 'var(--danger)',
};

// ─── 模型健康度（欺诈 / 信用 / AML）──────────────────────────────────────────
const MODELS: ModelHealth[] = [
  { name: 'fraud-xgb', version: 'v0612', type: '欺诈', ks: 0.58, auc: 0.91, psi: 0.07, status: '健康', fpr: 0.42, fnr: 1.83 },
  { name: 'credit-scorecard', version: 'v3.4', type: '信用', ks: 0.41, auc: 0.83, psi: 0.14, status: '需关注', fpr: 0.00, fnr: 0.00 },
  { name: 'aml-graph-gnn', version: 'v1.2', type: 'AML', ks: 0.49, auc: 0.87, psi: 0.27, status: '需再训练', fpr: 2.16, fnr: 0.94 },
  { name: 'app-takeover-lstm', version: 'v0.9', type: '欺诈', ks: 0.53, auc: 0.89, psi: 0.11, status: '需关注', fpr: 0.67, fnr: 1.21 },
];

const STATUS_TONE: Record<ModelHealth['status'], 'good' | 'warn' | 'bad'> = {
  健康: 'good', 需关注: 'warn', 需再训练: 'bad',
};

// ─── 评分分布桶（好客户 vs 坏客户，按信用分分桶）────────────────────────────
// good 绿、bad 红；优质段好客户密集，低分段坏客户抬头。
const SCORE_BUCKETS = [
  { bin: '300–399', good: 1820, bad: 5240 },
  { bin: '400–499', good: 4360, bad: 8910 },
  { bin: '500–579', good: 12480, bad: 9870 },
  { bin: '580–639', good: 38420, bad: 7560 },
  { bin: '640–699', good: 96340, bad: 6230 },
  { bin: '700–759', good: 152870, bad: 3110 },
  { bin: '760–819', good: 124960, bad: 880 },
  { bin: '820–850', good: 59660, bad: 190 },
];

// ─── PSI 漂移序列（近 30 天 · 信用评分卡 · 阈值 0.20）─────────────────────────
const PSI_THRESHOLD = 0.2;
const PSI_SERIES: PsiPoint[] = buildPsi();
function buildPsi(): PsiPoint[] {
  // 前期稳定 → 近 10 天缓升触阈（特征分布漂移，提示再训练）
  const base = [
    0.04, 0.05, 0.04, 0.06, 0.05, 0.07, 0.06, 0.08, 0.07, 0.09,
    0.08, 0.10, 0.09, 0.11, 0.10, 0.12, 0.11, 0.13, 0.12, 0.14,
    0.13, 0.15, 0.16, 0.18, 0.19, 0.21, 0.20, 0.23, 0.22, 0.27,
  ];
  return base.map((psi, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (base.length - 1 - i));
    return { date: `${d.getMonth() + 1}/${d.getDate()}`, psi: Number(psi.toFixed(2)) };
  });
}

// ─── KS 曲线（累计好/坏客户占比 · KS = 最大间距）────────────────────────────
// 由分桶逆推累计占比（从高分到低分累计），KS = 累计坏 - 累计好 的最大差。
const KS_CURVE = buildKs();
function buildKs() {
  const desc = [...SCORE_BUCKETS].reverse(); // 高分 → 低分
  const totalGood = desc.reduce((s, b) => s + b.good, 0);
  const totalBad = desc.reduce((s, b) => s + b.bad, 0);
  let cg = 0, cb = 0;
  const pts = desc.map((b, i) => {
    cg += b.good; cb += b.bad;
    return {
      idx: i + 1,
      label: b.bin,
      cumGood: Number(((cg / totalGood) * 100).toFixed(2)),
      cumBad: Number(((cb / totalBad) * 100).toFixed(2)),
    };
  });
  const withZero = [{ idx: 0, label: '', cumGood: 0, cumBad: 0 }, ...pts];
  let ksVal = 0, ksIdx = 0;
  withZero.forEach(p => {
    const gap = p.cumBad - p.cumGood;
    if (gap > ksVal) { ksVal = gap; ksIdx = p.idx; }
  });
  return { pts: withZero, ks: Number((ksVal / 100).toFixed(2)), ksIdx };
}

export default function Scorecard() {
  const { hasPermission } = useAuth();
  const canRetrain = hasPermission('strategy:write'); // 触发再训练 = 写操作（评分卡页本身只读）
  const [retraining, setRetraining] = useState<string | null>(null);

  const totalCustomers = useMemo(() => SCORE_BANDS.reduce((s, b) => s + b.count, 0), []);
  const blendedBad = useMemo(
    () => SCORE_BANDS.reduce((s, b) => s + b.count * b.badRate, 0) / totalCustomers,
    [totalCustomers],
  );
  const needRetrain = MODELS.filter(m => m.status === '需再训练');
  const maxBand = Math.max(...SCORE_BANDS.map(b => b.count));
  const maxBadRate = Math.max(...SCORE_BANDS.map(b => b.badRate));

  const triggerRetrain = (m: ModelHealth) => {
    setRetraining(m.name);
    toast(`已下发再训练任务 · ${m.name} ${m.version} · 预计 42 分钟`, 'info');
    setTimeout(() => setRetraining(null), 2200);
  };

  // ① 评分分布直方图（好客户绿 vs 坏客户红 · 叠加 bar）
  const scoreHistogram = () => ({
    ...baseOption(),
    tooltip: {
      ...(baseOption().tooltip as object), trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (v: number) => v.toLocaleString('zh-CN'),
    },
    legend: {
      top: 0, right: 0, itemWidth: 9, itemHeight: 9, icon: 'roundRect',
      textStyle: { color: cssVar('--text-3'), fontSize: 11 },
    },
    grid: { left: 8, right: 12, top: 30, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: SCORE_BUCKETS.map(b => b.bin), ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, interval: 0, rotate: 30 } },
    yAxis: { type: 'value', ...axisStyle(), splitNumber: 4, axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => v >= 1000 ? `${v / 1000}k` : `${v}` } },
    series: [
      {
        name: '好客户', type: 'bar', stack: 'pop', data: SCORE_BUCKETS.map(b => b.good),
        itemStyle: { color: cssVar('--success'), borderRadius: [0, 0, 0, 0] },
        barWidth: '62%', emphasis: { focus: 'series' },
      },
      {
        name: '坏客户', type: 'bar', stack: 'pop', data: SCORE_BUCKETS.map(b => b.bad),
        itemStyle: { color: cssVar('--danger'), borderRadius: [3, 3, 0, 0] },
        emphasis: { focus: 'series' },
      },
    ],
  });

  // ② PSI 漂移折线（超阈值 0.20 红 markLine）
  const psiDrift = () => {
    const danger = cssVar('--danger');
    return {
      ...baseOption(),
      tooltip: { ...(baseOption().tooltip as object), trigger: 'axis', valueFormatter: (v: number) => v.toFixed(2) },
      grid: { left: 8, right: 14, top: 22, bottom: 8, containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: PSI_SERIES.map(p => p.date), ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, interval: 4 } },
      yAxis: { type: 'value', min: 0, max: 0.3, ...axisStyle(), splitNumber: 3 },
      series: [{
        name: 'PSI', type: 'line', smooth: true, symbol: 'none',
        data: PSI_SERIES.map(p => p.psi),
        lineStyle: { width: 1.8, color: cssVar('--gold') },
        areaStyle: { color: areaGradient(cssVar('--gold'), 0.18) },
        markLine: {
          silent: true, symbol: 'none',
          lineStyle: { color: danger, type: 'dashed', width: 1, opacity: 0.7 },
          data: [{ yAxis: PSI_THRESHOLD }],
          label: { formatter: '漂移阈 0.20', color: danger, fontSize: 10, position: 'insideEndTop' },
        },
        markArea: {
          silent: true,
          itemStyle: { color: `color-mix(in srgb, ${danger} 7%, transparent)` },
          data: [[{ yAxis: PSI_THRESHOLD }, { yAxis: 0.3 }]],
        },
        animationDuration: 800,
      }],
    };
  };

  // ③ KS 曲线（累计好/坏占比双线 · KS = 最大间距 markLine）
  const ksCurve = () => {
    const kp = KS_CURVE.pts[KS_CURVE.ksIdx];
    return {
      ...baseOption(),
      tooltip: { ...(baseOption().tooltip as object), trigger: 'axis', valueFormatter: (v: number) => `${v.toFixed(2)}%` },
      legend: {
        top: 0, right: 0, itemWidth: 9, itemHeight: 9, icon: 'roundRect',
        textStyle: { color: cssVar('--text-3'), fontSize: 11 },
      },
      grid: { left: 8, right: 14, top: 30, bottom: 8, containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: KS_CURVE.pts.map(p => p.label || '起点'), ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, interval: 0, rotate: 30 } },
      yAxis: { type: 'value', min: 0, max: 100, ...axisStyle(), splitNumber: 4, axisLabel: { ...axisStyle().axisLabel, formatter: '{value}%' } },
      series: [
        {
          name: '累计坏客户', type: 'line', smooth: false, symbol: 'circle', symbolSize: 5,
          data: KS_CURVE.pts.map(p => p.cumBad),
          lineStyle: { width: 1.8, color: cssVar('--danger') }, itemStyle: { color: cssVar('--danger') },
          markLine: {
            silent: true, symbol: 'none',
            lineStyle: { color: cssVar('--gold'), type: 'dashed', width: 1.2 },
            label: { formatter: `KS ${KS_CURVE.ks.toFixed(2)}`, color: cssVar('--gold'), fontSize: 10, position: 'middle' },
            data: [{ xAxis: KS_CURVE.ksIdx }],
          },
        },
        {
          name: '累计好客户', type: 'line', smooth: false, symbol: 'circle', symbolSize: 5,
          data: KS_CURVE.pts.map(p => p.cumGood),
          lineStyle: { width: 1.8, color: cssVar('--success') }, itemStyle: { color: cssVar('--success') },
        },
      ],
      graphic: kp ? [{
        type: 'text', right: 16, top: 30,
        style: { text: `最大间距 @ ${kp.label}`, fill: cssVar('--text-3'), fontSize: 10 },
      }] : [],
    };
  };

  // ─── 评分卡表格列 ───────────────────────────────────────────────────────────
  const bandCols: Col<ScoreBand>[] = [
    {
      key: 'band', header: '风险档', width: 88,
      render: r => (
        <span className="row gap-2">
          <span style={{
            width: 22, height: 22, borderRadius: 'var(--r-sm)', flexShrink: 0,
            background: `color-mix(in srgb, ${BAND_COLOR[r.band]} 18%, transparent)`,
            color: BAND_COLOR[r.band], display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 12, fontWeight: 700,
          }}>{r.band}</span>
          <span className="mononum t-small text-2">{r.range}</span>
        </span>
      ),
    },
    {
      key: 'count', header: '客户数', num: true, sortable: true, width: 168,
      sortAccessor: r => r.count,
      render: r => (
        <div className="col gap-1" style={{ alignItems: 'flex-end' }}>
          <span className="mononum" style={{ color: 'var(--text-1)', fontSize: 12.5 }}>{r.count.toLocaleString('zh-CN')}</span>
          <div style={{ width: 110 }}>
            <ProgressBar pct={(r.count / maxBand) * 100} color={BAND_COLOR[r.band]} height={4} />
          </div>
        </div>
      ),
    },
    {
      key: 'badRate', header: '坏账率', num: true, sortable: true, width: 168,
      sortAccessor: r => r.badRate,
      render: r => (
        <div className="col gap-1" style={{ alignItems: 'flex-end' }}>
          <span className="mononum" style={{ color: BAND_COLOR[r.band], fontSize: 12.5, fontWeight: 600 }}>{r.badRate.toFixed(2)}%</span>
          <div style={{ width: 110 }}>
            <ProgressBar pct={(r.badRate / maxBadRate) * 100} color={BAND_COLOR[r.band]} height={4} />
          </div>
        </div>
      ),
    },
    {
      key: 'advice', header: '准入建议',
      render: r => <span className="t-small text-2">{r.advice}</span>,
    },
  ];

  // ─── 模型监控表格列 ─────────────────────────────────────────────────────────
  const modelCols: Col<ModelHealth>[] = [
    {
      key: 'name', header: '模型', width: 220,
      render: m => (
        <div className="col" style={{ gap: 2 }}>
          <span className="row gap-2" style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 13 }}>
            <span className="mono">{m.name}</span>
            <span className="mononum text-3" style={{ fontSize: 11 }}>{m.version}</span>
          </span>
          <span className="t-small text-3">{m.type}模型</span>
        </div>
      ),
    },
    {
      key: 'ks', header: 'KS', num: true, sortable: true, width: 76, sortAccessor: m => m.ks,
      render: m => <span className="mononum" style={{ color: m.ks >= 0.45 ? 'var(--success)' : m.ks >= 0.3 ? 'var(--warning)' : 'var(--danger)', fontWeight: 600 }}>{m.ks.toFixed(2)}</span>,
    },
    {
      key: 'auc', header: 'AUC', num: true, sortable: true, width: 76, sortAccessor: m => m.auc,
      render: m => <span className="mononum text-1">{m.auc.toFixed(2)}</span>,
    },
    {
      key: 'psi', header: 'PSI', num: true, sortable: true, width: 128, sortAccessor: m => m.psi,
      render: m => {
        const over = m.psi >= PSI_THRESHOLD;
        const near = !over && m.psi >= 0.1;
        const c = over ? 'var(--danger)' : near ? 'var(--warning)' : 'var(--success)';
        return (
          <div className="col gap-1" style={{ alignItems: 'flex-end' }}>
            <span className="mononum" style={{ color: c, fontWeight: 600 }}>{m.psi.toFixed(2)}</span>
            <div style={{ width: 84 }}><MeterBar pct={(m.psi / 0.3) * 100} color={c} /></div>
          </div>
        );
      },
    },
    {
      key: 'fpr', header: '误报率', num: true, sortable: true, width: 92, sortAccessor: m => m.fpr,
      render: m => m.type === '信用'
        ? <span className="text-3">—</span>
        : <span className="mononum text-2">{m.fpr.toFixed(2)}%</span>,
    },
    {
      key: 'fnr', header: '漏报率', num: true, sortable: true, width: 92, sortAccessor: m => m.fnr,
      render: m => m.type === '信用'
        ? <span className="text-3">—</span>
        : <span className="mononum" style={{ color: m.fnr >= 1.5 ? 'var(--warning)' : 'var(--text-2)' }}>{m.fnr.toFixed(2)}%</span>,
    },
    {
      key: 'status', header: '健康状态', width: 116,
      render: m => <StatusBadge status={m.status} tone={STATUS_TONE[m.status]} />,
    },
    {
      key: 'act', header: '', width: 120, align: 'right',
      render: m => {
        const urgent = m.status === '需再训练';
        if (!urgent) return <span className="t-small text-3">—</span>;
        return (
          <button
            className={`btn btn-sm ${canRetrain ? 'btn-danger' : 'btn-subtle'}`}
            disabled={!canRetrain || retraining === m.name}
            onClick={() => triggerRetrain(m)}
            title={canRetrain ? '下发再训练任务' : '需策略管理员权限'}
          >
            <RefreshCw size={12} style={retraining === m.name ? { animation: 'spin 0.7s linear infinite' } : undefined} />
            {retraining === m.name ? '下发中' : '再训练'}
          </button>
        );
      },
    },
  ];

  return (
    <div className="page page-wide">
      <PageHeader
        title="风险评分卡 · 模型表现监控"
        subtitle="信用评分 A–E 风险分档 · KS / AUC / PSI 漂移与衰减 · 误报漏报追踪"
        actions={
          <div className="row gap-2">
            <span className="live-pulse" />
            <span className="t-small text-2">监控在线 · {MODELS.length} 个模型</span>
          </div>
        }
      />

      {/* 顶部 KPI */}
      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        <StatCard label="评分客群总量" raw={totalCustomers} unit="人" change={2.8} icon={<Layers size={16} />} delayClass="reveal-1" />
        <StatCard label="综合坏账率" raw={blendedBad} unit="%" decimals={2} change={-0.6} icon={<TrendingDown size={16} />} delayClass="reveal-2" />
        <StatCard label="信用评分卡 KS" raw={0.41} unit="" decimals={2} change={-4.2} icon={<Crosshair size={16} />} delayClass="reveal-3" />
        <StatCard label="待再训练模型" raw={needRetrain.length} unit="个" icon={<AlertTriangle size={16} />} delayClass="reveal-4" />
      </div>

      {/* 再训练提示条（仅在有需再训练模型时点亮，红只在真风险出现） */}
      {needRetrain.length > 0 && (
        <div
          className="row gap-3 reveal"
          style={{
            marginBottom: 16, padding: '12px 16px', borderRadius: 'var(--r-lg)',
            background: 'color-mix(in srgb, var(--danger) 8%, var(--surface-1))',
            border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
            borderLeft: '3px solid var(--danger)',
          }}
        >
          <AlertTriangle size={17} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
              {needRetrain.map(m => m.name).join('、')} 特征分布漂移超阈（PSI ≥ {PSI_THRESHOLD.toFixed(2)}），建议触发再训练
            </div>
            <div className="t-small text-3" style={{ marginTop: 2 }}>
              群体稳定性指数突破 0.20 红线，模型区分度衰减，继续使用将抬升误判风险
            </div>
          </div>
          {!canRetrain && <span className="t-small text-3" style={{ flexShrink: 0 }}>仅策略管理员可下发</span>}
        </div>
      )}

      {/* 上半 · 评分卡：左 分档表 / 右 评分分布直方图 */}
      <div className="grid" style={{ gridTemplateColumns: '1.15fr 1fr', gap: 14, marginBottom: 16 }}>
        <Panel title="信用评分卡 · 风险分档" icon={<Gauge size={13} />} right={<span className="mononum t-small text-3">{totalCustomers.toLocaleString('zh-CN')} 人</span>} bodyClass="panel-body-0">
          <DataTable
            cols={bandCols}
            rows={SCORE_BANDS}
            rowKey={r => r.band}
          />
        </Panel>

        <Panel title="评分分布 · 好 / 坏客户" icon={<Activity size={13} />} right={<span className="t-small text-3">按信用分分桶</span>}>
          <Chart build={scoreHistogram} height={300} />
        </Panel>
      </div>

      {/* 下半 · 模型监控双图：PSI 漂移 / KS 曲线 */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <Panel
          title="PSI 漂移趋势 · 信用评分卡"
          icon={<TrendingDown size={13} />}
          right={
            <span className="row gap-1 t-small" style={{ color: PSI_SERIES[PSI_SERIES.length - 1].psi >= PSI_THRESHOLD ? 'var(--danger)' : 'var(--text-3)' }}>
              <span className="mononum" style={{ fontWeight: 600 }}>{PSI_SERIES[PSI_SERIES.length - 1].psi.toFixed(2)}</span>当前
            </span>
          }
        >
          <Chart build={psiDrift} height={260} />
        </Panel>

        <Panel title="KS 曲线 · 累计好 / 坏占比" icon={<CircuitBoard size={13} />} right={<span className="mononum t-small text-3">KS {KS_CURVE.ks.toFixed(2)}</span>}>
          <Chart build={ksCurve} height={260} />
        </Panel>
      </div>

      {/* 模型健康度清单 */}
      <Panel
        title="模型表现监控 · 健康度清单"
        icon={<ShieldCheck size={13} />}
        right={
          <span className="row gap-2 t-small text-3">
            <Info size={12} />KS↑ 区分度 · AUC↑ 排序力 · PSI↓ 稳定性
          </span>
        }
        bodyClass="panel-body-0"
      >
        <DataTable
          cols={modelCols}
          rows={MODELS}
          rowKey={m => m.name}
          rowClass={m => (m.status === '需再训练' ? 'dec-row dec-block' : '')}
          defaultSort={{ key: 'psi', dir: 'desc' }}
        />
      </Panel>
    </div>
  );
}
