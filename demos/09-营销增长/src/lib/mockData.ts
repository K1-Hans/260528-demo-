// ════════════════════════════════════════════════════════════════════════
// AI 营销增长中台 · Mock 数据（全前端，无后端）
// 🔒 脱敏：品牌用通用名（焕颜/轻盐/森野优选/优品惠），无真实雇主/真实电商；用户 用户****。
// 行业锚定：电商/零售。大促日历 618/双11/年货节/38节；渠道 抖音/微信/小红书/搜索/信息流/KOL/私域。
// ════════════════════════════════════════════════════════════════════════

import type {
  Role, User, Alert, Channel, Campaign, Creative, Segment, AdGroup, HeatCell,
  SankeyNode, SankeyLink, FunnelStage, AttributionModel, Experiment, GateItem, Asset,
  SunburstNode, ChannelId,
} from '../types';

// ─── 角色 RBAC（4 角色 · 权限分权差异化）────────────────────────────────────
export const ROLES: Role[] = [
  {
    id: 'growth', name: '增长操盘手', enName: 'Growth Lead', color: '#D6336C',
    description: '统筹活动排期、人群与预算，对增长结果负责',
    landing: '/campaign',
    permissions: ['campaign:read', 'campaign:edit', 'studio:read', 'cdp:read', 'cdp:edit', 'ads:read', 'attribution:read', 'assets:read'],
  },
  {
    id: 'creative', name: '创意负责人', enName: 'Creative', color: '#7048E8',
    description: '多模态创意生成与品牌合规，产出投放素材',
    landing: '/studio',
    permissions: ['campaign:read', 'studio:read', 'studio:edit', 'assets:read'],
  },
  {
    id: 'media', name: '投放优化师', enName: 'Media Buyer', color: '#1098AD',
    description: '多平台预算分配、出价与实时调优，归因复盘',
    landing: '/ads',
    permissions: ['campaign:read', 'cdp:read', 'ads:read', 'ads:edit', 'attribution:read'],
  },
  {
    id: 'cmo', name: 'CMO', enName: 'CMO', color: '#2F9E44',
    description: '全局增长视角，只读总览所有模块',
    landing: '/campaign',
    permissions: ['campaign:read', 'studio:read', 'cdp:read', 'ads:read', 'attribution:read', 'assets:read'],
  },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: '罗芮', username: 'luorui', role: 'growth', dept: '增长中心', lastLogin: '今天 09:12', status: 'active', note: '增长操盘手' },
  { id: 'u2', name: '周野', username: 'zhouye', role: 'creative', dept: '品牌创意部', lastLogin: '今天 08:40', status: 'active', note: '创意负责人' },
  { id: 'u3', name: '高崎', username: 'gaoqi', role: 'media', dept: '效果投放组', lastLogin: '今天 09:30', status: 'active', note: '投放优化师' },
  { id: 'u4', name: '韦珩', username: 'weiheng', role: 'cmo', dept: '市场部', lastLogin: '昨天 21:05', status: 'active', note: 'CMO' },
  { id: 'u5', name: '林深', username: 'linshen', role: 'media', dept: '效果投放组', status: 'inactive', note: '已离职停用' },
];

// ─── 渠道（品牌点色 = chart palette）──────────────────────────────────────────
export const CHANNELS: Channel[] = [
  { id: 'douyin',  name: '抖音/巨量', colorVar: '--c1', spend: 268.4, roas: 4.2, impressions: 18420000, clicks: 552600, conv: 24800, ctr: 3.0, cvr: 4.5 },
  { id: 'rednote', name: '小红书',    colorVar: '--c2', spend: 142.6, roas: 3.6, impressions: 9260000,  clicks: 333400, conv: 13900, ctr: 3.6, cvr: 4.2 },
  { id: 'wechat',  name: '微信/朋友圈', colorVar: '--c4', spend: 186.2, roas: 3.1, impressions: 12100000, clicks: 290400, conv: 11200, ctr: 2.4, cvr: 3.9 },
  { id: 'search',  name: '搜索',      colorVar: '--c3', spend: 96.8,  roas: 5.4, impressions: 4120000,  clicks: 226600, conv: 16300, ctr: 5.5, cvr: 7.2 },
  { id: 'feed',    name: '信息流',    colorVar: '--c6', spend: 118.3, roas: 2.8, impressions: 15600000, clicks: 327600, conv: 9100,  ctr: 2.1, cvr: 2.8 },
  { id: 'kol',     name: 'KOL 达人',  colorVar: '--c5', spend: 88.5,  roas: 3.9, impressions: 7300000,  clicks: 197100, conv: 8600,  ctr: 2.7, cvr: 4.4 },
  { id: 'private', name: '私域',      colorVar: '--c7', spend: 22.4,  roas: 8.6, impressions: 1280000,  clicks: 102400, conv: 12800, ctr: 8.0, cvr: 12.5 },
];
export const CHANNEL_MAP: Record<ChannelId, Channel> = Object.fromEntries(CHANNELS.map(c => [c.id, c])) as Record<ChannelId, Channel>;

// ─── 活动排期（旗舰泳道 · 12 格 = 全年 12 月）──────────────────────────────────
const sp = (a: number, n = 12, amp = 0.5) => Array.from({ length: n }, (_, i) => +(a * (1 + Math.sin(i / 1.7) * 0.18 + (i % 3 - 1) * amp * 0.1)).toFixed(2));
export const CAMPAIGNS: Campaign[] = [
  {
    id: 'c1', name: '38 焕新季 · 焕颜美护', brand: '焕颜', objective: '拉新 + 大促', status: 'done',
    channels: ['douyin', 'rednote', 'wechat'], startCol: 1.6, endCol: 3.2,
    phases: [{ kind: 'pre', label: '预热', startCol: 1.6, endCol: 2.1 }, { kind: 'main', label: '38 正式', startCol: 2.1, endCol: 2.9 }, { kind: 'post', label: '返场', startCol: 2.9, endCol: 3.2 }],
    budget: 180, spent: 176.4, roas: 4.1, roasTarget: 3.5, progress: 100, conv: 28400, owner: '罗芮', trend: sp(4.1),
  },
  {
    id: 'c2', name: '618 超级品类日 · 全站', brand: '优品惠', objective: '大促 GMV', status: 'live',
    channels: ['douyin', 'search', 'feed', 'kol', 'private'], startCol: 4.4, endCol: 6.3,
    phases: [{ kind: 'pre', label: '蓄水预热', startCol: 4.4, endCol: 5.3 }, { kind: 'main', label: '618 爆发', startCol: 5.3, endCol: 6.0 }, { kind: 'post', label: '返场', startCol: 6.0, endCol: 6.3 }],
    budget: 420, spent: 268.6, roas: 3.8, roasTarget: 3.6, progress: 64, conv: 51200, owner: '罗芮', trend: sp(3.8),
  },
  {
    id: 'c3', name: '夏日轻盐 · 零食尝鲜', brand: '轻盐', objective: '新品拉新', status: 'live',
    channels: ['rednote', 'kol', 'douyin'], startCol: 6.0, endCol: 8.4,
    phases: [{ kind: 'pre', label: '种草', startCol: 6.0, endCol: 7.0 }, { kind: 'main', label: '上新爆发', startCol: 7.0, endCol: 8.0 }, { kind: 'post', label: '复购', startCol: 8.0, endCol: 8.4 }],
    budget: 150, spent: 62.3, roas: 3.4, roasTarget: 3.2, progress: 41, conv: 13900, owner: '周野', trend: sp(3.4),
  },
  {
    id: 'c4', name: '森野优选 · 户外焕季', brand: '森野优选', objective: '品牌 + 复购', status: 'review',
    channels: ['wechat', 'search', 'private'], startCol: 8.2, endCol: 9.6,
    phases: [{ kind: 'pre', label: '预热', startCol: 8.2, endCol: 8.8 }, { kind: 'main', label: '上新', startCol: 8.8, endCol: 9.4 }, { kind: 'post', label: '返场', startCol: 9.4, endCol: 9.6 }],
    budget: 120, spent: 0, roas: 0, roasTarget: 3.3, progress: 0, conv: 0, owner: '高崎', trend: sp(3.3),
  },
  {
    id: 'c5', name: '双 11 超级大促 · 全品牌', brand: '全站', objective: '年度峰值 GMV', status: 'draft',
    channels: ['douyin', 'rednote', 'wechat', 'search', 'feed', 'kol', 'private'], startCol: 9.4, endCol: 11.4,
    phases: [{ kind: 'pre', label: '超长预售', startCol: 9.4, endCol: 10.6 }, { kind: 'main', label: '双 11', startCol: 10.6, endCol: 11.1 }, { kind: 'post', label: '返场', startCol: 11.1, endCol: 11.4 }],
    budget: 680, spent: 0, roas: 0, roasTarget: 3.9, progress: 0, conv: 0, owner: '罗芮', trend: sp(3.9),
  },
  {
    id: 'c6', name: '年货节 · 囤货狂欢', brand: '优品惠', objective: '大促 + 复购', status: 'draft',
    channels: ['wechat', 'private', 'douyin'], startCol: 11.2, endCol: 12,
    phases: [{ kind: 'pre', label: '预热', startCol: 11.2, endCol: 11.6 }, { kind: 'main', label: '年货节', startCol: 11.6, endCol: 12 }],
    budget: 240, spent: 0, roas: 0, roasTarget: 3.7, progress: 0, conv: 0, owner: '罗芮', trend: sp(3.7),
  },
];
export const CAMPAIGN_MONTHS = ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月', '11 月', '12 月'];

// 旗舰页 KPI 带
export const CAMPAIGN_KPIS = [
  { label: '在投活动', raw: 2, unit: '个', change: 0, spark: [1, 1, 2, 2, 2, 3, 2] },
  { label: '本月投放花费', raw: 393.3, unit: '万', change: 12.4, decimals: 1, spark: sp(393, 7) },
  { label: '综合 ROAS', raw: 3.8, unit: '', change: 5.6, decimals: 1, spark: sp(3.8, 7) },
  { label: '转化数', raw: 93500, unit: '', change: 18.2, spark: sp(93500, 7) },
];

// ─── 创意工坊（多模态素材 + 品牌合规 · picsum 安全占位）──────────────────────────
const pic = (seed: string, w = 480, h = 360) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
export const CREATIVES: Creative[] = [
  { id: 'cr1', title: '焕颜精华·夏日水光', type: 'image', thumb: pic('huan1'), channel: 'rednote', campaign: '618 超级品类日', genBy: 'ai', model: '焕影 V3', compliance: 'pass', ctr: 4.2, impressions: 862000, ratio: 'sq' },
  { id: 'cr2', title: '618 全站直降 KV', type: 'banner', thumb: pic('kv618', 640, 360), channel: 'douyin', campaign: '618 超级品类日', genBy: 'ai', model: '焕影 V3', compliance: 'pass', ctr: 3.1, impressions: 1240000, ratio: 'wide' },
  { id: 'cr3', title: '轻盐零食·开袋视频', type: 'video', thumb: pic('snack1'), channel: 'douyin', campaign: '夏日轻盐', genBy: 'human', compliance: 'pass', ctr: 5.4, impressions: 530000, ratio: 'wide' },
  { id: 'cr4', title: '极限低价·仅此一天', type: 'copy', thumb: pic('copy1'), channel: 'feed', campaign: '618 超级品类日', genBy: 'ai', model: '文案助手', compliance: 'block', complianceNote: '含「极限/仅此一天」绝对化用语，违反广告法', ratio: 'sq' },
  { id: 'cr5', title: '森野冲锋衣·场景图', type: 'image', thumb: pic('out1'), channel: 'wechat', campaign: '森野优选', genBy: 'ai', model: '焕影 V3', compliance: 'warn', complianceNote: '人物肖像授权待确认', ctr: 2.8, impressions: 220000, ratio: 'sq' },
  { id: 'cr6', title: '私域专享·会员礼遇', type: 'banner', thumb: pic('vip1', 640, 360), channel: 'private', campaign: '618 超级品类日', genBy: 'human', compliance: 'pass', ctr: 8.1, impressions: 96000, ratio: 'wide' },
  { id: 'cr7', title: '焕颜面膜·KOL 共创', type: 'image', thumb: pic('huan2'), channel: 'kol', campaign: '38 焕新季', genBy: 'ai', model: '焕影 V3', compliance: 'pass', ctr: 3.9, impressions: 410000, ratio: 'sq' },
  { id: 'cr8', title: '夏日轻盐·小红书种草', type: 'image', thumb: pic('snack2'), channel: 'rednote', campaign: '夏日轻盐', genBy: 'ai', model: '焕影 V3', compliance: 'pass', ctr: 4.6, impressions: 318000, ratio: 'sq' },
  { id: 'cr9', title: '户外焕季·场景短片', type: 'video', thumb: pic('out2'), channel: 'douyin', campaign: '森野优选', genBy: 'ai', model: '焕影动效', compliance: 'warn', complianceNote: '背景音乐版权核验中', ratio: 'wide' },
  { id: 'cr10', title: '618 搜索·关键词图', type: 'banner', thumb: pic('kv618b', 640, 360), channel: 'search', campaign: '618 超级品类日', genBy: 'ai', model: '焕影 V3', compliance: 'pass', ctr: 5.2, impressions: 470000, ratio: 'wide' },
  { id: 'cr11', title: '会员日·复购召回', type: 'copy', thumb: pic('copy2'), channel: 'private', campaign: '618 超级品类日', genBy: 'ai', model: '文案助手', compliance: 'pass', ctr: 7.3, impressions: 64000, ratio: 'sq' },
  { id: 'cr12', title: '轻盐新口味·横版主图', type: 'image', thumb: pic('snack3', 640, 360), channel: 'feed', campaign: '夏日轻盐', genBy: 'ai', model: '焕影 V3', compliance: 'pass', ctr: 2.9, impressions: 280000, ratio: 'wide' },
];
export const STUDIO_KPIS = [
  { label: '本月生成素材', raw: 1284, unit: '件', change: 42.0, spark: sp(1284, 7) },
  { label: 'AI 生成占比', raw: 78, unit: '%', change: 11.0, decimals: 0, spark: sp(78, 7) },
  { label: '合规通过率', raw: 91.5, unit: '%', change: 2.4, decimals: 1, spark: sp(91, 7) },
  { label: '待复核', raw: 18, unit: '件', change: -22.0, spark: sp(18, 7) },
];

// ─── CDP 人群圈选（结构化条件 · 旭日分布）──────────────────────────────────────
export const SEGMENTS: Segment[] = [
  {
    id: 's1', name: '高潜复购·美护人群', desc: '近 90 天购买美护 + 高活跃 + 未来 30 天有复购倾向', size: 1_840_000, source: 'CDP 实时', updatedAt: '2 小时前', reach: 86, pinned: true,
    rules: [
      { id: 'r1', field: '一级类目', op: '=', value: '美妆个护' },
      { id: 'r2', field: '近 90 天订单数', op: '>', value: '2', conj: 'AND' },
      { id: 'r3', field: '活跃分层', op: '∈', value: '高活跃 / 中高活跃', conj: 'AND' },
      { id: 'r4', field: '复购预测分', op: '>', value: '0.6', conj: 'AND' },
    ],
  },
  {
    id: 's2', name: '价格敏感·促销响应型', desc: '历史仅大促下单 + 优惠券核销率高', size: 3_260_000, source: 'CDP 实时', updatedAt: '今天 08:10', reach: 92,
    rules: [
      { id: 'r1', field: '下单时段', op: '∈', value: '大促期间' },
      { id: 'r2', field: '优惠券核销率', op: '>', value: '40%', conj: 'AND' },
    ],
  },
  {
    id: 's3', name: '新客 Lookalike·种子扩展', desc: '基于私域高价值客户的相似人群扩展', size: 5_120_000, source: 'Lookalike', updatedAt: '昨天 19:40', reach: 71,
    rules: [
      { id: 'r1', field: '种子人群', op: '=', value: '私域高价值客户' },
      { id: 'r2', field: '相似度', op: '>', value: 'Top 8%', conj: 'AND' },
    ],
  },
  {
    id: 's4', name: '流失召回·沉睡 180 天', desc: '180 天未下单 + 历史中高价值，召回窗口', size: 920_000, source: 'CDP 实时', updatedAt: '今天 07:30', reach: 64,
    rules: [
      { id: 'r1', field: '最近购买距今', op: '>', value: '180 天' },
      { id: 'r2', field: '历史 LTV 分层', op: '∈', value: '中 / 高', conj: 'AND' },
    ],
  },
];
export const SEGMENT_SUNBURST: SunburstNode = {
  name: '全量用户', children: [
    { name: '美妆个护', colorVar: '--c1', children: [{ name: '高潜复购', value: 184 }, { name: '价格敏感', value: 142 }, { name: '新客', value: 96 }] },
    { name: '食品零食', colorVar: '--c2', children: [{ name: '尝鲜', value: 128 }, { name: '囤货', value: 88 }, { name: '复购', value: 74 }] },
    { name: '户外运动', colorVar: '--c4', children: [{ name: '专业', value: 62 }, { name: '入门', value: 91 }] },
    { name: '私域会员', colorVar: '--c7', children: [{ name: '高价值', value: 48 }, { name: '活跃', value: 86 }] },
  ],
};
export const CDP_KPIS = [
  { label: '可用人群包', raw: 42, unit: '个', change: 6.0, spark: sp(42, 7) },
  { label: '可触达用户', raw: 1128, unit: '万', change: 8.4, decimals: 0, spark: sp(1128, 7) },
  { label: '平均可触达率', raw: 78.2, unit: '%', change: 3.1, decimals: 1, spark: sp(78, 7) },
  { label: '今日同步', raw: 36, unit: '次', change: 0, spark: sp(36, 7) },
];

// ─── 投放控制台（预算分配 + 调优 + 热力）────────────────────────────────────────
export const AD_GROUPS: AdGroup[] = [
  { id: 'a1', name: '618-抖音-高潜复购', channel: 'douyin', campaign: '618 超级品类日', status: 'live', budget: 60, spent: 41.2, roas: 4.5, cpa: 38, conv: 8200, bidStrategy: '最大转化', suggestion: 'ROAS 超目标 18%，建议提预算 +20%' },
  { id: 'a2', name: '618-搜索-品牌词', channel: 'search', campaign: '618 超级品类日', status: 'live', budget: 28, spent: 22.6, roas: 5.8, cpa: 26, conv: 6300, bidStrategy: '目标 ROAS', suggestion: '转化稳定，维持出价' },
  { id: 'a3', name: '618-信息流-Lookalike', channel: 'feed', campaign: '618 超级品类日', status: 'learning', budget: 35, spent: 12.4, roas: 2.4, cpa: 72, conv: 1700, bidStrategy: '最大转化', suggestion: '学习期，CPA 偏高，观察 24h' },
  { id: 'a4', name: '618-KOL-达人混投', channel: 'kol', campaign: '618 超级品类日', status: 'live', budget: 30, spent: 24.8, roas: 3.9, cpa: 44, conv: 5600, bidStrategy: '手动出价', suggestion: '头部达人 ROI 高于尾部，建议集中' },
  { id: 'a5', name: '618-私域-会员召回', channel: 'private', campaign: '618 超级品类日', status: 'live', budget: 8, spent: 6.1, roas: 8.9, cpa: 12, conv: 5100, bidStrategy: '免费触达', suggestion: '私域 ROI 最高，建议扩容人群' },
  { id: 'a6', name: '轻盐-小红书-种草', channel: 'rednote', campaign: '夏日轻盐', status: 'live', budget: 22, spent: 9.8, roas: 3.6, cpa: 52, conv: 2400, bidStrategy: '最大转化', suggestion: '种草期，关注互动率' },
  { id: 'a7', name: '轻盐-信息流-尝鲜', channel: 'feed', campaign: '夏日轻盐', status: 'paused', budget: 18, spent: 7.2, roas: 1.9, cpa: 96, conv: 800, bidStrategy: '最大转化', suggestion: 'ROAS 低于阈值，已暂停待优化素材' },
];
// 投放热力矩阵：渠道 × 时段（转化指数 0-100）
export const HEAT_HOURS = ['0-3', '3-6', '6-9', '9-12', '12-15', '15-18', '18-21', '21-24'];
export const HEAT_CHANNELS = ['抖音', '小红书', '微信', '搜索', '信息流', '私域'];
export const HEAT_CELLS: HeatCell[] = (() => {
  const base: Record<string, number[]> = {
    '抖音': [22, 14, 40, 58, 64, 70, 96, 88], '小红书': [30, 18, 44, 52, 60, 66, 90, 94],
    '微信': [16, 10, 36, 62, 58, 64, 82, 76], '搜索': [20, 16, 54, 78, 72, 70, 80, 60],
    '信息流': [26, 20, 42, 50, 56, 62, 74, 70], '私域': [18, 12, 48, 56, 52, 58, 86, 92],
  };
  const cells: HeatCell[] = [];
  HEAT_CHANNELS.forEach(ch => HEAT_HOURS.forEach((h, i) => cells.push({ channel: ch, hour: h, value: base[ch][i] })));
  return cells;
})();
export const ADS_KPIS = [
  { label: '在投广告组', raw: 6, unit: '个', change: 0, spark: sp(6, 7) },
  { label: '今日消耗', raw: 124.1, unit: '万', change: 9.2, decimals: 1, spark: sp(124, 7) },
  { label: '平均 CPA', raw: 41, unit: '元', change: -6.8, spark: sp(41, 7) },
  { label: 'AI 调优建议', raw: 7, unit: '条', change: 16.0, spark: sp(7, 7) },
];

// ─── 归因 ROI（多触点桑基 + 漏斗 + 模型对比）────────────────────────────────────
export const ATTRIBUTION_MODELS: AttributionModel[] = [
  { id: 'm1', name: '末次互动', desc: '全部归功最后一个触点（默认 / 高估直效渠道）' },
  { id: 'm2', name: '首次互动', desc: '全部归功第一个触点（高估种草渠道）' },
  { id: 'm3', name: '线性', desc: '所有触点均分功劳' },
  { id: 'm4', name: '时间衰减', desc: '越近触点功劳越大' },
  { id: 'm5', name: '数据驱动 (DDA)', desc: 'Shapley 值算法，按真实贡献分配（推荐）' },
];
export const SANKEY_NODES: SankeyNode[] = [
  { name: '小红书种草', colorVar: '--c2' }, { name: '抖音曝光', colorVar: '--c1' }, { name: 'KOL 推荐', colorVar: '--c5' },
  { name: '信息流触达', colorVar: '--c6' }, { name: '搜索点击', colorVar: '--c3' }, { name: '私域召回', colorVar: '--c7' },
  { name: '加购', colorVar: '--c4' }, { name: '首单转化', colorVar: '--gold' }, { name: '复购', colorVar: '--emerald' },
];
export const SANKEY_LINKS: SankeyLink[] = [
  { source: '小红书种草', target: '搜索点击', value: 32 }, { source: '小红书种草', target: '加购', value: 18 },
  { source: '抖音曝光', target: '加购', value: 40 }, { source: '抖音曝光', target: '搜索点击', value: 24 },
  { source: 'KOL 推荐', target: '加购', value: 16 }, { source: 'KOL 推荐', target: '搜索点击', value: 12 },
  { source: '信息流触达', target: '加购', value: 22 }, { source: '搜索点击', target: '加购', value: 46 },
  { source: '加购', target: '首单转化', value: 98 }, { source: '私域召回', target: '复购', value: 38 },
  { source: '首单转化', target: '复购', value: 44 },
];
export const FUNNEL_STAGES: FunnelStage[] = [
  { name: '曝光', value: 6820000 }, { name: '点击', value: 1924000 }, { name: '访问商详', value: 842000 },
  { name: '加购', value: 286000 }, { name: '下单', value: 132000 }, { name: '支付', value: 118400 },
];
export const ATTR_CHANNEL_COMPARE = [
  { channel: '抖音', lastClick: 38, dda: 26 }, { channel: '小红书', lastClick: 8, dda: 22 },
  { channel: '搜索', lastClick: 28, dda: 18 }, { channel: 'KOL', lastClick: 6, dda: 14 },
  { channel: '信息流', lastClick: 12, dda: 9 }, { channel: '私域', lastClick: 8, dda: 11 },
];
export const EXPERIMENTS: Experiment[] = [
  { id: 'e1', name: '618 主图 A/B · 直降 vs 满减', metric: '点击率 CTR', status: 'done', lift: 14.2, confidence: 98, winner: '直降版', variants: [{ name: '直降版', cvr: 4.8, sample: 124000 }, { name: '满减版', cvr: 4.2, sample: 122000, isControl: true }] },
  { id: 'e2', name: '落地页 · 短表单 vs 长表单', metric: '转化率 CVR', status: 'running', lift: 6.1, confidence: 82, variants: [{ name: '短表单', cvr: 3.9, sample: 38000 }, { name: '长表单', cvr: 3.7, sample: 37500, isControl: true }] },
  { id: 'e3', name: '私域召回文案 · 利益点 vs 情感', metric: '回流率', status: 'running', lift: 9.4, confidence: 76, variants: [{ name: '利益点', cvr: 7.6, sample: 21000 }, { name: '情感向', cvr: 6.9, sample: 20800, isControl: true }] },
];
export const ATTR_KPIS = [
  { label: '归因 GMV', raw: 4286, unit: '万', change: 16.8, decimals: 0, spark: sp(4286, 7) },
  { label: '综合 ROAS', raw: 3.8, unit: '', change: 5.6, decimals: 1, spark: sp(3.8, 7) },
  { label: '获客成本 CAC', raw: 58, unit: '元', change: -7.2, spark: sp(58, 7) },
  { label: '进行中实验', raw: 2, unit: '个', change: 0, spark: sp(2, 7) },
];

// ─── 人审卡点（linear 审批队列 · "90% 用 agent 仅 23% 生产化"的成熟卡点）──────────
export const GATE_ITEMS: GateItem[] = [
  { id: 'g1', title: '「极限低价·仅此一天」文案', kind: '创意合规', agent: '文案生成 Agent', status: 'blocked', risk: 'high', detail: '含绝对化用语，违反广告法第九条，已自动驳回并留痕', reviewer: '周野', at: '14:32' },
  { id: 'g2', title: '618-抖音组预算 +20%（48→72 万）', kind: '预算变更', agent: '投放调优 Agent', status: 'pending', risk: 'mid', detail: 'ROAS 超目标 18%，Agent 建议加预算，超 50 万阈值需人工确认', at: '14:10' },
  { id: 'g3', title: '高潜复购人群授权投放', kind: '人群授权', agent: '人群圈选 Agent', status: 'approved', risk: 'low', detail: '人群含敏感标签，已确认合规授权范围', reviewer: '罗芮', at: '11:48' },
  { id: 'g4', title: '森野场景图人物肖像授权', kind: '创意合规', agent: '创意生成 Agent', status: 'pending', risk: 'high', detail: 'AI 生成含人物肖像，需确认肖像权授权后方可投放', at: '10:25' },
  { id: 'g5', title: '信息流组自动暂停（ROAS<阈值）', kind: '自动调优', agent: '投放调优 Agent', status: 'approved', risk: 'low', detail: 'ROAS 1.9 低于阈值 2.5，Agent 自动暂停，人工已复核', reviewer: '高崎', at: '09:12' },
];

// ─── 资产库 ────────────────────────────────────────────────────────────────────
export const ASSETS: Asset[] = [
  { id: 'as1', name: '焕颜品牌主 KV·夏季', kind: 'image', thumb: pic('asset1'), tags: ['焕颜', 'KV', '夏季'], usage: 42, size: '3.2 MB', updatedAt: '2 天前', compliance: 'pass' },
  { id: 'as2', name: '618 大促模板·横版', kind: 'template', thumb: pic('asset2', 640, 360), tags: ['618', '模板', '横版'], usage: 88, size: '1.1 MB', updatedAt: '5 天前', compliance: 'pass' },
  { id: 'as3', name: '轻盐产品短视频·15s', kind: 'video', thumb: pic('asset3'), tags: ['轻盐', '短视频'], usage: 26, size: '18.4 MB', updatedAt: '1 天前', compliance: 'pass' },
  { id: 'as4', name: '优品惠 Logo·全套', kind: 'logo', thumb: pic('asset4'), tags: ['优品惠', 'Logo', 'VI'], usage: 156, size: '0.8 MB', updatedAt: '12 天前', compliance: 'pass' },
  { id: 'as5', name: '私域会员权益文案库', kind: 'copy', thumb: pic('asset5'), tags: ['私域', '会员', '文案'], usage: 64, size: '64 KB', updatedAt: '3 天前', compliance: 'pass' },
  { id: 'as6', name: '森野户外场景图组', kind: 'image', thumb: pic('asset6', 640, 360), tags: ['森野', '户外', '场景'], usage: 19, size: '5.6 MB', updatedAt: '今天', compliance: 'warn' },
  { id: 'as7', name: '38 节促销贴纸包', kind: 'template', thumb: pic('asset7'), tags: ['38节', '贴纸'], usage: 33, size: '2.4 MB', updatedAt: '20 天前', compliance: 'pass' },
  { id: 'as8', name: 'KOL 共创素材·焕颜', kind: 'video', thumb: pic('asset8'), tags: ['KOL', '焕颜', '共创'], usage: 11, size: '32.1 MB', updatedAt: '4 天前', compliance: 'pass' },
];
export const ASSET_KPIS = [
  { label: '资产总数', raw: 2840, unit: '件', change: 8.0, spark: sp(2840, 7) },
  { label: '本月复用', raw: 1126, unit: '次', change: 22.0, spark: sp(1126, 7) },
  { label: '复用率', raw: 64.2, unit: '%', change: 5.4, decimals: 1, spark: sp(64, 7) },
  { label: '待清理', raw: 42, unit: '件', change: -12.0, spark: sp(42, 7) },
];

// ─── 通知 ────────────────────────────────────────────────────────────────────
export const ALERTS: Alert[] = [
  { level: 'danger', title: '创意驳回', msg: '「极限低价·仅此一天」含绝对化用语，已自动拦截', tag: '合规', time: '14:32' },
  { level: 'warn', title: '预算审批待处理', msg: '618-抖音组建议加预算 +20%，超阈值需确认', tag: '投放', time: '14:10' },
  { level: 'warn', title: '广告组暂停', msg: '轻盐-信息流-尝鲜 ROAS 1.9 低于阈值，已暂停', tag: '调优', time: '13:48' },
  { level: 'info', title: '人群同步完成', msg: '高潜复购·美护人群已同步至抖音/巨量', tag: 'CDP', time: '12:20' },
  { level: 'info', title: '实验出结果', msg: '618 主图 A/B 直降版胜出，CTR +14.2%（置信 98%）', tag: '实验', time: '10:05' },
];
