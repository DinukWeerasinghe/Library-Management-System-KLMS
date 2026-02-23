import React, { useState, useEffect } from 'react';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { DialogProvider } from './components/DialogProvider';
import { ExitPinGate } from './components/ExitPinGate';
import { LockScreen } from './components/LockScreen';
import { ActivationDialog } from './components/ActivationDialog';
import './styles/index.css';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState({ isValid: true });
  const [showActivationManual, setShowActivationManual] = useState(false);

  useEffect(() => {
    if (window.klms?.activity) {
      if (locked) {
        window.klms.activity.logLock();
      } else if (session) {
        // Only log unlock if we have a session (avoids initial load log)
        window.klms.activity.logUnlock();
      }
    }
  }, [locked]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.klms?.auth?.getSession) {
      window.klms.auth.getSession().then((s) => {
        setSession(s);
        // Check license after session (or before, but let's do both)
        return window.klms.license.getStatus();
      }).then(status => {
        setLicenseStatus(status);
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

      // Handle Lock IPC
      const handleLockRequest = () => setLocked(true);
      window.klms.onShowLockScreen(handleLockRequest);

      // Handle Show Activation Event
      const handleShowActivation = () => setShowActivationManual(true);
      document.addEventListener('klms:show-activation', handleShowActivation);

      return () => {
        document.removeEventListener('klms:show-activation', handleShowActivation);
      };
    } else {
      setLoading(false);
    }
  }, []);

  // Inactivity Detection
  useEffect(() => {
    if (!session || locked) return;

    let timeoutId;
    const resetTimer = async () => {
      clearTimeout(timeoutId);

      const config = await window.klms.config.getAll();
      if (config.lock_enabled === '1') {
        const timeoutMins = parseInt(config.lock_timeout_minutes || '5', 10);
        timeoutId = setTimeout(() => {
          setLocked(true);
        }, timeoutMins * 60 * 1000);
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      events.forEach(event => document.removeEventListener(event, resetTimer));
      clearTimeout(timeoutId);
    };
  }, [session, locked]);

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
    return (
      <>
        <Login onSuccess={handleLogin} />
        <DialogProvider />
      </>
    );
  }

  return (
    <>
      <Dashboard session={session} onLogout={handleLogout} />
      <DialogProvider />
      <ExitPinGate />
      {locked && <LockScreen onUnlock={() => setLocked(false)} />}
      {(!licenseStatus.isValid || showActivationManual) && (
        <ActivationDialog
          canClose={licenseStatus.isValid && showActivationManual}
          onClose={() => setShowActivationManual(false)}
          onActivated={() => {
            setShowActivationManual(false);
            window.klms.license.getStatus().then(setLicenseStatus);
          }}
        />
      )}
    </>
  );
}
