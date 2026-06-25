// ════════════════════════════════════════════════════════════════════════
// AI 风控中台 · 类型契约（全 mock，无后端）
// 行业锚定：银行 / 消费金融（盗刷·账户接管·套现团伙·可疑资金流·新客准入）。
// 核心差异化：① 毫秒级三态决策（放行/复核/拦截）② agentic AML 调查 ③ 可解释性合规。
// 🔒 脱敏：用「示例消费金融 / 小云 / 信用贷 / 坐席系统」，专有名一律泛化。
// ════════════════════════════════════════════════════════════════════════

// ─── Auth & RBAC（4 角色，对齐规格 02 ③）────────────────────────────────────
export type RoleId = 'risk_analyst' | 'aml_officer' | 'strategy_admin' | 'ciso';

export type PermissionKey =
  // 总览
  | 'monitor:read' | 'cockpit:read'
  // 欺诈与调查
  | 'case:read' | 'case:act' | 'network:read' | 'alert:read' | 'alert:act'
  // AML 合规
  | 'aml:read' | 'sar:read' | 'sar:write' | 'screening:read'
  // 策略与模型
  | 'strategy:read' | 'strategy:write' | 'scorecard:read' | 'explain:read'
  // 系统
  | 'datasource:read' | 'rbac:read' | 'audit:read';

export type PermCategory = 'page' | 'action' | 'data';
export interface Permission { key: PermissionKey; label: string; category: PermCategory; desc: string; }

export interface Role {
  id: RoleId; name: string; enName: string; description: string; color: string;
  landing: string;                 // 登录后默认落地路由
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

// 三态决策（数据语言核心）
export type Decision = 'pass' | 'review' | 'block';   // 放行 / 复核 / 拦截
export const DECISION_LABEL: Record<Decision, string> = { pass: '放行', review: '转人工复核', block: '拦截' };
export const DECISION_SHORT: Record<Decision, string> = { pass: '放行', review: '复核', block: '拦截' };

// ─── 5.1 实时交易监控大屏（旗舰 A）──────────────────────────────────────────
export type TxnChannel = '银行卡支付' | '快捷支付' | '账户转账' | '信用贷支用' | '提现';
export interface Txn {
  id: string;                       // 交易流水号
  ts: string;                       // HH:MM:SS
  card: string;                     // 卡尾号（脱敏 ****1234）
  amount: number;                   // 金额（元）
  channel: TxnChannel;
  city: string;
  score: number;                    // 风险评分 0-1（两位小数）
  decision: Decision;
  reason: string;                   // 命中规则/特征（讲门道）
  // 三层决策详情（抽屉）
  layers?: { rule: string; ml: string; agent: string };
}
export interface GeoPoint { city: string; lng: number; lat: number; value: number; level: Decision; }

// ─── 5.2 案件调查工作台（旗舰 B）+ 关系图谱 ─────────────────────────────────
export type RiskLevel = 'high' | 'mid' | 'low';
export interface RiskCase {
  id: string;                       // 案件号 CASE-...
  title: string;
  subject: string;                  // 主体（账户/客户）
  type: string;                     // 套现团伙 / 账户接管 / 盗刷 / 可疑资金流
  level: RiskLevel;
  amount: number;                   // 涉案金额
  score: number;                    // 风险评分
  status: '待调查' | '调查中' | '已处置' | '已上报';
  openedAt: string;
  signals: string[];                // 命中信号标签
}

// 关系图谱节点（多类型：账户/设备/IP/收款人/卡/商户）
export type NodeKind = 'account' | 'device' | 'ip' | 'payee' | 'card' | 'merchant';
export interface GraphNode {
  id: string; name: string; kind: NodeKind;
  risk?: RiskLevel;                 // 节点风险（着色）
  centrality: number;               // 中心度（决定大小）0-1
  detail?: string;
  community?: number;               // 团伙簇编号（社区发现着色，用于反欺诈关系网络）
}
export type EdgeRelation = '资金' | '共享设备' | '同 IP' | '同收款人' | '转账' | '同证件';
export interface GraphEdge { source: string; target: string; relation: EdgeRelation; weight: number; amount?: number; }

// 资金流向桑基图
export interface SankeyNode { name: string; depth?: number; }
export interface SankeyLink { source: string; target: string; value: number; }

// agent 调查时间线
export type AgentStepKind = 'retrieve' | 'correlate' | 'match' | 'reason' | 'decide' | 'report';
export interface AgentStep {
  id: string; kind: AgentStepKind; title: string; detail: string;
  ms: number;                       // 耗时
  status: 'done' | 'block' | 'running';
  evidence?: string;                // 证据卡
}

// ─── 5.4 实时预警处置中心 ───────────────────────────────────────────────────
export type DisposalAction = 'freeze' | 'verify' | 'manual' | 'pass';   // 冻结/二次验证/转人工/放行
export interface AlertTicket {
  id: string; subject: string; card: string;
  riskTag: string; level: RiskLevel; amount: number;
  slaLeft: number;                  // SLA 剩余秒
  stage: '待分诊' | '处置中' | '已结案';
  channel: string; createdAt: string;
  feedback?: 'true' | 'false';      // 处置后回填：真案 / 误报（喂再训练）
}

// ─── 5.5 AML 告警队列（agentic 分诊）────────────────────────────────────────
export type AmlRuleType = '结构化拆分' | '快进快出' | '异常对手方' | '高危地区' | '现金密集' | '可疑资金归集';
export type AmlAgentStatus = '已自动结案' | '已升级人工' | '待人工' | 'agent 处置中';
export interface AmlAlert {
  id: string;                       // 告警 ID
  subject: string;                  // 主体
  rule: AmlRuleType;
  amount: number;
  agentStatus: AmlAgentStatus;
  confidence: number;               // agent 置信度 0-1
  suggestion: string;               // agent 建议动作
  sla: string;
  checks?: { step: string; result: string }[];   // agent 已做的核查步骤
}

// ─── 5.6 SAR 可疑交易报告 ───────────────────────────────────────────────────
export interface SarField { key: string; label: string; value: string; source: 'ai' | 'human'; multiline?: boolean; }
export type SarStatus = '草稿' | '复核中' | '已上报';

// ─── 5.7 名单 / 制裁筛查 ────────────────────────────────────────────────────
export type SanctionList = 'OFAC' | 'EU' | 'UN' | 'PEP' | '央行反洗钱';
export interface ScreeningHit {
  id: string; name: string; matchName: string;
  list: SanctionList; similarity: number;        // 0-1
  country: string; reason: string;
  decision: '命中' | '疑似' | '排除';
}
export interface ScreeningTask { id: string; name: string; total: number; hits: number; status: '进行中' | '已完成'; at: string; }

// ─── 5.8 决策规则 / 策略编排器 ──────────────────────────────────────────────
export type RolloutStage = 10 | 50 | 100;
export interface Strategy {
  id: string; name: string; scene: string;        // 适用场景
  version: string; status: '生效中' | '灰度中' | '草稿' | '已下线';
  rollout: RolloutStage;                            // 灰度比例
  hitRate: number;                                  // 命中率
  blockRate: number;                                // 拦截率
  rules: { cond: string; op: string; val: string }[];   // IF 条件链
  action: Decision;
  updatedAt: string; owner: string;
}

// ─── 5.9 风险评分卡 + 模型监控 ──────────────────────────────────────────────
export interface ScoreBand { band: string; range: string; count: number; badRate: number; advice: string; }
export interface ModelHealth {
  name: string; version: string; type: '欺诈' | '信用' | 'AML';
  ks: number; auc: number; psi: number;             // 模型健康指标
  status: '健康' | '需关注' | '需再训练';
  fpr: number; fnr: number;                          // 误报率/漏报率
}
export interface PsiPoint { date: string; psi: number; }

// ─── 5.10 模型可解释性（SHAP · EU AI Act）───────────────────────────────────
export interface ShapFeature { feature: string; value: number; contribution: number; }   // +/- 贡献度

// ─── 5.11 数据源接入态 ──────────────────────────────────────────────────────
export type SourceCategory = '交易' | '设备指纹' | '行为' | '征信' | '名单' | '关系';
export interface DataSource {
  id: string; name: string; category: SourceCategory;
  status: 'connected' | 'degraded' | 'error';
  qps: number; latencyMs: number; freshness: string; coverage: number;   // 覆盖率 %
}

// ─── 5.12 审计日志（EU AI Act 可追溯）──────────────────────────────────────
export interface AuditEntry {
  id: string; time: string; actor: string; role: RoleId;
  action: string; target: string;
  decision?: Decision; modelVer?: string; strategyVer?: string;          // 审计指纹
  flagged: boolean;
}
export interface PermMatrixCell { domain: string; role: RoleId; access: 'full' | 'read' | 'none'; }

// ─── 威胁态势（市场数据立威 · 已核实，规格 ⑩）──────────────────────────────
export interface ThreatStat { label: string; value: string; sub: string; source: string; trend?: number; }
