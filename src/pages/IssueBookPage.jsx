import React, { useState, useEffect } from 'react';
import { AppDialog } from '../components/AppDialog';

/**
 * Issue Book (Lending) screen.
 * - Member dropdown, Book dropdown (available only), Issue button.
 * - Due date preview only if enable_due_date; borrow limit warning only if enable_borrow_limit.
 */
export function IssueBookPage({ features = {}, config = {} }) {
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState({ open: false, type: 'info', message: '' });

  const showDialog = (type, message) => setDialog({ open: true, type, message });
  const closeDialog = () => setDialog((d) => ({ ...d, open: false }));

  const loadData = () => {
    setLoading(true);
    Promise.all([
      window.klms.members.getAll({}),
      window.klms.books.getAll({}),
    ])
      .then(([m, b]) => {
        setMembers(m);
        setBooks(b);
      })
      .catch(() => showDialog('error', 'Failed to load data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const availableBooks = books.filter((b) => b.available_copies > 0);
  const maxBorrowDays = parseInt(config.max_borrow_days, 10) || 14;
  const maxBooksPerMember = parseInt(config.max_books_per_member, 10) || 3;
  const showDueDatePreview = Boolean(features.enable_due_date);
  const showBorrowLimitWarning = Boolean(features.enable_borrow_limit);

  const handleIssue = async () => {
    const memberId = parseInt(selectedMemberId, 10);
    const bookId = parseInt(selectedBookId, 10);
    if (!memberId || !bookId) {
      showDialog('error', 'Please select a member and a book');
      return;
    }

    setSubmitting(true);
    try {
      await window.klms.issues.issueBook(memberId, bookId);
      showDialog('success', 'Book issued successfully');
      setSelectedMemberId('');
      setSelectedBookId('');
      loadData();
    } catch (err) {
      const msg = err.message || 'Issue failed';
      if (msg.includes('not available')) {
        showDialog('error', 'Book not available');
      } else if (msg.includes('Borrow limit exceeded')) {
        showDialog('error', 'Borrow limit exceeded');
      } else {
        showDialog('error', msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="issue-book-page"><p>Loading...</p></div>;
  }

  return (
    <div className="issue-book-page">
      <h2>Issue Book</h2>
      <p className="subtitle">Lend a book to a member</p>

      <div className="issue-form-card">
        <div className="form-group">
          <label>Member</label>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            disabled={submitting}
          >
            <option value="">Select member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.member_type})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Book (available copies only)</label>
          <select
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
            disabled={submitting}
          >
            <option value="">Select book</option>
            {availableBooks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} {b.author ? `– ${b.author}` : ''} ({b.available_copies} available)
              </option>
            ))}
          </select>
          {availableBooks.length === 0 && (
            <p className="hint">No books available to issue.</p>
          )}
        </div>

        {showDueDatePreview && (
          <p className="preview">Due date will be <strong>{maxBorrowDays}</strong> days from today.</p>
        )}

        {showBorrowLimitWarning && (
          <p className="warning-hint">Max <strong>{maxBooksPerMember}</strong> books per member.</p>
        )}

        <button
          type="button"
          className="btn-issue"
          onClick={handleIssue}
          disabled={submitting || !selectedMemberId || !selectedBookId}
        >
          {submitting ? 'Issuing...' : 'Issue Book'}
        </button>
      </div>

      <AppDialog
        open={dialog.open}
        type={dialog.type}
        message={dialog.message}
        onClose={closeDialog}
      />

      <style>{`
        .issue-book-page { max-width: 480px; }
        .issue-book-page h2 { font-size: 1.25rem; margin-bottom: 0.25rem; }
        .issue-book-page .subtitle { color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
        .issue-form-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          padding: 1.5rem;
        }
        .issue-form-card .form-group { margin-bottom: 1rem; }
        .issue-form-card .form-group label {
          display: block;
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin-bottom: 0.35rem;
        }
        .issue-form-card .form-group select {
          width: 100%;
          padding: 0.6rem 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          background: var(--color-bg);
          color: var(--color-text);
        }
        .issue-form-card .form-group select:focus {
          outline: none;
          border-color: var(--color-primary);
        }
        .issue-form-card .hint { color: var(--color-text-muted); font-size: 0.85rem; margin-top: 0.35rem; }
        .issue-form-card .preview { font-size: 0.875rem; color: var(--color-text-muted); margin-bottom: 0.5rem; }
        .issue-form-card .warning-hint { font-size: 0.875rem; color: var(--color-warning); margin-bottom: 0.5rem; }
        .issue-form-card .btn-issue {
          width: 100%;
          padding: 0.65rem;
          background: var(--button-color);
          color: var(--header-text-color);
          border: none;
          border-radius: var(--radius);
          font-weight: 600;
          cursor: pointer;
        }
        .issue-form-card .btn-issue:hover:not(:disabled) { background: var(--button-hover-color); }
        .issue-form-card .btn-issue:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
