import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// 风控中台签名 = Obsidian Command 黑曜作战室（暗·主场·7×24 盯屏）/ Studio Porcelain 冷瓷白（亮·合规报表副场）。
// 风控是盯屏场景，默认 dark 降低长时眼疲劳、让风险红/琥珀更跳。
type Mode = 'dark' | 'light';
const MODES: Mode[] = ['dark', 'light'];

interface ThemeCtx { mode: Mode; toggle: () => void; setMode: (m: Mode) => void; }
const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => {
    if (typeof window === 'undefined') return 'dark';
    const s = localStorage.getItem('rc-theme') as Mode | null;
    return s && MODES.includes(s) ? s : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('rc-theme', mode);
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
