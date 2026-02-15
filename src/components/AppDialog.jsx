import React from 'react';

/**
 * Common dialog for success, error, and info messages.
 * @param {boolean} open - Whether dialog is visible
 * @param {'success'|'error'|'info'} type - Message type
 * @param {string} message - Message text
 * @param {function} onClose - Called when user dismisses (e.g. OK click or backdrop)
 */
export function AppDialog({ open, type = 'info', message = '', onClose }) {
  if (!open) return null;

  const titles = {
    success: 'Success',
    error: 'Error',
    info: 'Information',
  };
  const title = titles[type] || 'Message';

  return (
    <div className="app-dialog-overlay" onClick={onClose} role="presentation">
      <div
        className={`app-dialog app-dialog--${type}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="app-dialog-title"
        aria-describedby="app-dialog-message"
      >
        <h3 id="app-dialog-title" className="app-dialog-title">
          {title}
        </h3>
        <p id="app-dialog-message" className="app-dialog-message">
          {message}
        </p>
        <button type="button" className="app-dialog-ok" onClick={onClose}>
          OK
        </button>
      </div>
      <style>{`
        .app-dialog-overlay {
          position: fixed;
          inset: 0;
          background: var(--overlay-color);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .app-dialog {
          min-width: 320px;
          max-width: 420px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          padding: 1.25rem;
          box-shadow: var(--shadow);
        }
        .app-dialog--success { border-left: 4px solid var(--color-success); }
        .app-dialog--error { border-left: 4px solid var(--color-danger); }
        .app-dialog--info { border-left: 4px solid var(--color-primary); }
        .app-dialog-title {
          font-size: 1rem;
          margin-bottom: 0.5rem;
          color: var(--color-text);
        }
        .app-dialog--success .app-dialog-title { color: var(--color-success); }
        .app-dialog--error .app-dialog-title { color: var(--color-danger); }
        .app-dialog--info .app-dialog-title { color: var(--color-primary); }
        .app-dialog-message {
          font-size: 0.9rem;
          color: var(--color-text-muted);
          margin-bottom: 1rem;
          line-height: 1.4;
        }
        .app-dialog-ok {
          width: 100%;
          padding: 0.5rem 1rem;
          background: var(--button-color);
          color: var(--header-text-color);
          border: none;
          border-radius: var(--radius);
          font-weight: 600;
          cursor: pointer;
        }
        .app-dialog-ok:hover { background: var(--button-hover-color); }
      `}</style>
    </div>
  );
}
