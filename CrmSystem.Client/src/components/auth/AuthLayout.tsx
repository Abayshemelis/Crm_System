import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ArrowLeft, Sun, Moon, Sparkles, Shield } from 'lucide-react';
import { Card } from '../ui/Card';
import { initTheme, applyThemePreset, ATTRACTIVE_THEMES } from '../../lib/theme';
import { NetworkBackground } from './NetworkBackground';
import '../ui/ui.css';
import './auth.css';
import '../layout/layout.css';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  children
}) => {
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    initTheme();
    const mode = (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'dark';
    setThemeMode(mode);
  }, []);

  const toggleTheme = () => {
    const currentMode = (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'dark';
    const targetPreset = currentMode === 'dark'
      ? (ATTRACTIVE_THEMES.find(t => t.mode === 'light') || ATTRACTIVE_THEMES[6])
      : (ATTRACTIVE_THEMES.find(t => t.id === 'cyber-midnight') || ATTRACTIVE_THEMES[0]);

    applyThemePreset(targetPreset);
    setThemeMode(targetPreset.mode);
  };

  return (
    <div className="auth-centered-container">
      {/* ── 1. Futuristic Network Nodes & Lines Background ── */}
      <NetworkBackground />

      {/* ── 2. Subtle Glow Orbs & Grid Behind Canvas ── */}
      <div className="auth-glow-top" />
      <div className="auth-glow-bottom" />
      <div className="auth-glow-center" />
      <div className="auth-bg-grid" />

      {/* ── 3. Top Header Navigation Bar ── */}
      <header className="auth-top-nav">
        <Link
          to="/"
          className="auth-back-pill"
          title="Return to CRM Home"
        >
          <ArrowLeft size={15} />
          <span>Back to Home</span>
        </Link>

        <div className="auth-top-right-group">
          <div className="auth-brand-pill">
            <span className="auth-brand-dot" />
            <Building2 size={16} className="auth-brand-icon" />
            <span style={{ fontWeight: 800, letterSpacing: '0.04em' }}>CRM PLATFORM</span>
          </div>

          <button
            type="button"
            className="auth-theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle theme mode"
          >
            {themeMode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* ── 4. Centered Login Card ── */}
      <main className="auth-center-content" style={{ maxWidth: '540px', width: '100%' }}>
        <div className="login-card-wrapper animate-fade-in" style={{ width: '100%' }}>
          <Card className="login-card glass-panel" style={{ maxWidth: '540px', width: '100%' }}>
            <div className="login-header">
              <div className="brand-logo-container">
                <div className="brand-logo-glow" />
                <div className="brand-logo-large">
                  <Building2 size={26} />
                </div>
              </div>

              <div className="crm-brand-title">
                CRM <span>SYSTEM</span>
              </div>

              <h1 className="login-card-title">{title}</h1>
              <p className="login-card-subtitle">{subtitle}</p>
            </div>

            {children}
          </Card>
        </div>
      </main>
    </div>
  );
};
