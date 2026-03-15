import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Logo } from '../components/Logo';
import { DialogService } from '../services/DialogService';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export function Login({ onSuccess }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Public View State
  const [publicView, setPublicView] = useState(null); // 'books', 'members', 'due'
  const [publicData, setPublicData] = useState([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicSearch, setPublicSearch] = useState('');

  // Footer Modal State
  const [footerModal, setFooterModal] = useState(null); // 'help', 'privacy', 'terms'

  // Load saved username if exists
  useEffect(() => {
    const savedUsername = localStorage.getItem('klms_remember_username');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  // Detect Caps Lock
  const handleKeyUp = (e) => {
    setCapsLockOn(e.getModifierState && e.getModifierState('CapsLock'));
  };

  const handlePublicView = async (view) => {
    setPublicView(view);
    setPublicLoading(true);
    setPublicData([]);
    setPublicSearch('');
    try {
      if (view === 'books') {
        const res = await window.klms.books.getAll({ pageSize: 1000 });
        setPublicData(res.items || []);
      } else if (view === 'members') {
        const res = await window.klms.members.getAll({ pageSize: 1000 });
        setPublicData(res.items || []);
      } else if (view === 'due') {
        const issues = await window.klms.issues.getAll({ status: 'ISSUED' });
        const now = new Date();
        const overdue = issues.filter(i => new Date(i.due_date) < now);
        setPublicData(overdue);
      }
    } catch (err) {
      DialogService.showError('Public view failed: ' + err.message); // keep untranslated (technical)
    } finally {
      setPublicLoading(false);
    }
  };

  const filteredPublicData = publicData.filter(item => {
    if (!publicSearch) return true;
    const search = publicSearch.toLowerCase();
    if (publicView === 'books') {
      return (item.title?.toLowerCase().includes(search) || item.author?.toLowerCase().includes(search));
    }
    if (publicView === 'members') {
      return (item.name?.toLowerCase().includes(search) || item.member_code?.toLowerCase().includes(search));
    }
    if (publicView === 'due') {
      return (item.book_title?.toLowerCase().includes(search) || item.member_name?.toLowerCase().includes(search));
    }
    return true;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await window.klms.auth.login(username, password);

      // Save username if remember me is checked
      if (rememberMe) {
        localStorage.setItem('klms_remember_username', username);
      } else {
        localStorage.removeItem('klms_remember_username');
      }

      // Short delay for better UX
      await new Promise(r => setTimeout(r, 500));

      if (result.success) {
        onSuccess(result);
      } else {
        DialogService.showError(result.error || 'Invalid username or password');
      }
    } catch (err) {
      DialogService.showError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Decorative Background Elements */}
      <div className="background-decoration">
        <div className="book-shelf book-shelf-1"></div>
        <div className="book-shelf book-shelf-2"></div>
        <div className="floating-book book-1"></div>
        <div className="floating-book book-2"></div>
        <div className="floating-book book-3"></div>
      </div>

      <div className="login-container">
        {/* Enhanced Logo Area */}
        <div className="logo-section">
          <div className="logo-backdrop">
            <div className="logo-glow"></div>
            <Logo size="large" />
          </div>

          <div className="brand-info">
            <h1 className="brand-title">LMS</h1>
            <p className="brand-tagline">Library Management System</p>
            <div className="brand-divider"></div>
            <p className="brand-description">
              Empowering knowledge through efficient library management
            </p>
          </div>

          {/* Library Stats/Features */}
          <div className="feature-badges">
            <button className="feature-badge" onClick={() => handlePublicView('books')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              <span>{t('login.availableBooks')}</span>
            </button>
            <button className="feature-badge" onClick={() => handlePublicView('members')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span>{t('login.ourMembers')}</span>
            </button>
            <button className="feature-badge" onClick={() => handlePublicView('due')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>{t('login.overdueList')}</span>
            </button>
          </div>
        </div>

        {publicView && (
          <div className="public-modal-overlay" onClick={() => setPublicView(null)}>
            <div className="public-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{publicView === 'books' ? t('login.availableBooks') : publicView === 'members' ? t('login.memberList') : t('login.overdueMembers')}</h3>
                <button className="close-btn" onClick={() => setPublicView(null)}>×</button>
              </div>
              <div className="modal-content">
                <div className="public-search-wrapper">
                  <input
                    type="text"
                    placeholder={`${t('common.search')} ${publicView === 'books' ? t('login.searchByTitleOrAuthor') : publicView === 'members' ? t('login.searchByNameOrId') : t('login.searchByBookOrMember')}...`}
                    value={publicSearch}
                    onChange={(e) => setPublicSearch(e.target.value)}
                    className="public-search-input"
                    autoFocus
                  />
                </div>
                {publicLoading ? (
                  <div className="modal-loader">
                    <span className="spinner"></span>
                    {t('login.loadingCollection')}
                  </div>
                ) : filteredPublicData.length === 0 ? (
                  <div className="empty-state">{t('login.noRecordsFound')}</div>
                ) : (
                  <div className="public-list">
                    {publicView === 'books' && filteredPublicData.map(book => (
                      <div key={book.id} className="public-item">
                        <div className="item-info">
                          <div className="item-main">{book.title}</div>
                          <div className="item-sub">{book.author} • {book.category_name || 'General'}</div>
                        </div>
                        <div className={`item-badge ${book.available_copies > 0 ? 'success' : 'danger'}`}>
                          {book.available_copies > 0 ? `${book.available_copies} ${t('login.available')}` : t('login.outOfStock')}
                        </div>
                      </div>
                    ))}
                    {publicView === 'members' && filteredPublicData.map(m => (
                      <div key={m.id} className="public-item">
                        <div className="item-info">
                          <div className="item-main">{m.name}</div>
                          <div className="item-sub">{m.member_code} • {m.member_type}</div>
                        </div>
                      </div>
                    ))}
                    {publicView === 'due' && filteredPublicData.map(i => (
                      <div key={i.id} className="public-item">
                        <div className="item-info">
                          <div className="item-main">{i.book_title}</div>
                          <div className="item-sub">Member: {i.member_name}</div>
                        </div>
                        <div className="item-badge danger">
                          {t('login.overduesince')}: {new Date(i.due_date).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {footerModal && (
          <div className="public-modal-overlay" onClick={() => setFooterModal(null)}>
            <div className="public-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{footerModal === 'help' ? t('login.helpCenter') : footerModal === 'privacy' ? t('login.privacyPolicy') : t('login.termsOfService')}</h3>
                <button className="close-btn" onClick={() => setFooterModal(null)}>×</button>
              </div>
              <div className="modal-content" style={{ color: 'var(--color-text)', lineHeight: '1.6', padding: '1.5rem' }}>
                {footerModal === 'help' && (
                  <div className="help-content">
                    <h4 style={{ color: 'var(--button-color)', marginTop: 0 }}>{t('login.directSupport')}</h4>
                    <p>{t('login.supportDesc')}</p>
                    <p><strong>Dinux Weerasinghe</strong><br />Product Engineer @ Rinixo Systems</p>
                    <p><strong>Email:</strong> <a href="mailto:rinixoinfo@gmail.com" style={{ color: 'var(--button-color)' }}>rinixoinfo@gmail.com</a></p>
                    <hr style={{ border: '0', borderTop: '1px solid var(--color-border)', margin: '1.5rem 0' }} />
                    <h4 style={{ color: 'var(--button-color)' }}>{t('login.quickTips')}</h4>
                    <ul>
                      <li>{t('login.tip1')}</li>
                      <li>{t('login.tip2')}</li>
                      <li>{t('login.tip3')}</li>
                    </ul>
                  </div>
                )}
                {footerModal === 'privacy' && (
                  <div className="privacy-content">
                    <h4 style={{ color: 'var(--button-color)', marginTop: 0 }}>{t('login.dataSecurityTitle')}</h4>
                    <p>{t('login.privacyDesc1')}</p>
                    <p>{t('login.privacyDesc2')}</p>
                    <p>{t('login.privacyDesc3')}</p>
                  </div>
                )}
                {footerModal === 'terms' && (
                  <div className="terms-content">
                    <h4 style={{ color: 'var(--button-color)', marginTop: 0 }}>{t('login.licenseTitle')}</h4>
                    <p>{t('login.termsDesc1')}</p>
                    <p>{t('login.termsDesc2')}</p>
                    <p>{t('login.termsDesc3')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Login Card */}
        <div className="login-card">
          <div className="login-header">
            <h2 className="login-title">{t('login.welcome')}</h2>
            <p className="login-subtitle">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="username">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                {t('login.username')}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder={t('login.usernamePlaceholder')}
                required
                autoFocus
                disabled={loading}
                aria-describedby={undefined}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                {t('login.password')}
              </label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={handleKeyUp}
                  autoComplete="current-password"
                  placeholder={t('login.passwordPlaceholder')}
                  required
                  disabled={loading}
                  aria-describedby={undefined}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  disabled={loading}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {capsLockOn && password && (
                <div className="caps-lock-warning">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  {t('login.capsLock')}
                </div>
              )}
            </div>

            <div className="form-group-checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span>{t('login.rememberMe')}</span>
              </label>
            </div>


            <button
              type="submit"
              className="btn-primary full-width"
              disabled={loading || !username || !password}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  {t('login.signingIn')}
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                    <polyline points="10 17 15 12 10 7"></polyline>
                    <line x1="15" y1="12" x2="3" y2="12"></line>
                  </svg>
                  {t('login.signIn')}
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="login-footer">
        <div className="footer-content">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <LanguageSwitcher />
          </div>
          <div className="footer-links" style={{ marginBottom: '1rem' }}>
            <span className="footer-link" onClick={() => setFooterModal('help')}>{t('login.helpCenter')}</span>
            <span className="footer-divider">•</span>
            <span className="footer-link" onClick={() => setFooterModal('privacy')}>{t('login.privacyPolicy')}</span>
            <span className="footer-divider">•</span>
            <span className="footer-link" onClick={() => setFooterModal('terms')}>{t('login.termsOfService')}</span>
          </div>
          <p className="copyright" style={{ fontWeight: 'bold' }}>{t('login.developedBy')}</p>
          <div className="footer-info" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            <span>LMS – Library Management System • Version 1.0.0</span>
            <div style={{ marginTop: '0.25rem' }}>
              <span>"From Effort to Automation." • Contact: rinixoinfo@gmail.com</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-bg) 0%, var(--color-surface) 100%);
          padding: 1rem;
          position: relative;
          overflow: hidden;
          max-height: 100vh;
        }

        /* Background Decorations */
        .background-decoration {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.05;
          overflow: hidden;
        }

        .book-shelf {
          position: absolute;
          width: 300px;
          height: 200px;
          background: linear-gradient(90deg, 
            var(--color-text) 0%, 
            var(--color-text) 10%, 
            transparent 10%, 
            transparent 15%,
            var(--color-text) 15%,
            var(--color-text) 25%,
            transparent 25%
          );
          background-size: 40px 100%;
          animation: float 20s ease-in-out infinite;
        }

        .book-shelf-1 {
          top: 10%;
          left: -100px;
          transform: rotate(-15deg);
        }

        .book-shelf-2 {
          bottom: 15%;
          right: -100px;
          transform: rotate(15deg);
          animation-delay: -10s;
        }

        .floating-book {
          position: absolute;
          width: 40px;
          height: 50px;
          background: var(--color-text);
          border-radius: 2px;
          animation: floatBook 15s ease-in-out infinite;
        }

        .book-1 {
          top: 20%;
          right: 15%;
          animation-delay: 0s;
        }

        .book-2 {
          top: 60%;
          left: 10%;
          animation-delay: -5s;
        }

        .book-3 {
          bottom: 30%;
          right: 20%;
          animation-delay: -10s;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(-15deg); }
          50% { transform: translateY(-30px) rotate(-15deg); }
        }

        @keyframes floatBook {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.1; }
          50% { transform: translateY(-50px) rotate(10deg); opacity: 0.2; }
        }

        .login-container {
          width: 100%;
          max-width: 900px;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 2rem;
          align-items: center;
          z-index: 1;
          margin-top: -2rem;
        }

        /* Enhanced Logo Section */
        .logo-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 1rem;
        }

        .logo-backdrop {
          position: relative;
          width: fit-content;
          margin: 0 auto;
        }

        .logo-glow {
          position: absolute;
          inset: -20px;
          background: radial-gradient(circle, var(--button-color) 0%, transparent 70%);
          opacity: 0.3;
          filter: blur(30px);
          animation: pulse 3s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }

        .brand-info {
          text-align: center;
        }

        .brand-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--color-text);
          margin: 0;
          letter-spacing: 0.05em;
          background: linear-gradient(135deg, var(--button-color), var(--button-hover-color));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .brand-tagline {
          font-size: 1.1rem;
          color: var(--color-text);
          font-weight: 600;
          margin: 0.5rem 0 0 0;
          letter-spacing: 0.02em;
        }

        .brand-divider {
          width: 60px;
          height: 3px;
          background: linear-gradient(90deg, transparent, var(--button-color), transparent);
          margin: 1.5rem auto;
          border-radius: 2px;
        }

        .brand-description {
          color: var(--color-text-muted);
          font-size: 0.95rem;
          line-height: 1.6;
          margin: 0;
        }

        .feature-badges {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .feature-badge {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          color: var(--color-text);
          font-size: 0.9rem;
          transition: all 0.3s;
        }

        .feature-badge:hover {
          transform: translateX(5px);
          border-color: var(--button-color);
          background: var(--overlay-light);
        }

        .feature-badge svg {
          color: var(--button-color);
          flex-shrink: 0;
        }

        /* Public Modal Styles */
        .public-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 2rem;
        }

        .public-modal {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 600px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 30px 60px rgba(0,0,0,0.5);
          animation: modalFadeIn 0.3s ease-out;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-header h3 {
          margin: 0;
          color: var(--button-color);
          font-size: 1.25rem;
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--color-text-muted);
          font-size: 2rem;
          cursor: pointer;
          line-height: 1;
          padding: 0 0.5rem;
        }

        .modal-content {
          padding: 1rem;
          overflow-y: auto;
          flex: 1;
        }

        .modal-loader, .empty-state {
          text-align: center;
          padding: 3rem;
          color: var(--color-text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .public-search-wrapper {
          padding: 0.5rem 0.5rem 1.5rem 0.5rem;
          position: sticky;
          top: 0;
          background: var(--color-surface);
          z-index: 10;
        }

        .public-search-input {
          width: 100%;
          padding: 0.75rem 1rem;
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          color: var(--color-text);
          font-size: 0.9rem;
        }

        .public-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding-bottom: 2rem;
        }

        .public-item {
          padding: 1rem;
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          transition: all 0.2s;
        }

        .public-item:hover {
          border-color: var(--button-color);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .item-info {
          flex: 1;
          min-width: 0;
        }

        .item-main {
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .item-sub {
          font-size: 0.85rem;
          color: var(--color-text-muted);
        }

        .item-badge {
          font-size: 0.75rem;
          padding: 0.4rem 0.75rem;
          background: var(--color-surface-hover);
          color: var(--color-text);
          border-radius: 100px;
          font-weight: 600;
          white-space: nowrap;
        }

        .item-badge.success {
          background: rgba(16, 185, 129, 0.1);
          color: #34d399;
        }

        .item-badge.danger {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
        }

        /* Login Card */
        .login-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 2rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
          animation: slideIn 0.4s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .login-header {
          margin-bottom: 2rem;
          text-align: center;
        }

        .login-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0 0 0.5rem 0;
        }
        
        .login-subtitle {
          color: var(--color-text-muted);
          font-size: 0.9rem;
          margin: 0;
        }
        
        .form-group {
          margin-bottom: 1.25rem;
        }
        
        .form-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          color: var(--color-text);
          font-weight: 500;
          font-size: 0.9rem;
        }

        .form-group label svg {
          color: var(--button-color);
        }

        input[type="text"],
        input[type="password"] {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius);
          font-size: 0.95rem;
          background: var(--color-bg);
          color: var(--color-text);
          transition: all 0.2s;
        }

        input:focus {
          outline: none;
          border-color: var(--button-color);
          box-shadow: 0 0 0 3px var(--overlay-light);
        }

        input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .password-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .password-input-wrapper input {
          padding-right: 2.5rem;
        }

        .password-toggle {
          position: absolute;
          right: 0.5rem;
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius);
          transition: all 0.2s;
        }

        .password-toggle:hover:not(:disabled) {
          color: var(--color-text);
          background: var(--overlay-light);
        }

        .password-toggle:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .caps-lock-warning {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-top: 0.5rem;
          color: #f59e0b;
          font-size: 0.8rem;
        }

        .form-group-checkbox {
          margin-bottom: 1.5rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.9rem;
          color: var(--color-text);
          user-select: none;
        }

        .checkbox-label input[type="checkbox"] {
          cursor: pointer;
          width: 1rem;
          height: 1rem;
          accent-color: var(--button-color);
        }

        .checkbox-label input[type="checkbox"]:disabled {
          cursor: not-allowed;
        }
        
        .login-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-danger, #ef4444);
          padding: 0.75rem;
          border-radius: var(--radius);
          font-size: 0.875rem;
          margin-bottom: 1.25rem;
          border: 1px solid var(--color-danger, #ef4444);
          animation: shake 0.3s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .btn-primary.full-width {
          width: 100%;
          padding: 0.875rem;
          font-size: 1rem;
          background: var(--button-color);
          color: var(--header-text-color);
          border: none;
          border-radius: var(--radius);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-weight: 600;
          transition: all 0.3s;
        }
        
        .btn-primary.full-width:hover:not(:disabled) {
          background: var(--button-hover-color);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        .btn-primary.full-width:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-primary.full-width:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid var(--header-text-color);
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .login-footer {
          position: absolute;
          bottom: 1.5rem;
          width: 100%;
          z-index: 1;
        }

        .footer-content {
          text-align: center;
        }

        .copyright {
          color: var(--color-text-muted);
          font-size: 0.85rem;
          margin: 0 0 0.5rem 0;
        }

        .footer-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          font-size: 0.8rem;
        }

        .footer-link {
          color: var(--color-text-muted);
          cursor: pointer;
          transition: color 0.2s;
        }

        .footer-link:hover {
          color: var(--button-color);
        }

        .footer-divider {
          color: var(--color-text-muted);
          opacity: 0.5;
        }

        /* Responsive Design */
        @media (max-width: 968px) {
          .login-container {
            grid-template-columns: 1fr;
            gap: 2rem;
            max-width: 450px;
          }

          .logo-section {
            display: none;
          }

          .login-card {
            padding: 2rem 1.5rem;
          }

          .brand-title {
            font-size: 2rem;
          }
        }

        @media (max-width: 480px) {
          .login-page {
            padding: 1rem;
          }

          .login-card {
            padding: 1.5rem 1rem;
          }

          .footer-links {
            flex-direction: column;
            gap: 0.25rem;
          }

          .footer-divider {
            display: none;
          }
        }
      `}</style>
    </div >
  );
}