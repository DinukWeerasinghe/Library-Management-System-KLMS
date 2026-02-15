import React, { useState, useEffect } from 'react';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import './styles/index.css';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.klms?.auth?.getSession) {
      window.klms.auth.getSession().then((s) => {
        setSession(s);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (result) => {
    if (result?.success) setSession(result.user);
  };

  const handleLogout = () => {
    if (window.klms?.auth?.logout) {
      window.klms.auth.logout().then(() => setSession(null));
    } else setSession(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span>Loading...</span>
      </div>
    );
  }

  if (!session) {
    return <Login onSuccess={handleLogin} />;
  }

  return <Dashboard session={session} onLogout={handleLogout} />;
}
