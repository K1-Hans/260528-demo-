import {
  Workflow, History, Bot, Blocks, Bug, Rocket,
} from 'lucide-react';
import type { PermissionKey } from '../types';

export interface NavLeaf { key: string; label: string; path: string; icon: React.ReactNode; perm: PermissionKey; }
export interface NavGroup { key: string; label: string; icon: React.ReactNode; path?: string; perm?: PermissionKey; children?: NavLeaf[]; }

export const NAV: NavGroup[] = [
  {
    key: 'orch', label: '编排', icon: <Workflow size={16} />,
    children: [
      { key: 'canvas', label: '编排画布', path: '/canvas', icon: <Workflow size={15} />, perm: 'canvas:read' },
      { key: 'runs', label: '运行历史', path: '/runs', icon: <History size={15} />, perm: 'runs:read' },
    ],
  },
  {
    key: 'build', label: '构建', icon: <Blocks size={16} />,
    children: [
      { key: 'agents', label: '多 Agent 协作', path: '/agents', icon: <Bot size={15} />, perm: 'agents:read' },
      { key: 'tools', label: '工具 & MCP', path: '/tools', icon: <Blocks size={15} />, perm: 'tools:read' },
      { key: 'debug', label: '单步调试', path: '/debug', icon: <Bug size={15} />, perm: 'debug:read' },
    ],
  },
  { key: 'deploy', label: '发布', icon: <Rocket size={16} />, path: '/deploy', perm: 'deploy:read' },
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
  return hit?.path ?? '/canvas';
}
