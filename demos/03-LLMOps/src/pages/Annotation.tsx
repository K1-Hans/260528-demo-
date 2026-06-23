import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, CheckCircle2, Users, AlertTriangle,
  ChevronRight, Tag, MessageSquare, Scale,
} from 'lucide-react';
import { PageHeader, StatCard, Card, SectionTitle, Badge, Segmented, EmptyState } from '../components/ui';
import { StatusBadge, Toolbar, toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, cssVar, areaGradient } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import {
  ANNO_TASKS, ANNO_STATS, ANNO_THROUGHPUT, appName,
} from '../lib/mockData';
import type { AnnoTask, AnnoStatus } from '../types';

// ─── Derived stats ────────────────────────────────────────────────────────────
const disagreeCount = ANNO_TASKS.filter(t => t.disagree).length;

// ─── Label chip options ───────────────────────────────────────────────────────
const LABEL_OPTIONS = ['忠实', '合规', '有害', '格式', '简洁'];

// ─── Status helpers ───────────────────────────────────────────────────────────
function statusTone(s: AnnoStatus): 'warn' | 'good' | 'info' {
  if (s === 'pending') return 'warn';
  if (s === 'mine') return 'good';
  return 'info';
}

function statusLabel(s: AnnoStatus) {
  if (s === 'pending') return '待标注';
  if (s === 'mine') return '我的';
  return '已仲裁';
}

// ─── Task list item ────────────────────────────────────────────────────────────
function TaskRow({ task, selected, onClick }: {
  task: AnnoTask;
  selected: boolean;
  onClick: () => void;
}) {
  const lowConf = task.judgeConfidence < 0.6;
  return (
    <button
      className={`anno-task-row${selected ? ' anno-task-row--active' : ''}`}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        width: '100%',
        textAlign: 'left',
        padding: '11px 14px',
        borderRadius: 'var(--r-sm)',
        background: selected ? 'color-mix(in srgb, var(--gold) 10%, var(--surface-2))' : 'var(--surface-2)',
        border: selected ? '1px solid color-mix(in srgb, var(--gold) 40%, transparent)' : '1px solid var(--hairline)',
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {/* top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="mononum" style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'Geist Mono, monospace', flexShrink: 0 }}>
          {task.traceRef}
        </span>
        <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-2)', fontSize: 11 }}>
          {appName(task.app)}
        </span>
        {task.disagree && (
          <span className="badge" style={{ background: 'color-mix(in srgb, var(--danger) 14%, transparent)', color: 'var(--danger)', fontSize: 11 }}>
            分歧
          </span>
        )}
        <span style={{ marginLeft: 'auto' }}>
          <StatusBadge status={statusLabel(task.status)} tone={statusTone(task.status)} />
        </span>
      </div>

      {/* scores row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          judge <span className="mononum" style={{ color: 'var(--text-2)', fontFamily: 'Geist Mono, monospace' }}>{task.judgeScore.toFixed(2)}</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {lowConf && <AlertTriangle size={11} style={{ color: 'var(--warning)', flexShrink: 0 }} />}
          <span style={{ fontSize: 11, color: lowConf ? 'var(--warning)' : 'var(--text-3)' }}>
            conf <span className="mononum" style={{ fontFamily: 'Geist Mono, monospace' }}>{task.judgeConfidence.toFixed(2)}</span>
          </span>
        </span>
        <ChevronRight size={12} style={{ color: 'var(--text-4)', marginLeft: 'auto' }} />
      </div>
    </button>
  );
}

// ─── Score button group (1–5) ─────────────────────────────────────────────────
function ScoreButtons({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          title={`快捷键 ${n}`}
          style={{
            width: 46,
            height: 46,
            borderRadius: 'var(--r-sm)',
            border: value === n
              ? `2px solid ${n <= 2 ? 'var(--danger)' : n === 3 ? 'var(--warning)' : 'var(--success)'}`
              : '1px solid var(--hairline)',
            background: value === n
              ? (n <= 2 ? 'color-mix(in srgb, var(--danger) 14%, var(--surface-2))'
                : n === 3 ? 'color-mix(in srgb, var(--warning) 14%, var(--surface-2))'
                : 'color-mix(in srgb, var(--success) 14%, var(--surface-2))')
              : 'var(--surface-2)',
            color: value === n
              ? (n <= 2 ? 'var(--danger)' : n === 3 ? 'var(--warning)' : 'var(--success)')
              : 'var(--text-2)',
            fontWeight: 700,
            fontSize: 16,
            cursor: 'pointer',
            transition: 'all 0.12s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            flexDirection: 'column',
          }}
        >
          <span>{n}</span>
          <span className="kbd-key" style={{
            fontSize: 9,
            padding: '0 3px',
            borderRadius: 3,
            border: '1px solid var(--hairline)',
            background: 'var(--surface-3)',
            color: 'var(--text-3)',
            fontFamily: 'Geist Mono, monospace',
            lineHeight: '14px',
          }}>{n}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Label chip multi-select ──────────────────────────────────────────────────
function LabelChips({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (lbl: string) =>
    onChange(value.includes(lbl) ? value.filter(l => l !== lbl) : [...value, lbl]);
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
      {LABEL_OPTIONS.map(lbl => {
        const on = value.includes(lbl);
        return (
          <button
            key={lbl}
            onClick={() => toggle(lbl)}
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              border: on ? '1px solid var(--gold)' : '1px solid var(--hairline)',
              background: on ? 'color-mix(in srgb, var(--gold) 14%, var(--surface-2))' : 'var(--surface-2)',
              color: on ? 'var(--text-1)' : 'var(--text-3)',
              fontSize: 12,
              fontWeight: on ? 600 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 0.12s',
            }}
          >
            <Tag size={11} />
            {lbl}
          </button>
        );
      })}
    </div>
  );
}

// ─── Arbitration view (disagree: judge vs human side-by-side) ────────────────
function ArbitrationView({ task }: { task: AnnoTask }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {/* Judge column */}
      <div style={{
        padding: '12px 14px',
        borderRadius: 'var(--r-sm)',
        background: 'var(--surface-2)',
        border: '1px solid var(--hairline)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Scale size={13} style={{ color: 'var(--text-3)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Judge 评分
          </span>
        </div>
        <div className="mononum" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'Geist Mono, monospace' }}>
          {task.judgeScore.toFixed(2)}
        </div>
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}>
          置信度 <span className="mononum" style={{ fontFamily: 'Geist Mono, monospace', color: task.judgeConfidence < 0.6 ? 'var(--warning)' : 'var(--text-2)' }}>
            {task.judgeConfidence.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Human column */}
      <div style={{
        padding: '12px 14px',
        borderRadius: 'var(--r-sm)',
        background: 'var(--surface-2)',
        border: '1px solid color-mix(in srgb, var(--gold) 30%, var(--hairline))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Users size={13} style={{ color: 'var(--gold)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            人工标注
          </span>
        </div>
        <div className="mononum" style={{ fontSize: 28, fontWeight: 700, color: 'var(--gold)', fontFamily: 'Geist Mono, monospace' }}>
          {task.humanScore !== undefined ? task.humanScore.toFixed(2) : '—'}
        </div>
        {task.labels && task.labels.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {task.labels.map(l => (
              <span key={l} className="badge" style={{ fontSize: 11, background: 'color-mix(in srgb, var(--gold) 14%, transparent)', color: 'var(--gold)' }}>
                {l}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Diff indicator */}
      {task.humanScore !== undefined && (
        <div style={{
          gridColumn: '1 / -1',
          padding: '8px 12px',
          borderRadius: 'var(--r-sm)',
          background: 'color-mix(in srgb, var(--danger) 8%, var(--surface-2))',
          border: '1px solid color-mix(in srgb, var(--danger) 20%, transparent)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <AlertTriangle size={13} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
            评分差值 <span className="mononum" style={{ color: 'var(--danger)', fontFamily: 'Geist Mono, monospace', fontWeight: 700 }}>
              {Math.abs(task.judgeScore - task.humanScore).toFixed(2)}
            </span>，需仲裁员复核。
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Throughput + kappa chart builder ────────────────────────────────────────
function buildThroughputChart() {
  const dates = ANNO_THROUGHPUT.map(p => p.date);
  const counts = ANNO_THROUGHPUT.map(p => p.count);
  const kappas = ANNO_THROUGHPUT.map(p => p.kappa);

  return {
    ...baseOption(),
    legend: {
      show: true, top: 0, right: 0,
      itemWidth: 10, itemHeight: 10,
      textStyle: { color: cssVar('--text-3'), fontSize: 11 },
      data: ['日标注量', 'κ 一致性'],
    },
    grid: { left: 8, right: 8, top: 32, bottom: 20, containLabel: true },
    tooltip: { ...(baseOption().tooltip as object), trigger: 'axis' },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: dates,
      ...axisStyle(),
      axisLine: axisStyle().axisLine,
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: '条/日',
        nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 },
        ...axisStyle(),
        splitLine: { lineStyle: { color: cssVar('--hairline'), type: 'dashed' as const } },
      },
      {
        type: 'value',
        name: 'κ',
        nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 },
        min: 0.6,
        max: 1.0,
        position: 'right',
        ...axisStyle(),
        splitLine: { show: false },
        axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => v.toFixed(2) },
      },
    ],
    series: [
      {
        name: '日标注量',
        type: 'bar',
        yAxisIndex: 0,
        data: counts,
        barMaxWidth: 22,
        itemStyle: {
          color: accent(),
          borderRadius: [4, 4, 0, 0],
        },
        areaStyle: { color: areaGradient(accent(), 0.22) },
        animationDelay: (i: number) => i * 30,
      },
      {
        name: 'κ 一致性',
        type: 'line',
        yAxisIndex: 1,
        data: kappas,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: cssVar('--c2'), width: 2 },
        areaStyle: { color: areaGradient(cssVar('--c2'), 0.08) },
      },
    ],
    animationDuration: 800,
    animationEasing: 'cubicOut' as const,
  };
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Annotation() {
  const { hasPermission } = useAuth();

  // Tab state
  const [tab, setTab] = useState<AnnoStatus>('pending');

  // Selected task
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form state for annotation
  const [score, setScore] = useState<number | null>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [note, setNote] = useState('');

  // Filtered tasks
  const filteredTasks = ANNO_TASKS.filter(t => t.status === tab);
  const selectedTask: AnnoTask | null = selectedId
    ? (ANNO_TASKS.find(t => t.id === selectedId) ?? null)
    : null;

  // Reset form when selection changes
  useEffect(() => {
    if (!selectedTask) return;
    setScore(selectedTask.humanScore ? Math.round(selectedTask.humanScore * 5) : null);
    setLabels(selectedTask.labels ?? []);
    setNote(selectedTask.note ?? '');
  }, [selectedId, selectedTask]);

  // Auto-select first item when switching tabs
  useEffect(() => {
    const tasks = ANNO_TASKS.filter(t => t.status === tab);
    setSelectedId(tasks.length > 0 ? tasks[0].id : null);
  }, [tab]);

  // Keyboard shortcuts: J/K to navigate, 1-5 to score
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if focus is in a textarea or input
    if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT') return;

    const tasks = ANNO_TASKS.filter(t => t.status === tab);
    const idx = selectedId ? tasks.findIndex(t => t.id === selectedId) : -1;

    if (e.key === 'j' || e.key === 'J') {
      const next = tasks[Math.min(idx + 1, tasks.length - 1)];
      if (next) setSelectedId(next.id);
    } else if (e.key === 'k' || e.key === 'K') {
      const prev = tasks[Math.max(idx - 1, 0)];
      if (prev) setSelectedId(prev.id);
    } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
      setScore(Number(e.key));
    }
  }, [tab, selectedId]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  function handleSubmit() {
    if (!selectedTask) return;
    if (!hasPermission('annotation:write')) {
      toast('权限不足：需要 annotation:write', 'warn');
      return;
    }
    if (score === null) {
      toast('请先选择评分（1–5）', 'warn');
      return;
    }
    toast('已标注，回流黄金集', 'success');
  }

  return (
    <div className="page">
      <PageHeader
        title="人工标注队列"
        subtitle="judge 低置信 / 抽样样本进队列 · 标注员打分回流黄金集"
        actions={
          <span className="live-pill">
            <span className="live-dot" />
            κ = <span className="mononum">{ANNO_STATS.kappa.toFixed(2)}</span>
          </span>
        }
      />

      {/* ── KPI 条 ── */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 0 }}>
        <StatCard
          label="待标注"
          raw={ANNO_STATS.pending}
          unit="条"
          icon={<ClipboardList size={15} />}
          accentVar="var(--gold)"
          delayClass="reveal-1"
        />
        <StatCard
          label="今日已标"
          raw={ANNO_STATS.todayDone}
          unit="条"
          icon={<CheckCircle2 size={15} />}
          accentVar="var(--gold)"
          delayClass="reveal-2"
        />
        <StatCard
          label="标注者间一致性 κ"
          raw={ANNO_STATS.kappa}
          decimals={2}
          icon={<Users size={15} />}
          accentVar="var(--gold)"
          delayClass="reveal-3"
        />
        <StatCard
          label="分歧待仲裁"
          raw={disagreeCount}
          unit="条"
          icon={<AlertTriangle size={15} />}
          accentVar="var(--danger)"
          delayClass="reveal-4"
        />
      </div>

      {/* ── Tab + main split ── */}
      <div className="col gap-3" style={{ marginTop: 14 }}>
        <Toolbar>
          <Segmented<AnnoStatus>
            options={[
              { value: 'pending', label: `待标注 ${ANNO_TASKS.filter(t => t.status === 'pending').length}` },
              { value: 'mine', label: `我的 ${ANNO_TASKS.filter(t => t.status === 'mine').length}` },
              { value: 'arbitrated', label: `已仲裁 ${ANNO_TASKS.filter(t => t.status === 'arbitrated').length}` },
            ]}
            value={tab}
            onChange={v => setTab(v)}
          />
        </Toolbar>

        {/* Split layout: queue left + annotation desk right */}
        <div className="grid" style={{ gridTemplateColumns: '340px 1fr', gap: 14, alignItems: 'start' }}>
          {/* Left: task queue */}
          <Card className="reveal reveal-2">
            <SectionTitle>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <ClipboardList size={13} />
                {tab === 'pending' ? '待标注队列' : tab === 'mine' ? '我的任务' : '已仲裁'}
              </span>
            </SectionTitle>

            {filteredTasks.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={40} />}
                title="此分组暂无任务"
                desc="切换分组或等待新样本进队列"
              />
            ) : (
              <div className="col gap-2">
                {filteredTasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    selected={task.id === selectedId}
                    onClick={() => setSelectedId(task.id)}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Right: annotation desk */}
          {selectedTask ? (
            <div className="col gap-3">
              {/* Keyboard shortcut hint bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 12px',
                borderRadius: 'var(--r-sm)',
                background: 'var(--surface-2)',
                border: '1px solid var(--hairline)',
                fontSize: 12,
                color: 'var(--text-3)',
                flexWrap: 'wrap',
              }}>
                {['J', 'K'].map(k => (
                  <span key={k} className="kbd-key" style={{
                    padding: '1px 6px',
                    borderRadius: 4,
                    border: '1px solid var(--hairline-strong)',
                    background: 'var(--surface-3)',
                    fontFamily: 'Geist Mono, monospace',
                    fontSize: 11,
                    color: 'var(--text-2)',
                    lineHeight: '18px',
                  }}>{k}</span>
                ))}
                <span>翻条</span>
                <span style={{ color: 'var(--hairline-strong)' }}>·</span>
                <span className="kbd-key" style={{
                  padding: '1px 6px',
                  borderRadius: 4,
                  border: '1px solid var(--hairline-strong)',
                  background: 'var(--surface-3)',
                  fontFamily: 'Geist Mono, monospace',
                  fontSize: 11,
                  color: 'var(--text-2)',
                  lineHeight: '18px',
                }}>1</span>
                <span>–</span>
                <span className="kbd-key" style={{
                  padding: '1px 6px',
                  borderRadius: 4,
                  border: '1px solid var(--hairline-strong)',
                  background: 'var(--surface-3)',
                  fontFamily: 'Geist Mono, monospace',
                  fontSize: 11,
                  color: 'var(--text-2)',
                  lineHeight: '18px',
                }}>5</span>
                <span>打分</span>

                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="mononum" style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11 }}>{selectedTask.traceRef}</span>
                  <Badge color={selectedTask.disagree ? 'var(--danger)' : 'var(--text-3)'}>
                    {appName(selectedTask.app)}
                  </Badge>
                  {selectedTask.disagree && (
                    <StatusBadge status="分歧·需仲裁" tone="bad" />
                  )}
                </span>
              </div>

              {/* Trace context card */}
              <Card className="reveal reveal-2">
                <SectionTitle>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <MessageSquare size={13} />
                    Trace 上下文
                  </span>
                </SectionTitle>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* User input */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                      用户输入
                    </div>
                    <div style={{
                      padding: '10px 13px',
                      borderRadius: 'var(--r-sm)',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--hairline)',
                      fontFamily: 'Geist Mono, monospace',
                      fontSize: 13,
                      color: 'var(--text-1)',
                      lineHeight: 1.6,
                    }}>
                      {selectedTask.input}
                    </div>
                  </div>

                  {/* LLM output */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                      模型应答
                    </div>
                    <div style={{
                      padding: '10px 13px',
                      borderRadius: 'var(--r-sm)',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--hairline)',
                      fontFamily: 'Geist Mono, monospace',
                      fontSize: 12,
                      color: 'var(--text-2)',
                      lineHeight: 1.65,
                    }}>
                      {selectedTask.output}
                    </div>
                  </div>

                  {/* Judge meta */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-3)', fontFamily: 'Geist Mono, monospace', fontSize: 11 }}>
                      judge {selectedTask.judgeScore.toFixed(2)}
                    </span>
                    <span className="badge" style={{
                      background: selectedTask.judgeConfidence < 0.6
                        ? 'color-mix(in srgb, var(--warning) 14%, transparent)'
                        : 'var(--surface-3)',
                      color: selectedTask.judgeConfidence < 0.6 ? 'var(--warning)' : 'var(--text-3)',
                      fontFamily: 'Geist Mono, monospace',
                      fontSize: 11,
                    }}>
                      conf {selectedTask.judgeConfidence.toFixed(2)}
                      {selectedTask.judgeConfidence < 0.6 && ' ⚠ 低置信'}
                    </span>
                    <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-3)', fontSize: 11 }}>
                      {selectedTask.dataset}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Annotation form OR arbitration view */}
              <Card className="reveal reveal-3">
                {selectedTask.disagree && selectedTask.humanScore !== undefined ? (
                  <>
                    <SectionTitle right={
                      <StatusBadge status="等待仲裁" tone="bad" />
                    }>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Scale size={13} />
                        仲裁视图 · 双标对比
                      </span>
                    </SectionTitle>
                    <ArbitrationView task={selectedTask} />
                    {hasPermission('annotation:write') && (
                      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => toast('仲裁意见已提交', 'success')}
                        >
                          提交仲裁意见
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <SectionTitle>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <CheckCircle2 size={13} />
                        评分表单
                      </span>
                    </SectionTitle>

                    {/* Score 1–5 */}
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>
                        质量评分（1 = 很差 · 5 = 很好）
                      </div>
                      <ScoreButtons value={score} onChange={setScore} />
                    </div>

                    {/* Labels */}
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>
                        质量标签（可多选）
                      </div>
                      <LabelChips value={labels} onChange={setLabels} />
                    </div>

                    {/* Note */}
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>
                        备注（可选）
                      </div>
                      <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="补充标注说明、具体问题描述…"
                        rows={3}
                        style={{
                          width: '100%',
                          resize: 'vertical',
                          padding: '9px 12px',
                          borderRadius: 'var(--r-sm)',
                          border: '1px solid var(--hairline)',
                          background: 'var(--surface-2)',
                          color: 'var(--text-1)',
                          fontFamily: "'Geist', 'PingFang SC', system-ui, sans-serif",
                          fontSize: 13,
                          lineHeight: 1.6,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* Submit */}
                    {hasPermission('annotation:write') && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-primary"
                          onClick={handleSubmit}
                          style={{ opacity: score === null ? 0.5 : 1 }}
                        >
                          提交标注
                        </button>
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>
          ) : (
            <Card className="reveal reveal-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
              <EmptyState
                icon={<ClipboardList size={40} />}
                title="选择一个样本开始标注"
                desc="从左侧列表点选，或按 J/K 翻条"
              />
            </Card>
          )}
        </div>
      </div>

      {/* ── Throughput & kappa chart ── */}
      <Card className="reveal reveal-5" style={{ marginTop: 14 }}>
        <SectionTitle right={
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              近 14 日 · 日产量 + 一致性
            </span>
          </div>
        }>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Users size={13} />
            标注吞吐 &amp; 一致性
          </span>
        </SectionTitle>
        <Chart
          height={220}
          build={buildThroughputChart}
          deps={[]}
        />
        <div style={{ display: 'flex', gap: 18, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--hairline)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            平均日产量 <span className="mononum" style={{ color: 'var(--text-2)', fontFamily: 'Geist Mono, monospace', fontWeight: 600 }}>
              {Math.round(ANNO_THROUGHPUT.reduce((s, p) => s + p.count, 0) / ANNO_THROUGHPUT.length)}
            </span> 条
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
            κ 均值 <span className="mononum" style={{ color: 'var(--text-2)', fontFamily: 'Geist Mono, monospace', fontWeight: 600 }}>
              {(ANNO_THROUGHPUT.reduce((s, p) => s + p.kappa, 0) / ANNO_THROUGHPUT.length).toFixed(2)}
            </span>（κ &gt; 0.80 = 良好）
          </span>
        </div>
      </Card>
    </div>
  );
}
