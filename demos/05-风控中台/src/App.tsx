import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { firstAllowedPath } from './lib/nav';
import Layout from './components/Layout';
import Login from './pages/Login';
// 总览
import Monitoring from './pages/Monitoring';
import Cockpit from './pages/Cockpit';
// 欺诈与调查
import CaseWorkbench from './pages/CaseWorkbench';
import FraudNetwork from './pages/FraudNetwork';
import AlertCenter from './pages/AlertCenter';
// AML 合规
import AmlQueue from './pages/AmlQueue';
import SarReport from './pages/SarReport';
import Screening from './pages/Screening';
// 策略与模型
import Strategy from './pages/Strategy';
import Scorecard from './pages/Scorecard';
import Explainability from './pages/Explainability';
// 系统
import DataSources from './pages/DataSources';
import Rbac from './pages/Rbac';
import AuditLog from './pages/AuditLog';

// 角色落地：进站重定向到当前角色默认落地页（'/' 不做权限页，规避无总览权限角色卡死）。
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
          <Route path="/monitor" element={<Monitoring />} />
          <Route path="/cockpit" element={<Cockpit />} />
          <Route path="/cases" element={<CaseWorkbench />} />
          <Route path="/network" element={<FraudNetwork />} />
          <Route path="/alerts" element={<AlertCenter />} />
          <Route path="/aml" element={<AmlQueue />} />
          <Route path="/sar" element={<SarReport />} />
          <Route path="/screening" element={<Screening />} />
          <Route path="/strategy" element={<Strategy />} />
          <Route path="/scorecard" element={<Scorecard />} />
          <Route path="/explain" element={<Explainability />} />
          <Route path="/datasources" element={<DataSources />} />
          <Route path="/rbac" element={<Rbac />} />
          <Route path="/audit" element={<AuditLog />} />
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
