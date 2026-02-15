import { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { IssueBookPage } from './IssueBookPage';
import { ReturnBookPage } from './ReturnBookPage';
import { Members } from '../components/Members';
import { Books } from '../components/Books';
import { ReportsPage } from './ReportsPage';
import { SettingsPage } from './SettingsPage';
import { UsersPage } from './UsersPage';

export function Dashboard({ session, onLogout }) {
  const [tab, setTab] = useState('issue-book');
  const [features, setFeatures] = useState({});
  const [config, setConfig] = useState({});

  useEffect(() => {
    if (window.klms?.features?.getAll) {
      window.klms.features.getAll().then(setFeatures);
    }
    if (window.klms?.config?.getAll) {
      window.klms.config.getAll().then(setConfig);
    }
  }, []);

  const handleLogout = async () => {
    await window.klms?.auth?.logout?.();
    onLogout();
  };

  return (
    <div className="app-layout">
      <Sidebar
        session={session}
        activeTab={tab}
        onTabChange={setTab}
        onLogout={handleLogout}
        features={features}
      />

      <main className="main-content">
        <div className="content-container">
          {tab === 'issue-book' && <IssueBookPage features={features} config={config} />}
          {tab === 'return-book' && <ReturnBookPage features={features} />}
          {tab === 'members' && <Members />}
          {tab === 'books' && <Books features={features} />}
          {tab === 'reports' && <ReportsPage features={features} />}
          {tab === 'users' && <UsersPage />}
          {tab === 'settings' && <SettingsPage features={features} onFeaturesChange={setFeatures} session={session} />}
        </div>
      </main>

      <style>{`
        .app-layout {
          display: flex;
          height: 100vh;
          overflow: hidden;
          background: var(--color-bg);
        }
        
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #f1f5f9; /* Light slate bg for content area overlap if needed, or keep dark */
          background: var(--color-bg); /* Keeping dark theme consistent */
        }
        
        .content-container {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: var(--color-surface-hover);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--color-border);
        }
      `}</style>
    </div>
  );
}
