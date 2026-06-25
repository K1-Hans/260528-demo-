import { CheckCircle2, AlertTriangle, AlertCircle, XCircle, Truck } from 'lucide-react';
import type { Health } from '../types';
import { HEALTH_LABEL } from '../types';

// ════ 链枢 签名组件（健康 4 阶 chip/dot · 履约阶段进度 · 风险点 · 在途 pill · 通用窗格）════

const HEALTH_META: Record<Health, { cls: string; Icon: typeof CheckCircle2; colorVar: string }> = {
  ok: { cls: 'health-ok', Icon: CheckCircle2, colorVar: '--success' },
  watch: { cls: 'health-watch', Icon: AlertTriangle, colorVar: '--warning' },
  low: { cls: 'health-low', Icon: AlertCircle, colorVar: '--gold' },
  broken: { cls: 'health-broken', Icon: XCircle, colorVar: '--danger' },
};

/** 健康 4 阶标签（控制塔色彩语言 · 正常/预警/缺货/断流）。 */
export function HealthChip({ health, showLabel = true }: { health: Health; showLabel?: boolean }) {
  const { cls, Icon } = HEALTH_META[health];
  return (
    <span className={`health-chip ${cls}`}>
      <Icon size={11} />{showLabel && HEALTH_LABEL[health]}
    </span>
  );
}

/** 健康点（地图/列表用 · 纯色点）。 */
export function HealthDot({ health }: { health: Health }) {
  return <span className="health-dot" style={{ background: `var(${HEALTH_META[health].colorVar})` }} />;
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

/** 在途货流 pill。 */
export function TransitPill({ units, sm }: { units: number; sm?: boolean }) {
  return (
    <span className="transit-pill" style={sm ? { padding: '2px 8px', fontSize: 11 } : undefined}>
      <Truck size={sm ? 11 : 12} />在途 {units.toLocaleString()}
    </span>
  );
}

const STAGES = ['采购', '在途', '入库', '拣货', '发运', '签收'];
/** 履约阶段进度（采购→在途→入库→拣货→发运→签收）。 */
export function StageTrack({ stage }: { stage: number }) {
  return (
    <div className="stage-track">
      {STAGES.map((s, i) => (
        <div key={s} className="row" style={{ flex: i === STAGES.length - 1 ? '0 0 auto' : 1, alignItems: 'center' }}>
          <div className={`stage-dot ${i < stage ? 'done' : i === stage ? 'active' : ''}`} title={s} />
          {i < STAGES.length - 1 && <div className={`stage-line ${i < stage ? 'done' : ''}`} />}
        </div>
      ))}
    </div>
  );
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
