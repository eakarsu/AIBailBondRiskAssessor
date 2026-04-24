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
    { key: 'defendants', label: 'Defendants', icon: '\uD83D\uDC64', color: '#6366f1' },
    { key: 'bail-bonds', label: 'Bail Bonds', icon: '\u2696\uFE0F', color: '#8b5cf6' },
    { key: 'risk-assessments', label: 'Risk Assessments', icon: '\uD83D\uDCCA', color: '#ec4899' },
    { key: 'court-cases', label: 'Court Cases', icon: '\uD83C\uDFDB\uFE0F', color: '#f59e0b' },
    { key: 'compliance', label: 'Compliance', icon: '\u2705', color: '#10b981' },
    { key: 'flight-risk', label: 'Flight Risk', icon: '\u2708\uFE0F', color: '#ef4444' },
    { key: 'criminal-history', label: 'Criminal History', icon: '\uD83D\uDCCB', color: '#f97316' },
    { key: 'employment', label: 'Employment', icon: '\uD83D\uDCBC', color: '#06b6d4' },
    { key: 'community-ties', label: 'Community Ties', icon: '\uD83E\uDD1D', color: '#84cc16' },
    { key: 'financial', label: 'Financial Analysis', icon: '\uD83D\uDCB0', color: '#eab308' },
    { key: 'substance-abuse', label: 'Substance Abuse', icon: '\uD83E\uDDEA', color: '#d946ef' },
    { key: 'mental-health', label: 'Mental Health', icon: '\uD83E\uDDE0', color: '#14b8a6' },
    { key: 'recidivism', label: 'Recidivism', icon: '\uD83D\uDD04', color: '#f43f5e' },
    { key: 'surety', label: 'Surety Management', icon: '\uD83D\uDEE1\uFE0F', color: '#0ea5e9' },
    { key: 'notifications', label: 'Notifications', icon: '\uD83D\uDD14', color: '#a855f7' },
  ];

  const systemLinks = [
    { key: 'calendar', label: 'Calendar', icon: '\uD83D\uDCC5', color: '#3b82f6' },
    { key: 'reports', label: 'Reports & Analytics', icon: '\uD83D\uDCC8', color: '#f59e0b' },
    { key: 'users', label: 'User Management', icon: '\uD83D\uDC65', color: '#6366f1' },
    { key: 'audit-log', label: 'Audit Log', icon: '\uD83D\uDCC4', color: '#64748b' },
    { key: 'settings', label: 'Settings', icon: '\u2699\uFE0F', color: '#94a3b8' },
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
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
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
