// ════════════════════════════════════════════════════════════════════════
// AI 质检中台 · 类型契约（全 mock，无后端）
// 行业锚定：消费金融客服合规质检 · 100% 全量 AI 质检 · 转写逐句标注 + 多-agent 流水线
// ════════════════════════════════════════════════════════════════════════

// ─── Auth & RBAC（4 角色，对齐 spec 03 ③ 权限矩阵）────────────────────────────
export type RoleId = 'qa' | 'qa_lead' | 'compliance' | 'agent';

export type PermissionKey =
  | 'dashboard:read'
  | 'list:read' | 'list:all' | 'replay:read'
  | 'workbench:read'
  | 'scorecard:read' | 'scorecard:edit'
  | 'pipeline:read'
  | 'alert:read' | 'coach:read'
  | 'perf:read'
  | 'review:create' | 'review:judge'
  | 'appeal:create' | 'appeal:judge'
  | 'coverage:read'
  | 'report:read' | 'report:export'
  | 'retention:read' | 'retention:manage'
  | 'rbac:manage';

export type PermCategory = 'page' | 'action' | 'data';
export interface Permission { key: PermissionKey; label: string; category: PermCategory; desc: string; }

export interface Role {
  id: RoleId; name: string; description: string; color: string;
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
export interface Kpi { label: string; raw: number; unit?: string; change?: number; weekChange?: number; spark?: number[]; decimals?: number; tone?: 'good' | 'bad' | 'neutral'; }

// ─── 业务枚举（消金质检）─────────────────────────────────────────────────────
export type BusinessLine = '提前结清' | '注销合规' | '银行卡管理' | '逾期催收' | '产品咨询' | 'S客户路由';
export type Channel = '通话' | '在线' | '邮件' | 'Bot';
export type RiskLevel = 'high' | 'mid' | 'low';
export type Emotion = 'calm' | 'happy' | 'upset' | 'angry';

// ─── 全量对话/通话质检记录（5.1 列表）───────────────────────────────────────
export type InspectionStatus = 'ai_done' | 'pending_review' | 'reviewed' | 'appealing' | 'archived';
export interface InspectionRecord {
  id: string; sessionId: string; agent: string; agentId: string;
  businessLine: BusinessLine; channel: Channel;
  totalScore: number; violations: number; emotionPeak: Emotion;
  durationSec: number; status: InspectionStatus; risk: RiskLevel; time: string;
}

// ─── 转写时间轴逐句（5.2 旗舰工作台左栏）────────────────────────────────────
export type Speaker = 'agent' | 'customer';
export type SegKind = 'normal' | 'violation' | 'compliant' | 'risk' | 'silence' | 'overlap';
export interface TranscriptSeg {
  id: string; speaker: Speaker; text: string;
  startMs: number; endMs: number; kind: SegKind;
  ruleHit?: string; emotion?: Emotion; note?: string;
  scoreItemId?: string;   // 点句联动右侧评分项
}

// ─── 质检评分卡（5.2 右栏 + 5.3 配置器）─────────────────────────────────────
export type ScoreEngine = 'rule' | 'llm';
export type ScoreGroup = '合规项' | '服务项' | '主观项';
export interface ScoreItem {
  id: string; name: string; group: ScoreGroup; engine: ScoreEngine;
  weight: number; hit: boolean; deduction: number;
  evidence?: string; prompt?: string; segId?: string;
}
export interface Scorecard { sessionId: string; total: number; items: ScoreItem[]; }
// 配置器规则库
export interface ScoreRule { id: string; name: string; group: ScoreGroup; engine: ScoreEngine; weight: number; desc: string; prompt?: string; }

// ─── 多-agent 质检流水线（5.4 ★ Hans 方案灵魂）──────────────────────────────
export type QAStageStatus = 'done' | 'running' | 'pending';
export interface QAPipeStage {
  key: string; name: string; status: QAStageStatus; ms: number; detail?: string;
}
export interface SubAgent {
  key: string; name: string; desc: string; accuracy: number;
  local: boolean; model: string; monthlyCloudCost: number; monthlyLocalCost: number;
}

// ─── 情感/静默/抢话曲线（5.2 图表②）────────────────────────────────────────
export interface EmotionPoint { sec: number; agent: number; customer: number; silence?: boolean; overlap?: boolean; }

// ─── 实时质检预警流（5.5）────────────────────────────────────────────────────
export type AlertType = '禁语命中' | '未告知' | '情绪激化' | '承诺越权' | '静默超时';
export interface RtAlert {
  id: string; time: string; sessionId: string; agent: string;
  type: AlertType; severity: 'high' | 'mid' | 'low'; channel: Channel;
  snippet: string; suggestion?: string;
}

// ─── 坐席绩效排行 + 雷达（5.6）──────────────────────────────────────────────
export interface AgentRadar { compliance: number; empathy: number; resolve: number; norm: number; efficiency: number; }
export interface AgentPerf {
  id: string; name: string; team: string;
  complianceScore: number; serviceScore: number; appealSuccess: number; inspected: number;
  trend: number[]; radar: AgentRadar;
}

// ─── 复核 / 申诉工作流（5.7）────────────────────────────────────────────────
export type AppealStage = 'pending_review' | 'reviewing' | 'appealing' | 'final' | 'archived';
export type Verdict = '违规成立' | '部分成立' | '改判通过' | '驳回';
export interface AppealCase {
  id: string; sessionId: string; agent: string; businessLine: BusinessLine;
  stage: AppealStage; originalScore: number; disputeItem: string;
  originalVerdict: string; reviewOpinion?: string; finalVerdict?: Verdict;
  evidence: string; createdAt: string; reviewer?: string;
}

// ─── 合规话术覆盖率（5.8 双录刚需）──────────────────────────────────────────
export interface ComplianceItem { id: string; name: string; required: boolean; coverage: number; total: number; missing: number; }

// ─── 留存与审计（5.x 系统 · 10 年留存）──────────────────────────────────────
export interface AuditEvent { time: string; actor: string; action: string; target: string; }
export interface RetentionRecord {
  sessionId: string; businessLine: BusinessLine; channel: Channel;
  recordedAt: string; retainUntil: string; sizeMb: number; integrity: 'sealed' | 'ok'; events: number;
}

// ─── 看板 / 报表趋势 ────────────────────────────────────────────────────────
export interface TrendPoint { date: string; pass: number; violation: number; }
export interface ReportTrendPoint { date: string; passRate: number; violationRate: number; }
export interface RiskNode { name: string; value?: number; children?: RiskNode[]; }   // 旭日图
export interface HeatCell { hour: number; line: BusinessLine; value: number; }        // 预警时段热力
