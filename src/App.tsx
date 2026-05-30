import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Overview from './pages/command/Overview';
import Goals from './pages/command/Goals';
import Ops from './pages/command/Ops';
import Report from './pages/command/Report';
import WarRoom from './pages/command/WarRoom';
import Market from './pages/insights/Market';
import Competitor from './pages/insights/Competitor';
import Subsidy from './pages/insights/Subsidy';
import Network from './pages/insights/Network';
import Forecast from './pages/intel/Forecast';
import Sandbox from './pages/intel/Sandbox';
import FunnelDiag from './pages/intel/FunnelDiag';
import Alerts from './pages/intel/Alerts';
import WarGame from './pages/intel/WarGame';
import Incentive from './pages/intel/Incentive';
import Voc from './pages/voc/Voc';
import Conversation from './pages/voc/Conversation';
import Feedback from './pages/voc/Feedback';
import AiAssistant from './pages/ai/AiAssistant';
import Knowledge from './pages/knowledge/Knowledge';
import Projects from './pages/projects/Projects';
import Users from './pages/settings/Users';
import Roles from './pages/settings/Roles';
import DataGov from './pages/settings/DataGov';

function Shell() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Login />;
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/command/overview" replace />} />
          <Route path="/command/overview" element={<Overview />} />
          <Route path="/command/goals" element={<Goals />} />
          <Route path="/command/ops" element={<Ops />} />
          <Route path="/command/report" element={<Report />} />
          <Route path="/command/warroom" element={<WarRoom />} />
          <Route path="/insights/market" element={<Market />} />
          <Route path="/insights/competitor" element={<Competitor />} />
          <Route path="/insights/subsidy" element={<Subsidy />} />
          <Route path="/insights/network" element={<Network />} />
          <Route path="/intel/forecast" element={<Forecast />} />
          <Route path="/intel/sandbox" element={<Sandbox />} />
          <Route path="/intel/funnel" element={<FunnelDiag />} />
          <Route path="/intel/alerts" element={<Alerts />} />
          <Route path="/intel/wargame" element={<WarGame />} />
          <Route path="/intel/incentive" element={<Incentive />} />
          <Route path="/voc" element={<Navigate to="/voc/overview" replace />} />
          <Route path="/voc/overview" element={<Voc />} />
          <Route path="/voc/conversation" element={<Conversation />} />
          <Route path="/voc/feedback" element={<Feedback />} />
          <Route path="/ai" element={<AiAssistant />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/settings/users" element={<Users />} />
          <Route path="/settings/roles" element={<Roles />} />
          <Route path="/settings/data" element={<DataGov />} />
          <Route path="*" element={<Navigate to="/command/overview" replace />} />
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
