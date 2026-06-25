import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Agent 编排平台签名 = Circuit Ink 电路墨（暗·主场 · 电光青信号 · 实时执行数据流）/
// Blueprint Wire 蓝图线（亮·建器）双主题。暗色主场：编排画布执行台气质，默认 dark。
type Mode = 'dark' | 'light';
const MODES: Mode[] = ['dark', 'light'];

interface ThemeCtx { mode: Mode; toggle: () => void; setMode: (m: Mode) => void; }
const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => {
    if (typeof window === 'undefined') return 'dark';
    const s = localStorage.getItem('ao-theme') as Mode | null;
    return s && MODES.includes(s) ? s : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('ao-theme', mode);
  }, [mode]);

  const setMode = useCallback((m: Mode) => setModeState(m), []);
  const toggle = useCallback(() => setModeState(m => MODES[(MODES.indexOf(m) + 1) % MODES.length]), []);

  return <Ctx.Provider value={{ mode, toggle, setMode }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme must be inside ThemeProvider');
  return c;
}
