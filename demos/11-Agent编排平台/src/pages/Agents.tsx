import { useState } from 'react';
import {
  Users, Activity, CheckCircle2, Network, ArrowRight, Cpu, Clock, MessageSquare,
} from 'lucide-react';
import { PageHeader, StatCard } from '../components/ui';
import { Panel, RunStateChip, TelePill } from '../components/sig';
import { MeterBar } from '../components/kit';
import Chart from '../components/Chart';
import { AGENTS, AGENT_MESSAGES, AGENT_KPIS } from '../lib/mockData';
import { accent, chanColor, baseOption, axisStyle, DRAW } from '../lib/chartTheme';

const KPI_ICONS = [
  <Users size={16} />,
  <Activity size={16} />,
  <CheckCircle2 size={16} />,
  <Network size={16} />,
];

/** 构建各 Agent 调用量横向条形图 option（颜色预解析）。 */
function buildCallsChart(): Record<string, unknown> {
  const base = baseOption();
  const ax = axisStyle();
  const accentColor = accent();
  const colors = [
    accentColor,
    chanColor('--c2'),
    chanColor('--c3'),
    chanColor('--c4'),
    chanColor('--c5'),
  ];
  const names = AGENTS.map(a => a.name);
  const calls = AGENTS.map(a => a.calls);

  return {
    ...base,
    grid: { left: 8, right: 32, top: 12, bottom: 8, containLabel: true },
    tooltip: {
      ...(base.tooltip as Record<string, unknown>),
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown[]) => {
        const p = (params as Array<{ name: string; value: number }>)[0];
        return `${p.name}<br /><b style="font-variant-numeric:tabular-nums">${p.value.toLocaleString()}</b> 次`;
      },
    },
    xAxis: {
      type: 'value',
      ...ax,
      axisLabel: {
        ...ax.axisLabel,
        formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`,
      },
    },
    yAxis: {
      type: 'category',
      data: names,
      ...ax,
      axisLabel: { ...ax.axisLabel, width: 110, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        data: calls.map((v, i) => ({
          value: v,
          itemStyle: {
            color: colors[i % colors.length],
            borderRadius: [0, 5, 5, 0],
          },
        })),
        barMaxWidth: 28,
        label: {
          show: true,
          position: 'right',
          color: chanColor('--text-3'),
          fontSize: 11,
          fontFamily: "'Geist Mono','Geist','PingFang SC',monospace",
          fontVariantNumeric: 'tabular-nums',
          formatter: ({ value }: { value: number }) => value.toLocaleString(),
        },
        ...DRAW,
      },
    ],
  };
}

export default function Agents() {
  const [selId, setSelId] = useState<string | null>(null);

  return (
    <div className="page page-wide">
      <PageHeader
        title="多 Agent 协作"
        subtitle="信贷反欺诈调查 · Agent 分工协作 · 实时消息状态机"
        actions={
          <>
            <span className="tag tag-mono">agents:read</span>
            <span
              className="row gap-2"
              style={{
                padding: '6px 11px',
                borderRadius: 'var(--r-sm)',
                background: 'var(--gold-dim)',
                color: 'var(--gold)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span className="live-pulse" />协作中 · 研判 Agent
            </span>
          </>
        }
      />

      {/* KPI 带 */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        {AGENT_KPIS.map((k, i) => (
          <StatCard key={k.label} {...k} icon={KPI_ICONS[i]} delayClass={`d${i + 1}`} />
        ))}
      </div>

      {/* 主体：花名册 + 消息流 */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* 左：Agent 花名册 */}
        <Panel
          title="Agent 花名册"
          icon={<Users size={13} />}
          right={<span className="tag">{AGENTS.length} 个已注册</span>}
        >
          <div className="col gap-2">
            {AGENTS.map(agent => {
              const isRunning = agent.status === 'running';
              const isSelected = selId === agent.id;
              return (
                <div
                  key={agent.id}
                  className="card card-hover"
                  style={{
                    padding: '12px 14px',
                    cursor: 'pointer',
                    borderColor: isSelected
                      ? 'var(--gold)'
                      : isRunning
                      ? 'rgba(34,211,238,0.45)'
                      : undefined,
                    boxShadow: isSelected
                      ? '0 0 0 1px var(--gold)'
                      : isRunning
                      ? '0 0 0 1px rgba(34,211,238,0.35)'
                      : undefined,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    opacity: selId && !isSelected ? 0.7 : 1,
                  }}
                  onClick={() => setSelId(selId === agent.id ? null : agent.id)}
                >
                  {/* 顶行：name + status chip */}
                  <div className="row spread" style={{ marginBottom: 6 }}>
                    <div className="col gap-1">
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                        {agent.name}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{agent.role}</span>
                    </div>
                    <RunStateChip state={agent.status} />
                  </div>

                  {/* 模型 pill + calls */}
                  <div className="row gap-2" style={{ marginBottom: 8 }}>
                    <TelePill icon={<Cpu size={10} />}>{agent.model}</TelePill>
                    <TelePill icon={<Activity size={10} />}>
                      <span className="tnum">{agent.calls.toLocaleString()}</span> 次
                    </TelePill>
                  </div>

                  {/* 成功率 MeterBar */}
                  <div style={{ marginBottom: 6 }}>
                    <MeterBar
                      pct={agent.successRate}
                      color="var(--success)"
                      label={`${agent.successRate.toFixed(1)}%`}
                    />
                  </div>

                  {/* 最近消息 */}
                  {agent.lastMsg && (
                    <div className="row gap-1" style={{ marginTop: 4 }}>
                      <MessageSquare size={11} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 1 }} />
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--text-3)',
                          lineHeight: 1.45,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {agent.lastMsg}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        {/* 右：实时协作消息流 */}
        <Panel
          title="协作消息流"
          icon={<MessageSquare size={13} />}
          right={
            selId ? (
              <button
                className="btn btn-sm"
                style={{ fontSize: 11 }}
                onClick={() => setSelId(null)}
              >
                清除筛选
              </button>
            ) : (
              <span className="tag text-3" style={{ fontSize: 11 }}>点选 Agent 过滤</span>
            )
          }
        >
          <div className="col gap-2" style={{ marginBottom: 16 }}>
            {AGENT_MESSAGES.map((msg, idx) => {
              const related = selId
                ? AGENTS.find(a => a.id === selId)?.name === msg.from ||
                  AGENTS.find(a => a.id === selId)?.name === msg.to
                : true;
              return (
                <div
                  key={`${msg.from}-${msg.to}-${idx}`}
                  style={{
                    padding: '11px 13px',
                    borderRadius: 'var(--r-md)',
                    background: related ? 'var(--surface-2)' : 'var(--surface-1)',
                    borderTop: '1px solid var(--hairline)',
                    borderRight: '1px solid var(--hairline)',
                    borderBottom: '1px solid var(--hairline)',
                    borderLeft: `${related ? 2 : 1}px solid ${related ? 'var(--gold)' : 'var(--hairline)'}`,
                    opacity: !selId || related ? 1 : 0.35,
                    transition: 'opacity 0.25s, border-left-color 0.25s',
                  }}
                >
                  {/* 发送方 → 接收方 */}
                  <div className="row gap-1" style={{ marginBottom: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>
                      {msg.from}
                    </span>
                    <ArrowRight size={12} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>
                      {msg.to}
                    </span>
                    <span
                      className="tnum"
                      style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}
                    >
                      <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
                      {msg.at}
                    </span>
                  </div>
                  {/* 内容 */}
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-2)',
                      lineHeight: 1.55,
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 图例说明 */}
          <div
            className="row gap-3"
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--r-sm)',
              background: 'var(--bg-sunken)',
              border: '1px solid var(--hairline)',
              fontSize: 11,
              color: 'var(--text-3)',
            }}
          >
            <span
              style={{
                width: 3,
                height: 16,
                borderRadius: 2,
                background: 'var(--gold)',
                flexShrink: 0,
              }}
            />
            <span>高亮 = 与选中 Agent 相关的消息；其余降透明</span>
          </div>
        </Panel>
      </div>

      {/* 下方：ECharts 调用量横向条形 */}
      <Panel
        title="各 Agent 调用量"
        icon={<Activity size={13} />}
        right={<span className="tag text-3" style={{ fontSize: 11 }}>今日累计</span>}
      >
        <Chart build={buildCallsChart} height={220} deps={[]} />
      </Panel>
    </div>
  );
}
