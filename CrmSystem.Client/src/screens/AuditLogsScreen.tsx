import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../lib/toast';
import { api } from '../lib/api';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { confirmAction } from '../lib/confirm';
import {
  History,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  User,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Activity,
  Layers,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Info,
  FileSpreadsheet,
  BarChart3,
  Table as TableIcon,
  Eye,
  PlusCircle,
  Edit3,
  ShieldCheck,
  Clock,
  X,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Sparkles,
  FileText
} from 'lucide-react';
import './reports/cleanReports.css';
import './screens.css';

interface GlobalAuditLogItem {
  auditLogId: number;
  entityTypeId: number;
  entityTypeName: string;
  entityId: number;
  auditActionTypeId: number;
  auditActionTypeName: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  changedById: number;
  changedByName: string;
  changedByEmail: string | null;
  changedAt: string;
}

interface AuditLogPagedResponse {
  items: GlobalAuditLogItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface UserOption {
  id?: number;
  identityId?: number;
  name?: string;
  email?: string;
}

export const AuditLogsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [logs, setLogs] = useState<GlobalAuditLogItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View toggle: feed or table
  const [viewMode, setViewMode] = useState<'feed' | 'table'>('feed');

  // Filters
  const [entityTypeName, setEntityTypeName] = useState<string>('All');
  const [auditActionTypeName, setAuditActionTypeName] = useState<string>('All');
  const [changedById, setChangedById] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Reps list for dropdown filter
  const [users, setUsers] = useState<UserOption[]>([]);

  // Selected Log for details modal & Inspect Modal View mode
  const [selectedLog, setSelectedLog] = useState<GlobalAuditLogItem | null>(null);
  const [inspectTab, setInspectTab] = useState<'diff' | 'json'>('diff');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Clear History Modal state
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearOption, setClearOption] = useState<'all' | 'filtered'>('all');
  const [isClearing, setIsClearing] = useState(false);

  // Fetch users for filtering
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await api.get<UserOption[]>('/api/users');
        setUsers(data || []);
      } catch (err) {
        console.warn('Could not load users list for audit log filter', err);
      }
    };
    fetchUsers();
  }, []);

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      if (entityTypeName !== 'All') params.append('entityTypeName', entityTypeName);
      if (auditActionTypeName !== 'All') params.append('auditActionTypeName', auditActionTypeName);
      if (changedById !== 'All') params.append('changedById', changedById);
      if (search.trim()) params.append('search', search.trim());
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const res = await api.get<AuditLogPagedResponse>(`/api/audit-logs?${params.toString()}`);
      setLogs(res.items || []);
      setTotalCount(res.totalCount || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
      setError(err.message || 'Failed to load system audit logs.');
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, entityTypeName, auditActionTypeName, changedById, search, fromDate, toDate]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleResetFilters = () => {
    setEntityTypeName('All');
    setAuditActionTypeName('All');
    setChangedById('All');
    setSearch('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const hasActiveFilters = entityTypeName !== 'All' || auditActionTypeName !== 'All' || changedById !== 'All' || search.trim() !== '' || fromDate !== '' || toDate !== '';

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      const params = new URLSearchParams();
      if (clearOption === 'filtered') {
        if (entityTypeName !== 'All') params.append('entityTypeName', entityTypeName);
        if (auditActionTypeName !== 'All') params.append('auditActionTypeName', auditActionTypeName);
      }
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      await api.delete(`/api/audit-logs/clear${queryStr}`);
      showToast('System audit history cleared successfully.', 'success');
      setShowClearModal(false);
      fetchAuditLogs();
    } catch (err: any) {
      showToast(err?.message || 'Failed to clear audit history.', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  const handleDeleteSingleLog = async (e: React.MouseEvent, logId: number) => {
    e.stopPropagation();
    if (!await confirmAction('Delete this audit record?')) return;
    try {
      await api.delete(`/api/audit-logs/${logId}`);
      showToast('Audit record deleted.', 'success');
      fetchAuditLogs();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete audit record.', 'error');
    }
  };

  // Metrics summary
  const deletionCount = useMemo(() => logs.filter(l => l.auditActionTypeName === 'Delete').length, [logs]);
  const updateCount = useMemo(() => logs.filter(l => l.auditActionTypeName === 'Update' || l.auditActionTypeName === 'StageChange').length, [logs]);
  const createCount = useMemo(() => logs.filter(l => l.auditActionTypeName === 'Create' || l.auditActionTypeName === 'Convert').length, [logs]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return '';
    const now = new Date();
    const d = new Date(dateString);
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'Delete':
        return { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.28)', icon: Trash2, label: 'DELETION' };
      case 'Create':
        return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.28)', icon: CheckCircle2, label: 'CREATE' };
      case 'Update':
      case 'StageChange':
        return { bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.28)', icon: RefreshCw, label: action === 'StageChange' ? 'STAGE CHANGE' : 'UPDATE' };
      case 'Assign':
        return { bg: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.28)', icon: User, label: 'ASSIGN' };
      case 'Convert':
        return { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.28)', icon: Activity, label: 'CONVERT' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.28)', icon: Info, label: action.toUpperCase() };
    }
  };

  const getUserInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!logs.length) {
      showToast('No audit logs to export.', 'info');
      return;
    }
    const headers = ['LogId', 'Entity', 'EntityId', 'Action', 'FieldName', 'OldValue', 'NewValue', 'ChangedBy', 'Email', 'Timestamp'];
    const rows = logs.map(l => [
      l.auditLogId,
      `"${(l.entityTypeName || '').replace(/"/g, '""')}"`,
      l.entityId,
      `"${(l.auditActionTypeName || '').replace(/"/g, '""')}"`,
      `"${(l.fieldName || '').replace(/"/g, '""')}"`,
      `"${(l.oldValue || '').replace(/"/g, '""')}"`,
      `"${(l.newValue || '').replace(/"/g, '""')}"`,
      `"${(l.changedByName || '').replace(/"/g, '""')}"`,
      `"${(l.changedByEmail || '').replace(/"/g, '""')}"`,
      `"${l.changedAt || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `system_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Layout>
      <div className="sh-container">
        {/* ── 1. Modern Header ─────────────────────────────────────────── */}
        <div className="sh-header-card">
          <div className="sh-header-top">
            <div className="sh-header-title-group">
              <div className="sh-header-icon-wrap">
                <ShieldCheck size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 2 }}>
                  <h1 className="sh-header-title">System History & Security Trail</h1>
                  <span className="clean-badge clean-badge-primary" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
                    IMMUTABLE AUDIT
                  </span>
                </div>
                <p className="sh-header-desc">
                  Chronological trail recording user actions, entity creations, field mutations, and deletions.
                </p>
              </div>
            </div>

            <div className="sh-actions-group">
              <button
                onClick={() => navigate('/audit-logs/reports')}
                className="clean-btn-primary"
                title="View Analytics & Mutation Reports"
              >
                <BarChart3 size={15} /> History Reports
              </button>
              <button
                onClick={handleExportCSV}
                className="clean-btn-secondary"
                title="Download CSV Audit Trail"
              >
                <FileSpreadsheet size={15} /> Export CSV
              </button>
              {isAdmin && (
                <button
                  onClick={() => setShowClearModal(true)}
                  className="clean-btn-secondary"
                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  title="Purge Audit Records (Admin)"
                >
                  <Trash2 size={14} /> Clear History
                </button>
              )}
              <button
                onClick={() => fetchAuditLogs()}
                className="clean-btn-secondary"
                style={{ padding: '7px 11px' }}
                title="Refresh Audit Trail"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. Compact, Easy-to-Scan KPI Cards ─────────────────────── */}
        <div className="sh-stat-grid">
          {/* Total Logged Actions */}
          <div className="sh-stat-card">
            <div className="sh-stat-top">
              <span className="sh-stat-label">Total Audit Records</span>
              <div className="sh-stat-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
                <Activity size={16} />
              </div>
            </div>
            <div className="sh-stat-val">{totalCount.toLocaleString()}</div>
            <div className="sh-stat-sub">
              <span className="clean-pill-delta clean-pill-blue">All Time</span>
              <span>Events logged across CRM</span>
            </div>
          </div>

          {/* Creations */}
          <div className="sh-stat-card">
            <div className="sh-stat-top">
              <span className="sh-stat-label">Creations & Inserts</span>
              <div className="sh-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                <PlusCircle size={16} />
              </div>
            </div>
            <div className="sh-stat-val" style={{ color: '#10b981' }}>{createCount}</div>
            <div className="sh-stat-sub">
              <span className="clean-pill-delta clean-pill-green">Inserts</span>
              <span>New records on page</span>
            </div>
          </div>

          {/* Updates & Mutations */}
          <div className="sh-stat-card">
            <div className="sh-stat-top">
              <span className="sh-stat-label">Field Mutations</span>
              <div className="sh-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                <Edit3 size={16} />
              </div>
            </div>
            <div className="sh-stat-val" style={{ color: '#3b82f6' }}>{updateCount}</div>
            <div className="sh-stat-sub">
              <span className="clean-pill-delta clean-pill-blue">Updates</span>
              <span>State & field edits</span>
            </div>
          </div>

          {/* Deletions */}
          <div className="sh-stat-card">
            <div className="sh-stat-top">
              <span className="sh-stat-label">Deletions & Purges</span>
              <div className="sh-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                <ShieldAlert size={16} />
              </div>
            </div>
            <div className="sh-stat-val" style={{ color: '#ef4444' }}>{deletionCount}</div>
            <div className="sh-stat-sub">
              <span className="clean-pill-delta" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>Deleted</span>
              <span>Purged entity records</span>
            </div>
          </div>
        </div>

        {/* ── 3. Structured Filter & Controls Panel ──────────────────── */}
        <div className="sh-filter-card">
          <div className="sh-filter-header">
            <div className="sh-filter-title">
              <Filter size={15} style={{ color: '#6366f1' }} />
              <span>Filter Audit History</span>
              {hasActiveFilters && (
                <span className="clean-badge clean-badge-primary" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                  Active
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="clean-btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  title="Clear all filters"
                >
                  <X size={12} /> Clear Filters
                </button>
              )}

              <div className="clean-segmented">
                <button
                  className={`clean-segmented-btn ${viewMode === 'feed' ? 'active' : ''}`}
                  onClick={() => setViewMode('feed')}
                  title="Timeline Feed View"
                >
                  <Layers size={13} style={{ display: 'inline', marginRight: 4 }} /> Feed
                </button>
                <button
                  className={`clean-segmented-btn ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Structured Table View"
                >
                  <TableIcon size={13} style={{ display: 'inline', marginRight: 4 }} /> Table
                </button>
              </div>
            </div>
          </div>

          <div className="sh-filter-grid">
            {/* Search */}
            <div className="sh-filter-field" style={{ minWidth: 200 }}>
              <label className="sh-filter-label">Search Query</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search diff, actor, record..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="sh-search-input"
                />
              </div>
            </div>

            {/* Target Entity */}
            <div className="sh-filter-field">
              <label className="sh-filter-label">Module / Entity</label>
              <SearchableSelect
                value={entityTypeName}
                onChange={val => { setEntityTypeName(String(val)); setPage(1); }}
                options={[
                  { value: 'All', label: 'All Modules' },
                  { value: 'Customer', label: 'Customer' },
                  { value: 'Company', label: 'Company' },
                  { value: 'Lead', label: 'Lead' },
                  { value: 'Opportunity', label: 'Opportunity / Deal' },
                  { value: 'Contract', label: 'Contract' },
                  { value: 'Invoice', label: 'Invoice' },
                  { value: 'Payment', label: 'Payment' },
                  { value: 'Task', label: 'Task' }
                ]}
              />
            </div>

            {/* Action Type */}
            <div className="sh-filter-field">
              <label className="sh-filter-label">Action</label>
              <SearchableSelect
                value={auditActionTypeName}
                onChange={val => { setAuditActionTypeName(String(val)); setPage(1); }}
                options={[
                  { value: 'All', label: 'All Actions' },
                  { value: 'Create', label: 'Create / Insert' },
                  { value: 'Update', label: 'Update / Field Edit' },
                  { value: 'Delete', label: 'Delete / Purge' },
                  { value: 'StageChange', label: 'Stage Change' },
                  { value: 'Convert', label: 'Convert' },
                  { value: 'Assign', label: 'Assign' }
                ]}
              />
            </div>

            {/* Performed By */}
            <div className="sh-filter-field">
              <label className="sh-filter-label">User / Actor</label>
              <SearchableSelect
                value={changedById}
                onChange={val => { setChangedById(String(val)); setPage(1); }}
                options={[
                  { value: 'All', label: 'All Users' },
                  ...users.map(u => {
                    const userId = u.id ?? u.identityId;
                    if (userId == null) return null;
                    return {
                      value: userId.toString(),
                      label: `${u.name || 'User'} ${u.email ? `(${u.email})` : ''}`
                    };
                  }).filter((o): o is { value: string; label: string } => o !== null)
                ]}
              />
            </div>

            {/* From Date */}
            <div className="sh-filter-field">
              <label className="sh-filter-label">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={e => { setFromDate(e.target.value); setPage(1); }}
                className="sh-date-input"
              />
            </div>

            {/* To Date */}
            <div className="sh-filter-field">
              <label className="sh-filter-label">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={e => { setToDate(e.target.value); setPage(1); }}
                className="sh-date-input"
              />
            </div>
          </div>
        </div>

        {/* ── 4. Main History Log Records (Feed / Table) ──────────────── */}
        {isLoading ? (
          <div className="clean-card" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ color: '#6366f1', margin: '0 auto 0.75rem' }} />
            <p style={{ margin: 0, fontSize: '0.875rem' }}>Loading system history logs...</p>
          </div>
        ) : error ? (
          <div className="clean-card" style={{ padding: '2.5rem', textAlign: 'center', color: '#ef4444' }}>
            <AlertTriangle size={32} style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="clean-card" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <History size={42} style={{ opacity: 0.35, margin: '0 auto 0.75rem' }} />
            <h3 style={{ margin: '0 0 0.4rem', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
              No audit logs match your search criteria
            </h3>
            <p style={{ margin: 0, fontSize: '0.825rem' }}>Try clearing filters or adjusting your date range.</p>
          </div>
        ) : viewMode === 'feed' ? (
          /* ── Feed Timeline Mode ── */
          <div className="sh-feed-stream">
            {logs.map(log => {
              const badge = getActionBadge(log.auditActionTypeName);
              const IconComp = badge.icon;
              const isDelete = log.auditActionTypeName === 'Delete';
              const actorInitials = getUserInitials(log.changedByName);

              return (
                <div key={log.auditLogId} className="sh-feed-item">
                  <div className="sh-feed-left-bar" style={{ background: badge.color }} />

                  <div className="sh-feed-content">
                    {/* User Avatar */}
                    <div
                      className="sh-feed-avatar"
                      style={{
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: '#818cf8',
                        border: '1px solid rgba(99, 102, 241, 0.25)'
                      }}
                      title={log.changedByName}
                    >
                      {actorInitials}
                    </div>

                    {/* Body */}
                    <div className="sh-feed-body">
                      {/* Meta header */}
                      <div className="sh-feed-meta-row">
                        <span
                          className="clean-badge"
                          style={{
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            fontSize: '0.68rem',
                            fontWeight: 700
                          }}
                        >
                          <IconComp size={11} style={{ display: 'inline', marginRight: 3 }} />
                          {badge.label}
                        </span>

                        <span className="clean-badge clean-badge-primary" style={{ fontSize: '0.7rem' }}>
                          {log.entityTypeName} #{log.entityId}
                        </span>

                        <span className="sh-feed-actor">{log.changedByName}</span>
                        {log.changedByEmail && <span className="sh-feed-email">({log.changedByEmail})</span>}
                      </div>

                      {/* Diff Payload */}
                      {isDelete ? (
                        <div className="sh-feed-diff-box" style={{ borderColor: 'rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}>
                          <ShieldAlert size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
                          <span style={{ color: '#ef4444', fontWeight: 600 }}>
                            {log.oldValue || `Purged ${log.entityTypeName} #${log.entityId} record.`}
                          </span>
                        </div>
                      ) : log.fieldName ? (
                        <div className="sh-feed-diff-box">
                          <span style={{ fontWeight: 600, color: '#6366f1' }}>{log.fieldName}:</span>
                          <span style={{ textDecoration: 'line-through', opacity: 0.75, color: '#ef4444' }}>
                            {log.oldValue ?? '(empty)'}
                          </span>
                          <ArrowRight size={11} style={{ opacity: 0.5 }} />
                          <span style={{ fontWeight: 600, color: '#10b981' }}>
                            {log.newValue ?? '(empty)'}
                          </span>
                        </div>
                      ) : (
                        <div className="sh-feed-diff-box">
                          <span style={{ opacity: 0.9 }}>
                            {log.oldValue || log.newValue || `Executed ${log.auditActionTypeName} on ${log.entityTypeName} #${log.entityId}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Timestamp */}
                  <div className="sh-feed-actions">
                    <div className="sh-feed-time" title={formatDate(log.changedAt)}>
                      <Clock size={12} />
                      <span>{formatRelativeTime(log.changedAt)}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: 6 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLog(log);
                          setInspectTab('diff');
                        }}
                        className="crm-audit-inspect-btn"
                      >
                        <Eye size={12} />
                        <span>Inspect</span>
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSingleLog(e, log.auditLogId)}
                          title="Delete this audit record"
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: '6px',
                            padding: '4px 7px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Table Mode ── */
          <div className="clean-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="clean-table-container">
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Module & Record</th>
                    <th>Action</th>
                    <th>Field Diff / Summary</th>
                    <th>Actor / User</th>
                    <th>Timestamp</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const badge = getActionBadge(log.auditActionTypeName);
                    return (
                      <tr key={log.auditLogId}>
                        <td>
                          <strong>{log.entityTypeName}</strong>
                          <span style={{ opacity: 0.6, fontSize: '0.78rem', marginLeft: 4 }}>#{log.entityId}</span>
                        </td>
                        <td>
                          <span
                            className="clean-badge"
                            style={{
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              fontSize: '0.68rem',
                              fontWeight: 700
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ maxWidth: 360 }}>
                          {log.fieldName ? (
                            <span style={{ fontSize: '0.8rem' }}>
                              <strong style={{ color: '#6366f1' }}>{log.fieldName}:</strong>{' '}
                              <span style={{ textDecoration: 'line-through', color: '#ef4444', opacity: 0.75 }}>
                                {log.oldValue ?? 'ø'}
                              </span>
                              {' → '}
                              <span style={{ color: '#10b981', fontWeight: 600 }}>{log.newValue ?? 'ø'}</span>
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {log.oldValue || log.newValue || 'Action logged'}
                            </span>
                          )}
                        </td>
                        <td>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.825rem' }}>{log.changedByName}</span>
                            {log.changedByEmail && (
                              <span style={{ display: 'block', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                                {log.changedByEmail}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {formatDate(log.changedAt)}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLog(log);
                                setInspectTab('diff');
                              }}
                              className="crm-audit-inspect-btn"
                            >
                              <Eye size={12} />
                              <span>Inspect</span>
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteSingleLog(e, log.auditLogId)}
                                title="Delete this audit record"
                                style={{
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  borderRadius: '6px',
                                  padding: '4px 7px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 5. Responsive Pagination Toolbar ───────────────────────── */}
        {totalPages > 1 && (
          <div className="clean-card" style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount.toLocaleString()} total entries)
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="clean-btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.76rem' }}
              >
                <ChevronLeft size={13} /> Prev
              </button>

              <span style={{ fontSize: '0.78rem', fontWeight: 600, padding: '0 4px' }}>
                {page} / {totalPages}
              </span>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="clean-btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.76rem' }}
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* ── 6. State-of-the-Art Audit Inspection Detail Modal ─────────────────────────────── */}
        {selectedLog && (() => {
          const actionBadge = getActionBadge(selectedLog.auditActionTypeName);
          const entityUrl = (() => {
            const t = (selectedLog.entityTypeName || '').toLowerCase();
            const id = selectedLog.entityId;
            if (t.includes('customer')) return `/customers/${id}`;
            if (t.includes('lead')) return `/leads/${id}`;
            if (t.includes('company') || t.includes('organization')) return `/companies/${id}`;
            if (t.includes('opp') || t.includes('deal')) return `/opportunities/${id}`;
            if (t.includes('contract')) return `/contracts`;
            if (t.includes('invoice')) return `/invoices`;
            if (t.includes('payment')) return `/payments`;
            if (t.includes('task')) return `/tasks`;
            return null;
          })();

          return (
            <div className="crm-modal-overlay">
              <div className="crm-modal-container" style={{ maxWidth: '680px' }}>
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      background: actionBadge.bg,
                      color: actionBadge.color,
                      padding: '0.55rem',
                      borderRadius: '10px',
                      border: `1px solid ${actionBadge.border}`,
                      display: 'flex'
                    }}>
                      <History size={22} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          System History Inspection
                        </h3>
                        <span style={{
                          background: 'rgba(99, 102, 241, 0.12)',
                          color: '#818cf8',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                          fontWeight: 700
                        }}>
                          #{selectedLog.auditLogId}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Tamper-evident immutable transaction log entry
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 4-Box Metadata Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.2rem' }}>
                  {/* User Actor */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <User size={11} /> Actor / User
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem', fontSize: '0.88rem' }}>
                      {selectedLog.changedByName || 'System Actor'}
                    </div>
                    {selectedLog.changedByEmail && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedLog.changedByEmail}
                      </div>
                    )}
                  </div>

                  {/* Target Entity */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Layers size={11} /> Target Module
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem', fontSize: '0.88rem' }}>
                      {selectedLog.entityTypeName}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 600 }}>
                      Record #{selectedLog.entityId}
                    </div>
                  </div>

                  {/* Action Type */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Activity size={11} /> Mutation Action
                    </div>
                    <div style={{ marginTop: '0.35rem' }}>
                      <span
                        className="clean-badge"
                        style={{
                          background: actionBadge.bg,
                          color: actionBadge.color,
                          border: `1px solid ${actionBadge.border}`,
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}
                      >
                        {actionBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> Timestamp
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem', fontSize: '0.8rem' }}>
                      {formatDate(selectedLog.changedAt)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {formatRelativeTime(selectedLog.changedAt)}
                    </div>
                  </div>
                </div>

                {/* View Switcher: Visual Diff vs JSON Payload */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setInspectTab('diff')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      border: inspectTab === 'diff' ? '1px solid #6366f1' : '1px solid transparent',
                      background: inspectTab === 'diff' ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                      color: inspectTab === 'diff' ? '#818cf8' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: inspectTab === 'diff' ? 700 : 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Sparkles size={13} /> Visual Diff &amp; Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectTab('json')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      border: inspectTab === 'json' ? '1px solid #6366f1' : '1px solid transparent',
                      background: inspectTab === 'json' ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                      color: inspectTab === 'json' ? '#818cf8' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: inspectTab === 'json' ? 700 : 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Code2 size={13} /> Raw JSON Payload
                  </button>
                </div>

                {/* TAB 1: VISUAL DIFF VIEW */}
                {inspectTab === 'diff' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '50vh', overflowY: 'auto', paddingRight: '4px' }}>
                    {selectedLog.auditActionTypeName === 'Delete' ? (
                      <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '1rem' }}>
                        <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Trash2 size={15} /> Deleted Entity State Snapshot
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, wordBreak: 'break-word', fontFamily: 'monospace' }}>
                          {selectedLog.oldValue || 'Record was purged from system without attributes snapshot.'}
                        </div>
                      </div>
                    ) : selectedLog.fieldName ? (
                      <div className="crm-audit-diff-row">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Edit3 size={13} style={{ color: '#6366f1' }} />
                            <span>Field: <span style={{ color: '#818cf8' }}>{selectedLog.fieldName}</span></span>
                          </div>
                          <span className="clean-badge clean-badge-warning" style={{ fontSize: '0.68rem' }}>Field Mutation</span>
                        </div>

                        <div className="crm-audit-diff-values">
                          <div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 3, fontWeight: 700 }}>
                              Previous (Before)
                            </div>
                            <div className="crm-audit-val-box old">
                              {selectedLog.oldValue !== null && selectedLog.oldValue !== '' ? selectedLog.oldValue : <em style={{ opacity: 0.5 }}>ø (empty)</em>}
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                            <ArrowRight size={16} />
                          </div>

                          <div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 3, fontWeight: 700 }}>
                              New (After)
                            </div>
                            <div className="crm-audit-val-box new">
                              {selectedLog.newValue !== null && selectedLog.newValue !== '' ? selectedLog.newValue : <em style={{ opacity: 0.5 }}>ø (empty)</em>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : selectedLog.auditActionTypeName === 'Create' ? (
                      <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '1rem' }}>
                        <div style={{ color: '#10b981', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <PlusCircle size={15} /> Entity Record Created
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          New <strong>{selectedLog.entityTypeName}</strong> initialized with identifier <strong>#{selectedLog.entityId}</strong> by <strong>{selectedLog.changedByName}</strong>.
                        </div>
                        {selectedLog.newValue && (
                          <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                            {selectedLog.newValue}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.4rem' }}>
                          Transaction Details
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {selectedLog.oldValue || selectedLog.newValue || `Operation ${selectedLog.auditActionTypeName} completed on ${selectedLog.entityTypeName} #${selectedLog.entityId}`}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: RAW JSON PAYLOAD VIEW */}
                {inspectTab === 'json' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Audit Log Object
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
                          setCopiedJson(true);
                          showToast('Audit JSON payload copied to clipboard', 'success');
                          setTimeout(() => setCopiedJson(false), 2000);
                        }}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-color)',
                          color: copiedJson ? '#10b981' : 'var(--text-secondary)',
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {copiedJson ? <Check size={11} /> : <Copy size={11} />}
                        {copiedJson ? 'Copied' : 'Copy JSON'}
                      </button>
                    </div>
                    <div className="crm-audit-json-box">
                      {JSON.stringify(selectedLog, null, 2)}
                    </div>
                  </div>
                )}

                {/* Modal Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(String(selectedLog.auditLogId));
                      setCopiedId(true);
                      showToast(`Audit ID #${selectedLog.auditLogId} copied`, 'success');
                      setTimeout(() => setCopiedId(false), 2000);
                    }}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      color: copiedId ? '#10b981' : 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    {copiedId ? <Check size={12} /> : <Copy size={12} />}
                    {copiedId ? 'Copied ID' : 'Copy Audit ID'}
                  </button>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {entityUrl && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setSelectedLog(null);
                          navigate(entityUrl);
                        }}
                        style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <ExternalLink size={13} /> View {selectedLog.entityTypeName}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => setSelectedLog(null)}
                      style={{ fontSize: '0.8rem' }}
                    >
                      Close Inspection
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── 7. Purge Confirmation Modal ────────────────────────────── */}
        {showClearModal && (
          <div className="modal-overlay" onClick={() => setShowClearModal(false)}>
            <div className="clean-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: 0 }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 700 }}>
                  <ShieldAlert size={18} />
                  <span>Purge Audit History Logs</span>
                </div>
                <button onClick={() => setShowClearModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  As an Administrator, you can permanently purge audit history logs from the CRM database.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    <input type="radio" name="clearOpt" checked={clearOption === 'all'} onChange={() => setClearOption('all')} style={{ accentColor: '#ef4444', marginTop: 3 }} />
                    <div>
                      <strong>Clear All Historical Logs</strong>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Purges all system audit actions</div>
                    </div>
                  </label>

                  {(entityTypeName !== 'All' || auditActionTypeName !== 'All') && (
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      <input type="radio" name="clearOpt" checked={clearOption === 'filtered'} onChange={() => setClearOption('filtered')} style={{ accentColor: '#ef4444', marginTop: 3 }} />
                      <div>
                        <strong>Clear Current Filtered Logs</strong>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          Entity: <strong>{entityTypeName}</strong>, Action: <strong>{auditActionTypeName}</strong>
                        </div>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <Button variant="ghost" size="sm" onClick={() => setShowClearModal(false)}>Cancel</Button>
                <Button variant="danger" size="sm" onClick={handleClearHistory} disabled={isClearing}>
                  {isClearing ? 'Clearing...' : 'Confirm Purge'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
