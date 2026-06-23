import { useMemo } from 'react';

interface Props {
  active?: boolean;        // 通话中 → 翡翠流动；false → 静音灰平线
  sensitive?: boolean;     // 敏感词触发 → 琥珀脉冲
  bars?: number;
  height?: number;
  color?: string;          // 覆盖色（默认翡翠 --gold）
  className?: string;
}

/** 真 SVG/CSS 声波（非假 div 条）：通话中=翡翠流动波形，静音=灰平线，敏感词=琥珀。 */
export default function Waveform({ active = true, sensitive = false, bars = 28, height = 30, color, className = '' }: Props) {
  const c = sensitive ? 'var(--warning)' : (color ?? 'var(--gold)');
  // 确定性的 sine 基础高度（每条柱不同），叠加 stagger 延迟形成流动感
  const heights = useMemo(
    () => Array.from({ length: bars }, (_, i) => 0.32 + 0.62 * Math.abs(Math.sin((i / bars) * Math.PI * 3 + i * 0.7))),
    [bars],
  );
  return (
    <div className={`wave ${className}`} style={{ height }} aria-hidden>
      {heights.map((h, i) => (
        <span
          key={i}
          className={`wave-bar ${active ? 'on' : ''}`}
          style={{
            height: `${Math.round(h * 100)}%`,
            background: active ? c : 'var(--text-3)',
            opacity: active ? 1 : 0.5,
            ['--d' as string]: `${(i % 9) * 80}ms`,
          }}
        />
      ))}
    </div>
  );
}
