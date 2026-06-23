// ════════════════════════════════════════════════════════════════════════
// 云枢 LLMOps 运营中台 · Mock 数据（全前端,无后端）
// 脱敏：示例消费金融自有 AI 应用,无真实产品名；模型用真实生态名（spec 允许）。
// 旗舰故事线数据骨架：svc-assistant 的 v3(prod) ↔ v4(canary 20%) · 忠实度 −11% · 成本 $0.92→$0.74。
// 数值用确定性发生器（seed）保证每次加载稳定,避免演示时数字乱跳。
// ════════════════════════════════════════════════════════════════════════
import type {
  Role, User, Permission, AppMeta, ModelMeta, Alert,
  TraceRecord, Span, HistoBucket, MonitorPoint,
  Dataset, EvalDimension, ScoreCell, EvalRun, RadarSeries, EvalCase,
  AnnoTask, AnnoThroughput,
  PromptVersion, DiffLine, VersionMetricPoint,
  Experiment, PlaygroundResult,
  CostSlice, CostStackPoint, BudgetState, CostNode,
  AlertRule, AlertEvent, Integration, AppId, ModelId,
} from '../types';

// 确定性伪随机：稳定可复现的 [0,1)
const seed = (n: number) => { const x = Math.sin(n * 999.137) * 10000; return x - Math.floor(x); };

// ─── RBAC 4 角色（规格 06 ③ 权限矩阵）──────────────────────────────────────
export const ROLES: Role[] = [
  {
    id: 'owner', name: '平台负责人', enName: 'Owner', color: '#34c892',
    description: '运营全局 + Prompt 回滚审批 + 预算设定（双签）',
    permissions: [
      'overview:read', 'tracing:read', 'tracing:write', 'monitor:read',
      'dataset:read', 'eval:read', 'eval:write', 'annotation:read', 'annotation:write',
      'prompt:read', 'prompt:write', 'prompt:approve', 'cost:read', 'cost:manage',
      'alert:read', 'alert:write', 'settings:read', 'rbac:manage',
    ],
  },
  {
    id: 'engineer', name: 'AI 工程师', enName: 'Engineer', color: '#5aa2f0',
    description: '调链 / 评测 / Prompt 读写、发实验，无预算管理与回滚审批',
    permissions: [
      'overview:read', 'tracing:read', 'tracing:write', 'monitor:read',
      'dataset:read', 'eval:read', 'eval:write', 'annotation:read',
      'prompt:read', 'prompt:write', 'cost:read', 'alert:read', 'alert:write', 'settings:read',
    ],
  },
  {
    id: 'annotator', name: '数据标注员', enName: 'Annotator', color: '#9c8cf0',
    description: '人工标注主操作台 + 数据集只读，看不到成本与 Prompt',
    permissions: ['dataset:read', 'eval:read', 'annotation:read', 'annotation:write'],
  },
  {
    id: 'finops', name: '财务 FinOps', enName: 'FinOps', color: '#d8bd82',
    description: '成本仪表盘读写 + 预算设定/分摊 + 成本告警，权限即职责边界',
    permissions: ['overview:read', 'cost:read', 'cost:manage', 'alert:read'],
  },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: '陆衡', username: 'luheng', role: 'owner', dept: '平台工程组', lastLogin: '2 分钟前', status: 'active', note: '平台负责人 · 全权限', createdAt: '2025-09-01' },
  { id: 'u2', name: '江野', username: 'jiangye', role: 'engineer', dept: '模型工程组', lastLogin: '11 分钟前', status: 'active', note: 'Agent 工程主力', createdAt: '2025-10-12' },
  { id: 'u3', name: '苏窈', username: 'suyao', role: 'annotator', dept: '数据标注组', lastLogin: '34 分钟前', status: 'active', note: '黄金集标注', createdAt: '2026-01-08' },
  { id: 'u4', name: '何霖', username: 'helin', role: 'finops', dept: '财务-FinOps', lastLogin: '1 小时前', status: 'active', note: '推理成本归因', createdAt: '2025-11-20' },
  { id: 'u5', name: '蒋时', username: 'jiangshi', role: 'engineer', dept: '模型工程组', lastLogin: '昨天', status: 'inactive', note: '已转岗', createdAt: '2025-08-15' },
];

export const PERMISSIONS: Permission[] = [
  { key: 'overview:read', label: '运营总览', category: 'page', desc: '查看总览大盘（FinOps 仅成本面）' },
  { key: 'tracing:read', label: '调用链查看', category: 'page', desc: '查看 trace 列表与瀑布' },
  { key: 'tracing:write', label: '调用链标注', category: 'action', desc: '标注异常、加入测试集' },
  { key: 'monitor:read', label: '在线监控', category: 'page', desc: '实时 QPS/延迟/错误率大盘' },
  { key: 'dataset:read', label: '数据集查看', category: 'page', desc: '查看 Eval 数据集与用例' },
  { key: 'eval:read', label: '评分看板', category: 'page', desc: '查看评测矩阵与回归' },
  { key: 'eval:write', label: '运行评测', category: 'action', desc: '发起评测、改数据集' },
  { key: 'annotation:read', label: '标注队列查看', category: 'page', desc: '查看标注队列' },
  { key: 'annotation:write', label: '标注操作', category: 'action', desc: '打分、打标签、仲裁' },
  { key: 'prompt:read', label: 'Prompt 查看', category: 'page', desc: '版本树与 diff' },
  { key: 'prompt:write', label: 'Prompt 提交', category: 'action', desc: '提交版本、发灰度实验' },
  { key: 'prompt:approve', label: 'Prompt 审批/回滚', category: 'action', desc: 'Owner 专属：审批回滚与灰度' },
  { key: 'cost:read', label: '成本查看', category: 'page', desc: '查看成本拆解' },
  { key: 'cost:manage', label: '预算管理', category: 'action', desc: 'FinOps/Owner：设预算与分摊' },
  { key: 'alert:read', label: '告警查看', category: 'page', desc: '查看告警规则与时间线' },
  { key: 'alert:write', label: '告警配置', category: 'action', desc: '增改告警规则' },
  { key: 'settings:read', label: '设置查看', category: 'page', desc: '应用接入/模型注册' },
  { key: 'rbac:manage', label: '权限管理', category: 'action', desc: 'Owner：角色与权限分配' },
];

// ─── 应用 / 模型生态 ────────────────────────────────────────────────────────
export const APPS: AppMeta[] = [
  { id: 'svc-assistant', name: '客服助手', desc: '在线客服智能问答' },
  { id: 'credit-qa', name: '信贷问答', desc: '信贷产品咨询应答' },
  { id: 'contract-extract', name: '合同抽取', desc: '合同要素结构化抽取' },
  { id: 'collection-qc', name: '催收质检', desc: '催收话术合规判定' },
  { id: 'product-reco', name: '产品推荐', desc: '理财/信贷产品推荐' },
];
export const appName = (id: AppId) => APPS.find(a => a.id === id)?.name ?? id;

export const MODELS: ModelMeta[] = [
  { id: 'gpt-4o', name: 'gpt-4o', vendor: 'OpenAI', inPer1k: 0.0025, outPer1k: 0.01 },
  { id: 'gpt-4o-mini', name: 'gpt-4o-mini', vendor: 'OpenAI', inPer1k: 0.00015, outPer1k: 0.0006 },
  { id: 'claude-3.5-sonnet', name: 'claude-3.5-sonnet', vendor: 'Anthropic', inPer1k: 0.003, outPer1k: 0.015 },
  { id: 'Qwen2.5-72B', name: 'Qwen2.5-72B', vendor: '阿里云 · 自托管', inPer1k: 0.0008, outPer1k: 0.0008 },
  { id: '自研-credit-7B', name: '自研-credit-7B', vendor: '自托管', inPer1k: 0.0001, outPer1k: 0.0001 },
];

// ─── 顶栏告警/通知 ──────────────────────────────────────────────────────────
export const ALERTS: Alert[] = [
  { level: 'danger', title: '忠实度回归', msg: '客服助手 · 忠实度评分较基线下降 11%（v4 canary 20%）', tag: '质量回归', time: '8 分钟前' },
  { level: 'warn', title: '预算逼近', msg: '本月推理成本已用 84%（$42,180 / $50,000）', tag: '成本', time: '1 小时前' },
  { level: 'warn', title: 'p95 抬升', msg: '合同抽取 p95 延迟 6h 内 +18%（重试增多）', tag: '延迟', time: '2 小时前' },
  { level: 'info', title: '缓存命中改善', msg: '信贷问答语义缓存命中率升至 41%', tag: '成本', time: '3 小时前' },
  { level: 'info', title: '新数据集', msg: '苏窈 沉淀「催收合规 黄金集 v2」120 例', tag: 'Eval', time: '今天' },
];

// ─── 总览 KPI ───────────────────────────────────────────────────────────────
export const OVERVIEW_KPIS = [
  { label: '在线 QPS', raw: 312, unit: '', change: 4.2, spark: Array.from({ length: 16 }, (_, i) => 280 + seed(i + 1) * 70), tone: 'good' as const },
  { label: 'p95 延迟', raw: 1840, unit: 'ms', change: 7.5, spark: Array.from({ length: 16 }, (_, i) => 1600 + seed(i + 9) * 500), tone: 'bad' as const },
  { label: '今日成本', raw: 1640, unit: '$', change: 5.1, spark: Array.from({ length: 16 }, (_, i) => 1300 + seed(i + 20) * 600), tone: 'cost' as const },
  { label: '24h 平均评分', raw: 0.86, unit: '', decimals: 2, change: -2.3, spark: Array.from({ length: 16 }, (_, i) => 0.82 + seed(i + 30) * 0.08), tone: 'bad' as const },
];

// ─── 5.1 Tracing：trace 列表 + 瀑布 spans ───────────────────────────────────
function mkSpans(spec: Array<[string, Span['kind'], number, number, Partial<Span>?]>): Span[] {
  return spec.map(([name, kind, startMs, durMs, extra], i) => ({
    id: `s${i}`, name, kind, startMs, durMs, status: 'ok', ...extra,
  }));
}

// 旗舰故事 trace：v4 canary 一条慢链路（删了约束 → 触发 guard 失败 → 重试 → 更贵）
const TRACE_V4_SLOW: TraceRecord = {
  id: 't-9f2a', traceId: 'a1f93c4e7b20', app: 'svc-assistant', model: 'gpt-4o',
  endpoint: 'POST /v1/chat', latencyMs: 4120, tokensIn: 2480, tokensOut: 910, costUsd: 0.0152,
  status: 'slow', promptVersion: 'v4', time: '14:32:08',
  spans: mkSpans([
    ['用户输入解析', 'parse', 0, 40, { tokensIn: 120 }],
    ['知识检索 retrieve', 'retrieve', 40, 380, { detail: 'top_k=6 · 命中知识库「提前结清」条目', attrs: { 'retrieval.top_k': 6, 'retrieval.hit': 5 } }],
    ['prompt 组装', 'prompt', 420, 90, { tokensIn: 1860, detail: 'v4：移除「忠实度约束 few-shot」+ 收紧输出格式', critical: true }],
    ['LLM 调用 #1', 'llm', 510, 1520, { model: 'gpt-4o', tokensIn: 1980, tokensOut: 520, costUsd: 0.0072, status: 'error', critical: true, detail: '输出未引用检索内容 → 忠实度 guard 判定失败', attrs: { 'gen_ai.request.model': 'gpt-4o', 'gen_ai.usage.input_tokens': 1980, 'gen_ai.usage.output_tokens': 520 } }],
    ['忠实度 guard', 'guard', 2030, 120, { status: 'error', detail: 'faithfulness=0.71 < 阈值 0.85 → 触发重试', critical: true }],
    ['LLM 调用 #2（重试）', 'llm', 2150, 1740, { model: 'gpt-4o', tokensIn: 2480, tokensOut: 910, costUsd: 0.0080, critical: true, detail: '追加上下文重试 → 通过，但 token 翻倍、延迟翻倍', attrs: { 'gen_ai.request.model': 'gpt-4o', 'gen_ai.usage.input_tokens': 2480, 'gen_ai.usage.output_tokens': 910 } }],
    ['响应解析', 'parse', 3890, 230, {}],
  ]),
};

const APP_LIST: AppId[] = ['svc-assistant', 'credit-qa', 'contract-extract', 'collection-qc', 'product-reco'];
const MODEL_LIST: ModelId[] = ['gpt-4o', 'claude-3.5-sonnet', 'Qwen2.5-72B', 'gpt-4o-mini', '自研-credit-7B'];
function mkTrace(i: number): TraceRecord {
  const r = (n: number) => seed(i * 7 + n);
  const app = APP_LIST[Math.floor(r(1) * APP_LIST.length)];
  const model = MODEL_LIST[Math.floor(r(2) * MODEL_LIST.length)];
  const latency = Math.round(420 + r(3) * 2600);
  const tokIn = Math.round(300 + r(4) * 2200);
  const tokOut = Math.round(120 + r(5) * 900);
  const cost = +((tokIn / 1000) * 0.0025 + (tokOut / 1000) * 0.01).toFixed(4);
  const status: TraceRecord['status'] = r(6) > 0.9 ? 'error' : latency > 2600 ? 'slow' : 'ok';
  const mm = 30 + Math.floor(r(7) * 28), ss = Math.floor(r(8) * 60);
  const ret = r(3) * 380;
  return {
    id: `t-${(4096 + i).toString(16)}`, traceId: (seed(i + 100) * 1e16).toString(16).slice(0, 12),
    app, model, endpoint: 'POST /v1/chat', latencyMs: latency, tokensIn: tokIn, tokensOut: tokOut,
    costUsd: cost, status, promptVersion: r(9) > 0.7 ? 'v4' : 'v3', time: `14:${mm}:${ss.toString().padStart(2, '0')}`,
    spans: mkSpans([
      ['用户输入解析', 'parse', 0, Math.round(20 + r(1) * 40)],
      ['知识检索', 'retrieve', 50, Math.round(180 + ret)],
      ['prompt 组装', 'prompt', 50 + Math.round(180 + ret), 80],
      ['LLM 调用', 'llm', 360 + Math.round(ret), Math.round(latency * 0.62), { model, tokensIn: tokIn, tokensOut: tokOut, costUsd: cost, critical: true, status }],
      ['响应解析', 'parse', latency - 120, 120],
    ]),
  };
}
export const TRACES: TraceRecord[] = [TRACE_V4_SLOW, ...Array.from({ length: 23 }, (_, i) => mkTrace(i + 1))];

// latency 直方（近 1h · 叠加 p50/p95/p99 标线）
export const LATENCY_HISTO: HistoBucket[] = [
  { ms: 400, count: 42 }, { ms: 800, count: 138 }, { ms: 1200, count: 196 }, { ms: 1600, count: 154 },
  { ms: 2000, count: 88 }, { ms: 2400, count: 47 }, { ms: 2800, count: 24 }, { ms: 3200, count: 12 },
  { ms: 3600, count: 6 }, { ms: 4000, count: 4 },
];
export const LATENCY_MARKS = { p50: 1240, p95: 2680, p99: 3520 };

// ─── 5.2 在线监控时序（近 6h · 72 点 · 5 分钟一格）──────────────────────────
export const MONITOR_SERIES: MonitorPoint[] = Array.from({ length: 72 }, (_, i) => {
  const wob = Math.sin(i * 0.5) * 0.5 + Math.sin(i * 0.13) * 0.5;
  const spike = i > 48 && i < 56 ? 1 : 0;  // 一段错误率抬升区间（对应 v4 canary）
  const hh = String(8 + Math.floor((i * 5) / 60)).padStart(2, '0');
  const mm = String((i * 5) % 60).padStart(2, '0');
  return {
    t: `${hh}:${mm}`,
    qps: Math.round(280 + wob * 60 + seed(i) * 30),
    p95: Math.round(1600 + wob * 320 + spike * 600 + seed(i + 5) * 200),
    p50: Math.round(980 + wob * 140 + seed(i + 7) * 120),
    errRate: +(0.8 + (wob + 1) * 0.4 + spike * 3.2 + seed(i + 9) * 0.5).toFixed(2),
    cacheHit: +(36 + Math.sin(i * 0.2) * 5 + seed(i + 11) * 4).toFixed(1),
    tokensK: Math.round(120 + wob * 40 + seed(i + 13) * 30),
  };
});

// ─── 5.3 Eval 数据集 + 评分看板 ─────────────────────────────────────────────
export const DATASETS: Dataset[] = [
  { id: 'ds1', name: '客服 QA 黄金集', app: 'svc-assistant', source: '混合', cases: 480, lastRunScore: 0.86, lastRunAt: '14:20', golden: 320 },
  { id: 'ds2', name: '合同要素抽取集', app: 'contract-extract', source: '人工构造', cases: 220, lastRunScore: 0.91, lastRunAt: '11:05', golden: 220 },
  { id: 'ds3', name: '信贷问答合规集', app: 'credit-qa', source: '线上trace沉淀', cases: 360, lastRunScore: 0.88, lastRunAt: '昨天', golden: 180 },
  { id: 'ds4', name: '催收话术红线集', app: 'collection-qc', source: '人工构造', cases: 156, lastRunScore: 0.94, lastRunAt: '昨天', golden: 156 },
  { id: 'ds5', name: '产品推荐相关性集', app: 'product-reco', source: '线上trace沉淀', cases: 290, lastRunScore: 0.83, lastRunAt: '2 天前', golden: 90 },
];
export const EVAL_DIMS: EvalDimension[] = ['相关性', '忠实度', '有害性', '格式合规', '简洁度'];

export const EVAL_CASES: EvalCase[] = [
  { id: 'c1', input: '我想提前结清贷款，需要付违约金吗？', expected: '说明是否收取 + 引用合同条款', tags: ['提前结清', '合规'] },
  { id: 'c2', input: '注销账户后征信多久更新？', expected: '准确告知更新周期 + 不夸大', tags: ['注销', '征信'] },
  { id: 'c3', input: '逾期三天会上征信吗？', expected: '依据真实政策应答，禁止恐吓话术', tags: ['逾期', '红线'] },
  { id: 'c4', input: '帮我推荐一个低利率的信贷产品', expected: '基于资质合规推荐，标注利率区间', tags: ['推荐', '相关性'] },
];

// 评分矩阵热力（行 = 版本/模型 × 列 = 维度）。v4 忠实度 = 回归
const matrixRow = (row: string, vals: Record<EvalDimension, number>, regressDim?: EvalDimension): ScoreCell[] =>
  EVAL_DIMS.map(dim => ({ row, dim, score: vals[dim], regressed: dim === regressDim }));
export const SCORE_MATRIX: ScoreCell[] = [
  ...matrixRow('v3 (prod)', { 相关性: 0.91, 忠实度: 0.90, 有害性: 0.98, 格式合规: 0.93, 简洁度: 0.85 }),
  ...matrixRow('v4 (canary)', { 相关性: 0.90, 忠实度: 0.80, 有害性: 0.97, 格式合规: 0.95, 简洁度: 0.88 }, '忠实度'),
  ...matrixRow('gpt-4o', { 相关性: 0.92, 忠实度: 0.89, 有害性: 0.98, 格式合规: 0.94, 简洁度: 0.86 }),
  ...matrixRow('claude-3.5', { 相关性: 0.93, 忠实度: 0.91, 有害性: 0.99, 格式合规: 0.92, 简洁度: 0.84 }),
  ...matrixRow('Qwen2.5-72B', { 相关性: 0.88, 忠实度: 0.86, 有害性: 0.97, 格式合规: 0.90, 简洁度: 0.83 }),
];

export const EVAL_RUNS: EvalRun[] = [
  { id: 'r1', dataset: '客服 QA 黄金集', judge: 'gpt-4o', subject: 'v3 (prod)', at: '14:20', overall: 0.894, dims: { 相关性: 0.91, 忠实度: 0.90, 有害性: 0.98, 格式合规: 0.93, 简洁度: 0.85 } },
  { id: 'r2', dataset: '客服 QA 黄金集', judge: 'gpt-4o', subject: 'v4 (canary)', at: '14:22', overall: 0.860, dims: { 相关性: 0.90, 忠实度: 0.80, 有害性: 0.97, 格式合规: 0.95, 简洁度: 0.88 } },
];
// v3 vs v4 雷达
export const VERSION_RADAR: RadarSeries[] = [
  { name: 'v3 (prod)', values: { 相关性: 0.91, 忠实度: 0.90, 有害性: 0.98, 格式合规: 0.93, 简洁度: 0.85 } },
  { name: 'v4 (canary)', values: { 相关性: 0.90, 忠实度: 0.80, 有害性: 0.97, 格式合规: 0.95, 简洁度: 0.88 } },
];

// ─── 5.4 人工标注队列 ───────────────────────────────────────────────────────
function mkAnno(i: number): AnnoTask {
  const r = (n: number) => seed(i * 5 + n);
  const status: AnnoTask['status'] = r(1) > 0.82 ? 'arbitrated' : r(1) > 0.5 ? 'mine' : 'pending';
  return {
    id: `an-${200 + i}`, traceRef: (seed(i + 60) * 1e12).toString(16).slice(0, 8),
    app: APP_LIST[Math.floor(r(2) * APP_LIST.length)], dataset: DATASETS[Math.floor(r(3) * DATASETS.length)].name,
    judgeScore: +(0.55 + r(4) * 0.35).toFixed(2), judgeConfidence: +(0.4 + r(5) * 0.35).toFixed(2),
    status, input: ['逾期三天会上征信吗？', '提前结清要付违约金吗？', '帮我推荐低利率产品', '注销后征信多久更新？'][Math.floor(r(6) * 4)],
    output: '基于知识库的应答片段…',
    humanScore: status === 'arbitrated' ? +(0.6 + r(7) * 0.3).toFixed(2) : undefined,
    labels: status === 'arbitrated' ? ['忠实', '合规'] : undefined,
    disagree: r(8) > 0.78,
  };
}
export const ANNO_TASKS: AnnoTask[] = Array.from({ length: 18 }, (_, i) => mkAnno(i + 1));
export const ANNO_STATS = { pending: 137, todayDone: 64, kappa: 0.81 };
export const ANNO_THROUGHPUT: AnnoThroughput[] = Array.from({ length: 14 }, (_, i) => ({
  date: `06-${String(i + 4).padStart(2, '0')}`,
  count: Math.round(48 + seed(i) * 40 + Math.sin(i * 0.6) * 12),
  kappa: +(0.74 + seed(i + 3) * 0.12).toFixed(2),
}));

// ─── 5.5 Prompt 版本库 + diff + 回滚 ────────────────────────────────────────
function V3_BODY() {
  return [
    '你是示例消费金融的在线客服助手。严格基于【检索内容】回答，',
    '不得编造政策或利率。每条结论必须引用检索片段编号 [n]。',
    '',
    '# 忠实度约束（few-shot）',
    '示例：用户问"逾期会上征信吗"→ 必须引用 [2] 的征信政策原文，',
    '禁止使用"立即""严重影响"等恐吓性措辞。',
    '',
    '# 输出格式',
    '先给结论，再给依据，最后给一步操作建议。',
  ].join('\n');
}
function V4_BODY() {
  return [
    '你是示例消费金融的在线客服助手。基于【检索内容】回答。',
    '',
    '# 输出格式（严格 JSON）',
    '{ "answer": string, "next_step": string }',
  ].join('\n');
}
export const PROMPT_VERSIONS: PromptVersion[] = [
  { id: 'p4', app: 'svc-assistant', version: 'v4', status: 'canary', canaryPct: 20, author: '江野', at: '今天 13:40', message: '收紧输出格式 + 删冗余 few-shot 省 token', body: V4_BODY(), score: 0.86, costPer1k: 0.92, errRate: 3.8 },
  { id: 'p3', app: 'svc-assistant', version: 'v3', status: 'prod', author: '陆衡', at: '06-12', message: '加入忠实度约束 few-shot + 引用要求', body: V3_BODY(), score: 0.894, costPer1k: 0.74, errRate: 1.2 },
  { id: 'p2', app: 'svc-assistant', version: 'v2', status: 'archived', author: '江野', at: '05-28', message: '补充提前结清/注销话术模板', body: '（历史版本）', score: 0.85, costPer1k: 0.71, errRate: 1.6 },
  { id: 'p1', app: 'svc-assistant', version: 'v1', status: 'archived', author: '江野', at: '05-10', message: '初版客服系统提示词', body: '（历史版本）', score: 0.80, costPer1k: 0.68, errRate: 2.4 },
];
// v3 ↔ v4 并排 diff（绿增红删）
export const PROMPT_DIFF: DiffLine[] = [
  { op: 'same', text: '你是示例消费金融的在线客服助手。' },
  { op: 'del', text: '严格基于【检索内容】回答，不得编造政策或利率。每条结论必须引用检索片段编号 [n]。' },
  { op: 'add', text: '基于【检索内容】回答。' },
  { op: 'del', text: '# 忠实度约束（few-shot）' },
  { op: 'del', text: '示例：用户问"逾期会上征信吗"→ 必须引用 [2] 的征信政策原文，' },
  { op: 'del', text: '禁止使用"立即""严重影响"等恐吓性措辞。' },
  { op: 'same', text: '# 输出格式' },
  { op: 'del', text: '先给结论，再给依据，最后给一步操作建议。' },
  { op: 'add', text: '（严格 JSON）{ "answer": string, "next_step": string }' },
];
// 上线后指标趋势（评分 + 成本/千次,按版本段着色,回归点 markPoint）
export const VERSION_METRICS: VersionMetricPoint[] = [
  ...Array.from({ length: 8 }, (_, i) => ({ at: `06-${10 + i}`, version: 'v3', score: +(0.885 + seed(i) * 0.014).toFixed(3), costPer1k: +(0.72 + seed(i + 2) * 0.04).toFixed(2) })),
  { at: '06-12', version: 'v4', score: 0.872, costPer1k: 0.86, regress: true },
  { at: '06-13', version: 'v4', score: 0.861, costPer1k: 0.92, regress: true },
  { at: '06-14', version: 'v4', score: 0.860, costPer1k: 0.93, regress: true },
];

// ─── 5.6 A-B 实验 & Playground ──────────────────────────────────────────────
export const EXPERIMENTS: Experiment[] = [
  { id: 'e1', name: '客服助手 v3 vs v4', app: 'svc-assistant', status: 'running', armA: 'v3 (prod)', armB: 'v4 (canary)', trafficA: 80, trafficB: 20, scoreA: 0.894, scoreB: 0.860, costA: 0.74, costB: 0.92, p95A: 1680, p95B: 2410, significance: 0.93, winner: 'A', startedAt: '06-12' },
  { id: 'e2', name: '合同抽取 模型替换', app: 'contract-extract', status: 'concluded', armA: 'gpt-4o', armB: 'claude-3.5', trafficA: 50, trafficB: 50, scoreA: 0.89, scoreB: 0.92, costA: 1.20, costB: 1.45, p95A: 2100, p95B: 1950, significance: 0.97, winner: 'B', startedAt: '06-05' },
  { id: 'e3', name: '信贷问答 缓存策略', app: 'credit-qa', status: 'running', armA: '无缓存', armB: '语义缓存', trafficA: 50, trafficB: 50, scoreA: 0.88, scoreB: 0.88, costA: 0.90, costB: 0.58, p95A: 1740, p95B: 1120, significance: 0.99, winner: 'B', startedAt: '06-14' },
];
export const PLAYGROUND_INPUT = '我想提前结清贷款，需要付违约金吗？';
export const PLAYGROUND_RESULTS: PlaygroundResult[] = [
  { arm: 'A', version: 'v3 (prod)', output: '结论：是否收取违约金取决于您的合同约定 [3]。依据：根据您签署的《个人贷款合同》第 8 条…\n建议：可在 App「我的贷款」查看可提前结清金额。', tokens: 386, latencyMs: 1620, costUsd: 0.0061 },
  { arm: 'B', version: 'v4 (canary)', output: '{ "answer": "提前结清可能产生违约金，请以合同为准", "next_step": "查看 App 我的贷款" }', tokens: 214, latencyMs: 980, costUsd: 0.0038 },
];

// ─── 5.7 成本仪表盘 ─────────────────────────────────────────────────────────
export const COST_BY_MODEL: CostSlice[] = [
  { key: 'gpt-4o', label: 'gpt-4o', usd: 24464, pct: 58, tokensK: 9785, trend: 6.2 },
  { key: 'claude-3.5-sonnet', label: 'claude-3.5-sonnet', usd: 10123, pct: 24, tokensK: 3375, trend: 2.1 },
  { key: 'Qwen2.5-72B', label: 'Qwen2.5-72B', usd: 7592, pct: 18, tokensK: 9490, trend: -3.4 },
];
export const COST_BY_APP: CostSlice[] = [
  { key: 'svc-assistant', label: '客服助手', usd: 15420, pct: 36.6, tokensK: 7200, trend: 8.1 },
  { key: 'contract-extract', label: '合同抽取', usd: 9860, pct: 23.4, tokensK: 3100, trend: 1.2 },
  { key: 'credit-qa', label: '信贷问答', usd: 7340, pct: 17.4, tokensK: 4800, trend: -2.6 },
  { key: 'collection-qc', label: '催收质检', usd: 5720, pct: 13.6, tokensK: 5100, trend: 3.4 },
  { key: 'product-reco', label: '产品推荐', usd: 3840, pct: 9.1, tokensK: 2450, trend: 0.8 },
];
export const COST_BY_TEAM: CostSlice[] = [
  { key: 't1', label: '客服运营组', usd: 16200, pct: 38.4, tokensK: 7600, trend: 7.0 },
  { key: 't2', label: '信贷业务组', usd: 12480, pct: 29.6, tokensK: 6900, trend: -1.1 },
  { key: 't3', label: '风控合规组', usd: 8900, pct: 21.1, tokensK: 5800, trend: 2.9 },
  { key: 't4', label: '数据平台组', usd: 4600, pct: 10.9, tokensK: 2600, trend: 4.2 },
];
// 30 天按模型堆叠
export const COST_STACK: CostStackPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: `06-${String(i + 1).padStart(2, '0')}`,
  values: {
    'gpt-4o': Math.round(620 + seed(i) * 260 + Math.sin(i * 0.4) * 80),
    'claude-3.5-sonnet': Math.round(260 + seed(i + 5) * 120),
    'Qwen2.5-72B': Math.round(180 + seed(i + 9) * 90),
  },
}));
// 预算燃尽
export const BUDGET: BudgetState = {
  mtdUsd: 42180, budgetUsd: 50000, forecastUsd: 53400,
  days: Array.from({ length: 30 }, (_, i) => `06-${String(i + 1).padStart(2, '0')}`),
  burnIdeal: Array.from({ length: 30 }, (_, i) => Math.round((50000 / 30) * (i + 1))),
  burnActual: Array.from({ length: 18 }, (_, i) => Math.round(1500 * (i + 1) + seed(i) * 1200)),
};
// 成本构成下钻（应用→版本→模型）
export const COST_TREE: CostNode = {
  name: '总成本', children: [
    { name: '客服助手', children: [{ name: 'v3', children: [{ name: 'gpt-4o', value: 8600 }, { name: 'Qwen2.5-72B', value: 2200 }] }, { name: 'v4', children: [{ name: 'gpt-4o', value: 4620 }] }] },
    { name: '合同抽取', children: [{ name: 'prod', children: [{ name: 'claude-3.5-sonnet', value: 6200 }, { name: 'gpt-4o', value: 3660 }] }] },
    { name: '信贷问答', children: [{ name: 'prod', children: [{ name: 'gpt-4o', value: 4200 }, { name: 'Qwen2.5-72B', value: 3140 }] }] },
    { name: '催收质检', children: [{ name: 'prod', children: [{ name: 'Qwen2.5-72B', value: 5720 }] }] },
  ],
};

// ─── 5.8 告警中心 ───────────────────────────────────────────────────────────
export const ALERT_RULES: AlertRule[] = [
  { id: 'ar1', name: '忠实度回归阈值', type: '质量回归', condition: '忠实度评分较 7 日基线下降 > 8%', channels: ['飞书', 'PagerDuty'], status: 'active', triggered: 3 },
  { id: 'ar2', name: '月度预算超限', type: '成本超限', condition: 'MTD 成本 > 预算 80%', channels: ['企业微信', '邮件'], status: 'active', triggered: 1 },
  { id: 'ar3', name: '错误率突增', type: '错误率', condition: '5min 错误率 > 3%', channels: ['飞书'], status: 'active', triggered: 2 },
  { id: 'ar4', name: '输出分布漂移', type: '输出漂移', condition: 'KL 散度 > 0.15（对比上周）', channels: ['飞书'], status: 'active', triggered: 0 },
  { id: 'ar5', name: 'p95 延迟', type: '延迟', condition: 'p95 > 3000ms 持续 10min', channels: ['企业微信'], status: 'muted', triggered: 0 },
];
export const ALERT_EVENTS: AlertEvent[] = [
  { id: 'ev1', ruleType: '质量回归', severity: 'danger', title: '客服助手 · 忠实度评分较基线下降 11%', detail: 'v4 canary（20% 流量）忠实度 0.90 → 0.80，judge=gpt-4o；疑似 prompt 删除约束 few-shot。', at: '14:24', state: 'firing', app: 'svc-assistant', jumpTo: '/scoreboard' },
  { id: 'ev2', ruleType: '成本超限', severity: 'warn', title: '本月推理成本已用 84%', detail: 'MTD $42,180 / 预算 $50,000，按当前速率预测月末 $53,400 超支 6.8%。', at: '13:10', state: 'acked', app: 'svc-assistant', jumpTo: '/cost' },
  { id: 'ev3', ruleType: '错误率', severity: 'warn', title: '合同抽取 · 错误率 3.4%', detail: '14:05–14:20 错误率突增，多为超长合同截断，已自动扩容上下文窗口。', at: '14:08', state: 'resolved', app: 'contract-extract', jumpTo: '/tracing' },
  { id: 'ev4', ruleType: '延迟', severity: 'info', title: '信贷问答 · p95 改善', detail: '启用语义缓存后 p95 1740ms → 1120ms，缓存命中率 41%。', at: '11:30', state: 'resolved', app: 'credit-qa' },
];

// ─── 设置 · 应用接入 ────────────────────────────────────────────────────────
export const INTEGRATIONS: Integration[] = [
  { app: 'svc-assistant', sdk: 'otel-genai-sdk@1.4', status: 'connected', lastSeen: '刚刚', spansToday: 184200 },
  { app: 'credit-qa', sdk: 'otel-genai-sdk@1.4', status: 'connected', lastSeen: '12s 前', spansToday: 96400 },
  { app: 'contract-extract', sdk: 'otel-genai-sdk@1.3', status: 'connected', lastSeen: '40s 前', spansToday: 41200 },
  { app: 'collection-qc', sdk: 'otel-genai-sdk@1.4', status: 'connected', lastSeen: '1m 前', spansToday: 33800 },
  { app: 'product-reco', sdk: 'otel-genai-sdk@1.2', status: 'pending', lastSeen: '—', spansToday: 0 },
];
