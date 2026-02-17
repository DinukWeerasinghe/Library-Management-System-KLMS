import React, { useState } from 'react';
import { Download, Upload, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { DialogService } from '../services/DialogService';

export function ImportBookDialog({ onClose, onImportComplete }) {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleDownloadTemplate = async () => {
        try {
            const res = await window.klms.books.downloadTemplate();
            if (res.success) {
                DialogService.showSuccess('Template downloaded successfully.');
            } else if (res.error) {
                DialogService.showError(res.error);
            }
        } catch (err) {
            console.error(err);
            DialogService.showError('Failed to download template: ' + err.message);
        }
    };

    const handleImport = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await window.klms.books.import();
            if (res.canceled) {
                setLoading(false);
                return;
            }

            if (res.success) {
                setResult(res.result);
                if (onImportComplete) onImportComplete();
            } else {
                DialogService.showError(res.error || 'Import failed.');
            }
        } catch (err) {
            DialogService.showError('Import process failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="import-modal-overlay" onClick={onClose}>
            <div className="import-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Bulk Book Import</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                {!result ? (
                    <div className="modal-body step-1">
                        <div className="section">
                            <h4>Step 1: Get Template</h4>
                            <p className="muted">Download the CSV template to see the required format.</p>
                            <button onClick={handleDownloadTemplate} className="btn-secondary">
                                <Download size={16} /> Download Template
                            </button>
                        </div>

                        <div className="divider"></div>

                        <div className="section">
                            <h4>Step 2: Upload CSV</h4>
                            <p className="muted">Select your filled CSV file to start importing.</p>
                            <button onClick={handleImport} className="btn-primary" disabled={loading}>
                                {loading ? 'Processing...' : (
                                    <>
                                        <Upload size={16} /> Select File & Import
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="modal-body step-2">
                        <div className="result-summary">
                            <div className="stat success">
                                <CheckCircle size={24} />
                                <div>
                                    <span className="value">{result.success}</span>
                                    <span className="label">Success</span>
                                </div>
                            </div>
                            <div className="stat failed">
                                <XCircle size={24} />
                                <div>
                                    <span className="value">{result.failed}</span>
                                    <span className="label">Failed</span>
                                </div>
                            </div>
                        </div>

                        {result.errors && result.errors.length > 0 && (
                            <div className="error-list">
                                <h4>Error Details</h4>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Row</th>
                                            <th>Message</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.errors.map((err, idx) => (
                                            <tr key={idx}>
                                                <td>{err.row}</td>
                                                <td>{err.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="modal-actions">
                            <button onClick={onClose} className="btn-primary">Close</button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .import-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1100; backdrop-filter: blur(2px); }
                .import-modal { background: var(--color-surface); padding: 0; border-radius: var(--radius); width: 500px; max-width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.3); border: 1px solid var(--color-border); }
                .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; border-bottom: 1px solid var(--color-border); }
                .modal-header h3 { margin: 0; font-size: 1.25rem; color: var(--color-text); }
                .close-btn { background: none; border: none; font-size: 1.5rem; color: var(--color-text-muted); cursor: pointer; }
                
                .modal-body { padding: 1.5rem; }
                .section { margin-bottom: 1rem; }
                .section h4 { font-size: 1rem; margin-bottom: 0.5rem; color: var(--color-text); }
                .muted { color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 1rem; }
                
                .btn-primary, .btn-secondary { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; border-radius: var(--radius); font-weight: 500; cursor: pointer; border: none; }
                .btn-primary { background: var(--button-color); color: var(--header-text-color); }
                .btn-secondary { background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-text); }
                .btn-secondary:hover { background: var(--color-surface-hover); }

                .divider { height: 1px; background: var(--color-border); margin: 1.5rem 0; }

                .result-summary { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
                .stat { flex: 1; display: flex; align-items: center; gap: 0.75rem; padding: 1rem; border-radius: var(--radius); border: 1px solid var(--color-border); }
                .stat.success { background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); color: #10b981; }
                .stat.failed { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); color: #ef4444; }
                .stat .value { font-size: 1.5rem; font-weight: bold; display: block; line-height: 1; }
                .stat .label { font-size: 0.8rem; opacity: 0.8; }

                .error-list { max-height: 200px; overflow-y: auto; border: 1px solid var(--color-border); border-radius: var(--radius); }
                .error-list table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
                .error-list th, .error-list td { padding: 0.5rem; text-align: left; border-bottom: 1px solid var(--color-border); }
                .error-list th { background: var(--color-bg); font-weight: 600; color: var(--color-text); position: sticky; top: 0; }
                .error-list td { color: var(--color-text-muted); }

                .modal-actions { display: flex; justify-content: flex-end; margin-top: 1.5rem; }
            `}</style>
        </div>
    );
}
