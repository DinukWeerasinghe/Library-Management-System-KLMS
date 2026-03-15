import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DialogService } from '../services/DialogService';

const REPORT_TYPES_KEYS = ['issued', 'returned', 'overdue', 'member'];

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
  const { t } = useTranslation();
  const REPORT_TYPES = REPORT_TYPES_KEYS.map(id => ({ id, label: t(`reports.${id}Report`) }));
  const [reportType, setReportType] = useState('issued');
  const [memberId, setMemberId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [members, setMembers] = useState([]);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ totalIssued: 0, totalReturned: 0, totalOverdue: 0, totalFineCollected: 0 });
  const [mostBorrowed, setMostBorrowed] = useState([]);
  const [topMembers, setTopMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const reportsEnabled = Boolean(features.enable_reports);

  useEffect(() => {
    if (reportsEnabled && reportType === 'member') {
      window.klms.members.getAll({ pageSize: 1000 })
        .then(res => setMembers(res.items || []))
        .catch(() => setMembers([]));
    }
  }, [reportsEnabled, reportType]);

  useEffect(() => {
    if (!reportsEnabled) return;
    setLoading(true);

    window.klms.reports.getReport(
      reportType,
      memberId ? parseInt(memberId, 10) : null,
      fromDate || null,
      toDate || null
    )
      .then((res) => {
        setRows(Array.isArray(res.data) ? res.data : []);
        setSummary(res.summary || { totalIssued: 0, totalReturned: 0, totalOverdue: 0, totalFineCollected: 0 });
        setMostBorrowed(res.mostBorrowed || []);
        setTopMembers(res.topMembers || []);
      })
      .catch(() => {
        DialogService.showError('Failed to load report');
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [reportsEnabled, reportType, memberId, fromDate, toDate]);

  const handleExportCSV = () => {
    if (rows.length === 0) {
      DialogService.showInfo('No data to export');
      return;
    }
    downloadCSV(rows, `report_${reportType}.csv`);
    DialogService.showSuccess('Report exported successfully');
  };

  if (!reportsEnabled) {
    return (
      <div className="reports-page reports-disabled">
        <p>{t('reports.disabledMsg')}</p>
      </div>
    );
  }

  const columns =
    rows.length > 0
      ? [
        'id', 'member_name', 'member_type', 'book_title', 'book_author',
        'issue_date', 'due_date', 'return_date', 'status', 'fine_amount',
      ].filter((k) => k in rows[0])
      : [];

  return (
    <>
      <div className="reports-page">
        <div className="view-header">
          <div>
            <h2>Library Reports</h2>
            <p className="subtitle">Insights into books, members, and transactions</p>
          </div>
          <button
            type="button"
            className="btn-export"
            onClick={handleExportCSV}
            disabled={loading || rows.length === 0}
          >
            Export CSV
          </button>
        </div>

        <div className="reports-toolbar">
          <div className="toolbar-group">
            <label>{t('reports.reportType')}
              <select value={reportType} onChange={(e) => setReportType(e.target.value)} disabled={loading}>
                {REPORT_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
              </select>
            </label>
            {reportType === 'member' && (
              <label>{t('reports.member')}
                <select value={memberId} onChange={(e) => setMemberId(e.target.value)} disabled={loading}>
                  <option value="">{t('reports.allMembers')}</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.member_type})</option>)}
                </select>
              </label>
            )}
          </div>
          <div className="toolbar-group">
            <label>{t('reports.fromDate')}
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} disabled={loading} />
            </label>
            <label>{t('reports.toDate')}
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} disabled={loading} />
            </label>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card"><span className="stat-label">{t('reports.totalIssued')}</span><span className="stat-value">{summary.totalIssued}</span></div>
          <div className="stat-card"><span className="stat-label">{t('reports.totalReturned')}</span><span className="stat-value">{summary.totalReturned}</span></div>
          <div className="stat-card"><span className="stat-label">{t('reports.overdueNow')}</span><span className="stat-value warning">{summary.totalOverdue}</span></div>
          <div className="stat-card"><span className="stat-label">{t('reports.fineCollected')}</span><span className="stat-value success">LKR {summary.totalFineCollected.toFixed(2)}</span></div>
        </div>

        <div className="insights-grid">
          <div className="insight-section card">
            <h3>{t('reports.mostBorrowed')}</h3>
            {mostBorrowed.length === 0 ? <p className="muted">{t('reports.noData')}</p> : (
              <table className="mini-table">
                <thead><tr><th>{t('reports.bookTitle')}</th><th>{t('reports.borrows')}</th></tr></thead>
                <tbody>
                  {mostBorrowed.map((b, i) => (
                    <tr key={i}><td>{b.title}</td><td>{b.borrow_count}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="insight-section card">
            <h3>{t('reports.topMembers')}</h3>
            {topMembers.length === 0 ? <p className="muted">{t('reports.noData')}</p> : (
              <table className="mini-table">
                <thead><tr><th>{t('reports.memberCol')}</th><th>{t('reports.issues')}</th></tr></thead>
                <tbody>
                  {topMembers.map((m, i) => (
                    <tr key={i}><td>{m.name}</td><td>{m.issue_count}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="reports-table-wrap card">
          <div className="table-header">
            <h3>{t('reports.detailedRecords')}</h3>
            <span className="count-badge">{rows.length} {t('reports.records')}</span>
          </div>
          {loading ? (
            <div className="loading-state">{t('reports.loadingReport')}</div>
          ) : rows.length === 0 ? (
            <p className="empty">{t('reports.noRecords')}</p>
          ) : (
            <table className="reports-table">
              <thead>
                <tr>{columns.map((col) => <th key={col}>{col.replace(/_/g, ' ')}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id != null ? row.id : idx}>
                    {columns.map((col) => <td key={col}>{row[col] ?? '–'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style>{`
        .reports-page { display: flex; flex-direction: column; gap: 1.5rem; }
        .reports-page .view-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .reports-page h2 { font-size: 1.5rem; margin-bottom: 0.25rem; }
        .reports-page .subtitle { color: var(--color-text-muted); font-size: 0.95rem; }
        .reports-disabled p { color: var(--color-text-muted); }

        .reports-toolbar { 
          display: flex; 
          flex-wrap: wrap; 
          gap: 2rem; 
          background: var(--color-surface); 
          padding: 1.5rem; 
          border-radius: var(--radius); 
          border: 1px solid var(--color-border);
        }
        .toolbar-group { display: flex; gap: 1rem; flex: 1; min-width: 300px; }
        .reports-toolbar label { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem; font-weight: 600; color: var(--color-text-muted); }
        .reports-toolbar select, .reports-toolbar input { 
          padding: 0.65rem; 
          border: 1px solid var(--color-border); 
          border-radius: var(--radius); 
          background: var(--color-bg); 
          color: var(--color-text);
          font-family: inherit;
        }

        .btn-export {
          padding: 0.6rem 1.2rem;
          background: var(--button-color);
          color: var(--header-text-color);
          border: none;
          border-radius: var(--radius);
          font-weight: 600;
          cursor: pointer;
        }
        .btn-export:hover:not(:disabled) { filter: brightness(1.1); }
        .btn-export:disabled { opacity: 0.6; cursor: not-allowed; }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
        .stat-card { 
          background: var(--color-surface); 
          padding: 1.5rem; 
          border-radius: var(--radius); 
          border: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .stat-label { font-size: 0.8rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
        .stat-value { font-size: 1.75rem; font-weight: 700; color: var(--color-text); }
        .stat-value.warning { color: #f59e0b; }
        .stat-value.success { color: #10b981; }

        .insights-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; }
        .insight-section { padding: 1.5rem; }
        .insight-section h3 { font-size: 1rem; margin-bottom: 1rem; color: var(--color-text); }
        
        .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); }
        
        .mini-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        .mini-table th, .mini-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--color-border); }
        .mini-table th { color: var(--color-text-muted); font-weight: 600; }

        .reports-table-wrap { padding: 1.5rem; overflow-x: auto; }
        .table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .table-header h3 { font-size: 1rem; margin: 0; }
        .count-badge { font-size: 0.75rem; padding: 0.25rem 0.5rem; background: var(--color-bg); border-radius: 12px; color: var(--color-text-muted); border: 1px solid var(--color-border); }
        
        .reports-table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
        .reports-table th, .reports-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--color-border); white-space: nowrap; }
        .reports-table th { color: var(--color-text-muted); font-weight: 600; background: var(--color-bg); }
        .loading-state { padding: 2rem; text-align: center; color: var(--color-text-muted); font-style: italic; }
        .muted { color: var(--color-text-muted); font-size: 0.9rem; margin-top: 1rem; }
      `}</style>
    </>
  );
}
