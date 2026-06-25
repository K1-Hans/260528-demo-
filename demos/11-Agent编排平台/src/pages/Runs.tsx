import { useState } from 'react';
import {
  History, Clock, Coins, Activity, CheckCircle2, XCircle, Loader, UserCheck,
  Zap, ChevronRight,
} from 'lucide-react';
import { PageHeader, StatCard, Segmented, EmptyState } from '../components/ui';
import { Panel, NodeTypeIcon, RunStateChip, TelePill } from '../components/sig';
import Chart from '../components/Chart';
import { cssVar, axisStyle } from '../lib/chartTheme';
import { RUN_RECORDS, RUN_KPIS, GANTT_STEPS } from '../lib/mockData';
import type { NodeType, RunStep } from '../types';

const KPI_ICONS = [<Activity size={16} />, <CheckCircle2 size={16} />, <Clock size={16} />, <Coins size={16} />];

const RUN_STATUS = {
  success: { cls: 'run-done', label: '成功', Icon: CheckCircle2 },
  failed: { cls: 'run-error', label: '失败', Icon: XCircle },
  running: { cls: 'run-running', label: '执行中', Icon: Loader },
  waiting: { cls: 'run-wait', label: '等人审', Icon: UserCheck },
} as const;

const TYPE_CHART_VAR: Record<NodeType, string> = {
  input: '--c7', llm: '--c1', tool: '--c4', retriever: '--c3', agent: '--c2', router: '--c7', gate: '--warning', output: '--c2',
};

const stepState = (s: RunStep['state']) => s === 'done' ? 'ts-done' : s === 'running' ? 'ts-running' : s === 'error' ? 'ts-error' : s === 'wait' ? 'ts-wait' : '';

export default function Runs() {
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'running'>('all');
  const [selId, setSelId] = useState('r1');

  const list = RUN_RECORDS.filter(r => filter === 'all' ? true : r.status === filter);
  const run = RUN_RECORDS.find(r => r.id === selId) ?? RUN_RECORDS[0];
  const hasTrace = run.steps.length > 0;

  const ganttOption = () => {
    const rows = GANTT_STEPS.map(s => ({ name: s.name, start: s.start, dur: s.dur, color: cssVar(TYPE_CHART_VAR[s.type]) })).reverse();
    const text2 = cssVar('--text-2');
    return {
      grid: { left: 8, right: 56, top: 8, bottom: 26, containLabel: true },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: cssVar('--surface-1'), borderColor: cssVar('--hairline'), borderWidth: 1,
        textStyle: { color: cssVar('--text-1'), fontSize: 12 },
        extraCssText: 'border-radius:10px;',
        formatter: (p: { name: string; value: number }[]) => `${p[0].name}<br/>耗时 ${p[1]?.value ?? 0} ms`,
      },
      xAxis: { type: 'value', name: 'ms', nameTextStyle: { color: cssVar('--text-3'), fontSize: 10 }, ...axisStyle() },
      yAxis: { type: 'category', data: rows.map(r => r.name), ...axisStyle() },
      series: [
        { type: 'bar', stack: 'gt', itemStyle: { color: 'transparent' }, data: rows.map(r => r.start), silent: true },
        {
          type: 'bar', stack: 'gt', barWidth: '54%',
          data: rows.map(r => ({ value: r.dur, itemStyle: { color: r.color, borderRadius: 3 } })),
          label: { show: true, position: 'right', formatter: (p: { value: number }) => `${p.value}ms`, color: text2, fontSize: 10, fontFamily: 'Geist Mono' },
          animationDuration: 800,
        },
      ],
    };
  };

  return (
    <div className="page page-wide">
      <PageHeader
        title="运行历史"
        subtitle="单次执行 trace · 逐步耗时 / Token / 输入输出（区别聚合观测，看的是一条链路）"
        actions={<span className="tag tag-mono">today · 8,642 runs</span>}
      />

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        {RUN_KPIS.map((k, i) => <StatCard key={k.label} {...k} icon={KPI_ICONS[i]} delayClass={`d${i + 1}`} />)}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '366px minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
        {/* 运行列表 */}
        <Panel
          title="运行列表"
          icon={<History size={13} />}
          bodyClass="panel-body"
          right={
            <Segmented
              options={[{ value: 'all', label: '全部' }, { value: 'running', label: '执行' }, { value: 'success', label: '成功' }, { value: 'failed', label: '失败' }]}
              value={filter}
              onChange={setFilter}
            />
          }
        >
          <div className="col gap-2">
            {list.length === 0 && <EmptyState icon={<History size={28} />} title="无匹配运行" />}
            {list.map(r => {
              const st = RUN_STATUS[r.status];
              return (
                <div
                  key={r.id}
                  className="card card-hover"
                  style={{ padding: 12, borderColor: selId === r.id ? 'var(--hairline-strong)' : undefined, background: selId === r.id ? 'var(--surface-2)' : undefined }}
                  onClick={() => setSelId(r.id)}
                >
                  <div className="row spread" style={{ marginBottom: 6 }}>
                    <span className="t-small" style={{ fontWeight: 600, color: 'var(--text-1)' }}>{r.workflow}</span>
                    <span className={`run-chip ${st.cls}`}><st.Icon size={11} className={r.status === 'running' ? 'spin-slow' : ''} />{st.label}</span>
                  </div>
                  <div className="row spread" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    <span className="mono">{r.trigger}</span>
                    <span className="tnum">{r.startedAt}</span>
                  </div>
                  <div className="row gap-3" style={{ marginTop: 8, fontSize: 11, color: 'var(--text-3)' }}>
                    <span className="row gap-1 tnum"><Clock size={10} />{(r.durationMs / 1000).toFixed(1)}s</span>
                    <span className="row gap-1 tnum"><Coins size={10} />{r.totalTokens.toLocaleString()}</span>
                    <span className="row gap-1 tnum">¥{r.cost.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* 运行详情：甘特 + 单步 trace */}
        <div className="col gap-3">
          <Panel
            title="执行链路 · 节点甘特"
            icon={<Activity size={13} />}
            right={
              <div className="row gap-2">
                <span className="tele-pill"><Clock size={10} />{(run.durationMs / 1000).toFixed(1)}s</span>
                <span className="tele-pill"><Coins size={10} />{run.totalTokens.toLocaleString()} tok</span>
                <span className="tele-pill">¥{run.cost.toFixed(2)}</span>
              </div>
            }
          >
            {hasTrace
              ? <Chart build={ganttOption} height={188} deps={[selId]} />
              : <EmptyState icon={<Activity size={26} />} title="trace 已归档" desc="此运行仅保留汇总，完整逐步 trace 已落冷存储" />}
          </Panel>

          <Panel title={`单步 trace · ${run.trigger}`} icon={<Zap size={13} />} right={<span className="tag">{run.steps.length} 步</span>}>
            {hasTrace ? (
              <div className="col gap-2">
                {run.steps.map(s => (
                  <div key={s.seq} className={`trace-step ${stepState(s.state)}`}>
                    <span className="mononum text-3" style={{ fontSize: 12, minWidth: 18 }}>{String(s.seq).padStart(2, '0')}</span>
                    <NodeTypeIcon type={s.type} size={14} />
                    <div className="flex-1 col gap-1" style={{ minWidth: 0 }}>
                      <div className="row spread gap-2">
                        <span className="t-small" style={{ fontWeight: 600, color: 'var(--text-1)' }}>{s.nodeName}</span>
                        <RunStateChip state={s.state} showLabel={false} />
                      </div>
                      {(s.output || s.input) && <span className="t-small text-3" style={{ lineHeight: 1.5 }}>{s.output ?? s.input}</span>}
                    </div>
                    <div className="col gap-1" style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                      <span className="mononum" style={{ fontSize: 12, color: s.state === 'running' ? 'var(--gold)' : 'var(--text-2)' }}>{s.durMs} ms</span>
                      {s.tokens ? <TelePill icon={<Coins size={10} />}>{s.tokens.toLocaleString()}</TelePill> : <span style={{ height: 16 }} />}
                    </div>
                  </div>
                ))}
                <div className="row gap-2" style={{ padding: '8px 4px', color: 'var(--text-3)', fontSize: 12 }}>
                  <ChevronRight size={13} />链路执行中，剩余节点待上游完成后触发
                </div>
              </div>
            ) : (
              <EmptyState icon={<Zap size={26} />} title="无 trace 明细" desc="选择执行中 / 失败的运行查看逐步链路" />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
