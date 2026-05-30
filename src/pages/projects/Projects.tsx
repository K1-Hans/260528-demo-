import { useMemo } from 'react';
import { Layers, Loader2, GitPullRequest, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, PageHeader, SectionTitle } from '../../components/ui';
import { PROJECT_TASKS } from '../../lib/mockData';
import type { ProjectTask } from '../../types';

// ─── Priority config ─────────────────────────────────────────────────────────
const PRIORITY_CFG = {
  P0: { color: 'var(--danger)', label: 'P0', bg: 'color-mix(in srgb, var(--danger) 12%, transparent)' },
  P1: { color: 'var(--warning)', label: 'P1', bg: 'color-mix(in srgb, var(--warning) 12%, transparent)' },
  P2: { color: 'var(--text-3)', label: 'P2', bg: 'var(--surface-3)' },
} as const;

// ─── Kanban column config ────────────────────────────────────────────────────
type Status = ProjectTask['status'];

interface ColConfig {
  id: Status;
  label: string;
  icon: React.ReactNode;
  accent: string;
}

const COLUMNS: ColConfig[] = [
  { id: 'backlog', label: '待规划', icon: <Layers size={14} strokeWidth={1.75} />, accent: 'var(--text-3)' },
  { id: 'doing', label: '进行中', icon: <Loader2 size={14} strokeWidth={1.75} />, accent: 'var(--info)' },
  { id: 'review', label: '评审中', icon: <GitPullRequest size={14} strokeWidth={1.75} />, accent: 'var(--warning)' },
  { id: 'done', label: '已完成', icon: <CheckCircle2 size={14} strokeWidth={1.75} />, accent: 'var(--emerald)' },
];

// ─── Avatar initials helper ───────────────────────────────────────────────────
function OwnerAvatar({ name }: { name: string }) {
  return (
    <span
      className="avatar"
      style={{ width: 22, height: 22, fontSize: 11, borderRadius: 7, flexShrink: 0 }}
    >
      {name[0]}
    </span>
  );
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────
function TaskCard({ task, delayClass }: { task: ProjectTask; delayClass: string }) {
  const p = PRIORITY_CFG[task.priority];

  // Due-date colouring — mark overdue if past 2026-05-29
  const isOverdue =
    task.status !== 'done' && new Date(task.due) < new Date('2026-05-29');

  return (
    <div
      className={`reveal ${delayClass}`}
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--r-md)',
        padding: '14px 14px 12px',
        cursor: 'default',
        transition: 'border-color var(--dur-base) var(--ease), box-shadow var(--dur-base) var(--ease), transform var(--dur-base) var(--ease)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = 'var(--hairline-strong)';
        el.style.boxShadow = 'var(--elev-1)';
        el.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = 'var(--hairline)';
        el.style.boxShadow = 'none';
        el.style.transform = 'translateY(0)';
      }}
    >
      {/* Priority chip + overdue */}
      <div className="row gap-2 spread" style={{ marginBottom: 9 }}>
        <span
          className="chip tnum"
          style={{
            background: p.bg,
            color: p.color,
            fontSize: 11,
            padding: '2px 8px',
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          {p.label}
        </span>
        {isOverdue && (
          <span
            className="row gap-1"
            style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}
          >
            <AlertCircle size={11} strokeWidth={2} />逾期
          </span>
        )}
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-1)',
          lineHeight: 1.4,
          marginBottom: 10,
        }}
      >
        {task.title}
      </div>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="row wrap gap-1" style={{ marginBottom: 10 }}>
          {task.tags.map(t => (
            <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>
          ))}
        </div>
      )}

      {/* Owner + due */}
      <div className="row spread" style={{ marginTop: 2, gap: 6 }}>
        <span className="row gap-2">
          <OwnerAvatar name={task.owner} />
          <span className="t-small text-2" style={{ fontSize: 12 }}>{task.owner}</span>
        </span>
        <span
          className="t-small tnum"
          style={{
            color: isOverdue ? 'var(--danger)' : 'var(--text-3)',
            fontSize: 11,
            fontWeight: isOverdue ? 600 : 400,
          }}
        >
          {task.due.slice(5)}
        </span>
      </div>
    </div>
  );
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────
function KanbanColumn({ col, tasks }: { col: ColConfig; tasks: ProjectTask[] }) {
  return (
    <div
      style={{
        flex: '1 1 220px',
        minWidth: 220,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: 'var(--r-md) var(--r-md) 0 0',
          background: 'var(--surface-1)',
          border: '1px solid var(--hairline)',
          borderBottom: `2px solid ${col.accent}`,
          marginBottom: 8,
        }}
      >
        <span
          className="row gap-2 label"
          style={{ color: col.accent, fontSize: 11, letterSpacing: '0.07em' }}
        >
          <span style={{ color: col.accent }}>{col.icon}</span>
          {col.label}
        </span>
        <span
          className="tnum"
          style={{
            minWidth: 22,
            height: 22,
            borderRadius: 'var(--r-pill)',
            background: `color-mix(in srgb, ${col.accent} 16%, transparent)`,
            color: col.accent,
            fontSize: 11,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 6px',
          }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div
        style={{
          flex: 1,
          background: 'var(--bg-sunken)',
          border: '1px solid var(--hairline)',
          borderRadius: '0 0 var(--r-md) var(--r-md)',
          padding: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          minHeight: 200,
        }}
      >
        {tasks.length === 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-3)',
              fontSize: 12,
              padding: '32px 0',
            }}
          >
            暂无任务
          </div>
        )}
        {tasks.map((t, i) => (
          <TaskCard key={t.id} task={t} delayClass={`reveal-${Math.min(i + 1, 6)}`} />
        ))}
      </div>
    </div>
  );
}

// ─── Summary row ──────────────────────────────────────────────────────────────
function SummaryRow({ tasks }: { tasks: ProjectTask[] }) {
  const doing = tasks.filter(t => t.status === 'doing').length;
  const p0 = tasks.filter(t => t.priority === 'P0').length;
  const done = tasks.filter(t => t.status === 'done').length;

  const items = [
    { label: '总任务', value: tasks.length, unit: '项', color: 'var(--text-1)' },
    { label: '进行中', value: doing, unit: '项', color: 'var(--info)' },
    { label: 'P0 任务', value: p0, unit: '项', color: 'var(--danger)' },
    { label: '已完成', value: done, unit: '项', color: 'var(--emerald)' },
  ];

  return (
    <div
      className="row gap-3 reveal reveal-1"
      style={{ marginBottom: 24, flexWrap: 'wrap' }}
    >
      {items.map((s, i) => (
        <div
          key={s.label}
          className={`reveal reveal-${Math.min(i + 1, 6)}`}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--r-md)',
            background: 'var(--surface-1)',
            border: '1px solid var(--hairline)',
            minWidth: 110,
          }}
        >
          <div className="label" style={{ marginBottom: 5 }}>{s.label}</div>
          <span
            className="tnum"
            style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: '-0.01em' }}
          >
            {s.value}
          </span>
          <span className="kpi-unit">{s.unit}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Projects() {
  const grouped = useMemo(() => {
    const map = new Map<Status, ProjectTask[]>();
    for (const col of COLUMNS) map.set(col.id, []);
    for (const t of PROJECT_TASKS) {
      const arr = map.get(t.status);
      if (arr) arr.push(t);
    }
    return map;
  }, []);

  return (
    <div className="page">
      <PageHeader
        title="项目管理"
        subtitle="策略项目看板 · 2026 Q2"
        actions={
          <span className="t-small text-3 tnum row gap-1">
            <Layers size={13} strokeWidth={1.75} style={{ color: 'var(--gold)', opacity: 0.7 }} />
            {PROJECT_TASKS.length} 项任务
          </span>
        }
      />

      <SummaryRow tasks={PROJECT_TASKS} />

      <Card>
        <SectionTitle>Kanban 看板</SectionTitle>
        <div
          style={{
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              col={col}
              tasks={grouped.get(col.id) ?? []}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
