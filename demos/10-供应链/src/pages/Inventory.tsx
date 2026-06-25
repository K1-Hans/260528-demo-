import { useMemo, useState } from 'react';
import { Boxes, Warehouse, AlertTriangle, TrendingDown } from 'lucide-react';
import { PageHeader, StatCard } from '../components/ui';
import { Panel, HealthChip } from '../components/sig';
import Chart from '../components/Chart';
import { baseOption, cssVar, healthColor, DRAW } from '../lib/chartTheme';
import {
  HEAT_CELLS, WAREHOUSES, CATEGORIES, INVENTORY_ITEMS, INVENTORY_KPIS,
} from '../lib/mockData';
import type { Health } from '../types';

const KPI_ICONS = [
  <Boxes size={16} />,
  <AlertTriangle size={16} />,
  <TrendingDown size={16} />,
  <Warehouse size={16} />,
];

// 健康分布数据（缺货/断流/积压/正常）
function useHealthDist() {
  return useMemo(() => {
    const counts: Record<Health, number> = { ok: 0, watch: 0, low: 0, broken: 0 };
    HEAT_CELLS.forEach(c => counts[c.health]++);
    return [
      { name: '正常', value: counts.ok, health: 'ok' as Health },
      { name: '积压', value: counts.watch, health: 'watch' as Health },
      { name: '缺货', value: counts.low, health: 'low' as Health },
      { name: '断流', value: counts.broken, health: 'broken' as Health },
    ].filter(d => d.value > 0);
  }, []);
}

export default function Inventory() {
  const [selWarehouse, setSelWarehouse] = useState<string | null>(null);
  const healthDist = useHealthDist();

  const filteredItems = useMemo(() =>
    selWarehouse ? INVENTORY_ITEMS.filter(i => i.warehouse === selWarehouse) : INVENTORY_ITEMS,
    [selWarehouse]
  );

  return (
    <div className="page page-wide">
      <PageHeader
        title="库存健康中台"
        subtitle="仓 × 品类可供天数热力矩阵 · SKU 健康全览 · 缺货/积压实时预警"
        actions={<span className="tag tag-mono"><Warehouse size={12} style={{ marginRight: 4 }} />库存健康</span>}
      />

      {/* KPI 带 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {INVENTORY_KPIS.map((k, i) => (
          <StatCard key={k.label} {...k} icon={KPI_ICONS[i]} delayClass={`d${i + 1}`} />
        ))}
      </div>

      {/* 主体：热力矩阵（签名）+ 健康分布环形 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14, marginBottom: 14, alignItems: 'start' }}>
        {/* 签名：库存健康热力矩阵 */}
        <Panel
          title={<><Boxes size={13} />库存健康热力矩阵 · 仓 × 品类可供天数</>}
          right={<span className="t-small text-3" style={{ fontSize: 11 }}>绿=正常 · 橙=缺货 · 红=断流 · 黄=积压</span>}
        >
          <HeatmapChart />
        </Panel>

        {/* 副图：健康分布环形 */}
        <Panel title={<><AlertTriangle size={13} />健康分布</>}>
          <DonutChart data={healthDist} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12, padding: '0 4px' }}>
            {healthDist.map(d => (
              <div key={d.health} className="row spread" style={{ fontSize: 12 }}>
                <div className="row gap-2">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: healthColor(d.health), flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-2)' }}>{d.name}</span>
                </div>
                <span className="mononum" style={{ color: healthColor(d.health), fontWeight: 600 }}>{d.value} 格</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* SKU 库存表 */}
      <Panel
        title={<><Warehouse size={13} />SKU 库存明细</>}
        right={
          <div className="row gap-2">
            <button
              className="btn btn-sm"
              style={{
                background: selWarehouse === null ? 'var(--surface-1)' : 'transparent',
                color: selWarehouse === null ? 'var(--text-1)' : 'var(--text-3)',
                border: '1px solid var(--hairline)',
              }}
              onClick={() => setSelWarehouse(null)}
            >
              全部
            </button>
            {WAREHOUSES.slice(0, 4).map(w => (
              <button
                key={w}
                className="btn btn-sm"
                style={{
                  background: selWarehouse === w ? 'var(--surface-1)' : 'transparent',
                  color: selWarehouse === w ? 'var(--text-1)' : 'var(--text-3)',
                  border: '1px solid var(--hairline)',
                  fontSize: 11,
                }}
                onClick={() => setSelWarehouse(w === selWarehouse ? null : w)}
              >
                {w.replace(/中心仓|区域仓/, m => m === '中心仓' ? '中仓' : '区仓')}
              </button>
            ))}
            <span className="t-small text-3" style={{ fontSize: 11, marginLeft: 4 }}>
              {filteredItems.length} 条
            </span>
          </div>
        }
      >
        <InventoryTable items={filteredItems} />
      </Panel>
    </div>
  );
}

// ─── 热力矩阵（签名 · heatmap · xAxis=CATEGORIES, yAxis=WAREHOUSES）──────────────
function HeatmapChart() {
  return (
    <Chart
      height={320}
      deps={[]}
      build={() => {
        const text1 = cssVar('--text-1');
        const text3 = cssVar('--text-3');
        const surface1 = cssVar('--surface-1');
        const hairline = cssVar('--hairline');
        const font = "'Geist','PingFang SC',system-ui,sans-serif";

        // 预解析所有 healthColor — 不传 var(--x)，直接传解析后色值
        const colorDanger = healthColor('broken');   // 断流红
        const colorLow = healthColor('low');         // 缺货橙
        const colorOk = healthColor('ok');           // 正常绿
        const colorWatch = healthColor('watch');     // 积压黄

        // data: [catIdx, whIdx, value(可供天数)]
        const data = HEAT_CELLS.map(cell => {
          const catIdx = CATEGORIES.indexOf(cell.category);
          const whIdx = WAREHOUSES.indexOf(cell.warehouse);
          return [catIdx, whIdx, cell.value];
        });

        return {
          ...baseOption(),
          grid: { left: 120, right: 80, top: 16, bottom: 8, containLabel: false },
          tooltip: {
            ...(baseOption().tooltip as object),
            trigger: 'item',
            formatter: (p: { data?: number[] }) => {
              if (!p.data) return '';
              const [catIdx, whIdx, dos] = p.data;
              const cat = CATEGORIES[catIdx] ?? '';
              const wh = WAREHOUSES[whIdx] ?? '';
              const cell = HEAT_CELLS.find(c => c.warehouse === wh && c.category === cat);
              const healthLabel = cell ? { ok: '正常', watch: '积压', low: '缺货', broken: '断流' }[cell.health] : '';
              return `<div style="font-size:12px">
                <div style="font-weight:600;margin-bottom:4px;color:${text1}">${wh}</div>
                <div style="color:${text3}">品类：${cat}</div>
                <div>可供天数：<span style="font-weight:600;color:${text1}">${dos} 天</span></div>
                <div>健康状态：${healthLabel}</div>
              </div>`;
            },
          },
          xAxis: {
            type: 'category',
            data: CATEGORIES,
            position: 'top',
            axisLine: { lineStyle: { color: hairline } },
            axisTick: { show: false },
            axisLabel: { color: text3, fontSize: 12, fontFamily: font },
            splitArea: { show: false },
          },
          yAxis: {
            type: 'category',
            data: WAREHOUSES,
            axisLine: { lineStyle: { color: hairline } },
            axisTick: { show: false },
            axisLabel: { color: text3, fontSize: 11.5, fontFamily: font, width: 108, overflow: 'truncate' },
            splitArea: { show: false },
          },
          visualMap: {
            type: 'piecewise',
            show: false,
            pieces: [
              { min: 0, max: 0, color: colorDanger, label: '断流(0天)' },
              { min: 1, max: 6, color: colorLow, label: '缺货(<7天)' },
              { min: 7, max: 60, color: colorOk, label: '正常(7-60天)' },
              { min: 61, max: 999, color: colorWatch, label: '积压(>60天)' },
            ],
          },
          series: [{
            type: 'heatmap',
            data,
            label: {
              show: true,
              formatter: (p: { data?: number[] }) => {
                const dos = p.data?.[2] ?? 0;
                return dos === 0 ? '断流' : `${dos}天`;
              },
              color: surface1,
              fontSize: 11,
              fontFamily: font,
              fontWeight: 600,
            },
            itemStyle: {
              borderColor: cssVar('--bg-base'),
              borderWidth: 2,
              borderRadius: 4,
            },
            emphasis: {
              itemStyle: { opacity: 0.85, shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.4)' },
            },
            ...DRAW,
          }],
        };
      }}
    />
  );
}

// ─── 健康分布环形图 ────────────────────────────────────────────────────────────
function DonutChart({ data }: { data: { name: string; value: number; health: Health }[] }) {
  return (
    <Chart
      height={180}
      deps={[data.length]}
      build={() => {
        const text1 = cssVar('--text-1');
        const text3 = cssVar('--text-3');
        const surface1 = cssVar('--surface-1');
        const hairline = cssVar('--hairline');
        const font = "'Geist','PingFang SC',system-ui,sans-serif";

        const total = data.reduce((s, d) => s + d.value, 0);
        const pieData = data.map(d => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: healthColor(d.health) },
        }));

        return {
          ...baseOption(),
          grid: undefined,
          tooltip: {
            backgroundColor: surface1,
            borderColor: hairline,
            borderWidth: 1,
            padding: [8, 12],
            textStyle: { color: text1, fontSize: 12, fontFamily: font },
            extraCssText: 'border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.28);',
            trigger: 'item',
            formatter: (p: { name?: string; value?: number }) =>
              `${p.name ?? ''}: <b>${p.value ?? 0}</b> 格 (${total ? ((p.value ?? 0) / total * 100).toFixed(0) : 0}%)`,
          },
          series: [{
            type: 'pie',
            radius: ['50%', '78%'],
            center: ['50%', '50%'],
            data: pieData,
            label: { show: false },
            labelLine: { show: false },
            emphasis: {
              itemStyle: { shadowBlur: 12, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' },
            },
            ...DRAW,
          }],
          graphic: [{
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: `${total}\n格`,
              textAlign: 'center',
              fill: text3,
              fontSize: 13,
              fontFamily: font,
              lineHeight: 18,
            },
          }],
        };
      }}
    />
  );
}

// ─── SKU 库存表 ───────────────────────────────────────────────────────────────
function InventoryTable({ items }: { items: typeof INVENTORY_ITEMS }) {
  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 13 }}>
        该仓库暂无 SKU 数据
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="tbl" style={{ width: '100%', minWidth: 860 }}>
        <thead>
          <tr>
            <th style={{ width: 110 }}>SKU</th>
            <th>品名</th>
            <th style={{ width: 100 }}>仓库</th>
            <th className="td-num" style={{ width: 88 }}>库存</th>
            <th className="td-num" style={{ width: 88 }}>安全库存</th>
            <th className="td-num" style={{ width: 72 }}>在途</th>
            <th className="td-num" style={{ width: 76 }}>可供天数</th>
            <th style={{ width: 80 }}>健康</th>
            <th className="td-num" style={{ width: 72 }}>周转天</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} style={{ background: item.health === 'broken' ? 'color-mix(in srgb, var(--danger) 6%, transparent)' : undefined }}>
              <td>
                <span className="tag tag-mono" style={{ fontSize: 10.5 }}>{item.sku}</span>
              </td>
              <td>
                <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>{item.name}</span>
                <span className="t-small text-3" style={{ marginLeft: 6, fontSize: 10.5 }}>{item.category}</span>
              </td>
              <td>
                <span className="t-small text-3" style={{ fontSize: 11 }}>{item.warehouse.replace(/中心仓|区域仓/, m => m === '中心仓' ? '中仓' : '区仓')}</span>
              </td>
              <td className="td-num">
                <span className="mononum" style={{ fontSize: 13 }}>{item.stock.toLocaleString()}</span>
                {item.stock < item.safetyStock && (
                  <span className="t-small" style={{ color: 'var(--danger)', marginLeft: 4, fontSize: 10 }}>↓安全</span>
                )}
              </td>
              <td className="td-num">
                <span className="mononum text-3" style={{ fontSize: 12 }}>{item.safetyStock.toLocaleString()}</span>
              </td>
              <td className="td-num">
                <span className="mononum" style={{ fontSize: 13, color: item.inTransit > 0 ? 'var(--gold)' : 'var(--text-3)' }}>
                  {item.inTransit.toLocaleString()}
                </span>
              </td>
              <td className="td-num">
                <span
                  className="mononum"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: healthColor(item.health),
                  }}
                >
                  {item.daysOfSupply.toFixed(1)}
                </span>
              </td>
              <td>
                <HealthChip health={item.health} />
              </td>
              <td className="td-num">
                <span className="mononum" style={{ fontSize: 13, color: item.turnover > 45 ? 'var(--warning)' : 'var(--text-2)' }}>
                  {item.turnover}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

