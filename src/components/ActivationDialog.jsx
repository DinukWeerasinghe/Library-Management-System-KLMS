import React, { useState, useEffect } from 'react';
import { Upload, Key, Computer, ShieldAlert, CheckCircle, X } from 'lucide-react';

export function ActivationDialog({ onActivated, onClose, canClose = false }) {
    const [status, setStatus] = useState(null);
    const [key, setKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        setLoading(true);
        try {
            const res = await window.klms.license.getStatus();
            setStatus(res);
        } catch (err) {
            console.error('Failed to load license status:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async (e) => {
        e.preventDefault();
        if (!key) return;
        setSubmitting(true);
        setError('');
        try {
            const res = await window.klms.license.activate(key);
            if (res.success) {
                if (onActivated) onActivated();
            } else {
                setError(res.error || 'Invalid activation key.');
            }
        } catch (err) {
            setError('System error during activation.');
        } finally {
            setSubmitting(false);
        }
    };

    const copyMachineId = () => {
        if (status?.machineId) {
            navigator.clipboard.writeText(status.machineId);
            alert('Machine ID copied to clipboard');
        }
    };

    if (loading) return <div className="activation-screen">Loading license status...</div>;

    return (
        <div className="activation-overlay">
            <div className="activation-card" style={{ position: 'relative' }}>
                {canClose && (
                    <button
                        onClick={onClose}
                        style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                    >
                        <X size={24} />
                    </button>
                )}
                <div className="activation-header">
                    <ShieldAlert size={48} className="text-amber-500" />
                    <h2>Software Activation Required</h2>
                    <p>Your trial has expired or the software is not yet activated for this machine.</p>
                </div>

                <div className="machine-info">
                    <div className="info-label">Your Machine ID:</div>
                    <div className="id-box">
                        <code>{status?.machineId}</code>
                        <button onClick={copyMachineId} title="Copy Code">
                            <Computer size={16} />
                        </button>
                    </div>
                </div>

                <form className="activation-form" onSubmit={handleActivate}>
                    <label>Activation Key</label>
                    <div className="input-group">
                        <Key size={18} className="input-icon" />
                        <input
                            type="text"
                            placeholder="XXXX-XXXX-XXXX"
                            value={key}
                            onChange={(e) => setKey(e.target.value.toUpperCase())}
                            disabled={submitting}
                            required
                        />
                    </div>
                    {error && <div className="error-msg">{error}</div>}
                    <button type="submit" className="btn-activate" disabled={submitting}>
                        {submitting ? 'Verifying...' : 'Activate Software'}
                    </button>
                </form>

                <div className="activation-footer">
                    <p>Provide your Machine ID to your vendor to receive an Activation Key.</p>
                </div>
            </div>

            <style>{`
                .activation-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.95);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    color: white;
                    font-family: sans-serif;
                    backdrop-filter: blur(8px);
                }
                .activation-card {
                    background: #1e293b;
                    padding: 2.5rem;
                    border-radius: 1rem;
                    width: 450px;
                    border: 1px solid #334155;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }
                .activation-header { text-align: center; margin-bottom: 2rem; }
                .activation-header h2 { font-size: 1.5rem; margin: 1rem 0 0.5rem; }
                .activation-header p { color: #94a3b8; font-size: 0.9rem; line-height: 1.4; }
                
                .machine-info { background: #0f172a; padding: 1rem; border-radius: 0.5rem; margin-bottom: 2rem; }
                .info-label { font-size: 0.75rem; color: #64748b; font-weight: 600; margin-bottom: 0.5rem; }
                .id-box { display: flex; align-items: center; justify-content: space-between; font-family: monospace; }
                .id-box code { color: #818cf8; font-size: 1.1rem; }
                .id-box button { background: none; border: none; color: #64748b; cursor: pointer; padding: 4px; }
                .id-box button:hover { color: #818cf8; }

                .activation-form label { display: block; font-size: 0.85rem; font-weight: 600; color: #94a3b8; margin-bottom: 0.5rem; }
                .input-group { position: relative; margin-bottom: 1.5rem; }
                .input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #64748b; }
                .input-group input {
                    width: 100%;
                    padding: 0.75rem 0.75rem 0.75rem 40px;
                    background: #0f172a;
                    border: 1px solid #334155;
                    border-radius: 0.5rem;
                    color: white;
                    font-family: monospace;
                    font-size: 1.1rem;
                    letter-spacing: 0.1em;
                }
                .input-group input:focus { border-color: #4f46e5; outline: none; }
                
                .btn-activate {
                    width: 100%;
                    padding: 0.75rem;
                    background: #4f46e5;
                    color: white;
                    border: none;
                    border-radius: 0.5rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .btn-activate:hover { background: #4338ca; }
                .btn-activate:disabled { opacity: 0.5; cursor: not-allowed; }
                
                .error-msg { color: #ef4444; font-size: 0.8rem; margin-top: -1rem; margin-bottom: 1rem; font-weight: 600; }
                
                .activation-footer { margin-top: 2rem; text-align: center; border-t: 1px solid #334155; padding-top: 1.5rem; }
                .activation-footer p { color: #64748b; font-size: 0.75rem; font-style: italic; }
            `}</style>
        </div>
    );
}
