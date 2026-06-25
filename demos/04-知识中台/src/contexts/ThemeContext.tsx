import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// 知识中台签名 = Indigo Atlas 靛蓝档案（亮·主场）/ Night Library 夜间图书馆（暗）双主题。
// 浅色主场：编辑式知识档案馆气质，默认 light。
type Mode = 'dark' | 'light';
const MODES: Mode[] = ['light', 'dark'];

interface ThemeCtx { mode: Mode; toggle: () => void; setMode: (m: Mode) => void; }
const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => {
    if (typeof window === 'undefined') return 'light';
    const s = localStorage.getItem('kb-theme') as Mode | null;
    return s && MODES.includes(s) ? s : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('kb-theme', mode);
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
