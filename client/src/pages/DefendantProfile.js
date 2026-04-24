import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'bonds', label: 'Bonds' },
  { key: 'cases', label: 'Cases' },
  { key: 'risk', label: 'Risk' },
  { key: 'criminal', label: 'Criminal History' },
  { key: 'employment', label: 'Employment' },
  { key: 'community', label: 'Community' },
  { key: 'financial', label: 'Financial' },
  { key: 'substance', label: 'Substance' },
  { key: 'mental', label: 'Mental Health' },
  { key: 'recidivism', label: 'Recidivism' },
  { key: 'surety', label: 'Surety' },
];

function formatVal(v) {
  if (v === null || v === undefined) return '--';
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  if (typeof v === 'number') return v.toLocaleString();
  if (typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}/)) return new Date(v).toLocaleDateString();
  return String(v);
}

function getRiskColor(level) {
  if (!level) return '#64748b';
  const l = String(level).toLowerCase();
  if (l.includes('very') || l.includes('critical')) return '#ef4444';
  if (l.includes('high')) return '#f87171';
  if (l.includes('medium') || l.includes('moderate')) return '#fbbf24';
  if (l.includes('low')) return '#34d399';
  return '#64748b';
}

function DataTable({ data, columns }) {
  if (!data || data.length === 0) {
    return <div className="profile-empty">No records found</div>;
  }
  const cols = columns || Object.keys(data[0]).filter(k => k !== 'updated_at');
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>{cols.map(c => <th key={c}>{c.replace(/_/g, ' ')}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.id || i}>
              {cols.map(c => <td key={c}>{formatVal(row[c])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DefendantProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    setLoading(true);
    api.get(`/reports/defendant-profile/${id}`)
      .then(r => setProfile(r.data))
      .catch(() => toast.error('Failed to load defendant profile'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="loading"><div className="spinner" />Loading profile...</div>;
  }

  if (!profile) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">&#128100;</div>
        <div className="empty-state-text">Profile not found</div>
        <button className="btn-secondary" onClick={() => navigate('/defendants')}>Back to Defendants</button>
      </div>
    );
  }

  const defendant = profile.defendant || {};
  const bonds = profile.bonds || [];
  const cases = profile.cases || [];
  const riskAssessments = profile.risk_assessments || [];
  const criminalHistory = profile.criminal_history || [];
  const employment = profile.employment || [];
  const communityTies = profile.community_ties || [];
  const financial = profile.financial || [];
  const substance = profile.substance_abuse || [];
  const mentalHealth = profile.mental_health || [];
  const recidivism = profile.recidivism || [];
  const surety = profile.surety || [];

  const renderOverview = () => {
    const cards = [
      { label: 'Active Bonds', value: bonds.filter(b => b.status === 'Active').length, color: '#6366f1' },
      { label: 'Total Bond Amount', value: `$${bonds.reduce((s, b) => s + (Number(b.bond_amount) || 0), 0).toLocaleString()}`, color: '#8b5cf6' },
      { label: 'Open Cases', value: cases.filter(c => c.status === 'Pending').length, color: '#f59e0b' },
      { label: 'Risk Assessments', value: riskAssessments.length, color: '#ec4899' },
      { label: 'Criminal Records', value: criminalHistory.length, color: '#f97316' },
      { label: 'Employment Records', value: employment.length, color: '#06b6d4' },
      { label: 'Community Ties', value: communityTies.length, color: '#84cc16' },
      { label: 'Financial Records', value: financial.length, color: '#eab308' },
    ];

    return (
      <div>
        <div className="profile-overview-grid">
          {cards.map((c, i) => (
            <div key={i} className="profile-summary-card" style={{ borderLeftColor: c.color }}>
              <div className="profile-summary-label">{c.label}</div>
              <div className="profile-summary-value">{c.value}</div>
            </div>
          ))}
        </div>
        {riskAssessments.length > 0 && (
          <div className="profile-section">
            <h3 className="profile-section-title">Latest Risk Assessment</h3>
            <div className="detail-grid">
              {['risk_score', 'risk_level', 'flight_risk_score', 'recidivism_score', 'overall_recommendation', 'status'].map(k => (
                <div key={k} className="detail-field">
                  <div className="detail-label">{k.replace(/_/g, ' ')}</div>
                  <div className="detail-value">{formatVal(riskAssessments[0][k])}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'bonds': return <DataTable data={bonds} columns={['id', 'bond_amount', 'bond_type', 'status', 'court_date', 'charge']} />;
      case 'cases': return <DataTable data={cases} columns={['id', 'case_number', 'charge', 'charge_severity', 'next_hearing_date', 'status']} />;
      case 'risk': return <DataTable data={riskAssessments} columns={['id', 'risk_score', 'risk_level', 'overall_recommendation', 'status']} />;
      case 'criminal': return <DataTable data={criminalHistory} columns={['id', 'offense_type', 'severity', 'offense_date', 'disposition', 'jurisdiction']} />;
      case 'employment': return <DataTable data={employment} columns={['id', 'employer_name', 'position', 'employment_type', 'monthly_income', 'status']} />;
      case 'community': return <DataTable data={communityTies} columns={['id', 'relationship_type', 'contact_name', 'tie_strength', 'years_known', 'verified']} />;
      case 'financial': return <DataTable data={financial} columns={['id', 'annual_income', 'credit_score', 'total_assets', 'financial_stability_score']} />;
      case 'substance': return <DataTable data={substance} columns={['id', 'substance_type', 'risk_level', 'usage_frequency', 'compliance_status']} />;
      case 'mental': return <DataTable data={mentalHealth} columns={['id', 'diagnosis', 'severity', 'treatment_status', 'competency_status']} />;
      case 'recidivism': return <DataTable data={recidivism} columns={['id', 'prediction_score', 'risk_level', 'prior_offenses_count', 'offense_type_pattern']} />;
      case 'surety': return <DataTable data={surety} columns={['id', 'surety_name', 'relationship', 'collateral_type', 'reliability_score', 'verified']} />;
      default: return null;
    }
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <div className="page-title-section">
          <span className="page-icon">&#128100;</span>
          <h1 className="page-title">Defendant Profile</h1>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={() => navigate('/defendants')}>Back to Defendants</button>
          <button className="btn-secondary" onClick={() => navigate(`/defendants`, { state: { editId: id } })}>Edit Defendant</button>
        </div>
      </div>

      <div className="profile-header-card">
        <div className="profile-avatar-large">
          {defendant.first_name?.charAt(0) || '?'}{defendant.last_name?.charAt(0) || ''}
        </div>
        <div className="profile-header-info">
          <h2 className="profile-name">{defendant.first_name} {defendant.last_name}</h2>
          <div className="profile-meta">
            {defendant.date_of_birth && <span>DOB: {new Date(defendant.date_of_birth).toLocaleDateString()}</span>}
            {defendant.city && <span>{defendant.city}, {defendant.state}</span>}
            {defendant.phone && <span>{defendant.phone}</span>}
          </div>
        </div>
        <div className="profile-header-badges">
          {defendant.status && (
            <span className="profile-status-badge" style={{ background: defendant.status === 'Active' ? 'rgba(99,102,241,0.15)' : 'rgba(100,116,139,0.15)', color: defendant.status === 'Active' ? '#818cf8' : '#94a3b8' }}>
              {defendant.status}
            </span>
          )}
          {defendant.risk_level && (
            <span className="profile-risk-badge" style={{ background: `${getRiskColor(defendant.risk_level)}22`, color: getRiskColor(defendant.risk_level) }}>
              {defendant.risk_level} Risk
            </span>
          )}
        </div>
      </div>

      <div className="profile-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`profile-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="profile-tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
}
