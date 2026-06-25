import { useState, useMemo, useCallback } from 'react';
import {
  Sparkles, Search, Check, X, MinusCircle, Inbox, ListChecks, Tags,
  ScanSearch, ArrowRight, CornerDownRight, FilePlus2, ShieldAlert, CircleHelp,
  Send, Rocket, Clock3, BadgeCheck,
} from 'lucide-react';
import { PageHeader, EmptyState } from '../../components/ui';
import { Toolbar, toast } from '../../components/kit';
import { INTENT_L1, BRAND } from '../../lib/mockData';
import type { KGSuggestion, KGType, KGStatus, KGAction } from '../../types';

// ════════════════════════════════════════════════════════════════════════
// 知识补齐 · TDK 闭环二级状态机
// 跑测试 → 诊断（业务规则引擎 + LLM 生成补齐建议）→ 审核入库 → 人审意图 → 批量发布
// 全 mock，真实消金（示例消费金融 / 信用贷）场景
// ════════════════════════════════════════════════════════════════════════

// ─── 6 类诊断元信息（左色条 + 徽章 + 图标）──────────────────────────────────
const TYPE_META: Record<KGType, { color: string; short: string; Icon: typeof ShieldAlert }> = {
  A合规违反: { color: 'var(--danger)', short: '合规违反', Icon: ShieldAlert },
  B必答缺失: { color: 'var(--warning)', short: '必答缺失', Icon: CircleHelp },
  C答非所问: { color: 'var(--c4)', short: '答非所问', Icon: CornerDownRight },
  D知识缺失: { color: 'var(--info)', short: '知识缺失', Icon: FilePlus2 },
  E语气格式: { color: 'var(--c6)', short: '语气格式', Icon: Tags },
  F内域拒识: { color: 'var(--emerald)', short: '内域拒识', Icon: ScanSearch },
};
const KG_TYPES = Object.keys(TYPE_META) as KGType[];

const ACTION_LABEL: Record<KGAction, string> = {
  fix_existing: '改写现有答案',
  append_variants: '补充问法变体',
  create_new: '新建 QA 条目',
};

// ─── 状态元信息 ──────────────────────────────────────────────────────────────
const STATUS_META: Record<KGStatus, { color: string; label: string }> = {
  pending: { color: 'var(--warning)', label: '待审核' },
  accepted: { color: 'var(--success)', label: '已采纳' },
  rejected: { color: 'var(--danger)', label: '已拒绝' },
  ignored: { color: 'var(--text-3)', label: '已忽略' },
  borderline: { color: 'var(--info)', label: '把握不准' },
};

type StatusFilter = KGStatus | 'all';
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待审核' },
  { value: 'accepted', label: '已采纳' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'ignored', label: '已忽略' },
  { value: 'borderline', label: '把握不准' },
];

type TypeFilter = KGType | 'all';

// ─── 待发布 / 意图待审 条目（采纳后的产物）──────────────────────────────────
interface QueueItem {
  id: string;
  q: string;
  a: string;
  l1: string;
  l2: string;
  l3: string;
  source: string;        // 来源建议类型
  intentReviewed: boolean; // 意图是否已人审
}

// ════════════════════════════════════════════════════════════════════════
// Mock 数据 · ≥ 10 条真实消金补齐建议，覆盖 6 类诊断
// ════════════════════════════════════════════════════════════════════════
const MOCK_SUGGESTIONS: KGSuggestion[] = [
  {
    id: 'kg-01',
    type: 'D知识缺失',
    status: 'pending',
    rootCause: '近 1 小时「提前结清手续费」拒识 18 次，语义检索 TopScore 0.42 未命中阈值，知识库无对应 QA',
    query: '提前结清要收手续费吗，收多少',
    action: 'create_new',
    newAnswer: '亲亲~信用贷支持随时提前结清哦。提前结清不收取额外手续费，仅需结清剩余本金及已产生的利息，可在『信用贷 APP-我的-我的借款-提前还款』发起，系统会实时展示应还总额~',
    l1: '费用相关',
  },
  {
    id: 'kg-02',
    type: 'A合规违反',
    status: 'pending',
    rootCause: 'A4 合规引擎判定「年化 0% 无任何费用」触发『利率虚假宣传』红线，原答案违规承诺需改写',
    query: '你们利率是不是 0 啊，是不是没有利息',
    action: 'fix_existing',
    oldAnswer: '是的，我们年化 0%，完全没有任何费用，放心借~',
    newAnswer: '信用贷的实际年化利率以您借款时页面展示及合同约定为准，不同资质客户利率有所差异。具体可在『信用贷 APP』申请页查看您的专属利率，我们不会有任何隐藏费用~',
    l1: '产品与信息',
  },
  {
    id: 'kg-03',
    type: 'B必答缺失',
    status: 'pending',
    rootCause: '客户询问还款失败原因，命中 QA 但答案未覆盖「绑定卡限额」高频场景，必答要点缺失',
    query: '我还款一直失败是怎么回事',
    action: 'append_variants',
    variants: ['还款扣款不成功', '点了还款一直提示失败', '为什么我还不了款', '银行卡扣款失败怎么办'],
    l1: '还款相关',
  },
  {
    id: 'kg-04',
    type: 'C答非所问',
    status: 'pending',
    rootCause: '客户问「修改还款日」，QA 命中「修改手机号」（向量近邻误召回 0.71），答非所问',
    query: '我想改一下每个月的还款日期',
    action: 'fix_existing',
    oldAnswer: '修改手机号可在『我的-账户安全-手机号』操作哦~',
    newAnswer: '还款日调整需满足账户无逾期且当期账单未出，可在『信用贷 APP-我的-还款设置-还款日调整』申请，每年可调整 1 次，审核通过后次月生效~',
    l1: '业务办理',
  },
  {
    id: 'kg-05',
    type: 'E语气格式',
    status: 'pending',
    rootCause: 'LLM 质检判定回复过于机械、缺少安抚，且未带『亲亲~』品牌话术前缀，语气格式不达标',
    query: '逾期了会上征信吗',
    action: 'fix_existing',
    oldAnswer: '逾期会上征信。',
    newAnswer: '亲亲~理解您的担心。借款逾期确实可能影响个人征信记录，建议您尽快在『信用贷 APP-我的-还款』完成还款。如有还款困难，也可联系人工客服 400-800-1234 协商处理方案哦~',
    l1: '催收相关',
  },
  {
    id: 'kg-06',
    type: 'F内域拒识',
    status: 'pending',
    rootCause: '「会员自动续费怎么关闭」属业务内域却被拒识（TopScore 0.48），知识库仅有「会员退费」未覆盖续费管理',
    query: '会员自动续费怎么关，不想续了',
    action: 'create_new',
    newAnswer: '亲亲~关闭会员自动续费可在『信用贷 APP-我的-会员中心-自动续费管理』关闭，关闭后本期到期不再扣费，已开通的权益仍可使用至到期日哦~',
    l1: '业务办理',
  },
  {
    id: 'kg-07',
    type: 'D知识缺失',
    status: 'pending',
    rootCause: '「征信报告自己怎么查」近 24h 拒识 9 次，知识库无征信自查引导，存在知识缺口',
    query: '我的征信报告在哪里可以自己查',
    action: 'create_new',
    newAnswer: '亲亲~个人征信报告可通过中国人民银行征信中心官网（pbccrc.org.cn）或『云闪付 APP』免费查询，每年有 2 次免费查询机会。信用贷不提供第三方征信代查服务哦~',
    l1: '产品与信息',
  },
  {
    id: 'kg-08',
    type: 'B必答缺失',
    status: 'pending',
    rootCause: '「放款多久到账」答案未说明放款时效区间，客户高频追问，必答信息缺失',
    query: '审核通过后多久能放款到账',
    action: 'append_variants',
    variants: ['通过了多久到账', '钱什么时候能下来', '放款一般要等多久', '审核通过钱多久到'],
    l1: '申请咨询',
  },
  {
    id: 'kg-09',
    type: 'A合规违反',
    status: 'borderline',
    rootCause: 'A4 引擎疑似命中『催收红线』（提及联系紧急联系人），但语境为客户主动询问，把握不准需人工复核',
    query: '我没接电话你们会打给我家人吗',
    action: 'fix_existing',
    oldAnswer: '会的，你不还我们就联系你家里人。',
    newAnswer: '亲亲~我们会严格遵守合规催收要求。在您预留信息真实有效的前提下，我们主要通过本人预留号码与您沟通。建议您保持电话畅通，如有还款困难可随时联系人工协商~',
    l1: '催收相关',
  },
  {
    id: 'kg-10',
    type: 'C答非所问',
    status: 'pending',
    rootCause: '客户问「额度怎么提升」，命中「额度怎么查询」（近邻 0.69），未解决提额诉求',
    query: '我的可用额度怎么才能提高一些',
    action: 'fix_existing',
    oldAnswer: '可用额度可在 APP 首页顶部查看哦~',
    newAnswer: '亲亲~额度由系统根据您的综合资质动态评估，暂不支持人工调整。保持良好的还款记录、完善个人资料有助于系统在复评时为您提额，可关注『信用贷 APP』首页的提额入口哦~',
    l1: '产品与信息',
  },
  {
    id: 'kg-11',
    type: 'D知识缺失',
    status: 'pending',
    rootCause: '「结清证明在哪开」拒识 6 次，知识库无结清证明开具路径，知识缺失',
    query: '我已经还完了，结清证明怎么开',
    action: 'create_new',
    newAnswer: '亲亲~贷款结清后，结清证明可在『信用贷 APP-我的-我的借款-已结清-开具结清证明』在线申请，系统将生成电子版供您下载，通常 1-3 个工作日内开具完成哦~',
    l1: '业务办理',
  },
  {
    id: 'kg-12',
    type: 'E语气格式',
    status: 'pending',
    rootCause: '回复直接甩 APP 路径无引导话术，且使用「您自己去」等生硬措辞，语气需软化',
    query: '怎么查我每个月要还多少',
    action: 'fix_existing',
    oldAnswer: '你自己去 APP 账单里看，那里都有。',
    newAnswer: '亲亲~您每期的应还金额可在『信用贷 APP-我的-还款』查看，页面会清晰展示当期应还本金、利息及还款日。如对账单明细有疑问，也可随时找我帮您看看哦~',
    l1: '还款相关',
  },
  {
    id: 'kg-13',
    type: 'F内域拒识',
    status: 'pending',
    rootCause: '「能不能延期还款」属还款业务内域被误拒（TopScore 0.45），知识库缺延期/展期相关 QA',
    query: '这个月手头紧，能不能申请延期还款',
    action: 'create_new',
    newAnswer: '亲亲~理解您当前的资金压力。如遇还款困难，您可联系人工客服 400-800-1234 说明情况，我们会根据您的实际还款能力评估可行的协商方案，请勿轻信第三方代办延期~',
    l1: '还款相关',
  },
];

// ─── 已采纳进入待发布队列（其中部分意图已审）──────────────────────────────
const MOCK_QUEUE: QueueItem[] = [
  {
    id: 'q-01',
    q: '怎么修改绑定的银行卡',
    a: '亲亲~更换还款银行卡可在『信用贷 APP-我的-银行卡管理-添加银行卡』操作，需为本人名下的储蓄卡，新卡绑定成功后会自动设为默认扣款卡哦~',
    l1: '信息维护', l2: '银行卡', l3: '换卡', source: 'D知识缺失', intentReviewed: true,
  },
  {
    id: 'q-02',
    q: '会员退费要多久到账',
    a: '会员退费可在『我的-会员中心-退费申请』发起，审核通过后 3-5 个工作日原路退回至您的支付账户哦~',
    l1: '费用相关', l2: '会员', l3: '退费时效', source: 'B必答缺失', intentReviewed: true,
  },
  {
    id: 'q-03',
    q: '人工客服几点上班',
    a: '亲亲~小云人工服务时间为每天 08:00—21:00，客服热线 400-800-1234，您可在此时段转接人工哦~',
    l1: '业务办理', l2: '人工服务', l3: '服务时间', source: 'B必答缺失', intentReviewed: true,
  },
  {
    id: 'q-04',
    q: '逾期一天会上征信吗',
    a: '亲亲~是否上报征信以合同约定及实际逾期天数为准，建议您尽快还款避免影响。如已产生逾期，可联系人工核实具体情况哦~',
    l1: '催收相关', l2: '征信', l3: '逾期上报', source: 'E语气格式', intentReviewed: false,
  },
  {
    id: 'q-05',
    q: '注销账户后还能再借吗',
    a: '亲亲~账户注销需确保无在贷余额且无未结清账单。注销后如需重新使用，需重新注册并通过资质审核，是否可借由系统综合评估决定哦~',
    l1: '业务办理', l2: '账户', l3: '注销', source: 'D知识缺失', intentReviewed: false,
  },
];

// ════════════════════════════════════════════════════════════════════════
// 小组件
// ════════════════════════════════════════════════════════════════════════
function StatusPill({ status }: { status: KGStatus }) {
  const m = STATUS_META[status];
  return (
    <span className="badge" style={{ background: `color-mix(in srgb, ${m.color} 14%, transparent)`, color: m.color }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, display: 'inline-block' }} />
      {m.label}
    </span>
  );
}

function TypeBadge({ type }: { type: KGType }) {
  const m = TYPE_META[type];
  return (
    <span
      className="badge"
      style={{ background: `color-mix(in srgb, ${m.color} 14%, transparent)`, color: m.color, fontWeight: 600 }}
    >
      <m.Icon size={11} />
      {type}
    </span>
  );
}

function InfoBox({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <div
      className="row gap-2 reveal"
      style={{
        background: `color-mix(in srgb, ${tone} 7%, var(--surface-2))`,
        border: `1px solid color-mix(in srgb, ${tone} 20%, var(--hairline))`,
        borderRadius: 'var(--r-md)',
        padding: '11px 15px',
        marginBottom: 16,
        fontSize: 13,
        color: 'var(--text-2)',
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  );
}

// ─── 标准文本框（受控，统一样式）────────────────────────────────────────────
function TextArea({ value, onChange, rows = 3, accent }: {
  value: string; onChange: (v: string) => void; rows?: number; accent?: string;
}) {
  return (
    <textarea
      className="input"
      rows={rows}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ resize: 'vertical', lineHeight: 1.6, ...(accent ? { borderColor: `color-mix(in srgb, ${accent} 32%, var(--hairline))` } : {}) }}
    />
  );
}

function FieldLabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div className="label" style={{ marginBottom: 6, color: color ?? 'var(--text-3)' }}>{children}</div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 主页面
// ════════════════════════════════════════════════════════════════════════
type TabKey = 'suggest' | 'publish' | 'intent';

export default function KnowledgeGap() {
  const [tab, setTab] = useState<TabKey>('suggest');

  // —— 建议状态（本地可变）——
  const [suggestions, setSuggestions] = useState<KGSuggestion[]>(MOCK_SUGGESTIONS);
  // 改写后答案 / 变体 / 新建 QA 的草稿（按 id 暂存编辑）
  const [drafts, setDrafts] = useState<Record<string, { answer: string; variants: string; q: string; a: string }>>({});

  // —— 待发布 / 意图待审队列 ——
  const [queue, setQueue] = useState<QueueItem[]>(MOCK_QUEUE);

  // —— 筛选 ——
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [diagnosing, setDiagnosing] = useState(false);

  // 草稿初始化器
  const draftOf = useCallback((s: KGSuggestion) => {
    return drafts[s.id] ?? {
      answer: s.newAnswer ?? '',
      variants: (s.variants ?? []).join('\n'),
      q: s.query,
      a: s.newAnswer ?? '',
    };
  }, [drafts]);

  const setDraft = useCallback((id: string, patch: Partial<{ answer: string; variants: string; q: string; a: string }>) => {
    setDrafts(prev => {
      const base = prev[id] ?? { answer: '', variants: '', q: '', a: '' };
      return { ...prev, [id]: { ...base, ...patch } };
    });
  }, []);

  // —— 计数（badge）——
  const pendingPublish = useMemo(() => queue.length, [queue]);
  const pendingIntent = useMemo(() => queue.filter(q => !q.intentReviewed).length, [queue]);

  // —— 过滤后的建议列表 ——
  const filtered = useMemo(() => {
    return suggestions.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (typeFilter !== 'all' && s.type !== typeFilter) return false;
      return true;
    });
  }, [suggestions, statusFilter, typeFilter]);

  // —— 摘要（按类型计数）——
  const typeSummary = useMemo(() => {
    const c = new Map<KGType, number>();
    for (const s of suggestions) c.set(s.type, (c.get(s.type) ?? 0) + 1);
    return KG_TYPES.map(t => ({ type: t, count: c.get(t) ?? 0 })).filter(x => x.count > 0);
  }, [suggestions]);

  const pendingReviewCount = useMemo(
    () => suggestions.filter(s => s.status === 'pending' || s.status === 'borderline').length,
    [suggestions],
  );

  // —— 自动找原因（模拟跑最新测试 → 诊断）——
  function runDiagnose() {
    setDiagnosing(true);
    setStatusFilter('pending');
    setTypeFilter('all');
    window.setTimeout(() => {
      setDiagnosing(false);
      toast('已分析最新测试运行 · 命中 13 条失败用例，规则引擎 + LLM 生成 13 条补齐建议', 'success');
    }, 1100);
  }

  // —— 采纳并入库（→ 待发布队列，意图默认待审）——
  function accept(s: KGSuggestion) {
    const d = draftOf(s);
    const q = s.action === 'create_new' ? (d.q || s.query) : s.query;
    const a =
      s.action === 'append_variants'
        ? (s.oldAnswer ?? '沿用原答案 · 仅补充问法变体')
        : (s.action === 'create_new' ? (d.a || d.answer) : (d.answer || s.newAnswer || ''));
    const newItem: QueueItem = {
      id: `pub-${s.id}`,
      q,
      a: a || '（待补充答案）',
      l1: s.l1 ?? '自定义',
      l2: TYPE_META[s.type].short,
      l3: '',
      source: s.type,
      intentReviewed: false,
    };
    setQueue(prev => [newItem, ...prev]);
    setSuggestions(prev => prev.map(x => (x.id === s.id ? { ...x, status: 'accepted' } : x)));
    toast(`「${q.slice(0, 14)}…」已采纳入库 → 进入待发布队列（意图待审）`, 'success');
  }

  function reject(s: KGSuggestion) {
    setSuggestions(prev => prev.map(x => (x.id === s.id ? { ...x, status: 'rejected' } : x)));
    toast('已拒绝该补齐建议', 'danger');
  }

  function ignore(s: KGSuggestion) {
    setSuggestions(prev => prev.map(x => (x.id === s.id ? { ...x, status: 'ignored' } : x)));
    toast('已忽略，不计入闭环统计', 'info');
  }

  // —— 意图人审通过 ——
  function reviewIntent(item: QueueItem, patch: Partial<Pick<QueueItem, 'l1' | 'l2' | 'l3'>>) {
    setQueue(prev => prev.map(q => (q.id === item.id ? { ...q, ...patch } : q)));
  }
  function passIntent(item: QueueItem) {
    if (!item.l2.trim()) { toast('请先填写二级意图（L2）再审核通过', 'warn'); return; }
    setQueue(prev => prev.map(q => (q.id === item.id ? { ...q, intentReviewed: true } : q)));
    toast(`「${item.q.slice(0, 12)}…」意图已审核：${item.l1} / ${item.l2}`, 'success');
  }

  // —— 发布到生产 ——
  function publishOne(item: QueueItem) {
    if (!item.intentReviewed) { toast('该条意图尚未人审，请先在「意图待审」完成审核', 'warn'); return; }
    setQueue(prev => prev.filter(q => q.id !== item.id));
    toast(`「${item.q.slice(0, 12)}…」已发布到生产知识库 · 增量向量化中`, 'success');
  }
  function publishAll() {
    const ready = queue.filter(q => q.intentReviewed);
    if (ready.length === 0) { toast('当前无「意图已审」条目可发布', 'warn'); return; }
    setQueue(prev => prev.filter(q => !q.intentReviewed));
    toast(`已批量发布 ${ready.length} 条至生产 · 检索引擎增量重建完成`, 'success');
  }

  // ════════════════════════════════════════════════════════════════════════
  // 渲染
  // ════════════════════════════════════════════════════════════════════════
  const TABS: { key: TabKey; label: string; Icon: typeof Inbox; count?: number }[] = [
    { key: 'suggest', label: '待审建议', Icon: Inbox, count: pendingReviewCount },
    { key: 'publish', label: '待发布队列', Icon: ListChecks, count: pendingPublish },
    { key: 'intent', label: '意图待审', Icon: Tags, count: pendingIntent },
  ];

  return (
    <div className="page">
      <PageHeader
        title="知识补齐"
        subtitle={`基于失败用例 · 业务规则引擎判定 + LLM 自动生成补齐建议 · 闭环回灌 ${BRAND.company}知识库`}
      />

      {/* ── Tab 切换 ───────────────────────────────────────────────────── */}
      <div
        className="row gap-1 reveal"
        style={{
          background: 'var(--surface-2)', border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-md)', padding: 4, marginBottom: 20, width: 'fit-content',
        }}
      >
        {TABS.map(t => {
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="btn btn-sm row gap-2"
              style={{
                background: on ? 'var(--surface-1)' : 'transparent',
                color: on ? 'var(--text-1)' : 'var(--text-3)',
                border: on ? '1px solid var(--hairline)' : '1px solid transparent',
                boxShadow: on ? 'var(--elev-1)' : 'none',
                fontWeight: on ? 600 : 500,
                padding: '7px 14px',
              }}
            >
              <t.Icon size={14} style={{ color: on ? 'var(--gold)' : 'var(--text-3)' }} />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span
                  className="tnum"
                  style={{
                    minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9,
                    background: on ? 'color-mix(in srgb, var(--gold) 18%, transparent)' : 'var(--surface-3)',
                    color: on ? 'var(--gold)' : 'var(--text-3)',
                    fontSize: 11, fontWeight: 700, display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ════════ TAB 1 · 待审建议 ════════ */}
      {tab === 'suggest' && (
        <>
          <Toolbar>
            <button
              className="btn btn-primary btn-sm row gap-2"
              onClick={runDiagnose}
              disabled={diagnosing}
              style={{ opacity: diagnosing ? 0.7 : 1 }}
            >
              {diagnosing ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Sparkles size={14} />}
              {diagnosing ? '诊断中…' : '从最新测试自动找原因'}
            </button>

            <div className="input-wrap" style={{ width: 150 }}>
              <span className="input-icon"><Search size={14} /></span>
              <select
                className="input"
                style={{ paddingLeft: 32 }}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              >
                {STATUS_FILTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <select
              className="input"
              style={{ width: 150 }}
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as TypeFilter)}
            >
              <option value="all">全部类型</option>
              {KG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <span className="text-3" style={{ fontSize: 12.5, marginLeft: 'auto' }}>
              共 <span className="tnum" style={{ color: 'var(--text-1)', fontWeight: 600 }}>{filtered.length}</span> 条
              {' · '}待审 <span className="tnum" style={{ color: 'var(--warning)', fontWeight: 600 }}>{pendingReviewCount}</span>
            </span>
          </Toolbar>

          {/* 类型摘要 */}
          <div className="row gap-2 wrap reveal-1" style={{ marginBottom: 18 }}>
            {typeSummary.map(({ type, count }) => {
              const m = TYPE_META[type];
              return (
                <button
                  key={type}
                  onClick={() => setTypeFilter(prev => (prev === type ? 'all' : type))}
                  className="chip row gap-2"
                  style={{
                    background: typeFilter === type
                      ? `color-mix(in srgb, ${m.color} 16%, var(--surface-2))`
                      : `color-mix(in srgb, ${m.color} 7%, var(--surface-2))`,
                    border: `1px solid color-mix(in srgb, ${m.color} ${typeFilter === type ? 40 : 22}%, var(--hairline))`,
                    color: m.color, borderRadius: 'var(--r-md)', padding: '5px 11px',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <m.Icon size={12} />
                  {m.short}
                  <span className="tnum" style={{ background: 'var(--surface-3)', borderRadius: 8, padding: '0 6px', fontSize: 11, color: 'var(--text-2)' }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* 建议卡列表 */}
          {filtered.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<ScanSearch size={36} />}
                title="当前筛选无补齐建议"
                desc="点击「从最新测试自动找原因」对最近一次回归运行做诊断，或调整筛选条件"
              />
            </div>
          ) : (
            <div className="col gap-3">
              {filtered.map((s, i) => {
                const m = TYPE_META[s.type];
                const d = draftOf(s);
                const dim = s.status === 'rejected' || s.status === 'ignored';
                return (
                  <div
                    key={s.id}
                    className={`card reveal-${Math.min(i + 1, 6)}`}
                    style={{
                      padding: 0, overflow: 'hidden', display: 'flex',
                      opacity: dim ? 0.6 : 1,
                    }}
                  >
                    {/* 左色条 */}
                    <div style={{ width: 4, background: m.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, padding: '16px 18px' }}>
                      {/* 头部：类型 + 状态 + action */}
                      <div className="row spread" style={{ marginBottom: 10 }}>
                        <div className="row gap-2 wrap">
                          <TypeBadge type={s.type} />
                          <span className="tag row gap-1" style={{ borderColor: 'var(--hairline-strong)' }}>
                            <CornerDownRight size={11} />{ACTION_LABEL[s.action]}
                          </span>
                          {s.l1 && <span className="tag">{s.l1}</span>}
                        </div>
                        <StatusPill status={s.status} />
                      </div>

                      {/* 根因 */}
                      <div
                        className="row gap-2"
                        style={{
                          background: `color-mix(in srgb, ${m.color} 6%, var(--surface-2))`,
                          border: `1px solid color-mix(in srgb, ${m.color} 16%, var(--hairline))`,
                          borderRadius: 'var(--r-sm)', padding: '9px 12px', marginBottom: 12,
                          fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55,
                        }}
                      >
                        <m.Icon size={14} style={{ color: m.color, flexShrink: 0, marginTop: 2 }} />
                        <span><span style={{ color: m.color, fontWeight: 600 }}>根因 · </span>{s.rootCause}</span>
                      </div>

                      {/* 用户问题 */}
                      <FieldLabel>用户问题</FieldLabel>
                      <div
                        className="row gap-2"
                        style={{ marginBottom: 14, fontSize: 14, color: 'var(--text-1)', fontWeight: 500 }}
                      >
                        <CircleHelp size={15} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 2 }} />
                        <span>{s.query}</span>
                      </div>

                      {/* 按 action 渲染补齐内容 */}
                      {s.action === 'fix_existing' && (
                        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                          <div>
                            <FieldLabel color="var(--danger)">原答案（命中但有问题）</FieldLabel>
                            <div
                              style={{
                                background: 'color-mix(in srgb, var(--danger) 5%, var(--surface-2))',
                                border: '1px solid color-mix(in srgb, var(--danger) 16%, var(--hairline))',
                                borderRadius: 'var(--r-sm)', padding: '10px 12px',
                                fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6,
                                textDecoration: 'line-through', textDecorationColor: 'color-mix(in srgb, var(--danger) 50%, transparent)',
                                minHeight: 80,
                              }}
                            >
                              {s.oldAnswer}
                            </div>
                          </div>
                          <div>
                            <div className="row gap-1" style={{ marginBottom: 6 }}>
                              <ArrowRight size={12} style={{ color: 'var(--emerald)' }} />
                              <span className="label" style={{ color: 'var(--emerald)', marginBottom: 0 }}>改写后（可编辑）</span>
                            </div>
                            <TextArea
                              value={d.answer}
                              onChange={v => setDraft(s.id, { answer: v })}
                              rows={4}
                              accent="var(--emerald)"
                            />
                          </div>
                        </div>
                      )}

                      {s.action === 'append_variants' && (
                        <div style={{ marginBottom: 14 }}>
                          <FieldLabel color="var(--info)">补充问法变体（每行一条 · 可编辑）</FieldLabel>
                          <TextArea
                            value={d.variants}
                            onChange={v => setDraft(s.id, { variants: v })}
                            rows={4}
                            accent="var(--info)"
                          />
                          <div className="row gap-1 wrap" style={{ marginTop: 8 }}>
                            {d.variants.split('\n').map(v => v.trim()).filter(Boolean).map((v, k) => (
                              <span key={k} className="tag" style={{ background: 'color-mix(in srgb, var(--info) 8%, var(--surface-2))', color: 'var(--info)', borderColor: 'color-mix(in srgb, var(--info) 22%, var(--hairline))' }}>{v}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {s.action === 'create_new' && (
                        <div className="col gap-3" style={{ marginBottom: 14 }}>
                          <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 0 }}>
                            <FieldLabel color="var(--gold)">标准问（草拟 · 可编辑）</FieldLabel>
                            <div className="input-wrap">
                              <span className="input-icon"><FilePlus2 size={14} /></span>
                              <input
                                className="input"
                                style={{ paddingLeft: 32 }}
                                value={d.q}
                                onChange={e => setDraft(s.id, { q: e.target.value })}
                                placeholder="标准问"
                              />
                            </div>
                          </div>
                          <div>
                            <FieldLabel color="var(--gold)">标准答（LLM 草拟 · 可编辑）</FieldLabel>
                            <TextArea
                              value={d.a || d.answer}
                              onChange={v => setDraft(s.id, { a: v, answer: v })}
                              rows={4}
                              accent="var(--gold)"
                            />
                          </div>
                        </div>
                      )}

                      {/* 操作 */}
                      {(s.status === 'pending' || s.status === 'borderline') ? (
                        <div className="row gap-2" style={{ paddingTop: 4 }}>
                          <button
                            className="btn btn-sm row gap-1"
                            style={{ color: 'var(--emerald)', border: '1px solid color-mix(in srgb,var(--emerald) 32%,var(--hairline))', background: 'color-mix(in srgb,var(--emerald) 9%,transparent)', fontWeight: 600 }}
                            onClick={() => accept(s)}
                          >
                            <Check size={13} />采纳并入库
                          </button>
                          <button className="btn btn-sm btn-danger row gap-1" onClick={() => reject(s)}>
                            <X size={13} />拒绝
                          </button>
                          <button className="btn btn-sm btn-subtle row gap-1" onClick={() => ignore(s)}>
                            <MinusCircle size={13} />忽略
                          </button>
                        </div>
                      ) : (
                        <div className="row gap-2" style={{ paddingTop: 4, fontSize: 12.5, color: 'var(--text-3)' }}>
                          <BadgeCheck size={14} style={{ color: STATUS_META[s.status].color }} />
                          已处理 · {STATUS_META[s.status].label}
                          {s.status === 'accepted' && '（见「待发布队列」）'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ════════ TAB 2 · 待发布队列 ════════ */}
      {tab === 'publish' && (
        <>
          <InfoBox tone="var(--warning)">
            <Rocket size={15} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 1 }} />
            <span>
              <b style={{ color: 'var(--text-1)' }}>采纳 ≠ 发布</b>。已采纳条目先进入此队列暂存，
              须经「意图待审」人工确认 L1/L2/L3 后方可发布到生产，避免误标污染检索召回。
            </span>
          </InfoBox>

          <Toolbar>
            <span className="text-3" style={{ fontSize: 12.5 }}>
              队列共 <span className="tnum" style={{ color: 'var(--text-1)', fontWeight: 600 }}>{queue.length}</span> 条
              {' · '}意图已审 <span className="tnum" style={{ color: 'var(--success)', fontWeight: 600 }}>{queue.filter(q => q.intentReviewed).length}</span>
              {' · '}待意图审 <span className="tnum" style={{ color: 'var(--warning)', fontWeight: 600 }}>{pendingIntent}</span>
            </span>
            <button
              className="btn btn-primary btn-sm row gap-2"
              style={{ marginLeft: 'auto' }}
              onClick={publishAll}
            >
              <Send size={14} />批量发布全部（已意图审）
            </button>
          </Toolbar>

          {queue.length === 0 ? (
            <div className="card">
              <EmptyState icon={<ListChecks size={36} />} title="待发布队列为空" desc="在「待审建议」采纳补齐建议后，条目会进入此处暂存" />
            </div>
          ) : (
            <div className="col gap-3">
              {queue.map((item, i) => (
                <div key={item.id} className={`card reveal-${Math.min(i + 1, 6)}`} style={{ padding: '16px 18px' }}>
                  <div className="row spread" style={{ marginBottom: 10 }}>
                    <div className="row gap-2 wrap">
                      <span className="tag" style={{ background: 'color-mix(in srgb, var(--gold) 8%, var(--surface-2))', color: 'var(--gold)', borderColor: 'color-mix(in srgb, var(--gold) 22%, var(--hairline))' }}>{item.l1}</span>
                      <span className="text-3" style={{ fontSize: 12 }}>来源 · {item.source}</span>
                    </div>
                    {item.intentReviewed ? (
                      <span className="badge" style={{ background: 'color-mix(in srgb, var(--success) 14%, transparent)', color: 'var(--success)' }}>
                        <BadgeCheck size={12} />意图已审
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'color-mix(in srgb, var(--warning) 14%, transparent)', color: 'var(--warning)' }}>
                        <Clock3 size={12} />意图待审
                      </span>
                    )}
                  </div>

                  <div className="row gap-2" style={{ marginBottom: 8, fontSize: 14, color: 'var(--text-1)', fontWeight: 500 }}>
                    <CircleHelp size={15} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 2 }} />
                    <span>{item.q}</span>
                  </div>
                  <div
                    style={{
                      background: 'var(--surface-2)', border: '1px solid var(--hairline)',
                      borderRadius: 'var(--r-sm)', padding: '10px 12px', marginBottom: 12,
                      fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6,
                    }}
                  >
                    {item.a}
                  </div>

                  <div className="row spread">
                    <div className="row gap-2 wrap" style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      <span className="tag">{item.l1}</span>
                      {item.l2 && <span className="tag">{item.l2}</span>}
                      {item.l3 && <span className="tag">{item.l3}</span>}
                    </div>
                    <button
                      className="btn btn-sm row gap-1"
                      disabled={!item.intentReviewed}
                      style={{
                        color: item.intentReviewed ? 'var(--gold)' : 'var(--text-3)',
                        border: `1px solid ${item.intentReviewed ? 'color-mix(in srgb,var(--gold) 32%,var(--hairline))' : 'var(--hairline)'}`,
                        background: item.intentReviewed ? 'color-mix(in srgb,var(--gold) 9%,transparent)' : 'var(--surface-2)',
                        fontWeight: 600, cursor: item.intentReviewed ? 'pointer' : 'not-allowed',
                      }}
                      onClick={() => publishOne(item)}
                    >
                      <Rocket size={13} />发布到生产
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ════════ TAB 3 · 意图待审 ════════ */}
      {tab === 'intent' && (
        <>
          <InfoBox tone="var(--info)">
            <Tags size={15} style={{ color: 'var(--info)', flexShrink: 0, marginTop: 1 }} />
            <span>
              新增 / 改写条目的 <b style={{ color: 'var(--text-1)' }}>L1 / L2 / L3 意图</b> 由 LLM 预测（精度约 70–85%），
              须人工复核校正后再放行。意图错挂会导致检索路由与统计口径偏差。
            </span>
          </InfoBox>

          {pendingIntent === 0 ? (
            <div className="card">
              <EmptyState icon={<BadgeCheck size={36} />} title="意图全部已审" desc="队列中无待人审意图的条目，可前往「待发布队列」批量发布" />
            </div>
          ) : (
            <div className="col gap-3">
              {queue.filter(q => !q.intentReviewed).map((item, i) => (
                <div key={item.id} className={`card reveal-${Math.min(i + 1, 6)}`} style={{ padding: '16px 18px' }}>
                  <div className="row spread" style={{ marginBottom: 10 }}>
                    <span className="tag" style={{ background: 'color-mix(in srgb, var(--info) 8%, var(--surface-2))', color: 'var(--info)', borderColor: 'color-mix(in srgb, var(--info) 22%, var(--hairline))' }}>来源 · {item.source}</span>
                    <span className="badge" style={{ background: 'color-mix(in srgb, var(--warning) 14%, transparent)', color: 'var(--warning)' }}>
                      <Clock3 size={12} />意图待审
                    </span>
                  </div>

                  <div className="row gap-2" style={{ marginBottom: 6, fontSize: 14, color: 'var(--text-1)', fontWeight: 500 }}>
                    <CircleHelp size={15} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 2 }} />
                    <span>{item.q}</span>
                  </div>
                  <div
                    style={{
                      background: 'var(--surface-2)', border: '1px solid var(--hairline)',
                      borderRadius: 'var(--r-sm)', padding: '9px 12px', marginBottom: 14,
                      fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.55,
                    }}
                  >
                    {item.a}
                  </div>

                  {/* 三级意图编辑 */}
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <FieldLabel>一级意图 L1</FieldLabel>
                      <select
                        className="input"
                        value={item.l1}
                        onChange={e => reviewIntent(item, { l1: e.target.value })}
                      >
                        {INTENT_L1.map(l1 => <option key={l1} value={l1}>{l1}</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>二级意图 L2</FieldLabel>
                      <input
                        className="input"
                        value={item.l2}
                        placeholder="如：还款 / 会员 / 征信"
                        onChange={e => reviewIntent(item, { l2: e.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel>三级意图 L3</FieldLabel>
                      <input
                        className="input"
                        value={item.l3}
                        placeholder="如：提前结清 / 退费时效"
                        onChange={e => reviewIntent(item, { l3: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="row" style={{ justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-sm row gap-1"
                      style={{ color: 'var(--emerald)', border: '1px solid color-mix(in srgb,var(--emerald) 32%,var(--hairline))', background: 'color-mix(in srgb,var(--emerald) 9%,transparent)', fontWeight: 600 }}
                      onClick={() => passIntent(item)}
                    >
                      <Check size={13} />审核通过
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
