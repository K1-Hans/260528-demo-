import { useMemo, useState } from 'react';
import {
  Network, Users, FileText, Hash, FolderKanban, Lock, ShieldCheck,
  Sparkles, Link2, GitBranch, MousePointerClick, X, ArrowUpRight,
  Search, Waypoints, Award, UserCircle2, RotateCcw, Gauge, Share2, ShieldAlert,
} from 'lucide-react';
import { PageHeader, Card, EmptyState } from '../components/ui';
import GraphCanvas, { KIND_LABEL } from '../components/GraphCanvas';
import { useAuth } from '../contexts/AuthContext';
import { GRAPH_NODES, GRAPH_EDGES, canAccess } from '../lib/mockData';
import { LEVEL_LABEL } from '../types';
import type { GraphNode, NodeKind, ClearanceLevel } from '../types';

// 节点类型 → 图例色 / 标签 / 图标（与 GraphCanvas 内 KIND_VAR 对齐；标签复用共享 KIND_LABEL）
const KIND_META: Record<NodeKind, { label: string; color: string; Icon: typeof Users }> = {
  person: { label: KIND_LABEL.person, color: 'var(--gold)', Icon: Users },
  doc: { label: KIND_LABEL.doc, color: 'var(--c2)', Icon: FileText },
  topic: { label: KIND_LABEL.topic, color: 'var(--c5)', Icon: Hash },
  project: { label: KIND_LABEL.project, color: 'var(--c3)', Icon: FolderKanban },
};
const KIND_ORDER: NodeKind[] = ['person', 'doc', 'topic', 'project'];
const REL_LABEL: Record<string, string> = { 作者: '撰写', 引用: '引用', 参与: '参与', 相关: '相关', 协作: '协作' };
const levelTone = (l: ClearanceLevel) => (l >= 4 ? 'var(--danger)' : l === 3 ? 'var(--warning)' : l === 2 ? 'var(--info)' : 'var(--emerald)');

// 密级筛选档位（公开→机密 + 全部）
const LEVEL_FILTERS: Array<ClearanceLevel | 'all'> = ['all', 1, 2, 3, 4];

// 「与我相关」根集合：me 节点及其全量一跳邻居
const MY_SET = (() => {
  const set = new Set<string>(['me']);
  GRAPH_EDGES.forEach(e => { if (e.source === 'me') set.add(e.target); if (e.target === 'me') set.add(e.source); });
  return set;
})();

// 每个节点的协作/连接度（全量 edges 上算一次，详情栏用）
const DEGREE = (() => {
  const d: Record<string, number> = {};
  GRAPH_EDGES.forEach(e => { d[e.source] = (d[e.source] ?? 0) + 1; d[e.target] = (d[e.target] ?? 0) + 1; });
  return d;
})();

// 3 位领域专家（高产专家卡片入口）—— 取 person 且带 expertOf、排除「你」
const EXPERTS: GraphNode[] = GRAPH_NODES
  .filter(n => n.kind === 'person' && n.id !== 'me' && n.expertOf)
  .sort((a, b) => b.centrality - a.centrality);

interface Neighbor { node: GraphNode; relation: string; }

export default function Graph() {
  const { currentRole } = useAuth();
  const clearance = (currentRole?.clearance ?? 2) as ClearanceLevel;

  const DEFAULTS = { kinds: new Set(KIND_ORDER), dept: '全部', level: 'all' as ClearanceLevel | 'all', onlyMine: false };
  const [kinds, setKinds] = useState<Set<NodeKind>>(DEFAULTS.kinds);
  const [dept, setDept] = useState<string>(DEFAULTS.dept);
  const [level, setLevel] = useState<ClearanceLevel | 'all'>(DEFAULTS.level);
  const [onlyMine, setOnlyMine] = useState(DEFAULTS.onlyMine);
  const [locate, setLocate] = useState('');
  const [sel, setSel] = useState<string | null>(null);

  const isPristine =
    kinds.size === KIND_ORDER.length && dept === '全部' && level === 'all' && !onlyMine && !locate && !sel;
  const resetView = () => {
    setKinds(new Set(KIND_ORDER)); setDept('全部'); setLevel('all'); setOnlyMine(false); setLocate(''); setSel(null);
  };

  // 部门选项（仅 person 节点带 dept）
  const depts = useMemo(() => {
    const s = new Set<string>();
    GRAPH_NODES.forEach(n => n.dept && s.add(n.dept));
    return ['全部', ...Array.from(s)];
  }, []);

  // 全局图谱概览（不随筛选变）：节点总数 / 边数 / 专家数 / 你的一度邻居数
  const overview = useMemo(() => ({
    nodes: GRAPH_NODES.length, edges: GRAPH_EDGES.length, experts: EXPERTS.length, myNeighbors: MY_SET.size - 1,
  }), []);

  // 筛选后的节点：类型多选 + 部门（仅作用于 person）+ 密级 + 只看与我相关
  const filteredNodes = useMemo(() => GRAPH_NODES.filter(n => {
    if (!kinds.has(n.kind)) return false;
    if (onlyMine && !MY_SET.has(n.id)) return false;
    if (level !== 'all' && n.level !== level) return false;
    // 部门筛选只收束 person；非 person 节点无部门，保持图谱连贯
    if (dept !== '全部' && n.kind === 'person' && n.dept !== dept) return false;
    return true;
  }), [kinds, dept, level, onlyMine]);

  // 边：两端都还在筛选集内才保留（避免 ECharts 引用悬空节点）
  const filteredEdges = useMemo(() => {
    const ids = new Set(filteredNodes.map(n => n.id));
    return GRAPH_EDGES.filter(e => ids.has(e.source) && ids.has(e.target));
  }, [filteredNodes]);

  // 权限统计（在当前可见子图上算）—— 随 clearance 实时变
  const stats = useMemo(() => {
    let vis = 0, locked = 0;
    filteredNodes.forEach(n => (canAccess(clearance, n.level) ? vis++ : locked++));
    return { vis, locked, total: filteredNodes.length };
  }, [filteredNodes, clearance]);

  // 搜索定位：在当前可见子图内按名称命中 → 高亮该节点
  const locateHit = useMemo(() => {
    const q = locate.trim();
    if (!q) return null;
    return filteredNodes.find(n => n.name.includes(q)) ?? null;
  }, [locate, filteredNodes]);
  const highlightId = locateHit?.id ?? sel;

  // 选中节点 + 邻居（详情用全量 edges，呈现完整知识关系）
  const selNode = sel ? GRAPH_NODES.find(n => n.id === sel) ?? null : null;
  const neighbors: Neighbor[] = useMemo(() => {
    if (!selNode) return [];
    const out: Neighbor[] = [];
    const seen = new Set<string>();
    GRAPH_EDGES.forEach(e => {
      let otherId: string | null = null;
      if (e.source === selNode.id) otherId = e.target;
      else if (e.target === selNode.id) otherId = e.source;
      if (!otherId || seen.has(otherId)) return;
      const node = GRAPH_NODES.find(n => n.id === otherId);
      if (node) { seen.add(otherId); out.push({ node, relation: e.relation }); }
    });
    return out;
  }, [selNode]);

  const toggleKind = (k: NodeKind) => setKinds(prev => {
    const next = new Set(prev);
    if (next.has(k)) { if (next.size > 1) next.delete(k); } // 至少留一类，避免空图
    else next.add(k);
    return next;
  });

  // 点专家卡片 → 高亮其节点（清搜索框，避免冲突）
  const focusExpert = (id: string) => { setSel(id); setLocate(''); };

  const selVisible = selNode ? canAccess(clearance, selNode.level) : false;

  return (
    <div className="page" style={{ maxWidth: 1480 }}>
      <PageHeader
        title="知识图谱"
        subtitle="企业知识本体 · 人 / 文档 / 主题 / 项目的关系网络，按你的密级灰锁不可见节点"
        actions={
          <span className="chip" style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }}>
            <Network size={13} /> 力导向 · 与我相关高亮
          </span>
        }
      />

      {/* 图谱概览小卡 */}
      <div className="grid grid-cols-auto reveal" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        {[
          { Icon: Waypoints, label: '节点总数', value: overview.nodes, sub: '人 / 文档 / 主题 / 项目' },
          { Icon: GitBranch, label: '关系边数', value: overview.edges, sub: '作者 / 引用 / 协作 / 相关' },
          { Icon: Award, label: '领域专家', value: overview.experts, sub: '高产作者节点' },
          { Icon: UserCircle2, label: '你的一度邻居', value: overview.myNeighbors, sub: '与你直接关联', accent: true },
        ].map(s => (
          <div key={s.label} className="card card-hover" style={{ padding: '13px 16px' }}>
            <div className="spread" style={{ marginBottom: 9 }}>
              <span className="label">{s.label}</span>
              <span style={{ color: s.accent ? 'var(--gold)' : 'var(--text-3)', opacity: s.accent ? 1 : 0.65 }}><s.Icon size={15} /></span>
            </div>
            <div className="kpi-value mononum" style={{ fontSize: 26, color: s.accent ? 'var(--gold)' : 'var(--text-1)' }}>{s.value}</div>
            <div className="t-small text-3" style={{ marginTop: 5 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* 高产专家入口 + 权限统计条（同一行：左专家入口、右权限统计） */}
      <div className="card reveal" style={{ padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span className="row gap-2" style={{ flexShrink: 0 }}>
          <Award size={15} style={{ color: 'var(--gold)' }} />
          <span className="label" style={{ color: 'var(--text-2)' }}>高产专家</span>
        </span>
        <div className="row gap-2 wrap" style={{ flex: 1, minWidth: 220 }}>
          {EXPERTS.map(e => {
            const active = sel === e.id;
            return (
              <button
                key={e.id}
                onClick={() => focusExpert(e.id)}
                className="row gap-2"
                style={{
                  cursor: 'pointer', padding: '5px 11px 5px 6px', borderRadius: 'var(--r-pill)',
                  border: '1px solid', borderColor: active ? 'var(--hairline-strong)' : 'var(--hairline)',
                  background: active ? 'var(--gold-glow)' : 'var(--surface-2)',
                  transition: 'all var(--dur-micro) var(--ease)',
                }}
              >
                <span className="avatar" style={{ width: 24, height: 24, fontSize: 11 }}>{e.name.slice(0, 1)}</span>
                <span style={{ minWidth: 0, textAlign: 'left' }}>
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: active ? 'var(--gold)' : 'var(--text-1)', lineHeight: 1.25 }}>{e.name}</span>
                  <span className="t-small text-3" style={{ fontSize: 10.5, lineHeight: 1.2 }}>{e.expertOf}</span>
                </span>
                <span className="mononum" style={{ fontSize: 11, fontWeight: 600, color: active ? 'var(--gold)' : 'var(--text-3)' }}>{Math.round(e.centrality * 100)}</span>
              </button>
            );
          })}
        </div>

        <span style={{ width: 1, height: 24, background: 'var(--hairline)' }} />

        <span className="row gap-2" style={{ flexShrink: 0 }}>
          <ShieldCheck size={15} style={{ color: 'var(--emerald)' }} />
          <span className="t-small text-2"><b style={{ color: currentRole?.color }}>{currentRole?.name}</b> · 密级 <b className="mononum">{clearance}</b></span>
          <span style={{ width: 1, height: 14, background: 'var(--hairline)' }} />
          <span className="row gap-1 t-small text-3"><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--emerald)' }} /> 可见 <b className="mononum" style={{ color: 'var(--emerald)' }}>{stats.vis}</b></span>
          <span className="row gap-1 t-small text-3"><Lock size={11} style={{ color: 'var(--warning)' }} /> 灰锁 <b className="mononum" style={{ color: 'var(--warning)' }}>{stats.locked}</b></span>
        </span>
      </div>

      {/* 筛选工具条：类型 / 部门 / 密级 / 只看与我相关 / 搜索 / 重置 */}
      <div className="card reveal reveal-1" style={{ padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span className="label" style={{ marginRight: 2 }}>节点类型</span>
        <div className="row gap-1 wrap">
          {KIND_ORDER.map(k => {
            const m = KIND_META[k]; const on = kinds.has(k); const Icon = m.Icon;
            return (
              <button
                key={k}
                onClick={() => toggleKind(k)}
                className="chip"
                style={{
                  cursor: 'pointer', border: '1px solid',
                  borderColor: on ? `color-mix(in srgb, ${m.color} 42%, transparent)` : 'var(--hairline)',
                  background: on ? `color-mix(in srgb, ${m.color} 13%, transparent)` : 'var(--surface-2)',
                  color: on ? m.color : 'var(--text-3)',
                  transition: 'all var(--dur-micro) var(--ease)',
                }}
              >
                <Icon size={12} /> {m.label}
                <span className="mononum" style={{ opacity: 0.7, fontWeight: 500 }}>{GRAPH_NODES.filter(n => n.kind === k).length}</span>
              </button>
            );
          })}
        </div>

        <span style={{ width: 1, height: 18, background: 'var(--hairline)' }} />

        <span className="label" style={{ marginRight: 2 }}>部门</span>
        <div className="row gap-1 wrap">
          {depts.map(d => (
            <button
              key={d}
              onClick={() => setDept(d)}
              className="btn btn-sm"
              style={{
                background: dept === d ? 'var(--gold-glow)' : 'var(--surface-2)',
                color: dept === d ? 'var(--gold)' : 'var(--text-3)',
                border: '1px solid', borderColor: dept === d ? 'var(--hairline-strong)' : 'var(--hairline)',
              }}
            >
              {d}
            </button>
          ))}
        </div>

        <span style={{ width: 1, height: 18, background: 'var(--hairline)' }} />

        <span className="label" style={{ marginRight: 2 }}>密级</span>
        <div className="row gap-1 wrap">
          {LEVEL_FILTERS.map(lv => {
            const on = level === lv;
            const tone = lv === 'all' ? 'var(--gold)' : levelTone(lv);
            return (
              <button
                key={String(lv)}
                onClick={() => setLevel(lv)}
                className="btn btn-sm"
                style={{
                  background: on ? `color-mix(in srgb, ${tone} 13%, transparent)` : 'var(--surface-2)',
                  color: on ? tone : 'var(--text-3)',
                  border: '1px solid', borderColor: on ? `color-mix(in srgb, ${tone} 40%, transparent)` : 'var(--hairline)',
                  transition: 'all var(--dur-micro) var(--ease)',
                }}
              >
                {lv === 'all' ? '全部' : LEVEL_LABEL[lv]}
              </button>
            );
          })}
        </div>

        {/* 搜索定位 */}
        <div className="row gap-2" style={{
          marginLeft: 'auto',
          background: 'var(--surface-2)', borderRadius: 'var(--r-sm)', padding: '0 9px',
          border: `1px solid ${locateHit ? 'var(--hairline-strong)' : 'var(--hairline)'}`,
          transition: 'border-color var(--dur-micro) var(--ease)',
        }}>
          <Search size={13} style={{ color: locateHit ? 'var(--gold)' : 'var(--text-3)', flexShrink: 0 }} />
          <input
            value={locate}
            onChange={e => setLocate(e.target.value)}
            placeholder="搜索定位节点"
            style={{ border: 'none', background: 'transparent', boxShadow: 'none', fontSize: 12.5, padding: '7px 0', width: 132, color: 'var(--text-1)', outline: 'none' }}
          />
          {locate && (
            <button onClick={() => setLocate('')} aria-label="清除" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'inline-flex', padding: 0 }}>
              <X size={13} />
            </button>
          )}
        </div>

        <button
          onClick={() => setOnlyMine(v => !v)}
          className="chip"
          style={{
            cursor: 'pointer', border: '1px solid',
            borderColor: onlyMine ? 'var(--hairline-strong)' : 'var(--hairline)',
            background: onlyMine ? 'var(--gold-glow)' : 'var(--surface-2)',
            color: onlyMine ? 'var(--gold)' : 'var(--text-2)',
            transition: 'all var(--dur-micro) var(--ease)',
          }}
        >
          <Sparkles size={12} /> 只看与我相关
          <span style={{
            width: 26, height: 15, borderRadius: 999, position: 'relative', flexShrink: 0,
            background: onlyMine ? 'var(--gold)' : 'var(--surface-3)', transition: 'background var(--dur-micro) var(--ease)',
          }}>
            <span style={{
              position: 'absolute', top: 2, left: onlyMine ? 13 : 2, width: 11, height: 11, borderRadius: '50%',
              background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.25)', transition: 'left var(--dur-micro) var(--ease)',
            }} />
          </span>
        </button>

        <button
          onClick={resetView}
          disabled={isPristine}
          className="btn btn-sm"
          aria-label="重置视图"
          style={{
            border: '1px solid var(--hairline)', background: 'var(--surface-2)',
            color: isPristine ? 'var(--text-3)' : 'var(--text-1)',
            opacity: isPristine ? 0.55 : 1, cursor: isPristine ? 'default' : 'pointer',
          }}
        >
          <RotateCcw size={12} /> 重置视图
        </button>
      </div>

      {/* 主画布 + 右栏详情 */}
      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: '1fr 380px', gap: 14, alignItems: 'start' }}>

        {/* 左：力导向画布（大）*/}
        <Card className="reveal reveal-2" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="spread" style={{ padding: '11px 14px', borderBottom: '1px solid var(--hairline)' }}>
            <span className="label"><span className="row gap-2"><Network size={13} /> 本体网络</span></span>
            <div className="row gap-3 wrap">
              {KIND_ORDER.map(k => (
                <span key={k} className="row gap-1" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: KIND_META[k].color }} />{KIND_META[k].label}
                </span>
              ))}
              <span className="row gap-1" style={{ fontSize: 10.5, color: 'var(--text-3)' }}><Lock size={9} style={{ color: 'var(--warning)' }} /> 受限灰锁</span>
            </div>
          </div>
          <div className="canvas-grid" style={{ position: 'relative' }}>
            <GraphCanvas
              nodes={filteredNodes}
              edges={filteredEdges}
              clearance={clearance}
              highlightId={highlightId}
              onNodeClick={n => { setSel(n.id); setLocate(''); }}
              height={'72vh'}
            />
            {locateHit && (
              <div style={{
                position: 'absolute', top: 12, left: 14, padding: '5px 10px', borderRadius: 'var(--r-sm)',
                background: 'var(--gold-glow)', border: '1px solid var(--hairline-strong)', color: 'var(--gold)',
                fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Search size={12} /> 已定位「{locateHit.name}」
              </div>
            )}
            <div style={{ position: 'absolute', left: 14, bottom: 12, fontSize: 10.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5, pointerEvents: 'none' }}>
              <MousePointerClick size={11} /> 拖拽平移 · 滚轮缩放 · 点节点看详情
            </div>
          </div>
        </Card>

        {/* 右：节点详情 */}
        <Card className="reveal reveal-3" style={{ padding: 0, position: 'sticky', top: 14, overflow: 'hidden' }}>
          <div className="spread" style={{ padding: '11px 14px', borderBottom: '1px solid var(--hairline)' }}>
            <span className="label">节点详情</span>
            {selNode && (
              <button
                onClick={() => setSel(null)}
                aria-label="清除选择"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26,
                  borderRadius: 'var(--r-sm)', border: '1px solid var(--hairline)', background: 'var(--surface-2)',
                  color: 'var(--text-3)', cursor: 'pointer', transition: 'all var(--dur-micro) var(--ease)',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {!selNode ? (
            <EmptyState
              icon={<MousePointerClick size={30} />}
              title="点击节点查看详情"
              desc="选中人 / 文档 / 主题 / 项目，查看密级、领域专长与知识关联"
            />
          ) : (
            <div style={{ padding: 16, maxHeight: '68vh', overflowY: 'auto' }}>
              {/* 头部：名称 + 类型 + 部门 */}
              <div className="row gap-2" style={{ marginBottom: 10 }}>
                <span style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: `color-mix(in srgb, ${KIND_META[selNode.kind].color} 14%, transparent)`,
                  color: KIND_META[selNode.kind].color,
                }}>
                  {(() => { const I = KIND_META[selNode.kind].Icon; return <I size={17} />; })()}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="t-answer serif" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.3 }}>{selNode.name}</div>
                  <div className="row gap-2" style={{ marginTop: 3 }}>
                    <span className="t-small text-3">{KIND_META[selNode.kind].label}</span>
                    {selNode.dept && <><span style={{ color: 'var(--text-3)', fontSize: 11 }}>·</span><span className="t-small text-3">{selNode.dept}</span></>}
                  </div>
                </div>
              </div>

              {/* 密级 + 可见性 */}
              <div className="row gap-2 wrap" style={{ marginBottom: 12 }}>
                <span className="badge" style={{ background: `color-mix(in srgb, ${levelTone(selNode.level)} 13%, transparent)`, color: levelTone(selNode.level) }}>
                  密级 {selNode.level} · {LEVEL_LABEL[selNode.level]}
                </span>
                {selVisible
                  ? <span className="badge" style={{ background: 'var(--emerald-dim)', color: 'var(--emerald-deep)' }}><ShieldCheck size={11} /> 在你权限内</span>
                  : <span className="lock-chip"><Lock size={11} /> 超出密级 · 灰锁</span>}
              </div>

              {/* 受限占位 or 正文详情 */}
              {!selVisible ? (
                <div className="locked" style={{ padding: '14px 14px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px dashed var(--hairline-strong)' }}>
                  <div className="row gap-2" style={{ color: 'var(--warning)', marginBottom: 6 }}><ShieldAlert size={14} /><span style={{ fontWeight: 600, fontSize: 13 }}>受限 · 需更高密级</span></div>
                  <div className="t-small text-3" style={{ lineHeight: 1.6 }}>该节点密级高于你的访问上限，详情与关联关系已按策略隐藏。如需访问请向治理控制台申请提权。</div>
                </div>
              ) : (
                <>
                  {selNode.detail && (
                    <div className="t-answer serif" style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-2)', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--hairline)' }}>
                      {selNode.detail}
                    </div>
                  )}

                  {/* 领域专家：高产领域 + 中心度 + 协作关系数 */}
                  {selNode.kind === 'person' && selNode.expertOf && (
                    <div style={{ marginBottom: 14, padding: '12px 13px', borderRadius: 'var(--r-md)', background: 'var(--gold-glow)', border: '1px solid var(--hairline-strong)' }}>
                      <div className="row gap-2" style={{ color: 'var(--gold)', marginBottom: 9 }}><Award size={13} /><span style={{ fontWeight: 600, fontSize: 12 }}>领域专家</span></div>
                      <div className="t-small" style={{ color: 'var(--text-2)', marginBottom: 10 }}>高产领域 · <b style={{ color: 'var(--gold)' }}>{selNode.expertOf}</b></div>
                      <div className="row gap-2">
                        <div style={{ flex: 1, padding: '8px 10px', borderRadius: 'var(--r-sm)', background: 'var(--surface-1)', border: '1px solid var(--hairline)' }}>
                          <div className="label" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}><Gauge size={11} /> 中心度</div>
                          <div className="mononum" style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)', lineHeight: 1 }}>{Math.round(selNode.centrality * 100)}<span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>/100</span></div>
                        </div>
                        <div style={{ flex: 1, padding: '8px 10px', borderRadius: 'var(--r-sm)', background: 'var(--surface-1)', border: '1px solid var(--hairline)' }}>
                          <div className="label" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}><Share2 size={11} /> 协作关系</div>
                          <div className="mononum" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>{DEGREE[selNode.id] ?? 0}<span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}> 条</span></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 关联：person → 关联文档；doc → 引用链；其它 → 相关节点 */}
                  {(() => {
                    const isPerson = selNode.kind === 'person';
                    const isDoc = selNode.kind === 'doc';
                    const docNbrs = neighbors.filter(n => n.node.kind === 'doc');
                    const list = isPerson ? docNbrs : neighbors;
                    const heading = isPerson
                      ? { Icon: FileText, t: `关联文档 · ${docNbrs.length}` }
                      : isDoc
                        ? { Icon: GitBranch, t: `引用链 · ${neighbors.length}` }
                        : { Icon: Link2, t: `相关节点 · ${neighbors.length}` };
                    const HIcon = heading.Icon;
                    if (list.length === 0) return (
                      <div className="t-small text-3" style={{ padding: '10px 0' }}>暂无可见的关联节点。</div>
                    );
                    return (
                      <div>
                        <div className="label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><HIcon size={12} /> {heading.t}</div>
                        <div className="col gap-1">
                          {list.map(({ node, relation }) => {
                            const vis = canAccess(clearance, node.level);
                            const m = KIND_META[node.kind]; const NIcon = m.Icon;
                            return (
                              <button
                                key={node.id}
                                onClick={() => vis && setSel(node.id)}
                                disabled={!vis}
                                className={vis ? '' : 'locked'}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
                                  padding: '8px 10px', borderRadius: 'var(--r-sm)', border: '1px solid var(--hairline)',
                                  background: 'var(--surface-2)', cursor: vis ? 'pointer' : 'not-allowed',
                                  transition: 'all var(--dur-micro) var(--ease)',
                                }}
                              >
                                <span style={{ color: vis ? m.color : 'var(--text-3)', flexShrink: 0, display: 'inline-flex' }}>
                                  {vis ? <NIcon size={14} /> : <Lock size={13} />}
                                </span>
                                <span style={{ flex: 1, minWidth: 0 }}>
                                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: vis ? 'var(--text-1)' : 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {vis ? node.name : '受限节点'}
                                  </span>
                                  <span className="row gap-1" style={{ marginTop: 1 }}>
                                    <span className="tag" style={{ padding: '0 6px', fontSize: 10 }}>{REL_LABEL[relation] ?? relation}</span>
                                    <span className="t-small text-3" style={{ fontSize: 10.5 }}>{m.label} · 密级 {node.level}</span>
                                  </span>
                                </span>
                                {vis && <ArrowUpRight size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* 角色感知提示 */}
      <div className="row gap-2 reveal" style={{ marginTop: 14, padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
        <ShieldCheck size={14} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
        <span className="t-small text-2">
          演示图谱同样<b>权限感知</b>：右上角切换账号，<b>灰锁节点数会随密级实时变化</b>——高密级文档（不良明细 / 关联穿透 / 并购条款）只对受限及以上角色显形。
        </span>
      </div>
    </div>
  );
}
