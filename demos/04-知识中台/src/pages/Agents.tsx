import { useState, useCallback, useRef } from 'react';
import {
  Search, Zap, FileText, Plug, Sparkles, CheckCircle2, Bell,
  Play, Plus, User, Clock, ChevronRight, Layers, Settings,
  BarChart2, ArrowRight, Activity, Bot, ListOrdered,
} from 'lucide-react';
import { PageHeader, Card, SectionTitle, Badge, StatCard } from '../components/ui';
import { StatusBadge, toast, Field } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, sem, DRAW } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import { KB_AGENTS, AGENT_RUNS } from '../lib/mockData';
import type { KbAgent, AgentStep, AgentStepKind } from '../types';

// ─── 步骤类型元信息 ──────────────────────────────────────────────────────────
const STEP_META: Record<AgentStepKind, { icon: React.ReactNode; label: string; desc: string; color: string }> = {
  retrieve: {
    icon: <Search size={16} />,
    label: '检索',
    desc: '从知识库语义检索相关内容',
    color: 'var(--gold)',
  },
  read: {
    icon: <FileText size={16} />,
    label: '读文档',
    desc: '全文精读指定文档段落',
    color: 'var(--c2)',
  },
  connector: {
    icon: <Plug size={16} />,
    label: '调连接器',
    desc: '从外部数据源拉取实时数据',
    color: 'var(--c3)',
  },
  generate: {
    icon: <Sparkles size={16} />,
    label: '生成',
    desc: '基于上下文生成结构化内容',
    color: 'var(--c5)',
  },
  approve: {
    icon: <CheckCircle2 size={16} />,
    label: '审批',
    desc: '低置信时转人工审批节点',
    color: 'var(--warning)',
  },
  notify: {
    icon: <Bell size={16} />,
    label: '通知',
    desc: '推送通知到指定频道或成员',
    color: 'var(--emerald)',
  },
};

const ALL_STEP_KINDS: AgentStepKind[] = ['retrieve', 'read', 'connector', 'generate', 'approve', 'notify'];

// ─── 步骤节点卡 ──────────────────────────────────────────────────────────────
function StepNode({ step, active, done, idx }: { step: AgentStep; active: boolean; done: boolean; idx: number }) {
  const meta = STEP_META[step.kind];
  return (
    <div
      className="col"
      style={{ alignItems: 'center', gap: 6, flex: '0 0 auto', minWidth: 120 }}
    >
      {/* 序号 */}
      <div
        className="mononum"
        style={{
          fontSize: 10, fontWeight: 700, color: done ? 'var(--emerald)' : active ? 'var(--gold)' : 'var(--text-3)',
          letterSpacing: '0.04em',
        }}
      >
        {String(idx + 1).padStart(2, '0')}
      </div>
      {/* 节点卡 */}
      <div
        style={{
          border: `1.5px solid ${done ? 'var(--emerald)' : active ? 'var(--gold)' : 'var(--hairline)'}`,
          borderRadius: 'var(--r-md)',
          background: done
            ? 'color-mix(in srgb, var(--emerald) 8%, var(--surface-1))'
            : active
            ? 'color-mix(in srgb, var(--gold) 10%, var(--surface-1))'
            : 'var(--surface-1)',
          padding: '12px 14px',
          width: 120,
          boxShadow: active ? '0 0 0 3px color-mix(in srgb, var(--gold) 18%, transparent)' : 'var(--elev-1)',
          transition: 'all 0.3s var(--ease)',
        }}
      >
        <div className="row gap-2" style={{ marginBottom: 6 }}>
          <span style={{ color: done ? 'var(--emerald)' : meta.color }}>{meta.icon}</span>
          <span
            className="badge"
            style={{
              background: `color-mix(in srgb, ${meta.color} 13%, transparent)`,
              color: meta.color,
              fontSize: 10,
              padding: '1px 6px',
            }}
          >
            {meta.label}
          </span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.35, marginBottom: 4 }}>
          {step.name}
        </div>
        {step.source && (
          <div
            className="src-badge"
            style={{ fontSize: 10, padding: '1px 6px', marginBottom: 4, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {step.source}
          </div>
        )}
        <div className="mononum" style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
          {done ? (
            <span style={{ color: 'var(--emerald)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <CheckCircle2 size={11} strokeWidth={2.25} /> {step.ms} ms
            </span>
          ) : (
            `${step.ms} ms`
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 箭头连线 ────────────────────────────────────────────────────────────────
function Arrow({ done }: { done: boolean }) {
  return (
    <div
      className="row"
      style={{ alignItems: 'center', paddingTop: 28, flex: '0 0 auto', gap: 0 }}
    >
      <div
        style={{
          height: 1.5,
          width: 28,
          background: done ? 'var(--emerald)' : 'var(--hairline-strong)',
          transition: 'background 0.3s',
        }}
      />
      <ChevronRight
        size={13}
        style={{
          color: done ? 'var(--emerald)' : 'var(--text-3)',
          marginLeft: -4,
          transition: 'color 0.3s',
        }}
      />
    </div>
  );
}

// ─── 主组件 ─────────────────────────────────────────────────────────────────
export default function Agents() {
  const { currentRole } = useAuth();
  const canBuild = currentRole?.permissions?.includes('agent:build') ?? false;

  const [activeAgentId, setActiveAgentId] = useState<string>(KB_AGENTS[0]?.id ?? '');
  const [runningStep, setRunningStep] = useState<number>(-1); // -1 idle, >=0 running idx
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());
  const [runSummary, setRunSummary] = useState<{ ms: number; sources: number } | null>(null);
  const runRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  const selectedAgent: KbAgent | undefined = KB_AGENTS.find(a => a.id === activeAgentId);

  // ─── 试运行逻辑 ──────────────────────────────────────────────────────────
  const handleRun = useCallback(() => {
    if (!selectedAgent) return;
    if (runRef.current) clearInterval(runRef.current);
    setDoneSteps(new Set());
    setRunSummary(null);
    setRunningStep(0);

    const steps = selectedAgent.steps;
    let idx = 0;
    runRef.current = setInterval(() => {
      setDoneSteps(prev => new Set([...prev, idx]));
      idx++;
      if (idx >= steps.length) {
        clearInterval(runRef.current!);
        setRunningStep(-1);
        const totalMs = steps.reduce((s, st) => s + st.ms, 0);
        const uniqueSources = new Set(steps.filter(st => st.source).map(st => st.source)).size;
        setRunSummary({ ms: totalMs, sources: uniqueSources });
        toast('试运行完成', 'success');
      } else {
        setRunningStep(idx);
      }
    }, 700);
  }, [selectedAgent]);

  const handleSelectAgent = (id: string) => {
    if (runRef.current) clearInterval(runRef.current);
    setActiveAgentId(id);
    setRunningStep(-1);
    setDoneSteps(new Set());
    setRunSummary(null);
  };

  const handleAddStep = (kind: AgentStepKind) => {
    toast(`已添加「${STEP_META[kind].label}」到画布`, 'info');
  };

  // ─── ECharts: 柱状 / 环形 ─────────────────────────────────────────────
  const buildBarChart = useCallback(() => {
    const a = accent();
    return {
      ...baseOption(),
      ...DRAW,
      xAxis: {
        type: 'category',
        data: AGENT_RUNS.map(r => r.name),
        ...axisStyle(),
      },
      yAxis: { type: 'value', name: '执行次/月', ...axisStyle() },
      series: [
        {
          type: 'bar',
          data: AGENT_RUNS.map(r => r.runs),
          itemStyle: { color: a, borderRadius: [4, 4, 0, 0] },
          label: {
            show: true,
            position: 'top',
            formatter: (p: { value: number }) => p.value.toLocaleString(),
            fontSize: 11,
            color: a,
            fontFamily: "'Geist','PingFang SC',sans-serif",
          },
        },
      ],
    };
  }, []);

  const buildPieChart = useCallback(() => {
    const a = accent();
    const total = AGENT_RUNS.reduce((s, r) => s + r.runs, 0);
    return {
      ...baseOption(),
      ...DRAW,
      legend: { show: false },
      tooltip: {
        ...(baseOption().tooltip as object),
        formatter: (p: { name: string; value: number; percent: number }) =>
          `${p.name}<br/><b>${p.value.toLocaleString()}</b> 次 · ${p.percent}%`,
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '72%'],
          center: ['50%', '50%'],
          data: AGENT_RUNS.map((r, i) => ({
            name: r.name,
            value: r.runs,
            itemStyle: { color: i === 0 ? a : undefined },
          })),
          label: {
            show: true,
            formatter: '{b}\n{d}%',
            fontSize: 11,
            lineHeight: 18,
          },
          emphasis: { scale: true, scaleSize: 6 },
        },
      ],
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: 'middle',
          style: {
            text: `${total.toLocaleString()}\n次/月`,
            textAlign: 'center',
            fill: sem('indexed'),
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 20,
          },
        },
      ],
    };
  }, []);

  return (
    <div className="page">
      <PageHeader
        title="Agent Builder"
        subtitle="无代码编排多步 Agent 工作流 · 企业知识 + 外部数据源自动化"
        actions={
          canBuild ? (
            <button
              className="btn btn-primary"
              onClick={() => toast('新建空白 Agent 草稿已创建', 'success')}
            >
              <Plus size={14} /> 新建空白
            </button>
          ) : (
            <span className="t-small text-3" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Settings size={13} /> 需要 Agent Builder 权限
            </span>
          )
        }
      />

      {/* KPI 三项 */}
      <div className="grid grid-cols-3 reveal" style={{ gap: 14, marginBottom: 14 }}>
        <StatCard
          label="本月 Actions 总量"
          raw={AGENT_RUNS.reduce((s, r) => s + r.runs, 0)}
          unit="次"
          change={14.2}
          icon={<Activity size={16} />}
          delayClass="reveal-1"
        />
        <StatCard
          label="已发布 Agent"
          raw={KB_AGENTS.filter(a => a.status === 'published').length}
          unit="个"
          change={0}
          icon={<Bot size={16} />}
          delayClass="reveal-2"
        />
        <StatCard
          label="平均步骤数"
          raw={Math.round(KB_AGENTS.reduce((s, a) => s + a.steps.length, 0) / Math.max(KB_AGENTS.length, 1))}
          unit="步"
          change={0}
          icon={<ListOrdered size={16} />}
          delayClass="reveal-3"
        />
      </div>

      {/* Agent Tab 列表 */}
      <div
        className="row gap-2 reveal"
        style={{
          overflowX: 'auto',
          paddingBottom: 4,
          marginBottom: 14,
          borderBottom: '1px solid var(--hairline)',
        }}
      >
        {KB_AGENTS.map(agent => (
          <button
            key={agent.id}
            className="btn btn-sm"
            style={{
              flexShrink: 0,
              background: activeAgentId === agent.id ? 'color-mix(in srgb, var(--gold) 12%, var(--surface-1))' : 'transparent',
              border: activeAgentId === agent.id ? '1px solid var(--gold)' : '1px solid var(--hairline)',
              color: activeAgentId === agent.id ? 'var(--gold)' : 'var(--text-2)',
              fontWeight: activeAgentId === agent.id ? 700 : 400,
            }}
            onClick={() => handleSelectAgent(agent.id)}
          >
            <Layers size={13} />
            {agent.name}
            <StatusBadge
              status={agent.status === 'published' ? '已发布' : '草稿'}
              tone={agent.status === 'published' ? 'good' : 'muted'}
            />
          </button>
        ))}
        <button
          className="btn btn-sm"
          style={{ flexShrink: 0, border: '1px dashed var(--hairline)', color: 'var(--text-3)' }}
          onClick={() => toast('新建空白 Agent 草稿已创建', 'success')}
        >
          <Plus size={13} /> 新建空白
        </button>
      </div>

      {/* 三栏 Builder */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr 280px',
          gap: 14,
          alignItems: 'start',
          marginBottom: 18,
        }}
      >
        {/* 左：工具箱 */}
        <div className="col gap-2 reveal">
          <SectionTitle>步骤类型</SectionTitle>
          {ALL_STEP_KINDS.map(kind => {
            const meta = STEP_META[kind];
            return (
              <button
                key={kind}
                className="card card-hover"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: '10px 12px',
                  border: '1px solid var(--hairline)',
                  background: 'var(--surface-1)',
                  display: 'block',
                  width: '100%',
                  borderRadius: 'var(--r-md)',
                }}
                onClick={() => handleAddStep(kind)}
              >
                <div className="row gap-2" style={{ marginBottom: 4 }}>
                  <span style={{ color: meta.color }}>{meta.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{meta.label}</span>
                </div>
                <div className="t-small text-3" style={{ lineHeight: 1.45 }}>{meta.desc}</div>
              </button>
            );
          })}
          <div
            className="t-small text-3"
            style={{ padding: '8px 4px', lineHeight: 1.55 }}
          >
            点击任意步骤卡可添加到当前画布
          </div>
        </div>

        {/* 中：画布 */}
        <div className="col gap-3 reveal reveal-2">
          <div className="row spread" style={{ marginBottom: 2 }}>
            <SectionTitle>
              <span className="row gap-2">
                <Layers size={13} />
                {selectedAgent?.name ?? '—'}
              </span>
            </SectionTitle>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleRun}
              disabled={runningStep >= 0}
              style={{ opacity: runningStep >= 0 ? 0.65 : 1 }}
            >
              <Play size={12} />
              {runningStep >= 0 ? '运行中…' : '试运行'}
            </button>
          </div>

          {/* 点阵画布 */}
          <div
            className="canvas-grid"
            style={{
              minHeight: 220,
              borderRadius: 'var(--r-lg)',
              border: '1px solid var(--hairline)',
              padding: '28px 24px',
              overflowX: 'auto',
              background: 'var(--surface-1)',
            }}
          >
            {selectedAgent ? (
              <div
                className="row"
                style={{ gap: 0, alignItems: 'flex-start', minWidth: 'max-content' }}
              >
                {selectedAgent.steps.map((step, idx) => (
                  <div key={step.id} className="row" style={{ gap: 0, alignItems: 'flex-start' }}>
                    <StepNode
                      step={step}
                      active={runningStep === idx}
                      done={doneSteps.has(idx)}
                      idx={idx}
                    />
                    {idx < selectedAgent.steps.length - 1 && (
                      <Arrow done={doneSteps.has(idx)} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="col"
                style={{ alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--text-3)' }}
              >
                <Layers size={28} style={{ opacity: 0.25, marginBottom: 8 }} />
                <div className="t-small">选择一个 Agent 查看流程</div>
              </div>
            )}
          </div>

          {/* 运行结果横幅 */}
          {runSummary && (
            <div
              className="row gap-3 reveal"
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--r-md)',
                background: 'color-mix(in srgb, var(--emerald) 8%, var(--surface-1))',
                border: '1px solid color-mix(in srgb, var(--emerald) 28%, transparent)',
              }}
            >
              <CheckCircle2 size={16} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
              <span className="t-small text-2">
                试运行完成 · 总耗时{' '}
                <b className="mononum" style={{ color: 'var(--emerald)' }}>{runSummary.ms.toLocaleString()} ms</b>
                {runSummary.sources > 0 && (
                  <>
                    {' '}· 调用了{' '}
                    <b className="mononum" style={{ color: 'var(--gold)' }}>{runSummary.sources}</b> 个源
                  </>
                )}
              </span>
            </div>
          )}

          {/* 月度执行量图表 */}
          <Card className="reveal reveal-3" style={{ padding: '14px 16px' }}>
            <div className="row spread" style={{ marginBottom: 10 }}>
              <SectionTitle>
                <span className="row gap-2"><BarChart2 size={13} /> Agent 月度执行量</span>
              </SectionTitle>
              <div
                className="row gap-1"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 'var(--r-sm)',
                  padding: 3,
                }}
              >
                {(['bar', 'pie'] as const).map(t => (
                  <button
                    key={t}
                    className="btn btn-sm"
                    style={{
                      background: chartType === t ? 'var(--surface-1)' : 'transparent',
                      color: chartType === t ? 'var(--text-1)' : 'var(--text-3)',
                      border: chartType === t ? '1px solid var(--hairline)' : '1px solid transparent',
                      fontSize: 11,
                      padding: '2px 8px',
                    }}
                    onClick={() => setChartType(t)}
                  >
                    {t === 'bar' ? '柱状' : '环形'}
                  </button>
                ))}
              </div>
            </div>
            <Chart
              build={chartType === 'bar' ? buildBarChart : buildPieChart}
              height={220}
              deps={[chartType]}
            />
          </Card>
        </div>

        {/* 右：配置栏 */}
        {selectedAgent && (
          <div className="col gap-3 reveal reveal-3">
            <SectionTitle>
              <span className="row gap-2"><Settings size={13} /> Agent 配置</span>
            </SectionTitle>

            {/* 基本信息 */}
            <Card style={{ padding: '14px 16px' }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
                  {selectedAgent.name}
                </div>
                <div className="t-small text-2 serif" style={{ lineHeight: 1.6 }}>
                  {selectedAgent.desc}
                </div>
              </div>
              <div className="col gap-2">
                <div className="row gap-2">
                  <span className="label">状态</span>
                  <StatusBadge
                    status={selectedAgent.status === 'published' ? '已发布' : '草稿'}
                    tone={selectedAgent.status === 'published' ? 'good' : 'muted'}
                  />
                </div>
                <div className="row gap-2">
                  <span className="label">负责人</span>
                  <span className="row gap-1 t-small text-2">
                    <User size={12} />
                    {selectedAgent.owner}
                  </span>
                </div>
                <div className="row gap-2">
                  <span className="label">月执行</span>
                  <span className="mononum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
                    {selectedAgent.monthlyRuns.toLocaleString()}
                  </span>
                  <span className="t-small text-3">次</span>
                </div>
                <div className="row gap-2">
                  <span className="label">步骤数</span>
                  <span className="mononum t-small text-2">
                    <Clock size={11} style={{ marginRight: 3 }} />
                    {selectedAgent.steps.length} 步
                    {' · '}
                    {selectedAgent.steps.reduce((s, st) => s + st.ms, 0).toLocaleString()} ms
                  </span>
                </div>
              </div>
            </Card>

            {/* 触发条件 */}
            <Card style={{ padding: '14px 16px' }}>
              <Field label="触发条件">
                <div
                  className="row gap-2"
                  style={{
                    padding: '8px 10px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 'var(--r-sm)',
                    fontSize: 13,
                    color: 'var(--text-2)',
                  }}
                >
                  <Zap size={13} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                  每日 08:00 定时触发
                </div>
              </Field>
              <Field label="输出去向">
                <div
                  className="row gap-2"
                  style={{
                    padding: '8px 10px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 'var(--r-sm)',
                    fontSize: 13,
                    color: 'var(--text-2)',
                  }}
                >
                  <Bell size={13} style={{ color: 'var(--c3)', flexShrink: 0 }} />
                  Slack #知识情报组
                </div>
              </Field>
              <Field label="失败策略">
                <div
                  className="row gap-2"
                  style={{
                    padding: '8px 10px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 'var(--r-sm)',
                    fontSize: 13,
                    color: 'var(--text-2)',
                  }}
                >
                  <CheckCircle2 size={13} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                  重试 3 次后转人工审批
                </div>
              </Field>
            </Card>

            {/* 步骤列表摘要 */}
            <Card style={{ padding: '14px 16px' }}>
              <SectionTitle>步骤摘要</SectionTitle>
              <div className="col gap-2">
                {selectedAgent.steps.map((step, idx) => {
                  const meta = STEP_META[step.kind];
                  return (
                    <div
                      key={step.id}
                      className="row gap-2"
                      style={{
                        padding: '7px 10px',
                        background: 'var(--surface-2)',
                        borderRadius: 'var(--r-sm)',
                        border: '1px solid var(--hairline)',
                      }}
                    >
                      <span
                        className="mononum"
                        style={{ fontSize: 10, color: 'var(--text-3)', width: 16, flexShrink: 0 }}
                      >
                        {idx + 1}
                      </span>
                      <span style={{ color: meta.color, flexShrink: 0 }}>{meta.icon}</span>
                      <div className="col" style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>
                          {step.name}
                        </div>
                        {step.source && (
                          <span className="t-small text-3">{step.source}</span>
                        )}
                      </div>
                      <span className="mononum" style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>
                        {step.ms} ms
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* 发布按钮 */}
            {canBuild ? (
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', gap: 6 }}
                onClick={() => toast(`「${selectedAgent.name}」已发布为团队 Agent`, 'success')}
              >
                <ArrowRight size={14} />
                发布为团队 Agent
              </button>
            ) : (
              <div
                className="t-small text-3"
                style={{
                  textAlign: 'center',
                  padding: '10px 12px',
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--hairline)',
                }}
              >
                <Settings size={12} style={{ marginRight: 4 }} />
                需要 Agent Builder 权限才可发布
              </div>
            )}
          </div>
        )}
      </div>

      {/* 权限感知提示 */}
      <div
        className="row gap-2 reveal"
        style={{
          padding: '10px 14px',
          borderRadius: 'var(--r-md)',
          background: 'var(--surface-2)',
          border: '1px solid var(--hairline)',
        }}
      >
        <Badge color={canBuild ? 'var(--emerald)' : 'var(--warning)'}>
          {canBuild ? '有 Builder 权限' : '只读 · 无 Builder 权限'}
        </Badge>
        <span className="t-small text-2">
          你正以{' '}
          <b style={{ color: currentRole?.color }}>{currentRole?.name}</b>{' '}
          运行 — 右上角切角色，{canBuild ? '当前可新建/发布 Agent' : '当前只可查看/运行现成 Agent'}。
        </span>
      </div>
    </div>
  );
}
