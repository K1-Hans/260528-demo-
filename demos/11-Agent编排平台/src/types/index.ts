// ════════════════════════════════════════════════════════════════════════
// AI Agent 编排平台 · 类型契约（全 mock，无后端）
// 行业锚定：通用 / 金融垂直（信贷反欺诈调查 Agent 编排）。
// 范式：编排画布 + 实时执行（DAG 节点卡 + SVG 流动连线 + run-state 脉冲 + 单步 trace）。
// 签名：电路墨暗台（主场）+ 电光青（--gold 实际值 = #22D3EE）。
// 反撞车：反 ④静态知识图谱（这里带运行时执行态）· 反 ③聚合观测（这里单次 run trace）· 反 Dify 通用建器（金融垂直 + 执行优先）。
// 🔒 脱敏：用「示例消金 / 示例银行」，案件/客户用 案件 FR-**** / 用户****，无真实机构/PII。
// ════════════════════════════════════════════════════════════════════════

// ─── Auth & RBAC（4 角色）────────────────────────────────────────────────
export type RoleId = 'orchestrator' | 'agent_dev' | 'ops' | 'lead';

export type PermissionKey =
  | 'canvas:read' | 'canvas:edit'
  | 'runs:read'
  | 'agents:read' | 'agents:edit'
  | 'tools:read'
  | 'debug:read'
  | 'deploy:read' | 'deploy:edit';

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

// ─── 节点类型 + 运行态（画布色彩语言）──────────────────────────────────────────
export type NodeType = 'input' | 'llm' | 'tool' | 'retriever' | 'agent' | 'router' | 'gate' | 'output';
export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  input: '触发', llm: 'LLM', tool: '工具', retriever: '检索', agent: 'Agent', router: '路由', gate: '人审', output: '结论',
};
export type RunState = 'idle' | 'running' | 'done' | 'error' | 'wait';
export const RUN_STATE_LABEL: Record<RunState, string> = {
  idle: '待运行', running: '执行中', done: '完成', error: '出错', wait: '等人审',
};

// ─── 编排画布：DAG（旗舰 · 节点卡 + 流动连线）───────────────────────────────────
export interface FlowNode {
  id: string; name: string; type: NodeType;
  x: number; y: number;            // 画布坐标（0-100 百分比）
  runState: RunState;
  model?: string;                  // LLM/Agent 用的模型
  tokens?: number; latencyMs?: number;
  io?: string;                     // 输入/输出摘要
}
export interface FlowEdge { source: string; target: string; state: 'idle' | 'active' | 'done'; }
export interface Workflow {
  id: string; name: string; vertical: string;
  status: 'live' | 'draft' | 'running';
  nodes: FlowNode[]; edges: FlowEdge[];
  version: string;
}

// ─── 运行历史 + 单步 trace（反 ③ 聚合观测 = 单次 run 链路）───────────────────────
export interface RunStep {
  seq: number; nodeId: string; nodeName: string; type: NodeType;
  state: RunState; startMs: number; durMs: number;
  tokens?: number; input?: string; output?: string;
}
export interface RunRecord {
  id: string; workflow: string; trigger: string;
  startedAt: string; status: 'success' | 'failed' | 'running' | 'waiting';
  durationMs: number; totalTokens: number; cost: number;   // cost ¥
  steps: RunStep[];
}

// ─── 多 Agent 协作（状态机 / 消息）─────────────────────────────────────────────
export interface AgentDef {
  id: string; name: string; role: string; model: string;
  status: RunState; calls: number; successRate: number;
  lastMsg?: string;
}
export interface AgentMessage { from: string; to: string; content: string; at: string; }

// ─── 工具 / MCP 市场 + 节点库 ───────────────────────────────────────────────────
export type ToolKind = 'mcp' | 'builtin' | 'api' | 'llm';
export interface ToolDef {
  id: string; name: string; kind: ToolKind; category: string;
  desc: string; calls: number; installed: boolean; latencyMs: number; successRate: number;
}

// ─── human-in-loop 审批卡 ───────────────────────────────────────────────────────
export interface GateItem {
  id: string; title: string; workflow: string;
  agent: string;
  status: 'pending' | 'approved' | 'blocked' | 'auto';
  risk: 'high' | 'mid' | 'low';
  detail: string; reviewer?: string; at: string;
}

// ─── 发布 / 版本 ────────────────────────────────────────────────────────────────
export interface Deployment {
  id: string; workflow: string; version: string; env: '生产' | '灰度' | '测试';
  status: 'live' | 'paused' | 'rollback';
  endpoint: string; qps: number; p95Ms: number; successRate: number; deployedAt: string;
}
