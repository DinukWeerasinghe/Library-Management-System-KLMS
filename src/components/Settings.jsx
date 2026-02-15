import React, { useState, useEffect } from 'react';

const CONFIG_KEYS = [
  { key: 'max_borrow_days', label: 'Max borrow days', type: 'number' },
  { key: 'max_books_per_member', label: 'Max books per member', type: 'number' },
  { key: 'fine_per_day', label: 'Fine per day', type: 'number' },
  { key: 'grace_period', label: 'Grace period (days)', type: 'number' },
];

const FEATURE_KEYS = [
  { key: 'enable_fine', label: 'Enable fine calculation' },
  { key: 'enable_due_date', label: 'Enable due date tracking' },
  { key: 'enable_renewal', label: 'Allow renewal' },
  { key: 'enable_reports', label: 'Enable reports' },
  { key: 'enable_categories', label: 'Enable book categories' },
  { key: 'enable_borrow_limit', label: 'Enforce borrow limit' },
];

export function Settings({ features: propFeatures, onFeaturesChange }) {
  const [config, setConfig] = useState({});
  const [features, setFeatures] = useState(propFeatures || {});
  const [loading, setLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState('');

  useEffect(() => {
    setFeatures(propFeatures || {});
  }, [propFeatures]);

  useEffect(() => {
    Promise.all([
      window.klms.config.getAll(),
      window.klms.features.getAll(),
    ]).then(([c, f]) => {
      setConfig(c);
      setFeatures(f);
      if (onFeaturesChange) onFeaturesChange(f);
    }).finally(() => setLoading(false));
  }, []);

  const setConfigValue = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const setFeatureValue = (key, enabled) => {
    const next = { ...features, [key]: enabled };
    setFeatures(next);
    if (onFeaturesChange) onFeaturesChange(next);
  };

  const saveConfig = async () => {
    setSaveMsg('');
    try {
      for (const { key } of CONFIG_KEYS) {
        if (config[key] !== undefined) {
          await window.klms.config.set(key, config[key]);
        }
      }
      setSaveMsg('Configuration saved.');
    } catch (err) {
      setSaveMsg('Error: ' + (err.message || 'Failed to save'));
    }
  };

  const saveFeatures = async () => {
    setSaveMsg('');
    try {
      for (const [key, enabled] of Object.entries(features)) {
        await window.klms.features.set(key, enabled);
      }
      setSaveMsg('Feature toggles saved.');
    } catch (err) {
      setSaveMsg('Error: ' + (err.message || 'Failed to save'));
    }
  };

  const changePassword = async () => {
    setPasswordMsg('');
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordMsg('New passwords do not match.');
      return;
    }
    if (passwordForm.new.length < 6) {
      setPasswordMsg('New password must be at least 6 characters.');
      return;
    }
    try {
      const result = await window.klms.auth.changePassword(passwordForm.current, passwordForm.new);
      if (result.success) {
        setPasswordMsg('Password changed.');
        setPasswordForm({ current: '', new: '', confirm: '' });
      } else {
        setPasswordMsg(result.error || 'Failed to change password.');
      }
    } catch (err) {
      setPasswordMsg(err.message || 'Failed to change password.');
    }
  };

  const exportBackup = async () => {
    setBackupMsg('');
    try {
      const result = await window.klms.backup.exportDb();
      if (result.canceled) {
        setBackupMsg('Export cancelled.');
      } else if (result.success) {
        setBackupMsg('Backup saved to: ' + (result.path || 'selected path'));
      } else {
        setBackupMsg('Error: ' + (result.error || 'Export failed'));
      }
    } catch (err) {
      setBackupMsg('Error: ' + (err.message || 'Export failed'));
    }
  };

  if (loading) return <p>Loading settings...</p>;

  return (
    <div className="settings-view">
      <h2>Settings</h2>

      <section className="settings-section">
        <h3>Change password</h3>
        <div className="config-grid">
          <label>Current password <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))} autoComplete="current-password" /></label>
          <label>New password <input type="password" value={passwordForm.new} onChange={(e) => setPasswordForm((p) => ({ ...p, new: e.target.value }))} autoComplete="new-password" /></label>
          <label>Confirm new password <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))} autoComplete="new-password" /></label>
        </div>
        <button type="button" className="btn-primary" onClick={changePassword}>Change password</button>
        {passwordMsg && <p className="msg">{passwordMsg}</p>}
      </section>

      <section className="settings-section">
        <h3>Configuration</h3>
        <div className="config-grid">
          {CONFIG_KEYS.map(({ key, label, type }) => (
            <label key={key}>
              {label}
              <input
                type={type}
                value={config[key] ?? ''}
                onChange={(e) => setConfigValue(key, e.target.value)}
              />
            </label>
          ))}
        </div>
        <button type="button" className="btn-primary" onClick={saveConfig}>Save configuration</button>
      </section>

      <section className="settings-section">
        <h3>Feature toggles</h3>
        <p className="muted">Disable a feature to hide related UI and skip related logic.</p>
        <div className="feature-list">
          {FEATURE_KEYS.map(({ key, label }) => (
            <label key={key} className="feature-row">
              <input
                type="checkbox"
                checked={Boolean(features[key])}
                onChange={(e) => setFeatureValue(key, e.target.checked)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <button type="button" className="btn-primary" onClick={saveFeatures}>Save feature toggles</button>
      </section>

      <section className="settings-section">
        <h3>Backup</h3>
        <p className="muted">Export the SQLite database file for manual backup.</p>
        <button type="button" className="btn-primary" onClick={exportBackup}>Export database backup</button>
        {backupMsg && <p className="msg">{backupMsg}</p>}
      </section>

      {saveMsg && <p className="msg">{saveMsg}</p>}

      <style>{`
        .settings-view h2 { font-size: 1.25rem; margin-bottom: 1rem; }
        .settings-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 1rem; margin-bottom: 1rem; }
        .settings-section h3 { font-size: 1rem; margin-bottom: 0.5rem; }
        .settings-section .muted { color: var(--color-text-muted); font-size: 0.875rem; margin-bottom: 0.75rem; }
        .config-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
        .config-grid label { display: block; font-size: 0.875rem; color: var(--color-text-muted); }
        .config-grid input { width: 100%; margin-top: 0.25rem; padding: 0.4rem; border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-bg); color: var(--color-text); }
        .feature-list { margin-bottom: 1rem; }
        .feature-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; cursor: pointer; }
        .feature-row input { width: auto; }
        .btn-primary { background: var(--color-primary); color: #fff; border: none; padding: 0.5rem 1rem; border-radius: var(--radius); font-weight: 600; }
        .btn-primary:hover { background: var(--color-primary-hover); }
        .msg { margin-top: 0.5rem; font-size: 0.875rem; color: var(--color-text-muted); }
      `}</style>
    </div>
  );
}
