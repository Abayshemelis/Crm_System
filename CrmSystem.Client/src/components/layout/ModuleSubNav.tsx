import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Users, Building2, UserCircle, Kanban, CheckSquare,
  Receipt, Target, FileText, UploadCloud, History,
  BarChart3, Settings, Sparkles, Layers, Award,
  Sliders, Calendar
} from 'lucide-react';
import './layout.css';

interface SubNavConfig {
  moduleKey: string;
  matchPrefixes: string[];
  title: string;
  items: {
    to: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badge?: string;
  }[];
}

const MODULE_SUBNAVS: SubNavConfig[] = [
  {
    moduleKey: 'customers',
    matchPrefixes: ['/customers'],
    title: 'Customer Management',
    items: [
      { to: '/customers', label: 'All Customers', icon: Users },
      { to: '/customers/reports', label: 'Customer Reports', icon: BarChart3, badge: 'Analytics' }
    ]
  },
  {
    moduleKey: 'companies',
    matchPrefixes: ['/companies'],
    title: 'Corporate Accounts',
    items: [
      { to: '/companies', label: 'All Companies', icon: Building2 },
      { to: '/companies/reports', label: 'Company Reports', icon: BarChart3, badge: 'Analytics' }
    ]
  },
  {
    moduleKey: 'leads',
    matchPrefixes: ['/leads'],
    title: 'Leads & Prospects',
    items: [
      { to: '/leads', label: 'All Leads', icon: Target },
      { to: '/leads/reports', label: 'Lead Reports', icon: BarChart3, badge: 'Funnel' }
    ]
  },
  {
    moduleKey: 'pipeline',
    matchPrefixes: ['/pipeline', '/opportunities'],
    title: 'Sales Pipeline',
    items: [
      { to: '/pipeline', label: 'Pipeline Board', icon: Kanban },
      { to: '/pipeline/reports', label: 'Pipeline Reports', icon: BarChart3, badge: 'Valuation' },
      { to: '/pipeline/stages', label: 'Stage Settings', icon: Sliders }
    ]
  },
  {
    moduleKey: 'contracts',
    matchPrefixes: ['/contracts'],
    title: 'Contracts & Legal',
    items: [
      { to: '/contracts', label: 'All Contracts', icon: FileText },
      { to: '/contracts/reports', label: 'Contract Reports', icon: BarChart3, badge: 'E-Sign' }
    ]
  },
  {
    moduleKey: 'invoices',
    matchPrefixes: ['/invoices'],
    title: 'Invoices & Billing',
    items: [
      { to: '/invoices', label: 'All Invoices', icon: Receipt },
      { to: '/invoices/reports', label: 'Invoice Reports', icon: BarChart3, badge: 'Revenue' }
    ]
  },
  {
    moduleKey: 'tasks',
    matchPrefixes: ['/tasks'],
    title: 'Tasks & Calendar',
    items: [
      { to: '/tasks', label: 'Tasks & Calendar', icon: CheckSquare },
      { to: '/tasks/reports', label: 'Task Reports', icon: BarChart3, badge: 'Metrics' }
    ]
  },
  {
    moduleKey: 'import',
    matchPrefixes: ['/import'],
    title: 'Data Migration',
    items: [
      { to: '/import', label: 'Import Wizard', icon: UploadCloud },
      { to: '/import/reports', label: 'Import Reports', icon: BarChart3, badge: 'Audit' }
    ]
  },
  {
    moduleKey: 'audit-logs',
    matchPrefixes: ['/audit-logs'],
    title: 'System History & Security',
    items: [
      { to: '/audit-logs', label: 'Audit Trail Logs', icon: History },
      { to: '/audit-logs/reports', label: 'History Reports', icon: BarChart3, badge: 'Security' }
    ]
  },
  {
    moduleKey: 'users',
    matchPrefixes: ['/users'],
    title: 'Team & User Management',
    items: [
      { to: '/users', label: 'User Directory', icon: UserCircle },
      { to: '/users/reports', label: 'Rep Leaderboard', icon: Award, badge: 'Quota' }
    ]
  }
];

export const ModuleSubNav: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Find matching module config
  const activeConfig = MODULE_SUBNAVS.find(config =>
    config.matchPrefixes.some(prefix => currentPath === prefix || currentPath.startsWith(prefix + '/'))
  );

  // If no sub-navigation is configured for this route, render nothing
  if (!activeConfig) return null;

  return (
    <div className="module-subnav-wrapper animate-fade-in" aria-label={`${activeConfig.title} Sub-Navigation`}>
      <div className="module-subnav-container">
        <div className="module-subnav-pills">
          {activeConfig.items.map(item => {
            const Icon = item.icon;
            // Check if active: exact match or child match
            const isReportItem = item.to.endsWith('/reports');
            const isCurrentReport = currentPath.endsWith('/reports');
            const isStagesItem = item.to.endsWith('/stages');
            const isCurrentStages = currentPath.endsWith('/stages');

            let isActive = false;
            if (isReportItem) {
              isActive = isCurrentReport;
            } else if (isStagesItem) {
              isActive = isCurrentStages;
            } else {
              isActive = !isCurrentReport && !isCurrentStages && (currentPath === item.to || currentPath.startsWith(item.to + '/'));
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`module-subnav-pill ${isActive ? 'active' : ''}`}
                end={item.to === '/pipeline' || item.to === '/customers' || item.to === '/companies' || item.to === '/leads' || item.to === '/contracts' || item.to === '/invoices' || item.to === '/tasks' || item.to === '/import' || item.to === '/audit-logs' || item.to === '/users'}
              >
                <Icon size={15} className="subnav-pill-icon" />
                <span className="subnav-pill-label">{item.label}</span>
                {item.badge && (
                  <span className={`subnav-pill-badge ${isActive ? 'badge-active' : ''}`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
};
