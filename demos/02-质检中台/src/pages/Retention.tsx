// ════════════════════════════════════════════════════════════════════════
// AI 质检中台 · 留存与审计（金融双录刚需 · 10 年留存 · 封存追溯）
// 合规官管理 · 100% 双录覆盖 · 可追溯到每一次访问
// 🔒 脱敏：示例消费金融 / 信用贷 / 禁真实雇主名
// ════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { Archive, DatabaseBackup, Lock, History, Download, Filter } from 'lucide-react';
import { Card, PageHeader, StatCard, SectionTitle } from '../components/ui';
import { DataTable, Pagination, type Col } from '../components/DataTable';
import { StatusBadge, Toolbar, Drawer, toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar, areaGradient, DRAW } from '../lib/chartTheme';
import type { RetentionRecord, AuditEvent, BusinessLine, Channel } from '../types';

// ─── 本页 Mock 数据（真实消金质检场景 · ≥14 行）─────────────────────────────

const MOCK_RECORDS: RetentionRecord[] = [
  { sessionId: 'SES-2024-0391820', businessLine: '提前结清',  channel: '通话', recordedAt: '2024-03-12 10:08', retainUntil: '2034-03-12', sizeMb: 18.4,  integrity: 'sealed', events: 6 },
  { sessionId: 'SES-2024-0482617', businessLine: '注销合规',  channel: '通话', recordedAt: '2024-04-22 14:31', retainUntil: '2034-04-22', sizeMb: 22.1,  integrity: 'sealed', events: 5 },
  { sessionId: 'SES-2024-0591034', businessLine: '逾期催收',  channel: '通话', recordedAt: '2024-05-09 09:17', retainUntil: '2034-05-09', sizeMb: 31.7,  integrity: 'sealed', events: 8 },
  { sessionId: 'SES-2024-0674450', businessLine: '银行卡管理',channel: '在线', recordedAt: '2024-06-18 16:52', retainUntil: '2034-06-18', sizeMb: 4.2,   integrity: 'sealed', events: 4 },
  { sessionId: 'SES-2025-0120083', businessLine: '产品咨询',  channel: '在线', recordedAt: '2025-01-08 11:44', retainUntil: '2035-01-08', sizeMb: 3.8,   integrity: 'ok',     events: 3 },
  { sessionId: 'SES-2025-0234916', businessLine: 'S客户路由', channel: '通话', recordedAt: '2025-02-25 08:59', retainUntil: '2035-02-25', sizeMb: 27.3,  integrity: 'sealed', events: 7 },
  { sessionId: 'SES-2025-0348721', businessLine: '逾期催收',  channel: '通话', recordedAt: '2025-03-14 13:22', retainUntil: '2035-03-14', sizeMb: 34.6,  integrity: 'sealed', events: 9 },
  { sessionId: 'SES-2025-0461599', businessLine: '提前结清',  channel: 'Bot',  recordedAt: '2025-04-07 17:05', retainUntil: '2035-04-07', sizeMb: 1.1,   integrity: 'ok',     events: 2 },
  { sessionId: 'SES-2025-0573210', businessLine: '注销合规',  channel: '通话', recordedAt: '2025-05-19 10:38', retainUntil: '2035-05-19', sizeMb: 19.9,  integrity: 'sealed', events: 6 },
  { sessionId: 'SES-2025-0680047', businessLine: '银行卡管理',channel: '邮件', recordedAt: '2025-06-30 15:11', retainUntil: '2035-06-30', sizeMb: 0.6,   integrity: 'ok',     events: 2 },
  { sessionId: 'SES-2025-0794318', businessLine: '产品咨询',  channel: '在线', recordedAt: '2025-07-22 09:03', retainUntil: '2035-07-22', sizeMb: 5.4,   integrity: 'ok',     events: 3 },
  { sessionId: 'SES-2025-0812756', businessLine: 'S客户路由', channel: '通话', recordedAt: '2025-08-11 14:48', retainUntil: '2035-08-11', sizeMb: 29.8,  integrity: 'sealed', events: 7 },
  { sessionId: 'SES-2026-0109342', businessLine: '逾期催收',  channel: '通话', recordedAt: '2026-01-06 10:19', retainUntil: '2036-01-06', sizeMb: 33.2,  integrity: 'sealed', events: 8 },
  { sessionId: 'SES-2026-0218870', businessLine: '提前结清',  channel: '通话', recordedAt: '2026-02-18 11:55', retainUntil: '2036-02-18', sizeMb: 20.5,  integrity: 'ok',     events: 4 },
  { sessionId: 'SES-2026-0327641', businessLine: '注销合规',  channel: '在线', recordedAt: '2026-03-29 16:22', retainUntil: '2036-03-29', sizeMb: 6.7,   integrity: 'ok',     events: 3 },
  { sessionId: 'SES-2026-0441203', businessLine: '银行卡管理',channel: '通话', recordedAt: '2026-04-15 08:44', retainUntil: '2036-04-15', sizeMb: 23.1,  integrity: 'sealed', events: 5 },
  { sessionId: 'SES-2026-0558904', businessLine: '产品咨询',  channel: 'Bot',  recordedAt: '2026-05-07 13:30', retainUntil: '2036-05-07', sizeMb: 2.3,   integrity: 'ok',     events: 2 },
  { sessionId: 'SES-2026-0617083', businessLine: 'S客户路由', channel: '通话', recordedAt: '2026-06-10 09:11', retainUntil: '2036-06-10', sizeMb: 28.4,  integrity: 'ok',     events: 5 },
];

// 各会话的审计事件（审计时间轴 Drawer 用）
const AUDIT_EVENTS: Record<string, AuditEvent[]> = {
  'SES-2024-0391820': [
    { time: '2024-03-12 10:08:22', actor: '系统',     action: '录制完成',   target: '双录文件 .mp4 + 转写 .json' },
    { time: '2024-03-12 10:41:05', actor: '小云',     action: 'AI 质检完成', target: '合规得分 91 · 无违规项' },
    { time: '2024-03-12 11:02:17', actor: '林婉清',   action: '人工复核',   target: '确认合规 · 无异议' },
    { time: '2024-03-12 11:03:01', actor: '沈括',     action: '主管审批',   target: '复核通过 · 归档指令下达' },
    { time: '2024-03-12 11:05:44', actor: '系统',     action: '封存',       target: '文件哈希锁定 SHA-256:a3f2…' },
    { time: '2024-03-12 11:06:00', actor: '系统',     action: '留存确认',   target: '留存期至 2034-03-12 · 10 年' },
  ],
  'SES-2025-0348721': [
    { time: '2025-03-14 13:22:10', actor: '系统',     action: '录制完成',   target: '双录文件 .mp4 + 转写 .json' },
    { time: '2025-03-14 13:58:33', actor: '小云',     action: 'AI 质检完成', target: '合规得分 62 · 命中催收禁语' },
    { time: '2025-03-14 14:12:08', actor: '林婉清',   action: '违规标注',   target: '「再不还款就联系您单位同事」— 催收红线' },
    { time: '2025-03-14 14:45:21', actor: '赵越',     action: '申诉发起',   target: '异议：措辞属于提醒非威胁' },
    { time: '2025-03-14 15:30:44', actor: '沈括',     action: '复核裁决',   target: '维持原判：触犯催收红线·扣分成立' },
    { time: '2025-03-14 16:01:17', actor: '周慎',     action: '合规官终裁', target: '违规成立·记录在案·移送合规档案' },
    { time: '2025-03-14 16:03:09', actor: '系统',     action: '合规档案封存', target: '哈希锁定 SHA-256:9c7e…' },
    { time: '2025-03-14 16:03:11', actor: '系统',     action: '导出记录',   target: '周慎 导出合规报告 PDF' },
    { time: '2025-03-14 16:10:00', actor: '系统',     action: '留存确认',   target: '留存期至 2035-03-14 · 10 年' },
  ],
};

// 兜底：其他 sessionId 使用通用事件模板
function getAuditEvents(sessionId: string): AuditEvent[] {
  if (AUDIT_EVENTS[sessionId]) return AUDIT_EVENTS[sessionId];
  return [
    { time: '录制时间戳', actor: '系统',   action: '录制完成',   target: '双录文件 .mp4 + 转写 .json' },
    { time: '+30 min',  actor: '小云',   action: 'AI 质检完成', target: '合规得分计算完毕' },
    { time: '+50 min',  actor: '林婉清', action: '人工复核',   target: '质检员确认结果' },
    { time: '+65 min',  actor: '系统',   action: '封存',       target: 'SHA-256 哈希锁定 · 不可篡改' },
    { time: '+66 min',  actor: '系统',   action: '留存确认',   target: '留存期 10 年' },
  ];
}

// 月度留存量增长趋势（TB）
const MONTHLY_GROWTH = [
  { month: '2025-07', tb: 312 }, { month: '2025-08', tb: 341 }, { month: '2025-09', tb: 378 },
  { month: '2025-10', tb: 405 }, { month: '2025-11', tb: 443 }, { month: '2025-12', tb: 487 },
  { month: '2026-01', tb: 524 }, { month: '2026-02', tb: 558 }, { month: '2026-03', tb: 601 },
  { month: '2026-04', tb: 649 }, { month: '2026-05', tb: 698 }, { month: '2026-06', tb: 741 },
];

// 各业务线留存占比
const BIZ_DIST = [
  { name: '逾期催收',  pct: 34 },
  { name: '提前结清',  pct: 22 },
  { name: 'S客户路由', pct: 18 },
  { name: '注销合规',  pct: 13 },
  { name: '银行卡管理',pct: 8  },
  { name: '产品咨询',  pct: 5  },
];

// ─── 渠道筛选选项 ────────────────────────────────────────────────────────────
const CHANNEL_OPTIONS: Array<{ label: string; value: Channel | 'all' }> = [
  { label: '全部渠道', value: 'all' },
  { label: '通话',     value: '通话' },
  { label: '在线',     value: '在线' },
  { label: '邮件',     value: '邮件' },
  { label: 'Bot',      value: 'Bot'  },
];

// ─── Retention page ──────────────────────────────────────────────────────────
export default function Retention() {
  const [channelFilter, setChannelFilter] = useState<Channel | 'all'>('all');
  const [integrityFilter, setIntegrityFilter] = useState<'all' | 'sealed' | 'ok'>('all');
  const [drawerRecord, setDrawerRecord] = useState<RetentionRecord | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // 筛选
  const filtered = useMemo(() => MOCK_RECORDS.filter(r => {
    if (channelFilter !== 'all' && r.channel !== channelFilter) return false;
    if (integrityFilter !== 'all' && r.integrity !== integrityFilter) return false;
    return true;
  }), [channelFilter, integrityFilter]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const sealedCount = MOCK_RECORDS.filter(r => r.integrity === 'sealed').length;

  // ─── 列定义 ────────────────────────────────────────────────────────────────
  const cols: Col<RetentionRecord>[] = [
    {
      key: 'sessionId', header: '会话 ID', width: 180,
      render: r => <span className="mono tnum" style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.sessionId}</span>,
    },
    {
      key: 'businessLine', header: '业务线', width: 110,
      render: r => <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>{r.businessLine}</span>,
    },
    {
      key: 'channel', header: '渠道', width: 70,
      render: r => <span className="chip">{r.channel}</span>,
    },
    {
      key: 'recordedAt', header: '录制时间', width: 150, sortable: true,
      sortAccessor: r => r.recordedAt,
      render: r => <span className="mono tnum" style={{ fontSize: 12 }}>{r.recordedAt}</span>,
    },
    {
      key: 'retainUntil', header: '留存至', width: 130,
      render: r => <span className="mono tnum" style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.retainUntil}</span>,
    },
    {
      key: 'sizeMb', header: '大小 MB', width: 90, num: true, sortable: true,
      sortAccessor: r => r.sizeMb,
      render: r => <span className="mono tnum" style={{ fontSize: 12 }}>{r.sizeMb.toFixed(1)}</span>,
    },
    {
      key: 'integrity', header: '完整性', width: 100,
      render: r => r.integrity === 'sealed'
        ? <StatusBadge status="已封存" tone="good" />
        : <StatusBadge status="正常" tone="info" />,
    },
    {
      key: 'events', header: '审计事件数', width: 100, num: true, sortable: true,
      sortAccessor: r => r.events,
      render: r => <span className="mono tnum" style={{ fontSize: 12 }}>{r.events}</span>,
    },
  ];

  // ─── 趋势折线（月度留存增长 TB）────────────────────────────────────────────
  const buildTrendChart = useMemo(() => () => {
    const gold = cssVar('--gold');
    const success = cssVar('--success');
    return {
      ...baseOption(),
      tooltip: { trigger: 'axis', ...(baseOption().tooltip as object) },
      legend: {
        data: ['留存总量 (TB)', '新增 (TB)'],
        right: 8, top: 0,
        textStyle: { color: cssVar('--text-2'), fontSize: 11 },
      },
      xAxis: { type: 'category', data: MONTHLY_GROWTH.map(d => d.month.slice(5)), ...axisStyle() },
      yAxis: [
        { type: 'value', name: 'TB', ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => `${v}` } },
        {
          type: 'value', name: '新增 TB',
          ...axisStyle(),
          axisLabel: {
            ...axisStyle().axisLabel,
            formatter: (v: number) => `${v}`,
          },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '留存总量 (TB)',
          type: 'line', yAxisIndex: 0,
          data: MONTHLY_GROWTH.map(d => d.tb),
          smooth: true,
          symbol: 'circle', symbolSize: 5,
          lineStyle: { color: gold, width: 2 },
          itemStyle: { color: gold },
          areaStyle: { color: areaGradient(gold, 0.22) },
          ...DRAW,
        },
        {
          name: '新增 (TB)',
          type: 'bar', yAxisIndex: 1,
          data: MONTHLY_GROWTH.map((d, i) => i === 0 ? 0 : d.tb - MONTHLY_GROWTH[i - 1].tb),
          itemStyle: { color: `color-mix(in srgb, ${success} 70%, transparent)`, borderRadius: [3, 3, 0, 0] },
          barMaxWidth: 20,
          ...DRAW,
        },
      ],
    };
  }, []);

  // ─── 业务线占比饼图 ─────────────────────────────────────────────────────────
  const buildPieChart = useMemo(() => () => {
    const palette = ['--c1','--c2','--c3','--c4','--c5','--c6'].map(v => cssVar(v));
    return {
      ...baseOption(),
      tooltip: {
        trigger: 'item',
        ...(baseOption().tooltip as object),
        formatter: (p: { name: string; value: number; percent: number }) => `${p.name}<br/>${p.value}%`,
      },
      legend: {
        orient: 'vertical', right: 8, top: 'center',
        textStyle: { color: cssVar('--text-2'), fontSize: 11 },
      },
      series: [{
        name: '业务线留存占比',
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['38%', '50%'],
        data: BIZ_DIST.map((d, i) => ({ name: d.name, value: d.pct, itemStyle: { color: palette[i] } })),
        label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.2)' } },
        ...DRAW,
      }],
    };
  }, []);

  // ─── 双录覆盖率 Gauge ───────────────────────────────────────────────────────
  const buildGaugeChart = useMemo(() => () => {
    const success = cssVar('--success');
    const hairline = cssVar('--hairline');
    return {
      ...baseOption(),
      series: [{
        type: 'gauge',
        radius: '88%',
        startAngle: 210,
        endAngle: -30,
        min: 95,
        max: 100,
        splitNumber: 5,
        axisLine: {
          lineStyle: {
            width: 14,
            color: [
              [0.6, hairline],
              [1,   success],
            ],
          },
        },
        pointer: {
          length: '55%',
          width: 4,
          itemStyle: { color: success },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: cssVar('--text-3'),
          fontSize: 10,
          distance: -24,
          formatter: (v: number) => `${v}%`,
        },
        detail: {
          valueAnimation: true,
          formatter: '{value}%',
          color: success,
          fontSize: 22,
          fontWeight: 700,
          offsetCenter: [0, '28%'],
          fontFamily: "'Geist','PingFang SC',sans-serif",
        },
        title: {
          show: true,
          offsetCenter: [0, '56%'],
          color: cssVar('--text-3'),
          fontSize: 11,
        },
        data: [{ value: 100, name: '双录覆盖率' }],
        animationDuration: 1200,
        animationEasing: 'cubicOut' as const,
      }],
    };
  }, []);

  // ─── 审计事件时间轴（Drawer 内容）────────────────────────────────────────────
  function AuditTimeline({ sessionId }: { sessionId: string }) {
    const events = getAuditEvents(sessionId);
    return (
      <div style={{ position: 'relative', paddingLeft: 24 }}>
        {/* 竖线 */}
        <div style={{
          position: 'absolute', left: 7, top: 8, bottom: 8,
          width: 1, background: 'var(--hairline)',
        }} />
        {events.map((ev, i) => (
          <div key={i} style={{ position: 'relative', marginBottom: i < events.length - 1 ? 20 : 0 }}>
            {/* 圆点 */}
            <div style={{
              position: 'absolute', left: -20, top: 3,
              width: 8, height: 8, borderRadius: '50%',
              background: ev.action.includes('封存') || ev.action.includes('留存') ? 'var(--success)' :
                          ev.action.includes('违规') || ev.action.includes('终裁') ? 'var(--danger)' :
                          'var(--gold)',
              border: '2px solid var(--bg-base)',
              boxSizing: 'border-box',
            }} />
            <div style={{ marginBottom: 3 }}>
              <span className="mono tnum" style={{ fontSize: 11, color: 'var(--text-3)' }}>{ev.time}</span>
              <span className="badge" style={{ marginLeft: 8, background: 'var(--surface-2)', color: 'var(--text-2)', fontSize: 11 }}>{ev.actor}</span>
            </div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)', marginBottom: 2 }}>{ev.action}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{ev.target}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="留存与审计"
        subtitle="金融双录刚需 · 100% 覆盖 · 10 年留存 · 每一次访问可追溯"
        actions={
          <div className="row gap-2">
            <button className="btn btn-ghost btn-sm row gap-1" onClick={() => toast('导出合规留存报告（PDF 占位）', 'success')}>
              <Download size={14} />
              导出报告
            </button>
          </div>
        }
      />

      {/* ── KPI 带 ──────────────────────────────────────────────────────────── */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard
          label="留存总量"
          raw={1284}
          unit="万条"
          change={5}
          spark={[220, 260, 310, 355, 400, 460, 512, 545, 590, 635, 680, 741]}
          icon={<DatabaseBackup size={16} />}
          delayClass="reveal-1"
        />
        <StatCard
          label="双录覆盖率"
          raw={100}
          unit="%"
          change={0}
          icon={<Archive size={16} />}
          delayClass="reveal-2"
        />
        <StatCard
          label="最早留存年份"
          raw={2016}
          unit="年"
          icon={<History size={16} />}
          delayClass="reveal-3"
        />
        <StatCard
          label="已封存条数"
          raw={sealedCount * 71230}
          unit="条"
          change={2}
          spark={[310, 350, 410, 480, 560, 640, 720, 810, 900, 1010, 1120, 1210]}
          icon={<Lock size={16} />}
          delayClass="reveal-4"
        />
      </div>

      {/* ── 图表区 ──────────────────────────────────────────────────────────── */}
      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
        {/* 月度留存增长趋势 */}
        <Card className="reveal reveal-1">
          <div style={{ padding: '16px 20px 4px' }}>
            <SectionTitle>留存量月度增长趋势</SectionTitle>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>近 12 个月 · 单位 TB</div>
          </div>
          <Chart build={buildTrendChart} height={200} />
        </Card>

        {/* 业务线留存占比 */}
        <Card className="reveal reveal-2">
          <div style={{ padding: '16px 20px 4px' }}>
            <SectionTitle>各业务线留存占比</SectionTitle>
          </div>
          <Chart build={buildPieChart} height={200} />
        </Card>

        {/* 双录覆盖率 Gauge */}
        <Card className="reveal reveal-3" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ padding: '16px 20px 0', width: '100%' }}>
            <SectionTitle>双录覆盖率</SectionTitle>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>监管目标 100%</div>
          </div>
          <Chart build={buildGaugeChart} height={180} />
          <div style={{ paddingBottom: 12, textAlign: 'center' }}>
            <span className="badge" style={{ background: 'color-mix(in srgb, var(--success) 14%, transparent)', color: 'var(--success)', fontSize: 12 }}>
              达标 · 金管总局《消保监管评价办法》
            </span>
          </div>
        </Card>
      </div>

      {/* ── 筛选栏 ──────────────────────────────────────────────────────────── */}
      <Toolbar>
        <div className="row gap-1" style={{ alignItems: 'center' }}>
          <Filter size={13} style={{ color: 'var(--text-3)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4 }}>渠道</span>
          {CHANNEL_OPTIONS.map(o => (
            <button
              key={o.value}
              className="btn btn-sm"
              style={{
                background: channelFilter === o.value ? 'var(--gold-glow)' : 'var(--surface-2)',
                color:      channelFilter === o.value ? 'var(--gold)' : 'var(--text-2)',
                border:     `1px solid ${channelFilter === o.value ? 'var(--hairline-strong)' : 'var(--hairline)'}`,
              }}
              onClick={() => { setChannelFilter(o.value); setPage(1); }}
            >{o.label}</button>
          ))}
        </div>
        <div className="row gap-1" style={{ alignItems: 'center', marginLeft: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginRight: 4 }}>完整性</span>
          {([['all','全部'],['sealed','已封存'],['ok','正常']] as const).map(([v, l]) => (
            <button
              key={v}
              className="btn btn-sm"
              style={{
                background: integrityFilter === v ? 'var(--gold-glow)' : 'var(--surface-2)',
                color:      integrityFilter === v ? 'var(--gold)' : 'var(--text-2)',
                border:     `1px solid ${integrityFilter === v ? 'var(--hairline-strong)' : 'var(--hairline)'}`,
              }}
              onClick={() => { setIntegrityFilter(v); setPage(1); }}
            >{l}</button>
          ))}
        </div>
        <div className="row gap-1" style={{ marginLeft: 'auto', alignItems: 'center' }}>
          <span className="tnum text-3" style={{ fontSize: 12 }}>共 {filtered.length} 条</span>
        </div>
      </Toolbar>

      {/* ── 主数据表 ────────────────────────────────────────────────────────── */}
      <Card style={{ padding: 0 }}>
        <DataTable
          cols={cols}
          rows={paged}
          rowKey={r => r.sessionId}
          onRow={r => setDrawerRecord(r)}
          defaultSort={{ key: 'recordedAt', dir: 'desc' }}
          empty={{ title: '暂无留存记录', desc: '当前筛选条件下无匹配数据', icon: <Archive size={32} /> }}
        />
        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
      </Card>

      {/* ── 审计事件时间轴 Drawer ──────────────────────────────────────────── */}
      <Drawer
        open={drawerRecord !== null}
        onClose={() => setDrawerRecord(null)}
        title="审计事件追溯"
        sub={drawerRecord ? `${drawerRecord.sessionId} · ${drawerRecord.businessLine} · ${drawerRecord.channel}` : ''}
        width={500}
      >
        {drawerRecord && (
          <>
            {/* 会话基本信息 */}
            <div className="card" style={{ marginBottom: 20, padding: '14px 16px', background: 'var(--surface-2)' }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
                {[
                  ['会话 ID', drawerRecord.sessionId],
                  ['业务线', drawerRecord.businessLine],
                  ['渠道',   drawerRecord.channel],
                  ['录制时间', drawerRecord.recordedAt],
                  ['留存至',  drawerRecord.retainUntil],
                  ['大小',    `${drawerRecord.sizeMb.toFixed(1)} MB`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
                    <div className="mono tnum" style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--hairline)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>完整性：</span>
                {drawerRecord.integrity === 'sealed'
                  ? <StatusBadge status="已封存" tone="good" />
                  : <StatusBadge status="正常" tone="info" />}
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)' }}>
                  {drawerRecord.events} 个审计事件
                </span>
              </div>
            </div>

            {/* 审计时间轴 */}
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 14, letterSpacing: '0.02em' }}>
              审计事件时间轴
            </div>
            <AuditTimeline sessionId={drawerRecord.sessionId} />
          </>
        )}
      </Drawer>
    </div>
  );
}
