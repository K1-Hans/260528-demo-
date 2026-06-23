import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import type { CallState, ComplianceLight } from '../types';
import { CALL_STATE_LABEL } from '../types';

// ════ 语音/外呼签名组件（作战窗格 · 合规三灯 · 通话状态 · 倒计时）════

/** 作战窗格：带标题栏的多窗格单元（Bloomberg/Dialpad 式窗）。 */
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

/** 合规三灯（频控余量 / 静默时段 / 资质有效 · 三灯全绿才能发起活动）。 */
export function ComplianceLights({ lights, compact }: { lights: ComplianceLight[]; compact?: boolean }) {
  const allOn = lights.every(l => l.state === 'on');
  return (
    <div className="comp-lights" title={allOn ? '合规三灯全绿 · 可发起活动' : '存在合规风险 · 不可发起活动'}>
      {!compact && <ShieldCheck size={13} style={{ color: allOn ? 'var(--success)' : 'var(--warning)' }} />}
      {lights.map(l => (
        <span key={l.key} className={`comp-light ${l.state}`} title={`${l.label}：${l.detail}`}>
          <span className="dot" />{!compact && l.label}
        </span>
      ))}
    </div>
  );
}

/** 单灯（用于卡片内联）。 */
export function LightDot({ state }: { state: ComplianceLight['state'] }) {
  return <span className={`comp-light ${state}`}><span className="dot" /></span>;
}

const CS_CLASS: Record<CallState, string> = { dialing: 'cs-dialing', ringing: 'cs-ringing', talking: 'cs-talking', wrap: 'cs-wrap' };
const CS_ICON: Record<CallState, React.ReactNode> = {
  dialing: <ShieldAlert size={11} />, ringing: <ShieldAlert size={11} />, talking: <ShieldCheck size={11} />, wrap: <ShieldX size={11} />,
};

/** 通话状态徽章（拨号中/振铃/通话中/小结）。 */
export function CallStateBadge({ state, showIcon }: { state: CallState; showIcon?: boolean }) {
  return (
    <span className={`call-state ${CS_CLASS[state]}`}>
      <span className="dot" />{showIcon && CS_ICON[state]}{CALL_STATE_LABEL[state]}
    </span>
  );
}

/** 通话计时 / 倒计时 chip（秒 → mm:ss）。countUp=true 为计时上行，否则倒计时。 */
export function TimeChip({ seconds, countUp = false, urgentBelow = 0 }: { seconds: number; countUp?: boolean; urgentBelow?: number }) {
  const [s, setS] = useState(seconds);
  useEffect(() => { setS(seconds); }, [seconds]);
  useEffect(() => {
    const id = setInterval(() => setS(v => countUp ? v + 1 : Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [countUp]);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  const urgent = !countUp && urgentBelow > 0 && s < urgentBelow;
  const c = !countUp && s <= 0 ? 'var(--danger)' : urgent ? 'var(--warning)' : 'var(--text-2)';
  return <span className="mononum" style={{ fontSize: 12, fontWeight: 600, color: c }}>{!countUp && s <= 0 ? '超时' : `${mm}:${ss}`}</span>;
}
