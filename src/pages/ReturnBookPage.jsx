import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DialogService } from '../services/DialogService';
import { useScanDetection } from '../hooks/useScanDetection';
import { friendlyIssueError } from '../utils/issueErrors';

export function ReturnBookPage({ features = {} }) {
  const { t } = useTranslation();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returningId, setReturningId] = useState(null);
  const [renewingId, setRenewingId] = useState(null);
  const [scanCode, setScanCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [currentMember, setCurrentMember] = useState(null);
  const [lastReturn, setLastReturn] = useState(null);

  const scanInputRef = useRef(null);

  const loadIssued = async () => {
    try {
      setLoading(true);
      const data = await window.klms.issues.getAll({ status: 'ISSUED' });
      setIssues(data);
    } catch (err) {
      DialogService.showError('Failed to load active issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssued();
  }, []);

  useScanDetection({
    onScanDetected: (code) => {
      processScan(code);
    }
  });

  const handleScanChange = (code) => {
    setScanCode(code);
    // Note: Re-entrancy and double-trigger prevention are handled in processScan
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
          DialogService.showError('Member barcode not recognized. Please scan a valid ID.');
          setScanCode('');
        }
      } else {
        // Step 2: Member Identified, scan Book OR Another Member (to switch)
        // Check for member patterns (M-series or Legacy KMV)
        if (code.startsWith('M') || (code.startsWith('KMV') && code.length >= 17)) {
          const member = await window.klms.members.getByCode(code);
          if (member && member.id !== currentMember.id) {
            setCurrentMember(member);
            setScanCode('');
            DialogService.showInfo(`Switched context to: ${member.name}`);
            return;
          }
        }

        // Otherwise treat as Book Scan
        const issue = await window.klms.issues.returnBookByMemberAndBook(currentMember.member_code, code);
        setLastReturn(issue);
        setScanCode('');
        loadIssued();
      }
    } catch (err) {
      DialogService.showError(friendlyIssueError(err));
      setScanCode('');
    } finally {
      setScanning(false);
      if (scanInputRef.current) scanInputRef.current.focus();
    }
  };

  const handleManualReturn = async (issueId) => {
    try {
      setReturningId(issueId);
      const result = await window.klms.issues.returnBook(issueId);
      setLastReturn(result);
      loadIssued();
    } catch (err) {
      DialogService.showError(friendlyIssueError(err));
    } finally {
      setReturningId(null);
    }
  };

  const handleRenew = async (issueId) => {
    try {
      setRenewingId(issueId);
      await window.klms.issues.renewBook(issueId);
      DialogService.showSuccess('Book renewed successfully');
      loadIssued();
    } catch (err) {
      DialogService.showError(friendlyIssueError(err));
    } finally {
      setRenewingId(null);
    }
  };

  const showRenew = Boolean(features.enable_renew);
  const memberIssues = currentMember ? issues.filter(i => i.member_id === currentMember.id) : [];

  if (loading && issues.length === 0) return <div className="page-loader">{t('return.connecting')}</div>;

  return (
    <div className="return-terminal">
      <header className="terminal-header">
        <div className="header-badge">{t('return.returnsCenter')}</div>
        <h1>{t('return.bookReturns')}</h1>
        <div className="status-clock">{t('return.currentTime')}: {new Date().getHours()}:{new Date().getMinutes().toString().padStart(2, '0')}</div>
      </header>

      <div className="terminal-grid">
        {/* IDENTIFICATION COLUMN */}
        <section className={`column member-column ${currentMember ? 'identified' : ''}`}>
          <div className="column-label">{t('return.memberDetails')}</div>

          <div className="identity-status">
            {currentMember ? (
              <div className="card-content">
                <div className="card-avatar">{currentMember.name.charAt(0)}</div>
                <div className="card-info">
                  <div className="name-row">
                    <span className="name">{currentMember.name}</span>
                    <button className="btn-reset" onClick={() => setCurrentMember(null)}>{t('common.change')}</button>
                  </div>
                  <div className="code">{currentMember.member_code}</div>
                  <div className="stats">
                    {t('return.currentlyBorrowed')}: <strong>{memberIssues.length} {t('return.books')}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="waiting-state">
                <div className="pulse-dot"></div>
                <span>{t('return.waitingForMember')}</span>
              </div>
            )}
          </div>
        </section>

        {/* SCANNING COLUMN */}
        <section className={`column processing-column ${lastReturn ? 'success' : ''}`}>
          <div className="column-label">{t('return.returnProcessing')}</div>

          <div className="scan-hub">
            <div className="scan-field">
              <input
                ref={scanInputRef}
                type="text"
                placeholder={!currentMember ? t('return.scanMemberId') : t('return.scanBookToReturn')}
                value={scanCode}
                onChange={(e) => handleScanChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && processScan(scanCode)}
                disabled={scanning}
                autoFocus
              />
            </div>
          </div>

          <div className="receipt-area">
            {lastReturn ? (
              <div className="return-receipt">
                <div className="receipt-header">
                  <span className="icon">✓</span>
                  <strong>{t('return.returned')}</strong>
                </div>
                <div className="receipt-body">
                  <div className="book-title">{lastReturn.book_title}</div>
                  <div className="member-ref">{t('return.member')}: {lastReturn.member_name}</div>
                  {lastReturn.fine_amount > 0 && (
                    <div className="fine-badge">{t('return.totalFine')} {lastReturn.fine_amount.toFixed(2)}</div>
                  )}
                </div>
                <button className="btn-clear-receipt" onClick={() => setLastReturn(null)}>{t('common.done')}</button>
              </div>
            ) : (
              <div className="receipt-placeholder">{t('return.scanToProcess')}</div>
            )}
          </div>
        </section>
      </div>

      <div className="issues-log-card">
        <div className="log-header">
          <h3>{currentMember ? `${t('return.activeIssuesFor')} ${currentMember.name.split(' ')[0]}` : t('return.recentlyIssuedBooks')}</h3>
          <button className="btn-refresh" onClick={loadIssued}>{t('return.refreshList')}</button>
        </div>

        <div className="table-viewport">
          <table className="terminal-table">
            <thead>
              <tr>
                {!currentMember && <th>Member</th>}
                <th>Book Title</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(currentMember ? memberIssues : issues.slice(0, 10)).map(i => (
                <tr key={i.id} className={i.is_overdue ? 'overdue-row' : ''}>
                  {!currentMember && <td className="font-mono">{i.member_name}</td>}
                  <td>{i.book_title}</td>
                  <td className="font-mono">{i.due_date}</td>
                  <td>
                    <span className={`status-pill ${i.is_overdue ? 'overdue' : 'normal'}`}>
                      {i.is_overdue ? 'OVERDUE' : 'ISSUED'}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn-action-return" onClick={() => handleManualReturn(i.id)} disabled={returningId === i.id}>
                      {returningId === i.id ? '...' : t('return.return')}
                    </button>
                    {showRenew && (
                      <button className="btn-action-renew" onClick={() => handleRenew(i.id)} disabled={renewingId === i.id}>
                        {t('return.renew')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(currentMember ? memberIssues : issues).length === 0 && (
                <tr>
                  <td colSpan="5" className="empty-msg">{t('return.noActiveLendings')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .return-terminal {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 100px);
          max-height: 850px;
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
        .status-clock { color: var(--color-text-muted); font-size: 0.9rem; font-family: monospace; }

        .terminal-grid {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 1.5rem;
        }

        .column {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 1.25rem;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          min-height: 240px;
          transition: all 0.3s ease;
        }

        .column.identified { border-color: var(--color-success); background: rgba(16, 185, 129, 0.02); }
        .column.success { border-color: var(--button-color); box-shadow: 0 0 25px rgba(var(--button-color-rgb, 79, 70, 229), 0.15); }

        .column-label {
          font-family: monospace;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          letter-spacing: 0.1em;
        }

        /* Member Identity Status */
        .identity-status { flex: 1; display: flex; align-items: center; justify-content: center; }
        .waiting-state { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; color: var(--color-text-muted); font-family: monospace; font-size: 0.8rem; }
        .pulse-dot { width: 10px; height: 10px; background: var(--button-color); border-radius: 50%; animation: pulse 1.5s infinite; }
        
        @keyframes pulse { 0% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } 100% { opacity: 0.4; transform: scale(0.8); } }

        .card-content { display: flex; gap: 1rem; width: 100%; align-items: center; animation: fadeIn 0.3s; }
        .card-avatar { width: 48px; height: 48px; background: var(--color-success); color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 700; }
        .card-info { flex: 1; }
        .name-row { display: flex; justify-content: space-between; align-items: center; }
        .name { font-weight: 700; font-size: 1.1rem; }
        .btn-reset { background: rgba(239, 68, 68, 0.1); color: var(--color-danger); border: none; font-size: 0.65rem; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 800; cursor: pointer; }
        .card-info .code { font-family: monospace; color: var(--color-success); font-size: 0.9rem; margin: 0.1rem 0; }
        .stats { font-size: 0.75rem; color: var(--color-text-muted); font-weight: 600; }

        /* Scanning Hub */
        .scan-hub { width: 100%; }
        .scan-field { position: relative; }
        .scan-field input {
          width: 100%;
          background: var(--color-bg);
          border: 2px solid var(--color-border);
          border-radius: 1rem;
          padding: 1.25rem 1.5rem;
          font-size: 1.25rem;
          font-family: inherit;
          color: var(--color-text);
          transition: all 0.2s;
        }
        .scan-field input:focus { border-color: var(--button-color); outline: none; box-shadow: 0 0 0 4px rgba(var(--button-color-rgb, 79, 70, 229), 0.1); }
        
        .scanner-line {
          position: absolute;
          bottom: 4px;
          left: 10%;
          width: 80%;
          height: 2px;
          background: var(--button-color);
          box-shadow: 0 0 10px var(--button-color);
          animation: scanLine 2s infinite ease-in-out;
        }
        @keyframes scanLine { 0%, 100% { opacity: 0; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-44px); } }

        /* Receipt */
        .receipt-area { flex: 1; display: flex; align-items: center; }
        .receipt-placeholder { width: 100%; text-align: center; color: var(--color-text-muted); font-family: monospace; font-size: 0.8rem; border: 1px dashed var(--color-border); padding: 1rem; border-radius: 0.75rem; }
        
        .return-receipt {
          width: 100%;
          background: var(--color-bg);
          border-radius: 0.75rem;
          border: 1px solid var(--button-color);
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .receipt-header { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
        .receipt-header .icon { width: 32px; height: 32px; background: var(--button-color); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
        .receipt-header strong { font-size: 0.65rem; color: var(--button-color); font-family: monospace; white-space: nowrap; }

        .receipt-body { flex: 1; }
        .receipt-body .book-title { font-weight: 700; font-size: 1rem; color: var(--color-text); line-height: 1.2; margin-bottom: 0.2rem; }
        .receipt-body .member-ref { font-size: 0.75rem; color: var(--color-text-muted); font-weight: 600; }
        .fine-badge { display: inline-block; margin-top: 0.4rem; font-size: 0.7rem; background: rgba(239, 68, 68, 0.1); color: var(--color-danger); padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 800; }
        
        .btn-clear-receipt { background: none; border: 1px solid var(--color-border); color: var(--color-text-muted); font-size: 0.6rem; padding: 0.4rem 0.6rem; border-radius: 4px; cursor: pointer; font-weight: 700; }
        .btn-clear-receipt:hover { background: var(--color-surface); color: var(--color-text); }

        /* Issues Log Table */
        .issues-log-card {
          flex: 1;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 1.25rem;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .log-header { padding: 1rem 1.5rem; border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; }
        .log-header h3 { margin: 0; font-size: 0.9rem; font-family: monospace; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .btn-refresh { background: none; border: 1px solid var(--color-border); color: var(--color-text-muted); font-size: 0.7rem; padding: 0.3rem 0.75rem; border-radius: 6px; cursor: pointer; font-weight: 600; }

        .table-viewport { flex: 1; overflow-y: auto; }
        .terminal-table { width: 100%; border-collapse: collapse; }
        .terminal-table th { background: var(--color-bg); padding: 0.75rem 1.5rem; text-align: left; font-size: 0.7rem; font-family: monospace; color: var(--color-text-muted); position: sticky; top: 0; }
        .terminal-table td { padding: 0.85rem 1.5rem; border-bottom: 1px solid var(--color-border); font-size: 0.9rem; }
        .terminal-table tr:hover { background: rgba(var(--button-color-rgb, 79, 70, 229), 0.02); }
        
        .font-mono { font-family: monospace; }
        .status-pill { font-size: 0.65rem; font-weight: 800; padding: 0.15rem 0.5rem; border-radius: 100px; display: inline-block; }
        .status-pill.normal { background: rgba(79, 70, 229, 0.1); color: var(--button-color); }
        .status-pill.overdue { background: rgba(239, 68, 68, 0.1); color: var(--color-danger); }
        .overdue-row { background: rgba(239, 68, 68, 0.02); }

        .actions { display: flex; gap: 0.5rem; }
        .btn-action-return { background: var(--button-color); color: white; border: none; font-size: 0.7rem; font-weight: 800; padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; }
        .btn-action-renew { background: transparent; border: 1px solid var(--color-border); color: var(--color-text); font-size: 0.7rem; font-weight: 800; padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; }
        .btn-action-renew:hover { border-color: var(--button-color); color: var(--button-color); background: rgba(var(--button-color-rgb, 79, 70, 229), 0.04); }

        .empty-msg { padding: 3rem; text-align: center; color: var(--color-text-muted); font-size: 0.8rem; font-family: monospace; letter-spacing: 0.1em; }

        .page-loader { display: flex; align-items: center; justify-content: center; height: 300px; color: var(--color-text-muted); font-family: monospace; letter-spacing: 0.2em; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        @media (max-width: 1000px) {
          .terminal-grid { grid-template-columns: 1fr; }
          .return-terminal { height: auto; max-height: none; }
        }
      `}</style>
    </div>
  );
}
