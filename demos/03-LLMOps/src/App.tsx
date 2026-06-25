import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { firstAllowedPath } from './lib/nav';
import Layout from './components/Layout';
import Login from './pages/Login';
// 总览（旗舰）
import Overview from './pages/Overview';
// Observe · 可观测
import Tracing from './pages/Tracing';
import Monitoring from './pages/Monitoring';
// Evaluate · 评测
import Datasets from './pages/Datasets';
import ScoreBoard from './pages/ScoreBoard';
import Annotation from './pages/Annotation';
// Manage · Prompt
import Prompts from './pages/Prompts';
import Experiments from './pages/Experiments';
// Control · 成本告警
import Cost from './pages/Cost';
import Alerts from './pages/Alerts';
// 设置
import Settings from './pages/Settings';

// 角色登录后落地：无总览权限（Annotator）→ 跳到该角色第一个可访问页
function Home() {
  const { hasPermission } = useAuth();
  if (hasPermission('overview:read')) return <Overview />;
  return <Navigate to={firstAllowedPath(hasPermission)} replace />;
}

function Shell() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Login />;
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/tracing" element={<Tracing />} />
          <Route path="/monitor" element={<Monitoring />} />
          <Route path="/datasets" element={<Datasets />} />
          <Route path="/scoreboard" element={<ScoreBoard />} />
          <Route path="/annotation" element={<Annotation />} />
          <Route path="/prompts" element={<Prompts />} />
          <Route path="/experiments" element={<Experiments />} />
          <Route path="/cost" element={<Cost />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ThemeProvider>
  );
}
