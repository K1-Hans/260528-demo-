import { useState, useMemo } from 'react';
import {
  Search, ChevronDown, Plus, Send, MoreHorizontal, Upload, Download,
  Trash2, FileDown, Shuffle, Sparkles, BarChart3, Clock, MessageSquareText,
} from 'lucide-react';
import { PageHeader, SectionTitle } from '../../components/ui';
import { DataTable, Pagination, type Col } from '../../components/DataTable';
import { StatusBadge, Toolbar, Field, Modal, Drawer, MeterBar, toast } from '../../components/kit';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar } from '../../lib/chartTheme';
import { INTENT_L1 } from '../../lib/mockData';
import type { QAItem, KBStatus } from '../../types';
import './qa.css';

// ════════════════════════════════════════════════════════════════════════
// 二级 / 三级意图联动表（每个 L1 给若干 L2，L2 给若干 L3）。仅页面 mock。
// ════════════════════════════════════════════════════════════════════════
const INTENT_TREE: Record<string, Record<string, string[]>> = {
  还款相关: {
    还款方式: ['APP 还款', '线下还款', '自动扣款', '代扣失败'],
    提前还款: ['结清申请', '部分提前还', '手续费说明'],
    还款失败: ['余额不足', '扣款异常', '银行卡问题'],
    账单查询: ['当期账单', '历史账单', '应还金额'],
  },
  申请咨询: {
    额度提升: ['提额条件', '提额入口', '临时额度'],
    申请进度: ['审核中', '放款时间', '被拒原因'],
    资料准备: ['身份认证', '银行卡绑定', '人脸识别'],
  },
  产品与信息: {
    会员中心: ['权益查询', '退费申请', '开通入口'],
    产品介绍: ['信用贷介绍', '利率说明', '适用人群'],
    APP使用: ['登录问题', '功能位置', '版本更新'],
  },
  催收相关: {
    逾期提醒: ['逾期处理引导', '征信上报', '宽限期申请'],
    逾期费用: ['罚息计算', '违约金', '减免协商'],
    协商还款: ['延期申请', '分期方案', '停催申请'],
  },
  营销活动: {
    优惠活动: ['活动规则', '参与方式', '券码领取'],
    利息减免: ['减免条件', '到账时间'],
  },
  费用相关: {
    利率查询: ['利率说明', '年化计算', '综合费率'],
    手续费: ['分期费率', '提前还分期', '服务费'],
  },
  业务办理: {
    换卡: ['换卡申请', '换卡进度'],
    注销账户: ['注销申请', '注销条件', '注销影响'],
    解绑银行卡: ['解绑流程', '解绑限制'],
  },
  信息维护: {
    修改信息: ['手机号变更', '地址更新', '紧急联系人'],
    密码管理: ['重置密码', '修改交易密码'],
  },
  批量问题: {
    系统异常: ['页面报错', '加载失败', '功能不可用'],
  },
  自定义: {
    其他咨询: ['人工转接', '投诉建议'],
  },
};

const L1_LIST = INTENT_L1 as readonly string[];
const l2Of = (l1: string): string[] => (l1 && INTENT_TREE[l1] ? Object.keys(INTENT_TREE[l1]) : []);
const l3Of = (l1: string, l2: string): string[] => (l1 && l2 && INTENT_TREE[l1]?.[l2]) || [];

// ─── 知识库分层条形（顶部签名图）────────────────────────────────────────────
const KB_LAYERS = [
  { name: 'QA 标准问答', value: 12954, color: '--gold' },
  { name: '寒暄库', value: 1396, color: '--c2' },
  { name: '富文本卡片', value: 530, color: '--c4' },
  { name: '转人工话术', value: 149, color: '--c6' },
];

// ─── Mock：24+ 行真实消金 QA ─────────────────────────────────────────────────
const MOCK_QA: QAItem[] = [
  { idx: 1,  q: '怎么还款',               a: '亲亲~还款可在「信用贷 APP-我的-还款」操作哦，支持绑定银行卡一键还款，08:00—21:00 客服在线为您协助。', l1: '还款相关', l2: '还款方式', l3: 'APP 还款', scenario: '日常还款', status: '已生效', vectorized: true,  updatedAt: '2026-06-16 09:42', updatedBy: '林婉清', hits: 8421 },
  { idx: 2,  q: '还款失败是什么原因',       a: '还款失败常见原因：①银行卡余额不足 ②超出银行单笔限额 ③银行卡状态异常。建议您更换还款方式或联系发卡行确认后重试~', l1: '还款相关', l2: '还款失败', l3: '余额不足', scenario: '还款异常', status: '已生效', vectorized: true,  updatedAt: '2026-06-16 08:55', updatedBy: '林婉清', hits: 3120 },
  { idx: 3,  q: '怎么申请提前结清',         a: '提前结清可在「信用贷 APP-我的-我的借款-提前还款」发起，系统会实时计算应还本息，结清后额度自动恢复~', l1: '还款相关', l2: '提前还款', l3: '结清申请', scenario: '提前结清', status: '已生效', vectorized: true,  updatedAt: '2026-06-15 14:30', updatedBy: '林婉清', hits: 2654 },
  { idx: 4,  q: '提前结清要手续费吗',       a: '提前结清仅需偿还剩余本金及已产生的利息，不收取额外违约金，具体金额以 APP 结清页面实时展示为准哦~', l1: '费用相关', l2: '手续费', l3: '提前还分期', scenario: '提前结清', status: '待发布', vectorized: false, updatedAt: '2026-06-16 10:18', updatedBy: '孙佳',   hits: 1980 },
  { idx: 5,  q: '会员怎么退费',            a: '会员退费可在「我的-会员中心-退费申请」发起，审核通过后 3—5 个工作日原路退回到您的支付账户~', l1: '产品与信息', l2: '会员中心', l3: '退费申请', scenario: '会员权益', status: '已生效', vectorized: true,  updatedAt: '2026-06-14 16:20', updatedBy: '孙佳',   hits: 4307 },
  { idx: 6,  q: '额度怎么提升',            a: '额度由系统根据您的征信、还款记录与活跃度综合动态评估。保持按时还款、完善资料有助于提额，可在 APP 首页「提额」入口查看专属任务~', l1: '申请咨询', l2: '额度提升', l3: '提额条件', scenario: '额度管理', status: '已生效', vectorized: true,  updatedAt: '2026-06-13 11:05', updatedBy: '林婉清', hits: 6892 },
  { idx: 7,  q: '我的借款利率是多少',       a: '您的综合年化利率以借款合同及 APP「我的借款」页面展示为准，不同产品、不同用户利率有所差异，建议以实际签约为准~', l1: '费用相关', l2: '利率查询', l3: '利率说明', scenario: '费率查询', status: '已生效', vectorized: true,  updatedAt: '2026-06-12 09:48', updatedBy: '周慎',   hits: 2210 },
  { idx: 8,  q: '逾期了会上征信吗',         a: '示例消费金融作为持牌机构，逾期记录会按监管要求如实上报央行征信。建议您尽快还款，如有困难可联系客服协商还款方案~', l1: '催收相关', l2: '逾期提醒', l3: '征信上报', scenario: '逾期催收', status: '已生效', vectorized: true,  updatedAt: '2026-06-15 17:33', updatedBy: '周慎',   hits: 3845 },
  { idx: 9,  q: '逾期罚息怎么算',          a: '逾期期间将按合同约定对逾期本金计收罚息，具体以 APP 账单页面实时展示为准。及时还款可避免罚息持续累积哦~', l1: '催收相关', l2: '逾期费用', l3: '罚息计算', scenario: '逾期催收', status: '待发布', vectorized: false, updatedAt: '2026-06-16 09:11', updatedBy: '周慎',   hits: 1564 },
  { idx: 10, q: '可以延期还款吗',          a: '如您当前还款确有困难，可在「我的-还款-协商还款」提交延期申请，或联系人工客服 400-800-1234 说明情况，我们将为您评估合适方案~', l1: '催收相关', l2: '协商还款', l3: '延期申请', scenario: '协商还款', status: '已生效', vectorized: true,  updatedAt: '2026-06-14 13:22', updatedBy: '赵越',   hits: 2733 },
  { idx: 11, q: '怎么绑定银行卡',          a: '绑卡可在「我的-银行卡管理-添加银行卡」操作，输入卡号并完成短信验证即可。仅支持绑定本人名下的 I 类储蓄卡哦~', l1: '申请咨询', l2: '资料准备', l3: '银行卡绑定', scenario: '账户管理', status: '已生效', vectorized: true,  updatedAt: '2026-06-11 15:00', updatedBy: '孙佳',   hits: 1890 },
  { idx: 12, q: '怎么注销账户',            a: '注销需在无在途借款、无未结清账单的前提下办理，可在「我的-设置-账户注销」提交申请。注销后历史额度将无法恢复，请谨慎操作~', l1: '业务办理', l2: '注销账户', l3: '注销条件', scenario: '账户管理', status: '已生效', vectorized: true,  updatedAt: '2026-06-10 09:05', updatedBy: '林婉清', hits: 1245 },
  { idx: 13, q: '申请多久能放款',          a: '一般审核通过后实时放款至您绑定的银行卡，到账时间受银行处理影响，通常几分钟内到账。如长时间未到账可联系客服核实~', l1: '申请咨询', l2: '申请进度', l3: '放款时间', scenario: '申请咨询', status: '已生效', vectorized: true,  updatedAt: '2026-06-13 10:40', updatedBy: '林婉清', hits: 5021 },
  { idx: 14, q: '为什么申请被拒绝',         a: '系统综合评估暂未通过，常见原因包括征信记录、负债情况、资料完整度等。建议您保持良好信用、完善资料后再尝试申请~', l1: '申请咨询', l2: '申请进度', l3: '被拒原因', scenario: '申请咨询', status: '已生效', vectorized: true,  updatedAt: '2026-06-12 14:30', updatedBy: '林婉清', hits: 4188 },
  { idx: 15, q: '怎么修改预留手机号',       a: '更换手机号可在「我的-设置-个人信息-手机号」发起变更，需完成原号码或人脸验证以确保账户安全~', l1: '信息维护', l2: '修改信息', l3: '手机号变更', scenario: '信息维护', status: '已生效', vectorized: true,  updatedAt: '2026-06-09 16:42', updatedBy: '孙佳',   hits: 967 },
  { idx: 16, q: '交易密码忘记了怎么办',     a: '可在「我的-设置-修改交易密码」通过短信验证重置，连续多次输错会暂时锁定，建议稍后再试或联系客服协助~', l1: '信息维护', l2: '密码管理', l3: '修改交易密码', scenario: '信息维护', status: '已生效', vectorized: true,  updatedAt: '2026-06-08 11:18', updatedBy: '孙佳',   hits: 712 },
  { idx: 17, q: '分期手续费怎么算',         a: '分期手续费按所选期数与对应费率计收，下单前 APP 会明确展示每期应还与手续费总额，确认后再提交即可~', l1: '费用相关', l2: '手续费', l3: '分期费率', scenario: '分期费用', status: '已生效', vectorized: true,  updatedAt: '2026-06-07 14:35', updatedBy: '林婉清', hits: 1622 },
  { idx: 18, q: '有什么优惠活动',          a: '当前活动以 APP 首页「活动中心」展示为准，新客礼包、还款立减、提额任务等会不定期上线，记得多关注哦~', l1: '营销活动', l2: '优惠活动', l3: '活动规则', scenario: '营销活动', status: '已生效', vectorized: true,  updatedAt: '2026-06-15 09:30', updatedBy: '孙佳',   hits: 1356 },
  { idx: 19, q: '怎么换一张银行卡还款',     a: '可在「我的-银行卡管理」添加新卡后，在还款页面切换为该卡。原卡如需解绑，请先确保无代扣协议绑定~', l1: '业务办理', l2: '换卡', l3: '换卡申请', scenario: '卡片服务', status: '已生效', vectorized: true,  updatedAt: '2026-06-06 14:30', updatedBy: '林婉清', hits: 803 },
  { idx: 20, q: '页面打不开一直加载',       a: '建议您检查网络后重启 APP，或更新至最新版本。若仍异常，可提供截图与机型联系客服 400-800-1234，我们会尽快为您排查~', l1: '批量问题', l2: '系统异常', l3: '加载失败', scenario: '系统异常', status: '已生效', vectorized: true,  updatedAt: '2026-06-16 07:50', updatedBy: '吴磊',   hits: 489 },
  { idx: 21, q: '临时额度怎么申请',         a: '临时额度由系统按用户资质不定期开放，可在 APP 首页查看是否有专属临额入口，开放后按提示领取即可，到期自动恢复~', l1: '申请咨询', l2: '额度提升', l3: '临时额度', scenario: '额度管理', status: '已下线', vectorized: true,  updatedAt: '2026-06-04 15:50', updatedBy: '林婉清', hits: 1102 },
  { idx: 22, q: '自动扣款会在几点',         a: '已开通自动还款的用户，系统将于还款日为您自动从绑定卡扣款，建议提前一日存入足额资金以免扣款失败~', l1: '还款相关', l2: '还款方式', l3: '自动扣款', scenario: '日常还款', status: '已生效', vectorized: true,  updatedAt: '2026-06-13 09:22', updatedBy: '林婉清', hits: 2087 },
  { idx: 23, q: '我要投诉',               a: '非常抱歉给您带来不好的体验，小云正在为您转接人工专员核实处理，您也可拨打 400-800-1234 反馈，我们会认真对待您的诉求~', l1: '自定义', l2: '其他咨询', l3: '投诉建议', scenario: '投诉处理', status: '已生效', vectorized: true,  updatedAt: '2026-06-16 08:30', updatedBy: '周慎',   hits: 642 },
  { idx: 24, q: '怎么查看历史账单',         a: '历史账单可在「信用贷 APP-我的-账单-历史账单」按月查看，支持导出明细，方便您随时核对还款情况~', l1: '还款相关', l2: '账单查询', l3: '历史账单', scenario: '账单查询', status: '已生效', vectorized: true,  updatedAt: '2026-06-11 13:00', updatedBy: '孙佳',   hits: 1411 },
  { idx: 25, q: '紧急联系人怎么改',         a: '紧急联系人可在「我的-设置-个人信息-紧急联系人」修改，请填写真实有效的联系方式，便于必要时与您取得联系~', l1: '信息维护', l2: '修改信息', l3: '紧急联系人', scenario: '信息维护', status: '待发布', vectorized: false, updatedAt: '2026-06-16 10:25', updatedBy: '孙佳',   hits: 318 },
  { idx: 26, q: '信用贷是正规平台吗',       a: '信用贷由持牌机构示例消费金融提供服务，受监管部门规范管理，您可放心使用。如对合规有疑问，欢迎联系客服了解~', l1: '产品与信息', l2: '产品介绍', l3: '信用贷介绍', scenario: '产品咨询', status: '已生效', vectorized: true,  updatedAt: '2026-06-10 09:48', updatedBy: '周慎',   hits: 2956 },
  { idx: 27, q: '部分提前还款可以吗',       a: '支持部分提前还款，可在「我的借款-提前还款」选择部分还款金额，剩余本金将按新的计划继续分期，灵活减轻还款压力~', l1: '还款相关', l2: '提前还款', l3: '部分提前还', scenario: '提前结清', status: '已生效', vectorized: true,  updatedAt: '2026-06-09 11:05', updatedBy: '林婉清', hits: 1733 },
];

// 近 7 日命中（详情页柱图，按 idx 派生稳定数据，纯展示）
function hits7d(seed: number): { d: string; v: number }[] {
  const days = ['06-10', '06-11', '06-12', '06-13', '06-14', '06-15', '06-16'];
  return days.map((d, i) => ({ d, v: Math.round(30 + ((seed * 17 + i * 53) % 120) + i * 6) }));
}
// Top 用户真实问法（详情页）
function topQueries(item: QAItem): { text: string; n: number }[] {
  const base = item.q;
  return [
    { text: base, n: Math.round((item.hits ?? 0) * 0.42) },
    { text: `${base}呀`, n: Math.round((item.hits ?? 0) * 0.21) },
    { text: `请问${base}`, n: Math.round((item.hits ?? 0) * 0.14) },
    { text: `${item.l3}相关咨询`, n: Math.round((item.hits ?? 0) * 0.09) },
  ];
}

const truncate = (s: string, n = 38) => (s.length > n ? s.slice(0, n) + '…' : s);

const STATUS_OPTIONS: (KBStatus | '')[] = ['', '已生效', '待发布', '已下线'];

export default function QA() {
  // 数据（可变：模拟上下线 / 删除 / demote）
  const [rows, setRows] = useState<QAItem[]>(MOCK_QA);

  // 筛选
  const [search, setSearch] = useState('');
  const [filterL1, setFilterL1] = useState('');
  const [filterL2, setFilterL2] = useState('');
  const [filterStatus, setFilterStatus] = useState<KBStatus | ''>('');

  // 选中 + 批量删除模式
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [batchMode, setBatchMode] = useState(false);

  // 分页
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  // 更多菜单
  const [moreOpen, setMoreOpen] = useState(false);

  // Drawer 详情
  const [detail, setDetail] = useState<QAItem | null>(null);

  // Modal 编辑 / 新增
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QAItem | null>(null);
  const [fQ, setFQ] = useState('');
  const [fA, setFA] = useState('');
  const [fL1, setFL1] = useState('');
  const [fL2, setFL2] = useState('');
  const [fL3, setFL3] = useState('');
  const [fScene, setFScene] = useState('');

  // ─── 过滤 ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => rows.filter(r => {
    if (search) {
      const k = search.toLowerCase();
      if (!r.q.toLowerCase().includes(k) && !r.a.toLowerCase().includes(k) && !r.scenario.toLowerCase().includes(k)) return false;
    }
    if (filterL1 && r.l1 !== filterL1) return false;
    if (filterL2 && r.l2 !== filterL2) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  }), [rows, search, filterL1, filterL2, filterStatus]);

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const counts = useMemo(() => ({
    eff: rows.filter(r => r.status === '已生效').length,
    pend: rows.filter(r => r.status === '待发布').length,
    off: rows.filter(r => r.status === '已下线').length,
  }), [rows]);

  const allOnPageSelected = paged.length > 0 && paged.every(r => selected.has(r.idx));
  const toggleAll = () => setSelected(s => {
    const n = new Set(s);
    if (allOnPageSelected) paged.forEach(r => n.delete(r.idx));
    else paged.forEach(r => n.add(r.idx));
    return n;
  });

  // ─── 动作 ──────────────────────────────────────────────────────────────────
  const toggleLine = (item: QAItem) => {
    const next: KBStatus = item.status === '已下线' ? '待发布' : '已下线';
    setRows(rs => rs.map(r => r.idx === item.idx ? { ...r, status: next } : r));
    toast(next === '已下线' ? `已下线「${truncate(item.q, 16)}」` : `已恢复「${truncate(item.q, 16)}」为待发布`, next === '已下线' ? 'info' : 'success');
  };

  const publishProd = () => {
    if (selected.size === 0) return;
    setRows(rs => rs.map(r => selected.has(r.idx) && r.status === '待发布' ? { ...r, status: '已生效', vectorized: true } : r));
    toast(`已发布 ${selected.size} 条至生产 · 增量向量化完成（1.4s）`, 'success');
    setSelected(new Set());
  };

  const batchDelete = () => {
    if (selected.size === 0) return;
    setRows(rs => rs.filter(r => !selected.has(r.idx)));
    toast(`已删除 ${selected.size} 条 QA`, 'danger');
    setSelected(new Set());
  };

  function openNew() {
    setEditing(null);
    setFQ(''); setFA(''); setFL1(''); setFL2(''); setFL3(''); setFScene('');
    setModalOpen(true);
  }
  function openEdit(item: QAItem) {
    setEditing(item);
    setFQ(item.q); setFA(item.a); setFL1(item.l1); setFL2(item.l2); setFL3(item.l3); setFScene(item.scenario);
    setModalOpen(true);
  }
  function saveForm() {
    if (!fQ.trim() || !fA.trim()) { toast('标准问题与标准回复为必填项', 'warn'); return; }
    if (editing) {
      const qChanged = fQ.trim() !== editing.q;
      setRows(rs => rs.map(r => r.idx === editing.idx
        ? { ...r, q: fQ.trim(), a: fA.trim(), l1: fL1, l2: fL2, l3: fL3, scenario: fScene,
            status: qChanged ? '待发布' : r.status, vectorized: qChanged ? false : r.vectorized,
            updatedAt: '2026-06-16 10:30', updatedBy: '林婉清' }
        : r));
      if (qChanged) toast('已自动标记为「待发布」（q 变化触发 demote）', 'warn');
      else toast('已保存修改', 'success');
    } else {
      const nextIdx = Math.max(0, ...rows.map(r => r.idx)) + 1;
      setRows(rs => [{ idx: nextIdx, q: fQ.trim(), a: fA.trim(), l1: fL1, l2: fL2, l3: fL3, scenario: fScene,
        status: '待发布', vectorized: false, updatedAt: '2026-06-16 10:30', updatedBy: '林婉清', hits: 0 }, ...rs]);
      toast('已新增 QA · 默认「待发布」，发布生产后实时生效', 'success');
    }
    setModalOpen(false);
  }

  // ─── 顶部分层条形 ECharts ──────────────────────────────────────────────────
  const layerBar = useMemo(() => () => ({
    ...baseOption(),
    tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const }, ...(baseOption().tooltip as object) },
    grid: { left: 8, right: 56, top: 8, bottom: 6, containLabel: true },
    xAxis: { type: 'value' as const, ...axisStyle(), axisLabel: { ...((axisStyle() as { axisLabel: object }).axisLabel), formatter: (v: number) => (v >= 1000 ? `${v / 1000}k` : String(v)) } },
    yAxis: { type: 'category' as const, inverse: true, data: KB_LAYERS.map(l => l.name), ...axisStyle(), splitLine: { show: false } },
    series: [{
      type: 'bar' as const, barWidth: 16,
      data: KB_LAYERS.map(l => ({ value: l.value, itemStyle: { color: cssVar(l.color), borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: 'right' as const, color: cssVar('--text-2'), fontSize: 11.5, fontWeight: 600, formatter: (p: { value: number }) => p.value.toLocaleString('zh-CN') },
      animationDuration: 900, animationDelay: (i: number) => i * 90,
    }],
  }), []);

  // ─── 详情命中柱图 ──────────────────────────────────────────────────────────
  const detailBar = useMemo(() => () => {
    const data = detail ? hits7d(detail.idx) : [];
    return {
      ...baseOption(),
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const }, ...(baseOption().tooltip as object) },
      grid: { left: 6, right: 10, top: 18, bottom: 4, containLabel: true },
      xAxis: { type: 'category' as const, data: data.map(d => d.d), ...axisStyle() },
      yAxis: { type: 'value' as const, ...axisStyle() },
      series: [{
        type: 'bar' as const, barWidth: '52%',
        data: data.map(d => d.v),
        itemStyle: { color: cssVar('--gold'), borderRadius: [4, 4, 0, 0] },
        animationDuration: 800, animationDelay: (i: number) => i * 50,
      }],
    };
  }, [detail]);

  // ─── 表格列 ────────────────────────────────────────────────────────────────
  const cols: Col<QAItem>[] = [
    {
      key: 'check', header: '', width: 34,
      render: (row) => (
        <input type="checkbox" checked={selected.has(row.idx)} onClick={e => e.stopPropagation()}
          onChange={e => setSelected(s => { const n = new Set(s); e.target.checked ? n.add(row.idx) : n.delete(row.idx); return n; })}
          style={{ accentColor: 'var(--gold)', cursor: 'pointer' }} />
      ),
    },
    { key: 'q', header: '标准问题', render: r => (
      <div className="row gap-2" style={{ minWidth: 0 }}>
        <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>{r.q}</span>
        {r.vectorized
          ? <Sparkles size={12} style={{ color: 'var(--gold)', opacity: 0.85, flexShrink: 0 }} />
          : <span className="badge" style={{ background: 'color-mix(in srgb, var(--warning) 14%, transparent)', color: 'var(--warning)', fontSize: 10 }}>待向量化</span>}
      </div>
    ) },
    { key: 'a', header: '标准回复', render: r => (
      <span className="text-2" style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{truncate(r.a, 34)}</span>
    ) },
    { key: 'scenario', header: '场景', render: r => <span className="tag">{r.scenario}</span> },
    { key: 'l1', header: '一级意图', render: r => (
      <span className="badge" style={{ background: 'var(--gold-glow)', color: 'var(--gold)', fontWeight: 600, fontSize: 11 }}>{r.l1}</span>
    ) },
    { key: 'l2', header: '二级意图', render: r => <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.l2}</span> },
    { key: 'l3', header: '三级意图', render: r => <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.l3}</span> },
    {
      key: 'hits', header: '命中', num: true, sortable: true, sortAccessor: r => r.hits ?? 0,
      render: r => <span className="tnum mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>{(r.hits ?? 0).toLocaleString('zh-CN')}</span>,
    },
    { key: 'status', header: '状态', render: r => <StatusBadge status={r.status} /> },
    {
      key: 'updatedAt', header: '更新时间', sortable: true, sortAccessor: r => r.updatedAt,
      render: r => <span className="tnum" style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.updatedAt}</span>,
    },
    {
      key: 'actions', header: '操作', nowrap: true,
      render: (row) => (
        <div className="row gap-1" onClick={e => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm" onClick={() => setDetail(row)}>详情</button>
          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(row)}>编辑</button>
          <button className="btn btn-ghost btn-sm" onClick={() => toggleLine(row)}>{row.status === '已下线' ? '上线' : '下线'}</button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="QA 知识库"
        subtitle="12,954 条 · 向量化驱动测试对话 RAG · 编辑发布实时生效"
        actions={
          <div className="row gap-2">
            <button className="btn btn-ghost" onClick={openNew}><Plus size={15} style={{ marginRight: 4 }} />新增 QA</button>
            <button
              className="btn btn-primary"
              disabled={selected.size === 0}
              style={selected.size === 0 ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
              onClick={publishProd}
            >
              <Send size={13} style={{ marginRight: 5 }} />发布生产
              {selected.size > 0 && (
                <span className="badge" style={{ marginLeft: 6, background: 'color-mix(in srgb, var(--bg-base) 30%, transparent)', color: 'inherit', fontSize: 11 }}>{selected.size}</span>
              )}
            </button>
            <div style={{ position: 'relative' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setMoreOpen(v => !v)}>更多<ChevronDown size={12} style={{ marginLeft: 3 }} /></button>
              {moreOpen && (
                <div
                  style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 200, background: 'var(--surface-1)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-md)', boxShadow: 'var(--elev-2)', minWidth: 156, padding: '6px 0' }}
                  onMouseLeave={() => setMoreOpen(false)}
                >
                  {[
                    { icon: <FileDown size={13} />, label: '模板下载' },
                    { icon: <Upload size={13} />, label: '批量导入' },
                    { icon: <Download size={13} />, label: '导出 CSV' },
                    { icon: <Shuffle size={13} />, label: '批量迁移意图' },
                  ].map(item => (
                    <button key={item.label} className="btn btn-ghost"
                      style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '8px 14px', fontSize: 13 }}
                      onClick={() => { setMoreOpen(false); toast(`${item.label} 功能开发中`, 'info'); }}>
                      {item.icon}<span style={{ marginLeft: 8 }}>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* 知识库分层签名图 */}
      <div className="card reveal" style={{ marginBottom: 16 }}>
        <SectionTitle right={<span className="row gap-1 t-small text-3"><BarChart3 size={13} style={{ color: 'var(--gold)' }} />四库总量 15,029 条 · 统一向量化检索</span>}>知识库分层规模</SectionTitle>
        <Chart build={layerBar} height={150} />
      </div>

      {/* 工具条 */}
      <Toolbar>
        <div className="input-wrap" style={{ flex: 1, maxWidth: 320 }}>
          <Search size={14} className="input-icon" />
          <input className="input" style={{ paddingLeft: 32 }} placeholder="搜索标准问题 / 回复 / 场景…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input" style={{ minWidth: 130 }} value={filterL1}
          onChange={e => { setFilterL1(e.target.value); setFilterL2(''); setPage(1); }}>
          <option value="">全部一级意图</option>
          {L1_LIST.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select className="input" style={{ minWidth: 130 }} value={filterL2} disabled={!filterL1}
          onChange={e => { setFilterL2(e.target.value); setPage(1); }}>
          <option value="">{filterL1 ? '全部二级意图' : '先选一级意图'}</option>
          {l2Of(filterL1).map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select className="input" style={{ minWidth: 110 }} value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value as KBStatus | ''); setPage(1); }}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || '全部状态'}</option>)}
        </select>
      </Toolbar>

      {/* 数据表卡片 */}
      <div className="card card-pad-0 reveal reveal-2">
        {/* 全选 + 计数行 */}
        <div className="row spread" style={{ padding: '10px 16px', borderBottom: '1px solid var(--hairline)' }}>
          <label className="row gap-2" style={{ cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} style={{ accentColor: 'var(--gold)', cursor: 'pointer' }} />
            <span className="text-3" style={{ fontSize: 12 }}>
              {selected.size > 0 ? `已选 ${selected.size} 条` : `本页全选 · 共 ${filtered.length.toLocaleString('zh-CN')} 条命中`}
            </span>
          </label>
          <label className="row gap-2" style={{ cursor: 'pointer', userSelect: 'none', fontSize: 12.5, color: batchMode ? 'var(--danger)' : 'var(--text-3)' }}>
            <input type="checkbox" checked={batchMode} onChange={e => setBatchMode(e.target.checked)} style={{ accentColor: 'var(--danger)', cursor: 'pointer' }} />
            批量删除模式
          </label>
        </div>

        <DataTable<QAItem>
          cols={cols}
          rows={paged}
          rowKey={r => String(r.idx)}
          onRow={r => setDetail(r)}
          rowClass={r => (r.status === '待发布' ? 'qa-row-pending' : '')}
          defaultSort={{ key: 'updatedAt', dir: 'desc' }}
          empty={{ title: '没有匹配的 QA', desc: '调整搜索或筛选条件，或点击「新增 QA」补充知识' }}
          dense
        />

        {/* 底部摘要 + 批量删除 + 分页 */}
        <div style={{ padding: '0 16px 8px' }}>
          <div className="row spread wrap gap-2" style={{ paddingTop: 8, borderTop: '1px solid var(--hairline)' }}>
            <div className="row gap-3 wrap">
              <span className="text-3 tnum" style={{ fontSize: 12 }}>
                {'共 '}<span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{rows.length}</span>{' 条'}
                {' · 已生效 '}<span style={{ color: 'var(--success)' }}>{counts.eff}</span>
                {' · 待发布 '}<span style={{ color: 'var(--warning)' }}>{counts.pend}</span>
                {' · 已下线 '}<span style={{ color: 'var(--text-3)' }}>{counts.off}</span>
              </span>
              {batchMode && selected.size > 0 && (
                <button className="btn btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', background: 'color-mix(in srgb, var(--danger) 10%, transparent)' }} onClick={batchDelete}>
                  <Trash2 size={12} style={{ marginRight: 4 }} />批量删除 ({selected.size})
                </button>
              )}
            </div>
            <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
          </div>
        </div>
      </div>

      {/* ─── 详情抽屉 ─── */}
      <Drawer
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? truncate(detail.q, 22) : ''}
        sub={detail ? `场景：${detail.scenario} · 更新 ${detail.updatedAt}` : ''}
        width={520}
        footer={detail && (
          <>
            <button className="btn btn-subtle" onClick={() => setDetail(null)}>关闭</button>
            <button className="btn btn-primary" onClick={() => { const d = detail; setDetail(null); openEdit(d); }}>
              <MessageSquareText size={13} style={{ marginRight: 5 }} />编辑此 QA
            </button>
          </>
        )}
      >
        {detail && (
          <div className="col gap-4">
            <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
              <StatusBadge status={detail.status} />
              <span className="badge" style={{ background: 'var(--gold-glow)', color: 'var(--gold)', fontWeight: 600 }}>{detail.l1}</span>
              <span className="text-3" style={{ fontSize: 12 }}>{detail.l1} › {detail.l2} › {detail.l3}</span>
            </div>

            <div>
              <div className="label" style={{ marginBottom: 6 }}>标准问题</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.6 }}>{detail.q}</div>
            </div>

            <div>
              <div className="label" style={{ marginBottom: 6 }}>标准回复</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.75, padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-md)' }}>{detail.a}</div>
            </div>

            <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="card" style={{ padding: '12px 14px' }}>
                <div className="label" style={{ marginBottom: 4 }}>累计命中</div>
                <div className="kpi-value" style={{ fontSize: 22 }}>{(detail.hits ?? 0).toLocaleString('zh-CN')}</div>
              </div>
              <div className="card" style={{ padding: '12px 14px' }}>
                <div className="label" style={{ marginBottom: 4 }}>向量化状态</div>
                <div className="row gap-2" style={{ marginTop: 4 }}>
                  {detail.vectorized
                    ? <span className="badge" style={{ background: 'color-mix(in srgb, var(--success) 14%, transparent)', color: 'var(--success)' }}><Sparkles size={11} style={{ marginRight: 3 }} />已向量化</span>
                    : <span className="badge" style={{ background: 'color-mix(in srgb, var(--warning) 14%, transparent)', color: 'var(--warning)' }}>待发布后生效</span>}
                </div>
              </div>
            </div>

            <div>
              <div className="row spread" style={{ marginBottom: 8 }}>
                <span className="label">近 7 日命中趋势</span>
                <span className="row gap-1 t-small text-3"><Clock size={12} />日维度</span>
              </div>
              <Chart build={detailBar} height={172} deps={[detail.idx]} />
            </div>

            <div>
              <div className="label" style={{ marginBottom: 8 }}>Top 用户问法</div>
              <div className="col gap-3">
                {topQueries(detail).map((t, i) => {
                  const max = topQueries(detail)[0].n || 1;
                  return (
                    <div key={i}>
                      <div className="row spread" style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{t.text}</span>
                        <span className="tnum text-3" style={{ fontSize: 12 }}>{t.n.toLocaleString('zh-CN')}</span>
                      </div>
                      <MeterBar pct={(t.n / max) * 100} color={i === 0 ? 'var(--gold)' : 'var(--c2)'} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* ─── 编辑 / 新增弹窗 ─── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? '编辑 QA' : '新增 QA'}
        sub={editing ? `当前状态：${editing.status} · 修改标准问题将自动 demote 至待发布` : '新条目默认「待发布」，发布生产后实时生效'}
        width={580}
        footer={
          <>
            <button className="btn btn-subtle" onClick={() => setModalOpen(false)}>取消</button>
            <button className="btn btn-primary" onClick={saveForm}>{editing ? '保存' : '创建'}</button>
          </>
        }
      >
        <div className="col gap-3">
          <Field label="标准问题 *" hint="用户问句，命中后返回对应标准回复">
            <input className="input" value={fQ} onChange={e => setFQ(e.target.value)} placeholder="例：怎么还款" />
          </Field>
          <Field label="标准回复 *" hint="小云口径，亲切自然、合规可信，可用颜文字增强亲和力">
            <textarea className="input" rows={4} value={fA} onChange={e => setFA(e.target.value)}
              placeholder="例：亲亲~还款可在「信用贷 APP-我的-还款」操作哦"
              style={{ resize: 'vertical', minHeight: 92 }} />
          </Field>
          <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <Field label="一级意图">
              <select className="input" value={fL1} onChange={e => { setFL1(e.target.value); setFL2(''); setFL3(''); }}>
                <option value="">请选择</option>
                {L1_LIST.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="二级意图">
              <select className="input" value={fL2} disabled={!fL1} onChange={e => { setFL2(e.target.value); setFL3(''); }}>
                <option value="">{fL1 ? '请选择' : '先选一级'}</option>
                {l2Of(fL1).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="三级意图">
              <select className="input" value={fL3} disabled={!fL2} onChange={e => setFL3(e.target.value)}>
                <option value="">{fL2 ? '请选择' : '先选二级'}</option>
                {l3Of(fL1, fL2).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
          </div>
          <Field label="问题场景" hint="用于场景聚合与 AB 版本归类">
            <input className="input" value={fScene} onChange={e => setFScene(e.target.value)} placeholder="例：日常还款 / 逾期催收 / 会员权益" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
