import React, { useState, useEffect } from 'react';
import { DialogService } from '../services/DialogService';
import { Upload, Download, Database, History, RotateCcw, Info } from 'lucide-react';

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
  { key: 'registration_fee', label: 'Registration Fee' },
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

const EXIT_PIN_KEYS = [
  { key: 'exit_pin_enabled', label: 'Enable Exit PIN Security', type: 'toggle' },
  { key: 'exit_pin', label: 'Application Exit PIN', type: 'text' },
];

export function SettingsPage({ features: propFeatures, onFeaturesChange, session }) {
  const [config, setConfig] = useState({});
  const [features, setFeatures] = useState(propFeatures || {});
  const [theme, setTheme] = useState({});
  const [loading, setLoading] = useState(true);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [importHistory, setImportHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [version, setVersion] = useState({ version_name: '...', version_code: '' });

  const isAdmin = session?.role === 'ADMIN';

  useEffect(() => {
    setFeatures(propFeatures || {});
  }, [propFeatures]);

  useEffect(() => {
    Promise.all([
      window.klms.config.getAll(),
      window.klms.features.getAll(),
      window.klms.branding.getTheme(),
      window.klms.app.getVersion(),
    ])
      .then(([c, f, t, v]) => {
        setConfig(c || {});
        setFeatures(f || {});
        setTheme(t || {});
        setVersion(v || { version_name: 'Unknown', version_code: 0 });
        if (onFeaturesChange) onFeaturesChange(f);
      })
      .catch(() => DialogService.showError('Failed to load settings'))
      .finally(() => setLoading(false));

    if (isAdmin) {
      loadImportHistory();
    }
  }, [isAdmin]);

  const loadImportHistory = async () => {
    setHistoryLoading(true);
    try {
      const history = await window.klms.import.getHistory();
      setImportHistory(history || []);
    } catch (err) {
      console.error('Failed to load import history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

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
      DialogService.showError(err.message || 'Failed to update feature');
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
      DialogService.showSuccess('Configuration saved.');
    } catch (err) {
      DialogService.showError(err.message || 'Failed to save configuration');
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
      DialogService.showSuccess('Branding settings saved.');
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
      DialogService.showError(err.message || 'Failed to save branding');
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
      DialogService.showError('New passwords do not match.');
      return;
    }
    if (passwordForm.new.length < 6) {
      DialogService.showError('New password must be at least 6 characters.');
      return;
    }
    try {
      const result = await window.klms.auth.changePassword(passwordForm.current, passwordForm.new);
      if (result.success) {
        DialogService.showSuccess('Password changed.');
        setPasswordForm({ current: '', new: '', confirm: '' });
      } else {
        DialogService.showError(result.error || 'Failed to change password.');
      }
    } catch (err) {
      DialogService.showError(err.message || 'Failed to change password.');
    }
  };

  const handleRollback = async (batchId) => {
    const confirmed = await DialogService.confirm(
      'Rollback Import',
      'Are you sure you want to rollback this import? All items added in this batch will be permanently deleted.'
    );
    if (!confirmed) return;

    try {
      const result = await window.klms.import.rollback(batchId);
      if (result.success) {
        DialogService.showSuccess('Import rolled back successfully.');
        loadImportHistory();
      } else {
        DialogService.showError(result.error || 'Failed to rollback import.');
      }
    } catch (err) {
      DialogService.showError(err.message || 'Rollback failed. Some items may have active history.');
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

      {/* Application Security Settings (Admin Only) */}
      {isAdmin && (
        <section className="settings-section">
          <h3>Application Security</h3>
          <p className="muted">Require a PIN to close the application.</p>
          <div className="toggle-list">
            <div className="toggle-row">
              <span className="toggle-label">Enable Exit PIN</span>
              <button
                type="button"
                role="switch"
                aria-checked={config.exit_pin_enabled === '1'}
                className={`toggle-switch ${config.exit_pin_enabled === '1' ? 'on' : 'off'}`}
                onClick={() => window.klms.config.set('exit_pin_enabled', config.exit_pin_enabled === '1' ? '0' : '1').then(() => setConfig(prev => ({ ...prev, exit_pin_enabled: config.exit_pin_enabled === '1' ? '0' : '1' })))}
              >
                <span className="toggle-slider" />
              </button>
            </div>
          </div>
          {config.exit_pin_enabled === '1' && (
            <div className="config-grid" style={{ marginTop: '1rem' }}>
              <label>
                Set Exit PIN (Numeric)
                <input
                  type="number"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="Enter Numeric PIN"
                  value={config.exit_pin || ''}
                  onChange={(e) => handleConfigChange('exit_pin', e.target.value)}
                />
              </label>
              <button type="button" className="btn-primary" style={{ alignSelf: 'flex-end', height: '40px' }} onClick={() => window.klms.config.set('exit_pin', config.exit_pin).then(() => DialogService.showSuccess('Exit PIN saved.'))}>
                Save PIN
              </button>
            </div>
          )}
        </section>
      )}

      {/* Session Security Settings */}
      <section className="settings-section">
        <h3>Session Security</h3>
        <p className="muted">Configure automatic and manual session locking.</p>
        <div className="toggle-list">
          <div className="toggle-row">
            <span className="toggle-label">Enable Auto Lock</span>
            <button
              type="button"
              role="switch"
              aria-checked={config.lock_enabled === '1'}
              className={`toggle-switch ${config.lock_enabled === '1' ? 'on' : 'off'}`}
              onClick={() => window.klms.config.set('lock_enabled', config.lock_enabled === '1' ? '0' : '1').then(() => setConfig(prev => ({ ...prev, lock_enabled: config.lock_enabled === '1' ? '0' : '1' })))}
            >
              <span className="toggle-slider" />
            </button>
          </div>
        </div>

        <div className="config-grid" style={{ marginTop: '1rem' }}>
          <label>
            Timeout (minutes)
            <input
              type="number"
              min="1"
              max="60"
              value={config.lock_timeout_minutes || '5'}
              onChange={(e) => handleConfigChange('lock_timeout_minutes', e.target.value)}
            />
          </label>
          <label>
            Lock PIN
            <input
              type="number"
              pattern="[0-9]*"
              inputMode="numeric"
              placeholder="1111"
              value={config.lock_pin || ''}
              onChange={(e) => handleConfigChange('lock_pin', e.target.value)}
            />
          </label>
        </div>
        <button type="button" className="btn-primary" onClick={() => {
          Promise.all([
            window.klms.config.set('lock_timeout_minutes', config.lock_timeout_minutes),
            window.klms.config.set('lock_pin', config.lock_pin)
          ]).then(() => DialogService.showSuccess('Session security settings saved.'));
        }}>
          Save Session Settings
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

      {/* Data & Storage */}
      <section className="settings-section">
        <h3 className="flex items-center gap-2">
          <Database size={20} className="text-[var(--primary-color)]" />
          Data & Storage
        </h3>
        <p className="muted">Manage your library database backups.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Backup */}
          <div className="p-4 rounded border border-[var(--color-border)] bg-[var(--background-color)]">
            <h4 className="font-medium mb-2">Backup Database</h4>
            <p className="text-sm muted mb-4">Export a copy of your data to a safe location.</p>
            <button
              type="button"
              className="btn-primary w-full flex items-center justify-center gap-2"
              onClick={async () => {
                try {
                  if (window.klms?.backup?.create) {
                    const res = await window.klms.backup.create();
                    if (res && res.success) DialogService.showSuccess('Backup created successfully!');
                  } else {
                    console.error('Backup API not found');
                  }
                } catch (err) {
                  DialogService.showError('Backup failed');
                }
              }}
            >
              <Download size={16} />
              Export Backup
            </button>
          </div>

          {/* Restore */}
          <div className="p-4 rounded border border-[var(--color-border)] bg-[var(--background-color)]">
            <h4 className="font-medium mb-2">Restore Database</h4>
            <p className="text-sm muted mb-4">Restore from a file. App will restart.</p>
            <button
              type="button"
              className="btn-primary w-full flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--secondary-color)' }}
              onClick={async () => {
                try {
                  if (window.klms?.backup?.restore) {
                    await window.klms.backup.restore();
                  } else {
                    console.error('Backup API not found');
                  }
                } catch (err) {
                  console.error(err);
                }
              }}
            >
              <Upload size={16} />
              Restore Data
            </button>
          </div>
        </div>
      </section>

      {/* Import History (Admin Only) */}
      {isAdmin && (
        <section className="settings-section">
          <h3 className="flex items-center gap-2">
            <History size={20} className="text-[var(--primary-color)]" />
            Import History & Rollback
          </h3>
          <p className="muted">Review previous bulk imports and rollback if necessary.</p>

          {historyLoading ? (
            <p>Loading history...</p>
          ) : importHistory.length === 0 ? (
            <p className="muted text-center py-8 bg-[var(--color-bg)] rounded border border-dashed border-[var(--color-border)]">
              No import history found.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {importHistory.map(batch => (
                <div key={batch.id} className="p-4 rounded border border-[var(--color-border)] bg-[var(--background-color)] flex flex-col gap-3 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${batch.type === 'BOOK' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                          {batch.type} IMPORT
                        </span>
                        <span className="text-xs muted">#{batch.id}</span>
                      </div>
                      <h4 className="font-semibold text-sm">{batch.row_count} records processed</h4>
                    </div>
                    <button
                      className="rollback-btn"
                      title="Rollback this import"
                      onClick={() => handleRollback(batch.id)}
                    >
                      <RotateCcw size={14} />
                      Rollback
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs muted mt-auto pt-2 border-t border-[var(--color-border)] border-opacity-50">
                    <span className="flex items-center gap-1">
                      <History size={12} />
                      {new Date(batch.created_at).toLocaleDateString()}
                    </span>
                    <span>{new Date(batch.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* About / Version Info */}
      <section className="settings-section">
        <h3 className="flex items-center gap-2">
          <Info size={20} className="text-[var(--primary-color)]" />
          About
        </h3>
        <p className="muted">Application version and build information.</p>
        
        <div className="version-info" style={{ marginTop: '1rem' }}>
          <div className="version-item">
            <span className="version-label">Version:</span>
            <span className="version-value">{version.version_name || 'Unknown'}</span>
          </div>
          {version.version_code && (
            <div className="version-item">
              <span className="version-label">Version Code:</span>
              <span className="version-value">{version.version_code}</span>
            </div>
          )}
        </div>
      </section>

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
        .rollback-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.75rem;
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .rollback-btn:hover {
          background: #fecaca;
          color: #b91c1c;
          transform: translateY(-1px);
        }
        .version-info {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem;
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
        }
        .version-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--color-border);
        }
        .version-item:last-child {
          border-bottom: none;
        }
        .version-label {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          font-weight: 500;
        }
        .version-value {
          font-size: 0.875rem;
          color: var(--color-text);
          font-weight: 600;
          font-family: monospace;
        }
      `}</style>
    </div>
  );
}
