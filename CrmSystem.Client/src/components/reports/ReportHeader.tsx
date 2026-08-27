import React, { useState } from 'react';
import {
  Calendar, Download, Printer, RefreshCw, Search,
  Filter, ChevronDown, Check, X, Shield, Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../screens/reports/cleanReports.css';

export interface DatePresetOption {
  label: string;
  id: string;
}

export const DATE_PRESETS: DatePresetOption[] = [
  { id: 'today',      label: 'Today' },
  { id: 'yesterday',  label: 'Yesterday' },
  { id: '7days',      label: 'Last 7 Days' },
  { id: '30days',     label: 'Last 30 Days' },
  { id: 'thisMonth',  label: 'This Month' },
  { id: 'lastMonth',  label: 'Last Month' },
  { id: 'thisQuarter',label: 'This Quarter' },
  { id: 'thisYear',   label: 'This Year' },
  { id: 'custom',     label: 'Custom Range' },
];

export function calculateDateRange(presetId: string): { start: string; end: string } {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  switch (presetId) {
    case 'today': {
      return { start: todayStr, end: todayStr };
    }
    case 'yesterday': {
      const yest = new Date(Date.now() - 86400_000);
      const yestStr = yest.toISOString().split('T')[0];
      return { start: yestStr, end: yestStr };
    }
    case '7days': {
      const d7 = new Date(Date.now() - 7 * 86400_000);
      return { start: d7.toISOString().split('T')[0], end: todayStr };
    }
    case '30days': {
      const d30 = new Date(Date.now() - 30 * 86400_000);
      return { start: d30.toISOString().split('T')[0], end: todayStr };
    }
    case 'thisMonth': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: firstDay.toISOString().split('T')[0], end: todayStr };
    }
    case 'lastMonth': {
      const firstDayPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: firstDayPrev.toISOString().split('T')[0], end: lastDayPrev.toISOString().split('T')[0] };
    }
    case 'thisQuarter': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
      return { start: quarterStart.toISOString().split('T')[0], end: todayStr };
    }
    case 'thisYear': {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return { start: yearStart.toISOString().split('T')[0], end: todayStr };
    }
    default: {
      const defaultStart = new Date(Date.now() - 30 * 86400_000);
      return { start: defaultStart.toISOString().split('T')[0], end: todayStr };
    }
  }
}

interface FilterOption {
  value: string | number;
  label: string;
}

interface ReportHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  badge?: string;
  startDate: string;
  endDate: string;
  activePreset: string;
  onPresetChange: (presetId: string, customStart?: string, customEnd?: string) => void;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  statusFilter?: string;
  onStatusChange?: (val: string) => void;
  statusOptions?: FilterOption[];
  sourceFilter?: string;
  onSourceChange?: (val: string) => void;
  sourceOptions?: FilterOption[];
  methodFilter?: string;
  onMethodChange?: (val: string) => void;
  methodOptions?: FilterOption[];
  scope?: 'personal' | 'team';
  onScopeChange?: (scope: 'personal' | 'team') => void;
  onRefresh: () => void;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  loading?: boolean;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  title,
  description,
  badge,
  startDate,
  endDate,
  activePreset,
  onPresetChange,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  statusOptions,
  sourceFilter,
  onSourceChange,
  sourceOptions,
  methodFilter,
  onMethodChange,
  methodOptions,
  scope,
  onScopeChange,
  onRefresh,
  onExportCSV,
  onExportPDF,
  loading = false,
}) => {
  const { isManagerOrAbove } = useAuth();
  const [showCustomDates, setShowCustomDates] = useState(activePreset === 'custom');
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

  const handlePresetClick = (presetId: string) => {
    if (presetId === 'custom') {
      setShowCustomDates(true);
      onPresetChange('custom', customStart, customEnd);
    } else {
      setShowCustomDates(false);
      const { start, end } = calculateDateRange(presetId);
      onPresetChange(presetId, start, end);
    }
  };

  const applyCustomRange = () => {
    if (customStart && customEnd) {
      onPresetChange('custom', customStart, customEnd);
    }
  };

  return (
    <div className="clean-report-header" aria-label={`${title} Header`}>
      {/* ── Title & Meta ───────────────────────────────────────────────── */}
      <div className="clean-header-top">
        <div className="clean-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 className="clean-report-title">{title}</h1>
            {badge && <span className="clean-badge clean-badge-primary">{badge}</span>}
          </div>
          <p className="clean-report-desc">{description}</p>
        </div>

        {/* ── Top-right Actions: Refresh & Exports ────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isManagerOrAbove && scope && onScopeChange && (
            <div className="rpt-scope-toggle-group">
              <button
                type="button"
                className={`rpt-scope-btn ${scope === 'team' ? 'active' : ''}`}
                onClick={() => onScopeChange('team')}
              >
                🏢 Team Scope
              </button>
              <button
                type="button"
                className={`rpt-scope-btn ${scope === 'personal' ? 'active' : ''}`}
                onClick={() => onScopeChange('personal')}
              >
                👤 My Records
              </button>
            </div>
          )}

          <button
            type="button"
            className="clean-btn-secondary"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh live report data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {onExportCSV && (
            <button
              type="button"
              className="clean-btn-secondary"
              onClick={onExportCSV}
              title="Download raw table records as CSV"
            >
              <Download size={14} />
              <span>CSV</span>
            </button>
          )}

          {onExportPDF && (
            <button
              type="button"
              className="clean-btn-secondary pdf-btn-style"
              onClick={onExportPDF}
              title="Generate Executive PDF Report"
            >
              <Printer size={14} />
              <span>PDF Report</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar: Date Presets, Custom Range, & Global Search/Filters ──── */}
      <div className="clean-toolbar">
        {/* Date presets */}
        <div className="clean-toolbar-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div className="rpt-search-box" style={{ padding: '0 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
              <select
                value={activePreset}
                onChange={(e) => handlePresetClick(e.target.value)}
                className="rpt-filter-select"
                style={{ border: 'none', background: 'transparent', paddingLeft: '4px', fontWeight: 600, color: 'var(--text-primary)' }}
              >
                {DATE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {showCustomDates && (
              <div className="rpt-custom-date-container">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="rpt-custom-date-input"
                />
                <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.75rem' }}>to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="rpt-custom-date-input"
                />
                <button
                  type="button"
                  onClick={applyCustomRange}
                  className="rpt-custom-date-apply-btn"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Global Filters & Search */}
        <div className="clean-toolbar-group">
          {onSearchChange && (
            <div className="rpt-search-box">
              <Search size={14} className="rpt-search-icon" />
              <input
                type="text"
                value={searchTerm || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search report records..."
                className="rpt-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="rpt-search-clear"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {statusOptions && onStatusChange && (
            <select
              value={statusFilter || ''}
              onChange={(e) => onStatusChange(e.target.value)}
              className="rpt-filter-select"
            >
              <option value="">All Statuses</option>
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {sourceOptions && onSourceChange && (
            <select
              value={sourceFilter || ''}
              onChange={(e) => onSourceChange(e.target.value)}
              className="rpt-filter-select"
            >
              <option value="">All Sources</option>
              {sourceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {methodOptions && onMethodChange && (
            <select
              value={methodFilter || ''}
              onChange={(e) => onMethodChange(e.target.value)}
              className="rpt-filter-select"
            >
              <option value="">All Payment Methods</option>
              {methodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
};
