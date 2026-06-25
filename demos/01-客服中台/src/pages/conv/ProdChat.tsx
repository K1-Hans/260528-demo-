import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Plus, CircleDot } from 'lucide-react';
import { PageHeader } from '../../components/ui';
import { ConversationTimeline } from '../../components/ConversationTimeline';
import { PROD_GREETING } from '../../lib/mock/conv';
import type { ChatMsg } from '../../types';

// ─── 关键词→回复 映射表（消金真实场景）────────────────────────────────────────
interface CannedReply { answer: string; source: string; }

const CANNED: Array<{ keywords: string[]; reply: CannedReply }> = [
  {
    keywords: ['还款', '怎么还', '还钱', '还贷', '还款方式', '还款账单', '还款日'],
    reply: { answer: '亲亲~还款可在「信用贷 APP-我的-还款」操作哦，支持绑定银行卡自动还款或手动还款。还款日前确保卡内余额充足，避免逾期产生费用~', source: 'QA命中' },
  },
  {
    keywords: ['还款失败', '还不上', '扣款失败', '还款一直失败'],
    reply: { answer: '还款失败通常是绑定的银行卡余额不足、卡状态异常或超过当日限额导致的呢。建议您：① 确认卡内余额充足；② 在还款日 23:00 前操作；③ 在「信用贷 APP-我的-还款」更换还款方式重试~', source: 'QA命中' },
  },
  {
    keywords: ['额度', '信用额度', '我的额度', '可用额度', '查额度', '提额'],
    reply: { answer: '您可在「信用贷 APP 首页」顶部查看可用额度与已用额度哦~如需提额，可在「额度」页发起评估申请，系统将根据您的综合信用情况进行评估。', source: 'QA命中' },
  },
  {
    keywords: ['利率', '年化', '年利率', '日利率', '月利率', '息'],
    reply: { answer: '信用贷实际年化利率依产品与期数不同而有所差异，具体以您在 APP 申请时的页面展示为准哦。请在「信用贷 APP-我的账单」查看您当前的费率明细，或转人工 400-800-1234 精准咨询。', source: 'QA命中' },
  },
  {
    keywords: ['投诉', '举报', '监管', '银保监', '银保监会', '12378'],
    reply: { answer: '非常理解您的心情，给您带来的困扰我们深感抱歉。如果您有需要反映的问题，我们会优先为您核实跟进。您也可以直接拨打客服热线 400-800-1234（08:00-21:00）由专属客服为您处理~', source: 'QA命中' },
  },
  {
    keywords: ['会员', '会员费', '会员退费', '退会员', '取消会员'],
    reply: { answer: '会员退费可在「我的-会员中心-退费申请」发起，符合条件的将在 3-5 个工作日内原路退回哦~如有疑问可拨打 400-800-1234 人工核实~', source: 'QA命中' },
  },
  {
    keywords: ['逾期', '逾期费', '逾期罚息', '逾期了', '已经逾期'],
    reply: { answer: '逾期后会产生逾期费用（按日计算），建议您尽快在「信用贷 APP-我的-还款」完成补款以减少损失哦。如您目前有还款困难，可拨打 400-800-1234 人工客服，专属顾问会协助您了解相关政策~', source: 'QA命中' },
  },
  {
    keywords: ['注销', '注销账户', '注销账号', '销户', '关闭账号'],
    reply: { answer: '注销需确保账户无在贷余额与未结费用哦~满足条件后可在「我的-账户安全-注销账户」提交申请，1-3 个工作日内处理完成。如有疑问请联系 400-800-1234~', source: 'QA命中' },
  },
  {
    keywords: ['提前', '提前还款', '提前结清', '全额还清', '清贷'],
    reply: { answer: '关于提前结清的费用规则，建议您在「信用贷 APP-我的账单」查看实时明细，或拨打 400-800-1234 由人工为您精准核算，避免信息偏差哦~', source: 'QA命中' },
  },
  {
    keywords: ['申请', '怎么申请', '如何申请', '贷款申请', '借钱', '借款'],
    reply: { answer: '您可在「信用贷 APP 首页」点击「申请借款」，按提示完成实名认证和资料填写，系统实时评估，通常几分钟内出结果哦~如需了解申请条件，请联系 400-800-1234 人工客服~', source: 'QA命中' },
  },
  {
    keywords: ['人工', '转人工', '客服', '有没有人工', '我要人工', '人工客服'],
    reply: { answer: '小云正在为您转接人工，请您稍后~人工服务时间 08:00—21:00，如在非服务时间，可留言，人工上班后第一时间跟进哦~', source: 'QA命中' },
  },
  {
    keywords: ['上班', '几点', '工作时间', '服务时间', '客服时间'],
    reply: { answer: '人工客服服务时间为 08:00—21:00 哦~非服务时间您可通过小云自助查询，或留言，人工上班后第一时间跟进~', source: 'QA命中' },
  },
  {
    keywords: ['密码', '忘记密码', '重置密码', '改密码', '密码忘了'],
    reply: { answer: '忘记密码可在「信用贷 APP 登录页-忘记密码」通过手机号验证重置哦~如手机号也无法使用，请拨打 400-800-1234 人工客服协助处理~', source: 'QA命中' },
  },
  {
    keywords: ['银行卡', '更换银行卡', '换卡', '绑定银行卡', '解绑'],
    reply: { answer: '可在「信用贷 APP-我的-支付管理」中更换或绑定新银行卡哦~更换后建议再次确认还款设置是否已同步更新~如遇问题请拨打 400-800-1234~', source: 'QA命中' },
  },
];

const FALLBACK: CannedReply = {
  answer: '您好~小云暂未能匹配到您的具体问题。建议您查看信用贷 APP 内的帮助中心，或拨打客服热线 400-800-1234（08:00-21:00）由人工为您详细解答哦~',
  source: '兜底',
};

function matchKeywords(input: string): CannedReply {
  const normalized = input.toLowerCase().replace(/\s+/g, '');
  for (const item of CANNED) {
    if (item.keywords.some(kw => normalized.includes(kw))) {
      return item.reply;
    }
  }
  return FALLBACK;
}

function nowTime(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function genSessionId(): string {
  return 'prod_' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

const INIT_MESSAGES: ChatMsg[] = [
  { id: 'init_bot', role: 'bot', text: PROD_GREETING, time: nowTime(), source: '欢迎语' },
];

export default function ProdChat() {
  const [sessionId, setSessionId] = useState<string>(() => genSessionId());
  const [messages, setMessages] = useState<ChatMsg[]>(INIT_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleReset = useCallback(() => {
    setSessionId(genSessionId());
    setMessages([{ id: 'init_bot_' + Date.now(), role: 'bot', text: PROD_GREETING, time: nowTime(), source: '欢迎语' }]);
    setInput('');
    setIsTyping(false);
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: ChatMsg = {
      id: 'u_' + Date.now(),
      role: 'user',
      text,
      time: nowTime(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const delay = 600 + Math.random() * 600;
    setTimeout(() => {
      const reply = matchKeywords(text);
      const botMsg: ChatMsg = {
        id: 'b_' + Date.now(),
        role: 'bot',
        text: reply.answer,
        time: nowTime(),
        source: reply.source,
        tokens: Math.floor(50 + Math.random() * 180),
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, delay);
  }, [input, isTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="page">
      <PageHeader
        title="生产对话"
        subtitle="模拟生产环境 · 仅检索已生效 QA · 待发布/已下线不出现"
        actions={
          <button className="btn btn-ghost btn-sm" onClick={handleReset}>
            <Plus size={14} />
            新建 / 清空
          </button>
        }
      />

      {/* 居中单卡聊天窗 */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 0 32px' }}>
        <div className="card reveal" style={{ width: '100%', maxWidth: 700, display: 'flex', flexDirection: 'column', minHeight: 520 }}>

          {/* 聊天窗头部 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderBottom: '1px solid var(--hairline)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* 绿点 + 头像 */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div className="avatar" style={{
                  width: 36, height: 36, background: 'var(--gold)', color: 'var(--bg-base)',
                  borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700, lineHeight: 1,
                }}>
                  云
                </div>
                <CircleDot
                  size={12}
                  style={{
                    position: 'absolute', bottom: -2, right: -2,
                    color: 'var(--emerald)',
                    background: 'var(--surface-1)',
                    borderRadius: '50%',
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.3 }}>小云 · 在线客服</div>
                <div style={{ fontSize: 11, color: 'var(--emerald)', lineHeight: 1.3 }}>在线</div>
              </div>
            </div>
            {/* 会话 ID badge */}
            <span className="badge" style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '3px 8px', borderRadius: 'var(--r-sm)' }}>
              {sessionId}
            </span>
          </div>

          {/* 消息区 */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px 20px',
            minHeight: 340, maxHeight: 480,
          }}>
            <ConversationTimeline messages={messages} />

            {/* 打字中气泡 */}
            {isTyping && (
              <div className="conv-row" style={{ marginTop: 14 }}>
                <div className="conv-av conv-av-bot">云</div>
                <div className="conv-bubble conv-bot" style={{ minWidth: 56 }}>
                  <span className="dot-pulse" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 输入区 */}
          <div style={{
            borderTop: '1px solid var(--hairline)',
            padding: '12px 16px',
            display: 'flex', gap: 10, alignItems: 'center',
          }}>
            <div className="input-wrap" style={{ flex: 1 }}>
              <input
                ref={inputRef}
                className="input"
                placeholder="输入您的问题，回车发送…（如：怎么还款 / 我的额度 / 逾期了怎么办）"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
                style={{ width: '100%' }}
                autoFocus
              />
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              style={{ flexShrink: 0, gap: 6 }}
            >
              <Send size={14} />
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
