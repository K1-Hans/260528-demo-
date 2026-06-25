import {
  LayoutDashboard, Radar, Gauge,
  ShieldAlert, FolderSearch, Share2, Siren,
  Scale, ListChecks, FileText, UserSearch,
  SlidersHorizontal, GitBranch, Activity, Microscope,
  Settings, DatabaseZap, UsersRound, ScrollText,
} from 'lucide-react';
import type { PermissionKey } from '../types';

export interface NavLeaf { key: string; label: string; path: string; icon: React.ReactNode; perm: PermissionKey; }
export interface NavGroup { key: string; label: string; icon: React.ReactNode; path?: string; perm?: PermissionKey; children?: NavLeaf[]; }

export const NAV: NavGroup[] = [
  {
    key: 'overview', label: '总览', icon: <LayoutDashboard size={16} />,
    children: [
      { key: 'monitor', label: '实时监控大屏', path: '/monitor', icon: <Radar size={15} />, perm: 'monitor:read' },
      { key: 'cockpit', label: '高管风险驾驶舱', path: '/cockpit', icon: <Gauge size={15} />, perm: 'cockpit:read' },
    ],
  },
  {
    key: 'fraud', label: '欺诈与调查', icon: <ShieldAlert size={16} />,
    children: [
      { key: 'cases', label: '案件调查工作台', path: '/cases', icon: <FolderSearch size={15} />, perm: 'case:read' },
      { key: 'network', label: '反欺诈关系网络', path: '/network', icon: <Share2 size={15} />, perm: 'network:read' },
      { key: 'alerts', label: '实时预警处置中心', path: '/alerts', icon: <Siren size={15} />, perm: 'alert:read' },
    ],
  },
  {
    key: 'aml', label: 'AML 合规', icon: <Scale size={16} />,
    children: [
      { key: 'amlq', label: 'AML 告警队列', path: '/aml', icon: <ListChecks size={15} />, perm: 'aml:read' },
      { key: 'sar', label: 'SAR 报告生成', path: '/sar', icon: <FileText size={15} />, perm: 'sar:read' },
      { key: 'screening', label: '名单 / 制裁筛查', path: '/screening', icon: <UserSearch size={15} />, perm: 'screening:read' },
    ],
  },
  {
    key: 'strategy', label: '策略与模型', icon: <SlidersHorizontal size={16} />,
    children: [
      { key: 'strat', label: '决策规则 / 策略编排器', path: '/strategy', icon: <GitBranch size={15} />, perm: 'strategy:read' },
      { key: 'scorecard', label: '评分卡 + 模型监控', path: '/scorecard', icon: <Activity size={15} />, perm: 'scorecard:read' },
      { key: 'explain', label: '模型可解释性面板', path: '/explain', icon: <Microscope size={15} />, perm: 'explain:read' },
    ],
  },
  {
    key: 'system', label: '系统', icon: <Settings size={16} />,
    children: [
      { key: 'datasources', label: '数据源接入态', path: '/datasources', icon: <DatabaseZap size={15} />, perm: 'datasource:read' },
      { key: 'rbac', label: '角色与权限', path: '/rbac', icon: <UsersRound size={15} />, perm: 'rbac:read' },
      { key: 'audit', label: '审计日志', path: '/audit', icon: <ScrollText size={15} />, perm: 'audit:read' },
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
  return hit?.path ?? '/monitor';
}
