import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Building2, UserCircle, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './layout.css';

export const Sidebar: React.FC = () => {
  const { isManagerOrAbove } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Building2 className="brand-icon" />
        <span className="brand-text">CRM Pro</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/customers" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Users className="link-icon" />
          <span>Customers</span>
        </NavLink>
        
        <NavLink to="/companies" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Building2 className="link-icon" />
          <span>Companies</span>
        </NavLink>

        {isManagerOrAbove && (
          <NavLink to="/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <UserCircle className="link-icon" />
            <span>Users</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Settings className="link-icon" />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
};
