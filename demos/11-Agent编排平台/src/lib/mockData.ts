// ════════════════════════════════════════════════════════════════════════
// AI Agent 编排平台 · Mock 数据（全前端，无后端）
// 🔒 脱敏：示例消金/示例银行，案件 FR-****、用户****，无真实机构/PII。
// 行业锚定：信贷反欺诈调查 Agent 编排（接案→采集→规则→检索→LLM研判→评分→人审→结论）。
// ════════════════════════════════════════════════════════════════════════

import type {
  Role, User, Alert, FlowNode, FlowEdge, Workflow, RunRecord, RunStep,
  AgentDef, AgentMessage, ToolDef, GateItem, Deployment,
} from '../types';

const sp = (a: number, n = 7) => Array.from({ length: n }, (_, i) => +(a * (1 + Math.sin(i / 1.6) * 0.16 + (i % 3 - 1) * 0.05)).toFixed(2));

// ─── 角色 RBAC（4 角色 · 权限分权差异化）────────────────────────────────────
export const ROLES: Role[] = [
  {
    id: 'orchestrator', name: '编排工程师', enName: 'Orchestrator', color: '#22D3EE',
    description: '搭建与编排 Agent 工作流，调试执行链路',
    landing: '/canvas',
    permissions: ['canvas:read', 'canvas:edit', 'runs:read', 'agents:read', 'tools:read', 'debug:read', 'deploy:read'],
  },
  {
    id: 'agent_dev', name: 'Agent 开发', enName: 'Agent Dev', color: '#34D399',
    description: '开发单体 Agent、接入工具/MCP，调试节点',
    landing: '/agents',
    permissions: ['canvas:read', 'agents:read', 'agents:edit', 'tools:read', 'debug:read'],
  },
  {
    id: 'ops', name: '平台运维', enName: 'Platform Ops', color: '#60A5FA',
    description: '监控运行、发布版本与灰度回滚，处理异常',
    landing: '/runs',
    permissions: ['canvas:read', 'runs:read', 'debug:read', 'deploy:read', 'deploy:edit'],
  },
  {
    id: 'lead', name: '平台负责人', enName: 'Platform Lead', color: '#FBBF24',
    description: '全局只读总览编排、运行、Agent 与发布',
    landing: '/canvas',
    permissions: ['canvas:read', 'runs:read', 'agents:read', 'tools:read', 'debug:read', 'deploy:read'],
  },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: '罗芮', username: 'luorui', role: 'orchestrator', dept: 'AI 平台部', lastLogin: '今天 09:02', status: 'active', note: '编排工程师' },
  { id: 'u2', name: '周野', username: 'zhouye', role: 'agent_dev', dept: 'AI 平台部', lastLogin: '今天 09:18', status: 'active', note: 'Agent 开发' },
  { id: 'u3', name: '高崎', username: 'gaoqi', role: 'ops', dept: 'SRE 运维组', lastLogin: '今天 09:33', status: 'active', note: '平台运维' },
  { id: 'u4', name: '韦珩', username: 'weiheng', role: 'lead', dept: 'AI 平台部', lastLogin: '昨天 20:48', status: 'active', note: '平台负责人' },
  { id: 'u5', name: '林深', username: 'linshen', role: 'agent_dev', dept: 'AI 平台部', status: 'inactive', note: '已离职停用' },
];

// ─── 编排画布：信贷反欺诈调查 Agent 工作流（旗舰 DAG · 正在 run）──────────────────
export const FLOW_NODES: FlowNode[] = [
  { id: 'n1', name: '接案触发', type: 'input', x: 8, y: 50, runState: 'done', io: '案件 FR-20571 · 疑似团伙欺诈' },
  { id: 'n2', name: '资料采集 Agent', type: 'agent', x: 23, y: 50, runState: 'done', model: 'claude-sonnet', tokens: 3240, latencyMs: 1820, io: '采集申请/设备/关系 12 项' },
  { id: 'n3', name: '规则引擎', type: 'tool', x: 40, y: 26, runState: 'done', tokens: 0, latencyMs: 240, io: '命中 7 条反欺诈规则' },
  { id: 'n4', name: '征信检索', type: 'retriever', x: 40, y: 74, runState: 'done', tokens: 0, latencyMs: 680, io: '召回 4 份征信/黑名单片段' },
  { id: 'n5', name: 'LLM 研判', type: 'llm', x: 58, y: 50, runState: 'running', model: 'claude-opus', tokens: 5120, latencyMs: 3400, io: '综合规则+征信生成研判…' },
  { id: 'n6', name: '风险评分', type: 'tool', x: 74, y: 50, runState: 'idle', io: '待 LLM 输出后打分' },
  { id: 'n7', name: '高风险人审 Gate', type: 'gate', x: 89, y: 30, runState: 'wait', io: '风险≥阈值 → 推送人审' },
  { id: 'n8', name: '结论落库', type: 'output', x: 89, y: 70, runState: 'idle', io: '写入案件结论 + 留痕' },
];
export const FLOW_EDGES: FlowEdge[] = [
  { source: 'n1', target: 'n2', state: 'done' },
  { source: 'n2', target: 'n3', state: 'done' },
  { source: 'n2', target: 'n4', state: 'done' },
  { source: 'n3', target: 'n5', state: 'done' },
  { source: 'n4', target: 'n5', state: 'done' },
  { source: 'n5', target: 'n6', state: 'active' },
  { source: 'n6', target: 'n7', state: 'idle' },
  { source: 'n6', target: 'n8', state: 'idle' },
];
export const WORKFLOW: Workflow = {
  id: 'wf1', name: '信贷反欺诈调查编排', vertical: '示例消金 · 反欺诈', status: 'running',
  nodes: FLOW_NODES, edges: FLOW_EDGES, version: 'v2.4',
};
export const WORKFLOW_LIST = [
  { id: 'wf1', name: '信贷反欺诈调查编排', vertical: '反欺诈', status: 'running' as const, nodes: 8, runs7d: 1240 },
  { id: 'wf2', name: '智能投研多 Agent', vertical: '投研', status: 'live' as const, nodes: 11, runs7d: 386 },
  { id: 'wf3', name: '贷后催收话术编排', vertical: '贷后', status: 'live' as const, nodes: 6, runs7d: 920 },
  { id: 'wf4', name: '理财顾问问答编排', vertical: '财富', status: 'draft' as const, nodes: 9, runs7d: 0 },
];
export const FLOW_KPIS = [
  { label: '在线工作流', raw: 12, unit: '个', change: 2, spark: sp(12) },
  { label: '今日执行', raw: 8642, unit: '次', change: 14.2, decimals: 0, spark: sp(8642) },
  { label: '平均链路耗时', raw: 6.8, unit: 's', change: -0.9, decimals: 1, spark: sp(6.8) },
  { label: '执行成功率', raw: 96.4, unit: '%', change: 1.6, decimals: 1, spark: sp(96) },
];

// ─── 运行历史 + 单步 trace ──────────────────────────────────────────────────────
const TRACE_1: RunStep[] = [
  { seq: 1, nodeId: 'n1', nodeName: '接案触发', type: 'input', state: 'done', startMs: 0, durMs: 12, input: '案件 FR-20571' },
  { seq: 2, nodeId: 'n2', nodeName: '资料采集 Agent', type: 'agent', state: 'done', startMs: 12, durMs: 1820, tokens: 3240, output: '采集 12 项资料' },
  { seq: 3, nodeId: 'n3', nodeName: '规则引擎', type: 'tool', state: 'done', startMs: 1832, durMs: 240, output: '命中 7 条规则' },
  { seq: 4, nodeId: 'n4', nodeName: '征信检索', type: 'retriever', state: 'done', startMs: 1832, durMs: 680, output: '召回 4 片段' },
  { seq: 5, nodeId: 'n5', nodeName: 'LLM 研判', type: 'llm', state: 'running', startMs: 2512, durMs: 3400, tokens: 5120, output: '研判生成中…' },
];
export const RUN_RECORDS: RunRecord[] = [
  { id: 'r1', workflow: '信贷反欺诈调查编排', trigger: '案件 FR-20571', startedAt: '14:32:08', status: 'running', durationMs: 5912, totalTokens: 8360, cost: 0.42, steps: TRACE_1 },
  { id: 'r2', workflow: '信贷反欺诈调查编排', trigger: '案件 FR-20568', startedAt: '14:30:41', status: 'waiting', durationMs: 7240, totalTokens: 9120, cost: 0.51, steps: [] },
  { id: 'r3', workflow: '智能投研多 Agent', trigger: '研报请求 RQ-882', startedAt: '14:28:15', status: 'success', durationMs: 18600, totalTokens: 24800, cost: 1.84, steps: [] },
  { id: 'r4', workflow: '贷后催收话术编排', trigger: '批量 320 户', startedAt: '14:25:02', status: 'success', durationMs: 4200, totalTokens: 6100, cost: 0.31, steps: [] },
  { id: 'r5', workflow: '信贷反欺诈调查编排', trigger: '案件 FR-20559', startedAt: '14:21:37', status: 'failed', durationMs: 2100, totalTokens: 1840, cost: 0.09, steps: [] },
  { id: 'r6', workflow: '智能投研多 Agent', trigger: '研报请求 RQ-881', startedAt: '14:18:50', status: 'success', durationMs: 17200, totalTokens: 23100, cost: 1.72, steps: [] },
];
// 执行甘特（节点级时序，单位 ms）
export const GANTT_STEPS = [
  { name: '接案触发', start: 0, dur: 12, type: 'input' as const },
  { name: '资料采集 Agent', start: 12, dur: 1820, type: 'agent' as const },
  { name: '规则引擎', start: 1832, dur: 240, type: 'tool' as const },
  { name: '征信检索', start: 1832, dur: 680, type: 'retriever' as const },
  { name: 'LLM 研判', start: 2512, dur: 3400, type: 'llm' as const },
  { name: '风险评分', start: 5912, dur: 320, type: 'tool' as const },
];
export const RUN_KPIS = [
  { label: '今日运行', raw: 8642, unit: '次', change: 14.2, decimals: 0, spark: sp(8642) },
  { label: '成功率', raw: 96.4, unit: '%', change: 1.6, decimals: 1, spark: sp(96) },
  { label: 'P95 耗时', raw: 12.4, unit: 's', change: -1.2, decimals: 1, spark: sp(12) },
  { label: '今日 Token', raw: 4.86, unit: 'M', change: 9.1, decimals: 2, spark: sp(4.86) },
];

// ─── 多 Agent 协作 ──────────────────────────────────────────────────────────────
export const AGENTS: AgentDef[] = [
  { id: 'a1', name: '资料采集 Agent', role: '数据采集', model: 'claude-sonnet', status: 'done', calls: 8420, successRate: 98.6, lastMsg: '已采集案件 FR-20571 的 12 项资料' },
  { id: 'a2', name: '研判 Agent', role: '风险研判', model: 'claude-opus', status: 'running', calls: 8240, successRate: 95.2, lastMsg: '综合规则命中与征信召回，生成研判结论中…' },
  { id: 'a3', name: '征信检索 Agent', role: '检索增强', model: 'embedding-v3', status: 'done', calls: 8390, successRate: 99.1, lastMsg: '召回 4 份征信/黑名单片段' },
  { id: 'a4', name: '复核 Agent', role: '质量复核', model: 'claude-sonnet', status: 'wait', calls: 1820, successRate: 97.4, lastMsg: '等待高风险人审结论回传' },
  { id: 'a5', name: '话术生成 Agent', role: '贷后催收', model: 'claude-haiku', status: 'idle', calls: 12600, successRate: 96.8, lastMsg: '空闲' },
];
export const AGENT_MESSAGES: AgentMessage[] = [
  { from: '资料采集 Agent', to: '研判 Agent', content: '已交付申请/设备/关系 12 项资料', at: '14:32:10' },
  { from: '征信检索 Agent', to: '研判 Agent', content: '召回 4 份征信片段：含 1 条多头借贷预警', at: '14:32:11' },
  { from: '研判 Agent', to: '复核 Agent', content: '初判风险分 82，疑似团伙欺诈，请求人审复核', at: '14:32:14' },
  { from: '复核 Agent', to: '编排器', content: '风险≥阈值，已转人工审核队列', at: '14:32:14' },
];
export const AGENT_KPIS = [
  { label: '注册 Agent', raw: 24, unit: '个', change: 3, spark: sp(24) },
  { label: '今日调用', raw: 39500, unit: '次', change: 12.0, decimals: 0, spark: sp(39500) },
  { label: '平均成功率', raw: 97.2, unit: '%', change: 0.8, decimals: 1, spark: sp(97) },
  { label: '协作中', raw: 4, unit: '个', change: 1, spark: sp(4) },
];

// ─── 工具 / MCP 市场 ────────────────────────────────────────────────────────────
export const TOOLS: ToolDef[] = [
  { id: 't1', name: '规则引擎', kind: 'builtin', category: '风控', desc: '反欺诈规则集执行与命中返回', calls: 18600, installed: true, latencyMs: 240, successRate: 99.8 },
  { id: 't2', name: '征信查询 MCP', kind: 'mcp', category: '数据', desc: '对接征信/黑名单库的 MCP server', calls: 16200, installed: true, latencyMs: 680, successRate: 98.4 },
  { id: 't3', name: '设备指纹 API', kind: 'api', category: '风控', desc: '设备指纹与团伙关联识别', calls: 9400, installed: true, latencyMs: 420, successRate: 97.2 },
  { id: 't4', name: 'claude-opus', kind: 'llm', category: '模型', desc: '复杂研判/推理主力模型', calls: 8240, installed: true, latencyMs: 3400, successRate: 99.1 },
  { id: 't5', name: '关系图谱 MCP', kind: 'mcp', category: '数据', desc: '团伙关系网络查询 MCP', calls: 6200, installed: true, latencyMs: 540, successRate: 96.8 },
  { id: 't6', name: '工单系统 API', kind: 'api', category: '集成', desc: '推送人审工单与回写结论', calls: 4100, installed: true, latencyMs: 320, successRate: 99.4 },
  { id: 't7', name: '舆情检索 MCP', kind: 'mcp', category: '数据', desc: '企业/个人舆情风险检索', calls: 0, installed: false, latencyMs: 0, successRate: 0 },
  { id: 't8', name: '语音质检 API', kind: 'api', category: '集成', desc: '催收录音合规质检', calls: 0, installed: false, latencyMs: 0, successRate: 0 },
];
export const TOOL_KPIS = [
  { label: '已接入工具', raw: 38, unit: '个', change: 5, spark: sp(38) },
  { label: 'MCP server', raw: 14, unit: '个', change: 4, spark: sp(14) },
  { label: '今日调用', raw: 62400, unit: '次', change: 11.0, decimals: 0, spark: sp(62400) },
  { label: '平均时延', raw: 480, unit: 'ms', change: -8.0, spark: sp(480) },
];

// ─── human-in-loop 审批卡 ───────────────────────────────────────────────────────
export const GATE_ITEMS: GateItem[] = [
  { id: 'g1', title: '案件 FR-20571 高风险研判人审', workflow: '反欺诈调查编排', agent: '研判 Agent', status: 'pending', risk: 'high', detail: '风险分 82 ≥ 阈值 75，疑似团伙欺诈，结论落库前强制人审', at: '14:32' },
  { id: 'g2', title: '案件 FR-20568 多头借贷人审', workflow: '反欺诈调查编排', agent: '研判 Agent', status: 'pending', risk: 'mid', detail: '命中多头借贷规则，风险分 68，建议人工复核', at: '14:30' },
  { id: 'g3', title: '催收话术合规放行', workflow: '贷后催收话术编排', agent: '话术生成 Agent', status: 'approved', risk: 'low', detail: '话术通过合规检测（无威胁/骚扰用语），自动放行人工已抽检', reviewer: '韦珩', at: '14:12' },
  { id: 'g4', title: '低风险案件自动结论', workflow: '反欺诈调查编排', agent: '研判 Agent', status: 'auto', risk: 'low', detail: '风险分 < 40，置信度 96%，Agent 自动结论落库并留痕', at: '13:58' },
];

// ─── 发布 / 版本 ────────────────────────────────────────────────────────────────
export const DEPLOYMENTS: Deployment[] = [
  { id: 'd1', workflow: '信贷反欺诈调查编排', version: 'v2.4', env: '生产', status: 'live', endpoint: '/api/wf/fraud-invest', qps: 42, p95Ms: 12400, successRate: 96.4, deployedAt: '2 天前' },
  { id: 'd2', workflow: '信贷反欺诈调查编排', version: 'v2.5-rc', env: '灰度', status: 'live', endpoint: '/api/wf/fraud-invest@canary', qps: 6, p95Ms: 11200, successRate: 97.1, deployedAt: '4 小时前' },
  { id: 'd3', workflow: '智能投研多 Agent', version: 'v1.8', env: '生产', status: 'live', endpoint: '/api/wf/research', qps: 8, p95Ms: 24600, successRate: 94.2, deployedAt: '6 天前' },
  { id: 'd4', workflow: '贷后催收话术编排', version: 'v3.1', env: '生产', status: 'live', endpoint: '/api/wf/collect-script', qps: 28, p95Ms: 4200, successRate: 98.6, deployedAt: '1 天前' },
  { id: 'd5', workflow: '理财顾问问答编排', version: 'v0.9', env: '测试', status: 'paused', endpoint: '/api/wf/advisor@test', qps: 0, p95Ms: 0, successRate: 0, deployedAt: '—' },
];
export const DEPLOY_KPIS = [
  { label: '生产工作流', raw: 9, unit: '个', change: 1, spark: sp(9) },
  { label: '总 QPS', raw: 84, unit: '', change: 12.0, spark: sp(84) },
  { label: '灰度中', raw: 2, unit: '个', change: 1, spark: sp(2) },
  { label: '平均成功率', raw: 96.4, unit: '%', change: 1.6, decimals: 1, spark: sp(96) },
];

// ─── 通知 ────────────────────────────────────────────────────────────────────
export const ALERTS: Alert[] = [
  { level: 'warn', title: '高风险人审待处理', msg: '案件 FR-20571 风险分 82，研判结论待人审放行', tag: '人审', time: '14:32' },
  { level: 'danger', title: '工作流执行失败', msg: '案件 FR-20559 在征信检索节点超时失败，已告警', tag: '运行', time: '14:21' },
  { level: 'info', title: '灰度发布', msg: '反欺诈编排 v2.5-rc 灰度 6 QPS，成功率 97.1%', tag: '发布', time: '4 小时前' },
  { level: 'info', title: 'MCP 接入', msg: '关系图谱 MCP server 已接入，可在画布拖用', tag: '工具', time: '今天' },
  { level: 'warn', title: 'Token 用量上升', msg: '今日 Token 用量 4.86M，环比 +9.1%，关注成本', tag: '成本', time: '今天' },
];
