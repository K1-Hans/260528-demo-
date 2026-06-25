import { useState } from 'react';
import { Play, Pause, Mic, SlidersHorizontal, BarChart3, GitCompare } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { Panel } from '../components/sig';
import { toast } from '../components/kit';
import Waveform from '../components/Waveform';
import Chart from '../components/Chart';
import { baseOption, axisStyle, cssVar } from '../lib/chartTheme';
import { useAuth } from '../contexts/AuthContext';
import type { VoiceProfile } from '../types';

const VOICES: VoiceProfile[] = [
  { id: 'v1', name: '云溪', gender: '女声', style: '沉稳专业', warmth: 62, formality: 78, speed: 48, completionRate: 91.2, hangupRate: 6.4 },
  { id: 'v2', name: '林朗', gender: '男声', style: '亲和温暖', warmth: 84, formality: 55, speed: 52, completionRate: 88.6, hangupRate: 8.1 },
  { id: 'v3', name: '标准客服音', gender: '女声', style: '标准清晰', warmth: 50, formality: 70, speed: 50, completionRate: 86.0, hangupRate: 9.3 },
  { id: 'v4', name: '晚晴', gender: '女声', style: '柔和耐心', warmth: 90, formality: 48, speed: 44, completionRate: 92.8, hangupRate: 5.7 },
];

export default function VoiceConfig() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('voice:edit');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [sel, setSel] = useState(VOICES[0]);
  const [warmth, setWarmth] = useState(sel.warmth);
  const [formality, setFormality] = useState(sel.formality);
  const [speed, setSpeed] = useState(sel.speed);
  const [abA, setAbA] = useState('v1');
  const [abB, setAbB] = useState('v2');

  const pick = (v: VoiceProfile) => { setSel(v); setWarmth(v.warmth); setFormality(v.formality); setSpeed(v.speed); };
  const play = (id: string) => { setPlayingId(p => p === id ? null : id); if (playingId !== id) toast('试听中 · 听筒侧实时合成波形', 'info'); };

  const compareOpt = () => ({
    ...baseOption(),
    legend: { bottom: 0, textStyle: { color: cssVar('--text-3'), fontSize: 11 }, icon: 'roundRect', itemWidth: 10, itemHeight: 10 },
    grid: { left: 8, right: 14, top: 18, bottom: 36, containLabel: true },
    xAxis: { type: 'category', data: VOICES.map(v => v.name), ...axisStyle() },
    yAxis: { type: 'value', max: 100, ...axisStyle() },
    series: [
      { name: '试听完播率', type: 'bar', data: VOICES.map(v => v.completionRate), barWidth: '28%', itemStyle: { color: cssVar('--success'), borderRadius: [3, 3, 0, 0] } },
      { name: '客户挂断率', type: 'bar', data: VOICES.map(v => v.hangupRate), barWidth: '28%', itemStyle: { color: cssVar('--warning'), borderRadius: [3, 3, 0, 0] } },
    ],
  });

  const voiceById = (id: string) => VOICES.find(v => v.id === id)!;

  const Slider = ({ label, value, set }: { label: string; value: number; set: (n: number) => void }) => (
    <div>
      <div className="row spread" style={{ marginBottom: 5 }}>
        <span className="t-small text-2">{label}</span>
        <span className="mononum t-small text-1">{value}</span>
      </div>
      <input type="range" min={0} max={100} value={value} disabled={!canEdit} className="input" style={{ padding: 0, height: 6, accentColor: 'var(--gold)' }} onChange={e => set(+e.target.value)} />
    </div>
  );

  return (
    <div className="page page-wide">
      <PageHeader title="语音 / 音色配置" subtitle="选音色 · 调情感与语速 · 波形试听 · A/B 对比 — TTS 参照 ElevenLabs / 沃丰 / 得助" />

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* 音色卡网格 */}
        <Panel title="音色库" icon={<Mic size={13} />} right={<span className="t-small text-3">点击试听 / 选用</span>}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {VOICES.map(v => (
              <div key={v.id} className={`card card-hover ${sel.id === v.id ? '' : ''}`} style={{ padding: 13, cursor: 'pointer', borderColor: sel.id === v.id ? 'var(--gold)' : undefined, boxShadow: sel.id === v.id ? '0 0 0 1px var(--gold)' : undefined }} onClick={() => pick(v)}>
                <div className="row spread" style={{ marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{v.name}</div>
                    <div className="t-small text-3">{v.gender} · {v.style}</div>
                  </div>
                  <button className="btn btn-primary btn-icon" style={{ borderRadius: '50%', width: 32, height: 32 }} onClick={e => { e.stopPropagation(); play(v.id); }}>
                    {playingId === v.id ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                </div>
                <div style={{ height: 26, marginBottom: 8 }}><Waveform active={playingId === v.id} bars={32} height={26} /></div>
                <div className="row spread">
                  <span className="t-small text-3">完播 <span className="mononum ok">{v.completionRate}%</span></span>
                  <span className="t-small text-3">挂断 <span className="mononum warn">{v.hangupRate}%</span></span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* 情感调参 */}
        <Panel title={`情感调参 · ${sel.name}`} icon={<SlidersHorizontal size={13} />} right={!canEdit && <span className="t-small text-3">仅话术设计师可调</span>}>
          <div className="col gap-4">
            <Slider label="亲和度" value={warmth} set={setWarmth} />
            <Slider label="正式度" value={formality} set={setFormality} />
            <Slider label="语速" value={speed} set={setSpeed} />
            <div className="row gap-2" style={{ marginTop: 4 }}>
              <button className="btn btn-primary flex-1" disabled={!canEdit} onClick={() => toast(`已保存「${sel.name}」音色参数`, 'success')}>保存配置</button>
              <button className="btn btn-subtle" disabled={!canEdit} onClick={() => pick(sel)}>重置</button>
            </div>
            <div className="card" style={{ padding: 11, background: 'var(--surface-2)' }}>
              <div className="t-small text-3" style={{ lineHeight: 1.6 }}>情感语音参照 <b className="gold">ElevenLabs</b>（2026-02 估值 $110 亿，情感 TTS 标杆）+ 国内沃丰 / 得助引擎。回访场景建议亲和度偏高、语速偏慢、克制不催促。</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* A/B 对比 + 完播挂断条 */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1.3fr', gap: 14 }}>
        <Panel title="A/B 音色对比试听" icon={<GitCompare size={13} />}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[{ k: abA, set: setAbA, tag: 'A' }, { k: abB, set: setAbB, tag: 'B' }].map(({ k, set, tag }) => {
              const v = voiceById(k);
              return (
                <div key={tag} className="card" style={{ padding: 12 }}>
                  <div className="row spread" style={{ marginBottom: 8 }}>
                    <span className="badge" style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }}>{tag} 版</span>
                    <select className="input" style={{ width: 'auto', padding: '3px 8px', fontSize: 12 }} value={k} onChange={e => set(e.target.value)}>
                      {VOICES.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                  <div style={{ height: 28, marginBottom: 8 }}><Waveform active={playingId === `ab-${tag}`} bars={26} height={28} /></div>
                  <button className="btn btn-subtle" style={{ width: '100%' }} onClick={() => play(`ab-${tag}`)}>{playingId === `ab-${tag}` ? '停止' : '试听'} {v.name}</button>
                  <div className="row spread" style={{ marginTop: 8 }}>
                    <span className="t-small text-3">完播 <span className="mononum ok">{v.completionRate}%</span></span>
                    <span className="t-small text-3">挂断 <span className="mononum warn">{v.hangupRate}%</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="音色完播率 / 挂断率对比" icon={<BarChart3 size={13} />}>
          <Chart build={compareOpt} height={236} />
        </Panel>
      </div>
    </div>
  );
}
