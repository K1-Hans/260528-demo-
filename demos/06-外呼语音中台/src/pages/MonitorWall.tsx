import { useMemo, useRef, useState } from 'react';
import { PhoneCall, PhoneIncoming, Filter, ActivitySquare, Radio, ShieldCheck, Bot } from 'lucide-react';
import { PageHeader, StatCard } from '../components/ui';
import { Panel, CallStateBadge, TimeChip } from '../components/sig';
import Waveform from '../components/Waveform';
import TranscriptTimeline from '../components/TranscriptTimeline';
import Chart from '../components/Chart';
import { baseOption, cssVar } from '../lib/chartTheme';
import { useInterval, usePrefersReducedMotion } from '../lib/hooks';
import type { AgentSeat, CallState, CampaignScene, TranscriptTurn } from '../types';
import { CALL_STATE_LABEL } from '../types';

const SCENES: CampaignScene[] = ['信用卡激活回访', '逾期 M1 提醒', '理财到期回访', 'NPS 满意度回访', '额度提升告知', '还款日提醒'];
const FAMILY = ['王', '李', '张', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '林', '何'];
function maskPhone(i: number) { return `1${3 + (i % 6)}${String((i * 137) % 10)}****${String(1000 + (i * 271) % 9000).slice(0, 4)}`; }

let SEQ = 100;
let TUID = 0;   // 转写 turn 全局唯一 id 计数器（防 pickSeat 重置后 key 撞）
function mkSeat(i: number, state: CallState): AgentSeat {
  SEQ += 1;
  return {
    id: `seat-${i}`, agentNo: `#A${String(i + 1).padStart(2, '0')}`,
    customer: maskPhone(SEQ), scene: SCENES[i % SCENES.length], state,
    durationSec: state === 'talking' ? 8 + (i * 7) % 180 : 0,
  };
}
const INIT_STATES: CallState[] = ['talking', 'talking', 'ringing', 'talking', 'dialing', 'talking', 'wrap', 'talking', 'ringing', 'talking', 'dialing', 'talking', 'talking', 'wrap', 'ringing', 'talking'];
const SEED_SEATS = INIT_STATES.map((s, i) => mkSeat(i, s));

// 信用卡激活回访 · 流式转写脚本（含一句投诉敏感词 → 触发转人工）
const SCRIPT: Omit<TranscriptTurn, 'id'>[] = [
  { speaker: 'ai', text: '您好，这里是示例消费金融客户回访，工号 8801，请问是机主本人吗？', at: '00:02', intent: '开场白' },
  { speaker: 'cust', text: '是我，什么事？', at: '00:06', emotion: 'neu' },
  { speaker: 'ai', text: '占用您一分钟，您上周新开通的信用贷账户已激活成功，本次仅作安全确认，不涉及任何费用。', at: '00:09', intent: '身份确认' },
  { speaker: 'cust', text: '哦，激活了就行，我有点忙。', at: '00:15', emotion: 'neu' },
  { speaker: 'ai', text: '好的，不打扰您太久。请确认下，您预留的服务手机号是否仍是尾号 2841？', at: '00:18', intent: '字段核对' },
  { speaker: 'cust', text: '对，是这个号。', at: '00:23', emotion: 'pos' },
  { speaker: 'ai', text: '已为您核对完成。账户如有异常可随时致电客服 400-800-1234。', at: '00:26', intent: '风险提示' },
  { speaker: 'cust', text: '你们怎么老打电话，我要投诉！', at: '00:31', emotion: 'neg', sensitive: true },
  { speaker: 'ai', text: '非常抱歉打扰到您，已为您登记免打扰，并转接专属人工客服为您处理。', at: '00:35', intent: '安抚 · 转人工' },
];

const FUNNEL_SEED = [
  { stage: '呼出', value: 8420 }, { stage: '接通', value: 5610 }, { stage: '有效通话', value: 3980 },
  { stage: '意向', value: 1840 }, { stage: '转化/回收', value: 1126 },
];

const EVENT_POOL = (state: CallState, seat: AgentSeat) => {
  const m: Record<CallState, string> = {
    talking: `${seat.agentNo} 接通 ${seat.scene} · ${seat.customer}`,
    ringing: `${seat.agentNo} 振铃中 ${seat.customer}`,
    dialing: `${seat.agentNo} 发起外呼 ${seat.scene}`,
    wrap: `${seat.agentNo} 通话结束 · 进入小结`,
  };
  return m[state];
};

export default function MonitorWall() {
  const reduced = usePrefersReducedMotion();
  const [seats, setSeats] = useState<AgentSeat[]>(SEED_SEATS);
  const [selId, setSelId] = useState('seat-0');
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [turns, setTurns] = useState<TranscriptTurn[]>(() => SCRIPT.slice(0, 4).map(t => ({ ...t, id: `tt${TUID++}` })));
  const turnIdx = useRef(4);
  const [events, setEvents] = useState<{ id: string; text: string; level: 'ok' | 'warn' | 'danger' }[]>([
    { id: 'e0', text: '#A03 接通 信用卡激活回访 · 138****2841', level: 'ok' },
    { id: 'e1', text: '#B12 触发敏感词[投诉] → 已转人工', level: 'warn' },
    { id: 'e2', text: '频控拦截 · 北京 138****9920 命中单日上限', level: 'warn' },
  ]);
  const evSeq = useRef(3);
  const [connected, setConnected] = useState(5610);

  // 坐席墙实时推进（状态机 + 计时 + 事件）· 尊重 reduce-motion
  useInterval(() => {
    setSeats(prev => {
      const next = prev.map(s => ({ ...s }));
      // 推进 2-3 个坐席的状态
      const picks = [Math.floor(Date.now() / 1000) % next.length, (Math.floor(Date.now() / 1700) + 5) % next.length];
      picks.forEach(idx => {
        const s = next[idx];
        const cycle: CallState[] = ['dialing', 'ringing', 'talking', 'wrap'];
        const ci = cycle.indexOf(s.state);
        const ns = cycle[(ci + 1) % cycle.length];
        if (ns === 'talking') { setPulseId(s.id); setConnected(c => c + 1); }
        if (ns === 'dialing') { s.customer = maskPhone(++SEQ); s.scene = SCENES[(idx + Math.floor(Date.now() / 3000)) % SCENES.length]; }
        s.state = ns; s.durationSec = ns === 'talking' ? 1 : 0;
        const lv = (ns === 'talking' ? 'ok' : 'warn') as 'ok' | 'warn';
        setEvents(ev => [{ id: `e${++evSeq.current}`, text: EVENT_POOL(ns, s), level: lv }, ...ev].slice(0, 8));
      });
      // 通话中计时 +2s
      next.forEach(s => { if (s.state === 'talking') s.durationSec += 2; });
      return next;
    });
  }, 2200, !reduced);

  // 选中坐席的流式转写（逐句吐出，循环）
  useInterval(() => {
    if (turnIdx.current >= SCRIPT.length) { return; }
    const t = SCRIPT[turnIdx.current];
    const nid = `tt${TUID++}`;   // 在 updater 外算好，保证纯函数 + id 唯一稳定
    setTurns(prev => [...prev, { ...t, id: nid }]);
    if (t.sensitive) setEvents(ev => [{ id: `e${++evSeq.current}`, text: `${seatById(selId)?.agentNo ?? '#A01'} 触发敏感词[投诉] → 自动转人工`, level: 'warn' as const }, ...ev].slice(0, 8));
    turnIdx.current += 1;
  }, 2600, !reduced);

  function seatById(id: string) { return seats.find(s => s.id === id); }
  const sel = seatById(selId);

  // 选中切换 → 重置转写脚本（演示流式）
  const pickSeat = (id: string) => {
    setSelId(id);
    setTurns(SCRIPT.slice(0, 3).map(t => ({ ...t, id: `tt${TUID++}` })));
    turnIdx.current = 3;
  };

  const talkingCount = useMemo(() => seats.filter(s => s.state === 'talking').length, [seats]);
  const connectRate = 66.6;

  const funnel = () => ({
    ...baseOption(),
    tooltip: { ...(baseOption().tooltip as object), trigger: 'item', formatter: (p: { name: string; value: number }) => `${p.name}<br/>${p.value.toLocaleString('zh-CN')}` },
    series: [{
      type: 'funnel', left: 8, right: 8, top: 6, bottom: 6, minSize: '32%', maxSize: '100%',
      gap: 3, label: { color: cssVar('--text-1'), fontSize: 11, formatter: '{b} {c}' },
      itemStyle: { borderColor: cssVar('--surface-1'), borderWidth: 2 },
      color: [cssVar('--c2'), cssVar('--gold'), cssVar('--c5'), cssVar('--qual'), cssVar('--success')],
      data: FUNNEL_SEED,
      animationDuration: 700,
    }],
  });

  return (
    <div className="page page-wide">
      <PageHeader
        title="实时通话监控墙"
        subtitle="AI 语音 agent 正在外呼回访 · 接通脉冲 · 流式转写 · 实时漏斗"
        actions={<div className="row gap-2"><span className="live-pulse" /><span className="t-small text-2 mononum">{talkingCount} 路通话中</span></div>}
      />

      {/* KPI 带 */}
      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 14 }}>
        <StatCard label="在呼中" raw={talkingCount + 134} unit="路" change={4.2} icon={<PhoneCall size={16} />} delayClass="reveal-1" />
        <StatCard label="今日已接通" raw={connected} unit="" change={6.8} icon={<PhoneIncoming size={16} />} delayClass="reveal-2" spark={[40, 52, 48, 61, 70, 66, 80, 92]} />
        <StatCard label="实时接通率" raw={connectRate} unit="%" decimals={1} change={2.1} icon={<Radio size={16} />} delayClass="reveal-3" />
        <StatCard label="今日转化" raw={1126} unit="" change={9.4} icon={<Filter size={16} />} delayClass="reveal-4" spark={[20, 30, 28, 45, 38, 60, 75, 88]} />
        <StatCard label="合规拦截" raw={1284} unit="" change={-3.2} icon={<ShieldCheck size={16} />} delayClass="reveal-5" />
      </div>

      {/* 主区：左 坐席墙 / 右 转写 + 漏斗 */}
      <div className="grid" style={{ gridTemplateColumns: '1.9fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel title="AI 坐席墙" icon={<ActivitySquare size={13} />} right={<span className="t-small text-3 mononum">{seats.length} 席 · 点击看转写</span>} bodyClass="panel-body">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(176px, 1fr))', gap: 10 }}>
            {seats.map(s => (
              <div
                key={s.id}
                className={`agent-card ${s.state} ${s.id === selId ? 'sel' : ''} ${pulseId === s.id ? 'connect-pulse' : ''}`}
                onClick={() => pickSeat(s.id)}
              >
                <div className="row spread" style={{ marginBottom: 7 }}>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{s.agentNo}</span>
                  <CallStateBadge state={s.state} />
                </div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.customer}</div>
                <div className="t-small text-3" style={{ marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.scene}</div>
                <div className="row spread" style={{ marginTop: 9, height: 22 }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <Waveform active={s.state === 'talking'} bars={18} height={20} />
                  </div>
                  {s.state === 'talking'
                    ? <TimeChip seconds={s.durationSec} countUp />
                    : <span className="mono t-small text-3">{CALL_STATE_LABEL[s.state]}</span>}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="col gap-3" style={{ minWidth: 0 }}>
          <Panel
            title={sel ? `实时转写 · ${sel.agentNo}` : '实时转写'}
            icon={<Bot size={13} />}
            right={sel && <span className="row gap-2"><Waveform active={sel.state === 'talking'} bars={14} height={16} /><span className="mono t-small text-3">{sel.customer}</span></span>}
            bodyClass="panel-body"
            style={{ height: 360 }}
          >
            <TranscriptTimeline turns={turns} streamingId={turns[turns.length - 1]?.id} autoScroll maxHeight={300} />
          </Panel>

          <Panel title="实时转化漏斗" icon={<Filter size={13} />} right={<span className="mononum t-small text-3">今日累计</span>}>
            <Chart build={funnel} height={210} />
          </Panel>
        </div>
      </div>

      {/* 底部事件流 */}
      <Panel title="实时事件流" icon={<Radio size={13} />} right={<span className="t-small text-3">外呼 / 接通 / 合规拦截 实时滚动</span>} bodyClass="panel-body-0">
        <div style={{ maxHeight: 160, overflowY: 'auto' }}>
          {events.map(e => (
            <div key={e.id} className="event-row">
              <span className="state-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: e.level === 'ok' ? 'var(--success)' : e.level === 'warn' ? 'var(--warning)' : 'var(--danger)', flexShrink: 0 }} />
              <span className="mono" style={{ flex: 1, color: 'var(--text-2)' }}>{e.text}</span>
              <span className="mono t-small text-3">刚刚</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
