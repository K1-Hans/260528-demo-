import { useMemo, useState } from 'react';
import {
  FileEdit, Download, Users, History, Wand2, CheckSquare, Square, Lock,
  MessageSquareMore, ChevronDown, ShieldCheck, Layers,
} from 'lucide-react';
import { PageHeader, Card, SectionTitle, Badge, Segmented } from '../components/ui';
import { Field, toast } from '../components/kit';
import { CitationCard, SourceIcon, TrustBar } from '../components/Citation';
import Chart from '../components/Chart';
import { baseOption, accent, trust, sem, cssVar } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import { DRAFT_SECTIONS, FLAGSHIP_CITATIONS, canAccess } from '../lib/mockData';
import { LEVEL_LABEL } from '../types';
import type { Citation, ClearanceLevel, DraftSection } from '../types';

// ─── 文档类型选项 ──────────────────────────────────────────────────────────────
type DocType = 'due_diligence' | 'research_summary' | 'client_proposal';
const DOC_TYPE_OPTIONS: { value: DocType; label: string }[] = [
  { value: 'due_diligence', label: '尽调报告' },
  { value: 'research_summary', label: '研报摘要' },
  { value: 'client_proposal', label: '客户提案' },
];

// ─── 密级徽标颜色 ──────────────────────────────────────────────────────────────
const levelTone = (l: ClearanceLevel) =>
  l >= 4 ? 'var(--danger)' : l === 3 ? 'var(--warning)' : l === 2 ? 'var(--info)' : 'var(--success)';

// ─── 协作者 mock ───────────────────────────────────────────────────────────────
const COLLABORATORS = [
  { name: '沈知微', initials: '沈', color: '#4c6fe0' },
  { name: '陆明远', initials: '陆', color: '#2e9e6b' },
  { name: '韩澈', initials: '韩', color: '#c77d2e' },
];

// ─── 引用源构成数据（按 source 统计 FLAGSHIP_CITATIONS）─────────────────────
function buildCiteDistribution(selectedIds: string[], citations: Citation[]) {
  const active = citations.filter(c => selectedIds.includes(c.id));
  const map: Record<string, number> = {};
  active.forEach(c => { map[c.source] = (map[c.source] ?? 0) + 1; });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

// ─── 生成骨架动画状态 ─────────────────────────────────────────────────────────
function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 14, borderRadius: 6, background: 'var(--surface-3)',
            width: i === lines - 1 ? '68%' : '100%',
            animation: 'pulse 1.6s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  );
}

export default function Canvas() {
  const { currentRole } = useAuth();
  const clearance = (currentRole?.clearance ?? 2) as ClearanceLevel;

  // 文档类型
  const [docType, setDocType] = useState<DocType>('due_diligence');

  // prompt 文本
  const [prompt, setPrompt] = useState(
    '请基于所选引用源，起草一份针对某城商行的尽调报告，涵盖尽调范围、财务发现与合规结论。'
  );

  // 引用源勾选（默认全选可见的）
  const visibleCitations = useMemo(
    () => FLAGSHIP_CITATIONS.filter(c => canAccess(clearance, c.level)),
    [clearance]
  );
  const lockedCitations = useMemo(
    () => FLAGSHIP_CITATIONS.filter(c => !canAccess(clearance, c.level)),
    [clearance]
  );
  const [selectedCiteIds, setSelectedCiteIds] = useState<string[]>(() =>
    FLAGSHIP_CITATIONS.filter(c => canAccess(2, c.level)).map(c => c.id)
  );

  // 生成状态
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(true); // 默认展示草稿

  // 段落批注
  const [activeCitePopup, setActiveCitePopup] = useState<string | null>(null);

  // 引用来源 hover 详情
  const [hoverCite, setHoverCite] = useState<Citation | null>(null);

  // 当前草稿段落（按选中 cites 过滤）
  const draftSections: DraftSection[] = useMemo(() => {
    return DRAFT_SECTIONS.filter(sec =>
      sec.cites.some(n => {
        const cite = FLAGSHIP_CITATIONS.find(c => c.n === n);
        return cite ? selectedCiteIds.includes(cite.id) : false;
      })
    );
  }, [selectedCiteIds]);

  // 用于 ECharts 的引用源分布
  const citeDistData = useMemo(
    () => buildCiteDistribution(selectedCiteIds, FLAGSHIP_CITATIONS),
    [selectedCiteIds]
  );

  // 生成草稿
  const handleGenerate = () => {
    if (selectedCiteIds.length === 0) {
      toast('请至少勾选一个引用源', 'warn');
      return;
    }
    setGenerating(true);
    setGenerated(false);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
      toast('草稿已生成 · 全部引用在你权限内', 'success');
    }, 1800);
  };

  const toggleCite = (id: string) => {
    setSelectedCiteIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAnnotate = (heading: string) => {
    toast(`批注「${heading}」已记录`, 'info');
  };

  // ECharts 引用源环形图
  const buildCiteDonut = () => {
    const data = citeDistData;
    if (!data.length) return { ...baseOption(), series: [] };
    const indigoBase = accent();
    const colors = [indigoBase, trust(), sem('restricted'), cssVar('--c2'), cssVar('--c3'), cssVar('--c5')];
    return {
      ...baseOption(),
      color: colors,
      tooltip: {
        ...(baseOption().tooltip as object),
        trigger: 'item',
        formatter: '{b}: {c} 条 ({d}%)',
      },
      legend: {
        orient: 'vertical',
        right: 0,
        top: 'center',
        textStyle: { fontSize: 11, color: cssVar('--text-2') },
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 8,
      },
      series: [
        {
          type: 'pie',
          radius: ['52%', '80%'],
          center: ['40%', '50%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 12, fontWeight: 600, color: cssVar('--text-1') },
          },
          data,
          itemStyle: { borderRadius: 4, borderColor: cssVar('--surface-1'), borderWidth: 2 },
        },
      ],
    };
  };

  // 本稿引用来源数量
  const totalCites = draftSections.reduce((acc, s) => acc + s.cites.length, 0);

  return (
    <div className="page">
      <PageHeader
        title="智库 Canvas"
        subtitle="基于你权限内的知识起草文档 · 每段引用可溯源，结论可追责"
        actions={
          <div className="row gap-2">
            <button className="btn btn-subtle btn-sm" onClick={() => toast('导出 Word 草稿', 'info')}>
              <Download size={13} /> 导出
            </button>
          </div>
        }
      />

      {/* 两栏布局：左控制 / 右 Canvas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: 14,
          alignItems: 'start',
        }}
      >

        {/* ── 左栏：起草控制 ─────────────────────────────────────────────── */}
        <div className="col gap-3">

          {/* 文档类型 */}
          <Card className="reveal">
            <SectionTitle>文档类型</SectionTitle>
            <Segmented
              options={DOC_TYPE_OPTIONS}
              value={docType}
              onChange={setDocType}
            />
          </Card>

          {/* Prompt 输入 */}
          <Card className="reveal reveal-1">
            <Field label="起草指令">
              <textarea
                className="input"
                style={{
                  minHeight: 92,
                  fontSize: 13,
                  lineHeight: 1.65,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="描述你需要起草的文档内容、重点关注点…"
              />
            </Field>
          </Card>

          {/* 引用源勾选列表 */}
          <Card className="reveal reveal-2">
            <SectionTitle right={
              <span className="t-small text-3 mononum">
                已选 {selectedCiteIds.length}/{FLAGSHIP_CITATIONS.length}
              </span>
            }>
              引用源
            </SectionTitle>
            <div className="col" style={{ gap: 1 }}>
              {visibleCitations.map(cite => {
                const checked = selectedCiteIds.includes(cite.id);
                return (
                  <button
                    key={cite.id}
                    className="row gap-2"
                    style={{
                      background: checked ? 'var(--gold-glow)' : 'transparent',
                      border: 'none',
                      borderRadius: 'var(--r-sm)',
                      padding: '9px 10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => toggleCite(cite.id)}
                  >
                    {checked
                      ? <CheckSquare size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                      : <Square size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                    }
                    <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>
                      <SourceIcon source={cite.source} size={13} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12, fontWeight: 600, color: 'var(--text-1)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {cite.docName}
                      </div>
                    </div>
                    <span
                      className="badge"
                      style={{
                        background: `color-mix(in srgb, ${levelTone(cite.level)} 13%, transparent)`,
                        color: levelTone(cite.level),
                        fontSize: 10,
                        flexShrink: 0,
                      }}
                    >
                      {LEVEL_LABEL[cite.level]}
                    </span>
                  </button>
                );
              })}

              {/* 超密级被锁条目 */}
              {lockedCitations.map(cite => (
                <div
                  key={cite.id}
                  className="row gap-2 locked"
                  style={{
                    padding: '9px 10px',
                    borderRadius: 'var(--r-sm)',
                    opacity: 0.45,
                    cursor: 'not-allowed',
                  }}
                >
                  <Lock size={13} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>
                    <SourceIcon source={cite.source} size={13} />
                  </span>
                  <div
                    style={{
                      fontSize: 12, color: 'var(--text-3)', flex: 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {cite.docName}
                  </div>
                  <span
                    className="lock-chip badge"
                    style={{
                      background: `color-mix(in srgb, var(--warning) 13%, transparent)`,
                      color: 'var(--warning)',
                      fontSize: 10,
                    }}
                  >
                    密级 {cite.level} · 锁
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* 引用源构成环形图 */}
          <Card className="reveal reveal-3">
            <SectionTitle right={
              <span className="t-small text-3">按来源统计</span>
            }>
              本稿引用构成
            </SectionTitle>
            {citeDistData.length > 0
              ? (
                <Chart
                  build={buildCiteDonut}
                  height={160}
                  deps={[selectedCiteIds.join(',')]}
                />
              )
              : (
                <div
                  style={{
                    height: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-3)',
                    fontSize: 12,
                  }}
                >
                  <Layers size={20} style={{ opacity: 0.3, marginRight: 8 }} />
                  请至少勾选一个引用源
                </div>
              )
            }
          </Card>

          {/* 生成按钮 */}
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 14 }}
            onClick={handleGenerate}
            disabled={generating}
          >
            <Wand2 size={15} />
            {generating ? '正在生成草稿…' : '生成草稿'}
          </button>
        </div>

        {/* ── 右栏：Canvas 成稿 ─────────────────────────────────────────────── */}
        <div className="col gap-3">

          {/* 工具条：版本 / 协作者 / 导出 */}
          <div
            className="row gap-2 reveal"
            style={{
              padding: '9px 14px',
              borderRadius: 'var(--r-md)',
              background: 'var(--surface-2)',
              border: '1px solid var(--hairline)',
              justifyContent: 'space-between',
            }}
          >
            <div className="row gap-3">
              <span className="row gap-1" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
                <History size={13} style={{ color: 'var(--gold)' }} />
                v1.2
              </span>
              <div
                className="row"
                style={{
                  borderLeft: '1px solid var(--hairline)',
                  paddingLeft: 12,
                  gap: 4,
                }}
              >
                <Users size={12} style={{ color: 'var(--text-3)', marginRight: 4 }} />
                {COLLABORATORS.map(col => (
                  <div
                    key={col.name}
                    title={col.name}
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: col.color,
                      color: '#fff', fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '2px solid var(--surface-1)',
                      marginLeft: -6,
                      cursor: 'default',
                    }}
                  >
                    {col.initials}
                  </div>
                ))}
                <span className="t-small text-3" style={{ marginLeft: 8 }}>3 人协作中</span>
              </div>
            </div>
            <div className="row gap-2">
              <Badge color="var(--emerald)">
                <ShieldCheck size={11} /> 权限内文档
              </Badge>
              <button
                className="btn btn-subtle btn-sm"
                onClick={() => toast('已复制为 Markdown', 'info')}
              >
                <Download size={12} /> 导出草稿
              </button>
            </div>
          </div>

          {/* Canvas 白纸卡（档案纸感） */}
          <Card
            className="reveal reveal-1"
            style={{
              background: 'var(--canvas-paper, var(--surface-1))',
              boxShadow: '0 2px 16px rgba(0,0,0,0.07), 0 0 0 1px var(--hairline)',
              padding: 0,
              overflow: 'hidden',
            }}
          >
            {/* 文档标题栏 */}
            <div
              style={{
                padding: '18px 24px 16px',
                borderBottom: '1px solid var(--hairline)',
                background: 'var(--surface-2)',
              }}
            >
              <div
                style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--text-3)',
                  marginBottom: 6,
                }}
              >
                {DOC_TYPE_OPTIONS.find(o => o.value === docType)?.label ?? '文档'} · 草稿
              </div>
              <div
                style={{
                  fontSize: 22, fontWeight: 700, color: 'var(--text-1)',
                  fontFamily: "'Georgia','Noto Serif SC',serif",
                  lineHeight: 1.3,
                }}
              >
                某城商行 · 金融客户尽调报告
              </div>
              <div
                className="row gap-3"
                style={{ marginTop: 8, color: 'var(--text-3)', fontSize: 12 }}
              >
                <span>起草人：沈知微</span>
                <span>·</span>
                <span>2026-06-18</span>
                <span>·</span>
                <span>引用 {FLAGSHIP_CITATIONS.length} 个来源</span>
              </div>
            </div>

            {/* 正文段落 */}
            <div style={{ padding: '24px 28px' }}>
              {generating && (
                <div className="col" style={{ gap: 28 }}>
                  {[3, 4, 3].map((lines, i) => (
                    <div key={i}>
                      <div style={{ height: 12, width: '40%', borderRadius: 6, background: 'var(--surface-3)', marginBottom: 12, animation: 'pulse 1.6s ease-in-out infinite' }} />
                      <SkeletonBlock lines={lines} />
                    </div>
                  ))}
                </div>
              )}

              {generated && !generating && draftSections.length === 0 && (
                <div
                  style={{
                    textAlign: 'center', padding: '48px 20px',
                    color: 'var(--text-3)', fontSize: 13,
                  }}
                >
                  <Layers size={36} style={{ opacity: 0.2, marginBottom: 12 }} />
                  <div>请在左侧勾选引用源后生成草稿</div>
                </div>
              )}

              {generated && !generating && draftSections.map((sec, idx) => {
                // 找到该段对应的 Citation 对象
                const secCites = sec.cites
                  .map(n => FLAGSHIP_CITATIONS.find(c => c.n === n))
                  .filter((c): c is Citation => c !== undefined && selectedCiteIds.includes(c.id));

                return (
                  <div
                    key={sec.id}
                    style={{
                      marginBottom: idx < draftSections.length - 1 ? 28 : 0,
                      paddingBottom: idx < draftSections.length - 1 ? 28 : 0,
                      borderBottom: idx < draftSections.length - 1 ? '1px solid var(--hairline)' : 'none',
                    }}
                  >
                    {/* 段落标题（sans 小标题）*/}
                    <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 10 }}>
                      <h3
                        style={{
                          fontSize: 14, fontWeight: 700, color: 'var(--text-1)',
                          fontFamily: "'Geist','PingFang SC',system-ui,sans-serif",
                          margin: 0,
                        }}
                      >
                        {sec.heading}
                      </h3>
                      {/* 批注按钮 */}
                      <button
                        className="icon-btn"
                        title="添加批注"
                        style={{ opacity: 0.45, marginLeft: 'auto' }}
                        onClick={() => handleAnnotate(sec.heading)}
                      >
                        <MessageSquareMore size={14} />
                      </button>
                    </div>

                    {/* 正文（衬线 t-answer）*/}
                    <p
                      className="t-answer"
                      style={{
                        margin: 0, lineHeight: 1.85,
                        color: 'var(--text-1)',
                      }}
                    >
                      {sec.body}
                      {/* 段末引用 chip */}
                      {secCites.map(cite => (
                        <span
                          key={cite.id}
                          style={{ position: 'relative', display: 'inline-block', marginLeft: 4 }}
                          onMouseEnter={() => setHoverCite(cite)}
                          onMouseLeave={() => setHoverCite(null)}
                        >
                          <span
                            className="cite-ref"
                            style={{
                              position: 'static',
                              display: 'inline-flex',
                              cursor: 'pointer',
                            }}
                          >
                            {cite.n}
                          </span>
                          {/* Hover 溯源卡 */}
                          {hoverCite?.id === cite.id && (
                            <span
                              style={{
                                position: 'absolute',
                                bottom: '130%',
                                left: -8,
                                zIndex: 50,
                              }}
                              onMouseEnter={() => setHoverCite(cite)}
                              onMouseLeave={() => setHoverCite(null)}
                            >
                              <CitationCard
                                cite={cite}
                                onJump={() => toast(`跳到《${cite.docName}》第 ${cite.paragraph} 段`, 'info')}
                              />
                            </span>
                          )}
                        </span>
                      ))}
                    </p>

                    {/* 来源 chip 行 */}
                    {secCites.length > 0 && (
                      <div className="row gap-2 wrap" style={{ marginTop: 10 }}>
                        {secCites.map(cite => (
                          <button
                            key={cite.id}
                            className="src-badge"
                            style={{ cursor: 'pointer', fontSize: 11 }}
                            title={cite.docName}
                            onClick={() => setActiveCitePopup(prev => prev === cite.id ? null : cite.id)}
                          >
                            <span style={{ color: 'var(--text-3)', marginRight: 4 }}>
                              <SourceIcon source={cite.source} size={11} />
                            </span>
                            {cite.docName.length > 14 ? cite.docName.slice(0, 14) + '…' : cite.docName}
                            <ChevronDown size={10} style={{ marginLeft: 2, opacity: 0.5 }} />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 展开的溯源卡（点 chip 触发）*/}
                    {secCites.map(cite =>
                      activeCitePopup === cite.id ? (
                        <div key={cite.id + '-expand'} style={{ marginTop: 10 }}>
                          <CitationCard
                            cite={cite}
                            onJump={() => {
                              setActiveCitePopup(null);
                              toast(`跳到《${cite.docName}》第 ${cite.paragraph} 段`, 'info');
                            }}
                          />
                        </div>
                      ) : null
                    )}
                  </div>
                );
              })}
            </div>

            {/* 信任条 */}
            {generated && !generating && draftSections.length > 0 && (
              <div
                style={{
                  padding: '13px 24px',
                  borderTop: '1px solid var(--hairline)',
                  background: 'var(--surface-2)',
                }}
              >
                <div className="row gap-3" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <TrustBar count={totalCites} inScope={100} />
                  <span className="t-small text-3 mononum">
                    本稿 {draftSections.length} 段 · {totalCites} 条引用 · 全部在你权限内（密级 ≤ {clearance}）可溯源
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* 角色权限感知提示 */}
          <div
            className="row gap-2 reveal reveal-2"
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--r-md)',
              background: 'var(--surface-2)',
              border: '1px solid var(--hairline)',
            }}
          >
            <ShieldCheck size={14} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
            <span className="t-small text-2">
              你正以{' '}
              <b style={{ color: currentRole?.color }}>
                {currentRole?.name}（密级 {clearance}）
              </b>{' '}
              起草 ——{' '}
              {lockedCitations.length > 0
                ? `左侧有 ${lockedCitations.length} 条来源超出你的密级已锁定，已过滤。`
                : '所有引用源均在你的权限内，草稿可安全导出。'
              }
              右上角切换角色可看到引用源列表和草稿段落实时变化。
            </span>
          </div>
        </div>
      </div>

      {/* 全局 pulse 动画 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </div>
  );
}
