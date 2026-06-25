import {
  Gauge, LayoutDashboard, Coins, LayoutGrid,
  MessagesSquare, Radio, MessageCircle, ThumbsDown, SearchX, ShieldCheck,
  BookOpen, Layers, Database, CreditCard, Smile, Headset, ShieldAlert, Trash2,
  Workflow, Cpu, FileCode, ListTree, Tags, FlaskConical, Sparkles,
  Settings, ScrollText, KeyRound,
} from 'lucide-react';
import type { PermissionKey } from '../types';

export interface NavLeaf { key: string; label: string; path: string; icon: React.ReactNode; perm: PermissionKey; }
export interface NavGroup { key: string; label: string; icon: React.ReactNode; path?: string; perm?: PermissionKey; children?: NavLeaf[]; }

export const NAV: NavGroup[] = [
  {
    key: 'overview', label: '运营总览', icon: <Gauge size={16} />,
    children: [
      { key: 'command', label: '运营总览', path: '/', icon: <LayoutDashboard size={14} />, perm: 'dashboard:read' },
      { key: 'dashboard', label: '数据看板', path: '/dashboard', icon: <Gauge size={14} />, perm: 'dashboard:read' },
      { key: 'token', label: 'Token 用量', path: '/token-usage', icon: <Coins size={14} />, perm: 'token:read' },
    ],
  },
  {
    key: 'conv', label: '对话与质量', icon: <MessagesSquare size={16} />,
    children: [
      { key: 'command-center', label: '实时指挥中心', path: '/command', icon: <LayoutGrid size={14} />, perm: 'conv:read' },
      { key: 'live', label: '实时对话台', path: '/live', icon: <Radio size={14} />, perm: 'conv:read' },
      { key: 'prod', label: '生产对话', path: '/prod-chat', icon: <MessageCircle size={14} />, perm: 'prod:read' },
      { key: 'badcase', label: 'Badcase 运营', path: '/badcase', icon: <ThumbsDown size={14} />, perm: 'badcase:read' },
      { key: 'reject', label: '拒识运营', path: '/reject', icon: <SearchX size={14} />, perm: 'reject:read' },
      { key: 'audit', label: '合规审计中心', path: '/audit', icon: <ShieldCheck size={14} />, perm: 'audit:read' },
    ],
  },
  {
    key: 'kb', label: '知识库', icon: <BookOpen size={16} />,
    children: [
      { key: 'scenario', label: '问题场景', path: '/kb/scenario', icon: <Layers size={14} />, perm: 'scenario:read' },
      { key: 'qa', label: 'QA 知识库', path: '/kb/qa', icon: <Database size={14} />, perm: 'kb:read' },
      { key: 'card', label: '卡片知识库', path: '/kb/card', icon: <CreditCard size={14} />, perm: 'kb:read' },
      { key: 'chitchat', label: '寒暄知识库', path: '/kb/chitchat', icon: <Smile size={14} />, perm: 'kb:read' },
      { key: 'transfer', label: '转人工知识库', path: '/kb/transfer', icon: <Headset size={14} />, perm: 'kb:read' },
      { key: 'sensitive', label: '敏感词管理', path: '/kb/sensitive', icon: <ShieldAlert size={14} />, perm: 'sensitive:read' },
      { key: 'recycle', label: '回收站', path: '/kb/recycle', icon: <Trash2 size={14} />, perm: 'recycle:manage' },
    ],
  },
  {
    key: 'agent', label: '智能体与配置', icon: <Workflow size={16} />,
    children: [
      { key: 'agents', label: '智能体管理', path: '/agents', icon: <Workflow size={14} />, perm: 'agents:read' },
      { key: 'llm', label: 'LLM 配置', path: '/llm', icon: <Cpu size={14} />, perm: 'llm:config' },
      { key: 'prompt', label: 'Prompt 版本', path: '/prompt', icon: <FileCode size={14} />, perm: 'prompt:publish' },
      { key: 'intent', label: '意图分类', path: '/intent', icon: <ListTree size={14} />, perm: 'intent:read' },
      { key: 'tags', label: '标签管理', path: '/tags', icon: <Tags size={14} />, perm: 'tags:read' },
      { key: 'pipeline', label: 'Pipeline 测试', path: '/pipeline-test', icon: <FlaskConical size={14} />, perm: 'pipeline:test' },
      { key: 'kg', label: '知识补齐', path: '/knowledge-gap', icon: <Sparkles size={14} />, perm: 'kg:review' },
    ],
  },
  {
    key: 'sys', label: '系统', icon: <Settings size={16} />,
    children: [
      { key: 'logs', label: '会话日志', path: '/logs', icon: <ScrollText size={14} />, perm: 'logs:read' },
      { key: 'rbac', label: '分权管理', path: '/rbac', icon: <KeyRound size={14} />, perm: 'rbac:manage' },
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
