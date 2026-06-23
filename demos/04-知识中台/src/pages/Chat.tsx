import { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Send, ThumbsDown, ShieldCheck, Lock, RefreshCw, ListChecks,
  Maximize2, Download, MessageSquareText, FileSearch, Gauge, Clock3, Cpu,
} from 'lucide-react';
import { Card } from '../components/ui';
import Chart from '../components/Chart';
import { AnswerBody, TrustBar, CitationCard, SourceIcon } from '../components/Citation';
import { toast } from '../components/kit';
import { baseOption, areaGradient, accent, trust, sem, cssVar, ANIM } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import { CHAT_TURNS, canAccess } from '../lib/mockData';
import { LEVEL_LABEL } from '../types';
import type { ChatTurn, Citation, ClearanceLevel } from '../types';

// ── 本页扩充：一条「受限演示」预设对话（含一条 level-3 受限 citation，给 member 看锁占位）──
const RESTRICTED_TURN: ChatTurn = {
  id: 't-restr', question: '城商行项目A 的不良资产展期情况如何？', at: '1 分钟前', confidence: 0.71,
  segments: [
    { text: '该项目零售信贷整体资产质量可控，公开口径下拨备覆盖率维持在监管要求之上', cites: [1] },
    { text: '。但单笔不良贷款的客户级明细与展期记录属于受限风控域，需更高权限方可调阅' },
    { text: '，已按权限策略为你隐去 1 条受限来源。' },
  ],
  citations: [
    { id: 'cr1', n: 1, docName: '某城商行项目A · 尽调备忘录', source: 'SharePoint', path: 'SharePoint / 项目A / 尽调备忘', author: '沈知微', updatedAt: '2026-06-10', level: 2, confidence: 0.84, snippet: '本项目尽调重点：零售信贷资产质量、拨备覆盖率、地方政府平台敞口。', paragraph: 2 },
    { id: 'cr2', n: 2, docName: '某城商行 · 不良资产明细', source: 'SharePoint', path: 'SharePoint / 受限 / 不良明细', author: '风控组', updatedAt: '2026-06-09', level: 3, confidence: 0.79, snippet: '（受限）单笔不良贷款客户级明细与展期记录。', paragraph: 1 },
  ],
};

// 追问 chip 触发后 append 的「换个角度」mock 回答（用于 chip 演示）
const ANGLE_TURN: ChatTurn = {
  id: 't-angle', question: '换个角度：从投决会的角度，尽调结论该怎么写？', at: '刚刚', confidence: 0.9,
  segments: [
    { text: '面向投决会，尽调结论应聚焦四要素：核心风险点、缓释措施、估值区间与关键假设敏感性', cites: [1] },
    { text: '。建议以"风险—缓释"对照表呈现，并标注每条结论的现金流与合规证据来源，便于委员快速质询。' },
  ],
  citations: [
    { id: 'ca1', n: 1, docName: '尽调结论模板（投决会用）', source: 'Notion', path: 'Notion / 投决 / 结论模板', author: '陆明远', updatedAt: '2026-05-20', level: 2, confidence: 0.91, snippet: '投决会尽调结论：核心风险点、缓释措施、估值区间、关键假设敏感性。', paragraph: 1 },
  ],
};

// 发送输入框后 0.8s 出现的带溯源 mock 答案
const SENT_TURN: ChatTurn = {
  id: 't-sent', question: '消金客户催收合规要核查哪些点？', at: '刚刚', confidence: 0.87,
  segments: [
    { text: '消费金融客户的催收合规核查应覆盖：催收资质与外包准入、催收话术与时段合规、个人信息保护与脱敏', cites: [1] },
    { text: '，并核验投诉处置闭环与双录留痕的完整性，警惕暴力催收与骚扰第三人风险。' },
  ],
  citations: [
    { id: 'cs1', n: 1, docName: '合规尽调：消金行业特别关注', source: 'Confluence', path: 'Confluence / 合规 / 消金尽调', author: '韩澈', updatedAt: '2026-03-30', level: 1, confidence: 0.9, snippet: '消金客户须核查放贷资质、利率合规、催收合规、双录留痕。', paragraph: 1 },
  ],
};

const levelTone = (l: ClearanceLevel) => (l >= 4 ? 'var(--danger)' : l === 3 ? 'var(--warning)' : l === 2 ? 'var(--info)' : 'var(--success)');

// 追问 chip 定义
const FOLLOWUPS = [
  { key: 'angle', label: '换个角度', icon: RefreshCw },
  { key: 'detail', label: '更详细', icon: FileSearch },
  { key: 'sources', label: '给我出处清单', icon: ListChecks },
  { key: 'export', label: '导出', icon: Download },
] as const;

export default function Chat() {
  const navigate = useNavigate();
  const { currentRole } = useAuth();
  const clearance = (currentRole?.clearance ?? 2) as ClearanceLevel;

  const [turns, setTurns] = useState<ChatTurn[]>([...CHAT_TURNS, RESTRICTED_TURN]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);       // 正在检索骨架
  const [activeCite, setActiveCite] = useState<string | null>(null); // 高亮的溯源卡 id
  const [down, setDown] = useState<Record<string, boolean>>({});      // 已点👎纠错回流的轮次
  const flowRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  // 自动滚到底（新答案/骨架出现时）
  useEffect(() => {
    const el = flowRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [turns.length, pending]);
  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  // 本轮所有 citations（去重）→ 右栏「本轮溯源」
  const allCites = useMemo(() => {
    const m = new Map<string, Citation>();
    turns.forEach(t => t.citations.forEach(c => { if (!m.has(c.id)) m.set(c.id, c); }));
    return [...m.values()];
  }, [turns]);
  const inScopeCites = allCites.filter(c => canAccess(clearance, c.level));
  const inScopePct = allCites.length ? Math.round((inScopeCites.length / allCites.length) * 100) : 100;

  // 全局置信度（最后一轮，没有则均值）
  const lastTurn = turns[turns.length - 1];
  const avgConfidence = lastTurn ? lastTurn.confidence : 0.9;

  // 引用来源「更新时间」时间线 sparkline（按月-日排序的引用密度）
  const timeline = useMemo(() => {
    const counts = new Map<string, number>();
    allCites.forEach(c => counts.set(c.updatedAt, (counts.get(c.updatedAt) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [allCites]);

  const onActivate = (n: number) => {
    // hover/点 [n] → 在右栏高亮对应溯源卡（按编号在所有 citations 中找最近匹配）
    const hit = allCites.find(c => c.n === n);
    if (hit) setActiveCite(hit.id);
  };
  const onJump = (c: Citation) => {
    if (!canAccess(clearance, c.level)) { toast(`「${c.docName}」属受限来源，当前权限不可调阅`, 'warn'); return; }
    setActiveCite(c.id);
    toast(`已定位「${c.docName}」第 ${c.paragraph} 段`, 'info');
  };

  const appendTurn = (t: ChatTurn) => setTurns(prev => [...prev, t]);

  // 追问 chip
  const onFollowup = (key: string, turn: ChatTurn) => {
    if (key === 'angle') { toast('已从新角度重新检索', 'info'); appendTurn(ANGLE_TURN); return; }
    if (key === 'detail') { toast('已展开更详细的溯源段落', 'success'); return; }
    if (key === 'sources') {
      toast(`本轮共 ${turn.citations.length} 个来源，已生成出处清单`, 'success');
      return;
    }
    if (key === 'export') { toast('答案 + 溯源已导出为 PDF（演示）', 'success'); return; }
  };

  // 发送
  const onSend = () => {
    const q = draft.trim();
    if (!q || pending) return;
    setDraft('');
    setPending(true);
    timerRef.current = window.setTimeout(() => {
      setPending(false);
      appendTurn({ ...SENT_TURN, question: q, at: '刚刚' });
    }, 800);
  };

  // 纠错回流 👎
  const onThumbDown = (turn: ChatTurn) => {
    if (down[turn.id]) return;
    setDown(prev => ({ ...prev, [turn.id]: true }));
    toast('纠错已回流 → 已送知识管理员复核', 'warn');
  };

  return (
    <div className="page" style={{ paddingTop: 18 }}>
      <div
        className="grid grid-cols-auto"
        style={{ gridTemplateColumns: '1fr 348px', gap: 16, alignItems: 'start' }}
      >
        {/* ════ 左：对话流 + 输入框 ════ */}
        <div className="col" style={{ minWidth: 0, gap: 0 }}>
          {/* 对话标题条 */}
          <div className="spread" style={{ marginBottom: 12 }}>
            <div className="row gap-2 wrap">
              <span className="badge" style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }}>
                <Sparkles size={12} /> AI 助手
              </span>
              <span className="tag tag-mono row gap-1" title="当前推理模型">
                <Cpu size={11} style={{ color: 'var(--gold)' }} /> gpt-4o
              </span>
              <span className="t-small text-3">金融尽调 · 多轮 RAG · 逐句可溯源</span>
            </div>
            <span className="row gap-1 t-small text-3">
              <ShieldCheck size={13} style={{ color: 'var(--emerald)' }} />
              以 <b style={{ color: currentRole?.color }}>{currentRole?.name}（密级 {clearance}）</b> 提问
            </span>
          </div>

          {/* 对话流滚动区 */}
          <div
            ref={flowRef}
            className="col"
            style={{ gap: 18, maxHeight: 'calc(100vh - 232px)', overflowY: 'auto', paddingRight: 6, paddingBottom: 4 }}
          >
            {turns.map((turn, ti) => {
              const isLast = ti === turns.length - 1 && !pending;
              const restrictedCount = turn.citations.filter(c => !canAccess(clearance, c.level)).length;
              return (
                <div key={turn.id} className="col reveal" style={{ gap: 10 }}>
                  {/* 用户提问气泡（右对齐）*/}
                  <div className="row" style={{ justifyContent: 'flex-end' }}>
                    <div
                      style={{
                        maxWidth: '78%', padding: '10px 14px', borderRadius: '14px 14px 4px 14px',
                        background: 'var(--gold)', color: 'var(--accent-ink)', fontSize: 14, fontWeight: 500,
                        lineHeight: 1.5, boxShadow: '0 4px 16px var(--gold-glow)',
                      }}
                    >
                      {turn.question}
                    </div>
                  </div>

                  {/* AI 答案卡 */}
                  <Card style={{ padding: 16 }}>
                    <div className="row gap-2" style={{ marginBottom: 10 }}>
                      <span
                        className="avatar"
                        style={{ width: 26, height: 26, fontSize: 12, borderRadius: 8 }}
                      >智</span>
                      <span className="label">智库 · 答案</span>
                      <span className="mononum t-small text-3" style={{ marginLeft: 'auto' }}>
                        置信 {(turn.confidence * 100).toFixed(0)}% · {turn.at}
                      </span>
                    </div>

                    {/* 衬线答案正文 + 句末 [n] 角标 */}
                    <AnswerBody turn={turn} onActivate={onActivate} onJump={onJump} />

                    {/* 受限提示（若本轮有不可见来源）*/}
                    {restrictedCount > 0 && (
                      <div className="filter-banner" style={{ marginTop: 12 }}>
                        <Lock size={14} />
                        <span>本轮含 <b className="mononum">{restrictedCount}</b> 条受限来源（密级 &gt; {clearance}），已按权限隐去</span>
                      </div>
                    )}

                    {/* 信任条 */}
                    <div style={{ marginTop: 12 }}>
                      <TrustBar
                        count={turn.citations.filter(c => canAccess(clearance, c.level)).length}
                        inScope={100}
                      />
                    </div>

                    {/* 引用来源徽标行（hover 联动右栏）*/}
                    <div className="row gap-2 wrap" style={{ marginTop: 12 }}>
                      {turn.citations.map(c => {
                        const locked = !canAccess(clearance, c.level);
                        return (
                          <button
                            key={c.id}
                            className={`src-badge ${locked ? 'locked' : ''}`}
                            style={{ cursor: 'pointer', borderColor: activeCite === c.id ? 'var(--gold)' : undefined }}
                            onMouseEnter={() => !locked && setActiveCite(c.id)}
                            onClick={() => onJump(c)}
                            title={locked ? '受限来源 · 当前权限不可调阅' : c.path}
                          >
                            {locked ? <Lock size={11} /> : <span className="cite-ref" style={{ position: 'static', minWidth: 14, height: 14 }}>{c.n}</span>}
                            {c.docName}
                          </button>
                        );
                      })}
                    </div>

                    {/* 追问 chip 排（仅最后一轮）+ 👎 纠错 */}
                    <div
                      className="row gap-2 wrap"
                      style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--hairline)' }}
                    >
                      {isLast && FOLLOWUPS.map(f => {
                        const Icon = f.icon;
                        return (
                          <button
                            key={f.key}
                            className="btn btn-subtle btn-sm"
                            onClick={() => onFollowup(f.key, turn)}
                          >
                            <Icon size={12} /> {f.label}
                          </button>
                        );
                      })}
                      <button
                        className="btn btn-sm"
                        style={{
                          marginLeft: 'auto', background: 'transparent', border: '1px solid var(--hairline)',
                          color: down[turn.id] ? 'var(--danger)' : 'var(--text-3)',
                        }}
                        onClick={() => onThumbDown(turn)}
                        title="答案不准确？纠错回流给知识管理员"
                      >
                        <ThumbsDown size={12} /> {down[turn.id] ? '已纠错' : '纠错'}
                      </button>
                    </div>
                  </Card>
                </div>
              );
            })}

            {/* 正在检索…骨架 */}
            {pending && (
              <div className="col reveal" style={{ gap: 10 }}>
                <Card style={{ padding: 16 }}>
                  <div className="row gap-2" style={{ marginBottom: 12 }}>
                    <span className="dot-pulse" />
                    <span className="t-small text-2">正在检索授权知识源并生成溯源答案…</span>
                  </div>
                  <div className="col" style={{ gap: 8 }}>
                    <div className="skeleton" style={{ height: 13, width: '94%' }} />
                    <div className="skeleton" style={{ height: 13, width: '88%' }} />
                    <div className="skeleton" style={{ height: 13, width: '72%' }} />
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* ════ 输入框 ════ */}
          <div
            className="row gap-2"
            style={{
              marginTop: 14, padding: '8px 8px 8px 14px', borderRadius: 'var(--r-lg)',
              background: 'var(--surface-1)', border: '1px solid var(--hairline-strong)',
              boxShadow: 'var(--elev-1)',
            }}
          >
            <MessageSquareText size={18} style={{ color: 'var(--gold)', flexShrink: 0 }} />
            <input
              className="input"
              style={{ border: 'none', background: 'transparent', boxShadow: 'none', fontSize: 14, padding: '10px 0' }}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
              placeholder="追问尽调方法论、现金流口径、合规要点…（答案逐句溯源）"
              disabled={pending}
            />
            <button
              className="btn btn-primary"
              style={{ flexShrink: 0 }}
              onClick={onSend}
              disabled={pending || !draft.trim()}
            >
              {pending ? <span className="spinner" /> : <Send size={14} />} 发送
            </button>
          </div>
        </div>

        {/* ════ 右：本轮情报栏 ════ */}
        <div className="col" style={{ gap: 14, position: 'sticky', top: 18 }}>
          {/* 置信度 gauge（真 ECharts）*/}
          <Card>
            <div className="spread" style={{ marginBottom: 6 }}>
              <span className="label"><span className="row gap-2"><Gauge size={13} /> 答案置信度</span></span>
              <span className="t-small text-3">最近一轮</span>
            </div>
            <Chart
              height={172}
              deps={[avgConfidence]}
              build={() => {
                const a = accent();
                const g = trust();
                const w = sem('restricted');
                return {
                  ...baseOption(),
                  tooltip: { show: false },
                  series: [{
                    type: 'gauge', radius: '100%', center: ['50%', '76%'],
                    startAngle: 200, endAngle: -20, min: 0, max: 1, splitNumber: 5,
                    progress: { show: true, width: 13, roundCap: true, itemStyle: { color: a } },
                    axisLine: {
                      lineStyle: {
                        width: 13, color: [[0.6, w], [0.8, cssVar('--c7')], [1, g]],
                      },
                    },
                    pointer: { length: '58%', width: 4, itemStyle: { color: a } },
                    anchor: { show: true, size: 8, itemStyle: { color: a } },
                    axisTick: { distance: -18, length: 5, lineStyle: { color: cssVar('--text-3'), width: 1 } },
                    splitLine: { distance: -20, length: 10, lineStyle: { color: cssVar('--text-3'), width: 1.4 } },
                    axisLabel: {
                      distance: -8, fontSize: 9, color: cssVar('--text-3'),
                      formatter: (v: number) => (v === 0 || v === 1 ? `${(v * 100).toFixed(0)}` : ''),
                    },
                    title: { show: false },
                    detail: {
                      valueAnimation: true, offsetCenter: [0, '-6%'],
                      fontSize: 30, fontWeight: 700, fontFamily: cssVar('--font-mono') || 'monospace',
                      color: cssVar('--text-1'),
                      formatter: (v: number) => `${(v * 100).toFixed(0)}%`,
                    },
                    data: [{ value: avgConfidence }],
                    ...ANIM,
                  }],
                };
              }}
            />
            <div className="row gap-3 wrap" style={{ justifyContent: 'center', marginTop: -8 }}>
              <span className="row gap-1 t-small text-3"><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--success)' }} />高可信</span>
              <span className="row gap-1 t-small text-3"><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--c7)' }} />可参考</span>
              <span className="row gap-1 t-small text-3"><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--warning)' }} />需核实</span>
            </div>
          </Card>

          {/* 本轮溯源 + 权限内比例 */}
          <Card style={{ padding: 0 }}>
            <div className="spread" style={{ padding: '12px 14px', borderBottom: '1px solid var(--hairline)' }}>
              <span className="label"><span className="row gap-2"><ListChecks size={13} /> 本轮溯源 · {allCites.length}</span></span>
              <button className="btn btn-subtle btn-sm" onClick={() => navigate('/graph')}>
                <Maximize2 size={12} /> 图谱
              </button>
            </div>

            {/* 权限内比例条 + 时间线 sparkline */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--hairline)' }}>
              <div className="spread" style={{ marginBottom: 7 }}>
                <span className="t-small text-2 row gap-1"><ShieldCheck size={12} style={{ color: 'var(--emerald)' }} /> 权限内来源</span>
                <span className="mononum t-small" style={{ color: 'var(--emerald-deep)', fontWeight: 600 }}>
                  {inScopeCites.length}/{allCites.length} · {inScopePct}%
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${inScopePct}%`, background: 'var(--emerald)', borderRadius: 3, transition: 'width 0.7s var(--ease)' }} />
              </div>
              {timeline.length > 1 && (
                <div style={{ marginTop: 10 }}>
                  <div className="row gap-1" style={{ marginBottom: 2 }}>
                    <Clock3 size={11} style={{ color: 'var(--text-3)' }} />
                    <span className="t-small text-3" style={{ fontSize: 11 }}>引用来源更新分布 · 溯源新鲜度</span>
                  </div>
                  {/* ECharts ②：引用来源更新时间线 sparkline（真 ECharts 面积线）*/}
                  <Chart
                    height={56}
                    deps={[timeline.map(t => t[0] + t[1]).join(',')]}
                    build={() => {
                      const a = accent();
                      return {
                        ...baseOption(),
                        grid: { left: 2, right: 4, top: 8, bottom: 2, containLabel: false },
                        tooltip: {
                          ...(baseOption().tooltip as object),
                          trigger: 'axis',
                          formatter: (p: { name: string; value: number }[]) =>
                            `${p[0].name}<br/><b>${p[0].value}</b> 条来源更新`,
                        },
                        xAxis: {
                          type: 'category', boundaryGap: false,
                          data: timeline.map(t => t[0]),
                          show: false,
                        },
                        yAxis: { type: 'value', show: false, min: 0 },
                        series: [{
                          type: 'line', smooth: 0.4, symbol: 'circle', symbolSize: 5,
                          showSymbol: false,
                          data: timeline.map(t => t[1]),
                          lineStyle: { color: a, width: 2 },
                          itemStyle: { color: a, borderColor: cssVar('--surface-1'), borderWidth: 1.5 },
                          areaStyle: { color: areaGradient(a, 0.3) },
                          emphasis: { focus: 'series' },
                          ...ANIM,
                        }],
                      };
                    }}
                  />
                </div>
              )}
            </div>

            {/* 溯源卡缩略列表 */}
            <div className="col" style={{ gap: 10, padding: 12, maxHeight: '46vh', overflowY: 'auto' }}>
              {allCites.map(c => {
                const locked = !canAccess(clearance, c.level);
                if (locked) {
                  return (
                    <div
                      key={c.id}
                      className="locked"
                      style={{
                        border: '1px dashed color-mix(in srgb, var(--warning) 40%, transparent)',
                        borderRadius: 'var(--r-md)', padding: 12, background: 'color-mix(in srgb, var(--warning) 6%, var(--surface-1))',
                      }}
                    >
                      <div className="row gap-2">
                        <div className="cite-thumb" style={{ width: 32, height: 32 }}><Lock size={15} /></div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="row gap-2">
                            <span className="lock-chip"><Lock size={10} /> 受限来源</span>
                            <span className="badge" style={{ background: `color-mix(in srgb, ${levelTone(c.level)} 14%, transparent)`, color: levelTone(c.level) }}>密级 {c.level} · {LEVEL_LABEL[c.level]}</span>
                          </div>
                          <div className="t-small text-3" style={{ marginTop: 4 }}>来源 {c.source} · 需更高权限调阅</div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={c.id}
                    onMouseEnter={() => setActiveCite(c.id)}
                    style={{
                      borderRadius: 'var(--r-md)',
                      outline: activeCite === c.id ? '2px solid var(--gold)' : '2px solid transparent',
                      outlineOffset: 1, transition: 'outline-color 0.2s var(--ease)',
                    }}
                  >
                    <CitationCard cite={c} onJump={onJump} />
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 来源类型分布微列表 */}
          <Card>
            <span className="label" style={{ display: 'block', marginBottom: 10 }}>本轮来源类型</span>
            <div className="col" style={{ gap: 8 }}>
              {Object.entries(
                allCites.reduce<Record<string, number>>((acc, c) => { acc[c.source] = (acc[c.source] ?? 0) + 1; return acc; }, {})
              )
                .sort((a, b) => b[1] - a[1])
                .map(([src, n]) => (
                  <div key={src} className="spread">
                    <span className="row gap-2 t-small text-2">
                      <span style={{ color: 'var(--text-3)' }}><SourceIcon source={src as never} size={14} /></span>
                      {src}
                    </span>
                    <span className="mononum t-small text-3">{n}</span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
