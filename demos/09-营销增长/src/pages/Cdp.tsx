import { useState, useMemo } from 'react';
import {
  Users, Sparkles, Search, Plus, X, RefreshCw, Filter,
  Clock, Database, BarChart2, ChevronRight,
} from 'lucide-react';
import { PageHeader, StatCard, ProgressBar, EmptyState } from '../components/ui';
import { Panel } from '../components/sig';
import Chart from '../components/Chart';
import { baseOption, cssVar, chanColor, accent, DRAW } from '../lib/chartTheme';
import { SEGMENTS, SEGMENT_SUNBURST, CDP_KPIS } from '../lib/mockData';
import type { Segment, SunburstNode } from '../types';

const KPI_ICONS = [
  <Filter size={16} />, <Users size={16} />, <BarChart2 size={16} />, <RefreshCw size={16} />,
];

// ─── NL 建群 mock 结果 ────────────────────────────────────────────────────────
const NL_MOCK_RULES = [
  { id: 'nl1', field: '近30天订单', op: '>', value: '1次' },
  { id: 'nl2', field: '一级类目', op: '∈', value: '美妆个护', conj: 'AND' as const },
  { id: 'nl3', field: '活跃分层', op: '∈', value: '高活跃 / 中高活跃', conj: 'AND' as const },
];

// ─── 旭日图数据处理（递归预解析颜色，禁裸 var()）──────────────────────────────
function resolveColors(node: SunburstNode, parentColor?: string): Record<string, unknown> {
  const selfColor = node.colorVar ? chanColor(node.colorVar) : (parentColor ?? cssVar('--text-3'));
  const resolvedChildren = node.children?.map(child => resolveColors(child, selfColor));
  return {
    name: node.name,
    value: node.value,
    itemStyle: { color: selfColor },
    ...(resolvedChildren ? { children: resolvedChildren } : {}),
  };
}

export default function Cdp() {
  const [selectedId, setSelectedId] = useState('s1');
  const [nlInput, setNlInput] = useState('');
  const [nlGenerated, setNlGenerated] = useState(false);

  const selected: Segment = useMemo(
    () => SEGMENTS.find(s => s.id === selectedId) ?? SEGMENTS[0],
    [selectedId],
  );

  const displayRules = nlGenerated ? NL_MOCK_RULES : selected.rules;

  function handleNlGenerate() {
    if (nlInput.trim()) setNlGenerated(true);
  }

  function handleNlClear() {
    setNlInput('');
    setNlGenerated(false);
  }

  return (
    <div className="page page-wide">
      <PageHeader
        title="人群圈选"
        subtitle="结构化条件构建器 · CDP 实时人群 · 自然语言建群 · 旭日结构洞察"
        actions={<span className="tag tag-mono"><Users size={12} style={{ marginRight: 4 }} />CDP 分析</span>}
      />

      {/* KPI 带 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {CDP_KPIS.map((k, i) => (
          <StatCard key={k.label} {...k} icon={KPI_ICONS[i]} delayClass={`d${i + 1}`} />
        ))}
      </div>

      {/* NL 建群入口 */}
      <div
        className="panel reveal d1"
        style={{ marginBottom: 14 }}
      >
        <div className="panel-head">
          <span className="panel-title"><Sparkles size={13} />自然语言建群</span>
          <span className="tag" style={{ color: 'var(--gold)', fontSize: 11 }}>AI 辅助 · 生成规则后可手动编辑</span>
        </div>
        <div className="panel-body">
          <div className="row gap-3">
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
              <input
                className="input"
                style={{ width: '100%', paddingLeft: 34 }}
                placeholder="用大白话描述人群，如：近30天买过美护且高活跃"
                value={nlInput}
                onChange={e => { setNlInput(e.target.value); setNlGenerated(false); }}
                onKeyDown={e => { if (e.key === 'Enter') handleNlGenerate(); }}
              />
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleNlGenerate}
              disabled={!nlInput.trim()}
              style={{ flexShrink: 0, background: accent(), border: 'none' }}
            >
              <Plus size={13} />生成规则
            </button>
            {nlGenerated && (
              <button className="btn btn-subtle btn-sm" onClick={handleNlClear} style={{ flexShrink: 0 }}>
                <X size={13} />清除
              </button>
            )}
          </div>
          {nlGenerated && (
            <div className="row gap-2" style={{ marginTop: 10, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
              <Sparkles size={12} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
                已解析为 3 条规则 · 预估覆盖 <span className="mononum" style={{ color: 'var(--gold)', fontWeight: 700 }}>184 万</span> 人群，可触达率 <span className="mononum">86%</span>。规则已填入右侧构建器，可手动调整后保存。
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 主体布局：左侧列表 + 右侧规则构建器 + 旭日图 */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 320px', gap: 14, alignItems: 'start' }}>

        {/* 左：人群列表 */}
        <Panel
          title={<><Users size={13} />人群包</>}
          right={<span className="tag">{SEGMENTS.length} 个</span>}
        >
          <div className="col gap-2">
            {SEGMENTS.map((seg, i) => (
              <SegmentListItem
                key={seg.id}
                seg={seg}
                active={seg.id === selectedId}
                onSelect={() => { setSelectedId(seg.id); setNlGenerated(false); }}
                delay={i}
              />
            ))}
          </div>
        </Panel>

        {/* 中：规则构建器（签名交互）*/}
        <Panel
          title={<><Filter size={13} />{nlGenerated ? 'AI 生成规则（可编辑）' : selected.name}</>}
          right={
            <div className="row gap-2">
              {selected.pinned && !nlGenerated && (
                <span className="tag" style={{ color: 'var(--gold)' }}>已置顶</span>
              )}
              <span className="tag tag-mono" style={{ fontSize: 10.5 }}>
                {nlGenerated ? 'AI 草稿' : selected.source}
              </span>
            </div>
          }
        >
          {/* 人群说明 */}
          <div style={{ marginBottom: 14, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
            {nlGenerated ? `「${nlInput}」→ AI 解析为以下条件规则，预估与「近30天美护 + 高活跃」人群重叠度 87%` : selected.desc}
          </div>

          {/* 规则列表（.rule-row / .rule-conj · 签名） */}
          <div className="col" style={{ gap: 0, marginBottom: 16 }}>
            {displayRules.map((rule, idx) => (
              <div key={rule.id}>
                {idx > 0 && rule.conj && (
                  <div className="rule-conj">
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      color: rule.conj === 'AND' ? 'var(--info)' : 'var(--warning)',
                      background: rule.conj === 'AND'
                        ? 'color-mix(in srgb, var(--info) 12%, transparent)'
                        : 'color-mix(in srgb, var(--warning) 12%, transparent)',
                      padding: '2px 8px',
                      borderRadius: 20,
                    }}>
                      {rule.conj}
                    </span>
                  </div>
                )}
                <div className="rule-row">
                  <RuleCell label="字段" value={rule.field} mono={false} />
                  <RuleCell label="操作符" value={rule.op} mono={false} accent />
                  <RuleCell label="值" value={rule.value} mono />
                  <button
                    className="btn btn-subtle btn-sm"
                    style={{ flexShrink: 0, opacity: 0.5 }}
                    title="编辑条件"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            ))}

            {displayRules.length === 0 && (
              <EmptyState icon={<Filter size={32} />} title="暂无规则" desc="从左侧选择人群包或使用 AI 建群" />
            )}
          </div>

          {/* 新增条件按钮 */}
          <button
            className="btn btn-subtle btn-sm"
            style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed', marginBottom: 20 }}
          >
            <Plus size={13} />新增条件
          </button>

          {/* 预估结果区 */}
          <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 16 }}>
            <div className="row spread" style={{ marginBottom: 10 }}>
              <span className="label">预估覆盖人数</span>
              <span className="row gap-2">
                <RefreshCw size={12} style={{ color: 'var(--text-3)' }} />
                <span className="t-small text-3" style={{ fontSize: 10.5 }}>
                  {nlGenerated ? 'AI 预估' : `更新于 ${selected.updatedAt}`}
                </span>
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <span
                className="mononum"
                style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: 'var(--text-1)', letterSpacing: '-0.02em' }}
              >
                {nlGenerated ? '184' : (selected.size / 10000).toFixed(0)}
              </span>
              <span style={{ fontSize: 15, color: 'var(--text-3)', marginLeft: 4, fontWeight: 500 }}>万人</span>
            </div>

            <div style={{ marginBottom: 8 }}>
              <div className="row spread" style={{ marginBottom: 6 }}>
                <span className="label">可触达率</span>
                <span className="mononum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
                  {nlGenerated ? 86 : selected.reach}%
                </span>
              </div>
              <ProgressBar pct={nlGenerated ? 86 : selected.reach} color={accent()} height={8} />
            </div>

            <div className="row gap-2" style={{ marginTop: 16 }}>
              <button
                className="btn btn-primary btn-sm"
                style={{ flex: 1, justifyContent: 'center', background: accent(), border: 'none' }}
              >
                保存人群包
              </button>
              <button className="btn btn-subtle btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                同步至投放渠道
              </button>
            </div>
          </div>
        </Panel>

        {/* 右：旭日图 */}
        <Panel
          title={<><Database size={13} />用户结构分布</>}
          right={<span className="tag tag-mono" style={{ fontSize: 10.5 }}>旭日图</span>}
        >
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.5 }}>
            全量用户按品类 / 人群标签层级分布，圈选时可参考结构占比
          </div>
          <SunburstChart />
          <div className="col gap-2" style={{ marginTop: 14 }}>
            {SEGMENT_SUNBURST.children?.map(node => (
              <div key={node.name} className="row spread" style={{ fontSize: 12 }}>
                <div className="row gap-2">
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: node.colorVar ? chanColor(node.colorVar) : 'var(--surface-3)', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ color: 'var(--text-2)' }}>{node.name}</span>
                </div>
                <span className="mononum text-3" style={{ fontSize: 11 }}>
                  {node.children?.reduce((s, c) => s + (c.value ?? 0), 0)} 万
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ─── 人群列表条目 ─────────────────────────────────────────────────────────────
function SegmentListItem({ seg, active, onSelect, delay }: {
  seg: Segment; active: boolean; onSelect: () => void; delay: number;
}) {
  return (
    <button
      onClick={onSelect}
      className={`col reveal`}
      style={{
        animationDelay: `${delay * 40}ms`,
        textAlign: 'left',
        padding: '10px 12px',
        borderRadius: 'var(--r-md)',
        background: active ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'var(--surface-2)',
        border: active ? '1px solid color-mix(in srgb, var(--gold) 30%, transparent)' : '1px solid var(--hairline)',
        cursor: 'pointer',
        gap: 5,
        transition: 'background 0.15s var(--ease), border-color 0.15s var(--ease)',
      }}
    >
      <div className="row spread gap-2">
        <span style={{ fontSize: 12.5, fontWeight: 600, color: active ? 'var(--gold)' : 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 148 }}>
          {seg.name}
        </span>
        {seg.pinned && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />}
      </div>
      <div className="row spread">
        <span className="row gap-1 t-small text-3" style={{ fontSize: 11 }}>
          <Clock size={10} />{seg.updatedAt}
        </span>
        <span className="mononum" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-2)' }}>
          {(seg.size / 10000).toFixed(0)} 万
        </span>
      </div>
      <div style={{ marginTop: 2 }}>
        <ProgressBar pct={seg.reach} color={active ? accent() : 'var(--surface-3)'} height={4} />
      </div>
      <div className="row spread" style={{ marginTop: 1 }}>
        <span className="t-small text-3" style={{ fontSize: 10 }}>{seg.source}</span>
        <span className="mononum text-3" style={{ fontSize: 10 }}>触达 {seg.reach}%</span>
      </div>
    </button>
  );
}

// ─── 规则字段单元 ─────────────────────────────────────────────────────────────
function RuleCell({ label, value, mono, accent: isAccent }: {
  label: string; value: string; mono?: boolean; accent?: boolean;
}) {
  return (
    <div className="col" style={{ gap: 2, flex: isAccent ? '0 0 auto' : 1 }}>
      <span style={{ fontSize: 9.5, color: 'var(--text-3)', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
      <span
        className={mono ? 'mononum' : ''}
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: isAccent ? 'var(--gold)' : 'var(--text-1)',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── 旭日图（真 ECharts · canvas 色全 cssVar/chanColor 预解析）──────────────────
function SunburstChart() {
  return (
    <Chart
      height={260}
      build={() => {
        const resolvedData = resolveColors(SEGMENT_SUNBURST);
        const text3 = cssVar('--text-3');
        const surface1 = cssVar('--surface-1');
        const hairline = cssVar('--hairline');
        const font = "'Geist','PingFang SC',system-ui,sans-serif";

        return {
          ...baseOption(),
          ...DRAW,
          backgroundColor: 'transparent',
          tooltip: {
            backgroundColor: surface1,
            borderColor: hairline,
            borderWidth: 1,
            padding: [9, 13],
            textStyle: { color: cssVar('--text-1'), fontSize: 12, fontFamily: font },
            extraCssText: 'border-radius:11px;box-shadow:0 10px 34px rgba(0,0,0,.18);',
            formatter: (params: { name: string; value?: number }) =>
              `${params.name}${params.value ? `：${params.value} 万` : ''}`,
          },
          series: [
            {
              type: 'sunburst',
              data: [resolvedData],
              radius: ['18%', '90%'],
              label: {
                color: text3,
                fontSize: 10,
                fontFamily: font,
                rotate: 'radial',
                overflow: 'truncate',
              },
              itemStyle: {
                borderWidth: 2,
                borderColor: cssVar('--bg-base'),
              },
              levels: [
                {},
                {
                  r0: '18%',
                  r: '52%',
                  label: { rotate: 'tangential', fontSize: 11, fontWeight: 700 },
                },
                {
                  r0: '52%',
                  r: '90%',
                  label: { align: 'right', fontSize: 10 },
                },
              ],
              emphasis: {
                focus: 'ancestor',
                itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' },
              },
            },
          ],
        };
      }}
    />
  );
}
