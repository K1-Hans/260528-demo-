// ECharts theme helpers — theme-aware, reads CSS variables live so charts
// re-render correctly on Dark/Light switch (Chart.tsx rebuilds option on mode change).
// 风控中台：accent = 克制金（--gold 品牌）· 三态 = 放行绿 / 复核琥珀 / 拦截红。

export function cssVar(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function chartPalette(): string[] {
  return ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8'].map(cssVar);
}

/** 主强调 = 克制金（品牌/KPI） */
export function accent(): string { return cssVar('--gold'); }
/** 风险三态 */
export function pass(): string { return cssVar('--success'); }
export function review(): string { return cssVar('--warning'); }
export function block(): string { return cssVar('--danger'); }
export function warn(): string { return cssVar('--warning'); }
export function danger(): string { return cssVar('--danger'); }

/** 语义色（状态 / 序列 通用） */
export const SEMANTIC = {
  brand: '--gold', pass: '--success', review: '--warning', block: '--danger', info: '--info',
} as const;
export function sem(k: keyof typeof SEMANTIC): string { return cssVar(SEMANTIC[k]); }

// Base option fragment shared by all charts (fonts, grid, tooltip).
export function baseOption(): Record<string, unknown> {
  const text1 = cssVar('--text-1');
  const text2 = cssVar('--text-2');
  const text3 = cssVar('--text-3');
  const hairline = cssVar('--hairline');
  const surface = cssVar('--surface-1');
  const font = "'Geist','PingFang SC',system-ui,sans-serif";

  return {
    color: chartPalette(),
    textStyle: { fontFamily: font, color: text2 },
    grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
    tooltip: {
      backgroundColor: surface,
      borderColor: hairline,
      borderWidth: 1,
      padding: [9, 13],
      textStyle: { color: text1, fontSize: 12, fontFamily: font },
      extraCssText: 'border-radius:10px;box-shadow:0 12px 36px rgba(0,0,0,.4);',
      axisPointer: { type: 'line', lineStyle: { color: cssVar('--hairline-strong') } },
    },
    categoryAxis: { axisColor: text3, splitColor: hairline },
  };
}

export function axisStyle() {
  const text3 = cssVar('--text-3');
  const hairline = cssVar('--hairline');
  return {
    axisLine: { lineStyle: { color: hairline } },
    axisTick: { show: false },
    axisLabel: { color: text3, fontSize: 11, fontFamily: "'Geist Mono','Geist',sans-serif" },
    splitLine: { lineStyle: { color: hairline, type: 'dashed' } },
  };
}

/** 渐变面积色（顶→底淡出），传入 hex 或 css 变量解析后的色值 */
export function areaGradient(color: string, topOpacity = 0.26) {
  return {
    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [
      { offset: 0, color: `color-mix(in srgb, ${color} ${topOpacity * 100}%, transparent)` },
      { offset: 1, color: `color-mix(in srgb, ${color} 0%, transparent)` },
    ],
  };
}

export const ANIM = { animationDuration: 800, animationEasing: 'cubicOut' as const };
export const DRAW = { animationDuration: 900, animationEasing: 'cubicOut' as const, animationDelay: (i: number) => i * 40 };
