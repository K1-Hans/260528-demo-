// ════════════════════════════════════════════════════════════════════════
// M3 坐席协同 · 转人工队列
// perm: handoff:read（只读）/ handoff:act（接管动作）
// 视觉签名：Operator Midnight — 翡翠绿(--gold)=接通/合规，琥珀=敏感，金=资质徽章
// ════════════════════════════════════════════════════════════════════════
import { Fragment, useState } from 'react';
import {
  PhoneForwarded, Users, Clock, CheckCircle2, AlertTriangle,
  DollarSign, MessageSquareWarning, HelpCircle, ChevronRight,
  TrendingDown, Award, Headphones,
} from 'lucide-react';
import { PageHeader, StatCard, Badge, SectionTitle } from '../components/ui';
import { StatusBadge, toast } from '../components/kit';
import { Panel, TimeChip } from '../components/sig';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar, pass, review } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import type { HandoffTicket, HandoffReason, CampaignScene } from '../types';

// ─── 页面专属 mock 数据 ──────────────────────────────────────────────────────

const SCENES: CampaignScene[] = [
  '信用卡激活回访', '逾期 M1 提醒', '理财到期回访', 'NPS 满意度回访',
];

const MOCK_TICKETS: HandoffTicket[] = [
  {
    id: 'hq-001', customer: '138****2841', scene: '信用卡激活回访',
    reason: '大额业务', waitSec: 87,
    summary: '客户咨询单笔刷卡上限及账单日调整，涉及账户资金逾 2 万，超 AI 权限阈值，需人工授权操作。',
    collected: ['身份核验', '预留手机', '意向业务'],
    status: '排队中',
  },
  {
    id: 'hq-002', customer: '152****7763', scene: '逾期 M1 提醒',
    reason: '投诉敏感词', waitSec: 134,
    summary: '对话第 2:14 触发"投诉银行""举报"敏感词，情绪激动（负向），AI 立即转人工并登记免打扰。',
    collected: ['身份核验', '逾期金额', '还款意愿'],
    status: '排队中',
  },
  {
    id: 'hq-003', customer: '187****4490', scene: 'NPS 满意度回访',
    reason: '三次未识别意图', waitSec: 42,
    summary: '连续三轮未匹配意图槽（客户口音干扰 + 背景噪音），barge-in 打断率 100%，置信度 <0.45，自动降级。',
    collected: ['身份核验'],
    status: '排队中',
  },
  {
    id: 'hq-004', customer: '135****8821', scene: '理财到期回访',
    reason: '客户要求人工', waitSec: 215,
    summary: '客户主动按 0 转人工，询问理财产品续期条款及收益测算，需专属理财顾问对接。',
    collected: ['身份核验', '到期产品', '续期意向'],
    status: '排队中',
  },
  {
    id: 'hq-005', customer: '139****0033', scene: '信用卡激活回访',
    reason: '合规复核', waitSec: 31,
    summary: '系统检测到本次外呼已达频控阈值上限（今日第 3 次），合规模块触发暂停并转人工审核是否继续。',
    collected: ['身份核验', '频控状态'],
    status: '排队中',
  },
  {
    id: 'hq-006', customer: '177****6612', scene: '逾期 M1 提醒',
    reason: '大额业务', waitSec: 0,
    summary: '客户表示可当日还款，已确认还款金额 ¥18,600，需人工完成核销登记。',
    collected: ['身份核验', '还款意愿', '还款金额', '还款时间'],
    status: '已接管', agent: '坐席-陈晓',
  },
];

// 转人工原因占比（环形图数据）
const REASON_DATA: { name: HandoffReason; value: number; color: string }[] = [
  { name: '客户要求人工', value: 38, color: '' },
  { name: '大额业务', value: 27, color: '' },
  { name: '投诉敏感词', value: 18, color: '' },
  { name: '三次未识别意图', value: 12, color: '' },
  { name: '合规复核', value: 5, color: '' },
];

// 人工 vs AI 处理时长对比（秒）
const DURATION_DATA = [
  { scene: '激活回访', ai: 48, human: 192 },
  { scene: 'M1 提醒', ai: 62, human: 247 },
  { scene: '理财回访', ai: 55, human: 318 },
  { scene: 'NPS 回访', ai: 41, human: 175 },
  { scene: '额度告知', ai: 37, human: 143 },
];

// 坐席忙闲泳道
interface AgentLane {
  id: string;
  name: string;
  status: 'busy' | 'idle' | 'wrap';
  currentCustomer?: string;
  currentScene?: CampaignScene;
  workSec?: number;
}

const MOCK_AGENTS: AgentLane[] = [
  { id: 'ag-1', name: '坐席-陈晓', status: 'busy', currentCustomer: '177****6612', currentScene: '逾期 M1 提醒', workSec: 127 },
  { id: 'ag-2', name: '坐席-吴明', status: 'idle' },
  { id: 'ag-3', name: '坐席-周静', status: 'wrap', workSec: 45 },
  { id: 'ag-4', name: '坐席-赵刚', status: 'busy', currentCustomer: '139****5541', currentScene: '信用卡激活回访', workSec: 203 },
  { id: 'ag-5', name: '坐席-林芳', status: 'idle' },
  { id: 'ag-6', name: '坐席-黄涛', status: 'busy', currentCustomer: '158****7820', currentScene: 'NPS 满意度回访', workSec: 89 },
];

// ─── 触发规则卡数据 ──────────────────────────────────────────────────────────
interface TriggerRule {
  id: string;
  title: string;
  desc: string;
  detail: string;
  icon: React.ReactNode;
  tone: 'warn' | 'bad' | 'info';
  triggerCount: number;
}

const TRIGGER_RULES: TriggerRule[] = [
  {
    id: 'r1',
    title: '大额业务阈值',
    desc: '单笔金额 > ¥5,000',
    detail: '当客户意图涉及单笔转账、还款或产品购买金额超出 ¥5,000 时，AI 无权限操作，强制转人工授权完成。',
    icon: <DollarSign size={14} />,
    tone: 'info',
    triggerCount: 312,
  },
  {
    id: 'r2',
    title: '投诉敏感词命中',
    desc: '命中 [投诉 / 举报 / 律师] 等词',
    detail: '对话实时检测敏感词库（共 47 条投诉词），命中即刻暂停 AI 话术，安抚客户后转专属投诉受理坐席，并记录留痕。',
    icon: <MessageSquareWarning size={14} />,
    tone: 'warn',
    triggerCount: 188,
  },
  {
    id: 'r3',
    title: '三次未识别意图',
    desc: '连续 3 轮置信度 < 0.50',
    detail: '当 ASR / LLM 联合置信度连续三轮低于 0.50（噪音干扰 / 方言 / barge-in），AI 自动降级转人工，避免无效循环对话。',
    icon: <HelpCircle size={14} />,
    tone: 'bad',
    triggerCount: 97,
  },
];

// ─── 辅助函数 ────────────────────────────────────────────────────────────────
function reasonColor(reason: HandoffReason): string {
  const map: Record<HandoffReason, string> = {
    '大额业务': 'var(--info)',
    '投诉敏感词': 'var(--warning)',
    '三次未识别意图': 'var(--danger)',
    '客户要求人工': 'var(--text-2)',
    '合规复核': 'var(--gold)',
  };
  return map[reason] ?? 'var(--text-3)';
}

function agentStatusLabel(s: AgentLane['status']) {
  return { busy: '通话中', idle: '空闲', wrap: '小结' }[s];
}

function agentStatusColor(s: AgentLane['status']) {
  return { busy: 'var(--success)', idle: 'var(--text-3)', wrap: 'var(--warning)' }[s];
}

// ─── ECharts builders ────────────────────────────────────────────────────────
function buildReasonDonut() {
  const surface = cssVar('--surface-1');
  const text1 = cssVar('--text-1');
  const text3 = cssVar('--text-3');
  const font = "'Geist','PingFang SC',system-ui,sans-serif";
  const colors = [
    cssVar('--text-2'),
    cssVar('--info'),
    cssVar('--warning'),
    cssVar('--danger'),
    cssVar('--gold'),
  ];
  return {
    ...baseOption(),
    color: colors,
    legend: {
      orient: 'vertical', right: 12, top: 'middle',
      textStyle: { color: text3, fontSize: 11, fontFamily: font },
      icon: 'circle', itemWidth: 8, itemHeight: 8, itemGap: 8,
    },
    series: [{
      type: 'pie',
      radius: ['46%', '70%'],
      center: ['38%', '50%'],
      avoidLabelOverlap: true,
      label: {
        show: true, position: 'inside',
        formatter: '{d}%',
        fontSize: 10, fontWeight: 600,
        fontFamily: "'Geist Mono',monospace",
        color: '#fff',
      },
      labelLine: { show: false },
      emphasis: {
        itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,.3)' },
        label: { show: true },
      },
      data: REASON_DATA.map((r, i) => ({
        value: r.value, name: r.name,
        itemStyle: { color: colors[i], borderRadius: 4, borderColor: surface, borderWidth: 2 },
      })),
      animationDuration: 800, animationEasing: 'cubicOut' as const,
    }],
    graphic: [{
      type: 'text',
      left: 'center', top: '42%',
      style: { text: '转人工', fill: text3, font: `11px ${font}`, textAlign: 'center' },
    }, {
      type: 'text',
      left: '38%', top: '48%',
      style: { text: '原因分布', fill: text3, font: `10px ${font}`, textAlign: 'center' },
    }],
    tooltip: {
      ...baseOption().tooltip as Record<string, unknown>,
      trigger: 'item',
      formatter: (p: { name: string; value: number; percent: number }) =>
        `${p.name}<br/><span style="font-family:'Geist Mono',monospace;font-weight:600">${p.value}%</span>`,
    },
  };
}

function buildDurationBar() {
  const scenes = DURATION_DATA.map(d => d.scene);
  const aiData = DURATION_DATA.map(d => d.ai);
  const humanData = DURATION_DATA.map(d => d.human);
  return {
    ...baseOption(),
    legend: {
      data: ['AI 处理', '人工处理'],
      top: 4, right: 8,
      textStyle: { color: cssVar('--text-3'), fontSize: 11, fontFamily: "'Geist',sans-serif" },
      icon: 'roundRect', itemWidth: 10, itemHeight: 6,
    },
    xAxis: {
      type: 'category',
      data: scenes,
      ...axisStyle(),
      axisLabel: { ...axisStyle().axisLabel, fontSize: 10, interval: 0 },
    },
    yAxis: {
      type: 'value',
      name: '秒',
      nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 },
      ...axisStyle(),
    },
    series: [
      {
        name: 'AI 处理', type: 'bar', data: aiData,
        barWidth: '28%', barGap: '8%',
        itemStyle: { color: pass(), borderRadius: [3, 3, 0, 0] },
        label: {
          show: true, position: 'top',
          formatter: (p: { value: number }) => `${p.value}s`,
          fontSize: 10, color: cssVar('--text-3'),
          fontFamily: "'Geist Mono',monospace",
        },
        animationDuration: 800, animationEasing: 'cubicOut' as const,
        animationDelay: (i: number) => i * 60,
      },
      {
        name: '人工处理', type: 'bar', data: humanData,
        barWidth: '28%', barGap: '8%',
        itemStyle: { color: review(), borderRadius: [3, 3, 0, 0] },
        label: {
          show: true, position: 'top',
          formatter: (p: { value: number }) => `${p.value}s`,
          fontSize: 10, color: cssVar('--text-3'),
          fontFamily: "'Geist Mono',monospace",
        },
        animationDuration: 800, animationEasing: 'cubicOut' as const,
        animationDelay: (i: number) => i * 60 + 30,
      },
    ],
    tooltip: {
      ...baseOption().tooltip as Record<string, unknown>,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: { seriesName: string; value: number; name: string }[]) => {
        const scene = params[0]?.name ?? '';
        return `${scene}<br/>` + params.map(p =>
          `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.seriesName === 'AI 处理' ? pass() : review()};margin-right:5px"></span>${p.seriesName} <span style="font-family:'Geist Mono',monospace;font-weight:600;margin-left:4px">${p.value}s</span>`
        ).join('<br/>');
      },
    },
  };
}

// ─── 子组件 ──────────────────────────────────────────────────────────────────

function TriggerRuleCard({ rule }: { rule: TriggerRule }) {
  const toneColor = {
    warn: 'var(--warning)',
    bad: 'var(--danger)',
    info: 'var(--info)',
  }[rule.tone];

  return (
    <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: 8,
          background: `color-mix(in srgb, ${toneColor} 14%, transparent)`,
          color: toneColor, flexShrink: 0,
        }}>
          {rule.icon}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{rule.title}</div>
          <div style={{ fontSize: 11, color: toneColor, fontWeight: 600, marginTop: 1 }}>{rule.desc}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mononum" style={{ fontSize: 18, fontWeight: 700, color: toneColor }}>{rule.triggerCount}</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em' }}>本周触发</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, paddingTop: 4, borderTop: '1px solid var(--hairline)' }}>
        {rule.detail}
      </div>
    </div>
  );
}

function CollectedChip({ label }: { label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999,
      background: 'color-mix(in srgb, var(--success) 12%, transparent)',
      color: 'var(--success)', fontSize: 11, fontWeight: 500,
    }}>
      <CheckCircle2 size={10} />
      {label}
    </span>
  );
}

function HandoffCard({
  ticket, canAct, onTakeOver,
}: {
  ticket: HandoffTicket;
  canAct: boolean;
  onTakeOver: (id: string) => void;
}) {
  const isUrgent = ticket.waitSec > 120;
  const borderColor = ticket.status === '已接管'
    ? 'var(--success)' : isUrgent ? 'var(--warning)' : 'var(--hairline)';

  return (
    <div className="card" style={{
      padding: '14px 16px',
      borderLeft: `3px solid ${borderColor}`,
      display: 'flex', flexDirection: 'column', gap: 10,
      opacity: ticket.status === '已接管' ? 0.72 : 1,
    }}>
      {/* 头部：客户 + 场景 + 等待时长 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '0.02em' }}>
              {ticket.customer}
            </span>
            <span className="badge" style={{
              background: `color-mix(in srgb, ${reasonColor(ticket.reason)} 14%, transparent)`,
              color: reasonColor(ticket.reason), fontSize: 10, fontWeight: 600,
            }}>
              {ticket.reason}
            </span>
            <Badge>{ticket.scene}</Badge>
            {ticket.status === '已接管' && (
              <StatusBadge status={`已接管 · ${ticket.agent}`} tone="good" />
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 2 }}>等待</div>
          {ticket.status === '已接管'
            ? <span className="mononum" style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>已接管</span>
            : <TimeChip seconds={ticket.waitSec} countUp={true} urgentBelow={0} />
          }
        </div>
      </div>

      {/* AI 摘要 */}
      <div style={{
        fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6,
        padding: '8px 10px', borderRadius: 8,
        background: 'color-mix(in srgb, var(--gold) 5%, var(--surface-2))',
        borderLeft: '2px solid color-mix(in srgb, var(--gold) 40%, transparent)',
      }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
          AI 上下文摘要
        </span>
        {ticket.summary}
      </div>

      {/* 已收集字段 + 接管按钮 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>已采集</span>
        {ticket.collected.map(f => <CollectedChip key={f} label={f} />)}
        <div style={{ flex: 1 }} />
        {ticket.status === '排队中' && (
          <button
            className="btn btn-primary"
            style={{ fontSize: 12, padding: '5px 14px', height: 30 }}
            disabled={!canAct}
            title={canAct ? '接管此会话' : '当前角色无接管权限'}
            onClick={() => onTakeOver(ticket.id)}
          >
            <Headphones size={13} />
            接管
          </button>
        )}
      </div>
      {!canAct && ticket.status === '排队中' && (
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>当前角色无 handoff:act 权限</span>
      )}
    </div>
  );
}

function AgentStatusBar({ agent }: { agent: AgentLane }) {
  const color = agentStatusColor(agent.status);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 12px', borderRadius: 10,
      background: 'var(--surface-2)',
      border: '1px solid var(--hairline)',
    }}>
      {/* 状态指示点 */}
      <span style={{
        width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
        boxShadow: agent.status === 'busy' ? `0 0 0 3px color-mix(in srgb, ${color} 20%, transparent)` : 'none',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{agent.name}</div>
        {agent.status !== 'idle' && agent.currentScene && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {agent.currentCustomer} · {agent.currentScene}
          </div>
        )}
        {agent.status === 'idle' && (
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>等待接单</div>
        )}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color, fontWeight: 600, letterSpacing: '0.04em' }}>
          {agentStatusLabel(agent.status)}
        </div>
        {agent.workSec != null && (
          <TimeChip seconds={agent.workSec} countUp={true} urgentBelow={0} />
        )}
      </div>
    </div>
  );
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────
export default function HandoffQueue() {
  const { hasPermission } = useAuth();
  const canAct = hasPermission('handoff:act');

  const [tickets, setTickets] = useState<HandoffTicket[]>(MOCK_TICKETS);

  const queuing = tickets.filter(t => t.status === '排队中');
  const takenOver = tickets.filter(t => t.status === '已接管');
  const idleAgents = MOCK_AGENTS.filter(a => a.status === 'idle').length;

  function handleTakeOver(id: string) {
    if (!canAct) return;
    setTickets(prev => prev.map(t =>
      t.id === id ? { ...t, status: '已接管' as const, agent: '当前坐席' } : t
    ));
    toast('已接管会话，AI 上下文已同步至坐席工作台', 'success');
  }

  return (
    <div className="page page-wide">
      <PageHeader
        title="坐席协同 · 转人工队列"
        subtitle="转人工触发规则 · AI 上下文摘要 · 一键接管 · 坐席忙闲泳道"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              <span className="mononum" style={{ color: 'var(--warning)', fontWeight: 700 }}>{queuing.length}</span> 排队中
            </span>
            <ChevronRight size={13} style={{ color: 'var(--text-3)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              <span className="mononum" style={{ color: 'var(--success)', fontWeight: 700 }}>{idleAgents}</span> 坐席空闲
            </span>
          </div>
        }
      />

      {/* KPI 条 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="今日转人工" raw={597} unit="次" icon={<PhoneForwarded size={14} />} />
        <StatCard label="平均等待" raw={118} unit="秒" decimals={0} change={-12} icon={<Clock size={14} />} />
        <StatCard label="接管率" raw={94.7} unit="%" decimals={2} change={2} icon={<CheckCircle2 size={14} />} />
        <StatCard label="转人工率" raw={8.3} unit="%" decimals={2} change={-37} icon={<TrendingDown size={14} />} />
      </div>

      {/* 主体三列布局 */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr 300px', gap: 14, alignItems: 'start' }}>

        {/* 左列：触发规则 + 坐席忙闲 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Panel
            title="转人工触发规则"
            icon={<AlertTriangle size={13} style={{ color: 'var(--warning)', marginRight: 5 }} />}
            right={<span style={{ fontSize: 11, color: 'var(--text-3)' }}>3 条规则</span>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px' }}>
              {TRIGGER_RULES.map(rule => (
                <TriggerRuleCard key={rule.id} rule={rule} />
              ))}
            </div>
          </Panel>

          <Panel
            title="坐席忙闲泳道"
            icon={<Users size={13} style={{ color: 'var(--gold)', marginRight: 5 }} />}
            right={
              <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                <span style={{ color: 'var(--success)' }}>
                  <span className="mononum">{MOCK_AGENTS.filter(a => a.status === 'busy').length}</span> 通话中
                </span>
                <span style={{ color: 'var(--text-3)' }}>
                  <span className="mononum">{idleAgents}</span> 空闲
                </span>
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px' }}>
              {MOCK_AGENTS.map(agent => (
                <AgentStatusBar key={agent.id} agent={agent} />
              ))}
            </div>
          </Panel>
        </div>

        {/* 中列：队列卡片 */}
        <Panel
          title="转人工队列"
          icon={<PhoneForwarded size={13} style={{ color: 'var(--gold)', marginRight: 5 }} />}
          right={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge" style={{
                background: 'color-mix(in srgb, var(--warning) 14%, transparent)',
                color: 'var(--warning)', fontWeight: 600,
              }}>
                {queuing.length} 排队中
              </span>
              <span className="badge" style={{
                background: 'color-mix(in srgb, var(--success) 12%, transparent)',
                color: 'var(--success)', fontWeight: 600,
              }}>
                {takenOver.length} 已接管
              </span>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px' }}>
            {queuing.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 13 }}>
                <CheckCircle2 size={24} style={{ color: 'var(--success)', marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                队列已清空，所有会话已处理
              </div>
            )}
            {/* 排队中 */}
            {queuing.map(t => (
              <HandoffCard key={t.id} ticket={t} canAct={canAct} onTakeOver={handleTakeOver} />
            ))}
            {/* 已接管 */}
            {takenOver.length > 0 && (
              <Fragment key="taken-section">
                <SectionTitle>已接管</SectionTitle>
                {takenOver.map(t => (
                  <HandoffCard key={t.id} ticket={t} canAct={canAct} onTakeOver={handleTakeOver} />
                ))}
              </Fragment>
            )}
          </div>
        </Panel>

        {/* 右列：图表 + benchmark */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 转人工原因环形图 */}
          <Panel
            title="转人工原因构成"
            icon={<AlertTriangle size={13} style={{ color: 'var(--warning)', marginRight: 5 }} />}
          >
            <div style={{ padding: '0 8px 8px' }}>
              <Chart build={buildReasonDonut} height={200} deps={[]} />
            </div>
          </Panel>

          {/* 人工 vs AI 处理时长对比 */}
          <Panel
            title="处理时长对比"
            icon={<Clock size={13} style={{ color: 'var(--gold)', marginRight: 5 }} />}
            right={<span style={{ fontSize: 11, color: 'var(--text-3)' }}>AI vs 人工（秒）</span>}
          >
            <div style={{ padding: '0 8px 8px' }}>
              <Chart build={buildDurationBar} height={220} deps={[]} />
            </div>
          </Panel>

          {/* Benchmark 标注卡：得助华帝案例 */}
          <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: 6,
                background: 'color-mix(in srgb, var(--qual) 14%, transparent)',
                color: 'var(--qual)', flexShrink: 0,
              }}>
                <Award size={13} />
              </span>
              <span className="qual-badge">行业 Benchmark · 消金外呼中台</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5, borderBottom: '1px solid var(--hairline)', paddingBottom: 8 }}>
              某消费金融客户（信用卡中心，月外呼量 120 万次）导入 AI 外呼 + 智能转人工后 6 个月效果（来源：得助智能·华帝案例）
            </div>
            {[
              { label: '转人工率降低', value: '37%', icon: <TrendingDown size={12} />, color: 'var(--success)' },
              { label: 'ASR 识别准确率', value: '93.00%', icon: <CheckCircle2 size={12} />, color: 'var(--gold)' },
              { label: '客户满意度', value: '>90%', icon: <CheckCircle2 size={12} />, color: 'var(--gold)' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: row.color }}>{row.icon}</span>
                <span style={{ flex: 1, fontSize: 11, color: 'var(--text-2)' }}>{row.label}</span>
                <span className="mononum" style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
