import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { firstAllowedPath } from './lib/nav';
import Layout from './components/Layout';
import Login from './pages/Login';
// 增长操盘
import Campaign from './pages/Campaign';
import Cdp from './pages/Cdp';
// 创意中心
import Studio from './pages/Studio';
import Assets from './pages/Assets';
// 投放与归因
import Ads from './pages/Ads';
import Attribution from './pages/Attribution';

// 角色落地：进站重定向到当前角色默认落地页（'/' 不做权限页，规避无权限角色卡死）。
function Home() {
  const { currentRole, hasPermission } = useAuth();
  return <Navigate to={currentRole?.landing ?? firstAllowedPath(hasPermission)} replace />;
}

function Shell() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Login />;
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/campaign" element={<Campaign />} />
          <Route path="/cdp" element={<Cdp />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/ads" element={<Ads />} />
          <Route path="/attribution" element={<Attribution />} />
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
