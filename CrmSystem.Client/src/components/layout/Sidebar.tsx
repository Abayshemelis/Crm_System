import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Users, Building2, UserCircle, Settings, LogIn,
  Kanban, CheckSquare, BarChart2, X, Receipt,
  LayoutDashboard, Target, FileText, UploadCloud, History,
  LogOut, Camera
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserProfileModal } from './UserProfileModal';
import './layout.css';

interface SidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
}

interface SubNavItem {
  to: string;
  label: string;
  isReport?: boolean;
}

interface NavSection {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  to: string;
  authRequired: boolean;
  managerOnly: boolean;
  subItems?: SubNavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    to: '/dashboard',
    authRequired: false,
    managerOnly: false
  },
  {
    key: 'reports',
    label: 'Overview Reports',
    icon: BarChart2,
    to: '/reports',
    authRequired: false,
    managerOnly: false
  },
  {
    key: 'customers',
    label: 'Customers',
    icon: Users,
    to: '/customers',
    authRequired: true,
    managerOnly: false,
    subItems: [
      { to: '/customers/reports', label: 'Customer Reports', isReport: true }
    ]
  },
  {
    key: 'companies',
    label: 'Companies',
    icon: Building2,
    to: '/companies',
    authRequired: true,
    managerOnly: false,
    subItems: [
      { to: '/companies/reports', label: 'Company Reports', isReport: true }
    ]
  },
  {
    key: 'leads',
    label: 'Leads',
    icon: Target,
    to: '/leads',
    authRequired: true,
    managerOnly: false,
    subItems: [
      { to: '/leads/reports', label: 'Lead Reports', isReport: true }
    ]
  },
  {
    key: 'pipeline',
    label: 'Pipeline',
    icon: Kanban,
    to: '/pipeline',
    authRequired: true,
    managerOnly: false,
    subItems: [
      { to: '/pipeline/reports', label: 'Pipeline Reports', isReport: true }
    ]
  },
  {
    key: 'contracts',
    label: 'Contracts',
    icon: FileText,
    to: '/contracts',
    authRequired: true,
    managerOnly: false,
    subItems: [
      { to: '/contracts/reports', label: 'Contract Reports', isReport: true }
    ]
  },
  {
    key: 'invoices',
    label: 'Invoices',
    icon: Receipt,
    to: '/invoices',
    authRequired: true,
    managerOnly: false,
    subItems: [
      { to: '/invoices/reports', label: 'Invoice Reports', isReport: true }
    ]
  },
  {
    key: 'tasks',
    label: 'Tasks',
    icon: CheckSquare,
    to: '/tasks',
    authRequired: true,
    managerOnly: false,
    subItems: [
      { to: '/tasks/reports', label: 'Task Reports', isReport: true }
    ]
  },
  {
    key: 'import',
    label: 'Data Import',
    icon: UploadCloud,
    to: '/import',
    authRequired: true,
    managerOnly: false,
    subItems: [
      { to: '/import/reports', label: 'Import Reports', isReport: true }
    ]
  },
  {
    key: 'audit-logs',
    label: 'System History',
    icon: History,
    to: '/audit-logs',
    authRequired: true,
    managerOnly: true,
    subItems: [
      { to: '/audit-logs/reports', label: 'History Reports', isReport: true }
    ]
  },
  {
    key: 'users',
    label: 'Users',
    icon: UserCircle,
    to: '/users',
    authRequired: true,
    managerOnly: true,
    subItems: [
      { to: '/users/reports', label: 'Rep Leaderboard', isReport: true }
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  mobileOpen = false,
  onClose,
}) => {
  const { isManagerOrAboveSelected, user, logout, selectedRole } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const sidebarClass = [
    'sidebar',
    collapsed ? 'sidebar-collapsed' : '',
    mobileOpen ? 'sidebar-mobile-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <aside className={sidebarClass} aria-label="Main navigation">
        {/* Brand */}
        <div className="sidebar-brand">
          <Building2 className="brand-icon" aria-hidden="true" />
          <span className="brand-text">CRM</span>
          {/* Close button – only visible on mobile/tablet */}
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section) => {
            if (section.authRequired && !user) return null;
            if (section.managerOnly && !isManagerOrAboveSelected) return null;

            const Icon = section.icon;
            const hasSubItems = Boolean(section.subItems && section.subItems.length > 0);

            // Check if section or any sub-item is currently active (clicked/navigated)
            const isSectionActive =
              currentPath === section.to ||
              (section.to !== '/dashboard' && currentPath.startsWith(section.to + '/')) ||
              (section.key === 'pipeline' && currentPath.startsWith('/opportunities'));

            // Only expand when active (clicked/navigated into) and not collapsed
            const isExpanded = !collapsed && hasSubItems && isSectionActive;

            return (
              <div
                key={section.key}
                className={`sidebar-section-block ${isSectionActive ? 'section-active' : ''} ${isExpanded ? 'is-expanded' : ''}`}
              >
                {/* Primary Main Navigation Link (Acts as default view for the section) */}
                <NavLink
                  to={section.to}
                  className={`sidebar-link ${isSectionActive ? 'active' : ''}`}
                  title={collapsed ? section.label : undefined}
                >
                  <Icon className="link-icon" size={18} aria-hidden="true" />
                  <span className="link-text">{section.label}</span>
                </NavLink>

                {/* Sub-Navigation Items (e.g. Reports, Stage Settings) */}
                {hasSubItems && !collapsed && (
                  <div className={`sidebar-touch-expand-drawer ${isExpanded ? 'open' : ''}`}>
                    <div className="sidebar-tree-container">
                      <div className="sidebar-tree-line" />
                      <div className="sidebar-tree-items">
                        {section.subItems!.map((sub) => {
                          const isSubActive =
                            currentPath === sub.to ||
                            (sub.to !== section.to && currentPath.startsWith(sub.to + '/'));

                          return (
                            <NavLink
                              key={sub.to + sub.label}
                              to={sub.to}
                              className={`sidebar-tree-link ${isSubActive ? 'active' : ''}`}
                            >
                              <span className="tree-node-label">{sub.label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Sign in for unauthenticated users */}
          {!user && (
            <div className="sidebar-section-block">
              <NavLink
                to="/login"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                title={collapsed ? 'Sign In' : undefined}
              >
                <LogIn className="link-icon" size={18} aria-hidden="true" />
                <span className="link-text">Sign In</span>
              </NavLink>
            </div>
          )}
        </nav>

        {/* Footer (Settings & User Profile with Sign Out) */}
        <div className="sidebar-footer">
          {user && isManagerOrAboveSelected && (
            <NavLink
              to="/settings"
              className={({ isActive }) => `sidebar-link sidebar-settings-link ${isActive ? 'active' : ''}`}
              title={collapsed ? 'Settings' : undefined}
            >
              <Settings className="link-icon" size={18} aria-hidden="true" />
              <span className="link-text">Settings</span>
            </NavLink>
          )}

          {user && (
            <div className={`sidebar-user-card ${collapsed ? 'collapsed' : ''}`}>
              <button
                type="button"
                className="sidebar-user-avatar-btn"
                onClick={() => setIsProfileModalOpen(true)}
                title="Click to edit profile photo"
                aria-label="Edit profile photo"
              >
                <div className="sidebar-user-avatar">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.name} className="sidebar-avatar-img" />
                  ) : (
                    <span className="sidebar-avatar-initials">{getInitials(user.name)}</span>
                  )}
                  <span className="sidebar-avatar-badge" title="Change photo">
                    <Camera size={10} />
                  </span>
                </div>
              </button>

              {!collapsed && (
                <div className="sidebar-user-meta" onClick={() => setIsProfileModalOpen(true)}>
                  <span className="sidebar-user-name" title={user.name}>{user.name}</span>
                  <span className="sidebar-user-role">
                    {selectedRole === 'SalesRep' ? 'Sales Rep' : selectedRole}
                  </span>
                </div>
              )}

              <button
                type="button"
                className="sidebar-logout-btn"
                onClick={() => {
                  if (onClose) onClose();
                  logout();
                }}
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut size={17} />
                {!collapsed && <span>Sign Out</span>}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
