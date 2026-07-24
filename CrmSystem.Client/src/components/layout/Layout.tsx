import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import './layout.css';

interface LayoutProps { children: React.ReactNode; }

// Desktop collapse preference key
const COLLAPSE_KEY = 'crm_sidebar_collapsed';

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  // Desktop: collapsed (icon-only) vs expanded
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === 'true'; }
    catch { return false; }
  });

  // Mobile/tablet: overlay drawer open
  const [mobileOpen, setMobileOpen] = useState(false);

  // Track if we're on mobile/tablet (≤ 1023px)
  const isMobileRef = useRef(typeof window !== 'undefined' && window.innerWidth <= 1023);

  const openMobile  = useCallback(() => setMobileOpen(true),  []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const toggleCollapse = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  // Escape key closes mobile drawer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Close mobile drawer when a nav link is clicked
  useEffect(() => {
    const onNav = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if ((t.closest('a[href]') || t.closest('.sidebar-link')) && mobileOpen) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('click', onNav);
    return () => document.removeEventListener('click', onNav);
  }, [mobileOpen]);

  // On resize: if going from mobile → desktop, close mobile drawer
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 1023) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Lock body scroll when mobile overlay is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const layoutClass = [
    'layout-app',
    collapsed ? 'sidebar-collapsed' : '',
    mobileOpen ? 'mobile-nav-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={layoutClass}>
      {/* Overlay – closes mobile drawer on click */}
      <div
        className={`sidebar-overlay${mobileOpen ? ' visible' : ''}`}
        onClick={closeMobile}
        aria-hidden="true"
      />

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={closeMobile}
      />

      <div className="layout-main">
        <Navbar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          onMobileMenuClick={openMobile}
        />
        <main className="main-content">
          <div className="content-container">{children}</div>
        </main>
      </div>
    </div>
  );
};
