// ════════════════════════════════════════════════════════════════════════
// AI 数据中台 · Mock 数据（全前端，无后端）
// 🔒 脱敏：机构「示例银行 / 示例消金」，无真实机构/真客户数据。金融指标真实业务口径。
// ════════════════════════════════════════════════════════════════════════
import type {
  Role, User, Permission, Alert,
  QueryCell, SemanticEntityGroup, QueryHistoryRow,
  LineageNode, LineageEdge, GovPolicy, GovAudit, MetricDef,
} from '../types';

// ─── RBAC：4 角色 ─────────────────────────────────────────────────────────────
export const ROLES: Role[] = [
  {
    id: 'analyst', name: '罗芮', enName: 'Analyst', color: '#3458C5',
    description: '业务分析师：自然语言问数 + 生成可信查询 + 转看板。看结果与口径，不改语义层/治理。',
    landing: '/ask',
    permissions: ['ask:read', 'ask:run', 'history:read', 'metrics:read'],
  },
  {
    id: 'data_engineer', name: '程野', enName: 'Data Engineer', color: '#2E9E6B',
    description: '数据工程师：语义层建模、字段口径维护、血缘排查。建模 + 治理可信底座。',
    landing: '/semantic',
    permissions: ['ask:read', 'semantic:read', 'semantic:edit', 'lineage:read', 'history:read'],
  },
  {
    id: 'data_governor', name: '韦珩', enName: 'Data Governor', color: '#C9852E',
    description: '数据治理官：行列级权限、脱敏策略、敏感字段分级、访问审计。守可信与合规底线。',
    landing: '/governance',
    permissions: ['governance:read', 'governance:edit', 'lineage:read', 'semantic:read', 'metrics:read'],
  },
  {
    id: 'exec', name: '高崎', enName: 'Executive', color: '#8A6FD0',
    description: '管理层：问数看大盘 + 认证指标库，全只读。只看金标准口径，不下钻明细。',
    landing: '/metrics',
    permissions: ['ask:read', 'metrics:read', 'history:read'],
  },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: '罗芮', username: 'analyst', role: 'analyst', dept: '零售金融 · 经营分析组', lastLogin: '今天 09:18', status: 'active' },
  { id: 'u2', name: '程野', username: 'engineer', role: 'data_engineer', dept: '数据平台 · 建模组', lastLogin: '今天 08:50', status: 'active' },
  { id: 'u3', name: '韦珩', username: 'governor', role: 'data_governor', dept: '数据治理与合规部', lastLogin: '今天 09:33', status: 'active' },
  { id: 'u4', name: '高崎', username: 'exec', role: 'exec', dept: '零售金融事业部', lastLogin: '昨天 20:41', status: 'active' },
];

export const PERMISSIONS: Permission[] = [
  { key: 'ask:read', label: '问数台', category: 'page', desc: '查看问数 notebook' },
  { key: 'ask:run', label: '执行问数', category: 'action', desc: '运行 NL 查询' },
  { key: 'semantic:read', label: '语义层', category: 'page', desc: '查看语义层建模' },
  { key: 'semantic:edit', label: '建模编辑', category: 'action', desc: '改字段口径' },
  { key: 'history:read', label: '查询历史', category: 'page', desc: '查看历史查询' },
  { key: 'lineage:read', label: '数据血缘', category: 'page', desc: '查看血缘 DAG' },
  { key: 'governance:read', label: '权限治理', category: 'page', desc: '查看治理策略' },
  { key: 'governance:edit', label: '治理编辑', category: 'action', desc: '改行列级权限' },
  { key: 'metrics:read', label: '指标库', category: 'page', desc: '查看认证指标' },
];

export const ALERTS: Alert[] = [
  { level: 'danger', title: '上游表断流', msg: '`ods.loan_repay` 数据新鲜度超 6h，影响「不良率」「逾期率」2 个认证指标，已标 stale。', tag: '血缘', time: '14:22' },
  { level: 'warn', title: '越权问数被拦', msg: '分析师对「客户身份证号」发起明细查询，按治理策略拒答并留痕。', tag: '治理', time: '14:05' },
  { level: 'info', title: '语义层覆盖率提升', msg: '本周新建 3 个 measure，问数「已覆盖语义层」占比 78% → 83%。', tag: '建模', time: '13:40' },
];

// ════ 旗舰：问数 notebook · cell（覆盖 4 个可信度阶，含拒答）════
export const QUERY_CELLS: QueryCell[] = [
  {
    id: 'q1', question: '上季度各分行的 AUM 和环比增速，按 AUM 降序', user: '罗芮', at: '14:31', confidence: 'covered', elapsedMs: 820,
    sql: `SELECT branch_name AS 分行,\n       SUM(aum) AS AUM,\n       ROUND((SUM(aum) / LAG(SUM(aum)) OVER (...) - 1) * 100, 1) AS 环比增速\nFROM   sem.fct_branch_aum          -- 语义层：分行资产汇总\nWHERE  period = '2026Q1'\nGROUP  BY branch_name\nORDER  BY AUM DESC;`,
    semanticRefs: [
      { entity: '分行', field: 'branch_name', kind: 'dim' },
      { entity: 'AUM', field: 'aum', kind: 'measure' },
    ],
    result: {
      columns: [{ key: 'b', label: '分行', type: 'dim' }, { key: 'a', label: 'AUM(亿)', type: 'measure' }, { key: 'g', label: '环比', type: 'measure' }],
      rows: [['华东分行', 1284.6, 8.4], ['华南分行', 1102.3, 6.1], ['华北分行', 968.7, 5.2], ['西南分行', 642.1, 11.3], ['东北分行', 418.9, 2.7]],
      chart: 'bar',
      chartData: [{ name: '华东', value: 1284.6 }, { name: '华南', value: 1102.3 }, { name: '华北', value: 968.7 }, { name: '西南', value: 642.1 }, { name: '东北', value: 418.9 }],
      summary: '华东分行 AUM 1,284.6 亿居首，西南分行环比增速最高 +11.3%。',
    },
    pinned: true,
    followups: ['按客户分层拆解华东分行 AUM', '西南分行高增速的主要产品来源'],
  },
  {
    id: 'q2', question: '高净值客户里买了理财但没买保险的有多少人', user: '罗芮', at: '14:28', confidence: 'partial', elapsedMs: 1140,
    sql: `SELECT COUNT(DISTINCT c.cust_id) AS 人数\nFROM   sem.dim_customer c               -- 语义层：客户（含高净值标签）\nJOIN   ods.holding_wm  w ON ...          -- 理财持仓走明细表，未进语义层\nLEFT JOIN ods.holding_ins i ON ...       -- 保险持仓走明细表，未进语义层\nWHERE  c.is_hnw = 1 AND w.cust_id IS NOT NULL AND i.cust_id IS NULL;`,
    semanticRefs: [
      { entity: '客户', field: 'is_hnw', kind: 'dim' },
    ],
    result: {
      columns: [{ key: 'n', label: '人数', type: 'measure' }],
      rows: [[12840]],
      chart: 'kpi',
      summary: '约 12,840 人（理财/保险持仓走明细表，口径未进语义层，数字仅供参考）。',
    },
    followups: ['把「理财持仓」「保险持仓」补建进语义层 measure'],
  },
  {
    id: 'q3', question: '如果把获客成本降 20%，对客户 LTV 的影响是多少', user: '罗芮', at: '14:20', confidence: 'out', elapsedMs: 640,
    sql: `-- 超语义层范围：LTV 弹性模型未建模，无法用确定性 SQL 推算\n-- 命中：获客成本(CAC) measure 存在；LTV 因果弹性 不存在`,
    semanticRefs: [{ entity: '获客成本', field: 'cac', kind: 'measure' }],
    result: {
      columns: [], rows: [], chart: 'table',
      summary: '当前语义层只有 CAC 与 LTV 的历史值，没有「CAC→LTV 弹性」因果模型，无法给确定性答案。',
    },
    refusedReason: '需先建 LTV 弹性模型或接入实验数据，再做 what-if 推演。',
    followups: ['查看 CAC 与 LTV 的历史相关性（描述性，非因果）'],
  },
  {
    id: 'q4', question: '导出每个客户的身份证号、手机号和账户余额', user: '罗芮', at: '14:12', confidence: 'refused', elapsedMs: 210,
    sql: `-- 拒答：命中治理策略 GOV-07（机密字段 · 禁明细导出）\n-- cust_id_no / phone 为机密分级，账户余额明细需行级授权`,
    semanticRefs: [],
    refusedReason: '身份证号、手机号为「机密」分级字段，禁止明细导出；账户余额明细查询需行级授权。按"答不了报错、绝不返回错数/越权数"原则拒答，已留痕。',
    followups: ['改问聚合口径，如「各客群平均余额」（可授权）'],
  },
];

// ════ 语义层建模 ════
export const SEMANTIC_GROUPS: SemanticEntityGroup[] = [
  {
    entity: 'customer', label: '客户', table: 'sem.dim_customer', desc: '零售客户主体，含分层/标签/生命周期', rowCount: '4,820 万', coverage: 92,
    fields: [
      { name: '客户ID', sqlName: 'cust_id', kind: 'entity', dataType: 'string', desc: '客户唯一标识（已哈希）', table: 'dim_customer', governed: true },
      { name: '客户分层', sqlName: 'tier', kind: 'dimension', dataType: 'enum', desc: '大众/财富/私行', table: 'dim_customer', governed: true },
      { name: '是否高净值', sqlName: 'is_hnw', kind: 'dimension', dataType: 'bool', desc: 'AUM ≥ 600 万', table: 'dim_customer', governed: true },
      { name: '管理资产', sqlName: 'aum', kind: 'measure', dataType: 'decimal', desc: 'AUM，口径含表内外', table: 'fct_customer_aum', governed: true },
    ],
  },
  {
    entity: 'loan', label: '贷款', table: 'sem.fct_loan', desc: '消金放款与还款事实，风险口径', rowCount: '1.2 亿', coverage: 88,
    fields: [
      { name: '放款额', sqlName: 'loan_amt', kind: 'measure', dataType: 'decimal', desc: '当期放款金额', table: 'fct_loan', governed: true },
      { name: '不良率', sqlName: 'npl_rate', kind: 'measure', dataType: 'decimal', desc: 'NPL：90+ 逾期/在贷余额', table: 'fct_loan_risk', governed: true },
      { name: '逾期率', sqlName: 'dpd_rate', kind: 'measure', dataType: 'decimal', desc: 'DPD30+ 占比', table: 'fct_loan_risk', governed: true },
      { name: '产品', sqlName: 'product', kind: 'dimension', dataType: 'enum', desc: '信用贷/现金分期/账单分期', table: 'dim_product', governed: true },
    ],
  },
  {
    entity: 'acquisition', label: '获客', table: 'sem.fct_acquisition', desc: '渠道获客与成本', rowCount: '3,100 万', coverage: 71,
    fields: [
      { name: '获客成本', sqlName: 'cac', kind: 'measure', dataType: 'decimal', desc: 'CAC：渠道投放/新客数', table: 'fct_acquisition', governed: true },
      { name: '30日留存', sqlName: 'retention_30d', kind: 'measure', dataType: 'decimal', desc: '激活后 30 日留存', table: 'fct_retention', governed: false },
      { name: '渠道', sqlName: 'channel', kind: 'dimension', dataType: 'enum', desc: '自营/联名/三方', table: 'dim_channel', governed: true },
    ],
  },
];

// ════ 查询历史 ════
export const QUERY_HISTORY: QueryHistoryRow[] = [
  { id: 'h1', question: '上季度各分行的 AUM 和环比增速', user: '罗芮', role: '业务分析师', at: '今天 14:31', confidence: 'covered', rows: 5, elapsedMs: 820, pinned: true, rerun: 12 },
  { id: 'h2', question: '高净值客户买理财未买保险人数', user: '罗芮', role: '业务分析师', at: '今天 14:28', confidence: 'partial', rows: 1, elapsedMs: 1140, pinned: false, rerun: 3 },
  { id: 'h3', question: '近 12 月信用贷不良率趋势', user: '高崎', role: '管理层', at: '今天 13:50', confidence: 'covered', rows: 12, elapsedMs: 760, pinned: true, rerun: 28 },
  { id: 'h4', question: 'CAC 降 20% 对 LTV 影响', user: '罗芮', role: '业务分析师', at: '今天 14:20', confidence: 'out', rows: 0, elapsedMs: 640, pinned: false, rerun: 1 },
  { id: 'h5', question: '导出客户身份证号手机号余额', user: '罗芮', role: '业务分析师', at: '今天 14:12', confidence: 'refused', rows: 0, elapsedMs: 210, pinned: false, rerun: 0 },
  { id: 'h6', question: '各渠道获客成本与 30 日留存', user: '程野', role: '数据工程师', at: '今天 11:30', confidence: 'partial', rows: 3, elapsedMs: 980, pinned: false, rerun: 5 },
  { id: 'h7', question: '私行客户 AUM 集中度 top10', user: '高崎', role: '管理层', at: '昨天 18:05', confidence: 'covered', rows: 10, elapsedMs: 690, pinned: true, rerun: 9 },
  { id: 'h8', question: '各产品件均与逾期率交叉', user: '罗芮', role: '业务分析师', at: '昨天 16:22', confidence: 'covered', rows: 6, elapsedMs: 740, pinned: false, rerun: 4 },
];

// ════ 数据血缘（DAG · layer 0 源 → 3 指标）════
export const LINEAGE_NODES: LineageNode[] = [
  { id: 'src_core', name: '核心系统 core', kind: 'source', layer: 0, table: 'ods.core_acct', freshness: '15 min', owner: '程野', health: 'ok' },
  { id: 'src_loan', name: '信贷系统 loan', kind: 'source', layer: 0, table: 'ods.loan_repay', freshness: '6.2 h', owner: '程野', health: 'stale' },
  { id: 'src_mkt', name: '营销平台 mkt', kind: 'source', layer: 0, table: 'ods.mkt_event', freshness: '30 min', owner: '程野', health: 'ok' },
  { id: 'mdl_cust', name: 'dim_customer', kind: 'model', layer: 1, table: 'sem.dim_customer', freshness: '1 h', owner: '程野', health: 'ok' },
  { id: 'mdl_loan', name: 'fct_loan_risk', kind: 'model', layer: 2, table: 'sem.fct_loan_risk', freshness: '6.2 h', owner: '程野', health: 'stale' },
  { id: 'mdl_aum', name: 'fct_branch_aum', kind: 'model', layer: 2, table: 'sem.fct_branch_aum', freshness: '1 h', owner: '程野', health: 'ok' },
  { id: 'met_npl', name: '不良率', kind: 'metric', layer: 3, table: 'metric.npl_rate', freshness: '6.2 h', owner: '韦珩', health: 'stale' },
  { id: 'met_aum', name: 'AUM', kind: 'metric', layer: 3, table: 'metric.aum', freshness: '1 h', owner: '韦珩', health: 'ok' },
  { id: 'met_cac', name: '获客成本', kind: 'metric', layer: 3, table: 'metric.cac', freshness: '30 min', owner: '韦珩', health: 'ok' },
];
export const LINEAGE_EDGES: LineageEdge[] = [
  { from: 'src_core', to: 'mdl_cust' }, { from: 'src_loan', to: 'mdl_cust' },
  { from: 'src_loan', to: 'mdl_loan' }, { from: 'src_core', to: 'mdl_aum' },
  { from: 'src_mkt', to: 'mdl_cust' },
  { from: 'mdl_loan', to: 'met_npl' }, { from: 'mdl_aum', to: 'met_aum' },
  { from: 'mdl_cust', to: 'met_cac' }, { from: 'src_mkt', to: 'met_cac' },
];

// ════ 权限治理（行列级 + 脱敏）════
export const GOV_POLICIES: GovPolicy[] = [
  { id: 'GOV-01', resource: 'dim_customer', field: 'cust_id_no 身份证号', classification: '机密', mask: '禁止访问', appliesTo: ['业务分析师', '管理层'], desc: '机密字段，仅治理官与授权审计可见明细。' },
  { id: 'GOV-02', resource: 'dim_customer', field: 'phone 手机号', classification: '机密', mask: '掩码', appliesTo: ['业务分析师', '数据工程师'], desc: '掩码展示 138****8821。' },
  { id: 'GOV-03', resource: 'fct_customer_aum', field: 'aum 管理资产', classification: '敏感', mask: '行级过滤', appliesTo: ['业务分析师'], desc: '仅可见本人管辖分行客户行。' },
  { id: 'GOV-04', resource: 'dim_customer', field: 'tier 客户分层', classification: '内部', mask: '无', appliesTo: [], desc: '内部可见，无脱敏。' },
  { id: 'GOV-05', resource: 'fct_loan_risk', field: 'npl_rate 不良率', classification: '敏感', mask: '无', appliesTo: ['管理层'], desc: '管理层可见汇总，禁下钻客户级。' },
  { id: 'GOV-07', resource: '*', field: '机密字段明细导出', classification: '机密', mask: '禁止访问', appliesTo: ['业务分析师', '数据工程师', '管理层'], desc: '任何角色禁机密字段明细导出，问数命中即拒答。' },
];
export const GOV_AUDITS: GovAudit[] = [
  { id: 'a1', user: '罗芮', action: '问数拒答（机密字段明细）', resource: 'cust_id_no', at: '14:12', level: 'danger' },
  { id: 'a2', user: '程野', action: '修改语义层口径', resource: 'fct_loan_risk.npl_rate', at: '13:30', level: 'warn' },
  { id: 'a3', user: '高崎', action: '查看认证指标', resource: 'metric.npl_rate', at: '13:50', level: 'info' },
  { id: 'a4', user: '韦珩', action: '新增脱敏策略', resource: 'phone', at: '11:08', level: 'info' },
];

// ════ 指标库（认证 = 金标准）════
export const METRICS: MetricDef[] = [
  { id: 'm1', name: '管理资产规模', enName: 'AUM', definition: '客户表内外管理资产合计', formula: 'SUM(表内余额 + 表外持仓市值)', owner: '韦珩', domain: '零售', value: 4416.6, unit: '亿元', decimals: 1, change: 6.8, freshness: '1 h', certified: true, spark: [38, 40, 41, 43, 42, 44, 44.2] },
  { id: 'm2', name: '不良率', enName: 'NPL Rate', definition: '90 天以上逾期贷款 / 在贷余额', formula: 'SUM(npl_bal) / SUM(loan_bal)', owner: '韦珩', domain: '风险', value: 1.42, unit: '%', decimals: 2, change: -0.08, freshness: '6.2 h', certified: true, spark: [1.6, 1.55, 1.52, 1.48, 1.45, 1.44, 1.42] },
  { id: 'm3', name: '获客成本', enName: 'CAC', definition: '渠道投放总额 / 新增有效客户数', formula: 'SUM(spend) / COUNT(new_active)', owner: '韦珩', domain: '增长', value: 286, unit: '元', decimals: 0, change: -4.2, freshness: '30 min', certified: true, spark: [320, 312, 305, 298, 292, 289, 286] },
  { id: 'm4', name: '30 日留存', enName: 'D30 Retention', definition: '激活后第 30 日仍活跃占比', formula: 'COUNT(active_d30) / COUNT(activated)', owner: '程野', domain: '增长', value: 64.3, unit: '%', decimals: 1, change: 2.3, freshness: '1 h', certified: false, spark: [60, 61, 62, 62.5, 63, 64, 64.3] },
  { id: 'm5', name: '月放款额', enName: 'Monthly Disbursement', definition: '当月消金放款总额', formula: 'SUM(loan_amt)', owner: '韦珩', domain: '资产', value: 128.4, unit: '亿元', decimals: 1, change: 5.4, freshness: '6.2 h', certified: true, spark: [110, 115, 118, 120, 124, 126, 128] },
  { id: 'm6', name: '私行客户数', enName: 'Private Banking Clients', definition: 'AUM ≥ 600 万的客户数', formula: 'COUNT(cust WHERE aum >= 6e6)', owner: '韦珩', domain: '零售', value: 18420, unit: '户', decimals: 0, change: 3.1, freshness: '1 h', certified: true, spark: [173, 176, 178, 180, 182, 183, 184] },
];
