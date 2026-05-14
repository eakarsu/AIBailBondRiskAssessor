import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FeaturePage from './pages/FeaturePage';
import DefendantProfile from './pages/DefendantProfile';
import CalendarPage from './pages/CalendarPage';
import ReportsPage from './pages/ReportsPage';
import UserManagement from './pages/UserManagement';
import AuditLogPage from './pages/AuditLogPage';
import SettingsPage from './pages/SettingsPage';
import AIInsights from './pages/AIInsights';
import WebhooksPage from './pages/WebhooksPage';
import IntegrationsPage from './pages/IntegrationsPage';
import HistoricalRagPage from './pages/HistoricalRagPage';
import MultiAgentReviewPage from './pages/MultiAgentReviewPage';
import Sidebar from './components/Sidebar';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (!user) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <ToastContainer position="top-right" theme="dark" />
      </>
    );
  }

  const features = [
    { key: 'defendants', label: 'Defendants', icon: '👤', color: '#6366f1' },
    { key: 'bail-bonds', label: 'Bail Bonds', icon: '⚖️', color: '#8b5cf6' },
    { key: 'risk-assessments', label: 'Risk Assessments', icon: '📊', color: '#ec4899' },
    { key: 'court-cases', label: 'Court Cases', icon: '🏛️', color: '#f59e0b' },
    { key: 'compliance', label: 'Compliance', icon: '✅', color: '#10b981' },
    { key: 'flight-risk', label: 'Flight Risk', icon: '✈️', color: '#ef4444' },
    { key: 'criminal-history', label: 'Criminal History', icon: '📋', color: '#f97316' },
    { key: 'employment', label: 'Employment', icon: '💼', color: '#06b6d4' },
    { key: 'community-ties', label: 'Community Ties', icon: '🤝', color: '#84cc16' },
    { key: 'financial', label: 'Financial Analysis', icon: '💰', color: '#eab308' },
    { key: 'substance-abuse', label: 'Substance Abuse', icon: '🧪', color: '#d946ef' },
    { key: 'mental-health', label: 'Mental Health', icon: '🧠', color: '#14b8a6' },
    { key: 'recidivism', label: 'Recidivism', icon: '🔄', color: '#f43f5e' },
    { key: 'surety', label: 'Surety Management', icon: '🛡️', color: '#0ea5e9' },
    { key: 'notifications', label: 'Notifications', icon: '🔔', color: '#a855f7' },
  ];

  const systemLinks = [
    { key: 'ai-insights', label: 'AI Insights', icon: '🤖', color: '#a855f7' },
    { key: 'calendar', label: 'Calendar', icon: '📅', color: '#3b82f6' },
    { key: 'reports', label: 'Reports & Analytics', icon: '📈', color: '#f59e0b' },
    { key: 'users', label: 'User Management', icon: '👥', color: '#6366f1' },
    { key: 'audit-log', label: 'Audit Log', icon: '📄', color: '#64748b' },
    { key: 'webhooks', label: 'Webhooks', icon: '🔔', color: '#0ea5e9' },
    { key: 'integrations', label: 'Integrations', icon: '🔌', color: '#22c55e' },
    { key: 'historical-rag', label: 'Historical RAG', icon: '📚', color: '#a855f7' },
    { key: 'multi-agent', label: 'Agentic Review', icon: '🤖', color: '#f97316' },
    { key: 'settings', label: 'Settings', icon: '⚙️', color: '#94a3b8' },
  ];

  return (
    <Router>
      <div className="app-container">
        <Sidebar
          features={features}
          systemLinks={systemLinks}
          user={user}
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className={`main-content ${sidebarOpen ? '' : 'expanded'}`}>
          <Routes>
            <Route path="/" element={<Dashboard features={features} />} />
            {features.map(f => (
              <Route key={f.key} path={`/${f.key}/*`} element={<FeaturePage feature={f} />} />
            ))}
            <Route path="/defendant-profile/:id" element={<DefendantProfile />} />
            <Route path="/ai-insights" element={<AIInsights />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/webhooks" element={<WebhooksPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/historical-rag" element={<HistoricalRagPage />} />
            <Route path="/multi-agent" element={<MultiAgentReviewPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <ToastContainer position="top-right" theme="dark" />
      </div>
    </Router>
  );
}

export default App;
