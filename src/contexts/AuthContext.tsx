import { createContext, useCallback, useContext, useState } from 'react';
import type { AuthState, PermissionKey, Role } from '../types';
import { ROLES, MOCK_USERS } from '../lib/mockData';

interface AuthCtx extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  switchUser: (email: string) => void;
  hasPermission: (key: PermissionKey) => boolean;
  currentRole: Role | null;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isAuthenticated: false, isLoading: false });

  const login = useCallback(async (email: string, _password: string) => {
    setState(s => ({ ...s, isLoading: true }));
    await new Promise(r => setTimeout(r, 700)); // simulate iDaaS SSO
    const user = MOCK_USERS.find(u => u.email === email || u.name === email);
    if (user && user.status === 'active') {
      setState({ user, isAuthenticated: true, isLoading: false });
      return true;
    }
    setState(s => ({ ...s, isLoading: false }));
    return false;
  }, []);

  const switchUser = useCallback((email: string) => {
    const user = MOCK_USERS.find(u => u.email === email);
    if (user) setState({ user, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(() => setState({ user: null, isAuthenticated: false, isLoading: false }), []);

  const currentRole = state.user ? ROLES.find(r => r.id === state.user!.role) ?? null : null;
  const hasPermission = useCallback(
    (key: PermissionKey) => !!currentRole?.permissions.includes(key),
    [currentRole],
  );

  return (
    <Ctx.Provider value={{ ...state, login, logout, switchUser, hasPermission, currentRole }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be inside AuthProvider');
  return c;
}
