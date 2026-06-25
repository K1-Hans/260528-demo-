// ════════════════════════════════════════════════════════════════════════
// 智能客服运营中台 · 类型契约（全 mock，无后端）
// 形状对齐 znkf 生产系统真实数据（见 深度规格/01b-znkf功能盘点与覆盖映射.md §5）
// ════════════════════════════════════════════════════════════════════════

// ─── Auth & RBAC（4 角色，对齐 spec 01 权限矩阵）─────────────────────────────
export type RoleId = 'director' | 'knowledge' | 'compliance' | 'qa_lead';

export type PermissionKey =
  | 'dashboard:read' | 'token:read'
  | 'conv:read' | 'conv:takeover' | 'prod:read'
  | 'badcase:read' | 'badcase:write'
  | 'reject:read' | 'reject:write'
  | 'audit:read' | 'audit:export'
  | 'scenario:read' | 'scenario:write'
  | 'kb:read' | 'kb:write'
  | 'sensitive:read' | 'sensitive:write'
  | 'recycle:manage'
  | 'agents:read' | 'pipeline:test' | 'kg:review'
  | 'llm:config' | 'prompt:publish' | 'intent:read' | 'tags:read'
  | 'logs:read'
  | 'rbac:manage';

export type PermCategory = 'page' | 'action' | 'data';
export interface Permission { key: PermissionKey; label: string; category: PermCategory; desc: string; }

export interface Role {
  id: RoleId; name: string; description: string; color: string;
  permissions: PermissionKey[];
}

export interface User {
  id: string; name: string; username: string; role: RoleId;
  dept?: string; lastLogin?: string; status: 'active' | 'inactive'; note?: string;
  createdAt?: string;
}

export interface AuthState { user: User | null; isAuthenticated: boolean; isLoading: boolean; }

// ─── 通用 ───────────────────────────────────────────────────────────────────
export type KBStatus = '已生效' | '待发布' | '已下线';
export type AlertLevel = 'danger' | 'warn' | 'info';
export interface Alert { level: AlertLevel; title: string; msg: string; tag: string; time?: string; }

export interface Kpi { label: string; raw: number; unit?: string; change?: number; weekChange?: number; spark?: number[]; decimals?: number; tone?: 'good' | 'bad' | 'neutral'; }

// ─── 运营总览 / 数据看板 ─────────────────────────────────────────────────────
export interface TrendPoint { date: string; selfService: number; transfer: number; }            // 自助 vs 转人工
export interface DualTrendPoint { date: string; selfRate: number; transferRate: number; }        // 6 月双率趋势
export interface PipelineHealth { stage: string; code: string; success: number; avgMs: number; }
export interface IntentTopRow { rank: number; l1: string; l2: string; l3: string; count: number; }
export interface FlywheelNode { key: string; label: string; value: string; }

// ─── 实时对话台 / Pipeline ───────────────────────────────────────────────────
export type Emotion = 'calm' | 'upset' | 'angry';
export type RouteKind = 'qa' | 'soothe' | 'hybrid' | 'transfer';
export type PipeStageKey = 'A1' | 'A2' | 'route' | 'A3' | 'llm' | 'A4';
export type PipeStatus = 'pass' | 'block' | 'pending' | 'active';

export interface RagHit { q: string; score: number; source: string; }
export interface PipeStage {
  key: PipeStageKey; name: string; status: PipeStatus; ms: number;
  detail?: string; tags?: string[]; hits?: RagHit[]; confidence?: number;
}
export interface ChatMsg {
  id: string; role: 'user' | 'bot'; text: string; time: string;
  blocked?: boolean; blockReason?: string; source?: string; tokens?: number; thumb?: 'up' | 'down';
}
export interface Conversation {
  id: string; sessionId: string; customer: string; channel: string;
  intentL1: string; emotion: Emotion; route: RouteKind; status: '进行中' | '已转人工' | '已结束';
  lastMsg: string; startedAt: string; turns: number;
  messages: ChatMsg[]; pipeline: PipeStage[];
}

// ─── 合规审计 ────────────────────────────────────────────────────────────────
export type AuditVerdict = '通过' | '拦截' | '改写';
export type ComplianceRule = '违规承诺' | '利率虚假宣传' | '催收红线' | 'PII 泄漏' | '越权承诺' | '幻觉编造';
export interface AuditRow {
  id: string; time: string; sessionId: string; customerMsg: string; aiReply: string;
  verdict: AuditVerdict; rule?: ComplianceRule; confidence: number; reviewer: string;
}

// ─── 知识库（QA / 卡片 / 寒暄 / 转人工）───────────────────────────────────────
export interface QAItem {
  idx: number; q: string; a: string; l1: string; l2: string; l3: string;
  scenario: string; status: KBStatus; vectorized: boolean; updatedAt: string; updatedBy?: string; hits?: number;
}
export interface CardItem {
  idx: number; q: string; cardId: string; cardType: 'single' | 'multi'; scenario: string;
  l1: string; l2: string; l3: string; status: KBStatus; updatedAt: string; group?: string;
}
export interface SimpleKBItem { idx: number; q: string; a: string; status: KBStatus; updatedAt: string; }  // 寒暄 / 转人工

// ─── 问题场景 + AB 版本 ──────────────────────────────────────────────────────
export interface ScenarioVersion { id: string; name: string; tags: string[]; abGroup: string; answer: string; priority: number; enabled: boolean; }
export interface ScenarioRow {
  scenario: string; answer: string; l1: string; variantCount: number; updatedAt: string;
  status: KBStatus; effCount: number; pendCount: number; offCount: number; versions?: ScenarioVersion[];
}

// ─── 敏感词 ──────────────────────────────────────────────────────────────────
export type RiskType = '投诉维权' | '法律维权' | '金融监管' | '催收相关' | '媒体曝光' | '涉政敏感' | '合规风险' | '扬言轻生';
export interface SensitiveWord { word: string; type: RiskType; variants: string[]; status: '已启用' | '已下线'; updatedAt: string; }
export interface SWLog { time: string; action: string; word: string; type: string; detail: string; operator: string; }

// ─── 意图三级树 ──────────────────────────────────────────────────────────────
export interface IntentNode { name: string; count?: number; children?: IntentNode[]; note?: string; }

// ─── Badcase / 拒识 ──────────────────────────────────────────────────────────
export type BadcaseStatus = 'pending' | 'fixed' | 'ignored';
export type ReplySource = 'QA命中' | 'LLM生成';
export type BadReason = '回复不准确' | '语气机械' | '没有解决' | '其他';
export interface Badcase {
  id: string; query: string; answer: string; replyType: ReplySource; reason: BadReason;
  l1: string; l2: string; l3: string; time: string; status: BadcaseStatus; sessionId: string;
}
export type RejectStatus = 'pending' | 'added_qa' | 'ignored';
export interface Reject { id: string; query: string; l1: string; l2: string; l3: string; topScore: number; count: number; lastTime: string; status: RejectStatus; }

// ─── 会话日志 ────────────────────────────────────────────────────────────────
export type Tier = 'high_conf_bypass' | 'llm_controlled' | 'soft_guide' | 'hard_reject';
export interface LogTurn {
  id: string; sessionId: string; query: string; answer: string; intent: string;
  emotion: Emotion; route: RouteKind; ragHit: boolean; topScore: number; source: string; totalMs: number; tier: Tier; time: string;
}
export interface LogSession { sessionId: string; turns: number; firstTime: string; lastTime: string; intent: string; hitRate: number; avgMs: number; firstMsg: string; }

// ─── Token 用量 ──────────────────────────────────────────────────────────────
export interface AgentTokenDist { agent: string; tokens: number; pct: number; }
export interface TokenTrendPoint { date: string; tokens: number; cost: number; }

// ─── 智能体 / LLM / Prompt ───────────────────────────────────────────────────
export interface LLMProvider { id: string; name: string; model: string; status: '就绪' | '缺 Key' | '已禁用'; local: boolean; costPer1k: number; latencyMs: number; }
export interface AgentAssign { agent: string; key: string; provider: string; model: string; temp: number; }
export interface PromptVersion { version: string; content: string; updatedAt: string; updatedBy: string; note: string; active?: boolean; }
export interface PromptKind { key: 'qa' | 'intent' | 'soothe'; label: string; activeVersion: string; temp: number; model: string; versions: PromptVersion[]; }
export interface AgentNode { key: PipeStageKey; name: string; desc: string; model?: string; rules?: string[]; }

// ─── 标签 ────────────────────────────────────────────────────────────────────
export interface TagDef { id: string; name: string; group: string; sourceStatus: '已启用' | '已停用'; }

// ─── Pipeline 测试 / 知识补齐 ────────────────────────────────────────────────
export interface TestRun {
  id: string; note: string; cases: number; rounds: number; manualAcc: number; autoAcc: number;
  complianceFlips: number; markProgress: number; mode: '准确率' | '冒烟' | '严格'; time: string; p90: number;
}
export interface TestCase { id: string; dimension: string; question: string; actual?: string; autoVerdict?: '通过' | '不通过' | '把握不准'; manualMark?: '通过' | '不通过' | '未标'; }
export type KGType = 'A合规违反' | 'B必答缺失' | 'C答非所问' | 'D知识缺失' | 'E语气格式' | 'F内域拒识';
export type KGStatus = 'pending' | 'accepted' | 'rejected' | 'ignored' | 'borderline';
export type KGAction = 'fix_existing' | 'append_variants' | 'create_new';
export interface KGSuggestion {
  id: string; type: KGType; status: KGStatus; rootCause: string; query: string;
  action: KGAction; oldAnswer?: string; newAnswer?: string; variants?: string[]; l1?: string;
}

// ─── 检索引擎状态（智能体管理页 banner）─────────────────────────────────────
export interface EmbedStatus { phase: 'ready' | 'incremental' | 'full_rebuild' | 'failed'; current: number; total: number; model: string; }
