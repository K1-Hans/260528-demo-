# 01b · znkf 全功能盘点 + 新前端覆盖映射（build 清单）

> 开发官 2026-06-16 · demo ① AI 客服中台的「功能一个都不能少」对照表。
> 真相源：`znkf-package-mac/`（最新最全主版本）+ `znkf-package/znkfpt-2`（PRD/新功能/截图）。
> 三路 agent 盘点 + 开发官读 ARCHITECTURE/API/PROJECT_REQUIREMENTS 交叉验证。

---

## 0. 真相口径（agent 抓到的差异，以**真实数据**为准）

| 项 | PRD 口径 | 真实数据 | 采用 |
|---|---|---|---|
| QA 条数 | ~13000 | 12,954（已生效 12948）| **12,954** |
| 场景数 | 702 | 675 unique | **675**（演示文案用「13486 条归并 700+ 场景」无妨）|
| 敏感词风险类 | 11 类 | 实际 8 类 | **8 类**（投诉维权/法律维权/金融监管/催收相关/媒体曝光/涉政敏感/合规风险/扬言轻生）|
| 敏感词量 | — | 51 主词 + 211 变体 | **51 / 211** |
| 卡片库 | — | 530（已生效 514 / 待发布 16）| **530** |
| 寒暄库 | — | 1,396 | **1,396** |
| 转人工库 | — | 149 | **149** |
| 意图树 | — | 10 个 L1 / 135 条 | **10 L1**（见 §4）|
| 角色 | admin/viewer | admin-1 + tester01 | **2 角色**（演示扩到 4 角色见规格 01）|

> 注：规格 01 的 6 大 KPI（自助率 85.23%/首解 70.58%/转人工 14.77%/服务占比 90.11%/坐席<30/月省 200 万）是**产品化叙事层**，znkf 后台真实指标是「昨日会话 1284 / 点踩率 3.2% / 转人工率 8.7% / 拒识率 12.4%」。两层都要：旗舰总览用规格 01 战绩 KPI，数据看板页用 znkf 真实日运营指标。

---

## 1. znkf 19 个 Panel 全清单（侧栏 12 可见 + 私有/扩展 7）

### 数据组
- [ ] **P1 数据看板** `dashboard`：4 KPI 卡（昨日会话量/点踩率/转人工率/拒识率，各带日环比+周环比+mini 柱图+点开趋势弹窗）｜触发意图 TOP10（日期筛选+导出 xlsx）｜点踩 TOP10 问题（日期筛选+导出）｜趋势弹窗
- [ ] **P2 Token 用量** `token-usage`：4 KPI（今日 token/本月累计/本月估算费用 ¥/单次平均）｜按 Agent 分布水平条（14 个 Agent 名）｜7 日趋势柱｜定价参考（qwen-plus 输入¥0.004/输出¥0.012 每千 token）

### 内容管理组
- [ ] **P3 智能体管理** `prompt`(admin)：AI 检索引擎状态条（就绪/增量入库/全量重建进度条/降级 4 态 + 重建按钮）｜LLM 模型分配卡（provider chips + Agent 分配表 + 测连通延迟）｜3 Tab（问答/意图/安抚 Agent）×（版本号+生效徽章+模型徽标+Temperature 滑块+版本历史+左右双栏编辑+预览 diff 发布+回滚）
- [ ] **P4 问题场景** `scenario`：库来源切换（QA/卡片）｜筛选（搜索+L1+状态）｜场景表（场景名/标准回复/更新时间/聚合状态/变体数/L1/操作）｜编辑答案（同步全变体）｜编辑变体｜查看变体｜上下线｜**标签多版本路由 + AB 比例**（场景级 A/B）｜新增场景
- [ ] **P5 QA 知识库** `qa`：统一搜索+L1+L2 联动+状态筛选｜10 列表（☑/问题/回复/场景/L1/L2/L3/状态/更新时间/操作）｜新增/编辑/详情侧滑（含近 7 日命中柱图+Top 问法）｜上下线｜发布生产｜批量删除｜**批量迁移**（跨库）｜模板下载/批量导入（xlsx）/导出｜待发布黄底高亮+demote 提示
- [ ] **P6 寒暄知识库** `chitchat-kb`：搜索+状态｜表（☑/问题/回复/更新时间/状态/操作）｜新增/编辑/详情/上下线/删/发布/批删/迁移/导入导出
- [ ] **P7 卡片知识库** `card-kb`：3 搜索框（卡片名/卡片ID/场景）+L1+L2+状态｜**分组视图**（同卡片 ID 多问法折叠，组头展开/收起/全展开/全收起+添加问法）｜10 列表（卡片ID 作回复）｜增删改/详情/上下线/发布/批删/迁移/导入导出
- [ ] **P8 转人工知识库** `transfer-kb`：搜索+状态｜表（☑/问题/回复/更新时间/状态/操作）｜增删改/详情/上下线/发布/批删/迁移/导入导出（命中返 JSON 给百灵触发转人工）
- [ ] **P9 敏感词管理** `sensitive`(admin)：搜索+风险类型筛选+计数｜词条表（主词/变体 OR 匹配/更新时间/风险类型/操作）｜展开变体/改类型/加变体/删变体/删主词｜新增右抽屉（主词+类型+多变体）｜模板/批量导入/导出/**操作日志 modal**
- [ ] **P10 标签管理** `tag-mgmt`(admin)：**只读同步视图**（来源=客服系统）｜搜索+分组筛选+计数｜表（标签 ID/名称/分组/来源状态）｜🔄 同步标签｜跳转客服系统链接（标签供 P4 场景多版本路由引用）
- [ ] **P11 分权管理** `perm`(admin)：搜索+角色筛选+状态筛选｜账户表（账号 ID/用户名/姓名/角色/状态/创建时间/备注/操作）｜新增/编辑/启停/删除｜创建编辑 modal｜viewer 写操作前端隐藏+后端 X-Role 403
- [ ] **P12 回收站** `recycle-bin`(admin)：搜索+数据表筛选（QA/卡片/转人工/寒暄/敏感词）｜表（来源/问题/场景/下线时间/原 index/操作）｜恢复（→待发布）/彻底删除（物理）｜stale-index 校验

### 质量运营组
- [ ] **P13 Badcase 运营** `badcase`：4 KPI 卡（总数/待处理/已修复/已忽略，可点筛选）｜筛选（状态+问题类型）+意图回填｜10 列表（用户问题/实际回复/回复来源/问题类型/L1/L2/L3/发生时间/状态/操作）｜查看详情侧滑｜修复 QA（→调整 QA modal 预填）｜忽略/撤销忽略/标记已修复
- [ ] **P14 拒识运营** `reject`：3 KPI（昨日拒识/近 7 日拒识问题/近 7 日新增 QA）｜筛选（期间+状态+意图）+意图回填+导出 CSV｜6 列表（用户问题/L1/L2/L3/最近发生/操作）｜新增至 QA（→调整 QA modal 预填意图）/忽略

### 工具组
- [ ] **P15 会话日志** `session-log`：2 视图切换｜**单轮视图**（关键词+RAG+意图+日期筛选；表：时间/问题/回复/意图/情绪/RAG 命中/耗时/状态）｜**按会话视图**（会话 ID/轮数/首末时间/意图/命中率/平均耗时/首句/操作）
- [ ] **P16 测试对话** `test`：左对话区（测试模式+会话 ID+自动展开 Pipeline+新建会话+清空）｜聊天窗（点赞/点踩反馈→Badcase 菜单+来源徽章+token 徽章）｜**Agent Pipeline 可视化**（A1 关键词→A2 意图+情绪→路由→安抚/问答 Agent+A4 合规，逐节点点亮）｜右配置区（快捷测试用例卡「AI 换一换」+6 预设｜记忆配置 toggle+轮次滑块+发布｜A4 合规质检规则 R1-R7｜路由规则 banner）
- [ ] **P17 生产对话** `prod-chat`：居中单卡聊天（仅检索已生效 QA，待发布/已下线不出现）+ 新建/清空
- [ ] **P18 Pipeline 测试** `pipeline-test`(私有)：3 Tab｜**准备用例**（AI 生成 50-500 条+真实日志采样+上传 xlsx 11 列模板+追加行+严格度/轮次配置+开始测试+进度）｜**测试结果**（历史列表：人工/自动判准确率/合规翻转/标记进度；详情：三层自动打标分流板+4 核心卡+按类别表现+TOP5 需修复+详情表）｜**审核流程**（5 阶段可视化说明）
- [ ] **P19 🎯 知识补齐** `knowledge-gap`(私有，TDK 闭环二级状态机)：3 Tab｜**待审建议**（从最新测试找原因+6 类诊断 A-F+建议卡 fix/append/create+采纳入库/拒绝/忽略）｜**待发布队列**（采纳≠发布，批量/单条发布）｜**意图待审**（L1 下拉+L2/L3 输入+审核通过）

### 全局 Chrome（跨页）
- [ ] 顶栏：logo + 「运营后台 v2」+ 生产环境徽章 + 服务状态指示（30s 心跳 /api/health）+ **主题切换（znkf 有 5 主题；新作至少 Dark+Light）** + 用户菜单（角色 chip + 演示切角色 + 退出）
- [ ] 侧栏 4 分组 + nav-badge（数据规模型「N 条」灰 / 待处理型橙数字，0 时柔灰）
- [ ] 跨页：分页（省略号+首尾页）｜Toast（旧底部 + 新右下堆叠）｜Apple 级 wcAlert/wcConfirm（图标圆环+勾叉描边动画）｜列宽拖拽｜自定义 tooltip｜流式打字 3 点动画｜KPI 加载脉冲/错误态｜导入导出（SheetJS xlsx）

---

## 2. Multi-Agent Pipeline（A1→A4，核心差异点，规格 01 旗舰可视化）

```
_preprocess_input（零宽过滤/CJK标点空格规范化/拼音还原）
  ▼
A1 关键词匹配：主词+变体 OR 匹配 → 命中走 soothe + 强制转人工｜11→实际 8 类风险标签
  ▼
A2 意图/情绪（qwen-plus, temp=0）→ {intent_l1/l2/l3, confidence, emotion(calm/upset/angry), route}
  ▼
路由：A1命中→soothe｜angry+route=qa→hybrid（情绪+业务双通路）｜upset/angry+soothe→soothe｜calm→qa
  ▼
A3 RAG：Embedding(text-embedding-v3 1024维, top-5, 余弦) → 降级 TF-IDF(jieba) → 降级 bigram
     高置信直通：≥0.88(emb)/≥0.95(tfidf) 跳过 LLM 返原文｜RAG 命中线 0.45｜长查询(>50字)双路检索去重
     场景 AB 分流：命中后按 user_tags 匹配 scenario_versions 替换答案
  ▼
LLM 生成（qwen-plus, temp 0.1-0.3, 流式 SSE）
  ▼
A4 合规质检（规则引擎）：违规承诺时间/额度/利率、催收红线、PII 泄漏 + LLM 输出二次安全审（重跑 A1+Prompt 泄露检测，命中最多重生成 1 次）
```

- 三对话接口：`/api/chat`（同步测试全 KB）｜`/api/chat/prod/stream`（生产仅已生效 SSE token）｜`/api/chat/stream`（完整流 + pipeline_step 事件）
- tier 分布：high_conf_bypass / llm_controlled / soft_guide / hard_reject

---

## 3. 后端 API 域（~70 endpoint，mock 时按域造数据）

对话/会话(4) · QA(16含场景/迁移) · 卡片(9) · 寒暄(6) · 转人工(7) · 敏感词(9) · 回收站(3) · 拒识(3) · Badcase(8) · 会话日志(3) · Prompt 版本(9, 3类×发布/回滚/查) · LLM 配置(3) · 场景版本 AB(4) · 标签(4) · 系统/Embedding/设置(7) · 用户 RBAC(5) · Token 用量(3) · 统计仪表盘(5) · 健康监控(3) · 私有(pipeline_test/knowledge_gap)

---

## 4. 真实意图树（10 L1，mock 数据 + 筛选下拉用）

还款相关(4 L2) · 申请咨询(6) · 产品与信息(6) · 催收相关(5) · 营销活动(5) · 费用相关(3) · 业务办理(6) · 信息维护(2) · 批量问题(3) · 自定义(1)
> L1 条数分布：还款 3739 / 申请 3459 / 自定义 1561 / 其他 1329 / 营销 874 / 产品 852 / 信息维护 592 / 业务办理 233 / 费用 181 / 催收 133

---

## 5. 真实数据形状（mockData.ts 按此造，禁 lorem）

```ts
QA       { q, a, l1, l2, l3, scenario, status:'已生效'|'待发布'|'已下线', vectorized:bool, updated_at, _idx }
卡片     { q, a:cardId, scenario, l1,l2,l3, status, updated_at, deleted_at }
寒暄/转人工 { q, a, status, updated_at, deleted_at }   // 无分类字段
敏感词    { word, type, variants:[], status:'已启用', updated_at }
Badcase  { id, query, answer, reply_type:'QA命中'|'LLM生成', reason_tag, session_id, time, status:'pending'|'fixed'|'ignored', intent_l1/l2/l3 }
拒识      { id, query, intent_l1/l2/l3, answer, top_score, count, last_time, status:'pending'|'added_qa'|'ignored' }
会话日志  { session_id, query, answer, intent, emotion, route, rag_hit, top_score, source, total_ms, tier, time }
Token    { timestamp, agent, model, input_tokens, output_tokens, cost_estimate, session_id, is_test }
用户      { id, username, name, role:'admin'|'viewer', status:'已启用'|'已禁用', created_at, note }
场景版本  { id, name, tags:[], ab_group, answer, priority, enabled }
Prompt   { active_version, versions:{ vN:{version,content,updated_at,updated_by,note} } }
```
真实文案样例（禁占位）：寒暄「Hi~ o(*￣▽￣*)ブ我是您的在线智能客服小豆」｜转人工「小豆正在为您转接人工，请您稍后~」｜敏感词类型「投诉维权/法律维权/金融监管」｜异常 Toast「小豆的网络出了些问题…可拨打 4001601666」

---

## 6. 覆盖映射：znkf panel → 新前端页（规格 01 IA + 补 znkf 独有）

| znkf panel | 新前端路由 | 来源 | 备注 |
|---|---|---|---|
| 数据看板 | `/dashboard`（数据看板）| znkf | 真实日运营指标 + 环比 + TOP10 |
| — | `/`（**运营总览·作战指挥屏**）| **规格 01 新增** | 6 大战绩 KPI + 实时流 + 6 月趋势 + **数据飞轮动画** |
| 测试对话 | `/live`（实时对话台）| znkf+规格 01 | pipeline A1-A4 逐级点亮（产品化升级）|
| 生产对话 | `/prod-chat` | znkf | 仅已生效 KB |
| Badcase | `/badcase` | znkf | 数据飞轮闭环 |
| 拒识 | `/reject` | znkf | 知识缺口 |
| — | `/audit`（**合规审计中心**）| **规格 01 新增** | A4 产品化：100% 留痕流水 + 通过率参考线 |
| 问题场景 | `/scenario`（**znkf 独有，规格 01 漏**）| znkf | 场景聚合 + AB 版本路由 |
| QA 库 | `/kb/qa` | znkf | 双维状态机 + demote |
| 卡片库 | `/kb/card` | znkf | 分组视图 |
| 寒暄库 | `/kb/chitchat` | znkf | |
| 转人工库 | `/kb/transfer` | znkf | |
| 敏感词 | `/kb/sensitive` | znkf | 变体管理 + 8 类 |
| 回收站 | `/kb/recycle` | znkf | 软删除 |
| 智能体管理 | `/agents`+`/llm`+`/prompt` | znkf+规格 01 | 拆：pipeline 画布 / 模型分配 / Prompt 版本 |
| — | `/intent`（意图分类三级树）| 规格 01 | 10 L1 可折叠树 |
| 标签管理 | `/tags` | znkf | 只读同步 |
| Token 用量 | `/token-usage`（**znkf 独有，规格 01 漏**）| znkf | token/费用/Agent 分布 |
| Pipeline 测试 | `/pipeline-test` | znkf | AI 生成用例 + LLM 裁判打标 |
| 知识补齐 | `/knowledge-gap`（**znkf 独有，规格 01 漏**）| znkf | TDK 闭环（可并入飞轮叙事）|
| 会话日志 | `/logs` | znkf | 单轮/会话双视图 |
| 分权 | `/rbac` | znkf+规格 01 | 4 角色矩阵 |
| 登录 | `/login` | 规格 01 | 品牌动效 |

**结论：新前端 = 规格 01 的 IA + 补回 znkf 独有 3 页（问题场景 / Token 用量 / 知识补齐）+ 规格 01 的 3 个产品化增值页（运营总览作战屏 / 合规审计中心 / 意图树）。znkf 19 panel 功能 0 漏项 + 履历级增值。**

---

## 7. 反 AI-slop 红线（ship 前逐条过，见 DESIGN.md §8 + 规格 01 ⑦）

无 AI 紫/霓虹/玻璃涂满 ｜ 数字全 tabular-nums ｜ ≥8 真 ECharts（禁假 div 条）｜ 真实消金文案无 lorem ｜ UI 无 emoji 用 lucide ｜ 一页一 accent（仪表盘青/pipeline 琥珀/审计克制红）｜ 4px 网格 ｜ Dark+Light 双主题 ｜ 禁默认 Inter ｜ 禁「赋能/无缝/一站式」
