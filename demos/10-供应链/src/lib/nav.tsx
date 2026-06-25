import {
  Radar, LineChart, SlidersHorizontal,
  Boxes, Truck, Factory,
} from 'lucide-react';
import type { PermissionKey } from '../types';

export interface NavLeaf { key: string; label: string; path: string; icon: React.ReactNode; perm: PermissionKey; }
export interface NavGroup { key: string; label: string; icon: React.ReactNode; path?: string; perm?: PermissionKey; children?: NavLeaf[]; }

export const NAV: NavGroup[] = [
  { key: 'tower', label: '控制塔', icon: <Radar size={16} />, path: '/tower', perm: 'tower:read' },
  {
    key: 'plan', label: '需求计划', icon: <LineChart size={16} />,
    children: [
      { key: 'forecast', label: '需求预测', path: '/forecast', icon: <LineChart size={15} />, perm: 'forecast:read' },
      { key: 'whatif', label: 'What-if 模拟', path: '/whatif', icon: <SlidersHorizontal size={15} />, perm: 'whatif:read' },
    ],
  },
  {
    key: 'fulfill', label: '库存履约', icon: <Boxes size={16} />,
    children: [
      { key: 'inventory', label: '库存健康', path: '/inventory', icon: <Boxes size={15} />, perm: 'inventory:read' },
      { key: 'replenish', label: '补货采购', path: '/replenish', icon: <Truck size={15} />, perm: 'replenish:read' },
      { key: 'supplier', label: '供应商风险', path: '/supplier', icon: <Factory size={15} />, perm: 'supplier:read' },
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
  return hit?.path ?? '/tower';
}
