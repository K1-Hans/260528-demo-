import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { firstAllowedPath } from './lib/nav';
import Layout from './components/Layout';
import Login from './pages/Login';
// 发现 Discover
import SearchAnswer from './pages/SearchAnswer';
import Chat from './pages/Chat';
import Graph from './pages/Graph';
import Proactive from './pages/Proactive';
// 创造 Create
import Canvas from './pages/Canvas';
import Agents from './pages/Agents';
// 接入 Connect
import Connectors from './pages/Connectors';
// 治理 Govern
import Govern from './pages/Govern';
import Analytics from './pages/Analytics';

// 角色落地：全角色均有 search:read → 通常落旗舰搜索；无则跳首个可访问页
function Home() {
  const { hasPermission } = useAuth();
  if (hasPermission('search:read')) return <SearchAnswer />;
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
          <Route path="/chat" element={<Chat />} />
          <Route path="/graph" element={<Graph />} />
          <Route path="/proactive" element={<Proactive />} />
          <Route path="/canvas" element={<Canvas />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/connectors" element={<Connectors />} />
          <Route path="/govern" element={<Govern />} />
          <Route path="/analytics" element={<Analytics />} />
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
