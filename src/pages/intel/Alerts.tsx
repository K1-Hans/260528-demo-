import { useMemo, useState } from 'react';
import {
  Radar, AlertTriangle, AlertCircle, Info, Send, Check, Bell,
  MapPin, Clock, Activity, ShieldAlert, CheckCircle2, MessageSquare,
} from 'lucide-react';
import { Card, PageHeader, SectionTitle, Badge, Segmented } from '../../components/ui';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar, ANIM } from '../../lib/chartTheme';
import { ALERTS, REGIONS, MODEL_PROGRESS, SUBSIDIES, COMPETITORS } from '../../lib/mockData';

type Severity = 'high' | 'mid' | 'low';
type Status = 'new' | 'read' | 'handled';

interface Anomaly {
  id: string;
  metric: string;       // 指标
  scope: string;        // 范围(区域/车型)
  severity: Severity;
  deviation: number;    // 偏差%（负=低于预期）
  description: string;  // 自然语言描述
  detectedAt: string;   // 检测时间
  action: string;       // 建议动作
  status: Status;
  source: string;       // 数据来源
}

const SEV = {
  high: { label: '高', color: 'var(--danger)', icon: <AlertTriangle size={13} /> },
  mid: { label: '中', color: 'var(--warning)', icon: <AlertCircle size={13} /> },
  low: { label: '低', color: 'var(--info)', icon: <Info size={13} /> },
} as const;

const STATUS_META = {
  new: { label: '新', color: 'var(--danger)' },
  read: { label: '已读', color: 'var(--text-3)' },
  handled: { label: '已处理', color: 'var(--emerald)' },
} as const;

// map legacy ALERTS level → severity
const LEVEL_TO_SEV: Record<'danger' | 'warn' | 'info', Severity> = { danger: 'high', warn: 'mid', info: 'low' };

const AVG_COMPLETION = Math.round(REGIONS.reduce((s, r) => s + r.completion, 0) / REGIONS.length);

// ─── Build the anomaly radar: seed from ALERTS + derive from cross-domain mock ───
function buildAnomalies(): Anomaly[] {
  const out: Anomaly[] = [];

  // 1) seed from shared ALERTS
  ALERTS.forEach((a, i) => {
    out.push({
      id: `seed-${i}`,
      metric: a.tag,
      scope: a.title,
      severity: LEVEL_TO_SEV[a.level],
      deviation: a.level === 'danger' ? -22 : a.level === 'warn' ? -12 : 8,
      description: a.msg,
      detectedAt: '05-29 08:10',
      action: a.level === 'danger' ? '生成区域冲量操盘动作' : a.level === 'warn' ? '设置政策窗口提醒' : '加入竞品监控简报',
      status: 'new',
      source: '指挥大屏',
    });
  });

  // 2) REGIONS with completion below average → 目标风险
  REGIONS.filter(r => r.completion < AVG_COMPLETION - 4).forEach(r => {
    const dev = +(r.completion - 100).toFixed(1);
    const sev: Severity = r.completion < 75 ? 'high' : r.completion < 85 ? 'mid' : 'low';
    out.push({
      id: `region-${r.region}`,
      metric: '区域目标完成率',
      scope: `${r.region}区`,
      severity: sev,
      deviation: dev,
      description: `${r.region}区目标完成率 ${r.completion}%，低于全国均值 ${AVG_COMPLETION}%（差 ${AVG_COMPLETION - r.completion}pt），订单量 ${r.orders.toLocaleString('zh-CN')} 台，落后年度目标 ${100 - r.completion}%。`,
      detectedAt: '05-29 07:40',
      action: `下发 ${r.region}区冲量作战方案 + 试驾邀约加密`,
      status: 'new',
      source: '指标平台',
    });
  });

  // 3) MODEL_PROGRESS with low achievement → 车型风险
  MODEL_PROGRESS.map(m => ({ ...m, pct: Math.round((m.actual / m.target) * 100) }))
    .filter(m => m.pct < 90)
    .forEach(m => {
      const sev: Severity = m.pct < 80 ? 'high' : 'mid';
      out.push({
        id: `model-${m.model}`,
        metric: '车型目标达成',
        scope: m.model,
        severity: sev,
        deviation: m.pct - 100,
        description: `${m.model} 完成率 ${m.pct}%（实际 ${m.actual.toLocaleString('zh-CN')} / 目标 ${m.target.toLocaleString('zh-CN')} 台），缺口 ${(m.target - m.actual).toLocaleString('zh-CN')} 台，为本月达成最弱车型之一。`,
        detectedAt: '05-29 07:55',
        action: `${m.model} 权益包加码 + 重点门店倾斜`,
        status: 'new',
        source: '指标平台',
      });
    });

  // 4) SUBSIDIES expiring soon → 政策窗口（已知今日 2026-05-29）
  const today = new Date('2026-05-29');
  SUBSIDIES.filter(s => s.status === 'active').forEach(s => {
    const days = Math.ceil((new Date(s.validTo).getTime() - today.getTime()) / 86400000);
    if (days >= 0 && days <= 35) {
      const sev: Severity = days <= 7 ? 'high' : days <= 20 ? 'mid' : 'low';
      out.push({
        id: `subsidy-${s.id}`,
        metric: '补贴政策临期',
        scope: `${s.city} · ${s.targetModels.join('/')}`,
        severity: sev,
        deviation: -days,
        description: `${s.city} ¥${s.amount.toLocaleString('zh-CN')} 补贴将于 ${s.validTo} 截止，剩 ${days} 天窗口期，覆盖 ${s.targetModels.join('、')}，建议把握最后冲量。`,
        detectedAt: '05-29 06:30',
        action: '建立临期补贴客户专项收单',
        status: 'new',
        source: '补贴库',
      });
    }
  });

  // 5) COMPETITORS rising fast → 竞品动态
  COMPETITORS.filter(c => (c.trendPct ?? 0) >= 9).forEach(c => {
    const dev = c.trendPct ?? 0;
    const sev: Severity = dev >= 20 ? 'high' : dev >= 12 ? 'mid' : 'low';
    out.push({
      id: `comp-${c.id}`,
      metric: '竞品销量上涨',
      scope: `${c.brand} ${c.model} · ${c.segment}`,
      severity: sev,
      deviation: dev,
      description: `${c.brand} ${c.model} 月销 ${(c.monthlyVolume ?? 0).toLocaleString('zh-CN')} 台，环比 +${dev}%，在 ${c.segment} 价位（¥${(c.price / 10000).toFixed(1)}万）持续施压，需关注对标车型。`,
      detectedAt: '05-29 06:05',
      action: '更新竞品对比话术 + 差异化卖点投放',
      status: 'new',
      source: '竞品库',
    });
  });

  return out;
}

const SEV_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'high', label: '高危' },
  { value: 'mid', label: '中' },
  { value: 'low', label: '低' },
] as const;
type SevFilter = typeof SEV_FILTERS[number]['value'];

const SEV_ORDER: Record<Severity, number> = { high: 0, mid: 1, low: 2 };

// ─── Chart: anomalies by source (severity-stacked bar) ──────────────────────────
const bySourceOption = (items: Anomaly[]) => {
  const b = baseOption();
  const sources = Array.from(new Set(items.map(a => a.source)));
  const sevs: Severity[] = ['high', 'mid', 'low'];
  const sevLabel: Record<Severity, string> = { high: '高危', mid: '中', low: '低' };
  return {
    ...b,
    legend: { data: sevs.map(s => sevLabel[s]), top: 0, right: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: cssVar('--text-2'), fontSize: 11 } },
    grid: { left: 8, right: 12, top: 34, bottom: 6, containLabel: true },
    tooltip: { ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: sources, ...axisStyle(), splitLine: { show: false } },
    yAxis: { type: 'value', minInterval: 1, ...axisStyle() },
    series: sevs.map(sev => ({
      name: sevLabel[sev], type: 'bar', stack: 'total', barWidth: '52%',
      itemStyle: {
        color: sev === 'high' ? cssVar('--danger') : sev === 'mid' ? cssVar('--warning') : cssVar('--info'),
        borderRadius: sev === 'low' ? [3, 3, 0, 0] : [0, 0, 0, 0],
      },
      data: sources.map(src => items.filter(a => a.source === src && a.severity === sev).length),
      ...ANIM,
    })),
  };
};

export default function Alerts() {
  const [items, setItems] = useState<Anomaly[]>(() =>
    buildAnomalies().sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]),
  );
  const [filter, setFilter] = useState<SevFilter>('all');
  // mock push log (records 推送钉钉/邮件 actions)
  const [pushed, setPushed] = useState<Record<string, string>>({});

  const visible = useMemo(
    () => items.filter(a => filter === 'all' || a.severity === filter),
    [items, filter],
  );

  const todayCount = items.length;
  const highCount = items.filter(a => a.severity === 'high').length;
  const handledCount = items.filter(a => a.status === 'handled').length;
  const newCount = items.filter(a => a.status === 'new').length;

  const setStatus = (id: string, status: Status) =>
    setItems(prev => prev.map(a => (a.id === id ? { ...a, status } : a)));

  const pushVia = (id: string, channel: string) =>
    setPushed(prev => ({ ...prev, [id]: channel }));

  return (
    <div className="page">
      <PageHeader
        title="智能异常报警中心"
        subtitle="2026年5月 · 主动雷达扫描 KPI · 自然语言异常描述 · 一键转操盘动作"
        actions={
          <span className="row gap-2 t-small text-3" style={{ letterSpacing: '0.03em' }}>
            <span className="dot-pulse" style={{ background: 'var(--danger)' }} />雷达运行中 · 实时扫描
          </span>
        }
      />

      {/* ── Summary row ── */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 16 }}>
        <Card className="card-hover reveal reveal-1">
          <div className="spread" style={{ marginBottom: 10 }}>
            <span className="label">今日异常</span>
            <Radar size={16} style={{ color: 'var(--gold)', opacity: 0.7 }} />
          </div>
          <div className="kpi-value">{todayCount}<span className="kpi-unit">条</span></div>
          <div className="t-small text-3" style={{ marginTop: 8 }}>跨 5 个数据源主动检出</div>
        </Card>
        <Card className="card-hover reveal reveal-2">
          <div className="spread" style={{ marginBottom: 10 }}>
            <span className="label">高危异常</span>
            <ShieldAlert size={16} style={{ color: 'var(--danger)', opacity: 0.8 }} />
          </div>
          <div className="kpi-value" style={{ color: 'var(--danger)' }}>{highCount}<span className="kpi-unit">条</span></div>
          <div className="t-small text-3" style={{ marginTop: 8 }}>需立即介入处置</div>
        </Card>
        <Card className="card-hover reveal reveal-3">
          <div className="spread" style={{ marginBottom: 10 }}>
            <span className="label">待处理</span>
            <Bell size={16} style={{ color: 'var(--warning)', opacity: 0.8 }} />
          </div>
          <div className="kpi-value" style={{ color: 'var(--warning)' }}>{newCount}<span className="kpi-unit">条</span></div>
          <div className="t-small text-3" style={{ marginTop: 8 }}>状态为「新」未读</div>
        </Card>
        <Card className="card-hover reveal reveal-4">
          <div className="spread" style={{ marginBottom: 10 }}>
            <span className="label">已处理</span>
            <CheckCircle2 size={16} style={{ color: 'var(--emerald)', opacity: 0.8 }} />
          </div>
          <div className="kpi-value" style={{ color: 'var(--emerald)' }}>{handledCount}<span className="kpi-unit">条</span></div>
          <div className="t-small text-3" style={{ marginTop: 8 }}>已转操盘 / 闭环</div>
        </Card>
      </div>

      {/* ── Feed (left) + chart (right) ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1.7fr 1fr', alignItems: 'start' }}>
        {/* anomaly feed */}
        <Card className="card-pad-0 reveal reveal-2">
          <div className="spread wrap gap-3" style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)' }}>
            <SectionTitle right={<span className="t-small text-3 tnum">{visible.length} 条</span>}>异常信息流</SectionTitle>
            <Segmented options={SEV_FILTERS.map(o => ({ value: o.value, label: o.label }))} value={filter} onChange={setFilter} />
          </div>

          <div className="col" style={{ padding: '12px 20px 20px' }}>
            {visible.length === 0 ? (
              <div className="col" style={{ alignItems: 'center', padding: '48px 20px', color: 'var(--text-3)' }}>
                <CheckCircle2 size={32} style={{ opacity: 0.4, marginBottom: 12 }} />
                <div className="t-h3" style={{ color: 'var(--text-2)', marginBottom: 4 }}>该等级暂无异常</div>
                <div className="t-small">雷达持续扫描中</div>
              </div>
            ) : (
              <div className="col gap-3">
                {visible.map((a, i) => {
                  const sv = SEV[a.severity];
                  const sm = STATUS_META[a.status];
                  const dimmed = a.status !== 'new';
                  return (
                    <div
                      key={a.id}
                      className={`reveal reveal-${Math.min(i + 1, 6)}`}
                      style={{
                        position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-md)',
                        background: a.status === 'new'
                          ? `color-mix(in srgb, ${sv.color} 5%, var(--surface-2))`
                          : 'var(--surface-2)',
                        border: '1px solid var(--hairline)',
                        padding: '14px 16px 14px 18px',
                        opacity: dimmed ? 0.72 : 1,
                        transition: 'opacity var(--dur-base) var(--ease)',
                      }}
                    >
                      {/* severity stripe (left) */}
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: sv.color }} />

                      {/* header */}
                      <div className="row spread wrap gap-2" style={{ marginBottom: 8 }}>
                        <span className="row gap-2">
                          <span style={{ color: sv.color }}>{sv.icon}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{a.metric}</span>
                          <span className="tag"><MapPin size={9} style={{ marginRight: 2 }} />{a.scope}</span>
                        </span>
                        <span className="row gap-2">
                          <span className="chip" style={{ background: `color-mix(in srgb, ${sv.color} 13%, transparent)`, color: sv.color, fontSize: 11 }}>
                            {sv.icon}{sv.label}危
                          </span>
                          <span className="badge" style={{ background: `color-mix(in srgb, ${sm.color} 14%, transparent)`, color: sm.color }}>{sm.label}</span>
                        </span>
                      </div>

                      {/* NL description */}
                      <div className="t-small" style={{ color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 10 }}>{a.description}</div>

                      {/* meta row */}
                      <div className="row gap-4 wrap" style={{ marginBottom: 12 }}>
                        <span className="row gap-1 t-small text-3">
                          <Activity size={11} />偏差
                          <span className="tnum" style={{ color: a.deviation < 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                            {a.deviation > 0 ? '+' : ''}{a.deviation}{a.metric === '补贴政策临期' ? ' 天' : a.metric === '竞品销量上涨' ? '%' : 'pt'}
                          </span>
                        </span>
                        <span className="row gap-1 t-small text-3"><Clock size={11} />{a.detectedAt}</span>
                        <span className="row gap-1 t-small text-3"><Radar size={11} />{a.source}</span>
                      </div>

                      {/* suggested action */}
                      <div
                        className="row gap-2"
                        style={{ padding: '8px 11px', borderRadius: 'var(--r-sm)', background: 'var(--surface-1)', border: '1px solid var(--hairline)', marginBottom: 12 }}
                      >
                        <Send size={12} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                        <span className="t-small" style={{ color: 'var(--text-2)' }}>
                          <span className="text-3">建议动作 · </span>{a.action}
                        </span>
                      </div>

                      {/* action buttons */}
                      <div className="row gap-2 wrap">
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={a.status === 'handled'}
                          onClick={() => setStatus(a.id, 'handled')}
                        >
                          {a.status === 'handled' ? <><Check size={12} />已转操盘</> : <><Send size={12} />转操盘动作</>}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={a.status !== 'new'}
                          onClick={() => setStatus(a.id, 'read')}
                        >
                          <Check size={12} />标记已读
                        </button>
                        <button
                          className="btn btn-subtle btn-sm"
                          onClick={() => pushVia(a.id, '钉钉')}
                        >
                          <MessageSquare size={12} />推送钉钉/邮件
                        </button>
                        {pushed[a.id] && (
                          <span className="row gap-1 t-small" style={{ color: 'var(--emerald)' }}>
                            <CheckCircle2 size={12} />已推送至{pushed[a.id]}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        {/* side: chart + how-it-works */}
        <div className="col gap-4">
          <Card className="reveal reveal-3">
            <SectionTitle right={<Badge color="var(--danger)">{highCount} 高危</Badge>}>异常按数据源 · 分级</SectionTitle>
            <Chart build={() => bySourceOption(items)} height={228} deps={[items.length]} />
          </Card>

          <Card className="reveal reveal-4">
            <SectionTitle>主动雷达 · 检测规则</SectionTitle>
            <div className="col gap-3">
              {[
                { icon: <MapPin size={13} />, t: '区域完成率', d: `低于全国均值 ${AVG_COMPLETION}% 触发，< 75% 判高危` },
                { icon: <Activity size={13} />, t: '车型达成', d: '完成率 < 90% 触发，< 80% 判高危' },
                { icon: <Clock size={13} />, t: '补贴临期', d: '有效期剩余 ≤ 35 天触发，≤ 7 天判高危' },
                { icon: <AlertTriangle size={13} />, t: '竞品上涨', d: '环比 ≥ +9% 触发，≥ +20% 判高危' },
              ].map(r => (
                <div key={r.t} className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--gold)', marginTop: 1, flexShrink: 0 }}>{r.icon}</span>
                  <div className="flex-1">
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{r.t}</div>
                    <div className="t-small text-3" style={{ lineHeight: 1.5 }}>{r.d}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="divider" />
            <div className="row gap-2" style={{ color: 'var(--text-3)', fontSize: 11 }}>
              <Radar size={12} />静态阈值已升级为跨域主动雷达，异常自动路由至操盘动作
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
