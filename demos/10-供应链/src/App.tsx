import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { firstAllowedPath } from './lib/nav';
import Layout from './components/Layout';
import Login from './pages/Login';
// 控制塔
import Tower from './pages/Tower';
// 需求计划
import Forecast from './pages/Forecast';
import WhatIf from './pages/WhatIf';
// 库存履约
import Inventory from './pages/Inventory';
import Replenish from './pages/Replenish';
import Supplier from './pages/Supplier';

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
          <Route path="/tower" element={<Tower />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/whatif" element={<WhatIf />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/replenish" element={<Replenish />} />
          <Route path="/supplier" element={<Supplier />} />
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
