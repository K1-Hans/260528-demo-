import { useMemo, useRef, useState } from 'react';
import {
  FileText, FileDown, Presentation, Send, Sparkles, CheckCircle2,
  AlertTriangle, Target, Lightbulb, Gauge, ClipboardList,
} from 'lucide-react';
import { Card, PageHeader, SectionTitle, Badge, Segmented, ProgressBar } from '../../components/ui';
import Chart from '../../components/Chart';
import { baseOption, axisStyle, cssVar, ANIM } from '../../lib/chartTheme';
import { METRICS, MODEL_PROGRESS, REGIONS, ALERTS, FUNNEL } from '../../lib/mockData';
import { fmt } from '../../lib/hooks';
import './Report.css';

// ─── 本地推导（绝不改 mockData）────────────────────────────────────────────────
type ReportType = 'daily' | 'weekly' | 'monthly';
type ScopeId = 'all' | 'L_SERIES' | 'south' | 'mega';

const TYPE_OPTS: { value: ReportType; label: string }[] = [
  { value: 'daily', label: '日报' },
  { value: 'weekly', label: '周报' },
  { value: 'monthly', label: '月报' },
];
const SCOPE_OPTS: { value: ScopeId; label: string }[] = [
  { value: 'all', label: '全国全系' },
  { value: 'L_SERIES', label: 'L 系车型' },
  { value: 'south', label: '华南战区' },
  { value: 'mega', label: 'MEGA 专项' },
];

const TYPE_LABEL: Record<ReportType, string> = { daily: '日报', weekly: '周报', monthly: '月报' };
const TYPE_PERIOD: Record<ReportType, string> = { daily: '2026-05-29', weekly: '2026-05-23 ~ 05-29', monthly: '2026 年 5 月' };
const SCOPE_LABEL: Record<ScopeId, string> = { all: '全国全系', L_SERIES: 'L 系车型', south: '华南战区', mega: 'MEGA 专项' };

// 取真实指标
const m = (label: string) => METRICS.find(x => x.label === label)!;
const ORDERS = m('本月订单');
const DELIVERY = m('本月交付');
const SHARE = m('市占率(NEV)');
const ASP = m('终端均价');
const LEADS = m('商机线索');

// 车型完成率（由 MODEL_PROGRESS 推导）
const MODEL_PCT = MODEL_PROGRESS.map(x => ({ ...x, pct: Math.round((x.actual / x.target) * 100) }));
const LAGGARD = [...MODEL_PCT].sort((a, b) => a.pct - b.pct)[0]; // L7
const LOW_REGION = [...REGIONS].sort((a, b) => a.completion - b.completion).find(r => r.completion < 80)!; // 西北
const SOUTH = REGIONS.find(r => r.region === '华南')!;
const TOTAL_TARGET = MODEL_PROGRESS.reduce((s, x) => s + x.target, 0);
const TOTAL_ACTUAL = MODEL_PROGRESS.reduce((s, x) => s + x.actual, 0);
const OVERALL_PCT = Math.round((TOTAL_ACTUAL / TOTAL_TARGET) * 100);
const CONVERSION = Math.round((FUNNEL[FUNNEL.length - 1].value / FUNNEL[0].value) * 1000) / 10;

// 历史战报列表（本地构造，时间倒序）─────────────────────────────────────────────
interface HistEntry { id: string; title: string; type: ReportType; date: string; author: string; }
const HISTORY: HistEntry[] = [
  { id: 'r1', title: '5 月经营月报 · 全国全系', type: 'monthly', date: '2026-05-29', author: '张明远' },
  { id: 'r2', title: '第 22 周战报 · 华南战区', type: 'weekly', date: '2026-05-28', author: '刘敏' },
  { id: 'r3', title: '5/28 日报 · L 系车型', type: 'daily', date: '2026-05-28', author: '李晓雨' },
  { id: 'r4', title: '5/27 日报 · 全国全系', type: 'daily', date: '2026-05-27', author: '张明远' },
  { id: 'r5', title: '第 21 周战报 · 全国全系', type: 'weekly', date: '2026-05-21', author: '李晓雨' },
  { id: 'r6', title: '618 大促预热专报', type: 'weekly', date: '2026-05-20', author: '王浩' },
  { id: 'r7', title: '5/26 日报 · 华南战区', type: 'daily', date: '2026-05-26', author: '刘敏' },
  { id: 'r8', title: '4 月经营月报 · 全国全系', type: 'monthly', date: '2026-04-30', author: '张明远' },
];

const TYPE_ACCENT: Record<ReportType, string> = { daily: 'var(--info)', weekly: 'var(--emerald)', monthly: 'var(--gold)' };

// ─── 车型完成率 mini bar（mirror Overview 风格）─────────────────────────────────
const modelMiniOption = () => {
  const b = baseOption();
  const d = [...MODEL_PCT].reverse();
  return {
    ...b,
    grid: { left: 8, right: 44, top: 6, bottom: 4, containLabel: true },
    tooltip: {
      ...(b.tooltip as object), trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (p: { name: string; value: number }[]) => `${p[0].name}　完成率 <b>${p[0].value}%</b>`,
    },
    xAxis: { type: 'value', max: 110, axisLabel: { show: false }, splitLine: { show: false }, axisLine: { show: false } },
    yAxis: { type: 'category', data: d.map(x => x.model), ...axisStyle(), axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: 'bar', barWidth: 11,
      data: d.map(x => ({ value: x.pct, itemStyle: { color: x.color, borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: 'right', formatter: '{c}%', color: cssVar('--text-2'), fontSize: 11, fontWeight: 600 },
      ...ANIM,
    }],
  };
};

// ─── 经营概览自然语言摘要 ───────────────────────────────────────────────────────
function summary(type: ReportType): string {
  const head = `本${TYPE_LABEL[type] === '日报' ? '日' : TYPE_LABEL[type] === '周报' ? '周' : '月'}`;
  return `${head}累计订单 ${ORDERS.value} 台（环比 ${ORDERS.change > 0 ? '+' : ''}${ORDERS.change}%），交付 ${DELIVERY.value} 台（${DELIVERY.change > 0 ? '+' : ''}${DELIVERY.change}%）；NEV 市占率 ${SHARE.value}%，环比 +${SHARE.change}pt，稳中有升。终端均价 ${ASP.value} 万（${ASP.change}%），价格战压力延续；商机线索 ${LEADS.value} 条（${LEADS.change}%），需关注上游获客效率。五大车型整体目标完成率 ${OVERALL_PCT}%，线索到交付全链转化 ${CONVERSION}%。`;
}

// 目标进度文案
const progressNote = `全系累计交付 ${fmt(TOTAL_ACTUAL)} 台 / 目标 ${fmt(TOTAL_TARGET)} 台，整体完成率 ${OVERALL_PCT}%。${LAGGARD.model} 完成率仅 ${LAGGARD.pct}%（${fmt(LAGGARD.actual)}/${fmt(LAGGARD.target)} 台）为最大缺口；L6 完成率 ${MODEL_PCT.find(x => x.model === 'L6')!.pct}% 领跑，L9 旗舰完成率 ${MODEL_PCT.find(x => x.model === 'L9')!.pct}% 表现稳健。区域上华南 L7 完成率 ${SOUTH.completion}% 落后，${LOW_REGION.region}区 ${LOW_REGION.completion}% 因门店覆盖不足垫底。`;

// 操盘建议（由 ALERTS 推导）
const ADVICE = [
  `针对 ${LAGGARD.model} 完成率落后（华南 ${SOUTH.completion}%），加密周末试驾邀约，目标转化率 +8pt，补齐 ${fmt(LAGGARD.target - LAGGARD.actual)} 台缺口。`,
  `深圳 ¥12,000 补贴 6/30 截止，主推 L6/L7 落地价优势，把握最后冲量窗口收单。`,
  `L9 对标问界 M9 推家庭权益包（充电桩 + 优先交付），守住大型 SUV 心智与空间优势。`,
  `${LOW_REGION.region}区完成率 ${LOW_REGION.completion}%，规划下沉地级市新店选址，补齐区域均衡短板。`,
];

const LEVEL_COLOR = { danger: 'var(--danger)', warn: 'var(--warning)', info: 'var(--info)' } as const;

// 文档内 KPI chips
const KPI_CHIPS = [
  { label: '订单', value: ORDERS.value, unit: '台', change: ORDERS.change },
  { label: '交付', value: DELIVERY.value, unit: '台', change: DELIVERY.change },
  { label: '市占率', value: SHARE.value, unit: '%', change: SHARE.change },
  { label: '均价', value: ASP.value, unit: '万', change: ASP.change },
  { label: '目标完成', value: String(OVERALL_PCT), unit: '%', change: -2 },
];

export default function Report() {
  const [type, setType] = useState<ReportType>('monthly');
  const [reportScope, setReportScope] = useState<ScopeId>('all');
  const [generated, setGenerated] = useState<{ type: ReportType; scope: ScopeId } | null>({ type: 'monthly', scope: 'all' });
  const [building, setBuilding] = useState(false);
  const [activeHist, setActiveHist] = useState('r1');
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number>(0);

  const sumText = useMemo(() => summary(generated?.type ?? type), [generated, type]);

  const fireToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2400);
  };

  const generate = () => {
    setBuilding(true);
    setGenerated(null);
    window.setTimeout(() => {
      setGenerated({ type, scope: reportScope });
      setBuilding(false);
    }, 620);
  };

  const g = generated;

  return (
    <div className="page">
      <PageHeader
        title="战报中心"
        subtitle="AI 一键生成日报 / 周报 / 月报 · 经营摘要 · 风险预警 · 操盘建议 · 一键导出"
        actions={
          <span className="row gap-2 t-small text-3" style={{ letterSpacing: '0.03em' }}>
            <Sparkles size={14} style={{ color: 'var(--gold)' }} />数据源 · 指标平台 / 竞品库 / 补贴库
          </span>
        }
      />

      <div className="grid gap-4 rpt-layout" style={{ gridTemplateColumns: '288px 1fr', alignItems: 'start' }}>
        {/* ── LEFT · 历史战报 ── */}
        <Card className="reveal reveal-1">
          <SectionTitle right={<Badge color="var(--gold)">{HISTORY.length}</Badge>}>历史战报</SectionTitle>
          <div className="col gap-1">
            {HISTORY.map(h => (
              <button
                key={h.id}
                className={`rpt-hist ${activeHist === h.id ? 'is-active' : ''}`}
                onClick={() => setActiveHist(h.id)}
              >
                <span className="rpt-hist-dot" style={{ background: TYPE_ACCENT[h.type] }} />
                <span className="flex-1" style={{ minWidth: 0 }}>
                  <span className="rpt-hist-title">{h.title}</span>
                  <span className="row gap-2 t-small text-3" style={{ marginTop: 3 }}>
                    <span className="tnum">{h.date}</span>
                    <span className="rpt-type-tag" style={{ color: TYPE_ACCENT[h.type] }}>{TYPE_LABEL[h.type]}</span>
                    <span>· {h.author}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* ── RIGHT · 生成 + 文档 ── */}
        <div className="col gap-4">
          {/* 生成控制条 */}
          <Card className="reveal reveal-2">
            <div className="row spread wrap gap-4">
              <div className="row gap-5 wrap">
                <div className="col gap-2">
                  <span className="label">报告类型</span>
                  <Segmented options={TYPE_OPTS} value={type} onChange={setType} />
                </div>
                <div className="col gap-2">
                  <span className="label">数据范围</span>
                  <Segmented options={SCOPE_OPTS} value={reportScope} onChange={setReportScope} />
                </div>
              </div>
              <button className="btn btn-primary" style={{ alignSelf: 'flex-end', padding: '10px 20px' }} onClick={generate} disabled={building}>
                <Sparkles size={15} />{building ? '生成中…' : '生成战报'}
              </button>
            </div>
          </Card>

          {/* 文档卡 */}
          {building && (
            <Card className="fade-in">
              <div className="col gap-3" style={{ padding: '12px 4px' }}>
                <div className="skeleton" style={{ height: 26, width: '46%' }} />
                <div className="skeleton" style={{ height: 14, width: '92%' }} />
                <div className="skeleton" style={{ height: 14, width: '88%' }} />
                <div className="skeleton" style={{ height: 14, width: '64%' }} />
              </div>
            </Card>
          )}

          {!building && g && (
            <Card className="reveal reveal-3 rpt-doc">
              {/* 文档头 */}
              <div className="rpt-doc-head">
                <div className="col gap-2">
                  <span className="row gap-2 label" style={{ color: TYPE_ACCENT[g.type] }}>
                    <FileText size={13} />理想汽车销售策略 · 经营{TYPE_LABEL[g.type]}
                  </span>
                  <h2 className="rpt-doc-title">{SCOPE_LABEL[g.scope]} · {TYPE_LABEL[g.type]}</h2>
                  <span className="row gap-3 t-small text-3 tnum">
                    <span>报告期 {TYPE_PERIOD[g.type]}</span>
                    <span>·</span>
                    <span>生成 2026-05-29 09:32</span>
                    <span>·</span>
                    <span>制表 张明远</span>
                  </span>
                </div>
                <span className="rpt-auto-tag"><Sparkles size={12} />AI 自动生成</span>
              </div>

              {/* KPI chips */}
              <div className="rpt-chips">
                {KPI_CHIPS.map(c => (
                  <div key={c.label} className="rpt-chip">
                    <span className="rpt-chip-label">{c.label}</span>
                    <span className="rpt-chip-val tnum">{c.value}<span className="rpt-chip-unit">{c.unit}</span></span>
                    <span className={`rpt-chip-delta tnum ${c.change >= 0 ? 'trend-up' : 'trend-down'}`}>
                      {c.change >= 0 ? '+' : ''}{c.change}%
                    </span>
                  </div>
                ))}
              </div>

              <div className="divider-gold" />

              {/* 经营概览 */}
              <Section icon={<Gauge size={15} />} idx="01" title="经营概览">
                <p className="rpt-para">{sumText}</p>
              </Section>

              {/* 目标进度 */}
              <Section icon={<Target size={15} />} idx="02" title="目标进度">
                <p className="rpt-para">{progressNote}</p>
                <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 14, alignItems: 'center' }}>
                  <div className="col gap-3">
                    {MODEL_PCT.map(x => (
                      <div key={x.model} className="col gap-1">
                        <div className="row spread">
                          <span className="t-small" style={{ color: 'var(--text-2)', fontWeight: 600 }}>{x.model}</span>
                          <span className="tnum t-small" style={{ color: x.pct < 80 ? 'var(--danger)' : 'var(--text-1)', fontWeight: 700 }}>{x.pct}%</span>
                        </div>
                        <ProgressBar pct={x.pct} color={x.color} height={6} />
                      </div>
                    ))}
                  </div>
                  <div className="rpt-mini-chart">
                    <span className="label" style={{ marginBottom: 8, display: 'block' }}>车型目标完成率</span>
                    <Chart build={modelMiniOption} height={172} deps={[g.type, g.scope]} />
                  </div>
                </div>
              </Section>

              {/* 风险预警 */}
              <Section icon={<AlertTriangle size={15} />} idx="03" title="风险预警" right={<Badge color="var(--danger)">{ALERTS.length} 条</Badge>}>
                <div className="col gap-2">
                  {ALERTS.map((a, i) => (
                    <div key={i} className="rpt-alert" style={{ borderLeft: `3px solid ${LEVEL_COLOR[a.level]}` }}>
                      <AlertTriangle size={13} style={{ color: LEVEL_COLOR[a.level], flexShrink: 0, marginTop: 2 }} />
                      <div className="flex-1">
                        <div className="row spread" style={{ marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{a.title}</span>
                          <span className="tag" style={{ fontSize: 10 }}>{a.tag}</span>
                        </div>
                        <div className="t-small text-3" style={{ lineHeight: 1.5 }}>{a.msg}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* 操盘建议 */}
              <Section icon={<Lightbulb size={15} />} idx="04" title="操盘建议">
                <ol className="rpt-advice">
                  {ADVICE.map((t, i) => (
                    <li key={i}>
                      <span className="rpt-advice-num">{i + 1}</span>
                      <span className="t-body" style={{ color: 'var(--text-2)' }}>{t}</span>
                    </li>
                  ))}
                </ol>
              </Section>

              {/* 导出操作条 */}
              <div className="rpt-actions">
                <span className="row gap-2 t-small text-3">
                  <ClipboardList size={13} />共 4 个章节 · 1 张图表 · {KPI_CHIPS.length} 项核心指标
                </span>
                <div className="row gap-2 wrap">
                  <button className="btn btn-subtle" onClick={() => fireToast('PPT 已生成 · 12 页母版套用完成，开始下载')}>
                    <Presentation size={14} />导出 PPT
                  </button>
                  <button className="btn btn-subtle" onClick={() => fireToast('PDF 已导出 · 战报已保存至「我的文档」')}>
                    <FileDown size={14} />导出 PDF
                  </button>
                  <button className="btn btn-primary" onClick={() => fireToast('已推送至钉钉「销售策略部」群 · 23 人可见')}>
                    <Send size={14} />推送钉钉
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="rpt-toast" role="status">
          <CheckCircle2 size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

// ─── 文档分区 ────────────────────────────────────────────────────────────────
function Section({ icon, idx, title, right, children }: {
  icon: React.ReactNode; idx: string; title: string; right?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rpt-section">
      <div className="row spread" style={{ marginBottom: 10 }}>
        <span className="row gap-2">
          <span className="rpt-sec-idx tnum">{idx}</span>
          <span className="row gap-2" style={{ color: 'var(--gold)' }}>{icon}</span>
          <span className="t-h3" style={{ color: 'var(--text-1)' }}>{title}</span>
        </span>
        {right}
      </div>
      {children}
    </div>
  );
}
