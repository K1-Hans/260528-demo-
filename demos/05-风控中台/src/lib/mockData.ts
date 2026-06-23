// ════════════════════════════════════════════════════════════════════════
// AI 风控中台 · 共享 mock 数据（角色 / 用户 / 权限 / 告警 / 威胁态势 / 地理）
// 页面专属数据放各自 page 文件内（避免并发改本文件）。本文件只放跨页共享项。
// 🔒 脱敏：示例消费金融 / 小云 / 信用贷 / 坐席系统 / 400-800-1234。
// ════════════════════════════════════════════════════════════════════════
import type {
  Role, User, Permission, Alert, ThreatStat, RoleId,
} from '../types';

// ─── 4 角色 × 权限矩阵（规格 02 ③）─────────────────────────────────────────
export const ROLES: Role[] = [
  {
    id: 'risk_analyst', name: '风控分析师', enName: 'Risk Analyst', color: '#4d9bff',
    description: '盯实时监控大屏、处置案件与预警；不可改策略、不可出 SAR。',
    landing: '/monitor',
    permissions: ['monitor:read', 'cockpit:read', 'case:read', 'case:act', 'network:read', 'alert:read', 'alert:act', 'explain:read', 'screening:read'],
  },
  {
    id: 'aml_officer', name: '反洗钱合规官', enName: 'AML Officer', color: '#2fcb8a',
    description: 'AML 告警分诊、SAR 报告生成与上报、名单/制裁筛查、可解释性审计；只读监控。',
    landing: '/aml',
    permissions: ['monitor:read', 'case:read', 'network:read', 'aml:read', 'sar:read', 'sar:write', 'screening:read', 'explain:read', 'audit:read'],
  },
  {
    id: 'strategy_admin', name: '策略管理员', enName: 'Strategy Admin', color: '#d6bc82',
    description: '决策规则/策略编排（发布/灰度/回滚）、评分卡与模型监控；不可处置个案。',
    landing: '/strategy',
    permissions: ['monitor:read', 'strategy:read', 'strategy:write', 'scorecard:read', 'explain:read', 'datasource:read'],
  },
  {
    id: 'ciso', name: '首席风险官', enName: 'CISO', color: '#f0dba6',
    description: '全只读 + 高管驾驶舱（损失/拦截率/误报率/合规水位），导出报表。',
    landing: '/cockpit',
    permissions: [
      'monitor:read', 'cockpit:read', 'case:read', 'network:read', 'alert:read',
      'aml:read', 'sar:read', 'screening:read', 'strategy:read', 'scorecard:read',
      'explain:read', 'datasource:read', 'rbac:read', 'audit:read',
    ],
  },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: '沈砚之', username: 'analyst', role: 'risk_analyst', dept: '反欺诈一部', lastLogin: '今天 09:12', status: 'active' },
  { id: 'u2', name: '陆衡', username: 'aml', role: 'aml_officer', dept: '合规与反洗钱部', lastLogin: '今天 08:47', status: 'active' },
  { id: 'u3', name: '苏决', username: 'strategy', role: 'strategy_admin', dept: '风险策略中心', lastLogin: '今天 10:03', status: 'active' },
  { id: 'u4', name: '霍砺', username: 'ciso', role: 'ciso', dept: '首席风险官办公室', lastLogin: '昨天 21:30', status: 'active' },
];

// 权限清单（RBAC 页矩阵用）
export const PERMISSIONS: Permission[] = [
  { key: 'monitor:read', label: '实时监控大屏', category: 'page', desc: '查看交易风险流与决策分布' },
  { key: 'cockpit:read', label: '高管风险驾驶舱', category: 'page', desc: '损失/拦截率/合规水位高管视图' },
  { key: 'case:read', label: '案件调查工作台', category: 'page', desc: '查看案件 360° 与关系图谱' },
  { key: 'case:act', label: '案件处置', category: 'action', desc: '冻结/转人工/生成 SAR 等处置动作' },
  { key: 'network:read', label: '反欺诈关系网络', category: 'page', desc: '团伙挖掘全局图谱' },
  { key: 'alert:read', label: '实时预警中心', category: 'page', desc: '查看预警工单' },
  { key: 'alert:act', label: '预警处置', category: 'action', desc: '冻结/二次验证/转人工/放行' },
  { key: 'aml:read', label: 'AML 告警队列', category: 'page', desc: 'agentic 分诊与升级队列' },
  { key: 'sar:read', label: 'SAR 报告查看', category: 'page', desc: '查看可疑交易报告' },
  { key: 'sar:write', label: 'SAR 生成上报', category: 'action', desc: '生成、复核、提交 SAR' },
  { key: 'screening:read', label: '名单/制裁筛查', category: 'page', desc: 'OFAC/EU/UN/PEP 筛查' },
  { key: 'strategy:read', label: '策略编排查看', category: 'page', desc: '查看决策规则与策略' },
  { key: 'strategy:write', label: '策略发布', category: 'action', desc: '发布/灰度/回滚策略' },
  { key: 'scorecard:read', label: '评分卡/模型监控', category: 'page', desc: '评分卡与模型健康度' },
  { key: 'explain:read', label: '模型可解释性', category: 'page', desc: 'SHAP 贡献度与审计指纹' },
  { key: 'datasource:read', label: '数据源接入态', category: 'page', desc: '多源接入健康度' },
  { key: 'rbac:read', label: '角色与权限', category: 'page', desc: '权限矩阵管理' },
  { key: 'audit:read', label: '审计日志', category: 'page', desc: '全链路审计可追溯' },
];

// 顶栏告警铃
export const ALERTS: Alert[] = [
  { level: 'danger', title: '套现团伙特征命中', msg: '账户 ****8842 等 3 户共享设备指纹，累计支用 ¥182.6 万，建议拦截', tag: '团伙', time: '2 分钟前' },
  { level: 'danger', title: '账户接管高危', msg: '卡尾 4821 异地登录 + 改绑手机 + 大额提现，评分 0.94', tag: '盗刷', time: '6 分钟前' },
  { level: 'warn', title: 'AML 结构化拆分', msg: '主体「示例科技」单日 9 笔 ¥49,500 整数拆分入账，待人工复核', tag: 'AML', time: '14 分钟前' },
  { level: 'warn', title: '模型 PSI 漂移预警', msg: 'fraud-xgb-0612 特征「夜间交易占比」PSI=0.21 超阈，建议再训练', tag: '模型', time: '38 分钟前' },
  { level: 'info', title: '名单库更新', msg: 'OFAC SDN 名单新增 142 条，已自动重筛存量客户', tag: '合规', time: '1 小时前' },
];

// 威胁态势（市场数据立威 · 规格 ⑩ 已核实来源）
export const THREAT_STATS: ThreatStat[] = [
  { label: '全球银行欺诈损失', value: '$5,794 亿', sub: '2025 全年', source: 'Nasdaq Verafin', trend: 12 },
  { label: 'GenAI 助推欺诈损失', value: '$400 亿', sub: '2027 预测', source: 'Deloitte', trend: 32 },
  { label: 'deepfake 语音钓鱼', value: '+1,600%', sub: '2025Q1 同比', source: '行业监测', trend: 1600 },
  { label: 'EU AI Act 强制生效', value: '2026-08-02', sub: '违规罚至营收 7%', source: '欧盟监管', trend: 0 },
];

// 城市经纬度（地理热点 effectScatter 用 · 真实坐标）
export const CITY_GEO: Record<string, [number, number]> = {
  北京: [116.40, 39.90], 上海: [121.47, 31.23], 广州: [113.26, 23.13], 深圳: [114.06, 22.54],
  成都: [104.07, 30.57], 杭州: [120.15, 30.28], 武汉: [114.31, 30.59], 西安: [108.94, 34.34],
  重庆: [106.55, 29.56], 郑州: [113.62, 34.75], 长沙: [112.94, 28.23], 沈阳: [123.43, 41.81],
  南宁: [108.37, 22.82], 昆明: [102.71, 25.05], 福州: [119.30, 26.08], 哈尔滨: [126.53, 45.80],
};

// 角色辅助
export const roleById = (id: RoleId) => ROLES.find(r => r.id === id) ?? null;
export const landingFor = (id: RoleId) => roleById(id)?.landing ?? '/monitor';

// 评分 → 三态阈值（统一口径：≥0.80 拦截 · 0.55–0.80 复核 · <0.55 放行）
export function decisionForScore(score: number): 'pass' | 'review' | 'block' {
  if (score >= 0.80) return 'block';
  if (score >= 0.55) return 'review';
  return 'pass';
}

// 三态 → CSS 变量（组件/图表统一取色）
export const DECISION_VAR: Record<'pass' | 'review' | 'block', string> = {
  pass: '--success', review: '--warning', block: '--danger',
};
