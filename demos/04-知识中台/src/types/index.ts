// ════════════════════════════════════════════════════════════════════════
// 智库 企业知识中台 · 类型契约（全 mock,无后端）· 对标 Glean
// 核心差异化：① 权限感知（每次检索按角色 clearance 严格过滤）② 可溯源（每个答案带溯源卡片）。
// 行业锚定：金融投研 / 专业服务（研报、尽调、合规备忘录、内部沿革）。
// ════════════════════════════════════════════════════════════════════════

// ─── 权限密级（驱动检索结果与图谱可见性 · 本 demo 灵魂）─────────────────────
// 1 公开 · 2 项目 · 3 受限 · 4 机密；role.clearance >= level 才可见。
export type ClearanceLevel = 1 | 2 | 3 | 4;
export const LEVEL_LABEL: Record<ClearanceLevel, string> = { 1: '公开', 2: '项目', 3: '受限', 4: '机密' };

// ─── Auth & RBAC（4 角色，对齐规格 07 ③）────────────────────────────────────
export type RoleId = 'member' | 'knowledge_admin' | 'platform_admin' | 'compliance';

export type PermissionKey =
  | 'search:read' | 'chat:read' | 'graph:read' | 'proactive:read'
  | 'content:create' | 'agent:build' | 'agent:use'
  | 'connector:manage'
  | 'govern:read' | 'audit:read'
  | 'analytics:read';

export type PermCategory = 'page' | 'action' | 'data';
export interface Permission { key: PermissionKey; label: string; category: PermCategory; desc: string; }

export interface Role {
  id: RoleId; name: string; enName: string; description: string; color: string;
  clearance: ClearanceLevel;     // 可见密级上限（驱动检索/图谱过滤）
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
export interface Kpi { label: string; raw: number; unit?: string; change?: number; spark?: number[]; decimals?: number; }

// ─── 数据源（100+ SaaS 连接器）─────────────────────────────────────────────
export type SourceType =
  | 'Confluence' | 'Slack' | 'Google Drive' | 'SharePoint' | 'Jira'
  | 'Salesforce' | 'Notion' | 'GitHub' | 'Zendesk' | 'Box' | '内部研报库' | '会议纪要';

// ─── 5.1 统一搜索结果 ───────────────────────────────────────────────────────
export type ResultKind = '研报' | '合同' | '讨论' | '文档' | '工单' | '纪要' | '人' | '主题';
export interface SearchResult {
  id: string; title: string; source: SourceType; kind: ResultKind;
  author: string; updatedAt: string; snippet: string;   // 片段（含高亮关键词）
  level: ClearanceLevel; relevance: number;              // 相关度 0-1
  path: string;
}

// ─── 5.2 AI 答案 + 溯源 ─────────────────────────────────────────────────────
export interface Citation {
  id: string; n: number; docName: string; source: SourceType; path: string;
  author: string; updatedAt: string; level: ClearanceLevel; confidence: number; // 0-1
  snippet: string; paragraph: number;                     // 跳到原文第 X 段
}
// 答案分段：text 段 + 段末引用编号（用于渲染 [n] 角标）
export interface AnswerSegment { text: string; cites?: number[]; }
export interface ChatTurn {
  id: string; question: string; segments: AnswerSegment[];
  citations: Citation[]; confidence: number; at: string;
}

// ─── 5.3 知识图谱（人/文档/项目/主题）──────────────────────────────────────
export type NodeKind = 'person' | 'doc' | 'project' | 'topic';
export interface GraphNode {
  id: string; name: string; kind: NodeKind; level: ClearanceLevel;
  dept?: string; centrality: number;        // 中心度（决定节点大小）
  detail?: string;                          // 右栏详情
  expertOf?: string;                        // 领域专家高产领域
}
export interface GraphEdge { source: string; target: string; relation: '作者' | '引用' | '参与' | '相关' | '协作'; weight: number; }

// ─── 5.4 Agent Builder ──────────────────────────────────────────────────────
export type AgentStepKind = 'retrieve' | 'read' | 'connector' | 'generate' | 'approve' | 'notify';
export interface AgentStep { id: string; kind: AgentStepKind; name: string; ms: number; source?: string; }
export interface KbAgent {
  id: string; name: string; desc: string; status: 'published' | 'draft';
  steps: AgentStep[]; monthlyRuns: number; owner: string;
}

// ─── 5.5 连接器管理 ─────────────────────────────────────────────────────────
export type ConnStatus = 'connected' | 'available' | 'error';
export interface Connector {
  id: string; name: SourceType | string; status: ConnStatus;
  docs: number; lastSync: string; latencyMin: number; permMapped: boolean;
  indexedPct: number;                       // 索引覆盖
}
export interface SyncPoint { date: string; docs: number; }   // 增量同步面积线

// ─── 5.6 内容生成 / Canvas ──────────────────────────────────────────────────
export interface DraftSection { id: string; heading: string; body: string; cites: number[]; }

// ─── 5.7 主动情报 ───────────────────────────────────────────────────────────
export type IntelReason = '你关注的项目' | '你的领域' | '你协作的人';
export interface IntelItem {
  id: string; title: string; reason: IntelReason; type: '新文档' | '项目动态' | '专家变更';
  source: SourceType; time: string; level: ClearanceLevel; snippet: string;
}

// ─── 5.8 权限 / 治理控制台 ──────────────────────────────────────────────────
export interface AuditLog {
  id: string; time: string; actor: string; role: RoleId;
  action: '检索' | '问答' | '打开' | '导出'; query: string;
  hits: number; blocked: number;            // 命中数 / 受限被拦数
  flagged: boolean;                         // 受限访问被拦标红
}
export interface PermMatrixCell { domain: string; role: RoleId; access: 'full' | 'read' | 'none' }
export interface HeatCell { day: number; hour: number; value: number; }   // 访问热力日历
export interface GovTrendPoint { date: string; queries: number; blocked: number; }

// ─── 5.9 使用分析 + ROI ─────────────────────────────────────────────────────
export interface AdoptionPoint { date: string; wau: number; queries: number; }
export interface DeptActivity { dept: string; users: number; queries: number; adoption: number; }
export interface TopicNode { name: string; value?: number; children?: TopicNode[]; }
