// ════════════════════════════════════════════════════════════════════════
// AI 外呼/语音中台 · 共享 mock 数据（角色 / 用户 / 权限 / 告警 / 合规三灯）
// 页面专属数据放各自 page 文件内（避免并发改本文件）。本文件只放跨页共享项。
// 🔒 脱敏：示例消费金融 / 小云 / 信用贷 / 坐席系统 / 400-800-1234。
// ════════════════════════════════════════════════════════════════════════
import type { Role, User, Permission, Alert, ComplianceLight, RoleId } from '../types';

// ─── 4 角色 × 权限矩阵（规格 05 ③）─────────────────────────────────────────
export const ROLES: Role[] = [
  {
    id: 'campaign_ops', name: '外呼运营', enName: 'Campaign Ops', color: '#4db8ff',
    description: '任务调度台 + 监控墙：建活动、导名单、起停外呼、调并发节奏；合规阈值只读，不可导原始录音。',
    landing: '/monitor',
    permissions: ['monitor:read', 'campaign:read', 'campaign:manage', 'handoff:read', 'script:read', 'voice:read', 'records:read', 'funnel:read', 'numbers:read'],
  },
  {
    id: 'script_designer', name: '话术设计师', enName: 'Script Designer', color: '#2fd4a0',
    description: '话术流编排 + A/B：编辑对话树/LLM 节点、配音色、发起 A/B；不可操作线上并发，客户 PII 脱敏。',
    landing: '/script',
    permissions: ['monitor:read', 'script:read', 'script:edit', 'voice:read', 'voice:edit', 'abtest:read', 'records:read', 'funnel:read'],
  },
  {
    id: 'compliance_qa', name: '合规/质检官', enName: 'Compliance & QA', color: '#f2a93b',
    description: '合规质检中心：设频控/静默时段/敏感词、封停违规活动、调录音留痕、出审计报告；不可改话术业务逻辑。',
    landing: '/compliance',
    permissions: ['monitor:read', 'campaign:read', 'handoff:read', 'compliance:read', 'compliance:act', 'records:read', 'numbers:read'],
  },
  {
    id: 'biz_lead', name: '业务主管', enName: 'Biz Lead', color: '#d6bc82',
    description: '数据回流大盘 + 漏斗：看全量看板、转化漏斗、坐席接管总览；全只读 + 审批转人工升级。',
    landing: '/funnel',
    permissions: [
      'monitor:read', 'campaign:read', 'handoff:read', 'handoff:act', 'script:read', 'voice:read',
      'records:read', 'funnel:read', 'abtest:read', 'compliance:read', 'numbers:read', 'settings:read',
    ],
  },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: '王立', username: 'ops', role: 'campaign_ops', dept: '外呼运营部', lastLogin: '今天 09:05', status: 'active' },
  { id: 'u2', name: '林溪', username: 'script', role: 'script_designer', dept: '对话体验设计组', lastLogin: '今天 09:41', status: 'active' },
  { id: 'u3', name: '沈律', username: 'qa', role: 'compliance_qa', dept: '合规与质检部', lastLogin: '今天 08:52', status: 'active' },
  { id: 'u4', name: '周岚', username: 'lead', role: 'biz_lead', dept: '消金客户经营中心', lastLogin: '昨天 20:18', status: 'active' },
];

// 权限清单（设置/角色页矩阵用）
export const PERMISSIONS: Permission[] = [
  { key: 'monitor:read', label: '实时通话监控墙', category: 'page', desc: '坐席墙 + 声波 + 流式转写 + 实时漏斗' },
  { key: 'campaign:read', label: '任务调度台', category: 'page', desc: '查看外呼活动' },
  { key: 'campaign:manage', label: '活动起停', category: 'action', desc: '建活动/导名单/调并发/起停' },
  { key: 'handoff:read', label: '转人工队列', category: 'page', desc: '查看坐席协同队列' },
  { key: 'handoff:act', label: '接管/审批', category: 'action', desc: '接管会话/审批转人工升级' },
  { key: 'script:read', label: '话术编排器', category: 'page', desc: '查看对话树' },
  { key: 'script:edit', label: '话术编辑', category: 'action', desc: '编辑对话树/LLM 节点' },
  { key: 'voice:read', label: '音色配置', category: 'page', desc: 'TTS 音色试听' },
  { key: 'voice:edit', label: '音色调参', category: 'action', desc: '调情感/语速、发起音色 A/B' },
  { key: 'records:read', label: '通话记录回放', category: 'page', desc: '转写 + 录音留痕' },
  { key: 'funnel:read', label: '线索漏斗', category: 'page', desc: '评分与转化漏斗' },
  { key: 'abtest:read', label: '话术 A/B', category: 'page', desc: '数据回流与 A/B' },
  { key: 'compliance:read', label: '合规质检中心', category: 'page', desc: '频控/敏感词/资质/留痕' },
  { key: 'compliance:act', label: '合规处置', category: 'action', desc: '封停违规活动/设阈值' },
  { key: 'numbers:read', label: '号码线路管理', category: 'page', desc: '号码池/资质台账' },
  { key: 'numbers:manage', label: '号码处置', category: 'action', desc: '停用高风险号码' },
  { key: 'settings:read', label: '设置/角色', category: 'page', desc: '系统与权限设置' },
];

// 顶栏告警铃（合规/敏感事件）
export const ALERTS: Alert[] = [
  { level: 'warn', title: '敏感词命中 · 投诉', msg: '坐席 #B12 客户 138****2841 触发「投诉」→ 已自动转人工', tag: '敏感词', time: '1 分钟前' },
  { level: 'danger', title: '号码封号风险预警', msg: '外显号 021-6098**** 今日呼量超阈 + 接通率骤降，封号风险 78 分，建议停用', tag: '号码', time: '7 分钟前' },
  { level: 'warn', title: '勿扰时段拦截', msg: '逾期 M1 提醒活动有 312 通命中 21:00 后勿扰时段，已自动拦截顺延', tag: '频控', time: '23 分钟前' },
  { level: 'info', title: '资质临期提醒', msg: '线路供应商「示例云通信」外呼资质 2026-07-15 到期，请提前续期', tag: '资质', time: '1 小时前' },
];

// 合规三灯（频控余量 / 静默时段 / 资质有效期 · 三灯全绿才能发起活动）
export const COMPLIANCE_LIGHTS: ComplianceLight[] = [
  { key: 'freq', label: '频控余量', state: 'on', detail: '今日触达 68% · 单客户频次合规' },
  { key: 'dnd', label: '静默时段', state: 'on', detail: '当前 09:00–21:00 可呼时段内' },
  { key: 'qual', label: '资质有效', state: 'on', detail: '外呼资质 + 外显号报备均有效' },
];

// 角色辅助
export const roleById = (id: RoleId) => ROLES.find(r => r.id === id) ?? null;
export const landingFor = (id: RoleId) => roleById(id)?.landing ?? '/monitor';
