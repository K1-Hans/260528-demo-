import type {
  Role, User, Permission, Metric, FunnelStage, ModelProgress, RegionPerf, Alert, TrendPoint,
  GoalRow, OpsAction, MarketView, CompetitorModel, CompetitorStore, SubsidyPolicy,
  VocPost, VocTopic, VocTranscript, KnowledgeDoc, ProjectTask,
} from '../types';

// ─── Permissions & Roles ──────────────────────────────────────────────────
export const ALL_PERMISSIONS: Permission[] = [
  { key: 'strategy:read', label: '策略查看', category: 'page', desc: '查看策略文档与分析报告' },
  { key: 'strategy:write', label: '策略编辑', category: 'action', desc: '新建/修改/删除策略内容' },
  { key: 'data:read', label: '数据查看', category: 'page', desc: '查看指标平台数据' },
  { key: 'data:export', label: '数据导出', category: 'action', desc: '导出数据为 Excel/CSV' },
  { key: 'competitor:read', label: '竞品查看', category: 'page', desc: '查看竞品销量/价格/门店' },
  { key: 'competitor:write', label: '竞品编辑', category: 'action', desc: '编辑竞品数据' },
  { key: 'subsidy:read', label: '补贴查看', category: 'page', desc: '查看各地补贴政策' },
  { key: 'subsidy:write', label: '补贴编辑', category: 'action', desc: '录入/更新补贴政策' },
  { key: 'voc:read', label: '用户声音查看', category: 'page', desc: '查看舆情与试驾录音分析' },
  { key: 'voc:write', label: '用户声音处理', category: 'action', desc: '标注/分派舆情工单' },
  { key: 'ai:query', label: 'AI 问答', category: 'action', desc: '使用策略 AI 助手' },
  { key: 'users:manage', label: '用户管理', category: 'action', desc: '创建/编辑/停用用户' },
  { key: 'roles:manage', label: '角色管理', category: 'action', desc: '配置角色与权限' },
  { key: 'reports:read', label: '报告查看', category: 'page', desc: '查看汇报材料' },
  { key: 'reports:write', label: '报告编辑', category: 'action', desc: '创建/编辑汇报材料' },
  { key: 'ops:read', label: '运营查看', category: 'page', desc: '查看车型操盘数据' },
  { key: 'ops:write', label: '运营编辑', category: 'action', desc: '配置操盘动作' },
  { key: 'knowledge:read', label: '知识库查看', category: 'page', desc: '查看知识库文档' },
  { key: 'knowledge:write', label: '知识库编辑', category: 'action', desc: '维护知识库文档' },
  { key: 'projects:read', label: '项目查看', category: 'page', desc: '查看项目看板' },
  { key: 'projects:write', label: '项目编辑', category: 'action', desc: '管理项目任务' },
];

export const ROLES: Role[] = [
  {
    id: 'director', name: '策略总监', color: '#D6BC82',
    description: '全部模块读写权限 + 用户与角色管理',
    permissions: ALL_PERMISSIONS.map(p => p.key),
  },
  {
    id: 'analyst', name: '策略分析师', color: '#5AA2F0',
    description: '分配车型的数据读写 + 策略/报告编辑',
    permissions: ['strategy:read', 'strategy:write', 'data:read', 'data:export', 'competitor:read',
      'subsidy:read', 'voc:read', 'voc:write', 'ai:query', 'reports:read', 'reports:write',
      'ops:read', 'knowledge:read', 'knowledge:write', 'projects:read'],
  },
  {
    id: 'regional_sales', name: '区域销售', color: '#34C892',
    description: '只读本区域数据 + AI 问答',
    permissions: ['data:read', 'competitor:read', 'subsidy:read', 'voc:read', 'ai:query',
      'reports:read', 'knowledge:read', 'projects:read'],
  },
  {
    id: 'viewer', name: '访客/只读', color: '#9CA3AF',
    description: '特定模块查看权限',
    permissions: ['data:read', 'reports:read', 'knowledge:read'],
  },
];

export const MOCK_USERS: User[] = [
  { id: 'u001', name: '张明远', email: 'zhang.mingyuan@lixiang.com', role: 'director', dept: '销售策略部', lastLogin: '2026-05-29 09:32', status: 'active', models: ['L9', 'L8', 'L7', 'L6', 'MEGA'] },
  { id: 'u002', name: '李晓雨', email: 'li.xiaoyu@lixiang.com', role: 'analyst', dept: '策略分析组', lastLogin: '2026-05-29 10:15', status: 'active', models: ['L9', 'L8'] },
  { id: 'u003', name: '王浩', email: 'wang.hao@lixiang.com', role: 'analyst', dept: '策略分析组', lastLogin: '2026-05-28 16:44', status: 'active', models: ['L7', 'L6'] },
  { id: 'u004', name: '陈佳华', email: 'chen.jiahua@lixiang.com', role: 'regional_sales', region: '华东', lastLogin: '2026-05-29 08:21', status: 'active' },
  { id: 'u005', name: '刘敏', email: 'liu.min@lixiang.com', role: 'regional_sales', region: '华南', lastLogin: '2026-05-27 17:30', status: 'active' },
  { id: 'u006', name: '赵鹏', email: 'zhao.peng@lixiang.com', role: 'viewer', dept: '市场部', lastLogin: '2026-05-20 14:00', status: 'inactive' },
  { id: 'u007', name: '孙雅婷', email: 'sun.yating@lixiang.com', role: 'analyst', dept: '策略分析组', lastLogin: '2026-05-29 11:02', status: 'active', models: ['MEGA'] },
  { id: 'u008', name: '周建国', email: 'zhou.jianguo@lixiang.com', role: 'regional_sales', region: '华北', lastLogin: '2026-05-29 07:55', status: 'active' },
];

// ─── Command / Overview ────────────────────────────────────────────────────
export const METRICS: Metric[] = [
  { label: '本月订单', value: '8,412', raw: 8412, change: 12.3, unit: '台', spark: [6200, 6500, 6900, 7100, 7600, 7900, 8100, 8412] },
  { label: '本月交付', value: '7,893', raw: 7893, change: 8.7, unit: '台', spark: [6800, 6900, 7050, 7200, 7400, 7600, 7750, 7893] },
  { label: '市占率(NEV)', value: '18.2', raw: 18.2, change: 1.4, unit: '%', spark: [16.1, 16.5, 16.8, 17.2, 17.5, 17.8, 18.0, 18.2] },
  { label: '商机线索', value: '42,156', raw: 42156, change: -3.2, unit: '条', spark: [44800, 44200, 43900, 43500, 43100, 42800, 42400, 42156] },
  { label: '试驾转化率', value: '34.6', raw: 34.6, change: 2.1, unit: '%', spark: [30.2, 31.1, 31.8, 32.5, 33.2, 33.8, 34.2, 34.6] },
  { label: '终端均价', value: '38.9', raw: 38.9, change: -0.6, unit: '万', spark: [39.8, 39.6, 39.4, 39.3, 39.2, 39.1, 39.0, 38.9] },
];

export const FUNNEL: FunnelStage[] = [
  { stage: '线索', value: 42156 },
  { stage: '有效留资', value: 19800 },
  { stage: '到店', value: 12400 },
  { stage: '试驾', value: 8100 },
  { stage: '下定', value: 5600 },
  { stage: '交付', value: 4980 },
];

export const TREND: TrendPoint[] = [
  { date: '1月', orders: 6800, delivery: 6400 }, { date: '2月', orders: 5900, delivery: 6100 },
  { date: '3月', orders: 7200, delivery: 6800 }, { date: '4月', orders: 7500, delivery: 7100 },
  { date: '5月', orders: 8412, delivery: 7893 }, { date: '6月', orders: 0, delivery: 0 },
];

export const MODEL_PROGRESS: ModelProgress[] = [
  { model: 'L9', target: 3200, actual: 3056, color: '#D6BC82' },
  { model: 'L8', target: 2800, actual: 2541, color: '#5AA2F0' },
  { model: 'L7', target: 2400, actual: 1872, color: '#E25563' },
  { model: 'L6', target: 3600, actual: 3312, color: '#34C892' },
  { model: 'MEGA', target: 800, actual: 612, color: '#9C8CF0' },
];

export const REGIONS: RegionPerf[] = [
  { region: '华东', orders: 2680, completion: 96 },
  { region: '华南', orders: 1520, completion: 78 },
  { region: '华北', orders: 1840, completion: 91 },
  { region: '华中', orders: 1120, completion: 88 },
  { region: '西南', orders: 760, completion: 84 },
  { region: '西北', orders: 492, completion: 72 },
];

export const ALERTS: Alert[] = [
  { level: 'danger', title: '华南区 L7 落后', msg: '完成率 78%，落后目标 22%，建议加大促活与试驾邀约', tag: '目标风险' },
  { level: 'warn', title: '深圳补贴临期', msg: '深圳 ¥12,000 补贴 6 月底截止，把握最后冲量窗口', tag: '政策窗口' },
  { level: 'info', title: '问界 M9 上涨', msg: '问界 M9 环比 +8.2%（14,230 台），大型 SUV 竞争加剧', tag: '竞品动态' },
  { level: 'info', title: '武汉补贴预热', msg: '武汉 ¥9,000 补贴 6 月起生效，建议提前预热意向用户', tag: '政策窗口' },
  { level: 'warn', title: '西北完成率低', msg: '西北区完成率 72%，门店覆盖不足，关注下沉市场', tag: '目标风险' },
];

// ─── Goals (BP / 月度目标) ──────────────────────────────────────────────────
export const GOALS: GoalRow[] = [
  { model: 'L9', bpAnnual: 38000, monthlyTarget: 3200, monthlyActual: 3056, ytd: 14820, ytdTarget: 15800, source: '手工Excel' },
  { model: 'L8', bpAnnual: 33600, monthlyTarget: 2800, monthlyActual: 2541, ytd: 12300, ytdTarget: 13900, source: '内部API' },
  { model: 'L7', bpAnnual: 28800, monthlyTarget: 2400, monthlyActual: 1872, ytd: 9650, ytdTarget: 11800, source: '内部API' },
  { model: 'L6', bpAnnual: 43200, monthlyTarget: 3600, monthlyActual: 3312, ytd: 16900, ytdTarget: 17600, source: '内部API' },
  { model: 'MEGA', bpAnnual: 9600, monthlyTarget: 800, monthlyActual: 612, ytd: 3100, ytdTarget: 3900, source: '手工Excel' },
];

// ─── Ops 操盘动作 ───────────────────────────────────────────────────────────
export const OPS_ACTIONS: OpsAction[] = [
  { id: 'op1', title: '华南区 L7 试驾邀约冲刺', region: '华南', owner: '刘敏', status: 'doing', impact: 'high', due: '2026-06-05', progress: 45, desc: '针对落后目标 22% 的缺口，加密周末试驾活动，目标转化率 +8pt' },
  { id: 'op2', title: '深圳补贴临期收单', region: '华南', owner: '刘敏', status: 'risk', impact: 'high', due: '2026-06-30', progress: 30, desc: '深圳 ¥12,000 补贴 6 月底截止，主推 L6/L7 落地价优势' },
  { id: 'op3', title: 'L9 对标问界 M9 权益包', region: '全国', owner: '李晓雨', status: 'doing', impact: 'high', due: '2026-06-10', progress: 60, desc: '免费安装充电桩 + 优先交付，强化家庭场景与空间优势' },
  { id: 'op4', title: '华东区 Deep Drive 体验日', region: '华东', owner: '陈佳华', status: 'done', impact: 'mid', due: '2026-05-25', progress: 100, desc: '门店深度试驾体验日，NPS 提升至业内领先' },
  { id: 'op5', title: 'MEGA 商务车队渠道开发', region: '全国', owner: '孙雅婷', status: 'todo', impact: 'mid', due: '2026-06-20', progress: 0, desc: '对接企业用车与高端商务接待场景，拓展 B 端订单' },
  { id: 'op6', title: '西北区下沉市场门店勘址', region: '西北', owner: '周建国', status: 'todo', impact: 'low', due: '2026-07-01', progress: 10, desc: '完成率 72% 主因覆盖不足，规划 3 个地级市新店选址' },
];

// ─── Market 五看 ────────────────────────────────────────────────────────────
export const MARKET_VIEWS: MarketView[] = [
  { key: 'macro', title: '看宏观', insight: '新能源渗透率突破 52%，政策端置换补贴延续，居民购车信心温和回升。', metrics: [{ label: 'NEV 渗透率', value: '52.3%', change: 3.1 }, { label: '社零增速', value: '4.6%', change: 0.4 }, { label: '油价', value: '7.92元/L', change: 1.2 }] },
  { key: 'industry', title: '看行业', insight: '增程 + 大空间家用 SUV 持续高景气，30-50 万价格带竞争最激烈。', metrics: [{ label: '增程同比', value: '+38%', change: 38 }, { label: '行业均价', value: '24.8万', change: -2.1 }, { label: '新车型数', value: '47款' }] },
  { key: 'competitor', title: '看竞品', insight: '问界系列正面施压理想 L 系，比亚迪汉 L 下探中大型轿车，腾势承压。', metrics: [{ label: '问界月销', value: '36,410', change: 6.5 }, { label: '比亚迪汉L', value: '18,900', change: 22.4 }, { label: '腾势D9', value: '8,100', change: -3.2 }] },
  { key: 'customer', title: '看客户', insight: '家庭用户最看重空间与安全，舆情中"冰箱彩电大沙发"心智稳固，智驾关注度上升。', metrics: [{ label: '正面舆情', value: '68%', change: 4 }, { label: '智驾提及', value: '+27%', change: 27 }, { label: 'NPS', value: '74', change: 2 }] },
  { key: 'self', title: '看自身', insight: '市占率 18.2% 稳中有升，L7 短板明显，需补区域均衡与试驾转化。', metrics: [{ label: '市占率', value: '18.2%', change: 1.4 }, { label: '目标完成', value: '88%', change: -2 }, { label: '试驾转化', value: '34.6%', change: 2.1 }] },
];

// ─── Competitors ────────────────────────────────────────────────────────────
export const COMPETITORS: CompetitorModel[] = [
  { id: 'c001', brand: '问界', model: 'M9', price: 469900, segment: '大型SUV', range: 1402, monthlyVolume: 14230, trend: 'up', trendPct: 8.2, tags: ['增程', '豪华', '旗舰'], orderSource: '手工Excel', spark: [11200, 11800, 12400, 13100, 13600, 14230] },
  { id: 'c002', brand: '问界', model: 'M7', price: 249800, segment: '中大型SUV', range: 1100, monthlyVolume: 22180, trend: 'stable', trendPct: 1.3, tags: ['增程', '家用'], orderSource: '手工Excel', spark: [21800, 22000, 21900, 22100, 22050, 22180] },
  { id: 'c003', brand: '理想', model: 'L9', price: 459800, segment: '大型SUV', range: 1412, monthlyVolume: 3056, trend: 'up', trendPct: 4.6, tags: ['增程', '六座', '旗舰'], spark: [2700, 2780, 2850, 2920, 2990, 3056] },
  { id: 'c004', brand: '理想', model: 'L7', price: 319800, segment: '中大型SUV', range: 1315, monthlyVolume: 1872, trend: 'down', trendPct: -6.4, tags: ['增程', '五座'], spark: [2200, 2120, 2050, 1980, 1920, 1872] },
  { id: 'c005', brand: '蔚来', model: 'ES6', price: 338000, segment: '中大型SUV', range: 800, monthlyVolume: 6720, trend: 'stable', trendPct: 0.8, tags: ['纯电', '换电'], spark: [6600, 6650, 6700, 6680, 6710, 6720] },
  { id: 'c006', brand: '小鹏', model: 'X9', price: 399900, segment: '大型MPV', range: 702, monthlyVolume: 3210, trend: 'up', trendPct: 12.5, tags: ['纯电', 'MPV'], spark: [2500, 2680, 2820, 2980, 3100, 3210] },
  { id: 'c007', brand: '比亚迪', model: '汉L', price: 198800, segment: '中大型轿车', range: 1200, monthlyVolume: 18900, trend: 'up', trendPct: 22.4, tags: ['插混', '轿车'], spark: [13800, 15100, 16200, 17300, 18100, 18900] },
  { id: 'c008', brand: '腾势', model: 'D9', price: 339800, segment: '大型MPV', range: 1040, monthlyVolume: 8100, trend: 'down', trendPct: -3.2, tags: ['插混', 'MPV'], spark: [8800, 8600, 8400, 8300, 8200, 8100] },
  { id: 'c009', brand: '华为', model: '享界 S9', price: 399800, segment: '中大型轿车', range: 1150, monthlyVolume: 5940, trend: 'up', trendPct: 5.1, tags: ['增程', '智驾'], spark: [5200, 5400, 5600, 5750, 5850, 5940] },
  { id: 'c010', brand: '蔚来', model: 'L60', price: 249800, segment: '中型SUV', range: 1000, monthlyVolume: 9480, trend: 'up', trendPct: 9.3, tags: ['纯电', '换电'], spark: [7800, 8200, 8600, 8900, 9200, 9480] },
];

export const COMPETITOR_STORES: CompetitorStore[] = [
  { id: 's1', brand: '问界', city: '上海', count: 42, newThisMonth: 3, lat: 31.23, lng: 121.47, source: '官网抓取' },
  { id: 's2', brand: '问界', city: '深圳', count: 38, newThisMonth: 4, lat: 22.54, lng: 114.06, source: '官网抓取' },
  { id: 's3', brand: '蔚来', city: '上海', count: 35, newThisMonth: 1, lat: 31.23, lng: 121.47, source: '官网抓取' },
  { id: 's4', brand: '比亚迪', city: '广州', count: 56, newThisMonth: 2, lat: 23.13, lng: 113.26, source: '官网抓取' },
  { id: 's5', brand: '小鹏', city: '北京', count: 29, newThisMonth: 2, lat: 39.90, lng: 116.40, source: '官网抓取' },
  { id: 's6', brand: '问界', city: '成都', count: 31, newThisMonth: 3, lat: 30.57, lng: 104.06, source: '官网抓取' },
  { id: 's7', brand: '蔚来', city: '杭州', count: 24, newThisMonth: 1, lat: 30.27, lng: 120.15, source: '官网抓取' },
  { id: 's8', brand: '比亚迪', city: '武汉', count: 47, newThisMonth: 5, lat: 30.59, lng: 114.30, source: '官网抓取' },
];

// ─── Subsidies ──────────────────────────────────────────────────────────────
export const SUBSIDIES: SubsidyPolicy[] = [
  { id: 'sub1', city: '上海', province: '上海', amount: 10000, maxAmount: 10000, validFrom: '2026-01-01', validTo: '2026-12-31', conditions: '个人用户购买新能源汽车，价格区间 20-40 万，限购 1 辆', targetModels: ['L6', 'L7', 'L8'], status: 'active', source: '上海市商务委', updatedAt: '2026-05-01', lat: 31.23, lng: 121.47 },
  { id: 'sub2', city: '北京', province: '北京', amount: 8000, maxAmount: 8000, validFrom: '2026-03-01', validTo: '2026-08-31', conditions: '置换补贴，旧车报废换购新能源车', targetModels: ['L6', 'L7', 'L8', 'L9'], status: 'active', source: '北京市商务局', updatedAt: '2026-04-15', lat: 39.90, lng: 116.40 },
  { id: 'sub3', city: '深圳', province: '广东', amount: 12000, maxAmount: 15000, validFrom: '2026-02-01', validTo: '2026-06-30', conditions: '新能源车购置补贴，户籍不限，车牌摇号绿色通道', targetModels: ['L6', 'L7'], status: 'active', source: '深圳市工信局', updatedAt: '2026-05-08', lat: 22.54, lng: 114.06 },
  { id: 'sub4', city: '成都', province: '四川', amount: 6000, maxAmount: 6000, validFrom: '2026-04-01', validTo: '2026-09-30', conditions: '四川省购车补贴政策，含成都市额外补贴', targetModels: ['L6', 'L7', 'L8', 'L9', 'MEGA'], status: 'active', source: '四川省发改委', updatedAt: '2026-04-20', lat: 30.57, lng: 104.06 },
  { id: 'sub5', city: '杭州', province: '浙江', amount: 5000, maxAmount: 5000, validFrom: '2025-10-01', validTo: '2025-12-31', conditions: '2025 年末清库存补贴，已过期', targetModels: ['L6'], status: 'expired', source: '杭州市商务局', updatedAt: '2025-10-01', lat: 30.27, lng: 120.15 },
  { id: 'sub6', city: '武汉', province: '湖北', amount: 9000, maxAmount: 9000, validFrom: '2026-06-01', validTo: '2026-12-31', conditions: '2026 年下半年补贴，待生效', targetModels: ['L6', 'L7', 'L8'], status: 'upcoming', source: '武汉市经信局', updatedAt: '2026-05-10', lat: 30.59, lng: 114.30 },
  { id: 'sub7', city: '广州', province: '广东', amount: 7000, maxAmount: 10000, validFrom: '2026-03-15', validTo: '2026-10-31', conditions: '个人新能源置换 + 充电桩安装补贴叠加', targetModels: ['L6', 'L7', 'L8', 'MEGA'], status: 'active', source: '广州市工信局', updatedAt: '2026-05-12', lat: 23.13, lng: 113.26 },
  { id: 'sub8', city: '重庆', province: '重庆', amount: 8500, maxAmount: 8500, validFrom: '2026-07-01', validTo: '2026-12-31', conditions: '内陆消费提振计划，新能源购车补贴', targetModels: ['L7', 'L8', 'L9'], status: 'upcoming', source: '重庆市商务委', updatedAt: '2026-05-18', lat: 29.56, lng: 106.55 },
];

// ─── VOC 用户声音 ───────────────────────────────────────────────────────────
export const VOC_POSTS: VocPost[] = [
  { id: 'v1', platform: '小红书', author: '奶爸阿杰', content: 'L9 全家出行真的香，二排三排空间无敌，冰箱彩电大沙发名不虚传，孩子在后排能睡一路。', sentiment: 'positive', model: 'L9', topic: '空间/家用', likes: 1280, time: '2026-05-28' },
  { id: 'v2', platform: '懂车帝', author: '车评老炮', content: '增程在高速上馈电油耗偏高，长途跑起来没想象中省，介意的慎重。', sentiment: 'negative', model: 'L7', topic: '能耗/续航', likes: 642, time: '2026-05-27' },
  { id: 'v3', platform: '微博', author: '科技喵', content: '理想的智驾这两次 OTA 进步明显，城市 NOA 终于能用了，但跟华为还有差距。', sentiment: 'neutral', model: 'L8', topic: '智能驾驶', likes: 920, time: '2026-05-29' },
  { id: 'v4', platform: '汽车之家', author: '西二旗码农', content: 'MEGA 外观争议大，但坐进去那一刻真香，纯电 MPV 里第一档，就是价格劝退。', sentiment: 'neutral', model: 'MEGA', topic: '外观/价格', likes: 408, time: '2026-05-26' },
  { id: 'v5', platform: '易车', author: '佛系奶爸', content: '对比了问界 M9 和 L9，最后选了 L9，主要是空间和品牌服务，销售也专业。', sentiment: 'positive', model: 'L9', topic: '竞品对比', likes: 756, time: '2026-05-28' },
  { id: 'v6', platform: '小红书', author: '精致大女主', content: 'L6 这个价位真心推荐，年轻家庭第一台车，颜值在线配置厚道。', sentiment: 'positive', model: 'L6', topic: '性价比', likes: 2140, time: '2026-05-29' },
  { id: 'v7', platform: '懂车帝', author: '老司机说车', content: '提车两周，悬挂偏软过弯支撑一般，城市代步够用，运动型选手别考虑。', sentiment: 'neutral', model: 'L7', topic: '操控/底盘', likes: 330, time: '2026-05-25' },
  { id: 'v8', platform: '微博', author: '维权车主', content: '交付延期一个多月，门店沟通态度还行但确实影响计划，希望改进。', sentiment: 'negative', model: 'L8', topic: '交付/服务', likes: 1120, time: '2026-05-27' },
  { id: 'v9', platform: '汽车之家', author: '理性消费', content: '保值率在新势力里算不错的，三年下来比蔚来稳，增程没续航焦虑。', sentiment: 'positive', model: 'L9', topic: '保值/服务', likes: 588, time: '2026-05-24' },
  { id: 'v10', platform: '小红书', author: '二胎妈妈', content: '试驾完就定了 L8，第二排小桌板和遮阳帘细节满分，娃出行太方便。', sentiment: 'positive', model: 'L8', topic: '空间/家用', likes: 1660, time: '2026-05-29' },
  { id: 'v11', platform: '易车', author: '数码闲谈', content: '车机偶尔卡顿，导航重新规划慢半拍，希望尽快优化系统流畅度。', sentiment: 'negative', model: 'L6', topic: '车机/系统', likes: 270, time: '2026-05-26' },
  { id: 'v12', platform: '懂车帝', author: '增程真香党', content: '北方冬天增程比纯电靠谱太多，暖风随便开不肉疼，这点必须好评。', sentiment: 'positive', model: 'L7', topic: '能耗/续航', likes: 845, time: '2026-05-23' },
];

export const VOC_TOPICS: VocTopic[] = [
  { topic: '空间/家用', count: 1820, sentiment: 'positive' },
  { topic: '智能驾驶', count: 1340, sentiment: 'neutral' },
  { topic: '能耗/续航', count: 1180, sentiment: 'neutral' },
  { topic: '性价比', count: 960, sentiment: 'positive' },
  { topic: '交付/服务', count: 740, sentiment: 'negative' },
  { topic: '车机/系统', count: 520, sentiment: 'negative' },
  { topic: '保值率', count: 430, sentiment: 'positive' },
  { topic: '操控/底盘', count: 380, sentiment: 'neutral' },
];

export const VOC_TRANSCRIPTS: VocTranscript[] = [
  { id: 't1', store: '上海浦东体验中心', advisor: '顾问·王琳', customer: '意向客户(L9)', duration: '14:32', model: 'L9', sentiment: 'positive', summary: '客户关注三排空间与儿童安全，对增程无续航焦虑认可，价格敏感度低，临门一脚需权益包推动。', keywords: ['三排空间', '儿童安全', '增程', '权益包'], time: '2026-05-28' },
  { id: 't2', store: '深圳湾体验中心', advisor: '顾问·陈昊', customer: '意向客户(L7)', duration: '09:48', model: 'L7', sentiment: 'neutral', summary: '客户对比问界 M7，纠结智驾能力与价格，明确补贴截止前可定，建议主推深圳补贴落地价。', keywords: ['对比M7', '智驾', '深圳补贴', '落地价'], time: '2026-05-27' },
  { id: 't3', store: '北京朝阳体验中心', advisor: '顾问·李娜', customer: '意向客户(L8)', duration: '18:05', model: 'L8', sentiment: 'negative', summary: '客户对交付周期不满，担心延期影响用车计划，情绪偏负面，需销售主管介入安抚并给明确交付承诺。', keywords: ['交付周期', '延期', '情绪安抚', '交付承诺'], time: '2026-05-26' },
  { id: 't4', store: '成都高新体验中心', advisor: '顾问·张伟', customer: '意向客户(L6)', duration: '11:20', model: 'L6', sentiment: 'positive', summary: '年轻家庭首购，预算 25-30 万，对 L6 颜值与配置满意，关注车机流畅度，转化意愿强。', keywords: ['首购', '预算25-30万', '颜值', '车机'], time: '2026-05-29' },
];

// ─── Knowledge ──────────────────────────────────────────────────────────────
export const KNOWLEDGE_DOCS: KnowledgeDoc[] = [
  { id: 'k1', title: '2026 销售策略五看框架方法论', category: '方法论', tags: ['五看', '战略'], author: '张明远', updatedAt: '2026-05-20', views: 1240, excerpt: '看宏观、看行业、看竞品、看客户、看自身——销售策略团队标准分析框架与落地模板。', pinned: true },
  { id: 'k2', title: 'L 系车型竞品话术手册 v3.2', category: '竞品', tags: ['话术', 'L9', 'M9'], author: '李晓雨', updatedAt: '2026-05-25', views: 2860, excerpt: '针对问界 M9/M7、蔚来、比亚迪的差异化卖点与异议处理标准话术。', pinned: true },
  { id: 'k3', title: '地方补贴政策汇编（2026 H1）', category: '政策', tags: ['补贴', '政策'], author: '王浩', updatedAt: '2026-05-12', views: 1530, excerpt: '全国主要城市新能源购车补贴金额、条件、有效期一览，含落地价测算模型。' },
  { id: 'k4', title: '试驾转化 SOP 与话术标准', category: 'SOP', tags: ['试驾', '转化'], author: '陈佳华', updatedAt: '2026-05-18', views: 980, excerpt: '从邀约、接待、深度试驾到临门一脚的标准动作与转化关键节点。' },
  { id: 'k5', title: '区域操盘动作复盘模板', category: '模板', tags: ['操盘', '复盘'], author: '刘敏', updatedAt: '2026-05-15', views: 640, excerpt: '区域目标拆解、动作设计、效果归因的标准复盘模板与案例。' },
  { id: 'k6', title: 'AI 助手使用指南与提示词库', category: '工具', tags: ['AI', '提示词'], author: '孙雅婷', updatedAt: '2026-05-27', views: 1180, excerpt: '策略 AI 助手高效提问范式、常用提示词模板与数据口径说明。' },
  { id: 'k7', title: '增程技术科普与用户答疑', category: '产品', tags: ['增程', '科普'], author: '王浩', updatedAt: '2026-05-10', views: 720, excerpt: '增程原理、馈电油耗、冬季优势等高频用户问题标准答疑。' },
  { id: 'k8', title: '舆情应对与危机处理预案', category: 'SOP', tags: ['舆情', 'VOC'], author: '张明远', updatedAt: '2026-05-22', views: 510, excerpt: '负面舆情分级、响应时效、话术口径与升级机制。' },
];

// ─── Projects ───────────────────────────────────────────────────────────────
export const PROJECT_TASKS: ProjectTask[] = [
  { id: 'p1', title: 'Q2 华南区冲量作战方案', status: 'doing', owner: '刘敏', priority: 'P0', due: '2026-06-10', tags: ['华南', '冲量'] },
  { id: 'p2', title: 'L7 产品力提升专项调研', status: 'doing', owner: '王浩', priority: 'P1', due: '2026-06-15', tags: ['L7', '调研'] },
  { id: 'p3', title: '618 大促政策与权益设计', status: 'review', owner: '李晓雨', priority: 'P0', due: '2026-06-01', tags: ['大促', '政策'] },
  { id: 'p4', title: '竞品门店数据自动抓取上线', status: 'done', owner: '孙雅婷', priority: 'P1', due: '2026-05-20', tags: ['数据', '竞品'] },
  { id: 'p5', title: 'VOC 舆情看板二期', status: 'backlog', owner: '孙雅婷', priority: 'P2', due: '2026-07-01', tags: ['VOC', '数据'] },
  { id: 'p6', title: 'MEGA 商务渠道拓展计划', status: 'backlog', owner: '孙雅婷', priority: 'P2', due: '2026-06-25', tags: ['MEGA', '渠道'] },
  { id: 'p7', title: '区域目标拆解模型 v2', status: 'backlog', owner: '李晓雨', priority: 'P1', due: '2026-06-30', tags: ['目标', '建模'] },
  { id: 'p8', title: '试驾转化 SOP 全国推广', status: 'doing', owner: '陈佳华', priority: 'P1', due: '2026-06-12', tags: ['试驾', 'SOP'] },
  { id: 'p9', title: '5 月经营分析报告', status: 'done', owner: '张明远', priority: 'P0', due: '2026-05-28', tags: ['报告', '经营'] },
  { id: 'p10', title: '知识库话术手册 v4 更新', status: 'review', owner: '王浩', priority: 'P2', due: '2026-06-08', tags: ['知识库', '话术'] },
];
