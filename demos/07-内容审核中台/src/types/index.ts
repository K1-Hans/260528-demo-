// ════════════════════════════════════════════════════════════════════════
// AI 内容审核中台 · 类型契约（全 mock，无后端）
// 行业锚定：社交 / UGC 平台（短视频 / 直播 / 图文社区）。
// 核心差异化：① 审片流水台（媒体前置 + 键盘高速 culling）② 多模态 + AI 合成检测
//             ③ 风险 5 阶语义 ④ 双边合规（DSA + 标识办法）留痕导出。
// 🔒 脱敏：平台用「示例社区 / 云直播 / 示例短视频」，无真人 PII / handle / 真实违规内容；
//          媒体一律安全占位（安全风景/物体 + 模糊 + 框选叠加 + AI 标签）。
// ════════════════════════════════════════════════════════════════════════

// ─── Auth & RBAC（4 角色）────────────────────────────────────────────────
export type RoleId = 'moderator' | 'qa_lead' | 'policy_ops' | 'compliance';

export type PermissionKey =
  | 'queue:read' | 'queue:act'
  | 'review:read'
  | 'policy:read' | 'policy:edit'
  | 'situation:read'
  | 'appeal:read' | 'appeal:act'
  | 'synthetic:read'
  | 'auditor:read'
  | 'compliance:export';

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

// ─── 风险 5 阶（页面色彩语言核心）────────────────────────────────────────────
export type Severity = 'safe' | 'low' | 'mid' | 'high' | 'critical';
export const SEVERITY_LABEL: Record<Severity, string> = {
  safe: '安全', low: '低危', mid: '中危', high: '高危', critical: '严重',
};
export const SEVERITY_CLASS: Record<Severity, string> = {
  safe: 'is-safe', low: 'is-low', mid: 'is-mid', high: 'is-high', critical: 'is-critical',
};

// ─── 模态 ────────────────────────────────────────────────────────────────────
export type Modality = 'text' | 'image' | 'video' | 'audio' | 'live';
export const MODALITY_LABEL: Record<Modality, string> = {
  text: '文本', image: '图片', video: '视频', audio: '音频', live: '直播',
};

// ─── 违规类型分类体系（UGC T&S）──────────────────────────────────────────────
export type ViolationCategory =
  | '涉政敏感' | '暴力血腥' | '色情低俗' | '欺诈引流' | '仇恨歧视'
  | '未成年保护' | 'AI 合成伪造' | '侵权盗版' | '垃圾广告' | '违禁品';

// 处置动作
export type Disposition = 'pass' | 'remove' | 'limit' | 'escalate' | 'age_gate';
export const DISPOSITION_LABEL: Record<Disposition, string> = {
  pass: '通过', remove: '下架', limit: '限流', escalate: '升级人审', age_gate: '年龄门限',
};

// ─── 旗舰：审片流水台 · 审核条目 ──────────────────────────────────────────────
export type ItemStatus = 'pending' | 'passed' | 'removed' | 'limited' | 'escalated' | 'appealed';
export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  pending: '待审', passed: '已通过', removed: '已下架', limited: '已限流', escalated: '已升级', appealed: '申诉中',
};

// 违规框选（图像/视频帧的 bounding box · 百分比坐标）
export interface ViolationBox {
  x: number; y: number; w: number; h: number;   // 0-100 百分比
  label: string; severity: Severity; confidence: number;
}

// AI 命中策略
export interface PolicyHit { code: string; name: string; category: ViolationCategory; confidence: number; }

export interface ModerationItem {
  id: string;                       // 工单号 RV-2406-7765
  modality: Modality;
  severity: Severity;
  category: ViolationCategory;
  confidence: number;               // AI 主判定置信度 0-100
  status: ItemStatus;
  source: string;                   // 来源「示例社区 · 图文」/「云直播 · 房间 ID 脱敏」
  author: string;                   // 发布者脱敏 用户****8821
  submittedAt: string;              // 进入队列时间 02:14
  waitSec: number;                  // 排队等待
  // 媒体（安全占位）
  media: string;                    // 占位媒体引用 key（mediaUrl 由 mockData 给安全图）
  blur: boolean;                    // 是否默认模糊（高危默认模糊保护审核员）
  duration?: string;                // 视频/音频时长 0:42
  boxes?: ViolationBox[];           // 图像/视频帧违规框选
  flagFrames?: number[];            // 视频违规帧时间码（秒）
  audioSegments?: { from: number; to: number; label: string }[]; // 音频违规段
  text?: string;                    // 文本/字幕内容
  textHits?: { token: string; severity: Severity }[];   // 命中词
  hits: PolicyHit[];                // AI 命中的多条策略
  aiSynthetic?: number;             // AI 合成概率（若检出）
  reviewer?: string;                // 处置人
  disposed?: Disposition;
}

// ─── 策略 / 分类体系 ──────────────────────────────────────────────────────────
export type PolicyBasis = '平台社区公约' | 'DSA' | '标识办法' | '未成年人保护法' | '广告法';
export interface ModerationPolicy {
  id: string; code: string; name: string; category: ViolationCategory;
  severity: Severity; threshold: number;          // 自动处置阈值
  action: Disposition; auto: boolean;             // 是否自动处置（高于阈值）
  basis: PolicyBasis[]; enabled: boolean;
  hits30d: number; precision: number;             // 近 30 天命中量 / 准确率
  desc: string;
}

// ─── 态势大屏 ────────────────────────────────────────────────────────────────
export interface CategoryStat { category: ViolationCategory; count: number; severity: Severity; }
export interface RegionHeat { region: string; value: number; }
export interface TrendPoint { date: string; flagged: number; removed: number; appeal: number; }
export interface DispositionFlow { stage: string; value: number; }

// ─── 申诉复核闭环 ──────────────────────────────────────────────────────────────
export type AppealStatus = '待复核' | '维持原判' | '撤销恢复' | '部分调整';
export interface Appeal {
  id: string; itemId: string; modality: Modality; category: ViolationCategory;
  original: Disposition; reason: string;          // 用户申诉理由
  submittedAt: string; slaHoursLeft: number;
  status: AppealStatus; reviewer?: string; decision?: string;
  aiRecommend: AppealStatus;                      // AI 建议
}

// ─── 合成内容 / deepfake 检测 ──────────────────────────────────────────────────
export interface SyntheticSignal { name: string; score: number; desc: string; }   // 取证信号 0-100
export interface SyntheticCase {
  id: string; modality: Modality; media: string; blur: boolean;
  syntheticProb: number;                          // 合成总概率
  verdict: 'genuine' | 'suspect' | 'synthetic';
  signals: SyntheticSignal[];                     // 人脸/频域/元数据/光照 取证信号
  hasLabel: boolean;                              // 是否带 AI 生成标识（标识办法）
  author: string; submittedAt: string;
  frameScores?: number[];                         // 逐帧合成分
}

// ─── 审核员效能 / 质检 ──────────────────────────────────────────────────────────
export interface AuditorRow {
  id: string; name: string; team: string;
  throughput: number;                             // 今日处置量
  accuracy: number;                               // 质检准确率
  consistency: number;                            // 与团队一致性
  avgHandleSec: number;                           // 平均处置时长
  qcSampled: number; qcPassed: number;            // 质检抽审
  appealReverseRate: number;                      // 申诉撤销率（越低越好）
}
