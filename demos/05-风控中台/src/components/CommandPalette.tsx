import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft, Moon, Sun, LogOut, Snowflake, UserCog, UserSearch, Siren } from 'lucide-react';
import { FLAT_ROUTES } from '../lib/nav';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from './kit';

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
    // 风控快捷处置命令（命令台即作战指令）
    const quick = [
      hasPermission('alert:act') && { type: 'quick' as const, label: '冻结卡片 · 卡尾 ****4821', sub: '快捷处置', icon: <Snowflake size={15} />, run: () => toast('已冻结卡尾 ****4821 · 已通知持卡人二次验证', 'danger') },
      hasPermission('alert:act') && { type: 'quick' as const, label: '转人工复核 · 当前高危笔', sub: '快捷处置', icon: <Siren size={15} />, run: () => { navigate('/alerts'); toast('已转人工复核队列', 'warn'); } },
      hasPermission('case:read') && { type: 'quick' as const, label: '拉取客户画像 · 主体 360°', sub: '快捷查询', icon: <UserSearch size={15} />, run: () => navigate('/cases') },
      hasPermission('rbac:read') && { type: 'quick' as const, label: '查看角色权限矩阵', sub: '快捷查询', icon: <UserCog size={15} />, run: () => navigate('/rbac') },
    ].filter(Boolean) as { type: 'quick'; label: string; sub: string; icon: React.ReactNode; run: () => void }[];
    const actions = [
      { type: 'action' as const, label: mode === 'dark' ? '切换到浅色报表主题' : '切换到深色作战主题', sub: '外观', icon: mode === 'dark' ? <Sun size={15} /> : <Moon size={15} />, run: toggle },
      { type: 'action' as const, label: '退出登录', sub: '账号', icon: <LogOut size={15} />, run: logout },
    ];
    const all = [...routes, ...quick, ...actions];
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
          <input className="cmdk-input" placeholder="检索模块 · 执行处置命令（冻结卡 / 转人工 / 拉画像）…" value={q} autoFocus onChange={e => setQ(e.target.value)} />
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
