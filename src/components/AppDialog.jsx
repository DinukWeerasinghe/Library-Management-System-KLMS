import React from 'react';

/**
 * Common dialog for success, error, and info messages.
 * @param {boolean} open - Whether dialog is visible
 * @param {'success'|'error'|'info'} type - Message type
 * @param {string} message - Message text
 * @param {function} onClose - Called when user dismisses (e.g. OK click or backdrop)
 */
export function AppDialog({ open, type = 'info', title: propTitle, message = '', onClose, onConfirm }) {
  if (!open) return null;

  const titles = {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    confirm: 'Please Confirm',
    info: 'Information',
    loading: 'Processing...',
  };
  const title = propTitle || titles[type] || 'Message';

  return (
    <div className="app-dialog-overlay" onClick={type === 'loading' ? undefined : onClose} role="presentation">
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

        {type === 'loading' && (
          <div className="spinner-container">
            <div className="spinner"></div>
          </div>
        )}

        <p id="app-dialog-message" className="app-dialog-message">
          {message}
        </p>

        <div className="app-dialog-actions">
          {type === 'confirm' ? (
            <>
              <button type="button" className="btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn-confirm" onClick={onConfirm}>
                Confirm
              </button>
            </>
          ) : (
            type !== 'loading' && (
              <button type="button" className="app-dialog-ok" onClick={onClose}>
                OK
              </button>
            )
          )}
        </div>
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
        .app-dialog--warning { border-left: 4px solid var(--color-warning); }
        .app-dialog--confirm { border-left: 4px solid var(--color-primary); }
        .app-dialog--info { border-left: 4px solid var(--color-primary); }
        .app-dialog--loading { border-left: 4px solid var(--color-warning); }
        .app-dialog-title {
          font-size: 1rem;
          margin-bottom: 0.5rem;
          color: var(--color-text);
        }
        .app-dialog--success .app-dialog-title { color: var(--color-success); }
        .app-dialog--error .app-dialog-title { color: var(--color-danger); }
        .app-dialog--warning .app-dialog-title { color: var(--color-warning); }
        .app-dialog--confirm .app-dialog-title { color: var(--color-primary); }
        .app-dialog--info .app-dialog-title { color: var(--color-primary); }
        .app-dialog--loading .app-dialog-title { color: var(--color-warning); }
        .spinner-container {
          display: flex;
          justify-content: center;
          padding: 1rem 0;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          border-top-color: var(--color-primary);
          animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .app-dialog-message {
          font-size: 0.9rem;
          color: var(--color-text-muted);
          margin-bottom: 1.25rem;
          line-height: 1.4;
        }
        .app-dialog-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }
        .app-dialog-ok, .btn-confirm {
          flex: 1;
          padding: 0.6rem 1rem;
          background: var(--button-color);
          color: var(--header-text-color);
          border: none;
          border-radius: var(--radius);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-cancel {
          flex: 1;
          padding: 0.6rem 1rem;
          background: var(--color-surface-hover);
          color: var(--color-text);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .app-dialog-ok:hover, .btn-confirm:hover { background: var(--button-hover-color); transform: translateY(-1px); }
        .btn-cancel:hover { background: var(--color-border); }
      `}</style>
    </div>
  );
}
