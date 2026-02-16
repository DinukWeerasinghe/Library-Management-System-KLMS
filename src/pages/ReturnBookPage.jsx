import React, { useState, useEffect } from 'react';
import { DialogService } from '../services/DialogService';
import { useScanDetection } from '../hooks/useScanDetection';

/**
 * Return Book screen.
 * - List of issued books (status = ISSUED): Member, Book, Issue Date, Due Date, Return, Renew (if enabled).
 * - After return, show fine amount if enable_fine and fine > 0.
 */
export function ReturnBookPage({ features = {} }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returningId, setReturningId] = useState(null);
  const [renewingId, setRenewingId] = useState(null);
  const [scanCode, setScanCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastReturn, setLastReturn] = useState(null);
  const [currentMember, setCurrentMember] = useState(null);
  const showRenew = Boolean(features.enable_renewal);
  const showFine = Boolean(features.enable_fine);

  const loadIssued = () => {
    setLoading(true);
    window.klms.issues
      .getAll({ status: 'ISSUED' })
      .then(setIssues)
      .catch(() => DialogService.showError('Failed to load issued books'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadIssued();
  }, []);

  useScanDetection({
    onScanDetected: (code) => {
      processScan(code);
    }
  });

  const handleManualReturn = async (issueId) => {
    setReturningId(issueId);
    try {
      const issue = await window.klms.issues.returnBook(issueId);
      if (showFine && issue.fine_amount > 0) {
        DialogService.showInfo(`Book returned successfully. Fine amount: ${issue.fine_amount}`);
      } else {
        DialogService.showSuccess('Book returned successfully');
      }
      loadIssued();
    } catch (err) {
      DialogService.showError(err.message || 'Return failed');
    } finally {
      setReturningId(null);
    }
  };

  const handleRenew = async (issueId) => {
    if (!showRenew) return;
    setRenewingId(issueId);
    try {
      await window.klms.issues.renewBook(issueId);
      DialogService.showSuccess('Due date extended successfully');
      loadIssued();
    } catch (err) {
      DialogService.showError(err.message || 'Renew failed');
    } finally {
      setRenewingId(null);
    }
  };

  const handleScanChange = async (code) => {
    setScanCode(code);
    // Removed auto-processing here to prevent double-triggers with useScanDetection
  };

  const processScan = async (code) => {
    if (!code || scanning) return;
    setScanning(true);
    setLastReturn(null);
    try {
      if (!currentMember) {
        // Step 1: Identify Member
        const member = await window.klms.members.getByCode(code);
        if (member) {
          setCurrentMember(member);
          setScanCode('');
        } else {
          DialogService.showError('Member not found. Please scan a valid Member ID.');
          setScanCode('');
        }
      } else {
        // Step 2: Member Identified, scan Book
        // Check if user is scanning a DIFFERENT member instead (switching context)
        if (code.startsWith('M') || (code.startsWith('KMV') && code.length >= 17)) {
          const member = await window.klms.members.getByCode(code);
          if (member && member.id !== currentMember.id) {
            setCurrentMember(member);
            setScanCode('');
            DialogService.showInfo(`Switched to member: ${member.name}`);
            return;
          }
        }

        const issue = await window.klms.issues.returnBookByMemberAndBook(currentMember.member_code, code);
        setLastReturn(issue);
        setScanCode('');
        loadIssued();
      }
    } catch (err) {
      DialogService.showError(err.message || 'Scan failed');
      setScanCode('');
    } finally {
      setScanning(false);
    }
  };

  return (
    <>
      <div className="return-book-page">
        <h2>Return Book</h2>
        <p className="subtitle">Identify member and scan book to process return</p>

        <div className="return-container">
          <div className="scan-flow-card">
            <div className={`step-item ${!currentMember ? 'active' : 'completed'}`}>
              <div className="step-number">{currentMember ? '✓' : '1'}</div>
              <div className="step-content">
                <h4>Identify Member</h4>
                {currentMember ? (
                  <div className="active-member">
                    <span className="member-name">{currentMember.name}</span>
                    <span className="member-code">{currentMember.member_code}</span>
                    <button className="btn-change" onClick={() => setCurrentMember(null)}>Change</button>
                  </div>
                ) : (
                  <p>Scan member barcode to start...</p>
                )}
              </div>
            </div>

            <div className={`step-item ${currentMember ? 'active' : 'pending'}`}>
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>Scan Book</h4>
                {currentMember ? (
                  <p>Now scan the book to return it for {currentMember.name.split(' ')[0]}</p>
                ) : (
                  <p>Identify member first...</p>
                )}
              </div>
            </div>

            <div className="scan-input-section">
              <div className="scan-input-wrapper">
                <input
                  type="text"
                  placeholder={!currentMember ? "Scan Member ID..." : "Scan Book ISBN/Code..."}
                  value={scanCode}
                  onChange={(e) => handleScanChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && processScan(scanCode)}
                  className="scan-input"
                  autoFocus
                  disabled={scanning}
                />
                {scanning && <div className="scanning-indicator">
                  <div className="pulse"></div>
                  <span>Processing...</span>
                </div>}
              </div>
            </div>
          </div>

          {lastReturn && (
            <div className="return-success-alert">
              <div className="alert-icon">✓</div>
              <div className="alert-body">
                <strong>Return Successful!</strong>
                <p>"{lastReturn.book_title}" returned by {lastReturn.member_name}</p>
                {lastReturn.fine_amount > 0 && <span className="fine-tag">Fine: LKR {lastReturn.fine_amount.toFixed(2)}</span>}
              </div>
              <button className="btn-dismiss" onClick={() => setLastReturn(null)}>×</button>
            </div>
          )}
        </div>

        <div className="issued-list-card">
          <div className="card-header">
            <h3>Active Issues</h3>
            <button className="btn-refresh" onClick={loadIssued}>Refresh</button>
          </div>
          {loading ? (
            <div className="loader">Loading issued books...</div>
          ) : issues.length === 0 ? (
            <p className="empty-state">No books are currently issued.</p>
          ) : (
            <div className="table-resp">
              <table className="issued-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Book Title</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((i) => (
                    <tr key={i.id} className={currentMember?.id === i.member_id ? 'highlight' : ''}>
                      <td>
                        <div className="member-info">
                          <span className="name">{i.member_name}</span>
                          <span className="type">{i.member_type}</span>
                        </div>
                      </td>
                      <td>{i.book_title}</td>
                      <td>{i.issue_date}</td>
                      <td className={i.is_overdue ? 'overdue' : ''}>{i.due_date || '–'}</td>
                      <td className="actions">
                        <button
                          type="button"
                          className="btn-return-action"
                          onClick={() => handleManualReturn(i.id)}
                          disabled={returningId !== null}
                        >
                          {returningId === i.id ? '...' : 'Return'}
                        </button>
                        {showRenew && (
                          <button
                            type="button"
                            className="btn-renew-action"
                            onClick={() => handleRenew(i.id)}
                            disabled={renewingId !== null}
                          >
                            {renewingId === i.id ? '...' : 'Renew'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .return-book-page { padding: 0; }
        .return-book-page h2 { font-size: 1.5rem; margin-bottom: 0.25rem; font-weight: 700; color: var(--color-text); }
        .return-book-page .subtitle { color: var(--color-text-muted); font-size: 0.95rem; margin-bottom: 2rem; }

        .return-container { margin-bottom: 2.5rem; }
        
        .scan-flow-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 1rem;
          padding: 2rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          position: relative;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }

        .step-item {
          display: flex;
          gap: 1.25rem;
          padding: 1.5rem;
          border-radius: 0.75rem;
          transition: all 0.3s;
          border: 2px solid transparent;
        }

        .step-item.active {
          background: rgba(var(--button-color-rgb), 0.05);
          border-color: var(--button-color);
        }

        .step-item.completed {
          background: #f0fdf4;
        }

        .step-item.pending {
          opacity: 0.5;
        }

        .step-number {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          background: var(--color-border);
          color: var(--color-text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
          font-size: 1.1rem;
        }

        .active .step-number {
          background: var(--button-color);
          color: white;
        }

        .completed .step-number {
          background: #22c55e;
          color: white;
        }

        .step-content h4 { margin: 0 0 0.25rem 0; font-size: 1.1rem; color: var(--color-text); }
        .step-content p { margin: 0; font-size: 0.875rem; color: var(--color-text-muted); }

        .active-member { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem; }
        .active-member .member-name { font-weight: 600; color: #166534; }
        .active-member .member-code { font-size: 0.75rem; background: #dcfce7; color: #166534; padding: 0.1rem 0.4rem; border-radius: 4px; }
        .btn-change { border: none; background: none; color: #ef4444; font-size: 0.75rem; cursor: pointer; text-decoration: underline; padding: 0; }

        .scan-input-section {
          grid-column: span 2;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
        }

        .scan-input-wrapper { display: flex; align-items: center; gap: 1rem; position: relative; }
        .scan-input {
          flex: 1;
          padding: 1rem 1.5rem;
          font-size: 1.25rem;
          border: 2px solid var(--color-border);
          border-radius: 0.75rem;
          background: var(--color-bg);
          color: var(--color-text);
          font-family: inherit;
          transition: all 0.2s;
        }
        .scan-input:focus {
          border-color: var(--button-color);
          outline: none;
          box-shadow: 0 0 0 4px rgba(var(--button-color-rgb), 0.1);
        }

        .scanning-indicator {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--button-color);
          font-weight: 600;
          font-size: 0.9rem;
        }

        .pulse {
          width: 0.75rem;
          height: 0.75rem;
          background: var(--button-color);
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(var(--button-color-rgb), 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(var(--button-color-rgb), 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(var(--button-color-rgb), 0); }
        }

        .return-success-alert {
          margin-top: 1.5rem;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 0.75rem;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .alert-icon {
          width: 2rem;
          height: 2rem;
          background: #22c55e;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .alert-body { flex: 1; }
        .alert-body strong { display: block; color: #166534; font-size: 0.95rem; }
        .alert-body p { margin: 0; color: #166534; font-size: 0.875rem; }
        .fine-tag { display: inline-block; margin-top: 0.25rem; font-size: 0.75rem; font-weight: 700; color: #b91c1c; background: #fee2e2; padding: 0.1rem 0.5rem; border-radius: 4px; }
        .btn-dismiss { background: none; border: none; font-size: 1.5rem; color: #166534; cursor: pointer; padding: 0.5rem; lineHeight: 1; }

        .issued-list-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 1rem;
          overflow: hidden;
        }

        .card-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; }
        .btn-refresh {
          background: none;
          border: 1px solid var(--color-border);
          padding: 0.4rem 0.8rem;
          border-radius: 0.5rem;
          font-size: 0.8rem;
          cursor: pointer;
        }
        .btn-refresh:hover { background: var(--color-bg); }

        .table-resp { overflow-x: auto; }
        .issued-table { width: 100%; border-collapse: collapse; }
        .issued-table th {
          background: var(--color-bg);
          padding: 1rem 1.5rem;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          border-bottom: 1px solid var(--color-border);
        }

        .issued-table td {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--color-border);
          font-size: 0.95rem;
        }

        .issued-table tr:hover { background: rgba(var(--button-color-rgb), 0.02); }
        .issued-table tr.highlight { background: rgba(var(--button-color-rgb), 0.05); }

        .member-info { display: flex; flex-direction: column; }
        .member-info .name { font-weight: 600; color: var(--color-text); }
        .member-info .type { font-size: 0.75rem; color: var(--color-text-muted); }

        .overdue { color: #ef4444; font-weight: 700; }

        .issued-table .actions { display: flex; gap: 0.5rem; }
        
        .btn-return-action, .btn-renew-action {
          padding: 0.4rem 0.75rem;
          border-radius: 0.5rem;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-return-action {
          background: var(--button-color);
          color: white;
          border: none;
        }
        
        .btn-renew-action {
          background: white;
          border: 1px solid var(--color-border);
          color: var(--color-text);
        }

        .btn-return-action:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .btn-renew-action:hover { border-color: var(--button-color); color: var(--button-color); }
        
        .empty-state { padding: 4rem; text-align: center; color: var(--color-text-muted); }
        .loader { padding: 3rem; text-align: center; color: var(--button-color); }
      `}</style>
    </>
  );
}
