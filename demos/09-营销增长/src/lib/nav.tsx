import {
  TrendingUp, CalendarRange, Users,
  Palette, Wand2, Library,
  Megaphone, Target, Share2,
} from 'lucide-react';
import type { PermissionKey } from '../types';

export interface NavLeaf { key: string; label: string; path: string; icon: React.ReactNode; perm: PermissionKey; }
export interface NavGroup { key: string; label: string; icon: React.ReactNode; path?: string; perm?: PermissionKey; children?: NavLeaf[]; }

export const NAV: NavGroup[] = [
  {
    key: 'growth', label: '增长操盘', icon: <TrendingUp size={16} />,
    children: [
      { key: 'campaign', label: '排期编排台', path: '/campaign', icon: <CalendarRange size={15} />, perm: 'campaign:read' },
      { key: 'cdp', label: '人群圈选', path: '/cdp', icon: <Users size={15} />, perm: 'cdp:read' },
    ],
  },
  {
    key: 'creative', label: '创意中心', icon: <Palette size={16} />,
    children: [
      { key: 'studio', label: '创意工坊', path: '/studio', icon: <Wand2 size={15} />, perm: 'studio:read' },
      { key: 'assets', label: '资产库', path: '/assets', icon: <Library size={15} />, perm: 'assets:read' },
    ],
  },
  {
    key: 'media', label: '投放与归因', icon: <Megaphone size={16} />,
    children: [
      { key: 'ads', label: '投放控制台', path: '/ads', icon: <Target size={15} />, perm: 'ads:read' },
      { key: 'attribution', label: '归因 ROI', path: '/attribution', icon: <Share2 size={15} />, perm: 'attribution:read' },
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
  return hit?.path ?? '/campaign';
}
