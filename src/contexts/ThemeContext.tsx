import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Mode = 'dark' | 'light' | 'anthropic';
const MODES: Mode[] = ['dark', 'light', 'anthropic'];

interface ThemeCtx { mode: Mode; toggle: () => void; setMode: (m: Mode) => void; }
const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => {
    if (typeof window === 'undefined') return 'dark';
    const s = localStorage.getItem('theme') as Mode | null;
    return s && MODES.includes(s) ? s : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);
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
