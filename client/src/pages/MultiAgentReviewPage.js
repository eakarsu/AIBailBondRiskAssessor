import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

export default function MultiAgentReviewPage() {
  const [defendantId, setDefendantId] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const r = await api.post('/multi-agent/review', { defendant_id: defendantId ? Number(defendantId) : null });
      setResult(r.data);
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 503 && data?.missing) {
        toast.warn(`AI unavailable — set ${data.missing} in .env`);
      } else {
        toast.error(data?.error || err.message);
      }
    }
    setBusy(false);
  };

  return (
    <div style={{ padding: 24, color: '#e5e7eb' }}>
      <h2 style={{ marginTop: 0 }}>Agentic Bail Review</h2>
      <p style={{ color: '#9ca3af' }}>
        Three-agent sequential pipeline: <strong>RiskAnalyst → ComplianceOfficer → Recommender</strong>.
        Each agent receives the previous agent's output and produces a structured JSON contribution.
      </p>

      <div style={{ background: '#1f2937', padding: 16, borderRadius: 8 }}>
        <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>Defendant ID (optional — provides full context)</label>
        <input value={defendantId} onChange={(e) => setDefendantId(e.target.value)} style={{ width: 240, padding: 8, background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: 6 }} />
        <div style={{ marginTop: 8 }}>
          <button onClick={run} disabled={busy} style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            {busy ? 'Running…' : 'Run 3-Agent Review'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ marginTop: 16 }}>
          {(result.steps || []).map((s, i) => (
            <div key={i} style={{ background: '#1f2937', padding: 16, borderRadius: 8, marginBottom: 12 }}>
              <h3 style={{ marginTop: 0 }}>Step {i + 1}: {s.agent}</h3>
              <pre style={{ whiteSpace: 'pre-wrap', color: '#d1d5db', fontSize: 13 }}>{JSON.stringify(s.output, null, 2)}</pre>
            </div>
          ))}
          {result.final_decision && (
            <div style={{ background: '#1e293b', border: '2px solid #10b981', padding: 16, borderRadius: 8 }}>
              <h3 style={{ marginTop: 0, color: '#10b981' }}>Final Decision</h3>
              <pre style={{ whiteSpace: 'pre-wrap', color: '#d1d5db', fontSize: 13 }}>{JSON.stringify(result.final_decision, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
