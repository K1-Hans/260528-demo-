import { Fragment, useMemo, useState } from 'react';
import { Cpu, ScanLine, ShieldCheck, ShieldX, Activity, Tag, FileWarning } from 'lucide-react';
import { PageHeader, StatCard, ProgressBar } from '../components/ui';
import { Panel, SeverityBadge, ModalityChip, VerdictBar, MediaStage, mediaUrl } from '../components/sig';
import { MeterBar, StatusBadge } from '../components/kit';
import Chart from '../components/Chart';
import {
  baseOption, axisStyle, accent, areaGradient, DRAW, cssVar,
} from '../lib/chartTheme';
import { SYNTHETIC_CASES } from '../lib/mockData';
import type { ModerationItem, SyntheticCase } from '../types';

// ─── verdict 三态色映射 ──────────────────────────────────────────────────────
const VERDICT_COLOR: Record<SyntheticCase['verdict'], string> = {
  genuine: 'var(--sev-safe)',
  suspect: 'var(--sev-mid)',
  synthetic: 'var(--sev-critical)',
};

const VERDICT_LABEL: Record<SyntheticCase['verdict'], string> = {
  genuine: '真实',
  suspect: '疑似合成',
  synthetic: '确认合成',
};

const VERDICT_TONE: Record<SyntheticCase['verdict'], 'good' | 'warn' | 'bad'> = {
  genuine: 'good',
  suspect: 'warn',
  synthetic: 'bad',
};

// ─── 将 SyntheticCase 构造成 MediaStage 接受的 ModerationItem ────────────────
function toModerationItem(c: SyntheticCase): ModerationItem {
  return {
    id: c.id,
    modality: c.modality,
    severity: c.syntheticProb >= 80 ? 'high' : c.syntheticProb >= 60 ? 'mid' : 'safe',
    category: 'AI 合成伪造',
    confidence: c.syntheticProb,
    status: 'pending',
    source: '示例短视频 · 封面',
    author: c.author,
    submittedAt: c.submittedAt,
    waitSec: 0,
    media: c.media,
    blur: c.blur,
    hits: [],
    aiSynthetic: c.syntheticProb,
  };
}

// ─── KPI 汇总 ────────────────────────────────────────────────────────────────
function buildKpis(cases: SyntheticCase[]) {
  const synthetic = cases.filter(c => c.verdict === 'synthetic').length;
  const suspect = cases.filter(c => c.verdict === 'suspect').length;
  const noLabel = cases.filter(c => c.verdict !== 'genuine' && !c.hasLabel).length;
  const avgProb = Math.round(cases.reduce((s, c) => s + c.syntheticProb, 0) / (cases.length || 1));
  return { synthetic, suspect, noLabel, avgProb };
}

// ─── 逐帧合成分折线 chart builder ────────────────────────────────────────────
function buildFrameChart(frameScores: number[]) {
  const gold = accent();
  const sev = cssVar('--sev-high');
  const categories = frameScores.map((_, i) => `F${i + 1}`);

  return () => ({
    ...baseOption(),
    ...DRAW,
    backgroundColor: 'transparent',
    xAxis: {
      type: 'category',
      data: categories,
      ...axisStyle(),
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      ...axisStyle(),
      axisLabel: {
        ...(axisStyle().axisLabel as object),
        formatter: (v: number) => `${v}%`,
      },
    },
    series: [
      {
        type: 'line',
        data: frameScores,
        smooth: 0.4,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: gold, width: 2 },
        itemStyle: { color: (p: { value: number }) => p.value >= 80 ? sev : gold },
        areaStyle: { color: areaGradient(gold) },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [{ yAxis: 75, lineStyle: { color: sev, type: 'dashed', width: 1 }, label: { formatter: '风险阈', color: sev, fontSize: 10 } }],
        },
      },
    ],
    tooltip: {
      ...(baseOption().tooltip as object),
      trigger: 'axis',
      formatter: (params: Array<{ name: string; value: number }>) => {
        const p = params[0];
        return `<span style="color:var(--text-2);font-size:11px">${p.name}</span><br/><b style="color:${p.value >= 80 ? sev : gold}">${p.value}%</b>`;
      },
    },
    grid: { left: 8, right: 20, top: 28, bottom: 8, containLabel: true },
  });
}

// ─── 信号分布雷达 / 条形 chart（用横向柱，信号 score 对比）─────────────────
function buildSignalChart(signals: SyntheticCase['signals']) {
  return () => ({
    ...baseOption(),
    ...DRAW,
    backgroundColor: 'transparent',
    xAxis: {
      type: 'value',
      min: 0,
      max: 100,
      ...axisStyle(),
      axisLabel: {
        ...(axisStyle().axisLabel as object),
        formatter: (v: number) => `${v}%`,
      },
    },
    yAxis: {
      type: 'category',
      data: signals.map(s => s.name),
      ...axisStyle(),
      axisLabel: {
        ...(axisStyle().axisLabel as object),
        width: 88,
        overflow: 'truncate',
      },
    },
    series: [
      {
        type: 'bar',
        data: signals.map(s => ({
          value: s.score,
          itemStyle: {
            color: s.score >= 80 ? cssVar('--sev-high') : s.score >= 60 ? cssVar('--sev-mid') : accent(),
            borderRadius: [0, 4, 4, 0],
          },
        })),
        label: {
          show: true,
          position: 'right',
          color: cssVar('--text-2'),
          fontSize: 11,
          fontFamily: "'Geist Mono', monospace",
          formatter: (p: { value: number }) => `${p.value}%`,
        },
      },
    ],
    tooltip: {
      ...(baseOption().tooltip as object),
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: { left: 8, right: 56, top: 8, bottom: 8, containLabel: true },
  });
}

// ─── 主页面 ─────────────────────────────────────────────────────────────────
export default function Synthetic() {
  const [selId, setSelId] = useState<string>(SYNTHETIC_CASES[0]?.id ?? '');

  const selected = useMemo(
    () => SYNTHETIC_CASES.find(c => c.id === selId) ?? SYNTHETIC_CASES[0],
    [selId],
  );

  const kpis = buildKpis(SYNTHETIC_CASES);

  const probColor =
    (selected?.syntheticProb ?? 0) >= 80 ? 'var(--sev-critical)' :
    (selected?.syntheticProb ?? 0) >= 60 ? 'var(--sev-high)' :
    (selected?.syntheticProb ?? 0) >= 40 ? 'var(--sev-mid)' :
    'var(--sev-safe)';

  return (
    <div className="page page-wide">
      <PageHeader
        title="合成内容 / Deepfake 检测"
        subtitle="AI 生成 · 换脸取证信号 · 逐帧合成分析 · 《网络信息内容生态治理规定》标识办法核验"
        actions={
          <span className="tag tag-mono">
            <ScanLine size={12} style={{ marginRight: 4 }} />
            {SYNTHETIC_CASES.length} 条待核验
          </span>
        }
      />

      {/* KPI 行 */}
      <div className="grid reveal" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 14 }}>
        <StatCard
          label="确认合成"
          raw={kpis.synthetic}
          unit="条"
          icon={<ShieldX size={15} />}
          delayClass="reveal-1"
        />
        <StatCard
          label="疑似合成"
          raw={kpis.suspect}
          unit="条"
          icon={<Activity size={15} />}
          delayClass="reveal-2"
        />
        <StatCard
          label="标识缺失"
          raw={kpis.noLabel}
          unit="条"
          icon={<FileWarning size={15} />}
          delayClass="reveal-3"
        />
        <StatCard
          label="平均合成概率"
          raw={kpis.avgProb}
          unit="%"
          icon={<Cpu size={15} />}
          delayClass="reveal-4"
        />
      </div>

      {/* 三栏工作台 */}
      <div style={{ display: 'grid', gridTemplateColumns: '296px 1fr 360px', gap: 12, alignItems: 'stretch', minHeight: 580 }}>

        {/* 左：检测队列 */}
        <Panel title="检测队列" icon={<ScanLine size={13} />} bodyClass="panel-body-0" style={{ minHeight: 580 }}>
          <div className="col" style={{ padding: 10, gap: 7, maxHeight: 560, overflowY: 'auto' }}>
            {SYNTHETIC_CASES.map(c => (
              <button
                key={c.id}
                className={`film-item ${c.id === selected?.id ? 'sel' : ''}`}
                style={{ borderLeftColor: VERDICT_COLOR[c.verdict], textAlign: 'left' }}
                onClick={() => setSelId(c.id)}
              >
                {/* 缩略图 */}
                <div className="film-thumb" style={{ flexShrink: 0 }}>
                  <img src={mediaUrl(c.id, 120, 120)} alt="" loading="lazy" />
                </div>
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="row spread" style={{ gap: 6 }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>{c.id}</span>
                    <StatusBadge status={VERDICT_LABEL[c.verdict]} tone={VERDICT_TONE[c.verdict]} />
                  </div>
                  <div className="row spread" style={{ marginTop: 5 }}>
                    <ModalityChip modality={c.modality} />
                    <span
                      className="mononum"
                      style={{ fontSize: 11, fontWeight: 700, color: VERDICT_COLOR[c.verdict] }}
                    >
                      {c.syntheticProb}%
                    </span>
                  </div>
                  <div className="t-small text-3" style={{ marginTop: 4 }}>{c.author} · {c.submittedAt}</div>
                </div>
              </button>
            ))}
          </div>
        </Panel>

        {/* 中：媒体审片台 + 逐帧合成分 + 合成总概率 */}
        <Panel title="取证审片台" icon={<Cpu size={13} />} bodyClass="panel-body" style={{ minHeight: 580 }}>
          {selected ? (
            <div className="col" style={{ height: '100%', gap: 14 }}>
              {/* 标题行 */}
              <div className="row spread">
                <div className="row gap-2">
                  <SeverityBadge severity={
                    selected.syntheticProb >= 80 ? 'high' :
                    selected.syntheticProb >= 60 ? 'mid' : 'safe'
                  } />
                  <span className="t-h3">{VERDICT_LABEL[selected.verdict]}</span>
                </div>
                <span className="tag tag-mono">{selected.id}</span>
              </div>

              {/* 媒体台 */}
              <MediaStage
                item={toModerationItem(selected)}
                height={260}
                scanning={selected.verdict !== 'genuine'}
              />

              {/* 合成总概率大数字 */}
              <div
                className="card"
                style={{
                  padding: '12px 16px',
                  background: 'var(--surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div>
                  <div className="label" style={{ marginBottom: 4 }}>合成总概率</div>
                  <div
                    className="mononum"
                    style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: probColor }}
                  >
                    {selected.syntheticProb}
                    <span style={{ fontSize: 18, fontWeight: 500, marginLeft: 2 }}>%</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <VerdictBar
                    confidence={selected.syntheticProb}
                    severity={
                      selected.syntheticProb >= 80 ? 'high' :
                      selected.syntheticProb >= 60 ? 'mid' : 'safe'
                    }
                  />
                  <div className="t-small text-3" style={{ marginTop: 6 }}>
                    {selected.verdict === 'synthetic'
                      ? '多维取证信号交叉确认 · 建议依《标识办法》第 4 条处置'
                      : selected.verdict === 'suspect'
                      ? '部分取证信号触发 · 需人工审片确认'
                      : '未检出有效合成痕迹 · 元数据链路完整'}
                  </div>
                </div>
              </div>

              {/* 逐帧合成分折线 */}
              {selected.frameScores && selected.frameScores.length > 0 ? (
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>
                    逐帧合成分 · {selected.frameScores.length} 帧
                  </div>
                  <Chart
                    build={buildFrameChart(selected.frameScores)}
                    height={130}
                    deps={[selected.id]}
                  />
                </div>
              ) : (
                <div className="card" style={{ padding: '14px 16px', background: 'var(--surface-2)' }}>
                  <div className="t-small text-3">
                    {selected.modality === 'image'
                      ? '静态图片 · 无帧时序数据 · 以信号总分判定'
                      : selected.modality === 'audio'
                      ? '音频内容 · 帧分析由声纹引擎独立处理'
                      : '暂无逐帧数据'}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="t-small text-3" style={{ textAlign: 'center', padding: '60px 20px' }}>
              请选择待核验内容
            </div>
          )}
        </Panel>

        {/* 右：取证信号 + 标识办法核验 */}
        <Panel title="取证信号 · 标识核验" icon={<ShieldCheck size={13} />} bodyClass="panel-body" style={{ minHeight: 580 }}>
          {selected ? (
            <div className="col gap-5">
              {/* 取证信号列表 */}
              <div>
                <div className="label" style={{ marginBottom: 10 }}>
                  取证信号 · {selected.signals.length} 维
                </div>
                <div className="col" style={{ gap: 10 }}>
                  {selected.signals.map(sig => {
                    const color =
                      sig.score >= 80 ? 'var(--sev-high)' :
                      sig.score >= 60 ? 'var(--sev-mid)' :
                      'var(--sev-safe)';
                    return (
                      <Fragment key={sig.name}>
                        <div className="card" style={{ padding: '10px 12px' }}>
                          <div className="row spread" style={{ marginBottom: 6 }}>
                            <span
                              className="t-small"
                              style={{ fontWeight: 600, color: 'var(--text-1)' }}
                            >
                              {sig.name}
                            </span>
                            <span
                              className="mononum"
                              style={{ fontSize: 13, fontWeight: 700, color }}
                            >
                              {sig.score}%
                            </span>
                          </div>
                          <MeterBar pct={sig.score} color={color} />
                          <div className="t-small text-3" style={{ marginTop: 6, lineHeight: 1.5 }}>
                            {sig.desc}
                          </div>
                        </div>
                      </Fragment>
                    );
                  })}
                </div>
              </div>

              {/* 信号横向对比图 */}
              {selected.signals.length > 0 && (
                <div>
                  <div className="label" style={{ marginBottom: 8 }}>信号置信度对比</div>
                  <Chart
                    build={buildSignalChart(selected.signals)}
                    height={Math.max(100, selected.signals.length * 34)}
                    deps={[selected.id]}
                  />
                </div>
              )}

              {/* 标识办法核验 */}
              <div
                className="card"
                style={{
                  padding: '14px 14px',
                  borderLeft: `3px solid ${selected.hasLabel ? 'var(--sev-safe)' : 'var(--danger)'}`,
                  background: 'var(--surface-2)',
                }}
              >
                <div className="row spread" style={{ marginBottom: 8 }}>
                  <div className="row gap-2">
                    <Tag size={13} style={{ color: selected.hasLabel ? 'var(--sev-safe)' : 'var(--danger)' }} />
                    <span className="label">《标识办法》核验</span>
                  </div>
                  {selected.verdict !== 'genuine' && (
                    selected.hasLabel ? (
                      <span
                        className="badge"
                        style={{
                          background: 'color-mix(in srgb, var(--qual) 14%, transparent)',
                          color: 'var(--qual)',
                          border: '1px solid color-mix(in srgb, var(--qual) 30%, transparent)',
                        }}
                      >
                        标识合规
                      </span>
                    ) : (
                      <span
                        className="badge"
                        style={{
                          background: 'color-mix(in srgb, var(--danger) 14%, transparent)',
                          color: 'var(--danger)',
                          border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
                        }}
                      >
                        标识缺失
                      </span>
                    )
                  )}
                </div>

                {selected.verdict === 'genuine' ? (
                  <div className="t-small text-3" style={{ lineHeight: 1.6 }}>
                    未检出合成特征，无需强制标识。
                  </div>
                ) : selected.hasLabel ? (
                  <div className="t-small text-3" style={{ lineHeight: 1.6 }}>
                    内容已携带 AI 生成标识（C2PA 凭证 / 显著文字标注），符合第 4 条要求。建议留痕存档。
                  </div>
                ) : (
                  <div className="col gap-2">
                    <div className="t-small" style={{ color: 'var(--danger)', fontWeight: 600, lineHeight: 1.6 }}>
                      合成内容未附加 AI 生成标识，违反《网络信息内容生态治理规定》及《生成式 AI 标识办法》第 4 条。
                    </div>
                    <div className="t-small text-3" style={{ lineHeight: 1.6 }}>
                      建议处置：限流并要求发布者在 48h 内补充显著标识；逾期则下架处理。
                    </div>
                    <ProgressBar
                      pct={100}
                      color="var(--danger)"
                      height={3}
                    />
                  </div>
                )}
              </div>

              {/* 来源 / 作者 */}
              <div className="card" style={{ padding: '10px 12px', background: 'var(--surface-2)' }}>
                <div className="col gap-1">
                  <div className="t-small row spread">
                    <span className="text-3">发布者</span>
                    <span className="text-2 mono">{selected.author}</span>
                  </div>
                  <div className="t-small row spread">
                    <span className="text-3">提交时间</span>
                    <span className="text-2 mononum">{selected.submittedAt}</span>
                  </div>
                  <div className="t-small row spread">
                    <span className="text-3">模态</span>
                    <ModalityChip modality={selected.modality} />
                  </div>
                  <div className="t-small row spread">
                    <span className="text-3">媒体预览</span>
                    <span className="text-3 mono" style={{ fontSize: 10 }}>
                      {mediaUrl(selected.id, 80, 60).slice(0, 40)}…
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="t-small text-3" style={{ textAlign: 'center', padding: '60px 12px' }}>
              选择内容查看取证信号
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
