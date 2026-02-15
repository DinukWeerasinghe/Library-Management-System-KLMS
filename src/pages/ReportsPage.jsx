import React, { useState, useEffect } from 'react';
import { AppDialog } from '../components/AppDialog';

const REPORT_TYPES = [
  { id: 'issued', label: 'Issued Books Report' },
  { id: 'returned', label: 'Returned Books Report' },
  { id: 'overdue', label: 'Overdue Books Report' },
  { id: 'member', label: 'Member-wise Borrowing Report' },
];

function buildCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  };
  const line = (row) => headers.map((h) => escape(row[h])).join(',');
  return [headers.join(','), ...rows.map(line)].join('\r\n');
}

function downloadCSV(rows, filename = 'report.csv') {
  const csv = buildCSV(rows);
  if (!csv) return;
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage({ features = {} }) {
  const [reportType, setReportType] = useState('issued');
  const [memberId, setMemberId] = useState('');
  const [members, setMembers] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState({ open: false, type: 'info', message: '' });

  const reportsEnabled = Boolean(features.enable_reports);
  const showDialog = (type, message) => setDialog({ open: true, type, message });
  const closeDialog = () => setDialog((d) => ({ ...d, open: false }));

  useEffect(() => {
    if (reportsEnabled && reportType === 'member') {
      window.klms.members.getAll({}).then(setMembers).catch(() => setMembers([]));
    }
  }, [reportsEnabled, reportType]);

  useEffect(() => {
    if (!reportsEnabled) return;
    setLoading(true);
    const promise =
      reportType === 'member'
        ? window.klms.reports.getReport('member', memberId ? parseInt(memberId, 10) : null)
        : window.klms.reports.getReport(reportType);
    promise
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => {
        showDialog('error', 'Failed to load report');
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [reportsEnabled, reportType, memberId]);

  const handleExportCSV = () => {
    if (rows.length === 0) {
      showDialog('info', 'No data to export');
      return;
    }
    downloadCSV(rows, 'report.csv');
    showDialog('success', 'Report exported as report.csv');
  };

  if (!reportsEnabled) {
    return (
      <div className="reports-page reports-disabled">
        <p>Reports are disabled. Enable &quot;Enable reports&quot; in Settings to access this page.</p>
      </div>
    );
  }

  const columns =
    rows.length > 0
      ? [
          'id',
          'member_name',
          'member_type',
          'book_title',
          'book_author',
          'issue_date',
          'due_date',
          'return_date',
          'status',
          'fine_amount',
        ].filter((k) => k in rows[0])
      : [];

  return (
    <div className="reports-page">
      <h2>Reports</h2>
      <p className="subtitle">View and export issue/return data</p>

      <div className="reports-toolbar">
        <label>
          Report type
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            disabled={loading}
          >
            {REPORT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        {reportType === 'member' && (
          <label>
            Member
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              disabled={loading}
            >
              <option value="">All (all issues)</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.member_type})
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          className="btn-export"
          onClick={handleExportCSV}
          disabled={loading || rows.length === 0}
        >
          Export to CSV
        </button>
      </div>

      <div className="reports-table-wrap">
        {loading ? (
          <p>Loading...</p>
        ) : rows.length === 0 ? (
          <p className="empty">No records found.</p>
        ) : (
          <table className="reports-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col}>{col.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id != null ? row.id : idx}>
                  {columns.map((col) => (
                    <td key={col}>{row[col] ?? '–'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AppDialog open={dialog.open} type={dialog.type} message={dialog.message} onClose={closeDialog} />

      <style>{`
        .reports-page h2 { font-size: 1.25rem; margin-bottom: 0.25rem; }
        .reports-page .subtitle { color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 1rem; }
        .reports-disabled p { color: var(--color-text-muted); }
        .reports-toolbar { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; margin-bottom: 1rem; }
        .reports-toolbar label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem; color: var(--color-text-muted); }
        .reports-toolbar select { padding: 0.5rem; border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); color: var(--color-text); min-width: 200px; }
        .reports-toolbar .btn-export {
          padding: 0.5rem 1rem;
          background: var(--button-color);
          color: var(--header-text-color);
          border: none;
          border-radius: var(--radius);
          font-weight: 600;
          cursor: pointer;
        }
        .reports-toolbar .btn-export:hover:not(:disabled) { background: var(--button-hover-color); }
        .reports-toolbar .btn-export:disabled { opacity: 0.6; cursor: not-allowed; }
        .reports-table-wrap { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 1rem; overflow-x: auto; }
        .reports-table-wrap .empty { color: var(--color-text-muted); padding: 0.5rem 0; }
        .reports-table { width: 100%; border-collapse: collapse; }
        .reports-table th, .reports-table td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid var(--color-border); }
        .reports-table th { color: var(--color-text-muted); font-weight: 600; font-size: 0.875rem; }
      `}</style>
    </div>
  );
}
