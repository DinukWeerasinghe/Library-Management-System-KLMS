import React, { useState, useEffect, useRef } from 'react';
import { DialogService } from '../services/DialogService';
import { useScanDetection } from '../hooks/useScanDetection';

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
  const [memberScanning, setMemberScanning] = useState(false);
  const [bookScanning, setBookScanning] = useState(false);

  const memberInputRef = useRef(null);
  const bookInputRef = useRef(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      window.klms.members.getAll({ pageSize: 1000 }),
      window.klms.books.getAll({ pageSize: 1000 }),
    ])
      .then(([mRes, bRes]) => {
        setMembers(mRes.items || []);
        setBooks(bRes.items || []);
      })
      .catch(() => DialogService.showError('Failed to load data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useScanDetection({
    onScanDetected: (code) => {
      if (code.startsWith('KMV') || (code.startsWith('M') && code.length === 7)) {
        handleScanMember(code, true);
      } else {
        handleScanBook(code, true);
      }
    }
  });

  const handleScanMember = async (code, force = false) => {
    setScanMemberCode(code);
    if (force || (code.startsWith('M') && code.length === 7) || (code.startsWith('KMV') && code.length >= 17)) {
      setMemberScanning(true);
      try {
        const member = await window.klms.members.getByCode(code);
        if (member) {
          setScannedMember(member);
          setSelectedMemberId(member.id.toString());
          // Auto focus book input after member identified
          if (bookInputRef.current) bookInputRef.current.focus();
        } else {
          setScannedMember(null);
        }
      } catch (err) {
        DialogService.showError('Member scan failed');
      } finally {
        setMemberScanning(false);
      }
    }
  };

  const handleManualMemberChange = (id) => {
    setSelectedMemberId(id);
    const member = members.find(m => m.id.toString() === id.toString());
    setScannedMember(member || null);
    if (member) setScanMemberCode(member.member_code || '');
  };

  const handleScanBook = async (code, force = false) => {
    setScanBookCode(code);
    if (force || (code.startsWith('B') && code.length === 7) || code.length >= 10) {
      setBookScanning(true);
      try {
        const book = await window.klms.books.getByAnyCode(code);
        if (book) {
          if (book.available_copies > 0) {
            setScannedBook(book);
            setSelectedBookId(book.id.toString());
          } else {
            DialogService.showWarning(`"${book.title}" has no copies available.`);
            setScannedBook(null);
          }
        } else {
          setScannedBook(null);
        }
      } catch (err) {
        DialogService.showError('Book scan failed');
      } finally {
        setBookScanning(false);
      }
    }
  };

  const handleManualBookChange = (id) => {
    setSelectedBookId(id);
    const book = books.find(b => b.id.toString() === id.toString());
    setScannedBook(book || null);
    if (book) setScanBookCode(book.internal_code || book.isbn || '');
  };

  const handleIssue = async () => {
    const memberId = parseInt(selectedMemberId, 10);
    const bookId = parseInt(selectedBookId, 10);
    if (!memberId || !bookId) return;

    setSubmitting(true);
    try {
      await window.klms.issues.issueBook(memberId, bookId);
      DialogService.showSuccess(`Issued "${scannedBook?.title}" to ${scannedMember?.name}`);

      // Reset flow
      setSelectedMemberId('');
      setScanMemberCode('');
      setScannedMember(null);
      setSelectedBookId('');
      setScanBookCode('');
      setScannedBook(null);
      loadData();

      if (memberInputRef.current) memberInputRef.current.focus();
    } catch (err) {
      DialogService.showError(err.message || 'Issuance failed');
    } finally {
      setSubmitting(false);
    }
  };

  const availableBooks = books.filter(b => b.available_copies > 0);
  const maxBorrowDays = parseInt(config.max_borrow_days, 10) || 14;

  if (loading) return <div className="page-loader">Initializing Terminal...</div>;

  return (
    <div className="issue-terminal">
      <header className="terminal-header">
        <div className="header-badge">LENDING MANAGEMENT</div>
        <h1>Book Checkout</h1>
        <div className="status-clock">{new Date().toLocaleDateString()}</div>
      </header>

      <div className="terminal-grid">
        {/* MEMBER COLUMN */}
        <section className={`column member-column ${scannedMember ? 'identified' : ''}`}>
          <div className="column-label">STEP 1: IDENTIFY MEMBER</div>

          <div className="input-group">
            <div className="scan-field">
              <input
                ref={memberInputRef}
                type="text"
                placeholder="Scan Member ID Card"
                value={scanMemberCode}
                onChange={(e) => handleScanMember(e.target.value)}
                autoFocus
              />
            </div>

            <div className="manual-select">
              <select value={selectedMemberId} onChange={(e) => handleManualMemberChange(e.target.value)}>
                <option value="">Or Select Name manually...</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.member_code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="identity-card">
            {scannedMember ? (
              <div className="card-content">
                <div className="card-avatar">
                  {scannedMember.name.charAt(0)}
                </div>
                <div className="card-info">
                  <div className="name-row">
                    <span className="name">{scannedMember.name}</span>
                    <span className="badge">{scannedMember.member_type}</span>
                  </div>
                  <div className="code">{scannedMember.member_code}</div>
                  <div className="meta">
                    <span>Active Borrowings: {scannedMember.active_issues || 0}</span>
                    <span className={scannedMember.is_expired ? 'expired' : 'valid'}>
                      {scannedMember.is_expired ? 'Membership Expired' : 'Membership Valid'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card-placeholder">Waiting for Member scan...</div>
            )}
          </div>
        </section>

        {/* BOOK COLUMN */}
        <section className={`column book-column ${scannedBook ? 'identified' : ''}`}>
          <div className="column-label">STEP 2: IDENTIFY BOOK</div>

          <div className="input-group">
            <div className="scan-field">
              <input
                ref={bookInputRef}
                type="text"
                placeholder="Scan Book Barcode or ISBN"
                value={scanBookCode}
                onChange={(e) => handleScanBook(e.target.value)}
              />
            </div>

            <div className="manual-select">
              <select value={selectedBookId} onChange={(e) => handleManualBookChange(e.target.value)}>
                <option value="">Or Select Title manually...</option>
                {availableBooks.map(b => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="identity-card">
            {scannedBook ? (
              <div className="card-content">
                <div className="card-cover">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                </div>
                <div className="card-info">
                  <div className="name-row">
                    <span className="name">{scannedBook.title}</span>
                  </div>
                  <div className="author">By {scannedBook.author || 'Unknown Author'}</div>
                  <div className="meta">
                    <span className="badge">{scannedBook.category || 'General'}</span>
                    <span className="copies">{scannedBook.available_copies} Copies Available</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card-placeholder">Waiting for Book scan...</div>
            )}
          </div>
        </section>
      </div>

      <footer className="terminal-footer">
        <div className="lending-info">
          <div className="info-item">
            <label>BORROWING PERIOD</label>
            <span>{maxBorrowDays} DAYS</span>
          </div>
          <div className="info-item">
            <label>RETURN BY</label>
            <span>{new Date(Date.now() + maxBorrowDays * 86400000).toLocaleDateString()}</span>
          </div>
        </div>

        <button
          className="btn-execute"
          disabled={!selectedMemberId || !selectedBookId || submitting}
          onClick={handleIssue}
        >
          {submitting ? 'PROCESSING...' : 'ISSUE BOOK'}
        </button>
      </footer>

      <style>{`
        .issue-terminal {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 100px);
          max-height: 800px;
          gap: 1.5rem;
          color: var(--color-text);
          font-family: var(--font-sans);
        }

        .terminal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 1rem;
        }

        .terminal-header h1 { margin: 0; font-size: 1.75rem; font-weight: 800; letter-spacing: -0.02em; }
        .header-badge { font-family: monospace; font-size: 0.7rem; background: var(--button-color); color: white; padding: 0.2rem 0.5rem; border-radius: 4px; }
        .status-clock { color: var(--color-text-muted); font-size: 0.9rem; font-weight: 600; }

        .terminal-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          flex: 1;
        }

        .column {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 1.25rem;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .column.identified { border-color: var(--button-color); box-shadow: 0 0 20px rgba(var(--button-color-rgb, 79, 70, 229), 0.1); }

        .column-label {
          font-family: monospace;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          letter-spacing: 0.1em;
        }

        .input-group { display: flex; flex-direction: column; gap: 0.75rem; }

        .scan-field { position: relative; }
        .scan-field input {
          width: 100%;
          background: var(--color-bg);
          border: 2px solid var(--color-border);
          border-radius: 0.75rem;
          padding: 1rem 1.25rem;
          font-size: 1.1rem;
          font-family: monospace;
          color: var(--color-text);
          transition: border-color 0.2s;
        }
        .scan-field input:focus { border-color: var(--button-color); outline: none; }

        .scanner-line {
          position: absolute;
          bottom: 0;
          left: 5%;
          width: 90%;
          height: 2px;
          background: var(--button-color);
          box-shadow: 0 0 8px var(--button-color);
          animation: scanMove 2s infinite ease-in-out;
        }

        @keyframes scanMove { 0%, 100% { transform: translateY(-5px); opacity: 0; } 50% { transform: translateY(-40px); opacity: 1; } }

        .manual-select select {
          width: 100%;
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
          padding: 0.5rem;
          border-radius: 0.5rem;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .identity-card {
          flex: 1;
          background: var(--color-bg);
          border-radius: 1rem;
          border: 1px dashed var(--color-border);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .card-placeholder { color: var(--color-text-muted); font-size: 0.8rem; letter-spacing: 0.05em; font-family: monospace; }

        .card-content {
          width: 100%;
          padding: 1.25rem;
          display: flex;
          gap: 1.25rem;
          animation: slideUp 0.4s ease-out;
        }

        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .card-avatar, .card-cover {
          width: 64px;
          height: 64px;
          background: var(--button-color);
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .card-cover { background: rgba(var(--button-color-rgb, 79, 70, 229), 0.1); color: var(--button-color); }
        .card-cover svg { width: 32px; height: 32px; }

        .card-info { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
        .name-row { display: flex; align-items: center; gap: 0.5rem; }
        .name { font-weight: 700; font-size: 1.1rem; }
        .card-info .badge { font-size: 0.7rem; background: var(--color-border); padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 600; }
        .card-info .code { font-family: monospace; color: var(--button-color); font-size: 0.9rem; }
        .card-info .meta { margin-top: 0.5rem; display: flex; gap: 1rem; font-size: 0.75rem; font-weight: 600; color: var(--color-text-muted); }
        .card-info .author { font-size: 0.9rem; color: var(--color-text-muted); }

        .valid { color: var(--color-success); }
        .expired { color: var(--color-danger); }

        .terminal-footer {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 1.25rem;
          padding: 1.25rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .lending-info { display: flex; gap: 3rem; }
        .info-item { display: flex; flex-direction: column; }
        .info-item label { font-size: 0.65rem; color: var(--color-text-muted); font-family: monospace; letter-spacing: 0.1em; }
        .info-item span { font-weight: 700; font-size: 1.1rem; }

        .btn-execute {
          background: var(--button-color);
          color: white;
          padding: 1rem 2.5rem;
          border-radius: 0.75rem;
          font-weight: 800;
          font-size: 1rem;
          letter-spacing: 0.05em;
          box-shadow: 0 4px 15px rgba(var(--button-color-rgb, 79, 70, 229), 0.3);
          transition: all 0.2s;
        }
        .btn-execute:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
        .btn-execute:disabled { opacity: 0.5; filter: grayscale(1); }

        @media (max-width: 900px) {
          .terminal-grid { grid-template-columns: 1fr; }
          .issue-terminal { height: auto; max-height: none; }
        }
      `}</style>
    </div>
  );
}