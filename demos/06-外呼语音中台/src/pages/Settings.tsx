import { Fragment, useState } from 'react';
import { CheckCircle2, Minus, UserCog, SlidersHorizontal, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { Panel } from '../components/sig';
import { ROLES, PERMISSIONS } from '../lib/mockData';
import { useAuth } from '../contexts/AuthContext';
import type { PermCategory } from '../types';

const CAT_LABEL: Record<PermCategory, string> = { page: '页面访问', action: '操作权限', data: '数据权限' };
const CATS: PermCategory[] = ['page', 'action'];

const TOGGLES = [
  { key: 'dnd', label: '默认勿扰时段 21:00–09:00', desc: '所有活动默认遵守，合规官可豁免特定场景', on: true },
  { key: 'rec', label: '录音留痕默认开启', desc: '每通加密留痕 6 年，不可篡改、可追溯', on: true },
  { key: 'sensitive', label: '敏感词命中自动转人工', desc: '命中「投诉」等高危词即时转人工 + 登记免打扰', on: true },
  { key: 'freq', label: '单客户日触达上限 = 1 次', desc: '严格频控，超限自动拦截', on: true },
];

export default function Settings() {
  const { currentRole } = useAuth();
  const [toggles, setToggles] = useState(TOGGLES.map(t => t.on));

  return (
    <div className="page page-wide">
      <PageHeader title="设置 / 角色" subtitle="4 角色 × 权限矩阵 · 分权即职责边界 · 系统合规默认项" />

      {/* 4 角色卡 */}
      <div className="grid grid-cols-auto" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        {ROLES.map((r, i) => (
          <div key={r.id} className={`card reveal reveal-${i + 1}`} style={{ borderTop: `2px solid ${r.color}` }}>
            <div className="row spread" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{r.name}</span>
              {currentRole?.id === r.id && <span className="badge" style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }}>当前</span>}
            </div>
            <div className="mono t-small text-3" style={{ marginBottom: 8 }}>{r.enName}</div>
            <div className="t-small text-2" style={{ lineHeight: 1.55, minHeight: 56 }}>{r.description}</div>
            <div className="row gap-2" style={{ marginTop: 10 }}>
              <span className="mononum" style={{ fontSize: 18, fontWeight: 700, color: r.color }}>{r.permissions.length}</span>
              <span className="t-small text-3">项权限 · 落地 {r.landing}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.7fr 1fr', gap: 14 }}>
        {/* 权限矩阵 */}
        <Panel title="权限矩阵" icon={<UserCog size={14} />} right={<span className="t-small text-3">绿勾=有权 · 灰线=无权 · 最小特权</span>} bodyClass="panel-body-0">
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ tableLayout: 'fixed', minWidth: 620 }}>
              <colgroup>
                <col style={{ width: '34%' }} />
                {ROLES.map(r => <col key={r.id} style={{ width: `${66 / ROLES.length}%` }} />)}
              </colgroup>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 16 }}>权限项</th>
                  {ROLES.map(r => (
                    <th key={r.id} style={{ textAlign: 'center', color: r.color }}>{r.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CATS.map(cat => {
                  const perms = PERMISSIONS.filter(p => p.category === cat);
                  if (!perms.length) return null;
                  return (
                    <Fragment key={cat}>
                      <tr>
                        <td colSpan={ROLES.length + 1} style={{ background: 'var(--surface-2)', padding: '6px 16px' }}>
                          <span className="label">{CAT_LABEL[cat]} · {perms.length}</span>
                        </td>
                      </tr>
                      {perms.map(perm => (
                        <tr key={perm.key}>
                          <td style={{ paddingLeft: 16 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-1)' }}>{perm.label}</div>
                            <div className="t-small text-3" style={{ marginTop: 1 }}>{perm.desc}</div>
                          </td>
                          {ROLES.map(r => {
                            const has = r.permissions.includes(perm.key);
                            return (
                              <td key={r.id} style={{ textAlign: 'center' }}>
                                {has
                                  ? <CheckCircle2 size={15} style={{ color: 'var(--success)' }} />
                                  : <Minus size={14} style={{ color: 'var(--text-3)', opacity: 0.4 }} />}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* 系统合规默认 */}
        <Panel title="系统合规默认" icon={<SlidersHorizontal size={14} />}>
          <div className="col gap-3">
            {TOGGLES.map((t, i) => (
              <div key={t.key} className="row spread" style={{ alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < TOGGLES.length - 1 ? '1px solid var(--hairline)' : 'none' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{t.label}</div>
                  <div className="t-small text-3" style={{ marginTop: 2, lineHeight: 1.5 }}>{t.desc}</div>
                </div>
                <button
                  onClick={() => setToggles(ts => ts.map((x, j) => j === i ? !x : x))}
                  style={{ flexShrink: 0, width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', position: 'relative', background: toggles[i] ? 'var(--success)' : 'var(--surface-3)', transition: 'background var(--dur-base) var(--ease)' }}
                >
                  <span style={{ position: 'absolute', top: 2, left: toggles[i] ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left var(--dur-base) var(--ease)', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
                </button>
              </div>
            ))}
            <div className="row gap-2" style={{ marginTop: 4, padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--gold-glow)', border: '1px solid var(--hairline-strong)' }}>
              <ShieldCheck size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} />
              <span className="t-small" style={{ color: 'var(--gold)', lineHeight: 1.5 }}>合规默认项为强制基线，关闭需合规官审批并留痕。</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
