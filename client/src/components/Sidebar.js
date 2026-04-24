import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationBell from './NotificationBell';

export default function Sidebar({ features, systemLinks, user, onLogout, isOpen, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className={`sidebar ${isOpen ? '' : 'collapsed'}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">{'\u2696\uFE0F'}</div>
        {isOpen && (
          <div>
            <div className="sidebar-title">AI Bail Bond</div>
            <div className="sidebar-subtitle">Risk Assessor</div>
          </div>
        )}
        <button className="toggle-btn" onClick={onToggle}>
          {isOpen ? '\u25C0' : '\u25B6'}
        </button>
      </div>

      <nav className="sidebar-nav">
        <div
          className={`sidebar-link ${location.pathname === '/' ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          <span className="sidebar-link-icon">{'\uD83D\uDCCA'}</span>
          {isOpen && <span>Dashboard</span>}
        </div>

        {features.map(f => (
          <div
            key={f.key}
            className={`sidebar-link ${location.pathname.startsWith(`/${f.key}`) ? 'active' : ''}`}
            onClick={() => navigate(`/${f.key}`)}
          >
            <span className="sidebar-link-icon">{f.icon}</span>
            {isOpen && <span>{f.label}</span>}
          </div>
        ))}

        {systemLinks && systemLinks.length > 0 && (
          <>
            <div className="sidebar-divider" />
            {isOpen && <div className="sidebar-section-label">System</div>}
            {systemLinks.map(s => (
              <div
                key={s.key}
                className={`sidebar-link ${location.pathname.startsWith(`/${s.key}`) ? 'active' : ''}`}
                onClick={() => navigate(`/${s.key}`)}
              >
                <span className="sidebar-link-icon">{s.icon}</span>
                {isOpen && <span>{s.label}</span>}
              </div>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-avatar">
          {user.name?.charAt(0) || 'U'}
        </div>
        {isOpen && (
          <>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{user.role}</div>
            </div>
            <NotificationBell isOpen={isOpen} />
            <button className="logout-btn" onClick={onLogout} title="Logout">{'\u23FB'}</button>
          </>
        )}
      </div>
    </div>
  );
}
