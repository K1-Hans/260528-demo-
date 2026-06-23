import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Waypoints, AlertTriangle, Timer, DollarSign, Activity, ArrowRight,
  PlusCircle, Search, Filter, BarChart3, Lock, GitCompareArrows, ChevronRight,
} from 'lucide-react';
import { PageHeader, StatCard, Card, SectionTitle, Segmented, EmptyState } from '../components/ui';
import { StatusBadge, toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, cost, sem, areaGradient, cssVar } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import { TRACES, LATENCY_HISTO, LATENCY_MARKS, appName } from '../lib/mockData';
import type { TraceRecord, Span, SpanKind, TraceStatus } from '../types';

// ── span kind → 颜色 token / 中文标签（贴契约：retrieve 蓝 / prompt 紫 / llm 金 / tool 青 / parse 灰 / guard 红）──
const KIND_VAR: Record<SpanKind, string> = {
  retrieve: '--c2', prompt: '--c5', llm: '--gold', tool: '--c6', parse: '--c8', guard: '--danger',
};
const KIND_LABEL: Record<SpanKind, string> = {
  retrieve: '检索', prompt: '组装', llm: 'LLM', tool: '工具', parse: '解析', guard: '护栏',
};
const STATUS_TONE: Record<TraceStatus, 'good' | 'warn' | 'bad'> = { ok: 'good', slow: 'warn', error: 'bad' };
const STATUS_LABEL: Record<TraceStatus, string> = { ok: 'ok', slow: 'slow', error: 'error' };

type StatusFilter = 'all' | 'error' | 'slow';
type SortKey = 'latency' | 'cost';

const fmtUsd = (n: number) => '$' + n.toFixed(4);

export default function Tracing() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('tracing:write');

  const [selectedId, setSelectedId] = useState<string>(TRACES[0].id); // 默认选中 v4 慢链路故事 trace
  const [activeSpan, setActiveSpan] = useState<number>(3);            // 默认点亮 LLM #1（guard 失败那跳）
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('latency');

  // ── 顶部 KPI：从 TRACES 聚合 ──
  const agg = useMemo(() => {
    const n = TRACES.length;
    const errs = TRACES.filter(t => t.status === 'error').length;
    const lat = [...TRACES.map(t => t.latencyMs)].sort((a, b) => a - b);
    const p95 = lat[Math.min(lat.length - 1, Math.floor(lat.length * 0.95))];
    const avgCost = TRACES.reduce((s, t) => s + t.costUsd, 0) / n;
    return { n, errRate: (errs / n) * 100, p95, avgCost };
  }, []);

  // ── 左列列表：筛选 + 排序 ──
  const rows = useMemo(() => {
    let r = TRACES;
    if (statusFilter !== 'all') r = r.filter(t => t.status === statusFilter);
    return [...r].sort((a, b) => (sortKey === 'latency' ? b.latencyMs - a.latencyMs : b.costUsd - a.costUsd));
  }, [statusFilter, sortKey]);

  const selected = TRACES.find(t => t.id === selectedId) ?? null;
  const span = selected && activeSpan < selected.spans.length ? selected.spans[activeSpan] : undefined;
  const isStory = selected?.id === TRACES[0].id;

  const selectTrace = (t: TraceRecord) => {
    setSelectedId(t.id);
    const crit = t.spans.findIndex(s => s.status === 'error');
    setActiveSpan(crit >= 0 ? crit : t.spans.findIndex(s => s.critical) >= 0 ? t.spans.findIndex(s => s.critical) : 0);
  };

  return (
    <div className="page">
      <PageHeader
        title="调用链 Tracing"
        subtitle="一条请求全链路展开 — 检索 · 组装 · LLM · 护栏 · 解析，逐跳定位慢 / 贵 / 错在哪一步"
        actions={<span className="live-pill"><span className="live-dot" />近 1h · 实时摄取</span>}
      />

      {/* ── KPI 条 ── */}
      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 14 }}>
        <StatCard label="采样 trace 数" raw={agg.n} icon={<Waypoints size={15} />} delayClass="reveal-1" />
        <StatCard label="错误率" raw={+agg.errRate.toFixed(1)} unit="%" decimals={1} change={1.4} icon={<AlertTriangle size={15} />} accentVar="var(--gold)" invertTrend delayClass="reveal-2" />
        <StatCard label="p95 延迟" raw={agg.p95} unit="ms" change={7.5} icon={<Timer size={15} />} invertTrend delayClass="reveal-3" />
        <StatCard label="平均 cost / trace" raw={agg.avgCost} unit="$" decimals={4} change={5.1} icon={<DollarSign size={15} />} accentVar="var(--cost)" invertTrend delayClass="reveal-4" />
      </div>

      {/* ── 主区：左 trace 列表 / 右 瀑布详情（选中联动）── */}
      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: '0.92fr 1.3fr', gap: 14, marginTop: 14, alignItems: 'start' }}>
        {/* ───────── 左列：trace 列表 ───────── */}
        <Card className="reveal reveal-2" style={{ minWidth: 0, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 16px 10px' }}>
            <SectionTitle right={
              <Segmented<SortKey>
                options={[{ value: 'latency', label: '按延迟' }, { value: 'cost', label: '按成本' }]}
                value={sortKey} onChange={setSortKey}
              />
            }>
              <span className="row gap-2"><Search size={13} /> 调用链列表</span>
            </SectionTitle>
            <div className="row gap-2 wrap" style={{ marginTop: 2 }}>
              <span className="row gap-1 t-small text-3"><Filter size={11} /> 状态</span>
              <Segmented<StatusFilter>
                options={[
                  { value: 'all', label: `全部 ${TRACES.length}` },
                  { value: 'error', label: '错误' },
                  { value: 'slow', label: '慢' },
                ]}
                value={statusFilter} onChange={setStatusFilter}
              />
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState icon={<Search size={32} />} title="无匹配 trace" desc="当前筛选条件下没有调用链，换个状态筛选看看。" />
          ) : (
            <div style={{ maxHeight: 560, overflowY: 'auto', borderTop: '1px solid var(--hairline)' }}>
              {rows.map(t => {
                const on = t.id === selectedId;
                return (
                  <button
                    key={t.id}
                    onClick={() => selectTrace(t)}
                    className="trace-row"
                    style={{
                      width: '100%', textAlign: 'left', display: 'block', cursor: 'pointer',
                      padding: '12px 16px', borderBottom: '1px solid var(--hairline)',
                      background: on ? 'color-mix(in srgb, var(--gold) 9%, var(--surface-2))' : 'transparent',
                      borderLeft: `2px solid ${on ? 'var(--gold)' : 'transparent'}`,
                      transition: 'background var(--dur-micro) var(--ease)',
                    }}
                  >
                    <div className="spread" style={{ alignItems: 'center', gap: 8 }}>
                      <span className="tag tag-mono" style={{ background: on ? 'var(--surface-1)' : 'var(--surface-2)' }}>{t.traceId}</span>
                      <StatusBadge status={STATUS_LABEL[t.status]} tone={STATUS_TONE[t.status]} />
                    </div>
                    <div className="row gap-2 wrap" style={{ marginTop: 7, fontSize: 12, color: 'var(--text-3)' }}>
                      <span style={{ color: 'var(--text-2)' }}>{appName(t.app)}</span>
                      <span className="tag tag-mono">{t.model}</span>
                      <span className="tag tag-mono" style={{ color: t.promptVersion === 'v4' ? 'var(--cost)' : 'var(--text-3)' }}>{t.promptVersion}</span>
                    </div>
                    <div className="row" style={{ marginTop: 8, gap: 14, fontSize: 12 }}>
                      <span className="col" style={{ gap: 1 }}>
                        <span className="text-3" style={{ fontSize: 10 }}>延迟</span>
                        <span className="mononum" style={{ color: t.latencyMs > 2600 ? 'var(--warning)' : 'var(--text-1)', fontWeight: 600 }}>{t.latencyMs.toLocaleString()}<span className="text-3" style={{ fontSize: 10 }}>ms</span></span>
                      </span>
                      <span className="col" style={{ gap: 1 }}>
                        <span className="text-3" style={{ fontSize: 10 }}>tokens</span>
                        <span className="mononum text-2">{(t.tokensIn + t.tokensOut).toLocaleString()}</span>
                      </span>
                      <span className="col" style={{ gap: 1, marginLeft: 'auto', textAlign: 'right' }}>
                        <span className="text-3" style={{ fontSize: 10 }}>cost</span>
                        <span className="mononum" style={{ color: 'var(--cost)', fontWeight: 600 }}>{fmtUsd(t.costUsd)}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* ───────── 右列：选中 trace 详情 ───────── */}
        <div className="col gap-3" style={{ minWidth: 0 }}>
          {!selected ? (
            <Card className="reveal reveal-3"><EmptyState icon={<Waypoints size={34} />} title="选择一条 trace" desc="从左侧列表点选调用链，这里展开它的全链路瀑布。" /></Card>
          ) : (
            <>
              {/* 详情顶部信息条 */}
              <Card className="reveal reveal-3" style={{ minWidth: 0 }}>
                <div className="spread wrap" style={{ gap: 10, alignItems: 'flex-start' }}>
                  <div className="col" style={{ gap: 6, minWidth: 0 }}>
                    <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
                      <Waypoints size={15} style={{ color: 'var(--gold)' }} />
                      <span className="tag tag-mono" style={{ fontSize: 12 }}>trace {selected.traceId}</span>
                      <StatusBadge status={STATUS_LABEL[selected.status]} tone={STATUS_TONE[selected.status]} />
                    </div>
                    <div className="row gap-2 wrap t-small text-3">
                      <span style={{ color: 'var(--text-2)' }}>{appName(selected.app)}</span>·
                      <span className="tag tag-mono">{selected.model}</span>
                      <span className="tag tag-mono">{selected.endpoint}</span>
                      <span>· {selected.time}</span>
                    </div>
                  </div>
                  <button
                    className={`btn btn-sm ${canWrite ? 'btn-subtle' : ''}`}
                    disabled={!canWrite}
                    title={canWrite ? '把这条 trace 加入客服 QA 黄金集' : '需要「调用链标注」权限（tracing:write）'}
                    onClick={() => canWrite && toast('已加入 客服 QA 黄金集', 'success')}
                    style={{ flexShrink: 0 }}
                  >
                    {canWrite ? <PlusCircle size={13} /> : <Lock size={13} />} 加入测试集
                  </button>
                </div>

                {/* 关键读数 */}
                <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 14 }}>
                  {[
                    { k: '总延迟', v: selected.latencyMs.toLocaleString() + 'ms', tone: selected.status === 'ok' ? 'var(--text-1)' : 'var(--warning)' },
                    { k: '输入 tokens', v: selected.tokensIn.toLocaleString(), tone: 'var(--text-1)' },
                    { k: '输出 tokens', v: selected.tokensOut.toLocaleString(), tone: 'var(--text-1)' },
                    { k: '成本', v: fmtUsd(selected.costUsd), tone: 'var(--cost)' },
                  ].map(s => (
                    <div key={s.k} style={{ padding: '9px 11px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
                      <div className="text-3" style={{ fontSize: 10, marginBottom: 3 }}>{s.k}</div>
                      <div className="mononum" style={{ fontSize: 15, fontWeight: 600, color: s.tone }}>{s.v}</div>
                    </div>
                  ))}
                </div>

                {/* 故事联动：v4 慢链路根因卡 */}
                {isStory && (
                  <div className="row gap-2 wrap" style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'color-mix(in srgb, var(--danger) 8%, var(--surface-2))', border: '1px solid color-mix(in srgb, var(--danger) 28%, transparent)' }}>
                    <AlertTriangle size={14} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
                    <span className="t-small flex-1" style={{ color: 'var(--text-2)', minWidth: 0 }}>
                      <b style={{ color: 'var(--text-1)' }}>v4 删除忠实度约束</b> → 输出不引用检索内容 → 忠实度 guard 判定失败触发重试 → <b className="mononum" style={{ color: 'var(--danger)' }}>token 与延迟双双翻倍</b>。
                    </span>
                    <button className="btn btn-subtle btn-sm" style={{ flexShrink: 0 }} onClick={() => navigate('/prompts')}>
                      <GitCompareArrows size={13} /> 去 Prompt 版本库看 diff <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </Card>

              {/* 瀑布图 */}
              <Card className="reveal reveal-4" style={{ minWidth: 0 }}>
                <SectionTitle right={
                  <div className="row gap-2 wrap" style={{ justifyContent: 'flex-end' }}>
                    {(['retrieve', 'prompt', 'llm', 'tool', 'parse', 'guard'] as SpanKind[]).map(k => (
                      <span key={k} className="row gap-1 t-small text-3" style={{ fontSize: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: `var(${KIND_VAR[k]})` }} />{KIND_LABEL[k]}
                      </span>
                    ))}
                  </div>
                }>
                  <span className="row gap-2"><Activity size={13} /> 调用链瀑布 · 逐跳耗时</span>
                </SectionTitle>
                <Chart
                  height={Math.max(170, selected.spans.length * 34 + 30)}
                  deps={[selected.id]}
                  build={() => waterfallOption(selected.spans, activeSpan)}
                />
                <div className="t-small text-3" style={{ marginTop: 4 }}>
                  金描边 = 关键路径 · 红描边 = 该跳失败。点下方任意 span 查看原文与 OTel 属性。
                </div>
              </Card>

              {/* span 详情：可点列表 + 原文 + OTel 属性 */}
              <Card className="reveal reveal-5" style={{ minWidth: 0 }}>
                <SectionTitle><span className="row gap-2"><ChevronRight size={13} /> Span 详情</span></SectionTitle>
                {/* span 选择条 */}
                <div className="row gap-2 wrap" style={{ marginBottom: 12 }}>
                  {selected.spans.map((s, i) => {
                    const on = i === activeSpan;
                    const c = `var(${KIND_VAR[s.kind]})`;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setActiveSpan(i)}
                        className="btn btn-sm"
                        style={{
                          background: on ? `color-mix(in srgb, ${c} 16%, transparent)` : 'var(--surface-2)',
                          color: on ? c : 'var(--text-3)',
                          border: `1px solid ${on ? `color-mix(in srgb, ${c} 42%, transparent)` : 'var(--hairline)'}`,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block', marginRight: 5 }} />
                        {s.name}
                        {s.status === 'error' && <span style={{ color: 'var(--danger)', marginLeft: 5 }}>●</span>}
                      </button>
                    );
                  })}
                </div>

                {span ? (
                  <div className="col gap-3">
                    {/* span 读数行 */}
                    <div className="row gap-2 wrap" style={{ alignItems: 'center' }}>
                      <StatusBadge status={`${KIND_LABEL[span.kind]} · ${STATUS_LABEL[span.status]}`} tone={STATUS_TONE[span.status]} />
                      <span className="statpill">耗时 <b className="mononum">{span.durMs}ms</b></span>
                      <span className="statpill">起点 <b className="mononum">+{span.startMs}ms</b></span>
                      {span.tokensOut !== undefined && <span className="statpill">tokens <b className="mononum">{(span.tokensIn ?? 0).toLocaleString()}/{span.tokensOut.toLocaleString()}</b></span>}
                      {span.costUsd !== undefined && <span className="statpill cost">cost <b className="mononum" style={{ color: 'var(--cost)' }}>{fmtUsd(span.costUsd)}</b></span>}
                      {span.critical && <span className="tag" style={{ color: 'var(--gold)', borderColor: 'color-mix(in srgb, var(--gold) 36%, transparent)' }}>关键路径</span>}
                    </div>

                    {/* 原文片段 */}
                    {span.detail && (
                      <div>
                        <div className="text-3" style={{ fontSize: 10, marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>原文片段 · prompt / completion</div>
                        <div style={{
                          padding: '11px 13px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--hairline)',
                          borderLeft: `3px solid var(${KIND_VAR[span.kind]})`,
                          fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.65, color: 'var(--text-2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                          {span.detail}
                        </div>
                      </div>
                    )}

                    {/* OTel 属性 */}
                    {span.attrs && Object.keys(span.attrs).length > 0 && (
                      <div>
                        <div className="text-3" style={{ fontSize: 10, marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>OpenTelemetry 属性 · gen_ai.*</div>
                        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
                          {Object.entries(span.attrs).map(([k, v]) => (
                            <div key={k} style={{ padding: '7px 10px', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
                              <div className="text-3" style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, marginBottom: 2, wordBreak: 'break-all' }}>{k}</div>
                              <div className="mononum" style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 600 }}>{v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!span.detail && !span.attrs && (
                      <div className="t-small text-3" style={{ padding: '8px 0' }}>该 span 无原文片段与扩展属性（纯耗时跳）。</div>
                    )}
                  </div>
                ) : (
                  <EmptyState icon={<ChevronRight size={28} />} title="选择一个 span" desc="点上方任意一跳查看详情。" />
                )}
              </Card>
            </>
          )}
        </div>
      </div>

      {/* ── 底部：latency 分布直方 ── */}
      <Card className="reveal reveal-6" style={{ marginTop: 14 }}>
        <SectionTitle right={
          <div className="row gap-2 wrap">
            <span className="statpill">p50 <b className="mononum">{LATENCY_MARKS.p50}ms</b></span>
            <span className="statpill">p95 <b className="mononum" style={{ color: 'var(--warning)' }}>{LATENCY_MARKS.p95}ms</b></span>
            <span className="statpill">p99 <b className="mononum" style={{ color: 'var(--danger)' }}>{LATENCY_MARKS.p99}ms</b></span>
          </div>
        }>
          <span className="row gap-2"><BarChart3 size={13} /> 延迟分布直方 · 近 1h（叠加 p50 / p95 / p99）</span>
        </SectionTitle>
        <Chart height={240} build={() => histoOption()} />
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ECharts builders
// ════════════════════════════════════════════════════════════════════════════

// 瀑布：透明占位 bar 偏移 + 实体 bar 上色（复用 Overview 思路），高亮选中 span
function waterfallOption(spans: Span[], active: number) {
  const names = spans.map(s => s.name);
  return {
    ...baseOption(),
    grid: { left: 8, right: 62, top: 6, bottom: 24, containLabel: true },
    tooltip: {
      ...(baseOption().tooltip as object),
      formatter: (p: { dataIndex: number }) => {
        const s = spans[p.dataIndex];
        const parts = [
          `<b>${s.name}</b> · ${s.kind}`,
          `耗时 ${s.durMs}ms · 起 +${s.startMs}ms`,
          s.tokensOut !== undefined ? `tokens ${(s.tokensIn ?? 0)}/${s.tokensOut}` : '',
          s.costUsd !== undefined ? `cost $${s.costUsd.toFixed(4)}` : '',
          s.status === 'error'
            ? `<span style="color:${cssVar('--danger')}">● ${s.detail || '失败'}</span>`
            : (s.detail || ''),
        ].filter(Boolean);
        return parts.join('<br/>');
      },
    },
    xAxis: { type: 'value', ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, formatter: '{value}ms' } },
    yAxis: {
      type: 'category', inverse: true, data: names, ...axisStyle(),
      axisLabel: { ...axisStyle().axisLabel, fontSize: 11, width: 130, overflow: 'truncate' },
    },
    series: [
      // 透明占位：把每条 bar 推到它的 startMs
      { type: 'bar', stack: 't', silent: true, itemStyle: { color: 'transparent' }, data: spans.map(s => s.startMs), barWidth: 14 },
      // 实体耗时条
      {
        type: 'bar', stack: 't', barWidth: 14,
        data: spans.map((s, i) => ({
          value: s.durMs,
          itemStyle: {
            color: cssVar(KIND_VAR[s.kind] || '--c8'),
            borderRadius: 3,
            borderColor: s.status === 'error' ? cssVar('--danger') : (s.critical ? accent() : 'transparent'),
            borderWidth: s.status === 'error' || s.critical ? 1.5 : 0,
            opacity: i === active ? 1 : (s.status === 'error' ? 0.96 : 0.8),
            shadowBlur: i === active ? 10 : 0,
            shadowColor: i === active ? cssVar(KIND_VAR[s.kind] || '--c8') : 'transparent',
          },
        })),
        label: {
          show: true, position: 'right',
          formatter: (p: { dataIndex: number }) => `${spans[p.dataIndex].durMs}ms`,
          color: cssVar('--text-3'), fontSize: 10, fontFamily: 'Geist Mono, monospace',
        },
        animationDelay: (i: number) => i * 55,
      },
    ],
    animationDuration: 700, animationEasing: 'cubicOut',
  };
}

// 延迟直方：圆角柱（accent）+ p50/p95/p99 三条虚线 markLine
function histoOption() {
  return {
    ...baseOption(),
    grid: { left: 8, right: 16, top: 16, bottom: 24, containLabel: true },
    tooltip: {
      ...(baseOption().tooltip as object), trigger: 'axis',
      formatter: (ps: { axisValue: string; data: number }[]) => {
        const p = ps[0];
        return `${p.axisValue}ms 区间<br/><b class="mono">${p.data}</b> 次调用`;
      },
    },
    xAxis: {
      type: 'category', data: LATENCY_HISTO.map(b => b.ms), ...axisStyle(),
      axisLabel: { ...axisStyle().axisLabel, formatter: '{value}' },
    },
    yAxis: { type: 'value', ...axisStyle(), name: '调用数', nameTextStyle: { color: cssVar('--text-3'), fontSize: 10, align: 'left' } },
    series: [{
      type: 'bar', data: LATENCY_HISTO.map(b => b.count), barWidth: '58%',
      itemStyle: { color: areaGradient(accent(), 0.9), borderRadius: [4, 4, 0, 0] },
      emphasis: { itemStyle: { color: accent() } },
      markLine: {
        symbol: 'none', silent: true,
        label: { position: 'insideEndTop', fontSize: 10, fontFamily: 'Geist Mono, monospace', color: cssVar('--text-2') },
        data: [
          { xAxis: bucketIdx(LATENCY_MARKS.p50), lineStyle: { color: cssVar('--c2'), type: 'dashed', width: 1.4 }, label: { formatter: `p50 ${LATENCY_MARKS.p50}ms`, color: cssVar('--c2') } },
          { xAxis: bucketIdx(LATENCY_MARKS.p95), lineStyle: { color: cssVar('--warning'), type: 'dashed', width: 1.4 }, label: { formatter: `p95 ${LATENCY_MARKS.p95}ms`, color: cssVar('--warning') } },
          { xAxis: bucketIdx(LATENCY_MARKS.p99), lineStyle: { color: cssVar('--danger'), type: 'dashed', width: 1.4 }, label: { formatter: `p99 ${LATENCY_MARKS.p99}ms`, color: cssVar('--danger') } },
        ],
      },
    }],
    animationDuration: 800, animationEasing: 'cubicOut',
  };
}

// 把毫秒标线落到最近的直方分桶索引（category 轴需要索引/类目值定位）
function bucketIdx(ms: number): number {
  const arr = LATENCY_HISTO.map(b => b.ms);
  let best = 0, bd = Infinity;
  arr.forEach((m, i) => { const d = Math.abs(m - ms); if (d < bd) { bd = d; best = i; } });
  // 在桶之间做线性插值，标线落得更准
  const m = arr[best];
  if (ms > m && best < arr.length - 1) return best + (ms - m) / (arr[best + 1] - m);
  if (ms < m && best > 0) return best - (m - ms) / (m - arr[best - 1]);
  return best;
}
