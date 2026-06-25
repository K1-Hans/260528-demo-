// ════════════════════════════════════════════════════════════════════════
// AI 供应链/履约中台 · Mock 数据（全前端，无后端）
// 🔒 脱敏：示例零售/示例制造，仓/门店/供应商通用名（华东区域仓/示例供应商 A），无真实雇主。
// 行业锚定：制造/零售。链路：需求预测 → 库存 → 补货采购 → 履约物流 → 风险预警。
// ════════════════════════════════════════════════════════════════════════

import type {
  Role, User, Alert, NetworkNode, NetworkEdge, Shipment, ForecastSeries,
  InventoryItem, HeatCell, ReplenishOrder, WhatIfLever, WhatIfOutcome,
  Supplier, ExceptionItem, GateItem, Health,
} from '../types';

const sp = (a: number, n = 7) => Array.from({ length: n }, (_, i) => +(a * (1 + Math.sin(i / 1.6) * 0.16 + (i % 3 - 1) * 0.05)).toFixed(2));

// ─── 角色 RBAC（4 角色 · 权限分权差异化）────────────────────────────────────
export const ROLES: Role[] = [
  {
    id: 'planner', name: '供应链计划员', enName: 'S&OP Planner', color: '#F0883E',
    description: '需求预测、What-if 模拟与全链路计划，对服务水平负责',
    landing: '/tower',
    permissions: ['tower:read', 'forecast:read', 'forecast:edit', 'inventory:read', 'replenish:read', 'whatif:read', 'supplier:read'],
  },
  {
    id: 'inventory', name: '库存运营', enName: 'Inventory Ops', color: '#34C892',
    description: '库存健康监控、缺货/积压预警与补货执行',
    landing: '/inventory',
    permissions: ['tower:read', 'forecast:read', 'inventory:read', 'replenish:read'],
  },
  {
    id: 'procurement', name: '采购经理', enName: 'Procurement', color: '#4D9DE8',
    description: '补货采购下单、供应商风险评估与切换',
    landing: '/replenish',
    permissions: ['tower:read', 'inventory:read', 'replenish:read', 'replenish:edit', 'supplier:read'],
  },
  {
    id: 'coo', name: '供应链总监', enName: 'COO', color: '#E8B339',
    description: '端到端控制塔全局视角，只读总览所有模块',
    landing: '/tower',
    permissions: ['tower:read', 'forecast:read', 'inventory:read', 'replenish:read', 'whatif:read', 'supplier:read'],
  },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: '罗芮', username: 'luorui', role: 'planner', dept: '供应链计划部', lastLogin: '今天 08:50', status: 'active', note: '供应链计划员' },
  { id: 'u2', name: '高崎', username: 'gaoqi', role: 'inventory', dept: '库存运营中心', lastLogin: '今天 09:20', status: 'active', note: '库存运营' },
  { id: 'u3', name: '周野', username: 'zhouye', role: 'procurement', dept: '采购中心', lastLogin: '今天 09:05', status: 'active', note: '采购经理' },
  { id: 'u4', name: '韦珩', username: 'weiheng', role: 'coo', dept: '供应链管理部', lastLogin: '昨天 20:30', status: 'active', note: '供应链总监' },
  { id: 'u5', name: '林深', username: 'linshen', role: 'procurement', dept: '采购中心', status: 'inactive', note: '已离职停用' },
];

// ─── 控制塔：端到端履约网络（旗舰 graph · x/y 0-100 上游左→下游右，纵向地理散布）──
export const NETWORK_NODES: NetworkNode[] = [
  // 供应商（上游左）
  { id: 'sup1', name: '示例供应商 A · 电子', kind: 'supplier', x: 8, y: 22, health: 'ok', throughput: 18600, fillRate: 98.2, region: '华南' },
  { id: 'sup2', name: '示例供应商 B · 纺织', kind: 'supplier', x: 7, y: 50, health: 'watch', throughput: 12400, fillRate: 93.5, region: '华东' },
  { id: 'sup3', name: '示例供应商 C · 食品', kind: 'supplier', x: 9, y: 76, health: 'broken', throughput: 0, fillRate: 0, region: '华中' },
  // 中心仓
  { id: 'hub1', name: '华中中心仓', kind: 'hub', x: 35, y: 38, health: 'ok', throughput: 42800, fillRate: 96.4, region: '华中' },
  { id: 'hub2', name: '华南中心仓', kind: 'hub', x: 34, y: 68, health: 'watch', throughput: 31200, fillRate: 91.8, region: '华南' },
  // 区域仓
  { id: 'rdc1', name: '华东区域仓', kind: 'rdc', x: 60, y: 24, health: 'ok', throughput: 22600, fillRate: 97.1, region: '华东' },
  { id: 'rdc2', name: '华北区域仓', kind: 'rdc', x: 58, y: 48, health: 'low', throughput: 14200, fillRate: 88.3, region: '华北' },
  { id: 'rdc3', name: '华南区域仓', kind: 'rdc', x: 61, y: 72, health: 'ok', throughput: 19800, fillRate: 95.6, region: '华南' },
  { id: 'rdc4', name: '西南区域仓', kind: 'rdc', x: 57, y: 90, health: 'watch', throughput: 9600, fillRate: 90.2, region: '西南' },
  // 门店（下游右）
  { id: 'st1', name: '上海旗舰店', kind: 'store', x: 88, y: 16, health: 'ok', throughput: 4200, fillRate: 98.8, region: '华东' },
  { id: 'st2', name: '北京门店', kind: 'store', x: 86, y: 38, health: 'low', throughput: 3100, fillRate: 84.5, region: '华北' },
  { id: 'st3', name: '广州门店', kind: 'store', x: 90, y: 64, health: 'ok', throughput: 3800, fillRate: 96.2, region: '华南' },
  { id: 'st4', name: '成都门店', kind: 'store', x: 87, y: 86, health: 'watch', throughput: 2400, fillRate: 89.7, region: '西南' },
  { id: 'st5', name: '杭州门店', kind: 'store', x: 92, y: 30, health: 'ok', throughput: 3300, fillRate: 97.4, region: '华东' },
];
export const NETWORK_EDGES: NetworkEdge[] = [
  { source: 'sup1', target: 'hub1', volume: 8600, status: 'normal' },
  { source: 'sup1', target: 'hub2', volume: 6200, status: 'normal' },
  { source: 'sup2', target: 'hub1', volume: 5400, status: 'delayed' },
  { source: 'sup3', target: 'hub2', volume: 0, status: 'congested' },
  { source: 'hub1', target: 'rdc1', volume: 7200, status: 'normal' },
  { source: 'hub1', target: 'rdc2', volume: 4100, status: 'delayed' },
  { source: 'hub2', target: 'rdc3', volume: 6800, status: 'normal' },
  { source: 'hub2', target: 'rdc4', volume: 3200, status: 'normal' },
  { source: 'hub1', target: 'rdc3', volume: 2600, status: 'normal' },
  { source: 'rdc1', target: 'st1', volume: 2200, status: 'normal' },
  { source: 'rdc1', target: 'st5', volume: 1800, status: 'normal' },
  { source: 'rdc2', target: 'st2', volume: 1400, status: 'congested' },
  { source: 'rdc3', target: 'st3', volume: 2000, status: 'normal' },
  { source: 'rdc4', target: 'st4', volume: 1100, status: 'delayed' },
];
export const SHIPMENTS: Shipment[] = [
  { id: 'sh1', route: '华中中心仓 → 华北区域仓', from: 'hub1', to: 'rdc2', eta: '6 小时后', status: 'delayed', stage: 1, units: 4100 },
  { id: 'sh2', route: '华东区域仓 → 上海旗舰店', from: 'rdc1', to: 'st1', eta: '2 小时后', status: 'on_time', stage: 4, units: 2200 },
  { id: 'sh3', route: '供应商 A → 华南中心仓', from: 'sup1', to: 'hub2', eta: '已到', status: 'arrived', stage: 5, units: 6200 },
  { id: 'sh4', route: '华北区域仓 → 北京门店', from: 'rdc2', to: 'st2', eta: '延误 4h', status: 'delayed', stage: 3, units: 1400 },
];
export const EXCEPTIONS: ExceptionItem[] = [
  { id: 'e1', kind: 'critical', title: '供应商 C 断供', node: '示例供应商 C · 食品', detail: '原料停产，华南中心仓食品类补货中断，预计影响 3 门店', at: '12 分钟前', impact: '波及 华南区域仓 + 2 门店' },
  { id: 'e2', kind: 'action', title: '北京门店缺货预警', node: '北京门店', detail: '可供天数降至 1.8 天，低于安全线，Agent 已生成紧急调拨建议', at: '38 分钟前', impact: '履约率 84.5% ↓' },
  { id: 'e3', kind: 'warn', title: '华北区域仓在途拥堵', node: '华北区域仓', detail: '入库吞吐下降 22%，2 笔在途延误', at: '1 小时前', impact: '2 笔在途延误' },
  { id: 'e4', kind: 'warn', title: '西南区域仓积压', node: '西南区域仓', detail: '季节性 SKU 周转放缓，积压占用资金上升', at: '2 小时前', impact: '周转 +6 天' },
  { id: 'e5', kind: 'info', title: '华东区域仓履约达标', node: '华东区域仓', detail: '履约率 97.1%，连续 7 日达标', at: '今天', impact: '服务水平稳定' },
];
export const TOWER_KPIS = [
  { label: '准时履约率', raw: 93.6, unit: '%', change: 2.4, decimals: 1, spark: sp(93) },
  { label: '在途货量', raw: 38.2, unit: '万件', change: 5.1, decimals: 1, spark: sp(38) },
  { label: '缺货节点', raw: 2, unit: '个', change: -1, spark: [4, 3, 3, 2, 3, 2, 2] },
  { label: '异常预警', raw: 5, unit: '条', change: 1, spark: [3, 4, 4, 5, 4, 5, 5] },
];

// ─── 需求预测（带置信区间）──────────────────────────────────────────────────────
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
function band(base: number, growth: number, splitIdx: number): Omit<ForecastSeries, 'sku' | 'name' | 'category' | 'accuracy' | 'trend'> {
  const actual: (number | null)[] = []; const forecast: (number | null)[] = []; const upper: (number | null)[] = []; const lower: (number | null)[] = [];
  for (let i = 0; i < 12; i++) {
    const v = Math.round(base * (1 + growth * i / 11 + Math.sin(i / 1.8) * 0.12));
    if (i <= splitIdx) { actual.push(v); forecast.push(i === splitIdx ? v : null); upper.push(null); lower.push(null); }
    else { actual.push(null); forecast.push(v); upper.push(Math.round(v * 1.14)); lower.push(Math.round(v * 0.87)); }
  }
  return { months: MONTHS, actual, forecast, upper, lower };
}
export const FORECAST_SERIES: ForecastSeries[] = [
  { sku: 'SKU-EL-2207', name: '便携储能电源 1000W', category: '电子', accuracy: 94.2, trend: 18.6, ...band(8600, 0.32, 7) },
  { sku: 'SKU-TX-1180', name: '抑菌速干运动 T 恤', category: '纺织', accuracy: 89.5, trend: 7.2, ...band(12400, 0.12, 7) },
  { sku: 'SKU-FD-3056', name: '冻干水果零食礼盒', category: '食品', accuracy: 91.8, trend: 24.1, ...band(6800, 0.4, 7) },
  { sku: 'SKU-HM-0942', name: '记忆棉护颈枕', category: '家居', accuracy: 87.3, trend: -3.4, ...band(4200, -0.05, 7) },
];
export const FORECAST_KPIS = [
  { label: '预测准确率', raw: 93.1, unit: '%', change: 4.2, decimals: 1, spark: sp(93) },
  { label: '在管 SKU', raw: 1842, unit: '个', change: 6.0, spark: sp(1842) },
  { label: '需求同比', raw: 14.8, unit: '%', change: 3.1, decimals: 1, spark: sp(14) },
  { label: '预测偏差 MAPE', raw: 6.9, unit: '%', change: -2.4, decimals: 1, spark: sp(7) },
];

// ─── 库存健康（热力 + 表）────────────────────────────────────────────────────────
export const WAREHOUSES = ['华中中心仓', '华南中心仓', '华东区域仓', '华北区域仓', '华南区域仓', '西南区域仓'];
export const CATEGORIES = ['电子', '纺织', '食品', '家居', '美护'];
// 库存热力（仓 × 品类 → 可供天数；health 由天数派生）
function healthFromDos(d: number): Health { return d <= 0 ? 'broken' : d < 7 ? 'low' : d > 60 ? 'watch' : 'ok'; }
export const HEAT_CELLS: HeatCell[] = (() => {
  const dos: Record<string, number[]> = {
    '华中中心仓': [28, 34, 22, 41, 30], '华南中心仓': [19, 26, 3, 38, 24],
    '华东区域仓': [32, 29, 18, 45, 27], '华北区域仓': [12, 16, 9, 22, 5],
    '华南区域仓': [24, 31, 14, 39, 22], '西南区域仓': [68, 72, 41, 58, 33],
  };
  const cells: HeatCell[] = [];
  WAREHOUSES.forEach(w => CATEGORIES.forEach((c, i) => { const d = dos[w][i]; cells.push({ warehouse: w, category: c, value: d, health: healthFromDos(d) }); }));
  return cells;
})();
export const INVENTORY_ITEMS: InventoryItem[] = [
  { id: 'i1', sku: 'SKU-EL-2207', name: '便携储能电源 1000W', category: '电子', warehouse: '华南中心仓', stock: 1240, safetyStock: 1800, inTransit: 4100, daysOfSupply: 3.2, health: 'low', turnover: 18 },
  { id: 'i2', sku: 'SKU-FD-3056', name: '冻干水果零食礼盒', category: '食品', warehouse: '华南中心仓', stock: 86, safetyStock: 900, inTransit: 0, daysOfSupply: 0.4, health: 'broken', turnover: 12 },
  { id: 'i3', sku: 'SKU-TX-1180', name: '抑菌速干运动 T 恤', category: '纺织', warehouse: '华东区域仓', stock: 8600, safetyStock: 3200, inTransit: 1200, daysOfSupply: 29, health: 'ok', turnover: 24 },
  { id: 'i4', sku: 'SKU-HM-0942', name: '记忆棉护颈枕', category: '家居', warehouse: '西南区域仓', stock: 9200, safetyStock: 1400, inTransit: 0, daysOfSupply: 72, health: 'watch', turnover: 58 },
  { id: 'i5', sku: 'SKU-EL-2207', name: '便携储能电源 1000W', category: '电子', warehouse: '华北区域仓', stock: 640, safetyStock: 1200, inTransit: 800, daysOfSupply: 4.1, health: 'low', turnover: 16 },
  { id: 'i6', sku: 'SKU-TX-1180', name: '抑菌速干运动 T 恤', category: '纺织', warehouse: '华中中心仓', stock: 12400, safetyStock: 4000, inTransit: 0, daysOfSupply: 34, health: 'ok', turnover: 22 },
  { id: 'i7', sku: 'SKU-FD-3056', name: '冻干水果零食礼盒', category: '食品', warehouse: '华东区域仓', stock: 3200, safetyStock: 1500, inTransit: 600, daysOfSupply: 18, health: 'ok', turnover: 14 },
  { id: 'i8', sku: 'SKU-BT-7741', name: '氨基酸洁面慕斯', category: '美护', warehouse: '华北区域仓', stock: 420, safetyStock: 1100, inTransit: 1500, daysOfSupply: 2.6, health: 'low', turnover: 20 },
];
export const INVENTORY_KPIS = [
  { label: '库存健康分', raw: 82, unit: '', change: 3, spark: sp(82) },
  { label: '缺货 SKU', raw: 38, unit: '个', change: -12, spark: [62, 54, 48, 44, 40, 39, 38] },
  { label: '积压占用', raw: 2860, unit: '万', change: -8.2, decimals: 0, spark: sp(2860) },
  { label: '平均周转', raw: 26.4, unit: '天', change: -3.1, decimals: 1, spark: sp(26) },
];

// ─── 补货采购（工作流 + Agent 自主决策）──────────────────────────────────────────
export const REPLENISH_ORDERS: ReplenishOrder[] = [
  { id: 'r1', sku: 'SKU-FD-3056', name: '冻干水果零食礼盒', fromSupplier: '示例供应商 C · 食品', toWarehouse: '华南中心仓', qty: 12000, unitCost: 28, reason: '断供恢复 · 紧急补货', status: 'pending', agentConfidence: 76, leadTime: 7, eta: '7 天后' },
  { id: 'r2', sku: 'SKU-EL-2207', name: '便携储能电源 1000W', fromSupplier: '示例供应商 A · 电子', toWarehouse: '华南中心仓', qty: 5000, unitCost: 420, reason: '可供天数 3.2 天 · 低于安全线', status: 'agent_suggested', agentConfidence: 94, leadTime: 4, eta: '4 天后' },
  { id: 'r3', sku: 'SKU-BT-7741', name: '氨基酸洁面慕斯', fromSupplier: '示例供应商 E · 美护', toWarehouse: '华北区域仓', qty: 3000, unitCost: 36, reason: '可供天数 2.6 天 · 缺货风险', status: 'agent_suggested', agentConfidence: 91, leadTime: 5, eta: '5 天后' },
  { id: 'r4', sku: 'SKU-TX-1180', name: '抑菌速干运动 T 恤', fromSupplier: '示例供应商 B · 纺织', toWarehouse: '华东区域仓', qty: 2000, unitCost: 45, reason: '常规周期补货', status: 'auto_placed', agentConfidence: 88, leadTime: 6, eta: '6 天后' },
  { id: 'r5', sku: 'SKU-EL-2207', name: '便携储能电源 1000W', fromSupplier: '示例供应商 A · 电子', toWarehouse: '华北区域仓', qty: 2500, unitCost: 420, reason: '可供天数 4.1 天', status: 'approved', agentConfidence: 90, leadTime: 4, eta: '4 天后' },
];
export const REPLENISH_KPIS = [
  { label: '待审补货', raw: 14, unit: '单', change: 2, spark: sp(14) },
  { label: 'Agent 自动下单', raw: 62, unit: '%', change: 16, decimals: 0, spark: sp(62) },
  { label: '本周采购额', raw: 1284, unit: '万', change: 9.4, decimals: 0, spark: sp(1284) },
  { label: '平均交期', raw: 5.2, unit: '天', change: -0.8, decimals: 1, spark: sp(5) },
];
export const GATE_ITEMS: GateItem[] = [
  { id: 'g1', title: '冻干礼盒紧急补货 12,000 件（¥33.6 万）', kind: '自主补货', agent: '补货决策 Agent', status: 'pending', risk: 'high', detail: '供应商 C 断供恢复后首单，金额超 30 万阈值 + 交期风险，需采购经理确认', amount: '¥33.6 万', at: '14:20' },
  { id: 'g2', title: '北京门店紧急调拨（华东仓→北京）', kind: '紧急调拨', agent: '调拨 Agent', status: 'pending', risk: 'mid', detail: '北京门店可供 1.8 天，Agent 建议从华东区域仓紧急调拨 1,500 件', amount: '1,500 件', at: '13:48' },
  { id: 'g3', title: '储能电源补货 5,000 件（自动下单）', kind: '自主补货', agent: '补货决策 Agent', status: 'auto', risk: 'low', detail: '置信度 94%、金额/交期均在阈值内，Agent 自动下单，已留痕', amount: '¥210 万', at: '11:30' },
  { id: 'g4', title: '食品类切换备用供应商', kind: '供应商切换', agent: '风险预警 Agent', status: 'approved', risk: 'high', detail: '供应商 C 断供，切换至备用供应商 F，已人工确认资质合规', reviewer: '周野', at: '10:15' },
];

// ─── What-if 情景模拟（拉杆 → 涟漪）──────────────────────────────────────────────
export const WHATIF_LEVERS: WhatIfLever[] = [
  { id: 'demand', label: '需求波动', min: -30, max: 50, value: 20, unit: '%', step: 5 },
  { id: 'leadtime', label: '供应商交期', min: -20, max: 40, value: 0, unit: '%', step: 5 },
  { id: 'safety', label: '安全库存系数', min: 80, max: 160, value: 100, unit: '%', step: 10 },
];
// 基线结果（拉杆联动在页面内按系数估算涟漪）
export const WHATIF_BASE: WhatIfOutcome[] = [
  { label: '准时履约率', base: 93.6, sim: 93.6, unit: '%', better: 'up' },
  { label: '缺货 SKU', base: 38, sim: 38, unit: '个', better: 'down' },
  { label: '库存持有成本', base: 2860, sim: 2860, unit: '万', better: 'down' },
  { label: '安全库存占用', base: 1240, sim: 1240, unit: '万', better: 'down' },
];
export const WHATIF_KPIS = [
  { label: '已存情景', raw: 6, unit: '个', change: 1, spark: sp(6) },
  { label: '基线履约率', raw: 93.6, unit: '%', change: 2.4, decimals: 1, spark: sp(93) },
  { label: '基线持有成本', raw: 2860, unit: '万', change: -8.2, decimals: 0, spark: sp(2860) },
  { label: '模拟运行', raw: 142, unit: '次', change: 28, spark: sp(142) },
];

// ─── 供应商风险（雷达 + 表）──────────────────────────────────────────────────────
const radar = (a: number, b: number, c: number, d: number, e: number) => [
  { dim: '准时交付', value: a }, { dim: '质量', value: b }, { dim: '财务健康', value: c }, { dim: '产能弹性', value: d }, { dim: '合规', value: e },
];
export const SUPPLIERS: Supplier[] = [
  { id: 'sp1', name: '示例供应商 A · 电子', category: '电子', region: '华南', onTimeRate: 98.2, qualityScore: 96, riskScore: 18, riskLevel: 'ok', dependency: 42, radar: radar(98, 96, 90, 88, 95) },
  { id: 'sp2', name: '示例供应商 B · 纺织', category: '纺织', region: '华东', onTimeRate: 93.5, qualityScore: 89, riskScore: 38, riskLevel: 'watch', dependency: 31, radar: radar(93, 89, 72, 80, 88) },
  { id: 'sp3', name: '示例供应商 C · 食品', category: '食品', region: '华中', onTimeRate: 71.2, qualityScore: 82, riskScore: 82, riskLevel: 'broken', dependency: 28, radar: radar(71, 82, 48, 55, 76) },
  { id: 'sp4', name: '示例供应商 D · 包装', category: '包装', region: '华东', onTimeRate: 95.8, qualityScore: 92, riskScore: 24, riskLevel: 'ok', dependency: 18, radar: radar(96, 92, 85, 82, 90) },
  { id: 'sp5', name: '示例供应商 E · 美护', category: '美护', region: '华南', onTimeRate: 88.6, qualityScore: 90, riskScore: 46, riskLevel: 'watch', dependency: 22, radar: radar(89, 90, 68, 74, 86) },
];
export const SUPPLIER_KPIS = [
  { label: '在册供应商', raw: 186, unit: '家', change: 4, spark: sp(186) },
  { label: '高风险', raw: 1, unit: '家', change: 0, spark: [2, 2, 1, 1, 2, 1, 1] },
  { label: '平均准时率', raw: 91.4, unit: '%', change: 1.8, decimals: 1, spark: sp(91) },
  { label: '断供预警', raw: 1, unit: '家', change: 1, spark: [0, 0, 0, 1, 0, 1, 1] },
];

// ─── 通知 ────────────────────────────────────────────────────────────────────
export const ALERTS: Alert[] = [
  { level: 'danger', title: '供应商断供', msg: '示例供应商 C 食品类停产，华南补货中断', tag: '风险', time: '12:08' },
  { level: 'danger', title: '门店缺货预警', msg: '北京门店可供 1.8 天，Agent 已生成紧急调拨', tag: '库存', time: '11:42' },
  { level: 'warn', title: '补货待审', msg: '冻干礼盒紧急补货 ¥33.6 万超阈值，需确认', tag: '采购', time: '14:20' },
  { level: 'info', title: 'Agent 自动下单', msg: '储能电源 5,000 件已自动下单（置信 94%）', tag: '补货', time: '11:30' },
  { level: 'info', title: '履约达标', msg: '华东区域仓履约率 97.1%，连续 7 日达标', tag: '控制塔', time: '今天' },
];
