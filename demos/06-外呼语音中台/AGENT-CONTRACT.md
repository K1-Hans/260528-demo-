# AI 外呼/语音中台 · 页面 Agent 契约（必读后再写页）

> 你负责写**一个** `src/pages/*.tsx` 页面。照它写就能编译通过 + 视觉一致。#1 铁律：**极致审美**。
> 这是**实时话务作战室**（锚 Dialpad/Genesys 实时坐席墙）：深青墨底、翡翠接通绿、声波、双气泡转写、合规优先。

## 0. 视觉签名「Operator Midnight · 话务深夜台」（一句话记牢）
**带青绿暖调的深夜话务室暗底 + 翡翠绿接通色 + 声波 + 双气泡流式转写。** 颜色语义：
- 🟢 翡翠绿 `var(--gold)` = 接通 / 合规 / 声波（唯一 hero accent · 绿=放行的金融语义）
- 🟡 金 `var(--qual)` = **稀缺资质/认证徽章**（用 `qual-badge` class，仅资质，不滥用为装饰）
- 🟠 琥珀 `var(--warning)` = 敏感词命中 / 勿扰拦截 / 静音 · 🔴 红 `var(--danger)` = 违规 / 封号风险（克制）
- **反 spammy 电销**：无满屏红橙、无紫发光、无急促闪烁；话术/客户名全为**回访/提醒/确认**口吻。**一页一 accent**：翡翠绿。

## 1. 技术栈 / 导入路径（错了就编译失败）
- React 19 + TS + Vite + ECharts 5 + react-router-dom 7 + lucide-react。**默认导出一个组件**（`export default function XxxPage()`）。
- 页面在 `src/pages/` **扁平**目录，导入一律单个 `../`：`../components/...`、`../lib/...`、`../contexts/...`、`../types`。**绝不要 `../../`**。
- 全 mock：**你页面专属数据写在本文件顶部 `const`**（用 `../types` 的类型）。共享数据（角色/告警/合规三灯）从 `../lib/mockData` 取。**禁改 mockData.ts / types / 其他页 / 共享组件**。
- 🔒 **脱敏铁律**：用「示例消费金融 / 小云 / 信用贷 / 坐席系统 / 400-800-1234」。消金回访术语（信用卡激活回访/逾期 M1 提醒/理财回访/NPS/勿扰时段/频控/外显号/敏感词/转人工）**保留**。客户名脱敏（138****2841 / 王先生）。禁 lorem / "Acme"。

## 2. 共享组件（直接 import 用，别重造）
```tsx
import { PageHeader, Card, StatCard, Sparkline, TrendChip, Badge, Segmented, ProgressBar, EmptyState, SectionTitle } from '../components/ui';
import { StatusBadge, RiskBadge, Toolbar, Field, Drawer, Modal, MeterBar, toast } from '../components/kit';
import { DataTable, Pagination, type Col } from '../components/DataTable';
import Chart from '../components/Chart';
// 语音/外呼签名件 ★
import { Panel, ComplianceLights, LightDot, CallStateBadge, TimeChip } from '../components/sig';
import Waveform from '../components/Waveform';
import TranscriptTimeline from '../components/TranscriptTimeline';
```
- **`<Panel title icon right bodyClass>`** = 作战窗格（多窗格布局首选；`bodyClass="panel-body-0"` 去内边距放表格/图表/列表）。
- **`<Waveform active sensitive bars height color />`** = 真 SVG 声波（active=翡翠流动 / false=灰平线 / sensitive=琥珀）。M5 音色、M6 回放、通话卡都用它，**禁假 div 条冒充波形**。
- **`<TranscriptTimeline turns={TranscriptTurn[]} streamingId onTurnClick autoScroll maxHeight />`** = 双气泡转写（AI 翡翠/客户灰 + 意图/情绪 chip + 敏感词琥珀高亮）。M6 通话回放直接用。
- **`<CallStateBadge state="dialing|ringing|talking|wrap" />`** 通话状态 · **`<TimeChip seconds countUp urgentBelow />`** 计时/倒计时（countUp=true 通话计时上行，否则倒计时）。
- **`<ComplianceLights lights={COMPLIANCE_LIGHTS} />`** 合规三灯（从 mockData 取；三灯全绿才能发起活动）。
- **`<StatCard label raw unit change icon spark delayClass decimals />`** KPI（count-up）· **`<RiskBadge level="high|mid|low" />`** · **`<DataTable cols rows rowKey onRow defaultSort />`**（列 `{key,header,render?,sortable?,num?,align?,width?}`）。

## 3. 页面骨架（照抄）
```tsx
import { PageHeader } from '../components/ui';
import { Panel } from '../components/sig';
import { useAuth } from '../contexts/AuthContext';

export default function XxxPage() {
  const { hasPermission } = useAuth();
  const canAct = hasPermission('xxx:act');   // 处置/编辑类按钮按角色禁用
  return (
    <div className="page">     {/* 大屏多窗格页用 className="page page-wide" */}
      <PageHeader title="标题" subtitle="一句具体专业副标（无赋能/无缝/一站式/智能营销轰炸）" actions={/* 按钮 */} />
      {/* 多窗格：<div className="grid" style={{gridTemplateColumns:'...',gap:14}}> 放 <Panel> */}
    </div>
  );
}
```

## 4. 图表（真 ECharts，禁假 div 条）
`<Chart build={() => OPTION} height={280} deps={[...]} />`，build 闭包内**实时读 CSS 变量**（主题切换自动重绘）。
```tsx
import { baseOption, axisStyle, areaGradient, cssVar, pass, review, accent } from '../lib/chartTheme';
```
- 颜色：接通/正向/达标→`pass()`(翡翠) · 敏感/勿扰→`review()`(琥珀) · 违规→`cssVar('--danger')`(红) · 资质→`cssVar('--qual')`(金) · 多序列用 `baseOption().color` 默认调色板（`--c1..c8`）。
- 趋势细线 + `areaStyle:{color:areaGradient(cssVar('--gold'),0.2)}`；柱圆角 `itemStyle:{borderRadius:[3,3,0,0]}`；漏斗/桑基/雷达/散点/堆叠面积均真 ECharts。`baseOption()`/`axisStyle()` 已配好字体/网格/tooltip。

## 5. 数字 / 文案纪律
- 所有指标/率/计时数字加 `className="mononum"`（等宽 tabular）或表格列 `num:true`。率/评分两位小数；时长 mm:ss。
- 文案讲门道：信用卡激活回访 / 逾期 M1 / 勿扰时段 21:00–09:00 / 频控 / 外显号报备 / 敏感词命中 / barge-in 打断 / 转人工。**克制回访口吻，无电销轰炸**。

## 6. 反 AI-slop 红线（ship 前逐条过）
- [ ] 一页一 accent（翡翠绿）；金仅资质徽章、琥珀仅敏感/勿扰、红仅违规；**无 AI 紫发光、无电销红橙满屏、无霓虹、无玻璃涂满**。
- [ ] 数字全 `mononum`/`tnum` 对齐；率/评分两位小数。
- [ ] 图表全真 ECharts，**零假 div 条**；声波用 `<Waveform>`（真 SVG）；空态用 `<EmptyState>`；loading 用 `.skeleton`。
- [ ] UI chrome 全 **lucide 图标**，**无 emoji**；图标 `size={13~16}`。
- [ ] 间距 4px 网格；窗格用 `<Panel>` 或 `.card`；发丝线分区；hover/focus 到位；**暗(主)+亮两主题都不破**（只用 CSS 变量，绝不硬编码 hex）。
- [ ] 声波/脉冲动效有缓动有节奏，不闪瞎；尊重 `prefers-reduced-motion`（用 `usePrefersReducedMotion` from '../lib/hooks' 关掉 setInterval 推流）。

## 7. RBAC（按需）
- `const { hasPermission, currentRole } = useAuth();`
- 处置/编辑/封停按钮：`disabled={!hasPermission('xxx:manage'|'xxx:act'|'xxx:edit')}` + 禁用时给原因（小字 `text-3`）。页面级访问已由 Layout 拦截，你只管页面内动作分权。

## 8. 你的页面任务
见 spawn prompt（含本页职责 + 关键交互 + mock 数据轮廓 + 要画的 ECharts）。**只写指定的那一个 `src/pages/*.tsx`**，页面专属 mock 数据写在文件顶部 const。写完自检第 6 节红线。
