import { useState } from 'react';
import { Lock, User, ChevronDown, Sun, Moon, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { MOCK_USERS, ROLES } from '../lib/mockData';
import './Login.css';

/** 风控盾形标志（描边 draw-in + 雷达扫描）。 */
function ShieldMark() {
  return (
    <svg className="login-shield" width="62" height="62" viewBox="0 0 64 64" fill="none">
      <path className="shield-stroke" d="M32 5 L55 14 V31 C55 46 45 55 32 60 C19 55 9 46 9 31 V14 Z"
        stroke="var(--gold)" strokeWidth="2" strokeLinejoin="round" />
      <path className="shield-check" d="M23 32 L29 39 L42 24" stroke="var(--gold-bright)" strokeWidth="2.6"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle className="shield-scan" cx="32" cy="32" r="15" stroke="var(--gold)" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

export default function Login() {
  const { login, isLoading } = useAuth();
  const { mode, toggle } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showQuick, setShowQuick] = useState(true);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = await login(username, password || 'sso');
    if (!ok) setError('工号或密码错误，或账号已停用');
  };

  return (
    <div className="login-page">
      {/* 风险流粒子背景（克制 · 不喧哗） */}
      <div className="login-particles" aria-hidden>
        {Array.from({ length: 26 }).map((_, i) => <span key={i} style={{ ['--i' as string]: i }} />)}
      </div>
      <div className="login-glow login-glow-1" />
      <div className="login-glow login-glow-2" />

      <button className="icon-btn login-theme" onClick={toggle} title={`主题：${mode === 'dark' ? '深色作战' : '浅色报表'} · 点击切换`}>
        {mode === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
      </button>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo"><ShieldMark /></div>
          <h1 className="login-title">风控作战室</h1>
          <p className="login-desc">实时反欺诈 · AML 反洗钱 · 可解释合规 · 毫秒级决策</p>
        </div>

        <div className="sso-badge">
          <ShieldCheck size={11} />
          <span>风控统一身份认证 · 按角色权限严格分权进站</span>
        </div>

        <form onSubmit={submit} className="login-form">
          <div className="form-group">
            <label>工号 / 用户名</label>
            <div className="input-wrap">
              <User size={14} className="input-icon" />
              <input className="input" placeholder="输入工号或用户名" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
          </div>
          <div className="form-group">
            <label>密码</label>
            <div className="input-wrap">
              <Lock size={14} className="input-icon" />
              <input className="input" type="password" placeholder="统一身份认证密码" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="btn btn-primary login-btn" type="submit" disabled={isLoading}>
            {isLoading ? '身份认证中…' : '进入作战室'}
          </button>
        </form>

        <div className="quick">
          <button className="quick-toggle" onClick={() => setShowQuick(s => !s)}>
            <span>演示角色快速登录（体验 4 角色 × 权限分权）</span>
            <ChevronDown size={12} style={{ transform: showQuick ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
          </button>
          {showQuick && (
            <div className="quick-list">
              {MOCK_USERS.filter(u => u.status === 'active').slice(0, 4).map(u => {
                const role = ROLES.find(r => r.id === u.role);
                return (
                  <button key={u.id} className="quick-user" onClick={() => login(u.username, 'sso')}>
                    <div className="avatar" style={{ width: 30, height: 30, fontSize: 12, background: `linear-gradient(135deg, ${role?.color}, var(--gold-bright))` }}>{u.name[0]}</div>
                    <div className="flex-1" style={{ textAlign: 'left' }}>
                      <div className="quick-name">{u.name} · <span style={{ color: role?.color }}>{role?.name}</span></div>
                      <div className="quick-role">{role?.description}</div>
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
