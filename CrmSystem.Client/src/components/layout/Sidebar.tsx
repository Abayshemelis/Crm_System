import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Users, Building2, UserCircle, Settings, LogIn,
  Kanban, CheckSquare, BarChart2, X,
  LayoutDashboard, Target,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './layout.css';

interface SidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
}

// Nav items definition (single source of truth)
const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard, authRequired: false, managerOnly: false },
  { to: '/reports',    label: 'Reports',    icon: BarChart2,        authRequired: false, managerOnly: false },
  { to: '/customers',  label: 'Customers',  icon: Users,            authRequired: true,  managerOnly: false },
  { to: '/companies',  label: 'Companies',  icon: Building2,        authRequired: true,  managerOnly: false },
  { to: '/leads',      label: 'Leads',      icon: Target,           authRequired: true,  managerOnly: false },
  { to: '/pipeline',   label: 'Pipeline',   icon: Kanban,           authRequired: true,  managerOnly: false },
  { to: '/tasks',      label: 'Tasks',      icon: CheckSquare,      authRequired: true,  managerOnly: false },
  { to: '/users',      label: 'Users',      icon: UserCircle,       authRequired: true,  managerOnly: true  },
] as const;

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  mobileOpen = false,
  onClose,
}) => {
  const { isManagerOrAboveSelected, user } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const location = useLocation();

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => ({ ...prev, [menuName]: !prev[menuName] }));
  };

  const sidebarClass = [
    'sidebar',
    collapsed   ? 'sidebar-collapsed'    : '',
    mobileOpen  ? 'sidebar-mobile-open'  : '',
  ].filter(Boolean).join(' ');

  return (
    <aside className={sidebarClass} aria-label="Main navigation">
      {/* Brand */}
      <div className="sidebar-brand">
        <Building2 className="brand-icon" aria-hidden="true" />
        <span className="brand-text">CRM Pro</span>
        {/* Close button – only visible on mobile/tablet */}
        <button
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Nav links */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon, authRequired, managerOnly }) => {
          if (authRequired && !user) return null;
          if (managerOnly && !isManagerOrAboveSelected) return null;
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              title={collapsed ? label : undefined}
            >
              <Icon className="link-icon" size={20} aria-hidden="true" />
              <span className="link-text">{label}</span>
            </NavLink>
          );
        })}

        {/* Sign in for unauthenticated users */}
        {!user && (
          <NavLink
            to="/login"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title={collapsed ? 'Sign In' : undefined}
          >
            <LogIn className="link-icon" size={20} aria-hidden="true" />
            <span className="link-text">Sign In</span>
          </NavLink>
        )}
      </nav>

      {/* Footer (Settings) */}
      <div className="sidebar-footer">
        {user && isManagerOrAboveSelected && (
          <NavLink
            to="/settings"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings className="link-icon" size={20} aria-hidden="true" />
            <span className="link-text">Settings</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
};
