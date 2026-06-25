import { useEffect, useMemo, useState } from 'react';
import {
  Layers, ShieldAlert, Gauge, Cpu, CheckCircle2,
  Check, Ban, MinusCircle, ArrowUpCircle, Eye, EyeOff, Command,
} from 'lucide-react';
import { PageHeader, Segmented } from '../components/ui';
import { Panel, SeverityBadge, ModalityChip, VerdictBar, MediaStage, mediaUrl, TimeChip } from '../components/sig';
import { toast } from '../components/kit';
import { useAuth } from '../contexts/AuthContext';
import { MODERATION_ITEMS } from '../lib/mockData';
import {
  SEVERITY_LABEL, DISPOSITION_LABEL,
  type Severity, type Disposition,
} from '../types';

const SEV_ORDER: Record<Severity, number> = { critical: 0, high: 1, mid: 2, low: 3, safe: 4 };
const SEVERITIES: Severity[] = ['critical', 'high', 'mid', 'low', 'safe'];

type Filter = 'all' | Severity;

export default function Queue() {
  const { hasPermission } = useAuth();
  const canAct = hasPermission('queue:act');

  // 决策表：id → 处置（已决策的退出队列）
  const [decisions, setDecisions] = useState<Record<string, Disposition>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [selId, setSelId] = useState<string>('');
  const [reveal, setReveal] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  const pending = useMemo(
    () => MODERATION_ITEMS
      .filter(i => i.status === 'pending' && !decisions[i.id])
      .sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || b.waitSec - a.waitSec),
    [decisions],
  );
  const queue = useMemo(
    () => filter === 'all' ? pending : pending.filter(i => i.severity === filter),
    [pending, filter],
  );

  // 选中项始终有效，否则取队首
  const selected = queue.find(i => i.id === selId) ?? queue[0];
  useEffect(() => { if (selected && selected.id !== selId) setSelId(selected.id); }, [selected, selId]);
  useEffect(() => { setReveal(false); }, [selId]);

  const dispose = (d: Disposition) => {
    if (!canAct || !selected) return;
    const cur = selected;
    setDecisions(prev => ({ ...prev, [cur.id]: d }));
    setDoneCount(c => c + 1);
    const tone = d === 'pass' ? 'success' : d === 'remove' ? 'danger' : d === 'escalate' ? 'info' : 'warn';
    toast(`${cur.id} → ${DISPOSITION_LABEL[d]} · 处置留痕已记录`, tone);
  };

  const step = (dir: 1 | -1) => {
    if (!queue.length) return;
    const idx = queue.findIndex(i => i.id === selected?.id);
    const next = queue[(idx + dir + queue.length) % queue.length];
    if (next) setSelId(next.id);
  };

  // 键盘高速 culling
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (k === 'j' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
      else if (k === 'k' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
      else if (k === 'a') dispose('pass');
      else if (k === 'r') dispose('remove');
      else if (k === 'e') dispose('escalate');
      else if (k === 'l') dispose('limit');
      else if (e.key === ' ') { e.preventDefault(); setReveal(v => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // 队列风险构成（活动队列内分布）
  const dist = SEVERITIES.map(s => ({ s, n: pending.filter(i => i.severity === s).length }));
  const distTotal = pending.length || 1;

  const kpis = [
    { label: '待审积压', value: '1,284', icon: <Layers size={15} />, sub: '实时入列' },
    { label: '高危待处置', value: String(pending.filter(i => i.severity === 'critical' || i.severity === 'high').length), icon: <ShieldAlert size={15} />, sub: '优先复核', accent: 'var(--sev-high)' },
    { label: '本会话已处置', value: String(doneCount), icon: <CheckCircle2 size={15} />, sub: '键盘 culling' },
    { label: '平均处置时长', value: '14s', icon: <Gauge size={15} />, sub: '团队均值' },
    { label: 'AI 自动化率', value: '67.2%', icon: <Cpu size={15} />, sub: '人审兜底高危' },
  ];

  return (
    <div className="page page-wide">
      <PageHeader
        title="审片流水台"
        subtitle="实时多模态审核队列 · 键盘高速复核：J/K 切换 · A 通过 · R 下架 · E 升级 · L 限流 · 空格切换模糊"
        actions={
          <div className="row gap-2">
            <span className="tag tag-mono"><Command size={12} style={{ marginRight: 4 }} />快捷处置</span>
          </div>
        }
      />

      {/* KPI 条 */}
      <div className="grid reveal" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 14 }}>
        {kpis.map(k => (
          <div key={k.label} className="card" style={{ padding: '13px 15px' }}>
            <div className="spread" style={{ marginBottom: 8 }}>
              <span className="label">{k.label}</span>
              <span style={{ color: k.accent ?? 'var(--gold)', opacity: 0.8 }}>{k.icon}</span>
            </div>
            <div className="kpi-value" style={{ fontSize: 26, color: k.accent ?? 'var(--text-1)' }}>{k.value}</div>
            <div className="t-small text-3" style={{ marginTop: 3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 三栏审片工作区 */}
      <div style={{ display: 'grid', gridTemplateColumns: '306px 1fr 344px', gap: 12, alignItems: 'stretch', minHeight: 560 }}>
        {/* 左：胶片队列 rail */}
        <Panel
          title={<>待审队列 · {queue.length}</>}
          icon={<Layers size={13} />}
          bodyClass="panel-body-0"
          style={{ minHeight: 560 }}
        >
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--hairline)' }}>
            <Segmented<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: '全部' },
                { value: 'critical', label: '严重' },
                { value: 'high', label: '高' },
                { value: 'mid', label: '中' },
                { value: 'low', label: '低' },
              ]}
            />
            {/* 风险构成条 */}
            <div className="row" style={{ height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 11, background: 'var(--surface-3)' }}>
              {dist.map(d => d.n > 0 && (
                <div key={d.s} title={`${SEVERITY_LABEL[d.s]} ${d.n}`} style={{ width: `${(d.n / distTotal) * 100}%`, background: `var(--sev-${d.s})` }} />
              ))}
            </div>
          </div>

          <div className="filmstrip" style={{ padding: 10, maxHeight: 470, gap: 7 }}>
            {queue.map(it => (
              <button
                key={it.id}
                className={`film-item ${it.id === selected?.id ? 'sel' : ''}`}
                style={{ borderLeftColor: `var(--sev-${it.severity})`, textAlign: 'left' }}
                onClick={() => setSelId(it.id)}
              >
                <div className={`film-thumb ${it.blur ? 'blur' : ''}`}>
                  {it.modality === 'text'
                    ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 9, padding: 4, textAlign: 'center', lineHeight: 1.2 }}>{(it.text ?? '').slice(0, 14)}</div>
                    : <img src={mediaUrl(it.id, 120, 120)} alt="" loading="lazy" />}
                </div>
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="row spread" style={{ gap: 6 }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>{it.id.replace('RV-2406-', '#')}</span>
                    <SeverityBadge severity={it.severity} showLabel={false} />
                  </div>
                  <div className="t-small" style={{ color: 'var(--text-1)', fontWeight: 600, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.category}</div>
                  <div className="row spread" style={{ marginTop: 4 }}>
                    <ModalityChip modality={it.modality} />
                    <span className="mononum" style={{ fontSize: 10, color: 'var(--text-3)' }}>AI {it.confidence}%</span>
                  </div>
                </div>
              </button>
            ))}
            {!queue.length && (
              <div className="col" style={{ alignItems: 'center', padding: '50px 16px', textAlign: 'center', color: 'var(--text-3)', gap: 8 }}>
                <CheckCircle2 size={30} style={{ color: 'var(--sev-safe)', opacity: 0.6 }} />
                <span className="t-small">该筛选下队列已清空</span>
              </div>
            )}
          </div>
        </Panel>

        {/* 中：证物审片台 */}
        <Panel title="证物审片台" icon={<Eye size={13} />} bodyClass="panel-body" style={{ minHeight: 560 }}>
          {selected ? (
            <div className="col" style={{ height: '100%', gap: 12 }}>
              <div className="row spread">
                <div className="row gap-2">
                  <SeverityBadge severity={selected.severity} />
                  <span className="t-h3">{selected.category}</span>
                </div>
                <div className="row gap-2">
                  <span className="tag tag-mono">{selected.id}</span>
                  <button className="btn btn-subtle btn-sm" onClick={() => setReveal(v => !v)}>
                    {reveal || !selected.blur ? <EyeOff size={13} /> : <Eye size={13} />}
                    {selected.blur ? (reveal ? '模糊' : '查看证据') : '清晰'}
                  </button>
                </div>
              </div>

              <MediaStage
                item={reveal ? { ...selected, blur: false } : selected}
                height={324}
                scanning
                allowReveal
                onReveal={() => setReveal(true)}
              />

              {/* 来源 / 发布者 / 时间 */}
              <div className="row gap-4 t-small text-3 wrap">
                <span>来源 <span className="text-2" style={{ fontWeight: 600 }}>{selected.source}</span></span>
                <span>发布者 <span className="text-2 mono">{selected.author}</span></span>
                <span>入列 <span className="text-2 mononum">{selected.submittedAt}</span></span>
                <span className="row gap-1">等待 <TimeChip seconds={selected.waitSec} countUp /></span>
              </div>

              {/* 处置动作区 */}
              <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
                {canAct ? (
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    <ActBtn icon={<Check size={15} />} label="通过" hint="A" tone="ok" onClick={() => dispose('pass')} />
                    <ActBtn icon={<MinusCircle size={15} />} label="限流" hint="L" tone="warn" onClick={() => dispose('limit')} />
                    <ActBtn icon={<Ban size={15} />} label="下架" hint="R" tone="danger" onClick={() => dispose('remove')} />
                    <ActBtn icon={<ArrowUpCircle size={15} />} label="升级人审" hint="E" tone="info" onClick={() => dispose('escalate')} />
                  </div>
                ) : (
                  <div className="t-small text-3" style={{ textAlign: 'center', padding: 8 }}>当前角色为只读视角，无处置权限</div>
                )}
              </div>
            </div>
          ) : (
            <div className="col" style={{ alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', gap: 10 }}>
              <CheckCircle2 size={40} style={{ color: 'var(--sev-safe)', opacity: 0.5 }} />
              <span className="t-h3 text-2">队列已清空</span>
              <span className="t-small">本批次内容已全部处置完毕</span>
            </div>
          )}
        </Panel>

        {/* 右：AI 判定面板 */}
        <Panel title="AI 判定 · 命中策略" icon={<Cpu size={13} />} style={{ minHeight: 560 }}>
          {selected ? (
            <div className="col gap-4">
              {/* 主判定 */}
              <div>
                <div className="row spread" style={{ marginBottom: 7 }}>
                  <span className="label">主判定置信度</span>
                  <span className={`mononum sev-${selected.severity}`} style={{ fontSize: 18, fontWeight: 700 }}>{selected.confidence}%</span>
                </div>
                <VerdictBar confidence={selected.confidence} severity={selected.severity} />
                <div className="t-small text-3" style={{ marginTop: 6 }}>判定 <span className={`sev-${selected.severity}`} style={{ fontWeight: 600 }}>{selected.category} · {SEVERITY_LABEL[selected.severity]}</span></div>
              </div>

              {selected.aiSynthetic !== undefined && (
                <div className="card" style={{ padding: '10px 12px', background: 'var(--surface-2)' }}>
                  <div className="row spread"><span className="label">AI 合成概率</span><span className="mononum sev-high" style={{ fontWeight: 700 }}>{selected.aiSynthetic}%</span></div>
                  <div className="t-small text-3" style={{ marginTop: 4 }}>检出合成痕迹 · 建议送合成检测复核</div>
                </div>
              )}

              {/* 命中策略 */}
              <div>
                <div className="label" style={{ marginBottom: 8 }}>命中策略 · {selected.hits.length}</div>
                <div className="col gap-2">
                  {selected.hits.map(h => (
                    <div key={h.code} className="card" style={{ padding: '9px 11px' }}>
                      <div className="row spread">
                        <span className="mono" style={{ fontSize: 11, color: 'var(--gold)' }}>{h.code}</span>
                        <span className="mononum t-small text-2">{h.confidence}%</span>
                      </div>
                      <div className="t-small" style={{ color: 'var(--text-1)', marginTop: 3 }}>{h.name}</div>
                      <div style={{ marginTop: 6 }}><VerdictBar confidence={h.confidence} severity={selected.severity} /></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 快捷键说明 */}
              <div className="card" style={{ padding: '10px 12px', background: 'var(--surface-2)', marginTop: 4 }}>
                <div className="label" style={{ marginBottom: 8 }}>键盘处置</div>
                <div className="col gap-2">
                  {[['A', '通过'], ['L', '限流'], ['R', '下架'], ['E', '升级人审'], ['J / K', '上下切换'], ['空格', '切换模糊']].map(([k, v]) => (
                    <div key={k} className="row spread t-small">
                      <span className="text-3">{v}</span>
                      <span className="kbd" style={{ fontFamily: 'var(--font-mono)' }}>{k}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="t-small text-3" style={{ textAlign: 'center', padding: '40px 12px' }}>无待审内容</div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function ActBtn({ icon, label, hint, tone, onClick }: {
  icon: React.ReactNode; label: string; hint: string; tone: 'ok' | 'warn' | 'danger' | 'info'; onClick: () => void;
}) {
  const map = { ok: 'var(--success)', warn: 'var(--warning)', danger: 'var(--danger)', info: 'var(--info)' };
  const c = map[tone];
  return (
    <button
      className="col"
      onClick={onClick}
      style={{
        alignItems: 'center', gap: 5, padding: '11px 6px', borderRadius: 'var(--r-md)', cursor: 'pointer',
        background: `color-mix(in srgb, ${c} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${c} 32%, transparent)`,
        color: c, transition: 'all var(--dur-micro) var(--ease)',
      }}
    >
      {icon}
      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</span>
      <span className="kbd" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{hint}</span>
    </button>
  );
}
