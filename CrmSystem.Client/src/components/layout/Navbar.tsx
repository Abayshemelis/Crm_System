import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './layout.css';
import { Building2, LogOut, Users, LayoutDashboard, Briefcase, Search, Bell, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="search-bar-global">
          <Search className="search-icon" size={18} />
          <input type="text" placeholder="Search everywhere..." />
        </div>
      </div>
      
      <div className="navbar-right">
        <button className="nav-icon-btn">
          <Bell size={20} />
          <span className="badge">3</span>
        </button>
        
        <div className="user-menu">
          <div className="user-info">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{user?.role}</span>
          </div>
          <div className="avatar">
            <User size={20} />
          </div>
        </div>

        <button onClick={logout} className="logout-btn" title="Logout">
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
};
