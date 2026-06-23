import { useState, useMemo } from 'react';
import {
  Search, Plus, Layers, MessageSquareText, GitBranch, Eye, Pencil,
  Power, Trash2, FlaskConical, Hash, ChevronDown,
} from 'lucide-react';
import { PageHeader } from '../../components/ui';
import { DataTable, Pagination, type Col } from '../../components/DataTable';
import { StatusBadge, Toolbar, Field, Modal, Drawer, toast } from '../../components/kit';
import { INTENT_L1 } from '../../lib/mockData';
import type { ScenarioRow, ScenarioVersion, KBStatus } from '../../types';

// ════════════════════════════════════════════════════════════════════════════
// 问题场景 · 场景聚合 + 标签多版本 A/B 路由（znkf 独有，规格 01 漏补回）
// 一个场景 = 多变体问法共享一条标准回复；可挂多个标签版本做条件路由 / AB 实验
// ════════════════════════════════════════════════════════════════════════════

type LibSource = 'qa' | 'card';

// ─── 标签条件字典（命中标签 → 走对应版本答案）──────────────────────────────────
const TAG_DICT: { value: string; label: string }[] = [
  { value: 'all',        label: '全部用户（默认）' },
  { value: 'overdue',    label: 'overdue · 逾期用户' },
  { value: 'vip',        label: 'vip · 会员用户' },
  { value: 'newuser',    label: 'newuser · 新注册 7 天内' },
  { value: 'highvalue',  label: 'highvalue · 高额度用户' },
  { value: 'settled',    label: 'settled · 已结清用户' },
  { value: 'risk_watch', label: 'risk_watch · 风险观察名单' },
];
const tagLabel = (t: string) => TAG_DICT.find(d => d.value === t)?.label ?? t;

// ─── 变体问法（场景 → 多个等义问法）──────────────────────────────────────────
const VARIANTS: Record<string, string[]> = {
  '怎么还款':       ['怎么还款', '在哪里还款', '还款入口在哪', '我要还钱', '如何归还借款', '还款怎么操作'],
  '提前结清手续费':  ['提前结清要手续费吗', '提前还清收费吗', '一次性结清有没有费用', '提前结清违约金多少', '结清要不要额外收钱'],
  '会员怎么退费':    ['会员怎么退费', '我要退会员费', '会员费能退吗', '取消会员退钱吗', '怎么申请会员退费'],
  '逾期相关问题':    ['我逾期了怎么办', '逾期多久上征信', '逾期罚息怎么算', '逾期了还不上怎么办', '逾期会怎么样', '逾期能协商吗'],
  '提升额度':       ['额度怎么提升', '怎么提额', '如何申请提高额度', '额度太低能涨吗', '什么时候能提额'],
  '查看贷款利率':    ['我的利率是多少', '怎么查看贷款利率', '年化利率多少', '利息怎么算', '借一万一天多少利息'],
  '修改绑定手机号':  ['怎么改手机号', '换绑手机号', '预留手机号变更', '我换号码了怎么改', '绑定的手机不用了'],
  '注销账户':       ['怎么注销账户', '我要销户', '如何关闭账号', '注销需要什么条件', '不想用了怎么注销'],
  '分期手续费':     ['分期手续费怎么算', '分期要收多少钱', '分期费率是多少', '分12期总共多少手续费', '分期划算吗'],
  '账单查询':       ['怎么查账单', '我的账单在哪看', '本期应还多少', '查看还款计划', '下个月还多少'],
  '修改还款日':     ['能改还款日吗', '怎么修改还款日期', '账单日可以变更吗', '我想换个还款日', '调整扣款日'],
  '征信查询':       ['怎么查征信', '会上征信吗', '征信报告在哪看', '我的征信受影响吗', '上征信了怎么消除'],
  '优惠券使用':     ['优惠券怎么用', '我的券在哪', '免息券怎么领', '券为什么用不了', '活动券怎么抵扣'],
  '人工客服时间':    ['人工客服几点上班', '客服上班时间', '什么时候有人工', '周末有客服吗', '客服热线是多少'],
  '解绑银行卡':     ['怎么解绑银行卡', '换张卡还款', '删掉绑定的卡', '银行卡注销了怎么换', '还款卡怎么更换'],
  '借款到账时间':    ['借款多久到账', '钱什么时候到', '审核通过多久放款', '为什么还没到账', '放款一般要多久'],
};

// ─── 16 条真实消金场景（≥14）+ AB 版本路由示例 ──────────────────────────────
const INITIAL_DATA: ScenarioRow[] = [
  {
    scenario: '怎么还款', l1: '还款相关',
    answer: '亲亲~还款可在『信用贷 APP-我的-还款』操作哦，支持绑定银行卡自动扣款与主动还款两种方式，按时还款有助于维护良好征信记录~',
    variantCount: 6, updatedAt: '2026-06-15 10:23', status: '已生效', effCount: 2, pendCount: 0, offCount: 0,
    versions: [
      { id: 'v-repay-default', name: '默认版', tags: ['all'], abGroup: 'A', priority: 0, enabled: true,
        answer: '亲亲~还款可在『信用贷 APP-我的-还款』操作哦，支持绑定银行卡自动扣款与主动还款两种方式~' },
      { id: 'v-repay-overdue', name: '逾期版', tags: ['overdue'], abGroup: 'A', priority: 1, enabled: true,
        answer: '您当前有逾期账单，请尽快在『信用贷 APP-我的-还款』全额还清以免影响征信。如需协商还款方案，请拨打人工客服 400-800-1234（08:00–21:00）。' },
    ],
  },
  {
    scenario: '提前结清手续费', l1: '费用相关',
    answer: '提前结清不收取额外手续费，仅需结清剩余本金及已产生利息。可在『信用贷 APP-我的-我的借款-提前结清』查看结清金额并发起申请~',
    variantCount: 5, updatedAt: '2026-06-14 16:40', status: '待发布', effCount: 1, pendCount: 1, offCount: 0,
    versions: [
      { id: 'v-settle-default', name: '默认版', tags: ['all'], abGroup: 'A', priority: 0, enabled: true,
        answer: '提前结清不收取额外手续费，仅需结清剩余本金及已产生利息~' },
      { id: 'v-settle-b', name: '挽留实验版 B', tags: ['all'], abGroup: 'B', priority: 0, enabled: false,
        answer: '提前结清不收手续费哦~温馨提示：保持借款记录有助于后续提额，如无急用可继续按期还款。结清入口：『我的借款-提前结清』。' },
    ],
  },
  {
    scenario: '会员怎么退费', l1: '产品与信息',
    answer: '会员退费可在『我的-会员中心-退费申请』发起，3-5 工作日原路退回。未使用权益的会员支持全额退费~',
    variantCount: 5, updatedAt: '2026-06-13 09:05', status: '已生效', effCount: 1, pendCount: 0, offCount: 0,
    versions: [
      { id: 'v-vip-default', name: '默认版', tags: ['all'], abGroup: 'A', priority: 0, enabled: true,
        answer: '会员退费可在『我的-会员中心-退费申请』发起，3-5 工作日原路退回~' },
    ],
  },
  {
    scenario: '逾期相关问题', l1: '催收相关',
    answer: '如您已逾期，请尽快还款以免产生罚息并影响征信。逾期罚息按日计收，连续逾期可能上报征信。如有还款困难需协商，请拨打 400-800-1234 由专员为您处理~',
    variantCount: 6, updatedAt: '2026-06-16 08:11', status: '已生效', effCount: 2, pendCount: 1, offCount: 0,
    versions: [
      { id: 'v-od-default', name: '默认版', tags: ['all'], abGroup: 'A', priority: 0, enabled: true,
        answer: '逾期会产生罚息并可能影响征信，请尽快在 APP 内还清账单~' },
      { id: 'v-od-overdue', name: '逾期用户版', tags: ['overdue'], abGroup: 'A', priority: 2, enabled: true,
        answer: '您名下账单已逾期，罚息按日累计中。请立即在『信用贷 APP-我的-还款』全额还清；如确有困难需协商分期，请拨打 400-800-1234（08:00–21:00），专员将为您评估方案。' },
      { id: 'v-od-risk', name: '风险观察版', tags: ['risk_watch'], abGroup: 'A', priority: 1, enabled: false,
        answer: '关于您的逾期问题，已为您优先转接人工专员核实处理，请稍候~' },
    ],
  },
  {
    scenario: '提升额度', l1: '申请咨询',
    answer: '额度由系统根据您的资信、用信及还款表现动态评估，暂不支持人工调额。保持良好还款记录、完善资料有助于系统提额，可在『我的-额度』查看最新可用额度~',
    variantCount: 5, updatedAt: '2026-06-12 14:30', status: '已生效', effCount: 1, pendCount: 0, offCount: 0,
    versions: [
      { id: 'v-limit-default', name: '默认版', tags: ['all'], abGroup: 'A', priority: 0, enabled: true,
        answer: '额度由系统动态评估，保持良好还款记录有助于提额~' },
      { id: 'v-limit-vip', name: '会员版', tags: ['vip'], abGroup: 'A', priority: 1, enabled: true,
        answer: '尊贵的会员用户您好~额度由系统动态评估，您可在会员中心查看专属提额任务，完成后系统将优先复评额度。' },
    ],
  },
  {
    scenario: '查看贷款利率', l1: '费用相关',
    answer: '您的实际年化利率（单利）以借款页面展示及合同约定为准，可在『信用贷 APP-我的借款-查看合同』中查询具体利率与还款计划，借款前页面也会清晰展示~',
    variantCount: 5, updatedAt: '2026-06-11 13:00', status: '已生效', effCount: 1, pendCount: 0, offCount: 0,
    versions: [
      { id: 'v-rate-default', name: '默认版', tags: ['all'], abGroup: 'A', priority: 0, enabled: true,
        answer: '实际年化利率以借款页面及合同约定为准，可在『我的借款-查看合同』查询~' },
    ],
  },
  {
    scenario: '修改绑定手机号', l1: '信息维护',
    answer: '更换预留手机号可在『信用贷 APP-我的-设置-账户安全-手机号』中操作，需通过原手机号或身份验证。如原号码已停用无法接收验证码，请拨打 400-800-1234 由人工协助~',
    variantCount: 5, updatedAt: '2026-06-10 09:05', status: '待发布', effCount: 0, pendCount: 1, offCount: 0,
    versions: [
      { id: 'v-phone-default', name: '默认版', tags: ['all'], abGroup: 'A', priority: 0, enabled: true,
        answer: '更换手机号可在『设置-账户安全-手机号』操作，需通过验证~' },
    ],
  },
  {
    scenario: '注销账户', l1: '信息维护',
    answer: '注销账户需满足：无在借订单、无逾期欠款、无进行中的退费/投诉工单。满足条件后可在『我的-设置-账户安全-注销账户』申请，注销后数据将不可恢复，请谨慎操作~',
    variantCount: 5, updatedAt: '2026-06-08 16:42', status: '已生效', effCount: 1, pendCount: 0, offCount: 0,
    versions: [
      { id: 'v-close-default', name: '默认版', tags: ['all'], abGroup: 'A', priority: 0, enabled: true,
        answer: '注销需无在借、无逾期、无进行中工单，满足后在『设置-账户安全-注销账户』申请~' },
      { id: 'v-close-settled', name: '已结清版', tags: ['settled'], abGroup: 'A', priority: 1, enabled: true,
        answer: '您名下借款已全部结清，符合注销条件~可在『我的-设置-账户安全-注销账户』直接发起，注销后数据不可恢复，请确认后操作。' },
    ],
  },
  {
    scenario: '分期手续费', l1: '费用相关',
    answer: '分期手续费按所选期数对应费率，于每期账单中分摊收取，借款及分期页面会清晰展示每期金额与总手续费，确认后再操作即可~',
    variantCount: 5, updatedAt: '2026-06-06 14:35', status: '已生效', effCount: 1, pendCount: 0, offCount: 0,
    versions: [
      { id: 'v-inst-default', name: '默认版', tags: ['all'], abGroup: 'A', priority: 0, enabled: true,
        answer: '分期手续费按期数对应费率分摊收取，页面会展示每期金额与总手续费~' },
    ],
  },
  {
    scenario: '账单查询', l1: '还款相关',
    answer: '您的账单及还款计划可在『信用贷 APP-我的-还款』查看，包含本期应还金额、还款日及各期明细，建议开启还款提醒避免遗漏~',
    variantCount: 5, updatedAt: '2026-06-15 11:50', status: '已生效', effCount: 1, pendCount: 0, offCount: 0,
    versions: [
      { id: 'v-bill-default', name: '默认版', tags: ['all'], abGroup: 'A', priority: 0, enabled: true,
        answer: '账单及还款计划可在『我的-还款』查看本期应还、还款日及明细~' },
    ],
  },
  {
    scenario: '修改还款日', l1: '业务办理',
    answer: '还款日由借款放款日确定，暂不支持自助修改。如确有调整需求，请拨打人工客服 400-800-1234（08:00–21:00）说明情况，由专员为您评估处理~',
    variantCount: 5, updatedAt: '2026-06-09 15:50', status: '待发布', effCount: 0, pendCount: 1, offCount: 0,
    versions: [
      { id: 'v-due-default', name: '默认版', tags: ['all'], abGroup: 'A', priority: 0, enabled: true,
        answer: '还款日由放款日确定，暂不支持自助修改，如需调整请拨打 400-800-1234~' },
    ],
  },
  {
    scenario: '征信查询', l1: '产品与信息',
    answer: '示例消费金融为持牌机构，正常用信不影响征信，逾期则可能上报。征信报告需通过中国人民银行征信中心官网或线下网点查询，我方暂不提供个人征信报告查询~',
    variantCount: 5, updatedAt: '2026-06-07 10:12', status: '已生效', effCount: 1, pendCount: 0, offCount: 0,
    versions: [
      { id: 'v-credit-default', name: '默认版', tags: ['all'], abGroup: 'A', priority: 0, enabled: true,
        answer: '正常用信不影响征信，逾期可能上报；征信报告需通过央行征信中心查询~' },
      { id: 'v-credit-overdue', name: '逾期版', tags: ['overdue'], abGroup: 'A', priority: 1, enabled: true,
        answer: '您当前存在逾期，可能已上报征信。请尽快还清账单，结清后记录会如实更新；如需核实上报情况请拨打 400-800-1234。' },
    ],
  },
  {
    scenario: '优惠券使用', l1: '营销活动',
    answer: '您的优惠券（免息券/折扣券）可在『我的-卡券中心』查看，借款时在确认页勾选可用券即可抵扣。券有使用期限与适用条件，请留意券面说明~',
    variantCount: 5, updatedAt: '2026-06-05 17:20', status: '已下线', effCount: 0, pendCount: 0, offCount: 1,
    versions: [
      { id: 'v-coupon-default', name: '默认版', tags: ['all'], abGroup: 'A', priority: 0, enabled: false,
        answer: '优惠券可在『我的-卡券中心』查看，借款确认页勾选可用券抵扣~' },
    ],
  },
  {
    scenario: '人工客服时间', l1: '业务办理',
    answer: '人工服务时间为每日 08:00—21:00，客服热线 400-800-1234。非服务时段可留言或由小云为您解答常见问题哦~',
    variantCount: 5, updatedAt: '2026-06-14 09:20', status: '已生效', effCount: 1, pendCount: 0, offCount: 0,
    versions: [
      { id: 'v-hour-default', name: '默认版', tags: ['all'], abGroup: 'A', priority: 0, enabled: true,
        answer: '人工服务时间 08:00—21:00，客服热线 400-800-1234~' },
    ],
  },
  {
    scenario: '解绑银行卡', l1: '业务办理',
    answer: '更换还款银行卡可在『信用贷 APP-我的-银行卡管理』中添加新卡并设为默认扣款卡，原卡在无在途扣款时可解绑。还款卡需为本人 I 类借记卡~',
    variantCount: 5, updatedAt: '2026-06-13 14:08', status: '已生效', effCount: 1, pendCount: 0, offCount: 0,
    versions: [
      { id: 'v-card-default', name: '默认版', tags: ['all'], abGroup: 'A', priority: 0, enabled: true,
        answer: '可在『我的-银行卡管理』添加新卡设为默认，原卡无在途扣款时可解绑~' },
    ],
  },
  {
    scenario: '借款到账时间', l1: '申请咨询',
    answer: '借款审核通过后一般实时到账绑定银行卡，受银行处理时效影响，个别情况可能延迟数分钟至 2 小时。若超时未到账，请核对银行卡状态或拨打 400-800-1234~',
    variantCount: 5, updatedAt: '2026-06-16 07:40', status: '已生效', effCount: 1, pendCount: 0, offCount: 0,
    versions: [
      { id: 'v-arrive-default', name: '默认版', tags: ['all'], abGroup: 'A', priority: 0, enabled: true,
        answer: '审核通过一般实时到账，受银行时效影响个别可能延迟数分钟至 2 小时~' },
      { id: 'v-arrive-new', name: '新户版', tags: ['newuser'], abGroup: 'A', priority: 1, enabled: true,
        answer: '欢迎新用户~首笔借款审核通过后通常实时到账，首次放款可能需额外几分钟核验，请耐心等待；超时未到可拨打 400-800-1234 核实。' },
    ],
  },
];

const PAGE_SIZE = 8;
const now16 = () => new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-').slice(0, 16);
const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s);

// ─── 聚合状态徽章（按生效/待发/下线计数聚合，hover 显明细）────────────────────
function AggStatusBadge({ row }: { row: ScenarioRow }) {
  const title = `已生效 ${row.effCount} / 待发布 ${row.pendCount} / 已下线 ${row.offCount}`;
  let status: KBStatus = '已下线';
  if (row.effCount > 0 && row.pendCount === 0) status = '已生效';
  else if (row.pendCount > 0) status = '待发布';
  else if (row.effCount > 0) status = '已生效';
  return (
    <span title={title} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'help' }}>
      <StatusBadge status={status} />
      {row.pendCount > 0 && (
        <span className="tnum" style={{ fontSize: 11, color: 'var(--warning)' }}>+{row.pendCount} 待发</span>
      )}
    </span>
  );
}

export default function Scenario() {
  const [data, setData]           = useState<ScenarioRow[]>(INITIAL_DATA);
  const [lib, setLib]             = useState<LibSource>('qa');
  const [search, setSearch]       = useState('');
  const [l1Filter, setL1Filter]   = useState<string>('全部');
  const [statusFilter, setStatus] = useState<KBStatus | '全部'>('全部');
  const [page, setPage]           = useState(1);

  // 编辑答案 Modal（含 AB 版本区）
  const [ansRow, setAnsRow]       = useState<ScenarioRow | null>(null);
  const [ansOpen, setAnsOpen]     = useState(false);
  const [draftAnswer, setDraftAnswer] = useState('');
  const [draftL1, setDraftL1]     = useState<string>(INTENT_L1[0]);
  const [draftCardId, setDraftCardId] = useState('');
  const [draftVersions, setDraftVersions] = useState<ScenarioVersion[]>([]);
  const [isNew, setIsNew]         = useState(false);

  // 编辑变体 Modal
  const [varRow, setVarRow]       = useState<ScenarioRow | null>(null);
  const [varOpen, setVarOpen]     = useState(false);
  const [draftVariants, setDraftVariants] = useState<string[]>([]);

  // 查看变体 Drawer
  const [viewRow, setViewRow]     = useState<ScenarioRow | null>(null);
  const [viewOpen, setViewOpen]   = useState(false);

  const isCard = lib === 'card';

  // ─── 过滤 ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => data.filter(r => {
    const hitSearch = !search || r.scenario.includes(search) || r.answer.includes(search);
    const hitL1 = l1Filter === '全部' || r.l1 === l1Filter;
    let hitStatus = true;
    if (statusFilter === '已生效') hitStatus = r.effCount > 0;
    else if (statusFilter === '待发布') hitStatus = r.pendCount > 0;
    else if (statusFilter === '已下线') hitStatus = r.offCount > 0 && r.effCount === 0 && r.pendCount === 0;
    return hitSearch && hitL1 && hitStatus;
  }), [data, search, l1Filter, statusFilter]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalVariants = data.reduce((s, r) => s + r.variantCount, 0);
  const abScenarios   = data.filter(r => (r.versions?.length ?? 0) > 1).length;

  // ─── 编辑答案 ──────────────────────────────────────────────────────────────
  const openAnswer = (row: ScenarioRow) => {
    setIsNew(false);
    setAnsRow(row);
    setDraftAnswer(row.answer);
    setDraftL1(row.l1);
    setDraftCardId('');
    setDraftVersions(row.versions ? row.versions.map(v => ({ ...v })) : []);
    setAnsOpen(true);
  };

  const openNew = () => {
    setIsNew(true);
    setAnsRow(null);
    setDraftAnswer('');
    setDraftL1(INTENT_L1[0]);
    setDraftCardId('');
    setDraftVersions([]);
    setAnsOpen(true);
  };

  const addVersion = () => {
    const n: ScenarioVersion = {
      id: `v-new-${Date.now()}`, name: `新版本 ${draftVersions.length + 1}`,
      tags: ['all'], abGroup: 'A', priority: 0, enabled: false,
      answer: draftAnswer || '（填写该标签命中时返回的答案）',
    };
    setDraftVersions(prev => [...prev, n]);
  };

  const patchVersion = (id: string, patch: Partial<ScenarioVersion>) =>
    setDraftVersions(prev => prev.map(v => (v.id === id ? { ...v, ...patch } : v)));

  const removeVersion = (id: string) =>
    setDraftVersions(prev => prev.filter(v => v.id !== id));

  const saveAnswer = () => {
    if (!isCard && !draftAnswer.trim()) { toast('默认回复不能为空', 'warn'); return; }
    if (isCard && !draftCardId.trim()) { toast('卡片 ID 不能为空', 'warn'); return; }
    if (isNew) {
      const name = (isCard ? draftCardId : draftAnswer).trim().slice(0, 10) || '新场景';
      const fresh: ScenarioRow = {
        scenario: `新增场景 · ${name}`, l1: draftL1,
        answer: isCard ? `卡片 #${draftCardId.trim()}` : draftAnswer.trim(),
        variantCount: 1, updatedAt: now16(), status: '待发布',
        effCount: 0, pendCount: 1, offCount: 0, versions: draftVersions,
      };
      setData(prev => [fresh, ...prev]);
      toast(`已新增场景，状态「待发布」，同步生成 ${draftVersions.length} 个版本`, 'success');
    } else if (ansRow) {
      setData(prev => prev.map(r => r.scenario === ansRow.scenario
        ? {
            ...r, l1: draftL1,
            answer: isCard ? `卡片 #${draftCardId.trim()}` : draftAnswer.trim(),
            versions: draftVersions, updatedAt: now16(),
            // 改答案 → demote 生效条目到待发布（聚合）
            pendCount: r.pendCount + r.effCount, effCount: 0,
          }
        : r));
      toast(`已保存 · 同步更新 ${ansRow.variantCount} 条变体 · 状态降为「待发布」`, 'success');
    }
    setAnsOpen(false);
    setPage(1);
  };

  // ─── 编辑变体 ──────────────────────────────────────────────────────────────
  const openVariants = (row: ScenarioRow) => {
    setVarRow(row);
    setDraftVariants([...(VARIANTS[row.scenario] ?? [row.scenario])]);
    setVarOpen(true);
  };

  const saveVariants = () => {
    const cleaned = draftVariants.map(v => v.trim()).filter(Boolean);
    if (!cleaned.length) { toast('至少保留一条变体问法', 'warn'); return; }
    if (varRow) {
      VARIANTS[varRow.scenario] = cleaned;
      setData(prev => prev.map(r => r.scenario === varRow.scenario
        ? { ...r, variantCount: cleaned.length, updatedAt: now16(), pendCount: r.pendCount + r.effCount, effCount: 0 }
        : r));
      toast(`变体已更新为 ${cleaned.length} 条 · 状态降为「待发布」`, 'success');
    }
    setVarOpen(false);
  };

  // ─── 上线 / 下线 ──────────────────────────────────────────────────────────
  const toggleOnline = (row: ScenarioRow) => {
    const goOff = row.offCount === 0;
    setData(prev => prev.map(r => r.scenario === row.scenario
      ? (goOff
          ? { ...r, effCount: 0, pendCount: 0, offCount: r.effCount + r.pendCount + r.offCount, updatedAt: now16() }
          : { ...r, effCount: r.offCount, offCount: 0, updatedAt: now16() })
      : r));
    toast(`「${row.scenario}」已${goOff ? '下线' : '上线'}`, 'info');
  };

  // ─── 表列 ─────────────────────────────────────────────────────────────────
  const cols: Col<ScenarioRow>[] = [
    {
      key: 'scenario', header: '场景名称', width: '20%',
      render: r => (
        <div className="col" style={{ gap: 2 }}>
          <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{r.scenario}</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {(r.versions?.length ?? 0) > 1
              ? <span className="row gap-1" style={{ color: 'var(--gold)' }}><FlaskConical size={11} />{r.versions!.length} 个标签版本 · AB 路由</span>
              : <span className="row gap-1"><GitBranch size={11} />单一回复</span>}
          </span>
        </div>
      ),
    },
    {
      key: 'answer', header: isCard ? '标准回复（卡片 ID）' : '标准回复',
      render: r => isCard
        ? <span className="mono" style={{ fontSize: 12, color: 'var(--gold)' }}>{r.answer.replace('卡片 #', '') || '—'}</span>
        : <span style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{trunc(r.answer, 78)}</span>,
    },
    {
      key: 'updatedAt', header: '更新时间', width: 142, nowrap: true,
      sortable: true, sortAccessor: r => r.updatedAt,
      render: r => <span className="tnum" style={{ color: 'var(--text-3)', fontSize: 12 }}>{r.updatedAt}</span>,
    },
    {
      key: 'status', header: '聚合状态', width: 132,
      render: r => <AggStatusBadge row={r} />,
    },
    {
      key: 'variantCount', header: '变体数', width: 78, num: true,
      sortable: true, sortAccessor: r => r.variantCount,
      render: r => <span className="tnum" style={{ fontWeight: 600, color: 'var(--text-1)' }}>{r.variantCount}</span>,
    },
    {
      key: 'l1', header: '一级意图', width: 104,
      render: r => <span className="tag" style={{ fontSize: 11 }}>{r.l1}</span>,
    },
    {
      key: 'ops', header: '操作', width: 234,
      render: r => (
        <div className="row gap-1" onClick={e => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm" title="编辑答案" onClick={() => openAnswer(r)}>
            <Pencil size={13} /><span style={{ marginLeft: 3 }}>答案</span>
          </button>
          <button className="btn btn-ghost btn-sm" title="编辑变体" onClick={() => openVariants(r)}>
            <GitBranch size={13} /><span style={{ marginLeft: 3 }}>变体</span>
          </button>
          <button className="btn btn-ghost btn-sm" title="查看变体" onClick={() => { setViewRow(r); setViewOpen(true); }}>
            <Eye size={13} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            title={r.offCount > 0 && r.effCount === 0 ? '上线' : '下线'}
            onClick={() => toggleOnline(r)}
            style={{ color: r.offCount > 0 && r.effCount === 0 ? 'var(--success)' : 'var(--warning)' }}
          >
            <Power size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="问题场景"
        subtitle="675 个场景聚合 · 一个场景 = 多变体问法共享标准回复 · 支持标签多版本 A/B 路由"
        actions={
          <button className="btn btn-primary btn-sm" onClick={openNew}>
            <Plus size={14} /><span style={{ marginLeft: 4 }}>+ 新增场景</span>
          </button>
        }
      />

      {/* ─── 摘要条 ──────────────────────────────────────────────────── */}
      <div className="row gap-3 wrap reveal" style={{ marginBottom: 18 }}>
        {([
          { icon: <Layers size={15} />,          label: '场景总数', value: data.length, sub: '聚合视图' },
          { icon: <MessageSquareText size={15} />, label: '变体问法', value: totalVariants, sub: '等义问法' },
          { icon: <FlaskConical size={15} />,    label: 'AB 路由场景', value: abScenarios, sub: '多版本' },
        ] as const).map(s => (
          <div key={s.label} className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 168 }}>
            <span style={{ color: 'var(--gold)', opacity: 0.85, display: 'flex' }}>{s.icon}</span>
            <div className="col" style={{ gap: 1 }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>{s.label}</span>
              <span className="row" style={{ gap: 6, alignItems: 'baseline' }}>
                <span className="tnum" style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-1)' }}>{s.value}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.sub}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ─── 工具条 ──────────────────────────────────────────────────── */}
      <Toolbar>
        <select
          className="input"
          style={{ flex: '0 0 168px' }}
          value={lib}
          onChange={e => { setLib(e.target.value as LibSource); setPage(1); }}
        >
          <option value="qa">库来源：QA 知识库</option>
          <option value="card">库来源：卡片知识库</option>
        </select>
        <div className="input-wrap" style={{ flex: '0 0 256px' }}>
          <Search size={14} className="input-icon" />
          <input
            className="input"
            style={{ paddingLeft: 30 }}
            placeholder="搜索场景名称或标准回复..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="input"
          style={{ flex: '0 0 130px' }}
          value={l1Filter}
          onChange={e => { setL1Filter(e.target.value); setPage(1); }}
        >
          <option value="全部">全部意图</option>
          {INTENT_L1.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select
          className="input"
          style={{ flex: '0 0 122px' }}
          value={statusFilter}
          onChange={e => { setStatus(e.target.value as KBStatus | '全部'); setPage(1); }}
        >
          <option value="全部">全部状态</option>
          <option value="已生效">含已生效</option>
          <option value="待发布">含待发布</option>
          <option value="已下线">已下线</option>
        </select>
        <span className="row" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)', gap: 6 }}>
          <Hash size={13} />
          <span>{isCard ? '卡片库模式 · 回复返回卡片 ID' : 'QA 库模式 · 回复返回文本答案'}</span>
        </span>
      </Toolbar>

      {/* ─── 表格 ────────────────────────────────────────────────────── */}
      <div className="card card-pad-0 reveal-1">
        <DataTable<ScenarioRow>
          cols={cols}
          rows={pageRows}
          rowKey={r => r.scenario}
          defaultSort={{ key: 'updatedAt', dir: 'desc' }}
          empty={{ title: '没有匹配的场景', desc: '试试调整搜索 / 意图 / 状态筛选，或点「+ 新增场景」' }}
          dense
        />
      </div>

      <div className="row spread wrap" style={{ marginTop: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
          共 <span className="tnum" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{filtered.length}</span> 个场景
          {l1Filter !== '全部' && <span style={{ marginLeft: 4 }}>· 意图: {l1Filter}</span>}
          {statusFilter !== '全部' && <span style={{ marginLeft: 4 }}>· {statusFilter}</span>}
          {search && <span style={{ marginLeft: 4 }}>· 搜索: "{search}"</span>}
        </span>
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
      </div>

      {/* ═══ 编辑答案 Modal（含 AB 标签版本区）═══════════════════════════ */}
      <Modal
        open={ansOpen}
        onClose={() => setAnsOpen(false)}
        title={isNew ? '新增场景' : `编辑答案 · ${ansRow?.scenario ?? ''}`}
        sub={isCard ? '卡片库模式 · 标准回复为卡片 ID' : '修改默认回复将同步降级该场景下所有变体为「待发布」'}
        width={640}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setAnsOpen(false)}>取消</button>
            <button className="btn btn-primary" onClick={saveAnswer}>{isNew ? '新增场景' : '保存答案'}</button>
          </>
        }
      >
        {isCard ? (
          <Field label="卡片 ID" hint="命中场景时返回该卡片 ID 给在线客服平台渲染卡片消息">
            <input
              className="input mono"
              placeholder="如 2030888006771101698"
              value={draftCardId}
              onChange={e => setDraftCardId(e.target.value)}
              autoFocus
            />
          </Field>
        ) : (
          <Field label="默认回复" hint={`所有变体问法命中后共享此回复 · 同步更新 ${ansRow?.variantCount ?? 1} 条变体`}>
            <textarea
              className="input"
              rows={4}
              placeholder="输入该场景的标准默认回复..."
              value={draftAnswer}
              onChange={e => setDraftAnswer(e.target.value)}
              style={{ resize: 'vertical', minHeight: 92, lineHeight: 1.6 }}
              autoFocus
            />
          </Field>
        )}

        <Field label="一级意图" hint="决定该场景归属的意图大类，影响路由与统计归集">
          <div className="input-wrap" style={{ position: 'relative' }}>
            <select
              className="input"
              value={draftL1}
              onChange={e => setDraftL1(e.target.value)}
              style={{ width: '100%' }}
            >
              {INTENT_L1.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </Field>

        {/* ─── 标签版本区（AB 路由）· 卡片库模式隐藏 ─────────────────── */}
        {!isCard && (
          <div style={{ marginTop: 8 }}>
            <div className="row spread" style={{ marginBottom: 10 }}>
              <span className="row gap-2" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.02em' }}>
                <FlaskConical size={13} style={{ color: 'var(--gold)' }} />
                标签版本 · A/B 路由
                <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>（命中标签优先走对应版本，否则回落默认回复）</span>
              </span>
              <button className="btn btn-subtle btn-sm" onClick={addVersion}>
                <Plus size={12} /><span style={{ marginLeft: 3 }}>添加版本</span>
              </button>
            </div>

            {draftVersions.length === 0 ? (
              <div style={{
                padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--text-3)',
                background: 'var(--surface-2)', border: '1px dashed var(--hairline-strong)', borderRadius: 'var(--r-sm)',
              }}>
                暂无标签版本 · 所有用户统一走默认回复。点「添加版本」可为特定标签（如逾期用户）配置专属答案。
              </div>
            ) : (
              <div className="col" style={{ gap: 10 }}>
                {draftVersions.map(v => (
                  <div key={v.id} style={{
                    padding: '12px 14px', background: 'var(--surface-2)',
                    border: '1px solid var(--hairline)', borderRadius: 'var(--r-md)',
                    borderLeft: `3px solid ${v.enabled ? 'var(--gold)' : 'var(--text-3)'}`,
                  }}>
                    <div className="row spread" style={{ marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                      <div className="row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* 优先级徽章 */}
                        <span className="badge" style={{
                          background: 'color-mix(in srgb, var(--gold) 16%, transparent)',
                          color: 'var(--gold)', fontWeight: 700,
                        }}>P{v.priority}</span>
                        <input
                          className="input"
                          value={v.name}
                          onChange={e => patchVersion(v.id, { name: e.target.value })}
                          style={{ width: 116, height: 28, fontSize: 12, fontWeight: 600 }}
                        />
                        {/* 标签条件 */}
                        <div className="row gap-1" style={{ alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>标签</span>
                          <select
                            className="input"
                            value={v.tags[0] ?? 'all'}
                            onChange={e => patchVersion(v.id, { tags: [e.target.value] })}
                            style={{ height: 28, fontSize: 12, width: 178 }}
                          >
                            {TAG_DICT.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        {/* AB 分组 */}
                        <div className="row gap-1" style={{ alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>AB</span>
                          <select
                            className="input"
                            value={v.abGroup}
                            onChange={e => patchVersion(v.id, { abGroup: e.target.value })}
                            style={{ height: 28, fontSize: 12, width: 64 }}
                          >
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                          </select>
                        </div>
                        {/* 优先级数字 */}
                        <div className="row gap-1" style={{ alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>优先级</span>
                          <input
                            type="number"
                            className="input tnum"
                            value={v.priority}
                            min={0}
                            onChange={e => patchVersion(v.id, { priority: Math.max(0, Number(e.target.value) || 0) })}
                            style={{ width: 56, height: 28, fontSize: 12 }}
                          />
                        </div>
                      </div>
                      <div className="row gap-2" style={{ alignItems: 'center' }}>
                        <label className="row gap-1" style={{ alignItems: 'center', cursor: 'pointer', fontSize: 12, color: 'var(--text-2)' }}>
                          <input
                            type="checkbox"
                            checked={v.enabled}
                            onChange={e => patchVersion(v.id, { enabled: e.target.checked })}
                            style={{ cursor: 'pointer', accentColor: 'var(--gold)' }}
                          />
                          启用
                        </label>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => removeVersion(v.id)}
                          title="删除版本"
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <textarea
                      className="input"
                      rows={2}
                      value={v.answer}
                      onChange={e => patchVersion(v.id, { answer: e.target.value })}
                      placeholder={`命中「${tagLabel(v.tags[0] ?? 'all')}」时返回的答案...`}
                      style={{ resize: 'vertical', minHeight: 54, fontSize: 13, lineHeight: 1.55 }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ═══ 编辑变体 Modal ═════════════════════════════════════════════ */}
      <Modal
        open={varOpen}
        onClose={() => setVarOpen(false)}
        title={`编辑变体问法 · ${varRow?.scenario ?? ''}`}
        sub={`管理共享同一标准回复的等义问法 · 当前 ${draftVariants.length} 条 · 保存后生效`}
        width={560}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setVarOpen(false)}>取消</button>
            <button className="btn btn-primary" onClick={saveVariants}>保存变体</button>
          </>
        }
      >
        <div className="col" style={{ gap: 8 }}>
          {draftVariants.map((v, i) => (
            <div key={i} className="row gap-2" style={{ alignItems: 'center' }}>
              <span className="tnum" style={{
                width: 22, height: 22, flexShrink: 0, borderRadius: 6, fontSize: 11,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--surface-3)', color: 'var(--text-3)', fontWeight: 600,
              }}>{i + 1}</span>
              <input
                className="input"
                value={v}
                placeholder="输入一条变体问法..."
                onChange={e => setDraftVariants(prev => prev.map((x, j) => (j === i ? e.target.value : x)))}
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setDraftVariants(prev => prev.filter((_, j) => j !== i))}
                title="删除该变体"
                style={{ color: 'var(--danger)' }}
                disabled={draftVariants.length <= 1}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button
            className="btn btn-subtle btn-sm"
            onClick={() => setDraftVariants(prev => [...prev, ''])}
            style={{ alignSelf: 'flex-start', marginTop: 4 }}
          >
            <Plus size={13} /><span style={{ marginLeft: 4 }}>添加变体</span>
          </button>
        </div>
        <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--surface-3)', borderRadius: 'var(--r-sm)', border: '1px solid var(--hairline)', fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
          删除的变体在保存前为临时标记，点「保存变体」后才真正生效。所有变体共享该场景的同一条标准回复，命中任一变体即返回。
        </div>
      </Modal>

      {/* ═══ 查看变体 Drawer（只读）════════════════════════════════════ */}
      <Drawer
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title={viewRow ? `${viewRow.scenario} · 变体问法` : '变体问法'}
        sub={viewRow ? `${(VARIANTS[viewRow.scenario] ?? [viewRow.scenario]).length} 条等义问法共享同一标准回复` : undefined}
        width={440}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setViewOpen(false)}>关闭</button>
            {viewRow && (
              <button className="btn btn-primary" onClick={() => { setViewOpen(false); openVariants(viewRow); }}>
                <Pencil size={13} /><span style={{ marginLeft: 4 }}>编辑变体</span>
              </button>
            )}
          </>
        }
      >
        {viewRow && (
          <>
            <div style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-md)' }}>
              <div className="row gap-2" style={{ marginBottom: 6 }}>
                <span className="label">标准回复</span>
                <span className="tag" style={{ fontSize: 10 }}>{viewRow.l1}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{viewRow.answer}</div>
            </div>

            {(viewRow.versions?.length ?? 0) > 1 && (
              <div style={{ marginBottom: 16 }}>
                <div className="row gap-2" style={{ marginBottom: 8 }}>
                  <FlaskConical size={13} style={{ color: 'var(--gold)' }} />
                  <span className="label">标签版本 · A/B 路由</span>
                </div>
                <div className="col" style={{ gap: 6 }}>
                  {viewRow.versions!.map(v => (
                    <div key={v.id} className="row spread" style={{
                      padding: '7px 10px', fontSize: 12, background: 'var(--surface-2)',
                      border: '1px solid var(--hairline)', borderRadius: 'var(--r-sm)',
                    }}>
                      <span className="row gap-2" style={{ alignItems: 'center' }}>
                        <span className="badge" style={{ background: 'color-mix(in srgb, var(--gold) 16%, transparent)', color: 'var(--gold)', fontWeight: 700 }}>P{v.priority}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{v.name}</span>
                        <span style={{ color: 'var(--text-3)' }}>{tagLabel(v.tags[0] ?? 'all')}</span>
                      </span>
                      <span className="tnum" style={{ color: v.enabled ? 'var(--success)' : 'var(--text-3)' }}>
                        {v.enabled ? `启用 · ${v.abGroup}组` : '未启用'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="row gap-2" style={{ marginBottom: 8 }}>
              <GitBranch size={13} style={{ color: 'var(--text-3)' }} />
              <span className="label">变体问法（{(VARIANTS[viewRow.scenario] ?? [viewRow.scenario]).length}）</span>
            </div>
            <div className="col" style={{ gap: 6 }}>
              {(VARIANTS[viewRow.scenario] ?? [viewRow.scenario]).map((q, i) => (
                <div key={i} className="row gap-2" style={{
                  padding: '8px 12px', fontSize: 13, color: 'var(--text-2)',
                  background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-sm)',
                }}>
                  <ChevronDown size={12} style={{ color: 'var(--gold)', opacity: 0.6, transform: 'rotate(-90deg)', flexShrink: 0, marginTop: 3 }} />
                  <span>{q}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
