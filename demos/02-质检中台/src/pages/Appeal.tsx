import { useMemo, useState } from 'react';
import {
  Gavel, GitPullRequestArrow, Scale, FileSearch, History, Archive,
  ShieldX, ShieldCheck, CircleDot, TriangleAlert, ListChecks, UserRound,
  ArrowRight, Filter, Undo2, MessagesSquare, Quote, Lock,
} from 'lucide-react';
import { PageHeader, StatCard, Segmented } from '../components/ui';
import { Drawer, StatusBadge, toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, cssVar } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import type { BusinessLine } from '../types';

// ════════════════════════════════════════════════════════════════════════
// 复核 / 申诉工作流 —— 质检争议闭环：可申诉、可终裁、留痕
// 泳道看板（待复核→复核中→申诉→终裁→归档）+ 申诉详情抽屉（原评分 vs 复核意见 diff
// + 证据原句引用 + 三级裁决）+ 申诉处理漏斗。权限：坐席发起 / 主管复核 / 合规官终裁。
// 全 mock，真实消金质检术语，禁 lorem / 禁真名。
// ════════════════════════════════════════════════════════════════════════

// ─── 本页局部类型（页面内定义，不碰共享 types）──────────────────────────────
type LaneId = 'pending' | 'reviewing' | 'appealing' | 'final' | 'archived';
type Verdict = '违规成立' | '部分成立' | '改判通过' | '驳回';

interface EvidenceLine {
  speaker: '坐席' | '客户';
  text: string;
  kind: 'violation' | 'compliant' | 'risk';
  note: string;
}

interface DisputeCard {
  id: string;
  sessionId: string;
  agent: string;
  team: string;
  businessLine: BusinessLine;
  channel: '通话' | '在线' | '邮件' | 'Bot';
  disputeItem: string;          // 争议质检项
  originalScore: number;        // 原 AI 评分
  appealScore: number;          // 申诉主张分
  lane: LaneId;
  initiator: string;            // 发起人（坐席）
  reviewer?: string;            // 复核人（主管）
  arbiter?: string;             // 终裁人（合规官）
  reason: string;               // 坐席申诉理由
  aiOpinion: string;            // 原 AI 判定意见
  reviewOpinion?: string;       // 复核意见
  verdict?: Verdict;            // 裁决结论
  evidence: EvidenceLine[];     // 证据原句
  createdAt: string;
  updatedAt: string;
}

// ─── 泳道定义 ────────────────────────────────────────────────────────────────
const LANES: { id: LaneId; name: string; icon: typeof Gavel; accent: string }[] = [
  { id: 'pending', name: '待复核', icon: FileSearch, accent: 'var(--warning)' },
  { id: 'reviewing', name: '复核中', icon: GitPullRequestArrow, accent: 'var(--info)' },
  { id: 'appealing', name: '申诉', icon: MessagesSquare, accent: 'var(--gold)' },
  { id: 'final', name: '终裁', icon: Scale, accent: 'var(--danger)' },
  { id: 'archived', name: '归档', icon: Archive, accent: 'var(--text-3)' },
];

const VERDICTS: { v: Verdict; tone: 'good' | 'warn' | 'bad' | 'info'; icon: typeof Gavel }[] = [
  { v: '违规成立', tone: 'bad', icon: ShieldX },
  { v: '部分成立', tone: 'warn', icon: CircleDot },
  { v: '改判通过', tone: 'good', icon: ShieldCheck },
  { v: '驳回', tone: 'info', icon: Undo2 },
];

// ─── Mock 争议数据（12 张，覆盖 5 泳道 · 真实消金质检争议项）────────────────
const DISPUTES: DisputeCard[] = [
  {
    id: 'AP-2041', sessionId: 'CS-A8F31C92', agent: '赵越', team: '客服一部',
    businessLine: '产品咨询', channel: '通话',
    disputeItem: '未告知年化利率（APR）', originalScore: 71, appealScore: 88,
    lane: 'pending', initiator: '赵越',
    reason: '客户全程未询问费率，我在结尾已统一播报年化利率话术，AI 漏识别尾段。',
    aiOpinion: '会话前 3 分钟介绍信用贷产品时未主动告知年化利率，触发「费率告知」合规扣分 12 分。',
    evidence: [
      { speaker: '坐席', text: '您这边资质很好，直接在 App 申请就能下款。', kind: 'violation', note: '介绍产品未先告知年化利率（APR）' },
      { speaker: '坐席', text: '本产品年化利率为 23.4%，借款前请确认还款能力，逾期将影响征信。', kind: 'compliant', note: '尾段补充合规播报，争议焦点：是否计入覆盖' },
    ],
    createdAt: '2026-06-17 09:18', updatedAt: '2026-06-17 09:20',
  },
  {
    id: 'AP-2040', sessionId: 'CS-7B20D4E1', agent: '孙琪', team: '客服一部',
    businessLine: '逾期催收', channel: '通话',
    disputeItem: '催收红线 · 威胁性措辞', originalScore: 42, appealScore: 42,
    lane: 'pending', initiator: '孙琪',
    reason: '语气偏重但未威胁，请人工复核语义是否构成红线。',
    aiOpinion: '「逾期催收」通话出现施压性表述，禁语 agent 判定触碰催收红线，直接计为重大违规。',
    evidence: [
      { speaker: '坐席', text: '再不还款我们就只能联系您单位同事协助处理了。', kind: 'violation', note: '触碰催收红线：禁止联系第三方 / 施压' },
      { speaker: '客户', text: '我这个月确实困难，能不能宽限几天。', kind: 'risk', note: '客户表达还款困难，情绪转负' },
    ],
    createdAt: '2026-06-17 08:55', updatedAt: '2026-06-17 09:02',
  },
  {
    id: 'AP-2039', sessionId: 'CS-3E91A7B6', agent: '李航', team: '客服二部',
    businessLine: '提前结清', channel: '在线',
    disputeItem: '越权承诺 · 保证下款', originalScore: 58, appealScore: 74,
    lane: 'reviewing', initiator: '李航', reviewer: '沈括',
    reason: '原话是「大概率」非「保证」，语义被 LLM 放大，请复核上下文。',
    aiOpinion: 'LLM 语义项判定坐席作出「保证下款」越权承诺，承诺类合规扣分 16 分。',
    reviewOpinion: '复核中：调取完整转写，坐席用词为「按您条件大概率可以」，存在歧义，倾向部分成立。',
    evidence: [
      { speaker: '坐席', text: '按您现在的条件，提前结清后再借大概率没问题的。', kind: 'risk', note: '「大概率」属边界表述，是否构成承诺存争议' },
      { speaker: '客户', text: '那你能保证一定批下来吗？', kind: 'risk', note: '客户主动追问，坐席未明确承诺' },
    ],
    createdAt: '2026-06-16 17:40', updatedAt: '2026-06-17 09:10',
  },
  {
    id: 'AP-2038', sessionId: 'CS-9C44F0A3', agent: '赵越', team: '客服一部',
    businessLine: '注销合规', channel: '通话',
    disputeItem: '冷静期未告知', originalScore: 66, appealScore: 80,
    lane: 'reviewing', initiator: '赵越', reviewer: '沈括',
    reason: '客户为老客户已知晓冷静期，是否可豁免重复告知？',
    aiOpinion: '注销账户流程未播报冷静期告知话术，触发「冷静期告知」合规缺失扣分 10 分。',
    reviewOpinion: '复核中：冷静期为监管必读项，老客户不豁免，倾向违规成立但酌情减扣。',
    evidence: [
      { speaker: '坐席', text: '账户注销我这边直接给您操作，马上就能完成。', kind: 'violation', note: '未告知冷静期，注销为不可逆操作需强提示' },
      { speaker: '坐席', text: '您的个人信息我们将依授权范围处理并按规留存。', kind: 'compliant', note: '个人信息授权告知到位' },
    ],
    createdAt: '2026-06-16 16:22', updatedAt: '2026-06-17 08:48',
  },
  {
    id: 'AP-2037', sessionId: 'CS-1A77E5D9', agent: '孙琪', team: '客服一部',
    businessLine: '银行卡管理', channel: '邮件',
    disputeItem: '个人信息授权缺失', originalScore: 63, appealScore: 79,
    lane: 'appealing', initiator: '孙琪', reviewer: '林婉清',
    reason: '邮件模板已含授权条款链接，AI 未解析附件，申请人工终裁。',
    aiOpinion: '更换银行卡邮件正文未包含个人信息授权告知，合规 agent 判定缺失。',
    reviewOpinion: '复核：正文确未含授权文本，链接不等同主动告知，维持违规判定，坐席不服转申诉。',
    evidence: [
      { speaker: '坐席', text: '您好，新卡号已收到，我们会尽快为您完成绑定变更。', kind: 'violation', note: '正文缺个人信息授权告知，仅附链接' },
      { speaker: '客户', text: '麻烦把原卡的扣款也一并停掉。', kind: 'risk', note: '涉及资金变更，授权告知尤为关键' },
    ],
    createdAt: '2026-06-16 14:05', updatedAt: '2026-06-17 09:05',
  },
  {
    id: 'AP-2036', sessionId: 'CS-5F8B12C0', agent: '李航', team: '客服二部',
    businessLine: '逾期催收', channel: '通话',
    disputeItem: '逾期后果告知不完整', originalScore: 69, appealScore: 85,
    lane: 'appealing', initiator: '李航', reviewer: '沈括',
    reason: '我已说明影响征信，只是未念全条款，扣分过重，申请终裁。',
    aiOpinion: '逾期后果告知仅提征信，未覆盖罚息与诉讼提示，判定告知不完整扣 8 分。',
    reviewOpinion: '复核：核心后果（征信）已告知，罚息提示缺失属轻微，建议改判减扣，坐席诉求更高分转终裁。',
    evidence: [
      { speaker: '坐席', text: '您再逾期下去会影响个人征信记录的，建议尽快处理。', kind: 'compliant', note: '征信影响已告知' },
      { speaker: '坐席', text: '具体罚息和后续我就不细说了，您自己注意。', kind: 'risk', note: '罚息 / 诉讼后果未完整告知' },
    ],
    createdAt: '2026-06-16 11:30', updatedAt: '2026-06-17 08:30',
  },
  {
    id: 'AP-2035', sessionId: 'CS-D2C90A4F', agent: '赵越', team: '客服一部',
    businessLine: 'S客户路由', channel: '在线',
    disputeItem: '抢话 / 打断客户', originalScore: 74, appealScore: 86,
    lane: 'final', initiator: '赵越', reviewer: '沈括', arbiter: '周慎',
    reason: '在线文字无「抢话」，时间戳重叠是客户连发两条，申请终裁纠正。',
    aiOpinion: '结构化检测到坐席与客户消息时间重叠 3 处，判定抢话，服务项扣 6 分。',
    reviewOpinion: '复核：在线渠道「抢话」按消息时间重叠判定不适用，建议改判通过。',
    verdict: undefined,
    evidence: [
      { speaker: '客户', text: '我想问下这个产品……', kind: 'risk', note: '客户消息 1（14:02:11）' },
      { speaker: '客户', text: '……还有提前还款有没有手续费？', kind: 'risk', note: '客户消息 2（14:02:13）连发，非坐席抢话' },
      { speaker: '坐席', text: '提前还款不收手续费，按剩余本金结清即可。', kind: 'compliant', note: '坐席回复在客户两条之后' },
    ],
    createdAt: '2026-06-15 15:48', updatedAt: '2026-06-17 09:14',
  },
  {
    id: 'AP-2034', sessionId: 'CS-6E33B8A1', agent: '孙琪', team: '客服一部',
    businessLine: '产品咨询', channel: '通话',
    disputeItem: '静默超时 18s', originalScore: 77, appealScore: 88,
    lane: 'final', initiator: '孙琪', reviewer: '林婉清', arbiter: '周慎',
    reason: '静默是系统查询征信耗时，非服务怠慢，请终裁豁免扣分。',
    aiOpinion: '通话中段出现 18s 静默无应答，超 15s 阈值，服务项静默超时扣 5 分。',
    reviewOpinion: '复核：静默期坐席在等待风控查询返回，属系统耗时，建议改判通过。',
    evidence: [
      { speaker: '坐席', text: '稍等，我帮您查询一下当前的可用额度。', kind: 'compliant', note: '静默前已告知客户在查询' },
      { speaker: '客户', text: '（静默 18 秒）喂？还在吗？', kind: 'risk', note: '静默超阈值，但坐席事前已说明' },
    ],
    createdAt: '2026-06-15 10:12', updatedAt: '2026-06-16 18:20',
  },
  {
    id: 'AP-2033', sessionId: 'CS-A019C7E2', agent: '李航', team: '客服二部',
    businessLine: '提前结清', channel: '通话',
    disputeItem: '越权承诺 · 利息全免', originalScore: 39, appealScore: 39,
    lane: 'archived', initiator: '李航', reviewer: '沈括', arbiter: '周慎',
    reason: '我承认表述不当，但希望减轻处理。',
    aiOpinion: '坐席明确承诺「提前结清可利息全免」，承诺越权重大违规，合规扣分 18 分。',
    reviewOpinion: '复核：录音清晰，确属越权承诺，无歧义。',
    verdict: '违规成立',
    evidence: [
      { speaker: '坐席', text: '您今天提前结清的话，剩下的利息我保证全给您免掉。', kind: 'violation', note: '越权承诺「利息全免」，触碰承诺红线' },
      { speaker: '客户', text: '真的能全免？那我现在就还。', kind: 'risk', note: '客户据不实承诺做决策，风险高' },
    ],
    createdAt: '2026-06-14 16:30', updatedAt: '2026-06-15 11:40',
  },
  {
    id: 'AP-2032', sessionId: 'CS-B7E441D8', agent: '赵越', team: '客服一部',
    businessLine: '注销合规', channel: '在线',
    disputeItem: '禁语命中（误判）', originalScore: 81, appealScore: 92,
    lane: 'archived', initiator: '赵越', reviewer: '林婉清', arbiter: '周慎',
    reason: '「拿你没办法」是安抚口语非禁语，已申诉成功记录在案。',
    aiOpinion: '禁语 agent 命中「拿你没办法」，判定服务态度禁语扣 4 分。',
    reviewOpinion: '复核：结合上下文为善意调侃式安抚，非攻击性禁语，改判通过。',
    verdict: '改判通过',
    evidence: [
      { speaker: '坐席', text: '行吧，那我真是拿您没办法，这就帮您加急处理。', kind: 'compliant', note: '上下文为友好安抚，非禁语语义' },
      { speaker: '客户', text: '哈哈谢谢啊，麻烦快点。', kind: 'compliant', note: '客户反馈正向，佐证善意语境' },
    ],
    createdAt: '2026-06-13 14:18', updatedAt: '2026-06-14 09:50',
  },
  {
    id: 'AP-2031', sessionId: 'CS-C5A8E390', agent: '孙琪', team: '客服一部',
    businessLine: '银行卡管理', channel: 'Bot',
    disputeItem: 'Bot 应答 · 风险话术缺失', originalScore: 72, appealScore: 84,
    lane: 'pending', initiator: '孙琪',
    reason: 'Bot 流转人工前已弹风险提示卡，AI 仅评文本未计入卡片，申请复核。',
    aiOpinion: 'Bot 会话变更银行卡环节未在文本中告知信息安全风险，判定风险话术缺失。',
    evidence: [
      { speaker: '坐席', text: '（Bot）检测到敏感操作，已为您弹出安全提示卡片，请确认。', kind: 'risk', note: '风险提示走卡片非文本，争议是否计入' },
      { speaker: '客户', text: '好的我看到了，确认变更。', kind: 'compliant', note: '客户确认已阅风险提示' },
    ],
    createdAt: '2026-06-17 07:42', updatedAt: '2026-06-17 07:45',
  },
  {
    id: 'AP-2030', sessionId: 'CS-F33A1B7C', agent: '李航', team: '客服二部',
    businessLine: '逾期催收', channel: '通话',
    disputeItem: '情绪安抚不足', originalScore: 68, appealScore: 79,
    lane: 'reviewing', initiator: '李航', reviewer: '沈括',
    reason: '客户情绪激化主因是欠款压力，我已多次安抚，扣分偏主观。',
    aiOpinion: '情绪安抚 agent 检测客户情绪峰值达「愤怒」，坐席安抚响应不足，主观项扣 7 分。',
    reviewOpinion: '复核中：复盘安抚话术频次，坐席有 2 次共情表达，倾向部分成立。',
    evidence: [
      { speaker: '客户', text: '你们天天打电话烦不烦！我就是没钱还！', kind: 'risk', note: '客户情绪峰值：愤怒' },
      { speaker: '坐席', text: '我特别理解您现在的压力，我们一起看看怎么解决最稳妥。', kind: 'compliant', note: '坐席共情安抚话术' },
    ],
    createdAt: '2026-06-16 15:55', updatedAt: '2026-06-17 08:12',
  },
];

// ─── 漏斗数据（图表⑧：发起 → 受理 → 改判 → 驳回）──────────────────────────
const FUNNEL: { name: string; value: number; color: string }[] = [
  { name: '发起申诉', value: 248, color: '--gold' },
  { name: '受理复核', value: 196, color: '--info' },
  { name: '改判通过', value: 112, color: '--success' },
  { name: '维持驳回', value: 84, color: '--danger' },
];

const fmtPct = (a: number, b: number) => `${((a / b) * 100).toFixed(1)}%`;

export default function Appeal() {
  const { hasPermission, currentRole } = useAuth();
  const [active, setActive] = useState<DisputeCard | null>(null);
  const [lineFilter, setLineFilter] = useState<string>('全部');
  const [cards, setCards] = useState<DisputeCard[]>(DISPUTES);

  // 权限语义：坐席发起申诉、质检主管复核、合规官终裁。
  // 复核裁决需 review:judge（主管/合规官）；终裁需 appeal:judge（合规官）。
  const canReview = hasPermission('review:judge');
  const canFinalJudge = hasPermission('appeal:judge');

  const lineOptions = useMemo(
    () => ['全部', ...Array.from(new Set(DISPUTES.map(d => d.businessLine)))] as const,
    [],
  );

  const visible = useMemo(
    () => (lineFilter === '全部' ? cards : cards.filter(c => c.businessLine === lineFilter)),
    [cards, lineFilter],
  );

  const byLane = useMemo(() => {
    const m: Record<LaneId, DisputeCard[]> = {
      pending: [], reviewing: [], appealing: [], final: [], archived: [],
    };
    visible.forEach(c => m[c.lane].push(c));
    return m;
  }, [visible]);

  // KPI
  const kpiPending = byLane.pending.length;
  const kpiReviewing = byLane.reviewing.length;
  const kpiAppealing = byLane.appealing.length;
  const overturnRate = 41.2; // 本月改判率（改判通过 / 受理）mock 锚点

  const funnelOpt = useMemo(
    () => () => ({
      ...baseOption(),
      grid: undefined,
      tooltip: {
        trigger: 'item',
        ...(baseOption().tooltip as object),
        formatter: (p: { name: string; value: number }) =>
          `${p.name}<br/><b style="font-variant-numeric:tabular-nums">${p.value}</b> 件 · 占发起 ${fmtPct(p.value, FUNNEL[0].value)}`,
      },
      series: [
        {
          type: 'funnel',
          left: '8%', right: '8%', top: 16, bottom: 16,
          minSize: '24%', maxSize: '100%',
          gap: 3,
          sort: 'descending',
          funnelAlign: 'center',
          label: {
            show: true, position: 'inside',
            color: cssVar('--accent-ink'),
            fontSize: 12, fontWeight: 600,
            fontFamily: "'Geist','PingFang SC',sans-serif",
            formatter: (p: { name: string; value: number }) => `${p.name}  ${p.value}`,
          },
          labelLine: { show: false },
          itemStyle: { borderColor: cssVar('--surface-1'), borderWidth: 2 },
          emphasis: { label: { fontSize: 13 } },
          data: FUNNEL.map(f => ({ name: f.name, value: f.value, itemStyle: { color: cssVar(f.color) } })),
          animationDuration: 900,
          animationEasing: 'cubicOut',
        },
      ],
    }),
    [],
  );

  const judge = (verdict: Verdict) => {
    if (!active) return;
    const isFinalStage = active.lane === 'final';
    if (isFinalStage && !canFinalJudge) {
      toast(`终裁需「合规官」权限 · 当前为${currentRole?.name ?? '访客'}`, 'warn');
      return;
    }
    if (!isFinalStage && !canReview) {
      toast(`复核裁决需「质检主管」及以上权限 · 当前为${currentRole?.name ?? '访客'}`, 'warn');
      return;
    }
    const arbiterName = currentRole?.name ?? '系统';
    const nextLane: LaneId = active.lane === 'final' ? 'archived'
      : active.lane === 'appealing' ? 'final'
      : active.lane === 'reviewing' ? 'appealing'
      : 'reviewing';
    setCards(prev => prev.map(c => c.id === active.id
      ? {
        ...c, verdict, lane: nextLane,
        arbiter: isFinalStage ? arbiterName : c.arbiter,
        reviewer: c.reviewer ?? arbiterName,
        updatedAt: '2026-06-17 09:30',
      }
      : c));
    const toneMap: Record<Verdict, 'success' | 'warn' | 'danger' | 'info'> = {
      违规成立: 'danger', 部分成立: 'warn', 改判通过: 'success', 驳回: 'info',
    };
    toast(`${active.sessionId} 裁决：${verdict} · 已留痕并流转`, toneMap[verdict]);
    setActive(null);
  };

  return (
    <div className="page">
      <PageHeader
        title="复核 / 申诉工作流"
        subtitle="质检争议闭环 · 坐席发起申诉 → 主管复核 → 合规官终裁 · 全程留痕可审计"
        actions={
          <>
            <span className="svc-pill"><Gavel size={13} style={{ marginRight: 5, verticalAlign: '-2px' }} />三级裁决留痕</span>
            <button className="btn btn-ghost" onClick={() => toast('已导出本月申诉处理台账（PDF 占位）', 'info')}>
              <History size={14} />导出台账
            </button>
          </>
        }
      />

      {/* ── KPI 带 ── */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <StatCard label="待复核" raw={kpiPending} unit="件" icon={<FileSearch size={16} />} change={-8} delayClass="reveal-1" />
        <StatCard label="复核中" raw={kpiReviewing} unit="件" icon={<GitPullRequestArrow size={16} />} change={5} delayClass="reveal-2" />
        <StatCard label="申诉中" raw={kpiAppealing} unit="件" icon={<MessagesSquare size={16} />} change={12} delayClass="reveal-3" />
        <StatCard label="本月改判率" raw={overturnRate} unit="%" decimals={1} icon={<Scale size={16} />} change={3.4} delayClass="reveal-4" />
      </div>

      {/* ── 业务线筛选 ── */}
      <div className="row gap-3 wrap reveal reveal-2" style={{ marginBottom: 16 }}>
        <span className="row gap-1 label" style={{ marginBottom: 0 }}><Filter size={12} />业务线</span>
        <Segmented
          options={lineOptions.map(l => ({ value: l, label: l }))}
          value={lineFilter}
          onChange={(v: string) => setLineFilter(v)}
        />
        <span className="t-small text-3 tnum" style={{ marginLeft: 'auto' }}>
          共 {visible.length} 件争议 · 拖动横向查看全流程
        </span>
      </div>

      {/* ── 泳道看板（5 列）── */}
      <div
        className="reveal reveal-3"
        style={{
          display: 'grid', gridTemplateColumns: `repeat(${LANES.length}, minmax(252px, 1fr))`,
          gap: 14, overflowX: 'auto', paddingBottom: 6, marginBottom: 24, alignItems: 'start',
        }}
      >
        {LANES.map(lane => {
          const list = byLane[lane.id];
          const Ico = lane.icon;
          return (
            <div
              key={lane.id}
              style={{
                background: 'var(--surface-2)', border: '1px solid var(--hairline)',
                borderRadius: 'var(--r-lg)', display: 'flex', flexDirection: 'column', minHeight: 220,
              }}
            >
              {/* 列头 */}
              <div
                className="row spread"
                style={{ padding: '12px 14px', borderBottom: '1px solid var(--hairline)' }}
              >
                <span className="row gap-2" style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${lane.accent} 14%, transparent)`, color: lane.accent }}>
                    <Ico size={13} />
                  </span>
                  {lane.name}
                </span>
                <span className="tag tnum" style={{ minWidth: 24, justifyContent: 'center' }}>{list.length}</span>
              </div>

              {/* 卡片栈 */}
              <div className="col gap-2" style={{ padding: 10, flex: 1 }}>
                {list.length === 0 ? (
                  <div className="col" style={{ alignItems: 'center', justifyContent: 'center', padding: '28px 10px', color: 'var(--text-3)', gap: 6 }}>
                    <Archive size={18} style={{ opacity: 0.4 }} />
                    <span className="t-small">暂无争议</span>
                  </div>
                ) : (
                  list.map(c => <CaseCard key={c.id} c={c} accent={lane.accent} onOpen={() => setActive(c)} />)
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 图表⑧：申诉处理漏斗 ── */}
      <div className="card reveal reveal-4">
        <div className="spread" style={{ marginBottom: 6 }}>
          <span className="label">图表⑧ · 申诉处理漏斗</span>
          <span className="t-small text-3">发起 → 受理 → 改判 → 驳回 · 本月累计</span>
        </div>
        <div className="row gap-4 wrap" style={{ alignItems: 'center' }}>
          <div style={{ flex: '1 1 460px', minWidth: 300 }}>
            <Chart build={funnelOpt} height={300} />
          </div>
          <div className="col gap-3" style={{ flex: '0 0 200px', minWidth: 180 }}>
            {FUNNEL.map((f, i) => (
              <div key={f.name} className="col gap-1">
                <div className="row spread">
                  <span className="row gap-2 t-small text-2">
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: cssVar(f.color) }} />
                    {f.name}
                  </span>
                  <span className="tnum" style={{ fontWeight: 600, color: 'var(--text-1)' }}>{f.value}</span>
                </div>
                <span className="t-small text-3 tnum" style={{ paddingLeft: 16 }}>
                  {i === 0 ? '基准 100%' : `转化 ${fmtPct(f.value, FUNNEL[i - 1].value)} · 占发起 ${fmtPct(f.value, FUNNEL[0].value)}`}
                </span>
              </div>
            ))}
            <div className="divider" style={{ margin: '4px 0' }} />
            <div className="row spread">
              <span className="row gap-2 t-small text-2"><ListChecks size={14} />改判率</span>
              <span className="tnum gold" style={{ fontWeight: 700 }}>{fmtPct(FUNNEL[2].value, FUNNEL[1].value)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 申诉详情 Drawer ── */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        title={active ? `申诉详情 · ${active.id}` : ''}
        sub={active ? `${active.sessionId} · ${active.businessLine} · ${active.channel}` : ''}
        width={560}
        footer={active ? <VerdictBar lane={active.lane} canReview={canReview} canFinalJudge={canFinalJudge} onJudge={judge} /> : undefined}
      >
        {active && <AppealDetail c={active} />}
      </Drawer>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// 子组件
// ════════════════════════════════════════════════════════════════════════

// ─── 争议卡片 ────────────────────────────────────────────────────────────────
function CaseCard({ c, accent, onOpen }: { c: DisputeCard; accent: string; onOpen: () => void }) {
  const up = c.appealScore > c.originalScore;
  return (
    <button
      onClick={onOpen}
      className="card card-hover card-pad-0"
      style={{ textAlign: 'left', cursor: 'pointer', padding: 12, width: '100%', display: 'block' }}
    >
      <span className="stripe-top" style={{ background: accent }} />
      <div className="row spread" style={{ marginBottom: 8 }}>
        <span className="mono t-small" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{c.sessionId}</span>
        {c.verdict
          ? <StatusBadge status={c.verdict} tone={c.verdict === '改判通过' ? 'good' : c.verdict === '驳回' ? 'info' : c.verdict === '部分成立' ? 'warn' : 'bad'} />
          : <span className="tag">{c.channel}</span>}
      </div>

      <div className="row gap-2" style={{ marginBottom: 8 }}>
        <span className="avatar" style={{ width: 22, height: 22, fontSize: 10 }}>{c.agent.slice(0, 1)}</span>
        <span className="t-small" style={{ color: 'var(--text-1)', fontWeight: 600 }}>{c.agent}</span>
        <span className="t-small text-3">·</span>
        <span className="t-small text-3">{c.businessLine}</span>
      </div>

      <div className="row gap-2" style={{ marginBottom: 10 }}>
        <TriangleAlert size={13} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
        <span className="t-small" style={{ color: 'var(--text-2)', lineHeight: 1.4 }}>{c.disputeItem}</span>
      </div>

      <div className="row spread" style={{ padding: '7px 10px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--hairline)' }}>
        <span className="t-small text-3">原评分</span>
        <span className="row gap-2" style={{ fontWeight: 700 }}>
          <span className="tnum" style={{ color: 'var(--text-2)' }}>{c.originalScore}</span>
          <ArrowRight size={12} style={{ color: 'var(--text-3)' }} />
          <span className="tnum" style={{ color: up ? 'var(--success)' : 'var(--text-1)' }}>{c.appealScore}</span>
          <span className="tnum t-small" style={{ color: up ? 'var(--success)' : 'var(--text-3)', fontWeight: 600 }}>
            {up ? '+' : ''}{c.appealScore - c.originalScore}
          </span>
        </span>
      </div>
    </button>
  );
}

// ─── 申诉详情主体（原评分 vs 复核意见 diff + 证据原句）──────────────────────
function AppealDetail({ c }: { c: DisputeCard }) {
  const diff = c.appealScore - c.originalScore;
  return (
    <div className="col gap-5">
      {/* 摘要条 */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <MetaCell icon={<UserRound size={13} />} label="发起坐席" value={c.initiator} sub={c.team} />
        <MetaCell icon={<Gavel size={13} />} label="争议质检项" value={c.disputeItem} sub={`${c.channel} · ${c.businessLine}`} tone="danger" />
      </div>

      {/* 评分对照 diff（左原评 vs 右申诉主张）*/}
      <section>
        <div className="label" style={{ marginBottom: 10 }}>评分对照 · 原 AI 判定 vs 申诉主张</div>
        <div className="row" style={{ gap: 0, border: '1px solid var(--hairline)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
          <div className="col" style={{ flex: 1, padding: '14px 16px', background: 'var(--surface-2)' }}>
            <span className="label" style={{ marginBottom: 6 }}>原 AI 评分</span>
            <span className="kpi-value" style={{ color: 'var(--text-2)' }}>{c.originalScore}</span>
          </div>
          <div className="col" style={{ width: 44, alignItems: 'center', justifyContent: 'center', background: 'var(--surface-1)', borderLeft: '1px solid var(--hairline)', borderRight: '1px solid var(--hairline)' }}>
            <ArrowRight size={16} style={{ color: 'var(--gold)' }} />
          </div>
          <div className="col" style={{ flex: 1, padding: '14px 16px', background: 'color-mix(in srgb, var(--success) 8%, transparent)' }}>
            <span className="label" style={{ marginBottom: 6 }}>申诉主张分</span>
            <span className="row gap-2" style={{ alignItems: 'baseline' }}>
              <span className="kpi-value" style={{ color: 'var(--success)' }}>{c.appealScore}</span>
              <span className="tnum t-small" style={{ color: diff >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>{diff >= 0 ? '+' : ''}{diff}</span>
            </span>
          </div>
        </div>
      </section>

      {/* 意见 diff：AI 判定 / 坐席理由 / 复核意见 */}
      <section className="col gap-2">
        <div className="label" style={{ marginBottom: 2 }}>判定与意见</div>
        <OpinionRow icon={<Gavel size={13} />} who="原 AI 判定" tone="var(--danger)" text={c.aiOpinion} />
        <OpinionRow icon={<MessagesSquare size={13} />} who={`坐席申诉 · ${c.initiator}`} tone="var(--warning)" text={c.reason} />
        {c.reviewOpinion
          ? <OpinionRow icon={<GitPullRequestArrow size={13} />} who={`复核意见 · ${c.reviewer ?? '主管'}`} tone="var(--info)" text={c.reviewOpinion} />
          : <div className="row gap-2 t-small text-3" style={{ padding: '10px 12px', border: '1px dashed var(--hairline-strong)', borderRadius: 'var(--r-sm)' }}>
            <GitPullRequestArrow size={13} />等待质检主管复核意见…
          </div>}
        {c.verdict && (
          <div
            className="row gap-2"
            style={{ padding: '11px 13px', borderRadius: 'var(--r-sm)', background: 'color-mix(in srgb, var(--gold) 9%, transparent)', border: '1px solid var(--hairline-strong)' }}
          >
            <Scale size={14} style={{ color: 'var(--gold)' }} />
            <span className="t-small" style={{ color: 'var(--text-1)' }}>
              <b>终裁结论：{c.verdict}</b>{c.arbiter ? ` · 合规官 ${c.arbiter}` : ''} · {c.updatedAt}
            </span>
          </div>
        )}
      </section>

      {/* 证据原句引用（违规红底 / 合规绿底 / 风险琥珀）*/}
      <section>
        <div className="row spread" style={{ marginBottom: 10 }}>
          <span className="label">证据原句引用 · 转写定位</span>
          <span className="mono t-small text-3">{c.sessionId}</span>
        </div>
        <div className="col gap-2">
          {c.evidence.map((e, i) => <EvidenceQuote key={i} e={e} />)}
        </div>
      </section>

      {/* 时间线脚注 */}
      <div className="row gap-2 t-small text-3" style={{ paddingTop: 4, borderTop: '1px solid var(--hairline)' }}>
        <History size={12} />发起 {c.createdAt} · 最近更新 {c.updatedAt}
      </div>
    </div>
  );
}

// ─── 元信息单元格 ────────────────────────────────────────────────────────────
function MetaCell({ icon, label, value, sub, tone }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; tone?: 'danger';
}) {
  return (
    <div className="col gap-1" style={{ padding: '11px 13px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', border: '1px solid var(--hairline)' }}>
      <span className="row gap-1 label" style={{ marginBottom: 0 }}>{icon}{label}</span>
      <span className="t-small" style={{ fontWeight: 600, color: tone === 'danger' ? 'var(--danger)' : 'var(--text-1)', lineHeight: 1.35 }}>{value}</span>
      {sub && <span className="t-small text-3">{sub}</span>}
    </div>
  );
}

// ─── 意见行 ──────────────────────────────────────────────────────────────────
function OpinionRow({ icon, who, tone, text }: { icon: React.ReactNode; who: string; tone: string; text: string }) {
  return (
    <div style={{ padding: '11px 13px', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', borderLeft: `2px solid ${tone}` }}>
      <span className="row gap-2" style={{ marginBottom: 5, color: tone, fontWeight: 600, fontSize: 12 }}>{icon}{who}</span>
      <p className="t-small" style={{ color: 'var(--text-2)', lineHeight: 1.55 }}>{text}</p>
    </div>
  );
}

// ─── 证据原句（语义三色：违规红 / 合规绿 / 风险琥珀）────────────────────────
function EvidenceQuote({ e }: { e: EvidenceLine }) {
  const palette = {
    violation: { c: 'var(--danger)', label: '违规' },
    compliant: { c: 'var(--success)', label: '合规' },
    risk: { c: 'var(--warning)', label: '风险待定' },
  }[e.kind];
  return (
    <div
      style={{
        padding: '11px 13px', borderRadius: 'var(--r-sm)',
        background: `color-mix(in srgb, ${palette.c} 9%, transparent)`,
        borderLeft: `2px solid ${palette.c}`,
      }}
    >
      <div className="row spread" style={{ marginBottom: 5 }}>
        <span className="row gap-2 t-small" style={{ fontWeight: 600, color: 'var(--text-1)' }}>
          <span className="tag" style={{ background: e.speaker === '坐席' ? 'var(--gold-dim)' : 'var(--surface-3)', color: e.speaker === '坐席' ? 'var(--gold)' : 'var(--text-2)', borderColor: 'transparent' }}>{e.speaker}</span>
        </span>
        <span className="badge" style={{ background: `color-mix(in srgb, ${palette.c} 16%, transparent)`, color: palette.c }}>{palette.label}</span>
      </div>
      <p className="t-small" style={{ color: 'var(--text-1)', lineHeight: 1.55, display: 'flex', gap: 6 }}>
        <Quote size={13} style={{ color: palette.c, flexShrink: 0, marginTop: 3, opacity: 0.7 }} />
        <span>{e.text}</span>
      </p>
      <span className="t-small text-3" style={{ display: 'block', marginTop: 5, paddingLeft: 19 }}>{e.note}</span>
    </div>
  );
}

// ─── 裁决按钮条（权限语义控制）──────────────────────────────────────────────
function VerdictBar({ lane, canReview, canFinalJudge, onJudge }: {
  lane: LaneId; canReview: boolean; canFinalJudge: boolean; onJudge: (v: Verdict) => void;
}) {
  if (lane === 'archived') {
    return (
      <span className="row gap-2 t-small text-3" style={{ width: '100%', justifyContent: 'center' }}>
        <Archive size={14} />已归档 · 裁决留痕不可再改
      </span>
    );
  }
  const isFinal = lane === 'final';
  const allowed = isFinal ? canFinalJudge : canReview;
  return (
    <div className="col gap-2" style={{ width: '100%' }}>
      <div className="row spread">
        <span className="row gap-1 t-small text-3">
          {isFinal ? <Scale size={13} /> : <GitPullRequestArrow size={13} />}
          {isFinal ? '终裁阶段 · 需合规官' : '复核阶段 · 需质检主管'}
        </span>
        {!allowed && <span className="row gap-1 t-small" style={{ color: 'var(--warning)' }}><Lock size={12} />当前角色无裁决权</span>}
      </div>
      <div className="row gap-2 wrap">
        {VERDICTS.map(({ v, tone, icon: Ico }) => {
          const cmap = { good: 'var(--success)', warn: 'var(--warning)', bad: 'var(--danger)', info: 'var(--info)' }[tone];
          return (
            <button
              key={v}
              className="btn btn-sm"
              disabled={!allowed}
              onClick={() => onJudge(v)}
              style={{
                flex: '1 1 auto',
                background: `color-mix(in srgb, ${cmap} 12%, transparent)`,
                color: cmap,
                border: `1px solid color-mix(in srgb, ${cmap} 32%, transparent)`,
              }}
            >
              <Ico size={13} />{v}
            </button>
          );
        })}
      </div>
    </div>
  );
}
