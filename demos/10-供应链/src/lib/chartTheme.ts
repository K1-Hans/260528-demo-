// ECharts theme helpers — theme-aware, reads CSS variables live so charts
// re-render correctly on Dark/Light switch (Chart.tsx rebuilds option on mode change).
// 链枢 供应链：accent = 货运琥珀（--gold token）· 健康 ramp 正常绿/预警黄/缺货橙/断流红 · 序列走 --c1..c8。
// ⚠️ ECharts canvas itemStyle/color 不能吃 var(--x) → 一律 cssVar() 预解析后再传。

export function cssVar(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function chartPalette(): string[] {
  return ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8'].map(cssVar);
}

/** 序列色：传入 '--c1' 等 token 名，返回解析后色值（canvas 安全）。 */
export function chanColor(colorVar: string): string { return cssVar(colorVar); }

/** 健康色：health → 解析后色值（canvas 安全）。正常绿/预警黄/缺货橙(=hero)/断流红。 */
export function healthColor(h: 'ok' | 'watch' | 'low' | 'broken'): string {
  return cssVar({ ok: '--success', watch: '--warning', low: '--gold', broken: '--danger' }[h]);
}

/** 主强调 = 货运琥珀（在途/路由/主操作） */
export function accent(): string { return cssVar('--gold'); }
/** 健康/达标 = 绿 */
export function trust(): string { return cssVar('--emerald'); }
export function warn(): string { return cssVar('--warning'); }
export function danger(): string { return cssVar('--danger'); }

/** 语义色（状态 / 序列 通用） */
export const SEMANTIC = {
  active: '--gold', ok: '--emerald', warn: '--warning', danger: '--danger', info: '--info',
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
      extraCssText: 'border-radius:11px;box-shadow:0 10px 34px rgba(0,0,0,.30);',
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
    axisLabel: { color: text3, fontSize: 11, fontFamily: "'Geist','PingFang SC',sans-serif" },
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
