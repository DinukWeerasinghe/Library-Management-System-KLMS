import React, { useState, useEffect } from 'react';

/**
 * LockScreen Component
 * Full-screen overlay with strict CSS variable usage and dynamic logo.
 */
export function LockScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logo, setLogo] = useState(null);

  useEffect(() => {
    // Load school logo dynamically
    if (window.klms?.config?.get) {
      window.klms.config.get('school_logo').then(setLogo).catch(() => { });
    }
  }, []);

  const handleUnlock = async () => {
    setLoading(true);
    try {
      const config = await window.klms.config.getAll();
      const correctPin = config.lock_pin || '1111';

      if (pin === correctPin) {
        onUnlock();
      } else {
        setError(true);
        setPin('');
        // Reset error animation after it completes
        setTimeout(() => setError(false), 500);
      }
    } catch (err) {
      console.error('Failed to verify Lock PIN:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lock-screen-overlay">
      <div className={`lock-screen-card ${error ? 'shake' : ''}`}>
        {logo && <img src={logo} alt="School Logo" className="lock-logo" />}
        <h2 className="lock-title">Session Locked</h2>
        <p className="lock-subtitle">Enter PIN to Unlock</p>

        <div className="pin-input-container">
          <input
            type="password"
            placeholder="····"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
            }}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleUnlock()}
            autoFocus
            disabled={loading}
          />
        </div>

        <button
          className="btn-unlock"
          onClick={handleUnlock}
          disabled={loading || !pin}
        >
          {loading ? 'Unlocking...' : 'Unlock'}
        </button>
      </div>

      <style>{`
        .lock-screen-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100000;
        }
        
        .lock-screen-card {
          background: var(--background-color);
          border: 2px solid var(--secondary-color);
          border-radius: 12px;
          padding: 2rem;
          width: 350px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .lock-logo {
          max-height: 60px;
          margin-bottom: 1rem;
          display: block;
          margin-left: auto;
          margin-right: auto;
        }

        .lock-title {
          color: var(--primary-color);
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .lock-subtitle {
          color: var(--header-text-color);
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
        }

        .pin-input-container {
          margin-bottom: 1.5rem;
        }

        .pin-input-container input {
          width: 100%;
          background: transparent;
          border: 1px solid var(--secondary-color);
          border-radius: 8px;
          color: var(--header-text-color);
          padding: 0.75rem;
          text-align: center;
          font-size: 1.25rem;
          letter-spacing: 0.5rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .pin-input-container input:focus {
          border-color: var(--primary-color);
        }

        .btn-unlock {
          width: 100%;
          background: var(--button-color);
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-unlock:hover:not(:disabled) {
          background: var(--button-hover-color);
        }

        .btn-unlock:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }

        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
}
