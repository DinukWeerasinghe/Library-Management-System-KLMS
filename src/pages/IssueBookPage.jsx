import React, { useState, useEffect } from 'react';
import { DialogService } from '../services/DialogService';
import { useScanDetection } from '../hooks/useScanDetection';

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
  const [memberScanActive, setMemberScanActive] = useState(false);
  const [bookScanActive, setBookScanActive] = useState(false);

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
      .catch(() => DialogService.showError('Failed to load data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useScanDetection({
    onScanDetected: (code) => {
      // Intelligently route the scanned code
      if (code.startsWith('KMV')) {
        handleScanMember(code, true);
      } else {
        handleScanBook(code, true);
      }
    }
  });

  const handleScanMember = async (code, force = false) => {
    setScanMemberCode(code);
    setMemberScanActive(code.length > 0);

    if (force || (code.startsWith('KMV') && code.length >= 17)) {
      try {
        const member = await window.klms.members.getByCode(code);
        if (member) {
          setScannedMember(member);
          setSelectedMemberId(member.id.toString());
        } else {
          setScannedMember(null);
        }
      } catch (err) {
        DialogService.showError('Scan failed: ' + err.message);
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

  const handleScanBook = async (code, force = false) => {
    setScanBookCode(code);
    setBookScanActive(code.length > 0);

    if (force || code.length >= 4) { // Minimally search codes like ISBN or internal BK...
      try {
        const book = await window.klms.books.getByAnyCode(code);
        if (book) {
          if (book.available_copies > 0) {
            setScannedBook(book);
            setSelectedBookId(book.id.toString());
          } else {
            DialogService.showWarning('Book found but no copies available');
            setScannedBook(null); // Or show a specific error
          }
        } else {
          setScannedBook(null);
        }
      } catch (err) {
        DialogService.showError('Book scan failed: ' + err.message);
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
      DialogService.showError('Please select a member and a book');
      return;
    }

    setSubmitting(true);
    try {
      await window.klms.issues.issueBook(memberId, bookId);
      DialogService.showSuccess('Book issued successfully');
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
        DialogService.showError('Book not available');
      } else if (msg.includes('Borrow limit exceeded')) {
        DialogService.showError('Borrow limit exceeded');
      } else {
        DialogService.showError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="issue-book-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading members and books...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="issue-book-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            <path d="M12 6v6"></path>
            <path d="M9 9h6"></path>
          </svg>
        </div>
        <div className="header-content">
          <h2>Issue Book</h2>
          <p className="subtitle">Lend a book to a library member</p>
        </div>
      </div>

      {/* Issue Form Card */}
      <div className="issue-form-card">
        {/* Member Scanning Section */}
        <div className="scan-section">
          <div className="section-header">
            <div className="section-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div>
              <label>Member Identification</label>
              <p className="section-hint">Scan member barcode or select manually</p>
            </div>
          </div>

          <div className="scan-input-wrapper">
            <div className="scan-input-container">
              <svg className="scan-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="3" y1="15" x2="21" y2="15"></line>
              </svg>
              <input
                type="text"
                placeholder="Scan member ID (KMV...)"
                value={scanMemberCode}
                onChange={(e) => handleScanMember(e.target.value)}
                className={`scan-input ${memberScanActive ? 'active' : ''}`}
                autoFocus
              />
              {scanMemberCode && (
                <button
                  type="button"
                  className="clear-btn"
                  onClick={() => {
                    setScanMemberCode('');
                    setScannedMember(null);
                    setSelectedMemberId('');
                    setMemberScanActive(false);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>

            {scannedMember && (
              <div className="scanned-result success-result">
                <div className="result-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div className="result-content">
                  <div className="result-name">{scannedMember.name}</div>
                  <div className="result-meta">
                    <span className="meta-badge">{scannedMember.member_type}</span>
                    <span className="meta-code">{scannedMember.member_code}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="divider">
            <span>OR</span>
          </div>

          <div className="form-group">
            <select
              value={selectedMemberId}
              onChange={(e) => handleManualMemberChange(e.target.value)}
              disabled={submitting}
              className="enhanced-select"
            >
              <option value="">Select member from list</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.member_code || '–'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Book Scanning Section */}
        <div className="scan-section">
          <div className="section-header">
            <div className="section-icon book-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </div>
            <div>
              <label>Book Selection</label>
              <p className="section-hint">Scan ISBN/barcode or select from available books</p>
            </div>
          </div>

          <div className="scan-input-wrapper">
            <div className="scan-input-container">
              <svg className="scan-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="3" y1="15" x2="21" y2="15"></line>
              </svg>
              <input
                type="text"
                placeholder="Scan book barcode or ISBN"
                value={scanBookCode}
                onChange={(e) => handleScanBook(e.target.value)}
                className={`scan-input ${bookScanActive ? 'active' : ''}`}
              />
              {scanBookCode && (
                <button
                  type="button"
                  className="clear-btn"
                  onClick={() => {
                    setScanBookCode('');
                    setScannedBook(null);
                    setSelectedBookId('');
                    setBookScanActive(false);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>

            {scannedBook && (
              <div className="scanned-result success-result book-result">
                <div className="result-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div className="result-content">
                  <div className="result-name">{scannedBook.title}</div>
                  <div className="result-meta">
                    {scannedBook.author && <span className="meta-author">{scannedBook.author}</span>}
                    <span className="meta-badge available">{scannedBook.available_copies} Available</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="divider">
            <span>OR</span>
          </div>

          <div className="form-group">
            <select
              value={selectedBookId}
              onChange={(e) => handleManualBookChange(e.target.value)}
              disabled={submitting}
              className="enhanced-select"
            >
              <option value="">Select book from available list</option>
              {availableBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.author || 'No Author'}) - {b.available_copies} available
                </option>
              ))}
            </select>
            {availableBooks.length === 0 && (
              <div className="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <p>No books available to issue</p>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        {(showDueDatePreview || showBorrowLimitWarning) && (
          <div className="info-section">
            {showDueDatePreview && (
              <div className="info-card due-date">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <div>
                  <strong>Due Date</strong>
                  <p>Book must be returned within <strong>{maxBorrowDays} days</strong></p>
                </div>
              </div>
            )}

            {showBorrowLimitWarning && (
              <div className="info-card borrow-limit">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <div>
                  <strong>Borrow Limit</strong>
                  <p>Maximum <strong>{config.max_books_per_member || 5} books</strong> per member</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Issue Button */}
        <button
          type="button"
          className="btn-issue"
          onClick={handleIssue}
          disabled={submitting || !selectedMemberId || !selectedBookId}
        >
          {submitting ? (
            <>
              <span className="btn-spinner"></span>
              Processing...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                <polyline points="9 11 12 14 15 11"></polyline>
                <line x1="12" y1="14" x2="12" y2="6"></line>
              </svg>
              Issue Book to Member
            </>
          )}
        </button>
      </div>

      <style>{`
        .issue-book-page {
          max-width: 680px;
          margin: 0 auto;
          animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Loading State */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid var(--color-border);
          border-top-color: var(--button-color);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-container p {
          color: var(--color-text-muted);
          font-size: 0.95rem;
        }

        /* Page Header */
        .page-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .header-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, var(--button-color), var(--button-hover-color));
          color: var(--header-text-color);
          border-radius: var(--radius-lg);
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .header-content h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0 0 0.25rem 0;
        }

        .subtitle {
          color: var(--color-text-muted);
          font-size: 0.9rem;
          margin: 0;
        }

        /* Form Card */
        .issue-form-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        /* Scan Section */
        .scan-section {
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid var(--color-border);
        }

        .scan-section:last-of-type {
          border-bottom: none;
        }

        .section-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }

        .section-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: rgba(var(--button-color-rgb, 59, 130, 246), 0.1);
          color: var(--button-color);
          border-radius: var(--radius);
          flex-shrink: 0;
        }

        .section-icon.book-icon {
          background: rgba(139, 92, 246, 0.1);
          color: #8b5cf6;
        }

        .section-header label {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text);
          margin: 0 0 0.25rem 0;
          display: block;
        }

        .section-hint {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin: 0;
        }

        /* Scan Input */
        .scan-input-wrapper {
          margin-bottom: 1rem;
        }

        .scan-input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .scan-icon {
          position: absolute;
          left: 1rem;
          color: var(--color-text-muted);
          pointer-events: none;
          z-index: 1;
        }

        .scan-input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 3rem;
          border: 2px solid var(--color-border);
          border-radius: var(--radius-lg);
          background: var(--color-bg);
          color: var(--color-text);
          font-family: 'Courier New', monospace;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .scan-input:focus {
          border-color: var(--button-color);
          outline: none;
          box-shadow: 0 0 0 3px rgba(var(--button-color-rgb, 59, 130, 246), 0.1);
        }

        .scan-input.active {
          border-color: var(--button-color);
          background: rgba(var(--button-color-rgb, 59, 130, 246), 0.03);
        }

        .clear-btn {
          position: absolute;
          right: 0.75rem;
          background: var(--color-border);
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-muted);
          transition: all 0.2s;
        }

        .clear-btn:hover {
          background: var(--color-text-muted);
          color: var(--color-surface);
        }

        /* Scanned Result */
        .scanned-result {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--color-bg);
          border-radius: var(--radius-lg);
          margin-top: 0.75rem;
          border: 2px solid transparent;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .success-result {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.05);
        }

        .book-result {
          border-color: #8b5cf6;
          background: rgba(139, 92, 246, 0.05);
        }

        .result-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: #10b981;
          color: white;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .book-result .result-icon {
          background: #8b5cf6;
        }

        .result-content {
          flex: 1;
          min-width: 0;
        }

        .result-name {
          font-weight: 600;
          font-size: 1rem;
          color: var(--color-text);
          margin-bottom: 0.35rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .result-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .meta-badge {
          font-size: 0.75rem;
          background: rgba(16, 185, 129, 0.15);
          color: #059669;
          padding: 0.15rem 0.6rem;
          border-radius: 100px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .meta-badge.available {
          background: rgba(139, 92, 246, 0.15);
          color: #7c3aed;
        }

        .meta-code,
        .meta-author {
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }

        /* Divider */
        .divider {
          position: relative;
          text-align: center;
          margin: 1.5rem 0;
        }

        .divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: var(--color-border);
        }

        .divider span {
          position: relative;
          display: inline-block;
          padding: 0 1rem;
          background: var(--color-surface);
          color: var(--color-text-muted);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        /* Form Group */
        .form-group {
          margin-bottom: 1rem;
        }

        .enhanced-select {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid var(--color-border);
          border-radius: var(--radius-lg);
          background: var(--color-bg);
          color: var(--color-text);
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .enhanced-select:focus {
          outline: none;
          border-color: var(--button-color);
          box-shadow: 0 0 0 3px rgba(var(--button-color-rgb, 59, 130, 246), 0.1);
        }

        .enhanced-select:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 2rem 1rem;
          color: var(--color-text-muted);
        }

        .empty-state svg {
          opacity: 0.3;
          margin-bottom: 0.75rem;
        }

        .empty-state p {
          font-size: 0.9rem;
          margin: 0;
        }

        /* Info Section */
        .info-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding: 1.25rem;
          background: var(--color-bg);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
        }

        .info-card {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .info-card svg {
          flex-shrink: 0;
          margin-top: 0.15rem;
        }

        .info-card.due-date svg {
          color: #3b82f6;
        }

        .info-card.borrow-limit svg {
          color: #f59e0b;
        }

        .info-card strong {
          display: block;
          font-size: 0.875rem;
          color: var(--color-text);
          margin-bottom: 0.25rem;
        }

        .info-card p {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          margin: 0;
        }

        /* Issue Button */
        .btn-issue {
          width: 100%;
          padding: 1rem;
          background: var(--button-color);
          color: var(--header-text-color);
          border: none;
          border-radius: var(--radius-lg);
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.3s;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .btn-issue:hover:not(:disabled) {
          background: var(--button-hover-color);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        .btn-issue:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-issue:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .btn-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid var(--header-text-color);
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .issue-book-page {
            max-width: 100%;
          }

          .page-header {
            padding: 1.25rem;
          }

          .header-icon {
            width: 48px;
            height: 48px;
          }

          .header-icon svg {
            width: 24px;
            height: 24px;
          }

          .header-content h2 {
            font-size: 1.25rem;
          }

          .issue-form-card {
            padding: 1.5rem;
          }

          .section-header {
            flex-direction: row;
            align-items: flex-start;
          }

          .section-icon {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>
    </div>
  );
}