// ════════════════════════════════════════════════════════════════════════
// AI 外呼/语音中台 · 类型契约（全 mock，无后端）
// 行业锚定：消费金融（信用卡激活回访 / 逾期 M1 提醒 / 理财回访 / NPS 满意度）。
// 核心差异化：① 实时坐席墙作战感 ② LLM 语音 agent 对话 ③ 合规(频控/资质/留痕)。
// 🔒 脱敏：用「示例消费金融 / 小云 / 信用贷 / 坐席系统 / 400-800-1234」，专有名泛化。
// ════════════════════════════════════════════════════════════════════════

// ─── Auth & RBAC（4 角色，对齐规格 05 ③）────────────────────────────────────
export type RoleId = 'campaign_ops' | 'script_designer' | 'compliance_qa' | 'biz_lead';

export type PermissionKey =
  | 'monitor:read'
  | 'campaign:read' | 'campaign:manage'
  | 'handoff:read' | 'handoff:act'
  | 'script:read' | 'script:edit'
  | 'voice:read' | 'voice:edit'
  | 'records:read'
  | 'funnel:read' | 'abtest:read'
  | 'compliance:read' | 'compliance:act'
  | 'numbers:read' | 'numbers:manage'
  | 'settings:read';

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

// 回访场景（消金四类 · 克制回访口吻，非电销）
export type CampaignScene = '信用卡激活回访' | '逾期 M1 提醒' | '理财到期回访' | 'NPS 满意度回访' | '额度提升告知' | '还款日提醒';

// ─── 5.1 实时通话监控墙（旗舰）· 坐席 / 通话状态 ────────────────────────────
export type CallState = 'dialing' | 'ringing' | 'talking' | 'wrap';   // 拨号中/振铃/通话中/小结
export const CALL_STATE_LABEL: Record<CallState, string> = { dialing: '拨号中', ringing: '振铃', talking: '通话中', wrap: '小结' };
export interface AgentSeat {
  id: string; agentNo: string;          // 坐席编号 #A07
  customer: string;                     // 客户脱敏 138****2841
  scene: CampaignScene;
  state: CallState;
  durationSec: number;                  // 通话计时
  intent?: string;                      // 当前意图
  sentiment?: Sentiment;
}

// ─── 转写（双气泡时间轴 · M1/M6 复用）──────────────────────────────────────
export type Sentiment = 'pos' | 'neu' | 'neg';   // 正向/中性/负向
export const SENTIMENT_LABEL: Record<Sentiment, string> = { pos: '正向', neu: '中性', neg: '负向' };
export interface TranscriptTurn {
  id: string;
  speaker: 'ai' | 'cust';               // AI 翡翠 / 客户灰
  text: string;
  at: string;                           // 00:14 通话内时点
  intent?: string;                      // 意图 tag
  emotion?: Sentiment;
  sensitive?: boolean;                  // 命中敏感词（琥珀高亮）
  silence?: boolean;                    // 静默
  bargeIn?: boolean;                    // 客户抢话/打断
}

// ─── 5.2 外呼任务/活动调度台 ────────────────────────────────────────────────
export type CampaignStatus = '草稿' | '审核中' | '进行中' | '暂停' | '完成';
export interface Campaign {
  id: string; name: string; scene: CampaignScene;
  listCount: number; dialed: number; connected: number; converted: number;
  concurrency: number;                  // 并发上限
  status: CampaignStatus;
  dndWindow: string;                    // 勿扰时段 21:00–09:00
  dailyCap: number;                     // 单号每日触达上限
  compliancePass: boolean;              // 合规三灯是否全过
  owner: string; updatedAt: string;
}

// ─── 5.3 坐席协同 · 转人工队列 ──────────────────────────────────────────────
export type HandoffReason = '大额业务' | '投诉敏感词' | '三次未识别意图' | '客户要求人工' | '合规复核';
export interface HandoffTicket {
  id: string; customer: string; scene: CampaignScene;
  reason: HandoffReason; waitSec: number;
  summary: string;                      // AI 上下文摘要
  collected: string[];                  // AI 已收集字段
  status: '排队中' | '已接管' | '已完成';
  agent?: string;                       // 接管坐席
}

// ─── 5.4 话术流编排器（对话树）──────────────────────────────────────────────
export type ScriptNodeKind = 'open' | 'understand' | 'branch' | 'tts' | 'collect' | 'handoff' | 'hangup';
export const SCRIPT_NODE_LABEL: Record<ScriptNodeKind, string> = {
  open: '开场白', understand: 'LLM 理解', branch: '条件分支', tts: 'TTS 播报', collect: '采集字段', handoff: '转人工', hangup: '挂机',
};
export interface ScriptNode {
  id: string; kind: ScriptNodeKind; title: string;
  x: number; y: number;                 // 画布坐标
  detail?: string;                      // prompt / 话术
  intents?: string[];                   // 可选意图（understand/branch）
}
export interface ScriptEdge { source: string; target: string; label?: string; }
export interface PathShare { path: string; value: number; }   // 话术路径桑基占比

// ─── 5.5 语音/音色配置（TTS）────────────────────────────────────────────────
export interface VoiceProfile {
  id: string; name: string; gender: '女声' | '男声';
  style: string;                        // 沉稳 / 亲和 / 标准客服
  warmth: number; formality: number; speed: number;   // 0-100 滑块
  completionRate: number;               // 试听完播率
  hangupRate: number;                   // 客户挂断率
}

// ─── 5.6 通话记录 · 转写回放 ────────────────────────────────────────────────
export type CallResult = '激活成功' | '回访完成' | '已提醒' | '无人接听' | '拒接回访' | '转人工';
export interface CallRecord {
  id: string; customer: string; scene: CampaignScene;
  result: CallResult; durationSec: number; at: string;
  sensitiveHit: boolean; handedOff: boolean;
  sentimentCurve: number[];             // 情绪曲线（-1..1）
  summary: string; fields: { k: string; v: string }[];
  transcript: TranscriptTurn[];
}

// ─── 5.7 线索评分与转化漏斗 ─────────────────────────────────────────────────
export interface FunnelStage { stage: string; value: number; }
export interface LeadScoreRow {
  id: string; customer: string; scene: CampaignScene;
  score: number; grade: 'A' | 'B' | 'C'; advice: string;
  connected: boolean; effective: boolean; intent: boolean;
}
export interface ScoreDim { dim: string; weight: number; }

// ─── 5.8 数据回流 · 话术 A/B ────────────────────────────────────────────────
export interface AbVariant {
  id: string; name: string;            // A 版 / B 版
  opening: string; objection: string;  // 开场白 / 异议处理
  connectRate: number; intentRate: number; convRate: number;
  sample: number;
}
export interface AbTrendPoint { date: string; a: number; b: number; }

// ─── 5.9 合规与质检中心（金融差异化核心）────────────────────────────────────
export interface FreqStat { label: string; used: number; cap: number; }   // 频控配额
export interface SensitiveWord { word: string; category: '投诉' | '骚扰' | '诱导' | '违禁'; hits: number; action: '警告' | '转人工' | '挂断' | '封活动'; }
export type ComplianceEventType = '频控拦截' | '勿扰拦截' | '敏感词命中' | '号码风险' | '资质临期';
export interface ComplianceEvent { id: string; type: ComplianceEventType; detail: string; at: string; level: AlertLevel; }
export interface ComplianceRadar { dim: string; value: number; }   // 合规风险五维
export interface InterceptTrend { date: string; freq: number; dnd: number; sensitive: number; }

// 合规三灯（频控余量 / 静默时段 / 资质有效期 · 三灯全绿才能发起活动）
export type LightState = 'on' | 'warn' | 'off';
export interface ComplianceLight { key: string; label: string; state: LightState; detail: string; }

// ─── 5.10 号码/线路 · 外显号资质管理 ────────────────────────────────────────
export interface NumberAsset {
  id: string; number: string; region: string;
  todayCalls: number; connectRate: number; riskScore: number;   // 封号风险 0-100
  status: 'healthy' | 'risk' | 'disabled';
}
export interface LineProvider {
  id: string; name: string; license: string; expireAt: string;
  certified: boolean; connectRate: number; numbers: number;
}
