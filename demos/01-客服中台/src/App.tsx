import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
// 运营总览
import Overview from './pages/dashboard/Overview';
import Dashboard from './pages/dashboard/Dashboard';
import TokenUsage from './pages/dashboard/TokenUsage';
// 对话与质量
import Command from './pages/conv/Command';
import Live from './pages/conv/Live';
import ProdChat from './pages/conv/ProdChat';
import Badcase from './pages/conv/Badcase';
import Reject from './pages/conv/Reject';
import Audit from './pages/conv/Audit';
// 知识库
import Scenario from './pages/kb/Scenario';
import QA from './pages/kb/QA';
import Card from './pages/kb/Card';
import Chitchat from './pages/kb/Chitchat';
import Transfer from './pages/kb/Transfer';
import Sensitive from './pages/kb/Sensitive';
import Recycle from './pages/kb/Recycle';
// 智能体与配置
import Agents from './pages/config/Agents';
import LLM from './pages/config/LLM';
import Prompt from './pages/config/Prompt';
import Intent from './pages/config/Intent';
import TagsPage from './pages/config/Tags';
import PipelineTest from './pages/config/PipelineTest';
import KnowledgeGap from './pages/config/KnowledgeGap';
// 系统
import Logs from './pages/system/Logs';
import RBAC from './pages/system/RBAC';

function Shell() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Login />;
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/token-usage" element={<TokenUsage />} />
          <Route path="/command" element={<Command />} />
          <Route path="/live" element={<Live />} />
          <Route path="/prod-chat" element={<ProdChat />} />
          <Route path="/badcase" element={<Badcase />} />
          <Route path="/reject" element={<Reject />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/kb/scenario" element={<Scenario />} />
          <Route path="/kb/qa" element={<QA />} />
          <Route path="/kb/card" element={<Card />} />
          <Route path="/kb/chitchat" element={<Chitchat />} />
          <Route path="/kb/transfer" element={<Transfer />} />
          <Route path="/kb/sensitive" element={<Sensitive />} />
          <Route path="/kb/recycle" element={<Recycle />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/llm" element={<LLM />} />
          <Route path="/prompt" element={<Prompt />} />
          <Route path="/intent" element={<Intent />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/pipeline-test" element={<PipelineTest />} />
          <Route path="/knowledge-gap" element={<KnowledgeGap />} />
          <Route path="/logs" element={<Logs />} />
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
