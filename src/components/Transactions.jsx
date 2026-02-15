import React, { useState, useEffect } from 'react';

export function Transactions({ features = {} }) {
  const [members, setMembers] = useState([]);
  const [books, setBooks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [issueMemberId, setIssueMemberId] = useState('');
  const [issueBookId, setIssueBookId] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filter, setFilter] = useState('ISSUED'); // ISSUED | RETURNED | ''

  const load = () => {
    setLoading(true);
    Promise.all([
      window.klms.members.getAll({}),
      window.klms.books.getAll({}),
      window.klms.issues.getAll(filter ? { status: filter } : {}),
    ])
      .then(([m, b, i]) => {
        setMembers(m);
        setBooks(b);
        setIssues(i);
      })
      .catch(() => setMessage({ type: 'error', text: 'Failed to load' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [filter]);

  const availableBooks = books.filter((b) => b.available_copies > 0);

  const handleIssue = async () => {
    setMessage({ type: '', text: '' });
    const memberId = parseInt(issueMemberId, 10);
    const bookId = parseInt(issueBookId, 10);
    if (!memberId || !bookId) {
      setMessage({ type: 'error', text: 'Select a member and a book' });
      return;
    }
    try {
      await window.klms.issues.issueBook(memberId, bookId);
      setMessage({ type: 'success', text: 'Book issued successfully' });
      setIssueMemberId('');
      setIssueBookId('');
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to issue' });
    }
  };

  const handleReturn = async (issueId) => {
    setMessage({ type: '', text: '' });
    try {
      const issue = await window.klms.issues.returnBook(issueId);
      const fine = issue.fine_amount > 0 ? ` Fine: ${issue.fine_amount}` : '';
      setMessage({ type: 'success', text: `Book returned.${fine}` });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to return' });
    }
  };

  const handleRenew = async (issueId) => {
    if (!features.enable_renewal) {
      setMessage({ type: 'error', text: 'Renewal is disabled in settings' });
      return;
    }
    setMessage({ type: '', text: '' });
    try {
      await window.klms.issues.renewBook(issueId);
      setMessage({ type: 'success', text: 'Due date extended' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to renew' });
    }
  };

  return (
    <div className="transactions-view">
      <h2>Issue & Return</h2>

      <div className="issue-card">
        <h3>Issue book (lend)</h3>
        <div className="form-row">
          <label>
            Member
            <select value={issueMemberId} onChange={(e) => setIssueMemberId(e.target.value)}>
              <option value="">Select member</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.member_type})</option>
              ))}
            </select>
          </label>
          <label>
            Book (available only)
            <select value={issueBookId} onChange={(e) => setIssueBookId(e.target.value)}>
              <option value="">Select book</option>
              {availableBooks.map((b) => (
                <option key={b.id} value={b.id}>{b.title} – {b.available_copies} left</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-primary" onClick={handleIssue}>Issue book</button>
        </div>
        {availableBooks.length === 0 && <p className="muted">No books available to issue.</p>}
      </div>

      {message.text && (
        <p className={`msg ${message.type}`}>{message.text}</p>
      )}

      <div className="issues-section">
        <div className="section-header">
          <h3>Transactions</h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="ISSUED">Issued (out)</option>
            <option value="RETURNED">Returned</option>
            <option value="">All</option>
          </select>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Book</th>
                <th>Issue date</th>
                <th>Due date</th>
                <th>Return date</th>
                <th>Fine</th>
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
                  <td>{i.return_date || '–'}</td>
                  <td>{i.fine_amount > 0 ? i.fine_amount : '–'}</td>
                  <td>
                    {!i.return_date && (
                      <>
                        <button type="button" className="btn-sm btn-return" onClick={() => handleReturn(i.id)}>Return</button>
                        {features.enable_renewal && (
                          <button type="button" className="btn-sm" onClick={() => handleRenew(i.id)}>Renew</button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && issues.length === 0 && <p className="muted">No transactions found.</p>}
      </div>

      <style>{`
        .transactions-view h2 { font-size: 1.25rem; margin-bottom: 1rem; }
        .issue-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 1rem; margin-bottom: 1rem; }
        .issue-card h3 { font-size: 1rem; margin-bottom: 0.75rem; }
        .form-row { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; }
        .form-row label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem; color: var(--color-text-muted); min-width: 180px; }
        .form-row select { padding: 0.5rem; border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-bg); color: var(--color-text); }
        .btn-primary { background: var(--color-primary); color: #fff; border: none; padding: 0.5rem 1rem; border-radius: var(--radius); font-weight: 600; }
        .btn-primary:hover { background: var(--color-primary-hover); }
        .muted { color: var(--color-text-muted); font-size: 0.875rem; margin-top: 0.5rem; }
        .msg { margin-bottom: 0.5rem; font-size: 0.875rem; }
        .msg.success { color: var(--color-success); }
        .msg.error { color: var(--color-danger); }
        .issues-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 1rem; }
        .issues-section h3 { font-size: 1rem; margin-bottom: 0.75rem; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
        .section-header select { padding: 0.4rem; border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-bg); color: var(--color-text); }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid var(--color-border); }
        .data-table th { color: var(--color-text-muted); font-weight: 600; font-size: 0.875rem; }
        .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.25rem; border: 1px solid var(--color-border); background: var(--color-surface-hover); color: var(--color-text); border-radius: 4px; }
        .btn-sm:hover { background: var(--color-border); }
        .btn-sm.btn-return { color: var(--color-success); }
      `}</style>
    </div>
  );
}
