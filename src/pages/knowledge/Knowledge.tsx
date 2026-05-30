import { useState, useMemo } from 'react';
import { BookOpen, Pin, Eye, Clock, Search, FileText, BarChart2 } from 'lucide-react';
import { Card, PageHeader, Badge, Segmented, EmptyState, SectionTitle } from '../../components/ui';
import { KNOWLEDGE_DOCS } from '../../lib/mockData';
import type { KnowledgeDoc } from '../../types';

// ─── Category → accent colour map ────────────────────────────────────────────
const CATEGORY_COLOR: Record<string, string> = {
  方法论: 'var(--gold)',
  竞品: 'var(--info)',
  政策: 'var(--warning)',
  SOP: 'var(--emerald)',
  模板: 'var(--c6)',
  工具: 'var(--c4)',
  产品: 'var(--c7)',
};
function catColor(c: string): string {
  return CATEGORY_COLOR[c] ?? 'var(--text-2)';
}

const ALL_CAT = '全部';

// ─── DocCard ─────────────────────────────────────────────────────────────────
function DocCard({ doc, delayClass }: { doc: KnowledgeDoc; delayClass: string }) {
  const accent = catColor(doc.category);
  return (
    <Card hover className={`reveal ${delayClass} col`} style={{ gap: 0, height: '100%' }}>
      {/* gold stripe for pinned */}
      {doc.pinned && (
        <div
          className="stripe-top"
          style={{ background: `linear-gradient(90deg, ${accent}, var(--bronze))` }}
        />
      )}

      {/* category + pinned badge */}
      <div className="row gap-2 spread" style={{ marginBottom: 10 }}>
        <Badge color={accent}>{doc.category}</Badge>
        {doc.pinned && (
          <span
            className="row gap-1"
            style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.04em' }}
          >
            <Pin size={11} strokeWidth={2} />置顶
          </span>
        )}
      </div>

      {/* title */}
      <div
        className="t-h3"
        style={{ color: 'var(--text-1)', marginBottom: 8, lineHeight: 1.4, flex: 1 }}
      >
        {doc.title}
      </div>

      {/* excerpt — 2-line clamp */}
      <p
        className="t-small text-2"
        style={{
          lineHeight: 1.6,
          marginBottom: 14,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {doc.excerpt}
      </p>

      {/* tags */}
      {doc.tags.length > 0 && (
        <div className="row wrap gap-1" style={{ marginBottom: 14 }}>
          {doc.tags.map(t => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      )}

      {/* footer meta */}
      <div
        className="row spread t-small text-3"
        style={{
          borderTop: '1px solid var(--hairline)',
          paddingTop: 11,
          marginTop: 'auto',
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        <span className="row gap-2">
          <span
            className="avatar"
            style={{ width: 20, height: 20, fontSize: 10, borderRadius: 6 }}
          >
            {doc.author[0]}
          </span>
          <span style={{ color: 'var(--text-2)', fontSize: 12 }}>{doc.author}</span>
        </span>
        <span className="row gap-3">
          <span className="row gap-1 tnum">
            <Eye size={12} strokeWidth={1.75} />
            {doc.views.toLocaleString('zh-CN')}
          </span>
          <span className="row gap-1">
            <Clock size={12} strokeWidth={1.75} />
            {doc.updatedAt.slice(5)}
          </span>
        </span>
      </div>
    </Card>
  );
}

// ─── Stat strip ───────────────────────────────────────────────────────────────
function StatStrip() {
  const totalViews = KNOWLEDGE_DOCS.reduce((s, d) => s + d.views, 0);
  const catCount = new Set(KNOWLEDGE_DOCS.map(d => d.category)).size;
  const stats = [
    { label: '文档总数', value: KNOWLEDGE_DOCS.length, unit: '篇', icon: <FileText size={14} strokeWidth={1.75} /> },
    { label: '分类数', value: catCount, unit: '类', icon: <BarChart2 size={14} strokeWidth={1.75} /> },
    { label: '累计浏览', value: totalViews, unit: '次', icon: <Eye size={14} strokeWidth={1.75} /> },
  ];
  return (
    <div className="row gap-3 reveal reveal-1" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
      {stats.map(s => (
        <div
          key={s.label}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--r-md)',
            background: 'var(--surface-1)',
            border: '1px solid var(--hairline)',
            minWidth: 120,
          }}
        >
          <div className="row gap-2 label" style={{ marginBottom: 6 }}>
            <span style={{ color: 'var(--gold)', opacity: 0.7 }}>{s.icon}</span>
            {s.label}
          </div>
          <span
            className="tnum"
            style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.01em' }}
          >
            {s.value.toLocaleString('zh-CN')}
          </span>
          <span className="kpi-unit">{s.unit}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Knowledge() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>(ALL_CAT);

  const categories = useMemo(() => {
    const set = new Set(KNOWLEDGE_DOCS.map(d => d.category));
    return [ALL_CAT, ...Array.from(set)];
  }, []);

  const segOptions = useMemo(
    () => categories.map(c => ({ value: c, label: c })),
    [categories],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return KNOWLEDGE_DOCS.filter(d => {
      const matchCat = category === ALL_CAT || d.category === category;
      const matchQ =
        !q ||
        d.title.toLowerCase().includes(q) ||
        d.excerpt.toLowerCase().includes(q) ||
        d.tags.some(t => t.toLowerCase().includes(q)) ||
        d.author.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [query, category]);

  const pinned = filtered.filter(d => d.pinned);
  const regular = filtered.filter(d => !d.pinned);

  const delayClass = (i: number) => `reveal-${Math.min(i + 1, 6)}`;

  return (
    <div className="page">
      <PageHeader
        title="知识库"
        subtitle="策略方法论 · 话术手册 · 政策汇编 · SOP 模板"
        actions={
          <span className="t-small text-3 tnum row gap-1">
            <BookOpen size={13} strokeWidth={1.75} style={{ color: 'var(--gold)', opacity: 0.7 }} />
            {KNOWLEDGE_DOCS.length} 篇文档
          </span>
        }
      />

      <StatStrip />

      {/* Search + category filter */}
      <div
        className="row gap-3 reveal reveal-2"
        style={{ marginBottom: 24, flexWrap: 'wrap' }}
      >
        <div className="input-wrap" style={{ flex: '1 1 240px', minWidth: 200, maxWidth: 380 }}>
          <Search size={14} className="input-icon" strokeWidth={1.75} />
          <input
            className="input"
            placeholder="搜索标题、摘要、标签、作者…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <Segmented<string>
          options={segOptions}
          value={category}
          onChange={setCategory}
        />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card>
          <EmptyState
            icon={<BookOpen size={40} strokeWidth={1.5} />}
            title="没有匹配的文档"
            desc="尝试调整关键词或分类筛选"
          />
        </Card>
      )}

      {/* Pinned section */}
      {pinned.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <SectionTitle
            right={<Badge color="var(--gold)">{pinned.length} 篇</Badge>}
          >
            置顶文档
          </SectionTitle>
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
          >
            {pinned.map((doc, i) => (
              <DocCard key={doc.id} doc={doc} delayClass={delayClass(i + 2)} />
            ))}
          </div>
        </section>
      )}

      {/* Regular docs */}
      {regular.length > 0 && (
        <section>
          {pinned.length > 0 && (
            <SectionTitle
              right={<span className="t-small text-3 tnum">{regular.length} 篇</span>}
            >
              全部文档
            </SectionTitle>
          )}
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
          >
            {regular.map((doc, i) => (
              <DocCard key={doc.id} doc={doc} delayClass={delayClass(i % 6)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
