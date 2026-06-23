import { useMemo, useState } from 'react';
import {
  ShieldCheck, ToggleLeft, ToggleRight, Layers, BarChart3,
  ChevronRight, Info,
} from 'lucide-react';
import { PageHeader, StatCard, ProgressBar } from '../components/ui';
import { Panel, SeverityBadge } from '../components/sig';
import { StatusBadge } from '../components/kit';
import Chart from '../components/Chart';
import { MODERATION_POLICIES } from '../lib/mockData';
import {
  SEVERITY_LABEL,
  type ViolationCategory,
  type Severity,
} from '../types';
import { baseOption, axisStyle, cssVar, DRAW } from '../lib/chartTheme';

// ─── 违规分类 → 展示分组排序（严重 → 高 → 中 → 低）─────────────────────────
const SEV_ORDER: Record<Severity, number> = {
  critical: 0, high: 1, mid: 2, low: 3, safe: 4,
};

// 按 category 分组，category 的严重度取该组最高策略等级
function groupByCategory(policies: typeof MODERATION_POLICIES) {
  const map = new Map<ViolationCategory, typeof MODERATION_POLICIES>();
  for (const p of policies) {
    if (!map.has(p.category)) map.set(p.category, []);
    map.get(p.category)!.push(p);
  }
  // 每组取最高 severity
  const groups = [...map.entries()].map(([cat, items]) => {
    const topSev = items.reduce<Severity>((best, p) =>
      SEV_ORDER[p.severity] < SEV_ORDER[best] ? p.severity : best,
      'safe',
    );
    return { cat, items, topSev };
  });
  // 按最高 severity → 再按命中量 降序
  groups.sort((a, b) =>
    SEV_ORDER[a.topSev] - SEV_ORDER[b.topSev] ||
    b.items.reduce((s, i) => s + i.hits30d, 0) - a.items.reduce((s, i) => s + i.hits30d, 0),
  );
  return groups;
}

// 法规 basis 标签顺序
const BASIS_ORDER = ['DSA', '标识办法', '广告法', '未成年人保护法', '平台社区公约'] as const;
const BASIS_COLOR: Record<string, string> = {
  DSA: 'var(--gold)',
  '标识办法': 'var(--info)',
  '广告法': 'var(--warning)',
  '未成年人保护法': 'var(--danger)',
  '平台社区公约': 'var(--text-3)',
};

// 处置动作 → 中文 + 语义色
const ACTION_TONE: Record<string, { label: string; color: string }> = {
  remove: { label: '自动下架', color: 'var(--danger)' },
  limit: { label: '自动限流', color: 'var(--warning)' },
  escalate: { label: '升级人审', color: 'var(--info)' },
  age_gate: { label: '年龄门限', color: 'var(--gold)' },
  pass: { label: '通过', color: 'var(--success)' },
};

export default function Policy() {
  const groups = useMemo(() => groupByCategory(MODERATION_POLICIES), []);

  // 默认选中第一条策略
  const [selId, setSelId] = useState<string>(MODERATION_POLICIES[0]?.id ?? '');
  const selected = useMemo(
    () => MODERATION_POLICIES.find(p => p.id === selId) ?? MODERATION_POLICIES[0],
    [selId],
  );

  // KPI 汇总
  const totalHits = MODERATION_POLICIES.reduce((s, p) => s + p.hits30d, 0);
  const autoCount = MODERATION_POLICIES.filter(p => p.auto && p.enabled).length;
  const avgPrecision =
    MODERATION_POLICIES.reduce((s, p) => s + p.precision, 0) / MODERATION_POLICIES.length;

  // 命中量排名图数据（降序 Top 10）
  const ranked = [...MODERATION_POLICIES]
    .sort((a, b) => b.hits30d - a.hits30d);

  return (
    <div className="page page-wide">
      <PageHeader
        title="策略 / 分类体系"
        subtitle="违规分类体系 · 处置阈值配置 · 多法规基线（DSA / 标识办法 / 广告法 / 未保法）"
      />

      {/* KPI 行 */}
      <div
        className="reveal"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}
      >
        <StatCard
          label="近 30 日策略命中"
          raw={totalHits}
          unit="次"
          change={8.3}
          spark={[28000, 32000, 35000, 40000, 39000, 44000, 47000, 52000]}
          icon={<BarChart3 size={15} />}
          delayClass="reveal-1"
        />
        <StatCard
          label="当前启用策略"
          raw={MODERATION_POLICIES.filter(p => p.enabled).length}
          unit="条"
          icon={<Layers size={15} />}
          delayClass="reveal-2"
        />
        <StatCard
          label="自动处置策略"
          raw={autoCount}
          unit="条"
          icon={<ToggleRight size={15} />}
          delayClass="reveal-3"
        />
        <StatCard
          label="平均判定精确率"
          raw={avgPrecision}
          unit="%"
          decimals={1}
          change={0.6}
          icon={<ShieldCheck size={15} />}
          delayClass="reveal-4"
        />
      </div>

      {/* 三栏主体 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr 360px',
          gap: 12,
          alignItems: 'start',
        }}
      >
        {/* ── 左：分类体系列表 ── */}
        <Panel
          title="违规分类体系"
          icon={<Layers size={13} />}
          bodyClass="panel-body-0"
        >
          <div style={{ padding: '8px 0' }}>
            {groups.map(({ cat, items, topSev }) => (
              <div key={cat}>
                {/* 分组标题 */}
                <div
                  className="row gap-2"
                  style={{
                    padding: '6px 14px',
                    borderBottom: '1px solid var(--hairline)',
                    background: 'var(--surface-2)',
                  }}
                >
                  <SeverityBadge severity={topSev} showLabel={false} />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      color: `var(--sev-${topSev})`,
                      textTransform: 'uppercase' as const,
                    }}
                  >
                    {cat}
                  </span>
                  <span
                    className="mononum"
                    style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 'auto' }}
                  >
                    {items.length} 条
                  </span>
                </div>
                {/* 策略条目 */}
                {items.map(p => {
                  const isSelected = p.id === selId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelId(p.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '9px 14px',
                        textAlign: 'left',
                        background: isSelected
                          ? 'color-mix(in srgb, var(--gold) 9%, var(--surface-2))'
                          : 'transparent',
                        borderLeft: isSelected
                          ? '2px solid var(--gold)'
                          : '2px solid transparent',
                        borderTop: 'none',
                        borderRight: 'none',
                        borderBottom: '1px solid var(--hairline)',
                        cursor: 'pointer',
                        transition: 'all var(--dur-micro) var(--ease)',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          flexShrink: 0,
                          background: `var(--sev-${p.severity})`,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12.5,
                            fontWeight: isSelected ? 600 : 400,
                            color: isSelected ? 'var(--text-1)' : 'var(--text-2)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.name}
                        </div>
                        <div
                          className="row gap-2 mononum"
                          style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}
                        >
                          <span style={{ color: p.enabled ? 'var(--success)' : 'var(--text-3)' }}>
                            {p.enabled ? '启用' : '停用'}
                          </span>
                          <span>·</span>
                          <span>精确率 {p.precision}%</span>
                        </div>
                      </div>
                      {isSelected && (
                        <ChevronRight size={12} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </Panel>

        {/* ── 中：策略详情 ── */}
        <Panel
          title="策略详情"
          icon={<ShieldCheck size={13} />}
          right={
            selected && (
              <div className="row gap-2">
                <span
                  className="mono"
                  style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: '0.02em' }}
                >
                  {selected.code}
                </span>
                <StatusBadge
                  status={selected.enabled ? '已启用' : '已停用'}
                  tone={selected.enabled ? 'good' : 'muted'}
                />
              </div>
            )
          }
          bodyClass="panel-body"
        >
          {selected ? (
            <div className="col gap-5">
              {/* 策略标题 + 分类 */}
              <div>
                <div className="row gap-2" style={{ marginBottom: 6 }}>
                  <SeverityBadge severity={selected.severity} />
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--text-1)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {selected.name}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: 'var(--text-3)',
                    lineHeight: 1.65,
                    borderLeft: '2px solid var(--hairline-strong)',
                    paddingLeft: 10,
                    marginTop: 8,
                  }}
                >
                  {selected.desc}
                </div>
              </div>

              {/* 阈值 + 处置动作 + 自动开关 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 10,
                }}
              >
                {/* 自动处置阈值 */}
                <div
                  className="card"
                  style={{
                    padding: '14px 16px',
                    borderLeft: `3px solid var(--sev-${selected.severity})`,
                  }}
                >
                  <div className="label" style={{ marginBottom: 8 }}>自动处置阈值</div>
                  <div
                    className="mononum"
                    style={{
                      fontSize: 30,
                      fontWeight: 700,
                      color: `var(--sev-${selected.severity})`,
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                    }}
                  >
                    {selected.threshold}
                    <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 2 }}>%</span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <ProgressBar
                      pct={selected.threshold}
                      color={`var(--sev-${selected.severity})`}
                      height={5}
                    />
                  </div>
                  <div
                    className="t-small text-3"
                    style={{ marginTop: 6 }}
                  >
                    AI 置信度超过此值{selected.auto ? '自动执行' : '升级人审'}
                  </div>
                </div>

                {/* 处置动作 */}
                <div className="card" style={{ padding: '14px 16px' }}>
                  <div className="label" style={{ marginBottom: 8 }}>处置动作</div>
                  <div
                    className="mononum"
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: ACTION_TONE[selected.action]?.color ?? 'var(--text-1)',
                    }}
                  >
                    {ACTION_TONE[selected.action]?.label ?? selected.action}
                  </div>
                  <div
                    className="t-small text-3"
                    style={{ marginTop: 8 }}
                  >
                    命中策略后执行的一级处置
                  </div>
                </div>

                {/* 自动化开关 */}
                <div className="card" style={{ padding: '14px 16px' }}>
                  <div className="label" style={{ marginBottom: 8 }}>自动处置</div>
                  <div className="row gap-2" style={{ alignItems: 'center' }}>
                    {selected.auto ? (
                      <ToggleRight size={22} style={{ color: 'var(--gold)' }} />
                    ) : (
                      <ToggleLeft size={22} style={{ color: 'var(--text-3)' }} />
                    )}
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: selected.auto ? 'var(--gold)' : 'var(--text-3)',
                      }}
                    >
                      {selected.auto ? '开启' : '关闭'}
                    </span>
                  </div>
                  <div
                    className="t-small text-3"
                    style={{ marginTop: 8 }}
                  >
                    {selected.auto
                      ? '高于阈值自动处置，无需人工确认'
                      : '全部结果送人审队列复核'}
                  </div>
                </div>
              </div>

              {/* 法规基线徽章 */}
              <div>
                <div
                  className="row gap-2"
                  style={{ marginBottom: 10, alignItems: 'center' }}
                >
                  <span className="label">法规合规基线</span>
                  <Info size={12} style={{ color: 'var(--text-3)' }} />
                </div>
                <div className="row gap-2 wrap">
                  {BASIS_ORDER.filter(b => selected.basis.includes(b as never)).map(b => (
                    <span
                      key={b}
                      className="qual-badge"
                      style={{
                        background: `color-mix(in srgb, ${BASIS_COLOR[b] ?? 'var(--text-3)'} 14%, transparent)`,
                        color: BASIS_COLOR[b] ?? 'var(--text-3)',
                        border: `1px solid color-mix(in srgb, ${BASIS_COLOR[b] ?? 'var(--text-3)'} 32%, transparent)`,
                        borderRadius: 'var(--r-sm)',
                        padding: '3px 10px',
                        fontSize: 11.5,
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {b}
                    </span>
                  ))}
                  {BASIS_ORDER.filter(b => !selected.basis.includes(b as never)).map(b => (
                    <span
                      key={b}
                      style={{
                        background: 'transparent',
                        color: 'var(--text-3)',
                        border: '1px solid var(--hairline)',
                        borderRadius: 'var(--r-sm)',
                        padding: '3px 10px',
                        fontSize: 11.5,
                        opacity: 0.45,
                      }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              {/* 效能指标 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                }}
              >
                {/* 近 30 日命中量 */}
                <div className="card" style={{ padding: '13px 15px' }}>
                  <div className="label" style={{ marginBottom: 6 }}>近 30 日命中</div>
                  <div
                    className="mononum"
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: 'var(--text-1)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {selected.hits30d.toLocaleString('zh-CN')}
                    <span
                      style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 400, marginLeft: 4 }}
                    >
                      次
                    </span>
                  </div>
                  {/* 相对全部策略的占比条 */}
                  <div style={{ marginTop: 8 }}>
                    <ProgressBar
                      pct={(selected.hits30d / totalHits) * 100}
                      color="var(--gold)"
                      height={4}
                    />
                  </div>
                  <div
                    className="mononum t-small text-3"
                    style={{ marginTop: 5 }}
                  >
                    占全策略 {((selected.hits30d / totalHits) * 100).toFixed(1)}%
                  </div>
                </div>

                {/* 判定精确率 */}
                <div className="card" style={{ padding: '13px 15px' }}>
                  <div className="label" style={{ marginBottom: 6 }}>判定精确率</div>
                  <div
                    className="mononum"
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color:
                        selected.precision >= 95
                          ? 'var(--success)'
                          : selected.precision >= 85
                            ? 'var(--gold)'
                            : 'var(--warning)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {selected.precision.toFixed(1)}
                    <span
                      style={{ fontSize: 12, fontWeight: 400, marginLeft: 2 }}
                    >
                      %
                    </span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <ProgressBar
                      pct={selected.precision}
                      color={
                        selected.precision >= 95
                          ? 'var(--success)'
                          : selected.precision >= 85
                            ? 'var(--gold)'
                            : 'var(--warning)'
                      }
                      height={4}
                    />
                  </div>
                  <div
                    className="t-small text-3"
                    style={{ marginTop: 5 }}
                  >
                    {selected.precision >= 95
                      ? '判定精确率优秀'
                      : selected.precision >= 85
                        ? '判定精确率良好'
                        : '精确率偏低，建议复核阈值'}
                  </div>
                </div>
              </div>

              {/* 违规类别定性 */}
              <div
                className="card"
                style={{
                  padding: '12px 15px',
                  background: 'var(--surface-2)',
                }}
              >
                <div className="row gap-2" style={{ marginBottom: 6 }}>
                  <ShieldCheck size={13} style={{ color: 'var(--gold)' }} />
                  <span className="label">违规严重等级</span>
                  <SeverityBadge severity={selected.severity} />
                </div>
                <div className="t-small text-3" style={{ lineHeight: 1.6 }}>
                  {SEVERITY_LABEL[selected.severity]}（{selected.category}）— 类型：{
                    selected.severity === 'critical' ? '一律升级，留痕可追溯，平台重点管控。'
                      : selected.severity === 'high' ? '自动优先处置，需双重验证确保准确性。'
                        : selected.severity === 'mid' ? '中等风险，限流 + 警告为主，结合人审抽检。'
                          : '低危，批量自动化处理，降低人工投入。'
                  }
                </div>
              </div>
            </div>
          ) : (
            <div
              className="t-small text-3"
              style={{ textAlign: 'center', padding: '60px 20px' }}
            >
              从左侧选择策略查看详情
            </div>
          )}
        </Panel>

        {/* ── 右：命中排名图 + 精确率列表 ── */}
        <div className="col gap-3">
          {/* 命中量排名横向柱图 */}
          <Panel
            title="近 30 日命中量排名"
            icon={<BarChart3 size={13} />}
            bodyClass="panel-body"
          >
            <Chart
              height={320}
              deps={[ranked.map(p => p.id)]}
              build={() => {
                const base = baseOption();
                const axSt = axisStyle();
                const colors = ranked.map(p => {
                  const sevColors: Record<Severity, string> = {
                    critical: cssVar('--sev-critical'),
                    high: cssVar('--sev-high'),
                    mid: cssVar('--sev-mid'),
                    low: cssVar('--sev-low'),
                    safe: cssVar('--sev-safe'),
                  };
                  return sevColors[p.severity];
                });
                return {
                  ...base,
                  ...DRAW,
                  grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
                  xAxis: {
                    type: 'value',
                    ...axSt,
                    axisLabel: {
                      ...axSt.axisLabel,
                      formatter: (v: number) =>
                        v >= 10000 ? `${(v / 10000).toFixed(1)}w` : String(v),
                    },
                  },
                  yAxis: {
                    type: 'category',
                    data: [...ranked].reverse().map(p => p.name),
                    ...axSt,
                    axisLabel: {
                      ...axSt.axisLabel,
                      width: 90,
                      overflow: 'truncate',
                    },
                    inverse: false,
                  },
                  tooltip: {
                    ...((base as Record<string, unknown>).tooltip as object),
                    trigger: 'axis',
                    formatter: (params: unknown) => {
                      const arr = params as { name: string; value: number; color: string }[];
                      if (!arr.length) return '';
                      const p = arr[0];
                      const policy = MODERATION_POLICIES.find(m => m.name === p.name);
                      return `<div style="font-size:12px">
                        <div style="font-weight:600;margin-bottom:4px">${p.name}</div>
                        <div>命中 <b>${p.value.toLocaleString('zh-CN')}</b> 次</div>
                        ${policy ? `<div>精确率 ${policy.precision}%</div>` : ''}
                      </div>`;
                    },
                  },
                  series: [
                    {
                      type: 'bar',
                      data: [...ranked].reverse().map((p, i) => ({
                        value: p.hits30d,
                        itemStyle: {
                          color: colors[ranked.length - 1 - i],
                          borderRadius: [0, 3, 3, 0],
                        },
                      })),
                      label: {
                        show: true,
                        position: 'right',
                        formatter: (p: { value: number }) =>
                          p.value >= 10000
                            ? `${(p.value / 10000).toFixed(1)}w`
                            : String(p.value),
                        color: cssVar('--text-3'),
                        fontSize: 10,
                        fontFamily: "'Geist Mono','Geist',sans-serif",
                      },
                      barMaxWidth: 18,
                    },
                  ],
                };
              }}
            />
          </Panel>

          {/* 精确率列表 */}
          <Panel
            title="策略精确率一览"
            icon={<ShieldCheck size={13} />}
            bodyClass="panel-body"
          >
            <div className="col gap-3">
              {[...MODERATION_POLICIES]
                .sort((a, b) => b.precision - a.precision)
                .map(p => (
                  <div key={p.id}>
                    <div className="row spread" style={{ marginBottom: 5 }}>
                      <div className="row gap-2">
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: `var(--sev-${p.severity})`,
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 12,
                            color: p.id === selId ? 'var(--gold)' : 'var(--text-2)',
                            fontWeight: p.id === selId ? 600 : 400,
                            cursor: 'pointer',
                          }}
                          onClick={() => setSelId(p.id)}
                        >
                          {p.name}
                        </span>
                      </div>
                      <span
                        className="mononum"
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color:
                            p.precision >= 95
                              ? 'var(--success)'
                              : p.precision >= 85
                                ? 'var(--gold)'
                                : 'var(--warning)',
                        }}
                      >
                        {p.precision.toFixed(1)}%
                      </span>
                    </div>
                    <ProgressBar
                      pct={p.precision}
                      color={
                        p.precision >= 95
                          ? 'var(--success)'
                          : p.precision >= 85
                            ? 'var(--gold)'
                            : 'var(--warning)'
                      }
                      height={4}
                    />
                  </div>
                ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
