// ════════════════════════════════════════════════════════════════════════
// 外呼任务调度台（M2）· perm=campaign:read / campaign:manage
// 视觉签名：Operator Midnight · 翡翠绿 accent · 克制回访口吻
// ════════════════════════════════════════════════════════════════════════
import { Fragment, useCallback, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Filter,
  Layers,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Shield,
  Upload,
  Users,
  Zap,
} from 'lucide-react';
import { PageHeader, StatCard, Badge, SectionTitle, ProgressBar, Card } from '../components/ui';
import { StatusBadge, Toolbar, Field, toast } from '../components/kit';
import { Panel, ComplianceLights } from '../components/sig';
import Chart from '../components/Chart';
import { useAuth } from '../contexts/AuthContext';
import { COMPLIANCE_LIGHTS } from '../lib/mockData';
import { baseOption, axisStyle, pass, review, cssVar, DRAW } from '../lib/chartTheme';
import type { Campaign, CampaignScene, CampaignStatus } from '../types';

// ─── 页面专属 mock 数据 ──────────────────────────────────────────────────────

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 'c001',
    name: '信用卡激活回访 · 6 月批次',
    scene: '信用卡激活回访' as CampaignScene,
    listCount: 12480,
    dialed: 8923,
    connected: 5341,
    converted: 876,
    concurrency: 120,
    status: '进行中' as CampaignStatus,
    dndWindow: '21:00–09:00',
    dailyCap: 3,
    compliancePass: true,
    owner: '王立',
    updatedAt: '今天 10:32',
  },
  {
    id: 'c002',
    name: '逾期 M1 提醒 · 本月第 2 轮',
    scene: '逾期 M1 提醒' as CampaignScene,
    listCount: 6730,
    dialed: 6730,
    connected: 4102,
    converted: 1934,
    concurrency: 80,
    status: '完成' as CampaignStatus,
    dndWindow: '21:00–09:00',
    dailyCap: 2,
    compliancePass: true,
    owner: '王立',
    updatedAt: '昨天 18:07',
  },
  {
    id: 'c003',
    name: '理财到期回访 · Q2 到期客户',
    scene: '理财到期回访' as CampaignScene,
    listCount: 3240,
    dialed: 0,
    connected: 0,
    converted: 0,
    concurrency: 60,
    status: '审核中' as CampaignStatus,
    dndWindow: '21:00–09:00',
    dailyCap: 2,
    compliancePass: false,
    owner: '王立',
    updatedAt: '今天 09:15',
  },
  {
    id: 'c004',
    name: 'NPS 满意度回访 · 5 月服务客群',
    scene: 'NPS 满意度回访' as CampaignScene,
    listCount: 5180,
    dialed: 2450,
    connected: 1580,
    converted: 1204,
    concurrency: 50,
    status: '暂停' as CampaignStatus,
    dndWindow: '21:00–09:00',
    dailyCap: 1,
    compliancePass: true,
    owner: '王立',
    updatedAt: '今天 08:44',
  },
  {
    id: 'c005',
    name: '额度提升告知 · 优质客群',
    scene: '额度提升告知' as CampaignScene,
    listCount: 8800,
    dialed: 0,
    connected: 0,
    converted: 0,
    concurrency: 100,
    status: '草稿' as CampaignStatus,
    dndWindow: '21:00–09:00',
    dailyCap: 2,
    compliancePass: false,
    owner: '王立',
    updatedAt: '今天 07:58',
  },
  {
    id: 'c006',
    name: '还款日提醒 · 信用贷 6 月批次',
    scene: '还款日提醒' as CampaignScene,
    listCount: 4620,
    dialed: 3910,
    connected: 2640,
    converted: 2512,
    concurrency: 70,
    status: '进行中' as CampaignStatus,
    dndWindow: '21:00–09:00',
    dailyCap: 1,
    compliancePass: true,
    owner: '王立',
    updatedAt: '今天 10:48',
  },
];

// 名单预检模拟结果
interface ImportPrecheck {
  total: number;
  valid: number;
  dup: number;
  blacklist: number;
  dndHit: number;
  fields: { src: string; mapped: string; sample: string }[];
}

const MOCK_PRECHECK: ImportPrecheck = {
  total: 3240,
  valid: 2891,
  dup: 189,
  blacklist: 112,
  dndHit: 48,
  fields: [
    { src: 'phone', mapped: '手机号', sample: '138****2841' },
    { src: 'name', mapped: '客户姓名', sample: '王先生' },
    { src: 'product', mapped: '产品名称', sample: '信用贷' },
    { src: 'amount', mapped: '待提醒金额', sample: '¥12,000' },
    { src: 'due_date', mapped: '到期/还款日', sample: '2026-06-30' },
  ],
};

// 节奏策略 state 初始值
interface RhythmConfig {
  concurrency: number;
  intervalSec: number;
  dailyCap: number;
}

// 24h 时段并发-接通率数据（双轴）
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
const CONCURRENCY_DATA = [
  0, 0, 0, 0, 0, 0, 0, 0,    // 00-07 勿扰
  0, 42, 78, 95, 110, 118, 120, 116, // 08-15
  112, 108, 98, 85, 62, 0, 0, 0,     // 16-23 (21+ 勿扰)
];
const CONNECT_RATE_DATA = [
  0, 0, 0, 0, 0, 0, 0, 0,
  0, 62.4, 68.7, 71.2, 69.8, 67.3, 65.1, 63.4,
  61.8, 59.2, 54.3, 48.6, 41.2, 0, 0, 0,
];

// 状态颜色映射
function statusTone(s: CampaignStatus): 'good' | 'warn' | 'bad' | 'info' | 'muted' {
  const map: Record<CampaignStatus, 'good' | 'warn' | 'bad' | 'info' | 'muted'> = {
    '进行中': 'good',
    '暂停': 'warn',
    '完成': 'info',
    '审核中': 'warn',
    '草稿': 'muted',
  };
  return map[s];
}

function connectRate(c: Campaign): number {
  if (c.dialed === 0) return 0;
  return (c.connected / c.dialed) * 100;
}

function convRate(c: Campaign): number {
  if (c.connected === 0) return 0;
  return (c.converted / c.connected) * 100;
}

function dialPct(c: Campaign): number {
  if (c.listCount === 0) return 0;
  return (c.dialed / c.listCount) * 100;
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────

export default function Campaigns() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('campaign:manage');

  // 活动选中
  const [selectedId, setSelectedId] = useState<string>('c001');
  const selected = MOCK_CAMPAIGNS.find(c => c.id === selectedId) ?? MOCK_CAMPAIGNS[0];

  // 名单导入
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [precheck, setPrecheck] = useState<ImportPrecheck | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 节奏策略
  const [rhythm, setRhythm] = useState<RhythmConfig>({
    concurrency: 120,
    intervalSec: 8,
    dailyCap: 3,
  });

  // 合规三灯
  const allGreen = COMPLIANCE_LIGHTS.every(l => l.state === 'on');

  // 活动起停
  const handleToggle = useCallback((c: Campaign) => {
    if (!canManage) return;
    if (c.status === '进行中') {
      toast(`已暂停：${c.name}`, 'warn');
    } else if (c.status === '暂停') {
      toast(`已恢复：${c.name}`, 'success');
    }
  }, [canManage]);

  // 模拟拖入解析
  const simulateImport = useCallback(() => {
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      setPrecheck(MOCK_PRECHECK);
      toast('CSV 解析完成 · 预检结果已就绪', 'success');
    }, 1200);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    simulateImport();
  }, [simulateImport]);

  // KPI 汇总
  const totalList = MOCK_CAMPAIGNS.reduce((a, c) => a + c.listCount, 0);
  const totalDialed = MOCK_CAMPAIGNS.reduce((a, c) => a + c.dialed, 0);
  const totalConnected = MOCK_CAMPAIGNS.reduce((a, c) => a + c.connected, 0);
  const totalConverted = MOCK_CAMPAIGNS.reduce((a, c) => a + c.converted, 0);
  const overallConnRate = totalDialed > 0 ? (totalConnected / totalDialed) * 100 : 0;
  const overallConvRate = totalConnected > 0 ? (totalConverted / totalConnected) * 100 : 0;

  return (
    <div className="page page-wide">
      <PageHeader
        title="外呼任务调度台"
        subtitle="6 个回访活动 · 建名单 · 节奏并发 · 勿扰时段 · 合规三灯过审后发起"
        actions={
          <div className="row gap-2">
            <ComplianceLights lights={COMPLIANCE_LIGHTS} />
            <button
              className="btn btn-primary row gap-1"
              disabled={!canManage || !allGreen}
              title={!canManage ? '当前角色无活动管理权限' : !allGreen ? '合规三灯未全绿，不可发起活动' : undefined}
              onClick={() => toast('新建活动', 'info')}
            >
              <Plus size={14} />
              新建活动
            </button>
          </div>
        }
      />

      {/* ── KPI 汇总行 ────────────────────────────────────────────── */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="名单总量" raw={totalList} unit="条" spark={[8200, 9400, 10800, 11900, 12480]} />
        <StatCard label="已呼量" raw={totalDialed} unit="条" spark={[14000, 16200, 18400, 20100, 22013]} />
        <StatCard label="接通量" raw={totalConnected} unit="通" spark={[8200, 9600, 11200, 12800, 13663]} />
        <StatCard label="接通率" raw={overallConnRate} unit="%" decimals={2} spark={[61.2, 62.8, 63.4, 62.9, 62.09]} />
        <StatCard label="转化率" raw={overallConvRate} unit="%" decimals={2} spark={[37.8, 39.2, 40.1, 41.0, 41.07]} />
      </div>

      {/* ── 主内容：左侧活动列表 + 右侧详情 ─────────────────────── */}
      <div className="grid" style={{ gridTemplateColumns: '340px 1fr', gap: 14, marginBottom: 14 }}>

        {/* ── 活动卡列表 ────────────────────────────────────────── */}
        <Panel
          title="外呼活动"
          icon={<Layers size={13} style={{ marginRight: 6, color: 'var(--text-3)' }} />}
          right={
            <button className="icon-btn" onClick={() => toast('已刷新', 'info')}>
              <RefreshCw size={13} />
            </button>
          }
          bodyClass="panel-body-0"
          style={{ maxHeight: 560, display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {MOCK_CAMPAIGNS.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--hairline)',
                  cursor: 'pointer',
                  background: selectedId === c.id ? 'var(--surface-2)' : 'transparent',
                  borderLeft: selectedId === c.id ? '2px solid var(--gold)' : '2px solid transparent',
                  transition: 'background 0.15s',
                }}
              >
                <div className="row spread" style={{ marginBottom: 6 }}>
                  <span className="t-small" style={{ fontWeight: 600, color: 'var(--text-1)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </span>
                  <StatusBadge status={c.status} tone={statusTone(c.status)} />
                </div>
                <div className="row gap-3" style={{ marginBottom: 7 }}>
                  <span className="t-small text-3">
                    <span className="mononum">{c.listCount.toLocaleString('zh-CN')}</span> 条名单
                  </span>
                  <span className="t-small text-3">
                    接通率 <span className="mononum" style={{ color: 'var(--gold)' }}>{connectRate(c).toFixed(2)}%</span>
                  </span>
                  <span className="t-small text-3">
                    并发 <span className="mononum">{c.concurrency}</span>
                  </span>
                </div>
                <div style={{ marginBottom: 6 }}>
                  <ProgressBar
                    pct={dialPct(c)}
                    color={c.status === '完成' ? 'var(--success)' : c.status === '进行中' ? 'var(--emerald)' : 'var(--surface-3)'}
                    height={3}
                  />
                </div>
                <div className="row spread">
                  <span className="t-small text-3">
                    {c.compliancePass
                      ? <span style={{ color: 'var(--success)' }} className="row gap-1"><CheckCircle2 size={11} />合规过审</span>
                      : <span style={{ color: 'var(--warning)' }} className="row gap-1"><AlertCircle size={11} />待合规审核</span>
                    }
                  </span>
                  <div className="row gap-1">
                    {canManage && (c.status === '进行中' || c.status === '暂停') && (
                      <button
                        className="icon-btn"
                        title={c.status === '进行中' ? '暂停活动' : '恢复活动'}
                        onClick={(e) => { e.stopPropagation(); handleToggle(c); }}
                      >
                        {c.status === '进行中' ? <Pause size={12} /> : <Play size={12} />}
                      </button>
                    )}
                    <ChevronRight size={12} style={{ color: 'var(--text-3)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* ── 右侧：活动详情 ────────────────────────────────────── */}
        <div className="col gap-3">

          {/* 活动数据概览卡 */}
          <Card>
            <div className="row spread" style={{ marginBottom: 14 }}>
              <div>
                <div className="t-h3" style={{ marginBottom: 4 }}>{selected.name}</div>
                <div className="row gap-2">
                  <Badge color="var(--text-3)">{selected.scene}</Badge>
                  <StatusBadge status={selected.status} tone={statusTone(selected.status)} />
                  {selected.compliancePass
                    ? <Badge color="var(--success)"><CheckCircle2 size={10} style={{ marginRight: 3 }} />合规过审</Badge>
                    : <Badge color="var(--warning)"><AlertCircle size={10} style={{ marginRight: 3 }} />待审核</Badge>
                  }
                </div>
              </div>
              {canManage && (
                <div className="row gap-2">
                  {(selected.status === '进行中' || selected.status === '暂停') && (
                    <button
                      className="btn btn-sm row gap-1"
                      onClick={() => handleToggle(selected)}
                      style={{ color: selected.status === '进行中' ? 'var(--warning)' : 'var(--success)' }}
                    >
                      {selected.status === '进行中' ? <><Pause size={13} />暂停</> : <><Play size={13} />恢复</>}
                    </button>
                  )}
                  <button className="btn btn-sm row gap-1" onClick={() => toast('导出报告', 'info')}>
                    <Download size={13} />导出
                  </button>
                </div>
              )}
            </div>

            {/* 四列数据 */}
            <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[
                { label: '名单量', val: selected.listCount.toLocaleString('zh-CN'), unit: '条', icon: <Users size={13} /> },
                { label: '已呼/接通', val: `${selected.dialed.toLocaleString('zh-CN')} / ${selected.connected.toLocaleString('zh-CN')}`, unit: '通', icon: <Activity size={13} /> },
                { label: '接通率', val: connectRate(selected).toFixed(2), unit: '%', icon: <Zap size={13} />, accent: true },
                { label: '转化率', val: convRate(selected).toFixed(2), unit: '%', icon: <Shield size={13} />, accent: false },
              ].map(item => (
                <div key={item.label} className="card" style={{ padding: '12px 14px' }}>
                  <div className="row gap-1 text-3" style={{ marginBottom: 6 }}>
                    {item.icon}
                    <span className="label">{item.label}</span>
                  </div>
                  <div className="row" style={{ alignItems: 'baseline', gap: 3 }}>
                    <span className="mononum" style={{ fontSize: 20, fontWeight: 700, color: item.accent ? 'var(--gold)' : 'var(--text-1)' }}>
                      {item.val}
                    </span>
                    <span className="t-small text-3">{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 拨打进度条 */}
            <div style={{ marginTop: 14 }}>
              <div className="row spread" style={{ marginBottom: 6 }}>
                <span className="t-small text-3">拨打进度</span>
                <span className="t-small mononum text-3">{dialPct(selected).toFixed(1)}%</span>
              </div>
              <ProgressBar
                pct={dialPct(selected)}
                color={selected.status === '完成' ? 'var(--success)' : 'var(--emerald)'}
                height={6}
              />
            </div>
          </Card>

          {/* 并发-接通率双轴图 */}
          <Panel
            title="24h 时段并发 · 接通率"
            icon={<Activity size={13} style={{ marginRight: 6, color: 'var(--text-3)' }} />}
            right={<span className="t-small text-3">勿扰时段 21:00–09:00 已自动拦截</span>}
          >
            <Chart
              height={220}
              deps={[]}
              build={() => ({
                ...baseOption(),
                ...DRAW,
                legend: {
                  top: 0,
                  right: 0,
                  textStyle: { color: cssVar('--text-2'), fontSize: 12 },
                  itemWidth: 14,
                  itemHeight: 2,
                },
                xAxis: {
                  type: 'category',
                  data: HOUR_LABELS,
                  ...axisStyle(),
                  axisLabel: {
                    ...axisStyle().axisLabel,
                    interval: 2,
                    rotate: 0,
                  },
                },
                yAxis: [
                  {
                    type: 'value',
                    name: '并发',
                    nameTextStyle: { color: cssVar('--text-3'), fontSize: 11 },
                    ...axisStyle(),
                    min: 0,
                    max: 140,
                  },
                  {
                    type: 'value',
                    name: '接通率 %',
                    nameTextStyle: { color: cssVar('--text-3'), fontSize: 11 },
                    ...axisStyle(),
                    min: 0,
                    max: 100,
                    splitLine: { show: false },
                  },
                ],
                series: [
                  {
                    name: '并发路数',
                    type: 'bar',
                    data: CONCURRENCY_DATA.map((v, i) => ({
                      value: v,
                      itemStyle: {
                        color: (i >= 21 || i < 9)
                          ? cssVar('--surface-3')
                          : cssVar('--emerald'),
                        borderRadius: [3, 3, 0, 0],
                        opacity: (i >= 21 || i < 9) ? 0.4 : 0.85,
                      },
                    })),
                    yAxisIndex: 0,
                    barMaxWidth: 18,
                  },
                  {
                    name: '接通率',
                    type: 'line',
                    data: CONNECT_RATE_DATA,
                    yAxisIndex: 1,
                    smooth: true,
                    lineStyle: { color: pass(), width: 2 },
                    symbol: 'none',
                    areaStyle: {
                      color: {
                        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                          { offset: 0, color: `color-mix(in srgb, ${pass()} 20%, transparent)` },
                          { offset: 1, color: `color-mix(in srgb, ${pass()} 0%, transparent)` },
                        ],
                      },
                    },
                    connectNulls: false,
                  },
                ],
                visualMap: {
                  show: false,
                  seriesIndex: 1,
                  dimension: 0,
                  pieces: [
                    { min: 21, max: 24, color: 'transparent' },
                    { min: 0, max: 9, color: 'transparent' },
                    { min: 9, max: 21, color: review() },
                  ],
                },
              })}
            />
          </Panel>
        </div>
      </div>

      {/* ── 第二行：名单导入 + 节奏策略 + 合规三灯 ───────────────── */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 320px', gap: 14 }}>

        {/* 名单 CSV 拖拽导入 */}
        <Panel
          title="名单导入"
          icon={<Upload size={13} style={{ marginRight: 6, color: 'var(--text-3)' }} />}
          right={
            canManage && (
              <button
                className="btn btn-sm row gap-1"
                onClick={() => fileRef.current?.click()}
                disabled={importing}
              >
                <FileText size={12} />
                选择文件
              </button>
            )
          }
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={simulateImport}
          />

          {/* 拖拽区 */}
          {!precheck && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => canManage && fileRef.current?.click()}
              style={{
                border: `1.5px dashed ${dragOver ? 'var(--gold)' : 'var(--hairline-strong)'}`,
                borderRadius: 12,
                padding: '32px 20px',
                textAlign: 'center',
                cursor: canManage ? 'pointer' : 'default',
                background: dragOver ? 'var(--gold-glow)' : 'var(--surface-2)',
                transition: 'all 0.2s var(--ease)',
                marginBottom: 14,
              }}
            >
              {importing
                ? (
                  <div className="col" style={{ alignItems: 'center', gap: 8 }}>
                    <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                    <span className="t-small text-3">正在解析 CSV · 名单预检中…</span>
                  </div>
                )
                : (
                  <div className="col" style={{ alignItems: 'center', gap: 8 }}>
                    <Upload size={28} style={{ color: 'var(--text-3)', opacity: 0.5 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>拖入 CSV 名单文件</span>
                    <span className="t-small text-3">支持手机号 / 客户姓名 / 产品字段 · 自动脱敏校验</span>
                    {!canManage && <span className="t-small" style={{ color: 'var(--warning)' }}>当前角色无名单导入权限</span>}
                  </div>
                )
              }
            </div>
          )}

          {/* 预检结果 */}
          {precheck && (
            <div>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 14 }}>
                {[
                  { label: '名单总数', val: precheck.total, color: 'var(--text-1)' },
                  { label: '有效号码', val: precheck.valid, color: 'var(--success)' },
                  { label: '重复命中', val: precheck.dup, color: 'var(--warning)' },
                  { label: '黑名单拦截', val: precheck.blacklist, color: 'var(--danger)' },
                  { label: '勿扰时段命中', val: precheck.dndHit, color: 'var(--warning)' },
                  { label: '净可呼量', val: precheck.valid - precheck.dndHit, color: 'var(--gold)' },
                ].map(item => (
                  <div key={item.label} className="card" style={{ padding: '10px 12px' }}>
                    <div className="label" style={{ marginBottom: 4 }}>{item.label}</div>
                    <div className="mononum" style={{ fontSize: 18, fontWeight: 700, color: item.color }}>
                      {item.val.toLocaleString('zh-CN')}
                    </div>
                  </div>
                ))}
              </div>

              <SectionTitle>字段映射 · 脱敏校验</SectionTitle>
              <div style={{ border: '1px solid var(--hairline)', borderRadius: 10, overflow: 'hidden' }}>
                {precheck.fields.map((f, i) => (
                  <Fragment key={f.src}>
                    <div
                      className="row spread"
                      style={{
                        padding: '9px 14px',
                        borderBottom: i < precheck.fields.length - 1 ? '1px solid var(--hairline)' : 'none',
                        fontSize: 12,
                      }}
                    >
                      <span className="mononum text-3">{f.src}</span>
                      <span style={{ color: 'var(--text-3)' }}>→</span>
                      <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{f.mapped}</span>
                      <span className="mononum text-3">{f.sample}</span>
                    </div>
                  </Fragment>
                ))}
              </div>

              <div className="row gap-2" style={{ marginTop: 12 }}>
                <button className="btn btn-sm row gap-1" onClick={() => setPrecheck(null)}>
                  <RefreshCw size={12} />重新上传
                </button>
                {canManage && (
                  <button
                    className="btn btn-primary btn-sm row gap-1"
                    onClick={() => { toast('名单已导入活动', 'success'); setPrecheck(null); }}
                  >
                    <CheckCircle2 size={12} />确认导入
                  </button>
                )}
              </div>
            </div>
          )}
        </Panel>

        {/* 节奏策略 */}
        <Panel
          title="节奏策略"
          icon={<Clock size={13} style={{ marginRight: 6, color: 'var(--text-3)' }} />}
          right={
            canManage && (
              <button
                className="btn btn-sm row gap-1"
                onClick={() => toast('策略已保存', 'success')}
              >
                <CheckCircle2 size={12} />保存
              </button>
            )
          }
        >
          {/* 并发上限滑块 */}
          <Field label="并发路数上限" hint={`当前：${rhythm.concurrency} 路（建议不超过 150 路，过高有封号风险）`}>
            <div className="row gap-3" style={{ alignItems: 'center' }}>
              <input
                type="range"
                min={10}
                max={200}
                step={5}
                value={rhythm.concurrency}
                disabled={!canManage}
                onChange={e => setRhythm(r => ({ ...r, concurrency: +e.target.value }))}
                style={{ flex: 1, accentColor: 'var(--gold)' }}
              />
              <span className="mononum" style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)', minWidth: 40, textAlign: 'right' }}>
                {rhythm.concurrency}
              </span>
            </div>
          </Field>

          {/* 呼叫间隔 */}
          <Field label="呼叫间隔（秒）" hint="同一号码两次呼叫最小间隔（频控保护）">
            <div className="row gap-3" style={{ alignItems: 'center' }}>
              <input
                type="range"
                min={3}
                max={60}
                step={1}
                value={rhythm.intervalSec}
                disabled={!canManage}
                onChange={e => setRhythm(r => ({ ...r, intervalSec: +e.target.value }))}
                style={{ flex: 1, accentColor: 'var(--gold)' }}
              />
              <span className="mononum" style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)', minWidth: 40, textAlign: 'right' }}>
                {rhythm.intervalSec}s
              </span>
            </div>
          </Field>

          {/* 单号每日触达上限 */}
          <Field label="单号每日触达上限" hint="超出上限自动频控拦截，合规保护">
            <div className="row gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  className="btn btn-sm"
                  disabled={!canManage}
                  onClick={() => setRhythm(r => ({ ...r, dailyCap: n }))}
                  style={{
                    minWidth: 36,
                    background: rhythm.dailyCap === n ? 'var(--gold)' : 'var(--surface-2)',
                    color: rhythm.dailyCap === n ? 'var(--bg-base)' : 'var(--text-2)',
                    border: `1px solid ${rhythm.dailyCap === n ? 'var(--gold)' : 'var(--hairline)'}`,
                    fontWeight: rhythm.dailyCap === n ? 700 : 400,
                  }}
                >
                  <span className="mononum">{n}</span>
                </button>
              ))}
              <span className="t-small text-3" style={{ alignSelf: 'center' }}>次 / 天</span>
            </div>
          </Field>

          {/* 勿扰时段可视化 24 格时间带 */}
          <Field label="勿扰时段 · 21:00–09:00">
            <div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(24, 1fr)',
                  gap: 2,
                  height: 28,
                }}
              >
                {Array.from({ length: 24 }, (_, i) => {
                  const isDnd = i < 9 || i >= 21;
                  return (
                    <div
                      key={i}
                      title={`${String(i).padStart(2, '0')}:00 ${isDnd ? '· 勿扰拦截' : '· 可呼时段'}`}
                      style={{
                        borderRadius: 3,
                        background: isDnd ? 'var(--surface-3)' : 'var(--emerald-dim)',
                        border: `1px solid ${isDnd ? 'var(--hairline)' : 'var(--emerald-deep)'}`,
                        opacity: isDnd ? 0.6 : 1,
                        position: 'relative',
                      }}
                    />
                  );
                })}
              </div>
              <div className="row spread" style={{ marginTop: 4 }}>
                <span className="t-small text-3 mononum">00:00</span>
                <div className="row gap-3">
                  <span className="row gap-1 t-small text-3">
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--surface-3)', display: 'inline-block' }} />
                    勿扰拦截
                  </span>
                  <span className="row gap-1 t-small text-3">
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--emerald-dim)', display: 'inline-block', border: '1px solid var(--emerald-deep)' }} />
                    可呼时段
                  </span>
                </div>
                <span className="t-small text-3 mononum">23:00</span>
              </div>
            </div>
          </Field>
        </Panel>

        {/* 合规三灯 + 发起活动 */}
        <Panel
          title="合规准入"
          icon={<Shield size={13} style={{ marginRight: 6, color: 'var(--text-3)' }} />}
        >
          <div style={{ marginBottom: 16 }}>
            <div className="t-small text-3" style={{ marginBottom: 12 }}>
              三灯全绿方可发起活动。任一黄灯/红灯时「发起活动」按钮自动禁用。
            </div>
            <div className="col gap-3">
              {COMPLIANCE_LIGHTS.map(light => (
                <div key={light.key} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
                  <div className="row spread" style={{ marginBottom: 4 }}>
                    <div className="row gap-2">
                      {light.state === 'on'
                        ? <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
                        : light.state === 'warn'
                          ? <AlertCircle size={14} style={{ color: 'var(--warning)' }} />
                          : <AlertCircle size={14} style={{ color: 'var(--danger)' }} />
                      }
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{light.label}</span>
                    </div>
                    <span
                      className="badge"
                      style={{
                        background: light.state === 'on' ? 'color-mix(in srgb, var(--success) 14%, transparent)' : 'color-mix(in srgb, var(--warning) 14%, transparent)',
                        color: light.state === 'on' ? 'var(--success)' : 'var(--warning)',
                        fontSize: 11,
                      }}
                    >
                      {light.state === 'on' ? '通过' : light.state === 'warn' ? '待确认' : '拦截'}
                    </span>
                  </div>
                  <div className="t-small text-3">{light.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 14 }}>
            <button
              className="btn btn-primary row gap-2"
              style={{ width: '100%', justifyContent: 'center', padding: '10px 0', fontSize: 14 }}
              disabled={!canManage || !allGreen}
              onClick={() => toast('活动已发起 · 合规三灯全绿', 'success')}
            >
              <Zap size={15} />
              发起活动
            </button>
            {!canManage && (
              <div className="t-small text-3" style={{ textAlign: 'center', marginTop: 6 }}>
                当前角色无活动管理权限
              </div>
            )}
            {canManage && !allGreen && (
              <div className="t-small" style={{ color: 'var(--warning)', textAlign: 'center', marginTop: 6 }}>
                合规三灯未全绿，请先完成审核
              </div>
            )}

            {/* 快捷操作 */}
            <div className="col gap-2" style={{ marginTop: 14 }}>
              <button className="btn btn-sm row gap-2" style={{ justifyContent: 'flex-start' }} onClick={() => toast('已导出合规报告', 'info')}>
                <Filter size={13} />查看频控余量明细
              </button>
              <button className="btn btn-sm row gap-2" style={{ justifyContent: 'flex-start' }} onClick={() => toast('跳转资质台账', 'info')}>
                <Shield size={13} />外显号资质台账
              </button>
              <button className="btn btn-sm row gap-2" style={{ justifyContent: 'flex-start' }} onClick={() => toast('导出合规报告 PDF', 'info')}>
                <Download size={13} />导出合规报告
              </button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
