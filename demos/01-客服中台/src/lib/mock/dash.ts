// 运营总览 / 数据看板 / Token 用量 — mock 数据（真实 KPI 是灵魂，禁占位）
import type { Kpi, TrendPoint, DualTrendPoint, PipelineHealth, IntentTopRow, FlywheelNode, AgentTokenDist, TokenTrendPoint } from '../../types';

// ── 旗舰总览：6 大战绩 KPI（change = 较基线增量；坐席/月省无基线）──
export const HERO: Kpi[] = [
  { label: '自助解决率', raw: 85.23, unit: '%', change: 15.12, decimals: 2, tone: 'good', spark: [70.1, 73.4, 76.2, 79.1, 81.6, 83.4, 84.5, 85.23] },
  { label: '首次解决率', raw: 70.58, unit: '%', change: 6.31, decimals: 2, tone: 'good', spark: [64.3, 65.6, 66.8, 67.9, 68.7, 69.5, 70.1, 70.58] },
  { label: '转人工率', raw: 14.77, unit: '%', change: -15.12, decimals: 2, tone: 'good', spark: [29.9, 27.1, 23.9, 21.0, 18.2, 16.1, 15.3, 14.77] },
  { label: '系统服务占比', raw: 90.11, unit: '%', change: 0, decimals: 2, tone: 'good', spark: [82, 84, 86, 87, 88, 89, 89.6, 90.11] },
  { label: '在线坐席', raw: 28, unit: '人', change: -172, decimals: 0, tone: 'good', spark: [200, 160, 120, 86, 60, 42, 33, 28] },
  { label: '月省人力', raw: 200, unit: '万', change: 0, decimals: 0, tone: 'good', spark: [40, 72, 104, 132, 158, 178, 192, 200] },
];

// ── 数据看板：znkf 真实日运营指标（昨日 · 日环比 dod · 周环比 wow）──
export const DASH_KPIS: Kpi[] = [
  { label: '昨日会话量', raw: 1284, unit: '通', change: 12.8, weekChange: 9.6, decimals: 0, tone: 'good', spark: [980, 1040, 1120, 1080, 1160, 1210, 1240, 1284] },
  { label: '点踩率（昨日）', raw: 3.2, unit: '%', change: -0.9, weekChange: -1.4, decimals: 1, tone: 'good', spark: [4.8, 4.5, 4.1, 3.9, 3.7, 3.5, 3.3, 3.2] },
  { label: '转人工率', raw: 8.7, unit: '%', change: 0.8, weekChange: -2.1, decimals: 1, tone: 'bad', spark: [10.2, 9.8, 9.4, 9.1, 8.6, 8.2, 8.0, 8.7] },
  { label: '拒识率', raw: 12.4, unit: '%', change: -2.4, weekChange: -1.1, decimals: 1, tone: 'good', spark: [16.8, 15.9, 15.1, 14.3, 13.6, 13.0, 12.7, 12.4] },
];

// ── 当日自助 vs 转人工（小时级，堆叠面积）──
export const SELF_TRANSFER_TODAY: TrendPoint[] = [
  { date: '08:00', selfService: 42, transfer: 6 }, { date: '09:00', selfService: 118, transfer: 14 },
  { date: '10:00', selfService: 156, transfer: 19 }, { date: '11:00', selfService: 142, transfer: 17 },
  { date: '12:00', selfService: 88, transfer: 11 }, { date: '13:00', selfService: 96, transfer: 12 },
  { date: '14:00', selfService: 168, transfer: 22 }, { date: '15:00', selfService: 174, transfer: 21 },
  { date: '16:00', selfService: 161, transfer: 18 }, { date: '17:00', selfService: 133, transfer: 15 },
  { date: '18:00', selfService: 79, transfer: 9 }, { date: '19:00', selfService: 51, transfer: 7 },
];

// ── 6 月双率趋势（自助率越过 80.1 目标线，转人工率下行）──
export const DUAL_TREND_6M: DualTrendPoint[] = [
  { date: '1月', selfRate: 72.4, transferRate: 27.1 }, { date: '2月', selfRate: 75.8, transferRate: 23.9 },
  { date: '3月', selfRate: 78.6, transferRate: 21.0 }, { date: '4月', selfRate: 81.3, transferRate: 18.2 },
  { date: '5月', selfRate: 83.9, transferRate: 16.1 }, { date: '6月', selfRate: 85.23, transferRate: 14.77 },
];
export const TARGET_SELF_RATE = 80.1;

// ── Pipeline 健康度（A1–A4 成功率 + 平均耗时）──
export const PIPE_HEALTH: PipelineHealth[] = [
  { stage: '敏感词拦截', code: 'A1', success: 99.8, avgMs: 8 },
  { stage: '意图 / 情绪', code: 'A2', success: 97.2, avgMs: 320 },
  { stage: 'RAG 检索', code: 'A3', success: 96.5, avgMs: 180 },
  { stage: '合规质检', code: 'A4', success: 99.1, avgMs: 45 },
];

// ── 触发意图 TOP10 ──
export const INTENT_TOP10: IntentTopRow[] = [
  { rank: 1, l1: '产品与信息', l2: '产品咨询', l3: '信用贷是什么', count: 429 },
  { rank: 2, l1: '还款相关', l2: '还款咨询', l3: '怎么还款', count: 303 },
  { rank: 3, l1: '自定义', l2: '无效会话', l3: '—', count: 213 },
  { rank: 4, l1: '催收相关', l2: '投诉催收', l3: '投诉建议', count: 101 },
  { rank: 5, l1: '信息维护', l2: '换绑卡', l3: '账户操作', count: 91 },
  { rank: 6, l1: '业务办理', l2: '结清证明', l3: '开具结清证明', count: 47 },
  { rank: 7, l1: '申请咨询', l2: '额度获取咨询', l3: '额度查询', count: 38 },
  { rank: 8, l1: '费用相关', l2: '费用咨询', l3: '提前结清手续费', count: 31 },
  { rank: 9, l1: '营销活动', l2: '会员咨询', l3: '会员退费', count: 19 },
  { rank: 10, l1: '还款相关', l2: '提前清贷', l3: '如何提前清贷', count: 15 },
];

// ── 数据飞轮闭环（签名视觉 · 300→2万）──
export const FLYWHEEL: FlywheelNode[] = [
  { key: 'desens', label: '脱敏会话', value: '12,954 / 日' },
  { key: 'clean', label: '大模型清洗', value: '替代人工标注' },
  { key: 'cases', label: '自动生成测试用例', value: '300+ / 批' },
  { key: 'badcase', label: 'Badcase 闭环', value: '85% 自动判' },
  { key: 'expand', label: 'QA 库扩容', value: '300 → 2 万' },
];

// ── Token 用量 ──
export const TOKEN_SUMMARY = {
  todayTotal: 1_284_600, todayChange: 6.4,
  monthTotal: 38_640_200, monthCost: 421.7, avgPerChat: 982,
};
export const TOKEN_AGENT_DIST: AgentTokenDist[] = [
  { agent: 'A3 QA 生成', tokens: 15_840_000, pct: 41 },
  { agent: 'A2 意图判别', tokens: 10_820_000, pct: 28 },
  { agent: 'A3 QA 流式', tokens: 4_637_000, pct: 12 },
  { agent: 'Embedding 检索', tokens: 3_091_000, pct: 8 },
  { agent: '安抚 Agent', tokens: 2_318_000, pct: 6 },
  { agent: '意图分类 L3', tokens: 1_159_000, pct: 3 },
  { agent: '其他', tokens: 775_200, pct: 2 },
];
export const TOKEN_TREND: TokenTrendPoint[] = [
  { date: '06-10', tokens: 1_120_000, cost: 12.2 }, { date: '06-11', tokens: 1_205_000, cost: 13.1 },
  { date: '06-12', tokens: 1_318_000, cost: 14.4 }, { date: '06-13', tokens: 1_086_000, cost: 11.8 },
  { date: '06-14', tokens: 1_152_000, cost: 12.6 }, { date: '06-15', tokens: 1_271_000, cost: 13.9 },
  { date: '06-16', tokens: 1_284_600, cost: 14.0 },
];
