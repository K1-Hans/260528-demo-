import { useState, useMemo } from 'react';
import {
  ShieldAlert, AlertTriangle, TrendingDown, Users,
  CheckCircle2, Clock, BarChart3, MapPin,
} from 'lucide-react';
import { PageHeader, StatCard, SectionTitle } from '../components/ui';
import { Panel, HealthChip, HealthDot } from '../components/sig';
import Chart from '../components/Chart';
import { baseOption, cssVar, accent, healthColor, chanColor, DRAW } from '../lib/chartTheme';
import { SUPPLIERS, SUPPLIER_KPIS } from '../lib/mockData';
import type { Supplier } from '../types';

const KPI_ICONS = [
  <Users size={16} />,
  <ShieldAlert size={16} />,
  <CheckCircle2 size={16} />,
  <AlertTriangle size={16} />,
];

export default function Supplier() {
  const [selId, setSelId] = useState<string>(SUPPLIERS[0].id);
  const [compareId, setCompareId] = useState<string | null>(null);

  const sel = useMemo(() => SUPPLIERS.find(s => s.id === selId) ?? SUPPLIERS[0], [selId]);
  const compare = useMemo(() => compareId ? SUPPLIERS.find(s => s.id === compareId) ?? null : null, [compareId]);

  function handleRowClick(id: string) {
    if (id === selId) return;
    setSelId(id);
    setCompareId(null);
  }

  function handleCompareClick(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (id === selId) return;
    setCompareId(prev => prev === id ? null : id);
  }

  return (
    <div className="page page-wide">
      <PageHeader
        title="供应商风险监控"
        subtitle="供应商准时交付 · 质量 · 财务健康 · 产能弹性 · 合规多维评估 · 断供预警与依赖度管控"
        actions={<span className="tag tag-mono"><ShieldAlert size={12} style={{ marginRight: 4 }} />风险评估</span>}
      />

      {/* KPI 带 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {SUPPLIER_KPIS.map((k, i) => (
          <StatCard key={k.label} {...k} icon={KPI_ICONS[i]} delayClass={`d${i + 1}`} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'start' }}>
        {/* 左：供应商表 + 风险散点 */}
        <div className="col gap-4">
          {/* 供应商列表 */}
          <Panel
            title={<><Users size={13} />供应商风险列表</>}
            right={
              <span className="t-small text-3" style={{ fontSize: 11 }}>
                点选查看雷达 · Shift 对比
              </span>
            }
          >
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ width: '100%', fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <th style={{ width: 28 }}></th>
                    <th>供应商</th>
                    <th>品类</th>
                    <th>区域</th>
                    <th className="td-num">准时率</th>
                    <th className="td-num">质量分</th>
                    <th className="td-num">风险分</th>
                    <th className="td-num">依赖度</th>
                    <th>风险等级</th>
                    <th style={{ width: 48 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {SUPPLIERS.map(s => (
                    <SupplierRow
                      key={s.id}
                      s={s}
                      selected={s.id === selId}
                      comparing={s.id === compareId}
                      onClick={() => handleRowClick(s.id)}
                      onCompare={(e) => handleCompareClick(e, s.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* 风险散点：准时率 x 风险分 y，大小=依赖度，色=riskLevel */}
          <Panel
            title={<><BarChart3 size={13} />供应商风险分布</>}
            right={
              <div className="row gap-3 wrap">
                {(['ok', 'watch', 'broken'] as const).map(h => (
                  <span key={h} className="row gap-1 t-small text-3" style={{ fontSize: 10.5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: healthColor(h), display: 'inline-block' }} />
                    {h === 'ok' ? '正常' : h === 'watch' ? '预警' : '断供'}
                  </span>
                ))}
                <span className="t-small text-3" style={{ fontSize: 10.5 }}>点大小 = 依赖度</span>
              </div>
            }
          >
            <ScatterChart selId={selId} />
          </Panel>
        </div>

        {/* 右：雷达签名 + 供应商信息 */}
        <div className="col gap-4" style={{ position: 'sticky', top: 0 }}>
          <Panel
            title={<><ShieldAlert size={13} />供应商风险雷达</>}
            right={
              <div className="row gap-2">
                <HealthDot health={sel.riskLevel} />
                <span className="t-small" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-1)' }}>{sel.name.split(' · ')[0]}</span>
              </div>
            }
          >
            <RadarChart sel={sel} compare={compare} />

            {/* 供应商信息卡 */}
            <div style={{ marginTop: 14, borderTop: '1px solid var(--hairline)', paddingTop: 14 }}>
              <SupplierDetail s={sel} accent={false} />
            </div>

            {/* 对比供应商 */}
            {compare && (
              <div style={{ marginTop: 12, borderTop: '1px dashed var(--hairline)', paddingTop: 12 }}>
                <div className="row gap-2" style={{ marginBottom: 8 }}>
                  <span style={{ width: 10, height: 2, background: chanColor('--c2'), display: 'inline-block', borderRadius: 1 }} />
                  <span className="t-small text-3" style={{ fontSize: 11 }}>对比：{compare.name.split(' · ')[0]}</span>
                </div>
                <SupplierDetail s={compare} accent />
              </div>
            )}
          </Panel>

          {/* 断供 / 高风险供应商醒目提示 */}
          <HighRiskAlert />
        </div>
      </div>
    </div>
  );
}

// ─── 供应商列表行 ────────────────────────────────────────────────────────────
function SupplierRow({
  s, selected, comparing, onClick, onCompare,
}: {
  s: Supplier;
  selected: boolean;
  comparing: boolean;
  onClick: () => void;
  onCompare: (e: React.MouseEvent) => void;
}) {
  const isCritical = s.riskLevel === 'broken' || s.riskLevel === 'watch';
  return (
    <tr
      onClick={onClick}
      style={{
        cursor: 'pointer',
        background: selected
          ? 'color-mix(in srgb, var(--gold) 9%, transparent)'
          : comparing
            ? 'color-mix(in srgb, var(--info) 7%, transparent)'
            : undefined,
        outline: selected ? '1px solid color-mix(in srgb, var(--gold) 35%, transparent)' : undefined,
      }}
    >
      <td style={{ paddingLeft: 12 }}>
        <HealthDot health={s.riskLevel} />
      </td>
      <td style={{ fontWeight: isCritical ? 600 : 500, color: s.riskLevel === 'broken' ? 'var(--danger)' : 'var(--text-1)', fontSize: 12.5 }}>
        {s.name}
      </td>
      <td className="text-3" style={{ fontSize: 11.5 }}>
        <span className="tag" style={{ fontSize: 10.5 }}>{s.category}</span>
      </td>
      <td className="text-3">
        <span className="row gap-1" style={{ fontSize: 11 }}>
          <MapPin size={11} />{s.region}
        </span>
      </td>
      <td className="td-num mononum" style={{ color: s.onTimeRate < 80 ? 'var(--danger)' : s.onTimeRate < 92 ? 'var(--warning)' : 'var(--success)' }}>
        {s.onTimeRate.toFixed(1)}%
      </td>
      <td className="td-num mononum" style={{ color: s.qualityScore < 80 ? 'var(--danger)' : 'var(--text-2)' }}>
        {s.qualityScore}
      </td>
      <td className="td-num mononum" style={{ color: s.riskScore > 60 ? 'var(--danger)' : s.riskScore > 35 ? 'var(--warning)' : 'var(--success)', fontWeight: 700 }}>
        {s.riskScore}
      </td>
      <td className="td-num mononum text-3" style={{ fontSize: 12 }}>
        {s.dependency}%
      </td>
      <td>
        <HealthChip health={s.riskLevel} />
      </td>
      <td>
        <button
          className="btn btn-sm"
          style={{
            fontSize: 10.5,
            padding: '2px 8px',
            background: comparing ? 'color-mix(in srgb, var(--info) 16%, transparent)' : 'var(--surface-2)',
            color: comparing ? 'var(--info)' : 'var(--text-3)',
            border: `1px solid ${comparing ? 'color-mix(in srgb, var(--info) 30%, transparent)' : 'var(--hairline)'}`,
          }}
          onClick={onCompare}
          title="叠加对比"
        >
          对比
        </button>
      </td>
    </tr>
  );
}

// ─── 供应商雷达图（签名）────────────────────────────────────────────────────
function RadarChart({ sel, compare }: { sel: Supplier; compare: Supplier | null }) {
  return (
    <Chart
      height={260}
      deps={[sel.id, compare?.id ?? '']}
      build={() => {
        const acc = accent();
        const c2 = chanColor('--c2');
        const text3 = cssVar('--text-3');
        const text1 = cssVar('--text-1');
        const hairline = cssVar('--hairline');
        const surface1 = cssVar('--surface-1');
        const font = "'Geist','PingFang SC',system-ui,sans-serif";

        const indicator = sel.radar.map(r => ({ name: r.dim, max: 100 }));

        const series: Record<string, unknown>[] = [
          {
            type: 'radar',
            data: [
              {
                value: sel.radar.map(r => r.value),
                name: sel.name.split(' · ')[0],
                areaStyle: { color: `color-mix(in srgb, ${acc} 22%, transparent)` },
                lineStyle: { color: acc, width: 2 },
                itemStyle: { color: acc },
                symbol: 'circle',
                symbolSize: 5,
                label: {
                  show: false,
                },
              },
            ],
            ...DRAW,
          },
        ];

        if (compare) {
          (series[0].data as unknown[]).push({
            value: compare.radar.map(r => r.value),
            name: compare.name.split(' · ')[0],
            areaStyle: { color: `color-mix(in srgb, ${c2} 16%, transparent)` },
            lineStyle: { color: c2, width: 1.5, type: 'dashed' as const },
            itemStyle: { color: c2 },
            symbol: 'circle',
            symbolSize: 4,
          });
        }

        return {
          ...baseOption(),
          tooltip: {
            backgroundColor: surface1,
            borderColor: hairline,
            borderWidth: 1,
            padding: [9, 13],
            textStyle: { color: text1, fontSize: 12, fontFamily: font },
            extraCssText: 'border-radius:11px;box-shadow:0 10px 34px rgba(0,0,0,.30);',
            trigger: 'item' as const,
          },
          radar: {
            indicator,
            center: ['50%', '52%'],
            radius: '68%',
            startAngle: 90,
            shape: 'polygon',
            axisName: {
              color: text3,
              fontSize: 11.5,
              fontFamily: font,
              fontWeight: 500,
            },
            splitLine: { lineStyle: { color: hairline, type: 'dashed' as const } },
            splitArea: { show: true, areaStyle: { color: ['transparent', `color-mix(in srgb, ${acc} 3%, transparent)`] } },
            axisLine: { lineStyle: { color: hairline } },
          },
          legend: compare
            ? {
                show: true,
                bottom: 0,
                textStyle: { color: text3, fontSize: 11, fontFamily: font },
                itemWidth: 14,
                itemHeight: 4,
                data: [
                  { name: sel.name.split(' · ')[0], itemStyle: { color: acc } },
                  { name: compare.name.split(' · ')[0], itemStyle: { color: c2 } },
                ],
              }
            : { show: false },
          series,
        };
      }}
    />
  );
}

// ─── 风险散点图（准时率 x，风险分 y，symbolSize=依赖度，色=riskLevel）───────
function ScatterChart({ selId }: { selId: string }) {
  return (
    <Chart
      height={220}
      deps={[selId]}
      build={() => {
        const text3 = cssVar('--text-3');
        const hairline = cssVar('--hairline');
        const surface1 = cssVar('--surface-1');
        const text1 = cssVar('--text-1');
        const font = "'Geist','PingFang SC',system-ui,sans-serif";

        const scatterData = SUPPLIERS.map(s => ({
          value: [s.onTimeRate, s.riskScore],
          name: s.name,
          symbolSize: Math.max(10, s.dependency * 0.9),
          itemStyle: {
            color: healthColor(s.riskLevel),
            borderColor: s.id === selId
              ? cssVar('--text-1')
              : 'transparent',
            borderWidth: s.id === selId ? 2 : 0,
            opacity: 0.86,
            shadowBlur: s.riskLevel === 'broken' ? 12 : 6,
            shadowColor: `color-mix(in srgb, ${healthColor(s.riskLevel)} 50%, transparent)`,
          },
          label: {
            show: s.riskLevel === 'broken' || s.riskLevel === 'watch',
            formatter: (p: { name?: string }) => (p.name ?? '').replace(/示例供应商 ([A-Z]).*/, '$1').slice(0, 2),
            position: 'top' as const,
            color: healthColor(s.riskLevel),
            fontSize: 10,
            fontFamily: font,
          },
        }));

        return {
          ...baseOption(),
          tooltip: {
            backgroundColor: surface1,
            borderColor: hairline,
            borderWidth: 1,
            padding: [9, 13],
            textStyle: { color: text1, fontSize: 12, fontFamily: font },
            extraCssText: 'border-radius:11px;box-shadow:0 10px 34px rgba(0,0,0,.30);',
            trigger: 'item' as const,
            formatter: (p: { name?: string; value?: number[] }) =>
              `${p.name ?? ''}<br/>准时率: <b>${(p.value?.[0] ?? 0).toFixed(1)}%</b><br/>风险分: <b>${p.value?.[1] ?? 0}</b>`,
          },
          grid: { left: 44, right: 20, top: 20, bottom: 32, containLabel: false },
          xAxis: {
            type: 'value' as const,
            name: '准时率 %',
            nameTextStyle: { color: text3, fontSize: 10.5, fontFamily: font },
            min: 65,
            max: 100,
            axisLine: { lineStyle: { color: hairline } },
            axisTick: { show: false },
            axisLabel: { color: text3, fontSize: 10.5, fontFamily: font, formatter: (v: number) => `${v}%` },
            splitLine: { lineStyle: { color: hairline, type: 'dashed' as const } },
          },
          yAxis: {
            type: 'value' as const,
            name: '风险分',
            nameTextStyle: { color: text3, fontSize: 10.5, fontFamily: font },
            min: 0,
            max: 100,
            axisLine: { lineStyle: { color: hairline } },
            axisTick: { show: false },
            axisLabel: { color: text3, fontSize: 10.5, fontFamily: font },
            splitLine: { lineStyle: { color: hairline, type: 'dashed' as const } },
          },
          series: [
            {
              type: 'scatter',
              data: scatterData,
              ...DRAW,
            },
          ],
        };
      }}
    />
  );
}

// ─── 供应商详情卡（雷达下方）────────────────────────────────────────────────
function SupplierDetail({ s, accent: isCompare }: { s: Supplier; accent: boolean }) {
  const rows = [
    { label: '准时交付率', value: `${s.onTimeRate.toFixed(1)}%`, colorVar: s.onTimeRate < 80 ? '--danger' : s.onTimeRate < 92 ? '--warning' : '--success' },
    { label: '质量分', value: `${s.qualityScore}`, colorVar: s.qualityScore < 80 ? '--danger' : '--text-2' },
    { label: '综合风险分', value: `${s.riskScore}`, colorVar: s.riskScore > 60 ? '--danger' : s.riskScore > 35 ? '--warning' : '--success' },
    { label: '采购依赖度', value: `${s.dependency}%`, colorVar: s.dependency > 40 ? '--warning' : '--text-2' },
  ];
  return (
    <div>
      <div className="row gap-2" style={{ marginBottom: 10 }}>
        <span className="t-small" style={{ fontSize: 11.5, fontWeight: 600, color: isCompare ? 'var(--info)' : 'var(--gold)' }}>{s.name}</span>
        <span className="tag" style={{ fontSize: 10 }}>{s.category}</span>
        <span className="row gap-1 t-small text-3" style={{ fontSize: 10 }}>
          <MapPin size={10} />{s.region}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
        {rows.map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)' }}>
            <span className="t-small text-3" style={{ fontSize: 10.5 }}>{r.label}</span>
            <span className="mononum" style={{ fontSize: 12.5, fontWeight: 700, color: `var(${r.colorVar})` }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 高风险预警 panel ─────────────────────────────────────────────────────────
function HighRiskAlert() {
  const highRisk = SUPPLIERS.filter(s => s.riskLevel === 'broken' || s.riskLevel === 'watch');
  return (
    <Panel
      title={<><AlertTriangle size={13} />风险供应商预警</>}
      right={<span className="tag" style={{ color: 'var(--danger)', fontSize: 10 }}>{highRisk.length} 家需关注</span>}
    >
      <div className="col gap-2">
        {highRisk.map(s => (
          <AlertCard key={s.id} s={s} />
        ))}
      </div>
    </Panel>
  );
}

function AlertCard({ s }: { s: Supplier }) {
  const isBroken = s.riskLevel === 'broken';
  const borderColor = isBroken ? 'var(--danger)' : 'var(--warning)';
  return (
    <div
      style={{
        padding: '10px 12px',
        background: 'var(--surface-2)',
        borderRadius: 'var(--r-md)',
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      <div className="row spread" style={{ marginBottom: 5 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: isBroken ? 'var(--danger)' : 'var(--warning)' }}>
          {s.name.replace('示例供应商 ', '')}
        </span>
        <HealthChip health={s.riskLevel} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        <div className="row gap-1">
          <Clock size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <span className="t-small text-3" style={{ fontSize: 10.5 }}>准时率 <span className="mononum" style={{ color: s.onTimeRate < 80 ? 'var(--danger)' : 'var(--warning)' }}>{s.onTimeRate.toFixed(1)}%</span></span>
        </div>
        <div className="row gap-1">
          <TrendingDown size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <span className="t-small text-3" style={{ fontSize: 10.5 }}>风险分 <span className="mononum" style={{ color: isBroken ? 'var(--danger)' : 'var(--warning)', fontWeight: 700 }}>{s.riskScore}</span></span>
        </div>
      </div>
      <div style={{ marginTop: 6 }}>
        <SectionTitle right={<span className="mononum text-3" style={{ fontSize: 10 }}>依赖度 {s.dependency}%</span>}>
          <span className="t-small text-3" style={{ fontSize: 10.5 }}>{s.category} · {s.region}</span>
        </SectionTitle>
        <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden', marginTop: 2 }}>
          <div style={{ height: '100%', width: `${s.riskScore}%`, background: borderColor, borderRadius: 2, transition: 'width 0.8s var(--ease)' }} />
        </div>
      </div>
    </div>
  );
}
