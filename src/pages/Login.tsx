import { useState } from 'react';
import { Lock, User, ChevronDown, Sun, Moon, Palette } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { MOCK_USERS, ROLES } from '../lib/mockData';
import './Login.css';

export default function Login() {
  const { login, isLoading } = useAuth();
  const { mode, toggle } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showQuick, setShowQuick] = useState(true);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = await login(email, password || 'sso');
    if (!ok) setError('用户名或密码错误，或账号已停用');
  };

  return (
    <div className="login-page">
      <div className="login-glow login-glow-1" />
      <div className="login-glow login-glow-2" />

      <button className="icon-btn login-theme" onClick={toggle} title={`主题：${mode === 'dark' ? '深色' : mode === 'light' ? '浅色' : 'Anthropic'} · 点击切换`}>
        {mode === 'dark' ? <Moon size={17} /> : mode === 'light' ? <Sun size={17} /> : <Palette size={17} />}
      </button>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">Li</div>
          <h1 className="login-title">销售策略 AI 工作台</h1>
          <p className="login-desc">理想汽车 · 内部专属系统 · PRO</p>
        </div>

        <div className="sso-badge">
          <Lock size={11} />
          <span>通过公司 iDaaS 统一身份认证登录</span>
        </div>

        <form onSubmit={submit} className="login-form">
          <div className="form-group">
            <label>工号 / 邮箱</label>
            <div className="input-wrap">
              <User size={14} className="input-icon" />
              <input className="input" placeholder="输入工号或 @lixiang.com 邮箱" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label>密码</label>
            <div className="input-wrap">
              <Lock size={14} className="input-icon" />
              <input className="input" type="password" placeholder="SSO 统一密码" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="btn btn-primary login-btn" type="submit" disabled={isLoading}>
            {isLoading ? '认证中…' : '登录系统'}
          </button>
        </form>

        <div className="quick">
          <button className="quick-toggle" onClick={() => setShowQuick(s => !s)}>
            <span>演示账号快速登录</span>
            <ChevronDown size={12} style={{ transform: showQuick ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
          </button>
          {showQuick && (
            <div className="quick-list">
              {MOCK_USERS.filter(u => u.status === 'active').slice(0, 4).map(u => {
                const role = ROLES.find(r => r.id === u.role);
                return (
                  <button key={u.id} className="quick-user" onClick={() => login(u.email, 'sso')}>
                    <div className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{u.name[0]}</div>
                    <div className="flex-1">
                      <div className="quick-name">{u.name}</div>
                      <div className="quick-role" style={{ color: role?.color }}>{role?.name}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
