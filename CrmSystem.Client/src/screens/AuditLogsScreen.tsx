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
  FileText,
  FileSpreadsheet,
  BarChart3,
  Table as TableIcon,
  ExternalLink,
  Sparkles,
  Download,
  Eye
} from 'lucide-react';
import './reports/cleanReports.css';

interface GlobalAuditLogItem {
  auditLogId: number;
  entityTypeId: number;
  entityTypeName: string;
  entityId: number;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  auditActionTypeId: number;
  auditActionTypeName: string;
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

  // Selected Log for details modal
  const [selectedLog, setSelectedLog] = useState<GlobalAuditLogItem | null>(null);

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
    if (!await confirmAction('Delete this audit log entry?')) return;
    try {
      await api.delete(`/api/audit-logs/${logId}`);
      showToast('Audit record deleted.', 'success');
      fetchAuditLogs();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete audit record.', 'error');
    }
  };

  // Metrics summary
  const deletionCount = logs.filter(l => l.auditActionTypeName === 'Delete').length;
  const updateCount = logs.filter(l => l.auditActionTypeName === 'Update' || l.auditActionTypeName === 'StageChange').length;
  const createCount = logs.filter(l => l.auditActionTypeName === 'Create' || l.auditActionTypeName === 'Convert').length;

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

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'Delete':
        return { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.25)', icon: Trash2 };
      case 'Create':
        return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.25)', icon: CheckCircle2 };
      case 'Update':
      case 'StageChange':
        return { bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.25)', icon: RefreshCw };
      case 'Assign':
        return { bg: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.25)', icon: User };
      case 'Convert':
        return { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.25)', icon: Activity };
      default:
        return { bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.25)', icon: Info };
    }
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
      <div className="clean-report-container">
        {/* Header */}
        <div className="clean-report-header">
          <div className="clean-header-top">
            <div className="clean-breadcrumb-group">
              <button onClick={() => navigate('/dashboard')} className="clean-back-btn">
                <ArrowLeft size={15} /> Dashboard
              </button>
              <span className="clean-badge clean-badge-primary">
                System History & Security
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                title="Download CSV Trail"
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
                style={{ padding: '6px 10px' }}
                title="Refresh Audit Trail"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="clean-title-group">
            <h1 className="clean-report-title">
              <History size={28} style={{ color: '#6366f1' }} />
              System History & Audit Log
            </h1>
            <p className="clean-report-desc">
              Comprehensive immutable audit trail recording sales activities, entity creations, field-level mutations, and deletions.
            </p>
          </div>
        </div>

        {/* 4 Clean Metric Cards */}
        <div className="clean-stat-grid">
          {/* Total Actions */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Total Logged Actions</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                <Activity size={17} />
              </div>
            </div>
            <div className="clean-stat-value">{totalCount}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-blue">All Time</span>
              <span>Total database audit entries</span>
            </div>
          </div>

          {/* Created & Converted */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Creations & Conversions</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <CheckCircle2 size={17} />
              </div>
            </div>
            <div className="clean-stat-value" style={{ color: '#10b981' }}>{createCount}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-green">Inserts</span>
              <span>New records added</span>
            </div>
          </div>

          {/* Updates */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Updates & Field Edits</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <RefreshCw size={17} />
              </div>
            </div>
            <div className="clean-stat-value" style={{ color: '#3b82f6' }}>{updateCount}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta clean-pill-blue">Mutations</span>
              <span>State & field updates</span>
            </div>
          </div>

          {/* Deletions */}
          <div className="clean-stat-card">
            <div className="clean-stat-top">
              <span className="clean-stat-label">Deletions (On Page)</span>
              <div className="clean-stat-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                <Trash2 size={17} />
              </div>
            </div>
            <div className="clean-stat-value" style={{ color: '#ef4444' }}>{deletionCount}</div>
            <div className="clean-stat-footer">
              <span className="clean-pill-delta" style={{ background: 'rgba(239,68,68,0.14)', color: '#ef4444' }}>Purged</span>
              <span>Deleted entity records</span>
            </div>
          </div>
        </div>

        {/* Filter Card */}
        <div className="clean-card">
          <div className="clean-card-header" style={{ paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} style={{ color: '#6366f1' }} />
              <h3 className="clean-card-title">Filter Audit Trail</h3>
            </div>

            <div className="clean-segmented">
              <button
                className={`clean-segmented-btn ${viewMode === 'feed' ? 'active' : ''}`}
                onClick={() => setViewMode('feed')}
              >
                <Layers size={13} style={{ display: 'inline', marginRight: 4 }} /> Feed View
              </button>
              <button
                className={`clean-segmented-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                <TableIcon size={13} style={{ display: 'inline', marginRight: 4 }} /> Table View
              </button>
            </div>
          </div>

          <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'flex-end' }}>
            {/* Search */}
            <div style={{ minWidth: 180 }}>
              <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
                Search Title / Change / Rep
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 30px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-tertiary, rgba(0,0,0,0.15))',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Target Entity */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
                Target Entity
              </label>
              <SearchableSelect
                value={entityTypeName}
                onChange={val => { setEntityTypeName(String(val)); setPage(1); }}
                options={[
                  { value: 'All', label: 'All Entities' },
                  { value: 'Opportunity', label: 'Opportunity' },
                  { value: 'Lead', label: 'Lead' },
                  { value: 'Customer', label: 'Customer' },
                  { value: 'Company', label: 'Company' },
                  { value: 'Contract', label: 'Contract' },
                  { value: 'Invoice', label: 'Invoice' },
                  { value: 'Task', label: 'Task' }
                ]}
              />
            </div>

            {/* Action Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
                Action Type
              </label>
              <SearchableSelect
                value={auditActionTypeName}
                onChange={val => { setAuditActionTypeName(String(val)); setPage(1); }}
                options={[
                  { value: 'All', label: 'All Action Types' },
                  { value: 'Delete', label: 'Delete (Deletions)' },
                  { value: 'Update', label: 'Update / Field Edits' },
                  { value: 'Create', label: 'Create / Insert' },
                  { value: 'Assign', label: 'Assign / Reassign' },
                  { value: 'Convert', label: 'Convert' },
                  { value: 'StageChange', label: 'Stage Change' }
                ]}
              />
            </div>

            {/* Performed By */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
                Performed By User
              </label>
              <SearchableSelect
                value={changedById}
                onChange={val => { setChangedById(String(val)); setPage(1); }}
                options={[
                  { value: 'All', label: 'All Users & Reps' },
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

            {/* Reset Button */}
            <div>
              <button
                onClick={handleResetFilters}
                className="clean-btn-secondary"
                style={{ width: '100%', padding: '7px 10px', fontSize: '0.8rem', justifyContent: 'center' }}
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Content Stream */}
        {isLoading ? (
          <div className="clean-card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={32} className="animate-spin" style={{ color: '#6366f1', margin: '0 auto 1rem' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Loading system audit trail records...</p>
          </div>
        ) : error ? (
          <div className="clean-card" style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>
            <AlertTriangle size={36} style={{ margin: '0 auto 1rem' }} />
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="clean-card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <History size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>No audit logs match your search criteria</h3>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Try clearing filters or changing your search terms.</p>
          </div>
        ) : viewMode === 'feed' ? (
          /* Feed View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {logs.map(log => {
              const badge = getActionBadge(log.auditActionTypeName);
              const IconComp = badge.icon;
              const isDelete = log.auditActionTypeName === 'Delete';

              return (
                <div
                  key={log.auditLogId}
                  className="clean-card"
                  style={{
                    padding: '1rem 1.25rem',
                    borderLeft: `4px solid ${badge.color}`,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: 260 }}>
                      {/* Icon */}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 2
                        }}
                      >
                        <IconComp size={17} />
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: 4 }}>
                          <span
                            className="clean-badge"
                            style={{
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }}
                          >
                            {log.auditActionTypeName}
                          </span>

                          <span className="clean-badge clean-badge-primary" style={{ fontSize: '0.72rem' }}>
                            {log.entityTypeName} #{log.entityId}
                          </span>

                          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            by <strong style={{ color: 'var(--text-primary)' }}>{log.changedByName}</strong>
                            {log.changedByEmail ? ` (${log.changedByEmail})` : ''}
                          </span>
                        </div>

                        {/* Details diff */}
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: 4 }}>
                          {isDelete ? (
                            <span style={{ color: '#ef4444', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <ShieldAlert size={14} />
                              {log.oldValue || `Deleted ${log.entityTypeName} record #${log.entityId}`}
                            </span>
                          ) : log.fieldName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, color: '#6366f1' }}>{log.fieldName}:</span>
                              <span style={{ textDecoration: 'line-through', opacity: 0.7, color: '#ef4444' }}>
                                {log.oldValue ?? '(empty)'}
                              </span>
                              <ArrowRight size={12} style={{ opacity: 0.5 }} />
                              <span style={{ fontWeight: 600, color: '#10b981' }}>{log.newValue ?? '(empty)'}</span>
                            </div>
                          ) : (
                            <span style={{ opacity: 0.9 }}>
                              {log.oldValue || log.newValue || `Executed ${log.auditActionTypeName} on ${log.entityTypeName}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Meta & actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={12} />
                        {formatDate(log.changedAt)}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="clean-back-btn"
                          style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                        >
                          <Eye size={12} /> Inspect
                        </button>

                        {isAdmin && (
                          <button
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="clean-card">
            <div className="clean-table-container">
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Entity</th>
                    <th>Action</th>
                    <th>Field Diff / Details</th>
                    <th>User</th>
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
                          <strong>{log.entityTypeName} #{log.entityId}</strong>
                        </td>
                        <td>
                          <span
                            className="clean-badge"
                            style={{
                              background: badge.bg,
                              color: badge.color,
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }}
                          >
                            {log.auditActionTypeName}
                          </span>
                        </td>
                        <td style={{ maxWidth: 320 }}>
                          {log.fieldName ? (
                            <span style={{ fontSize: '0.8rem' }}>
                              <strong>{log.fieldName}:</strong>{' '}
                              <span style={{ textDecoration: 'line-through', color: '#ef4444' }}>{log.oldValue ?? 'ø'}</span>
                              {' → '}
                              <span style={{ color: '#10b981', fontWeight: 600 }}>{log.newValue ?? 'ø'}</span>
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {log.oldValue || log.newValue || 'Action performed'}
                            </span>
                          )}
                        </td>
                        <td>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{log.changedByName}</span>
                            {log.changedByEmail && (
                              <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                {log.changedByEmail}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {formatDate(log.changedAt)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="clean-back-btn"
                            style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="clean-card" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total entries)
            </span>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="clean-btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="clean-btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Detailed Modal */}
        {selectedLog && (
          <div
            className="modal-overlay"
            onClick={() => setSelectedLog(null)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          >
            <div
              className="clean-card"
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: '580px', padding: 0, overflow: 'hidden' }}
            >
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--bg-tertiary, rgba(0,0,0,0.15))'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <History size={18} style={{ color: '#6366f1' }} />
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>
                    Audit Log Inspection #{selectedLog.auditLogId}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedLog(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    background: 'var(--bg-tertiary, rgba(0,0,0,0.15))',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>User / Rep</span>
                    <strong style={{ fontSize: '0.85rem' }}>{selectedLog.changedByName}</strong>
                    {selectedLog.changedByEmail && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedLog.changedByEmail}</div>}
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Timestamp</span>
                    <strong style={{ fontSize: '0.85rem' }}>{formatDate(selectedLog.changedAt)}</strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Target Entity</span>
                    <strong style={{ fontSize: '0.85rem' }}>{selectedLog.entityTypeName} (ID #{selectedLog.entityId})</strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Action</span>
                    <strong style={{ fontSize: '0.85rem', color: getActionBadge(selectedLog.auditActionTypeName).color }}>
                      {selectedLog.auditActionTypeName}
                    </strong>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ display: 'block', fontSize: '0.82rem', marginBottom: 6 }}>
                    Payload & Mutation Diff:
                  </strong>

                  {selectedLog.auditActionTypeName === 'Delete' ? (
                    <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.82rem' }}>
                      <strong>Deleted Record Snapshot:</strong>
                      <br />
                      {selectedLog.oldValue || 'No detailed snapshot captured.'}
                    </div>
                  ) : selectedLog.fieldName ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
                      <div><strong>Field:</strong> {selectedLog.fieldName}</div>
                      <div><strong style={{ color: '#ef4444' }}>Old Value:</strong> {selectedLog.oldValue ?? '(empty)'}</div>
                      <div><strong style={{ color: '#10b981' }}>New Value:</strong> {selectedLog.newValue ?? '(empty)'}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {selectedLog.oldValue || selectedLog.newValue || 'No field value diff available.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clear History Confirmation Modal */}
        {showClearModal && (
          <div className="modal-overlay" onClick={() => setShowClearModal(false)}>
            <div className="clean-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: 0 }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 700 }}>
                  <ShieldAlert size={18} />
                  <span>Purge Audit History Logs</span>
                </div>
                <button onClick={() => setShowClearModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
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
