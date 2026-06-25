import { BarChart2, Rocket, GitBranch, Activity, CheckCircle2, RotateCcw, Play } from 'lucide-react';
import { PageHeader, StatCard, Badge } from '../components/ui';
import { Panel } from '../components/sig';
import { toast } from '../components/kit';
import Chart from '../components/Chart';
import { accent, runStateColor, chanColor, axisStyle, cssVar, DRAW } from '../lib/chartTheme';
import { DEPLOYMENTS, DEPLOY_KPIS } from '../lib/mockData';

const KPI_ICONS = [
  <Rocket size={16} />,
  <Activity size={16} />,
  <GitBranch size={16} />,
  <CheckCircle2 size={16} />,
];

function envBadgeColor(env: string): string {
  if (env === '生产') return 'var(--success)';
  if (env === '灰度') return 'var(--warning)';
  return 'var(--gold)';
}

function statusChipCls(status: string): string {
  if (status === 'live') return 'run-chip run-done';
  if (status === 'rollback') return 'run-chip run-error';
  return 'run-chip run-idle';
}

function statusLabel(status: string): string {
  if (status === 'live') return '运行中';
  if (status === 'rollback') return '回滚中';
  return '已暂停';
}

export default function Deploy() {
  const qpsChartOption = () => {
    const names = DEPLOYMENTS.map(d => `${d.workflow.slice(0, 6)}\n${d.version}`);
    const qpsData = DEPLOYMENTS.map((d, i) => ({
      value: d.qps,
      itemStyle: {
        color: d.env === '生产' ? accent() : d.env === '灰度' ? chanColor('--warning') : chanColor('--c3'),
        borderRadius: [3, 3, 0, 0],
        opacity: d.qps === 0 ? 0.3 : 1,
      },
      name: names[i],
    }));
    const srData = DEPLOYMENTS.map((d, i) => ({
      value: d.successRate,
      itemStyle: {
        color: d.status === 'live' ? runStateColor('done') : d.status === 'paused' ? runStateColor('idle') : runStateColor('error'),
        borderRadius: [3, 3, 0, 0],
        opacity: d.successRate === 0 ? 0.25 : 1,
      },
      name: names[i],
    }));
    const text2 = cssVar('--text-2');
    const surface1 = cssVar('--surface-1');
    const hairline = cssVar('--hairline');
    const text1 = cssVar('--text-1');
    return {
      grid: [
        { left: 12, right: '52%', top: 28, bottom: 32, containLabel: true },
        { left: '52%', right: 16, top: 28, bottom: 32, containLabel: true },
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: surface1,
        borderColor: hairline,
        borderWidth: 1,
        textStyle: { color: text1, fontSize: 12 },
        extraCssText: 'border-radius:10px;',
      },
      xAxis: [
        { type: 'category', data: names, gridIndex: 0, ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, interval: 0, fontSize: 10, lineHeight: 14 } },
        { type: 'category', data: names, gridIndex: 1, ...axisStyle(), axisLabel: { ...axisStyle().axisLabel, interval: 0, fontSize: 10, lineHeight: 14 } },
      ],
      yAxis: [
        { type: 'value', name: 'QPS', nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 }, gridIndex: 0, ...axisStyle() },
        { type: 'value', name: '成功率%', min: 0, max: 100, nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 }, gridIndex: 1, ...axisStyle() },
      ],
      series: [
        {
          name: 'QPS',
          type: 'bar',
          xAxisIndex: 0,
          yAxisIndex: 0,
          barWidth: '52%',
          data: qpsData,
          label: { show: true, position: 'top', color: text2, fontSize: 10, fontFamily: 'Geist Mono', formatter: (p: { value: number }) => p.value === 0 ? '-' : `${p.value}` },
          ...DRAW,
        },
        {
          name: '成功率',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          barWidth: '52%',
          data: srData,
          label: { show: true, position: 'top', color: text2, fontSize: 10, fontFamily: 'Geist Mono', formatter: (p: { value: number }) => p.value === 0 ? '-' : `${p.value}%` },
          ...DRAW,
        },
      ],
    };
  };

  return (
    <div className="page page-wide">
      <PageHeader
        title="发布管理"
        subtitle="生产 + 灰度并存 · 版本治理 · 一键回滚"
        actions={
          <>
            <span className="tag tag-mono">deploy:read</span>
            <span className="row gap-2" style={{ padding: '6px 11px', borderRadius: 'var(--r-sm)', background: 'color-mix(in srgb, var(--success) 12%, transparent)', color: 'var(--success)', fontSize: 12, fontWeight: 600 }}>
              <BarChart2 size={13} />生产工作流 9 个
            </span>
          </>
        }
      />

      {/* KPI 带 */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        {DEPLOY_KPIS.map((k, i) => (
          <StatCard key={k.label} {...k} icon={KPI_ICONS[i]} delayClass={`d${i + 1}`} />
        ))}
      </div>

      {/* 主体 */}
      <div className="col gap-3">
        {/* QPS / 成功率双图 */}
        <Panel title="各部署 QPS · 成功率对比" icon={<BarChart2 size={13} />} right={
          <div className="row gap-2" style={{ fontSize: 11, color: 'var(--text-3)' }}>
            <span className="row gap-1"><span style={{ width: 8, height: 8, borderRadius: 2, background: accent(), display: 'inline-block' }} />生产</span>
            <span className="row gap-1"><span style={{ width: 8, height: 8, borderRadius: 2, background: cssVar('--warning'), display: 'inline-block' }} />灰度</span>
            <span className="row gap-1"><span style={{ width: 8, height: 8, borderRadius: 2, background: chanColor('--c3'), display: 'inline-block' }} />测试</span>
          </div>
        }>
          <Chart build={qpsChartOption} height={220} deps={[]} />
        </Panel>

        {/* 部署表 */}
        <Panel
          title="部署列表"
          icon={<Rocket size={13} />}
          right={<span className="tag">{DEPLOYMENTS.length} 个部署</span>}
          bodyClass="panel-body-0"
        >
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>工作流</th>
                  <th>版本</th>
                  <th>环境</th>
                  <th>状态</th>
                  <th>Endpoint</th>
                  <th className="td-num">QPS</th>
                  <th className="td-num">P95</th>
                  <th className="td-num">成功率</th>
                  <th>部署时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {DEPLOYMENTS.map(dep => (
                  <tr key={dep.id}>
                    <td style={{ fontWeight: 500, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>{dep.workflow}</td>
                    <td><span className="tag tag-mono">{dep.version}</span></td>
                    <td>
                      <Badge color={envBadgeColor(dep.env)}>{dep.env}</Badge>
                    </td>
                    <td>
                      <span className={statusChipCls(dep.status)}>{statusLabel(dep.status)}</span>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{dep.endpoint}</span>
                    </td>
                    <td className="td-num tnum">
                      {dep.qps > 0 ? dep.qps : <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td className="td-num tnum">
                      {dep.p95Ms > 0
                        ? `${(dep.p95Ms / 1000).toFixed(1)}s`
                        : <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td className="td-num tnum">
                      {dep.successRate > 0
                        ? `${dep.successRate}%`
                        : <span style={{ color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{dep.deployedAt}</td>
                    <td>
                      <div className="row gap-1">
                        {dep.status === 'live' && (
                          <>
                            <button
                              className="btn btn-sm"
                              style={{ fontSize: 11 }}
                              onClick={() => toast(`已将 ${dep.workflow} ${dep.version} 切入灰度流量`, 'info')}
                            >
                              <GitBranch size={11} />灰度
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ fontSize: 11, color: 'var(--danger)', borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)' }}
                              onClick={() => toast(`已触发 ${dep.workflow} ${dep.version} 回滚，生效中…`, 'info')}
                            >
                              <RotateCcw size={11} />回滚
                            </button>
                          </>
                        )}
                        {dep.status === 'paused' && (
                          <button
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: 11 }}
                            onClick={() => toast(`已发布 ${dep.workflow} ${dep.version} 至 ${dep.env} 环境`, 'info')}
                          >
                            <Play size={11} />发布
                          </button>
                        )}
                        {dep.status === 'rollback' && (
                          <span style={{ fontSize: 11, color: 'var(--danger)' }}>回滚中</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
