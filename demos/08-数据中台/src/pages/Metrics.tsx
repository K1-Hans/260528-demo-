import { Fragment, useState, useMemo } from 'react';
import {
  BadgeCheck, AlertTriangle, ChevronDown, ChevronRight,
  User, Clock, Database, GitBranch, TrendingUp, TrendingDown, Minus,
  BarChart3,
} from 'lucide-react';
import { PageHeader, StatCard, Segmented, Sparkline, Badge } from '../components/ui';
import { Panel } from '../components/sig';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, cssVar, sem, DRAW } from '../lib/chartTheme';
import { METRICS } from '../lib/mockData';
import type { MetricDef } from '../types';

// ─── Domain 筛选选项 ──────────────────────────────────────────────────────────
type DomainFilter = 'all' | '零售' | '风险' | '增长' | '资产';

const DOMAIN_OPTS: { value: DomainFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: '零售', label: '零售' },
  { value: '风险', label: '风险' },
  { value: '增长', label: '增长' },
  { value: '资产', label: '资产' },
];

// ─── 新鲜度 stale 判断（>= 2h 标警告）────────────────────────────────────────
function parseHours(freshness: string): number {
  const m = freshness.match(/([\d.]+)\s*(h|min)/i);
  if (!m) return 0;
  const v = parseFloat(m[1]);
  return m[2].toLowerCase() === 'min' ? v / 60 : v;
}

function isStale(freshness: string): boolean {
  return parseHours(freshness) >= 2;
}

// ─── 环比趋势 chip ─────────────────────────────────────────────────────────────
function TrendChip({ change }: { change: number }) {
  const up = change > 0;
  const zero = change === 0;
  const Icon = zero ? Minus : up ? TrendingUp : TrendingDown;
  const color = zero ? 'var(--text-3)' : up ? 'var(--success)' : 'var(--danger)';
  return (
    <span
      className="row gap-1 tnum"
      style={{ fontSize: 11, fontWeight: 600, color }}
    >
      <Icon size={11} />
      {up ? '+' : ''}{change}%
    </span>
  );
}

// ─── 认证金标准徽章 ────────────────────────────────────────────────────────────
function CertBadge({ certified }: { certified: boolean }) {
  if (!certified) return (
    <span className="badge" style={{ background: 'color-mix(in srgb, var(--text-3) 10%, transparent)', color: 'var(--text-3)' }}>
      待认证
    </span>
  );
  return (
    <span
      className="badge row gap-1"
      style={{ background: 'color-mix(in srgb, var(--gold) 14%, transparent)', color: 'var(--gold)', fontWeight: 700 }}
    >
      <BadgeCheck size={11} />金标准
    </span>
  );
}

// ─── 新鲜度标签 ───────────────────────────────────────────────────────────────
function FreshnessTag({ freshness }: { freshness: string }) {
  const stale = isStale(freshness);
  return (
    <span
      className="row gap-1 tnum"
      style={{
        fontSize: 11,
        color: stale ? 'var(--warning)' : 'var(--success)',
        fontWeight: 500,
      }}
    >
      {stale ? <AlertTriangle size={11} /> : <Clock size={11} />}
      {freshness}
    </span>
  );
}

// ─── Domain tag ───────────────────────────────────────────────────────────────
const DOMAIN_COLOR: Record<string, string> = {
  '零售': '--gold',
  '风险': '--danger',
  '增长': '--emerald',
  '资产': '--info',
};

function DomainTag({ domain }: { domain: string }) {
  const c = `var(${DOMAIN_COLOR[domain] ?? '--text-3'})`;
  return (
    <span
      className="badge"
      style={{ background: `color-mix(in srgb, ${c} 12%, transparent)`, color: c }}
    >
      {domain}
    </span>
  );
}

// ─── 指标详情抽屉面板（展开态） ───────────────────────────────────────────────
function MetricDetail({ metric, onClose }: { metric: MetricDef; onClose: () => void }) {
  return (
    <Panel
      title={
        <span className="row gap-2">
          <Database size={13} style={{ color: 'var(--gold)' }} />
          {metric.name}
          <span className="t-small text-3 mononum" style={{ fontWeight: 400 }}>{metric.enName}</span>
        </span>
      }
      right={
        <button className="btn btn-subtle btn-sm" onClick={onClose}>
          收起<ChevronDown size={12} />
        </button>
      }
    >
      <div className="col gap-4">
        {/* 口径定义 */}
        <div>
          <div className="label" style={{ marginBottom: 6 }}>口径定义</div>
          <div
            className="t-small"
            style={{
              color: 'var(--text-1)',
              lineHeight: 1.7,
              padding: '10px 12px',
              borderRadius: 'var(--r-md)',
              background: 'var(--surface-2)',
              borderLeft: '2px solid var(--gold)',
            }}
          >
            {metric.definition}
          </div>
        </div>

        {/* 计算公式 */}
        <div>
          <div className="label" style={{ marginBottom: 6 }}>计算公式</div>
          <pre
            style={{
              margin: 0,
              padding: '10px 12px',
              borderRadius: 'var(--r-md)',
              background: 'var(--surface-3)',
              border: '1px solid var(--hairline)',
              fontFamily: "'Geist Mono','Geist',monospace",
              fontSize: 12,
              color: 'var(--text-1)',
              lineHeight: 1.6,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {metric.formula}
          </pre>
        </div>

        {/* 元数据 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}
        >
          <div className="col gap-1">
            <span className="label">责任 Owner</span>
            <span className="row gap-1 t-small" style={{ color: 'var(--text-1)' }}>
              <User size={12} style={{ color: 'var(--text-3)' }} />{metric.owner}
            </span>
          </div>
          <div className="col gap-1">
            <span className="label">域</span>
            <DomainTag domain={metric.domain} />
          </div>
          <div className="col gap-1">
            <span className="label">数据新鲜度</span>
            <FreshnessTag freshness={metric.freshness} />
          </div>
          <div className="col gap-1">
            <span className="label">认证状态</span>
            <CertBadge certified={metric.certified} />
          </div>
        </div>

        {/* 趋势 sparkline 大图 */}
        <div>
          <div className="label" style={{ marginBottom: 8 }}>近期趋势</div>
          <Sparkline
            data={metric.spark}
            color={metric.change >= 0 ? cssVar('--emerald') : cssVar('--danger')}
            width={280}
            height={54}
          />
        </div>
      </div>
    </Panel>
  );
}

// ─── 单指标卡 ─────────────────────────────────────────────────────────────────
function MetricCard({
  metric,
  selected,
  onSelect,
}: {
  metric: MetricDef;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const stale = isStale(metric.freshness);
  return (
    <div
      className="metric-card card card-hover reveal"
      style={{
        cursor: 'pointer',
        borderColor: selected ? 'var(--gold)' : stale ? 'color-mix(in srgb, var(--warning) 40%, var(--hairline))' : 'var(--hairline)',
        boxShadow: selected ? '0 0 0 2px color-mix(in srgb, var(--gold) 24%, transparent)' : undefined,
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onClick={() => onSelect(metric.id)}
    >
      {/* 卡头：名称 + 认证 + 域 */}
      <div className="spread" style={{ marginBottom: 8 }}>
        <div className="col gap-1">
          <div className="row gap-2">
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{metric.name}</span>
            <CertBadge certified={metric.certified} />
          </div>
          <span
            className="mononum"
            style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.04em', fontFamily: "'Geist Mono',monospace" }}
          >
            {metric.enName}
          </span>
        </div>
        <DomainTag domain={metric.domain} />
      </div>

      {/* 大数字 + 趋势 */}
      <div className="row spread" style={{ alignItems: 'flex-end', marginBottom: 10 }}>
        <div>
          <div className="row gap-1" style={{ alignItems: 'baseline' }}>
            <span
              className="kpi-value mononum"
              style={{ fontSize: 28, lineHeight: 1, letterSpacing: '-0.02em' }}
            >
              {metric.value.toLocaleString('zh-CN', {
                minimumFractionDigits: metric.decimals,
                maximumFractionDigits: metric.decimals,
              })}
            </span>
            <span
              className="kpi-unit"
              style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 2 }}
            >
              {metric.unit}
            </span>
          </div>
          <div style={{ marginTop: 5 }}>
            <TrendChip change={metric.change} />
          </div>
        </div>
        <Sparkline
          data={metric.spark}
          color={metric.change >= 0 ? cssVar('--emerald') : cssVar('--danger')}
          width={72}
          height={28}
        />
      </div>

      {/* 底栏：owner + 新鲜度 + 展开按钮 */}
      <div
        className="row spread"
        style={{
          paddingTop: 8,
          borderTop: '1px solid var(--hairline)',
          alignItems: 'center',
        }}
      >
        <div className="row gap-2">
          <span className="row gap-1 t-small text-3">
            <User size={11} />{metric.owner}
          </span>
          <FreshnessTag freshness={metric.freshness} />
        </div>
        <span
          className="row gap-1 t-small"
          style={{ color: selected ? 'var(--gold)' : 'var(--text-3)' }}
        >
          {selected ? <><ChevronDown size={12} />收起</> : <><ChevronRight size={12} />口径</>}
        </span>
      </div>
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────
export default function Metrics() {
  const [domain, setDomain] = useState<DomainFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => METRICS.filter(m => domain === 'all' || m.domain === domain),
    [domain],
  );

  const certifiedCount = METRICS.filter(m => m.certified).length;
  const uncertifiedCount = METRICS.filter(m => !m.certified).length;
  const staleCount = METRICS.filter(m => isStale(m.freshness)).length;
  const avgFreshnessH = parseFloat(
    (METRICS.reduce((s, m) => s + parseHours(m.freshness), 0) / Math.max(METRICS.length, 1)).toFixed(1),
  );

  const selectedMetric = selectedId ? METRICS.find(m => m.id === selectedId) ?? null : null;

  const handleSelect = (id: string) => {
    setSelectedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="page page-wide">
      <PageHeader
        title="指标库"
        subtitle="认证指标（金标准）· 口径定义 + 计算公式 + 血缘 Owner + 数据新鲜度"
        actions={
          <span className="row gap-2">
            <Badge color="var(--gold)">
              <BadgeCheck size={11} style={{ marginRight: 3 }} />
              {certifiedCount} 个金标准
            </Badge>
            {staleCount > 0 && (
              <Badge color="var(--warning)">
                <AlertTriangle size={11} style={{ marginRight: 3 }} />
                {staleCount} 个 stale
              </Badge>
            )}
          </span>
        }
      />

      {/* KPI 卡带 */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}
      >
        <StatCard
          label="认证指标数"
          raw={certifiedCount}
          unit="个"
          icon={<BadgeCheck size={16} />}
          delayClass="d1"
        />
        <StatCard
          label="平均新鲜度"
          raw={avgFreshnessH}
          unit="h"
          decimals={1}
          icon={<Clock size={16} />}
          delayClass="d2"
        />
        <StatCard
          label="今日复用次数"
          raw={METRICS.reduce((s, m) => s + Math.round(m.value / 10), 0)}
          unit="次"
          icon={<GitBranch size={16} />}
          delayClass="d3"
        />
        <StatCard
          label="未认证指标"
          raw={uncertifiedCount}
          unit="个"
          icon={<Database size={16} />}
          delayClass="d4"
        />
      </div>

      {/* 筛选栏 */}
      <div className="row gap-3" style={{ marginBottom: 16, alignItems: 'center' }}>
        <span className="label" style={{ flexShrink: 0 }}>按域筛选</span>
        <Segmented<DomainFilter>
          options={DOMAIN_OPTS}
          value={domain}
          onChange={setDomain}
        />
        <span className="t-small text-3 mononum" style={{ marginLeft: 'auto' }}>
          {filtered.length} 个指标
        </span>
      </div>

      {/* 主体：指标网格 + 副栏图表 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
        {/* 指标卡网格 */}
        <div>
          <div
            className="ledger-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}
          >
            {filtered.map(m => (
              <Fragment key={m.id}>
                <MetricCard
                  metric={m}
                  selected={selectedId === m.id}
                  onSelect={handleSelect}
                />
              </Fragment>
            ))}
          </div>

          {/* 展开详情行（插入网格下方）*/}
          {selectedMetric && (
            <div style={{ marginTop: 12 }}>
              <MetricDetail metric={selectedMetric} onClose={() => setSelectedId(null)} />
            </div>
          )}
        </div>

        {/* 副栏：域分布图 + 新鲜度警告 */}
        <div className="col gap-4">
          {/* 各指标当前值横条 */}
          <Panel
            title="各指标环比变化"
            icon={<BarChart3 size={13} />}
          >
            <Chart
              height={220}
              deps={[domain]}
              build={() => {
                const ax = axisStyle();
                const data = filtered.map(m => ({
                  name: m.name,
                  value: m.change,
                  itemStyle: {
                    color: m.change >= 0 ? cssVar('--emerald') : cssVar('--danger'),
                    borderRadius: [0, 4, 4, 0],
                  },
                }));
                return {
                  ...baseOption(),
                  ...DRAW,
                  backgroundColor: 'transparent',
                  grid: { left: 8, right: 20, top: 8, bottom: 8, containLabel: true },
                  xAxis: {
                    type: 'value',
                    ...ax,
                    axisLabel: {
                      ...ax.axisLabel,
                      formatter: (v: number) => `${v > 0 ? '+' : ''}${v}%`,
                    },
                  },
                  yAxis: {
                    type: 'category',
                    data: data.map(d => d.name),
                    ...ax,
                    axisLabel: { ...ax.axisLabel, fontSize: 11 },
                  },
                  series: [{
                    type: 'bar',
                    barMaxWidth: 18,
                    data: data.map(d => ({ value: d.value, itemStyle: d.itemStyle })),
                    label: {
                      show: true,
                      position: 'right',
                      color: cssVar('--text-3'),
                      fontSize: 10,
                      fontFamily: "'Geist Mono','Geist',sans-serif",
                      formatter: (p: { value: number }) => `${p.value > 0 ? '+' : ''}${p.value}%`,
                    },
                  }],
                };
              }}
            />
          </Panel>

          {/* 域指标分布 */}
          <Panel
            title="域指标分布"
            icon={<Database size={13} />}
          >
            <Chart
              height={180}
              deps={[]}
              build={() => {
                const domains = ['零售', '风险', '增长', '资产'];
                const data = domains.map(d => ({
                  name: d,
                  value: METRICS.filter(m => m.domain === d).length,
                  itemStyle: { color: cssVar(DOMAIN_COLOR[d] ?? '--gold') },
                }));
                return {
                  ...baseOption(),
                  backgroundColor: 'transparent',
                  tooltip: {
                    ...((baseOption() as { tooltip: Record<string, unknown> }).tooltip),
                    trigger: 'item',
                    formatter: '{b}: {c} 个',
                  },
                  series: [{
                    type: 'pie',
                    radius: ['40%', '70%'],
                    center: ['50%', '50%'],
                    data,
                    label: {
                      show: true,
                      color: cssVar('--text-2'),
                      fontSize: 11,
                      fontFamily: "'Geist','PingFang SC',sans-serif",
                      formatter: '{b}\n{c}个',
                    },
                    itemStyle: { borderColor: cssVar('--surface-1'), borderWidth: 2 },
                  }],
                };
              }}
            />
          </Panel>

          {/* 新鲜度警告列表 */}
          {staleCount > 0 && (
            <Panel
              title="新鲜度告警"
              icon={<AlertTriangle size={13} style={{ color: 'var(--warning)' }} />}
            >
              <div className="col gap-2">
                {METRICS.filter(m => isStale(m.freshness)).map(m => (
                  <div
                    key={m.id}
                    className="sem-card"
                    style={{
                      borderLeft: '2px solid var(--warning)',
                      background: 'color-mix(in srgb, var(--warning) 6%, var(--surface-2))',
                    }}
                  >
                    <div className="row spread">
                      <span className="t-small" style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                        {m.name}
                      </span>
                      <FreshnessTag freshness={m.freshness} />
                    </div>
                    <div className="t-small text-3" style={{ marginTop: 3, lineHeight: 1.5 }}>
                      Owner: {m.owner} · {m.domain}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* 认证 vs 未认证 */}
          <Panel
            title="认证覆盖"
            icon={<BadgeCheck size={13} style={{ color: 'var(--gold)' }} />}
          >
            <Chart
              height={130}
              deps={[]}
              build={() => {
                const total = METRICS.length;
                const certified = certifiedCount;
                return {
                  ...baseOption(),
                  backgroundColor: 'transparent',
                  tooltip: {
                    ...((baseOption() as { tooltip: Record<string, unknown> }).tooltip),
                    trigger: 'item',
                    formatter: '{b}: {c} 个 ({d}%)',
                  },
                  series: [{
                    type: 'pie',
                    radius: ['50%', '72%'],
                    center: ['50%', '50%'],
                    data: [
                      {
                        name: '金标准认证',
                        value: certified,
                        itemStyle: { color: accent() },
                      },
                      {
                        name: '待认证',
                        value: total - certified,
                        itemStyle: { color: cssVar('--surface-3') },
                      },
                    ],
                    label: {
                      show: true,
                      color: cssVar('--text-2'),
                      fontSize: 11,
                      fontFamily: "'Geist','PingFang SC',sans-serif",
                      formatter: '{b}: {c}',
                    },
                    itemStyle: { borderColor: cssVar('--surface-1'), borderWidth: 2 },
                  }],
                  graphic: [{
                    type: 'text',
                    left: 'center',
                    top: '40%',
                    style: {
                      text: `${Math.round((certified / total) * 100)}%`,
                      fill: accent(),
                      font: `700 18px 'Geist Mono','Geist',monospace`,
                    },
                  }],
                };
              }}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}
