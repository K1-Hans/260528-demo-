import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
// 总览
import Dashboard from './pages/Dashboard';
// 质检工作台
import Queue from './pages/Queue';
import Workbench from './pages/Workbench';
import List from './pages/List';
// 规则与模型
import Scorecard from './pages/Scorecard';
import Pipeline from './pages/Pipeline';
// 监控与辅导
import Alerts from './pages/Alerts';
import Performance from './pages/Performance';
// 流程
import Appeal from './pages/Appeal';
// 洞察
import Coverage from './pages/Coverage';
import Reports from './pages/Reports';
// 系统
import Retention from './pages/Retention';
import RBAC from './pages/RBAC';

function Shell() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Login />;
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workbench" element={<Workbench />} />
          <Route path="/queue" element={<Queue />} />
          <Route path="/list" element={<List />} />
          <Route path="/scorecard" element={<Scorecard />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/appeal" element={<Appeal />} />
          <Route path="/coverage" element={<Coverage />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/retention" element={<Retention />} />
          <Route path="/rbac" element={<RBAC />} />
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
