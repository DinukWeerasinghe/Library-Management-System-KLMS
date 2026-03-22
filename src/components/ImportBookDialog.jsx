import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, CheckCircle, XCircle, Save } from 'lucide-react';
import { DialogService } from '../services/DialogService';

export function ImportBookDialog({ onClose, onImportComplete }) {
    const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Importing, 4: Result
    const [previewData, setPreviewData] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const unsubRef = useRef(null);

    useEffect(() => {
        // Subscribe to progress events
        if (window.klms?.import?.onProgress) {
            unsubRef.current = window.klms.import.onProgress((data) => {
                if (data.type === 'book') setProgress({ done: data.done, total: data.total });
            });
        }
        return () => { if (unsubRef.current) unsubRef.current(); };
    }, []);

    const handleDownloadTemplate = async () => {
        try {
            const res = await window.klms.books.downloadTemplate();
            if (res.success) DialogService.showSuccess('Template downloaded successfully.');
            else if (res.error) DialogService.showError(res.error);
        } catch (err) {
            DialogService.showError('Failed to download template: ' + err.message);
        }
    };

    const handlePreview = async () => {
        setLoading(true);
        try {
            const res = await window.klms.books.previewImport();
            if (res.canceled) return;
            if (res.success) { setPreviewData(res.result); setStep(2); }
            else DialogService.showError(res.error || 'Preview failed.');
        } catch (err) {
            DialogService.showError('Preview process failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleExecute = async () => {
        const total = previewData.rows.filter(r => r.status !== 'INVALID').length;
        setProgress({ done: 0, total });
        setStep(3);
        try {
            const res = await window.klms.books.executeImport(previewData.rows);
            if (res.success) {
                setResult(res.result);
                setStep(4);
                if (onImportComplete) onImportComplete();
            } else {
                DialogService.showError(res.error || 'Import failed.');
                setStep(2);
            }
        } catch (err) {
            DialogService.showError('Import execution failed.');
            setStep(2);
        }
    };

    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    const isImporting = step === 3;

    const renderStep1 = () => (
        <div className="modal-body">
            <div className="section">
                <h4>Step 1: Get Template</h4>
                <p className="muted">Download the CSV template to see the required format.</p>
                <button onClick={handleDownloadTemplate} className="btn-secondary">
                    <Download size={16} /> Download Template
                </button>
            </div>
            <div className="divider" />
            <div className="section">
                <h4>Step 2: Upload CSV</h4>
                <p className="muted">Select your filled CSV file to preview the import.</p>
                <button onClick={handlePreview} className="btn-primary" disabled={loading}>
                    {loading ? 'Analyzing...' : <><Upload size={16} /> Select File & Preview</>}
                </button>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="modal-body">
            <div className="summary-header">
                <div className="stat-badge new"><span className="count">{previewData.summary.new}</span><span className="label">New Books</span></div>
                <div className="stat-badge merge"><span className="count">{previewData.summary.merge}</span><span className="label">Duplicates (Merge)</span></div>
                <div className="stat-badge invalid"><span className="count">{previewData.summary.invalid}</span><span className="label">Invalid</span></div>
            </div>
            <div className="preview-table-container">
                <table className="preview-table">
                    <thead><tr><th>Status</th><th>Title</th><th>Author</th><th>ISBN</th><th>Copies</th></tr></thead>
                    <tbody>
                        {previewData.rows.map((row) => (
                            <tr key={row.id} className={`row-${row.status.toLowerCase()}`}>
                                <td><span className={`status-pill ${row.status.toLowerCase()}`}>{row.status}</span></td>
                                <td>{row.data.title || <i className="muted">Missing</i>}{row.message && <div className="row-msg">{row.message}</div>}</td>
                                <td>{row.data.author}</td>
                                <td>{row.data.isbn}</td>
                                <td>{row.data.total_copies}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="modal-actions">
                <button onClick={() => setStep(1)} className="btn-secondary">Cancel</button>
                <button onClick={handleExecute} className="btn-primary">
                    <Save size={16} /> Confirm Import
                </button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="modal-body progress-body">
            <div className="progress-icon">⏳</div>
            <h4>Importing {progress.total.toLocaleString()} books...</h4>
            <p className="muted">Please wait. Do not close this window.</p>
            <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="progress-label">{progress.done.toLocaleString()} / {progress.total.toLocaleString()} &nbsp;({pct}%)</div>
        </div>
    );

    const renderStep4 = () => (
        <div className="modal-body">
            <div className="result-summary">
                <div className="stat success"><CheckCircle size={24} /><div><span className="value">{result.success}</span><span className="label">Imported</span></div></div>
                <div className="stat failed"><XCircle size={24} /><div><span className="value">{result.failed}</span><span className="label">Failed</span></div></div>
            </div>
            {result.errors && result.errors.length > 0 && (
                <div className="error-list">
                    <h4>Error Details</h4>
                    <table>
                        <thead><tr><th>Row</th><th>Message</th></tr></thead>
                        <tbody>{result.errors.map((err, idx) => <tr key={idx}><td>{err.row}</td><td>{err.message}</td></tr>)}</tbody>
                    </table>
                </div>
            )}
            <div className="modal-actions">
                <button onClick={onClose} className="btn-primary">Close</button>
            </div>
        </div>
    );

    return (
        <div className="import-modal-overlay" onClick={isImporting ? undefined : onClose}>
            <div className="import-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Bulk Book Import{step === 2 ? ' - Preview' : step === 3 ? ' - Importing' : step === 4 ? ' - Results' : ''}</h3>
                    {!isImporting && <button className="close-btn" onClick={onClose}>×</button>}
                </div>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
            </div>
            <style>{`
                .import-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1100; backdrop-filter: blur(2px); }
                .import-modal { background: var(--color-surface); padding: 0; border-radius: var(--radius); width: 800px; max-width: 95%; box-shadow: 0 10px 30px rgba(0,0,0,0.3); border: 1px solid var(--color-border); display: flex; flex-direction: column; max-height: 90vh; }
                .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid var(--color-border); }
                .modal-header h3 { margin: 0; font-size: 1.1rem; color: var(--color-text); }
                .close-btn { background: none; border: none; font-size: 1.5rem; color: var(--color-text-muted); cursor: pointer; }
                .modal-body { padding: 1.5rem; overflow-y: auto; }
                .section { margin-bottom: 1rem; }
                .section h4 { font-size: 1rem; margin-bottom: 0.5rem; }
                .muted { color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 1rem; }
                .divider { height: 1px; background: var(--color-border); margin: 1.5rem 0; }
                .summary-header { display: flex; gap: 1rem; margin-bottom: 1rem; }
                .stat-badge { flex: 1; padding: 0.75rem; border-radius: var(--radius); border: 1px solid transparent; text-align: center; }
                .stat-badge.new { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.2); color: #10b981; }
                .stat-badge.merge { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.2); color: #f59e0b; }
                .stat-badge.invalid { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.2); color: #ef4444; }
                .stat-badge .count { display: block; font-size: 1.25rem; font-weight: bold; }
                .stat-badge .label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; }
                .preview-table-container { border: 1px solid var(--color-border); border-radius: var(--radius); overflow-x: auto; max-height: 350px; }
                .preview-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
                .preview-table th { background: var(--color-bg); padding: 0.5rem; text-align: left; position: sticky; top: 0; font-weight: 600; color: var(--color-text-muted); border-bottom: 1px solid var(--color-border); }
                .preview-table td { padding: 0.5rem; border-bottom: 1px solid var(--color-border); vertical-align: top; color: var(--color-text); }
                .status-pill { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 12px; font-size: 0.7rem; font-weight: bold; }
                .status-pill.new { background: #d1fae5; color: #065f46; }
                .status-pill.merge { background: #fef3c7; color: #92400e; }
                .status-pill.invalid { background: #fee2e2; color: #991b1b; }
                .row-msg { font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.25rem; font-style: italic; }
                .result-summary { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
                .stat { flex: 1; display: flex; align-items: center; gap: 0.75rem; padding: 1rem; border-radius: var(--radius); border: 1px solid var(--color-border); }
                .stat.success { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.2); color: #10b981; }
                .stat.failed { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.2); color: #ef4444; }
                .stat .value { display: block; font-size: 1.5rem; font-weight: bold; }
                .stat .label { font-size: 0.75rem; }
                .error-list { max-height: 200px; overflow-y: auto; border: 1px solid var(--color-border); border-radius: var(--radius); margin-bottom: 1rem; }
                .error-list table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
                .error-list th, .error-list td { padding: 0.5rem; text-align: left; border-bottom: 1px solid var(--color-border); }
                .modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; }
                .btn-primary, .btn-secondary { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; border-radius: var(--radius); font-weight: 500; cursor: pointer; border: none; }
                .btn-primary { background: var(--button-color); color: var(--header-text-color); }
                .btn-secondary { background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-text); }
                .btn-secondary:hover { background: var(--color-surface-hover); }
                /* Progress */
                .progress-body { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 2.5rem 1.5rem; text-align: center; }
                .progress-icon { font-size: 2.5rem; }
                .progress-body h4 { margin: 0; font-size: 1.1rem; }
                .progress-bar-wrap { width: 100%; height: 12px; background: var(--color-border); border-radius: 99px; overflow: hidden; }
                .progress-bar-fill { height: 100%; background: var(--button-color); border-radius: 99px; transition: width 0.2s ease; }
                .progress-label { font-size: 0.85rem; color: var(--color-text-muted); font-family: monospace; }
            `}</style>
        </div>
    );
}
