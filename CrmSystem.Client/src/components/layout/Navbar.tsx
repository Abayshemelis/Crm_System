import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './layout.css';
import { LogOut, User, Sun, Moon, ChevronDown, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NotificationBell } from '../notifications/NotificationBell';
import { SearchDropdown } from './SearchDropdown';
import { RoleBadge } from '../ui/RoleBadge';
import { initTheme, applyThemePreset, ATTRACTIVE_THEMES } from '../../lib/theme';

interface NavbarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onMobileMenuClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  collapsed = false,
  onToggleCollapse,
  onMobileMenuClick,
}) => {
  const { user, userRole, selectedRole, switchRole, logout } = useAuth();
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

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

  // Close role dropdown when clicking outside
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setShowRoleDropdown(false);
      }
    };
    if (showRoleDropdown) {
      document.addEventListener('mousedown', onOutside);
      return () => document.removeEventListener('mousedown', onOutside);
    }
  }, [showRoleDropdown]);

  // Escape closes role dropdown
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowRoleDropdown(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        {/* Hamburger: visible only on tablet/mobile via CSS */}
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

        {/* Desktop collapse/expand toggle: visible only on desktop via CSS */}
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

            <div className="user-menu">
              <div className="user-info">
                <span className="user-name">{user?.name}</span>
                {user && user.roles.length > 1 ? (
                  <div ref={roleDropdownRef} style={{ position: 'relative' }}>
                    <button
                      className="role-switcher-btn"
                      onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                      aria-haspopup="listbox"
                      aria-expanded={showRoleDropdown}
                    >
                      <RoleBadge role={selectedRole || ''} />
                      <ChevronDown size={14} aria-hidden="true" />
                    </button>
                    {showRoleDropdown && (
                      <div className="role-dropdown" role="listbox">
                        {user.roles.map(role => (
                          <button
                            key={role}
                            role="option"
                            aria-selected={selectedRole === role}
                            className={`role-option ${selectedRole === role ? 'active' : ''}`}
                            onClick={() => {
                              switchRole(role);
                              setShowRoleDropdown(false);
                              navigate('/dashboard');
                            }}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <RoleBadge role={userRole || ''} />
                )}
              </div>

              <div className="avatar" aria-hidden="true">
                <User size={20} />
              </div>
            </div>

            <button
              onClick={logout}
              className="logout-btn"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={20} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </nav>
  );
};
