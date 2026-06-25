// ════════════════════════════════════════════════════════════════════════
// AI 供应链/履约中台 · 类型契约（全 mock，无后端）
// 行业锚定：制造/零售。链路：需求预测 → 库存优化 → 补货采购 → 履约物流 → 风险预警。
// 范式：供应链控制塔 · 端到端履约网络地图（首页）+ What-if 模拟 + 库存热力 + 需求预测带区间。
// 签名：钢蓝石板暗台（主场）+ 货运琥珀（--gold 实际值 = #F0883E）。
// 🔒 脱敏：用「示例零售 / 示例制造」，仓/门店/供应商用通用名（华东中心仓/示例供应商 A），无真实雇主。
// ════════════════════════════════════════════════════════════════════════

// ─── Auth & RBAC（4 角色）────────────────────────────────────────────────
export type RoleId = 'planner' | 'inventory' | 'procurement' | 'coo';

export type PermissionKey =
  | 'tower:read'
  | 'forecast:read' | 'forecast:edit'
  | 'inventory:read'
  | 'replenish:read' | 'replenish:edit'
  | 'whatif:read'
  | 'supplier:read';

export type PermCategory = 'page' | 'action' | 'data';
export interface Permission { key: PermissionKey; label: string; category: PermCategory; desc: string; }

export interface Role {
  id: RoleId; name: string; enName: string; description: string; color: string;
  landing: string;
  permissions: PermissionKey[];
}

export interface User {
  id: string; name: string; username: string; role: RoleId;
  dept?: string; lastLogin?: string; status: 'active' | 'inactive'; note?: string;
}

export interface AuthState { user: User | null; isAuthenticated: boolean; isLoading: boolean; }

// ─── 通用 ───────────────────────────────────────────────────────────────────
export type AlertLevel = 'danger' | 'warn' | 'info';
export interface Alert { level: AlertLevel; title: string; msg: string; tag: string; time?: string; }
export interface Kpi { label: string; raw: number; unit?: string; change?: number; spark?: number[]; decimals?: number; }

// ─── 健康 4 阶（节点/库存色彩语言）─────────────────────────────────────────────
export type Health = 'ok' | 'watch' | 'low' | 'broken';
export const HEALTH_LABEL: Record<Health, string> = { ok: '正常', watch: '预警', low: '缺货', broken: '断流' };

// ─── 控制塔：端到端履约网络（旗舰 · ECharts graph 流向图）────────────────────────
export type NodeKind = 'supplier' | 'hub' | 'rdc' | 'store';   // 供应商/中心仓/区域仓/门店
export const NODE_KIND_LABEL: Record<NodeKind, string> = { supplier: '供应商', hub: '中心仓', rdc: '区域仓', store: '门店' };
export interface NetworkNode {
  id: string; name: string; kind: NodeKind;
  x: number; y: number;            // graph 坐标（0-100，地理化布局）
  health: Health;
  throughput: number;              // 日吞吐（件）
  fillRate: number;                // 履约率 %
  region: string;
}
export interface NetworkEdge {
  source: string; target: string;
  volume: number;                  // 在途量
  status: 'normal' | 'delayed' | 'congested';
}
export interface Shipment {
  id: string; route: string; from: string; to: string;
  eta: string; status: 'on_time' | 'delayed' | 'arrived';
  stage: number;                   // 0..5（采购/在途/入库/拣货/发运/签收）
  units: number;
}

// ─── 需求预测（带置信区间）──────────────────────────────────────────────────────
export interface ForecastSeries {
  sku: string; name: string; category: string;
  months: string[];
  actual: (number | null)[];       // 历史实际（未来为 null）
  forecast: (number | null)[];     // 预测（历史为 null）
  upper: (number | null)[];        // 置信上界
  lower: (number | null)[];        // 置信下界
  accuracy: number;                // 预测准确率 %
  trend: number;                   // 同比 %
}

// ─── 库存健康（热力 + 表）────────────────────────────────────────────────────────
export interface InventoryItem {
  id: string; sku: string; name: string; category: string;
  warehouse: string;
  stock: number; safetyStock: number; inTransit: number;
  daysOfSupply: number;            // 可供天数
  health: Health;
  turnover: number;                // 周转天数
}
export interface HeatCell { warehouse: string; category: string; value: number; health: Health; }  // 库存热力（仓 × 品类，可供天数）

// ─── 补货采购（工作流 + Agent 自主决策）──────────────────────────────────────────
export interface ReplenishOrder {
  id: string; sku: string; name: string;
  fromSupplier: string; toWarehouse: string;
  qty: number; unitCost: number;
  reason: string;                  // 触发原因
  status: 'agent_suggested' | 'pending' | 'approved' | 'auto_placed' | 'rejected';
  agentConfidence: number;         // Agent 置信度 %
  leadTime: number;                // 交期天
  eta: string;
}

// ─── What-if 情景模拟（拉杆 → 涟漪）──────────────────────────────────────────────
export interface WhatIfLever { id: string; label: string; min: number; max: number; value: number; unit: string; step: number; }
export interface WhatIfOutcome { label: string; base: number; sim: number; unit: string; better: 'up' | 'down'; }

// ─── 供应商风险（雷达 + 表）──────────────────────────────────────────────────────
export interface Supplier {
  id: string; name: string; category: string; region: string;
  onTimeRate: number;              // 准时交付率 %
  qualityScore: number;            // 质量分
  riskScore: number;               // 综合风险分 0-100（越高越险）
  riskLevel: Health;
  radar: { dim: string; value: number }[];   // 风险维度（交付/质量/财务/产能/合规）
  dependency: number;              // 采购依赖度 %
}

// ─── 异常流（控制塔右栏 exception feed）──────────────────────────────────────────
export type ExcKind = 'critical' | 'warn' | 'action' | 'info';
export interface ExceptionItem {
  id: string; kind: ExcKind; title: string; node: string;
  detail: string; at: string; impact: string;
}

// ─── Agent 自主补货卡点（人审）──────────────────────────────────────────────────
export interface GateItem {
  id: string; title: string; kind: '自主补货' | '紧急调拨' | '采购变更' | '供应商切换';
  agent: string;
  status: 'pending' | 'approved' | 'blocked' | 'auto';
  risk: 'high' | 'mid' | 'low';
  detail: string; reviewer?: string; at: string; amount?: string;
}
