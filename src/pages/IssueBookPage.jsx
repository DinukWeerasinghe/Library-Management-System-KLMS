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
  const [scanMemberCode, setScanMemberCode] = useState('');
  const [scannedMember, setScannedMember] = useState(null);
  const [scanBookCode, setScanBookCode] = useState('');
  const [scannedBook, setScannedBook] = useState(null);
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

  const handleScanMember = async (code) => {
    setScanMemberCode(code);
    if (code.startsWith('KMV') && code.length >= 17) {
      try {
        const member = await window.klms.members.getByCode(code);
        if (member) {
          setScannedMember(member);
          setSelectedMemberId(member.id.toString());
        } else {
          setScannedMember(null);
        }
      } catch (err) {
        console.error('Scan failed:', err);
      }
    } else if (code === '') {
      setScannedMember(null);
      setSelectedMemberId('');
    }
  };

  const handleManualMemberChange = (id) => {
    setSelectedMemberId(id);
    if (!id) {
      setScannedMember(null);
      setScanMemberCode('');
    } else {
      const member = members.find(m => m.id.toString() === id.toString());
      setScannedMember(member || null);
      if (member) setScanMemberCode(member.member_code || '');
    }
  };

  const handleScanBook = async (code) => {
    setScanBookCode(code);
    if (code.length >= 4) { // Minimally search codes like ISBN or internal BK...
      try {
        const book = await window.klms.books.getByAnyCode(code);
        if (book) {
          if (book.available_copies > 0) {
            setScannedBook(book);
            setSelectedBookId(book.id.toString());
          } else {
            console.warn('Book found but no copies available');
            setScannedBook(null); // Or show a specific error
          }
        } else {
          setScannedBook(null);
        }
      } catch (err) {
        console.error('Book scan failed:', err);
      }
    } else if (code === '') {
      setScannedBook(null);
      setSelectedBookId('');
    }
  };

  const handleManualBookChange = (id) => {
    setSelectedBookId(id);
    if (!id) {
      setScannedBook(null);
      setScanBookCode('');
    } else {
      const book = books.find(b => b.id.toString() === id.toString());
      setScannedBook(book || null);
      if (book) setScanBookCode(book.external_code || book.isbn || book.internal_code || '');
    }
  };

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
      setScanMemberCode('');
      setScannedMember(null);
      setSelectedBookId('');
      setScanBookCode('');
      setScannedBook(null);
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
          <label>Scan Member ID / Barcode</label>
          <div className="scan-input-wrapper">
            <input
              type="text"
              placeholder="Scan or type KMV..."
              value={scanMemberCode}
              onChange={(e) => handleScanMember(e.target.value)}
              className="scan-input"
              autoFocus
            />
            {scannedMember && (
              <div className="scanned-badge">
                <span className="scanned-name">{scannedMember.name}</span>
                <span className="scanned-type">{scannedMember.member_type}</span>
              </div>
            )}
          </div>
        </div>

        <div className="divider-text">OR SELECT MANUALLY</div>

        <div className="form-group">
          <label>Member Selection</label>
          <select
            value={selectedMemberId}
            onChange={(e) => handleManualMemberChange(e.target.value)}
            disabled={submitting}
          >
            <option value="">Select member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.member_code || '–'})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Book Selection</label>
          <div className="scan-input-wrapper" style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>Scan ISBN / KLMS Barcode</label>
            <input
              type="text"
              placeholder="Scan book barcode..."
              value={scanBookCode}
              onChange={(e) => handleScanBook(e.target.value)}
              className="scan-input"
            />
            {scannedBook && (
              <div className="scanned-badge" style={{ borderLeftColor: 'var(--button-color)' }}>
                <span className="scanned-name">{scannedBook.title}</span>
                <span className="scanned-type" style={{ color: 'var(--button-color)', background: 'rgba(var(--button-color-rgb), 0.1)' }}>
                  {scannedBook.available_copies} Available
                </span>
              </div>
            )}
          </div>

          <select
            value={selectedBookId}
            onChange={(e) => handleManualBookChange(e.target.value)}
            disabled={submitting}
          >
            <option value="">Or select book manually</option>
            {availableBooks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} ({b.author || 'No Author'})
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
        .scan-input-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .scan-input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid var(--color-border);
          border-radius: var(--radius);
          background: var(--color-bg);
          color: var(--color-text);
          font-family: monospace;
          font-size: 1rem;
          transition: border-color 0.2s;
        }
        .scan-input:focus {
          border-color: var(--button-color);
          outline: none;
        }
        .scanned-badge {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--color-bg);
          padding: 0.75rem;
          border-radius: var(--radius);
          border-left: 4px solid #10b981;
        }
        .scanned-name { font-weight: 600; font-size: 0.95rem; }
        .scanned-type { font-size: 0.8rem; background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 0.1rem 0.5rem; border-radius: 100px; text-transform: uppercase; }
        
        .divider-text {
          text-align: center;
          font-size: 0.7rem;
          color: var(--color-text-muted);
          margin: 1.5rem 0;
          position: relative;
        }
        .divider-text::before, .divider-text::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 30%;
          height: 1px;
          background: var(--color-border);
        }
        .divider-text::before { left: 0; }
        .divider-text::after { right: 0; }

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
