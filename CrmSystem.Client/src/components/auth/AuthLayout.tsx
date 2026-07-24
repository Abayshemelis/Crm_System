import React from 'react';
import {
  Building2, TrendingUp, Target, Users, Zap,
  Users2, Kanban, CalendarCheck, BarChart3, BellRing,
} from 'lucide-react';
import { Card } from '../ui/Card';
import '../ui/ui.css';
import './auth.css';

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
      <div className="auth-left-panel">
        <div className="auth-left-grid-pattern" />

        {/* Brand Header */}
        <div className="auth-left-brand">
          <div className="auth-brand-pill">
            <Building2 size={20} className="auth-brand-icon" />
            <span>CRM Pro Platform</span>
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

          {/* CRM Dashboard Vector Visual Representation */}
          <div className="auth-crm-illustration-card">
            {/* Visual Header Mockup */}
            <div className="crm-mockup-header">
              <div className="crm-mockup-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <span className="crm-mockup-title">Sales Pipeline Overview</span>
              <span className="crm-mockup-live"><span className="live-pulse" /> Live</span>
            </div>

            {/* Visual Pipeline Stages */}
            <div className="crm-mockup-body">
              <div className="crm-stage-column">
                <span className="stage-name">Lead Qualification</span>
                <div className="stage-bar bar-1"><span>$450k</span></div>
              </div>
              <div className="crm-stage-column">
                <span className="stage-name">Proposal Sent</span>
                <div className="stage-bar bar-2"><span>$820k</span></div>
              </div>
              <div className="crm-stage-column">
                <span className="stage-name">Closed Won</span>
                <div className="stage-bar bar-3"><span>$1.2M</span></div>
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
          <span>© 2026 CRM Pro. All rights reserved.</span>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
         RIGHT SIDE (50%): RESIZED COMPACT KPI CARDS & LOGIN FORM
         ═════════════════════════════════════════════════════════════════════ */}
      <div className="auth-right-panel">
        <div className="auth-right-content">

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
