import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// LLMOps 控制台签名 = Telemetry Graphite 深空示波台（暗·主场）/ Studio Porcelain 冷白瓷（亮）双主题。
// 深色主场：:root 即深色,[data-theme='light'] 为覆写,默认 dark 无首屏闪白。
type Mode = 'dark' | 'light';
const MODES: Mode[] = ['dark', 'light'];

interface ThemeCtx { mode: Mode; toggle: () => void; setMode: (m: Mode) => void; }
const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => {
    if (typeof window === 'undefined') return 'dark';
    const s = localStorage.getItem('llm-theme') as Mode | null;
    return s && MODES.includes(s) ? s : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('llm-theme', mode);
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
