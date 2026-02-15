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

const BRANDING_KEYS = [
  { key: 'primary_color', label: 'Primary Color', type: 'color' },
  { key: 'secondary_color', label: 'Secondary Color', type: 'color' },
  { key: 'sidebar_color', label: 'Sidebar Color', type: 'color' },
  { key: 'button_color', label: 'Button Color', type: 'color' },
  { key: 'button_hover_color', label: 'Button Hover Color', type: 'color' },
  { key: 'header_text_color', label: 'Header Text Color', type: 'color' },
  { key: 'background_color', label: 'Background Color', type: 'color' },
  { key: 'school_name', label: 'School Name', type: 'text' },
];

export function SettingsPage({ features: propFeatures, onFeaturesChange, session }) {
  const [config, setConfig] = useState({});
  const [features, setFeatures] = useState(propFeatures || {});
  const [theme, setTheme] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, type: 'info', message: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  const isAdmin = session?.role === 'ADMIN';

  const showDialog = (type, message) => setDialog({ open: true, type, message });
  const closeDialog = () => setDialog((d) => ({ ...d, open: false }));

  useEffect(() => {
    setFeatures(propFeatures || {});
  }, [propFeatures]);

  useEffect(() => {
    Promise.all([
      window.klms.config.getAll(),
      window.klms.features.getAll(),
      window.klms.branding.getTheme(),
    ])
      .then(([c, f, t]) => {
        setConfig(c || {});
        setFeatures(f || {});
        setTheme(t || {});
        if (onFeaturesChange) onFeaturesChange(f);
      })
      .catch(() => showDialog('error', 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  // Apply theme preview
  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    if (theme.primaryColor) root.style.setProperty('--color-primary', theme.primaryColor);
    if (theme.secondaryColor) root.style.setProperty('--color-secondary', theme.secondaryColor);
    if (theme.sidebarColor) root.style.setProperty('--sidebar-bg', theme.sidebarColor);
    if (theme.buttonColor) root.style.setProperty('--btn-bg', theme.buttonColor);
    if (theme.buttonHoverColor) root.style.setProperty('--btn-hover', theme.buttonHoverColor);
    if (theme.headerTextColor) root.style.setProperty('--header-text', theme.headerTextColor);
    if (theme.backgroundColor) root.style.setProperty('--color-bg', theme.backgroundColor);
  }, [theme]);

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

  const handleThemeChange = (key, value) => {
    setTheme(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveBranding = async () => {
    window.klms.log.info('Starting branding save...');
    try {
      const keysMap = {
        primaryColor: 'primary_color',
        secondaryColor: 'secondary_color',
        sidebarColor: 'sidebar_color',
        buttonColor: 'button_color',
        buttonHoverColor: 'button_hover_color',
        headerTextColor: 'header_text_color',
        backgroundColor: 'background_color',
        schoolName: 'school_name',
        schoolLogo: 'school_logo'
      };

      for (const [camel, snake] of Object.entries(keysMap)) {
        if (theme[camel] !== undefined) {
          window.klms.log.info(`Saving branding config: ${snake} = ${theme[camel] ? (theme[camel].length > 50 ? theme[camel].substring(0, 50) + '...' : theme[camel]) : 'null'}`);
          await window.klms.config.set(snake, theme[camel]);
        }
      }
      window.klms.log.info('All branding settings sent to main process.');
      showDialog('success', 'Branding settings saved.');
      // Apply branding without reload: dispatch event so renderer components update live
      try {
        const brandingDetail = {
          schoolLogo: theme.schoolLogo || null,
          schoolName: theme.schoolName || null,
        };
        document.dispatchEvent(new CustomEvent('klms:branding-updated', { detail: brandingDetail }));
      } catch (e) {
        // no-op
      }
    } catch (err) {
      window.klms.log.error(`Branding save FAILED: ${err.message}`);
      showDialog('error', err.message || 'Failed to save branding');
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      handleThemeChange('schoolLogo', event.target.result);
    };
    reader.readAsDataURL(file);
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

      {/* Branding (Admin Only) */}
      {isAdmin && (
        <section className="settings-section">
          <h3>System Branding</h3>
          <p className="muted">Customize the look and feel of your library system.</p>

          <div className="branding-grid">
            {BRANDING_KEYS.map(({ key, label, type }) => {
              const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
              return (
                <div key={key} className="branding-item">
                  <label>{label}</label>
                  <input
                    type={type}
                    value={theme[camelKey] || ''}
                    onChange={(e) => handleThemeChange(camelKey, e.target.value)}
                  />
                </div>
              );
            })}

            <div className="branding-item">
              <label>School Logo</label>
              <div className="logo-preview-container">
                {theme.schoolLogo && (
                  <img src={theme.schoolLogo} alt="Logo Preview" className="logo-preview-img" />
                )}
                <input type="file" accept="image/*" onChange={handleLogoUpload} />
              </div>
            </div>
          </div>

          <button type="button" className="btn-primary" onClick={handleSaveBranding}>
            Save branding
          </button>
        </section>
      )}

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
          background: var(--header-text-color);
          box-shadow: 0 1px 3px var(--overlay-light);
          transition: transform 0.2s;
        }
        .toggle-switch.on .toggle-slider { transform: translateX(20px); }
        .config-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
        .config-grid label { display: block; font-size: 0.875rem; color: var(--color-text-muted); }
        .config-grid input { width: 100%; margin-top: 0.25rem; padding: 0.5rem; border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-bg); color: var(--color-text); }
        .config-grid input[type="number"] { min-width: 0; }
        .branding-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .branding-item label { display: block; font-size: 0.875rem; color: var(--color-text-muted); margin-bottom: 0.25rem; }
        .branding-item input { width: 100%; padding: 0.5rem; border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-bg); color: var(--color-text); }
        .branding-item input[type="color"] { height: 40px; padding: 2px; cursor: pointer; }
        .logo-preview-container { display: flex; align-items: center; gap: 1rem; margin-top: 0.25rem; }
        .logo-preview-img { height: 40px; border-radius: 4px; border: 1px solid var(--color-border); }
        .btn-primary { background: var(--button-color); color: var(--header-text-color); border: none; padding: 0.5rem 1rem; border-radius: var(--radius); font-weight: 600; cursor: pointer; }
        .btn-primary:hover { background: var(--button-hover-color); }
      `}</style>
    </div>
  );
}
