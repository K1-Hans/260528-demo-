// 实时对话台 / 生产对话 — mock 会话（含完整 A1–A4 pipeline，消金真实场景）
import type { Conversation } from '../../types';

export const CONVERSATIONS: Conversation[] = [
  {
    id: 'c1', sessionId: 'sess_8f3a21', customer: '尾号 6271 客户', channel: '信用贷 APP',
    intentL1: '还款相关', emotion: 'calm', route: 'qa', status: '进行中',
    lastMsg: '我还款一直失败是怎么回事', startedAt: '09:41:02', turns: 2,
    messages: [
      { id: 'm1', role: 'user', text: '我还款一直失败是怎么回事', time: '09:41:02' },
      { id: 'm2', role: 'bot', text: '亲亲~还款失败通常是绑定的银行卡余额不足、卡状态异常或超过当日限额导致的呢。建议您：① 确认卡内余额充足；② 在还款日 23:00 前操作；③ 可在「信用贷 APP-我的-还款」更换还款方式重试。', time: '09:41:03', source: 'QA命中 0.91', tokens: 0, thumb: 'up' },
    ],
    pipeline: [
      { key: 'A1', name: 'A1 敏感词检测', status: 'pass', ms: 8, detail: '主词 + 变体 OR 匹配，无命中', tags: ['无敏感词'] },
      { key: 'A2', name: 'A2 意图 / 情绪', status: 'pass', ms: 312, detail: 'qwen-plus · temp=0 · 输出 {intent, emotion, route}', tags: ['还款相关', '还款咨询', 'calm'], confidence: 0.96 },
      { key: 'route', name: '路由决策', status: 'pass', ms: 2, detail: '无敏感词 · 情绪平稳 → route = qa', tags: ['qa'] },
      { key: 'A3', name: 'A3 RAG 检索', status: 'pass', ms: 176, detail: 'Embedding 模式 · text-embedding-v3 · Top-5 余弦', confidence: 0.91, tags: ['高置信直通 ≥ 0.88'],
        hits: [
          { q: '还款失败怎么办', score: 0.91, source: 'qa' },
          { q: '为什么我还款不成功', score: 0.86, source: 'qa' },
          { q: '还款扣款失败', score: 0.83, source: 'qa' },
          { q: '还款日是哪天', score: 0.71, source: 'qa' },
          { q: '怎么更换还款银行卡', score: 0.68, source: 'qa' },
        ] },
      { key: 'llm', name: 'LLM 生成', status: 'pass', ms: 3, detail: '高置信直通 · 跳过 LLM 直接返回标准答案（延迟 ~100ms）', tags: ['bypass'] },
      { key: 'A4', name: 'A4 合规质检', status: 'pass', ms: 38, detail: 'R1 来源校验 / R2 幻觉 / R3 费率 / R4 越权承诺 / R5 PII / R6 不当建议 / R7 安抚合规 — 全通过', tags: ['合规通过'] },
    ],
  },
  {
    id: 'c2', sessionId: 'sess_a72b09', customer: '尾号 3380 客户', channel: '信用贷 小程序',
    intentL1: '催收相关', emotion: 'angry', route: 'transfer', status: '已转人工',
    lastMsg: '你们再不解决我就投诉到银保监会！', startedAt: '09:38:47', turns: 3,
    messages: [
      { id: 'm1', role: 'user', text: '你们催收天天打电话，太过分了', time: '09:38:47' },
      { id: 'm2', role: 'bot', text: '非常理解您此刻的心情，给您带来的困扰我们深感抱歉。我已记录您反馈的情况，会优先为您核实跟进。', time: '09:38:49', source: '安抚 Agent', tokens: 186 },
      { id: 'm3', role: 'user', text: '你们再不解决我就投诉到银保监会！', time: '09:39:15' },
      { id: 'm4', role: 'bot', text: '理解您的着急，我会立即为您转接专属人工专员核实处理，请您稍候。', time: '09:39:16', blocked: true, blockReason: '越权承诺（原文含「保证 24 小时内解决」已改写）', source: '安抚 Agent · A4 改写', tokens: 142 },
    ],
    pipeline: [
      { key: 'A1', name: 'A1 敏感词检测', status: 'block', ms: 9, detail: '命中敏感词「投诉到银保监会」（变体回归主词「监管投诉」）', tags: ['金融监管'] },
      { key: 'A2', name: 'A2 意图 / 情绪', status: 'pass', ms: 0, detail: '敏感词命中 → 注入 synthetic A2 · route = transfer · 情绪 = angry', tags: ['催收相关', 'angry'] },
      { key: 'route', name: '路由决策', status: 'block', ms: 2, detail: 'A1 命中 → 强制走 soothe（安抚）+ 转人工，不再执行 A3', tags: ['soothe', '强制转人工'] },
      { key: 'A3', name: 'A3 RAG 检索', status: 'pending', ms: 0, detail: '安抚路径不检索 QA 库', tags: ['skipped'] },
      { key: 'llm', name: '安抚 Agent 生成', status: 'pass', ms: 1240, detail: '三段式安抚：① 共情感受 ② 表示关注 ③ 收尾引导转人工', tags: ['soothe_prompt v8'] },
      { key: 'A4', name: 'A4 合规质检', status: 'block', ms: 45, detail: '拦截越权承诺「保证 24 小时内解决」→ 改写为合规话术 + 转人工高亮', tags: ['越权承诺', '已改写'] },
    ],
  },
  {
    id: 'c3', sessionId: 'sess_5d1e88', customer: '尾号 9102 客户', channel: '信用贷 APP',
    intentL1: '费用相关', emotion: 'calm', route: 'qa', status: '进行中',
    lastMsg: '提前结清要手续费吗', startedAt: '09:40:11', turns: 1,
    messages: [
      { id: 'm1', role: 'user', text: '提前结清要手续费吗', time: '09:40:11' },
      { id: 'm2', role: 'bot', text: '关于提前结清的费用规则，建议您在「信用贷 APP-我的账单」查看实时明细，或转接人工为您精准核算，避免信息偏差。', time: '09:40:13', source: 'reject 兜底', tokens: 214, thumb: 'down' },
    ],
    pipeline: [
      { key: 'A1', name: 'A1 敏感词检测', status: 'pass', ms: 7, tags: ['无敏感词'] },
      { key: 'A2', name: 'A2 意图 / 情绪', status: 'pass', ms: 298, detail: '意图 = 费用相关 / 费用咨询', tags: ['费用相关', 'calm'], confidence: 0.88 },
      { key: 'route', name: '路由决策', status: 'pass', ms: 2, tags: ['qa'] },
      { key: 'A3', name: 'A3 RAG 检索', status: 'block', ms: 184, detail: '最高分 0.41 < 命中线 0.45 → RAG 未命中，记拒识日志', tags: ['拒识', 'top 0.41'], confidence: 0.41,
        hits: [{ q: '提前还款怎么操作', score: 0.41, source: 'qa' }, { q: '提前清贷流程', score: 0.39, source: 'qa' }] },
      { key: 'llm', name: 'LLM 生成', status: 'pass', ms: 1180, detail: '空 context 兜底生成 · 引导查账单 / 转人工', tags: ['兜底'] },
      { key: 'A4', name: 'A4 合规质检', status: 'pass', ms: 41, detail: '未输出具体费率数值 · 合规', tags: ['合规通过'] },
    ],
  },
  {
    id: 'c4', sessionId: 'sess_2c90fa', customer: '尾号 4417 客户', channel: '信用贷 小程序',
    intentL1: '申请咨询', emotion: 'calm', route: 'qa', status: '已结束',
    lastMsg: '我的额度怎么查', startedAt: '09:33:20', turns: 2,
    messages: [
      { id: 'm1', role: 'user', text: '我的额度怎么查', time: '09:33:20' },
      { id: 'm2', role: 'bot', text: '您可在「信用贷 APP 首页」顶部查看可用额度与已用额度哦~如需提额，可在「额度」页发起评估申请。', time: '09:33:21', source: 'QA命中 0.93', tokens: 0 },
    ],
    pipeline: [
      { key: 'A1', name: 'A1 敏感词检测', status: 'pass', ms: 8, tags: ['无敏感词'] },
      { key: 'A2', name: 'A2 意图 / 情绪', status: 'pass', ms: 305, tags: ['申请咨询', 'calm'], confidence: 0.94 },
      { key: 'route', name: '路由决策', status: 'pass', ms: 2, tags: ['qa'] },
      { key: 'A3', name: 'A3 RAG 检索', status: 'pass', ms: 169, confidence: 0.93, tags: ['高置信直通'], hits: [{ q: '怎么查额度', score: 0.93, source: 'qa' }] },
      { key: 'llm', name: 'LLM 生成', status: 'pass', ms: 3, tags: ['bypass'] },
      { key: 'A4', name: 'A4 合规质检', status: 'pass', ms: 36, tags: ['合规通过'] },
    ],
  },
  {
    id: 'c5', sessionId: 'sess_77bd13', customer: '尾号 8830 客户', channel: '信用贷 APP',
    intentL1: '业务办理', emotion: 'upset', route: 'hybrid', status: '进行中',
    lastMsg: '注销账户怎么这么麻烦', startedAt: '09:42:30', turns: 1,
    messages: [
      { id: 'm1', role: 'user', text: '注销账户怎么这么麻烦，搞了半天', time: '09:42:30' },
      { id: 'm2', role: 'bot', text: '理解给您带来的不便，很抱歉~注销需确保账户无在贷余额与未结费用。满足条件后可在「我的-账户安全-注销账户」提交，1-3 个工作日内处理完成。', time: '09:42:32', source: 'QA命中 0.89 · 情绪融合', tokens: 168 },
    ],
    pipeline: [
      { key: 'A1', name: 'A1 敏感词检测', status: 'pass', ms: 8, tags: ['无敏感词'] },
      { key: 'A2', name: 'A2 意图 / 情绪', status: 'pass', ms: 318, detail: '情绪 = upset + route = qa', tags: ['业务办理', 'upset'], confidence: 0.89 },
      { key: 'route', name: '路由决策', status: 'pass', ms: 2, detail: 'upset + 高置信 → hybrid（情绪认可 + 业务解答）', tags: ['hybrid'] },
      { key: 'A3', name: 'A3 RAG 检索', status: 'pass', ms: 178, confidence: 0.89, tags: ['命中'], hits: [{ q: '如何注销账户', score: 0.89, source: 'qa' }] },
      { key: 'llm', name: 'LLM 生成', status: 'pass', ms: 1020, detail: 'hybrid：先共情再业务解答', tags: ['hybrid'] },
      { key: 'A4', name: 'A4 合规质检', status: 'pass', ms: 40, tags: ['合规通过'] },
    ],
  },
  {
    id: 'c6', sessionId: 'sess_91ae04', customer: '尾号 1205 客户', channel: '信用贷 小程序',
    intentL1: '营销活动', emotion: 'calm', route: 'qa', status: '已结束',
    lastMsg: '会员怎么退费', startedAt: '09:30:55', turns: 2,
    messages: [
      { id: 'm1', role: 'user', text: '会员怎么退费', time: '09:30:55' },
      { id: 'm2', role: 'bot', text: '会员退费可在「我的-会员中心-退费申请」发起，符合条件的将在 3-5 个工作日原路退回哦~', time: '09:30:56', source: 'QA命中 0.90', tokens: 0 },
    ],
    pipeline: [
      { key: 'A1', name: 'A1 敏感词检测', status: 'pass', ms: 7, tags: ['无敏感词'] },
      { key: 'A2', name: 'A2 意图 / 情绪', status: 'pass', ms: 301, tags: ['营销活动', 'calm'], confidence: 0.90 },
      { key: 'route', name: '路由决策', status: 'pass', ms: 2, tags: ['qa'] },
      { key: 'A3', name: 'A3 RAG 检索', status: 'pass', ms: 172, confidence: 0.90, tags: ['高置信直通'], hits: [{ q: '会员退费流程', score: 0.90, source: 'qa' }] },
      { key: 'llm', name: 'LLM 生成', status: 'pass', ms: 3, tags: ['bypass'] },
      { key: 'A4', name: 'A4 合规质检', status: 'pass', ms: 37, tags: ['合规通过'] },
    ],
  },
];

// 测试对话页快捷用例（spec：6 预设）
export const TEST_CASES = [
  { q: '可以提前还款吗？', tag: '业务咨询' },
  { q: '我要投诉！客服态度太差', tag: 'B 级敏感词' },
  { q: '你们太坑了气死我了', tag: 'A 级情绪' },
  { q: '年化利率是多少？', tag: '合规红线' },
  { q: '提前还款要手续费吗？', tag: '拒识场景' },
  { q: '如何提前清贷？', tag: '信任建立' },
];

export const PROD_GREETING = 'Hi~ o(*￣▽￣*)ブ 我是您的在线智能客服小云，有什么可以帮您的呢？';
