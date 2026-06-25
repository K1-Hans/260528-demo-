// ════════════════════════════════════════════════════════════════════════
// 智库 企业知识中台 · Mock 数据（全前端,无后端）· 对标 Glean
// 脱敏：无真实客户/产品名（用"某区域城商行""示例消费金融客户"等）；金融投研业务术语保留。
// 灵魂：clearance 驱动检索/图谱可见性（canAccess）；flagship 答案"金融客户尽调方法论"带真溯源。
// 确定性发生器（seed）保证演示数字稳定。
// ════════════════════════════════════════════════════════════════════════
import type {
  Role, RoleId, User, Permission, Alert, ClearanceLevel,
  SearchResult, Citation, ChatTurn,
  GraphNode, GraphEdge,
  KbAgent, Connector, SyncPoint,
  IntelItem, DraftSection,
  AuditLog, PermMatrixCell, HeatCell, GovTrendPoint,
  AdoptionPoint, DeptActivity, TopicNode, SourceType,
} from '../types';

const seed = (n: number) => { const x = Math.sin(n * 999.137) * 10000; return x - Math.floor(x); };

// ─── RBAC 4 角色（clearance 驱动可见性）──────────────────────────────────────
export const ROLES: Role[] = [
  {
    id: 'member', name: '员工', enName: 'Member', color: '#4c6fe0', clearance: 2,
    description: '顾问/分析师 · 本人 + 公开 + 所属项目 · 搜索/问答/用现成 Agent',
    permissions: ['search:read', 'chat:read', 'graph:read', 'proactive:read', 'agent:use', 'analytics:read'],
  },
  {
    id: 'knowledge_admin', name: '知识管理员', enName: 'Knowledge Admin', color: '#2e9e6b', clearance: 2,
    description: '知识/情报负责人 · 全公开域 + 内容质量域 · 内容生成/策展/纠错回流',
    permissions: ['search:read', 'chat:read', 'graph:read', 'proactive:read', 'agent:use', 'content:create', 'analytics:read'],
  },
  {
    id: 'platform_admin', name: '平台管理员', enName: 'Platform Admin', color: '#8a6fd0', clearance: 3,
    description: 'IT/平台 · 全租户（除标密）· 连接器/Agent Builder/治理/ROI',
    permissions: ['search:read', 'chat:read', 'graph:read', 'proactive:read', 'agent:use', 'content:create', 'agent:build', 'connector:manage', 'govern:read', 'audit:read', 'analytics:read'],
  },
  {
    id: 'compliance', name: '合规审计', enName: 'Compliance', color: '#c77d2e', clearance: 4,
    description: '法务/合规 · 全审计日志（只读）· 敏感访问追溯 + DLP + 合规报告',
    permissions: ['search:read', 'chat:read', 'graph:read', 'govern:read', 'audit:read', 'analytics:read'],
  },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: '沈知微', username: 'shenzw', role: 'member', dept: '投研顾问组', lastLogin: '3 分钟前', status: 'active', note: '金融尽调分析师', createdAt: '2026-01-10' },
  { id: 'u2', name: '陆明远', username: 'lumy', role: 'knowledge_admin', dept: '知识情报组', lastLogin: '18 分钟前', status: 'active', note: '黄金知识策展', createdAt: '2025-09-02' },
  { id: 'u3', name: '江岚', username: 'jianglan', role: 'platform_admin', dept: '平台工程组', lastLogin: '1 小时前', status: 'active', note: '租户与连接器治理', createdAt: '2025-07-15' },
  { id: 'u4', name: '韩澈', username: 'hanche', role: 'compliance', dept: '法务合规组', lastLogin: '2 小时前', status: 'active', note: '敏感访问审计', createdAt: '2025-11-01' },
  { id: 'u5', name: '方启', username: 'fangq', role: 'member', dept: '投研顾问组', lastLogin: '昨天', status: 'inactive', note: '已离职', createdAt: '2025-06-20' },
];

export const PERMISSIONS: Permission[] = [
  { key: 'search:read', label: '统一搜索', category: 'page', desc: '语义+关键词混合检索（权限过滤）' },
  { key: 'chat:read', label: 'AI 助手对话', category: 'page', desc: '多轮 RAG 对话，逐句溯源' },
  { key: 'graph:read', label: '知识图谱', category: 'page', desc: '人/文档/主题关系网络' },
  { key: 'proactive:read', label: '主动情报', category: 'page', desc: '与我相关的推送流' },
  { key: 'content:create', label: '内容生成/Canvas', category: 'action', desc: '基于授权知识起草' },
  { key: 'agent:use', label: '使用 Agent', category: 'action', desc: '运行现成 Agent' },
  { key: 'agent:build', label: 'Agent Builder', category: 'action', desc: '搭建/发布 Agent 工作流' },
  { key: 'connector:manage', label: '连接器管理', category: 'action', desc: '接入/监控数据源' },
  { key: 'govern:read', label: '治理控制台', category: 'page', desc: '访问控制 + DLP 策略' },
  { key: 'audit:read', label: '审计日志', category: 'data', desc: '检索/访问审计追溯' },
  { key: 'analytics:read', label: '使用分析 ROI', category: 'page', desc: '采用率/工时/答案质量' },
];

// ─── clearance 可见性判定（本 demo 灵魂）────────────────────────────────────
export const canAccess = (clearance: ClearanceLevel, level: ClearanceLevel) => level <= clearance;

// ─── 顶栏通知 ───────────────────────────────────────────────────────────────
export const ALERTS: Alert[] = [
  { level: 'warn', title: '受限访问被拦', msg: '员工「沈知微」检索「机密-并购意向」命中 2 条受限源被拦截', tag: '治理', time: '12 分钟前' },
  { level: 'info', title: '新黄金知识', msg: '陆明远 策展「金融客户尽调方法论 v3.2」已入索引', tag: '知识', time: '1 小时前' },
  { level: 'info', title: '连接器同步', msg: 'Confluence 增量同步 1,240 篇新文档', tag: '接入', time: '2 小时前' },
  { level: 'info', title: '专家变更', msg: '尽调领域高产专家「周岚」本月新增 8 篇研报', tag: '情报', time: '今天' },
];

// ─── 数据源元 ───────────────────────────────────────────────────────────────
export const SOURCES: SourceType[] = ['Confluence', 'Slack', 'Google Drive', 'SharePoint', 'Jira', 'Salesforce', 'Notion', 'GitHub', 'Zendesk', 'Box', '内部研报库', '会议纪要'];

// ─── 5.1 统一搜索结果（flagship query：金融客户尽调方法论）──────────────────
// level 分布让 member(cl2) 见 9 条、过滤 8 条；platform(cl3) 多见 6 条；compliance(cl4) 全见。
export const FLAGSHIP_QUERY = '金融客户尽调方法论';
export const SEARCH_RESULTS: SearchResult[] = [
  { id: 'r1', title: '金融客户尽调方法论 v3.2（标准框架）', source: '内部研报库', kind: '研报', author: '陆明远', updatedAt: '2026-06-12', snippet: '我们的尽调框架分三层：业务尽调、财务尽调、合规尽调；其中财务尽调重点核查**现金流真实性**与回款周期…', level: 1, relevance: 0.97, path: '研报库 / 方法论 / 尽调框架 v3.2' },
  { id: 'r2', title: '尽调清单模板（通用版）', source: 'Confluence', kind: '文档', author: '知识情报组', updatedAt: '2026-05-28', snippet: '尽调资料清单：工商信息、近三年审计报告、银行流水、主要合同、对外担保、诉讼记录…', level: 1, relevance: 0.93, path: 'Confluence / 投研 / 尽调清单' },
  { id: 'r3', title: '现金流真实性核查要点', source: '内部研报库', kind: '研报', author: '周岚', updatedAt: '2026-04-18', snippet: '核查经营性现金流与净利润的匹配度，警惕"纸面利润"；交叉验证银行流水、纳税、水电能耗…', level: 1, relevance: 0.91, path: '研报库 / 财务尽调 / 现金流' },
  { id: 'r4', title: '合规尽调：消金行业特别关注', source: 'Confluence', kind: '文档', author: '韩澈', updatedAt: '2026-03-30', snippet: '消费金融客户尽调须特别核查：放贷资质、利率合规、催收合规、个人信息保护、双录留痕…', level: 1, relevance: 0.88, path: 'Confluence / 合规 / 消金尽调' },
  { id: 'r5', title: '尽调访谈提纲（管理层）', source: 'Google Drive', kind: '文档', author: '沈知微', updatedAt: '2026-06-01', snippet: '管理层访谈聚焦：战略与执行一致性、关键人依赖、内控有效性、关联交易动机…', level: 1, relevance: 0.84, path: 'Drive / 投研 / 访谈提纲' },
  { id: 'r6', title: '某区域城商行项目 · 尽调备忘录', source: 'SharePoint', kind: '纪要', author: '沈知微', updatedAt: '2026-06-10', snippet: '本项目尽调重点：零售信贷资产质量、拨备覆盖率、地方政府平台敞口…（项目内可见）', level: 2, relevance: 0.86, path: 'SharePoint / 项目A / 尽调备忘' },
  { id: 'r7', title: '项目A 财务尽调工作底稿', source: 'Box', kind: '文档', author: '投研顾问组', updatedAt: '2026-06-08', snippet: '底稿：现金流测算、坏账敏感性、资本充足率压力测试…（项目组内可见）', level: 2, relevance: 0.82, path: 'Box / 项目A / 底稿' },
  { id: 'r8', title: 'Slack #尽调讨论 · 现金流口径', source: 'Slack', kind: '讨论', author: '周岚', updatedAt: '2026-06-11', snippet: '@沈知微 城商行的现金流要按监管口径还原，别用管理报表的数…（频道内可见）', level: 2, relevance: 0.79, path: 'Slack / #尽调讨论' },
  { id: 'r9', title: '尽调结论模板（投决会用）', source: 'Notion', kind: '文档', author: '陆明远', updatedAt: '2026-05-20', snippet: '投决会尽调结论：核心风险点、缓释措施、估值区间、关键假设敏感性…', level: 2, relevance: 0.77, path: 'Notion / 投决 / 结论模板' },
  // ── 以下 member 不可见（level 3 受限 / 4 机密）→ 进"已过滤" ──
  { id: 'r10', title: '某城商行 · 受限：不良资产明细', source: 'SharePoint', kind: '文档', author: '风控组', updatedAt: '2026-06-09', snippet: '（受限）单笔不良贷款客户级明细与展期记录…', level: 3, relevance: 0.85, path: 'SharePoint / 受限 / 不良明细' },
  { id: 'r11', title: '受限：关联交易穿透底稿', source: 'Box', kind: '文档', author: '风控组', updatedAt: '2026-06-05', snippet: '（受限）实控人关联方资金往来穿透…', level: 3, relevance: 0.80, path: 'Box / 受限 / 关联穿透' },
  { id: 'r12', title: '受限：现场尽调发现问题清单', source: 'Confluence', kind: '工单', author: '现场组', updatedAt: '2026-06-07', snippet: '（受限）现场发现的内控缺陷与整改…', level: 3, relevance: 0.78, path: 'Confluence / 受限 / 问题清单' },
  { id: 'r13', title: '受限：估值模型与假设', source: 'Google Drive', kind: '文档', author: '投行组', updatedAt: '2026-06-03', snippet: '（受限）DCF 与可比公司估值、关键假设…', level: 3, relevance: 0.74, path: 'Drive / 受限 / 估值模型' },
  { id: 'r14', title: '受限：尽调风险评级表', source: 'Salesforce', kind: '文档', author: '风控组', updatedAt: '2026-05-30', snippet: '（受限）客户尽调综合风险评级…', level: 3, relevance: 0.71, path: 'Salesforce / 受限 / 风险评级' },
  { id: 'r15', title: '机密：并购意向与对价条款', source: 'Box', kind: '合同', author: '投行组', updatedAt: '2026-06-06', snippet: '（机密）并购意向书、对价、对赌条款…', level: 4, relevance: 0.83, path: 'Box / 机密 / 并购意向' },
  { id: 'r16', title: '机密：实控人背景调查', source: '内部研报库', kind: '研报', author: '法务组', updatedAt: '2026-06-02', snippet: '（机密）实控人征信、涉诉、对外担保深度背调…', level: 4, relevance: 0.76, path: '研报库 / 机密 / 背调' },
];

// ─── 5.2 旗舰 AI 答案（逐句可溯源）──────────────────────────────────────────
export const FLAGSHIP_CITATIONS: Citation[] = [
  { id: 'c1', n: 1, docName: '金融客户尽调方法论 v3.2', source: '内部研报库', path: '研报库 / 方法论 / 尽调框架 v3.2', author: '陆明远', updatedAt: '2026-06-12', level: 1, confidence: 0.96, snippet: '尽调框架分三层：业务尽调、财务尽调、合规尽调。', paragraph: 2 },
  { id: 'c2', n: 2, docName: '现金流真实性核查要点', source: '内部研报库', path: '研报库 / 财务尽调 / 现金流', author: '周岚', updatedAt: '2026-04-18', level: 1, confidence: 0.93, snippet: '核查经营性现金流与净利润匹配度，交叉验证银行流水、纳税、能耗。', paragraph: 3 },
  { id: 'c3', n: 3, docName: '合规尽调：消金行业特别关注', source: 'Confluence', path: 'Confluence / 合规 / 消金尽调', author: '韩澈', updatedAt: '2026-03-30', level: 1, confidence: 0.9, snippet: '消金客户须核查放贷资质、利率合规、催收合规、双录留痕。', paragraph: 1 },
];
export const FLAGSHIP_TURN: ChatTurn = {
  id: 't0', question: '我们给金融客户做尽调的方法论是什么？',
  at: '刚刚', confidence: 0.93,
  segments: [
    { text: '我们的尽调方法论分三层：业务尽调、财务尽调、合规尽调，逐层递进、相互印证', cites: [1] },
    { text: '。其中财务尽调以现金流真实性为核心——重点核查经营性现金流与净利润的匹配度，并交叉验证银行流水、纳税与能耗数据，警惕"纸面利润"', cites: [2] },
    { text: '。针对消费金融客户，合规尽调须特别关注放贷资质、利率合规、催收合规与双录留痕等监管红线', cites: [3] },
    { text: '。结论部分按投决会模板输出核心风险点、缓释措施与估值区间。' },
  ],
  citations: FLAGSHIP_CITATIONS,
};

// 其它预设对话（AI 助手对话页）
export const CHAT_TURNS: ChatTurn[] = [
  FLAGSHIP_TURN,
  {
    id: 't1', question: '消金客户的现金流要按什么口径还原？', at: '2 分钟前', confidence: 0.88,
    segments: [
      { text: '城商行/消金客户的现金流应按监管口径还原，而非管理报表口径', cites: [1] },
      { text: '，重点剔除非经常性项目，并按拨备与核销还原真实回款。' },
    ],
    citations: [
      { id: 'c4', n: 1, docName: 'Slack #尽调讨论 · 现金流口径', source: 'Slack', path: 'Slack / #尽调讨论', author: '周岚', updatedAt: '2026-06-11', level: 2, confidence: 0.86, snippet: '城商行现金流要按监管口径还原，别用管理报表的数。', paragraph: 1 },
    ],
  },
];

// ─── 5.3 知识图谱（人/文档/项目/主题 · ~32 节点）─────────────────────────────
const PEOPLE = ['陆明远', '周岚', '沈知微', '韩澈', '江岚', '方启', '黎舟', '苏文'];
function buildGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  // 你（中心）
  nodes.push({ id: 'me', name: '沈知微（你）', kind: 'person', level: 1, dept: '投研顾问组', centrality: 1, detail: '本人 · 金融尽调分析师', expertOf: '财务尽调' });
  // 3 位领域专家（高中心度）
  const experts = [
    { id: 'p-luo', name: '陆明远', expertOf: '尽调方法论', c: 0.95, dept: '知识情报组' },
    { id: 'p-zhou', name: '周岚', expertOf: '现金流核查', c: 0.9, dept: '投研顾问组' },
    { id: 'p-han', name: '韩澈', expertOf: '合规尽调', c: 0.82, dept: '法务合规组' },
  ];
  experts.forEach(e => nodes.push({ id: e.id, name: e.name, kind: 'person', level: 1, dept: e.dept, centrality: e.c, detail: `领域专家 · ${e.expertOf}`, expertOf: e.expertOf }));
  // 文档节点（绑 flagship 引用，便于点 [1] 高亮）
  const docs = [
    { id: 'd-method', name: '尽调方法论 v3.2', level: 1 as ClearanceLevel, by: 'p-luo' },
    { id: 'd-cash', name: '现金流核查要点', level: 1 as ClearanceLevel, by: 'p-zhou' },
    { id: 'd-compliance', name: '消金合规尽调', level: 1 as ClearanceLevel, by: 'p-han' },
    { id: 'd-memo', name: '城商行尽调备忘', level: 2 as ClearanceLevel, by: 'me' },
    { id: 'd-paper', name: '财务尽调底稿', level: 2 as ClearanceLevel, by: 'me' },
    { id: 'd-bad', name: '不良资产明细', level: 3 as ClearanceLevel, by: 'p-zhou' },
    { id: 'd-related', name: '关联交易穿透', level: 3 as ClearanceLevel, by: 'p-zhou' },
    { id: 'd-ma', name: '并购意向条款', level: 4 as ClearanceLevel, by: 'p-han' },
  ];
  docs.forEach(d => { nodes.push({ id: d.id, name: d.name, kind: 'doc', level: d.level, centrality: 0.3 + seed(d.id.length) * 0.3, detail: `文档 · 密级 ${d.level}` }); edges.push({ source: d.by, target: d.id, relation: '作者', weight: 2 }); });
  // 主题节点
  const topics = [
    { id: 't-due', name: '尽职调查', level: 1 as ClearanceLevel },
    { id: 't-cash', name: '现金流', level: 1 as ClearanceLevel },
    { id: 't-comp', name: '合规', level: 1 as ClearanceLevel },
    { id: 't-risk', name: '风险评级', level: 3 as ClearanceLevel },
  ];
  topics.forEach(t => nodes.push({ id: t.id, name: t.name, kind: 'topic', level: t.level, centrality: 0.5 + seed(t.name.length) * 0.2, detail: `主题` }));
  // 项目节点
  const projects = [
    { id: 'pr-a', name: '某城商行项目A', level: 2 as ClearanceLevel },
    { id: 'pr-b', name: '消金客户项目B', level: 3 as ClearanceLevel },
  ];
  projects.forEach(p => nodes.push({ id: p.id, name: p.name, kind: 'project', level: p.level, centrality: 0.6, detail: `项目` }));
  // 关系边
  edges.push(
    { source: 'me', target: 'p-luo', relation: '协作', weight: 2 }, { source: 'me', target: 'p-zhou', relation: '协作', weight: 3 },
    { source: 'me', target: 'pr-a', relation: '参与', weight: 3 }, { source: 'me', target: 't-due', relation: '相关', weight: 2 },
    { source: 'd-method', target: 't-due', relation: '相关', weight: 2 }, { source: 'd-cash', target: 't-cash', relation: '相关', weight: 2 },
    { source: 'd-compliance', target: 't-comp', relation: '相关', weight: 2 }, { source: 'd-method', target: 'd-cash', relation: '引用', weight: 1 },
    { source: 'd-method', target: 'd-compliance', relation: '引用', weight: 1 }, { source: 'd-memo', target: 'pr-a', relation: '相关', weight: 2 },
    { source: 'd-paper', target: 'pr-a', relation: '相关', weight: 2 }, { source: 'd-bad', target: 'pr-b', relation: '相关', weight: 2 },
    { source: 'd-related', target: 'pr-b', relation: '相关', weight: 2 }, { source: 'd-ma', target: 'pr-b', relation: '相关', weight: 1 },
    { source: 'p-zhou', target: 't-cash', relation: '相关', weight: 2 }, { source: 'p-han', target: 't-comp', relation: '相关', weight: 2 },
    { source: 'p-luo', target: 't-due', relation: '相关', weight: 3 }, { source: 'd-bad', target: 't-risk', relation: '相关', weight: 2 },
  );
  // 补充外围 person 节点扩充密度
  PEOPLE.slice(5).forEach((nm, i) => {
    const id = `p-x${i}`;
    nodes.push({ id, name: nm, kind: 'person', level: (1 + (i % 3)) as ClearanceLevel, dept: '投研顾问组', centrality: 0.2 + seed(i) * 0.2, detail: '同事' });
    edges.push({ source: 'me', target: id, relation: '协作', weight: 1 });
    edges.push({ source: id, target: docs[i % docs.length].id, relation: '引用', weight: 1 });
  });
  return { nodes, edges };
}
const G = buildGraph();
export const GRAPH_NODES: GraphNode[] = G.nodes;
export const GRAPH_EDGES: GraphEdge[] = G.edges;
// flagship 引用 [n] → 图谱节点 id 映射（点引用高亮节点）
export const CITE_NODE_MAP: Record<number, string> = { 1: 'd-method', 2: 'd-cash', 3: 'd-compliance' };

// ─── 5.4 Agent Builder ──────────────────────────────────────────────────────
export const KB_AGENTS: KbAgent[] = [
  {
    id: 'a1', name: '竞品情报日报 Agent', desc: '每日聚合竞品动态 → 摘要 → 推送知识情报组', status: 'published', monthlyRuns: 620, owner: '陆明远',
    steps: [
      { id: 's1', kind: 'connector', name: '拉取 Slack/新闻源', ms: 420, source: 'Slack' },
      { id: 's2', kind: 'retrieve', name: '检索相关研报', ms: 280, source: '内部研报库' },
      { id: 's3', kind: 'generate', name: '生成情报摘要', ms: 1180, source: 'gpt-4o' },
      { id: 's4', kind: 'notify', name: '推送知识情报组', ms: 90 },
    ],
  },
  {
    id: 'a2', name: '新员工 onboarding 答疑 Agent', desc: '回答入职常见问题，引用 HR 与 IT 知识库', status: 'published', monthlyRuns: 1840, owner: '江岚',
    steps: [
      { id: 's1', kind: 'retrieve', name: '检索 HR/IT 知识库', ms: 240, source: 'Confluence' },
      { id: 's2', kind: 'generate', name: '生成带溯源回答', ms: 960, source: 'gpt-4o' },
      { id: 's3', kind: 'approve', name: '低置信转人工', ms: 60 },
    ],
  },
];
export const AGENT_RUNS = [
  { name: 'onboarding 答疑', runs: 1840 }, { name: '竞品情报日报', runs: 620 },
  { name: '尽调清单生成', runs: 410 }, { name: '合同要点抽取', runs: 280 }, { name: '会议纪要摘要', runs: 240 },
];

// ─── 5.5 连接器（~22）──────────────────────────────────────────────────────
const CONN_DEFS: Array<[string, number, boolean]> = [
  ['Confluence', 182400, true], ['Slack', 96800, true], ['Google Drive', 142000, true], ['SharePoint', 88600, true],
  ['Jira', 41200, true], ['Salesforce', 33800, true], ['Notion', 28400, true], ['GitHub', 52100, true],
  ['Zendesk', 19600, true], ['Box', 24700, true], ['内部研报库', 12800, true], ['会议纪要', 8900, true],
  ['Gmail', 0, false], ['Outlook', 0, false], ['Figma', 0, false], ['Dropbox', 0, false],
];
export const CONNECTORS: Connector[] = CONN_DEFS.map((c, i) => {
  const connected = c[1] > 0;
  const err = i === 6;  // Notion 异常态演示
  return {
    id: `cn${i}`, name: c[0], status: err ? 'error' : connected ? 'connected' : 'available',
    docs: c[1], lastSync: connected ? `${Math.floor(seed(i) * 50) + 1} 分钟前` : '—',
    latencyMin: connected ? +(seed(i + 3) * 8).toFixed(1) : 0, permMapped: c[2],
    indexedPct: err ? 64 : connected ? Math.round(88 + seed(i) * 12) : 0,
  };
});
export const SYNC_SERIES: SyncPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: `06-${String(i + 1).padStart(2, '0')}`,
  docs: Math.round(8000 + seed(i) * 6000 + Math.sin(i * 0.5) * 2000),
}));

// ─── 5.6 内容生成 / Canvas（草稿）──────────────────────────────────────────
export const DRAFT_SECTIONS: DraftSection[] = [
  { id: 'ds1', heading: '一、尽调范围与方法', body: '本次尽调采用三层框架（业务/财务/合规），覆盖近三年经营与资产质量，访谈管理层 6 人、核查底稿 240 份。', cites: [1] },
  { id: 'ds2', heading: '二、财务尽调发现', body: '经营性现金流与净利润匹配度良好，但需关注 Q4 回款集中度；交叉验证银行流水与纳税口径一致。', cites: [2] },
  { id: 'ds3', heading: '三、合规尽调结论', body: '放贷资质、利率与催收合规均达标，双录留痕完整；建议补充个人信息保护专项审查。', cites: [3] },
];

// ─── 5.7 主动情报 ───────────────────────────────────────────────────────────
export const INTEL_ITEMS: IntelItem[] = [
  { id: 'i1', title: '陆明远更新「尽调方法论 v3.2」', reason: '你的领域', type: '新文档', source: '内部研报库', time: '1 小时前', level: 1, snippet: '新增消金行业合规尽调专章与双录留痕清单。' },
  { id: 'i2', title: '某城商行项目A 进入投决阶段', reason: '你关注的项目', type: '项目动态', source: 'SharePoint', time: '今天 10:20', level: 2, snippet: '尽调底稿已归档，投决会定于本周五。' },
  { id: 'i3', title: '周岚 本月新增 8 篇现金流研报', reason: '你协作的人', type: '专家变更', source: '内部研报库', time: '昨天', level: 1, snippet: '现金流核查领域高产，可参考其最新口径还原方法。' },
  { id: 'i4', title: 'Slack #尽调讨论 有 3 条与你相关', reason: '你关注的项目', type: '项目动态', source: 'Slack', time: '昨天', level: 2, snippet: '@沈知微 被提及：城商行现金流口径还原。' },
  { id: 'i5', title: '合规组发布 DLP 策略更新', reason: '你的领域', type: '新文档', source: 'Confluence', time: '2 天前', level: 1, snippet: '受限源访问需二次审批，机密源默认拦截。' },
];

// ─── 5.8 治理控制台 ─────────────────────────────────────────────────────────
const ACTORS = ['沈知微', '陆明远', '江岚', '韩澈', '方启', '黎舟'];
const ROLE_OF: Record<string, AuditLog['role']> = { 沈知微: 'member', 方启: 'member', 黎舟: 'member', 陆明远: 'knowledge_admin', 江岚: 'platform_admin', 韩澈: 'compliance' };
const QUERIES = ['金融客户尽调方法论', '现金流真实性核查', '机密-并购意向条款', '不良资产明细', '消金催收合规', '关联交易穿透', '估值模型假设'];
export const AUDIT_LOGS: AuditLog[] = Array.from({ length: 40 }, (_, i) => {
  const actor = ACTORS[Math.floor(seed(i) * ACTORS.length)];
  const q = QUERIES[Math.floor(seed(i + 7) * QUERIES.length)];
  const blocked = (q.includes('机密') || q.includes('不良') || q.includes('关联')) && ROLE_OF[actor] === 'member' ? Math.floor(seed(i + 2) * 3) + 1 : 0;
  const hh = String(9 + Math.floor(seed(i + 1) * 9)).padStart(2, '0');
  const mm = String(Math.floor(seed(i + 4) * 60)).padStart(2, '0');
  return {
    id: `al${i}`, time: `2026-06-18 ${hh}:${mm}`, actor, role: ROLE_OF[actor],
    action: (['检索', '问答', '打开', '导出'] as const)[Math.floor(seed(i + 5) * 4)],
    query: q, hits: Math.floor(seed(i + 6) * 24) + 1, blocked, flagged: blocked > 0,
  };
});
export const PERM_DOMAINS = ['公开知识域', '项目知识域', '受限风控域', '机密交易域', '审计日志域'];
export const PERM_MATRIX: PermMatrixCell[] = (() => {
  const out: PermMatrixCell[] = [];
  const grid: Record<string, Record<RoleId, 'full' | 'read' | 'none'>> = {
    '公开知识域': { member: 'read', knowledge_admin: 'full', platform_admin: 'full', compliance: 'read' },
    '项目知识域': { member: 'read', knowledge_admin: 'read', platform_admin: 'full', compliance: 'read' },
    '受限风控域': { member: 'none', knowledge_admin: 'none', platform_admin: 'read', compliance: 'read' },
    '机密交易域': { member: 'none', knowledge_admin: 'none', platform_admin: 'none', compliance: 'read' },
    '审计日志域': { member: 'none', knowledge_admin: 'none', platform_admin: 'read', compliance: 'full' },
  };
  PERM_DOMAINS.forEach(d => (['member', 'knowledge_admin', 'platform_admin', 'compliance'] as RoleId[]).forEach(r => out.push({ domain: d, role: r, access: grid[d][r] })));
  return out;
})();
export const GOV_TREND: GovTrendPoint[] = Array.from({ length: 14 }, (_, i) => ({
  date: `06-${String(i + 5).padStart(2, '0')}`,
  queries: Math.round(1200 + seed(i) * 800 + Math.sin(i * 0.6) * 200),
  blocked: Math.round(18 + seed(i + 3) * 30),
}));
export const ACCESS_HEAT: HeatCell[] = (() => {
  const out: HeatCell[] = [];
  for (let day = 0; day < 7; day++) for (let hour = 0; hour < 24; hour++) {
    const work = hour >= 9 && hour <= 19 && day < 5 ? 1 : 0.2;
    out.push({ day, hour, value: Math.round((seed(day * 24 + hour) * 60 + 10) * work) });
  }
  return out;
})();

// ─── 5.9 使用分析 + ROI ─────────────────────────────────────────────────────
export const ROI_KPIS = [
  { label: '周活跃率', raw: 82, unit: '%', change: 6.4, spark: Array.from({ length: 14 }, (_, i) => 70 + seed(i) * 16) },
  { label: '人均日查询', raw: 11.4, unit: '', decimals: 1, change: 8.1, spark: Array.from({ length: 14 }, (_, i) => 8 + seed(i + 4) * 5) },
  { label: '答案采纳率', raw: 76, unit: '%', change: 3.2, spark: Array.from({ length: 14 }, (_, i) => 70 + seed(i + 8) * 10) },
  { label: '月省工时', raw: 3200, unit: 'h', change: 12.5, spark: Array.from({ length: 14 }, (_, i) => 2400 + seed(i + 12) * 900) },
];
export const ADOPTION_SERIES: AdoptionPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: `06-${String(i + 1).padStart(2, '0')}`,
  wau: Math.round(64 + i * 0.6 + seed(i) * 8),
  queries: Math.round(900 + i * 12 + seed(i + 3) * 300),
}));
export const DEPT_ACTIVITY: DeptActivity[] = [
  { dept: '投研顾问组', users: 86, queries: 4200, adoption: 88 },
  { dept: '知识情报组', users: 24, queries: 2100, adoption: 92 },
  { dept: '法务合规组', users: 32, queries: 1480, adoption: 74 },
  { dept: '投行组', users: 48, queries: 2680, adoption: 81 },
  { dept: '风控组', users: 38, queries: 1920, adoption: 79 },
];
export const TOPIC_TREE: TopicNode = {
  name: '查询主题', children: [
    { name: '尽职调查', children: [{ name: '财务尽调', value: 1820 }, { name: '合规尽调', value: 1240 }, { name: '业务尽调', value: 960 }] },
    { name: '研报投研', children: [{ name: '行业研究', value: 1380 }, { name: '估值模型', value: 720 }] },
    { name: '合规风控', children: [{ name: 'DLP/权限', value: 640 }, { name: '催收合规', value: 520 }] },
    { name: '内部知识', children: [{ name: 'onboarding', value: 1140 }, { name: '流程制度', value: 680 }] },
  ],
};
export const SOURCE_DIST = [
  { name: 'Confluence', value: 182400 }, { name: 'Google Drive', value: 142000 }, { name: 'Slack', value: 96800 },
  { name: 'SharePoint', value: 88600 }, { name: 'GitHub', value: 52100 }, { name: '其它', value: 119300 },
];
