import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import AIResultDisplay from '../components/AIResultDisplay';

const FEATURES = [
  { key: 'fta-forecast', label: 'FTA Forecast', icon: '\uD83D\uDCC5', description: 'Predict failure-to-appear risk for next hearing.', needs: ['defendant_id'] },
  { key: 'condition-monitoring', label: 'Condition Monitoring', icon: '\uD83D\uDCE1', description: 'Recommend GPS / substance testing protocol.', needs: ['defendant_id'] },
  { key: 'forfeiture-predictor', label: 'Forfeiture Predictor', icon: '\uD83D\uDCB0', description: 'Asset-recovery likelihood if bond forfeited.', needs: ['bond_id'] },
  { key: 'risk-trends', label: 'Risk Score Trends', icon: '\uD83D\uDCC8', description: '30-day trajectory & rapid degradation alert.', needs: ['defendant_id'], extra: { window_days: 30 } },
  { key: 'surety-network-validation', label: 'Surety Validation', icon: '\uD83D\uDEE1\uFE0F', description: 'Cross-check guarantor creditworthiness.', needs: ['defendant_id'] },
  { key: 'court-hearing-prep', label: 'Court Hearing Prep', icon: '\u2696\uFE0F', description: 'Talking points for bail reduction hearings.', needs: ['defendant_id'] },
  { key: 'geopolitical-risk-alert', label: 'Geopolitical Risk', icon: '\u2708\uFE0F', description: 'Travel-based flight-risk red flags.', needs: ['defendant_id'] },
  { key: 'comparative-benchmarking', label: 'Comparative Benchmark', icon: '\uD83D\uDCCA', description: 'Defendant vs jurisdiction/charge cohort.', needs: ['defendant_id'] },
  { key: 'bond-premium-optimizer', label: 'Premium Optimizer', icon: '\uD83D\uDCB2', description: 'Optimal premium % based on risk profile and market rates.', needs: ['defendant_id'] },
  { key: 'portfolio-risk-summary', label: 'Portfolio Risk', icon: '\uD83C\uDFF7\uFE0F', description: 'Portfolio-level VaR and top high-risk bond alerts.', needs: [], method: 'GET' },
  { key: 'warrant-risk-assessment', label: 'Warrant Risk', icon: '\uD83D\uDEA8', description: 'FTA recovery probability and apprehension recommendations.', needs: ['defendant_id'] },
];

export default function AIInsights() {
  const [defendants, setDefendants] = useState([]);
  const [bonds, setBonds] = useState([]);
  const [feature, setFeature] = useState(FEATURES[0]);
  const [defendantId, setDefendantId] = useState('');
  const [bondId, setBondId] = useState('');
  const [windowDays, setWindowDays] = useState(30);
  const [hearingType, setHearingType] = useState('Bail Reduction Hearing');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  useEffect(() => {
    api.get('/defendants').then(r => setDefendants(r.data?.data || r.data || []))
      .catch(() => toast.error('Failed to load defendants'));
    api.get('/bail-bonds').then(r => setBonds(r.data?.data || r.data || []))
      .catch(() => {});
    loadHistory(1);
  }, []);

  const loadHistory = async (page = 1) => {
    try {
      const r = await api.get('/ai/results', { params: { page, limit: 10, feature: feature.key } });
      setHistory(r.data?.data || []);
      setHistoryTotal(r.data?.pagination?.total || 0);
      setHistoryPage(page);
    } catch (e) {
      // table may not exist yet
    }
  };

  useEffect(() => { loadHistory(1); /* eslint-disable-next-line */ }, [feature.key]);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      let r;
      if (feature.method === 'GET') {
        r = await api.get(`/ai/${feature.key}`);
      } else {
        const payload = { ...(feature.extra || {}) };
        if (feature.needs.includes('defendant_id')) {
          if (!defendantId) { toast.warn('Pick a defendant first'); setLoading(false); return; }
          payload.defendant_id = parseInt(defendantId);
        }
        if (feature.needs.includes('bond_id')) {
          if (!bondId) { toast.warn('Pick a bond first'); setLoading(false); return; }
          payload.bond_id = parseInt(bondId);
        }
        if (feature.key === 'risk-trends') payload.window_days = parseInt(windowDays) || 30;
        if (feature.key === 'court-hearing-prep') payload.hearing_type = hearingType;
        r = await api.post(`/ai/${feature.key}`, payload);
      }
      setResult(r.data);
      toast.success('AI analysis complete');
      loadHistory(1);
    } catch (e) {
      toast.error(e.response?.data?.error || 'AI request failed');
    }
    setLoading(false);
  };

  const totalHistoryPages = Math.max(1, Math.ceil(historyTotal / 10));

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title-section">
          <span className="page-icon">{'\uD83E\uDD16'}</span>
          <h1 className="page-title">AI Insights</h1>
        </div>
      </div>

      <div className="profile-overview-grid" style={{ marginBottom: 16 }}>
        {FEATURES.map(f => (
          <button
            key={f.key}
            type="button"
            className="profile-summary-card"
            style={{
              cursor: 'pointer',
              borderLeftColor: feature.key === f.key ? '#6366f1' : '#475569',
              background: feature.key === f.key ? 'rgba(99,102,241,0.08)' : undefined,
              textAlign: 'left',
            }}
            onClick={() => { setFeature(f); setResult(null); }}
          >
            <div style={{ fontSize: 22 }}>{f.icon}</div>
            <div className="profile-summary-label">{f.label}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{f.description}</div>
          </button>
        ))}
      </div>

      <div className="profile-section">
        <h3 className="profile-section-title">{feature.icon} {feature.label}</h3>
        <div className="detail-grid" style={{ gap: 12, alignItems: 'end' }}>
          {feature.needs.includes('defendant_id') && (
            <div className="detail-field">
              <div className="detail-label">Defendant</div>
              <select className="form-select" value={defendantId} onChange={e => setDefendantId(e.target.value)}>
                <option value="">Select...</option>
                {defendants.map(d => (
                  <option key={d.id} value={d.id}>{d.first_name} {d.last_name} (#{d.id})</option>
                ))}
              </select>
            </div>
          )}
          {feature.needs.includes('bond_id') && (
            <div className="detail-field">
              <div className="detail-label">Bond</div>
              <select className="form-select" value={bondId} onChange={e => setBondId(e.target.value)}>
                <option value="">Select...</option>
                {bonds.map(b => (
                  <option key={b.id} value={b.id}>#{b.id} — ${Number(b.bond_amount || 0).toLocaleString()} {b.bond_type ? `(${b.bond_type})` : ''}</option>
                ))}
              </select>
            </div>
          )}
          {feature.key === 'risk-trends' && (
            <div className="detail-field">
              <div className="detail-label">Window (days)</div>
              <input className="form-input" type="number" min={7} max={180}
                value={windowDays} onChange={e => setWindowDays(e.target.value)} />
            </div>
          )}
          {feature.key === 'court-hearing-prep' && (
            <div className="detail-field">
              <div className="detail-label">Hearing Type</div>
              <input className="form-input" value={hearingType} onChange={e => setHearingType(e.target.value)} />
            </div>
          )}
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn-primary" onClick={run} disabled={loading}>
            {loading ? 'Analyzing\u2026' : `Run ${feature.label}`}
          </button>
        </div>
      </div>

      {result && (
        <div className="profile-section">
          <h3 className="profile-section-title">Result</h3>
          <AIResultDisplay result={
        result.forecast ||
        result.monitoring_plan ||
        result.forfeiture_assessment ||
        result.trend ||
        result.validation ||
        result.prep ||
        result.assessment ||
        result.benchmarking ||
        result.prediction ||
        result.pricing ||
        result.summary ||
        result.warrant_assessment ||
        result
      } />
        </div>
      )}

      <div className="profile-section">
        <h3 className="profile-section-title">Recent {feature.label} runs</h3>
        {history.length === 0 ? (
          <div className="profile-empty">No historical AI runs yet for this feature.</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th><th>Entity</th><th>By</th><th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td>{new Date(h.created_at).toLocaleString()}</td>
                    <td>{h.entity_type || '\u2014'} #{h.entity_id || ''}</td>
                    <td>{h.user_email || '\u2014'}</td>
                    <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(h.response && (h.response.detailed_analysis || h.response.rationale || h.response.comparison_summary)) || JSON.stringify(h.response).slice(0, 120)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <button className="btn-secondary" disabled={historyPage <= 1} onClick={() => loadHistory(historyPage - 1)}>Prev</button>
              <span>Page {historyPage} / {totalHistoryPages}</span>
              <button className="btn-secondary" disabled={historyPage >= totalHistoryPages} onClick={() => loadHistory(historyPage + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
