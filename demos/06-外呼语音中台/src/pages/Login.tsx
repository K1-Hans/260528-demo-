import { useState } from 'react';
import { Lock, User, ChevronDown, Sun, Moon, Headset, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { MOCK_USERS, ROLES } from '../lib/mockData';
import Waveform from '../components/Waveform';
import './Login.css';

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
      <div className="login-glow login-glow-1" />
      <div className="login-glow login-glow-2" />

      <button className="icon-btn login-theme" onClick={toggle} title={`主题：${mode === 'dark' ? '深色话务' : '浅色质检'} · 点击切换`}>
        {mode === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
      </button>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo"><Headset size={28} /></div>
          {/* 声波 hero（接通中翡翠流动） */}
          <div className="login-wave"><Waveform active bars={36} height={34} /></div>
          <h1 className="login-title">话务作战室</h1>
          <p className="login-desc">Compliance-first Voice Agent · 实时外呼 + 合规质检 · 克制不打扰</p>
        </div>

        <div className="sso-badge">
          <ShieldCheck size={11} />
          <span>外呼统一身份认证 · 严守工信部合规底线 · 按角色分权进站</span>
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
            {isLoading ? '身份认证中…' : '进入话务台'}
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
