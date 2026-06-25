import {
  Circle, Loader, CheckCircle2, XCircle, UserCheck,
  Zap, Sparkles, Wrench, Database, Bot, GitFork, Flag,
} from 'lucide-react';
import type { NodeType, RunState } from '../types';
import { NODE_TYPE_LABEL, RUN_STATE_LABEL } from '../types';

// ════ 织流 签名组件（run-state chip · 节点类型图标 · 风险点 · 遥测 pill · 通用窗格）════

const RUN_META: Record<RunState, { cls: string; Icon: typeof Circle }> = {
  idle: { cls: 'run-idle', Icon: Circle },
  running: { cls: 'run-running', Icon: Loader },
  done: { cls: 'run-done', Icon: CheckCircle2 },
  error: { cls: 'run-error', Icon: XCircle },
  wait: { cls: 'run-wait', Icon: UserCheck },
};

/** 运行态 chip（待运行/执行中/完成/出错/等人审）。 */
export function RunStateChip({ state, showLabel = true }: { state: RunState; showLabel?: boolean }) {
  const { cls, Icon } = RUN_META[state];
  return (
    <span className={`run-chip ${cls}`}>
      <Icon size={11} className={state === 'running' ? 'spin-slow' : ''} />{showLabel && RUN_STATE_LABEL[state]}
    </span>
  );
}

const NODE_META: Record<NodeType, { Icon: typeof Zap; cls: string }> = {
  input: { Icon: Zap, cls: 'ntype-router' },
  llm: { Icon: Sparkles, cls: 'ntype-llm' },
  tool: { Icon: Wrench, cls: 'ntype-tool' },
  retriever: { Icon: Database, cls: 'ntype-retriever' },
  agent: { Icon: Bot, cls: 'ntype-agent' },
  router: { Icon: GitFork, cls: 'ntype-router' },
  gate: { Icon: UserCheck, cls: 'ntype-gate' },
  output: { Icon: Flag, cls: 'ntype-agent' },
};

/** 节点类型图标（带类型色）。 */
export function NodeTypeIcon({ type, size = 13 }: { type: NodeType; size?: number }) {
  const { Icon, cls } = NODE_META[type];
  return <Icon size={size} className={cls} />;
}

/** 节点类型 badge（图标 + 文字）。 */
export function NodeTypeBadge({ type }: { type: NodeType }) {
  const { Icon, cls } = NODE_META[type];
  return (
    <span className={`flow-node-type ${cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Icon size={11} />{NODE_TYPE_LABEL[type]}
    </span>
  );
}

/** 风险点（high/mid/low）。 */
export function RiskDot({ risk }: { risk: 'high' | 'mid' | 'low' }) {
  const color = risk === 'high' ? 'var(--danger)' : risk === 'mid' ? 'var(--warning)' : 'var(--success)';
  const label = risk === 'high' ? '高风险' : risk === 'mid' ? '中风险' : '低风险';
  return (
    <span className="row gap-1" style={{ fontSize: 11, fontWeight: 600, color }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />{label}
    </span>
  );
}

/** 遥测 pill（token / 耗时等）。 */
export function TelePill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <span className="tele-pill">{icon}{children}</span>;
}

/** 通用窗格：带标题栏的多窗格单元。 */
export function Panel({ title, icon, right, children, className = '', style, bodyClass = 'panel-body' }: {
  title?: React.ReactNode; icon?: React.ReactNode; right?: React.ReactNode;
  children: React.ReactNode; className?: string; style?: React.CSSProperties; bodyClass?: string;
}) {
  return (
    <div className={`panel ${className}`} style={style}>
      {title && (
        <div className="panel-head">
          <span className="panel-title">{icon}{title}</span>
          {right}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </div>
  );
}
