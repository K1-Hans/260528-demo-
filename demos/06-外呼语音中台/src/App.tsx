import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { firstAllowedPath } from './lib/nav';
import Layout from './components/Layout';
import Login from './pages/Login';
// 外呼作战
import MonitorWall from './pages/MonitorWall';
import Campaigns from './pages/Campaigns';
import HandoffQueue from './pages/HandoffQueue';
// 智能引擎
import ScriptFlow from './pages/ScriptFlow';
import VoiceConfig from './pages/VoiceConfig';
import CallRecords from './pages/CallRecords';
// 增长与合规
import Funnel from './pages/Funnel';
import AbTest from './pages/AbTest';
import Compliance from './pages/Compliance';
// 系统
import Numbers from './pages/Numbers';
import Settings from './pages/Settings';

// 角色落地：进站重定向到当前角色默认落地页（'/' 不做权限页，规避无监控权限角色卡死）。
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
          <Route path="/monitor" element={<MonitorWall />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/handoff" element={<HandoffQueue />} />
          <Route path="/script" element={<ScriptFlow />} />
          <Route path="/voice" element={<VoiceConfig />} />
          <Route path="/records" element={<CallRecords />} />
          <Route path="/funnel" element={<Funnel />} />
          <Route path="/abtest" element={<AbTest />} />
          <Route path="/compliance" element={<Compliance />} />
          <Route path="/numbers" element={<Numbers />} />
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
