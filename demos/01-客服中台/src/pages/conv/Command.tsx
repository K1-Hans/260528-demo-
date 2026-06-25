import { useEffect, useMemo, useState } from 'react';
import {
  Radio, Users, PhoneCall, Clock, Smile, ArrowUpRight, AlertTriangle,
  Coffee, ShieldAlert, UserPlus, TimerReset, Star,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, SectionTitle, Segmented, Sparkline } from '../../components/ui';

// ─── 本页类型（局部）──────────────────────────────────────────────────────
type Status = '通话中' | '空闲' | '小休' | '离线';
interface Agent { id: string; name: string; status: Status; live: number; handled: number; csat: number; cur?: string }
type FeedKind = 'transfer' | 'sensitive' | 'timeout' | 'bad' | 'new' | 'vip';
interface Feed { id: number; kind: FeedKind; text: string; sub: string; t: string }

const STATUS: Record<Status, { c: string; icon: React.ReactNode }> = {
  通话中: { c: 'var(--gold)', icon: <PhoneCall size={11} /> },
  空闲: { c: 'var(--success)', icon: <Smile size={11} /> },
  小休: { c: 'var(--warning)', icon: <Coffee size={11} /> },
  离线: { c: 'var(--text-3)', icon: <Clock size={11} /> },
};

const AGENTS0: Agent[] = [
  { id: 'a1', name: '林婉清', status: '通话中', live: 1, handled: 64, csat: 98, cur: '还款方式咨询' },
  { id: 'a2', name: '赵越', status: '通话中', live: 2, handled: 71, csat: 95, cur: '逾期协商' },
  { id: 'a3', name: '孙琪', status: '空闲', live: 0, handled: 58, csat: 97 },
  { id: 'a4', name: '周慎', status: '通话中', live: 1, handled: 49, csat: 99, cur: '账单分期' },
  { id: 'a5', name: '李航', status: '小休', live: 0, handled: 42, csat: 94 },
  { id: 'a6', name: '陈墨', status: '通话中', live: 3, handled: 80, csat: 96, cur: '额度提升申请' },
  { id: 'a7', name: '吴桐', status: '空闲', live: 0, handled: 53, csat: 97 },
  { id: 'a8', name: '郑岚', status: '通话中', live: 1, handled: 67, csat: 93, cur: '提前结清' },
  { id: 'a9', name: '黄屿', status: '空闲', live: 0, handled: 45, csat: 98 },
  { id: 'a10', name: '何川', status: '通话中', live: 2, handled: 76, csat: 95, cur: '注销账户' },
  { id: 'a11', name: '罗薇', status: '小休', live: 0, handled: 38, csat: 96 },
  { id: 'a12', name: '冯野', status: '离线', live: 0, handled: 0, csat: 0 },
];

const FEED_POOL: { kind: FeedKind; text: string; sub: string }[] = [
  { kind: 'transfer', text: '客户 尾号 8842 请求转人工', sub: '逾期催收 · 小云已尝试 2 轮未解决' },
  { kind: 'sensitive', text: '敏感词触发：「投诉」', sub: '会话 #SC-7741 · 已实时提示坐席' },
  { kind: 'timeout', text: '会话超时预警 · 等待 > 60s', sub: '排队中 5 · 建议增援空闲坐席' },
  { kind: 'bad', text: '收到一条差评 ★★☆☆☆', sub: '产品咨询 · 已进入 Badcase 复盘' },
  { kind: 'new', text: '新会话接入 · 信用贷还款', sub: '已分配至 林婉清 · 智能预判意图' },
  { kind: 'vip', text: 'S 类客户接入 · 优先通道', sub: '尾号 6271 · 已置顶并提醒班长' },
  { kind: 'transfer', text: '客户 尾号 3309 请求转人工', sub: '账单争议 · 情绪指数偏高' },
  { kind: 'new', text: '新会话接入 · 额度咨询', sub: '已分配至 孙琪 · 自助解决中' },
  { kind: 'sensitive', text: '敏感词触发：「银保监会」', sub: '会话 #SC-7806 · 升级合规关注' },
];

const FEED_META: Record<FeedKind, { c: string; icon: React.ReactNode; tag: string }> = {
  transfer: { c: 'var(--gold)', icon: <UserPlus size={14} />, tag: '转人工' },
  sensitive: { c: 'var(--danger)', icon: <ShieldAlert size={14} />, tag: '敏感词' },
  timeout: { c: 'var(--warning)', icon: <TimerReset size={14} />, tag: '超时' },
  bad: { c: 'var(--danger)', icon: <AlertTriangle size={14} />, tag: '差评' },
  new: { c: 'var(--success)', icon: <Radio size={14} />, tag: '新接入' },
  vip: { c: 'var(--bronze)', icon: <Star size={14} />, tag: 'VIP' },
};

const now = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

const INIT_FEED: Feed[] = FEED_POOL.slice(0, 5).map((f, i) => ({ ...f, id: i, t: now() }));

export default function Command() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>(AGENTS0);
  const [feed, setFeed] = useState<Feed[]>(INIT_FEED);
  const [filter, setFilter] = useState<'全部' | Status>('全部');
  const [kpi, setKpi] = useState({ online: 18, active: 47, queue: 5, wait: 23, csat: 96.8 });
  const seq = useMemo(() => ({ n: 100 }), []);
  const csatSpark = useMemo(() => [95.6, 96.1, 95.9, 96.4, 96.2, 96.7, 96.8], []);

  // 秒级实时刷新：推送会话流 + 抖动 KPI + 坐席通话数浮动
  useEffect(() => {
    const t = setInterval(() => {
      const p = FEED_POOL[Math.floor(Math.random() * FEED_POOL.length)];
      seq.n += 1;
      setFeed(f => [{ ...p, id: seq.n, t: now() }, ...f].slice(0, 14));
      setKpi(k => ({
        online: 18,
        active: Math.max(38, Math.min(56, k.active + Math.round((Math.random() - 0.5) * 6))),
        queue: Math.max(0, Math.min(11, k.queue + Math.round((Math.random() - 0.5) * 3))),
        wait: Math.max(8, Math.min(48, k.wait + Math.round((Math.random() - 0.5) * 8))),
        csat: Math.round((96.5 + Math.random() * 0.6) * 10) / 10,
      }));
      setAgents(as => as.map(a => a.status === '通话中' ? { ...a, live: Math.max(1, Math.min(4, a.live + (Math.random() > 0.6 ? 1 : -1))) } : a));
    }, 2600);
    return () => clearInterval(t);
  }, [seq]);

  const shown = filter === '全部' ? agents : agents.filter(a => a.status === filter);
  const counts = useMemo(() => ({
    通话中: agents.filter(a => a.status === '通话中').length,
    空闲: agents.filter(a => a.status === '空闲').length,
    小休: agents.filter(a => a.status === '小休').length,
    离线: agents.filter(a => a.status === '离线').length,
  }), [agents]);

  const KPIS = [
    { label: '在线坐席', v: `${counts.通话中 + counts.空闲 + counts.小休}`, unit: '人', icon: <Users size={15} />, tone: 'var(--text-1)' },
    { label: '当前会话', v: `${kpi.active}`, unit: '', icon: <PhoneCall size={15} />, tone: 'var(--gold)' },
    { label: '排队中', v: `${kpi.queue}`, unit: '', icon: <Clock size={15} />, tone: kpi.queue > 6 ? 'var(--danger)' : 'var(--text-1)' },
    { label: '平均等待', v: `${kpi.wait}`, unit: 's', icon: <TimerReset size={15} />, tone: kpi.wait > 35 ? 'var(--warning)' : 'var(--text-1)' },
    { label: '今日满意度', v: `${kpi.csat}`, unit: '%', icon: <Smile size={15} />, tone: 'var(--success)' },
  ];

  return (
    <div className="page" style={{ maxWidth: 1560 }}>
      <PageHeader
        title="实时指挥中心"
        subtitle="坐席状态墙 + 实时会话流 · 秒级刷新 · 全在线坐席与会话一屏掌控"
        actions={<span className="row gap-2 svc-pill"><span className="dot-pulse" />实时 · LIVE</span>}
      />

      {/* 实时 KPI 带 */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 16 }}>
        {KPIS.map((k, i) => (
          <Card key={i} className="reveal" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="spread" style={{ marginBottom: 10 }}>
              <span className="label">{k.label}</span>
              <span style={{ color: 'var(--gold)', opacity: 0.7 }}>{k.icon}</span>
            </div>
            <div className="kpi-value" style={{ color: k.tone, transition: 'color .3s var(--ease)' }}>
              {k.v}<span className="kpi-unit">{k.unit}</span>
            </div>
            {k.label === '今日满意度' && <div style={{ marginTop: 6 }}><Sparkline data={csatSpark} color="var(--success)" width={120} height={26} /></div>}
          </Card>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2.3fr 1fr', gap: 16 }}>
        {/* 坐席状态墙 */}
        <Card className="reveal reveal-1">
          <SectionTitle right={
            <Segmented value={filter} onChange={(v: '全部' | Status) => setFilter(v)}
              options={[
                { value: '全部', label: `全部 ${agents.length}` },
                { value: '通话中', label: `通话 ${counts.通话中}` },
                { value: '空闲', label: `空闲 ${counts.空闲}` },
                { value: '小休', label: `小休 ${counts.小休}` },
              ]} />
          }>坐席状态墙</SectionTitle>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(176px, 1fr))', gap: 10 }}>
            {shown.map(a => {
              const st = STATUS[a.status];
              const busy = a.status === '通话中';
              return (
                <div key={a.id} style={{ padding: 13, borderRadius: 'var(--r-md)', border: '1px solid var(--hairline)', background: busy ? 'color-mix(in srgb, var(--gold) 5%, var(--surface-1))' : 'var(--surface-1)', position: 'relative', transition: 'background .3s var(--ease)' }}>
                  <div className="row gap-2" style={{ marginBottom: 9 }}>
                    <div className="avatar" style={{ width: 32, height: 32, fontSize: 13, opacity: a.status === '离线' ? 0.4 : 1 }}>{a.name[0]}</div>
                    <div className="flex-1" style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{a.name}</div>
                      <div className="row gap-1" style={{ color: st.c, fontSize: 11, fontWeight: 600 }}>
                        {busy ? <span className="dot-pulse" style={{ background: st.c }} /> : st.icon}{a.status}
                      </div>
                    </div>
                  </div>
                  {busy && a.cur
                    ? <div className="t-small" style={{ color: 'var(--text-2)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.cur}</div>
                    : <div className="t-small text-3" style={{ marginBottom: 8 }}>{a.status === '离线' ? '今日未上线' : '等待接入'}</div>}
                  <div className="row spread" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    <span>进行 <b className="mono" style={{ color: busy ? 'var(--gold)' : 'var(--text-2)' }}>{a.live}</b></span>
                    <span>今日 <b className="mono" style={{ color: 'var(--text-2)' }}>{a.handled}</b></span>
                    <span>CSAT <b className="mono" style={{ color: a.csat >= 96 ? 'var(--success)' : a.csat ? 'var(--text-2)' : 'var(--text-3)' }}>{a.csat || '—'}</b></span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 实时会话流 */}
        <Card className="reveal reveal-2 card-pad-0" style={{ display: 'flex', flexDirection: 'column', maxHeight: 560 }}>
          <div className="spread" style={{ padding: '14px 16px', borderBottom: '1px solid var(--hairline)' }}>
            <span className="row gap-2 label"><Radio size={13} style={{ color: 'var(--gold)' }} />实时会话流</span>
            <span className="row gap-1" style={{ fontSize: 11, color: 'var(--success)' }}><span className="dot-pulse" style={{ background: 'var(--success)' }} />实时</span>
          </div>
          <div style={{ overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {feed.map(f => {
              const m = FEED_META[f.kind];
              return (
                <div key={f.id} className="fade-in row gap-3" style={{ padding: '10px 11px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', borderLeft: `2px solid ${m.c}`, alignItems: 'flex-start' }}>
                  <span style={{ color: m.c, flexShrink: 0, marginTop: 1 }}>{m.icon}</span>
                  <div className="flex-1" style={{ minWidth: 0 }}>
                    <div className="spread">
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{f.text}</span>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)', flexShrink: 0 }}>{f.t}</span>
                    </div>
                    <div className="t-small text-3" style={{ marginTop: 2, lineHeight: 1.45 }}>{f.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <button className="btn btn-subtle btn-sm" style={{ margin: 12 }} onClick={() => navigate('/live')}>
            进入实时对话台 <ArrowUpRight size={13} />
          </button>
        </Card>
      </div>
    </div>
  );
}
