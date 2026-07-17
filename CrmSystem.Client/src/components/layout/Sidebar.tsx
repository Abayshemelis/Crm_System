import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Users, Building2, UserCircle, Settings, LogIn, Kanban, ChevronDown, ChevronRight, Package, Layers, Tag, List } from 'lucide-react';
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

            <div className="sidebar-menu-group">
              <NavLink to="/leads" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Users className="link-icon" />
                <span>Leads</span>
              </NavLink>
              
              {location.pathname.startsWith('/leads') && (
                <div className="sidebar-submenu">
                  <NavLink to="/leads/sources" className={({ isActive }) => `sidebar-link submenu-link ${isActive ? 'active' : ''}`}>
                    <Tag className="link-icon submenu-icon" />
                    <span>Lead Sources</span>
                  </NavLink>
                  <NavLink to="/leads/statuses" className={({ isActive }) => `sidebar-link submenu-link ${isActive ? 'active' : ''}`}>
                    <List className="link-icon submenu-icon" />
                    <span>Lead Statuses & Types</span>
                  </NavLink>
                </div>
              )}
            </div>

            <div className="sidebar-menu-group">
              <NavLink to="/pipeline" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Kanban className="link-icon" />
                <span>Pipeline</span>
              </NavLink>
              
              {location.pathname.startsWith('/pipeline') && (
                <div className="sidebar-submenu">
                  <NavLink to="/pipeline/products" className={({ isActive }) => `sidebar-link submenu-link ${isActive ? 'active' : ''}`}>
                    <Package className="link-icon submenu-icon" />
                    <span>Products</span>
                  </NavLink>
                  <NavLink to="/pipeline/stages" className={({ isActive }) => `sidebar-link submenu-link ${isActive ? 'active' : ''}`}>
                    <Layers className="link-icon submenu-icon" />
                    <span>Pipeline Stages</span>
                  </NavLink>
                </div>
              )}
            </div>

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
