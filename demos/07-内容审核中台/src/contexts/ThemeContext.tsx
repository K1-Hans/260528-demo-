import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// 外呼语音中台签名 = Operator Midnight 话务深夜台（暗·主场·实时盯坐席墙）/ Studio Porcelain 冷瓷白（亮·白班质检副场）。
// 实时坐席墙是盯屏场景，默认 dark 让声波/接通翡翠绿更跳。
type Mode = 'dark' | 'light';
const MODES: Mode[] = ['dark', 'light'];

interface ThemeCtx { mode: Mode; toggle: () => void; setMode: (m: Mode) => void; }
const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => {
    if (typeof window === 'undefined') return 'dark';
    const s = localStorage.getItem('vc-theme') as Mode | null;
    return s && MODES.includes(s) ? s : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('vc-theme', mode);
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
