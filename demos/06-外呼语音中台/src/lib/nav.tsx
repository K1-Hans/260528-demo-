import {
  Headset, Radio, CalendarClock, PhoneForwarded,
  Cpu, Workflow, Mic, ListMusic,
  ShieldCheck, Filter, FlaskConical, Scale,
  Settings, Phone, UserCog,
} from 'lucide-react';
import type { PermissionKey } from '../types';

export interface NavLeaf { key: string; label: string; path: string; icon: React.ReactNode; perm: PermissionKey; }
export interface NavGroup { key: string; label: string; icon: React.ReactNode; path?: string; perm?: PermissionKey; children?: NavLeaf[]; }

export const NAV: NavGroup[] = [
  {
    key: 'ops', label: '外呼作战', icon: <Headset size={16} />,
    children: [
      { key: 'monitor', label: '实时通话监控墙', path: '/monitor', icon: <Radio size={15} />, perm: 'monitor:read' },
      { key: 'campaigns', label: '外呼任务调度台', path: '/campaigns', icon: <CalendarClock size={15} />, perm: 'campaign:read' },
      { key: 'handoff', label: '坐席协同 · 转人工队列', path: '/handoff', icon: <PhoneForwarded size={15} />, perm: 'handoff:read' },
    ],
  },
  {
    key: 'engine', label: '智能引擎', icon: <Cpu size={16} />,
    children: [
      { key: 'script', label: '话术流编排器', path: '/script', icon: <Workflow size={15} />, perm: 'script:read' },
      { key: 'voice', label: '语音 / 音色配置', path: '/voice', icon: <Mic size={15} />, perm: 'voice:read' },
      { key: 'records', label: '通话记录 · 转写回放', path: '/records', icon: <ListMusic size={15} />, perm: 'records:read' },
    ],
  },
  {
    key: 'growth', label: '增长与合规', icon: <ShieldCheck size={16} />,
    children: [
      { key: 'funnel', label: '线索评分与转化漏斗', path: '/funnel', icon: <Filter size={15} />, perm: 'funnel:read' },
      { key: 'abtest', label: '数据回流 · 话术 A/B', path: '/abtest', icon: <FlaskConical size={15} />, perm: 'abtest:read' },
      { key: 'compliance', label: '合规与质检中心', path: '/compliance', icon: <Scale size={15} />, perm: 'compliance:read' },
    ],
  },
  {
    key: 'system', label: '系统', icon: <Settings size={16} />,
    children: [
      { key: 'numbers', label: '号码 / 线路 · 资质管理', path: '/numbers', icon: <Phone size={15} />, perm: 'numbers:read' },
      { key: 'settings', label: '设置 / 角色', path: '/settings', icon: <UserCog size={15} />, perm: 'settings:read' },
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
