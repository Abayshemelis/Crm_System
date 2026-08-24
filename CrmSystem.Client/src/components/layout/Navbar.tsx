import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './layout.css';
import { LogOut, User, Sun, Moon, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NotificationBell } from '../notifications/NotificationBell';
import { SearchDropdown } from './SearchDropdown';
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
  const { user, logout } = useAuth();
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

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
              <div className="avatar" aria-hidden="true" title={user?.name || 'User Profile'}>
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
