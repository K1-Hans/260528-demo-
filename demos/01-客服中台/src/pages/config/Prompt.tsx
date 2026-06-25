import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, GitCompare, Copy, CheckCircle2 } from 'lucide-react';
import { PageHeader, Segmented, Badge, Card } from '../../components/ui';
import { Modal, toast } from '../../components/kit';
import type { PromptKind, PromptVersion } from '../../types';

// ─── Mock 数据 ───────────────────────────────────────────────────────────────

const QA_PROMPT_V15 = `# 角色
你是示例消费金融的智能客服小云，面向借贷客户提供7×24小时自助服务。

# 核心任务
1. 准确解答客户关于还款、账单、借款申请、会员权益等常见问题
2. 识别客户情绪，对情绪激动客户优先安抚后再解答
3. 无法解答时主动引导转接人工（08:00-21:00）

# 回复风格
- 语气亲切自然，可用"亲亲~"开头
- 简洁不啰嗦，重要操作路径清晰标出（『APP路径』格式）
- 禁止使用"您好，我是AI客服"等模板套话

# 红线（违反即触发合规拦截）
- 禁止承诺放款时间、额度、利率
- 禁止输出具体利率数值，统一引导查账单或联系人工
- 禁止催收相关承诺或威胁性表述
- 禁止透露客户PII信息

# 当前知识库范围
QA条目 12,954条 / 场景卡片 530张 / 寒暄 1,396条 / 转人工话术 149条`;

const QA_PROMPT_V14 = `# 角色
你是示例消费金融的智能客服小云，面向借贷客户提供7×24小时自助服务。

# 核心任务
1. 准确解答客户关于还款、账单、借款申请、会员权益等常见问题
2. 识别客户情绪，对情绪激动客户优先安抚后再解答
3. 无法解答时主动引导转接人工（08:00-21:00）

# 回复风格
- 语气亲切自然，可用"亲亲~"开头
- 简洁不啰嗦，重要操作路径清晰标出

# 红线（违反即触发合规拦截）
- 禁止承诺放款时间、额度、利率
- 禁止输出具体利率数值，统一引导查账单或联系人工
- 禁止催收相关承诺或威胁性表述`;

const QA_PROMPT_V13 = `# 角色
你是示例消费金融的智能客服，为客户提供借贷相关服务咨询。

# 任务
回答客户关于还款、账单、申请流程的常见问题。对无法解答的问题引导转人工。

# 红线
- 禁止承诺放款时间和额度
- 禁止输出利率数值`;

const INTENT_PROMPT_V4 = `# 任务
分析用户输入，输出意图分类JSON，必须严格遵守schema。

# 输出Schema
{
  "l1": "<一级意图>",
  "l2": "<二级意图>",
  "l3": "<三级意图>",
  "confidence": <0.0-1.0>,
  "emotion": "calm|upset|angry",
  "risk_flags": ["<风险类型>"]
}

# 一级意图枚举（共10类）
还款相关 / 申请咨询 / 产品与信息 / 催收相关 / 营销活动 / 费用相关 / 业务办理 / 信息维护 / 批量问题 / 自定义

# 情绪判断标准
- calm: 正常询问，无明显负面词汇
- upset: 包含"为什么""怎么回事""太贵""不合理"等不满词
- angry: 包含"投诉""起诉""曝光""银保监"等高风险词或语气强烈

# 约束
- 输出纯JSON，不附加任何解释文字
- confidence < 0.6时l2/l3可为null
- risk_flags命中时必须填写（共8类风险）`;

const INTENT_PROMPT_V3 = `# 任务
分析用户输入，输出意图分类JSON。

# 输出Schema
{
  "l1": "<一级意图>",
  "l2": "<二级意图>",
  "confidence": <0.0-1.0>,
  "emotion": "calm|upset|angry"
}

# 一级意图枚举
还款相关 / 申请咨询 / 产品与信息 / 催收相关 / 营销活动 / 费用相关 / 业务办理 / 信息维护 / 批量问题 / 自定义

# 约束
- 输出纯JSON，不附加解释`;

const SOOTHE_PROMPT_V8 = `# 角色
你是小云情绪安抚专员，专门处理情绪激动客户。

# 第一段：共情承接（必须）
用真诚语言承认客户的不满，避免程序化表述。禁止"您好""非常抱歉打扰"等套话。
示例："听到您这么说，我真的理解这种着急——"

# 第二段：责任说明（针对性）
简要说明当前状况，不甩锅、不回避，若是系统/政策问题如实说。
如涉及利率/催收/额度争议，只描述现状，不做任何承诺。

# 第三段：行动方案（必须有出口）
给出至少一个可操作的下一步：
- 人工转接（08:00-21:00）：400-800-1234
- APP自助路径
- 工单记录（明确几个工作日跟进）

# 红线
- 禁止承诺"一定会解决"或给出具体时间节点
- 禁止贬低同事或公司政策
- 涉及"投诉""起诉""银保监"必须触发风险标记`;

const SOOTHE_PROMPT_V7 = `# 角色
你是小云情绪安抚专员。

# 三段式回复
1. 共情：承认客户不满，语气真诚
2. 说明：简要描述现状，不甩锅
3. 方案：给出可操作的下一步

# 红线
- 禁止承诺具体时间节点
- 涉及投诉/起诉必须标记风险`;

const MOCK_PROMPTS: PromptKind[] = [
  {
    key: 'qa',
    label: '问答 Agent',
    activeVersion: 'v15',
    temp: 0.4,
    model: 'DeepSeek-V3',
    versions: [
      { version: 'v15', content: QA_PROMPT_V15, updatedAt: '2026-06-10 14:22', updatedBy: '林婉清', note: '新增知识库范围说明，补充PII红线', active: true },
      { version: 'v14', content: QA_PROMPT_V14, updatedAt: '2026-05-28 09:15', updatedBy: '林婉清', note: '回复风格细化，增加操作路径标注规范' },
      { version: 'v13', content: QA_PROMPT_V13, updatedAt: '2026-05-14 16:40', updatedBy: '张明远', note: '初始版本精简化调整' },
      { version: 'v12', content: '（历史归档，已不适用）', updatedAt: '2026-04-30 11:08', updatedBy: '张明远', note: '引入三级意图引导' },
    ],
  },
  {
    key: 'intent',
    label: '意图判别 Agent',
    activeVersion: 'v4',
    temp: 0.0,
    model: 'Qwen2.5-7B',
    versions: [
      { version: 'v4', content: INTENT_PROMPT_V4, updatedAt: '2026-06-08 10:30', updatedBy: '林婉清', note: '新增risk_flags字段 + 情绪判断标准细化', active: true },
      { version: 'v3', content: INTENT_PROMPT_V3, updatedAt: '2026-05-20 15:12', updatedBy: '林婉清', note: '增加emotion字段' },
      { version: 'v2', content: '（历史归档）', updatedAt: '2026-05-06 09:00', updatedBy: '张明远', note: '添加l2二级意图' },
      { version: 'v1', content: '（历史归档）', updatedAt: '2026-04-22 11:00', updatedBy: '张明远', note: '初版，仅l1分类' },
    ],
  },
  {
    key: 'soothe',
    label: '安抚 Agent',
    activeVersion: 'v8',
    temp: 0.3,
    model: 'GPT-4o',
    versions: [
      { version: 'v8', content: SOOTHE_PROMPT_V8, updatedAt: '2026-06-12 17:05', updatedBy: '周慎', note: '三段式结构规范化，补充合规红线与风险触发条件', active: true },
      { version: 'v7', content: SOOTHE_PROMPT_V7, updatedAt: '2026-06-01 14:20', updatedBy: '周慎', note: '精简结构，增加三段式说明' },
      { version: 'v6', content: '（历史归档）', updatedAt: '2026-05-18 09:30', updatedBy: '赵越', note: '初版安抚话术模板' },
    ],
  },
];

// ─── Diff 工具函数 ────────────────────────────────────────────────────────────

type DiffLine = { type: 'same' | 'del' | 'add'; text: string };

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  let i = 0, j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (i >= oldLines.length) {
      result.push({ type: 'add', text: newLines[j++] });
    } else if (j >= newLines.length) {
      result.push({ type: 'del', text: oldLines[i++] });
    } else if (oldLines[i] === newLines[j]) {
      result.push({ type: 'same', text: oldLines[i++] });
      j++;
    } else {
      result.push({ type: 'del', text: oldLines[i++] });
      result.push({ type: 'add', text: newLines[j++] });
    }
  }
  return result;
}

// ─── 子组件：版本历史列表 ────────────────────────────────────────────────────

function VersionHistory({
  versions,
  activeVersion,
  onRollback,
}: {
  versions: PromptVersion[];
  activeVersion: string;
  onRollback: (v: PromptVersion) => void;
}) {
  return (
    <div className="col gap-2" style={{ marginTop: 12 }}>
      {versions.map((v) => (
        <div
          key={v.version}
          className="row spread"
          style={{
            padding: '10px 14px',
            background: 'var(--surface-2)',
            border: `1px solid ${v.version === activeVersion ? 'var(--gold)' : 'var(--hairline)'}`,
            borderRadius: 'var(--r-sm)',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div className="col gap-1" style={{ flex: 1, minWidth: 0 }}>
            <div className="row gap-2" style={{ alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                {v.version}
              </span>
              {v.version === activeVersion && (
                <span
                  className="badge"
                  style={{
                    background: 'color-mix(in srgb, var(--gold) 14%, transparent)',
                    color: 'var(--gold)',
                    fontSize: 11,
                  }}
                >
                  <CheckCircle2 size={10} style={{ marginRight: 3 }} />
                  已生效
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {v.updatedAt} · {v.updatedBy}
            </div>
            {v.note && (
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{v.note}</div>
            )}
          </div>
          {v.version !== activeVersion && (
            <button
              className="btn btn-subtle btn-sm"
              onClick={() => onRollback(v)}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <RotateCcw size={12} />
              回滚
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── 子组件：单个 Prompt Tab 内容 ────────────────────────────────────────────

function PromptTab({ kind }: { kind: PromptKind }) {
  const activeVer = kind.versions.find((v) => v.version === kind.activeVersion)!;
  const [editContent, setEditContent] = useState('');
  const [editNote, setEditNote] = useState('');
  const [temp, setTemp] = useState(kind.temp);
  const [showHistory, setShowHistory] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);

  const hasEdit = editContent.trim().length > 0 && editContent !== activeVer.content;

  const diffLines = useMemo(
    () => (hasEdit ? computeDiff(activeVer.content, editContent) : []),
    [hasEdit, activeVer.content, editContent],
  );

  function handleCopyToEdit() {
    setEditContent(activeVer.content);
    toast('已复制当前版本到编辑区', 'info');
  }

  function handlePublish() {
    setDiffOpen(false);
    setEditContent('');
    setEditNote('');
    toast(`${kind.label} 新版本已发布，下一条会话生效`, 'success');
  }

  function handleRollback(v: PromptVersion) {
    toast(`已回滚至 ${v.version}（${v.note}），下一条会话生效`, 'success');
  }

  const modelColor =
    kind.model.startsWith('DeepSeek')
      ? 'var(--info)'
      : kind.model.startsWith('Qwen')
      ? 'var(--emerald)'
      : 'var(--gold)';

  return (
    <div className="col gap-3 reveal">
      {/* Tab header */}
      <div
        className="row spread"
        style={{
          padding: '14px 18px',
          background: 'var(--surface-2)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-md)',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div className="row gap-3" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
              {kind.activeVersion}
            </span>
            <span
              className="badge"
              style={{
                background: 'color-mix(in srgb, var(--gold) 14%, transparent)',
                color: 'var(--gold)',
                fontSize: 11,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <CheckCircle2 size={10} />
              已生效
            </span>
          </div>
          <span
            className="badge"
            style={{
              background: `color-mix(in srgb, ${modelColor} 12%, transparent)`,
              color: modelColor,
            }}
          >
            {kind.model}
          </span>
        </div>

        <div className="row gap-3" style={{ alignItems: 'center' }}>
          {/* Temperature 滑块 */}
          <div className="row gap-2" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
              Temperature
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={temp}
              onChange={(e) => setTemp(parseFloat(e.target.value))}
              style={{
                width: 88,
                accentColor: 'var(--gold)',
                cursor: 'pointer',
              }}
            />
            <span
              className="mono"
              style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', minWidth: 28, fontVariantNumeric: 'tabular-nums' }}
            >
              {temp.toFixed(2)}
            </span>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowHistory((s) => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            版本历史
            {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* 版本历史展开 */}
      {showHistory && (
        <Card style={{ padding: 16 }}>
          <VersionHistory
            versions={kind.versions}
            activeVersion={kind.activeVersion}
            onRollback={handleRollback}
          />
        </Card>
      )}

      {/* 左右双栏 */}
      <div
        className="row gap-3"
        style={{ alignItems: 'stretch', gap: 16 }}
      >
        {/* 左栏：当前生效版本（只读） */}
        <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
          <div
            className="row spread"
            style={{ marginBottom: 6 }}
          >
            <span className="label" style={{ fontSize: 12 }}>当前生效版本（只读）</span>
            <Badge color="var(--success)">{kind.activeVersion} · 已生效</Badge>
          </div>
          <textarea
            readOnly
            value={activeVer.content}
            style={{
              flex: 1,
              minHeight: 340,
              width: '100%',
              background: 'var(--surface-2)',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--r-md)',
              color: 'var(--text-2)',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 12.5,
              lineHeight: 1.65,
              padding: '14px 16px',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
            最后更新：{activeVer.updatedAt} · {activeVer.updatedBy} · {activeVer.note}
          </div>
        </div>

        {/* 右栏：编辑区 */}
        <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
          <div className="row spread" style={{ marginBottom: 6 }}>
            <span className="label" style={{ fontSize: 12 }}>编辑区（草稿）</span>
            {hasEdit && (
              <span style={{ fontSize: 11, color: 'var(--warning)' }}>未发布变更</span>
            )}
          </div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="从左侧「复制当前版本」开始编辑，或直接粘贴新 Prompt…"
            style={{
              flex: 1,
              minHeight: 280,
              width: '100%',
              background: 'var(--surface-1)',
              border: `1px solid ${hasEdit ? 'var(--gold)' : 'var(--hairline)'}`,
              borderRadius: 'var(--r-md)',
              color: 'var(--text-1)',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 12.5,
              lineHeight: 1.65,
              padding: '14px 16px',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
          <input
            type="text"
            className="input"
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="修改说明（发布时记录）"
            style={{ fontSize: 13 }}
          />

          {/* 底部操作 */}
          <div className="row gap-2" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <button
              className="btn btn-subtle btn-sm"
              onClick={handleCopyToEdit}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Copy size={13} />
              复制当前版本到编辑区
            </button>
            <button
              className="btn btn-primary btn-sm"
              disabled={!hasEdit}
              onClick={() => setDiffOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                opacity: hasEdit ? 1 : 0.38,
                cursor: hasEdit ? 'pointer' : 'not-allowed',
              }}
            >
              <GitCompare size={13} />
              预览差异并发布
            </button>
          </div>
        </div>
      </div>

      {/* Diff 弹窗 */}
      <Modal
        open={diffOpen}
        onClose={() => setDiffOpen(false)}
        title="变更差异预览"
        sub={`${kind.label} · ${kind.activeVersion} → 新版本`}
        width={700}
        footer={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setDiffOpen(false)}>
              取消
            </button>
            <button className="btn btn-primary btn-sm" onClick={handlePublish}>
              确认发布（下一条会话生效）
            </button>
          </>
        }
      >
        <div
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: 12.5,
            lineHeight: 1.7,
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--r-md)',
            overflow: 'hidden',
          }}
        >
          {diffLines.map((line, idx) => {
            const bg =
              line.type === 'del'
                ? 'color-mix(in srgb, var(--danger) 12%, transparent)'
                : line.type === 'add'
                ? 'color-mix(in srgb, var(--success) 12%, transparent)'
                : 'transparent';
            const color =
              line.type === 'del'
                ? 'var(--danger)'
                : line.type === 'add'
                ? 'var(--success)'
                : 'var(--text-2)';
            const prefix = line.type === 'del' ? '- ' : line.type === 'add' ? '+ ' : '  ';
            return (
              <div
                key={idx}
                style={{
                  background: bg,
                  color,
                  padding: '2px 16px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {prefix}{line.text}
              </div>
            );
          })}
          {diffLines.length === 0 && (
            <div style={{ padding: '24px 16px', color: 'var(--text-3)', textAlign: 'center' }}>
              无差异
            </div>
          )}
        </div>
        {editNote && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 14px',
              background: 'var(--surface-2)',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--r-sm)',
              fontSize: 13,
              color: 'var(--text-2)',
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--text-3)' }}>修改说明：</span>
            {editNote}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────

export default function Prompt() {
  type TabKey = 'qa' | 'intent' | 'soothe';
  const [activeTab, setActiveTab] = useState<TabKey>('qa');

  const TAB_OPTIONS: { value: TabKey; label: string }[] = [
    { value: 'qa', label: '问答 Agent（active v15）' },
    { value: 'intent', label: '意图判别 Agent（active v4）' },
    { value: 'soothe', label: '安抚 Agent（active v8）' },
  ];

  const currentKind = MOCK_PROMPTS.find((p) => p.key === activeTab)!;

  return (
    <div className="page">
      <PageHeader
        title="Prompt 版本管理"
        subtitle="对话 / 意图 / 安抚 三 Agent · 版本化 · diff 发布 · 一键回滚"
      />

      <div style={{ marginBottom: 20 }}>
        <Segmented<TabKey>
          options={TAB_OPTIONS}
          value={activeTab}
          onChange={(v: TabKey) => setActiveTab(v)}
        />
      </div>

      <PromptTab key={activeTab} kind={currentKind} />
    </div>
  );
}
