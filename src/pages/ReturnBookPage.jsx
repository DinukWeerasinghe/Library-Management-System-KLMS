import React, { useState, useEffect } from 'react';
import { AppDialog } from '../components/AppDialog';

/**
 * Return Book screen.
 * - List of issued books (status = ISSUED): Member, Book, Issue Date, Due Date, Return, Renew (if enabled).
 * - After return, show fine amount if enable_fine and fine > 0.
 */
export function ReturnBookPage({ features = {} }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, type: 'info', message: '' });
  const [returningId, setReturningId] = useState(null);
  const [renewingId, setRenewingId] = useState(null);
  const [scanCode, setScanCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastReturn, setLastReturn] = useState(null);
  const showRenew = Boolean(features.enable_renewal);
  const showFine = Boolean(features.enable_fine);

  const showDialog = (type, message) => setDialog({ open: true, type, message });
  const closeDialog = () => setDialog((d) => ({ ...d, open: false }));

  const loadIssued = () => {
    setLoading(true);
    window.klms.issues
      .getAll({ status: 'ISSUED' })
      .then(setIssues)
      .catch(() => showDialog('error', 'Failed to load issued books'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadIssued();
  }, []);

  const handleReturn = async (issueId) => {
    setReturningId(issueId);
    try {
      const issue = await window.klms.issues.returnBook(issueId);
      if (showFine && issue.fine_amount > 0) {
        showDialog('info', `Book returned successfully. Fine amount: ${issue.fine_amount}`);
      } else {
        showDialog('success', 'Book returned successfully');
      }
      loadIssued();
    } catch (err) {
      showDialog('error', err.message || 'Return failed');
    } finally {
      setReturningId(null);
    }
  };

  const handleRenew = async (issueId) => {
    if (!showRenew) return;
    setRenewingId(issueId);
    try {
      await window.klms.issues.renewBook(issueId);
      showDialog('success', 'Due date extended successfully');
      loadIssued();
    } catch (err) {
      showDialog('error', err.message || 'Renew failed');
    } finally {
      setRenewingId(null);
    }
  };

  const handleScan = async (code) => {
    setScanCode(code);
    // ISBNs are 10 or 13 chars, BK codes are 17. 
    // Trigger automatically if it looks like a full code or on Enter.
    if (code.length >= 10) {
      processScan(code);
    }
  };

  const processScan = async (code) => {
    if (!code) return;
    setScanning(true);
    setLastReturn(null);
    try {
      const issue = await window.klms.issues.returnBookByAnyCode(code);
      setLastReturn(issue);
      setScanCode('');
      loadIssued();
    } catch (err) {
      showDialog('error', err.message || 'Scan return failed');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="return-book-page">
      <h2>Return Book</h2>
      <p className="subtitle">View issued books and process returns</p>

      <div className="scan-return-card">
        <div className="form-group">
          <label>Scan Book to Return</label>
          <div className="scan-input-wrapper">
            <input
              type="text"
              placeholder="Scan ISBN, Publisher Barcode or KLMS Code..."
              value={scanCode}
              onChange={(e) => handleScan(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && processScan(scanCode)}
              className="scan-input"
              autoFocus
              disabled={scanning}
            />
            {scanning && <span className="scanning-loader">Processing...</span>}
          </div>
          <p className="help-text">System supports ISBN, Publisher Barcodes, and KLMS Internal Codes.</p>
        </div>
      </div>

      {lastReturn && (
        <div className="return-success-card">
          <div className="success-header">
            <span className="success-icon">✓</span>
            <div>
              <h3>Book Returned Successfully</h3>
              <p className="success-date">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
          <div className="success-details">
            <div className="detail-item">
              <span className="detail-label">Book Title</span>
              <span className="detail-value">{lastReturn.book_title}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Member Name</span>
              <span className="detail-value">{lastReturn.member_name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Fine Amount</span>
              <span className="detail-value fine">{lastReturn.fine_amount > 0 ? `LKR ${lastReturn.fine_amount.toFixed(2)}` : 'No Fine'}</span>
            </div>
          </div>
          <button className="btn-close-success" onClick={() => setLastReturn(null)}>Dismiss</button>
        </div>
      )}

      <div className="issued-list-card">
        <h3>Currently Issued Books</h3>
        {loading ? (
          <p>Loading...</p>
        ) : issues.length === 0 ? (
          <p className="empty">No books currently issued.</p>
        ) : (
          <table className="issued-table">
            <thead>
              <tr>
                <th>Member Name</th>
                <th>Book Title</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((i) => (
                <tr key={i.id}>
                  <td>{i.member_name} ({i.member_type})</td>
                  <td>{i.book_title}</td>
                  <td>{i.issue_date}</td>
                  <td>{i.due_date || '–'}</td>
                  <td className="actions">
                    <button
                      type="button"
                      className="btn-return"
                      onClick={() => handleReturn(i.id)}
                      disabled={returningId !== null}
                    >
                      {returningId === i.id ? 'Returning...' : 'Return'}
                    </button>
                    {showRenew && (
                      <button
                        type="button"
                        className="btn-renew"
                        onClick={() => handleRenew(i.id)}
                        disabled={renewingId !== null}
                      >
                        {renewingId === i.id ? 'Renewing...' : 'Renew'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AppDialog
        open={dialog.open}
        type={dialog.type}
        message={dialog.message}
        onClose={closeDialog}
      />

      <style>{`
        .return-book-page { }
        .return-book-page h2 { font-size: 1.25rem; margin-bottom: 0.25rem; }
        .return-book-page .subtitle { color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 1rem; }
        .issued-list-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          padding: 1rem;
          overflow-x: auto;
        }
        .issued-list-card h3 { font-size: 1rem; margin-bottom: 0.75rem; }
        .issued-list-card .empty { color: var(--color-text-muted); padding: 0.5rem 0; }
        .issued-table { width: 100%; border-collapse: collapse; }
        .issued-table th, .issued-table td {
          padding: 0.5rem 0.75rem;
          text-align: left;
          border-bottom: 1px solid var(--color-border);
        }
        .issued-table th { color: var(--color-text-muted); font-weight: 600; font-size: 0.875rem; }
        .issued-table .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .issued-table .btn-return {
          padding: 0.35rem 0.65rem;
          background: var(--button-color);
          color: var(--header-text-color);
          border: none;
          border-radius: var(--radius);
          font-size: 0.85rem;
          cursor: pointer;
        }
        .issued-table .btn-return:hover:not(:disabled) { filter: brightness(1.1); }
        .issued-table .btn-return:disabled { opacity: 0.7; cursor: not-allowed; }
        .issued-table .btn-renew {
          padding: 0.35rem 0.65rem;
          background: var(--color-surface-hover);
          color: var(--color-text);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          font-size: 0.85rem;
          cursor: pointer;
        }
        .issued-table .btn-renew:hover:not(:disabled) { background: var(--color-border); }
        .issued-table .btn-renew:disabled { opacity: 0.7; cursor: not-allowed; }

        .scan-return-card {
          background: var(--color-surface);
          border: 1px solid var(--button-color);
          border-radius: var(--radius);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 12px rgba(var(--button-color-rgb), 0.1);
        }
        .scan-return-card .form-group { margin-bottom: 0; }
        .scan-return-card label { display: block; font-weight: 600; margin-bottom: 0.5rem; color: var(--button-color); }
        .scan-input-wrapper { display: flex; align-items: center; gap: 1rem; position: relative; }
        .scan-input {
          flex: 1;
          padding: 1rem;
          font-size: 1.1rem;
          border: 2px solid var(--color-border);
          border-radius: var(--radius);
          background: var(--color-bg);
          color: var(--color-text);
          font-family: monospace;
        }
        .scan-input:focus { border-color: var(--button-color); outline: none; }
        .scanning-loader { font-size: 0.85rem; color: var(--button-color); font-weight: 600; }
        .help-text { font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.5rem; }

        .return-success-card {
          background: #ecfdf5;
          border: 1px solid #10b981;
          border-radius: var(--radius);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          animation: slideDown 0.3s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .success-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
        .success-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: #10b981;
          color: white;
          border-radius: 50%;
          font-size: 1.5rem;
        }
        .success-header h3 { color: #065f46; margin: 0; font-size: 1.1rem; }
        .success-date { font-size: 0.75rem; color: #047857; margin: 0; }
        
        .success-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1.5rem; margin-bottom: 1rem; }
        .detail-item { display: flex; flex-direction: column; }
        .detail-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #047857; margin-bottom: 0.25rem; font-weight: 600; }
        .detail-value { font-size: 0.95rem; color: #065f46; font-weight: 600; }
        .detail-value.fine { color: #b91c1c; }
        
        .btn-close-success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid #10b981;
          color: #047857;
          padding: 0.4rem 1rem;
          border-radius: var(--radius);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-close-success:hover { background: #10b981; color: white; }
      `}</style>
    </div>
  );
}
