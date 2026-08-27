import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Target, Kanban, FileText,
  Receipt, CheckSquare, BarChart2, UserCircle,
  Building2, LogIn, LogOut, Settings, X, CreditCard,
  History, Activity, Trophy, ShieldCheck, ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSystemProfile } from '../../context/SystemProfileContext';
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
    label: 'Report Overview',
    icon: BarChart2,
    to: '/reports',
    authRequired: false,
    managerOnly: false
  },
  {
    key: 'customers',
    label: 'Customer',
    icon: Users,
    to: '/customers',
    authRequired: true,
    managerOnly: false,
    subItems: [
      { to: '/reports/customers', label: 'Customer Report', isReport: true }
    ]
  },
  {
    key: 'companies',
    label: 'Company',
    icon: Building2,
    to: '/companies',
    authRequired: true,
    managerOnly: false,
    subItems: [
      { to: '/reports/companies', label: 'Company Report', isReport: true }
    ]
  },
  {
    key: 'leads',
    label: 'Lead',
    icon: Target,
    to: '/leads',
    authRequired: true,
    managerOnly: false,
    subItems: [
      { to: '/reports/leads', label: 'Lead Report', isReport: true }
    ]
  },
  {
    key: 'pipeline',
    label: 'Opportunity / Deal',
    icon: Kanban,
    to: '/pipeline',
    authRequired: true,
    managerOnly: false,
    subItems: [
      { to: '/reports/opportunities', label: 'Deal Report', isReport: true }
    ]
  },
  {
    key: 'contracts',
    label: 'Contract',
    icon: FileText,
    to: '/contracts',
    authRequired: true,
    managerOnly: false,
    subItems: [
      { to: '/reports/contracts', label: 'Contract Report', isReport: true }
    ]
  },
  {
    key: 'invoices',
    label: 'Invoice',
    icon: Receipt,
    to: '/invoices',
    authRequired: true,
    managerOnly: false,
    subItems: [
      { to: '/reports/invoices', label: 'Invoice Report', isReport: true }
    ]
  },
  {
    key: 'payments',
    label: 'Payment',
    icon: CreditCard,
    to: '/payments',
    authRequired: true,
    managerOnly: false,
    subItems: [
      { to: '/reports/payments', label: 'Payment Report', isReport: true }
    ]
  },
  {
    key: 'tasks',
    label: 'Task',
    icon: CheckSquare,
    to: '/tasks',
    authRequired: true,
    managerOnly: false,
    subItems: [
      { to: '/reports/tasks', label: 'Task Report', isReport: true }
    ]
  },
  {
    key: 'users',
    label: 'User',
    icon: UserCircle,
    to: '/users',
    authRequired: true,
    managerOnly: true,
    subItems: [
      { to: '/users/reports', label: 'User Report', isReport: true }
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
      { to: '/reports/system-history', label: 'System History Report', isReport: true }
    ]
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: Settings,
    to: '/settings',
    authRequired: true,
    managerOnly: true
  }
];

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  mobileOpen = false,
  onClose,
}) => {
  const { isManagerOrAboveSelected, user, logout, selectedRole } = useAuth();
  const { profile } = useSystemProfile();
  const location = useLocation();
  const currentPath = location.pathname;
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [hoveredTooltip, setHoveredTooltip] = useState<{ label: string; top: number; left: number } | null>(null);
  const [isCrmMenuOpen, setIsCrmMenuOpen] = useState(false);
  
  const crmMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideCrm = (e: MouseEvent) => {
      if (crmMenuRef.current && !crmMenuRef.current.contains(e.target as Node)) {
        setIsCrmMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideCrm);
    return () => document.removeEventListener('mousedown', handleOutsideCrm);
  }, []);

  // CRM Config (from Context)
  const crmName = profile?.systemName || 'KENOVA CRM';
  const crmLogo = profile?.logoUrl || '';

  // Short role label matching the active session role
  const profileTitle =
    selectedRole === 'Admin'
      ? 'Admin'
      : selectedRole === 'Manager'
      ? 'Manager'
      : 'Sales Rep';

  const handleMouseEnter = (label: string, e: React.MouseEvent<HTMLElement>) => {
    if (collapsed) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredTooltip({
        label,
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredTooltip(null);
  };

  const toggleSection = (key: string, e: React.MouseEvent) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: prev[key] !== undefined ? !prev[key] : false
    }));
  };

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
        <div className="sidebar-brand" ref={crmMenuRef}>
          <button 
            className="crm-profile-btn" 
            onClick={() => setIsCrmMenuOpen(prev => !prev)}
            title="CRM Settings & Profile"
            style={{ width: '100%', justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '6px' : '6px 12px 6px 8px' }}
          >
            {crmLogo ? (
              <img src={crmLogo} alt={`${crmName} Logo`} className="crm-logo-img" />
            ) : (
              <div className="crm-logo-fallback">
                <Building2 size={16} />
              </div>
            )}
            
            {!collapsed && (
              <>
                <div className="crm-profile-text" style={{ flex: 1 }}>
                  <span className="crm-name" style={{ display: 'block' }}>{crmName}</span>
                </div>
                <ChevronDown size={14} className="crm-dropdown-icon" />
              </>
            )}
          </button>

          {isCrmMenuOpen && (
            <div className="crm-dropdown-menu">
              <div className="crm-dropdown-header">
                <p className="crm-dropdown-name">{crmName}</p>
                <p className="crm-dropdown-subtitle">System Profile</p>
              </div>
              <div className="crm-dropdown-body">
                <NavLink 
                  to="/settings" 
                  className={`crm-dropdown-item ${(user?.roles.includes('Admin') || user?.roles.includes('Manager')) ? '' : 'disabled'}`}
                  onClick={(e) => {
                    setIsCrmMenuOpen(false);
                    if (!user?.roles.includes('Admin') && !user?.roles.includes('Manager')) {
                      e.preventDefault();
                    }
                  }}
                  title={(user?.roles.includes('Admin') || user?.roles.includes('Manager')) ? 'Go to CRM Settings' : 'Contact an Admin to access settings'}
                >
                  <Settings size={16} />
                  <span>CRM Settings</span>
                </NavLink>
              </div>
            </div>
          )}

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

            // Check if section or any sub-item is currently active
            const isSectionActive =
              currentPath === section.to ||
              (section.to !== '/' && section.to !== '/reports' && currentPath.startsWith(section.to + '/')) ||
              (section.key === 'customers' && (currentPath.startsWith('/customers') || currentPath === '/reports/customers')) ||
              (section.key === 'companies' && (currentPath.startsWith('/companies') || currentPath === '/reports/companies')) ||
              (section.key === 'leads' && (currentPath.startsWith('/leads') || currentPath === '/reports/leads')) ||
              (section.key === 'pipeline' && (currentPath.startsWith('/pipeline') || currentPath.startsWith('/opportunities') || currentPath === '/reports/pipeline' || currentPath === '/reports/opportunities')) ||
              (section.key === 'contracts' && (currentPath.startsWith('/contracts') || currentPath === '/reports/contracts')) ||
              (section.key === 'invoices' && (currentPath.startsWith('/invoices') || currentPath === '/reports/invoices')) ||
              (section.key === 'payments' && (currentPath.startsWith('/payments') || currentPath === '/reports/payments')) ||
              (section.key === 'tasks' && (currentPath.startsWith('/tasks') || currentPath === '/reports/tasks')) ||
              (section.key === 'users' && (currentPath.startsWith('/users') || currentPath === '/users/reports' || currentPath === '/reports/team')) ||
              (section.key === 'audit-logs' && (currentPath.startsWith('/audit-logs') || currentPath === '/reports/system-history')) ||
              (section.key === 'settings' && currentPath.startsWith('/settings'));

            // Section is expanded if actively on it (unless explicitly toggled closed) or if toggled open
            const isExpanded = !collapsed && hasSubItems && (expandedSections[section.key] ?? isSectionActive);

            return (
              <div
                key={section.key}
                className={`sidebar-section-block ${isSectionActive ? 'section-active' : ''} ${isExpanded ? 'is-expanded' : ''}`}
              >
                {/* Primary Main Navigation Link */}
                <NavLink
                  to={section.to}
                  className={`sidebar-link ${isSectionActive ? 'active' : ''}`}
                  aria-label={section.label}
                  onMouseEnter={(e) => handleMouseEnter(section.label, e)}
                  onMouseLeave={handleMouseLeave}
                  onClick={(e) => {
                    handleMouseLeave();
                    if (hasSubItems && isSectionActive) {
                      toggleSection(section.key, e);
                    }
                  }}
                >
                  <Icon className="link-icon" size={collapsed ? 22 : 19} aria-hidden="true" />
                  <span className="link-text">{section.label}</span>
                </NavLink>

                {/* Sub-Navigation Items */}
                {hasSubItems && !collapsed && (
                  <div className={`sidebar-touch-expand-drawer ${isExpanded ? 'open' : ''}`}>
                    <div className="sidebar-tree-container">
                      <div className="sidebar-tree-line" />
                      <div className="sidebar-tree-items">
                        {section.subItems!.map((sub) => {
                          const isSubActive =
                            currentPath === sub.to ||
                            (sub.to !== '/reports' && currentPath.startsWith(sub.to + '/'));

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
                aria-label="Sign In"
                onMouseEnter={(e) => handleMouseEnter('Sign In', e)}
                onMouseLeave={handleMouseLeave}
                onClick={handleMouseLeave}
              >
                <LogIn className="link-icon" size={collapsed ? 22 : 19} aria-hidden="true" />
                <span className="link-text">Sign In</span>
              </NavLink>
            </div>
          )}
        </nav>

        {/* Admin / Profile Icon Button after Settings */}
        {user && (
          <div className="sidebar-footer">
            <div className="sidebar-admin-btn-container">
              <button
                type="button"
                className="sidebar-admin-icon-btn"
                onClick={() => {
                  handleMouseLeave();
                  setIsProfileModalOpen(true);
                }}
                aria-label={profileTitle}
                onMouseEnter={(e) => handleMouseEnter(profileTitle, e)}
                onMouseLeave={handleMouseLeave}
              >
                {user.profileImage ? (
                  <div className="sidebar-admin-avatar-wrap">
                    <img
                      src={user.profileImage}
                      alt={user.name}
                      className="sidebar-admin-avatar-img"
                    />
                    {selectedRole === 'Admin' && (
                      <span className="sidebar-admin-shield-dot">
                        <ShieldCheck size={11} />
                      </span>
                    )}
                  </div>
                ) : selectedRole === 'Admin' ? (
                  <div className="sidebar-admin-fallback-icon">
                    <ShieldCheck size={18} />
                  </div>
                ) : (
                  <div className="sidebar-admin-fallback-icon">
                    <span>{getInitials(user.name)}</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Floating Tooltip in Collapsed Sidebar */}
      {collapsed && hoveredTooltip && (
        <div
          className="sidebar-floating-portal-tooltip"
          style={{
            top: `${hoveredTooltip.top}px`,
            left: `${hoveredTooltip.left}px`,
          }}
          role="tooltip"
        >
          {hoveredTooltip.label}
        </div>
      )}

      {/* Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
