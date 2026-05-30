import { useMemo, useState } from 'react';
import {
  MessageSquare, ThumbsUp, Smile, Meh, Frown, Gauge, Mic, Clock,
  Store as StoreIcon, UserRound, Radio, Heart, Hash,
} from 'lucide-react';
import { Card, PageHeader, StatCard, SectionTitle, Badge, Segmented, EmptyState } from '../../components/ui';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar, ANIM } from '../../lib/chartTheme';
import { VOC_POSTS, VOC_TOPICS, VOC_TRANSCRIPTS } from '../../lib/mockData';
import type { Sentiment, VocPlatform, VocPost } from '../../types';

// ─── Sentiment design tokens (semantic, both themes) ─────────────────────────
const SENTIMENT_VAR: Record<Sentiment, string> = {
  positive: 'var(--success)',
  neutral: 'var(--text-3)',
  negative: 'var(--danger)',
};
const SENTIMENT_LABEL: Record<Sentiment, string> = { positive: '正面', neutral: '中性', negative: '负面' };
const SENTIMENT_ICON: Record<Sentiment, React.ReactNode> = {
  positive: <Smile size={12} />, neutral: <Meh size={12} />, negative: <Frown size={12} />,
};

const PLATFORMS: VocPlatform[] = ['小红书', '微博', '懂车帝', '汽车之家', '易车', '试驾录音'];

// ─── Derived analytics (local only — no mockData edits) ──────────────────────
function useVocStats() {
  return useMemo(() => {
    const total = VOC_POSTS.length;
    const counts: Record<Sentiment, number> = { positive: 0, neutral: 0, negative: 0 };
    const byPlatform: Record<string, number> = {};
    for (const p of VOC_POSTS) {
      counts[p.sentiment] += 1;
      byPlatform[p.platform] = (byPlatform[p.platform] ?? 0) + 1;
    }
    const pct = (n: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);
    // NPS-ish net sentiment: (positive% − negative%), mapped to 0–100 promoter-style index.
    const nps = Math.round((counts.positive - counts.negative) / total * 100);
    return {
      total,
      counts,
      posPct: pct(counts.positive),
      neuPct: pct(counts.neutral),
      negPct: pct(counts.negative),
      nps,
      byPlatform,
    };
  }, []);
}

// ─── Charts ──────────────────────────────────────────────────────────────────
const sentimentDoughnut = (counts: Record<Sentiment, number>) => () => {
  const b = baseOption();
  const data = [
    { name: '正面', value: counts.positive, itemStyle: { color: cssVar('--success') } },
    { name: '中性', value: counts.neutral, itemStyle: { color: cssVar('--text-3') } },
    { name: '负面', value: counts.negative, itemStyle: { color: cssVar('--danger') } },
  ];
  return {
    ...b,
    tooltip: { ...(b.tooltip as object), trigger: 'item', formatter: '{b}　<b>{c}</b> 条　({d}%)' },
    legend: {
      bottom: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10,
      textStyle: { color: cssVar('--text-2'), fontSize: 12 },
    },
    series: [{
      type: 'pie', radius: ['52%', '74%'], center: ['50%', '46%'], avoidLabelOverlap: true,
      padAngle: 2, itemStyle: { borderRadius: 6, borderColor: cssVar('--surface-1'), borderWidth: 2 },
      label: { show: true, position: 'center', formatter: '{val|{d}%}\n{sub|正面}', rich: {
        val: { fontSize: 26, fontWeight: 800, color: cssVar('--text-1'), fontFamily: "'Geist','PingFang SC',sans-serif" },
        sub: { fontSize: 11, color: cssVar('--text-3'), padding: [4, 0, 0, 0], fontWeight: 600 },
      } },
      labelLine: { show: false },
      emphasis: { label: { show: true }, scaleSize: 4 },
      data,
      ...ANIM,
    }],
  };
};

const platformBar = (byPlatform: Record<string, number>) => () => {
  const b = baseOption();
  const data = PLATFORMS.map(p => byPlatform[p] ?? 0);
  return {
    ...b,
    tooltip: { ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: { name: string; value: number }[]) => `${p[0].name}　<b>${p[0].value}</b> 条` },
    grid: { left: 8, right: 14, top: 16, bottom: 6, containLabel: true },
    xAxis: { type: 'category', data: PLATFORMS, ...axisStyle(), splitLine: { show: false }, axisLabel: { ...axisStyle().axisLabel, interval: 0, fontSize: 10 } },
    yAxis: { type: 'value', ...axisStyle() },
    series: [{
      type: 'bar', barWidth: '52%',
      data: data.map((v, i) => ({
        value: v,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: i === PLATFORMS.length - 1 ? cssVar('--gold') : cssVar('--c3'),
        },
      })),
      label: { show: true, position: 'top', formatter: '{c}', color: cssVar('--text-3'), fontSize: 11, fontWeight: 600 },
      ...ANIM,
    }],
  };
};

const topicBar = () => {
  const b = baseOption();
  const d = [...VOC_TOPICS].sort((a, z) => a.count - z.count); // ascending → largest on top
  return {
    ...b,
    grid: { left: 8, right: 52, top: 8, bottom: 6, containLabel: true },
    tooltip: { ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: { name: string; value: number }[]) => `${p[0].name}　提及 <b>${p[0].value.toLocaleString()}</b>` },
    xAxis: { type: 'value', axisLabel: { show: false }, splitLine: { show: false }, axisLine: { show: false } },
    yAxis: { type: 'category', data: d.map(x => x.topic), ...axisStyle(), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { ...axisStyle().axisLabel, fontSize: 11, color: cssVar('--text-2') } },
    series: [{
      type: 'bar', barWidth: 11,
      data: d.map(x => ({
        value: x.count,
        itemStyle: { borderRadius: [0, 4, 4, 0], color: x.sentiment === 'positive' ? cssVar('--success') : x.sentiment === 'negative' ? cssVar('--danger') : cssVar('--c8') },
      })),
      label: { show: true, position: 'right', formatter: (p: { value: number }) => p.value.toLocaleString(), color: cssVar('--text-3'), fontSize: 11, fontWeight: 600 },
      ...ANIM,
    }],
  };
};

// 7-day opinion-volume trend, split by sentiment — derived from post timestamps.
const trendOption = () => {
  const b = baseOption();
  const days = ['05-23', '05-24', '05-25', '05-26', '05-27', '05-28', '05-29'];
  const series: Record<Sentiment, number[]> = {
    positive: days.map(() => 0), neutral: days.map(() => 0), negative: days.map(() => 0),
  };
  for (const p of VOC_POSTS) {
    const key = p.time.slice(5); // MM-DD
    const idx = days.indexOf(key);
    if (idx >= 0) series[p.sentiment][idx] += 1;
  }
  const grad = (c: string) => ({ type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: c }, { offset: 1, color: 'transparent' }] });
  return {
    ...b,
    legend: { data: ['正面', '中性', '负面'], top: 0, right: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: cssVar('--text-2'), fontSize: 12 } },
    tooltip: { ...(b.tooltip as object), trigger: 'axis' },
    grid: { left: 8, right: 14, top: 38, bottom: 6, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: days, ...axisStyle(), splitLine: { show: false } },
    yAxis: { type: 'value', ...axisStyle(), minInterval: 1 },
    series: [
      { name: '正面', type: 'line', smooth: true, data: series.positive, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5, color: cssVar('--success') }, itemStyle: { color: cssVar('--success') }, areaStyle: { color: grad('rgba(47,184,122,0.22)') }, ...ANIM },
      { name: '中性', type: 'line', smooth: true, data: series.neutral, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5, color: cssVar('--c8') }, itemStyle: { color: cssVar('--c8') }, ...ANIM },
      { name: '负面', type: 'line', smooth: true, data: series.negative, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5, color: cssVar('--danger') }, itemStyle: { color: cssVar('--danger') }, areaStyle: { color: grad('rgba(226,85,99,0.18)') }, ...ANIM },
    ],
  };
};

// ─── Small components ─────────────────────────────────────────────────────────
function SentimentChip({ s }: { s: Sentiment }) {
  const c = SENTIMENT_VAR[s];
  return (
    <span className="chip" style={{ background: `color-mix(in srgb, ${c} 14%, transparent)`, color: c }}>
      {SENTIMENT_ICON[s]}{SENTIMENT_LABEL[s]}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: VocPlatform }) {
  const isAudio = platform === '试驾录音';
  const color = isAudio ? 'var(--gold)' : 'var(--info)';
  return (
    <span className="badge" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
      {isAudio ? <Mic size={11} /> : <Radio size={11} />}{platform}
    </span>
  );
}

function PostRow({ post, delayClass }: { post: VocPost; delayClass: string }) {
  const c = SENTIMENT_VAR[post.sentiment];
  return (
    <div
      className={`row gap-3 reveal ${delayClass}`}
      style={{ padding: '13px 14px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', borderLeft: `3px solid ${c}`, alignItems: 'flex-start' }}
    >
      <div className="flex-1">
        <div className="row gap-2 wrap" style={{ marginBottom: 6 }}>
          <PlatformBadge platform={post.platform} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{post.author}</span>
          <span className="tag">{post.model}</span>
          <span className="tag" style={{ background: 'transparent', borderColor: 'var(--hairline)' }}>{post.topic}</span>
        </div>
        <div className="t-small" style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>{post.content}</div>
        <div className="row gap-3" style={{ marginTop: 8, color: 'var(--text-3)' }}>
          <span className="row gap-1 tnum" style={{ fontSize: 11 }}><Heart size={11} />{post.likes.toLocaleString()}</span>
          <span className="row gap-1 tnum" style={{ fontSize: 11 }}><Clock size={11} />{post.time}</span>
        </div>
      </div>
      <SentimentChip s={post.sentiment} />
    </div>
  );
}

function TranscriptCard({ t, delayClass }: { t: typeof VOC_TRANSCRIPTS[number]; delayClass: string }) {
  return (
    <div
      className={`card card-hover reveal ${delayClass}`}
      style={{ padding: 16, background: 'var(--surface-2)' }}
    >
      <div className="stripe-top" style={{ background: SENTIMENT_VAR[t.sentiment] }} />
      <div className="spread" style={{ marginBottom: 10 }}>
        <div className="row gap-2">
          <span className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}><Mic size={15} /></span>
          <div className="col">
            <span className="row gap-1" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
              <StoreIcon size={12} style={{ color: 'var(--text-3)' }} />{t.store}
            </span>
            <span className="row gap-2 t-small text-3" style={{ marginTop: 1 }}>
              <span className="row gap-1"><UserRound size={11} />{t.advisor}</span>
              <span>·</span>
              <span>{t.customer}</span>
            </span>
          </div>
        </div>
        <SentimentChip s={t.sentiment} />
      </div>
      <div className="row gap-3" style={{ marginBottom: 10 }}>
        <span className="tag mono tnum" style={{ gap: 4 }}><Clock size={11} />{t.duration}</span>
        <span className="tag">{t.model}</span>
        <span className="tag tnum" style={{ marginLeft: 'auto', background: 'transparent', borderColor: 'var(--hairline)' }}>{t.time}</span>
      </div>
      <div className="t-small" style={{ color: 'var(--text-2)', lineHeight: 1.65, marginBottom: 11 }}>{t.summary}</div>
      <div className="row gap-1 wrap">
        {t.keywords.map(k => (
          <span key={k} className="chip" style={{ background: 'var(--gold-glow)', color: 'var(--gold)', fontSize: 11, padding: '2px 9px' }}>
            <Hash size={10} />{k}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
type PlatformFilter = VocPlatform | 'all';
type SentimentFilter = Sentiment | 'all';

export default function Voc() {
  const stats = useVocStats();
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const [sentiment, setSentiment] = useState<SentimentFilter>('all');

  const filtered = useMemo(
    () => VOC_POSTS.filter(p =>
      (platform === 'all' || p.platform === platform) &&
      (sentiment === 'all' || p.sentiment === sentiment),
    ).sort((a, b) => b.time.localeCompare(a.time) || b.likes - a.likes),
    [platform, sentiment],
  );

  const platformOpts = useMemo(
    () => [{ value: 'all' as PlatformFilter, label: '全部' }, ...PLATFORMS.map(p => ({ value: p as PlatformFilter, label: p }))],
    [],
  );
  const sentimentOpts: { value: SentimentFilter; label: string }[] = [
    { value: 'all', label: '全部' }, { value: 'positive', label: '正面' },
    { value: 'neutral', label: '中性' }, { value: 'negative', label: '负面' },
  ];

  return (
    <div className="page">
      <PageHeader
        title="用户声音 VOC"
        subtitle="试驾录音 + 全网舆情情感分析 · 小红书 / 微博 / 懂车帝 / 汽车之家 / 易车"
        actions={
          <span className="row gap-2 t-small text-3" style={{ letterSpacing: '0.03em' }}>
            <span className="dot-pulse" style={{ background: 'var(--emerald)' }} />
            舆情引擎实时采集 · 近 7 日
          </span>
        }
      />

      {/* KPIs */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(186px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard label="总声量" raw={stats.total} unit="条" icon={<MessageSquare size={16} />} delayClass="reveal-1" />
        <StatCard label="正面占比" raw={stats.posPct} unit="%" icon={<Smile size={16} />} delayClass="reveal-2" />
        <StatCard label="中性占比" raw={stats.neuPct} unit="%" icon={<Meh size={16} />} delayClass="reveal-3" />
        <StatCard label="负面占比" raw={stats.negPct} unit="%" icon={<Frown size={16} />} delayClass="reveal-4" />
        <StatCard label="净推荐指数 NPS" raw={stats.nps} icon={<Gauge size={16} />} delayClass="reveal-5" />
        <StatCard label="试驾录音转写" raw={VOC_TRANSCRIPTS.length} unit="段" icon={<Mic size={16} />} delayClass="reveal-6" />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.4fr', marginBottom: 16 }}>
        <Card className="reveal reveal-1"><SectionTitle>情感分布</SectionTitle><Chart build={sentimentDoughnut(stats.counts)} height={236} /></Card>
        <Card className="reveal reveal-2"><SectionTitle>平台来源分布（条）</SectionTitle><Chart build={platformBar(stats.byPlatform)} height={236} /></Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.4fr', marginBottom: 16 }}>
        <Card className="reveal reveal-3">
          <SectionTitle right={<Badge color="var(--gold)">{VOC_TOPICS.length} 个</Badge>}>热门话题 · 提及量</SectionTitle>
          <Chart build={topicBar} height={244} />
        </Card>
        <Card className="reveal reveal-4"><SectionTitle>近 7 日舆情趋势 · 情感分层</SectionTitle><Chart build={trendOption} height={244} /></Card>
      </div>

      {/* Feed + Transcripts */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <Card className="reveal reveal-5">
          <SectionTitle right={<span className="tnum text-3 t-small">{filtered.length} / {VOC_POSTS.length} 条</span>}>舆情帖子流</SectionTitle>
          <div className="col gap-2" style={{ marginBottom: 14 }}>
            <Segmented options={platformOpts} value={platform} onChange={setPlatform} />
            <Segmented options={sentimentOpts} value={sentiment} onChange={setSentiment} />
          </div>
          <div className="col gap-2" style={{ maxHeight: 540, overflowY: 'auto', paddingRight: 2 }}>
            {filtered.length === 0 ? (
              <EmptyState icon={<MessageSquare size={34} />} title="暂无匹配的舆情" desc="试试切换平台或情感筛选" />
            ) : (
              filtered.map((p, i) => <PostRow key={p.id} post={p} delayClass={`reveal-${Math.min(i + 1, 6)}`} />)
            )}
          </div>
        </Card>

        <Card className="reveal reveal-6">
          <SectionTitle right={<span className="row gap-1 t-small text-3"><ThumbsUp size={12} />内部分析</span>}>试驾录音转写</SectionTitle>
          <div className="col gap-3" style={{ maxHeight: 540, overflowY: 'auto', paddingRight: 2 }}>
            {VOC_TRANSCRIPTS.map((t, i) => <TranscriptCard key={t.id} t={t} delayClass={`reveal-${Math.min(i + 1, 6)}`} />)}
            <div className="row gap-2" style={{ color: 'var(--text-3)', fontSize: 11, paddingTop: 2 }}>
              <Radio size={12} /> 录音经 ASR 转写 + 情感与关键词抽取，仅内部可见
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
