import {
  LayoutDashboard,
  Eye, Waypoints, Activity,
  ClipboardCheck, Database, Grid3x3, Tags,
  Boxes, GitBranch, FlaskConical,
  Gauge, DollarSign, BellRing,
  Settings,
} from 'lucide-react';
import type { PermissionKey } from '../types';

export interface NavLeaf { key: string; label: string; path: string; icon: React.ReactNode; perm: PermissionKey; }
export interface NavGroup { key: string; label: string; icon: React.ReactNode; path?: string; perm?: PermissionKey; children?: NavLeaf[]; }

export const NAV: NavGroup[] = [
  {
    key: 'overview', label: '总览', icon: <LayoutDashboard size={17} />,
    path: '/', perm: 'overview:read',
  },
  {
    key: 'observe', label: 'Observe · 可观测', icon: <Eye size={17} />,
    children: [
      { key: 'tracing', label: '调用链 Tracing', path: '/tracing', icon: <Waypoints size={16} />, perm: 'tracing:read' },
      { key: 'monitor', label: '在线监控', path: '/monitor', icon: <Activity size={16} />, perm: 'monitor:read' },
    ],
  },
  {
    key: 'evaluate', label: 'Evaluate · 评测', icon: <ClipboardCheck size={17} />,
    children: [
      { key: 'datasets', label: 'Eval 数据集', path: '/datasets', icon: <Database size={16} />, perm: 'dataset:read' },
      { key: 'scoreboard', label: '评分看板', path: '/scoreboard', icon: <Grid3x3 size={16} />, perm: 'eval:read' },
      { key: 'annotation', label: '人工标注队列', path: '/annotation', icon: <Tags size={16} />, perm: 'annotation:read' },
    ],
  },
  {
    key: 'manage', label: 'Manage · Prompt', icon: <Boxes size={17} />,
    children: [
      { key: 'prompts', label: 'Prompt 版本库', path: '/prompts', icon: <GitBranch size={16} />, perm: 'prompt:read' },
      { key: 'experiments', label: 'A-B 实验 & Playground', path: '/experiments', icon: <FlaskConical size={16} />, perm: 'prompt:read' },
    ],
  },
  {
    key: 'control', label: 'Control · 成本告警', icon: <Gauge size={17} />,
    children: [
      { key: 'cost', label: '成本仪表盘', path: '/cost', icon: <DollarSign size={16} />, perm: 'cost:read' },
      { key: 'alerts', label: '告警中心', path: '/alerts', icon: <BellRing size={16} />, perm: 'alert:read' },
    ],
  },
  {
    key: 'sys', label: '设置', icon: <Settings size={17} />,
    path: '/settings', perm: 'settings:read',
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
    if (g.path && (pathname === g.path ? pathname === g.path : (pathname === g.path || pathname.startsWith(g.path + '/')))) {
      if (g.path === '/' ? pathname === '/' : pathname.startsWith(g.path)) return { group: g.label, leaf: g.label };
    }
    if (g.children) {
      const c = g.children.find(ch => ch.path === '/' ? pathname === '/' : (pathname === ch.path || pathname.startsWith(ch.path + '/')));
      if (c) return { group: g.label, leaf: c.label };
    }
  }
  return null;
}

/** 角色登录后落地：返回该角色有权访问的第一个路由（Annotator 无总览 → 落到数据集/标注台）。 */
export function firstAllowedPath(has: (p: PermissionKey) => boolean): string {
  const hit = FLAT_ROUTES.find(r => has(r.perm));
  return hit?.path ?? '/';
}
