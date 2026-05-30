// ─── Auth & RBAC ────────────────────────────────────────────────────────────
export type RoleId = 'director' | 'analyst' | 'regional_sales' | 'viewer';

export type PermissionKey =
  | 'strategy:read' | 'strategy:write'
  | 'data:read' | 'data:export'
  | 'competitor:read' | 'competitor:write'
  | 'subsidy:read' | 'subsidy:write'
  | 'voc:read' | 'voc:write'
  | 'ai:query'
  | 'users:manage' | 'roles:manage'
  | 'reports:read' | 'reports:write'
  | 'ops:read' | 'ops:write'
  | 'knowledge:read' | 'knowledge:write'
  | 'projects:read' | 'projects:write';

export type PermCategory = 'page' | 'action' | 'data';

export interface Permission { key: PermissionKey; label: string; category: PermCategory; desc: string; }

export interface Role {
  id: RoleId; name: string; description: string; color: string;
  permissions: PermissionKey[];
}

export interface User {
  id: string; name: string; email: string; role: RoleId;
  region?: string; models?: string[]; lastLogin?: string;
  status: 'active' | 'inactive'; dept?: string;
}

export interface AuthState { user: User | null; isAuthenticated: boolean; isLoading: boolean; }

// ─── Command / Overview ─────────────────────────────────────────────────────
export interface Metric { label: string; value: string; raw: number; change: number; unit?: string; spark?: number[]; }
export interface FunnelStage { stage: string; value: number; }
export interface ModelProgress { model: string; target: number; actual: number; color: string; }
export interface RegionPerf { region: string; orders: number; completion: number; }
export interface Alert { level: 'danger' | 'warn' | 'info'; title: string; msg: string; tag: string; }
export interface TrendPoint { date: string; orders: number; delivery: number; }

// ─── Goals (BP / 月度目标) ──────────────────────────────────────────────────
export interface GoalRow {
  model: string; bpAnnual: number; monthlyTarget: number; monthlyActual: number;
  ytd: number; ytdTarget: number; source: '手工Excel' | '内部API';
}

// ─── Ops 操盘动作 ───────────────────────────────────────────────────────────
export interface OpsAction {
  id: string; title: string; region: string; owner: string;
  status: 'todo' | 'doing' | 'done' | 'risk'; impact: 'high' | 'mid' | 'low';
  due: string; progress: number; desc: string;
}

// ─── Market 五看 ────────────────────────────────────────────────────────────
export interface MarketView { key: string; title: string; insight: string; metrics: { label: string; value: string; change?: number }[]; }

// ─── Competitor ─────────────────────────────────────────────────────────────
export interface CompetitorModel {
  id: string; brand: string; model: string; price: number; segment: string;
  range?: number; monthlyVolume?: number; trend?: 'up' | 'down' | 'stable'; trendPct?: number;
  tags: string[]; orderSource?: '手工Excel'; spark?: number[];
}
export interface CompetitorStore {
  id: string; brand: string; city: string; count: number; newThisMonth: number;
  lat: number; lng: number; source: '官网抓取';
}

// ─── Subsidy ────────────────────────────────────────────────────────────────
export interface SubsidyPolicy {
  id: string; city: string; province: string; amount: number; maxAmount: number;
  validFrom: string; validTo: string; conditions: string; targetModels: string[];
  status: 'active' | 'expired' | 'upcoming'; source: string; updatedAt: string;
  lat?: number; lng?: number;
}

// ─── VOC 用户声音 ───────────────────────────────────────────────────────────
export type VocPlatform = '小红书' | '微博' | '懂车帝' | '汽车之家' | '易车' | '试驾录音';
export type Sentiment = 'positive' | 'neutral' | 'negative';
export interface VocPost {
  id: string; platform: VocPlatform; author: string; content: string;
  sentiment: Sentiment; model: string; topic: string; likes: number; time: string;
}
export interface VocTopic { topic: string; count: number; sentiment: Sentiment; }
export interface VocTranscript {
  id: string; store: string; advisor: string; customer: string; duration: string;
  model: string; sentiment: Sentiment; summary: string; keywords: string[]; time: string;
}

// ─── Knowledge ──────────────────────────────────────────────────────────────
export interface KnowledgeDoc {
  id: string; title: string; category: string; tags: string[]; author: string;
  updatedAt: string; views: number; excerpt: string; pinned?: boolean;
}

// ─── Projects ───────────────────────────────────────────────────────────────
export interface ProjectTask {
  id: string; title: string; status: 'backlog' | 'doing' | 'review' | 'done';
  owner: string; priority: 'P0' | 'P1' | 'P2'; due: string; tags: string[];
}

// ─── Chat ───────────────────────────────────────────────────────────────────
export interface Citation { source: string; detail: string; }
export interface ChatMessage {
  id: string; role: 'user' | 'assistant'; content: string;
  timestamp: Date; isStreaming?: boolean; citations?: Citation[];
}
