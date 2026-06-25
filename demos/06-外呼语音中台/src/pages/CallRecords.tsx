import { useState } from 'react';
import { Play, Pause, FileLock2, ListMusic, Activity, PhoneOff, ShieldCheck, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { Panel } from '../components/sig';
import { StatusBadge } from '../components/kit';
import Waveform from '../components/Waveform';
import TranscriptTimeline from '../components/TranscriptTimeline';
import Chart from '../components/Chart';
import { baseOption, axisStyle, areaGradient, cssVar } from '../lib/chartTheme';
import type { CallRecord, CallResult, TranscriptTurn } from '../types';

// ─── 页面专属 mock：3 条完整通话 ────────────────────────────────────────────
const T_ACTIVATE: TranscriptTurn[] = [
  { id: 'a1', speaker: 'ai', text: '您好，这里是示例消费金融客户回访，工号 8801，请问是机主本人吗？', at: '00:02', intent: '开场白' },
  { id: 'a2', speaker: 'cust', text: '是我。', at: '00:06', emotion: 'neu' },
  { id: 'a3', speaker: 'ai', text: '您上周开通的信用贷账户已激活成功，本次仅作安全确认，不涉及任何费用。', at: '00:09', intent: '身份确认' },
  { id: 'a4', speaker: 'cust', text: '好的，知道了。', at: '00:15', emotion: 'pos' },
  { id: 'a5', speaker: 'ai', text: '请确认您预留服务手机号尾号是否仍为 2841？', at: '00:18', intent: '字段核对' },
  { id: 'a6', speaker: 'cust', text: '对，是这个。', at: '00:23', emotion: 'pos' },
  { id: 'a7', speaker: 'ai', text: '已核对完成，感谢配合。账户异常可随时致电 400-800-1234，祝您生活愉快。', at: '00:27', intent: '结束语' },
];
const T_COMPLAINT: TranscriptTurn[] = [
  { id: 'b1', speaker: 'ai', text: '您好，示例消费金融客户回访，请问是王女士吗？', at: '00:02', intent: '开场白' },
  { id: 'b2', speaker: 'cust', text: '是，怎么了。', at: '00:05', emotion: 'neu' },
  { id: 'b3', speaker: 'ai', text: '想与您确认下近期还款日提醒是否已收到，本次不涉及任何收费。', at: '00:08', intent: '还款提醒' },
  { id: 'b4', speaker: 'cust', text: '（停顿 3 秒）', at: '00:13', silence: true, emotion: 'neu' },
  { id: 'b5', speaker: 'cust', text: '你们怎么天天打，我要投诉！', at: '00:16', emotion: 'neg', sensitive: true },
  { id: 'b6', speaker: 'ai', text: '非常抱歉打扰到您，已为您登记免打扰，并立即转接专属人工客服处理。', at: '00:20', intent: '安抚 · 转人工' },
];
const T_NOANSWER: TranscriptTurn[] = [
  { id: 'c1', speaker: 'ai', text: '（拨号 · 振铃 28 秒无人接听，按勿扰策略不再重拨）', at: '00:00', silence: true },
];

const RECORDS: CallRecord[] = [
  {
    id: 'REC-2406-7781', customer: '138****2841', scene: '信用卡激活回访', result: '激活成功',
    durationSec: 31, at: '今天 09:42', sensitiveHit: false, handedOff: false,
    sentimentCurve: [0.1, 0.2, 0.3, 0.5, 0.6, 0.7, 0.8],
    summary: '客户确认本人 + 手机号核对无误，激活回访完成，全程正向，无异议。',
    fields: [{ k: '本人确认', v: '是' }, { k: '预留手机', v: '尾号 2841' }, { k: '激活状态', v: '已激活' }],
    transcript: T_ACTIVATE,
  },
  {
    id: 'REC-2406-7765', customer: '139****6610', scene: '还款日提醒', result: '转人工',
    durationSec: 22, at: '今天 09:18', sensitiveHit: true, handedOff: true,
    sentimentCurve: [0.0, -0.1, -0.2, -0.3, -0.6, -0.8],
    summary: '客户情绪转负并明确表达投诉意愿，命中敏感词「投诉」，AI 即时安抚并转人工，已登记免打扰。',
    fields: [{ k: '本人确认', v: '是' }, { k: '敏感词', v: '投诉（命中）' }, { k: '处置', v: '转人工 + 免打扰' }],
    transcript: T_COMPLAINT,
  },
  {
    id: 'REC-2406-7752', customer: '137****9920', scene: '理财到期回访', result: '无人接听',
    durationSec: 0, at: '今天 08:55', sensitiveHit: false, handedOff: false,
    sentimentCurve: [0],
    summary: '振铃 28 秒无人接听，按勿扰与重拨策略顺延，不在勿扰时段重复触达。',
    fields: [{ k: '接通', v: '否' }, { k: '重拨策略', v: '次日顺延' }],
    transcript: T_NOANSWER,
  },
];

const RESULT_TONE: Record<CallResult, 'good' | 'warn' | 'bad' | 'muted' | 'info'> = {
  激活成功: 'good', 回访完成: 'good', 已提醒: 'info', 转人工: 'warn', 拒接回访: 'warn', 无人接听: 'muted',
};

export default function CallRecords() {
  const [selId, setSelId] = useState(RECORDS[1].id);
  const [playing, setPlaying] = useState(false);
  const sel = RECORDS.find(r => r.id === selId)!;

  const fmtDur = (s: number) => s <= 0 ? '—' : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const sentimentOpt = () => ({
    ...baseOption(),
    grid: { left: 8, right: 14, top: 16, bottom: 20, containLabel: true },
    xAxis: { type: 'category', data: sel.sentimentCurve.map((_, i) => `${i * 5}s`), ...axisStyle() },
    yAxis: { type: 'value', min: -1, max: 1, ...axisStyle(), splitNumber: 2 },
    series: [{
      type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, data: sel.sentimentCurve,
      lineStyle: { width: 2, color: cssVar('--gold') },
      areaStyle: { color: areaGradient(cssVar('--gold'), 0.2) },
      markLine: { silent: true, symbol: 'none', lineStyle: { color: cssVar('--hairline-strong'), type: 'dashed' }, data: [{ yAxis: 0 }] },
    }],
  });

  return (
    <div className="page page-wide">
      <PageHeader title="通话记录 · 转写回放" subtitle="ASR 双气泡转写 · 情绪曲线 · 声波回放 · 录音留痕审计" />

      <div className="grid" style={{ gridTemplateColumns: '290px 1.4fr 320px', gap: 14, alignItems: 'start' }}>
        {/* 左：通话列表 */}
        <Panel title="通话列表" icon={<ListMusic size={13} />} right={<span className="t-small text-3 mononum">{RECORDS.length}</span>} bodyClass="panel-body-0" style={{ maxHeight: 660 }}>
          <div style={{ overflowY: 'auto' }}>
            {RECORDS.map(r => (
              <button
                key={r.id}
                onClick={() => { setSelId(r.id); setPlaying(false); }}
                className="dec-row"
                style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', padding: '11px 13px', borderTop: 'none', borderRight: 'none', borderBottom: '1px solid var(--hairline)', background: r.id === selId ? 'var(--surface-2)' : 'transparent', borderLeft: `2px solid ${r.id === selId ? 'var(--gold)' : 'transparent'}` }}
              >
                <div className="row spread" style={{ marginBottom: 4 }}>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--text-1)' }}>{r.customer}</span>
                  <StatusBadge status={r.result} tone={RESULT_TONE[r.result]} />
                </div>
                <div className="t-small text-3" style={{ marginBottom: 3 }}>{r.scene}</div>
                <div className="row spread">
                  <span className="t-small text-3">{r.at}</span>
                  <span className="row gap-2">
                    {r.sensitiveHit && <span className="row gap-1" style={{ fontSize: 10.5, color: 'var(--warning)' }}><AlertTriangle size={10} />敏感</span>}
                    <span className="mono t-small text-3">{fmtDur(r.durationSec)}</span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Panel>

        {/* 中：声波 + 双气泡转写 */}
        <Panel
          title={`转写回放 · ${sel.id}`}
          icon={<Activity size={13} />}
          right={<StatusBadge status={sel.result} tone={RESULT_TONE[sel.result]} />}
          bodyClass="panel-body"
          style={{ display: 'flex', flexDirection: 'column', maxHeight: 660 }}
        >
          {/* 声波进度条 + 播放控制 */}
          <div className="row gap-3" style={{ padding: '4px 2px 12px', borderBottom: '1px solid var(--hairline)', marginBottom: 12 }}>
            <button className="btn btn-primary btn-icon" style={{ borderRadius: '50%', width: 36, height: 36 }} disabled={sel.durationSec === 0} onClick={() => setPlaying(p => !p)}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <div className="flex-1" style={{ minWidth: 0 }}>
              <Waveform active={playing && sel.durationSec > 0} sensitive={sel.sensitiveHit && playing} bars={56} height={30} />
            </div>
            <span className="mono t-small text-3">{fmtDur(sel.durationSec)}</span>
          </div>

          {sel.durationSec === 0
            ? <div className="col" style={{ alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-3)', padding: '40px 0' }}>
                <PhoneOff size={32} style={{ opacity: 0.4, marginBottom: 10 }} />
                <div className="t-small">振铃无人接听 · 无转写内容</div>
              </div>
            : <TranscriptTimeline turns={sel.transcript} maxHeight={470} />}
        </Panel>

        {/* 右：摘要 + 字段 + 合规 + 留痕 */}
        <div className="col gap-3">
          <Panel title="本通摘要" icon={<ShieldCheck size={13} />}>
            <div className="t-small text-2" style={{ lineHeight: 1.7, marginBottom: 12 }}>{sel.summary}</div>
            <div className="label" style={{ marginBottom: 8 }}>采集字段</div>
            <div className="col gap-2">
              {sel.fields.map((f, i) => (
                <div key={i} className="row spread" style={{ fontSize: 12.5 }}>
                  <span className="text-3">{f.k}</span>
                  <span className="text-1" style={{ fontWeight: 600 }}>{f.v}</span>
                </div>
              ))}
            </div>
            <div className="divider" />
            <div className="row spread" style={{ fontSize: 12.5 }}>
              <span className="text-3">合规判定</span>
              {sel.sensitiveHit
                ? <StatusBadge status="命中敏感词 · 已转人工" tone="warn" />
                : <StatusBadge status="合规通过" tone="good" />}
            </div>
          </Panel>

          <Panel title="录音留痕审计" icon={<FileLock2 size={13} />}>
            <div className="col gap-3">
              <div className="row spread"><span className="t-small text-3">保存期限</span><span className="qual-badge"><FileLock2 size={11} />6 年（金融留痕）</span></div>
              <div className="row spread"><span className="t-small text-3">访问日志</span><span className="mono t-small text-2">3 次 · 全留痕</span></div>
              <div className="row spread"><span className="t-small text-3">下载权限</span><span className="mono t-small" style={{ color: 'var(--warning)' }}>禁止下载</span></div>
              <div className="t-small text-3" style={{ lineHeight: 1.6, paddingTop: 4, borderTop: '1px solid var(--hairline)' }}>每通录音加密留痕、不可篡改、可追溯，满足金融监管审计要求。</div>
            </div>
          </Panel>

          <Panel title="单通情绪曲线" icon={<Activity size={13} />}>
            <Chart build={sentimentOpt} height={150} deps={[selId]} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
