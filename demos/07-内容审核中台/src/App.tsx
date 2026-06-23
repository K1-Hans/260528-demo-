import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { firstAllowedPath } from './lib/nav';
import Layout from './components/Layout';
import Login from './pages/Login';
// 审核作战
import Queue from './pages/Queue';
import Review from './pages/Review';
// 策略中枢
import Policy from './pages/Policy';
import Synthetic from './pages/Synthetic';
// 治理与态势
import Situation from './pages/Situation';
import Appeal from './pages/Appeal';
import Auditor from './pages/Auditor';

// 角色落地：进站重定向到当前角色默认落地页（'/' 不做权限页，规避无审核权限角色卡死）。
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
          <Route path="/queue" element={<Queue />} />
          <Route path="/review" element={<Review />} />
          <Route path="/policy" element={<Policy />} />
          <Route path="/synthetic" element={<Synthetic />} />
          <Route path="/situation" element={<Situation />} />
          <Route path="/appeal" element={<Appeal />} />
          <Route path="/auditor" element={<Auditor />} />
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
