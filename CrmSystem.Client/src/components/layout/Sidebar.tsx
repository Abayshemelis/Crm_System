import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Building2, UserCircle, Settings, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './layout.css';

export const Sidebar: React.FC = () => {
  const { isManagerOrAbove, user } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Building2 className="brand-icon" />
        <span className="brand-text">CRM Pro</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Building2 className="link-icon" />
          <span>Dashboard</span>
        </NavLink>

        {user && (
          <>
            <NavLink to="/customers" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Users className="link-icon" />
              <span>Customers</span>
            </NavLink>

            <NavLink to="/companies" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Building2 className="link-icon" />
              <span>Companies</span>
            </NavLink>

            <NavLink to="/leads" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Users className="link-icon" />
              <span>Leads</span>
            </NavLink>

            {isManagerOrAbove && (
              <NavLink to="/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <UserCircle className="link-icon" />
                <span>Users</span>
              </NavLink>
            )}
          </>
        )}

        {!user && (
          <NavLink to="/login" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <LogIn className="link-icon" />
            <span>Sign In</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Settings className="link-icon" />
            <span>Settings</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
};
