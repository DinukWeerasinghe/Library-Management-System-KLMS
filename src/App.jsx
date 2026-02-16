import React, { useState, useEffect } from 'react';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { DialogProvider } from './components/DialogProvider';
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

      // Load theme
      window.klms.branding.getTheme().then(theme => {
        const root = document.documentElement;
        if (theme.primaryColor) {
          root.style.setProperty('--color-primary', theme.primaryColor);
          root.style.setProperty('--color-primary-hover', theme.buttonHoverColor || theme.primaryColor);
        }
        if (theme.sidebarColor) root.style.setProperty('--sidebar-bg', theme.sidebarColor);
        if (theme.backgroundColor) root.style.setProperty('--color-bg', theme.backgroundColor);
        if (theme.buttonColor) root.style.setProperty('--btn-primary-bg', theme.buttonColor);
        if (theme.headerTextColor) root.style.setProperty('--header-text', theme.headerTextColor);
      });
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

  return (
    <>
      <Dashboard session={session} onLogout={handleLogout} />
      <DialogProvider />
    </>
  );
}
