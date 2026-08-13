import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, TrendingUp, Target, Users, Zap,
  Users2, Kanban, CalendarCheck, BarChart3, BellRing, ArrowLeft
} from 'lucide-react';
import { Card } from '../ui/Card';
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
  return (
    <div className="auth-50split-container">
      {/* Background Ambient Glows */}
      <div className="auth-glow-top" />
      <div className="auth-glow-bottom" />

      {/* ═════════════════════════════════════════════════════════════════════
         LEFT SIDE (50%): HIGH-QUALITY CRM ILLUSTRATION & BRANDING
         ═════════════════════════════════════════════════════════════════════ */}
      <div className="auth-left-panel" style={{ background: 'transparent' }}>
        <div className="auth-left-grid-pattern" />

        {/* Brand Header */}
        <div className="auth-left-brand">
          <div className="auth-brand-pill">
            <Building2 size={20} className="auth-brand-icon" />
            <span>CRM Platform</span>
          </div>
        </div>

        {/* Hero Title & Capabilities */}
        <div className="auth-left-content">
          <h1 className="auth-left-title">
            Transform Sales & <br />
            <span className="auth-title-gradient">Customer Relationships</span>
          </h1>
          <p className="auth-left-subtitle">
            An all-in-one CRM suite for managing companies, converting leads, tracking sales pipelines, and analyzing business growth.
          </p>

          {/* Premium CRM Visual Representation (The Animated Computer/Dashboard Mockup) */}
          <div className="auth-crm-illustration-card" style={{ animation: 'float 6s ease-in-out infinite' }}>
            <div className="crm-mockup-header">
              <div className="crm-mockup-dots">
                <div className="dot red"></div>
                <div className="dot yellow"></div>
                <div className="dot green"></div>
              </div>
              <div className="crm-mockup-title">Pipeline Overview</div>
              <div className="crm-mockup-live">
                <span className="live-pulse"></span>
                LIVE
              </div>
            </div>
            
            <div className="crm-mockup-body">
              <div className="crm-stage-column">
                <span className="stage-name">Qualified</span>
                <div className="stage-bar bar-1 animate-pulse-slow" style={{ height: '80px' }}>
                  $45k
                </div>
              </div>
              
              <div className="crm-stage-column">
                <span className="stage-name">Proposal</span>
                <div className="stage-bar bar-2 animate-pulse-slow" style={{ height: '60px', animationDelay: '0.2s' }}>
                  $28k
                </div>
              </div>
              
              <div className="crm-stage-column">
                <span className="stage-name">Negotiation</span>
                <div className="stage-bar bar-3 animate-pulse-slow" style={{ height: '40px', animationDelay: '0.4s' }}>
                  $12k
                </div>
              </div>
            </div>
          </div>

          {/* Core Feature Badges */}
          <div className="auth-feature-grid">
            <div className="auth-feature-item">
              <Users2 size={16} className="feat-icon" />
              <span>Customers & Companies</span>
            </div>
            <div className="auth-feature-item">
              <Kanban size={16} className="feat-icon" />
              <span>Lead & Sales Pipeline</span>
            </div>
            <div className="auth-feature-item">
              <CalendarCheck size={16} className="feat-icon" />
              <span>Tasks & Workflows</span>
            </div>
            <div className="auth-feature-item">
              <BarChart3 size={16} className="feat-icon" />
              <span>Dashboard Analytics</span>
            </div>
            <div className="auth-feature-item">
              <BellRing size={16} className="feat-icon" />
              <span>Notifications & Activity</span>
            </div>
          </div>
        </div>

        <div className="auth-left-footer">
          <span>© 2026 CRM. All rights reserved.</span>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
         RIGHT SIDE (50%): RESIZED COMPACT KPI CARDS & LOGIN FORM
         ═════════════════════════════════════════════════════════════════════ */}
      <div className="auth-right-panel">
        <div className="auth-right-content">
          {/* Back to Landing Page Navigation Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem', width: '100%' }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#10b981',
                fontSize: '0.875rem',
                fontWeight: 700,
                textDecoration: 'none',
                padding: '0.5rem 1.1rem',
                borderRadius: '99px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.15)',
                transition: 'all 0.2s ease'
              }}
            >
              <ArrowLeft size={16} />
              <span>Back </span>
            </Link>
          </div>

          {/* ── Compact Resized KPI Cards (Right Side) ── */}
          <div className="auth-compact-kpi-bar">
            <div className="compact-kpi-card">
              <div className="compact-kpi-top">
                <TrendingUp size={14} className="compact-icon emerald" />
                <span className="compact-badge green">+18%</span>
              </div>
              <span className="compact-value">$2.48M</span>
              <span className="compact-label">Revenue</span>
            </div>

            <div className="compact-kpi-card">
              <div className="compact-kpi-top">
                <Target size={14} className="compact-icon indigo" />
                <span className="compact-badge indigo">94.2%</span>
              </div>
              <span className="compact-value">Win Rate</span>
              <span className="compact-label">Pipeline</span>
            </div>

            <div className="compact-kpi-card">
              <div className="compact-kpi-top">
                <Users size={14} className="compact-icon amber" />
                <span className="compact-badge amber">1,280+</span>
              </div>
              <span className="compact-value">Accounts</span>
              <span className="compact-label">Active</span>
            </div>

            <div className="compact-kpi-card">
              <div className="compact-kpi-top">
                <Zap size={14} className="compact-icon violet" />
                <span className="compact-badge violet">3.2d</span>
              </div>
              <span className="compact-value">Velocity</span>
              <span className="compact-label">Avg Days</span>
            </div>
          </div>

          {/* ── Main Login Form Card ── */}
          <Card className="login-card glass-panel animate-fade-in">
            <div className="login-header">
              <div className="brand-logo-large">
                <Building2 size={26} />
              </div>
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>
            {children}
          </Card>
        </div>
      </div>
    </div>
  );
};
