// ECharts theme helpers — theme-aware, reads CSS variables at build time.
// Charts re-render on theme switch via a `key` bound to theme mode.

export function cssVar(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function chartPalette(): string[] {
  return ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8'].map(cssVar);
}

export const BRAND_COLORS: Record<string, string> = {
  理想: '#D6BC82', 问界: '#E8913A', 华为: '#CF2020', 蔚来: '#00AAFF',
  小鹏: '#3A6AFF', 比亚迪: '#1A8A3A', 腾势: '#6B4FE8',
};

// Base option fragment shared by all charts (fonts, grid, axis, tooltip).
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
      padding: [8, 12],
      textStyle: { color: text1, fontSize: 12, fontFamily: font },
      extraCssText: 'border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.25);backdrop-filter:blur(8px);',
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

export const ANIM = { animationDuration: 800, animationEasing: 'cubicOut' as const };
