import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  ChevronRight, ChevronDown, Search, Bell, Sun, Moon, LogOut, Repeat,
  AlertTriangle, Menu, Lock, Command,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { NAV, crumbFor, firstAllowedPath, type NavGroup } from '../lib/nav';
import { ALERTS, MOCK_USERS, ROLES } from '../lib/mockData';
import { EmptyState } from './ui';
import CommandPalette from './CommandPalette';
import './Layout.css';

const RANGES = ['1h', '4h', '24h', '7d'] as const;

export default function Layout() {
  const { user, currentRole, logout, switchUser, hasPermission } = useAuth();
  const { mode, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState<'none' | 'notif' | 'user'>('none');
  const [mobileNav, setMobileNav] = useState(false);
  const [range, setRange] = useState<typeof RANGES[number]>('4h');
  const [live, setLive] = useState(true);

  useEffect(() => { setMobileNav(false); }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(p => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 按角色权限过滤导航（角色切换实时改导航可见项）
  const visibleNav = useMemo<NavGroup[]>(() =>
    NAV.map(g => ({ ...g, children: g.children?.filter(c => hasPermission(c.perm)) }))
      .filter(g => (g.path ? hasPermission(g.perm!) : (g.children && g.children.length > 0))),
    [hasPermission],
  );

  const isActive = (p: string) => p === '/' ? location.pathname === '/' : (location.pathname === p || location.pathname.startsWith(p + '/'));
  const crumb = crumbFor(location.pathname);
  const dangerCount = ALERTS.filter(a => a.level !== 'info').length;

  // 当前路由权限校验（FLAT 路由）。'/' 交给 Home 组件做角色落地重定向，不在此判 denied，
  // 否则无总览权限的角色（标注员）会被卡在"无访问权限"而非被重定向到其首个可访问页。
  const allLeaves = NAV.flatMap(g => g.children ?? (g.path ? [{ path: g.path, perm: g.perm! }] : []));
  const cur = allLeaves.find(r => r.path !== '/' && (location.pathname === r.path || location.pathname.startsWith(r.path + '/')));
  const denied = !!cur && !hasPermission(cur.perm);

  return (
    <div className={`app-shell ${mobileNav ? 'nav-open' : ''}`}>
      <div className="nav-scrim" onClick={() => setMobileNav(false)} />

      {/* ── 极简图标 rail（悬停展开 · 键盘驱动控制台范式）── */}
      <aside className="rail">
        <div className="rail-inner">
          <button className="rail-logo" onClick={() => navigate(firstAllowedPath(hasPermission))} title="云枢 LLMOps">
            <div className="logo-mark">枢</div>
            <div className="rail-logo-text">
              <div className="logo-title">云枢 LLMOps</div>
              <div className="logo-sub">运营中台 · v1</div>
            </div>
          </button>

          <nav className="rail-nav">
            {visibleNav.map(g => {
              if (g.path) {
                return (
                  <button key={g.key} className={`rail-item ${isActive(g.path) ? 'rail-item-active' : ''}`} onClick={() => navigate(g.path!)} title={g.label}>
                    <span className="rail-ico">{g.icon}</span>
                    <span className="rail-label">{g.label}</span>
                  </button>
                );
              }
              return (
                <div key={g.key} className="rail-group">
                  <div className="rail-section">{g.label}</div>
                  {g.children!.map(c => (
                    <button key={c.key} className={`rail-item ${isActive(c.path) ? 'rail-item-active' : ''}`} onClick={() => navigate(c.path)} title={c.label}>
                      <span className="rail-ico">{c.icon}</span>
                      <span className="rail-label">{c.label}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </nav>

          <button className="rail-cmdk" onClick={() => setPalette(true)} title="命令面板 ⌘K">
            <span className="rail-ico"><Command size={16} /></span>
            <span className="rail-label">命令面板</span>
            <span className="kbd-key rail-kbd">⌘K</span>
          </button>

          <div className="rail-foot">
            <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{user?.name?.[0]}</div>
            <div className="rail-user">
              <div className="uf-name">{user?.name}</div>
              <div className="uf-role" style={{ color: currentRole?.color }}>{currentRole?.name}</div>
            </div>
            <button className="icon-btn rail-logout" title="退出登录" onClick={logout}><LogOut size={15} /></button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main">
        <header className="topbar">
          <button className="hamburger icon-btn" onClick={() => setMobileNav(true)} title="菜单"><Menu size={18} /></button>
          <div className="crumb">
            <span>{crumb?.group}</span>
            {crumb && crumb.group !== crumb.leaf && <><ChevronRight size={13} /><span className="crumb-current">{crumb.leaf}</span></>}
          </div>

          <div className="topbar-search" onClick={() => setPalette(true)}>
            <Search size={15} /><span>跳转模块 / 执行命令</span><span className="kbd-key">⌘K</span>
          </div>

          <div className="row gap-2 topbar-right">
            {/* 时间范围 + Live（Datadog 招牌） */}
            <div className="range-picker">
              {RANGES.map(r => (
                <button key={r} className={`range-btn ${range === r ? 'range-btn-active' : ''}`} onClick={() => setRange(r)}>{r}</button>
              ))}
            </div>
            <button className={`live-toggle ${live ? 'live-on' : ''}`} onClick={() => setLive(l => !l)} title={live ? '实时刷新中' : '已暂停'}>
              {live ? <span className="live-dot" /> : <span className="live-dot-off" />}
              <span>{live ? 'Live' : '暂停'}</span>
            </button>

            <div className="topbar-sep" />

            <button className="icon-btn" onClick={toggle} title={`主题：${mode === 'dark' ? '深色' : '浅色'} · 点击切换`}>
              {mode === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
            </button>

            <div style={{ position: 'relative' }}>
              <button className="icon-btn" onClick={() => setMenu(m => m === 'notif' ? 'none' : 'notif')} title="告警通知">
                <Bell size={17} />{dangerCount > 0 && <span className="dot-badge" />}
              </button>
              {menu === 'notif' && (
                <Dropdown onClose={() => setMenu('none')}>
                  <div className="label" style={{ padding: '4px 8px 10px' }}>告警通知 · {ALERTS.length}</div>
                  {ALERTS.slice(0, 5).map((a, i) => (
                    <div key={i} className="row gap-2" style={{ padding: '9px 8px', borderRadius: 8, alignItems: 'flex-start' }}>
                      <AlertTriangle size={14} style={{ color: a.level === 'danger' ? 'var(--danger)' : a.level === 'warn' ? 'var(--warning)' : 'var(--info)', flexShrink: 0, marginTop: 2 }} />
                      <div style={{ minWidth: 0 }}>
                        <div className="row gap-2" style={{ justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{a.title}</span>
                          {a.time && <span style={{ fontSize: 10.5, color: 'var(--text-3)', flexShrink: 0 }}>{a.time}</span>}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5, marginTop: 2 }}>{a.msg}</div>
                      </div>
                    </div>
                  ))}
                </Dropdown>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button className="row gap-2 user-chip" onClick={() => setMenu(m => m === 'user' ? 'none' : 'user')}>
                <div className="avatar" style={{ width: 26, height: 26, fontSize: 12 }}>{user?.name?.[0]}</div>
                <span className="user-chip-name">{user?.name}</span>
                <ChevronDown size={13} style={{ color: 'var(--text-3)' }} />
              </button>
              {menu === 'user' && (
                <Dropdown onClose={() => setMenu('none')} width={252}>
                  <div className="label" style={{ padding: '4px 8px 8px' }}>切换演示账号（体验 RBAC 分权）</div>
                  {MOCK_USERS.filter(u => u.status === 'active').map(u => {
                    const role = ROLES.find(r => r.id === u.role);
                    return (
                      <div key={u.id} className={`row gap-2 cmdk-item ${u.id === user?.id ? 'cmdk-item-active' : ''}`} style={{ padding: '8px' }} onClick={() => { switchUser(u.id); setMenu('none'); navigate('/'); }}>
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
            {denied
              ? <div className="page"><EmptyState icon={<Lock size={36} />} title="无访问权限" desc="当前角色无权访问此模块。权限即职责边界 — 如需开通请联系平台负责人。" /></div>
              : <Outlet />}
          </div>
        </div>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}

function Dropdown({ children, onClose, width = 320 }: { children: React.ReactNode; onClose: () => void; width?: number }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={onClose} />
      <div className="card" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width, zIndex: 31, padding: 8, boxShadow: 'var(--elev-2)', border: '1px solid var(--hairline-strong)' }}>
        {children}
      </div>
    </>
  );
}
