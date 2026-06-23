// ════════════════════════════════════════════════════════════════════════
// 核心 mock 数据 + RBAC（4 角色权限矩阵，对齐 spec 01）+ 跨页共享常量
// 域数据（KB / 对话 / 质量 / 配置）见 ./mock/*.ts。真实消金场景，禁 lorem。
// ════════════════════════════════════════════════════════════════════════
import type { Permission, Role, User, Alert, RiskType } from '../types';

// ─── 权限定义（24 项）──────────────────────────────────────────────────────
export const ALL_PERMISSIONS: Permission[] = [
  { key: 'dashboard:read', label: '运营总览', category: 'page', desc: '查看运营总览与数据看板' },
  { key: 'token:read', label: 'Token 用量', category: 'page', desc: '查看 LLM token 消耗与费用' },
  { key: 'conv:read', label: '实时对话台', category: 'page', desc: '查看实时对话与 pipeline' },
  { key: 'conv:takeover', label: '会话接管', category: 'action', desc: '接管进行中会话转人工' },
  { key: 'prod:read', label: '生产对话', category: 'page', desc: '生产环境对话模拟' },
  { key: 'badcase:read', label: 'Badcase 查看', category: 'page', desc: '查看点踩 Badcase' },
  { key: 'badcase:write', label: 'Badcase 处理', category: 'action', desc: '修复 / 忽略 / 标注 Badcase' },
  { key: 'reject:read', label: '拒识查看', category: 'page', desc: '查看拒识知识缺口' },
  { key: 'reject:write', label: '拒识处理', category: 'action', desc: '拒识转 QA / 忽略' },
  { key: 'audit:read', label: '合规审计查看', category: 'page', desc: '查看合规审计留痕' },
  { key: 'audit:export', label: '审计导出', category: 'action', desc: '导出合规审计报告' },
  { key: 'scenario:read', label: '问题场景查看', category: 'page', desc: '查看场景聚合视图' },
  { key: 'scenario:write', label: '问题场景编辑', category: 'action', desc: '编辑场景答案 / 变体 / AB 版本' },
  { key: 'kb:read', label: '知识库查看', category: 'page', desc: '查看 QA / 卡片 / 寒暄 / 转人工库' },
  { key: 'kb:write', label: '知识库编辑', category: 'action', desc: '增删改 / 发布 / 批量导入知识库' },
  { key: 'sensitive:read', label: '敏感词查看', category: 'page', desc: '查看敏感词与变体' },
  { key: 'sensitive:write', label: '敏感词编辑', category: 'action', desc: '维护敏感词主词 / 变体 / 风险类型' },
  { key: 'recycle:manage', label: '回收站管理', category: 'action', desc: '恢复 / 彻底删除下线条目' },
  { key: 'agents:read', label: '智能体管理', category: 'page', desc: '查看 pipeline 编排' },
  { key: 'pipeline:test', label: 'Pipeline 测试', category: 'action', desc: 'A/B + 回归测试用例' },
  { key: 'kg:review', label: '知识补齐审核', category: 'action', desc: 'TDK 闭环建议审核入库' },
  { key: 'llm:config', label: 'LLM 配置', category: 'action', desc: '逐节点配模型 / 温度' },
  { key: 'prompt:publish', label: 'Prompt 发布', category: 'action', desc: '发布 / 回滚 Prompt 版本' },
  { key: 'intent:read', label: '意图分类', category: 'page', desc: '查看三级意图体系' },
  { key: 'tags:read', label: '标签查看', category: 'page', desc: '查看客服系统同步标签' },
  { key: 'logs:read', label: '会话日志', category: 'page', desc: '查询历史会话日志' },
  { key: 'rbac:manage', label: '分权管理', category: 'action', desc: '账号与角色权限管理' },
];

// ─── 4 角色（颜色 = 角色 chip）─────────────────────────────────────────────
export const ROLES: Role[] = [
  {
    id: 'director', name: '运营总监', color: '#cf6b43',
    description: '全部模块读写 + 账号与角色管理',
    permissions: ALL_PERMISSIONS.map(p => p.key),
  },
  {
    id: 'knowledge', name: '知识运营', color: '#6088b0',
    description: '知识库全量 CRUD + 质量运营 + Pipeline 测试；不含模型 / 分权',
    permissions: ['dashboard:read', 'token:read', 'conv:read', 'prod:read',
      'badcase:read', 'badcase:write', 'reject:read', 'reject:write', 'audit:read',
      'scenario:read', 'scenario:write', 'kb:read', 'kb:write', 'sensitive:read', 'sensitive:write',
      'recycle:manage', 'agents:read', 'pipeline:test', 'kg:review', 'intent:read', 'tags:read', 'logs:read'],
  },
  {
    id: 'compliance', name: '合规专员', color: '#c89034',
    description: '合规审计专属 + 知识库只读 + Badcase 标注',
    permissions: ['dashboard:read', 'token:read', 'conv:read', 'prod:read',
      'badcase:read', 'badcase:write', 'reject:read', 'audit:read', 'audit:export',
      'scenario:read', 'kb:read', 'sensitive:read', 'intent:read', 'tags:read', 'logs:read'],
  },
  {
    id: 'qa_lead', name: '质检 / 坐席班长', color: '#7e9359',
    description: '实时对话可接管 + 质量运营；无知识库与配置权限',
    permissions: ['dashboard:read', 'token:read', 'conv:read', 'conv:takeover', 'prod:read',
      'badcase:read', 'badcase:write', 'reject:read', 'reject:write', 'audit:read', 'intent:read', 'tags:read', 'logs:read'],
  },
];

// ─── 真实用户（演示账号 + RBAC 表）──────────────────────────────────────────
export const MOCK_USERS: User[] = [
  { id: 'u-001', name: '张明远', username: 'zhangmy', role: 'director', dept: '智能客服运营中心', lastLogin: '2026-06-16 09:12', status: 'active', createdAt: '2025-11-03 10:00', note: '运营负责人' },
  { id: 'u-002', name: '林婉清', username: 'linwq', role: 'knowledge', dept: '知识运营组', lastLogin: '2026-06-16 08:47', status: 'active', createdAt: '2026-01-08 14:20', note: 'QA / 场景维护' },
  { id: 'u-003', name: '周慎', username: 'zhoushen', role: 'compliance', dept: '合规风控部', lastLogin: '2026-06-15 17:33', status: 'active', createdAt: '2026-02-19 09:40', note: '合规审计' },
  { id: 'u-004', name: '赵越', username: 'zhaoyue', role: 'qa_lead', dept: '在线客服一组', lastLogin: '2026-06-16 09:05', status: 'active', createdAt: '2026-03-02 11:15', note: '坐席班长' },
  { id: 'u-005', name: '孙佳', username: 'sunjia', role: 'knowledge', dept: '知识运营组', lastLogin: '2026-06-14 16:20', status: 'active', createdAt: '2026-03-22 15:00', note: '卡片 / 寒暄库' },
  { id: 'u-006', name: '吴磊', username: 'wulei', role: 'qa_lead', dept: '在线客服二组', lastLogin: '2026-05-28 10:11', status: 'inactive', createdAt: '2026-04-10 13:30', note: '转岗停用' },
];

// ─── 运营预警（顶栏通知）────────────────────────────────────────────────────
export const ALERTS: Alert[] = [
  { level: 'danger', title: '拒识激增 · 提前结清手续费', msg: '近 1 小时「提前结清手续费」拒识 18 次，环比 +260%，建议立即补 QA', tag: '知识缺口', time: '09:18' },
  { level: 'warn', title: '敏感词命中上升', msg: '「投诉到银保监会」变体命中 +12，情绪有升级趋势，关注转人工承接', tag: '合规风险', time: '08:52' },
  { level: 'warn', title: 'Badcase 积压', msg: '待处理 Badcase 23 条已超 24 小时，质检班长请尽快认领修复', tag: '质量运营', time: '08:30' },
  { level: 'info', title: 'A4 合规拦截', msg: '今日 A4 拦截「利率虚假宣传」3 例，已全部改写 + 转人工并留痕', tag: '合规审计', time: '昨日' },
  { level: 'info', title: '检索引擎增量完成', msg: '新增 142 条 QA 已增量向量化（1.4s），语义检索就绪', tag: '系统', time: '昨日' },
];

// ─── 跨页共享常量 ───────────────────────────────────────────────────────────
export const INTENT_L1 = [
  '还款相关', '申请咨询', '产品与信息', '催收相关', '营销活动',
  '费用相关', '业务办理', '信息维护', '批量问题', '自定义',
] as const;

export const RISK_TYPES: RiskType[] = [
  '投诉维权', '法律维权', '金融监管', '催收相关', '媒体曝光', '涉政敏感', '合规风险', '扬言轻生',
];

export const KB_STATUSES = ['已生效', '待发布', '已下线'] as const;

// 品牌占位（znkf 真实机制：{{BOT_NAME}} 等启动时渲染）
export const BRAND = { bot: '小云', company: '示例消费金融', product: '信用贷' } as const;
