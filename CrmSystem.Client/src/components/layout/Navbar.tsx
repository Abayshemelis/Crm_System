import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './layout.css';
import { confirmAction } from '../../lib/confirm';
import {
  LogOut, User, Sun, Moon, Menu, PanelLeftClose, PanelLeftOpen,
  ShieldCheck, Check, ChevronDown, Settings, Building2
} from 'lucide-react';
import { NotificationBell } from '../notifications/NotificationBell';
import { SearchDropdown } from './SearchDropdown';
import { UserProfileModal } from './UserProfileModal';
import { initTheme, applyThemePreset, ATTRACTIVE_THEMES } from '../../lib/theme';

interface NavbarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onMobileMenuClick?: () => void;
}

const ROLE_META: Record<string, { label: string; emoji: string; description: string }> = {
  Admin:    { label: 'Admin',    emoji: '👑', description: 'Full system access' },
  Manager:  { label: 'Manager', emoji: '👔', description: 'Team & pipeline management' },
  SalesRep: { label: 'Sales Rep', emoji: '💼', description: 'Leads, deals & activities' },
};

export const Navbar: React.FC<NavbarProps> = ({
  collapsed = false,
  onToggleCollapse,
  onMobileMenuClick,
}) => {
  const { user, logout, selectedRole, switchRole } = useAuth();
  const [themeMode, setThemeMode]       = useState<'dark' | 'light'>('dark');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen]         = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    initTheme();
    const mode = document.documentElement.getAttribute('data-theme') as 'dark' | 'light';
    setThemeMode(mode || 'dark');
  }, []);

  const toggleTheme = () => {
    const currentMode = document.documentElement.getAttribute('data-theme') as 'dark' | 'light';
    const targetPreset = currentMode === 'dark'
      ? (ATTRACTIVE_THEMES.find(t => t.mode === 'light') || ATTRACTIVE_THEMES[6])
      : (ATTRACTIVE_THEMES.find(t => t.id === 'cyber-midnight') || ATTRACTIVE_THEMES[0]);
    applyThemePreset(targetPreset);
    setThemeMode(targetPreset.mode);
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleSwitchRole = (role: 'Admin' | 'Manager' | 'SalesRep') => {
    switchRole(role);
    setIsDropdownOpen(false);
  };

  const currentMeta = ROLE_META[selectedRole] ?? ROLE_META['SalesRep'];
  const availableRoles = (user?.roles ?? []) as Array<'Admin' | 'Manager' | 'SalesRep'>;
  const hasMultipleRoles = availableRoles.length > 1;

  return (
    <>
      <nav className="navbar">
        <div className="navbar-left">
          {user && (
            <button
              className="hamburger-btn"
              onClick={onMobileMenuClick}
              aria-label="Open navigation menu"
              aria-haspopup="true"
            >
              <Menu size={22} aria-hidden="true" />
            </button>
          )}
          {user && (
            <button
              className="collapse-toggle-btn"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed
                ? <PanelLeftOpen  size={20} aria-hidden="true" />
                : <PanelLeftClose size={20} aria-hidden="true" />
              }
            </button>
          )}
          {user && <SearchDropdown />}
        </div>

        <div className="navbar-right">
          {user && (
            <>
              <button
                onClick={toggleTheme}
                className="nav-icon-btn"
                title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {themeMode === 'dark' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
              </button>

              <NotificationBell />

              {/* ── Role Switcher Dropdown ── */}
              <div className="nav-role-switcher-wrap" ref={dropdownRef}>
                <button
                  type="button"
                  className={`nav-role-avatar-btn ${isDropdownOpen ? 'open' : ''}`}
                  onClick={() => setIsDropdownOpen(prev => !prev)}
                  aria-label={`${currentMeta.label} — click to switch role`}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                >
                  <div className="avatar">
                    {user?.profileImage ? (
                      <img src={user.profileImage} alt={user.name} className="avatar-img" />
                    ) : user?.name ? (
                      <span className="avatar-initials">{getInitials(user.name)}</span>
                    ) : (
                      <User size={18} />
                    )}
                    {selectedRole === 'Admin' && (
                      <span className="nav-avatar-admin-dot">
                        <ShieldCheck size={10} />
                      </span>
                    )}
                  </div>
                  {hasMultipleRoles && (
                    <ChevronDown
                      size={13}
                      className={`nav-role-chevron ${isDropdownOpen ? 'rotated' : ''}`}
                      aria-hidden="true"
                    />
                  )}
                </button>

                {/* Dropdown Panel */}
                {isDropdownOpen && (
                  <div className="nav-role-dropdown" role="menu" aria-label="Switch role">
                    {/* User Info Header */}
                    <div className="nav-role-dropdown-header">
                      <div className="nav-role-dropdown-avatar">
                        {user?.profileImage ? (
                          <img src={user.profileImage} alt={user.name} className="avatar-img" />
                        ) : (
                          <span>{getInitials(user?.name ?? '')}</span>
                        )}
                      </div>
                      <div className="nav-role-dropdown-user">
                        <span className="nav-role-dropdown-name">{user?.name}</span>
                        <span className="nav-role-dropdown-email">{user?.email}</span>
                      </div>
                    </div>

                    {/* Role Options */}
                    {hasMultipleRoles && (
                      <div className="nav-role-dropdown-section">
                        <span className="nav-role-dropdown-section-label">Switch Role</span>
                        {availableRoles.map(role => {
                          const meta = ROLE_META[role];
                          const isActive = selectedRole === role;
                          return (
                            <button
                              key={role}
                              type="button"
                              className={`nav-role-option ${isActive ? 'active' : ''}`}
                              onClick={() => handleSwitchRole(role)}
                              role="menuitemradio"
                              aria-checked={isActive}
                            >
                              <span className="nav-role-option-emoji">{meta.emoji}</span>
                              <span className="nav-role-option-info">
                                <span className="nav-role-option-label">{meta.label}</span>
                                <span className="nav-role-option-desc">{meta.description}</span>
                              </span>
                              {isActive && <Check size={14} className="nav-role-option-check" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="nav-role-dropdown-divider" />

                    {/* Actions */}
                    <div className="nav-role-dropdown-actions">
                      <button
                        type="button"
                        className="nav-role-action-btn"
                        onClick={() => { setIsDropdownOpen(false); setIsProfileModalOpen(true); }}
                      >
                        <User size={14} />
                        <span>View Profile</span>
                      </button>
                      <button
                        type="button"
                        className="nav-role-action-btn danger"
                        onClick={async () => {
                          setIsDropdownOpen(false);
                          if (await confirmAction('Are you sure you want to log out?', { confirmText: 'Yes', cancelText: 'No', type: 'info' })) {
                            logout();
                          }
                        }}
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </nav>

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
