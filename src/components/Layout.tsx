import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, Search, Bell, Sun, Moon, Palette, LogOut, Repeat, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { NAV, crumbFor } from '../lib/nav';
import { ALERTS, MOCK_USERS, ROLES } from '../lib/mockData';
import CommandPalette from './CommandPalette';
import './Layout.css';

export default function Layout() {
  const { user, currentRole, logout, switchUser, hasPermission } = useAuth();
  const { mode, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState<'none' | 'notif' | 'user'>('none');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(p => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isActive = (p: string) => location.pathname === p || location.pathname.startsWith(p + '/');
  const toggleGroup = (k: string) => setCollapsed(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const crumb = crumbFor(location.pathname);

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">Li</div>
          <div>
            <div className="logo-title">销售策略</div>
            <div className="logo-sub">AI 工作台 · PRO</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map(item => {
            if (item.path) {
              return (
                <button key={item.key} className={`nav-item ${isActive(item.path) ? 'nav-item-active' : ''}`} onClick={() => navigate(item.path!)}>
                  {item.icon}<span>{item.label}</span>
                </button>
              );
            }
            const kids = item.children!;
            const open = !collapsed.has(item.key);
            const groupActive = kids.some(c => isActive(c.path));
            return (
              <div key={item.key}>
                <button className={`nav-group ${groupActive ? 'nav-group-active' : ''}`} onClick={() => toggleGroup(item.key)}>
                  <span className="nav-group-left">{item.icon}<span>{item.label}</span></span>
                  {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
                {open && (
                  <div className="nav-children">
                    {kids.map(c => (
                      <button key={c.key} className={`nav-child ${isActive(c.path) ? 'nav-child-active' : ''}`} onClick={() => navigate(c.path)}>
                        {c.icon}<span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="avatar">{user?.name?.[0]}</div>
          <div className="flex-1">
            <div className="uf-name">{user?.name}</div>
            <div className="uf-role" style={{ color: currentRole?.color }}>{currentRole?.name}</div>
          </div>
          <button className="icon-btn" title="退出登录" onClick={logout}><LogOut size={15} /></button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main">
        <header className="topbar">
          <div className="crumb">
            <span>{crumb?.group}</span>
            {crumb && crumb.group !== crumb.leaf && <><ChevronRight size={13} /><span className="crumb-current">{crumb.leaf}</span></>}
            {crumb && crumb.group === crumb.leaf && <span className="crumb-current" style={{ marginLeft: -7 }}></span>}
          </div>

          <div className="topbar-search" style={{ marginLeft: 8 }} onClick={() => setPalette(true)}>
            <Search size={15} /><span>搜索模块 / 命令</span><span className="kbd">⌘K</span>
          </div>

          <div className="row gap-2" style={{ marginLeft: 'auto', position: 'relative' }}>
            <button className="icon-btn" onClick={toggle} title={`主题：${mode === 'dark' ? '深色' : mode === 'light' ? '浅色' : 'Anthropic'} · 点击切换`}>
              {mode === 'dark' ? <Moon size={17} /> : mode === 'light' ? <Sun size={17} /> : <Palette size={17} />}
            </button>

            <div style={{ position: 'relative' }}>
              <button className="icon-btn" onClick={() => setMenu(m => m === 'notif' ? 'none' : 'notif')} title="预警通知">
                <Bell size={17} /><span className="dot-badge" />
              </button>
              {menu === 'notif' && (
                <Dropdown onClose={() => setMenu('none')}>
                  <div className="label" style={{ padding: '4px 8px 10px' }}>风险预警 · {ALERTS.length}</div>
                  {ALERTS.slice(0, 4).map((a, i) => (
                    <div key={i} className="row gap-2" style={{ padding: '9px 8px', borderRadius: 8, alignItems: 'flex-start' }}>
                      <AlertTriangle size={14} style={{ color: a.level === 'danger' ? 'var(--danger)' : a.level === 'warn' ? 'var(--warning)' : 'var(--info)', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{a.title}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5 }}>{a.msg}</div>
                      </div>
                    </div>
                  ))}
                </Dropdown>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button className="row gap-2" style={{ background: 'transparent', border: '1px solid var(--hairline)', borderRadius: 8, padding: '4px 8px 4px 4px', cursor: 'pointer' }} onClick={() => setMenu(m => m === 'user' ? 'none' : 'user')}>
                <div className="avatar" style={{ width: 26, height: 26, fontSize: 12 }}>{user?.name?.[0]}</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{user?.name}</span>
                <ChevronDown size={13} style={{ color: 'var(--text-3)' }} />
              </button>
              {menu === 'user' && (
                <Dropdown onClose={() => setMenu('none')} width={240}>
                  <div className="label" style={{ padding: '4px 8px 8px' }}>切换演示账号（体验 RBAC）</div>
                  {MOCK_USERS.filter(u => u.status === 'active').map(u => {
                    const role = ROLES.find(r => r.id === u.role);
                    return (
                      <div key={u.id} className="row gap-2 cmdk-item" style={{ padding: '8px' }} onClick={() => { switchUser(u.email); setMenu('none'); }}>
                        <Repeat size={13} style={{ color: 'var(--text-3)' }} />
                        <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{u.name}</span>
                        <span style={{ fontSize: 11, marginLeft: 'auto', color: role?.color, fontWeight: 600 }}>{role?.name}</span>
                      </div>
                    );
                  })}
                  <div className="divider" style={{ margin: '8px 0' }} />
                  <div className="row gap-2 cmdk-item" style={{ padding: '8px', color: 'var(--danger)' }} onClick={logout}>
                    <LogOut size={14} /><span style={{ fontSize: 13 }}>退出登录</span>
                  </div>
                </Dropdown>
              )}
            </div>
          </div>
        </header>

        <div className="content">
          <div className="content-anim" key={location.pathname}>
            <Outlet />
          </div>
        </div>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}

function Dropdown({ children, onClose, width = 300 }: { children: React.ReactNode; onClose: () => void; width?: number }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={onClose} />
      <div className="card" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width, zIndex: 31, padding: 8, boxShadow: 'var(--elev-2)', border: '1px solid var(--hairline-strong)' }}>
        {children}
      </div>
    </>
  );
}
