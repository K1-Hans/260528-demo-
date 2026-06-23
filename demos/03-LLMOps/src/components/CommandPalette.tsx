import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft, Moon, Sun, LogOut } from 'lucide-react';
import { FLAT_ROUTES } from '../lib/nav';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { hasPermission, logout } = useAuth();
  const { mode, toggle } = useTheme();

  const items = useMemo(() => {
    const routes = FLAT_ROUTES.filter(r => hasPermission(r.perm)).map(r => ({
      type: 'route' as const, label: r.label, sub: r.group, icon: r.icon, run: () => navigate(r.path),
    }));
    const actions = [
      { type: 'action' as const, label: mode === 'dark' ? '切换到浅色主题' : '切换到深色主题', sub: '外观', icon: mode === 'dark' ? <Sun size={15} /> : <Moon size={15} />, run: toggle },
      { type: 'action' as const, label: '退出登录', sub: '账号', icon: <LogOut size={15} />, run: logout },
    ];
    const all = [...routes, ...actions];
    if (!q.trim()) return all;
    return all.filter(i => i.label.includes(q) || i.sub.includes(q));
  }, [q, hasPermission, navigate, mode, toggle, logout]);

  useEffect(() => { setActive(0); }, [q, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, items.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); items[active]?.run(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items, active, onClose]);

  if (!open) return null;
  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk-panel" onClick={e => e.stopPropagation()}>
        <div className="cmdk-input-row">
          <Search size={17} style={{ color: 'var(--text-3)' }} />
          <input className="cmdk-input" placeholder="搜索模块、执行命令…" value={q} autoFocus onChange={e => setQ(e.target.value)} />
          <span className="kbd">ESC</span>
        </div>
        <div className="cmdk-list">
          {items.length === 0 && <div className="cmdk-group-label">无匹配结果</div>}
          {items.map((it, i) => (
            <div
              key={it.label}
              className={`cmdk-item ${i === active ? 'cmdk-item-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => { it.run(); onClose(); }}
            >
              {it.icon}
              <span>{it.label}</span>
              <span className="cmdk-sub">{it.sub}</span>
              {i === active && <CornerDownLeft size={13} style={{ marginLeft: 8 }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
