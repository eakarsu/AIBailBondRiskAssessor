import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const PROVIDERS = [
  { key: 'pacer', label: 'PACER (Court Records)', endpoint: '/integrations/pacer/lookup', envVar: 'PACER_API_KEY',
    fields: [{ k: 'case_number', label: 'Case Number' }, { k: 'name', label: 'Defendant Name' }] },
  { key: 'ncic', label: 'NCIC (Criminal Background)', endpoint: '/integrations/ncic/check', envVar: 'NCIC_API_KEY',
    fields: [{ k: 'ssn_last4', label: 'SSN Last 4' }, { k: 'dob', label: 'Date of Birth (YYYY-MM-DD)' }] },
  { key: 'webloms', label: 'WebLOMS (Probation Sync)', endpoint: '/integrations/webloms/sync', envVar: 'WEBLOMS_API_KEY',
    fields: [{ k: 'defendant_id', label: 'Defendant ID' }, { k: 'status', label: 'Status' }, { k: 'notes', label: 'Notes' }] },
];

export default function IntegrationsPage() {
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [form, setForm] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);

  const loadLog = async () => {
    try {
      const r = await api.get('/integrations/log');
      setLog(Array.isArray(r.data) ? r.data : []);
    } catch (_) {}
  };
  useEffect(() => { loadLog(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const r = await api.post(provider.endpoint, form);
      setResult(r.data);
      toast.success(`${provider.label}: success`);
      loadLog();
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      setResult(data || { error: err.message });
      if (status === 503 && data?.missing) {
        toast.warn(`${provider.label} unavailable — set ${data.missing} in .env`);
      } else {
        toast.error(data?.error || err.message);
      }
    }
    setBusy(false);
  };

  return (
    <div style={{ padding: 24, color: '#e5e7eb' }}>
      <h2 style={{ marginTop: 0 }}>External Integrations</h2>
      <p style={{ color: '#9ca3af' }}>
        Court / law-enforcement / probation system stubs. Each call requires the named env var to be configured;
        otherwise the API returns 503 with the missing key name.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {PROVIDERS.map((p) => (
          <button
            key={p.key}
            onClick={() => { setProvider(p); setForm({}); setResult(null); }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: provider.key === p.key ? '#6366f1' : '#374151',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} style={{ background: '#1f2937', padding: 16, borderRadius: 8 }}>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
          Endpoint <code>{provider.endpoint}</code> — gated on <code>{provider.envVar}</code>
        </div>
        {provider.fields.map((f) => (
          <div key={f.k} style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>{f.label}</label>
            <input
              value={form[f.k] || ''}
              onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
              style={{ width: '100%', padding: 8, background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: 6 }}
            />
          </div>
        ))}
        <button type="submit" disabled={busy} style={{ marginTop: 8, padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          {busy ? 'Calling…' : 'Call Provider'}
        </button>
      </form>

      {result && (
        <pre style={{ marginTop: 16, padding: 12, background: '#111827', color: '#d1d5db', borderRadius: 6, overflow: 'auto', fontSize: 12 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      <h3 style={{ marginTop: 32 }}>Recent Calls</h3>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#374151' }}>
            <th style={{ padding: 8, textAlign: 'left' }}>When</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Provider</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Defendant</th>
            <th style={{ padding: 8, textAlign: 'left' }}>Response</th>
          </tr>
        </thead>
        <tbody>
          {log.length === 0 ? (
            <tr><td colSpan="4" style={{ padding: 8, color: '#6b7280' }}>No calls yet</td></tr>
          ) : log.map((row) => (
            <tr key={row.id} style={{ borderBottom: '1px solid #374151' }}>
              <td style={{ padding: 8 }}>{new Date(row.created_at).toLocaleString()}</td>
              <td style={{ padding: 8 }}>{row.provider}</td>
              <td style={{ padding: 8 }}>{row.defendant_id || '—'}</td>
              <td style={{ padding: 8, fontSize: 11, color: '#9ca3af' }}>{JSON.stringify(row.response).slice(0, 80)}…</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
