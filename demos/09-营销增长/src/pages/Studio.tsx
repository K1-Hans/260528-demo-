import { useMemo, useState } from 'react';
import { Sparkles, ImagePlus, ShieldCheck, FileEdit, BarChart2, Wand2 } from 'lucide-react';
import { PageHeader, StatCard, Segmented, EmptyState } from '../components/ui';
import { Panel, ChannelPill, ComplianceBadge } from '../components/sig';
import Chart from '../components/Chart';
import { baseOption, axisStyle, chanColor, accent, DRAW } from '../lib/chartTheme';
import { CREATIVES, STUDIO_KPIS, CHANNEL_MAP } from '../lib/mockData';
import type { Compliance, ChannelId } from '../types';

type ComplianceFilter = 'all' | Compliance;
const COMPLIANCE_FILTERS: { value: ComplianceFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pass', label: '合规' },
  { value: 'warn', label: '待复核' },
  { value: 'block', label: '驳回' },
];

type StyleOption = '写实' | '插画' | '极简' | '品牌调';
type RatioOption = '1:1' | '16:9' | '9:16' | '4:3';

const STYLE_OPTIONS: { value: StyleOption; label: string }[] = [
  { value: '写实', label: '写实' }, { value: '插画', label: '插画' },
  { value: '极简', label: '极简' }, { value: '品牌调', label: '品牌调' },
];
const RATIO_OPTIONS: { value: RatioOption; label: string }[] = [
  { value: '1:1', label: '1:1 方图' }, { value: '16:9', label: '16:9 横版' },
  { value: '9:16', label: '9:16 竖版' }, { value: '4:3', label: '4:3 通用' },
];
const CHANNEL_OPTIONS: { value: ChannelId; label: string }[] = [
  { value: 'rednote', label: '小红书' }, { value: 'douyin', label: '抖音' },
  { value: 'wechat', label: '微信' }, { value: 'feed', label: '信息流' },
  { value: 'kol', label: 'KOL' }, { value: 'private', label: '私域' },
];

const KPI_ICONS = [
  <ImagePlus size={16} />,
  <Sparkles size={16} />,
  <ShieldCheck size={16} />,
  <FileEdit size={16} />,
];

export default function Studio() {
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>('all');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<StyleOption>('写实');
  const [ratio, setRatio] = useState<RatioOption>('1:1');
  const [genChannel, setGenChannel] = useState<ChannelId>('rednote');

  const filteredCreatives = useMemo(
    () => CREATIVES.filter(c => complianceFilter === 'all' || c.compliance === complianceFilter),
    [complianceFilter],
  );

  // 各渠道 CTR 均值（用于横向条形图）
  const channelCtrData = useMemo(() => {
    const map: Record<string, { sum: number; count: number }> = {};
    CREATIVES.forEach(c => {
      if (c.ctr !== undefined) {
        if (!map[c.channel]) map[c.channel] = { sum: 0, count: 0 };
        map[c.channel].sum += c.ctr;
        map[c.channel].count += 1;
      }
    });
    return Object.entries(map)
      .map(([ch, { sum, count }]) => ({ ch: ch as ChannelId, avgCtr: +(sum / count).toFixed(2) }))
      .sort((a, b) => b.avgCtr - a.avgCtr);
  }, []);

  return (
    <div className="page page-wide">
      <PageHeader
        title="创意工坊"
        subtitle="多模态创意生成 + 品牌合规校验 · AI 一键出图/文案/视频 · 全渠道素材管理"
        actions={<span className="tag tag-mono"><Sparkles size={12} style={{ marginRight: 4 }} />AI 生成</span>}
      />

      {/* KPI 带 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {STUDIO_KPIS.map((k, i) => (
          <StatCard key={k.label} {...k} icon={KPI_ICONS[i]} delayClass={`d${i + 1}`} />
        ))}
      </div>

      {/* 多模态生成入口 + 渠道 CTR 图 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 14, marginBottom: 14, alignItems: 'start' }}>

        {/* 生成面板（mock 展示） */}
        <Panel
          title={<><Wand2 size={13} />多模态创意生成</>}
          right={<span className="tag" style={{ color: 'var(--gold)', fontSize: 11 }}>焕影 V3 + 文案助手</span>}
          bodyClass="panel-body"
        >
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="用大白话描述你要的创意，例如：618 大促氛围的焕颜精华产品图，暖色系，突出水光质感，用于小红书种草..."
            rows={3}
            style={{
              width: '100%',
              resize: 'none',
              padding: '10px 12px',
              background: 'var(--surface-2)',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--r-md)',
              color: 'var(--text-1)',
              fontSize: 13,
              fontFamily: "'Geist','PingFang SC',system-ui,sans-serif",
              lineHeight: 1.6,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div className="row gap-3 wrap" style={{ marginTop: 12 }}>
            <div className="col gap-1" style={{ flex: '1 1 160px', minWidth: 0 }}>
              <span className="label" style={{ marginBottom: 4 }}>风格</span>
              <Segmented options={STYLE_OPTIONS} value={style} onChange={setStyle} />
            </div>
            <div className="col gap-1" style={{ flex: '1 1 180px', minWidth: 0 }}>
              <span className="label" style={{ marginBottom: 4 }}>比例</span>
              <Segmented options={RATIO_OPTIONS} value={ratio} onChange={setRatio} />
            </div>
            <div className="col gap-1" style={{ flex: '1 1 180px', minWidth: 0 }}>
              <span className="label" style={{ marginBottom: 4 }}>渠道</span>
              <Segmented options={CHANNEL_OPTIONS} value={genChannel} onChange={setGenChannel} />
            </div>
          </div>
          <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary"
              style={{ minWidth: 96 }}
              onClick={() => {/* mock: no-op */}}
            >
              <Sparkles size={13} style={{ marginRight: 6 }} />生成创意
            </button>
          </div>
        </Panel>

        {/* 渠道 CTR 对比条形图 */}
        <Panel
          title={<><BarChart2 size={13} />各渠道素材 CTR 均值</>}
          bodyClass="panel-body"
        >
          <Chart
            height={200}
            deps={[]}
            build={() => {
              const ax = axisStyle();
              const channels = channelCtrData.map(d => CHANNEL_MAP[d.ch]?.name ?? d.ch);
              const values = channelCtrData.map(d => d.avgCtr);
              const colors = channelCtrData.map(d => chanColor(CHANNEL_MAP[d.ch]?.colorVar ?? '--c1'));
              return {
                ...baseOption(),
                ...DRAW,
                backgroundColor: 'transparent',
                grid: { left: 8, right: 24, top: 12, bottom: 8, containLabel: true },
                xAxis: { type: 'value', ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => `${v}%` } },
                yAxis: { type: 'category', data: channels, ...ax, axisLabel: { ...ax.axisLabel, fontSize: 11 } },
                series: [
                  {
                    type: 'bar',
                    data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [0, 4, 4, 0] } })),
                    barMaxWidth: 18,
                    label: {
                      show: true,
                      position: 'right',
                      color: accent(),
                      fontSize: 11,
                      fontFamily: "'Geist Mono','Geist',monospace",
                      formatter: (p: { value: number }) => `${p.value}%`,
                    },
                  },
                ],
              };
            }}
          />
        </Panel>
      </div>

      {/* 合规筛选 + 创意网格 */}
      <Panel
        title={<><ImagePlus size={13} />创意素材库</>}
        right={
          <Segmented
            options={COMPLIANCE_FILTERS}
            value={complianceFilter}
            onChange={setComplianceFilter}
          />
        }
        bodyClass="panel-body"
      >
        {filteredCreatives.length === 0 ? (
          <EmptyState
            icon={<ImagePlus size={40} />}
            title="该筛选条件下暂无素材"
            desc="切换合规状态或生成新创意"
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
            {filteredCreatives.map(c => (
              <CreativeCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

// ─── 创意卡片 ──────────────────────────────────────────────────────────────────
function CreativeCard({ c }: { c: typeof CREATIVES[number] }) {
  return (
    <div className="creative-card">
      {/* 缩略图区域 */}
      <div style={{ position: 'relative' }}>
        <img
          className={c.ratio === 'wide' ? 'creative-thumb' : 'creative-thumb creative-thumb-sq'}
          src={c.thumb}
          alt={c.title}
          loading="lazy"
        />
        {/* 右上：合规角标 */}
        <div style={{ position: 'absolute', top: 6, right: 6 }}>
          <ComplianceBadge level={c.compliance} />
        </div>
        {/* 左上：AI 生成角标 */}
        {c.genBy === 'ai' && c.model && (
          <div style={{ position: 'absolute', top: 6, left: 6 }}>
            <span className="creative-gen-badge">
              <Sparkles size={10} />{c.model}
            </span>
          </div>
        )}
      </div>

      {/* 卡片 meta */}
      <div className="creative-meta">
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--text-1)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 6,
          }}
        >
          {c.title}
        </div>
        <div className="row spread" style={{ alignItems: 'center' }}>
          <ChannelPill channel={CHANNEL_MAP[c.channel]} sm />
          {c.ctr !== undefined && (
            <span className="mononum" style={{ fontSize: 11.5, color: 'var(--text-2)', fontWeight: 600 }}>
              CTR {c.ctr}%
            </span>
          )}
        </div>
        {/* 驳回：显示合规原因 */}
        {c.compliance === 'block' && c.complianceNote && (
          <div
            style={{
              marginTop: 6,
              padding: '5px 8px',
              background: 'color-mix(in srgb, var(--danger) 9%, transparent)',
              borderRadius: 6,
              fontSize: 11,
              color: 'var(--danger)',
              lineHeight: 1.5,
            }}
          >
            {c.complianceNote}
          </div>
        )}
        {/* 待复核：显示提示 */}
        {c.compliance === 'warn' && c.complianceNote && (
          <div
            style={{
              marginTop: 6,
              padding: '5px 8px',
              background: 'color-mix(in srgb, var(--warning) 9%, transparent)',
              borderRadius: 6,
              fontSize: 11,
              color: 'var(--warning)',
              lineHeight: 1.5,
            }}
          >
            {c.complianceNote}
          </div>
        )}
      </div>
    </div>
  );
}
