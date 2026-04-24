import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const RISK_COLORS = {
  LOW: '#34d399',
  MEDIUM: '#fbbf24',
  HIGH: '#f87171',
  'VERY HIGH': '#ef4444',
  CRITICAL: '#dc2626',
  PENDING: '#64748b',
};

const BOND_TYPE_COLORS = {
  Surety: '#6366f1',
  Cash: '#10b981',
  Property: '#f59e0b',
  Federal: '#ec4899',
  Immigration: '#06b6d4',
};

export default function ReportsPage() {
  const [riskDist, setRiskDist] = useState(null);
  const [bondSummary, setBondSummary] = useState(null);
  const [complianceSummary, setComplianceSummary] = useState(null);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      api.get('/reports/risk-distribution'),
      api.get('/reports/bond-summary'),
      api.get('/reports/compliance-summary'),
      api.get('/reports/overdue'),
    ]).then(([rd, bs, cs, od]) => {
      if (rd.status === 'fulfilled') setRiskDist(rd.value.data);
      if (bs.status === 'fulfilled') setBondSummary(bs.value.data);
      if (cs.status === 'fulfilled') setComplianceSummary(cs.value.data);
      if (od.status === 'fulfilled') setOverdue(Array.isArray(od.value.data) ? od.value.data : od.value.data?.data || []);
    }).catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => window.print();

  if (loading) {
    return <div className="loading"><div className="spinner" />Loading reports...</div>;
  }

  const riskData = riskDist || {};
  const riskEntries = Object.entries(riskData).filter(([k]) => k !== 'total');
  const maxRisk = Math.max(...riskEntries.map(([, v]) => Number(v) || 0), 1);

  const bond = bondSummary || {};
  const bondByType = bond.by_type || {};
  const bondByStatus = bond.by_status || {};
  const totalBondCount = Object.values(bondByType).reduce((s, v) => s + (Number(v) || 0), 0) || 1;

  const compliance = complianceSummary || {};

  return (
    <div className="reports-page">
      <div className="page-header no-print">
        <div className="page-title-section">
          <span className="page-icon">&#128202;</span>
          <h1 className="page-title">Reports & Analytics</h1>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={handlePrint}>&#128424; Print Report</button>
        </div>
      </div>

      <div className="reports-grid">
        {/* Risk Distribution */}
        <div className="report-card">
          <h3 className="report-card-title">Risk Distribution</h3>
          <div className="report-bar-chart">
            {riskEntries.map(([level, count]) => (
              <div key={level} className="report-bar-row">
                <div className="report-bar-label">{level}</div>
                <div className="report-bar-track">
                  <div
                    className="report-bar-fill"
                    style={{
                      width: `${(Number(count) / maxRisk) * 100}%`,
                      background: RISK_COLORS[level] || '#64748b',
                    }}
                  />
                </div>
                <div className="report-bar-value">{count}</div>
              </div>
            ))}
          </div>
          {riskData.total !== undefined && (
            <div className="report-total">Total Defendants: {riskData.total}</div>
          )}
        </div>

        {/* Bond Summary */}
        <div className="report-card">
          <h3 className="report-card-title">Bond Summary</h3>
          {bond.total_bonds !== undefined && (
            <div className="report-stat-row">
              <span>Total Bonds</span>
              <span className="report-stat-value">{bond.total_bonds}</span>
            </div>
          )}
          {bond.total_amount !== undefined && (
            <div className="report-stat-row">
              <span>Total Amount</span>
              <span className="report-stat-value">${Number(bond.total_amount || 0).toLocaleString()}</span>
            </div>
          )}
          {bond.average_amount !== undefined && (
            <div className="report-stat-row">
              <span>Average Amount</span>
              <span className="report-stat-value">${Number(bond.average_amount || 0).toLocaleString()}</span>
            </div>
          )}

          <h4 className="report-sub-title">By Type</h4>
          <div className="report-pie-bars">
            {Object.entries(bondByType).map(([type, count]) => (
              <div key={type} className="report-pie-row">
                <div className="report-pie-label">
                  <span className="report-pie-dot" style={{ background: BOND_TYPE_COLORS[type] || '#64748b' }} />
                  {type}
                </div>
                <div className="report-pie-track">
                  <div
                    className="report-pie-fill"
                    style={{
                      width: `${(Number(count) / totalBondCount) * 100}%`,
                      background: BOND_TYPE_COLORS[type] || '#64748b',
                    }}
                  />
                </div>
                <span className="report-pie-value">{count}</span>
              </div>
            ))}
          </div>

          <h4 className="report-sub-title">By Status</h4>
          <div className="report-status-grid">
            {Object.entries(bondByStatus).map(([status, count]) => (
              <div key={status} className="report-status-item">
                <div className="report-status-count">{count}</div>
                <div className="report-status-label">{status}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance Summary */}
        <div className="report-card">
          <h3 className="report-card-title">Compliance Summary</h3>
          {Object.entries(compliance).map(([key, value]) => (
            <div key={key} className="report-stat-row">
              <span>{key.replace(/_/g, ' ')}</span>
              <span className="report-stat-value">
                {typeof value === 'number' ? value.toLocaleString() : String(value)}
              </span>
            </div>
          ))}
        </div>

        {/* Overdue Items */}
        <div className="report-card report-card-wide">
          <h3 className="report-card-title">Overdue Items</h3>
          {overdue.length === 0 ? (
            <div className="report-empty">No overdue items</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Title / Description</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Defendant</th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.map((item, i) => (
                    <tr key={i}>
                      <td>{(item.type || item.entity_type || '').replace(/_/g, ' ')}</td>
                      <td>{item.title || item.description || item.charge || '--'}</td>
                      <td style={{ color: '#f87171' }}>{item.due_date ? new Date(item.due_date).toLocaleDateString() : '--'}</td>
                      <td>{item.status || '--'}</td>
                      <td>{item.defendant_name || item.defendant_id || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
