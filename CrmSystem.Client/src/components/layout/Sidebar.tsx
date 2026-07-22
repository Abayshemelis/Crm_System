import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Users, Building2, UserCircle, Settings, LogIn, Kanban, CheckSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './layout.css';

export const Sidebar: React.FC = () => {
  const { isManagerOrAbove, user } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const location = useLocation();

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  const isPipelineExpanded = expandedMenus['pipeline'] || location.pathname.startsWith('/pipeline');
  const isLeadsExpanded = expandedMenus['leads'] || location.pathname.startsWith('/leads');

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

            <NavLink to="/pipeline" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Kanban className="link-icon" />
              <span>Pipeline</span>
            </NavLink>

            <NavLink to="/tasks" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <CheckSquare className="link-icon" />
              <span>Tasks</span>
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
        {user && isManagerOrAbove && (
          <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Settings className="link-icon" />
            <span>Settings</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
};
