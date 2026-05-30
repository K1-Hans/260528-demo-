import {
  LayoutDashboard, Target, Crosshair, BarChart2, Radar, Swords, MapPin,
  Megaphone, Bot, BookOpen, Kanban, Settings, Users, Shield,
  Brain, Gauge, SlidersHorizontal, Filter, Siren,
  FileText, MonitorPlay, Store, Coins, Database, AudioLines, Lightbulb,
} from 'lucide-react';
import type { PermissionKey } from '../types';

export interface NavLeaf { key: string; label: string; path: string; icon: React.ReactNode; perm: PermissionKey; }
export interface NavGroup { key: string; label: string; icon: React.ReactNode; path?: string; perm?: PermissionKey; children?: NavLeaf[]; }

export const NAV: NavGroup[] = [
  {
    key: 'command', label: '作战指挥', icon: <Target size={16} />,
    children: [
      { key: 'overview', label: '指挥大屏', path: '/command/overview', icon: <LayoutDashboard size={14} />, perm: 'data:read' },
      { key: 'goals', label: '目标管理', path: '/command/goals', icon: <Target size={14} />, perm: 'strategy:read' },
      { key: 'ops', label: '操盘动作', path: '/command/ops', icon: <Crosshair size={14} />, perm: 'ops:read' },
      { key: 'report', label: '战报中心', path: '/command/report', icon: <FileText size={14} />, perm: 'reports:read' },
      { key: 'warroom', label: '作战室', path: '/command/warroom', icon: <MonitorPlay size={14} />, perm: 'data:read' },
    ],
  },
  {
    key: 'insights', label: '数据洞察', icon: <BarChart2 size={16} />,
    children: [
      { key: 'market', label: '市场五看', path: '/insights/market', icon: <Radar size={14} />, perm: 'data:read' },
      { key: 'competitor', label: '竞品数据', path: '/insights/competitor', icon: <Swords size={14} />, perm: 'competitor:read' },
      { key: 'subsidy', label: '补贴政策', path: '/insights/subsidy', icon: <MapPin size={14} />, perm: 'subsidy:read' },
      { key: 'network', label: '门店网络', path: '/insights/network', icon: <Store size={14} />, perm: 'competitor:read' },
    ],
  },
  {
    key: 'intel', label: '智能决策', icon: <Brain size={16} />,
    children: [
      { key: 'forecast', label: '销量预测', path: '/intel/forecast', icon: <Gauge size={14} />, perm: 'data:read' },
      { key: 'sandbox', label: '策略沙盘', path: '/intel/sandbox', icon: <SlidersHorizontal size={14} />, perm: 'strategy:read' },
      { key: 'funnel', label: '漏斗诊断', path: '/intel/funnel', icon: <Filter size={14} />, perm: 'data:read' },
      { key: 'alerts', label: '异常报警', path: '/intel/alerts', icon: <Siren size={14} />, perm: 'data:read' },
      { key: 'wargame', label: '竞品战棋', path: '/intel/wargame', icon: <Swords size={14} />, perm: 'competitor:read' },
      { key: 'incentive', label: '激励测算', path: '/intel/incentive', icon: <Coins size={14} />, perm: 'strategy:read' },
    ],
  },
  {
    key: 'voc', label: '用户声音', icon: <Megaphone size={16} />,
    children: [
      { key: 'voc-overview', label: '舆情概览', path: '/voc/overview', icon: <BarChart2 size={14} />, perm: 'voc:read' },
      { key: 'conversation', label: '试驾会话智能', path: '/voc/conversation', icon: <AudioLines size={14} />, perm: 'voc:read' },
      { key: 'feedback', label: '产品反馈闭环', path: '/voc/feedback', icon: <Lightbulb size={14} />, perm: 'voc:read' },
    ],
  },
  { key: 'ai', label: 'AI 助手', icon: <Bot size={16} />, path: '/ai', perm: 'ai:query' },
  { key: 'knowledge', label: '知识库', icon: <BookOpen size={16} />, path: '/knowledge', perm: 'knowledge:read' },
  { key: 'projects', label: '项目管理', icon: <Kanban size={16} />, path: '/projects', perm: 'projects:read' },
  {
    key: 'settings', label: '系统设置', icon: <Settings size={16} />,
    children: [
      { key: 'users', label: '用户管理', path: '/settings/users', icon: <Users size={14} />, perm: 'users:manage' },
      { key: 'roles', label: '角色权限', path: '/settings/roles', icon: <Shield size={14} />, perm: 'roles:manage' },
      { key: 'datagov', label: '数据治理', path: '/settings/data', icon: <Database size={14} />, perm: 'data:read' },
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
      const c = g.children.find(ch => pathname === ch.path || pathname.startsWith(ch.path + '/'));
      if (c) return { group: g.label, leaf: c.label };
    }
  }
  return null;
}
