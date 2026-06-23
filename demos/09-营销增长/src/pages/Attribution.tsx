import { useMemo, useState } from 'react';
import {
  GitBranch, FlaskConical, BarChart3, TrendingUp, DollarSign, Users, Beaker,
  Trophy, Clock, CheckCircle2,
} from 'lucide-react';
import { PageHeader, StatCard, Segmented } from '../components/ui';
import { Panel } from '../components/sig';
import Chart from '../components/Chart';
import { baseOption, axisStyle, accent, cssVar, chanColor, DRAW, ANIM } from '../lib/chartTheme';
import {
  SANKEY_NODES, SANKEY_LINKS, FUNNEL_STAGES, ATTR_CHANNEL_COMPARE,
  ATTRIBUTION_MODELS, EXPERIMENTS, ATTR_KPIS,
} from '../lib/mockData';
import type { AttributionModel, Experiment } from '../types';

const KPI_ICONS = [
  <DollarSign size={16} />,
  <TrendingUp size={16} />,
  <Users size={16} />,
  <FlaskConical size={16} />,
];

type ModelId = string;

export default function Attribution() {
  const [modelId, setModelId] = useState<ModelId>('m1');
  const selectedModel = useMemo(
    () => ATTRIBUTION_MODELS.find(m => m.id === modelId) ?? ATTRIBUTION_MODELS[0],
    [modelId],
  );
  const modelOptions = ATTRIBUTION_MODELS.map(m => ({ value: m.id, label: m.name }));

  return (
    <div className="page page-wide">
      <PageHeader
        title="归因 ROI 中心"
        subtitle="多触点归因桑基 · 模型对比还原种草价值 · A/B 实验闭环"
        actions={<span className="tag tag-mono"><GitBranch size={12} style={{ marginRight: 4 }} />归因分析</span>}
      />

      {/* KPI 带 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {ATTR_KPIS.map((k, i) => (
          <StatCard key={k.label} {...k} icon={KPI_ICONS[i]} delayClass={`d${i + 1}`} />
        ))}
      </div>

      {/* 主体：上行 = 桑基（签名）+ 漏斗 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14, marginBottom: 14 }}>
        <Panel
          title={<><GitBranch size={13} />多触点归因路径</>}
          right={<span className="t-small text-3">触点流向 · 加购 → 首单 → 复购</span>}
          bodyClass="panel-body"
        >
          <SankeyChart />
        </Panel>

        <Panel title={<><BarChart3 size={13} />转化漏斗</>} bodyClass="panel-body">
          <FunnelChart />
        </Panel>
      </div>

      {/* 下行：模型对比 + 实验卡 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Panel
          title={<><TrendingUp size={13} />归因模型对比</>}
          right={
            <Segmented
              options={modelOptions}
              value={modelId}
              onChange={setModelId}
            />
          }
          bodyClass="panel-body"
        >
          <ModelDesc model={selectedModel} />
          <ChannelCompareChart modelId={modelId} />
        </Panel>

        <Panel
          title={<><Beaker size={13} />A/B 实验</>}
          right={
            <span className="tag" style={{ color: 'var(--warning)' }}>
              {EXPERIMENTS.filter(e => e.status === 'running').length} 进行中
            </span>
          }
          bodyClass="panel-body"
        >
          <div className="col gap-3">
            {EXPERIMENTS.map(e => <ExperimentCard key={e.id} exp={e} />)}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ─── 桑基图（签名·多触点归因路径）────────────────────────────────────────────
function SankeyChart() {
  return (
    <Chart
      height={280}
      deps={[]}
      build={() => {
        const nodes = SANKEY_NODES.map(n => ({
          name: n.name,
          itemStyle: {
            color: n.colorVar
              ? (n.colorVar === '--gold' ? accent() : chanColor(n.colorVar))
              : accent(),
          },
        }));
        const text3 = cssVar('--text-3');
        const text1 = cssVar('--text-1');
        const surface = cssVar('--surface-1');
        const hairline = cssVar('--hairline');
        const font = "'Geist','PingFang SC',system-ui,sans-serif";

        return {
          ...DRAW,
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'item',
            backgroundColor: surface,
            borderColor: hairline,
            borderWidth: 1,
            padding: [9, 13],
            textStyle: { color: text1, fontSize: 12, fontFamily: font },
            extraCssText: 'border-radius:11px;box-shadow:0 10px 34px rgba(0,0,0,.18);',
            formatter: (params: { dataType: string; name: string; value: number }) => {
              if (params.dataType === 'edge') {
                return `${params.name}<br/>流量 <b>${params.value}</b>`;
              }
              return `<b>${params.name}</b>`;
            },
          },
          series: [
            {
              type: 'sankey',
              layout: 'none',
              emphasis: { focus: 'adjacency' },
              data: nodes,
              links: SANKEY_LINKS,
              nodeAlign: 'left',
              orient: 'horizontal',
              nodeGap: 14,
              nodeWidth: 18,
              left: 10,
              right: 10,
              top: 10,
              bottom: 10,
              label: {
                color: text3,
                fontSize: 11,
                fontFamily: font,
              },
              lineStyle: {
                color: 'gradient',
                opacity: 0.4,
                curveness: 0.5,
              },
            },
          ],
        };
      }}
    />
  );
}

// ─── 转化漏斗 ────────────────────────────────────────────────────────────────
function FunnelChart() {
  return (
    <Chart
      height={280}
      deps={[]}
      build={() => {
        const acc = accent();
        const text3 = cssVar('--text-3');
        const text1 = cssVar('--text-1');
        const bgBase = cssVar('--bg-base');
        const surface3 = cssVar('--surface-3');
        const surface = cssVar('--surface-1');
        const hairline = cssVar('--hairline');
        const font = "'Geist','PingFang SC',system-ui,sans-serif";

        const maxVal = FUNNEL_STAGES[0].value;
        const data = FUNNEL_STAGES.map((f, i) => ({
          name: f.name,
          value: f.value,
          itemStyle: {
            color: i === 0
              ? acc
              : `color-mix(in srgb, ${acc} ${100 - i * 13}%, ${surface3})`,
          },
        }));

        return {
          ...ANIM,
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'item',
            backgroundColor: surface,
            borderColor: hairline,
            borderWidth: 1,
            padding: [9, 13],
            textStyle: { color: text1, fontSize: 12, fontFamily: font },
            extraCssText: 'border-radius:11px;box-shadow:0 10px 34px rgba(0,0,0,.18);',
            formatter: (params: { name: string; value: number }) => {
              const pct = ((params.value / maxVal) * 100).toFixed(1);
              return `${params.name}<br/><b>${params.value.toLocaleString()}</b><br/>漏斗比 ${pct}%`;
            },
          },
          series: [
            {
              type: 'funnel',
              left: '10%',
              right: '10%',
              top: 10,
              bottom: 10,
              width: '80%',
              min: 0,
              max: maxVal,
              minSize: '10%',
              maxSize: '100%',
              sort: 'descending',
              gap: 3,
              label: {
                show: true,
                position: 'inside',
                color: bgBase,
                fontSize: 11,
                fontFamily: font,
                formatter: (params: { name: string; value: number }) => {
                  const v = params.value;
                  if (v >= 1000000) return `${params.name}\n${(v / 10000).toFixed(0)}万`;
                  if (v >= 10000) return `${params.name}\n${(v / 10000).toFixed(1)}万`;
                  return `${params.name}\n${v.toLocaleString()}`;
                },
              },
              labelLine: { show: false },
              itemStyle: { borderWidth: 0 },
              data,
              emphasis: {
                label: { color: text3, fontWeight: 700 },
              },
            },
          ],
        };
      }}
    />
  );
}

// ─── 归因模型描述 ─────────────────────────────────────────────────────────────
function ModelDesc({ model }: { model: AttributionModel }) {
  return (
    <div
      style={{
        background: 'var(--surface-2)',
        borderRadius: 'var(--r-md)',
        padding: '10px 12px',
        marginBottom: 14,
        borderLeft: '3px solid var(--gold)',
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3 }}>{model.name}</div>
      <div className="t-small text-3" style={{ lineHeight: 1.5 }}>{model.desc}</div>
      {model.id === 'm1' && (
        <div className="t-small" style={{ marginTop: 6, color: 'var(--warning)', fontSize: 11 }}>
          末次归因高估抖音/搜索等直效渠道，低估小红书/KOL 种草影响力
        </div>
      )}
      {model.id === 'm5' && (
        <div className="t-small" style={{ marginTop: 6, color: 'var(--gold)', fontSize: 11 }}>
          推荐使用 · Shapley 值最真实还原小红书/KOL 种草价值
        </div>
      )}
    </div>
  );
}

// ─── 渠道贡献对比横向条形（末次 vs DDA）──────────────────────────────────────
function ChannelCompareChart({ modelId }: { modelId: string }) {
  return (
    <Chart
      height={220}
      deps={[modelId]}
      build={() => {
        const acc = accent();
        const text3Color = cssVar('--text-3');
        const text1Color = cssVar('--text-1');
        const surface = cssVar('--surface-1');
        const hairline = cssVar('--hairline');
        const font = "'Geist','PingFang SC',system-ui,sans-serif";
        const ax = axisStyle();

        const channels = ATTR_CHANNEL_COMPARE.map(d => d.channel);
        const lastClickData = ATTR_CHANNEL_COMPARE.map(d => d.lastClick);
        const ddaData = ATTR_CHANNEL_COMPARE.map(d => d.dda);

        return {
          ...baseOption(),
          ...DRAW,
          backgroundColor: 'transparent',
          grid: { left: 8, right: 16, top: 28, bottom: 8, containLabel: true },
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: surface,
            borderColor: hairline,
            borderWidth: 1,
            padding: [9, 13],
            textStyle: { color: text1Color, fontSize: 12, fontFamily: font },
            extraCssText: 'border-radius:11px;box-shadow:0 10px 34px rgba(0,0,0,.18);',
            formatter: (params: Array<{ marker: string; seriesName: string; value: number }>) =>
              params.map(p => `${p.marker} ${p.seriesName} <b>${p.value}%</b>`).join('<br/>'),
          },
          legend: {
            data: ['末次互动', '数据驱动 DDA'],
            top: 4,
            right: 0,
            textStyle: { color: text3Color, fontSize: 11, fontFamily: font },
            itemWidth: 12,
            itemHeight: 8,
          },
          xAxis: { type: 'value', ...ax, axisLabel: { ...ax.axisLabel, formatter: '{value}%' } },
          yAxis: { type: 'category', data: channels, ...ax },
          series: [
            {
              name: '末次互动',
              type: 'bar',
              data: lastClickData,
              barGap: '10%',
              barMaxWidth: 14,
              itemStyle: { color: text3Color, borderRadius: [0, 3, 3, 0] },
              label: { show: false },
            },
            {
              name: '数据驱动 DDA',
              type: 'bar',
              data: ddaData,
              barMaxWidth: 14,
              itemStyle: { color: acc, borderRadius: [0, 3, 3, 0] },
              label: {
                show: true,
                position: 'right',
                color: acc,
                fontSize: 10,
                fontFamily: font,
                formatter: '{c}%',
              },
            },
          ],
        };
      }}
    />
  );
}

// ─── A/B 实验卡 ──────────────────────────────────────────────────────────────
const STATUS_META: Record<Experiment['status'], { label: string; color: string; Icon: typeof CheckCircle2 }> = {
  done: { label: '已结束', color: 'var(--success)', Icon: CheckCircle2 },
  running: { label: '进行中', color: 'var(--warning)', Icon: Clock },
  draft: { label: '草稿', color: 'var(--text-3)', Icon: Clock },
};

function ExperimentCard({ exp }: { exp: Experiment }) {
  const { label, color, Icon } = STATUS_META[exp.status];
  const isFinishedWinner = exp.status === 'done' && !!exp.winner;
  const highConf = exp.confidence >= 95;
  const maxCvr = Math.max(...exp.variants.map(v => v.cvr));

  return (
    <div
      className="reveal"
      style={{
        borderRadius: 'var(--r-md)',
        border: isFinishedWinner
          ? '1.5px solid var(--gold)'
          : '1px solid var(--hairline)',
        background: isFinishedWinner
          ? 'color-mix(in srgb, var(--gold) 4%, var(--surface-1))'
          : 'var(--surface-1)',
        padding: '12px 14px',
      }}
    >
      {/* 标题行 */}
      <div className="row spread" style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', flex: 1, marginRight: 8 }}>{exp.name}</span>
        <span className="row gap-1" style={{ fontSize: 11, color, flexShrink: 0 }}>
          <Icon size={11} />{label}
        </span>
      </div>

      {/* 指标 + 胜出 */}
      <div className="row gap-2" style={{ marginBottom: 10 }}>
        <span className="tag" style={{ fontSize: 10 }}>{exp.metric}</span>
        {exp.winner && (
          <span className="row gap-1" style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>
            <Trophy size={11} />胜出：{exp.winner}
          </span>
        )}
      </div>

      {/* 变体 CVR 对比 */}
      <div className="col gap-2" style={{ marginBottom: 10 }}>
        {exp.variants.map(v => {
          const pct = (v.cvr / maxCvr) * 100;
          const isWinnerVariant = exp.winner === v.name;
          return (
            <div key={v.name}>
              <div className="row spread" style={{ marginBottom: 4 }}>
                <span
                  className="t-small"
                  style={{
                    fontSize: 11.5,
                    color: isWinnerVariant ? 'var(--gold)' : 'var(--text-2)',
                    fontWeight: isWinnerVariant ? 600 : 400,
                  }}
                >
                  {v.name}
                  {v.isControl && <span style={{ marginLeft: 4, color: 'var(--text-3)', fontSize: 10 }}>（对照）</span>}
                </span>
                <span
                  className="mononum t-small"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isWinnerVariant ? 'var(--gold)' : 'var(--text-2)',
                  }}
                >
                  {v.cvr}%
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: isWinnerVariant ? 'var(--gold)' : 'var(--text-3)',
                    borderRadius: 3,
                    transition: 'width 0.8s var(--ease)',
                    opacity: isWinnerVariant ? 1 : 0.5,
                  }}
                />
              </div>
              <div className="t-small text-3" style={{ fontSize: 10, marginTop: 2 }}>
                样本 <span className="mononum">{v.sample.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* lift + 置信度 */}
      <div
        className="row gap-3"
        style={{ paddingTop: 8, borderTop: '1px solid var(--hairline)' }}
      >
        <div>
          <div className="t-small text-3" style={{ fontSize: 10, marginBottom: 2 }}>提升效果 (Lift)</div>
          <span
            className="mononum"
            style={{ fontSize: 13, fontWeight: 700, color: exp.lift > 0 ? 'var(--success)' : 'var(--danger)' }}
          >
            +{exp.lift}%
          </span>
        </div>
        <div>
          <div className="t-small text-3" style={{ fontSize: 10, marginBottom: 2 }}>统计置信度</div>
          <span
            className="mononum"
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: highConf ? 'var(--success)' : exp.confidence >= 80 ? 'var(--warning)' : 'var(--text-3)',
            }}
          >
            {exp.confidence}%
          </span>
        </div>
        {!highConf && exp.status === 'running' && (
          <div style={{ marginLeft: 'auto' }}>
            <span className="t-small" style={{ fontSize: 10, color: 'var(--warning)' }}>
              置信度未达 95%，继续观察
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
