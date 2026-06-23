// ════════════════════════════════════════════════════════════════════════
// AI 数据中台 · 类型契约（全 mock，无后端）
// 行业锚定：金融（AUM / 不良率 / 获客成本 / 留存 / 交易额）。
// 灵魂：NL 问数 → 语义层/text-to-SQL 确定性查询 → 可信结果。"答不了报错，绝不返回错数"。
// 范式：问数 notebook（cell 式 · 锚 Hex/Cortex Analyst/ThoughtSpot），非 ④ 自由图谱画布。
// 🔒 脱敏：机构用「示例银行 / 示例消金」，无真实机构名/真客户数据。
// ════════════════════════════════════════════════════════════════════════

// ─── Auth & RBAC（4 角色）────────────────────────────────────────────────
export type RoleId = 'analyst' | 'data_engineer' | 'data_governor' | 'exec';

export type PermissionKey =
  | 'ask:read' | 'ask:run'
  | 'semantic:read' | 'semantic:edit'
  | 'history:read'
  | 'lineage:read'
  | 'governance:read' | 'governance:edit'
  | 'metrics:read';

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

// ─── 可信度 4 阶（灵魂 · 页面色彩语言）──────────────────────────────────────
export type Confidence = 'covered' | 'partial' | 'out' | 'refused';
export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  covered: '已覆盖语义层', partial: '部分覆盖', out: '超语义层范围', refused: '拒答 · 不返回错数',
};
export const CONFIDENCE_DESC: Record<Confidence, string> = {
  covered: '查询命中受治理语义层，结果确定可信、可溯源到指标定义',
  partial: '部分字段命中语义层，余下走 text-to-SQL，已标注不确定项',
  out: '问题超出当前语义层建模范围，结果仅供参考，建议补建模型',
  refused: '无法生成可信查询，按"答不了报错"原则拒答，绝不返回可能错误的数字',
};

// ─── 图表类型 ─────────────────────────────────────────────────────────────────
export type ChartKind = 'bar' | 'line' | 'pie' | 'table' | 'kpi' | 'area';

// ─── 旗舰：问数 notebook · cell ────────────────────────────────────────────────
export interface ResultColumn { key: string; label: string; type: 'dim' | 'measure'; }
export interface QueryResult {
  columns: ResultColumn[];
  rows: (string | number)[][];
  chart: ChartKind;                 // 自动渲染图表类型
  chartData?: { name: string; value: number }[];   // 简化图数据
  summary?: string;                 // 一句话结论
}
export interface SemanticRef { entity: string; field: string; kind: 'dim' | 'measure' | 'entity'; }
export interface QueryCell {
  id: string;
  question: string;                 // NL 问数
  user: string;
  at: string;
  confidence: Confidence;
  sql: string;                      // 生成的 SQL（透明可编辑）
  semanticRefs: SemanticRef[];      // 命中的语义层字段
  result?: QueryResult;             // covered/partial/out 有结果；refused 无
  refusedReason?: string;           // 拒答原因
  pinned?: boolean;                 // 已 pin 到看板
  elapsedMs: number;
  followups?: string[];             // 建议追问
}

// ─── 语义层建模 ────────────────────────────────────────────────────────────────
export type SemKind = 'entity' | 'dimension' | 'measure';
export interface SemanticField {
  name: string; sqlName: string; kind: SemKind;
  dataType: string; desc: string;
  table: string;                    // 物理表
  governed: boolean;                // 已治理/认证
}
export interface SemanticEntityGroup {
  entity: string; label: string; table: string; desc: string;
  rowCount: string;                 // 数据量级
  fields: SemanticField[];
  coverage: number;                 // 语义层覆盖率
}

// ─── 查询历史 ────────────────────────────────────────────────────────────────
export interface QueryHistoryRow {
  id: string; question: string; user: string; role: string; at: string;
  confidence: Confidence; rows: number; elapsedMs: number;
  pinned: boolean; rerun: number;   // 被复跑次数
}

// ─── 数据血缘（DAG · 结构化左→右）──────────────────────────────────────────────
export type LineageKind = 'source' | 'model' | 'metric';
export interface LineageNode {
  id: string; name: string; kind: LineageKind; layer: number;   // layer 0=源 1=明细 2=汇总 3=指标
  table: string; freshness: string; owner: string;
  health: 'ok' | 'stale' | 'broken';
}
export interface LineageEdge { from: string; to: string; }

// ─── 权限治理（行列级 + 脱敏）──────────────────────────────────────────────────
export type MaskType = '无' | '掩码' | '哈希' | '行级过滤' | '禁止访问';
export interface GovPolicy {
  id: string; resource: string; field: string;
  classification: '公开' | '内部' | '敏感' | '机密';
  mask: MaskType;
  appliesTo: string[];              // 适用角色
  desc: string;
}
export interface GovAudit { id: string; user: string; action: string; resource: string; at: string; level: AlertLevel; }

// ─── 指标库 ────────────────────────────────────────────────────────────────────
export interface MetricDef {
  id: string; name: string; enName: string;
  definition: string;               // 口径定义
  formula: string;                  // 计算公式
  owner: string; domain: string;
  value: number; unit: string; decimals: number;
  change: number;                   // 环比
  freshness: string;                // 数据新鲜度
  certified: boolean;               // 认证指标（金标准）
  spark: number[];
}
