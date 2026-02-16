import React, { useState, useEffect } from 'react';

/**
 * ExitPinGate Component
 * Intercepts application exit and requires a PIN to proceed.
 */
export function ExitPinGate() {
    const [show, setShow] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);

    useEffect(() => {
        if (window.klms?.onExitPinRequest) {
            window.klms.onExitPinRequest(() => {
                setShow(true);
                setPin('');
                setError(false);
            });
        }
    }, []);

    const handleExit = async () => {
        try {
            const config = await window.klms.config.getAll();
            const correctPin = config.exit_pin || '1234';

            if (pin === correctPin) {
                window.klms.quit();
            } else {
                setError(true);
                setPin('');
            }
        } catch (err) {
            console.error('Failed to verify Exit PIN:', err);
        }
    };

    if (!show) return null;

    return (
        <div className="exit-gate-overlay">
            <div className="exit-gate-card">
                <h3>Application Security</h3>
                <p>Enter Exit PIN to close the application.</p>

                <div className="pin-input-container">
                    <input
                        type="password"
                        className={error ? 'error' : ''}
                        placeholder="····"
                        value={pin}
                        onChange={(e) => {
                            setError(false);
                            setPin(e.target.value);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleExit()}
                        autoFocus
                    />
                    {error && <div className="error-text">Incorrect PIN. Please try again.</div>}
                </div>

                <div className="gate-actions">
                    <button className="btn-cancel" onClick={() => setShow(false)}>Cancel</button>
                    <button className="btn-exit" onClick={handleExit}>Exit Application</button>
                </div>
            </div>

            <style>{`
        .exit-gate-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          animation: fadeIn 0.2s ease-out;
        }
        .exit-gate-card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 2rem;
          width: 320px;
          text-align: center;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        }
        .exit-gate-card h3 { color: #fbbf24; margin-bottom: 0.5rem; font-size: 1.25rem; }
        .exit-gate-card p { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; }
        
        .pin-input-container { margin-bottom: 1.5rem; }
        .pin-input-container input {
          width: 100%;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 8px;
          color: white;
          padding: 0.75rem;
          text-align: center;
          font-size: 1.5rem;
          letter-spacing: 0.5rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .pin-input-container input:focus { border-color: #fbbf24; }
        .pin-input-container input.error { border-color: #ef4444; animation: shake 0.4s; }
        
        .error-text { color: #ef4444; font-size: 0.8rem; margin-top: 0.5rem; }
        
        .gate-actions { display: flex; gap: 0.75rem; }
        .gate-actions button {
          flex: 1;
          padding: 0.75rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-cancel { background: #334155; color: white; border: none; }
        .btn-cancel:hover { background: #475569; }
        .btn-exit { background: #fbbf24; color: #1e293b; border: none; }
        .btn-exit:hover { background: #f59e0b; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
        </div>
    );
}
