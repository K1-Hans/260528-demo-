// ════════════════════════════════════════════════════════════════════════
// AI 内容审核中台 · Mock 数据（全前端，无后端）
// 🔒 脱敏：平台「示例社区 / 云直播 / 示例短视频」，发布者「用户****」，无真人/真违规内容。
//          媒体为安全占位（sig.mediaUrl → picsum 安全风景/物体），违规靠叠加框选+标签模拟。
// ════════════════════════════════════════════════════════════════════════
import type {
  Role, User, Permission, Alert,
  ModerationItem, ModerationPolicy, CategoryStat, RegionHeat, TrendPoint, DispositionFlow,
  Appeal, SyntheticCase, AuditorRow,
} from '../types';

// ─── RBAC：4 角色 ─────────────────────────────────────────────────────────────
export const ROLES: Role[] = [
  {
    id: 'moderator', name: '李澄', enName: 'Moderator', color: '#2BA8C9',
    description: '一线审核员：审片流水台高速复核 + 疑难深审。键盘 culling，AI 辅助判定，逐条处置。',
    landing: '/queue',
    permissions: ['queue:read', 'queue:act', 'review:read'],
  },
  {
    id: 'qa_lead', name: '宋桥', enName: 'QA Lead', color: '#43A185',
    description: '审核主管 / 质检：审核员效能质检、风险态势、申诉复核与改判。全局只读 + 申诉裁决。',
    landing: '/auditor',
    permissions: ['queue:read', 'review:read', 'auditor:read', 'situation:read', 'appeal:read', 'appeal:act'],
  },
  {
    id: 'policy_ops', name: '韩沐', enName: 'Policy Ops', color: '#D6A23E',
    description: '策略运营：分类体系与处置阈值配置、合成内容检测策略、态势监控。',
    landing: '/policy',
    permissions: ['policy:read', 'policy:edit', 'synthetic:read', 'situation:read'],
  },
  {
    id: 'compliance', name: '沈律', enName: 'Compliance', color: '#CBA968',
    description: '合规官：DSA / 标识办法双边合规留痕导出、申诉合规复核、合成内容标识核验。',
    landing: '/situation',
    permissions: ['situation:read', 'appeal:read', 'synthetic:read', 'compliance:export'],
  },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: '李澄', username: 'mod', role: 'moderator', dept: '内容安全 · 一审组', lastLogin: '今天 09:12', status: 'active' },
  { id: 'u2', name: '宋桥', username: 'qa', role: 'qa_lead', dept: '内容安全 · 质检组', lastLogin: '今天 08:46', status: 'active' },
  { id: 'u3', name: '韩沐', username: 'policy', role: 'policy_ops', dept: '内容安全 · 策略组', lastLogin: '今天 09:31', status: 'active' },
  { id: 'u4', name: '沈律', username: 'legal', role: 'compliance', dept: '法务合规部', lastLogin: '昨天 19:55', status: 'active' },
];

export const PERMISSIONS: Permission[] = [
  { key: 'queue:read', label: '审片流水台', category: 'page', desc: '查看实时审核队列' },
  { key: 'queue:act', label: '处置', category: 'action', desc: '通过/下架/限流/升级' },
  { key: 'review:read', label: '疑难复核', category: 'page', desc: '深审工作台' },
  { key: 'policy:read', label: '策略中心', category: 'page', desc: '查看分类与阈值' },
  { key: 'policy:edit', label: '策略编辑', category: 'action', desc: '改规则与处置阈值' },
  { key: 'situation:read', label: '风险态势', category: 'page', desc: '态势大屏只读' },
  { key: 'appeal:read', label: '申诉复核', category: 'page', desc: '查看申诉队列' },
  { key: 'appeal:act', label: '申诉裁决', category: 'action', desc: '维持/撤销/改判' },
  { key: 'synthetic:read', label: '合成检测', category: 'page', desc: 'deepfake / AI 生成检测' },
  { key: 'auditor:read', label: '审核员效能', category: 'page', desc: '质检与一致性' },
  { key: 'compliance:export', label: '合规导出', category: 'data', desc: 'DSA / 标识办法留痕导出' },
];

export const ALERTS: Alert[] = [
  { level: 'danger', title: '直播间高危激增', msg: '云直播「深夜档」涉政敏感命中 5 分钟内 +320%，已自动限流并升级人审。', tag: '态势预警', time: '14:31' },
  { level: 'warn', title: '合成内容标识缺失', msg: '12 条疑似 AI 合成视频未带生成标识，触发《标识办法》第 4 条核验。', tag: '合规', time: '14:08' },
  { level: 'info', title: '申诉 SLA 临期', msg: '7 件用户申诉将在 2 小时内超出 48h 复核时限。', tag: '申诉', time: '13:50' },
];

// ════ 旗舰：审片流水台 · 审核条目（多模态 × 多风险阶）════
export const MODERATION_ITEMS: ModerationItem[] = [
  {
    id: 'RV-2406-7765', modality: 'video', severity: 'critical', category: '暴力血腥', confidence: 96,
    status: 'pending', source: '云直播 · 深夜档', author: '用户****8821', submittedAt: '14:29', waitSec: 38,
    media: 'v-violence', blur: true, duration: '0:42', flagFrames: [11, 23, 31],
    boxes: [{ x: 32, y: 24, w: 36, h: 44, label: '暴力动作', severity: 'critical', confidence: 96 }],
    hits: [
      { code: 'V-VIO-01', name: '真实暴力场景', category: '暴力血腥', confidence: 96 },
      { code: 'V-MIN-02', name: '疑似未成年在场', category: '未成年保护', confidence: 61 },
    ],
  },
  {
    id: 'RV-2406-7766', modality: 'image', severity: 'high', category: '色情低俗', confidence: 91,
    status: 'pending', source: '示例社区 · 图文', author: '用户****3047', submittedAt: '14:30', waitSec: 22,
    media: 'i-adult', blur: true,
    boxes: [{ x: 28, y: 18, w: 44, h: 60, label: '低俗暴露', severity: 'high', confidence: 91 }],
    hits: [{ code: 'I-POR-03', name: '软色情 / 低俗暴露', category: '色情低俗', confidence: 91 }],
  },
  {
    id: 'RV-2406-7767', modality: 'text', severity: 'high', category: '欺诈引流', confidence: 89,
    status: 'pending', source: '示例社区 · 评论', author: '用户****1192', submittedAt: '14:30', waitSec: 16,
    media: 't-fraud', blur: false,
    text: '内部消息！加我私域微信 vx888 带你抄底，稳赚不赔，今天最后一天名额，错过血亏，已经有人赚了三套房！',
    textHits: [
      { token: '加我私域微信', severity: 'high' }, { token: '稳赚不赔', severity: 'high' },
      { token: '抄底', severity: 'mid' }, { token: '最后一天名额', severity: 'mid' },
    ],
    hits: [
      { code: 'T-FRD-01', name: '诱导站外引流', category: '欺诈引流', confidence: 89 },
      { code: 'T-FRD-04', name: '虚假投资收益承诺', category: '欺诈引流', confidence: 84 },
    ],
  },
  {
    id: 'RV-2406-7768', modality: 'image', severity: 'high', category: 'AI 合成伪造', confidence: 88,
    status: 'pending', source: '示例短视频 · 封面', author: '用户****6610', submittedAt: '14:31', waitSec: 9,
    media: 'i-deepfake', blur: false, aiSynthetic: 88,
    boxes: [{ x: 30, y: 12, w: 40, h: 48, label: '人脸合成痕迹', severity: 'high', confidence: 88 }],
    hits: [
      { code: 'S-DPF-01', name: '人脸深度伪造', category: 'AI 合成伪造', confidence: 88 },
      { code: 'S-LBL-02', name: '未标注 AI 生成', category: 'AI 合成伪造', confidence: 93 },
    ],
  },
  {
    id: 'RV-2406-7769', modality: 'audio', severity: 'mid', category: '仇恨歧视', confidence: 74,
    status: 'pending', source: '云直播 · 连麦', author: '用户****4458', submittedAt: '14:31', waitSec: 5,
    media: 'a-hate', blur: false, duration: '1:18',
    audioSegments: [{ from: 0.34, to: 0.52, label: '地域歧视用语' }],
    hits: [{ code: 'A-HAT-02', name: '地域 / 群体歧视', category: '仇恨歧视', confidence: 74 }],
  },
  {
    id: 'RV-2406-7770', modality: 'video', severity: 'mid', category: '违禁品', confidence: 71,
    status: 'pending', source: '示例短视频', author: '用户****7733', submittedAt: '14:32', waitSec: 3,
    media: 'v-goods', blur: false, duration: '0:28', flagFrames: [6, 19],
    boxes: [{ x: 44, y: 38, w: 24, h: 28, label: '疑似违禁物品', severity: 'mid', confidence: 71 }],
    hits: [{ code: 'V-BAN-05', name: '违规售卖管制物品', category: '违禁品', confidence: 71 }],
  },
  {
    id: 'RV-2406-7771', modality: 'text', severity: 'low', category: '垃圾广告', confidence: 63,
    status: 'pending', source: '示例社区 · 评论', author: '用户****0925', submittedAt: '14:32', waitSec: 2,
    media: 't-spam', blur: false,
    text: '同款链接戳主页～全网最低价，签到送优惠券，每日更新好物分享。',
    textHits: [{ token: '戳主页', severity: 'low' }, { token: '全网最低价', severity: 'low' }],
    hits: [{ code: 'T-SPM-01', name: '营销导流 / 刷屏', category: '垃圾广告', confidence: 63 }],
  },
  {
    id: 'RV-2406-7772', modality: 'image', severity: 'low', category: '侵权盗版', confidence: 58,
    status: 'pending', source: '示例社区 · 图文', author: '用户****5560', submittedAt: '14:33', waitSec: 1,
    media: 'i-copyright', blur: false,
    boxes: [{ x: 6, y: 70, w: 30, h: 14, label: '疑似他站水印', severity: 'low', confidence: 58 }],
    hits: [{ code: 'I-CPR-02', name: '搬运 / 水印残留', category: '侵权盗版', confidence: 58 }],
  },
  {
    id: 'RV-2406-7760', modality: 'image', severity: 'safe', category: '色情低俗', confidence: 12,
    status: 'passed', source: '示例社区 · 图文', author: '用户****2231', submittedAt: '14:20', waitSec: 0,
    media: 'i-safe1', blur: false, reviewer: '李澄', disposed: 'pass',
    hits: [{ code: 'I-POR-03', name: '软色情 / 低俗暴露', category: '色情低俗', confidence: 12 }],
  },
  {
    id: 'RV-2406-7755', modality: 'video', severity: 'critical', category: '涉政敏感', confidence: 94,
    status: 'removed', source: '云直播 · 深夜档', author: '用户****9981', submittedAt: '14:05', waitSec: 0,
    media: 'v-politics', blur: true, duration: '2:03', reviewer: '李澄', disposed: 'remove',
    hits: [{ code: 'V-POL-01', name: '涉政敏感内容', category: '涉政敏感', confidence: 94 }],
  },
  {
    id: 'RV-2406-7752', modality: 'live', severity: 'high', category: '未成年保护', confidence: 82,
    status: 'escalated', source: '云直播 · 才艺', author: '用户****3390', submittedAt: '14:11', waitSec: 0,
    media: 'l-minor', blur: true, duration: 'LIVE', reviewer: '李澄', disposed: 'escalate',
    boxes: [{ x: 36, y: 20, w: 30, h: 50, label: '疑似未成年出镜', severity: 'high', confidence: 82 }],
    hits: [{ code: 'L-MIN-01', name: '未成年人不当出镜', category: '未成年保护', confidence: 82 }],
  },
  {
    id: 'RV-2406-7749', modality: 'text', severity: 'safe', category: '垃圾广告', confidence: 8,
    status: 'passed', source: '示例社区 · 评论', author: '用户****7012', submittedAt: '14:02', waitSec: 0,
    media: 't-safe', blur: false, reviewer: '李澄', disposed: 'pass',
    text: '这个露营地风景真不错，周末带孩子去玩了一天，停车也方便。',
    hits: [{ code: 'T-SPM-01', name: '营销导流 / 刷屏', category: '垃圾广告', confidence: 8 }],
  },
];

// 队列顶栏态势灯
export const SITUATION_LIGHTS: { key: string; label: string; state: 'on' | 'warn' | 'off' }[] = [
  { key: 'backlog', label: '积压 1,284', state: 'warn' },
  { key: 'latency', label: '时延 38s', state: 'on' },
  { key: 'critical', label: '高危 3', state: 'off' },
];

// ════ 策略 / 分类体系 ════
export const MODERATION_POLICIES: ModerationPolicy[] = [
  { id: 'p1', code: 'V-VIO-01', name: '真实暴力 / 血腥场景', category: '暴力血腥', severity: 'critical', threshold: 90, action: 'remove', auto: true, basis: ['平台社区公约', 'DSA'], enabled: true, hits30d: 4210, precision: 97.2, desc: '真实暴力、自残、血腥镜头，≥90% 自动下架并留痕。' },
  { id: 'p2', code: 'V-POL-01', name: '涉政敏感内容', category: '涉政敏感', severity: 'critical', threshold: 88, action: 'escalate', auto: false, basis: ['平台社区公约'], enabled: true, hits30d: 1862, precision: 95.1, desc: '涉政敏感一律人审复核，不自动处置，留痕可追溯。' },
  { id: 'p3', code: 'I-POR-03', name: '色情低俗 / 软色情', category: '色情低俗', severity: 'high', threshold: 85, action: 'remove', auto: true, basis: ['平台社区公约', 'DSA'], enabled: true, hits30d: 9930, precision: 94.6, desc: '裸露、软色情、低俗暗示，≥85% 自动下架。' },
  { id: 'p4', code: 'S-DPF-01', name: '人脸深度伪造', category: 'AI 合成伪造', severity: 'high', threshold: 80, action: 'limit', auto: true, basis: ['标识办法', 'DSA'], enabled: true, hits30d: 1456, precision: 90.3, desc: '深度伪造换脸，自动限流并要求补充 AI 生成标识。' },
  { id: 'p5', code: 'S-LBL-02', name: '未标注 AI 生成', category: 'AI 合成伪造', severity: 'mid', threshold: 75, action: 'age_gate', auto: false, basis: ['标识办法'], enabled: true, hits30d: 3120, precision: 88.0, desc: '《标识办法》：合成内容须显著标识，缺失则补标并提示。' },
  { id: 'p6', code: 'T-FRD-01', name: '诱导站外引流', category: '欺诈引流', severity: 'high', threshold: 82, action: 'remove', auto: true, basis: ['平台社区公约', '广告法'], enabled: true, hits30d: 15240, precision: 92.4, desc: '导私域、虚假投资、引流话术，≥82% 自动下架。' },
  { id: 'p7', code: 'L-MIN-01', name: '未成年人不当出镜', category: '未成年保护', severity: 'high', threshold: 78, action: 'escalate', auto: false, basis: ['未成年人保护法', '平台社区公约'], enabled: true, hits30d: 880, precision: 89.5, desc: '疑似未成年不当出镜，强制人审 + 年龄门限。' },
  { id: 'p8', code: 'A-HAT-02', name: '仇恨 / 地域歧视', category: '仇恨歧视', severity: 'mid', threshold: 76, action: 'limit', auto: true, basis: ['平台社区公约', 'DSA'], enabled: true, hits30d: 2640, precision: 85.8, desc: '群体攻击、地域 / 性别歧视言论，限流并警告。' },
  { id: 'p9', code: 'T-SPM-01', name: '营销导流 / 刷屏', category: '垃圾广告', severity: 'low', threshold: 70, action: 'limit', auto: true, basis: ['平台社区公约', '广告法'], enabled: true, hits30d: 33100, precision: 83.2, desc: '刷屏、硬广、最低价话术，限流处理。' },
  { id: 'p10', code: 'I-CPR-02', name: '搬运 / 侵权盗版', category: '侵权盗版', severity: 'low', threshold: 68, action: 'limit', auto: false, basis: ['平台社区公约'], enabled: false, hits30d: 5410, precision: 79.4, desc: '他站水印、二次搬运，需权利人投诉佐证后处置。' },
];

// ════ 风险态势大屏 ════
export const CATEGORY_STATS: CategoryStat[] = [
  { category: '欺诈引流', count: 15240, severity: 'high' },
  { category: '垃圾广告', count: 33100, severity: 'low' },
  { category: '色情低俗', count: 9930, severity: 'high' },
  { category: '侵权盗版', count: 5410, severity: 'low' },
  { category: '暴力血腥', count: 4210, severity: 'critical' },
  { category: 'AI 合成伪造', count: 4576, severity: 'mid' },
  { category: '仇恨歧视', count: 2640, severity: 'mid' },
  { category: '涉政敏感', count: 1862, severity: 'critical' },
  { category: '未成年保护', count: 880, severity: 'high' },
];

export const REGION_HEAT: RegionHeat[] = [
  { region: '图文社区', value: 38200 }, { region: '短视频', value: 41600 },
  { region: '直播', value: 28900 }, { region: '评论区', value: 52400 },
  { region: '私信', value: 9800 }, { region: '个人主页', value: 6100 },
];

export const TREND_14D: TrendPoint[] = Array.from({ length: 14 }, (_, i) => {
  const base = 6800 + Math.round(Math.sin(i * 0.7) * 900 + i * 60);
  return { date: `06-${String(i + 8).padStart(2, '0')}`, flagged: base, removed: Math.round(base * 0.62), appeal: Math.round(base * 0.05) };
});

export const DISPOSITION_FLOW: DispositionFlow[] = [
  { stage: 'AI 初筛命中', value: 128400 },
  { stage: '自动处置', value: 86200 },
  { stage: '人审复核', value: 42200 },
  { stage: '确认违规', value: 31600 },
  { stage: '用户申诉', value: 1840 },
  { stage: '申诉撤销', value: 312 },
];

// ════ 申诉复核闭环 ════
export const APPEALS: Appeal[] = [
  { id: 'AP-3301', itemId: 'RV-2406-7720', modality: 'video', category: 'AI 合成伪造', original: 'limit', reason: '这是我用 AI 工具做的二创视频，已经在简介标注了 AI 生成，请恢复。', submittedAt: '12:40', slaHoursLeft: 1.5, status: '待复核', aiRecommend: '撤销恢复' },
  { id: 'AP-3302', itemId: 'RV-2406-7702', modality: 'image', category: '色情低俗', original: 'remove', reason: '这是医学科普插图，不属于色情内容。', submittedAt: '11:55', slaHoursLeft: 3.2, status: '待复核', aiRecommend: '部分调整' },
  { id: 'AP-3303', itemId: 'RV-2406-7688', modality: 'text', category: '欺诈引流', original: 'remove', reason: '我只是分享了自己的购物心得，没有引流。', submittedAt: '10:30', slaHoursLeft: 6.0, status: '待复核', aiRecommend: '维持原判' },
  { id: 'AP-3298', itemId: 'RV-2406-7651', modality: 'video', category: '仇恨歧视', original: 'limit', reason: '我是在反讽和批评歧视行为，被误判了。', submittedAt: '昨天 21:10', slaHoursLeft: 0.4, status: '待复核', aiRecommend: '撤销恢复' },
  { id: 'AP-3290', itemId: 'RV-2406-7590', modality: 'image', category: '侵权盗版', original: 'limit', reason: '图片是我原创拍摄，水印是我自己的。', submittedAt: '昨天 18:22', slaHoursLeft: -2.0, status: '撤销恢复', reviewer: '宋桥', decision: '核验原图 EXIF 确为原创，撤销限流。', aiRecommend: '撤销恢复' },
  { id: 'AP-3285', itemId: 'RV-2406-7540', modality: 'text', category: '垃圾广告', original: 'limit', reason: '正常分享，不是广告。', submittedAt: '昨天 16:08', slaHoursLeft: -5.0, status: '维持原判', reviewer: '宋桥', decision: '含多个导流链接，维持限流。', aiRecommend: '维持原判' },
];

// ════ 合成内容 / deepfake 检测 ════
export const SYNTHETIC_CASES: SyntheticCase[] = [
  {
    id: 'SY-0461', modality: 'video', media: 's-face', blur: false, syntheticProb: 92, verdict: 'synthetic',
    hasLabel: false, author: '用户****6610', submittedAt: '14:31', frameScores: [70, 82, 88, 92, 90, 86, 94, 91],
    signals: [
      { name: '人脸边缘频域', score: 94, desc: '眼周 / 发际线频谱异常，典型换脸痕迹' },
      { name: '光照一致性', score: 88, desc: '面部与环境光方向不一致' },
      { name: '元数据', score: 96, desc: '缺失拍摄设备信息，含生成器指纹' },
      { name: '眨眼 / 微表情', score: 79, desc: '眨眼频率偏离自然分布' },
    ],
  },
  {
    id: 'SY-0462', modality: 'image', media: 's-img', blur: false, syntheticProb: 86, verdict: 'synthetic',
    hasLabel: true, author: '用户****1204', submittedAt: '14:12',
    signals: [
      { name: '扩散模型指纹', score: 90, desc: '检出主流文生图模型噪声指纹' },
      { name: '手部 / 细节', score: 81, desc: '手指结构异常，背景纹理重复' },
      { name: '元数据', score: 88, desc: '含 C2PA 生成凭证（已标识）' },
    ],
  },
  {
    id: 'SY-0463', modality: 'audio', media: 's-voice', blur: false, syntheticProb: 71, verdict: 'suspect',
    hasLabel: false, author: '用户****8830', submittedAt: '13:58',
    signals: [
      { name: '声纹合成', score: 74, desc: '基频抖动平滑，疑似 TTS 克隆' },
      { name: '呼吸 / 停顿', score: 66, desc: '换气节奏机械' },
      { name: '频谱伪影', score: 72, desc: '高频段能量分布异常' },
    ],
  },
  {
    id: 'SY-0464', modality: 'image', media: 's-real', blur: false, syntheticProb: 14, verdict: 'genuine',
    hasLabel: false, author: '用户****4471', submittedAt: '13:40',
    signals: [
      { name: '扩散模型指纹', score: 9, desc: '未检出生成器指纹' },
      { name: '元数据', score: 12, desc: '含真实设备 EXIF，拍摄链完整' },
    ],
  },
  {
    id: 'SY-0465', modality: 'video', media: 's-face2', blur: false, syntheticProb: 79, verdict: 'suspect',
    hasLabel: false, author: '用户****2257', submittedAt: '13:20', frameScores: [60, 68, 74, 79, 81, 77, 72, 70],
    signals: [
      { name: '人脸边缘频域', score: 80, desc: '局部帧出现换脸痕迹' },
      { name: '时序一致性', score: 76, desc: '帧间面部抖动不连贯' },
    ],
  },
];

// ════ 审核员效能 / 质检 ════
export const AUDITOR_ROWS: AuditorRow[] = [
  { id: 'a1', name: '李澄', team: '一审组', throughput: 1284, accuracy: 97.2, consistency: 95.8, avgHandleSec: 14, qcSampled: 120, qcPassed: 117, appealReverseRate: 2.1 },
  { id: 'a2', name: '周翎', team: '一审组', throughput: 1102, accuracy: 96.1, consistency: 94.2, avgHandleSec: 16, qcSampled: 110, qcPassed: 106, appealReverseRate: 3.4 },
  { id: 'a3', name: '陈屿', team: '二审组', throughput: 880, accuracy: 98.0, consistency: 96.9, avgHandleSec: 22, qcSampled: 90, qcPassed: 89, appealReverseRate: 1.6 },
  { id: 'a4', name: '吴桐', team: '直播专审', throughput: 1460, accuracy: 94.8, consistency: 92.5, avgHandleSec: 11, qcSampled: 140, qcPassed: 131, appealReverseRate: 4.7 },
  { id: 'a5', name: '林岚', team: '二审组', throughput: 760, accuracy: 98.4, consistency: 97.5, avgHandleSec: 25, qcSampled: 80, qcPassed: 80, appealReverseRate: 1.2 },
  { id: 'a6', name: '高沨', team: '直播专审', throughput: 1320, accuracy: 95.3, consistency: 93.1, avgHandleSec: 12, qcSampled: 130, qcPassed: 123, appealReverseRate: 3.9 },
];
