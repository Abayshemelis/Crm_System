import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import './layout.css';

interface LayoutProps { children: React.ReactNode; }

export const Layout: React.FC<LayoutProps> = ({ children }) => (
  <div className="layout-app">
    <Sidebar />
    <div className="layout-main">
      <Navbar />
      <main className="main-content">
        <div className="content-container">{children}</div>
      </main>
    </div>
  </div>
);
