import {
  Gauge, LayoutDashboard,
  ClipboardCheck, FileSearch, ListChecks, Inbox,
  SlidersHorizontal, Workflow,
  Activity, BellRing, Trophy,
  Gavel,
  BarChart3, ShieldCheck, LineChart,
  Settings, Archive, KeyRound,
} from 'lucide-react';
import type { PermissionKey } from '../types';

export interface NavLeaf { key: string; label: string; path: string; icon: React.ReactNode; perm: PermissionKey; }
export interface NavGroup { key: string; label: string; icon: React.ReactNode; path?: string; perm?: PermissionKey; children?: NavLeaf[]; }

export const NAV: NavGroup[] = [
  {
    key: 'overview', label: '总览', icon: <Gauge size={16} />,
    children: [
      { key: 'dashboard', label: '质检看板', path: '/', icon: <LayoutDashboard size={14} />, perm: 'dashboard:read' },
    ],
  },
  {
    key: 'workbench', label: '质检工作台', icon: <ClipboardCheck size={16} />,
    children: [
      { key: 'queue', label: '案卷台', path: '/queue', icon: <Inbox size={14} />, perm: 'workbench:read' },
      { key: 'wb', label: '质检工作台', path: '/workbench', icon: <FileSearch size={14} />, perm: 'workbench:read' },
      { key: 'list', label: '全量对话/通话', path: '/list', icon: <ListChecks size={14} />, perm: 'list:read' },
    ],
  },
  {
    key: 'rules', label: '规则与模型', icon: <SlidersHorizontal size={16} />,
    children: [
      { key: 'scorecard', label: '评分卡配置器', path: '/scorecard', icon: <SlidersHorizontal size={14} />, perm: 'scorecard:read' },
      { key: 'pipeline', label: '多-agent 流水线', path: '/pipeline', icon: <Workflow size={14} />, perm: 'pipeline:read' },
    ],
  },
  {
    key: 'monitor', label: '监控与辅导', icon: <Activity size={16} />,
    children: [
      { key: 'alerts', label: '实时质检预警', path: '/alerts', icon: <BellRing size={14} />, perm: 'alert:read' },
      { key: 'perf', label: '坐席绩效排行', path: '/performance', icon: <Trophy size={14} />, perm: 'perf:read' },
    ],
  },
  {
    key: 'flow', label: '流程', icon: <Gavel size={16} />,
    children: [
      { key: 'appeal', label: '复核 / 申诉', path: '/appeal', icon: <Gavel size={14} />, perm: 'review:create' },
    ],
  },
  {
    key: 'insight', label: '洞察', icon: <BarChart3 size={16} />,
    children: [
      { key: 'coverage', label: '合规话术覆盖率', path: '/coverage', icon: <ShieldCheck size={14} />, perm: 'coverage:read' },
      { key: 'reports', label: '报表与趋势', path: '/reports', icon: <LineChart size={14} />, perm: 'report:read' },
    ],
  },
  {
    key: 'sys', label: '系统', icon: <Settings size={16} />,
    children: [
      { key: 'retention', label: '留存与审计', path: '/retention', icon: <Archive size={14} />, perm: 'retention:read' },
      { key: 'rbac', label: '角色与权限', path: '/rbac', icon: <KeyRound size={14} />, perm: 'rbac:manage' },
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
    if (g.path && (pathname === g.path || pathname.startsWith(g.path + '/'))) return { group: g.label, leaf: g.label };
    if (g.children) {
      const c = g.children.find(ch => ch.path === '/' ? pathname === '/' : (pathname === ch.path || pathname.startsWith(ch.path + '/')));
      if (c) return { group: g.label, leaf: c.label };
    }
  }
  return null;
}
