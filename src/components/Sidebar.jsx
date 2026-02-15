import React from 'react';
import {
  BookOpen,
  Users,
  Settings,
  FileText,
  LogOut,
  Library,
  UserCheck,
  ArrowRightLeft
} from 'lucide-react';
import { Logo } from './Logo';
import { PermissionService } from '../services/PermissionService';

export function Sidebar({ session, activeTab, onTabChange, onLogout, features }) {
  const MENU_ITEMS = [
    { id: 'issue-book', label: 'Issue Book', icon: BookOpen },
    { id: 'return-book', label: 'Return Book', icon: ArrowRightLeft },
    { id: 'members', label: 'Members', icon: UserCheck, permission: 'canManageMembers' },
    { id: 'books', label: 'Books', icon: Library, permission: 'canManageBooks' },
    { id: 'reports', label: 'Reports', icon: FileText, requireFeature: 'enable_reports', permission: 'canAccessReports' },
    { id: 'users', label: 'Users', icon: Users, permission: 'canManageUsers' },
    { id: 'settings', label: 'Settings', icon: Settings, permission: 'canAccessSettings' },
  ];

  const visibleItems = MENU_ITEMS.filter(item => {
    if (item.requireFeature && !features[item.requireFeature]) return false;
    if (item.permission && !PermissionService[item.permission](session.role)) return false;
    return true;
  });

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Logo size="medium" />
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
              {isActive && <div className="active-indicator" />}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">
            {session.username[0].toUpperCase()}
          </div>
          <div className="user-info">
            <span className="name">{session.username}</span>
            <span className={`role role-${session.role.toLowerCase()}`}>{session.role}</span>
          </div>
        </div>
        <button onClick={onLogout} className="logout-btn" title="Logout">
          <LogOut size={20} />
        </button>
      </div>

      <style>{`
        .sidebar {
          width: 260px;
          background: var(--sidebar-bg);
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          height: 100vh;
        }
        
        .sidebar-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--color-border);
        }
        
        .sidebar-nav {
          flex: 1;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          overflow-y: auto;
        }
        
        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          color: var(--color-text-muted);
          border-radius: var(--radius);
          position: relative;
          text-align: left;
          width: 100%;
          font-weight: 500;
        }
        
        .nav-item:hover {
          background: var(--color-surface-hover);
          color: var(--color-text);
        }
        
        .nav-item.active {
          background: var(--color-primary-light);
          color: var(--color-primary);
        }
        
        .active-indicator {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background: var(--color-primary);
          border-radius: 0 4px 4px 0;
        }
        
        .sidebar-footer {
          padding: 1rem;
          border-top: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(0,0,0,0.1);
        }
        
        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .avatar {
          width: 36px;
          height: 36px;
          background: var(--color-surface-hover);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          color: var(--color-text);
          border: 1px solid var(--color-border);
        }
        
        .user-info {
          display: flex;
          flex-direction: column;
        }
        
        .name {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--color-text);
        }
        
        .role {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 4px;
          margin-top: 2px;
          width: fit-content;
        }
        
        .role-admin { background: rgba(239, 68, 68, 0.15); color: #f87171; }
        .role-librarian { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
        .role-teacher { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        
        .logout-btn {
          padding: 0.5rem;
          color: var(--color-text-muted);
          border-radius: var(--radius);
        }
        
        .logout-btn:hover {
          color: var(--color-danger);
          background: rgba(239, 68, 68, 0.1);
        }
      `}</style>
    </aside>
  );
}
