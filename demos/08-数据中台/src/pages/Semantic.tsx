import { useState } from 'react';
import { Database, Layers, BarChart2, CheckSquare, Square, Table2, Hash } from 'lucide-react';
import { PageHeader, ProgressBar } from '../components/ui';
import { StatusBadge } from '../components/kit';
import { Panel } from '../components/sig';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, cssVar, DRAW } from '../lib/chartTheme';
import { SEMANTIC_GROUPS } from '../lib/mockData';
import type { SemanticEntityGroup, SemanticField, SemKind } from '../types';

// ─── KPI 派生值 ────────────────────────────────────────────────────────────────
const totalFields = SEMANTIC_GROUPS.reduce((s, g) => s + g.fields.length, 0);
const avgCoverage = Math.round(SEMANTIC_GROUPS.reduce((s, g) => s + g.coverage, 0) / SEMANTIC_GROUPS.length);
const governedCount = SEMANTIC_GROUPS.reduce((s, g) => s + g.fields.filter(f => f.governed).length, 0);

// ─── sem-pill kind → label ──────────────────────────────────────────────────
const KIND_LABEL: Record<SemKind, string> = {
  entity: '主体',
  dimension: '维度',
  measure: '度量',
};

const KIND_CLS: Record<SemKind, string> = {
  entity: 'entity',
  dimension: 'dim',
  measure: 'measure',
};

// ─── KPI 顶栏 ──────────────────────────────────────────────────────────────────
function KpiBar() {
  const kpis: { label: string; value: string | number; unit?: string; sub?: string }[] = [
    { label: '语义实体数', value: SEMANTIC_GROUPS.length, unit: '个', sub: '客户 / 贷款 / 获客' },
    { label: '字段总数', value: totalFields, unit: '个', sub: '含维度与度量' },
    { label: '平均覆盖率', value: avgCoverage, unit: '%', sub: '已治理字段占比基准' },
    { label: '已治理字段', value: governedCount, unit: '个', sub: `共 ${totalFields} 个字段` },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
      {kpis.map(k => (
        <div key={k.label} className="card" style={{ padding: '14px 16px' }}>
          <div className="label" style={{ marginBottom: 6 }}>{k.label}</div>
          <div className="row" style={{ alignItems: 'baseline', gap: 4 }}>
            <span className="kpi-value mononum" style={{ fontSize: 26 }}>{k.value}</span>
            {k.unit && <span className="kpi-unit">{k.unit}</span>}
          </div>
          {k.sub && <div className="t-small text-3" style={{ marginTop: 4 }}>{k.sub}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── 实体列表（左栏）─────────────────────────────────────────────────────────
function EntityList({ selected, onSelect }: {
  selected: string;
  onSelect: (entity: string) => void;
}) {
  return (
    <div className="col gap-2">
      {SEMANTIC_GROUPS.map(g => {
        const active = g.entity === selected;
        return (
          <button
            key={g.entity}
            onClick={() => onSelect(g.entity)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              display: 'block',
              padding: '12px 14px',
              borderRadius: 'var(--r-md)',
              background: active ? 'color-mix(in srgb, var(--gold) 9%, var(--surface-2))' : 'var(--surface-1)',
              border: `1px solid ${active ? 'color-mix(in srgb, var(--gold) 40%, transparent)' : 'var(--hairline)'}`,
              transition: 'all 0.18s var(--ease)',
            }}
          >
            {/* 实体标题行 */}
            <div className="row spread" style={{ marginBottom: 8 }}>
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <Database size={13} style={{ color: active ? 'var(--gold)' : 'var(--text-3)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--gold)' : 'var(--text-1)' }}>
                  {g.label}
                </span>
              </div>
              <span className="t-small mononum" style={{ color: 'var(--text-3)' }}>
                {g.coverage}%
              </span>
            </div>

            {/* 物理表名 */}
            <div className="t-small mononum text-3" style={{ marginBottom: 8 }}>
              {g.table}
            </div>

            {/* 数据量 + 字段数 */}
            <div className="row gap-3" style={{ marginBottom: 8 }}>
              <span className="t-small text-3">
                <span className="mononum">{g.rowCount}</span> 行
              </span>
              <span className="t-small text-3">
                <span className="mononum">{g.fields.length}</span> 个字段
              </span>
            </div>

            {/* 覆盖率条 */}
            <ProgressBar
              pct={g.coverage}
              color={active ? 'var(--gold)' : 'var(--text-3)'}
              height={4}
            />
          </button>
        );
      })}
    </div>
  );
}

// ─── 字段表（中栏）──────────────────────────────────────────────────────────
function FieldTable({ group }: { group: SemanticEntityGroup }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="tbl">
        <thead>
          <tr>
            <th>字段名</th>
            <th>SQL 名</th>
            <th>类型</th>
            <th>数据类型</th>
            <th>口径说明</th>
            <th style={{ textAlign: 'center' }}>治理</th>
          </tr>
        </thead>
        <tbody>
          {group.fields.map((f: SemanticField) => (
            <tr key={f.sqlName}>
              <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{f.name}</td>
              <td>
                <span className="t-small mononum" style={{ color: 'var(--text-2)' }}>{f.sqlName}</span>
              </td>
              <td>
                <span className={`sem-pill ${KIND_CLS[f.kind]}`}>
                  {KIND_LABEL[f.kind]}
                </span>
              </td>
              <td>
                <span className="t-small mononum text-3">{f.dataType}</span>
              </td>
              <td style={{ color: 'var(--text-2)', fontSize: 12, maxWidth: 200 }}>{f.desc}</td>
              <td style={{ textAlign: 'center' }}>
                {f.governed
                  ? <StatusBadge status="已治理" tone="good" />
                  : <StatusBadge status="待治理" tone="muted" />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── 实体详情头（中栏顶部）──────────────────────────────────────────────────
function EntityHeader({ group }: { group: SemanticEntityGroup }) {
  const governedFields = group.fields.filter(f => f.governed).length;
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="row spread" style={{ marginBottom: 6 }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <Table2 size={15} style={{ color: 'var(--gold)' }} />
          <span className="t-h3" style={{ color: 'var(--text-1)' }}>{group.label}</span>
          <span className="t-small mononum text-3">{group.table}</span>
        </div>
        <div className="row gap-2">
          <span className="tag tag-mono">
            <Hash size={11} style={{ marginRight: 3 }} />{group.rowCount} 行
          </span>
          <span className="tag">覆盖率 <span className="mononum" style={{ color: 'var(--gold)', marginLeft: 4 }}>{group.coverage}%</span></span>
        </div>
      </div>
      <div className="t-small text-3" style={{ lineHeight: 1.6, marginBottom: 10 }}>{group.desc}</div>
      <div className="row gap-4" style={{ padding: '8px 12px', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <CheckSquare size={13} style={{ color: 'var(--success)' }} />
          <span className="t-small text-2"><span className="mononum">{governedFields}</span> 已治理</span>
        </div>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <Square size={13} style={{ color: 'var(--text-3)' }} />
          <span className="t-small text-2"><span className="mononum">{group.fields.length - governedFields}</span> 待治理</span>
        </div>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <Layers size={13} style={{ color: 'var(--gold)' }} />
          <span className="t-small text-2"><span className="mononum">{group.fields.length}</span> 个字段</span>
        </div>
      </div>
    </div>
  );
}

// ─── 覆盖率横条图（右栏）────────────────────────────────────────────────────
function CoverageChart({ selectedEntity }: { selectedEntity: string }) {
  return (
    <Chart
      height={200}
      deps={[selectedEntity]}
      build={() => {
        const accentColor = cssVar('--gold');
        const text3 = cssVar('--text-3');
        const hairline = cssVar('--hairline');
        const surface1 = cssVar('--surface-1');
        const text1 = cssVar('--text-1');
        const text2 = cssVar('--text-2');
        const font = "'Geist','PingFang SC',system-ui,sans-serif";

        const entities = SEMANTIC_GROUPS.map(g => g.label);
        const coverages = SEMANTIC_GROUPS.map(g => g.coverage);

        return {
          ...baseOption(),
          ...DRAW,
          backgroundColor: 'transparent',
          grid: { left: 8, right: 36, top: 12, bottom: 8, containLabel: true },
          xAxis: {
            type: 'value',
            max: 100,
            ...axisStyle(),
            axisLabel: {
              color: text3,
              fontSize: 10,
              fontFamily: font,
              formatter: (v: number) => `${v}%`,
            },
          },
          yAxis: {
            type: 'category',
            data: entities,
            ...axisStyle(),
            axisLabel: {
              color: text2,
              fontSize: 12,
              fontFamily: font,
            },
          },
          tooltip: {
            backgroundColor: surface1,
            borderColor: hairline,
            borderWidth: 1,
            padding: [9, 13],
            textStyle: { color: text1, fontSize: 12, fontFamily: font },
            extraCssText: 'border-radius:11px;box-shadow:0 10px 34px rgba(0,0,0,.18);',
            formatter: (params: { name: string; value: number }) => `${params.name}：${params.value}% 覆盖率`,
          },
          series: [
            {
              type: 'bar',
              barMaxWidth: 20,
              data: coverages.map((v, i) => ({
                value: v,
                itemStyle: {
                  color: SEMANTIC_GROUPS[i].entity === selectedEntity
                    ? accentColor
                    : `color-mix(in srgb, ${accentColor} 38%, ${cssVar('--surface-3')})`,
                  borderRadius: [0, 4, 4, 0],
                },
              })),
              label: {
                show: true,
                position: 'right',
                color: text3,
                fontSize: 11,
                fontFamily: "'Geist Mono','Geist',sans-serif",
                formatter: (params: { value: number }) => `${params.value}%`,
              },
            },
          ],
        };
      }}
    />
  );
}

// ─── 实体 × 字段种类分布（右栏下方）─────────────────────────────────────────
function KindDistChart({ group }: { group: SemanticEntityGroup }) {
  return (
    <Chart
      height={140}
      deps={[group.entity]}
      build={() => {
        const accentColor = cssVar('--gold');
        const emerald = cssVar('--emerald');
        const text3 = cssVar('--text-3');
        const surface1 = cssVar('--surface-1');
        const hairline = cssVar('--hairline');
        const text1 = cssVar('--text-1');
        const font = "'Geist','PingFang SC',system-ui,sans-serif";

        const entityCount = group.fields.filter(f => f.kind === 'entity').length;
        const dimCount = group.fields.filter(f => f.kind === 'dimension').length;
        const measureCount = group.fields.filter(f => f.kind === 'measure').length;

        return {
          ...baseOption(),
          ...DRAW,
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'item',
            backgroundColor: surface1,
            borderColor: hairline,
            borderWidth: 1,
            padding: [9, 13],
            textStyle: { color: text1, fontSize: 12, fontFamily: font },
            extraCssText: 'border-radius:11px;box-shadow:0 10px 34px rgba(0,0,0,.18);',
            formatter: (params: { name: string; value: number; percent: number }) =>
              `${params.name}：${params.value} 个 (${params.percent}%)`,
          },
          legend: {
            orient: 'vertical',
            right: 4,
            top: 'middle',
            textStyle: { color: text3, fontSize: 11, fontFamily: font },
          },
          series: [
            {
              type: 'pie',
              radius: ['38%', '65%'],
              center: ['38%', '50%'],
              data: [
                { value: entityCount, name: '主体', itemStyle: { color: emerald } },
                { value: dimCount, name: '维度', itemStyle: { color: `color-mix(in srgb, ${accentColor} 55%, ${cssVar('--surface-3')})` } },
                { value: measureCount, name: '度量', itemStyle: { color: accentColor } },
              ],
              label: { show: false },
              emphasis: { scale: true, scaleSize: 6 },
            },
          ],
        };
      }}
    />
  );
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────
export default function Semantic() {
  const [selectedEntity, setSelectedEntity] = useState<string>(SEMANTIC_GROUPS[0].entity);

  const group = SEMANTIC_GROUPS.find(g => g.entity === selectedEntity) ?? SEMANTIC_GROUPS[0];

  return (
    <div className="page page-wide">
      <PageHeader
        title="语义层建模"
        subtitle="实体 / 维度 / 度量结构化建模 · 字段口径治理 · 覆盖率分析"
        actions={
          <span className="tag tag-mono">
            <BarChart2 size={12} style={{ marginRight: 4 }} />语义层驱动
          </span>
        }
      />

      <KpiBar />

      {/* 三栏布局：左=实体列表 · 中=字段表 · 右=图表 */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 260px', gap: 14, alignItems: 'start' }}>

        {/* ── 左：实体列表 ── */}
        <Panel title="语义实体" icon={<Database size={13} />}>
          <EntityList selected={selectedEntity} onSelect={setSelectedEntity} />
        </Panel>

        {/* ── 中：字段表 ── */}
        <Panel
          title={`${group.label} · 字段明细`}
          icon={<Layers size={13} />}
          bodyClass=""
        >
          <div style={{ padding: '0 0 14px' }}>
            <EntityHeader group={group} />
            <FieldTable group={group} />
          </div>
        </Panel>

        {/* ── 右：图表副栏 ── */}
        <div className="col gap-4">
          <Panel title="各实体语义层覆盖率" icon={<BarChart2 size={13} />}>
            <CoverageChart selectedEntity={selectedEntity} />
            <div className="t-small text-3" style={{ marginTop: 8, lineHeight: 1.5 }}>
              演算蓝高亮 = 当前选中实体。覆盖率 = 已治理字段 / 全部字段。
            </div>
          </Panel>

          <Panel title={`${group.label} · 字段种类分布`} icon={<Layers size={13} />}>
            <KindDistChart group={group} />
          </Panel>

          {/* 覆盖率状态摘要 */}
          <Panel title="语义层健康概览" icon={<CheckSquare size={13} />}>
            <div className="col gap-3">
              {SEMANTIC_GROUPS.map(g => (
                <div key={g.entity}>
                  <div className="row spread" style={{ marginBottom: 4 }}>
                    <span className="t-small text-2" style={{ fontWeight: 600 }}>{g.label}</span>
                    <span
                      className="t-small mononum"
                      style={{ color: g.coverage >= 85 ? 'var(--success)' : g.coverage >= 70 ? 'var(--warning)' : 'var(--danger)' }}
                    >
                      {g.coverage}%
                    </span>
                  </div>
                  <ProgressBar
                    pct={g.coverage}
                    color={g.coverage >= 85 ? 'var(--success)' : g.coverage >= 70 ? 'var(--warning)' : 'var(--danger)'}
                    height={5}
                  />
                  <div className="t-small text-3" style={{ marginTop: 4 }}>
                    {g.fields.filter(f => f.governed).length}/{g.fields.length} 字段已治理
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
