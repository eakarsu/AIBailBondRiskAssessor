import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const ALLOWED_EVENTS = [
  'risk_assessment.created',
  'risk_assessment.updated',
  'bail_bond.created',
  'bail_bond.forfeited',
  'flight_risk.alert',
  'court_case.hearing_scheduled',
  'compliance.violation',
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ url: '', secret: '', events: ['risk_assessment.created'] });
  const [testResult, setTestResult] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/webhooks');
      setWebhooks(Array.isArray(r.data) ? r.data : (r.data?.data || []));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load webhooks');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleEvent = (ev) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.url) { toast.warn('URL is required'); return; }
    if (form.events.length === 0) { toast.warn('Select at least one event'); return; }
    setCreating(true);
    try {
      await api.post('/webhooks', { url: form.url, events: form.events, secret: form.secret || null });
      toast.success('Webhook created');
      setForm({ url: '', secret: '', events: ['risk_assessment.created'] });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create webhook');
    }
    setCreating(false);
  };

  const remove = async (id) => {
    try {
      await api.delete(`/webhooks/${id}`);
      toast.success('Webhook removed');
      setWebhooks((ws) => ws.filter((w) => w.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove');
    }
  };

  const test = async (id) => {
    setTestResult(null);
    try {
      const r = await api.post(`/webhooks/${id}/test`);
      setTestResult(r.data);
      toast.success('Test payload generated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Test failed');
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div className="page-title-section">
          <span className="page-icon">{'🔔'}</span>
          <h1 className="page-title">Webhook Subscriptions</h1>
        </div>
      </div>

      <div className="settings-sections">
        <div className="settings-section">
          <h3 className="settings-section-title">New Subscription</h3>
          <form onSubmit={submit}>
            <div className="settings-form-grid">
              <div className="form-group">
                <label className="form-label">Endpoint URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://example.com/hooks/bailbond"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Signing Secret (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="hex / base64 string"
                  value={form.secret}
                  onChange={(e) => setForm({ ...form, secret: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Events</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ALLOWED_EVENTS.map((ev) => (
                  <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={form.events.includes(ev)}
                      onChange={() => toggleEvent(ev)}
                    />
                    <span>{ev}</span>
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ width: 'auto', marginTop: 12 }} disabled={creating}>
              {creating ? 'Creating...' : 'Create Subscription'}
            </button>
          </form>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">Active Webhooks</h3>
          {loading && <p>Loading...</p>}
          {!loading && webhooks.length === 0 && <p>No webhooks subscribed yet.</p>}
          {!loading && webhooks.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>ID</th>
                  <th style={th}>URL</th>
                  <th style={th}>Events</th>
                  <th style={th}>Active</th>
                  <th style={th}>Created</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((w) => (
                  <tr key={w.id}>
                    <td style={td}>{w.id}</td>
                    <td style={{ ...td, wordBreak: 'break-all', maxWidth: 320 }}>{w.url}</td>
                    <td style={td}>{(w.events || []).join(', ')}</td>
                    <td style={td}>{w.active ? 'Yes' : 'No'}</td>
                    <td style={td}>{w.created_at ? new Date(w.created_at).toLocaleString() : ''}</td>
                    <td style={td}>
                      <button className="btn-primary" style={{ marginRight: 8, padding: '4px 10px' }} onClick={() => test(w.id)}>Test</button>
                      <button className="btn-primary" style={{ background: '#ef4444', padding: '4px 10px' }} onClick={() => remove(w.id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {testResult && (
          <div className="settings-section">
            <h3 className="settings-section-title">Test Payload</h3>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 400, overflow: 'auto', background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 6, fontSize: 12 }}>
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

const th = { textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: 13 };
const td = { padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13 };
