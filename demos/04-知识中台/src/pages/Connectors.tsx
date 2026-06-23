import { useMemo, useState } from 'react';
import {
  PlugZap, AlertTriangle, CheckCircle2, Clock, ShieldCheck, Lock,
  RefreshCw, Plus, Activity, Database, ChevronRight,
} from 'lucide-react';
import { PageHeader, Card, StatCard, SectionTitle, ProgressBar } from '../components/ui';
import { StatusBadge, Drawer, Modal, toast } from '../components/kit';
import { SourceIcon } from '../components/Citation';
import Chart from '../components/Chart';
import {
  baseOption, axisStyle, accent, trust, sem, areaGradient,
} from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import { CONNECTORS, SYNC_SERIES } from '../lib/mockData';
import type { Connector, ClearanceLevel } from '../types';

// ─── 连接器来源图标颜色映射 ──────────────────────────────────────────────────
const SOURCE_COLOR: Record<string, string> = {
  Confluence: '#1868db', Slack: '#4a154b', 'Google Drive': '#0f9d58',
  SharePoint: '#038387', Jira: '#0052cc', Salesforce: '#0176d3',
  Notion: '#000000', GitHub: '#24292f', Zendesk: '#03363d',
  Box: '#0061d5', '内部研报库': 'var(--gold)', '会议纪要': 'var(--text-3)',
};

// ─── KPI 汇总 ────────────────────────────────────────────────────────────────
function useConnectorKpis(connectors: Connector[]) {
  return useMemo(() => {
    const connected = connectors.filter(c => c.status === 'connected');
    const errors = connectors.filter(c => c.status === 'error');
    const totalDocs = connected.reduce((s, c) => s + c.docs, 0) + errors.reduce((s, c) => s + c.docs, 0);
    const activeLat = [...connected, ...errors].filter(c => c.latencyMin > 0);
    const avgLatency = activeLat.length
      ? +(activeLat.reduce((s, c) => s + c.latencyMin, 0) / activeLat.length).toFixed(1)
      : 0;
    return {
      connectedCount: connected.length + errors.length,
      totalDocs,
      errorCount: errors.length,
      avgLatency,
    };
  }, [connectors]);
}

// ─── 单张连接器卡片 ──────────────────────────────────────────────────────────
function ConnectorCard({ conn, onOpen }: { conn: Connector; onOpen: (c: Connector) => void }) {
  const isError = conn.status === 'error';
  const isAvail = conn.status === 'available';

  const statusTone = isError ? 'bad' : isAvail ? 'muted' : 'good';
  const statusLabel = isError ? '异常' : isAvail ? '可接入' : '已连接';

  return (
    <div
      className="card card-hover reveal"
      role="button"
      tabIndex={isAvail ? -1 : 0}
      style={{
        textAlign: 'left', cursor: isAvail ? 'default' : 'pointer', padding: 18, position: 'relative',
        border: isError ? '1.5px solid color-mix(in srgb, var(--danger) 38%, transparent)' : '1px solid var(--hairline)',
        transition: 'border-color 0.2s',
      }}
      onClick={() => !isAvail && onOpen(conn)}
    >
      {/* 头部：图标 + 名称 + 状态 */}
      <div className="row gap-3" style={{ marginBottom: 12, alignItems: 'center' }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'var(--surface-2)', flexShrink: 0,
            color: SOURCE_COLOR[conn.name] ?? 'var(--gold)',
          }}
        >
          <SourceIcon source={conn.name as never} size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {conn.name}
          </div>
          <div style={{ marginTop: 3 }}>
            <StatusBadge status={statusLabel} tone={statusTone} />
          </div>
        </div>
        {!isAvail && <ChevronRight size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />}
      </div>

      {/* 已连接内容 */}
      {!isAvail && (
        <>
          {/* 文档数 + 延迟 */}
          <div className="row gap-3" style={{ marginBottom: 10 }}>
            <div>
              <div className="t-small text-3" style={{ marginBottom: 2 }}>已索引文档</div>
              <div className="mononum" style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>
                {conn.docs.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="t-small text-3" style={{ marginBottom: 2 }}>增量延迟</div>
              <div className="mononum" style={{ fontWeight: 600, fontSize: 14, color: isError ? 'var(--danger)' : 'var(--text-1)' }}>
                {conn.latencyMin > 0 ? `${conn.latencyMin} min` : '—'}
              </div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <div className="t-small text-3" style={{ marginBottom: 2 }}>最近同步</div>
              <div className="t-small" style={{ color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                {conn.lastSync}
              </div>
            </div>
          </div>

          {/* 权限映射状态 */}
          <div className="row gap-2" style={{ marginBottom: 8 }}>
            {conn.permMapped ? (
              <span className="row gap-1 t-small" style={{ color: 'var(--emerald)' }}>
                <CheckCircle2 size={12} /> 权限映射完整
              </span>
            ) : (
              <span className="row gap-1 t-small" style={{ color: 'var(--warning)' }}>
                <AlertTriangle size={12} /> 权限未映射
              </span>
            )}
          </div>

          {/* 索引覆盖进度条 */}
          <div>
            <div className="row gap-2" style={{ marginBottom: 4, alignItems: 'center' }}>
              <span className="t-small text-3">索引覆盖</span>
              <span className="mononum t-small" style={{ marginLeft: 'auto', color: isError ? 'var(--danger)' : 'var(--text-2)' }}>
                {conn.indexedPct}%
              </span>
            </div>
            <ProgressBar
              pct={conn.indexedPct}
              color={isError ? 'var(--danger)' : 'var(--gold)'}
              height={5}
            />
          </div>

          {/* 异常操作按钮 */}
          {isError && (
            <button
              className="btn btn-sm"
              style={{
                marginTop: 12, width: '100%', background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
                color: 'var(--danger)', border: '1px solid color-mix(in srgb, var(--danger) 28%, transparent)',
              }}
              onClick={e => {
                e.stopPropagation();
                toast(`正在重新授权 ${conn.name}…`, 'warn');
              }}
            >
              <RefreshCw size={12} /> 重新授权
            </button>
          )}
        </>
      )}

      {/* 可接入：接入按钮 */}
      {isAvail && (
        <button
          className="btn btn-sm btn-primary"
          style={{ marginTop: 8, width: '100%' }}
          onClick={e => {
            e.stopPropagation();
            toast(`已发起 ${conn.name} 接入申请`, 'info');
          }}
        >
          <Plus size={12} /> 接入
        </button>
      )}
    </div>
  );
}

// ─── 抽屉内容：单连接器健康曲线 + 详情 ──────────────────────────────────────
function DrawerContent({ conn }: { conn: Connector }) {
  const isError = conn.status === 'error';

  // 用 SYNC_SERIES 前30天模拟该连接器自己的增量（按比例 + 扰动）
  const connSeries = useMemo(() => {
    const ratio = conn.docs / 182400; // 相对 Confluence 归一化
    return SYNC_SERIES.map((pt, i) => ({
      date: pt.date,
      docs: Math.round(pt.docs * ratio * (0.85 + (Math.sin(i * 1.3 + conn.id.charCodeAt(2)) * 0.1))),
    }));
  }, [conn]);

  const buildAreaChart = () => ({
    ...baseOption(),
    xAxis: {
      type: 'category',
      data: connSeries.map(p => p.date),
      ...axisStyle(),
      boundaryGap: false,
    },
    yAxis: { type: 'value', ...axisStyle() },
    series: [{
      type: 'line',
      data: connSeries.map(p => p.docs),
      smooth: 0.5,
      symbol: 'none',
      lineStyle: { width: 2, color: isError ? sem('blocked') : accent() },
      areaStyle: { color: areaGradient(isError ? sem('blocked') : accent()) },
    }],
    animationDuration: 700,
    animationEasing: 'cubicOut' as const,
  });

  return (
    <div className="col gap-4">
      {/* 状态摘要 */}
      <div className="row gap-3 wrap">
        <div className="card" style={{ flex: '1 1 120px', padding: '12px 14px', minWidth: 0 }}>
          <div className="t-small text-3 label">已索引文档</div>
          <div className="mononum" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', marginTop: 4 }}>{conn.docs.toLocaleString()}</div>
        </div>
        <div className="card" style={{ flex: '1 1 120px', padding: '12px 14px', minWidth: 0 }}>
          <div className="t-small text-3 label">增量延迟</div>
          <div className="mononum" style={{ fontSize: 22, fontWeight: 700, color: isError ? 'var(--danger)' : 'var(--text-1)', marginTop: 4 }}>
            {conn.latencyMin > 0 ? `${conn.latencyMin} min` : '—'}
          </div>
        </div>
        <div className="card" style={{ flex: '1 1 120px', padding: '12px 14px', minWidth: 0 }}>
          <div className="t-small text-3 label">索引覆盖</div>
          <div className="mononum" style={{ fontSize: 22, fontWeight: 700, color: isError ? 'var(--danger)' : 'var(--text-1)', marginTop: 4 }}>{conn.indexedPct}%</div>
        </div>
      </div>

      {/* 索引覆盖进度条 */}
      <div>
        <div className="row gap-2" style={{ marginBottom: 6 }}>
          <span className="label">索引覆盖率</span>
          <span className="mononum t-small" style={{ marginLeft: 'auto', color: 'var(--text-2)' }}>{conn.indexedPct}%</span>
        </div>
        <ProgressBar pct={conn.indexedPct} color={isError ? 'var(--danger)' : 'var(--gold)'} height={8} />
      </div>

      {/* 权限映射 */}
      <div className="row gap-2" style={{ padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--hairline)' }}>
        {conn.permMapped ? (
          <>
            <ShieldCheck size={14} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
            <span className="t-small text-2">权限映射完整 · 所有 ACL 规则已同步到智库检索层</span>
          </>
        ) : (
          <>
            <Lock size={14} style={{ color: 'var(--warning)', flexShrink: 0 }} />
            <span className="t-small text-2">权限未映射 · 检索时无法按角色过滤文档访问权限</span>
          </>
        )}
      </div>

      {/* 近30天增量同步曲线 */}
      <div>
        <SectionTitle>近 30 天增量同步（文档数）</SectionTitle>
        <Chart build={buildAreaChart} height={200} deps={[conn.id]} />
      </div>

      {/* 最近同步 */}
      <div className="row gap-2" style={{ color: 'var(--text-3)' }}>
        <Clock size={13} />
        <span className="t-small">上次同步：{conn.lastSync}</span>
      </div>

      {/* 重新授权 */}
      {isError && (
        <button
          className="btn"
          style={{
            background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
            color: 'var(--danger)', border: '1px solid color-mix(in srgb, var(--danger) 28%, transparent)',
          }}
          onClick={() => toast(`正在重新授权 ${conn.name}…`, 'warn')}
        >
          <RefreshCw size={14} /> 重新授权
        </button>
      )}
    </div>
  );
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────
export default function Connectors() {
  const { currentRole } = useAuth();
  const clearance = (currentRole?.clearance ?? 2) as ClearanceLevel;
  const canManage = currentRole?.permissions.includes('connector:manage') ?? false;

  const [drawerConn, setDrawerConn] = useState<Connector | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'connected' | 'error' | 'available'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const kpis = useConnectorKpis(CONNECTORS);

  const filtered = useMemo(() =>
    filterStatus === 'all' ? CONNECTORS : CONNECTORS.filter(c => c.status === filterStatus),
    [filterStatus],
  );

  // 权限卡：非 platform_admin 显示受限提示
  const locked = !canManage;

  // ─── ECharts ① 索引覆盖进度（各连接器横向堆叠条）────────────────────────
  const buildCoverageChart = () => {
    const connected = CONNECTORS.filter(c => c.status !== 'available');
    const sorted = [...connected].sort((a, b) => b.indexedPct - a.indexedPct);
    const names = sorted.map(c => c.name);
    const indexed = sorted.map(c => c.indexedPct);
    const remaining = sorted.map(c => Math.max(0, 100 - c.indexedPct));
    const gold = accent();
    const surface3 = '#e8e5de';

    return {
      ...baseOption(),
      grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', max: 100, ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, formatter: (v: number) => `${v}%` } },
      yAxis: { type: 'category', data: names, ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, fontSize: 11, width: 90, overflow: 'truncate' as const } },
      series: [
        {
          name: '已索引',
          type: 'bar',
          stack: 'total',
          data: indexed.map((v, i) => ({
            value: v,
            itemStyle: {
              color: sorted[i].status === 'error' ? sem('blocked') : gold,
              borderRadius: v >= 100 ? [4, 4, 4, 4] : [4, 0, 0, 4],
            },
          })),
          label: { show: true, position: 'inside', formatter: (p: { value: number }) => p.value >= 15 ? `${p.value}%` : '', fontSize: 11, color: '#fff', fontWeight: 600 },
        },
        {
          name: '待索引',
          type: 'bar',
          stack: 'total',
          data: remaining.map((v, i) => ({
            value: v,
            itemStyle: { color: surface3, borderRadius: remaining[i] > 0 ? [0, 4, 4, 0] : [0, 0, 0, 0] },
          })),
          label: { show: false },
        },
      ],
      legend: {
        data: ['已索引', '待索引'],
        top: 0, right: 0, textStyle: { fontSize: 11, color: '#888' },
        itemWidth: 10, itemHeight: 8,
      },
      tooltip: {
        ...baseOption().tooltip as object,
        formatter: (params: { seriesName: string; name: string; value: number }[]) => {
          const item = params[0];
          const conn = connected.find(c => c.name === item.name);
          return `<b>${item.name}</b><br/>已索引：${indexed[names.indexOf(item.name)]}%<br/>文档数：${(conn?.docs ?? 0).toLocaleString()}`;
        },
      },
      animationDuration: 800,
      animationEasing: 'cubicOut' as const,
    };
  };

  // ─── ECharts ② 近30天增量同步面积线 ─────────────────────────────────────
  const buildSyncChart = () => ({
    ...baseOption(),
    xAxis: {
      type: 'category',
      data: SYNC_SERIES.map(p => p.date),
      ...axisStyle(),
      boundaryGap: false,
    },
    yAxis: { type: 'value', ...axisStyle() },
    series: [{
      name: '增量同步文档数',
      type: 'line',
      data: SYNC_SERIES.map(p => p.docs),
      smooth: 0.45,
      symbol: 'none',
      lineStyle: { width: 2.5, color: accent() },
      areaStyle: { color: areaGradient(accent(), 0.3) },
    }],
    tooltip: {
      ...baseOption().tooltip as object,
      trigger: 'axis',
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0];
        return `<b>${p.name}</b><br/>增量同步：<span class="mononum">${p.value.toLocaleString()}</span> 篇`;
      },
    },
    animationDuration: 800,
    animationEasing: 'cubicOut' as const,
  });

  // ─── 过滤器按钮 ──────────────────────────────────────────────────────────
  const filterBtns: { value: typeof filterStatus; label: string; count: number }[] = [
    { value: 'all', label: '全部', count: CONNECTORS.length },
    { value: 'connected', label: '已连接', count: CONNECTORS.filter(c => c.status === 'connected').length },
    { value: 'error', label: '异常', count: CONNECTORS.filter(c => c.status === 'error').length },
    { value: 'available', label: '可接入', count: CONNECTORS.filter(c => c.status === 'available').length },
  ];

  return (
    <div className="page">
      <PageHeader
        title="连接器管理"
        subtitle="接入 · 监控企业全域数据源，实时索引 + 增量事件流状态"
        actions={
          canManage ? (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={14} /> 接入新数据源
            </button>
          ) : (
            <span className="row gap-2 t-small" style={{ color: 'var(--warning)' }}>
              <Lock size={13} /> 当前角色无连接器管理权限
            </span>
          )
        }
      />

      {/* 权限感知横幅 */}
      {locked && (
        <div className="filter-banner reveal" style={{ marginBottom: 14 }}>
          <Lock size={14} />
          <span>
            你正以 <b style={{ color: currentRole?.color }}>{currentRole?.name}（密级 {clearance}）</b> 浏览 ——
            连接器管理需 <b>平台管理员</b> 权限，当前为只读视图。
          </span>
        </div>
      )}

      {/* KPI 卡 */}
      <div className="grid grid-cols-4 reveal reveal-1" style={{ marginBottom: 20 }}>
        <StatCard
          label="已接入连接器"
          raw={kpis.connectedCount}
          icon={<PlugZap size={16} />}
          delayClass="reveal-1"
        />
        <StatCard
          label="索引文档总数"
          raw={kpis.totalDocs}
          icon={<Database size={16} />}
          delayClass="reveal-2"
        />
        <StatCard
          label="异常连接器"
          raw={kpis.errorCount}
          icon={<AlertTriangle size={16} />}
          delayClass="reveal-3"
        />
        <StatCard
          label="平均增量延迟"
          raw={kpis.avgLatency}
          unit="min"
          decimals={1}
          icon={<Activity size={16} />}
          delayClass="reveal-4"
        />
      </div>

      {/* 图表区 */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        {/* ECharts ①：索引覆盖进度 */}
        <Card className="reveal reveal-2">
          <SectionTitle right={<span className="t-small text-3">已连接 / 异常连接器</span>}>
            索引覆盖进度
          </SectionTitle>
          <Chart build={buildCoverageChart} height={300} deps={[]} />
        </Card>

        {/* ECharts ②：近30天增量同步面积线 */}
        <Card className="reveal reveal-3">
          <SectionTitle right={<span className="t-small text-3">全平台增量 · 近 30 天</span>}>
            增量同步趋势
          </SectionTitle>
          <Chart build={buildSyncChart} height={300} deps={[]} />
        </Card>
      </div>

      {/* 连接器卡网格 */}
      <Card className="reveal reveal-4" style={{ padding: '18px 20px' }}>
        {/* 工具条 */}
        <div className="row gap-2 spread" style={{ marginBottom: 16 }}>
          <div className="row gap-2 wrap">
            {filterBtns.map(btn => (
              <button
                key={btn.value}
                className="btn btn-sm"
                style={{
                  background: filterStatus === btn.value ? 'var(--gold)' : 'var(--surface-2)',
                  color: filterStatus === btn.value ? '#fff' : 'var(--text-2)',
                  border: filterStatus === btn.value ? '1px solid var(--gold)' : '1px solid var(--hairline)',
                }}
                onClick={() => setFilterStatus(btn.value)}
              >
                {btn.label}
                <span
                  className="mononum"
                  style={{
                    marginLeft: 4, fontSize: 11, background: filterStatus === btn.value ? 'rgba(255,255,255,.22)' : 'var(--surface-3)',
                    borderRadius: 10, padding: '1px 6px',
                  }}
                >
                  {btn.count}
                </span>
              </button>
            ))}
          </div>
          <span className="t-small text-3 mononum">{filtered.length} 个连接器</span>
        </div>

        {/* 卡网格 */}
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)' }}>
            <PlugZap size={28} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
            <div className="t-small">该分类下暂无连接器</div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
            }}
          >
            {filtered.map(conn => (
              <ConnectorCard
                key={conn.id}
                conn={conn}
                onOpen={setDrawerConn}
              />
            ))}
          </div>
        )}
      </Card>

      {/* 接入新数据源 Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="接入新数据源"
        sub="选择 SaaS 来源 · 按向导完成 OAuth 授权"
        width={600}
        footer={
          <button className="btn btn-subtle btn-sm" onClick={() => setShowAddModal(false)}>关闭</button>
        }
      >
        <div style={{ marginBottom: 12 }}>
          <input
            className="input"
            placeholder="搜索连接器…"
            style={{ width: '100%', marginBottom: 14 }}
            readOnly
          />
          {(['通用协作', '项目管理', '客户服务', '代码托管', '文件存储'] as const).map(cat => {
            const entries: Record<string, string[]> = {
              '通用协作': ['Confluence', 'Slack', 'Google Drive', 'SharePoint', '会议纪要'],
              '项目管理': ['Jira', 'Notion', 'Asana', 'Linear'],
              '客户服务': ['Salesforce', 'Zendesk', 'HubSpot', 'Intercom'],
              '代码托管': ['GitHub', 'GitLab', 'Bitbucket'],
              '文件存储': ['Box', 'Dropbox', 'OneDrive'],
            };
            return (
              <div key={cat} style={{ marginBottom: 14 }}>
                <div className="label" style={{ marginBottom: 8 }}>{cat}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                  {entries[cat].map(name => {
                    const alreadyConn = CONNECTORS.some(c => c.name === name && c.status !== 'available');
                    return (
                      <button
                        key={name}
                        className="card"
                        style={{
                          padding: '10px 12px', textAlign: 'left', cursor: alreadyConn ? 'default' : 'pointer',
                          opacity: alreadyConn ? 0.5 : 1,
                          border: alreadyConn ? '1px solid var(--hairline)' : '1px solid var(--hairline)',
                          transition: 'border-color 0.15s',
                        }}
                        onClick={() => {
                          if (alreadyConn) return;
                          toast(`已发起 ${name} 接入申请`, 'info');
                          setShowAddModal(false);
                        }}
                      >
                        <div className="row gap-2" style={{ alignItems: 'center' }}>
                          <span style={{ color: SOURCE_COLOR[name] ?? 'var(--gold)' }}>
                            <SourceIcon source={name as never} size={15} />
                          </span>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{name}</span>
                        </div>
                        {alreadyConn && (
                          <span className="t-small" style={{ color: 'var(--text-3)', marginTop: 4, display: 'block' }}>已接入</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* 抽屉：单连接器详情 + 索引健康曲线 */}
      <Drawer
        open={drawerConn !== null}
        onClose={() => setDrawerConn(null)}
        title={drawerConn?.name ?? ''}
        sub={`连接器详情 · ${drawerConn?.status === 'error' ? '异常' : '已连接'}`}
        width={480}
        footer={
          drawerConn?.status === 'error' ? (
            <button
              className="btn"
              style={{
                background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
                color: 'var(--danger)', border: '1px solid color-mix(in srgb, var(--danger) 28%, transparent)',
              }}
              onClick={() => {
                toast(`正在重新授权 ${drawerConn?.name}…`, 'warn');
                setDrawerConn(null);
              }}
            >
              <RefreshCw size={13} /> 重新授权
            </button>
          ) : undefined
        }
      >
        {drawerConn && <DrawerContent conn={drawerConn} />}
      </Drawer>
    </div>
  );
}
