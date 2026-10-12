import { useRef as useDemoLoginRef, useState as useDemoLoginState } from 'react';
import React, { useState } from 'react';
import api from '../services/api';

export default function Login({ onLogin }) {
  const demoLoginLock = useDemoLoginRef(false);
  const [demoLoginBusy, setDemoLoginBusy] = useDemoLoginState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e, demoLoginCredentials) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email: (demoLoginCredentials?.email ?? email), password: (demoLoginCredentials?.password ?? password) });
      localStorage.setItem('token', res.data.token);
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-bg-effect login-bg-1" />
      <div className="login-bg-effect login-bg-2" />
      <div className="login-bg-effect login-bg-3" />

      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">⚖️</div>
          <h1 className="login-title">AI Bail Bond</h1>
          <p className="login-subtitle">Risk Assessment Platform</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button
            type="button"
            onClick={async (event) => {
 if (demoLoginLock.current) return;
 demoLoginLock.current = true; setDemoLoginBusy(true);
 const values = {};
 const captureDemoValue = (key, value) => { values[key] = value; return value; };
 try {
  await (async () => { setEmail(captureDemoValue("email", process.env.REACT_APP_DEMO_EMAIL || '')); setPassword(captureDemoValue("password", process.env.REACT_APP_DEMO_PASSWORD || '')); })(event);
  if (values.error || typeof values.email !== 'string' || !values.email || typeof values.password !== 'string' || !values.password) { setError(typeof values.error === 'string' ? values.error : 'Demo credentials are unavailable.'); return; }
  await handleSubmit(event, { email: values.email, password: values.password });
 } finally { demoLoginLock.current = false; setDemoLoginBusy(false); }
}}
            disabled={demoLoginBusy || (!process.env.REACT_APP_DEMO_EMAIL || !process.env.REACT_APP_DEMO_PASSWORD)}
            aria-label="Log In as Demo"
            style={{ width: '100%', marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid currentColor', background: 'transparent', cursor: 'pointer' }}
          >
            Log In as Demo
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  );
}
