import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, Search, Bell, Sun, Moon, LogOut, Repeat, AlertTriangle, ScanSearch, Menu, Lock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { NAV, FLAT_ROUTES, crumbFor, firstAllowedPath, type NavGroup } from '../lib/nav';
import { ALERTS, MOCK_USERS, ROLES, SITUATION_LIGHTS } from '../lib/mockData';
import { EmptyState } from './ui';
import { StatLights } from './sig';
import CommandPalette from './CommandPalette';
import './Layout.css';

/** 顶栏 LIVE 时钟（实时审核感 · 等宽跳秒）。 */
function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return (
    <div className="live-cluster" title="审核引擎实时在线">
      <span className="live-pulse" />
      <span className="live-label">LIVE</span>
      <span className="live-clock mononum">{hh}:{mm}:{ss}</span>
    </div>
  );
}

export default function Layout() {
  const { user, currentRole, logout, switchUser, hasPermission } = useAuth();
  const { mode, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState<'none' | 'notif' | 'user'>('none');
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => { setMobileNav(false); }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(p => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const visibleNav = useMemo<NavGroup[]>(() =>
    NAV.map(g => ({ ...g, children: g.children?.filter(c => hasPermission(c.perm)) }))
      .filter(g => (g.path ? hasPermission(g.perm!) : (g.children && g.children.length > 0))),
    [hasPermission],
  );

  const isActive = (p: string) => p === '/' ? location.pathname === '/' : (location.pathname === p || location.pathname.startsWith(p + '/'));
  const toggleGroup = (k: string) => setCollapsed(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const crumb = crumbFor(location.pathname);
  const dangerCount = ALERTS.filter(a => a.level !== 'info').length;
  const cur = FLAT_ROUTES.find(r => r.path === '/' ? location.pathname === '/' : (location.pathname === r.path || location.pathname.startsWith(r.path + '/')));
  const denied = !!cur && !hasPermission(cur.perm);

  return (
    <div className={`app-shell ${mobileNav ? 'nav-open' : ''}`}>
      <div className="nav-scrim" onClick={() => setMobileNav(false)} />
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <button className="sidebar-logo" onClick={() => navigate(firstAllowedPath(hasPermission))}>
          <div className="logo-mark"><ScanSearch size={18} /></div>
          <div style={{ textAlign: 'left' }}>
            <div className="logo-title">证物台</div>
            <div className="logo-sub">内容审核 · 多模态 T&S</div>
          </div>
        </button>

        <nav className="nav">
          {visibleNav.map(item => {
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
              <div key={item.key} className="nav-group-wrap">
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
          <div className="avatar" style={{ background: `linear-gradient(135deg, ${currentRole?.color}, var(--gold-bright))` }}>{user?.name?.[0]}</div>
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
          <button className="hamburger icon-btn" onClick={() => setMobileNav(true)} title="菜单"><Menu size={18} /></button>
          <div className="crumb">
            <span>{crumb?.group}</span>
            {crumb && crumb.group !== crumb.leaf && <><ChevronRight size={13} /><span className="crumb-current">{crumb.leaf}</span></>}
          </div>

          {/* 全局搜索（按活动/客户/话术/录音） */}
          <button className="global-search" onClick={() => setPalette(true)}>
            <Search size={15} />
            <span className="global-search-ph">按内容 / 工单 / 策略 / 发布者检索 · 或执行快捷操作</span>
            <span className="kbd">⌘K</span>
          </button>

          <div className="row gap-2" style={{ marginLeft: 'auto', position: 'relative' }}>
            {/* 今日态势灯（积压 / 时延 / 高危 · 顶栏常驻） */}
            <div className="comp-lights-wrap"><StatLights lights={SITUATION_LIGHTS} /></div>
            <LiveClock />

            <button className="icon-btn" onClick={toggle} title={`主题：${mode === 'dark' ? '深色取证' : '浅色审核'} · 点击切换`}>
              {mode === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
            </button>

            <div style={{ position: 'relative' }}>
              <button className="icon-btn" onClick={() => setMenu(m => m === 'notif' ? 'none' : 'notif')} title="态势告警">
                <Bell size={17} />{dangerCount > 0 && <span className="dot-badge" />}
              </button>
              {menu === 'notif' && (
                <Dropdown onClose={() => setMenu('none')}>
                  <div className="label" style={{ padding: '4px 8px 10px' }}>态势告警 · {ALERTS.length}</div>
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
              <button className="row gap-2" style={{ background: 'transparent', border: '1px solid var(--hairline)', borderRadius: 8, padding: '4px 8px 4px 4px', cursor: 'pointer' }} onClick={() => setMenu(m => m === 'user' ? 'none' : 'user')}>
                <div className="avatar" style={{ width: 26, height: 26, fontSize: 12, background: `linear-gradient(135deg, ${currentRole?.color}, var(--gold-bright))` }}>{user?.name?.[0]}</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{user?.name}</span>
                <ChevronDown size={13} style={{ color: 'var(--text-3)' }} />
              </button>
              {menu === 'user' && (
                <Dropdown onClose={() => setMenu('none')} width={290}>
                  <div className="label" style={{ padding: '4px 8px 8px' }}>切换演示角色（体验权限分权）</div>
                  {MOCK_USERS.filter(u => u.status === 'active').map(u => {
                    const role = ROLES.find(r => r.id === u.role);
                    return (
                      <div key={u.id} className={`row gap-2 cmdk-item ${u.id === user?.id ? 'cmdk-item-active' : ''}`} style={{ padding: '8px' }} onClick={() => { switchUser(u.id); setMenu('none'); navigate('/'); }}>
                        <Repeat size={13} style={{ color: 'var(--text-3)' }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, color: 'var(--text-1)' }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{u.dept}</div>
                        </div>
                        <span style={{ fontSize: 11, color: role?.color, fontWeight: 600, flexShrink: 0 }}>{role?.name}</span>
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
              ? <div className="page"><EmptyState icon={<Lock size={36} />} title="无访问权限" desc="当前角色无权访问此模块。权限即职责边界 — 审核分权确保最小可见。如需开通请联系平台管理员。" /></div>
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
