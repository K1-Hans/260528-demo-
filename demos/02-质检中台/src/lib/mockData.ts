// ════════════════════════════════════════════════════════════════════════
// AI 质检中台 · RBAC（4 角色权限矩阵）+ 跨页共享锚点（品牌/业务线/渠道/合规术语）
// 真实消金质检场景，禁 lorem。各页 mock 数据写在各页文件内 const。
// 🔒 脱敏：公司=示例消费金融 / 产品=信用贷 / 机器人=小云，禁真实雇主名。
// ════════════════════════════════════════════════════════════════════════
import type { Permission, Role, User, Alert } from '../types';

// ─── 品牌锚点 ───────────────────────────────────────────────────────────────
export const BRAND = {
  system: 'AI 质检中台',
  company: '示例消费金融',
  product: '信用贷',
  robot: '小云',
  hotline: '400-800-1234',
  service: '08:00–21:00',
  logoChar: '质',
} as const;

// ─── 业务线 / 渠道 / 合规必读术语（跨页一致）────────────────────────────────
export const BUSINESS_LINES = ['提前结清', '注销合规', '银行卡管理', '逾期催收', '产品咨询', 'S客户路由'] as const;
export const CHANNELS = ['通话', '在线', '邮件', 'Bot'] as const;
export const COMPLIANCE_TERMS = [
  '年化利率告知', '冷静期告知', '个人信息授权', '逾期后果告知',
  '催收红线', '承诺越权', '禁语筛查', '抢话检测', '静默超时',
] as const;

// ─── 权限定义（21 项）──────────────────────────────────────────────────────
export const ALL_PERMISSIONS: Permission[] = [
  { key: 'dashboard:read', label: '质检看板', category: 'page', desc: '查看全局质检看板与 KPI' },
  { key: 'list:read', label: '全量列表/回放', category: 'page', desc: '查看全量质检结果与会话回放' },
  { key: 'list:all', label: '查看全部坐席', category: 'data', desc: '不限本人，可见全部坐席数据（坐席仅本人）' },
  { key: 'replay:read', label: '会话回放', category: 'action', desc: '播放转写时间轴与音频游标' },
  { key: 'workbench:read', label: '质检工作台', category: 'page', desc: '进入逐句质检工作台（三栏联动）' },
  { key: 'scorecard:read', label: '评分卡（只读）', category: 'page', desc: '查看质检评分卡命中与扣分' },
  { key: 'scorecard:edit', label: '评分卡配置', category: 'action', desc: '拖拽编辑评分卡规则与权重' },
  { key: 'pipeline:read', label: '多-agent 流水线', category: 'page', desc: '查看质检流水线编排与成本' },
  { key: 'alert:read', label: '实时预警', category: 'page', desc: '查看实时质检预警流' },
  { key: 'coach:read', label: '实时辅导', category: 'action', desc: '查看/接收坐席辅导话术建议' },
  { key: 'perf:read', label: '坐席绩效', category: 'page', desc: '查看坐席绩效排行与雷达' },
  { key: 'review:create', label: '发起复核', category: 'action', desc: '对质检结果发起复核' },
  { key: 'review:judge', label: '复核裁决', category: 'action', desc: '裁决复核争议' },
  { key: 'appeal:create', label: '发起申诉', category: 'action', desc: '坐席对评分发起申诉' },
  { key: 'appeal:judge', label: '申诉终裁', category: 'action', desc: '对申诉做最终裁决' },
  { key: 'coverage:read', label: '合规话术覆盖率', category: 'page', desc: '查看必读话术覆盖率与缺漏' },
  { key: 'report:read', label: '报表与趋势', category: 'page', desc: '查看质检报表与趋势' },
  { key: 'report:export', label: '报表导出', category: 'action', desc: '导出 PDF/Excel 报表（占位）' },
  { key: 'retention:read', label: '留存与审计（只读）', category: 'page', desc: '查看 10 年留存与审计追溯' },
  { key: 'retention:manage', label: '留存合规管理', category: 'action', desc: '管理留存策略与封存' },
  { key: 'rbac:manage', label: '角色与权限', category: 'action', desc: '管理角色与权限分配' },
];

const QA_PERMS: PermissionKeyList = [
  'dashboard:read', 'list:read', 'list:all', 'replay:read', 'workbench:read',
  'scorecard:read', 'pipeline:read', 'alert:read', 'perf:read', 'review:create',
  'coverage:read', 'report:read',
];
type PermissionKeyList = Permission['key'][];

// ─── 4 角色（颜色 = 角色 chip）─────────────────────────────────────────────
export const ROLES: Role[] = [
  {
    id: 'qa_lead', name: '质检主管', color: '#2456c8',
    description: '评分卡编辑 + 复核裁决 + 报表导出 + 团队管理',
    permissions: [
      ...QA_PERMS,
      'scorecard:edit', 'review:judge', 'appeal:judge', 'coach:read',
      'report:export', 'retention:read', 'rbac:manage',
    ],
  },
  {
    id: 'compliance', name: '合规官', color: '#2e9e6b',
    description: '终裁 + 留存合规管理 + 全量追溯（治理最高权）',
    permissions: ALL_PERMISSIONS.map(p => p.key),
  },
  {
    id: 'qa', name: '质检员', color: '#7d6fc0',
    description: '全量质检 + 发起复核；评分卡只读，无配置/留存/分权',
    permissions: QA_PERMS,
  },
  {
    id: 'agent', name: '坐席', color: '#e0a03a',
    description: '个人看板 + 仅本人会话 + 申诉 + 自我辅导',
    permissions: ['dashboard:read', 'list:read', 'replay:read', 'appeal:create', 'coach:read', 'perf:read'],
  },
];

// ─── 演示用户（4 活跃覆盖 4 角色 + 2 备用）──────────────────────────────────
export const MOCK_USERS: User[] = [
  { id: 'u1', name: '沈括', username: 'shenkuo', role: 'qa_lead', dept: '质量管理部', status: 'active', lastLogin: '2026-06-17 09:12', createdAt: '2024-03-02' },
  { id: 'u2', name: '周慎', username: 'zhoushen', role: 'compliance', dept: '合规部', status: 'active', lastLogin: '2026-06-17 08:41', createdAt: '2023-11-18' },
  { id: 'u3', name: '林婉清', username: 'linwanqing', role: 'qa', dept: '质量管理部', status: 'active', lastLogin: '2026-06-17 09:30', createdAt: '2024-06-09' },
  { id: 'u4', name: '赵越', username: 'zhaoyue', role: 'agent', dept: '客服一部', status: 'active', lastLogin: '2026-06-17 09:48', createdAt: '2025-01-20' },
  { id: 'u5', name: '孙琪', username: 'sunqi', role: 'qa', dept: '质量管理部', status: 'active', lastLogin: '2026-06-16 18:05', createdAt: '2024-09-14' },
  { id: 'u6', name: '李航', username: 'lihang', role: 'agent', dept: '客服二部', status: 'inactive', note: '已转岗', lastLogin: '2026-05-30 17:22', createdAt: '2025-02-11' },
];

// ─── 顶栏预警通知（实时质检预警摘要）────────────────────────────────────────
export const ALERTS: Alert[] = [
  { level: 'danger', title: '禁语命中', msg: '坐席 赵越 在「逾期催收」通话中出现威胁性措辞，已即时拦截', tag: '催收红线', time: '2 分钟前' },
  { level: 'warn', title: '未告知年化利率', msg: '「产品咨询」在线会话漏报年化利率（APR），需复核', tag: '合规漏检', time: '9 分钟前' },
  { level: 'info', title: '双录覆盖率达标', msg: '今日双录覆盖率 100%，符合监管 10 年留存要求', tag: '合规', time: '1 小时前' },
];
