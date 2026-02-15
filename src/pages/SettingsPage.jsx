import React, { useState, useEffect } from 'react';
import { AppDialog } from '../components/AppDialog';

const FEATURE_KEYS = [
  { key: 'enable_fine', label: 'Enable fine calculation' },
  { key: 'enable_due_date', label: 'Enable due date tracking' },
  { key: 'enable_renewal', label: 'Allow renewal' },
  { key: 'enable_reports', label: 'Enable reports' },
  { key: 'enable_categories', label: 'Enable book categories' },
  { key: 'enable_borrow_limit', label: 'Enforce borrow limit' },
];

const CONFIG_KEYS = [
  { key: 'max_borrow_days', label: 'Max borrow days' },
  { key: 'max_books_per_member', label: 'Max books per member' },
  { key: 'fine_per_day', label: 'Fine per day' },
  { key: 'grace_period', label: 'Grace period (days)' },
];

export function SettingsPage({ features: propFeatures, onFeaturesChange }) {
  const [config, setConfig] = useState({});
  const [features, setFeatures] = useState(propFeatures || {});
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, type: 'info', message: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  const showDialog = (type, message) => setDialog({ open: true, type, message });
  const closeDialog = () => setDialog((d) => ({ ...d, open: false }));

  useEffect(() => {
    setFeatures(propFeatures || {});
  }, [propFeatures]);

  useEffect(() => {
    Promise.all([
      window.klms.config.getAll(),
      window.klms.features.getAll(),
    ])
      .then(([c, f]) => {
        setConfig(c || {});
        setFeatures(f || {});
        if (onFeaturesChange) onFeaturesChange(f);
      })
      .catch(() => showDialog('error', 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (key, enabled) => {
    const next = { ...features, [key]: enabled };
    setFeatures(next);
    if (onFeaturesChange) onFeaturesChange(next);
    try {
      await window.klms.features.set(key, enabled);
    } catch (err) {
      showDialog('error', err.message || 'Failed to update feature');
      setFeatures(features);
      if (onFeaturesChange) onFeaturesChange(features);
    }
  };

  const handleConfigChange = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveConfig = async () => {
    try {
      for (const { key } of CONFIG_KEYS) {
        if (config[key] !== undefined && config[key] !== '') {
          await window.klms.config.set(key, String(config[key]).trim());
        }
      }
      showDialog('success', 'Configuration saved.');
    } catch (err) {
      showDialog('error', err.message || 'Failed to save configuration');
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      showDialog('error', 'New passwords do not match.');
      return;
    }
    if (passwordForm.new.length < 6) {
      showDialog('error', 'New password must be at least 6 characters.');
      return;
    }
    try {
      const result = await window.klms.auth.changePassword(passwordForm.current, passwordForm.new);
      if (result.success) {
        showDialog('success', 'Password changed.');
        setPasswordForm({ current: '', new: '', confirm: '' });
      } else {
        showDialog('error', result.error || 'Failed to change password.');
      }
    } catch (err) {
      showDialog('error', err.message || 'Failed to change password.');
    }
  };

  const handleBackup = async () => {
    try {
      const result = await window.klms.backup.exportDb();
      if (result.canceled) {
        showDialog('info', 'Export cancelled.');
      } else if (result.success) {
        showDialog('success', 'Backup saved to: ' + (result.path || 'selected path'));
      } else {
        showDialog('error', result.error || 'Export failed');
      }
    } catch (err) {
      showDialog('error', err.message || 'Export failed');
    }
  };

  if (loading) return <div className="settings-page"><p>Loading...</p></div>;

  return (
    <div className="settings-page">
      <h2>System Settings</h2>

      {/* Feature Toggle Switches */}
      <section className="settings-section">
        <h3>Feature toggles</h3>
        <p className="muted">Toggle to enable or disable features. Changes apply immediately.</p>
        <div className="toggle-list">
          {FEATURE_KEYS.map(({ key, label }) => (
            <div key={key} className="toggle-row">
              <span className="toggle-label">{label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(features[key])}
                className={`toggle-switch ${features[key] ? 'on' : 'off'}`}
                onClick={() => handleToggle(key, !features[key])}
              >
                <span className="toggle-slider" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Configuration */}
      <section className="settings-section">
        <h3>Configuration</h3>
        <p className="muted">Numeric settings for borrowing and fines.</p>
        <div className="config-grid">
          {CONFIG_KEYS.map(({ key, label }) => (
            <label key={key}>
              {label}
              <input
                type="number"
                min="0"
                value={config[key] ?? ''}
                onChange={(e) => handleConfigChange(key, e.target.value)}
              />
            </label>
          ))}
        </div>
        <button type="button" className="btn-primary" onClick={handleSaveConfig}>
          Save configuration
        </button>
      </section>

      {/* Change password */}
      <section className="settings-section">
        <h3>Change password</h3>
        <div className="config-grid">
          <label>Current password <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))} autoComplete="current-password" /></label>
          <label>New password <input type="password" value={passwordForm.new} onChange={(e) => setPasswordForm((p) => ({ ...p, new: e.target.value }))} autoComplete="new-password" /></label>
          <label>Confirm new password <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))} autoComplete="new-password" /></label>
        </div>
        <button type="button" className="btn-primary" onClick={handleChangePassword}>Change password</button>
      </section>

      {/* Backup */}
      <section className="settings-section">
        <h3>Backup</h3>
        <p className="muted">Export the SQLite database file for manual backup.</p>
        <button type="button" className="btn-primary" onClick={handleBackup}>Export database backup</button>
      </section>

      <AppDialog open={dialog.open} type={dialog.type} message={dialog.message} onClose={closeDialog} />

      <style>{`
        .settings-page h2 { font-size: 1.25rem; margin-bottom: 1rem; }
        .settings-section {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          padding: 1.25rem;
          margin-bottom: 1rem;
        }
        .settings-section h3 { font-size: 1rem; margin-bottom: 0.5rem; }
        .settings-section .muted { color: var(--color-text-muted); font-size: 0.875rem; margin-bottom: 1rem; }
        .toggle-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .toggle-label { font-size: 0.9rem; color: var(--color-text); }
        .toggle-switch {
          flex-shrink: 0;
          width: 44px;
          height: 24px;
          border: none;
          border-radius: 12px;
          background: var(--color-border);
          cursor: pointer;
          position: relative;
          transition: background 0.2s;
        }
        .toggle-switch.on { background: var(--color-primary); }
        .toggle-switch .toggle-slider {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          transition: transform 0.2s;
        }
        .toggle-switch.on .toggle-slider { transform: translateX(20px); }
        .config-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
        .config-grid label { display: block; font-size: 0.875rem; color: var(--color-text-muted); }
        .config-grid input { width: 100%; margin-top: 0.25rem; padding: 0.5rem; border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-bg); color: var(--color-text); }
        .config-grid input[type="number"] { min-width: 0; }
        .btn-primary { background: var(--color-primary); color: #fff; border: none; padding: 0.5rem 1rem; border-radius: var(--radius); font-weight: 600; cursor: pointer; }
        .btn-primary:hover { background: var(--color-primary-hover); }
      `}</style>
    </div>
  );
}
