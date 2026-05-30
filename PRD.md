# 销售策略 AI 工作台 · PRO · 产品需求文档（PRD）

> 版本：v1.0 · 定稿 2026-05-29 · 全 mock 前端 demo
> 对标：`jieli2026/sales-strategy-ai`（理想汽车销售策略中台 take-home demo）
> 一句话：把销售策略中台从「**监控仪表盘**」升级为「**决策 + 行动引擎**」。

---

## 0. 元信息

| 项 | 内容 |
|---|---|
| 项目代号 | 销售策略 AI 工作台 · PRO |
| 业务方 | 理想汽车 · 销售策略团队（演示用，全 mock） |
| 项目根 | `~/Desktop/260528中台系统demo开发/` |
| 技术栈 | React 19 · TypeScript · Vite 6 · ECharts 5 · react-router-dom 7 · lucide-react |
| 主题 | 3 套：Dark Aurora Glass / Light Frosted Studio / Anthropic Warm Ivory |
| 模块 | 24 个功能页 + 登录页 |
| 构建 | `npm run build` 绿灯（2180 模块，CSS 48.5KB，JS 1.62MB） |
| 设计契约 | `DESIGN.md`（高级感关键词 + token + 反 slop 红线） |
| 知识库 | Obsidian vault `260407started/research/24~27` |

---

## 1. 产品背景

理想汽车销售策略团队（策略总监 / 分析师 / 区域销售 / 访客）需要一个跨数据源（手工 Excel + 内部 API + 官网抓取 + 录音+社媒）的中台，将「目标拆解 / 数据洞察 / 用户声音 / AI 问答 / 项目协作」一站打通。原 demo 实现了 6 个页面，留了 5 个空占位、缺关键的「用户声音 VOC」域，且没有预测/模拟/AI 行动等"决策引擎"能力。

本 PRD 描述的 PRO 版**完整覆盖**原 demo 11 个模块，**新增** 12 个高价值模块（用户声音 VOC、智能决策 6 项、P1/P2 6 项），共 24 功能页 + 3 套主题，构建绿灯、浏览器逐页验证。

---

## 2. 目标用户与角色 (RBAC)

| 角色 | 权限范围 | 演示账号 |
|---|---|---|
| 策略总监 director | 全部模块 + 用户/角色管理 | 张明远 zhang.mingyuan@lixiang.com |
| 策略分析师 analyst | 分配车型读写 + 策略/报告编辑 | 李晓雨、王浩、孙雅婷 |
| 区域销售 regional_sales | 本区域只读 + AI 问答 | 陈佳华(华东)、刘敏(华南)、周建国(华北) |
| 访客 viewer | 特定模块只读 | 赵鹏 |

权限模型：20 个 PermissionKey × `page / action / data` 三类，[策略总监] 全部、[分析师] 14 项、[区域销售] 8 项、[访客] 3 项。详见「角色权限管理」页可视化矩阵。

---

## 3. 信息架构

8 个导航大组，24 个功能页：

```
作战指挥 (5)   指挥大屏 · 目标管理 · 操盘动作 · 战报中心 · 作战室
数据洞察 (4)   市场五看 · 竞品数据 · 补贴政策 · 门店网络
智能决策 (6)   销量预测 · 策略沙盘 · 漏斗诊断 · 异常报警 · 竞品战棋 · 激励测算
用户声音 (3)   舆情概览 · 试驾会话智能 · 产品反馈闭环
AI 助手  (1)   问答模式 + 行动模式（操盘动作卡 + 指派）
知识库   (1)
项目管理 (1)
系统设置 (3)   用户管理 · 角色权限 · 数据治理
```

叙事主线：**看（监控）→ 算（预测/模拟）→ 诊断 → 预警 → 行动 → 沉淀 → 治理**。

---

## 4. 数据层映射（题目所给 9 个数据源 → 模块）

| 数据源（题目原文） | 来源类型 | 主要消费模块 | 在 demo 中如何呈现 |
|---|---|---|---|
| BP 目标 | 手工 Excel | 目标管理 / 销量预测 / 数据治理 | 数据源 badge "手工Excel" 显示在表格行 |
| 经营数据 | 手工 Excel | 指挥大屏 / 战报中心 / 数据治理 | KPI + 趋势线 |
| 月度目标 | 内部 API | 目标管理 / 销量预测 / 异常报警 | 月度达成 ProgressBar + commit vs AI 预测线 |
| 销售漏斗数据 | 内部 API | 指挥大屏 / 漏斗诊断官 | ECharts 漏斗 + 转化率诊断 |
| 市场大盘 | 内部 API | 市场五看 / 销量预测 | 渗透率曲线 + 行业份额饼 |
| 竞品订单量 | 手工 Excel | 竞品数据 / 战棋 / 异常报警 | 排名条 + 趋势 sparkline |
| 竞品门店分布 | 官网抓取 | 门店网络 / 数据治理 | 各城理想 vs 竞品门店柱图 + 资产新鲜度标 |
| 用户声音 | 试驾录音 + 小红书/微博/懂车帝/汽车之家/易车 | 舆情概览 / 会话智能 / 产品反馈 | 情感分布 + 平台分布 + 帖子流 + 录音转写 |
| 销售政策 + 地方补贴 | 手工 Excel | 补贴政策 / 异常报警 / 激励测算 | 城市补贴地图 + 临期预警 + 返利弹性 |

「数据治理」页统一展示 9 资产：来源类型 / 更新频率 / 新鲜度 / 质量分 / 异常标记 + 血缘关系。

---

## 5. 模块详述（24 页）

每条格式：**路径** · 职责 · 关键能力 · 数据源。

### 5.1 作战指挥（5）

1. **指挥大屏** `/command/overview` — 全局视图。6 张 KPI 卡（订单/交付/市占/线索/试驾转化/终端均价，含 sparkline+count-up）、销售漏斗、订单/交付趋势线、车型完成率横条、L9 vs 问界M9 雷达、区域订单+完成率双轴、风险预警卡组。
2. **目标管理** `/command/goals` — BP 年度 + 月度目标拆解。grouped bar 月度目标 vs 实际、子弹图 YTD 进度、详情表带 ProgressBar + 数据源 badge（手工Excel/内部API）。
3. **操盘动作** `/command/ops` — 4 列 Kanban（待办/进行中/风险/已完成）。卡片含 impact chip、负责人、区域、截止、ProgressBar；底部 "风险动作详情" 面板；区域过滤。
4. **战报中心** `/command/report` — AI 一键生成日报/周报。NL 总结 + 关键指标卡片 + 一键导出 PPT/PDF（mock）+ 推送指挥层。
5. **作战室** `/command/warroom` — 大屏协作模式。批注、@ 提及、在线状态、聚焦图层。

### 5.2 数据洞察（4）

6. **市场五看** `/insights/market` — 左侧 5 看导航 + 右侧详情。每看自适应图表：宏观渗透率线、行业能源结构环、竞品对比条、客户舆情玫瑰、自身完成率条。
7. **竞品数据** `/insights/competitor` — TOP3 销量卡、销量排名条 + 价格×销量散点切换、可排序明细表（品牌色点 + Sparkline + TrendChip + 标签）、竞品门店区域分布堆叠条 + 列表。
8. **补贴政策** `/insights/subsidy` — 3 统计卡、城市补贴金额柱图（按状态着色 + 封顶叠加）、状态 Segmented + 搜索、响应式政策卡。
9. **门店网络优化** `/insights/network` — 各城市理想 vs 竞品门店柱图、覆盖与机会分析表（覆盖率/客流/转化 + 加密机会标签）。

### 5.3 智能决策（6）

10. **销量预测** `/intel/forecast` — 区域/车型预计完成率 + 落地概率（红黄绿）+ 缺口。目标 vs AI 预计分组柱（按概率着色）+ 周度 Commit-vs-AI 路径线 + 缺口 markLine + 最高风险项聚焦卡。
11. **What-if 策略沙盘** `/intel/sandbox` — 4 滑块（降价/补贴/竞品/营销）+ 3 情景预设。实时联动 4 大结果数（订单/营收/毛利/市占）+ 各车型基准 vs 情景柱图 + 对比基准条。
12. **漏斗诊断官** `/intel/funnel` — 可点击漏斗下钻。选中节点 → 掉点归因（带权重）+ 建议动作卡（带「转操盘动作」）+ 各环节转化率步线 + 区域/车型过滤。
13. **智能异常报警中心** `/intel/alerts` — 跨 5 源主动检出。NL 描述异常、严重度过滤、操作按钮 [转操盘/标记已读/推送钉钉邮件]、源 × 严重度堆叠条、规则说明。
14. **竞品战棋推演** `/intel/wargame` — 4 竞争情景库。冲击评估（总订单 + 单车）、各车型影响条、红蓝对抗 4 协同剧本。
15. **激励/返利测算** `/intel/incentive` — 返利阶梯 → 销量·毛利弹性模拟。

### 5.4 用户声音（3 · group）

16. **舆情概览** `/voc/overview` — 情感分布环 + 平台分布柱 + 热门话题 + 7 日情感分层趋势 + 帖子流（过滤）+ 试驾录音转写卡。
17. **试驾会话智能** `/voc/conversation` — 录音深度分析：竞品提及统计 + 高频异议 + 承诺事项 + talk-ratio + 关键时刻标注。
18. **产品反馈闭环** `/voc/feedback` — 舆情痛点自动归类到产品线 + 打标 + 工单流转 + 跨部门协作。

### 5.5 AI 助手（1）

19. **AI 助手** `/ai` — 双模式：
   - **问答模式** — 流式 + markdown + 表格 + 引用卡片（指标平台/竞品库/补贴库/VOC）。
   - **行动模式** — 给目标 → 诊断 + 30天追赶路径 + 执行摘要 + 操盘动作卡（指派/加入操盘看板，含审批态）。对标 Salesforce Agentforce。

### 5.6 知识库 / 项目管理（2）

20. **知识库** `/knowledge` — 文档库：分类 Segmented、搜索、置顶、卡片网格。
21. **项目管理** `/projects` — 4 列 Kanban（待规划/进行中/评审中/已完成）+ 优先级 P0/P1/P2 + 过期标识。

### 5.7 系统设置（3）

22. **用户管理** `/settings/users` — 用户表（avatar + 角色 badge + 状态 chip）+ 搜索 + 角色筛选 + 统计卡。
23. **角色权限** `/settings/roles` — 左侧角色卡 + 右侧 RBAC 矩阵（page/action/data 三类色标 + check 状态）。
24. **数据治理** `/settings/data` — 9 资产清单：来源类型分布环 + 质量分布柱 + 详情表（新鲜度/质量分/异常标）+ 血缘图（指标 ← 上游数据源）。

---

## 6. 设计系统（DESIGN.md 摘要）

### 6.1 高级感关键词
沉稳指挥感 · 精密仪器 · 克制奢华 · 数据为先 · 编辑式精致 · 丝滑。

### 6.2 三套主题（CSS-var token 同构）

| 主题 | 气质 | 调色板 | 字体 |
|---|---|---|---|
| **Dark Aurora Glass**（默认） | 深空玻璃指挥感 | 深靛极光底 #090C16 + 天蓝 #5AA8FF + 青绿 #2FD8C0 | Geist sans |
| **Light Frosted Studio** | Linear/Stripe 浅色编辑 | 冷瓷白 #EEF2FB + 深天蓝 #2F7FE0 + 翠 #0E9E8A | Geist sans |
| **Anthropic Warm Ivory** | Anthropic 官网克制温暖 | 暖象牙 #FAF9F5 + 珊瑚陶土 #D97757 + 橄榄 #788C5D | Geist + **Newsreader 衬线标题**（近似 Tiempos） |

### 6.3 反 AI-slop 红线（逐条 ship 前自检）
- 无 AI 紫发光 / 无随机霓虹
- 无千篇一律 glassmorphism 涂满（Anthropic 主题直接关掉玻璃）
- 数字全 `tabular-nums`，图表用真 ECharts
- 真实理想汽车业务数据，无 lorem ipsum / Acme Corp
- UI chrome 无 emoji，用 lucide 图标
- 文案具体专业，无「赋能/无缝/Next-Gen」陈词
- 一页一 accent 锁定；间距统一 4px 网格

### 6.4 动效
进场 fadeUp + stagger reveal-1..6；KPI count-up；图表 draw-in；微交互 hover 抬升；主题切换平滑过渡。respects `prefers-reduced-motion`。

---

## 7. 技术架构

```
src/
├─ App.tsx                  # BrowserRouter + 24 路由 + Auth/Theme 包裹
├─ main.tsx                 # 入口
├─ styles/theme.css         # 3 主题 token + 玻璃材质 + 共享 utility/class
├─ contexts/
│   ├─ AuthContext.tsx      # mock SSO + RBAC hasPermission
│   └─ ThemeContext.tsx     # 3 主题循环切（dark→light→anthropic）
├─ components/
│   ├─ Layout.tsx + .css    # 侧栏 + 顶栏(⌘K + 主题 + 通知 + 用户) + Outlet
│   ├─ Chart.tsx            # ECharts 包装（theme-aware，rAF 重建）
│   ├─ CommandPalette.tsx   # ⌘K 命令面板（FLAT_ROUTES + 主题切 + 退出）
│   ├─ ui.tsx               # Card/PageHeader/StatCard/TrendChip/Sparkline/Badge/Segmented/ProgressBar/EmptyState/SectionTitle
│   └─ Placeholder.tsx
├─ lib/
│   ├─ chartTheme.ts        # baseOption/axisStyle/cssVar/ANIM + BRAND_COLORS
│   ├─ hooks.ts             # useCountUp/useInView/fmt
│   ├─ mockData.ts          # 全域 mock（ROLES/MOCK_USERS/METRICS/...）
│   └─ nav.tsx              # NAV + FLAT_ROUTES + crumbFor
├─ types/index.ts           # 全局 TypeScript 类型
└─ pages/                   # 24 路由对应文件（按 nav 分目录）
    ├─ Login.tsx
    ├─ command/{Overview,Goals,Ops,Report,WarRoom}.tsx
    ├─ insights/{Market,Competitor,Subsidy,Network}.tsx
    ├─ intel/{Forecast,Sandbox,FunnelDiag,Alerts,WarGame,Incentive}.tsx
    ├─ voc/{Voc,Conversation,Feedback}.tsx
    ├─ ai/AiAssistant.tsx (+ .css)
    ├─ knowledge/Knowledge.tsx
    ├─ projects/Projects.tsx
    └─ settings/{Users,Roles,DataGov}.tsx
```

**核心模式**：CSS-var token 中心化 → 改 token 全站换色；`Chart` 组件 `mode` 依赖 + rAF 重建保证三主题图表正确；shared component lib 保证 24 页风格一致；并行 agent 各包独立文件无冲突；FLAT_ROUTES + crumbFor 通用，加路由零额外工作。

---

## 8. 主题切换 UX

右上角 icon 按钮循环：🌙 深色 → ☀️ 浅色 → 🎨 Anthropic → 🌙。localStorage 持久化。登录页同样可切。所有页面（含 ECharts 图表）通过 CSS var 即时跟随。

---

## 9. 交付物 / 如何运行 / 验证

### 运行
```bash
cd "~/Desktop/260528中台系统demo开发"
npm install        # 已装；React 19 + Vite 6 + lucide-react + echarts + react-router-dom
npm run dev        # http://localhost:5180
npm run build      # tsc -b + vite build → dist/
```

### 验证（已完成）
- ✅ `npm run build` 绿灯，2180 模块，CSS 48.5KB，JS 1.62MB
- ✅ 浏览器逐页（指挥大屏 / VOC / AI 双模式 / 竞品 / 市场五看 / 目标管理 / 操盘 / 补贴 / 知识库 / 项目 / 用户 / 角色 / 销量预测 / 沙盘 / 漏斗诊断 / 异常报警 / 竞品战棋 / 门店网络 / 数据治理）
- ✅ 三主题（Dark Glass / Light Glass / Anthropic）逐主题验证
- ✅ AI 行动模式：诊断 + 追赶路径 + 操盘动作卡（带「指派」「加入操盘看板」）实际生成
- ✅ ⌘K 命令面板、count-up、主题切换、RBAC 切角色 实际可用

### 演示流程建议（5 分钟）
1. 登录 → 选「张明远 · 策略总监」（看全部）
2. **指挥大屏** — 全局态势 1 屏看懂
3. **What-if 策略沙盘** — 拖滑块，订单 +16% / 毛利 -20% 即时联动（最炸的一屏）
4. **漏斗诊断官** — 点 "线索→留资" 看下钻归因
5. **AI 助手 → 行动模式** — 输入「华南区 L7 落后 22%，制定追赶方案」→ 看 AI 生成操盘动作卡
6. 右上角切 **Anthropic** 主题 — 同一数据，完全不同气质
7. **数据治理** — 9 个数据源的来源/新鲜度/质量一览

---

## 10. Roadmap / 未来

| 优先级 | 项 | 备注 |
|---|---|---|
| 已交付 | Top 5 + P1/P2 backlog 全部 12 项 | 见 §5 |
| Next | 部署成可分享链接（Vercel/Netlify static） | 静态 SPA，无后端依赖 |
| Next | 真数据接入（替换 mockData 为 fetch） | API contract 已通过 types 锁定 |
| Future | 大屏 1080p/4K 适配 + 全屏模式 | 作战室真实大屏 |
| Future | 移动端响应式 + 移动作战室 |  |
| Future | 跨车型 / 跨年度数据切换 |  |

---

## 11. 验收清单

- [x] 24 个功能页全部实现，路由通
- [x] 3 套主题全部可切，所有图表/卡片/表格 token 化
- [x] RBAC 4 角色 × 20 权限 矩阵实现且可视化
- [x] 题目 9 个数据源全部映射到模块 + 数据治理统一管理
- [x] AI 助手双模式（问答 + 行动），行动模式生成操盘动作卡
- [x] 反 AI-slop 清单逐条 ship 前过
- [x] `npm run build` 绿灯（2180 模块）
- [x] 浏览器逐页 + 三主题验证
- [x] DESIGN.md + PRD.md + Obsidian KB（research/21~27）齐备
- [x] 所有数据 mock，无后端依赖，npm install + npm run dev 即跑

---

## 附录 A · 关键路由速查

| 路径 | 模块 |
|---|---|
| `/command/overview` | 指挥大屏 |
| `/command/goals` | 目标管理 |
| `/command/ops` | 操盘动作 |
| `/command/report` | 战报中心 |
| `/command/warroom` | 作战室 |
| `/insights/market` | 市场五看 |
| `/insights/competitor` | 竞品数据 |
| `/insights/subsidy` | 补贴政策 |
| `/insights/network` | 门店网络 |
| `/intel/forecast` | 销量预测 |
| `/intel/sandbox` | What-if 策略沙盘 |
| `/intel/funnel` | 漏斗诊断官 |
| `/intel/alerts` | 智能异常报警 |
| `/intel/wargame` | 竞品战棋推演 |
| `/intel/incentive` | 激励/返利测算 |
| `/voc/overview` | 舆情概览 |
| `/voc/conversation` | 试驾会话智能 |
| `/voc/feedback` | 产品反馈闭环 |
| `/ai` | AI 助手（双模式） |
| `/knowledge` | 知识库 |
| `/projects` | 项目管理 |
| `/settings/users` | 用户管理 |
| `/settings/roles` | 角色权限 |
| `/settings/data` | 数据治理 |

## 附录 B · 关键文档指针

- **DESIGN.md**（项目根）— 设计契约：高级感关键词 + token + 反 slop 红线 + 8 条对原作的超越点
- **research/21** — Taste 护城河（Jobs + Andrés Max）
- **research/22** — gstack harness 架构
- **research/23** — 前端审美兵器库
- **research/24** — TasteSkill 反 slop 框架
- **research/25** — 中台 demo 实战拆解 + 超越打法 + 并行 agent 工程
- **research/26** — 销售策略中台可增功能 backlog（竞品 × 产品 × 业务场景）
- **research/27** — 本版交付 v1.0 milestone

---

**END · 销售策略 AI 工作台 · PRO · v1.0**
