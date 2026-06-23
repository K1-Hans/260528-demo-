import { useMemo, useState } from 'react';
import { Eye, MessageSquare, Clock, FileSearch } from 'lucide-react';
import { PageHeader, Segmented, Badge } from '../../components/ui';
import { DataTable, Pagination, type Col } from '../../components/DataTable';
import { Toolbar, Drawer, MeterBar } from '../../components/kit';
import { INTENT_L1 } from '../../lib/mockData';
import type { LogTurn, LogSession, Tier, Emotion } from '../../types';

// ─── Tier 徽章 ────────────────────────────────────────────────────────────────
const TIER_MAP: Record<Tier, { label: string; color: string }> = {
  high_conf_bypass: { label: '直通', color: 'var(--emerald)' },
  llm_controlled:  { label: 'LLM', color: 'var(--gold)' },
  soft_guide:      { label: '软引导', color: 'var(--info)' },
  hard_reject:     { label: '强拦截', color: 'var(--danger)' },
};
function TierBadge({ tier }: { tier: Tier }) {
  const t = TIER_MAP[tier];
  return (
    <span className="badge" style={{ background: `color-mix(in srgb,${t.color} 14%,transparent)`, color: t.color, fontSize: 11 }}>
      {t.label}
    </span>
  );
}

// ─── 情绪 badge ───────────────────────────────────────────────────────────────
const EMOTION_MAP: Record<Emotion, { label: string; color: string }> = {
  calm:  { label: '平稳', color: 'var(--success)' },
  upset: { label: '不满', color: 'var(--warning)' },
  angry: { label: '愤怒', color: 'var(--danger)' },
};
function EmotionBadge({ emotion }: { emotion: Emotion }) {
  const e = EMOTION_MAP[emotion];
  return (
    <span className="badge" style={{ background: `color-mix(in srgb,${e.color} 14%,transparent)`, color: e.color }}>
      {e.label}
    </span>
  );
}

// ─── Mock 数据：单轮（≥16条）────────────────────────────────────────────────
const TURNS: LogTurn[] = [
  { id: 'lt-001', sessionId: 'S-20260616-0082', query: '怎么还款？', answer: '亲亲~还款可在「信用贷 APP-我的-还款」操作哦，支持微信/支付宝/银行卡三种方式。', intent: '还款相关', emotion: 'calm', route: 'qa', ragHit: true, topScore: 0.97, source: 'QA命中', totalMs: 143, tier: 'high_conf_bypass', time: '2026-06-16 09:03:22' },
  { id: 'lt-002', sessionId: 'S-20260616-0083', query: '我的账单利率怎么这么高？', answer: '亲爱的用户您好，您的贷款年化利率已在合同中明确标注，符合监管要求，如有疑问可拨打客服热线 400-800-1234 核实。', intent: '费用相关', emotion: 'upset', route: 'hybrid', ragHit: true, topScore: 0.82, source: 'LLM生成', totalMs: 387, tier: 'llm_controlled', time: '2026-06-16 09:07:11' },
  { id: 'lt-003', sessionId: 'S-20260616-0084', query: '提前结清需要手续费吗？', answer: '对不起，小云暂时没有找到您问题的准确答案，已为您转接人工客服，请稍后~', intent: '费用相关', emotion: 'calm', route: 'transfer', ragHit: false, topScore: 0.41, source: 'QA命中', totalMs: 512, tier: 'hard_reject', time: '2026-06-16 09:09:55' },
  { id: 'lt-004', sessionId: 'S-20260616-0085', query: '我要投诉你们催收电话太多了', answer: '非常抱歉给您带来困扰！小云已记录您的投诉，将转交合规部门处理，预计 1 个工作日内联系您。', intent: '催收相关', emotion: 'angry', route: 'transfer', ragHit: true, topScore: 0.91, source: 'QA命中', totalMs: 229, tier: 'soft_guide', time: '2026-06-16 09:12:04' },
  { id: 'lt-005', sessionId: 'S-20260616-0086', query: '会员怎么退费？', answer: '会员退费可在「我的-会员中心-退费申请」发起，3-5 个工作日原路退回。', intent: '业务办理', emotion: 'calm', route: 'qa', ragHit: true, topScore: 0.95, source: 'QA命中', totalMs: 121, tier: 'high_conf_bypass', time: '2026-06-16 09:14:33' },
  { id: 'lt-006', sessionId: 'S-20260616-0087', query: '我的贷款额度为什么降了？', answer: '用户额度变动受综合信用评估影响，包括还款记录、负债情况等多维度因素。如需详细说明，请联系人工客服 400-800-1234。', intent: '申请咨询', emotion: 'upset', route: 'hybrid', ragHit: false, topScore: 0.58, source: 'LLM生成', totalMs: 461, tier: 'llm_controlled', time: '2026-06-16 09:17:50' },
  { id: 'lt-007', sessionId: 'S-20260616-0088', query: '客服上班时间是几点？', answer: '人工服务时间 08:00—21:00，小云 7×24 小时在线为您服务。', intent: '产品与信息', emotion: 'calm', route: 'qa', ragHit: true, topScore: 0.99, source: 'QA命中', totalMs: 89, tier: 'high_conf_bypass', time: '2026-06-16 09:21:17' },
  { id: 'lt-008', sessionId: 'S-20260616-0089', query: '怎么修改绑定手机号？', answer: '修改手机号请在「信用贷 APP-我的-账号安全-手机号管理」操作，需人脸识别验证。', intent: '信息维护', emotion: 'calm', route: 'qa', ragHit: true, topScore: 0.93, source: 'QA命中', totalMs: 138, tier: 'high_conf_bypass', time: '2026-06-16 09:25:08' },
  { id: 'lt-009', sessionId: 'S-20260616-0090', query: '我要起诉示例消费金融！', answer: '小云已记录您的反馈，已为您优先转接人工客服，请稍后~', intent: '催收相关', emotion: 'angry', route: 'transfer', ragHit: true, topScore: 0.88, source: 'QA命中', totalMs: 198, tier: 'hard_reject', time: '2026-06-16 09:28:44' },
  { id: 'lt-010', sessionId: 'S-20260616-0091', query: '申请贷款需要什么条件？', answer: '信用贷申请条件：年龄 22-55 周岁、有稳定收入、实名认证手机号、芝麻分 580+，满足后可在 APP 内一键申请。', intent: '申请咨询', emotion: 'calm', route: 'qa', ragHit: true, topScore: 0.96, source: 'QA命中', totalMs: 152, tier: 'high_conf_bypass', time: '2026-06-16 09:31:22' },
  { id: 'lt-011', sessionId: 'S-20260616-0092', query: '还款后额度什么时候恢复？', answer: '正常还款后额度通常在 T+1 工作日恢复，节假日顺延。如 48 小时未恢复请联系客服。', intent: '还款相关', emotion: 'calm', route: 'qa', ragHit: true, topScore: 0.87, source: 'QA命中', totalMs: 167, tier: 'high_conf_bypass', time: '2026-06-16 09:35:01' },
  { id: 'lt-012', sessionId: 'S-20260616-0082', query: '我昨天还了款但账单没更新', answer: '还款记录通常实时到账，账单更新最晚 2 小时内完成。若仍未更新，请提供还款截图，小云为您核查。', intent: '还款相关', emotion: 'upset', route: 'hybrid', ragHit: true, topScore: 0.79, source: 'LLM生成', totalMs: 412, tier: 'llm_controlled', time: '2026-06-16 09:04:51' },
  { id: 'lt-013', sessionId: 'S-20260616-0093', query: '五一优惠活动还有吗？', answer: '目前五一专项活动已结束，欢迎关注「信用贷 APP-发现」页面获取最新优惠资讯。', intent: '营销活动', emotion: 'calm', route: 'qa', ragHit: false, topScore: 0.52, source: 'LLM生成', totalMs: 334, tier: 'llm_controlled', time: '2026-06-16 09:38:17' },
  { id: 'lt-014', sessionId: 'S-20260616-0094', query: '你们的年化利率是多少？', answer: '信用贷年化利率区间为 7.2%-24%，具体利率根据用户信用评分及借款期限动态定价，详见 APP 借款页面展示。', intent: '费用相关', emotion: 'calm', route: 'qa', ragHit: true, topScore: 0.94, source: 'QA命中', totalMs: 181, tier: 'high_conf_bypass', time: '2026-06-16 09:41:30' },
  { id: 'lt-015', sessionId: 'S-20260616-0095', query: '催收打电话骚扰我家人，我要去银保监会投诉', answer: '非常抱歉！催收联系您家人属于违规行为，已为您紧急升级投诉。合规部门将在 24 小时内处理并回访您。', intent: '催收相关', emotion: 'angry', route: 'transfer', ragHit: true, topScore: 0.96, source: 'QA命中', totalMs: 217, tier: 'hard_reject', time: '2026-06-16 09:44:08' },
  { id: 'lt-016', sessionId: 'S-20260616-0096', query: '有人工客服吗？', answer: '小云正在为您转接人工，请您稍后~人工服务时间 08:00—21:00。', intent: '业务办理', emotion: 'calm', route: 'transfer', ragHit: true, topScore: 0.99, source: 'QA命中', totalMs: 94, tier: 'high_conf_bypass', time: '2026-06-16 09:47:55' },
  { id: 'lt-017', sessionId: 'S-20260616-0097', query: '我想知道批量还款怎么操作', answer: '批量还款目前需通过企业客户专线办理，请拨打 400-800-1234 转 2 号键，由专员为您办理。', intent: '批量问题', emotion: 'calm', route: 'hybrid', ragHit: false, topScore: 0.63, source: 'LLM生成', totalMs: 356, tier: 'soft_guide', time: '2026-06-16 09:51:14' },
  { id: 'lt-018', sessionId: 'S-20260616-0098', query: '你们是骗子！', answer: '您好，我能感受到您目前情绪不好，非常抱歉让您有这样的感受。小云为您转接人工客服，一位专员将第一时间联系您。', intent: '自定义', emotion: 'angry', route: 'transfer', ragHit: true, topScore: 0.85, source: 'QA命中', totalMs: 203, tier: 'soft_guide', time: '2026-06-16 09:54:33' },
];

// ─── Mock 数据：按会话（≥16条）────────────────────────────────────────────────
const SESSIONS: LogSession[] = [
  { sessionId: 'S-20260616-0082', turns: 3, firstTime: '2026-06-16 09:03:22', lastTime: '2026-06-16 09:06:10', intent: '还款相关', hitRate: 67, avgMs: 241, firstMsg: '怎么还款？' },
  { sessionId: 'S-20260616-0083', turns: 2, firstTime: '2026-06-16 09:07:11', lastTime: '2026-06-16 09:09:02', intent: '费用相关', hitRate: 50, avgMs: 424, firstMsg: '我的账单利率怎么这么高？' },
  { sessionId: 'S-20260616-0084', turns: 1, firstTime: '2026-06-16 09:09:55', lastTime: '2026-06-16 09:09:55', intent: '费用相关', hitRate: 0, avgMs: 512, firstMsg: '提前结清需要手续费吗？' },
  { sessionId: 'S-20260616-0085', turns: 1, firstTime: '2026-06-16 09:12:04', lastTime: '2026-06-16 09:12:04', intent: '催收相关', hitRate: 100, avgMs: 229, firstMsg: '我要投诉你们催收电话太多了' },
  { sessionId: 'S-20260616-0086', turns: 1, firstTime: '2026-06-16 09:14:33', lastTime: '2026-06-16 09:14:33', intent: '业务办理', hitRate: 100, avgMs: 121, firstMsg: '会员怎么退费？' },
  { sessionId: 'S-20260616-0087', turns: 2, firstTime: '2026-06-16 09:17:50', lastTime: '2026-06-16 09:20:05', intent: '申请咨询', hitRate: 0, avgMs: 389, firstMsg: '我的贷款额度为什么降了？' },
  { sessionId: 'S-20260616-0088', turns: 1, firstTime: '2026-06-16 09:21:17', lastTime: '2026-06-16 09:21:17', intent: '产品与信息', hitRate: 100, avgMs: 89, firstMsg: '客服上班时间是几点？' },
  { sessionId: 'S-20260616-0089', turns: 1, firstTime: '2026-06-16 09:25:08', lastTime: '2026-06-16 09:25:08', intent: '信息维护', hitRate: 100, avgMs: 138, firstMsg: '怎么修改绑定手机号？' },
  { sessionId: 'S-20260616-0090', turns: 1, firstTime: '2026-06-16 09:28:44', lastTime: '2026-06-16 09:28:44', intent: '催收相关', hitRate: 100, avgMs: 198, firstMsg: '我要起诉示例消费金融！' },
  { sessionId: 'S-20260616-0091', turns: 3, firstTime: '2026-06-16 09:31:22', lastTime: '2026-06-16 09:36:47', intent: '申请咨询', hitRate: 100, avgMs: 165, firstMsg: '申请贷款需要什么条件？' },
  { sessionId: 'S-20260616-0092', turns: 2, firstTime: '2026-06-16 09:35:01', lastTime: '2026-06-16 09:37:14', intent: '还款相关', hitRate: 100, avgMs: 290, firstMsg: '还款后额度什么时候恢复？' },
  { sessionId: 'S-20260616-0093', turns: 1, firstTime: '2026-06-16 09:38:17', lastTime: '2026-06-16 09:38:17', intent: '营销活动', hitRate: 0, avgMs: 334, firstMsg: '五一优惠活动还有吗？' },
  { sessionId: 'S-20260616-0094', turns: 4, firstTime: '2026-06-16 09:41:30', lastTime: '2026-06-16 09:48:22', intent: '费用相关', hitRate: 75, avgMs: 201, firstMsg: '你们的年化利率是多少？' },
  { sessionId: 'S-20260616-0095', turns: 1, firstTime: '2026-06-16 09:44:08', lastTime: '2026-06-16 09:44:08', intent: '催收相关', hitRate: 100, avgMs: 217, firstMsg: '催收打电话骚扰我家人，我要去银保监会投诉' },
  { sessionId: 'S-20260616-0096', turns: 1, firstTime: '2026-06-16 09:47:55', lastTime: '2026-06-16 09:47:55', intent: '业务办理', hitRate: 100, avgMs: 94, firstMsg: '有人工客服吗？' },
  { sessionId: 'S-20260616-0097', turns: 2, firstTime: '2026-06-16 09:51:14', lastTime: '2026-06-16 09:53:40', intent: '批量问题', hitRate: 0, avgMs: 341, firstMsg: '我想知道批量还款怎么操作' },
  { sessionId: 'S-20260616-0098', turns: 1, firstTime: '2026-06-16 09:54:33', lastTime: '2026-06-16 09:54:33', intent: '自定义', hitRate: 100, avgMs: 203, firstMsg: '你们是骗子！' },
];

// ─── 对话状态 ─────────────────────────────────────────────────────────────────
function convStatus(turn: LogTurn): { label: string; color: string } {
  if (turn.route === 'transfer') return { label: '已转人工', color: 'var(--warning)' };
  if (!turn.ragHit) return { label: '未命中', color: 'var(--danger)' };
  return { label: '自助完结', color: 'var(--success)' };
}

const PAGE_SIZE = 8;
const INTENT_OPTIONS = ['全部', ...INTENT_L1] as const;
type IntentOption = typeof INTENT_OPTIONS[number];
const RAG_OPTIONS = ['全部', '命中', '未命中'] as const;
type RagOption = typeof RAG_OPTIONS[number];
type ViewMode = 'turn' | 'session';

export default function Logs() {
  const [view, setView] = useState<ViewMode>('turn');

  // 单轮筛选
  const [kw, setKw] = useState('');
  const [ragFilter, setRagFilter] = useState<RagOption>('全部');
  const [intentFilter, setIntentFilter] = useState<IntentOption>('全部');
  const [turnPage, setTurnPage] = useState(1);

  // 会话筛选
  const [sessKw, setSessKw] = useState('');
  const [sessPage, setSessPage] = useState(1);

  // 抽屉
  const [drawerSession, setDrawerSession] = useState<LogSession | null>(null);

  // ─── 单轮筛选 ──────────────────────────────────────────────────────────────
  const filteredTurns = useMemo(() => TURNS.filter(t => {
    const low = kw.toLowerCase();
    if (kw && !t.query.toLowerCase().includes(low) && !t.answer.toLowerCase().includes(low)) return false;
    if (ragFilter === '命中' && !t.ragHit) return false;
    if (ragFilter === '未命中' && t.ragHit) return false;
    if (intentFilter !== '全部' && t.intent !== intentFilter) return false;
    return true;
  }), [kw, ragFilter, intentFilter]);

  const pagedTurns = useMemo(() => {
    const s = (turnPage - 1) * PAGE_SIZE;
    return filteredTurns.slice(s, s + PAGE_SIZE);
  }, [filteredTurns, turnPage]);

  // ─── 会话筛选 ──────────────────────────────────────────────────────────────
  const filteredSessions = useMemo(() => SESSIONS.filter(s => {
    const low = sessKw.toLowerCase();
    if (sessKw && !s.sessionId.toLowerCase().includes(low) && !s.firstMsg.toLowerCase().includes(low)) return false;
    return true;
  }), [sessKw]);

  const pagedSessions = useMemo(() => {
    const s = (sessPage - 1) * PAGE_SIZE;
    return filteredSessions.slice(s, s + PAGE_SIZE);
  }, [filteredSessions, sessPage]);

  // 抽屉内轮次
  const drawerTurns = useMemo(
    () => drawerSession ? TURNS.filter(t => t.sessionId === drawerSession.sessionId) : [],
    [drawerSession],
  );

  // ─── 单轮列 ────────────────────────────────────────────────────────────────
  const turnCols: Col<LogTurn>[] = useMemo(() => [
    {
      key: 'time', header: '对话时间', width: 148, nowrap: true,
      sortable: true, sortAccessor: (r) => r.time,
      render: (r) => <span className="tnum text-2" style={{ fontSize: 12 }}>{r.time}</span>,
    },
    {
      key: 'query', header: '用户原始问题', width: 200,
      render: (r) => <span className="text-1" style={{ fontSize: 13 }}>{r.query}</span>,
    },
    {
      key: 'answer', header: '实际回复', width: 240,
      render: (r) => (
        <span className="text-2" style={{ fontSize: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {r.answer}
        </span>
      ),
    },
    {
      key: 'intent', header: '用户意图', width: 100,
      render: (r) => <span className="chip text-2" style={{ fontSize: 12 }}>{r.intent}</span>,
    },
    {
      key: 'emotion', header: '情绪状态', width: 80,
      render: (r) => <EmotionBadge emotion={r.emotion} />,
    },
    {
      key: 'ragHit', header: 'RAG 命中', width: 80, align: 'center',
      render: (r) => r.ragHit
        ? <span style={{ color: 'var(--emerald)', fontWeight: 700, fontSize: 15 }}>✓</span>
        : <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 15 }}>✗</span>,
    },
    {
      key: 'totalMs', header: '响应耗时', width: 90, num: true,
      sortable: true, sortAccessor: (r) => r.totalMs,
      render: (r) => <span className="tnum text-2" style={{ fontSize: 12 }}>{r.totalMs.toLocaleString('zh-CN')} ms</span>,
    },
    {
      key: 'tier', header: 'Tier', width: 72, align: 'center',
      render: (r) => <TierBadge tier={r.tier} />,
    },
    {
      key: 'status', header: '对话状态', width: 84,
      render: (r) => {
        const s = convStatus(r);
        return (
          <span className="badge" style={{ background: `color-mix(in srgb,${s.color} 14%,transparent)`, color: s.color, fontSize: 11 }}>
            {s.label}
          </span>
        );
      },
    },
  ], []);

  // ─── 会话列 ────────────────────────────────────────────────────────────────
  const sessionCols: Col<LogSession>[] = useMemo(() => [
    {
      key: 'sessionId', header: '会话 ID', width: 175, nowrap: true,
      render: (r) => <span className="mono text-2" style={{ fontSize: 12 }}>{r.sessionId}</span>,
    },
    {
      key: 'turns', header: '轮数', width: 52, num: true,
      sortable: true, sortAccessor: (r) => r.turns,
      render: (r) => <span className="tnum">{r.turns}</span>,
    },
    {
      key: 'firstTime', header: '首次 / 末次', width: 155,
      sortable: true, sortAccessor: (r) => r.firstTime,
      render: (r) => (
        <div className="col gap-1">
          <span className="tnum text-2" style={{ fontSize: 11 }}>{r.firstTime}</span>
          <span className="tnum text-3" style={{ fontSize: 11 }}>{r.lastTime}</span>
        </div>
      ),
    },
    {
      key: 'intent', header: '意图', width: 96,
      render: (r) => <span className="chip text-2" style={{ fontSize: 12 }}>{r.intent}</span>,
    },
    {
      key: 'hitRate', header: 'RAG 命中率', width: 120,
      sortable: true, sortAccessor: (r) => r.hitRate,
      render: (r) => (
        <div className="col gap-1" style={{ minWidth: 100 }}>
          <MeterBar
            pct={r.hitRate}
            color={r.hitRate >= 70 ? 'var(--emerald)' : r.hitRate >= 40 ? 'var(--gold)' : 'var(--danger)'}
          />
          <span className="tnum text-3" style={{ fontSize: 11 }}>{r.hitRate}%</span>
        </div>
      ),
    },
    {
      key: 'avgMs', header: '平均耗时', width: 90, num: true,
      sortable: true, sortAccessor: (r) => r.avgMs,
      render: (r) => <span className="tnum text-2" style={{ fontSize: 12 }}>{r.avgMs} ms</span>,
    },
    {
      key: 'firstMsg', header: '首句预览', width: 210,
      render: (r) => <span className="text-2" style={{ fontSize: 12, opacity: 0.85 }}>{r.firstMsg}</span>,
    },
    {
      key: 'action', header: '操作', width: 72, align: 'center',
      render: (r) => (
        <button
          className="btn btn-ghost btn-sm"
          onClick={(e) => { e.stopPropagation(); setDrawerSession(r); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          <Eye size={13} />查看
        </button>
      ),
    },
  ], []);

  // KPI 数字
  const avgMs = Math.round(TURNS.reduce((s, t) => s + t.totalMs, 0) / TURNS.length);
  const hitPct = Math.round(TURNS.filter(t => t.ragHit).length / TURNS.length * 100);
  const transPct = Math.round(TURNS.filter(t => t.route === 'transfer').length / TURNS.length * 100);

  return (
    <div className="page">
      <PageHeader
        title="会话日志"
        subtitle="全量会话检索 · 意图 / RAG 命中 / 情绪 / 耗时 · 质量分析"
        actions={
          <button className="btn btn-subtle btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FileSearch size={14} />导出 CSV
          </button>
        }
      />

      {/* KPI 带 */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {([
          { label: '今日会话数', value: String(SESSIONS.length), sub: '较昨日 +12%', color: 'var(--gold)' },
          { label: '平均响应耗时', value: `${avgMs} ms`, sub: 'P90 ≤ 500 ms', color: 'var(--info)' },
          { label: 'RAG 命中率', value: `${hitPct}%`, sub: '较本周均值 +3%', color: 'var(--emerald)' },
          { label: '转人工率', value: `${transPct}%`, sub: '目标 ≤ 18%', color: transPct > 18 ? 'var(--danger)' : 'var(--success)' },
        ] as { label: string; value: string; sub: string; color: string }[]).map((k, i) => (
          <div key={i} className={`card reveal reveal-${i + 1}`}>
            <div className="label" style={{ marginBottom: 8 }}>{k.label}</div>
            <div className="kpi-value tnum" style={{ fontSize: 26, color: k.color }}>{k.value}</div>
            <div className="text-3" style={{ fontSize: 12, marginTop: 6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 视图切换 */}
      <div className="row gap-3" style={{ marginBottom: 16, alignItems: 'center' }}>
        <Segmented<ViewMode>
          value={view}
          onChange={(v: ViewMode) => { setView(v); setTurnPage(1); setSessPage(1); }}
          options={[
            { value: 'turn', label: '单轮视图' },
            { value: 'session', label: '按会话视图' },
          ]}
        />
        <span className="text-3" style={{ fontSize: 12 }}>
          {view === 'turn'
            ? <><MessageSquare size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />共 {filteredTurns.length} 条轮次</>
            : <><Clock size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />共 {filteredSessions.length} 个会话</>
          }
        </span>
      </div>

      {/* 单轮视图 */}
      {view === 'turn' && (
        <div className="card card-pad-0 reveal">
          <div style={{ padding: '14px 16px 0' }}>
            <Toolbar>
              <div className="input-wrap" style={{ flex: 1, maxWidth: 280 }}>
                <input
                  className="input"
                  placeholder="搜索问题 / 回复内容…"
                  value={kw}
                  onChange={e => { setKw(e.target.value); setTurnPage(1); }}
                />
              </div>
              <select
                className="input"
                style={{ width: 128 }}
                value={ragFilter}
                onChange={e => { setRagFilter(e.target.value as RagOption); setTurnPage(1); }}
              >
                {RAG_OPTIONS.map(o => (
                  <option key={o} value={o}>{o === '全部' ? 'RAG：全部' : `RAG：${o}`}</option>
                ))}
              </select>
              <select
                className="input"
                style={{ width: 150 }}
                value={intentFilter}
                onChange={e => { setIntentFilter(e.target.value as IntentOption); setTurnPage(1); }}
              >
                {INTENT_OPTIONS.map(o => (
                  <option key={o} value={o}>{o === '全部' ? '意图：全部' : o}</option>
                ))}
              </select>
              {(kw || ragFilter !== '全部' || intentFilter !== '全部') && (
                <button
                  className="btn btn-subtle btn-sm"
                  onClick={() => { setKw(''); setRagFilter('全部'); setIntentFilter('全部'); setTurnPage(1); }}
                >
                  清除筛选
                </button>
              )}
            </Toolbar>
          </div>
          <DataTable<LogTurn>
            cols={turnCols}
            rows={pagedTurns}
            rowKey={r => r.id}
            dense
            defaultSort={{ key: 'time', dir: 'asc' }}
            empty={{ title: '无匹配记录', desc: '调整筛选条件后重试' }}
          />
          <div style={{ padding: '0 12px' }}>
            <Pagination page={turnPage} total={filteredTurns.length} pageSize={PAGE_SIZE} onPage={setTurnPage} />
          </div>
        </div>
      )}

      {/* 按会话视图 */}
      {view === 'session' && (
        <div className="card card-pad-0 reveal">
          <div style={{ padding: '14px 16px 0' }}>
            <Toolbar>
              <div className="input-wrap" style={{ flex: 1, maxWidth: 320 }}>
                <input
                  className="input"
                  placeholder="搜索会话 ID / 首句内容…"
                  value={sessKw}
                  onChange={e => { setSessKw(e.target.value); setSessPage(1); }}
                />
              </div>
              {sessKw && (
                <button
                  className="btn btn-subtle btn-sm"
                  onClick={() => { setSessKw(''); setSessPage(1); }}
                >
                  清除
                </button>
              )}
            </Toolbar>
          </div>
          <DataTable<LogSession>
            cols={sessionCols}
            rows={pagedSessions}
            rowKey={r => r.sessionId}
            onRow={r => setDrawerSession(r)}
            dense
            defaultSort={{ key: 'firstTime', dir: 'asc' }}
            empty={{ title: '无匹配会话', desc: '调整关键词后重试' }}
          />
          <div style={{ padding: '0 12px' }}>
            <Pagination page={sessPage} total={filteredSessions.length} pageSize={PAGE_SIZE} onPage={setSessPage} />
          </div>
        </div>
      )}

      {/* 会话详情抽屉 */}
      <Drawer
        open={!!drawerSession}
        onClose={() => setDrawerSession(null)}
        title={`会话详情`}
        sub={drawerSession ? `${drawerSession.sessionId} · ${drawerSession.turns} 轮 · 命中率 ${drawerSession.hitRate}% · 均耗时 ${drawerSession.avgMs} ms` : ''}
        width={540}
      >
        {drawerSession && (
          <div className="col gap-3">
            {/* 摘要卡 */}
            <div className="card" style={{ padding: '12px 14px', marginBottom: 4 }}>
              <div className="row gap-4 wrap">
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>意图</div>
                  <Badge>{drawerSession.intent}</Badge>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>命中率</div>
                  <span className="tnum" style={{ fontWeight: 700, color: drawerSession.hitRate >= 70 ? 'var(--emerald)' : 'var(--warning)' }}>
                    {drawerSession.hitRate}%
                  </span>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>平均耗时</div>
                  <span className="tnum">{drawerSession.avgMs} ms</span>
                </div>
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>时间区间</div>
                  <div className="tnum text-2" style={{ fontSize: 11 }}>
                    {drawerSession.firstTime}<br />{drawerSession.lastTime}
                  </div>
                </div>
              </div>
            </div>

            {/* 对话时间轴 */}
            <div className="label" style={{ marginBottom: 2 }}>对话时间轴</div>
            {drawerTurns.length === 0 ? (
              <span className="text-3">暂无详细轮次数据</span>
            ) : drawerTurns.map((t, idx) => (
              <div
                key={t.id}
                className="card"
                style={{ padding: '12px 14px', borderLeft: `3px solid ${t.ragHit ? 'var(--emerald)' : 'var(--danger)'}` }}
              >
                <div className="row spread" style={{ marginBottom: 8 }}>
                  <span className="tnum text-3" style={{ fontSize: 11 }}>#{idx + 1} · {t.time}</span>
                  <div className="row gap-1">
                    <EmotionBadge emotion={t.emotion} />
                    <TierBadge tier={t.tier} />
                  </div>
                </div>
                <div style={{ marginBottom: 6 }}>
                  <div className="label" style={{ marginBottom: 3 }}>用户</div>
                  <div className="text-1" style={{ fontSize: 13 }}>{t.query}</div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div className="label" style={{ marginBottom: 3 }}>小云</div>
                  <div className="text-2" style={{ fontSize: 12 }}>{t.answer}</div>
                </div>
                <div className="row gap-2">
                  <span className="chip text-3" style={{ fontSize: 11 }}>
                    RAG&nbsp;
                    {t.ragHit
                      ? <span style={{ color: 'var(--emerald)' }}>命中 {(t.topScore * 100).toFixed(0)}%</span>
                      : <span style={{ color: 'var(--danger)' }}>未命中</span>
                    }
                  </span>
                  <span className="chip text-3 tnum" style={{ fontSize: 11 }}>{t.totalMs} ms</span>
                  <span className="chip text-3" style={{ fontSize: 11 }}>{t.source}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
