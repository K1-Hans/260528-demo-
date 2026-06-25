import {
  Compass, Search, MessageSquareText, Network, Sparkles,
  PenTool, PenLine, Bot,
  Plug, Cable,
  ShieldHalf, ShieldCheck, BarChart3,
} from 'lucide-react';
import type { PermissionKey } from '../types';

export interface NavLeaf { key: string; label: string; path: string; icon: React.ReactNode; perm: PermissionKey; }
export interface NavGroup { key: string; label: string; icon: React.ReactNode; path?: string; perm?: PermissionKey; children?: NavLeaf[]; }

export const NAV: NavGroup[] = [
  {
    key: 'discover', label: '发现 Discover', icon: <Compass size={16} />,
    children: [
      { key: 'search', label: '统一搜索 + AI 答案', path: '/', icon: <Search size={15} />, perm: 'search:read' },
      { key: 'chat', label: 'AI 助手对话', path: '/chat', icon: <MessageSquareText size={15} />, perm: 'chat:read' },
      { key: 'graph', label: '知识图谱', path: '/graph', icon: <Network size={15} />, perm: 'graph:read' },
      { key: 'proactive', label: '主动情报', path: '/proactive', icon: <Sparkles size={15} />, perm: 'proactive:read' },
    ],
  },
  {
    key: 'create', label: '创造 Create', icon: <PenTool size={16} />,
    children: [
      { key: 'canvas', label: '内容生成 / Canvas', path: '/canvas', icon: <PenLine size={15} />, perm: 'content:create' },
      { key: 'agents', label: 'Agent Builder', path: '/agents', icon: <Bot size={15} />, perm: 'agent:build' },
    ],
  },
  {
    key: 'connect', label: '接入 Connect', icon: <Plug size={16} />,
    children: [
      { key: 'connectors', label: '连接器管理', path: '/connectors', icon: <Cable size={15} />, perm: 'connector:manage' },
    ],
  },
  {
    key: 'govern', label: '治理 Govern', icon: <ShieldHalf size={16} />,
    children: [
      { key: 'governance', label: '权限 / 治理控制台', path: '/govern', icon: <ShieldCheck size={15} />, perm: 'govern:read' },
      { key: 'analytics', label: '使用分析 + ROI', path: '/analytics', icon: <BarChart3 size={15} />, perm: 'analytics:read' },
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

/** 角色登录后落地：返回首个可访问路由（全角色均有 search:read → 通常落 '/'）。 */
export function firstAllowedPath(has: (p: PermissionKey) => boolean): string {
  const hit = FLAT_ROUTES.find(r => has(r.perm));
  return hit?.path ?? '/';
}
