// ════════════════════════════════════════════════════════════════════════
// 实时质检预警流 (§5.5) — 通话/对话进行中即时拦截违规
// 视觉签名：Evidence Dossier 冷瓷卷宗 · 实时瀑布流 + 辅导抽屉 + 时段热力图
// 严格 TS · ECharts 热力图 · mock 文案用真实消金质检术语 · 禁 emoji/紫/霓虹
// ════════════════════════════════════════════════════════════════════════
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  BellRing, AlertTriangle, ShieldAlert, ShieldCheck,
  Clock, Phone, MessageSquare, Mail, Bot,
  ChevronRight, RefreshCw, Filter, Pause, Play,
  BookOpen, ArrowRight,
} from 'lucide-react';
import { Card, PageHeader, StatCard, SectionTitle } from '../components/ui';
import { StatusBadge, Toolbar, Drawer, toast } from '../components/kit';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar, ANIM } from '../lib/chartTheme';
import { BUSINESS_LINES, CHANNELS } from '../lib/mockData';
import type { Channel, BusinessLine } from '../types';

// ─── 本页专属类型 ────────────────────────────────────────────────────────────
type AlertType = '禁语命中' | '未告知' | '情绪激化' | '承诺越权' | '静默超时';
type Severity = 'high' | 'mid' | 'low';

interface RtAlert {
  id: string;
  time: string;         // HH:mm:ss
  sessionId: string;
  agent: string;
  businessLine: BusinessLine;
  type: AlertType;
  severity: Severity;
  channel: Channel;
  snippet: string;       // 触发原句片段
  suggestion: string;    // 辅导话术建议
  durationSec?: number;  // 通话已用时长 (秒)
}

// ─── Mock 数据（≥14 条 · 真实消金质检场景 · 脱敏）────────────────────────────
const MOCK_ALERTS: RtAlert[] = [
  {
    id: 'a001',
    time: '09:47:12',
    sessionId: 'SES-2026061700031',
    agent: '赵越',
    businessLine: '逾期催收',
    type: '禁语命中',
    severity: 'high',
    channel: '通话',
    snippet: '「您再不还钱我就联系您单位同事跟您领导说」',
    suggestion: '请使用合规催收话术：「根据借款合同，您目前已逾期 X 天，请尽快安排还款，以免影响征信记录。如有还款困难，我们可以协商分期方案。」',
    durationSec: 214,
  },
  {
    id: 'a002',
    time: '09:45:38',
    sessionId: 'SES-2026061700028',
    agent: '孙琪',
    businessLine: '产品咨询',
    type: '未告知',
    severity: 'high',
    channel: '在线',
    snippet: '「您直接提交申请就行，没问题的」—— 漏报年化利率（APR）',
    suggestion: '在引导申请前，请先完整告知：「本产品年化利率为 X%，借款前请确认您的还款能力，逾期将影响个人征信并产生罚息。」',
    durationSec: 87,
  },
  {
    id: 'a003',
    time: '09:44:05',
    sessionId: 'SES-2026061700025',
    agent: '赵越',
    businessLine: '提前结清',
    type: '情绪激化',
    severity: 'mid',
    channel: '通话',
    snippet: '客户情绪激化，情绪评分突破阈值（EI=0.87），坐席声调提升',
    suggestion: '当前客户情绪较为激动，建议降低语速，使用安抚话术：「我非常理解您的感受，我们一定会帮您尽快解决这个问题，请您稍等片刻。」',
    durationSec: 372,
  },
  {
    id: 'a004',
    time: '09:42:51',
    sessionId: 'SES-2026061700022',
    agent: '李明',
    businessLine: 'S客户路由',
    type: '承诺越权',
    severity: 'high',
    channel: '通话',
    snippet: '「这个我保证您今天一定能下款，我帮您走绿色通道」',
    suggestion: '请避免承诺超出权限的内容。合规话术：「您的申请已提交审核，审批结果通常在 1–3 个工作日内通知，具体以系统审批结果为准。」',
    durationSec: 156,
  },
  {
    id: 'a005',
    time: '09:41:29',
    sessionId: 'SES-2026061700019',
    agent: '王芳',
    businessLine: '注销合规',
    type: '未告知',
    severity: 'mid',
    channel: '在线',
    snippet: '「您好，注销服务已为您办理」—— 未告知冷静期权利',
    suggestion: '在完成注销前，请告知客户：「根据监管规定，您享有 3 日冷静期，在此期间如需撤回申请，请及时联系我们。」',
    durationSec: 63,
  },
  {
    id: 'a006',
    time: '09:40:17',
    sessionId: 'SES-2026061700017',
    agent: '陈浩',
    businessLine: '银行卡管理',
    type: '静默超时',
    severity: 'low',
    channel: '通话',
    snippet: '静默时长 18 秒（阈值 10 秒），客户等待无响应',
    suggestion: '通话中出现长时间静默，请及时回应客户：「非常抱歉让您久等，我正在帮您核查系统信息，请稍候片刻。」',
    durationSec: 298,
  },
  {
    id: 'a007',
    time: '09:38:44',
    sessionId: 'SES-2026061700014',
    agent: '孙琪',
    businessLine: '逾期催收',
    type: '禁语命中',
    severity: 'high',
    channel: '通话',
    snippet: '「您这是恶意欠款，我们会向法院起诉您」—— 威胁性措辞',
    suggestion: '请使用合规催收表述：「依据合同约定，若长期未还款，公司有权依法采取必要措施，建议您尽快联系我们协商还款计划。」',
    durationSec: 445,
  },
  {
    id: 'a008',
    time: '09:37:02',
    sessionId: 'SES-2026061700012',
    agent: '刘娜',
    businessLine: '产品咨询',
    type: '未告知',
    severity: 'mid',
    channel: 'Bot',
    snippet: 'Bot 会话跳过「个人信息授权说明」直接进入授信流程',
    suggestion: '在采集客户信息前，Bot 必须推送个人信息授权提示并获取客户明确同意，记录授权时间戳。',
  },
  {
    id: 'a009',
    time: '09:35:28',
    sessionId: 'SES-2026061700010',
    agent: '赵越',
    businessLine: '提前结清',
    type: '情绪激化',
    severity: 'mid',
    channel: '通话',
    snippet: '客户连续打断坐席 3 次，情绪峰值 EI=0.79',
    suggestion: '检测到客户情绪波动，建议暂停说明，使用倾听话术：「我听到您说的了，能麻烦您详细说明一下具体遇到的问题吗？」',
    durationSec: 189,
  },
  {
    id: 'a010',
    time: '09:33:15',
    sessionId: 'SES-2026061700008',
    agent: '王芳',
    businessLine: '注销合规',
    type: '承诺越权',
    severity: 'high',
    channel: '在线',
    snippet: '「利息我帮您全部免掉，您放心」',
    suggestion: '利息减免须经审批流程，请告知客户：「利息调整需经过系统审核，我已帮您提交申请，结果将在 2 个工作日内通知您。」',
  },
  {
    id: 'a011',
    time: '09:31:50',
    sessionId: 'SES-2026061700006',
    agent: '陈浩',
    businessLine: 'S客户路由',
    type: '静默超时',
    severity: 'low',
    channel: '邮件',
    snippet: '邮件自动回复系统 12 小时未响应客户投诉（阈值 4 小时）',
    suggestion: '请及时人工介入，向客户发送回复：「您好，我们已收到您的来信并正在处理，将在 X 小时内为您提供解决方案。」',
  },
  {
    id: 'a012',
    time: '09:29:43',
    sessionId: 'SES-2026061700004',
    agent: '李明',
    businessLine: '银行卡管理',
    type: '未告知',
    severity: 'mid',
    channel: '通话',
    snippet: '「换绑银行卡直接操作」—— 未告知逾期后果及征信影响',
    suggestion: '在完成银行卡变更前，请告知：「请注意，若在还款日前未完成绑卡，可能导致自动扣款失败，影响您的征信记录，请确认操作时间。」',
    durationSec: 127,
  },
  {
    id: 'a013',
    time: '09:27:18',
    sessionId: 'SES-2026061700002',
    agent: '刘娜',
    businessLine: '逾期催收',
    type: '禁语命中',
    severity: 'high',
    channel: '通话',
    snippet: '「你们家里人都知道了吗，我要给你家里人打电话」',
    suggestion: '严禁联系第三方施压，请立即调整话术：「我们只能与您本人沟通还款事宜，建议您尽快安排还款或联系我们协商分期方案。」',
    durationSec: 533,
  },
  {
    id: 'a014',
    time: '09:25:06',
    sessionId: 'SES-2026061700001',
    agent: '孙琪',
    businessLine: '产品咨询',
    type: '情绪激化',
    severity: 'low',
    channel: '在线',
    snippet: '客户表达不满情绪，打出「太慢了」「没人管吗」等抱怨',
    suggestion: '建议回应：「非常抱歉给您带来不便，我会立即优先处理您的问题，请问您具体遇到了什么情况？」',
  },
  {
    id: 'a015',
    time: '09:22:34',
    sessionId: 'SES-2026061699998',
    agent: '王芳',
    businessLine: '提前结清',
    type: '未告知',
    severity: 'mid',
    channel: '通话',
    snippet: '「提前结清手续费按月算」—— 未提供完整费率说明及书面确认',
    suggestion: '请提供完整费率说明：「本产品提前结清违约金为剩余本金的 X%，具体金额已发送至您的绑定手机，请查收确认后告知是否继续办理。」',
    durationSec: 261,
  },
];

// ─── 热力图 mock 数据（24h × 6 业务线）─────────────────────────────────────
// 每条：{ hour: 0-23, lineIdx: 0-5, value: 预警次数 }
const HEATMAP_DATA: number[][] = (() => {
  const lines = BUSINESS_LINES.length; // 6
  const data: number[][] = [];
  const peaks: Record<number, number> = {
    9: 1.4, 10: 1.6, 11: 1.5, 14: 1.8, 15: 2.0, 16: 1.7, 19: 1.2,
  };
  const lineBias = [1.4, 0.8, 0.6, 2.0, 0.9, 0.4]; // 逾期催收最高
  for (let h = 0; h < 24; h++) {
    for (let l = 0; l < lines; l++) {
      const base = peaks[h] ?? 0.3;
      const raw = Math.round(base * lineBias[l] * (4 + Math.random() * 6));
      // hour 0-8 is off-hours, very low
      const v = h >= 8 && h <= 21 ? raw : Math.floor(raw * 0.1);
      data.push([h, l, v]);
    }
  }
  return data;
})();

// ─── 辅助：严重度配色 ─────────────────────────────────────────────────────────
const SEV_COLOR: Record<Severity, string> = {
  high: 'var(--danger)',
  mid: 'var(--warning)',
  low: 'var(--info)',
};
const SEV_LABEL: Record<Severity, string> = {
  high: '高危',
  mid: '中风险',
  low: '低',
};

// 类型图标 (lucide-react · 禁 emoji)
const TYPE_ICON: Record<AlertType, React.ReactNode> = {
  '禁语命中': <ShieldAlert size={14} />,
  '未告知': <AlertTriangle size={14} />,
  '情绪激化': <BellRing size={14} />,
  '承诺越权': <ShieldCheck size={14} />,
  '静默超时': <Clock size={14} />,
};

const CHANNEL_ICON: Record<Channel, React.ReactNode> = {
  '通话': <Phone size={12} />,
  '在线': <MessageSquare size={12} />,
  '邮件': <Mail size={12} />,
  'Bot': <Bot size={12} />,
};

// ─── 实时新增模拟 (每 4–8 秒插入一条) ──────────────────────────────────────
function useRealtimeAlerts(initial: RtAlert[], paused: boolean) {
  const [alerts, setAlerts] = useState<RtAlert[]>(initial);
  const counter = useRef(initial.length);

  useEffect(() => {
    if (paused) return;
    const POOL: Omit<RtAlert, 'id' | 'time'>[] = [
      {
        sessionId: 'SES-NEW001', agent: '陈浩', businessLine: '逾期催收',
        type: '禁语命中', severity: 'high', channel: '通话',
        snippet: '「我警告你，再不还款后果自负」',
        suggestion: '请立即调整用语：「依据借款协议，逾期将依法处理，建议您主动联系我们制定还款计划。」',
        durationSec: 89,
      },
      {
        sessionId: 'SES-NEW002', agent: '刘娜', businessLine: '产品咨询',
        type: '未告知', severity: 'mid', channel: '在线',
        snippet: '「额度已审批，直接提款就好」—— 未提示逾期后果',
        suggestion: '提款前请提醒：「提款后，请按期还款，逾期将产生日利率 X‰ 的罚息，并影响您的个人征信。」',
      },
      {
        sessionId: 'SES-NEW003', agent: '赵越', businessLine: '注销合规',
        type: '情绪激化', severity: 'low', channel: '通话',
        snippet: '客户情绪指数 EI=0.65，语速加快',
        suggestion: '建议放慢语速，先确认客户诉求再推进操作。',
        durationSec: 142,
      },
    ];

    const interval = window.setInterval(() => {
      counter.current += 1;
      const base = POOL[counter.current % POOL.length];
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const newAlert: RtAlert = {
        ...base,
        id: `rt-${counter.current}`,
        time: `${hh}:${mm}:${ss}`,
      };
      setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
    }, 5000 + Math.random() * 3000);

    return () => window.clearInterval(interval);
  }, [paused]);

  return [alerts, setAlerts] as const;
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────
export default function Alerts() {
  const [paused, setPaused] = useState(false);
  const [alerts, setAlerts] = useRealtimeAlerts(MOCK_ALERTS, paused);
  const [filterSev, setFilterSev] = useState<Severity | 'all'>('all');
  const [filterType, setFilterType] = useState<AlertType | 'all'>('all');
  const [selectedAlert, setSelectedAlert] = useState<RtAlert | null>(null);

  // KPI 统计
  const todayCount = 312;
  const intercepted = 278;
  const avgRespSec = 4.2;
  const highPct = 41;

  // 筛选后列表
  const filtered = useMemo(() => {
    return alerts.filter(a => {
      if (filterSev !== 'all' && a.severity !== filterSev) return false;
      if (filterType !== 'all' && a.type !== filterType) return false;
      return true;
    });
  }, [alerts, filterSev, filterType]);

  // ── 热力图 option ──────────────────────────────────────────────────────────
  const heatmapOpt = useMemo(() => () => {
    const danger = cssVar('--danger');
    const warning = cssVar('--warning');
    const surface2 = cssVar('--surface-2');
    return {
      ...baseOption(),
      ...ANIM,
      tooltip: {
        ...(baseOption().tooltip as object),
        formatter: (p: { data: number[] }) => {
          const [h, l, v] = p.data;
          return `${BUSINESS_LINES[l]}<br/>
            ${h.toString().padStart(2, '0')}:00–${(h + 1).toString().padStart(2, '0')}:00<br/>
            <b class="tnum">${v}</b> 次预警`;
        },
      },
      grid: { left: 90, right: 24, top: 32, bottom: 8, containLabel: false },
      xAxis: {
        type: 'category',
        data: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
        ...axisStyle(),
        axisLabel: {
          ...axisStyle().axisLabel,
          interval: 1,
          rotate: 45,
        },
        splitArea: { show: false },
      },
      yAxis: {
        type: 'category',
        data: [...BUSINESS_LINES],
        ...axisStyle(),
        splitArea: { show: false },
      },
      visualMap: {
        min: 0,
        max: 20,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: -8,
        inRange: {
          color: [surface2, warning, danger],
        },
        textStyle: { color: cssVar('--text-3'), fontSize: 11 },
        itemWidth: 14,
        itemHeight: 80,
        show: true,
      },
      series: [{
        type: 'heatmap',
        data: HEATMAP_DATA,
        label: { show: false },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' },
        },
        ...ANIM,
      }],
    };
  }, []);

  // ── 类型分布 mini bar (用于右侧统计面板)
  const typeCounts = useMemo(() => {
    const counts: Record<AlertType, number> = {
      '禁语命中': 0, '未告知': 0, '情绪激化': 0, '承诺越权': 0, '静默超时': 0,
    };
    alerts.forEach(a => { counts[a.type] += 1; });
    return counts;
  }, [alerts]);

  return (
    <div className="page">
      <PageHeader
        title="实时质检预警流"
        subtitle="通话/对话进行中即时拦截违规 · 语义+规则双引擎 · 毫秒级响应"
        actions={
          <div className="row gap-2">
            <button
              className="btn btn-ghost btn-sm row gap-1"
              onClick={() => { setPaused(p => !p); toast(paused ? '预警流已恢复' : '预警流已暂停', 'info'); }}
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
              {paused ? '恢复' : '暂停'}
            </button>
            <button className="btn btn-subtle btn-sm row gap-1" onClick={() => { setAlerts(MOCK_ALERTS); toast('已刷新预警数据', 'success'); }}>
              <RefreshCw size={14} />
              刷新
            </button>
          </div>
        }
      />

      {/* ── KPI 带 ────────────────────────────────────────────────────────── */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard
          label="今日预警"
          raw={todayCount}
          unit="次"
          change={12}
          spark={[18, 24, 19, 31, 28, 35, 40, 36, 42, 38, todayCount]}
          icon={<BellRing size={16} />}
          delayClass="reveal-1"
        />
        <StatCard
          label="即时拦截"
          raw={intercepted}
          unit="次"
          change={8}
          spark={[15, 20, 16, 27, 24, 31, 35, 31, 37, 34, intercepted]}
          icon={<ShieldAlert size={16} />}
          delayClass="reveal-2"
        />
        <StatCard
          label="平均响应"
          raw={avgRespSec}
          unit="秒"
          decimals={1}
          change={-18}
          spark={[7.2, 6.8, 5.9, 5.4, 5.1, 4.9, 4.7, 4.5, 4.4, 4.3, avgRespSec]}
          icon={<Clock size={16} />}
          delayClass="reveal-3"
        />
        <StatCard
          label="高危占比"
          raw={highPct}
          unit="%"
          decimals={0}
          change={-5}
          spark={[52, 48, 46, 50, 47, 44, 43, 41, 42, 40, highPct]}
          icon={<AlertTriangle size={16} />}
          delayClass="reveal-4"
        />
      </div>

      {/* ── 主体：左预警流 + 右详情 ──────────────────────────────────────── */}
      <div className="row gap-4" style={{ alignItems: 'flex-start' }}>

        {/* ── 左：预警瀑布流 ──────────────────────────────────────────────── */}
        <div style={{ flex: '1 1 560px', minWidth: 0 }}>
          <Card className="reveal" style={{ padding: 0 }}>
            {/* 筛选条 */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hairline)' }}>
              <Toolbar style={{ marginBottom: 0 }}>
                <span className="row gap-1 label" style={{ marginRight: 4 }}>
                  <Filter size={12} />
                  筛选
                </span>
                {/* 严重度筛选 */}
                {(['all', 'high', 'mid', 'low'] as const).map(s => (
                  <button
                    key={s}
                    className="btn btn-sm"
                    style={{
                      background: filterSev === s ? (s === 'all' ? 'var(--gold-glow)' : `color-mix(in srgb, ${SEV_COLOR[s as Severity] ?? 'var(--gold)'} 12%, transparent)`) : 'var(--surface-2)',
                      color: filterSev === s ? (s === 'all' ? 'var(--gold)' : (SEV_COLOR[s as Severity] ?? 'var(--gold)')) : 'var(--text-3)',
                      border: `1px solid ${filterSev === s ? 'var(--hairline-strong)' : 'var(--hairline)'}`,
                    }}
                    onClick={() => setFilterSev(s)}
                  >
                    {s === 'all' ? '全部等级' : SEV_LABEL[s as Severity]}
                  </button>
                ))}
                <span style={{ color: 'var(--hairline-strong)', margin: '0 4px' }}>|</span>
                {/* 类型筛选 */}
                <select
                  className="input"
                  style={{ padding: '4px 8px', fontSize: 12, height: 30 }}
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as AlertType | 'all')}
                >
                  <option value="all">全部类型</option>
                  {(['禁语命中', '未告知', '情绪激化', '承诺越权', '静默超时'] as AlertType[]).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                {/* 实时指示 */}
                <span className="row gap-1 text-3" style={{ marginLeft: 'auto', fontSize: 12 }}>
                  {!paused && <span className="dot-pulse" />}
                  <span>{paused ? '已暂停' : '实时同步中'}</span>
                  <span className="mono tnum" style={{ color: 'var(--text-3)' }}>
                    {filtered.length} 条
                  </span>
                </span>
              </Toolbar>
            </div>

            {/* 预警卡片列表 */}
            <div style={{ maxHeight: 560, overflowY: 'auto', padding: '8px 0' }}>
              {filtered.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                  <ShieldCheck size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
                  暂无匹配预警
                </div>
              )}
              {filtered.map((alert, idx) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  selected={selectedAlert?.id === alert.id}
                  onClick={() => setSelectedAlert(selectedAlert?.id === alert.id ? null : alert)}
                  delay={idx < 6 ? `reveal-${Math.min(idx + 1, 6) as 1 | 2 | 3 | 4 | 5 | 6}` : ''}
                />
              ))}
            </div>
          </Card>
        </div>

        {/* ── 右：选中详情 + 辅导话术 ──────────────────────────────────── */}
        <div style={{ flex: '0 0 320px', minWidth: 280 }}>
          {/* 选中详情卡 */}
          {selectedAlert ? (
            <Card className="reveal" style={{ padding: 0, marginBottom: 12 }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hairline)' }}>
                <div className="row gap-2 spread">
                  <span className="label">预警详情</span>
                  <StatusBadge status={SEV_LABEL[selectedAlert.severity]} tone={selectedAlert.severity === 'high' ? 'bad' : selectedAlert.severity === 'mid' ? 'warn' : 'info'} />
                </div>
              </div>
              <div style={{ padding: 16 }}>
                {/* 会话信息 */}
                <div className="col gap-2" style={{ marginBottom: 14 }}>
                  <div className="row gap-1" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    <span>会话 ID</span>
                  </div>
                  <div className="mono tnum" style={{ fontSize: 12, color: 'var(--text-2)', letterSpacing: '0.01em' }}>
                    {selectedAlert.sessionId}
                  </div>
                </div>

                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <FieldItem label="坐席" value={selectedAlert.agent} />
                  <FieldItem label="业务线" value={selectedAlert.businessLine} />
                  <FieldItem label="渠道" value={selectedAlert.channel} />
                  <FieldItem label="触发时间" value={selectedAlert.time} mono />
                  {selectedAlert.durationSec !== undefined && (
                    <FieldItem label="通话时长" value={`${Math.floor(selectedAlert.durationSec / 60)}分${selectedAlert.durationSec % 60}秒`} mono />
                  )}
                  <FieldItem label="类型" value={selectedAlert.type} />
                </div>

                {/* 触发原句 */}
                <div style={{ marginBottom: 14 }}>
                  <div className="label" style={{ marginBottom: 6, color: 'var(--text-3)', fontSize: 11 }}>触发原句片段</div>
                  <div style={{
                    background: `color-mix(in srgb, ${SEV_COLOR[selectedAlert.severity]} 8%, var(--surface-2))`,
                    border: `1px solid color-mix(in srgb, ${SEV_COLOR[selectedAlert.severity]} 30%, transparent)`,
                    borderLeft: `3px solid ${SEV_COLOR[selectedAlert.severity]}`,
                    borderRadius: 'var(--r-sm)',
                    padding: '10px 12px',
                    fontSize: 13,
                    color: 'var(--text-1)',
                    lineHeight: 1.6,
                  }}>
                    {selectedAlert.snippet}
                  </div>
                </div>

                {/* 辅导话术 */}
                <div style={{ marginBottom: 14 }}>
                  <div className="row gap-1 label" style={{ marginBottom: 6, color: 'var(--text-3)', fontSize: 11 }}>
                    <BookOpen size={11} />
                    实时辅导建议话术
                  </div>
                  <div style={{
                    background: 'color-mix(in srgb, var(--success) 8%, var(--surface-2))',
                    border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
                    borderLeft: '3px solid var(--success)',
                    borderRadius: 'var(--r-sm)',
                    padding: '10px 12px',
                    fontSize: 12.5,
                    color: 'var(--text-1)',
                    lineHeight: 1.65,
                  }}>
                    {selectedAlert.suggestion}
                  </div>
                </div>

                {/* 跳转工作台 */}
                <button
                  className="btn btn-primary btn-sm row gap-1"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => toast(`已定位至会话 ${selectedAlert.sessionId}，请前往质检工作台`, 'info')}
                >
                  <ArrowRight size={13} />
                  在工作台中查看完整会话
                </button>
              </div>
            </Card>
          ) : (
            <Card className="reveal" style={{ padding: 24, textAlign: 'center', marginBottom: 12 }}>
              <ChevronRight size={20} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.2 }} />
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>点击左侧预警卡查看详情</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>含辅导话术 + 跳转工作台</div>
            </Card>
          )}

          {/* 类型分布面板 */}
          <Card className="reveal reveal-3" style={{ padding: 0 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)' }}>
              <span className="label">今日类型分布</span>
            </div>
            <div style={{ padding: '10px 16px 14px' }}>
              {(Object.entries(typeCounts) as [AlertType, number][]).map(([type, count]) => {
                const total = Object.values(typeCounts).reduce((s, v) => s + v, 0) || 1;
                const pct = Math.round((count / total) * 100);
                const color = type === '禁语命中' || type === '承诺越权' ? 'var(--danger)' : type === '未告知' || type === '情绪激化' ? 'var(--warning)' : 'var(--info)';
                return (
                  <div key={type} style={{ marginBottom: 10 }}>
                    <div className="row spread" style={{ marginBottom: 4, fontSize: 12 }}>
                      <span className="row gap-1" style={{ color: 'var(--text-2)' }}>
                        <span style={{ color }}>{TYPE_ICON[type]}</span>
                        {type}
                      </span>
                      <span className="mono tnum" style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {count} <span style={{ opacity: 0.5 }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.8s var(--ease)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* ── 图表⑥：今日预警时段热力图 ──────────────────────────────────────── */}
      <Card className="reveal" style={{ marginTop: 20, padding: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--hairline)' }}>
          <SectionTitle>
            今日预警时段热力图 · 24h × 业务线
          </SectionTitle>
          <p className="text-3" style={{ fontSize: 12, marginTop: 2 }}>
            色深 = 预警频次；逾期催收 × 14:00–16:00 为当日风险峰区
          </p>
        </div>
        <div style={{ padding: '12px 12px 28px' }}>
          <Chart build={heatmapOpt} height={240} />
        </div>
      </Card>

      {/* ── 辅导话术抽屉（移动端降级） ────────────────────────────────────── */}
      <Drawer
        open={false}
        onClose={() => {/* controlled via selectedAlert above */}}
        title="实时辅导"
        sub={selectedAlert?.agent ?? ''}
        width={420}
      >
        <div />
      </Drawer>
    </div>
  );
}

// ─── 子组件：预警卡片 ────────────────────────────────────────────────────────
function AlertCard({ alert, selected, onClick, delay }: {
  alert: RtAlert;
  selected: boolean;
  onClick: () => void;
  delay: string;
}) {
  const sevColor = SEV_COLOR[alert.severity];
  return (
    <div
      className={`reveal ${delay}`}
      onClick={onClick}
      style={{
        display: 'flex',
        gap: 0,
        cursor: 'pointer',
        borderBottom: '1px solid var(--hairline)',
        background: selected ? `color-mix(in srgb, ${sevColor} 5%, var(--surface-1))` : 'transparent',
        transition: 'background 0.18s var(--ease)',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      {/* 左侧严重度色条 */}
      <div style={{ width: 3, flexShrink: 0, background: sevColor, borderRadius: '0' }} />

      {/* 内容区 */}
      <div style={{ flex: 1, padding: '11px 14px' }}>
        {/* 第一行：类型 + 严重度 + 时间 */}
        <div className="row spread" style={{ marginBottom: 5 }}>
          <div className="row gap-2">
            {/* 类型标签 */}
            <span
              className="row gap-1"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: sevColor,
                background: `color-mix(in srgb, ${sevColor} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${sevColor} 25%, transparent)`,
                borderRadius: 'var(--r-sm)',
                padding: '2px 7px',
                letterSpacing: '0.01em',
              }}
            >
              {TYPE_ICON[alert.type]}
              {alert.type}
            </span>

            {/* 严重度 */}
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: sevColor,
                opacity: 0.75,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {SEV_LABEL[alert.severity]}
            </span>
          </div>

          {/* 时间戳 */}
          <span className="mono tnum" style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {alert.time}
          </span>
        </div>

        {/* 第二行：坐席 / 业务线 / 渠道 */}
        <div className="row gap-2" style={{ marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{alert.agent}</span>
          <span className="badge" style={{ fontSize: 10, padding: '1px 6px' }}>{alert.businessLine}</span>
          <span className="row gap-1" style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {CHANNEL_ICON[alert.channel]}
            {alert.channel}
          </span>
          {alert.durationSec !== undefined && (
            <span className="mono tnum text-3" style={{ fontSize: 11 }}>
              {Math.floor(alert.durationSec / 60)}:{String(alert.durationSec % 60).padStart(2, '0')}
            </span>
          )}
        </div>

        {/* 第三行：触发原句 */}
        <div style={{
          fontSize: 12,
          color: 'var(--text-2)',
          lineHeight: 1.55,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {alert.snippet}
        </div>
      </div>

      {/* 右侧箭头提示 */}
      <div style={{ display: 'flex', alignItems: 'center', paddingRight: 10, color: 'var(--text-3)', opacity: selected ? 1 : 0.4 }}>
        <ChevronRight size={14} style={{ color: selected ? 'var(--gold)' : undefined }} />
      </div>
    </div>
  );
}

// ─── 子组件：字段展示 ────────────────────────────────────────────────────────
function FieldItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, letterSpacing: '0.02em' }}>{label}</div>
      <div className={mono ? 'mono tnum' : ''} style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: 500 }}>{value}</div>
    </div>
  );
}
