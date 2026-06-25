import { useMemo, useState } from 'react';
import {
  Bell, FileText, Activity, Users, Lock, Bookmark, ShieldCheck,
  EyeOff, Zap, Star,
} from 'lucide-react';
import { PageHeader, Card, SectionTitle, EmptyState, StatCard } from '../components/ui';
import { toast } from '../components/kit';
import { SourceIcon } from '../components/Citation';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, trust, DRAW } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import { INTEL_ITEMS, canAccess } from '../lib/mockData';
import { LEVEL_LABEL } from '../types';
import type { IntelItem, IntelReason, ClearanceLevel } from '../types';

// ─── 补充受限演示条目（level 3，member 看不到）──────────────────────────────
const DEMO_LOCKED: IntelItem = {
  id: 'i_locked',
  title: '受限：某城商行不良资产底稿更新',
  reason: '你关注的项目',
  type: '新文档',
  source: 'Box',
  time: '1 小时前',
  level: 3,
  snippet: '（受限）不良资产明细更新 · 需密级 3 权限访问。',
};
const ALL_ITEMS: IntelItem[] = [...INTEL_ITEMS, DEMO_LOCKED];

// ─── 本周情报主题热度数据（ECharts 横条）────────────────────────────────────
const TOPIC_HEAT = [
  { name: '尽职调查', value: 47 },
  { name: '现金流', value: 38 },
  { name: '合规红线', value: 29 },
  { name: '连接器', value: 22 },
  { name: '关联交易', value: 18 },
  { name: 'DLP 权限', value: 14 },
];

// ─── 推送命中率近 14 天 sparkline 数据 ──────────────────────────────────────
const HITRATE_SERIES = [68, 71, 74, 70, 76, 79, 77, 82, 80, 84, 81, 86, 83, 87];

// ─── 筛选维度 ─────────────────────────────────────────────────────────────────
type FilterType = '全部' | '新文档' | '项目动态' | '专家变更';
type FilterReason = '全部来源' | IntelReason;
const FILTER_TYPES: FilterType[] = ['全部', '新文档', '项目动态', '专家变更'];
const FILTER_REASONS: FilterReason[] = ['全部来源', '你关注的项目', '你的领域', '你协作的人'];

// ─── reason 颜色 ─────────────────────────────────────────────────────────────
const reasonColor = (r: IntelReason): string => {
  if (r === '你关注的项目') return 'var(--gold)';
  if (r === '你的领域') return 'var(--emerald)';
  return 'var(--info)';
};

// ─── type 徽标颜色 ────────────────────────────────────────────────────────────
const typeColor = (t: IntelItem['type']): string => {
  if (t === '新文档') return 'var(--gold)';
  if (t === '项目动态') return 'var(--info)';
  return 'var(--emerald)';
};

// ─── type 图标 ────────────────────────────────────────────────────────────────
function TypeIcon({ type }: { type: IntelItem['type'] }) {
  const size = 12;
  if (type === '新文档') return <FileText size={size} />;
  if (type === '项目动态') return <Activity size={size} />;
  return <Users size={size} />;
}

// ─── 单条情报卡（时间线节点）────────────────────────────────────────────────
function IntelCard({
  item,
  clearance,
  saved,
  onSave,
  onIgnore,
}: {
  item: IntelItem;
  clearance: ClearanceLevel;
  saved: boolean;
  onSave: (id: string) => void;
  onIgnore: (id: string) => void;
}) {
  const accessible = canAccess(clearance, item.level);
  const rc = reasonColor(item.reason);
  const tc = typeColor(item.type);

  if (!accessible) {
    return (
      <div className="locked" style={{
        padding: '14px 16px',
        borderRadius: 'var(--r-md)',
        background: 'var(--surface-2)',
        border: '1px dashed var(--hairline-strong)',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        opacity: 0.68,
      }}>
        <Lock size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
            {item.title}
          </div>
          <div className="t-small text-3" style={{ marginTop: 3 }}>
            密级 {item.level} · {LEVEL_LABEL[item.level as ClearanceLevel]} — 你的权限（密级 {clearance}）不足以查看此情报
          </div>
        </div>
        <span className="lock-chip" style={{
          padding: '3px 9px',
          borderRadius: 99,
          background: 'color-mix(in srgb, var(--warning) 13%, transparent)',
          color: 'var(--warning)',
          fontSize: 11,
          fontWeight: 600,
          flexShrink: 0,
        }}>
          受限
        </span>
      </div>
    );
  }

  return (
    <div className="card card-hover reveal" style={{ padding: '16px 18px' }}>
      {/* 头部行 */}
      <div className="row gap-2" style={{ marginBottom: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 1 }}>
          <SourceIcon source={item.source} size={15} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', flex: 1, lineHeight: 1.4 }}>
          {item.title}
        </span>
        {/* type 徽标 */}
        <span className="row gap-1 badge" style={{
          background: `color-mix(in srgb, ${tc} 13%, transparent)`,
          color: tc,
          flexShrink: 0,
        }}>
          <TypeIcon type={item.type} />
          {item.type}
        </span>
      </div>

      {/* 推送原因 chip（"为什么推给你"差异化核心）+ 密级 */}
      <div className="row gap-2 wrap" style={{ marginBottom: 10 }}>
        <span className="row gap-1 badge" style={{
          background: `color-mix(in srgb, ${rc} 11%, transparent)`,
          color: rc,
          fontSize: 11,
          fontWeight: 600,
        }}>
          <Zap size={10} />
          {item.reason}
        </span>
        <span className="badge" style={{
          background: 'color-mix(in srgb, var(--emerald) 11%, transparent)',
          color: 'var(--emerald)',
          fontSize: 11,
        }}>
          <ShieldCheck size={10} style={{ marginRight: 3 }} />
          密级 {item.level} · {LEVEL_LABEL[item.level as ClearanceLevel]}
        </span>
        <span className="t-small text-3 mononum" style={{ marginLeft: 'auto' }}>{item.time}</span>
      </div>

      {/* 摘要（衬线知识正文）*/}
      <p className="t-answer" style={{
        fontSize: 13,
        lineHeight: 1.7,
        color: 'var(--text-2)',
        margin: '0 0 12px',
        paddingLeft: 4,
        borderLeft: '2px solid var(--hairline-strong)',
      }}>
        {item.snippet}
      </p>

      {/* 操作行：来源徽标 + 存入知识夹 + 忽略 */}
      <div className="row gap-2 spread">
        <span className="src-badge row gap-1">
          <SourceIcon source={item.source} size={12} />
          {item.source}
        </span>
        <div className="row gap-2">
          <button
            className="btn btn-subtle btn-sm row gap-1"
            style={{ color: saved ? 'var(--emerald)' : undefined }}
            onClick={() => {
              onSave(item.id);
              if (!saved) toast('已存入知识夹', 'success');
              else toast('已从知识夹移除', 'warn');
            }}
          >
            <Bookmark size={13} style={{ fill: saved ? 'var(--emerald)' : 'none' }} />
            {saved ? '已存' : '存入知识夹'}
          </button>
          <button
            className="btn btn-subtle btn-sm row gap-1"
            style={{ color: 'var(--text-3)' }}
            onClick={() => {
              onIgnore(item.id);
              toast('已忽略此条情报', 'info');
            }}
          >
            <EyeOff size={12} />
            忽略
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Proactive() {
  const { currentRole } = useAuth();
  const clearance = (currentRole?.clearance ?? 2) as ClearanceLevel;

  const [filterType, setFilterType] = useState<FilterType>('全部');
  const [filterReason, setFilterReason] = useState<FilterReason>('全部来源');
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [ignored, setIgnored] = useState<Set<string>>(new Set());

  const handleSave = (id: string) => {
    setSaved(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleIgnore = (id: string) => {
    setIgnored(prev => new Set([...prev, id]));
  };

  // 所有可访问条目（未过滤 ignored，用于 KPI）
  const allAccessible = useMemo(
    () => ALL_ITEMS.filter(i => canAccess(clearance, i.level)),
    [clearance],
  );
  const allLocked = useMemo(
    () => ALL_ITEMS.filter(i => !canAccess(clearance, i.level)),
    [clearance],
  );

  // 展示列表（忽略 + type + reason 三重筛选）
  const displayed = useMemo(() => {
    return allAccessible
      .filter(i => !ignored.has(i.id))
      .filter(i => filterType === '全部' || i.type === filterType)
      .filter(i => filterReason === '全部来源' || i.reason === filterReason);
  }, [allAccessible, ignored, filterType, filterReason]);

  // KPI
  const weekNew = allAccessible.length;
  const readRate = weekNew > 0 ? Math.round((ignored.size / weekNew) * 100) : 0;
  const savedCount = saved.size;

  const currentHit = HITRATE_SERIES[HITRATE_SERIES.length - 1];

  // ── ECharts ①：本周情报主题热度横条 ─────────────────────────────────────
  const buildTopicBar = () => ({
    ...baseOption(),
    grid: { left: 8, right: 18, top: 10, bottom: 6, containLabel: true },
    xAxis: { type: 'value', ...axisStyle(), splitLine: { show: false } },
    yAxis: {
      type: 'category',
      data: TOPIC_HEAT.map(d => d.name),
      inverse: true,
      ...axisStyle(),
      axisLine: { show: false },
    },
    series: [{
      type: 'bar',
      data: TOPIC_HEAT.map(d => ({
        value: d.value,
        itemStyle: {
          color: `color-mix(in srgb, ${accent()} ${50 + Math.round((d.value / 47) * 40)}%, transparent)`,
          borderRadius: [0, 4, 4, 0],
        },
      })),
      barMaxWidth: 18,
      label: {
        show: true,
        position: 'right',
        color: 'var(--text-3)',
        fontSize: 11,
        fontFamily: "'Geist','PingFang SC',sans-serif",
        formatter: '{c}',
      },
      ...DRAW,
    }],
    tooltip: {
      ...baseOption().tooltip as object,
      formatter: (p: { name: string; value: number }) =>
        `<b>${p.name}</b><br/>热度指数 <b class="mononum">${p.value}</b>`,
    },
  });

  // ── ECharts ②：推送命中率 14 天 sparkline 线 ─────────────────────────────
  const buildHitLine = () => ({
    ...baseOption(),
    grid: { left: 4, right: 4, top: 4, bottom: 4 },
    xAxis: { type: 'category', show: false },
    yAxis: { type: 'value', show: false, min: 60, max: 95 },
    series: [{
      type: 'line',
      data: HITRATE_SERIES,
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2, color: trust() },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: `color-mix(in srgb, ${trust()} 24%, transparent)` },
            { offset: 1, color: `color-mix(in srgb, ${trust()} 0%, transparent)` },
          ],
        },
      },
      animationDuration: 900,
    }],
  });

  return (
    <div className="page">
      <PageHeader
        title="主动情报推送"
        subtitle="基于你的项目关注、专业领域与协作关系，主动推送与你相关的知识动态"
        actions={
          <span className="badge" style={{
            background: 'color-mix(in srgb, var(--gold) 12%, transparent)',
            color: 'var(--gold)',
            fontSize: 12,
          }}>
            <Bell size={12} /> {allAccessible.length} 条新情报
          </span>
        }
      />

      {/* KPI 三连 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard
          label="本周新情报"
          raw={weekNew}
          unit="条"
          icon={<Bell size={15} />}
          delayClass="reveal-1"
        />
        <StatCard
          label="已读 / 忽略率"
          raw={readRate}
          unit="%"
          icon={<EyeOff size={15} />}
          delayClass="reveal-2"
        />
        <StatCard
          label="存入知识夹"
          raw={savedCount}
          unit="条"
          icon={<Star size={15} />}
          delayClass="reveal-3"
        />
      </div>

      {/* 权限感知提示 */}
      {allLocked.length > 0 && (
        <div className="filter-banner reveal" style={{ marginBottom: 14 }}>
          <Lock size={13} />
          <span>
            已为你隐藏 <b className="mononum">{allLocked.length}</b> 条受限情报（密级 &gt; {clearance}）·
            切换右上角角色可查看更多
          </span>
        </div>
      )}

      {/* 主体两栏 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 296px', gap: 16, alignItems: 'start' }}>

        {/* 左：时间线信息流 */}
        <div className="col gap-0">

          {/* 筛选 chip 条 — type */}
          <div className="row gap-2 wrap" style={{ marginBottom: 8 }}>
            {FILTER_TYPES.map(opt => (
              <button
                key={opt}
                className="btn btn-sm"
                onClick={() => setFilterType(opt)}
                style={{
                  background: filterType === opt ? 'var(--gold)' : 'var(--surface-2)',
                  color: filterType === opt ? '#fff' : 'var(--text-2)',
                  border: filterType === opt ? '1px solid var(--gold)' : '1px solid var(--hairline)',
                  fontWeight: filterType === opt ? 600 : 400,
                  borderRadius: 99,
                  padding: '5px 14px',
                  transition: 'all .18s var(--ease)',
                }}
              >
                {opt}
                {opt !== '全部' && (
                  <span className="mononum" style={{ marginLeft: 6, opacity: 0.72, fontSize: 11 }}>
                    {allAccessible.filter(i => i.type === opt).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 筛选 chip 条 — reason */}
          <div className="row gap-2 wrap" style={{ marginBottom: 14 }}>
            {FILTER_REASONS.map(opt => {
              const color = opt === '全部来源'
                ? 'var(--text-3)'
                : reasonColor(opt as IntelReason);
              const active = filterReason === opt;
              return (
                <button
                  key={opt}
                  className="btn btn-sm"
                  onClick={() => setFilterReason(opt)}
                  style={{
                    background: active ? `color-mix(in srgb, ${color} 18%, var(--surface-1))` : 'var(--surface-2)',
                    color: active ? color : 'var(--text-3)',
                    border: `1px solid ${active ? color : 'var(--hairline)'}`,
                    fontWeight: active ? 600 : 400,
                    borderRadius: 99,
                    padding: '4px 12px',
                    fontSize: 12,
                    transition: 'all .18s var(--ease)',
                  }}
                >
                  {opt !== '全部来源' && <Zap size={10} style={{ marginRight: 4 }} />}
                  {opt}
                </button>
              );
            })}
            <span className="t-small text-3" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
              显示 <span className="mononum">{displayed.length}</span> 条 · 按时间倒序
            </span>
          </div>

          {/* 时间线主体 */}
          {displayed.length === 0 ? (
            <EmptyState
              icon={<Bell size={36} />}
              title="暂无匹配情报"
              desc="切换筛选条件或等待系统推送"
            />
          ) : (
            <div style={{ position: 'relative', paddingLeft: 28 }}>
              {/* 竖线 */}
              <div style={{
                position: 'absolute',
                left: 10,
                top: 8,
                bottom: 8,
                width: 2,
                background: 'linear-gradient(to bottom, var(--gold) 0%, var(--hairline-strong) 60%, transparent 100%)',
                borderRadius: 2,
              }} />
              <div className="col" style={{ gap: 14 }}>
                {displayed.map((item, idx) => (
                  <div key={item.id} style={{ position: 'relative' }}>
                    {/* 节点圆点 */}
                    <div style={{
                      position: 'absolute',
                      left: -22,
                      top: 18,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: idx === 0 ? 'var(--gold)' : 'var(--hairline-strong)',
                      border: `2px solid ${idx === 0 ? 'var(--gold)' : 'var(--surface-1)'}`,
                      boxShadow: idx === 0 ? '0 0 0 3px color-mix(in srgb, var(--gold) 20%, transparent)' : 'none',
                      transition: 'all .2s',
                    }} />
                    <IntelCard
                      item={item}
                      clearance={clearance}
                      saved={saved.has(item.id)}
                      onSave={handleSave}
                      onIgnore={handleIgnore}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 受限灰锁区（渐出展示，不删除） */}
          {allLocked.length > 0 && (
            <div style={{ paddingLeft: 28, marginTop: 16 }}>
              <div className="t-small text-3" style={{ marginBottom: 10, paddingLeft: 0 }}>
                <Lock size={12} style={{ display: 'inline', marginRight: 5 }} />
                受限情报（密级 &gt; {clearance}，切换角色可解锁）
              </div>
              <div className="col" style={{ gap: 10 }}>
                {allLocked.map(item => (
                  <IntelCard
                    key={item.id}
                    item={item}
                    clearance={clearance}
                    saved={false}
                    onSave={handleSave}
                    onIgnore={handleIgnore}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右：概览侧栏 */}
        <div className="col gap-4" style={{ position: 'sticky', top: 16 }}>

          {/* 本周情报主题热度 */}
          <Card className="reveal reveal-1">
            <SectionTitle>本周情报主题热度</SectionTitle>
            <Chart
              build={buildTopicBar}
              height={200}
              deps={[]}
            />
            <div className="t-small text-3" style={{ marginTop: 8, textAlign: 'center' }}>
              热度 = 7 天内该主题推送与命中数之和
            </div>
          </Card>

          {/* 推送命中率 sparkline */}
          <Card className="reveal reveal-2">
            <SectionTitle>推送命中率 · 近 14 天</SectionTitle>
            <div className="row gap-3" style={{ marginBottom: 10, alignItems: 'flex-end' }}>
              <div>
                <div className="kpi-value" style={{ fontSize: 28, lineHeight: 1.1 }}>
                  <span className="mononum">{currentHit}</span>
                  <span className="kpi-unit">%</span>
                </div>
                <div className="t-small text-3" style={{ marginTop: 3 }}>本周命中率</div>
              </div>
              <div style={{ flex: 1 }}>
                <Chart
                  build={buildHitLine}
                  height={52}
                  deps={[]}
                />
              </div>
            </div>
            <div className="row gap-2" style={{ paddingTop: 10, borderTop: '1px solid var(--hairline)' }}>
              <ShieldCheck size={13} style={{ color: 'var(--emerald)' }} />
              <span className="t-small text-2">命中 = 打开或存入知识夹的情报占比</span>
            </div>
          </Card>

          {/* 已存知识夹 */}
          <Card className="reveal reveal-3">
            <SectionTitle right={
              <span className="mononum" style={{ fontSize: 22, fontWeight: 700, color: 'var(--gold)' }}>
                {savedCount}
              </span>
            }>
              已存知识夹
            </SectionTitle>
            <div className="t-small text-2" style={{ lineHeight: 1.7 }}>
              {savedCount === 0
                ? '点击情报卡「存入知识夹」后会在此计数'
                : `本次会话已存 ${savedCount} 条情报到知识夹`}
            </div>
          </Card>

          {/* 权限说明 */}
          <div className="row gap-2" style={{
            padding: '10px 13px',
            borderRadius: 'var(--r-md)',
            background: 'var(--surface-2)',
            border: '1px solid var(--hairline)',
          }}>
            <ShieldCheck size={13} style={{ color: 'var(--emerald)', flexShrink: 0, marginTop: 1 }} />
            <span className="t-small text-2" style={{ lineHeight: 1.6 }}>
              以 <b style={{ color: currentRole?.color }}>{currentRole?.name}（密级 {clearance}）</b> 推送 ·
              切换右上角角色可查看不同权限下的情报流
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
