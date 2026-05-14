import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

export default function HistoricalRagPage() {
  const [query, setQuery] = useState('');
  const [k, setK] = useState(5);
  const [matches, setMatches] = useState([]);
  const [aiAnswer, setAiAnswer] = useState(null);
  const [busy, setBusy] = useState(false);

  const search = async (withAI) => {
    if (!query.trim()) return toast.warn('Enter a question first');
    setBusy(true);
    setMatches([]);
    setAiAnswer(null);
    try {
      const path = withAI ? '/historical-rag/ask' : '/historical-rag/search';
      const r = await api.post(path, { query, k });
      setMatches(r.data.matches || []);
      if (withAI) setAiAnswer(r.data.ai);
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 503 && data?.missing) {
        toast.warn(`AI synthesis unavailable — set ${data.missing} in .env`);
      } else {
        toast.error(data?.error || err.message);
      }
    }
    setBusy(false);
  };

  return (
    <div style={{ padding: 24, color: '#e5e7eb' }}>
      <h2 style={{ marginTop: 0 }}>Historical Case RAG</h2>
      <p style={{ color: '#9ca3af' }}>
        Search over the existing risk_assessments archive using an in-memory hashed-bag-of-words embedding.
        Use <strong>Ask AI</strong> for a synthesized answer (requires OPENROUTER_API_KEY).
      </p>

      <div style={{ background: '#1f2937', padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. What conditions are typically imposed for high flight-risk DUI cases?"
          rows={3}
          style={{ width: '100%', padding: 8, background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: 6 }}
        />
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: '#9ca3af' }}>Top K:</label>
          <input type="number" min="1" max="20" value={k} onChange={(e) => setK(parseInt(e.target.value, 10) || 5)} style={{ width: 60, padding: 6, background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: 6 }} />
          <button onClick={() => search(false)} disabled={busy} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>{busy ? '…' : 'Search'}</button>
          <button onClick={() => search(true)} disabled={busy} style={{ padding: '8px 16px', background: '#a855f7', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>{busy ? '…' : 'Ask AI'}</button>
        </div>
      </div>

      {aiAnswer && (
        <div style={{ background: '#1e293b', padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>AI Answer</h3>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#d1d5db', fontSize: 13 }}>{JSON.stringify(aiAnswer, null, 2)}</pre>
        </div>
      )}

      <h3>Top Matches</h3>
      {matches.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No matches yet.</p>
      ) : (
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#374151' }}>
              <th style={{ padding: 8, textAlign: 'left' }}>Score</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Case</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Risk Level</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Risk Score</th>
              <th style={{ padding: 8, textAlign: 'left' }}>Bond</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.id} style={{ borderBottom: '1px solid #374151' }}>
                <td style={{ padding: 8 }}>{Number(m.score || 0).toFixed(3)}</td>
                <td style={{ padding: 8 }}>#{m.id} {m.summary || ''}</td>
                <td style={{ padding: 8 }}>{m.risk_level || '—'}</td>
                <td style={{ padding: 8 }}>{m.risk_score ?? '—'}</td>
                <td style={{ padding: 8 }}>{m.bond_amount ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
