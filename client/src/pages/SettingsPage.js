import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const NOTIFICATION_TYPES = [
  { key: 'court_reminder', label: 'Court Reminders' },
  { key: 'compliance_due', label: 'Compliance Due Dates' },
  { key: 'risk_change', label: 'Risk Level Changes' },
  { key: 'payment', label: 'Payment Notifications' },
  { key: 'forfeiture_warning', label: 'Forfeiture Warnings' },
  { key: 'assessment_needed', label: 'Assessment Reminders' },
  { key: 'gps_alert', label: 'GPS Alerts' },
  { key: 'checkin_missed', label: 'Missed Check-ins' },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [notifPrefs, setNotifPrefs] = useState({});
  const [displayPrefs, setDisplayPrefs] = useState({ itemsPerPage: 25 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const u = JSON.parse(stored);
      setProfile({ name: u.name || '', email: u.email || '' });
    }
    const savedPrefs = localStorage.getItem('notificationPrefs');
    if (savedPrefs) {
      setNotifPrefs(JSON.parse(savedPrefs));
    } else {
      const defaults = {};
      NOTIFICATION_TYPES.forEach(t => { defaults[t.key] = true; });
      setNotifPrefs(defaults);
    }
    const savedDisplay = localStorage.getItem('displayPrefs');
    if (savedDisplay) setDisplayPrefs(JSON.parse(savedDisplay));
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      await api.put(`/users/${stored.id}`, { name: profile.name, email: profile.email });
      const updated = { ...stored, name: profile.name, email: profile.email };
      localStorage.setItem('user', JSON.stringify(updated));
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    }
    setSaving(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwords.newPass.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      await api.put(`/users/${stored.id}`, { password: passwords.newPass });
      toast.success('Password changed');
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    }
    setSaving(false);
  };

  const toggleNotif = (key) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    localStorage.setItem('notificationPrefs', JSON.stringify(updated));
  };

  const handleDisplaySave = () => {
    localStorage.setItem('displayPrefs', JSON.stringify(displayPrefs));
    toast.success('Display preferences saved');
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div className="page-title-section">
          <span className="page-icon">&#9881;</span>
          <h1 className="page-title">Settings</h1>
        </div>
      </div>

      <div className="settings-sections">
        {/* Profile */}
        <div className="settings-section">
          <h3 className="settings-section-title">Profile Information</h3>
          <form onSubmit={handleProfileSave}>
            <div className="settings-form-grid">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ width: 'auto', marginTop: 12 }} disabled={saving}>
              Save Profile
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="settings-section">
          <h3 className="settings-section-title">Change Password</h3>
          <form onSubmit={handlePasswordChange}>
            <div className="settings-form-grid">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={passwords.newPass}
                  onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary" style={{ width: 'auto', marginTop: 12 }} disabled={saving}>
              Change Password
            </button>
          </form>
        </div>

        {/* Notification Preferences */}
        <div className="settings-section">
          <h3 className="settings-section-title">Notification Preferences</h3>
          <div className="settings-toggles">
            {NOTIFICATION_TYPES.map(t => (
              <div key={t.key} className="settings-toggle-row">
                <span className="settings-toggle-label">{t.label}</span>
                <button
                  className={`settings-toggle ${notifPrefs[t.key] ? 'active' : ''}`}
                  onClick={() => toggleNotif(t.key)}
                  type="button"
                >
                  <span className="settings-toggle-knob" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Display Preferences */}
        <div className="settings-section">
          <h3 className="settings-section-title">Display Preferences</h3>
          <div className="settings-form-grid">
            <div className="form-group">
              <label className="form-label">Items Per Page (default)</label>
              <select
                className="form-select"
                value={displayPrefs.itemsPerPage}
                onChange={(e) => setDisplayPrefs({ ...displayPrefs, itemsPerPage: Number(e.target.value) })}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <button className="btn-primary" style={{ width: 'auto', marginTop: 12 }} onClick={handleDisplaySave}>
            Save Display Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
