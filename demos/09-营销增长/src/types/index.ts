// ════════════════════════════════════════════════════════════════════════
// AI 营销增长中台 · 类型契约（全 mock，无后端）
// 行业锚定：电商/零售。链路：洞察 → 多模态创意 → 多渠道投放 → AI 归因优化。
// 范式：活动排期编排泳道（首页）+ 归因桑基/漏斗/投放热力 hero + 创意工坊网格。
// 签名：Studio 亮台 + 增长品红（--gold 实际值 = #D6336C）。
// 🔒 脱敏：品牌用「示例品牌 / 焕 X / 优选优品」等通用名，无真实雇主/真实电商品牌；用户 用户****。
// ════════════════════════════════════════════════════════════════════════

// ─── Auth & RBAC（4 角色）────────────────────────────────────────────────
export type RoleId = 'growth' | 'creative' | 'media' | 'cmo';

export type PermissionKey =
  | 'campaign:read' | 'campaign:edit'
  | 'studio:read' | 'studio:edit'
  | 'cdp:read' | 'cdp:edit'
  | 'ads:read' | 'ads:edit'
  | 'attribution:read'
  | 'assets:read';

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

// ─── 渠道（多渠道投放 · 品牌点色）────────────────────────────────────────────
export type ChannelId = 'douyin' | 'wechat' | 'rednote' | 'search' | 'feed' | 'kol' | 'private';
export interface Channel {
  id: ChannelId; name: string; colorVar: string;   // --c1..c8
  spend: number; roas: number; impressions: number; clicks: number; conv: number;
  ctr: number; cvr: number;
}

// ─── 活动排期（旗舰 · 泳道）──────────────────────────────────────────────────
export type CampaignStatus = 'live' | 'draft' | 'paused' | 'done' | 'review';
export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  live: '在投', draft: '草稿', paused: '暂停', done: '已结束', review: '待审',
};
export interface CampaignPhase { kind: 'pre' | 'main' | 'post'; label: string; startCol: number; endCol: number; }  // col 0..12（按月/周网格）
export interface Campaign {
  id: string; name: string; brand: string; objective: string;   // 拉新/promo/复购/品牌
  status: CampaignStatus;
  channels: ChannelId[];
  phases: CampaignPhase[];        // 预热/正式/返场段（泳道分段）
  startCol: number; endCol: number;   // 整体在 12 格时间轴的起止
  budget: number; spent: number;  // 万元
  roas: number; roasTarget: number;
  progress: number;               // 投放进度 %
  conv: number;                   // 转化数
  owner: string;
  trend: number[];                // ROAS 近 N 日 sparkline
}

// ─── 创意工坊（多模态素材 + 品牌合规）──────────────────────────────────────────
export type CreativeType = 'image' | 'video' | 'copy' | 'banner';
export type Compliance = 'pass' | 'warn' | 'block';
export const COMPLIANCE_LABEL: Record<Compliance, string> = { pass: '合规', warn: '待复核', block: '驳回' };
export interface Creative {
  id: string; title: string; type: CreativeType;
  thumb: string;                  // 安全占位图 URL（picsum）
  channel: ChannelId; campaign: string;
  genBy: 'ai' | 'human'; model?: string;     // 生成模型
  compliance: Compliance; complianceNote?: string;
  ctr?: number; impressions?: number;
  ratio?: 'sq' | 'wide';
}

// ─── CDP 人群圈选（结构化条件构建器 · 非画布）────────────────────────────────────
export type RuleOp = '>' | '<' | '=' | '∈' | '近30天' | '近7天';
export interface SegmentRule { id: string; field: string; op: RuleOp; value: string; conj?: 'AND' | 'OR'; }
export interface Segment {
  id: string; name: string; desc: string;
  size: number;                   // 人群规模
  rules: SegmentRule[];
  source: string;                 // 来源（CDP / 上传 / Lookalike）
  updatedAt: string;
  reach: number;                  // 可触达率 %
  pinned?: boolean;
}
export interface SunburstNode { name: string; value?: number; colorVar?: string; children?: SunburstNode[]; }

// ─── 投放控制台（预算分配 + 实时调优 + 热力）────────────────────────────────────
export interface AdGroup {
  id: string; name: string; channel: ChannelId; campaign: string;
  status: 'live' | 'paused' | 'learning';
  budget: number; spent: number; roas: number; cpa: number; conv: number;
  bidStrategy: string; suggestion?: string;   // AI 调优建议
}
export interface HeatCell { channel: string; hour: string; value: number; }   // 投放热力矩阵

// ─── 归因 ROI（多触点桑基）────────────────────────────────────────────────────
export interface SankeyNode { name: string; colorVar?: string; }
export interface SankeyLink { source: string; target: string; value: number; }
export interface FunnelStage { name: string; value: number; }
export interface AttributionModel { id: string; name: string; desc: string; }   // 末次/首次/线性/时间衰减/数据驱动

// ─── A/B 实验 ────────────────────────────────────────────────────────────────
export interface ExperimentVariant { name: string; cvr: number; sample: number; isControl?: boolean; }
export interface Experiment {
  id: string; name: string; metric: string; status: 'running' | 'done' | 'draft';
  variants: ExperimentVariant[];
  lift: number; confidence: number; winner?: string;
}

// ─── 人审卡点（linear 审批队列 · 非节点画布 · 体现"90% 用 agent 仅 23% 生产化"）──
export interface GateItem {
  id: string; title: string; kind: '创意合规' | '预算变更' | '人群授权' | '自动调优';
  agent: string;                  // 触发的 agent
  status: 'pending' | 'approved' | 'blocked';
  risk: 'high' | 'mid' | 'low';
  detail: string; reviewer?: string; at: string;
}

// ─── 资产库 ────────────────────────────────────────────────────────────────────
export type AssetKind = 'image' | 'video' | 'copy' | 'template' | 'logo';
export interface Asset {
  id: string; name: string; kind: AssetKind;
  thumb?: string; tags: string[];
  usage: number;                  // 被引用次数
  size: string; updatedAt: string;
  compliance: Compliance;
}
