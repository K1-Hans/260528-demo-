import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, BellOff, Plus, ArrowRight, ShieldAlert, TrendingUp,
  DollarSign, AlertTriangle, Activity, Wifi,
} from 'lucide-react';
import { PageHeader, Card, StatCard, SectionTitle, Badge, EmptyState } from '../components/ui';
import { StatusBadge, Toolbar } from '../components/kit';
import { DataTable } from '../components/DataTable';
import type { Col } from '../components/DataTable';
import Chart from '../components/Chart';
import { baseOption, axisStyle, sem, cssVar, areaGradient } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import { ALERT_RULES, ALERT_EVENTS, appName } from '../lib/mockData';
import type { AlertRule, AlertEvent, AlertRuleType, EventState, AlertLevel } from '../types';

// ── 颜色映射 ─────────────────────────────────────────────────────────────────
const SEVERITY_COLOR: Record<AlertLevel, string> = {
  danger: 'var(--danger)',
  warn: 'var(--warning)',
  info: 'var(--gold)',
};

const SEVERITY_TONE: Record<AlertLevel, 'bad' | 'warn' | 'info'> = {
  danger: 'bad',
  warn: 'warn',
  info: 'info',
};

const RULE_TYPE_COLOR: Record<AlertRuleType, string> = {
  '质量回归': 'var(--danger)',
  '输出漂移': 'var(--warning)',
  '成本超限': 'var(--cost)',
  '错误率': 'var(--danger)',
  '延迟': 'var(--gold)',
};

const RULE_TYPE_ICON: Record<AlertRuleType, React.ReactNode> = {
  '质量回归': <ShieldAlert size={11} />,
  '输出漂移': <TrendingUp size={11} />,
  '成本超限': <DollarSign size={11} />,
  '错误率': <AlertTriangle size={11} />,
  '延迟': <Activity size={11} />,
};

// ── KPI 衍生 ─────────────────────────────────────────────────────────────────
const activeRules = ALERT_RULES.filter(r => r.status === 'active').length;
const firingEvents = ALERT_EVENTS.filter(e => e.state === 'firing');
const totalTriggered = ALERT_RULES.reduce((s, r) => s + r.triggered, 0);
const resolvedCount = ALERT_EVENTS.filter(e => e.state === 'resolved').length;

// 近 7 天触发次数趋势（按 type 聚合，造小数组）
const seed = (n: number) => { const x = Math.sin(n * 999.137) * 10000; return x - Math.floor(x); };
const TREND_DAYS = Array.from({ length: 7 }, (_, i) => `06-${String(11 + i).padStart(2, '0')}`);
const RULE_TYPES: AlertRuleType[] = ['质量回归', '输出漂移', '成本超限', '错误率', '延迟'];
const TREND_DATA: Record<AlertRuleType, number[]> = {
  '质量回归': TREND_DAYS.map((_, i) => Math.round(1 + seed(i + 1) * 2.5)),
  '输出漂移': TREND_DAYS.map((_, i) => Math.round(seed(i + 10) * 1.5)),
  '成本超限': TREND_DAYS.map((_, i) => Math.round(seed(i + 20) * 1.2)),
  '错误率': TREND_DAYS.map((_, i) => Math.round(seed(i + 30) * 2)),
  '延迟': TREND_DAYS.map((_, i) => Math.round(seed(i + 40) * 1)),
};

// ── 规则列：DataTable cols ────────────────────────────────────────────────────
function RuleTypeBadge({ type }: { type: AlertRuleType }) {
  const color = RULE_TYPE_COLOR[type];
  return (
    <span className="badge row gap-1" style={{ background: `color-mix(in srgb, ${color} 13%, transparent)`, color }}>
      {RULE_TYPE_ICON[type]}{type}
    </span>
  );
}

const RULE_COLS: Col<AlertRule>[] = [
  {
    key: 'name', header: '规则名称', width: 180,
    render: (r) => <span style={{ color: r.status === 'muted' ? 'var(--text-3)' : 'var(--text-1)', fontWeight: 500 }}>{r.name}</span>,
  },
  {
    key: 'type', header: '类型', width: 110,
    render: (r) => <RuleTypeBadge type={r.type} />,
  },
  {
    key: 'condition', header: '触发条件', width: 240,
    render: (r) => <span className="t-small text-2" style={{ fontFamily: "'Geist Mono',ui-monospace,monospace", opacity: r.status === 'muted' ? 0.5 : 1 }}>{r.condition}</span>,
  },
  {
    key: 'channels', header: '通知渠道', width: 140,
    render: (r) => (
      <span className="row gap-1 wrap" style={{ opacity: r.status === 'muted' ? 0.45 : 1 }}>
        {r.channels.map(ch => (
          <span key={ch} className="tag" style={{ fontSize: 10 }}>{ch}</span>
        ))}
      </span>
    ),
  },
  {
    key: 'triggered', header: '触发次数', num: true, sortable: true, sortAccessor: r => r.triggered,
    render: (r) => <span className="mononum" style={{ color: r.triggered > 0 ? 'var(--text-1)' : 'var(--text-3)', opacity: r.status === 'muted' ? 0.5 : 1 }}>{r.triggered}</span>,
  },
  {
    key: 'status', header: '状态', width: 90,
    render: (r) => r.status === 'active'
      ? <StatusBadge status="active" tone="good" />
      : <span className="row gap-1" style={{ color: 'var(--text-3)' }}><BellOff size={12} /><span className="badge" style={{ background: 'color-mix(in srgb, var(--text-3) 12%, transparent)', color: 'var(--text-3)', fontSize: 10 }}>muted</span></span>,
  },
];

// ── EventState ────────────────────────────────────────────────────────────────
function StateBadge({ state }: { state: EventState }) {
  if (state === 'firing') {
    return (
      <span className="badge row gap-1" style={{ background: 'color-mix(in srgb, var(--danger) 16%, transparent)', color: 'var(--danger)', fontWeight: 700 }}>
        <span className="live-dot" style={{ background: 'var(--danger)' }} />firing
      </span>
    );
  }
  if (state === 'acked') {
    return <StatusBadge status="已确认" tone="warn" />;
  }
  return <StatusBadge status="已处置" tone="good" />;
}

// ── 趋势柱图 ──────────────────────────────────────────────────────────────────
function trendBarOption() {
  const colors: Record<AlertRuleType, string> = {
    '质量回归': cssVar('--danger'),
    '输出漂移': cssVar('--warning'),
    '成本超限': cssVar('--cost'),
    '错误率': cssVar('--danger'),
    '延迟': cssVar('--gold'),
  };
  return {
    ...baseOption(),
    legend: {
      show: true, top: 0, right: 0,
      textStyle: { color: cssVar('--text-3'), fontSize: 10 },
      itemWidth: 9, itemHeight: 9,
      data: RULE_TYPES,
    },
    grid: { left: 6, right: 8, top: 28, bottom: 18, containLabel: true },
    tooltip: { ...(baseOption().tooltip as object), trigger: 'axis' },
    xAxis: {
      type: 'category', data: TREND_DAYS,
      ...axisStyle(),
      axisTick: { show: false }, axisLine: { show: false },
      splitLine: { show: false },
    },
    yAxis: { type: 'value', ...axisStyle(), minInterval: 1 },
    series: RULE_TYPES.map(t => ({
      name: t, type: 'bar', stack: 'total',
      data: TREND_DATA[t],
      barMaxWidth: 28,
      itemStyle: { color: colors[t], borderRadius: t === '延迟' ? [4, 4, 0, 0] : 0, opacity: 0.85 },
    })),
    animationDuration: 700, animationEasing: 'cubicOut' as const,
  };
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export default function Alerts() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [filter, setFilter] = useState<EventState | 'all'>('all');

  const visibleEvents = filter === 'all'
    ? ALERT_EVENTS
    : ALERT_EVENTS.filter(e => e.state === filter);

  // firing 置顶
  const sortedEvents = [...visibleEvents].sort((a, b) => {
    if (a.state === 'firing' && b.state !== 'firing') return -1;
    if (b.state === 'firing' && a.state !== 'firing') return 1;
    return 0;
  });

  return (
    <div className="page">
      <PageHeader
        title="告警中心"
        subtitle="质量回归 · 输出漂移 · 成本超限 · 错误率 · 延迟 — 触发→定位→处置 全链路"
        actions={
          hasPermission('alert:write') ? (
            <button className="btn btn-primary btn-sm row gap-1">
              <Plus size={13} /> 新建规则
            </button>
          ) : undefined
        }
      />

      {/* ── KPI 条 ── */}
      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 14 }}>
        <StatCard
          label="已启用规则"
          raw={activeRules}
          icon={<Bell size={15} />}
          accentVar="var(--gold)"
          delayClass="reveal-1"
        />
        <StatCard
          label="Firing 告警"
          raw={firingEvents.length}
          icon={<ShieldAlert size={15} />}
          accentVar="var(--danger)"
          delayClass="reveal-2"
        />
        <StatCard
          label="今日触发次数"
          raw={totalTriggered}
          icon={<AlertTriangle size={15} />}
          accentVar="var(--warning)"
          invertTrend
          delayClass="reveal-3"
        />
        <StatCard
          label="已处置事件"
          raw={resolvedCount}
          icon={<Wifi size={15} />}
          accentVar="var(--gold)"
          delayClass="reveal-4"
        />
      </div>

      {/* ── 主区：左 时间线 / 右 趋势柱+规则列 ── */}
      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: '1.2fr 1fr', gap: 14, marginTop: 14, alignItems: 'start' }}>

        {/* 左：告警时间线 */}
        <Card className="reveal reveal-2">
          <SectionTitle right={
            <Toolbar style={{ marginBottom: 0 }}>
              {(['all', 'firing', 'acked', 'resolved'] as const).map(s => (
                <button
                  key={s}
                  className="btn btn-subtle btn-sm"
                  style={{
                    color: filter === s ? 'var(--text-1)' : 'var(--text-3)',
                    background: filter === s ? 'var(--surface-2)' : 'transparent',
                    border: `1px solid ${filter === s ? 'var(--hairline-strong)' : 'transparent'}`,
                  }}
                  onClick={() => setFilter(s)}
                >
                  {s === 'all' ? '全部' : s === 'firing' ? '进行中' : s === 'acked' ? '已确认' : '已处置'}
                </button>
              ))}
            </Toolbar>
          }>
            <span className="row gap-2"><AlertTriangle size={13} /> 告警时间线</span>
          </SectionTitle>

          {sortedEvents.length === 0 && (
            <EmptyState icon={<Bell size={34} />} title="暂无告警事件" desc="当前筛选条件下没有告警记录" />
          )}

          <div className="col" style={{ gap: 0 }}>
            {sortedEvents.map((ev, idx) => {
              const isFiring = ev.state === 'firing';
              const color = SEVERITY_COLOR[ev.severity];
              const isLast = idx === sortedEvents.length - 1;

              return (
                <div
                  key={ev.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '20px 1fr',
                    gap: '0 12px',
                    position: 'relative',
                    paddingBottom: isLast ? 0 : 20,
                  }}
                >
                  {/* 左侧时间线轨道 */}
                  <div className="col" style={{ alignItems: 'center', gap: 0 }}>
                    {/* 圆点 */}
                    <div
                      style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: color,
                        flexShrink: 0, marginTop: 14,
                        boxShadow: isFiring ? `0 0 0 3px color-mix(in srgb, ${color} 22%, transparent)` : 'none',
                        zIndex: 1,
                      }}
                    />
                    {/* 竖线 */}
                    {!isLast && (
                      <div style={{ flex: 1, width: 1, background: 'var(--hairline)', marginTop: 4 }} />
                    )}
                  </div>

                  {/* 右侧事件卡 */}
                  <div
                    style={{
                      borderRadius: 'var(--r)',
                      border: isFiring
                        ? '1.5px solid color-mix(in srgb, var(--danger) 55%, transparent)'
                        : '1px solid var(--hairline)',
                      background: isFiring
                        ? 'color-mix(in srgb, var(--danger) 5%, var(--surface-1))'
                        : 'var(--surface-1)',
                      padding: '12px 14px',
                      marginBottom: isLast ? 0 : 0,
                    }}
                  >
                    {/* 头行 */}
                    <div className="row spread" style={{ flexWrap: 'wrap', gap: '4px 8px', marginBottom: 6 }}>
                      <div className="row gap-2" style={{ flexWrap: 'wrap', gap: '4px 8px', flex: 1 }}>
                        {/* ruleType 徽标 */}
                        <span className="badge row gap-1" style={{
                          background: `color-mix(in srgb, ${color} 13%, transparent)`,
                          color, fontSize: 10, fontWeight: 600,
                        }}>
                          {RULE_TYPE_ICON[ev.ruleType]}{ev.ruleType}
                        </span>
                        {/* app tag */}
                        <span className="tag tag-mono" style={{ fontSize: 10 }}>{appName(ev.app)}</span>
                        {/* state */}
                        <StateBadge state={ev.state} />
                      </div>
                      {/* 时间 */}
                      <span className="mononum" style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{ev.at}</span>
                    </div>

                    {/* 标题 */}
                    <div style={{
                      fontWeight: isFiring ? 700 : 600,
                      color: isFiring ? 'var(--text-1)' : 'var(--text-2)',
                      fontSize: 13,
                      marginBottom: 4,
                    }}>
                      {ev.title}
                    </div>

                    {/* 详情 */}
                    <div className="t-small text-3" style={{ lineHeight: 1.55 }}>
                      {ev.detail}
                    </div>

                    {/* jumpTo 按钮 */}
                    {ev.jumpTo && (
                      <button
                        className="btn btn-subtle btn-sm row gap-1"
                        style={{
                          marginTop: 10,
                          color: isFiring ? 'var(--danger)' : 'var(--text-2)',
                          border: `1px solid ${isFiring ? 'color-mix(in srgb, var(--danger) 30%, transparent)' : 'var(--hairline)'}`,
                        }}
                        onClick={() => navigate(ev.jumpTo!)}
                      >
                        定位 <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 右列：趋势柱 + 规则列表 */}
        <div className="col gap-3" style={{ minWidth: 0 }}>

          {/* 近 7 天触发趋势 */}
          <Card className="reveal reveal-3">
            <SectionTitle>
              <span className="row gap-2"><Activity size={13} /> 近 7 天触发趋势 · 按类型</span>
            </SectionTitle>
            <Chart height={180} build={() => trendBarOption()} deps={[]} />
          </Card>

          {/* 规则列表 */}
          <Card className="reveal reveal-4">
            <SectionTitle right={
              <span className="t-small text-3 mononum">{ALERT_RULES.length} 条规则</span>
            }>
              <span className="row gap-2"><Bell size={13} /> 告警规则</span>
            </SectionTitle>
            <DataTable<AlertRule>
              cols={RULE_COLS}
              rows={ALERT_RULES}
              rowKey={r => r.id}
              dense
              rowClass={r => r.status === 'muted' ? 'tr-muted' : ''}
              defaultSort={{ key: 'triggered', dir: 'desc' }}
              empty={{ title: '暂无规则', icon: <BellOff size={28} /> }}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
