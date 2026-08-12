import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../lib/toast';
import { api } from '../lib/api';
import { SearchableSelect } from '../components/ui/SearchableSelect';
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
  Info
} from 'lucide-react';

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
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (!window.confirm('Delete this audit log entry?')) return;
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
    const d = new Date(dateString);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'Delete':
        return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)', icon: Trash2 };
      case 'Create':
        return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)', icon: CheckCircle2 };
      case 'Update':
      case 'StageChange':
        return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)', icon: RefreshCw };
      case 'Assign':
        return { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.3)', icon: User };
      case 'Convert':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)', icon: Activity };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)', icon: Info };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', paddingBottom: '3rem' }}>
      {/* Header Banner - Clean Native CRM Theme */}
      <div className="dashboard-header animate-fade-in" style={{ marginBottom: 0 }}>
        <div className="dashboard-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              System History & Audit Log
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.2rem 0.65rem',
                borderRadius: '1rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.25)'
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} /> Live Monitoring
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Comprehensive audit trail tracking sales rep activities, pipeline deletions, reassignments, and updates.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={14} style={{ marginRight: 6 }} /> Dashboard
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchAuditLogs()}>
            <RefreshCw size={14} className={isLoading ? 'spinner' : ''} style={{ marginRight: 6 }} /> Refresh Trail
          </button>
        </div>
      </div>

      {/* Metrics Cards - Standard Clean CRM Panel Styling */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)'
          }}
        >
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              Total Logged Actions
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalCount}</div>
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)'
          }}
        >
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
            <Trash2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              Deletions (On Page)
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{deletionCount}</div>
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)'
          }}
        >
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7' }}>
            <RefreshCw size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              Updates & Moves
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{updateCount}</div>
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)'
          }}
        >
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              Created & Converted
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{createCount}</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          border: '1px solid var(--border-color)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem' }}>
          <Filter size={18} style={{ color: 'var(--primary-color)' }} />
          Filter Audit History
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Keyword Search */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Search Title / Details / Rep
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  height: '36px',
                  paddingLeft: '32px',
                  paddingRight: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>
          </div>

          {/* Entity Type Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Target Entity
            </label>
            <SearchableSelect
              value={entityTypeName}
              onChange={val => { setEntityTypeName(String(val)); setPage(1); }}
              options={[
                { value: 'All', label: 'All Entities' },
                { value: 'Opportunity', label: 'Pipeline Opportunity' },
                { value: 'Lead', label: 'Lead' },
                { value: 'Customer', label: 'Customer' },
                { value: 'Company', label: 'Company' },
                { value: 'Contract', label: 'Contract' }
              ]}
            />
          </div>

          {/* Action Type Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Action Type
            </label>
            <SearchableSelect
              value={auditActionTypeName}
              onChange={val => { setAuditActionTypeName(String(val)); setPage(1); }}
              options={[
                { value: 'All', label: 'All Action Types' },
                { value: 'Delete', label: 'Delete (Deletions Only)' },
                { value: 'Update', label: 'Update' },
                { value: 'Create', label: 'Create' },
                { value: 'Assign', label: 'Assign / Reassign' },
                { value: 'Convert', label: 'Convert' },
                { value: 'StageChange', label: 'Stage Change' }
              ]}
            />
          </div>

          {/* Changed By User Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Performed By Rep / User
            </label>
            <SearchableSelect
              value={changedById}
              onChange={val => { setChangedById(String(val)); setPage(1); }}
              options={[
                { value: 'All', label: 'All Reps & Users' },
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

          {/* Reset Filters button */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={handleResetFilters}
              className="btn-outline"
              style={{ height: '36px', width: '100%', fontSize: '0.85rem' }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Audit Trail Feed */}
      {isLoading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={36} className="spinner" style={{ color: 'var(--primary-color)', marginBottom: '1rem' }} />
          <p>Loading audit trail records...</p>
        </div>
      ) : error ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}>
          <AlertTriangle size={36} style={{ marginBottom: '1rem' }} />
          <p>{error}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '12px' }}>
          <History size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3>No audit logs match your search criteria</h3>
          <p style={{ fontSize: '0.9rem' }}>Try clearing filters or selecting a different date range.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {logs.map(log => {
            const badge = getActionBadge(log.auditActionTypeName);
            const IconComp = badge.icon;
            const isDelete = log.auditActionTypeName === 'Delete';

            return (
              <div
                key={log.auditLogId}
                className="glass-panel"
                style={{
                  padding: '1.15rem 1.5rem',
                  borderRadius: '12px',
                  border: `1px solid ${isDelete ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)'}`,
                  background: isDelete ? 'rgba(239, 68, 68, 0.04)' : 'var(--panel-bg)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1, minWidth: '280px' }}>
                  {/* Action Icon Badge */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}
                  >
                    <IconComp size={20} />
                  </div>

                  {/* Main Details */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '6px' }}>
                      {/* Action Badge */}
                      <span
                        style={{
                          background: badge.bg,
                          color: badge.color,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}
                      >
                        {log.auditActionTypeName}
                      </span>

                      {/* Target Entity Badge */}
                      <span
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: 'var(--text-primary)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      >
                        {log.entityTypeName} #{log.entityId}
                      </span>

                      {/* Rep / User Name */}
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        by <strong style={{ color: 'var(--text-primary)' }}>{log.changedByName}</strong>
                      </span>
                    </div>

                    {/* Change / Snapshot Content */}
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {isDelete ? (
                        <div style={{ color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ShieldAlert size={16} />
                          {log.oldValue || `Deleted ${log.entityTypeName} #${log.entityId}`}
                        </div>
                      ) : log.fieldName ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{log.fieldName}:</span>
                          <span style={{ textDecoration: 'line-through', opacity: 0.7, color: '#ef4444' }}>
                            {log.oldValue ?? '(empty)'}
                          </span>
                          <ArrowRight size={14} style={{ opacity: 0.5 }} />
                          <span style={{ fontWeight: 600, color: '#10b981' }}>{log.newValue ?? '(empty)'}</span>
                        </div>
                      ) : (
                        <div style={{ opacity: 0.9 }}>
                          {log.oldValue || log.newValue || `Performed ${log.auditActionTypeName} action on ${log.entityTypeName}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timestamp & Action Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    {formatDate(log.changedAt)}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="btn-outline"
                      style={{ padding: '3px 10px', fontSize: '0.78rem', borderRadius: '6px' }}
                    >
                      Inspect Log
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
                          padding: '4px 8px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div
          className="glass-panel"
          style={{
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '1px solid var(--border-color)'
          }}
        >
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing page <strong style={{ color: 'var(--text-primary)' }}>{page}</strong> of{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{totalPages}</strong> ({totalCount} total entries)
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              Next <ChevronRight size={16} />
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
            className="modal-content glass-panel"
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '650px', padding: 0, overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-secondary)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: getActionBadge(selectedLog.auditActionTypeName).bg,
                    color: getActionBadge(selectedLog.auditActionTypeName).color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Activity size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Audit Inspection</h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Log ID #{selectedLog.auditLogId}</div>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Rep / User</div>
                  <div style={{ fontWeight: 600 }}>{selectedLog.changedByName}</div>
                  {selectedLog.changedByEmail && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedLog.changedByEmail}</div>}
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Action Date</div>
                  <div style={{ fontWeight: 600 }}>{formatDate(selectedLog.changedAt)}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Entity Type</div>
                  <div style={{ fontWeight: 600 }}>{selectedLog.entityTypeName} (ID #{selectedLog.entityId})</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Action Performed</div>
                  <div style={{ fontWeight: 600, color: getActionBadge(selectedLog.auditActionTypeName).color }}>
                    {selectedLog.auditActionTypeName}
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  Audit Payload / Field Information
                </div>

                {selectedLog.auditActionTypeName === 'Delete' ? (
                  <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.85rem', borderRadius: '6px', fontSize: '0.9rem' }}>
                    <strong>Deleted Record Details:</strong>
                    <br />
                    {selectedLog.oldValue || 'No detailed snapshot captured.'}
                  </div>
                ) : selectedLog.fieldName ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div><strong>Field Modified:</strong> {selectedLog.fieldName}</div>
                    <div><strong style={{ color: '#ef4444' }}>Old Value:</strong> {selectedLog.oldValue ?? '(empty)'}</div>
                    <div><strong style={{ color: '#10b981' }}>New Value:</strong> {selectedLog.newValue ?? '(empty)'}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
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
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', padding: 0 }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 700 }}>
                <ShieldAlert size={20} />
                <span>Clear System Audit History</span>
              </div>
              <button onClick={() => setShowClearModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                As an Administrator, you can purge audit history logs from the CRM database.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  <input type="radio" name="clearOpt" checked={clearOption === 'all'} onChange={() => setClearOption('all')} style={{ accentColor: '#ef4444', marginTop: '3px' }} />
                  <div>
                    <strong>Clear All Audit History</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Purges all logged system actions across all entities</div>
                  </div>
                </label>

                {(entityTypeName !== 'All' || auditActionTypeName !== 'All') && (
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    <input type="radio" name="clearOpt" checked={clearOption === 'filtered'} onChange={() => setClearOption('filtered')} style={{ accentColor: '#ef4444', marginTop: '3px' }} />
                    <div>
                      <strong>Clear Current Filtered Logs Only</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Clears logs matching Entity: <strong>{entityTypeName}</strong>, Action: <strong>{auditActionTypeName}</strong>
                      </div>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="ghost" size="sm" onClick={() => setShowClearModal(false)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleClearHistory} disabled={isClearing}>
                {isClearing ? 'Clearing...' : 'Confirm Clear History'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
