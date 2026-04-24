import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Dashboard({ features }) {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  const descriptions = {
    'defendants': 'Manage defendant profiles and personal information',
    'bail-bonds': 'Track bail bonds, premiums, and collateral',
    'risk-assessments': 'AI-powered comprehensive risk evaluations',
    'court-cases': 'Court case tracking and hearing schedules',
    'compliance': 'Regulatory compliance monitoring and reports',
    'flight-risk': 'AI flight risk analysis and monitoring',
    'criminal-history': 'Criminal record management and tracking',
    'employment': 'Employment verification and income tracking',
    'community-ties': 'Community connection and support assessment',
    'financial': 'Financial capability and stability analysis',
    'substance-abuse': 'Substance abuse assessment and treatment tracking',
    'mental-health': 'Mental health evaluation and compliance',
    'recidivism': 'AI recidivism prediction and risk factors',
    'surety': 'Surety/guarantor management and verification',
    'notifications': 'System alerts, reminders, and notifications',
  };

  return (
    <div>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Risk Assessment Dashboard</h1>
        <p className="dashboard-subtitle">AI-Powered Bail Bond Risk Assessment Platform</p>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Defendants</div>
            <div className="stat-value">{stats.total_defendants}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Bonds</div>
            <div className="stat-value">{stats.total_bonds}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Bond Amount</div>
            <div className="stat-value">${(stats.total_bond_amount || 0).toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Risk Assessments</div>
            <div className="stat-value">{stats.total_assessments}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">High Risk</div>
            <div className="stat-value danger">{stats.high_risk_defendants}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Cases</div>
            <div className="stat-value warning">{stats.pending_cases}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Unread Alerts</div>
            <div className="stat-value warning">{stats.unread_notifications}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Compliance Issues</div>
            <div className="stat-value danger">{stats.compliance_issues}</div>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#94a3b8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
        Modules
      </h2>
      <div className="features-grid">
        {features.map(f => (
          <div
            key={f.key}
            className="feature-card"
            onClick={() => navigate(`/${f.key}`)}
            style={{ borderColor: `${f.color}22` }}
            onMouseEnter={e => e.currentTarget.style.borderColor = `${f.color}55`}
            onMouseLeave={e => e.currentTarget.style.borderColor = `${f.color}22`}
          >
            <div className="feature-card-icon">{f.icon}</div>
            <div className="feature-card-title">{f.label}</div>
            <div className="feature-card-desc">{descriptions[f.key]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
