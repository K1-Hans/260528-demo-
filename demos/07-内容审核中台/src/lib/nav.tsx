import {
  Eye, Layers, FileSearch,
  SlidersHorizontal, ShieldCheck, Fingerprint,
  Activity, LayoutDashboard, Scale, Gauge,
} from 'lucide-react';
import type { PermissionKey } from '../types';

export interface NavLeaf { key: string; label: string; path: string; icon: React.ReactNode; perm: PermissionKey; }
export interface NavGroup { key: string; label: string; icon: React.ReactNode; path?: string; perm?: PermissionKey; children?: NavLeaf[]; }

export const NAV: NavGroup[] = [
  {
    key: 'work', label: '审核作战', icon: <Eye size={16} />,
    children: [
      { key: 'queue', label: '审片流水台', path: '/queue', icon: <Layers size={15} />, perm: 'queue:read' },
      { key: 'review', label: '疑难复核工作台', path: '/review', icon: <FileSearch size={15} />, perm: 'review:read' },
    ],
  },
  {
    key: 'policy', label: '策略中枢', icon: <SlidersHorizontal size={16} />,
    children: [
      { key: 'policy', label: '策略 / 分类体系', path: '/policy', icon: <ShieldCheck size={15} />, perm: 'policy:read' },
      { key: 'synthetic', label: '合成内容检测', path: '/synthetic', icon: <Fingerprint size={15} />, perm: 'synthetic:read' },
    ],
  },
  {
    key: 'govern', label: '治理与态势', icon: <Activity size={16} />,
    children: [
      { key: 'situation', label: '风险态势大屏', path: '/situation', icon: <LayoutDashboard size={15} />, perm: 'situation:read' },
      { key: 'appeal', label: '申诉复核闭环', path: '/appeal', icon: <Scale size={15} />, perm: 'appeal:read' },
      { key: 'auditor', label: '审核员效能质检', path: '/auditor', icon: <Gauge size={15} />, perm: 'auditor:read' },
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
  return hit?.path ?? '/queue';
}
