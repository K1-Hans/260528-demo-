import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Sparkles, Network, Lock, ShieldCheck, ArrowRight, Filter, FileText,
} from 'lucide-react';
import { Card } from '../components/ui';
import GraphCanvas from '../components/GraphCanvas';
import { AnswerBody, TrustBar, SourceIcon } from '../components/Citation';
import { useAuth } from '../contexts/AuthContext';
import {
  SEARCH_RESULTS, FLAGSHIP_QUERY, FLAGSHIP_TURN, GRAPH_NODES, GRAPH_EDGES, CITE_NODE_MAP, canAccess,
} from '../lib/mockData';
import { LEVEL_LABEL } from '../types';
import type { Citation, ClearanceLevel, SearchResult } from '../types';

// 搜索结果 → 图谱节点（点结果联动高亮）
const RESULT_NODE: Record<string, string> = {
  r1: 'd-method', r3: 'd-cash', r4: 'd-compliance', r6: 'd-memo', r7: 'd-paper',
  r10: 'd-bad', r11: 'd-related', r15: 'd-ma',
};
const levelTone = (l: ClearanceLevel) => (l >= 4 ? 'var(--danger)' : l === 3 ? 'var(--warning)' : l === 2 ? 'var(--info)' : 'var(--success)');

export default function SearchAnswer() {
  const navigate = useNavigate();
  const { currentRole } = useAuth();
  const clearance = (currentRole?.clearance ?? 2) as ClearanceLevel;
  const [query, setQuery] = useState(FLAGSHIP_QUERY);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const visible = useMemo(() => SEARCH_RESULTS.filter(r => canAccess(clearance, r.level)), [clearance]);
  const filteredOut = SEARCH_RESULTS.length - visible.length;

  const onResult = (r: SearchResult) => {
    setSelected(r.id);
    setHighlight(RESULT_NODE[r.id] ?? null);
  };
  const onCite = (n: number) => setHighlight(CITE_NODE_MAP[n] ?? null);
  const onJump = (_c: Citation) => navigate('/chat');

  return (
    <div className="page" style={{ paddingTop: 18 }}>
      {/* 搜索框 */}
      <div className="card reveal" style={{ padding: 0, marginBottom: 14, borderColor: 'var(--hairline-strong)' }}>
        <div className="row gap-3" style={{ padding: '4px 8px' }}>
          <Search size={20} style={{ color: 'var(--gold)', marginLeft: 8 }} />
          <input
            id="kb-search-input"
            className="input"
            style={{ border: 'none', background: 'transparent', fontSize: 16, padding: '14px 0', boxShadow: 'none' }}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索全公司知识 · 语义 + 关键词"
          />
          <span className="tag" style={{ marginRight: 6 }}>语义检索</span>
          <button className="btn btn-primary" style={{ marginRight: 6 }}><Sparkles size={14} /> AI 答案</button>
        </div>
      </div>

      {/* 三栏联动 */}
      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: '330px 1fr 360px', gap: 14, alignItems: 'start' }}>

        {/* 左：语义搜索结果 */}
        <div className="col gap-3" style={{ minWidth: 0 }}>
          {filteredOut > 0 && (
            <div className="filter-banner reveal">
              <Filter size={14} />
              <span>已为你过滤 <b className="mononum">{filteredOut}</b> 条受限结果（密级 &gt; {clearance}）</span>
            </div>
          )}
          <Card className="reveal reveal-1" style={{ padding: 0 }}>
            <div className="spread" style={{ padding: '12px 14px', borderBottom: '1px solid var(--hairline)' }}>
              <span className="label">结果 · {visible.length}</span>
              <span className="t-small text-3">按相关度</span>
            </div>
            <div style={{ maxHeight: '64vh', overflowY: 'auto' }}>
              {visible.map(r => (
                <button
                  key={r.id}
                  className="result-row"
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px',
                    borderBottom: '1px solid var(--hairline)', background: selected === r.id ? 'var(--gold-glow)' : 'transparent',
                    border: 'none', borderLeft: selected === r.id ? '2px solid var(--gold)' : '2px solid transparent', cursor: 'pointer',
                  }}
                  onClick={() => onResult(r)}
                >
                  <div className="row gap-2" style={{ marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-3)', flexShrink: 0 }}><SourceIcon source={r.source} size={14} /></span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.35 }}>{r.title}</span>
                  </div>
                  <div className="t-small text-3 serif" style={{ lineHeight: 1.55, marginBottom: 6, color: 'var(--text-2)' }}>{r.snippet}</div>
                  <div className="row gap-2 wrap">
                    <span className="src-badge">{r.source}</span>
                    <span className="badge" style={{ background: `color-mix(in srgb, ${levelTone(r.level)} 13%, transparent)`, color: levelTone(r.level) }}>{LEVEL_LABEL[r.level]}</span>
                    <span className="t-small text-3 mononum" style={{ marginLeft: 'auto' }}>{r.updatedAt} · {(r.relevance * 100).toFixed(0)}%</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* 中：带溯源的 AI 答案 */}
        <Card className="reveal reveal-2" style={{ minHeight: 360 }}>
          <div className="row gap-2" style={{ marginBottom: 12 }}>
            <span className="badge" style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }}><Sparkles size={12} /> AI 答案</span>
            <span className="t-small text-3">{FLAGSHIP_TURN.question}</span>
          </div>
          <AnswerBody turn={FLAGSHIP_TURN} onActivate={onCite} onJump={onJump} />
          <div style={{ marginTop: 16 }}>
            <TrustBar count={FLAGSHIP_TURN.citations.length} inScope={100} />
          </div>
          <div className="row gap-2 wrap" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
            <span className="label" style={{ width: '100%', marginBottom: 4 }}>引用来源（hover 角标看溯源卡）</span>
            {FLAGSHIP_TURN.citations.map(c => (
              <button key={c.id} className="src-badge" style={{ cursor: 'pointer' }} onMouseEnter={() => onCite(c.n)} onClick={() => onCite(c.n)}>
                <span className="cite-ref" style={{ position: 'static' }}>{c.n}</span> {c.docName}
              </button>
            ))}
            <button className="btn btn-subtle btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/chat')}>继续追问 <ArrowRight size={12} /></button>
          </div>
        </Card>

        {/* 右：知识图谱 */}
        <Card className="reveal reveal-3" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="spread" style={{ padding: '12px 14px', borderBottom: '1px solid var(--hairline)' }}>
            <span className="label"><span className="row gap-2"><Network size={13} /> 知识图谱</span></span>
            <button className="btn btn-subtle btn-sm" onClick={() => navigate('/graph')}>全屏 <ArrowRight size={12} /></button>
          </div>
          <div className="canvas-grid" style={{ position: 'relative' }}>
            <GraphCanvas
              nodes={GRAPH_NODES} edges={GRAPH_EDGES} clearance={clearance}
              highlightId={highlight} onNodeClick={n => setHighlight(n.id)} height={'52vh'}
            />
            <div style={{ position: 'absolute', left: 12, bottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[['人', 'var(--gold)'], ['文档', 'var(--c2)'], ['主题', 'var(--c5)'], ['项目', 'var(--c3)']].map(([k, c]) => (
                <span key={k} className="row gap-1" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c as string }} />{k}
                </span>
              ))}
              <span className="row gap-1" style={{ fontSize: 10.5, color: 'var(--text-3)' }}><Lock size={9} /> 受限灰锁</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 角色感知提示 */}
      <div className="row gap-2" style={{ marginTop: 14, padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
        <ShieldCheck size={14} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
        <span className="t-small text-2">
          你正以 <b style={{ color: currentRole?.color }}>{currentRole?.name}（密级 {clearance}）</b> 检索 —— 右上角切换演示账号，
          <b>左侧结果数、过滤横幅、右侧图谱可见节点会实时收缩/展开</b>。这是「权限感知」：权限即可见边界。
        </span>
      </div>
    </div>
  );
}
