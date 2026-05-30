import { useEffect, useRef, useState } from 'react';
import {
  Bot, Send, Sparkles, RefreshCw, User, Database, Swords, BadgePercent,
  MessageSquareText, Target, BarChart3, MapPin,
  Zap, Workflow, ListChecks, CheckCircle2, UserPlus, ClipboardList, Clock,
} from 'lucide-react';
import type { ChatMessage, Citation, OpsAction } from '../../types';
import './AiAssistant.css';

// ─── Mode ────────────────────────────────────────────────────────────────────
type Mode = 'qa' | 'agent';

// ─── Mock answer bank (问答模式) ──────────────────────────────────────────────
// MOCK ONLY — no network. Keyword-routed high-quality canned markdown answers,
// each tagged with the data sources it "relied on" (rendered as Citation cards).
interface Answer { content: string; citations: Citation[]; }

const ANSWERS: Record<'competitor' | 'subsidy' | 'goal' | 'voc' | 'region' | 'default', Answer> = {
  competitor: {
    content: `## L9 大型 SUV 竞争态势研判

**关键发现**
- **L9 本月 3,056 台、环比 +4.6%**，稳居理想旗舰基本盘；最大正面对手 **问界 M9（14,230 台 · +8.2%）** 体量约为 L9 的 4.6 倍，竞争压力来自智驾叙事与华为渠道势能。
- L9 的护城河仍是 **空间 / 家庭场景 / 服务体验**——VOC 中"冰箱彩电大沙发""三排空间无敌"心智稳固（正面声量占比 68%）。
- 短板在 **智驾感知（雷达图 82 vs M9 93）** 与 **价格力（70 vs 78）**，是 M9 当前主攻的两个缺口。

### 竞争力雷达对比（满分 100）

| 维度 | 理想 L9 | 问界 M9 | 差距研判 |
|---|---|---|---|
| 空间 | 95 | 88 | 领先 · 核心卖点 |
| 智驾 | 82 | 93 | **落后 · 重点补课** |
| 续航 | 88 | 90 | 接近 |
| 价格力 | 70 | 78 | **落后 · 权益对冲** |
| 品牌 | 92 | 85 | 领先 |
| 服务 | 90 | 80 | 领先 · 放大优势 |

**操盘建议**
1. **正面卡位空间与服务**：强化"全家出行 / 二三排体验"内容，门店深度试驾突出沙发座椅与静谧性。
2. **智驾对冲**：以最近两次城市 NOA OTA 进步做专题，缩小"感知落后"的传播差。
3. **价格力对冲不降价**：用权益包（免费充电桩 + 优先交付）守住终端价盘，避免伤品牌。

**风险预警**
- 问界 M9 若延续 +8% 月增速，Q3 将进一步拉开体量差，需在 618 窗口前完成一轮 L9 声量反攻。`,
    citations: [
      { source: '竞品数据库', detail: 'M9 月销 14,230 台 · 环比 +8.2%' },
      { source: '指标平台', detail: 'L9 月销 3,056 台 · 完成率 96%' },
      { source: 'VOC 舆情', detail: 'L9 正面声量占比 68%' },
    ],
  },
  subsidy: {
    content: `## 深圳 vs 上海补贴对比 · L7 主推地选择

**关键发现**
- **深圳 ¥12,000（最高 ¥15,000）** 金额明显高于上海，且覆盖 L7，但 **6 月 30 日截止**——属"高金额 + 临期冲量"窗口。
- **上海 ¥10,000** 全年有效（至 12-31），节奏从容但金额略低，且限购 1 辆、限价 20–40 万。
- L7 终端价 31.98 万，两地均在补贴价格区间内，落地价优势深圳更突出。

### 两地政策要素对比

| 维度 | 深圳 | 上海 | 利于推 L7 |
|---|---|---|---|
| 补贴金额 | ¥12,000（最高 15,000） | ¥10,000 | **深圳** |
| 有效期 | 至 2026-06-30 | 至 2026-12-31 | 上海（更久） |
| 覆盖车型 | L6 / L7 | L6 / L7 / L8 | 持平 |
| 紧迫性 | 高 · 临期收单 | 低 | **深圳** |
| 上牌便利 | 摇号绿色通道 | 限购 1 辆 | **深圳** |

**操盘建议**
1. **本月主推深圳**：以"补贴最后窗口 + 摇号绿色通道"制造紧迫感，主打 L7 落地价测算海报。
2. **上海打节奏**：作为全年稳态阵地，配合试驾转化 SOP 持续经营，不打冲量战。
3. **话术统一**：销售统一口径"深圳 6 月底截止"，避免客户观望流失。

**风险预警**
- 深圳补贴 6 月底到期后将出现需求真空，需提前蓄客并在 6 月中旬启动收单冲刺。`,
    citations: [
      { source: '补贴库', detail: '深圳 ¥12,000 · 至 2026-06-30' },
      { source: '补贴库', detail: '上海 ¥10,000 · 至 2026-12-31' },
      { source: '指标平台', detail: 'L7 终端价 31.98 万' },
    ],
  },
  goal: {
    content: `## 本月 L8 区域销售目标拆解

**关键发现**
- L8 月度目标 **2,800 台**，当前实际 **2,541 台、完成率 90.8%**，缺口 **259 台**，整体可控但需精准投放到落后区域。
- 华东达成最稳、华南拖累最大；建议按"区域权重 × 达成健康度"做差异化拆解，而非平均摊派。

### 区域目标拆解建议（合计 2,800 台）

| 区域 | 建议配额 | 当前进度 | 缺口 | 动作优先级 |
|---|---|---|---|---|
| 华东 | 920 | 96% | 小 | 维持 · 标杆复制 |
| 华北 | 620 | 91% | 中 | 稳推 |
| 华中 | 430 | 88% | 中 | 试驾加密 |
| 华南 | 480 | 78% | **大** | **冲刺 · 邀约 + 补贴** |
| 西南 | 240 | 84% | 中 | 资源补给 |
| 西北 | 110 | 72% | 大 | 下沉门店覆盖 |

**操盘建议**
1. **缺口集中爆破**：259 台缺口的 60% 压到华南 / 西北两个低达成区，配资源而非配压力。
2. **华南双驱动**：试驾邀约冲刺（目标转化 +8pt）叠加深圳补贴临期收单。
3. **华东经验外溢**：把华东 Deep Drive 体验日 SOP 复制到华中、西南。

**风险预警**
- 西北完成率 72% 主因门店覆盖不足，短期靠促销难补，需同步推进 3 个地级市选址。`,
    citations: [
      { source: '指标平台', detail: 'L8 实际 2,541 / 目标 2,800 台' },
      { source: '指标平台', detail: '区域完成率：华东 96% · 华南 78%' },
      { source: '操盘看板', detail: '华南 L7/L8 冲刺动作进行中' },
    ],
  },
  voc: {
    content: `## 最新舆情洞察 · 用户最关心什么

**关键发现**
- 全网正面声量占比 **68%**，"空间 / 家用"是绝对热词（1,820 条 · 正面），"冰箱彩电大沙发"心智持续兑现。
- **智能驾驶提及 +27%**，已升为第二大关注点，城市 NOA 体验被频繁对标华为。
- **负面集中在"交付 / 服务"与"车机 / 系统"**——延期与卡顿是两个需即时响应的工单源。

### 热门话题声量与情感

| 话题 | 声量 | 主导情感 | 处置建议 |
|---|---|---|---|
| 空间 / 家用 | 1,820 | 正面 | 放大 · 内容种草 |
| 智能驾驶 | 1,340 | 中性 | OTA 进步专题对冲 |
| 能耗 / 续航 | 1,180 | 中性 | 冬季增程优势科普 |
| 交付 / 服务 | 740 | **负面** | **48h 工单响应** |
| 车机 / 系统 | 520 | **负面** | 流畅度优化预告 |

**操盘建议**
1. **乘势空间心智**：联动小红书奶爸 / 二胎妈妈 KOC 输出"全家出行"实测内容。
2. **智驾叙事补课**：以城市 NOA OTA 进步做对标内容，承接 +27% 的关注增量。
3. **负面闭环**：交付延期与车机卡顿建立分级响应，门店主管 48 小时内介入安抚。

**风险预警**
- 交付延期负面（如 L8 维权车主 1,120 赞）传播势能高，需优先按舆情预案处置避免发酵。`,
    citations: [
      { source: 'VOC 舆情', detail: '正面声量 68% · 智驾提及 +27%' },
      { source: 'VOC 舆情', detail: '空间/家用 1,820 条 · 交付/服务负面' },
      { source: '试驾录音', detail: 'L8 交付周期不满 · 需主管介入' },
    ],
  },
  region: {
    content: `## 华东区 Q2 低于目标 · 归因与操盘建议

**关键发现**
- 华东月度完成率 **96%**、订单 2,680 台，是全国最高区域；若 Q2 出现"低于目标"，多为 **目标基数偏高 + 高线城市需求阶段性透支**，而非动作失效。
- 真正系统性风险在 **华南（78%）与西北（72%）**，建议把华东作为"经验输出方"而非"问题区"。

### 区域达成对照

| 区域 | 订单量 | 完成率 | 定位 |
|---|---|---|---|
| 华东 | 2,680 | 96% | 标杆 · 经验外溢 |
| 华北 | 1,840 | 91% | 稳健 |
| 华中 | 1,120 | 88% | 待加速 |
| 华南 | 1,520 | 78% | **重点攻坚** |
| 西北 | 492 | 72% | **覆盖补强** |

**操盘建议**
1. **目标校准**：复核华东 Q2 BP 是否过激进，区分"真缺口"与"基数效应"。
2. **结构换挡**：高线试驾转化已近天花板，向存量置换与转介绍要增量。
3. **经验输出**：把华东 Deep Drive 体验日与转化 SOP 标准化，反哺华南 / 西北。

**风险预警**
- 若把资源过度回补华东，会挤占华南 / 西北攻坚预算，建议资源向低达成区倾斜。`,
    citations: [
      { source: '指标平台', detail: '华东订单 2,680 台 · 完成率 96%' },
      { source: '指标平台', detail: '华南 78% · 西北 72%（低达成）' },
      { source: '操盘看板', detail: '华东 Deep Drive 体验日已完成' },
    ],
  },
  default: {
    content: `## 策略分析总览

**关键发现**
- 本月订单 **8,412 台（+12.3%）**、交付 7,893 台，NEV 市占率 **18.2%** 稳中有升。
- 车型层面 **L7 偏弱（完成率 78%）**，区域层面 **华南 / 西北承压**，是当前两个主要缺口。
- 竞争端 **问界 M9 / M7 体量领先**，但理想在空间与服务心智上仍具护城河。

### 本月经营要点

| 维度 | 现状 | 关注点 |
|---|---|---|
| 订单 | 8,412 台 · +12.3% | 节奏健康 |
| 交付 | 7,893 台 · +8.7% | 部分区域延期 |
| 市占率 | 18.2% · +1.4pt | 稳中有升 |
| 短板车型 | L7 完成率 78% | 试驾转化 |

**操盘建议**
1. 聚焦 L7 与华南、西北做缺口攻坚，资源向低达成区倾斜。
2. L9 正面卡位问界 M9，强化空间 / 服务，权益对冲价格力。
3. 顺势空间心智做内容种草，闭环交付与车机负面舆情。

**风险预警**
- 问界系列持续施压、深圳补贴 6 月底临期，需在 618 窗口前完成一轮反攻与收单。

> 你也可以试着问我：L9 竞争优势、补贴对比、目标拆解、舆情洞察、区域归因。`,
    citations: [
      { source: '指标平台', detail: '订单 8,412 台 · 市占率 18.2%' },
      { source: '竞品数据库', detail: '问界 M9/M7 体量领先' },
    ],
  },
};

function pickAnswer(q: string): Answer {
  const t = q.toLowerCase();
  const has = (...keys: string[]) => keys.some(k => t.includes(k.toLowerCase()));
  if (has('补贴', '政策', '深圳', '上海', '落地价')) return ANSWERS.subsidy;
  if (has('目标', '拆解', '配额', 'bp', '月度')) return ANSWERS.goal;
  if (has('舆情', '用户', '小红书', '懂车帝', 'voc', '声量', '口碑')) return ANSWERS.voc;
  if (has('华东', '华南', '西北', '区域', 'q2', '归因', '操盘')) return ANSWERS.region;
  if (has('l9', '竞品', '竞争', '问界', 'm9', '蔚来', '比亚迪', '威胁', '优势')) return ANSWERS.competitor;
  return ANSWERS.default;
}

// ─── Action plan bank (行动模式) ──────────────────────────────────────────────
// MOCK ONLY — local action-mode payloads keyed by goal keyword. The assistant
// streams reasoning + a numbered step plan (markdown), THEN renders structured
// 操盘动作卡 shaped like OpsAction (id/title/region/owner/status/impact/due/...).
type PlanCard = Omit<OpsAction, 'status' | 'progress'>;
interface ActionPlan {
  diagnosis: string;          // streamed reasoning + numbered step plan (markdown)
  cards: PlanCard[];
  citations: Citation[];
}

const PLANS: Record<'south_l7' | 'subsidy_sz' | 'rival_m9' | 'default', ActionPlan> = {
  south_l7: {
    diagnosis: `## 诊断 · 华南区 L7 落后目标 22%

**研判推理**
- 华南 L7 完成率 **78%**、缺口 22%，落后主因 = **试驾转化偏低 + 深圳补贴红利未充分收割**，并非线索量不足。
- 深圳 **¥12,000 补贴 6 月 30 日截止**，是 30 天内唯一可立即放大的杠杆；门店深度试驾体验是华东已验证的转化抓手。
- 策略 = **以补贴临期制造紧迫 + 试驾转化 SOP 提效**，30 天内集中爆破缺口。

### 追赶路径（30 天）
1. **第 1 周**：锁定深圳/广州存量意向，启动"补贴最后窗口"收单冲刺。
2. **第 1–2 周**：复制华东 Deep Drive 体验日，周末试驾加密，目标转化 +8pt。
3. **第 2–3 周**：L7 落地价测算海报 + 统一收单话术下发全华南门店。
4. **第 4 周**：缺口回补盘点，未达预期门店追加一对一资源补给。`,
    cards: [
      { id: 'pa-s1', title: '深圳补贴临期收单冲刺', region: '华南', owner: '刘敏', impact: 'high', due: '2026-06-30', desc: '锁定存量意向，以"¥12,000 补贴最后窗口"话术收单，主推 L7 落地价优势。' },
      { id: 'pa-s2', title: 'L7 周末试驾邀约加密', region: '华南', owner: '陈佳华', impact: 'high', due: '2026-06-12', desc: '复制华东 Deep Drive 体验日 SOP，周末加密深度试驾，目标转化率 +8pt。' },
      { id: 'pa-s3', title: 'L7 落地价测算海报投放', region: '华南', owner: '王浩', impact: 'mid', due: '2026-06-08', desc: '门店与本地社媒同步落地价测算物料，统一收单话术口径。' },
      { id: 'pa-s4', title: '低达成门店一对一补给', region: '华南', owner: '周建国', impact: 'mid', due: '2026-06-20', desc: '盘点华南落后门店，追加邀约资源与展车，缺口集中回补。' },
    ],
    citations: [
      { source: '指标平台', detail: '华南 L7 完成率 78% · 缺口 22%' },
      { source: '补贴库', detail: '深圳 ¥12,000 · 至 2026-06-30' },
      { source: '操盘看板', detail: '华东 Deep Drive 体验日已验证' },
    ],
  },
  subsidy_sz: {
    diagnosis: `## 诊断 · 深圳补贴 6 月底截止 · 收单冲刺

**研判推理**
- 深圳 **¥12,000（最高 ¥15,000）补贴 6 月 30 日截止**，覆盖 L6/L7，且摇号绿色通道——是高金额 + 临期的强冲量窗口。
- 风险 = 到期后需求真空；机会 = 30 天内把蓄水池意向集中转化为订单。
- 策略 = **蓄客 → 紧迫话术 → 落地价收单 → 到期前清盘**，节奏前紧后稳。

### 冲刺路径（至 6/30）
1. **即刻**：盘点深圳全部存量意向，分级标注"可定/观望/待培育"。
2. **6 月上旬**：统一"补贴最后窗口"话术 + 落地价测算工具下发。
3. **6 月中旬**：观望客户一对一逼单，叠加试驾邀约临门一脚。
4. **6 月下旬**：到期倒计时收单冲刺，每日跟踪订单转化看板。`,
    cards: [
      { id: 'pa-z1', title: '深圳存量意向分级盘点', region: '华南', owner: '刘敏', impact: 'high', due: '2026-06-03', desc: '梳理深圳全部意向客户，按可定/观望/待培育分级，锁定收单优先级。' },
      { id: 'pa-z2', title: '落地价测算工具下发', region: '华南', owner: '王浩', impact: 'mid', due: '2026-06-06', desc: '统一补贴落地价测算物料与话术口径，门店与线上同步上线。' },
      { id: 'pa-z3', title: '观望客户一对一逼单', region: '华南', owner: '陈佳华', impact: 'high', due: '2026-06-20', desc: '观望客户专人跟进，叠加试驾邀约与补贴倒计时完成临门一脚。' },
      { id: 'pa-z4', title: '到期倒计时收单看板', region: '华南', owner: '孙雅婷', impact: 'high', due: '2026-06-30', desc: '搭建每日订单转化跟踪看板，到期前冲刺，防需求真空。' },
    ],
    citations: [
      { source: '补贴库', detail: '深圳 ¥12,000（最高 15,000）· 至 2026-06-30' },
      { source: '指标平台', detail: 'L7 终端价 31.98 万 · 落地价优势' },
      { source: '试驾录音', detail: '深圳客户补贴截止前可定' },
    ],
  },
  rival_m9: {
    diagnosis: `## 诊断 · 问界 M9 上涨 8% · L9 应对动作

**研判推理**
- 问界 **M9 月销 14,230 台、环比 +8.2%**，体量约为 L9 的 4.6 倍，攻势集中在 **智驾叙事 + 价格力**。
- L9 护城河仍是 **空间 / 家庭场景 / 服务**（正面声量 68%），短板在智驾感知与价格力。
- 策略 = **正面卡位空间与服务 + 智驾 OTA 叙事补课 + 权益对冲价格不降价**，618 前完成一轮声量反攻。

### 应对路径（618 前）
1. **即刻**：上线 L9 对标 M9 权益包（充电桩 + 优先交付），守住终端价盘。
2. **第 1–2 周**：城市 NOA OTA 进步专题，缩小"智驾落后"传播差。
3. **第 2–3 周**：奶爸/二胎 KOC 全家出行内容种草，放大空间心智。
4. **618 前**：门店深度试驾突出沙发座椅与静谧性，承接对比客流。`,
    cards: [
      { id: 'pa-r1', title: 'L9 对标 M9 权益包上线', region: '全国', owner: '李晓雨', impact: 'high', due: '2026-06-10', desc: '免费充电桩 + 优先交付权益对冲价格力，守住终端价盘不降价伤品牌。' },
      { id: 'pa-r2', title: '城市 NOA OTA 进步专题', region: '全国', owner: '孙雅婷', impact: 'high', due: '2026-06-14', desc: '以最近两次 OTA 智驾进步做对标内容，缩小"感知落后"传播差。' },
      { id: 'pa-r3', title: '全家出行 KOC 内容种草', region: '全国', owner: '王浩', impact: 'mid', due: '2026-06-16', desc: '联动奶爸/二胎妈妈 KOC 输出空间实测内容，放大家庭场景心智。' },
      { id: 'pa-r4', title: '门店深度试驾卡位空间', region: '华东', owner: '陈佳华', impact: 'mid', due: '2026-06-18', desc: '深度试驾突出沙发座椅与静谧性，承接 M9 对比客流转化。' },
    ],
    citations: [
      { source: '竞品数据库', detail: 'M9 月销 14,230 台 · 环比 +8.2%' },
      { source: 'VOC 舆情', detail: 'L9 正面声量 68% · 智驾提及 +27%' },
      { source: '指标平台', detail: 'L9 月销 3,056 台 · 完成率 96%' },
    ],
  },
  default: {
    diagnosis: `## 诊断 · 本月经营缺口攻坚

**研判推理**
- 本月订单 8,412 台（+12.3%）健康，但 **L7 完成率 78%、华南/西北承压** 是两个明确缺口。
- 可立即放大的杠杆 = **深圳补贴临期（6/30 截止）+ 华东已验证的试驾转化 SOP**。
- 策略 = **缺口集中爆破 + 经验外溢 + 竞品权益对冲**，资源向低达成区倾斜。

### 攻坚路径（30 天）
1. **第 1 周**：缺口集中到华南/西北，配资源而非配压力。
2. **第 1–2 周**：复制华东 Deep Drive 体验日提升试驾转化。
3. **第 2–3 周**：L9 权益包对冲问界 M9 价格力，守住价盘。
4. **第 4 周**：缺口回补盘点，按区域达成健康度动态调配。`,
    cards: [
      { id: 'pa-d1', title: '华南 L7 试驾邀约冲刺', region: '华南', owner: '刘敏', impact: 'high', due: '2026-06-12', desc: '加密周末试驾，叠加深圳补贴临期，目标转化率 +8pt。' },
      { id: 'pa-d2', title: 'L9 对标问界权益包', region: '全国', owner: '李晓雨', impact: 'high', due: '2026-06-10', desc: '充电桩 + 优先交付对冲价格力，强化家庭场景与空间优势。' },
      { id: 'pa-d3', title: '华东 SOP 全国外溢', region: '全国', owner: '陈佳华', impact: 'mid', due: '2026-06-15', desc: '把 Deep Drive 体验日与转化 SOP 标准化，反哺华南/西北。' },
      { id: 'pa-d4', title: '西北下沉门店勘址', region: '西北', owner: '周建国', impact: 'low', due: '2026-07-01', desc: '完成率 72% 主因覆盖不足，规划 3 个地级市新店选址。' },
    ],
    citations: [
      { source: '指标平台', detail: '订单 8,412 台 · L7 完成率 78%' },
      { source: '补贴库', detail: '深圳 ¥12,000 · 至 2026-06-30' },
      { source: '操盘看板', detail: '华东 Deep Drive 体验日已验证' },
    ],
  },
};

function pickPlan(q: string): ActionPlan {
  const t = q.toLowerCase();
  const has = (...keys: string[]) => keys.some(k => t.includes(k.toLowerCase()));
  if (has('问界', 'm9', '上涨', 'l9 应对', '应对动作', '竞品')) return PLANS.rival_m9;
  if (has('补贴', '深圳', '收单', '冲刺', '截止', '临期')) return PLANS.subsidy_sz;
  if (has('华南', 'l7', '落后', '追赶', '缺口')) return PLANS.south_l7;
  return PLANS.default;
}

// ─── Starter prompts ─────────────────────────────────────────────────────────
const QA_STARTERS: { icon: React.ReactNode; text: string }[] = [
  { icon: <Swords size={15} />, text: '分析 L9 在大型SUV市场的竞争优势与威胁' },
  { icon: <BadgePercent size={15} />, text: '深圳/上海补贴对比，哪个更适合推 L7？' },
  { icon: <Swords size={15} />, text: '问界 M9 销量上涨 8%，我们如何应对？' },
  { icon: <Target size={15} />, text: '制定本月 L8 区域销售目标拆解' },
  { icon: <BarChart3 size={15} />, text: '华东区 Q2 低于目标，原因与操盘建议' },
  { icon: <MessageSquareText size={15} />, text: '最新小红书/懂车帝舆情，用户最关心什么？' },
  { icon: <MapPin size={15} />, text: '西北区完成率 72%，下沉市场如何破局？' },
  { icon: <Database size={15} />, text: '本月订单与市占率总览，关键缺口在哪？' },
];

const AGENT_STARTERS: { icon: React.ReactNode; text: string }[] = [
  { icon: <Target size={15} />, text: '华南区 L7 落后目标 22%，制定追赶方案' },
  { icon: <BadgePercent size={15} />, text: '深圳补贴 6 月底截止，设计收单冲刺' },
  { icon: <Swords size={15} />, text: '问界 M9 上涨 8%，制定 L9 应对动作' },
  { icon: <Workflow size={15} />, text: '本月经营缺口攻坚，生成 30 天作战动作' },
];

// ─── Citation source → icon ──────────────────────────────────────────────────
function citeIcon(source: string): React.ReactNode {
  if (source.includes('竞品')) return <Swords size={12} />;
  if (source.includes('补贴')) return <BadgePercent size={12} />;
  if (source.includes('VOC') || source.includes('录音')) return <MessageSquareText size={12} />;
  if (source.includes('操盘')) return <Target size={12} />;
  return <Database size={12} />;
}

// ─── Impact → label / class ──────────────────────────────────────────────────
const IMPACT_LABEL: Record<PlanCard['impact'], string> = { high: '高', mid: '中', low: '低' };

// ─── Lightweight markdown renderer ───────────────────────────────────────────
// Supports: ## / ### headings, **bold**, - / * bullets, 1. numbered,
// | tables |, blockquote (> source note as italic), and inline bold.
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={`${keyBase}-b${i}`}>{p.slice(2, -2)}</strong>;
    }
    return <span key={`${keyBase}-t${i}`}>{p}</span>;
  });
}

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table block (header row + separator + body)
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const header = line.split('|').slice(1, -1).map(c => c.trim());
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].split('|').slice(1, -1).map(c => c.trim()));
        i++;
      }
      blocks.push(
        <div className="md-table-wrap" key={`md${key++}`}>
          <table className="md-table tnum">
            <thead>
              <tr>{header.map((h, hi) => <th key={hi}>{renderInline(h, `h${key}-${hi}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, ci) => <td key={ci}>{renderInline(c, `c${key}-${ri}-${ci}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      blocks.push(<h4 className="md-h4" key={`md${key++}`}>{renderInline(line.slice(4), `mh${key}`)}</h4>);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(<h3 className="md-h3" key={`md${key++}`}>{renderInline(line.slice(3), `mh${key}`)}</h3>);
      i++;
      continue;
    }

    // Blockquote → italic source note
    if (line.startsWith('> ')) {
      blocks.push(<p className="md-quote" key={`md${key++}`}><em>{renderInline(line.slice(2), `mq${key}`)}</em></p>);
      i++;
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      blocks.push(
        <ol className="md-ol" key={`md${key++}`}>
          {items.map((it, ii) => <li key={ii}>{renderInline(it, `ol${key}-${ii}`)}</li>)}
        </ol>,
      );
      continue;
    }

    // Bullet list
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ''));
        i++;
      }
      blocks.push(
        <ul className="md-ul" key={`md${key++}`}>
          {items.map((it, ii) => <li key={ii}>{renderInline(it, `ul${key}-${ii}`)}</li>)}
        </ul>,
      );
      continue;
    }

    // Blank line
    if (line.trim() === '') { i++; continue; }

    // Paragraph
    blocks.push(<p className="md-p" key={`md${key++}`}>{renderInline(line, `mp${key}`)}</p>);
    i++;
  }

  return <>{blocks}</>;
}

// ─── Execution plan (行动模式 structured output) ──────────────────────────────
function ActionPlanBlock({ cards, citations }: { cards: PlanCard[]; citations: Citation[] }) {
  // Mock state transition per card: 待确认 → (click) → 已指派 ✓.
  const [assigned, setAssigned] = useState<Record<string, boolean>>({});
  const assignedCount = cards.reduce((n, c) => n + (assigned[c.id] ? 1 : 0), 0);
  const pendingCount = cards.length - assignedCount;
  const assign = (id: string) => setAssigned(prev => (prev[id] ? prev : { ...prev, [id]: true }));

  return (
    <div className="plan-block">
      {/* 执行摘要 */}
      <div className="plan-summary">
        <span className="plan-summary-icon"><ClipboardList size={15} /></span>
        <div className="plan-summary-body">
          <span className="plan-summary-title">执行摘要</span>
          <span className="plan-summary-sub tnum">
            已生成 {cards.length} 个操盘动作 · 待审批 {pendingCount} · 已指派 {assignedCount}
          </span>
        </div>
        <div className="plan-summary-meter">
          {cards.map(c => (
            <span key={c.id} className={`plan-meter-pip ${assigned[c.id] ? 'is-on' : ''}`} />
          ))}
        </div>
      </div>

      {/* 操盘动作卡 */}
      <div className="plan-label"><ListChecks size={13} /> 操盘动作卡</div>
      <div className="plan-cards">
        {cards.map((c, ci) => {
          const isAssigned = !!assigned[c.id];
          return (
            <div className={`plan-card reveal reveal-${Math.min(ci + 1, 6)}`} key={c.id}>
              <div className="plan-card-top">
                <span className={`plan-impact plan-impact-${c.impact}`}>影响 {IMPACT_LABEL[c.impact]}</span>
                <span className={`plan-status ${isAssigned ? 'is-assigned' : 'is-pending'}`}>
                  {isAssigned ? <><CheckCircle2 size={12} /> 已指派</> : '待确认'}
                </span>
              </div>
              <div className="plan-card-title">{c.title}</div>
              <p className="plan-card-desc">{c.desc}</p>
              <div className="plan-card-meta">
                <span className="plan-meta-item"><User size={12} /> {c.owner}</span>
                <span className="plan-meta-item"><MapPin size={12} /> {c.region}</span>
                <span className="plan-meta-item tnum"><Clock size={12} /> {c.due}</span>
              </div>
              <div className="plan-card-actions">
                <button
                  className="plan-btn plan-btn-primary"
                  onClick={() => assign(c.id)}
                  disabled={isAssigned}
                >
                  {isAssigned ? <><CheckCircle2 size={13} /> 已指派 {c.owner}</> : <><UserPlus size={13} /> 指派</>}
                </button>
                <button
                  className="plan-btn plan-btn-ghost"
                  onClick={() => assign(c.id)}
                  disabled={isAssigned}
                >
                  <ClipboardList size={13} /> 加入操盘看板
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 数据来源 */}
      {citations.length > 0 && (
        <div className="cite-footer">
          <span className="cite-label">数据来源</span>
          <div className="cite-cards">
            {citations.map((c, ci) => (
              <div className="cite-card" key={ci}>
                <span className="cite-icon">{citeIcon(c.source)}</span>
                <div className="cite-text">
                  <span className="cite-src">{c.source}</span>
                  <span className="cite-detail">{c.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Message model (local · extends ChatMessage with optional plan payload) ───
interface ChatItem extends ChatMessage {
  agent?: boolean;                              // assistant rendered as 行动模式 agent
  plan?: { cards: PlanCard[]; citations: Citation[] }; // attached once stream completes
}

// ─── Message bubble ──────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatItem }) {
  const isUser = msg.role === 'user';
  const isAgent = !!msg.agent;
  return (
    <div className={`msg-row ${isUser ? 'msg-row-user' : 'msg-row-ai'} reveal`}>
      <div className={`msg-avatar ${isUser ? 'msg-avatar-user' : isAgent ? 'msg-avatar-agent' : 'msg-avatar-ai'}`}>
        {isUser ? <User size={16} /> : isAgent ? <Zap size={16} /> : <Bot size={16} />}
      </div>
      <div className="msg-body">
        {isUser ? (
          <div className="msg-bubble msg-bubble-user">{msg.content}</div>
        ) : (
          <div className={`msg-bubble msg-bubble-ai ${isAgent ? 'msg-bubble-agent' : ''}`}>
            {isAgent && (
              <div className="agent-ribbon">
                <Zap size={13} /> 行动模式 · AI 操盘
              </div>
            )}
            {msg.content === '' && msg.isStreaming ? (
              <span className="row gap-2 text-3" style={{ fontSize: 13 }}>
                <span className="dot-pulse" style={{ background: 'var(--gold)' }} />
                {isAgent ? '正在推演操盘动作…' : '正在分析内部数据…'}
              </span>
            ) : (
              <>
                <div className="md-content">
                  <MarkdownContent text={msg.content} />
                  {msg.isStreaming && <span className="cursor-blink">▍</span>}
                </div>
                {!msg.isStreaming && msg.plan && (
                  <ActionPlanBlock cards={msg.plan.cards} citations={msg.plan.citations} />
                )}
                {!msg.isStreaming && !msg.plan && msg.citations && msg.citations.length > 0 && (
                  <div className="cite-footer">
                    <span className="cite-label">数据来源</span>
                    <div className="cite-cards">
                      {msg.citations.map((c, ci) => (
                        <div className="cite-card" key={ci}>
                          <span className="cite-icon">{citeIcon(c.source)}</span>
                          <div className="cite-text">
                            <span className="cite-src">{c.source}</span>
                            <span className="cite-detail">{c.detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
let idSeq = 0;
const nextId = () => `m${Date.now()}-${idSeq++}`;

export default function AiAssistant() {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [mode, setMode] = useState<Mode>('qa');
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const timers = useRef<number[]>([]);

  const isAgentMode = mode === 'agent';

  // Auto-scroll to bottom on new content.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Cleanup any pending stream timers on unmount.
  useEffect(() => () => { timers.current.forEach(t => window.clearTimeout(t)); }, []);

  const sendMessage = (raw: string) => {
    const text = raw.trim();
    if (!text || streaming) return;

    const agent = isAgentMode;
    const userMsg: ChatItem = { id: nextId(), role: 'user', content: text, timestamp: new Date() };
    const aiId = nextId();
    const aiMsg: ChatItem = { id: aiId, role: 'assistant', content: '', timestamp: new Date(), isStreaming: true, agent };
    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInput('');
    setStreaming(true);
    if (taRef.current) taRef.current.style.height = 'auto';

    // Pick streamed content + completion payload by mode.
    const plan = agent ? pickPlan(text) : null;
    const answer = agent ? null : pickAnswer(text);
    const full = agent ? plan!.diagnosis : answer!.content;

    // Simulated streaming: reveal in small chunks via window.setTimeout.
    const CHUNK = 3;
    let cursor = 0;
    const step = () => {
      cursor = Math.min(cursor + CHUNK, full.length);
      const slice = full.slice(0, cursor);
      setMessages(prev => prev.map(m => (m.id === aiId ? { ...m, content: slice } : m)));
      if (cursor < full.length) {
        timers.current.push(window.setTimeout(step, 12));
      } else {
        setMessages(prev => prev.map(m => {
          if (m.id !== aiId) return m;
          if (agent && plan) {
            return { ...m, content: full, isStreaming: false, plan: { cards: plan.cards, citations: plan.citations } };
          }
          return { ...m, content: full, isStreaming: false, citations: answer!.citations };
        }));
        setStreaming(false);
      }
    };
    timers.current.push(window.setTimeout(step, 360));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = taRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    }
  };

  const clearChat = () => {
    timers.current.forEach(t => window.clearTimeout(t));
    timers.current = [];
    setStreaming(false);
    setMessages([]);
    setInput('');
    if (taRef.current) taRef.current.style.height = 'auto';
  };

  // Switch mode: clears the conversation so the two experiences never interleave.
  const switchMode = (next: Mode) => {
    if (next === mode || streaming) return;
    setMode(next);
    setMessages([]);
    setInput('');
    if (taRef.current) taRef.current.style.height = 'auto';
  };

  const hasChat = messages.length > 0;
  const starters = isAgentMode ? AGENT_STARTERS : QA_STARTERS;

  return (
    <div className={`ai-page ${isAgentMode ? 'ai-page-agent' : ''}`}>
      {/* ── Header ── */}
      <header className="ai-header">
        <div className="row gap-3">
          <div className={`ai-logo ${isAgentMode ? 'ai-logo-agent' : ''}`}>
            {isAgentMode ? <Zap size={20} /> : <Bot size={20} />}
          </div>
          <div>
            <div className="ai-title">{isAgentMode ? '策略 AI 操盘' : '策略 AI 助手'}</div>
            <div className="ai-subtitle">
              <span className="dot-pulse" style={{ background: isAgentMode ? 'var(--gold)' : 'var(--emerald)' }} />
              {isAgentMode ? '行动型 Agent · 诊断 → 生成执行计划' : '基于理想汽车内部数据 · 实时分析'}
            </div>
          </div>
        </div>
        <div className="row gap-3">
          <div className="ai-mode-switch" role="tablist" aria-label="AI 模式切换">
            <button
              role="tab"
              aria-selected={!isAgentMode}
              className={`ai-mode-btn ${!isAgentMode ? 'is-active' : ''}`}
              onClick={() => switchMode('qa')}
              disabled={streaming}
            >
              <MessageSquareText size={14} /> 问答模式
            </button>
            <button
              role="tab"
              aria-selected={isAgentMode}
              className={`ai-mode-btn ${isAgentMode ? 'is-active' : ''}`}
              onClick={() => switchMode('agent')}
              disabled={streaming}
            >
              <Zap size={14} /> 行动模式
            </button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={clearChat} disabled={!hasChat && !streaming}>
            <RefreshCw size={14} /> 清除对话
          </button>
        </div>
      </header>

      {/* ── Messages / Welcome ── */}
      <div className="ai-scroll" ref={scrollRef}>
        {!hasChat ? (
          <div className="ai-welcome">
            <div className={`ai-welcome-icon ${isAgentMode ? 'ai-welcome-icon-agent' : ''}`}>
              {isAgentMode ? <Zap size={30} /> : <Sparkles size={30} />}
            </div>
            <h2 className="ai-welcome-title">
              {isAgentMode ? '说出目标，AI 生成执行计划' : '策略分析，即问即答'}
            </h2>
            <p className="ai-welcome-sub">
              {isAgentMode
                ? '不止回答——给出一个目标，我先诊断研判，再产出分步追赶路径与可指派的「操盘动作卡」，一键加入操盘看板。'
                : '连接指标平台、竞品数据库、补贴库与 VOC 舆情，给出结构化的关键发现、操盘建议与风险预警。'}
            </p>
            <div className="ai-starter-grid">
              {starters.map((s, i) => (
                <button
                  key={i}
                  className={`ai-starter reveal reveal-${Math.min(i + 1, 6)} ${isAgentMode ? 'ai-starter-agent' : ''}`}
                  onClick={() => sendMessage(s.text)}
                >
                  <span className="ai-starter-icon">{s.icon}</span>
                  <span className="ai-starter-text">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="ai-messages">
            {messages.map(m => <MessageBubble key={m.id} msg={m} />)}
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div className="ai-input-zone">
        <div className="ai-input-box">
          {isAgentMode && <span className="ai-input-mode-tag"><Zap size={12} /> 行动</span>}
          <textarea
            ref={taRef}
            className="ai-textarea"
            placeholder={isAgentMode
              ? '描述一个目标，例如：华南区 L7 落后目标 22%，制定追赶方案（Enter 发送 · Shift+Enter 换行）'
              : '询问销售策略，例如：L9 如何应对问界 M9 的竞争？（Enter 发送 · Shift+Enter 换行）'}
            value={input}
            onChange={onInput}
            onKeyDown={onKeyDown}
            rows={1}
          />
          <button
            className="ai-send"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            title="发送"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="ai-disclaimer">
          {isAgentMode
            ? 'AI 生成的操盘动作为策略建议，指派与排期请结合区域实际资源确认。'
            : 'AI 基于内部数据生成分析，结果仅供策略参考，请结合业务判断。'}
        </div>
      </div>
    </div>
  );
}
