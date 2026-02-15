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

  return (
    <div className="return-book-page">
      <h2>Return Book</h2>
      <p className="subtitle">View issued books and process returns</p>

      <div className="issued-list-card">
        <h3>Issued Books</h3>
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
          background: var(--color-success);
          color: #fff;
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
      `}</style>
    </div>
  );
}
