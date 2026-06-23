import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Inbox, ShieldCheck, ShieldAlert, AlertTriangle, Check, Gavel, Clock,
  ArrowUpRight, CornerDownLeft, ListChecks, PartyPopper,
} from 'lucide-react';
import { PageHeader, Card, Segmented, ProgressBar, EmptyState } from '../components/ui';
import { RiskBadge, toast } from '../components/kit';
import type { RiskLevel, BusinessLine, Channel } from '../types';

// ─── 本页类型（局部）──────────────────────────────────────────────────────
type Verdict = 'pass' | 'violation' | 'review' | 'later';
type QStage = '待质检' | '待复核';
type SegKind = 'normal' | 'violation' | 'compliant' | 'risk';
interface QSeg { who: 'agent' | 'customer'; text: string; t: string; kind: SegKind; tag?: string }
interface QItem { name: string; engine: 'rule' | 'llm'; hit: boolean; deduction: number; evidence?: string }
interface QCase {
  id: string; agent: string; biz: BusinessLine; channel: Channel; score: number; risk: RiskLevel;
  violations: number; time: string; stage: QStage; summary: string; segs: QSeg[]; items: QItem[];
}

// ─── mock：质检员的待办案卷队列（真实消金违规场景）────────────────────────
const CASES: QCase[] = [
  {
    id: 'QC-0832', agent: '赵越', biz: '逾期催收', channel: '通话', score: 63, risk: 'high', violations: 3, time: '09:32', stage: '待质检',
    summary: '催收通话中未告知年化利率，且出现"联系单位同事"的催收红线措辞。',
    segs: [
      { who: 'agent', text: '您这笔信用贷已逾期 18 天，今天确认下还款安排。', t: '0:20', kind: 'normal' },
      { who: 'agent', text: '您直接在 APP 申请就行，利息不高的。', t: '0:33', kind: 'violation', tag: '未告知年化利率' },
      { who: 'agent', text: '再不还款我们就只能联系您单位同事了。', t: '1:02', kind: 'violation', tag: '催收红线' },
      { who: 'customer', text: '你这是威胁我？！', t: '1:09', kind: 'risk', tag: '情绪激化' },
    ],
    items: [
      { name: '年化利率告知', engine: 'llm', hit: false, deduction: 15, evidence: '全程未明示年化利率（APR）' },
      { name: '催收红线（禁第三方施压）', engine: 'llm', hit: false, deduction: 12, evidence: '"联系您单位同事" 命中红线' },
      { name: '禁越权承诺', engine: 'rule', hit: false, deduction: 10, evidence: '"我保证给您把利息全免"' },
    ],
  },
  {
    id: 'QC-0817', agent: '孙琪', biz: '产品咨询', channel: '在线', score: 71, risk: 'mid', violations: 2, time: '09:18', stage: '待质检',
    summary: '产品咨询会话费率告知不完整，冷静期未主动说明。',
    segs: [
      { who: 'customer', text: '这个信用贷利息怎么算？', t: '0:12', kind: 'normal' },
      { who: 'agent', text: '日息万五左右啦，具体下款看额度。', t: '0:18', kind: 'violation', tag: '费率告知不全' },
      { who: 'agent', text: '您要办的话我帮您走流程～', t: '0:40', kind: 'normal' },
    ],
    items: [
      { name: '年化利率告知', engine: 'llm', hit: false, deduction: 12, evidence: '仅说"日息万五"，未折算 APR' },
      { name: '冷静期告知', engine: 'rule', hit: false, deduction: 6, evidence: '未主动告知冷静期权利' },
      { name: '开场白与机构表明', engine: 'rule', hit: true, deduction: 0 },
    ],
  },
  {
    id: 'QC-0809', agent: '李航', biz: '银行卡管理', channel: '通话', score: 92, risk: 'low', violations: 0, time: '09:09', stage: '待质检',
    summary: '换绑银行卡流程规范，身份核验、风险告知齐全，无违规。',
    segs: [
      { who: 'agent', text: '为保障资金安全，先核验您的身份信息。', t: '0:08', kind: 'compliant', tag: '身份核验' },
      { who: 'agent', text: '换绑后原卡代扣将失效，请确认新卡可用。', t: '0:46', kind: 'compliant', tag: '风险告知' },
    ],
    items: [
      { name: '身份核验', engine: 'rule', hit: true, deduction: 0 },
      { name: '风险告知', engine: 'rule', hit: true, deduction: 0 },
      { name: '结束语规范', engine: 'rule', hit: true, deduction: 0 },
    ],
  },
  {
    id: 'QC-0791', agent: '赵越', biz: '提前结清', channel: '通话', score: 58, risk: 'high', violations: 3, time: '08:51', stage: '待质检',
    summary: '提前结清通话中越权承诺减免违约金，且语气不耐烦。',
    segs: [
      { who: 'customer', text: '提前还款要不要手续费？', t: '0:15', kind: 'normal' },
      { who: 'agent', text: '您今天结清我保证给您免违约金，别犹豫了。', t: '0:22', kind: 'violation', tag: '越权承诺' },
      { who: 'agent', text: '到底办不办？我这还忙着呢。', t: '0:48', kind: 'risk', tag: '服务态度' },
    ],
    items: [
      { name: '禁越权承诺', engine: 'rule', hit: false, deduction: 15, evidence: '"保证免违约金" 超出权限' },
      { name: '服务态度规范', engine: 'llm', hit: false, deduction: 8, evidence: '"我这还忙着呢" 不耐烦' },
      { name: '违约金标准告知', engine: 'rule', hit: false, deduction: 6, evidence: '未准确告知违约金标准' },
    ],
  },
  {
    id: 'QC-0784', agent: '孙琪', biz: '注销合规', channel: '邮件', score: 78, risk: 'mid', violations: 1, time: '08:44', stage: '待质检',
    summary: '账户注销邮件回复个人信息授权撤回说明不充分。',
    segs: [
      { who: 'customer', text: '我要注销账户，个人信息怎么处理？', t: '—', kind: 'normal' },
      { who: 'agent', text: '注销后会删除账户，其他按规定保留。', t: '—', kind: 'violation', tag: '授权说明不全' },
    ],
    items: [
      { name: '个人信息授权撤回', engine: 'llm', hit: false, deduction: 10, evidence: '未说明留存范围与期限' },
      { name: '注销流程告知', engine: 'rule', hit: true, deduction: 0 },
    ],
  },
  {
    id: 'QC-0772', agent: '李航', biz: '产品咨询', channel: 'Bot', score: 85, risk: 'low', violations: 1, time: '08:32', stage: '待质检',
    summary: 'Bot 应答基本合规，利率告知话术略机械，建议优化。',
    segs: [
      { who: 'customer', text: '年化利率多少？', t: '—', kind: 'normal' },
      { who: 'agent', text: '本产品年化利率 7.2%–24%，以审批为准。', t: '—', kind: 'compliant', tag: '利率告知' },
    ],
    items: [
      { name: '年化利率告知', engine: 'rule', hit: true, deduction: 0 },
      { name: '话术自然度', engine: 'llm', hit: false, deduction: 4, evidence: '应答偏模板，缺承接' },
    ],
  },
  {
    id: 'QC-0768', agent: '赵越', biz: '逾期催收', channel: '通话', score: 66, risk: 'high', violations: 2, time: '08:25', stage: '待复核',
    summary: '坐席已申诉：认为"按时间紧迫提醒"非威胁，待复核裁定。',
    segs: [
      { who: 'agent', text: '今天是最后期限，过了影响您征信。', t: '0:30', kind: 'risk', tag: '争议点' },
      { who: 'agent', text: '我也是为您好，早还早安心。', t: '0:52', kind: 'normal' },
    ],
    items: [
      { name: '催收红线（禁威胁）', engine: 'llm', hit: false, deduction: 12, evidence: '"影响征信" 是否构成施压待定' },
      { name: '逾期后果告知', engine: 'rule', hit: true, deduction: 0 },
    ],
  },
  {
    id: 'QC-0755', agent: '孙琪', biz: 'S客户路由', channel: '在线', score: 74, risk: 'mid', violations: 1, time: '08:11', stage: '待复核',
    summary: 'S 类客户路由话术待复核：是否需升级专属通道。',
    segs: [
      { who: 'customer', text: '我是你们老客户了，怎么还排队？', t: '0:05', kind: 'normal' },
      { who: 'agent', text: '抱歉久等，这就为您优先转接。', t: '0:14', kind: 'compliant', tag: '安抚得当' },
    ],
    items: [
      { name: 'S 客户识别与路由', engine: 'rule', hit: false, deduction: 8, evidence: '未触发专属通道标记' },
      { name: '情绪安抚', engine: 'llm', hit: true, deduction: 0 },
    ],
  },
  {
    id: 'QC-0749', agent: '李航', biz: '银行卡管理', channel: '通话', score: 88, risk: 'low', violations: 0, time: '07:58', stage: '待质检',
    summary: '解绑银行卡流程规范，全程合规，可直接通过。',
    segs: [
      { who: 'agent', text: '解绑前请确认无待扣款项。', t: '0:22', kind: 'compliant', tag: '风险告知' },
    ],
    items: [
      { name: '身份核验', engine: 'rule', hit: true, deduction: 0 },
      { name: '风险告知', engine: 'rule', hit: true, deduction: 0 },
    ],
  },
  {
    id: 'QC-0741', agent: '赵越', biz: '产品咨询', channel: '在线', score: 69, risk: 'mid', violations: 2, time: '07:46', stage: '待质检',
    summary: '夸大产品额度，"轻松下款十万"涉嫌虚假宣传。',
    segs: [
      { who: 'agent', text: '我们这额度高，您这条件轻松下款十万没问题。', t: '0:19', kind: 'violation', tag: '虚假宣传' },
    ],
    items: [
      { name: '禁夸大宣传', engine: 'llm', hit: false, deduction: 12, evidence: '"轻松下款十万" 无审批依据' },
      { name: '年化利率告知', engine: 'rule', hit: false, deduction: 6, evidence: '未提及利率' },
    ],
  },
  {
    id: 'QC-0733', agent: '孙琪', biz: '提前结清', channel: '通话', score: 90, risk: 'low', violations: 0, time: '07:33', stage: '待质检',
    summary: '提前结清咨询，违约金与到账时间告知清晰，合规。',
    segs: [
      { who: 'agent', text: '提前结清违约金为剩余本金 1%，3 个工作日到账。', t: '0:25', kind: 'compliant', tag: '费用告知' },
    ],
    items: [
      { name: '违约金标准告知', engine: 'rule', hit: true, deduction: 0 },
      { name: '到账时间告知', engine: 'rule', hit: true, deduction: 0 },
    ],
  },
  {
    id: 'QC-0728', agent: '李航', biz: '逾期催收', channel: '通话', score: 61, risk: 'high', violations: 2, time: '07:21', stage: '待质检',
    summary: '催收语速过快含混带过还款方案，疑似规避告知义务。',
    segs: [
      { who: 'agent', text: '（语速极快）分期手续费按月收具体看方案您就先还着。', t: '0:33', kind: 'violation', tag: '含混告知' },
    ],
    items: [
      { name: '分期费用告知', engine: 'llm', hit: false, deduction: 12, evidence: '语速过快、未清晰告知费用' },
      { name: '逾期后果告知', engine: 'rule', hit: false, deduction: 6, evidence: '未完整告知' },
    ],
  },
];

const KIND_BAR: Record<SegKind, string> = {
  normal: 'transparent', violation: 'var(--danger)', compliant: 'var(--success)', risk: 'var(--warning)',
};
const VERDICTS: { key: Verdict; label: string; icon: React.ReactNode; tone: string; hot: string }[] = [
  { key: 'pass', label: '通过', icon: <Check size={15} />, tone: 'var(--success)', hot: '1' },
  { key: 'violation', label: '违规成立', icon: <ShieldAlert size={15} />, tone: 'var(--danger)', hot: '2' },
  { key: 'review', label: '转复核', icon: <Gavel size={15} />, tone: 'var(--gold)', hot: '3' },
  { key: 'later', label: '稍后', icon: <Clock size={15} />, tone: 'var(--text-3)', hot: '4' },
];
const scoreTone = (s: number) => (s >= 85 ? 'var(--success)' : s >= 70 ? 'var(--warning)' : 'var(--danger)');

export default function Queue() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<'all' | QStage>('all');
  const [done, setDone] = useState<Record<string, Verdict>>({});
  const [sel, setSel] = useState(0);
  const total = CASES.length;

  const list = useMemo(
    () => CASES.filter(c => !done[c.id] && (stage === 'all' || c.stage === stage)),
    [stage, done],
  );
  const cur = list[Math.min(sel, list.length - 1)];
  const processed = Object.keys(done).length;

  useEffect(() => { if (sel > list.length - 1) setSel(Math.max(0, list.length - 1)); }, [list.length, sel]);

  const decide = (v: Verdict) => {
    if (!cur) return;
    const labels: Record<Verdict, string> = { pass: '通过', violation: '判定违规成立', review: '转人工复核', later: '标记稍后处理' };
    setDone(d => ({ ...d, [cur.id]: v }));
    toast(`案卷 ${cur.id} 已${labels[v]} · 自动跳下一案`, v === 'pass' ? 'success' : v === 'violation' ? 'danger' : 'info');
    // sel 不变 → 列表收缩后自动指向下一案
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(list.length - 1, s + 1)); }
      else if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
      else if (e.key === '1') decide('pass');
      else if (e.key === '2') decide('violation');
      else if (e.key === '3') decide('review');
      else if (e.key === '4') decide('later');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, sel]);

  return (
    <div className="page" style={{ maxWidth: 1600 }}>
      <PageHeader
        title="案卷台"
        subtitle="质检员逐案流转工作台 · 像清收件箱一样把案卷一条条过完（j/k 切换 · 1-4 裁决）"
        actions={<Segmented value={stage} onChange={(v: 'all' | QStage) => { setStage(v); setSel(0); }}
          options={[{ value: 'all', label: '全部' }, { value: '待质检', label: '待质检' }, { value: '待复核', label: '待复核' }]} />}
      />

      {/* 队列进度条 */}
      <Card className="reveal" style={{ marginBottom: 14, padding: '13px 18px' }}>
        <div className="spread" style={{ marginBottom: 9 }}>
          <div className="row gap-3">
            <span className="row gap-2" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}><Inbox size={15} style={{ color: 'var(--gold)' }} />今日案卷进度</span>
            <span className="t-small text-3">已过 <b className="mono" style={{ color: 'var(--success)' }}>{86 + processed}</b> · 待办 <b className="mono" style={{ color: 'var(--text-1)' }}>{list.length}</b> / 全量 312</span>
          </div>
          <span className="t-small text-3">100% 全量 AI 预审 · 人工逐案终核</span>
        </div>
        <ProgressBar pct={((86 + processed) / 312) * 100} color="var(--gold)" height={6} />
      </Card>

      {/* 收件箱 + 详情 side-peek */}
      <div className="grid" style={{ gridTemplateColumns: '370px 1fr', gap: 14 }}>
        {/* 左：案卷队列 */}
        <Card className="reveal reveal-1 card-pad-0" style={{ display: 'flex', flexDirection: 'column', maxHeight: 640 }}>
          <div className="spread" style={{ padding: '12px 14px', borderBottom: '1px solid var(--hairline)' }}>
            <span className="label">待办队列 · {list.length}</span>
            <span className="t-small text-3 mono">j / k 切换</span>
          </div>
          <div style={{ overflowY: 'auto' }}>
            {list.length === 0 && <div style={{ padding: '40px 16px' }}><EmptyState icon={<PartyPopper size={32} />} title="队列已清空" desc="今日待办案卷全部处理完毕" /></div>}
            {list.map((c, i) => {
              const active = cur?.id === c.id;
              const rc = c.risk === 'high' ? 'var(--danger)' : c.risk === 'mid' ? 'var(--warning)' : 'var(--success)';
              return (
                <button key={c.id} onClick={() => setSel(i)}
                  style={{ width: '100%', textAlign: 'left', display: 'block', padding: '11px 14px', border: 'none', borderLeft: `2px solid ${active ? 'var(--gold)' : 'transparent'}`, borderBottom: '1px solid var(--hairline)', background: active ? 'var(--surface-2)' : 'transparent', cursor: 'pointer', transition: 'background .12s var(--ease)' }}>
                  <div className="spread" style={{ marginBottom: 4 }}>
                    <span className="row gap-2">
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: rc, flexShrink: 0 }} />
                      <span className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{c.id}</span>
                    </span>
                    <span className="mono tnum" style={{ fontSize: 13, fontWeight: 700, color: scoreTone(c.score) }}>{c.score}</span>
                  </div>
                  <div className="spread">
                    <span className="t-small text-3" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{c.agent} · {c.biz} · {c.channel}</span>
                    {c.violations > 0
                      ? <span className="badge" style={{ background: 'color-mix(in srgb, var(--danger) 13%, transparent)', color: 'var(--danger)', flexShrink: 0 }}>{c.violations} 违规</span>
                      : <span className="badge" style={{ background: 'color-mix(in srgb, var(--success) 13%, transparent)', color: 'var(--success)', flexShrink: 0 }}>合规</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* 右：案卷详情 */}
        {cur ? (
          <Card className="reveal reveal-2 card-pad-0" style={{ display: 'flex', flexDirection: 'column', maxHeight: 640 }}>
            {/* 头 */}
            <div className="spread" style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)', alignItems: 'flex-start' }}>
              <div>
                <div className="row gap-3" style={{ marginBottom: 6 }}>
                  <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{cur.id}</span>
                  <RiskBadge level={cur.risk} />
                  <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>{cur.stage}</span>
                </div>
                <div className="t-small text-3">坐席 <b style={{ color: 'var(--text-2)', fontWeight: 600 }}>{cur.agent}</b> · {cur.biz} · {cur.channel} · <span className="mono">{cur.time}</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="kpi-value" style={{ color: scoreTone(cur.score), fontSize: 34 }}>{cur.score}</div>
                <div className="label" style={{ marginTop: 2 }}>质检分</div>
              </div>
            </div>

            <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>
              <div className="t-small" style={{ color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 16, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>{cur.summary}</div>

              {/* 转写要点 */}
              <div className="section-label" style={{ marginBottom: 8 }}>转写要点</div>
              <div className="col gap-2" style={{ marginBottom: 18 }}>
                {cur.segs.map((s, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: s.who === 'agent' ? 'row' : 'row-reverse', gap: 8 }}>
                    <span style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, background: s.who === 'agent' ? 'linear-gradient(135deg,var(--bronze),var(--gold-bright))' : 'var(--surface-3)', color: s.who === 'agent' ? 'var(--accent-ink)' : 'var(--text-2)' }}>{s.who === 'agent' ? '坐' : '客'}</span>
                    <div style={{ maxWidth: '80%', padding: '8px 11px', borderRadius: 'var(--r-md)', borderLeft: s.who === 'agent' ? `2px solid ${KIND_BAR[s.kind]}` : 'none', borderRight: s.who !== 'agent' ? `2px solid ${KIND_BAR[s.kind]}` : 'none', background: s.kind === 'normal' ? 'var(--surface-2)' : `color-mix(in srgb, ${KIND_BAR[s.kind]} 9%, var(--surface-1))` }}>
                      <div className="row gap-2" style={{ marginBottom: 2, justifyContent: s.who === 'agent' ? 'flex-start' : 'flex-end' }}>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>{s.t}</span>
                        {s.tag && <span className="badge" style={{ background: `color-mix(in srgb, ${KIND_BAR[s.kind]} 15%, transparent)`, color: KIND_BAR[s.kind] === 'transparent' ? 'var(--text-3)' : KIND_BAR[s.kind] }}>{s.tag}</span>}
                      </div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-1)' }}>{s.text}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 评分卡命中 */}
              <div className="section-label" style={{ marginBottom: 8 }}>评分卡命中</div>
              <div className="col gap-2">
                {cur.items.map((it, i) => (
                  <div key={i} style={{ padding: '9px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--hairline)', background: 'var(--surface-1)' }}>
                    <div className="spread">
                      <span className="row gap-2">
                        {it.hit ? <ShieldCheck size={14} style={{ color: 'var(--success)' }} /> : <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />}
                        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-1)' }}>{it.name}</span>
                        <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-3)', fontSize: 10 }}>{it.engine === 'llm' ? 'LLM 语义' : '规则'}</span>
                      </span>
                      <span className="mono tnum" style={{ fontSize: 12, fontWeight: 600, color: it.hit ? 'var(--success)' : 'var(--danger)' }}>{it.hit ? '达标' : `-${it.deduction}`}</span>
                    </div>
                    {!it.hit && it.evidence && <div className="t-small" style={{ color: 'var(--text-3)', marginTop: 5, paddingLeft: 22, lineHeight: 1.5 }}>{it.evidence}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* 裁决条（逐案过的核心）*/}
            <div className="row gap-2 wrap" style={{ padding: '12px 20px', borderTop: '1px solid var(--hairline)', background: 'var(--surface-2)' }}>
              {VERDICTS.map(v => (
                <button key={v.key} className="btn" onClick={() => decide(v.key)}
                  style={{ background: 'var(--surface-1)', border: `1px solid ${v.tone === 'var(--text-3)' ? 'var(--hairline)' : `color-mix(in srgb, ${v.tone} 38%, transparent)`}`, color: v.tone }}>
                  {v.icon}{v.label}
                  <kbd style={{ marginLeft: 4, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', border: '1px solid var(--hairline)', borderRadius: 4, padding: '0 4px' }}>{v.hot}</kbd>
                </button>
              ))}
              <button className="btn btn-subtle btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/workbench')}>
                展开完整工作台 <ArrowUpRight size={13} />
              </button>
            </div>
          </Card>
        ) : (
          <Card className="reveal reveal-2"><EmptyState icon={<ListChecks size={36} />} title="队列已清空" desc="今日待办案卷全部处理完毕，可切换筛选或休息一下" /></Card>
        )}
      </div>

      <div className="row gap-2 wrap" style={{ marginTop: 14, color: 'var(--text-3)', fontSize: 12 }}>
        <CornerDownLeft size={13} /><span>快捷键：<b className="mono">j/k</b> 或 ↑↓ 切换案卷 · <b className="mono">1</b> 通过 · <b className="mono">2</b> 违规成立 · <b className="mono">3</b> 转复核 · <b className="mono">4</b> 稍后 · 裁决后自动跳下一案</span>
      </div>
    </div>
  );
}
