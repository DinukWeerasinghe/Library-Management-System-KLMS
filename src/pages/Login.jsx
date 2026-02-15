import React, { useState } from 'react';
import { Logo } from '../components/Logo';

export function Login({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await window.klms.auth.login(username, password);
      // Short delay for better UX
      await new Promise(r => setTimeout(r, 500));

      if (result.success) {
        onSuccess(result);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <Logo size="large" />
          <p className="login-subtitle">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Enter your username"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="btn-primary full-width" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>

      <div className="login-footer">
        <p>© {new Date().getFullYear()} KLMS - Library Management System</p>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--color-bg);
          padding: 1rem;
        }
        
        .login-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 2.5rem;
          width: 100%;
          max-width: 400px;
          box-shadow: var(--shadow-lg);
        }
        
        .login-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 2rem;
          text-align: center;
        }
        
        .login-subtitle {
          color: var(--color-text-muted);
          margin-top: 1rem;
          font-size: 0.95rem;
        }
        
        .form-group {
          margin-bottom: 1.25rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: var(--color-text);
          font-weight: 500;
          font-size: 0.9rem;
        }
        
        .login-error {
          background: var(--overlay-light);
          color: var(--color-danger);
          padding: 0.75rem;
          border-radius: var(--radius);
          font-size: 0.875rem;
          margin-bottom: 1.25rem;
          text-align: center;
          border: 1px solid var(--overlay-light);
        }
        
        .btn-primary.full-width {
          width: 100%;
          padding: 0.75rem;
          font-size: 1rem;
          background: var(--button-color);
          color: var(--header-text-color);
        }
        
        .btn-primary.full-width:hover {
          background: var(--button-hover-color);
        }
        
        .login-footer {
          margin-top: 2rem;
          color: var(--color-text-muted);
          font-size: 0.8rem;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
