import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { firstAllowedPath } from './lib/nav';
import Layout from './components/Layout';
import Login from './pages/Login';
// 问数
import Ask from './pages/Ask';
import HistoryPage from './pages/History';
// 建模与血缘
import Semantic from './pages/Semantic';
import Lineage from './pages/Lineage';
// 治理与指标
import Governance from './pages/Governance';
import Metrics from './pages/Metrics';

// 角色落地：进站重定向到当前角色默认落地页（'/' 不做权限页，规避无问数权限角色卡死）。
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
          <Route path="/ask" element={<Ask />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/semantic" element={<Semantic />} />
          <Route path="/lineage" element={<Lineage />} />
          <Route path="/governance" element={<Governance />} />
          <Route path="/metrics" element={<Metrics />} />
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
