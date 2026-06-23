// ════════════════════════════════════════════════════════════════════════
// 云枢 LLMOps 运营中台 · 类型契约（全 mock,无后端）
// 行业锚定：AI 应用上线后运营操作系统 — prompt 管理 + tracing/observability + eval + 成本监控
// 埋点字段贴 OpenTelemetry GenAI 语义约定（gen_ai.request.model / gen_ai.usage.* …）。
// ════════════════════════════════════════════════════════════════════════

// ─── Auth & RBAC（4 角色,对齐规格 06 ③ 权限矩阵）────────────────────────────
export type RoleId = 'owner' | 'engineer' | 'annotator' | 'finops';

export type PermissionKey =
  | 'overview:read'
  | 'tracing:read' | 'tracing:write'
  | 'monitor:read'
  | 'dataset:read' | 'eval:read' | 'eval:write'
  | 'annotation:read' | 'annotation:write'
  | 'prompt:read' | 'prompt:write' | 'prompt:approve'
  | 'cost:read' | 'cost:manage'
  | 'alert:read' | 'alert:write'
  | 'settings:read' | 'rbac:manage';

export type PermCategory = 'page' | 'action' | 'data';
export interface Permission { key: PermissionKey; label: string; category: PermCategory; desc: string; }

export interface Role {
  id: RoleId; name: string; enName: string; description: string; color: string;
  permissions: PermissionKey[];
}

export interface User {
  id: string; name: string; username: string; role: RoleId;
  dept?: string; lastLogin?: string; status: 'active' | 'inactive'; note?: string; createdAt?: string;
}

export interface AuthState { user: User | null; isAuthenticated: boolean; isLoading: boolean; }

// ─── 通用 ───────────────────────────────────────────────────────────────────
export type AlertLevel = 'danger' | 'warn' | 'info';
export interface Alert { level: AlertLevel; title: string; msg: string; tag: string; time?: string; }
export interface Kpi { label: string; raw: number; unit?: string; change?: number; spark?: number[]; decimals?: number; tone?: 'good' | 'bad' | 'neutral' | 'cost'; }

// ─── 生态枚举（真实模型 / 应用 / span 类型）──────────────────────────────────
export type ModelId = 'gpt-4o' | 'gpt-4o-mini' | 'claude-3.5-sonnet' | 'Qwen2.5-72B' | '自研-credit-7B';
export type AppId = 'svc-assistant' | 'credit-qa' | 'contract-extract' | 'collection-qc' | 'product-reco';
export interface AppMeta { id: AppId; name: string; desc: string; }
export interface ModelMeta { id: ModelId; name: string; vendor: string; inPer1k: number; outPer1k: number; }  // $/1k tokens

// ─── 5.1 调用链 Tracing（瀑布）──────────────────────────────────────────────
export type SpanKind = 'retrieve' | 'prompt' | 'llm' | 'tool' | 'parse' | 'guard';
export type TraceStatus = 'ok' | 'error' | 'slow';
export interface Span {
  id: string; name: string; kind: SpanKind;
  startMs: number; durMs: number;          // 相对 trace 起点偏移 + 耗时
  tokensIn?: number; tokensOut?: number; costUsd?: number; model?: ModelId;
  status: TraceStatus; critical?: boolean;  // 关键路径
  detail?: string;                          // prompt/completion 原文片段
  attrs?: Record<string, string | number>;  // OTel 属性
}
export interface TraceRecord {
  id: string; traceId: string; app: AppId; model: ModelId;
  endpoint: string; latencyMs: number; tokensIn: number; tokensOut: number;
  costUsd: number; status: TraceStatus; promptVersion: string; time: string;
  spans: Span[];
}
export interface HistoBucket { ms: number; count: number; }   // latency 直方

// ─── 5.2 在线监控（实时时序）────────────────────────────────────────────────
export interface MonitorPoint { t: string; qps: number; p95: number; p50: number; errRate: number; cacheHit: number; tokensK: number; }

// ─── 5.3 Eval 数据集 + 评分看板 ─────────────────────────────────────────────
export type DatasetSource = '线上trace沉淀' | '人工构造' | '混合';
export interface Dataset {
  id: string; name: string; app: AppId; source: DatasetSource;
  cases: number; lastRunScore?: number; lastRunAt?: string; golden: number;
}
export type EvalDimension = '相关性' | '忠实度' | '有害性' | '格式合规' | '简洁度';
export interface EvalCase { id: string; input: string; expected?: string; tags: string[]; }
export interface ScoreCell { row: string; dim: EvalDimension; score: number; regressed?: boolean; }  // 热力矩阵单元
export interface EvalRun {
  id: string; dataset: string; judge: ModelId; subject: string;   // 被评对象 = prompt 版本/模型
  at: string; overall: number; dims: Record<EvalDimension, number>;
}
export interface RadarSeries { name: string; values: Record<EvalDimension, number>; }

// ─── 5.4 人工标注队列 ───────────────────────────────────────────────────────
export type AnnoStatus = 'pending' | 'mine' | 'arbitrated';
export interface AnnoTask {
  id: string; traceRef: string; app: AppId; dataset: string;
  judgeScore: number; judgeConfidence: number;     // judge 低置信进队列
  status: AnnoStatus; input: string; output: string;
  humanScore?: number; labels?: string[]; note?: string;
  disagree?: boolean;                                // 双标分歧 → 仲裁
}
export interface AnnoThroughput { date: string; count: number; kappa: number; }  // 吞吐 + 一致性

// ─── 5.5 Prompt 版本库 + diff + 回滚 ────────────────────────────────────────
export type PromptStatus = 'prod' | 'canary' | 'archived' | 'draft';
export interface PromptVersion {
  id: string; app: AppId; version: string; status: PromptStatus; canaryPct?: number;
  author: string; at: string; message: string; body: string;
  score: number; costPer1k: number; errRate: number;    // 上线后指标卡
}
export type DiffOp = 'same' | 'add' | 'del';
export interface DiffLine { op: DiffOp; text: string; }
export interface VersionMetricPoint { at: string; version: string; score: number; costPer1k: number; regress?: boolean; }

// ─── 5.6 A-B 实验 & Playground ──────────────────────────────────────────────
export type ExpStatus = 'running' | 'concluded' | 'paused';
export interface Experiment {
  id: string; name: string; app: AppId; status: ExpStatus;
  armA: string; armB: string; trafficA: number; trafficB: number;
  scoreA: number; scoreB: number; costA: number; costB: number; p95A: number; p95B: number;
  significance: number; winner?: 'A' | 'B' | 'tie'; startedAt: string;
}
export interface PlaygroundResult { arm: 'A' | 'B'; version: string; output: string; tokens: number; latencyMs: number; costUsd: number; }

// ─── 5.7 成本仪表盘 ─────────────────────────────────────────────────────────
export type CostDim = 'model' | 'app' | 'team' | 'user';
export interface CostSlice { key: string; label: string; usd: number; pct: number; tokensK: number; trend: number; }
export interface CostStackPoint { date: string; values: Record<string, number>; }   // 按模型堆叠
export interface BudgetState { mtdUsd: number; budgetUsd: number; forecastUsd: number; burnIdeal: number[]; burnActual: number[]; days: string[]; }
export interface CostNode { name: string; value?: number; children?: CostNode[]; }   // 旭日/树图下钻

// ─── 5.8 告警中心 ───────────────────────────────────────────────────────────
export type AlertRuleType = '质量回归' | '输出漂移' | '成本超限' | '错误率' | '延迟';
export type AlertChannel = '飞书' | '企业微信' | '邮件' | 'PagerDuty';
export type RuleStatus = 'active' | 'muted';
export interface AlertRule {
  id: string; name: string; type: AlertRuleType; condition: string;
  channels: AlertChannel[]; status: RuleStatus; triggered: number;
}
export type EventState = 'firing' | 'acked' | 'resolved';
export interface AlertEvent {
  id: string; ruleType: AlertRuleType; severity: AlertLevel; title: string;
  detail: string; at: string; state: EventState; app: AppId;
  jumpTo?: string;     // 一键跳 trace / diff
}

// ─── 设置 · 应用接入 / 模型注册 ─────────────────────────────────────────────
export interface Integration { app: AppId; sdk: string; status: 'connected' | 'pending'; lastSeen: string; spansToday: number; }
