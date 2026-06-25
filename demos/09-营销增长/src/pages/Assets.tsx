import { useMemo, useState } from 'react';
import {
  LayoutGrid, List, Image as ImageIcon, Video, FileText, LayoutTemplate,
  Fingerprint, Download, RefreshCw, Package, Archive,
} from 'lucide-react';
import { PageHeader, StatCard, Segmented, EmptyState } from '../components/ui';
import { Panel, ComplianceTag } from '../components/sig';
import Chart from '../components/Chart';
import { axisStyle, cssVar, chanColor, chartPalette, DRAW } from '../lib/chartTheme';
import { ASSETS, ASSET_KPIS } from '../lib/mockData';
import type { AssetKind } from '../types';

// ─── 筛选器配置 ──────────────────────────────────────────────────────────────
type KindFilter = 'all' | AssetKind;
const KIND_FILTERS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'image', label: '图片' },
  { value: 'video', label: '视频' },
  { value: 'copy', label: '文案' },
  { value: 'template', label: '模板' },
  { value: 'logo', label: 'Logo' },
];

type ViewMode = 'grid' | 'list';

const KPI_ICONS = [
  <Package size={16} />,
  <RefreshCw size={16} />,
  <Archive size={16} />,
  <Archive size={16} />,
];

// 每种资产类型图标占位（无 thumb 时）
const KIND_ICON: Record<AssetKind, React.ReactNode> = {
  image: <ImageIcon size={28} />,
  video: <Video size={28} />,
  copy: <FileText size={28} />,
  template: <LayoutTemplate size={28} />,
  logo: <Fingerprint size={28} />,
};

const KIND_LABEL: Record<AssetKind, string> = {
  image: '图片', video: '视频', copy: '文案', template: '模板', logo: 'Logo',
};

const KIND_ORDER: AssetKind[] = ['image', 'video', 'copy', 'template', 'logo'];

// asset kind → 渠道色 token（canvas 安全，通过 chanColor 预解析）
const KIND_COLOR_VAR: Record<AssetKind, string> = {
  image: '--c1', video: '--c2', copy: '--c3', template: '--c4', logo: '--c5',
};

export default function Assets() {
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const filtered = useMemo(
    () => ASSETS.filter(a => kindFilter === 'all' || a.kind === kindFilter),
    [kindFilter],
  );

  // 复用 TOP 榜（横向条形），按 usage 降序前 6
  const topAssets = useMemo(() => [...ASSETS].sort((a, b) => b.usage - a.usage).slice(0, 6), []);

  return (
    <div className="page page-wide">
      <PageHeader
        title="创意资产库"
        subtitle="品牌素材统一管理 · 跨活动复用追踪 · 合规状态一目了然"
        actions={<span className="tag tag-mono"><Package size={12} style={{ marginRight: 4 }} />资产复用</span>}
      />

      {/* KPI 带 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {ASSET_KPIS.map((k, i) => (
          <StatCard key={k.label} {...k} icon={KPI_ICONS[i]} delayClass={`d${i + 1}`} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14, alignItems: 'start' }}>
        {/* 左：资产网格 / 列表 */}
        <Panel
          title={<><LayoutGrid size={13} />资产网格</>}
          right={
            <div className="row gap-2">
              <Segmented options={KIND_FILTERS} value={kindFilter} onChange={setKindFilter} />
              {/* 视图切换 */}
              <div
                className="row gap-1"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 'var(--r-sm)',
                  padding: 3,
                }}
              >
                <ViewBtn active={viewMode === 'grid'} onClick={() => setViewMode('grid')}>
                  <LayoutGrid size={13} />
                </ViewBtn>
                <ViewBtn active={viewMode === 'list'} onClick={() => setViewMode('list')}>
                  <List size={13} />
                </ViewBtn>
              </div>
            </div>
          }
        >
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Package size={40} />}
              title="该类型暂无资产"
              desc="切换筛选条件或上传新素材"
            />
          ) : viewMode === 'grid' ? (
            <GridView assets={filtered} />
          ) : (
            <ListView assets={filtered} />
          )}
        </Panel>

        {/* 右：图表面板 */}
        <div className="col gap-4">
          {/* 资产类型分布环形图 */}
          <Panel title={<><Archive size={13} />资产类型分布</>} bodyClass="panel-body">
            <Chart
              height={200}
              deps={[]}
              build={() => {
                const palette = chartPalette();
                const text1 = cssVar('--text-1');
                const text3 = cssVar('--text-3');
                const surface1 = cssVar('--surface-1');
                const hairline = cssVar('--hairline');
                const font = "'Geist','PingFang SC',system-ui,sans-serif";

                const kindCounts = KIND_ORDER.map(kind => ({
                  name: KIND_LABEL[kind],
                  value: ASSETS.filter(a => a.kind === kind).length,
                }));

                return {
                  backgroundColor: 'transparent',
                  ...DRAW,
                  tooltip: {
                    trigger: 'item',
                    backgroundColor: surface1,
                    borderColor: hairline,
                    borderWidth: 1,
                    padding: [9, 13],
                    textStyle: { color: text1, fontSize: 12, fontFamily: font },
                    extraCssText: 'border-radius:11px;box-shadow:0 10px 34px rgba(0,0,0,.18);',
                    formatter: '{b}: {c} 件 ({d}%)',
                  },
                  legend: {
                    orient: 'horizontal',
                    bottom: 0,
                    textStyle: { color: text3, fontSize: 11, fontFamily: font },
                    itemWidth: 10,
                    itemHeight: 10,
                  },
                  series: [
                    {
                      type: 'pie',
                      radius: ['42%', '68%'],
                      center: ['50%', '44%'],
                      data: kindCounts.map((d, i) => ({
                        ...d,
                        itemStyle: { color: palette[i % palette.length] },
                      })),
                      label: { show: false },
                      emphasis: {
                        label: { show: true, fontSize: 12, color: text1, fontFamily: font },
                        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,.14)' },
                      },
                    },
                  ],
                };
              }}
            />
          </Panel>

          {/* 复用 TOP 榜横向条形图 */}
          <Panel title={<><RefreshCw size={13} />复用 TOP 榜</>} bodyClass="panel-body">
            <Chart
              height={230}
              deps={[]}
              build={() => {
                const ax = axisStyle();
                const text1 = cssVar('--text-1');
                const text3 = cssVar('--text-3');
                const surface1 = cssVar('--surface-1');
                const hairline = cssVar('--hairline');
                const font = "'Geist','PingFang SC',system-ui,sans-serif";

                return {
                  backgroundColor: 'transparent',
                  ...DRAW,
                  grid: { left: 8, right: 36, top: 8, bottom: 8, containLabel: true },
                  tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'none' },
                    backgroundColor: surface1,
                    borderColor: hairline,
                    borderWidth: 1,
                    padding: [9, 13],
                    textStyle: { color: text1, fontSize: 12, fontFamily: font },
                    extraCssText: 'border-radius:11px;box-shadow:0 10px 34px rgba(0,0,0,.18);',
                    formatter: (params: { name: string; value: number }[]) => {
                      const p = params[0];
                      return `${p.name}<br/><b>${p.value}</b> 次复用`;
                    },
                  },
                  xAxis: { type: 'value', ...ax },
                  yAxis: {
                    type: 'category',
                    data: topAssets.map(a => a.name.length > 9 ? a.name.slice(0, 9) + '…' : a.name),
                    ...ax,
                    axisLabel: { ...ax.axisLabel, fontSize: 10.5 },
                  },
                  series: [
                    {
                      type: 'bar',
                      data: topAssets.map(a => ({
                        value: a.usage,
                        itemStyle: {
                          color: chanColor(KIND_COLOR_VAR[a.kind]),
                          borderRadius: [0, 4, 4, 0],
                        },
                      })),
                      barMaxWidth: 16,
                      label: {
                        show: true,
                        position: 'right',
                        color: text3,
                        fontSize: 11,
                        fontFamily: font,
                        formatter: '{c}',
                      },
                    },
                  ],
                };
              }}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ─── 视图切换按钮 ────────────────────────────────────────────────────────────
function ViewBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="btn btn-sm"
      style={{
        background: active ? 'var(--surface-1)' : 'transparent',
        color: active ? 'var(--text-1)' : 'var(--text-3)',
        border: active ? '1px solid var(--hairline)' : '1px solid transparent',
        boxShadow: active ? 'var(--elev-1)' : 'none',
        padding: '4px 8px',
      }}
    >
      {children}
    </button>
  );
}

// ─── 网格视图 ────────────────────────────────────────────────────────────────
function GridView({ assets }: { assets: typeof ASSETS }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(196px, 1fr))',
        gap: 12,
      }}
    >
      {assets.map((a, i) => (
        <AssetTile key={a.id} asset={a} delay={i} />
      ))}
    </div>
  );
}

// ─── 资产卡（.asset-tile 签名样式）──────────────────────────────────────────
function AssetTile({ asset: a, delay }: { asset: typeof ASSETS[number]; delay: number }) {
  return (
    <div
      className="asset-tile reveal"
      style={{ animationDelay: `${delay * 30}ms`, position: 'relative' }}
    >
      {/* 缩略图区 */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        {a.thumb ? (
          <img
            className="creative-thumb"
            src={a.thumb}
            loading="lazy"
            alt={a.name}
          />
        ) : (
          <div
            className="creative-thumb"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface-3)',
              color: 'var(--text-3)',
            }}
          >
            {KIND_ICON[a.kind]}
          </div>
        )}

        {/* hover 操作浮层（纯展示）*/}
        <div className="asset-tile-actions">
          <button className="btn btn-sm btn-ok" style={{ fontSize: 11 }}>
            <RefreshCw size={11} style={{ marginRight: 3 }} />复用
          </button>
          <button className="btn btn-sm btn-subtle" style={{ fontSize: 11, padding: '4px 8px' }}>
            <Download size={11} />
          </button>
        </div>
      </div>

      {/* 元信息 */}
      <div style={{ padding: '0 2px 2px' }}>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--text-1)',
            marginBottom: 6,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {a.name}
        </div>

        {/* 标签 */}
        <div className="row gap-1 wrap" style={{ marginBottom: 7 }}>
          {a.tags.map(t => (
            <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>
          ))}
        </div>

        {/* 底部：复用次数 + 大小 + 合规 */}
        <div className="row spread" style={{ alignItems: 'center' }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span className="t-small">
              <span className="mononum" style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 13 }}>{a.usage}</span>
              <span className="text-3" style={{ marginLeft: 2, fontSize: 10.5 }}>次复用</span>
            </span>
            <span className="t-small text-3" style={{ fontSize: 10.5 }}>{a.size}</span>
          </div>
          <ComplianceTag level={a.compliance} />
        </div>
      </div>
    </div>
  );
}

// ─── 列表视图 ────────────────────────────────────────────────────────────────
function ListView({ assets }: { assets: typeof ASSETS }) {
  return (
    <div className="col">
      {/* 表头 */}
      <div
        className="row"
        style={{
          padding: '6px 12px',
          borderBottom: '1px solid var(--hairline)',
          marginBottom: 4,
          gap: 8,
        }}
      >
        <span className="label" style={{ flex: 3 }}>资产名称</span>
        <span className="label" style={{ flex: 1, textAlign: 'center' }}>类型</span>
        <span className="label" style={{ flex: 2 }}>标签</span>
        <span className="label" style={{ flex: 1, textAlign: 'right' }}>复用</span>
        <span className="label" style={{ flex: 1, textAlign: 'right' }}>大小</span>
        <span className="label" style={{ flex: 1, textAlign: 'right' }}>合规</span>
        <span className="label" style={{ width: 96, flexShrink: 0, textAlign: 'right' }}>操作</span>
      </div>
      <div className="col" style={{ gap: 1 }}>
        {assets.map((a, i) => (
          <ListRow key={a.id} asset={a} delay={i} />
        ))}
      </div>
    </div>
  );
}

function ListRow({ asset: a, delay }: { asset: typeof ASSETS[number]; delay: number }) {
  return (
    <div
      className="row reveal"
      style={{
        padding: '8px 12px',
        borderRadius: 'var(--r-md)',
        animationDelay: `${delay * 25}ms`,
        gap: 8,
        cursor: 'default',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {/* 资产名 + 小缩图 */}
      <div className="row gap-2" style={{ flex: 3, minWidth: 0, alignItems: 'center' }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--r-sm)',
            overflow: 'hidden',
            flexShrink: 0,
            background: 'var(--surface-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-3)',
          }}
        >
          {a.thumb ? (
            <img
              src={a.thumb}
              loading="lazy"
              alt={a.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ transform: 'scale(0.65)' }}>{KIND_ICON[a.kind]}</span>
          )}
        </div>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--text-1)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {a.name}
        </span>
      </div>

      {/* 类型 */}
      <span style={{ flex: 1, textAlign: 'center' }}>
        <span className="tag" style={{ fontSize: 10.5 }}>{KIND_LABEL[a.kind]}</span>
      </span>

      {/* 标签（最多显示 2 个）*/}
      <div className="row gap-1 wrap" style={{ flex: 2 }}>
        {a.tags.slice(0, 2).map(t => (
          <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>
        ))}
        {a.tags.length > 2 && (
          <span className="t-small text-3">+{a.tags.length - 2}</span>
        )}
      </div>

      {/* 复用次数 */}
      <span className="mononum" style={{ flex: 1, textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
        {a.usage}
      </span>

      {/* 大小 */}
      <span className="t-small text-3" style={{ flex: 1, textAlign: 'right' }}>{a.size}</span>

      {/* 合规 */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <ComplianceTag level={a.compliance} />
      </div>

      {/* 操作（纯展示）*/}
      <div className="row gap-1" style={{ width: 96, flexShrink: 0, justifyContent: 'flex-end' }}>
        <button className="btn btn-sm btn-subtle" style={{ fontSize: 11, padding: '3px 7px' }}>
          <RefreshCw size={11} style={{ marginRight: 2 }} />复用
        </button>
        <button className="btn btn-sm btn-subtle" style={{ fontSize: 11, padding: '3px 7px' }}>
          <Download size={11} />
        </button>
      </div>
    </div>
  );
}
