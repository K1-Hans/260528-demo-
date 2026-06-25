// ════════════════════════════════════════════════════════════════════════
// 数据源接入态（多源接入健康度） · perm: datasource:read
// ════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import {
  Database, Wifi, WifiOff, AlertTriangle, Activity, Clock, Shield,
  BarChart2, RefreshCw, CheckCircle2,
} from 'lucide-react';
import { PageHeader, StatCard, Badge } from '../components/ui';
import { Panel } from '../components/sig';
import { DataTable, type Col } from '../components/DataTable';
import Chart from '../components/Chart';
import { useAuth } from '../contexts/AuthContext';
import type { DataSource, SourceCategory } from '../types';
import {
  baseOption, axisStyle, cssVar, accent, pass, review, DRAW,
} from '../lib/chartTheme';
import { fmt } from '../lib/hooks';

// ─── 页面专属 mock 数据（14 条，六类，1–2 个 degraded/error）────────────────
const MOCK_SOURCES: DataSource[] = [
  // 交易
  {
    id: 'tx-001', name: '核心交易流水', category: '交易', status: 'connected',
    qps: 12480, latencyMs: 8, freshness: '< 500ms', coverage: 99.7,
  },
  {
    id: 'tx-002', name: '信用贷支用日志', category: '交易', status: 'connected',
    qps: 3250, latencyMs: 11, freshness: '< 1s', coverage: 98.9,
  },
  {
    id: 'tx-003', name: '提现与转账记录', category: '交易', status: 'degraded',
    qps: 890, latencyMs: 142, freshness: '< 3s', coverage: 87.2,
  },
  // 设备指纹
  {
    id: 'fp-001', name: '移动端设备指纹库', category: '设备指纹', status: 'connected',
    qps: 8760, latencyMs: 14, freshness: '< 2s', coverage: 96.4,
  },
  {
    id: 'fp-002', name: 'Web 浏览器指纹', category: '设备指纹', status: 'connected',
    qps: 4320, latencyMs: 19, freshness: '< 2s', coverage: 94.1,
  },
  // 行为
  {
    id: 'beh-001', name: '用户操作行为序列', category: '行为', status: 'connected',
    qps: 22100, latencyMs: 6, freshness: '< 200ms', coverage: 99.2,
  },
  {
    id: 'beh-002', name: 'APP 滑动触控模型', category: '行为', status: 'connected',
    qps: 18300, latencyMs: 9, freshness: '< 500ms', coverage: 97.8,
  },
  {
    id: 'beh-003', name: '登录异常行为检测', category: '行为', status: 'error',
    qps: 0, latencyMs: 0, freshness: '数据中断', coverage: 0,
  },
  // 征信
  {
    id: 'cr-001', name: '人行征信报告接口', category: '征信', status: 'connected',
    qps: 420, latencyMs: 320, freshness: '实时拉取', coverage: 92.5,
  },
  {
    id: 'cr-002', name: '第三方征信评分源', category: '征信', status: 'degraded',
    qps: 180, latencyMs: 680, freshness: '> 10s', coverage: 78.3,
  },
  // 名单
  {
    id: 'ls-001', name: 'OFAC·UN·EU 制裁名单', category: '名单', status: 'connected',
    qps: 65, latencyMs: 28, freshness: '每日 T+0 更新', coverage: 100,
  },
  {
    id: 'ls-002', name: 'PEP 政要公众人物库', category: '名单', status: 'connected',
    qps: 40, latencyMs: 32, freshness: '每日 T+0 更新', coverage: 100,
  },
  {
    id: 'ls-003', name: '央行反洗钱可疑名单', category: '名单', status: 'connected',
    qps: 58, latencyMs: 25, freshness: '每日 T+0 更新', coverage: 100,
  },
  // 关系
  {
    id: 'rel-001', name: '账户关系图谱 API', category: '关系', status: 'connected',
    qps: 1820, latencyMs: 45, freshness: '< 5s', coverage: 95.6,
  },
];

const CATEGORY_ORDER: SourceCategory[] = ['交易', '设备指纹', '行为', '征信', '名单', '关系'];

const CATEGORY_ICONS: Record<SourceCategory, React.ReactNode> = {
  '交易':    <Database size={13} />,
  '设备指纹': <Shield size={13} />,
  '行为':    <Activity size={13} />,
  '征信':    <BarChart2 size={13} />,
  '名单':    <CheckCircle2 size={13} />,
  '关系':    <Wifi size={13} />,
};

// ─── 状态视觉 ────────────────────────────────────────────────────────────────
function statusColor(s: DataSource['status']): string {
  if (s === 'connected') return 'var(--success)';
  if (s === 'degraded')  return 'var(--warning)';
  return 'var(--danger)';
}

function StatusDot({ status }: { status: DataSource['status'] }) {
  const c = statusColor(status);
  return (
    <span
      style={{
        display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
        background: c, marginRight: 6, flexShrink: 0,
        boxShadow: status === 'connected' ? `0 0 0 2px color-mix(in srgb,${c} 22%,transparent)` : undefined,
      }}
    />
  );
}

function StatusChip({ status, reason }: { status: DataSource['status']; reason?: string }) {
  const label = status === 'connected' ? '正常' : status === 'degraded' ? '降级' : '异常';
  const c = statusColor(status);
  return (
    <span className="row gap-1 mononum" style={{ fontSize: 11, fontWeight: 600, color: c }}>
      <StatusDot status={status} />{label}
      {reason && <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: 4 }}>{reason}</span>}
    </span>
  );
}

// ─── 延迟条形图（ECharts 真图）────────────────────────────────────────────────
function LatencyChart({ sources }: { sources: DataSource[] }) {
  const active = sources.filter(s => s.status !== 'error' && s.latencyMs > 0);
  const sorted = [...active].sort((a, b) => b.latencyMs - a.latencyMs);

  return (
    <Chart
      height={Math.max(220, sorted.length * 32 + 48)}
      deps={[sorted.map(s => s.id).join()]}
      build={() => {
        const base = baseOption();
        const colors = sorted.map(s =>
          s.status === 'degraded' ? review() : pass(),
        );
        return {
          ...base,
          grid: { left: 8, right: 40, top: 12, bottom: 8, containLabel: true },
          xAxis: {
            type: 'value',
            ...axisStyle(),
            axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => `${v}ms` },
          },
          yAxis: {
            type: 'category',
            data: sorted.map(s => s.name),
            ...axisStyle(),
            axisLabel: {
              ...axisStyle().axisLabel,
              fontSize: 11,
              width: 120,
              overflow: 'truncate',
            },
            inverse: false,
          },
          series: [{
            type: 'bar',
            data: sorted.map((s, i) => ({
              value: s.latencyMs,
              itemStyle: { color: colors[i], borderRadius: [0, 4, 4, 0] },
            })),
            label: {
              show: true, position: 'right',
              color: cssVar('--text-2'), fontSize: 11,
              fontFamily: "'Geist Mono',monospace",
              formatter: (p: { value: number }) => `${p.value}ms`,
            },
            barMaxWidth: 22,
            ...DRAW,
          }],
          tooltip: {
            ...(base.tooltip as object),
            trigger: 'axis',
            formatter: (params: { name: string; value: number }[]) => {
              const p = params[0];
              return `<span style="font-size:12px;color:var(--text-1)">${p.name}</span><br/><span class="mononum" style="color:var(--gold)">${p.value} ms</span>`;
            },
          },
        };
      }}
    />
  );
}

// ─── QPS 实时趋势线（6 条数据源抽样 · 模拟波动）─────────────────────────────
const QPS_LABELS = ['行为序列', '交易流水', '设备指纹', '账户图谱', '信用贷支用', 'APP触控'];
function genSeries(base: number, n = 20) {
  return Array.from({ length: n }, (_, i) => Math.round(base + Math.sin(i * 0.7) * base * 0.12 + (Math.random() - 0.5) * base * 0.08));
}
const QPS_DATA = [
  genSeries(22100), genSeries(12480), genSeries(8760),
  genSeries(1820), genSeries(3250), genSeries(18300),
];
const TIME_LABELS = Array.from({ length: 20 }, (_, i) => {
  const d = new Date(); d.setSeconds(d.getSeconds() - (19 - i) * 3); return `${d.getMinutes()}:${String(d.getSeconds()).padStart(2, '0')}`;
});

function QpsTrendChart() {
  const colors = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6'];
  return (
    <Chart
      height={220}
      build={() => {
        const base = baseOption();
        return {
          ...base,
          grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
          legend: {
            data: QPS_LABELS,
            top: 0,
            textStyle: { color: cssVar('--text-2'), fontSize: 11 },
            itemWidth: 14, itemHeight: 3,
          },
          xAxis: { type: 'category', data: TIME_LABELS, ...axisStyle() },
          yAxis: {
            type: 'value', ...axisStyle(),
            axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v) },
          },
          series: QPS_LABELS.map((name, i) => ({
            name, type: 'line', smooth: true,
            symbol: 'none',
            lineStyle: { width: 1.6, color: cssVar(colors[i]) },
            itemStyle: { color: cssVar(colors[i]) },
            data: QPS_DATA[i],
            animationDuration: 800 + i * 80,
            animationEasing: 'cubicOut',
          })),
        };
      }}
    />
  );
}

// ─── 类别覆盖率小图（雷达）────────────────────────────────────────────────────
function CoverageRadar({ byCategory }: { byCategory: Record<SourceCategory, number> }) {
  const cats = CATEGORY_ORDER;
  return (
    <Chart
      height={200}
      deps={[JSON.stringify(byCategory)]}
      build={() => {
        const base = baseOption();
        return {
          ...base,
          radar: {
            indicator: cats.map(c => ({ name: c, max: 100 })),
            axisName: { color: cssVar('--text-2'), fontSize: 11 },
            splitLine: { lineStyle: { color: cssVar('--hairline') } },
            splitArea: { areaStyle: { color: ['transparent'] } },
            axisLine: { lineStyle: { color: cssVar('--hairline') } },
          },
          series: [{
            type: 'radar',
            data: [{
              value: cats.map(c => byCategory[c] ?? 0),
              name: '平均覆盖率',
              areaStyle: { color: `color-mix(in srgb, ${accent()} 18%, transparent)` },
              lineStyle: { color: accent(), width: 1.6 },
              itemStyle: { color: accent() },
            }],
            animationDuration: 800,
          }],
        };
      }}
    />
  );
}

// ─── 数据源卡片（每类一组）───────────────────────────────────────────────────
function SourceCard({ source }: { source: DataSource }) {
  const isErr = source.status === 'error';
  const isDeg = source.status === 'degraded';
  const borderColor = isErr ? 'var(--danger)' : isDeg ? 'var(--warning)' : undefined;

  const ERROR_REASON: Record<string, string> = {
    'beh-003': '上游服务端口 502 · 恢复 ETA 14:30',
    'tx-003': 'P95 延迟 >100ms · 自动限速降级',
    'cr-002': 'API 配额耗尽 · 次日 00:00 重置',
  };

  return (
    <div
      className="card"
      style={{
        padding: '14px 16px',
        borderLeft: borderColor ? `2px solid ${borderColor}` : undefined,
        opacity: isErr ? 0.85 : 1,
      }}
    >
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="row gap-2">
          <span style={{ color: 'var(--text-3)' }}>{CATEGORY_ICONS[source.category]}</span>
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>{source.name}</span>
        </div>
        <StatusChip status={source.status} />
      </div>

      {(isErr || isDeg) && ERROR_REASON[source.id] && (
        <div style={{
          background: `color-mix(in srgb, ${statusColor(source.status)} 10%, transparent)`,
          borderRadius: 7, padding: '5px 10px', marginBottom: 10, fontSize: 11,
          color: statusColor(source.status), display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <AlertTriangle size={11} />
          {ERROR_REASON[source.id]}
        </div>
      )}

      <div className="row" style={{ gap: 20 }}>
        <div>
          <div className="label" style={{ fontSize: 10, marginBottom: 2 }}>QPS</div>
          <div className="mononum" style={{ fontSize: 18, fontWeight: 700, color: isErr ? 'var(--text-3)' : 'var(--text-1)', letterSpacing: '-0.02em' }}>
            {isErr ? '—' : source.qps >= 1000 ? `${(source.qps / 1000).toFixed(1)}k` : fmt(source.qps)}
          </div>
        </div>
        <div>
          <div className="label" style={{ fontSize: 10, marginBottom: 2 }}>延迟</div>
          <div className="mononum" style={{ fontSize: 18, fontWeight: 700, color: isErr ? 'var(--text-3)' : isDeg && source.latencyMs > 100 ? 'var(--warning)' : 'var(--text-1)', letterSpacing: '-0.02em' }}>
            {isErr ? '—' : `${fmt(source.latencyMs)}ms`}
          </div>
        </div>
        <div>
          <div className="label" style={{ fontSize: 10, marginBottom: 2 }}>覆盖率</div>
          <div className="mononum" style={{ fontSize: 18, fontWeight: 700, color: isErr ? 'var(--text-3)' : source.coverage < 85 ? 'var(--warning)' : 'var(--text-1)', letterSpacing: '-0.02em' }}>
            {isErr ? '—' : `${source.coverage.toFixed(1)}%`}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="label" style={{ fontSize: 10, marginBottom: 2 }}>数据新鲜度</div>
          <div style={{ fontSize: 12, color: isErr ? 'var(--danger)' : 'var(--text-2)', fontWeight: 500 }}>
            <Clock size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {source.freshness}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 表格列定义（延迟 / 覆盖率横向比较）────────────────────────────────────
const TABLE_COLS: Col<DataSource>[] = [
  {
    key: 'status', header: '状态', width: 80,
    render: (r) => <StatusChip status={r.status} />,
  },
  {
    key: 'name', header: '数据源名称',
    render: (r) => (
      <span className="row gap-2">
        <span style={{ color: 'var(--text-3)' }}>{CATEGORY_ICONS[r.category]}</span>
        <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>{r.name}</span>
      </span>
    ),
  },
  {
    key: 'category', header: '类别', width: 90,
    render: (r) => (
      <Badge color="var(--text-2)">
        {r.category}
      </Badge>
    ),
  },
  {
    key: 'qps', header: 'QPS', num: true, sortable: true, width: 90,
    render: (r) => (
      <span className="mononum" style={{ color: r.status === 'error' ? 'var(--text-3)' : 'var(--text-1)' }}>
        {r.status === 'error' ? '—' : r.qps >= 1000 ? `${(r.qps / 1000).toFixed(1)}k` : fmt(r.qps)}
      </span>
    ),
  },
  {
    key: 'latencyMs', header: '延迟 (ms)', num: true, sortable: true, width: 100,
    render: (r) => (
      <span className="mononum" style={{
        color: r.status === 'error' ? 'var(--text-3)' : r.latencyMs > 200 ? 'var(--warning)' : r.status === 'degraded' ? 'var(--warning)' : 'var(--success)',
        fontWeight: 600,
      }}>
        {r.status === 'error' ? '—' : `${fmt(r.latencyMs)} ms`}
      </span>
    ),
  },
  {
    key: 'coverage', header: '覆盖率', num: true, sortable: true, width: 100,
    render: (r) => (
      <span className="mononum" style={{
        color: r.status === 'error' ? 'var(--text-3)' : r.coverage < 85 ? 'var(--warning)' : 'var(--success)',
        fontWeight: 600,
      }}>
        {r.status === 'error' ? '—' : `${r.coverage.toFixed(1)}%`}
      </span>
    ),
  },
  {
    key: 'freshness', header: '数据新鲜度',
    render: (r) => (
      <span style={{ fontSize: 12, color: r.status === 'error' ? 'var(--danger)' : 'var(--text-2)' }}>
        {r.freshness}
      </span>
    ),
  },
];

// ════════════════════════════════════════════════════════════════════════
// 主页面
// ════════════════════════════════════════════════════════════════════════
export default function DataSources() {
  const { hasPermission } = useAuth();
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  if (!hasPermission('datasource:read')) {
    return (
      <div className="page">
        <PageHeader title="数据源接入态" subtitle="权限不足" />
        <p style={{ color: 'var(--text-3)', padding: 24 }}>当前角色无 datasource:read 权限，请联系管理员。</p>
      </div>
    );
  }

  // ─── 统计聚合 ──────────────────────────────────────────────────────────────
  const total = MOCK_SOURCES.length;
  const healthy = MOCK_SOURCES.filter(s => s.status === 'connected').length;
  const degraded = MOCK_SOURCES.filter(s => s.status === 'degraded').length;
  const errored = MOCK_SOURCES.filter(s => s.status === 'error').length;
  const activeSources = MOCK_SOURCES.filter(s => s.latencyMs > 0);
  const avgLatency = activeSources.length
    ? Math.round(activeSources.reduce((a, s) => a + s.latencyMs, 0) / activeSources.length)
    : 0;
  const totalQps = MOCK_SOURCES.reduce((a, s) => a + s.qps, 0);

  // 类别平均覆盖率（雷达图用）
  const byCategoryAvgCov = CATEGORY_ORDER.reduce<Record<SourceCategory, number>>((acc, cat) => {
    const catSources = MOCK_SOURCES.filter(s => s.category === cat && s.status !== 'error');
    acc[cat] = catSources.length
      ? catSources.reduce((a, s) => a + s.coverage, 0) / catSources.length
      : 0;
    return acc;
  }, {} as Record<SourceCategory, number>);

  // 分类卡片分组
  const grouped = CATEGORY_ORDER.reduce<Record<SourceCategory, DataSource[]>>((acc, cat) => {
    acc[cat] = MOCK_SOURCES.filter(s => s.category === cat);
    return acc;
  }, {} as Record<SourceCategory, DataSource[]>);

  return (
    <div className="page page-wide">
      <PageHeader
        title="数据源接入态"
        subtitle="多源接入健康度监控 · 交易 / 设备指纹 / 行为 / 征信 / 名单 / 关系 六类"
        actions={
          <div className="row gap-2">
            <button
              className={`btn ${viewMode === 'card' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('card')}
              style={{ fontSize: 12 }}
            >
              卡片视图
            </button>
            <button
              className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('table')}
              style={{ fontSize: 12 }}
            >
              列表视图
            </button>
            <button className="btn btn-ghost" style={{ fontSize: 12 }}>
              <RefreshCw size={13} style={{ marginRight: 4 }} />
              刷新
            </button>
          </div>
        }
      />

      {/* ── KPI 行 ─────────────────────────────────────────────────────── */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard
          label="总接入数据源"
          raw={total}
          unit="个"
          icon={<Database size={14} />}
          delayClass="delay-1"
        />
        <StatCard
          label="健康接入源"
          raw={healthy}
          unit="个"
          change={0}
          icon={<CheckCircle2 size={14} />}
          delayClass="delay-2"
        />
        <StatCard
          label="平均接入延迟"
          raw={avgLatency}
          unit="ms"
          icon={<Clock size={14} />}
          delayClass="delay-3"
        />
        <StatCard
          label="汇总实时 QPS"
          raw={totalQps}
          change={3.2}
          icon={<Activity size={14} />}
          delayClass="delay-4"
        />
      </div>

      {/* ── 降级 / 错误告警横幅 ────────────────────────────────────────── */}
      {(degraded > 0 || errored > 0) && (
        <div className="row gap-8" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          {MOCK_SOURCES.filter(s => s.status === 'error').map(s => (
            <div key={s.id} className="row gap-2" style={{
              background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--danger) 28%, transparent)',
              borderRadius: 10, padding: '7px 14px', fontSize: 12,
              color: 'var(--danger)', fontWeight: 500,
            }}>
              <WifiOff size={13} />
              <strong>{s.name}</strong>
              <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>· 接入中断 · 上游排查中</span>
            </div>
          ))}
          {MOCK_SOURCES.filter(s => s.status === 'degraded').map(s => (
            <div key={s.id} className="row gap-2" style={{
              background: 'color-mix(in srgb, var(--warning) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--warning) 28%, transparent)',
              borderRadius: 10, padding: '7px 14px', fontSize: 12,
              color: 'var(--warning)', fontWeight: 500,
            }}>
              <AlertTriangle size={13} />
              <strong>{s.name}</strong>
              <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>· 降级运行 · 延迟偏高</span>
            </div>
          ))}
        </div>
      )}

      {/* ── 主图表行 ────────────────────────────────────────────────────── */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 14, marginBottom: 14 }}>
        <Panel
          title="接入延迟横向对比"
          icon={<Clock size={13} />}
          right={
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              <span style={{ color: 'var(--success)', marginRight: 10 }}>■ 正常</span>
              <span style={{ color: 'var(--warning)' }}>■ 降级</span>
            </span>
          }
          bodyClass="panel-body"
        >
          <LatencyChart sources={MOCK_SOURCES} />
        </Panel>

        <Panel
          title="类别平均覆盖率"
          icon={<BarChart2 size={13} />}
          bodyClass="panel-body"
        >
          <CoverageRadar byCategory={byCategoryAvgCov} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', marginTop: 8 }}>
            {CATEGORY_ORDER.map(cat => (
              <div key={cat} className="row gap-1" style={{ fontSize: 11 }}>
                <span style={{ color: 'var(--text-3)' }}>{CATEGORY_ICONS[cat]}</span>
                <span style={{ color: 'var(--text-2)' }}>{cat}</span>
                <span className="mononum" style={{ color: 'var(--gold)', fontWeight: 600, marginLeft: 'auto' }}>
                  {byCategoryAvgCov[cat].toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── QPS 实时趋势 ────────────────────────────────────────────────── */}
      <Panel
        title="实时 QPS 趋势（主要数据源）"
        icon={<Activity size={13} />}
        right={<span style={{ fontSize: 11, color: 'var(--text-3)' }}>采样间隔 3s</span>}
        bodyClass="panel-body"
        style={{ marginBottom: 14 }}
      >
        <QpsTrendChart />
      </Panel>

      {/* ── 卡片 / 列表主视图 ───────────────────────────────────────────── */}
      {viewMode === 'card' ? (
        <div>
          {CATEGORY_ORDER.map(cat => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div className="row gap-2" style={{ marginBottom: 10, alignItems: 'center' }}>
                <span style={{ color: 'var(--text-3)' }}>{CATEGORY_ICONS[cat]}</span>
                <span className="section-title">{cat}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 6 }}>
                  {grouped[cat].filter(s => s.status === 'connected').length} / {grouped[cat].length} 正常
                </span>
              </div>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 10 }}>
                {grouped[cat].map(s => <SourceCard key={s.id} source={s} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Panel
          title="数据源清单"
          icon={<Database size={13} />}
          right={
            <span className="mononum" style={{ fontSize: 11, color: 'var(--text-3)' }}>
              <span style={{ color: 'var(--success)', marginRight: 8 }}>
                <CheckCircle2 size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />{healthy} 正常
              </span>
              {degraded > 0 && (
                <span style={{ color: 'var(--warning)', marginRight: 8 }}>
                  <AlertTriangle size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />{degraded} 降级
                </span>
              )}
              {errored > 0 && (
                <span style={{ color: 'var(--danger)' }}>
                  <WifiOff size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />{errored} 异常
                </span>
              )}
            </span>
          }
          bodyClass="panel-body-0"
        >
          <DataTable
            cols={TABLE_COLS}
            rows={MOCK_SOURCES}
            rowKey={(r) => r.id}
            defaultSort={{ key: 'latencyMs', dir: 'desc' }}
          />
        </Panel>
      )}
    </div>
  );
}
