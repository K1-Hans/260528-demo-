import {
  MessageSquareText, Sparkles, History,
  Boxes, Network,
  ShieldCheck, Lock, Ruler,
} from 'lucide-react';
import type { PermissionKey } from '../types';

export interface NavLeaf { key: string; label: string; path: string; icon: React.ReactNode; perm: PermissionKey; }
export interface NavGroup { key: string; label: string; icon: React.ReactNode; path?: string; perm?: PermissionKey; children?: NavLeaf[]; }

export const NAV: NavGroup[] = [
  {
    key: 'ask', label: '问数', icon: <MessageSquareText size={16} />,
    children: [
      { key: 'ask', label: '问数台', path: '/ask', icon: <Sparkles size={15} />, perm: 'ask:read' },
      { key: 'history', label: '查询历史', path: '/history', icon: <History size={15} />, perm: 'history:read' },
    ],
  },
  {
    key: 'model', label: '建模与血缘', icon: <Boxes size={16} />,
    children: [
      { key: 'semantic', label: '语义层建模', path: '/semantic', icon: <Boxes size={15} />, perm: 'semantic:read' },
      { key: 'lineage', label: '数据血缘', path: '/lineage', icon: <Network size={15} />, perm: 'lineage:read' },
    ],
  },
  {
    key: 'govern', label: '治理与指标', icon: <ShieldCheck size={16} />,
    children: [
      { key: 'governance', label: '权限治理', path: '/governance', icon: <Lock size={15} />, perm: 'governance:read' },
      { key: 'metrics', label: '指标库', path: '/metrics', icon: <Ruler size={15} />, perm: 'metrics:read' },
    ],
  },
];

export interface FlatRoute { label: string; path: string; group: string; icon: React.ReactNode; perm: PermissionKey; }
export const FLAT_ROUTES: FlatRoute[] = NAV.flatMap(g =>
  g.children
    ? g.children.map(c => ({ label: c.label, path: c.path, group: g.label, icon: c.icon, perm: c.perm }))
    : [{ label: g.label, path: g.path!, group: '主导航', icon: g.icon, perm: g.perm! }],
);

export function crumbFor(pathname: string): { group: string; leaf: string } | null {
  for (const g of NAV) {
    if (g.path && (g.path === '/' ? pathname === '/' : (pathname === g.path || pathname.startsWith(g.path + '/')))) return { group: g.label, leaf: g.label };
    if (g.children) {
      const c = g.children.find(ch => ch.path === '/' ? pathname === '/' : (pathname === ch.path || pathname.startsWith(ch.path + '/')));
      if (c) return { group: g.label, leaf: c.label };
    }
  }
  return null;
}

/** 角色登录后落地：返回首个可访问路由（兜底，App 优先用 role.landing）。 */
export function firstAllowedPath(has: (p: PermissionKey) => boolean): string {
  const hit = FLAT_ROUTES.find(r => has(r.perm));
  return hit?.path ?? '/ask';
}
