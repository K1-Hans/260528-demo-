import { useState } from 'react';
import { AlertTriangle, Clock, User, MapPin, Zap, ChevronRight, CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { Card, PageHeader, SectionTitle, Badge, ProgressBar, Segmented } from '../../components/ui';
import { OPS_ACTIONS } from '../../lib/mockData';
import type { OpsAction } from '../../types';

// ─── Derived region list ──────────────────────────────────────────────────────
const REGIONS = ['全部', ...Array.from(new Set(OPS_ACTIONS.map(a => a.region)))];

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  todo: {
    label: '待办',
    color: 'var(--text-3)',
    bg: 'var(--surface-2)',
    icon: <Circle size={13} />,
    stripe: 'var(--surface-3)',
  },
  doing: {
    label: '进行中',
    color: 'var(--info)',
    bg: 'color-mix(in srgb, var(--info) 8%, transparent)',
    icon: <Loader2 size={13} />,
    stripe: 'var(--info)',
  },
  done: {
    label: '已完成',
    color: 'var(--emerald)',
    bg: 'color-mix(in srgb, var(--emerald) 8%, transparent)',
    icon: <CheckCircle2 size={13} />,
    stripe: 'var(--emerald)',
  },
  risk: {
    label: '风险',
    color: 'var(--danger)',
    bg: 'color-mix(in srgb, var(--danger) 8%, transparent)',
    icon: <AlertTriangle size={13} />,
    stripe: 'var(--danger)',
  },
} as const;

// ─── Impact config ────────────────────────────────────────────────────────────
const IMPACT_CONFIG = {
  high: { label: '高影响', color: 'var(--danger)' },
  mid: { label: '中影响', color: 'var(--warning)' },
  low: { label: '低影响', color: 'var(--text-3)' },
} as const;

// ─── Status columns order ─────────────────────────────────────────────────────
const STATUS_COLS: OpsAction['status'][] = ['todo', 'doing', 'risk', 'done'];

// ─── Due date display ─────────────────────────────────────────────────────────
function DueChip({ due }: { due: string }) {
  const today = new Date('2026-05-29');
  const dueDate = new Date(due);
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
  const overdue = diffDays < 0;
  const urgent = diffDays >= 0 && diffDays <= 7;
  return (
    <span
      className="row gap-1 tnum"
      style={{
        fontSize: 11,
        color: overdue ? 'var(--danger)' : urgent ? 'var(--warning)' : 'var(--text-3)',
        fontWeight: overdue || urgent ? 600 : 400,
      }}
    >
      <Clock size={10} />
      {due.slice(5)}
      {overdue && ' · 已逾期'}
      {!overdue && urgent && ` · ${diffDays}天`}
    </span>
  );
}

// ─── Single Kanban card ───────────────────────────────────────────────────────
function ActionCard({ action }: { action: OpsAction }) {
  const sc = STATUS_CONFIG[action.status];
  const ic = IMPACT_CONFIG[action.impact];

  return (
    <div
      className="card card-hover"
      style={{
        padding: '14px 16px',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 10,
      }}
    >
      {/* status stripe */}
      <div
        className="stripe-top"
        style={{ background: sc.stripe }}
      />

      {/* top row: impact + due */}
      <div className="row spread" style={{ marginBottom: 8 }}>
        <span
          className="chip"
          style={{
            background: `color-mix(in srgb, ${ic.color} 12%, transparent)`,
            color: ic.color,
            fontSize: 11,
          }}
        >
          <Zap size={10} />
          {ic.label}
        </span>
        <DueChip due={action.due} />
      </div>

      {/* title */}
      <div
        style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.4, marginBottom: 6 }}
      >
        {action.title}
      </div>

      {/* desc */}
      <div
        className="t-small text-3"
        style={{ lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {action.desc}
      </div>

      {/* progress bar (hide if done) */}
      {action.status !== 'done' && (
        <div style={{ marginBottom: 10 }}>
          <div className="row spread" style={{ marginBottom: 4 }}>
            <span className="label">进度</span>
            <span className="tnum" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>
              {action.progress}%
            </span>
          </div>
          <ProgressBar
            pct={action.progress}
            color={action.status === 'risk' ? 'var(--danger)' : action.status === 'doing' ? 'var(--info)' : 'var(--surface-3)'}
            height={4}
          />
        </div>
      )}

      {/* done indicator */}
      {action.status === 'done' && (
        <div className="row gap-1" style={{ marginBottom: 10, color: 'var(--emerald)', fontSize: 12, fontWeight: 600 }}>
          <CheckCircle2 size={12} />
          100% 已完成
        </div>
      )}

      {/* footer: owner + region */}
      <div className="row spread">
        <div className="row gap-2">
          <div
            className="avatar"
            style={{ width: 22, height: 22, fontSize: 10, borderRadius: 6, background: 'var(--gold-dim)', color: 'var(--gold)' }}
          >
            {action.owner.charAt(0)}
          </div>
          <span className="row gap-1 t-small text-3">
            <User size={10} />
            {action.owner}
          </span>
        </div>
        <span className="row gap-1 t-small text-3">
          <MapPin size={10} />
          {action.region}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Ops() {
  const [regionFilter, setRegionFilter] = useState('全部');

  const filtered = OPS_ACTIONS.filter(a => regionFilter === '全部' || a.region === regionFilter);

  // Summary counts
  const counts = {
    todo: filtered.filter(a => a.status === 'todo').length,
    doing: filtered.filter(a => a.status === 'doing').length,
    done: filtered.filter(a => a.status === 'done').length,
    risk: filtered.filter(a => a.status === 'risk').length,
  };
  const highImpactCount = filtered.filter(a => a.impact === 'high').length;
  const riskCount = filtered.filter(a => a.status === 'risk').length;

  return (
    <div className="page">
      <PageHeader
        title="操盘动作"
        subtitle="区域操盘动作看板 · 进度追踪与风险管控"
        actions={
          <Segmented
            options={REGIONS.map(r => ({ value: r, label: r }))}
            value={regionFilter}
            onChange={setRegionFilter}
          />
        }
      />

      {/* ── Summary strip ── */}
      <div
        className="card reveal reveal-1"
        style={{ marginBottom: 16, padding: '14px 20px' }}
      >
        <div className="row gap-5 wrap">
          {STATUS_COLS.map(status => {
            const sc = STATUS_CONFIG[status];
            return (
              <div key={status} className="row gap-2">
                <span style={{ color: sc.color }}>{sc.icon}</span>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{sc.label}</span>
                <span
                  className="tnum"
                  style={{ fontSize: 20, fontWeight: 800, color: sc.color, letterSpacing: '-0.01em', lineHeight: 1 }}
                >
                  {counts[status]}
                </span>
              </div>
            );
          })}
          <div
            style={{ height: 24, width: 1, background: 'var(--hairline)', margin: '0 4px' }}
          />
          <div className="row gap-2">
            <Zap size={13} style={{ color: 'var(--danger)' }} />
            <span className="t-small text-3">高影响</span>
            <span className="tnum" style={{ fontSize: 20, fontWeight: 800, color: 'var(--danger)', lineHeight: 1, letterSpacing: '-0.01em' }}>
              {highImpactCount}
            </span>
          </div>
          {riskCount > 0 && (
            <Badge color="var(--danger)">
              <AlertTriangle size={10} />
              {riskCount} 项风险需关注
            </Badge>
          )}
          <div style={{ marginLeft: 'auto' }} className="row gap-1 text-3 t-small">
            <ChevronRight size={12} />
            共 {filtered.length} 条动作
          </div>
        </div>
      </div>

      {/* ── Kanban board ── */}
      <div
        className="grid reveal reveal-2"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, alignItems: 'start' }}
      >
        {STATUS_COLS.map(status => {
          const sc = STATUS_CONFIG[status];
          const cards = filtered.filter(a => a.status === status);
          return (
            <div key={status}>
              {/* Column header */}
              <div
                className="row spread"
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--r-md)',
                  background: sc.bg,
                  border: `1px solid color-mix(in srgb, ${sc.color} 20%, transparent)`,
                  marginBottom: 10,
                }}
              >
                <div className="row gap-2" style={{ color: sc.color }}>
                  {sc.icon}
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{sc.label}</span>
                </div>
                <span
                  className="tnum"
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: sc.color,
                    lineHeight: 1,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              {cards.length === 0 ? (
                <div
                  style={{
                    padding: '28px 16px',
                    textAlign: 'center',
                    color: 'var(--text-3)',
                    fontSize: 12,
                    border: '1px dashed var(--hairline)',
                    borderRadius: 'var(--r-md)',
                  }}
                >
                  暂无动作
                </div>
              ) : (
                cards.map(action => <ActionCard key={action.id} action={action} />)
              )}
            </div>
          );
        })}
      </div>

      {/* ── Risk detail panel (if any risk items) ── */}
      {OPS_ACTIONS.filter(a => a.status === 'risk').length > 0 && (
        <Card className="reveal reveal-5" style={{ marginTop: 16 }}>
          <SectionTitle right={<Badge color="var(--danger)"><XCircle size={10} /> 需立即跟进</Badge>}>
            风险动作详情
          </SectionTitle>
          <div className="col gap-3">
            {OPS_ACTIONS.filter(a => a.status === 'risk').map((a, i) => (
              <div
                key={a.id}
                className={`row gap-3 reveal reveal-${i + 1}`}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--r-md)',
                  background: 'color-mix(in srgb, var(--danger) 6%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--danger) 22%, transparent)',
                  alignItems: 'flex-start',
                }}
              >
                <AlertTriangle size={14} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1">
                  <div className="row spread" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{a.title}</span>
                    <div className="row gap-2">
                      <span className="row gap-1 t-small text-3"><MapPin size={10} />{a.region}</span>
                      <DueChip due={a.due} />
                    </div>
                  </div>
                  <div className="t-small text-3" style={{ lineHeight: 1.5, marginBottom: 8 }}>{a.desc}</div>
                  <div className="row gap-3">
                    <ProgressBar pct={a.progress} color="var(--danger)" height={4} />
                    <span className="tnum" style={{ fontSize: 11, fontWeight: 600, color: 'var(--danger)', flexShrink: 0 }}>
                      {a.progress}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
