import { useState } from 'react';
import {
  Settings as SettingsIcon, Plug, Cpu, Shield, Palette,
  Copy, CheckCircle2, Circle, Sun, Moon, Check,
} from 'lucide-react';
import { PageHeader, Card, SectionTitle, Badge, Segmented } from '../components/ui';
import { StatusBadge, Toolbar, toast } from '../components/kit';
import { DataTable, type Col } from '../components/DataTable';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  INTEGRATIONS, MODELS, ROLES, PERMISSIONS, appName,
} from '../lib/mockData';
import type { Integration, ModelMeta, Role, Permission } from '../types';

// ─── Tab 定义 ─────────────────────────────────────────────────────────────────
type Tab = 'integrations' | 'models' | 'rbac' | 'appearance';
const TABS: { value: Tab; label: string }[] = [
  { value: 'integrations', label: '应用接入' },
  { value: 'models', label: '模型注册' },
  { value: 'rbac', label: '权限矩阵' },
  { value: 'appearance', label: '外观' },
];

// ─── OpenTelemetry GenAI 接入片段 ────────────────────────────────────────────
const OTEL_SNIPPET = `# pip install otel-genai-sdk
from otel_genai import instrument, GenAIConfig

config = GenAIConfig(
    endpoint="https://otel-collector.example-fintech.internal:4318",
    service_name="svc-assistant",
    service_version="1.0.0",
)
instrument(config)

# 之后所有 OpenAI / Anthropic 调用自动埋点
# 自动上报字段：
#   gen_ai.request.model        → 请求模型 ID
#   gen_ai.usage.input_tokens   → 输入 token 数
#   gen_ai.usage.output_tokens  → 输出 token 数
#   gen_ai.response.finish_reason
#   gen_ai.request.temperature
#   llm.latency.ms              → 端到端延迟
`;

// ─── 子区块 ──────────────────────────────────────────────────────────────────

function IntegrationsPanel() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(OTEL_SNIPPET).then(() => {
      setCopied(true);
      toast('代码片段已复制', 'success');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const integCols: Col<Integration>[] = [
    {
      key: 'app',
      header: '应用名称',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>
          {appName(row.app)}
        </span>
      ),
    },
    {
      key: 'sdk',
      header: 'SDK 版本',
      render: (row) => (
        <span className="tag tag-mono" style={{ fontSize: 11 }}>{row.sdk}</span>
      ),
    },
    {
      key: 'status',
      header: '状态',
      render: (row) => (
        <StatusBadge
          status={row.status === 'connected' ? '已接入' : '接入中'}
          tone={row.status === 'connected' ? 'good' : 'warn'}
        />
      ),
    },
    {
      key: 'lastSeen',
      header: '最后上报',
      nowrap: true,
      render: (row) => (
        <span className="t-small text-2">{row.lastSeen}</span>
      ),
    },
    {
      key: 'spansToday',
      header: '今日 Spans',
      num: true,
      sortable: true,
      sortAccessor: (row) => row.spansToday,
      render: (row) => (
        <span className="mononum" style={{ color: row.spansToday > 0 ? 'var(--text-1)' : 'var(--text-3)' }}>
          {row.spansToday > 0 ? row.spansToday.toLocaleString() : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="col gap-3">
      {/* 埋点接入指引 */}
      <Card className="reveal reveal-1">
        <SectionTitle right={
          <button
            className="btn btn-subtle btn-sm"
            onClick={handleCopy}
            style={{ gap: 5 }}
          >
            {copied
              ? <><Check size={12} style={{ color: 'var(--success)' }} />已复制</>
              : <><Copy size={12} />复制代码</>
            }
          </button>
        }>
          <span className="row gap-2">
            <Plug size={13} />
            OpenTelemetry GenAI SDK 接入指引
          </span>
        </SectionTitle>
        <div
          style={{
            background: 'var(--surface-3)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--r-sm)',
            padding: '14px 16px',
            overflowX: 'auto',
          }}
        >
          <pre
            style={{
              margin: 0,
              fontFamily: 'Geist Mono, "Fira Code", monospace',
              fontSize: 12,
              lineHeight: 1.7,
              color: 'var(--text-2)',
              whiteSpace: 'pre',
            }}
          >
            {OTEL_SNIPPET}
          </pre>
        </div>
        <div className="t-small text-3" style={{ marginTop: 10 }}>
          安装后 SDK 自动采集 gen_ai.* OTel GenAI 语义约定字段，无需手动埋点每次调用。
        </div>
      </Card>

      {/* 应用列表 */}
      <Card className="reveal reveal-2">
        <SectionTitle>
          <span className="row gap-2"><Plug size={13} />已注册应用</span>
        </SectionTitle>
        <DataTable
          cols={integCols}
          rows={INTEGRATIONS}
          rowKey={(row) => row.app}
          defaultSort={{ key: 'spansToday', dir: 'desc' }}
          dense
        />
      </Card>
    </div>
  );
}

function ModelsPanel() {
  const modelCols: Col<ModelMeta>[] = [
    {
      key: 'name',
      header: '模型名称',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--text-1)', fontFamily: 'Geist Mono, monospace', fontSize: 13 }}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'vendor',
      header: '提供方',
      render: (row) => (
        <span className="t-small text-2">{row.vendor}</span>
      ),
    },
    {
      key: 'inPer1k',
      header: '输入 $/1k tokens',
      num: true,
      sortable: true,
      sortAccessor: (row) => row.inPer1k,
      render: (row) => (
        <span className="mononum" style={{ color: 'var(--cost)', fontSize: 13 }}>
          ${row.inPer1k.toFixed(5)}
        </span>
      ),
    },
    {
      key: 'outPer1k',
      header: '输出 $/1k tokens',
      num: true,
      sortable: true,
      sortAccessor: (row) => row.outPer1k,
      render: (row) => (
        <span className="mononum" style={{ color: 'var(--cost)', fontSize: 13 }}>
          ${row.outPer1k.toFixed(5)}
        </span>
      ),
    },
  ];

  return (
    <Card className="reveal reveal-1">
      <SectionTitle>
        <span className="row gap-2"><Cpu size={13} />已注册模型</span>
      </SectionTitle>
      <DataTable
        cols={modelCols}
        rows={MODELS}
        rowKey={(row) => row.id}
        defaultSort={{ key: 'inPer1k', dir: 'asc' }}
        dense
      />
    </Card>
  );
}

function RbacPanel() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('rbac:manage');

  // 按 category 分组展示权限
  const permsByCategory: Record<string, Permission[]> = {};
  PERMISSIONS.forEach(p => {
    if (!permsByCategory[p.category]) permsByCategory[p.category] = [];
    permsByCategory[p.category].push(p);
  });

  const CATEGORY_LABELS: Record<string, string> = {
    page: '页面访问',
    action: '操作权限',
    data: '数据权限',
  };

  const ROLE_COLOR_STYLE = (color: string) => ({
    background: `color-mix(in srgb, ${color} 14%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
    color,
  });

  return (
    <div className="col gap-3">
      {/* 角色卡片一览 */}
      <div
        className="grid reveal reveal-1"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}
      >
        {ROLES.map((role) => (
          <Card key={role.id} style={{ padding: '14px 16px' }}>
            <div className="row gap-2" style={{ marginBottom: 8, alignItems: 'center' }}>
              <span
                className="badge"
                style={ROLE_COLOR_STYLE(role.color)}
              >
                {role.enName}
              </span>
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: 'var(--text-1)',
                marginBottom: 6,
              }}
            >
              {role.name}
            </div>
            <div className="t-small text-3" style={{ lineHeight: 1.6 }}>
              {role.description}
            </div>
            <div
              className="t-small"
              style={{ marginTop: 10, color: 'var(--text-3)' }}
            >
              <span className="mononum" style={{ color: role.color, fontWeight: 700 }}>
                {role.permissions.length}
              </span>
              {' '}项权限
            </div>
          </Card>
        ))}
      </div>

      {/* 权限矩阵表 */}
      <Card className="reveal reveal-2">
        <div className="row spread" style={{ marginBottom: 14 }}>
          <SectionTitle>
            <span className="row gap-2"><Shield size={13} />角色权限矩阵</span>
          </SectionTitle>
          {!canManage && (
            <span className="t-small text-3" style={{ marginBottom: 14 }}>只读 · 权限管理需 Owner 角色</span>
          )}
          {canManage && (
            <button className="btn btn-sm btn-subtle" style={{ marginBottom: 14 }}>
              <Shield size={12} />
              编辑权限
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ minWidth: 140 }}>权限</th>
                <th style={{ width: 80, textAlign: 'center', color: 'var(--text-3)', fontSize: 11 }}>类别</th>
                {ROLES.map((role) => (
                  <th
                    key={role.id}
                    style={{ textAlign: 'center', minWidth: 88 }}
                  >
                    <span
                      style={{
                        fontFamily: 'Geist Mono, monospace',
                        fontSize: 11,
                        color: role.color,
                        fontWeight: 700,
                        letterSpacing: '0.03em',
                      }}
                    >
                      {role.enName}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(['page', 'action', 'data'] as const).map((cat) => {
                const perms = permsByCategory[cat];
                if (!perms?.length) return null;
                return perms.map((perm, pi) => (
                  <tr key={perm.key}>
                    <td style={{ fontWeight: 500, color: 'var(--text-1)', fontSize: 13 }}>
                      {perm.label}
                      <div className="t-small text-3" style={{ marginTop: 2, fontWeight: 400 }}>
                        {perm.desc}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {pi === 0 && (
                        <span
                          className="badge"
                          style={{
                            fontSize: 10,
                            background: 'var(--surface-3)',
                            color: 'var(--text-3)',
                            border: '1px solid var(--hairline)',
                          }}
                        >
                          {CATEGORY_LABELS[cat]}
                        </span>
                      )}
                    </td>
                    {ROLES.map((role) => {
                      const has = role.permissions.includes(perm.key);
                      return (
                        <td key={role.id} style={{ textAlign: 'center' }}>
                          {has ? (
                            <CheckCircle2
                              size={15}
                              style={{ color: 'var(--success)', opacity: 0.9 }}
                            />
                          ) : (
                            <Circle
                              size={14}
                              style={{ color: 'var(--text-3)', opacity: 0.3 }}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>

        <div
          className="t-small text-3"
          style={{
            marginTop: 14,
            padding: '10px 12px',
            background: 'var(--surface-2)',
            borderRadius: 'var(--r-sm)',
            border: '1px solid var(--hairline)',
            lineHeight: 1.7,
          }}
        >
          <Shield size={11} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
          权限即职责边界：Annotator 仅持标注权限，对 Prompt / 成本 / 告警不可见；FinOps 仅持成本相关权限；Owner 全权（含 Prompt 审批回滚 + 预算管理双签）。
        </div>
      </Card>
    </div>
  );
}

function AppearancePanel() {
  const { mode, toggle, setMode } = useTheme();

  return (
    <Card className="reveal reveal-1" style={{ maxWidth: 480 }}>
      <SectionTitle>
        <span className="row gap-2"><Palette size={13} />主题外观</span>
      </SectionTitle>

      <div className="col gap-4">
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-2)',
              letterSpacing: '0.02em',
              marginBottom: 10,
            }}
          >
            配色模式
          </div>
          <div className="row gap-3">
            {/* 深色主题 */}
            <button
              onClick={() => setMode('dark')}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: 'var(--r)',
                border: `2px solid ${mode === 'dark' ? 'var(--gold)' : 'var(--hairline)'}`,
                background: mode === 'dark' ? 'color-mix(in srgb, var(--gold) 8%, var(--surface-2))' : 'var(--surface-2)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.18s var(--ease)',
              }}
            >
              <Moon
                size={22}
                style={{
                  color: mode === 'dark' ? 'var(--gold)' : 'var(--text-3)',
                  marginBottom: 8,
                }}
              />
              <div
                style={{
                  fontSize: 13,
                  fontWeight: mode === 'dark' ? 700 : 400,
                  color: mode === 'dark' ? 'var(--text-1)' : 'var(--text-3)',
                }}
              >
                深色
              </div>
              <div className="t-small text-3" style={{ marginTop: 3 }}>
                Telemetry Graphite
              </div>
            </button>

            {/* 浅色主题 */}
            <button
              onClick={() => setMode('light')}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: 'var(--r)',
                border: `2px solid ${mode === 'light' ? 'var(--gold)' : 'var(--hairline)'}`,
                background: mode === 'light' ? 'color-mix(in srgb, var(--gold) 8%, var(--surface-2))' : 'var(--surface-2)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.18s var(--ease)',
              }}
            >
              <Sun
                size={22}
                style={{
                  color: mode === 'light' ? 'var(--gold)' : 'var(--text-3)',
                  marginBottom: 8,
                }}
              />
              <div
                style={{
                  fontSize: 13,
                  fontWeight: mode === 'light' ? 700 : 400,
                  color: mode === 'light' ? 'var(--text-1)' : 'var(--text-3)',
                }}
              >
                浅色
              </div>
              <div className="t-small text-3" style={{ marginTop: 3 }}>
                Studio Porcelain
              </div>
            </button>
          </div>
        </div>

        {/* 当前状态 + 快切按钮 */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--r-sm)',
            background: 'var(--surface-2)',
            border: '1px solid var(--hairline)',
          }}
        >
          <div className="row spread">
            <div className="row gap-2">
              {mode === 'dark'
                ? <Moon size={13} style={{ color: 'var(--gold)' }} />
                : <Sun size={13} style={{ color: 'var(--gold)' }} />
              }
              <span className="t-small text-2">
                当前：
                <span style={{ fontWeight: 700, color: 'var(--text-1)', marginLeft: 4 }}>
                  {mode === 'dark' ? '深色模式' : '浅色模式'}
                </span>
              </span>
            </div>
            <button className="btn btn-subtle btn-sm" onClick={toggle}>
              切换
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────
export default function Settings() {
  const [tab, setTab] = useState<Tab>('integrations');

  const TAB_ICONS: Record<Tab, React.ReactNode> = {
    integrations: <Plug size={13} />,
    models: <Cpu size={13} />,
    rbac: <Shield size={13} />,
    appearance: <Palette size={13} />,
  };

  return (
    <div className="page">
      <PageHeader
        title="平台设置"
        subtitle="应用接入 · 模型注册 · RBAC 权限矩阵 · 外观配置"
        actions={
          <div className="row gap-2">
            <span className="live-pill">
              <SettingsIcon size={11} />
              配置中心
            </span>
          </div>
        }
      />

      {/* Tab 切换栏 */}
      <Toolbar style={{ marginBottom: 18 }}>
        <Segmented<Tab>
          options={TABS.map((t) => ({
            value: t.value,
            label: t.label,
          }))}
          value={tab}
          onChange={setTab}
        />
      </Toolbar>

      {/* 内容区 */}
      {tab === 'integrations' && <IntegrationsPanel />}
      {tab === 'models' && <ModelsPanel />}
      {tab === 'rbac' && <RbacPanel />}
      {tab === 'appearance' && <AppearancePanel />}
    </div>
  );
}
