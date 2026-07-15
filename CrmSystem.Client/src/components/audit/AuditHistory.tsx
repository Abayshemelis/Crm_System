import React, { useEffect, useState, useCallback } from 'react';
import {
  History, RefreshCw, Edit3, Trash2, UserCheck, PlusCircle,
  ArrowRight, Calendar, Clock, User, X
} from 'lucide-react';
import { api } from '../../lib/api';

interface AuditLogEntry {
  auditLogId: number;
  auditActionType: string | null;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  changedByName: string | null;
  changedAt: string;
}

interface AuditHistoryProps {
  entityType: 'customer' | 'lead' | 'company' | 'opportunity';
  entityId: number;
  refreshTrigger?: number;
}

const PLURAL_MAP: Record<string, string> = {
  customer: 'customers',
  lead: 'leads',
  company: 'companies',
  opportunity: 'opportunities',
};

const FIELD_LABELS: Record<string, string> = {
  Name: 'Company Name',
  FirstName: 'First Name',
  LastName: 'Last Name',
  Email: 'Email Address',
  Phone: 'Phone Number',
  Industry: 'Industry',
  CompanySize: 'Company Size',
  Website: 'Website',
  Address: 'Address',
  SourceId: 'Lead Source',
  AssignedRepId: 'Assigned Rep',
  LeadStatusId: 'Lead Status',
  JobTitle: 'Job Title',
  Notes: 'Notes',
  EstimatedValue: 'Estimated Value',
  Title: 'Title',
  Description: 'Description',
  CompanyName: 'Company',
};

interface ActionCfg {
  color: string;
  bg: string;
  icon: React.ReactNode;
  label: string;
}

const ACTION_CONFIG: Record<string, ActionCfg> = {
  Update:       { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  icon: <Edit3 size={13} />,      label: 'Updated' },
  Create:       { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  icon: <PlusCircle size={13} />, label: 'Created' },
  Delete:       { color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: <Trash2 size={13} />,     label: 'Deleted' },
  Assign:       { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: <UserCheck size={13} />,  label: 'Assigned' },
  StatusChange: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  icon: <Edit3 size={13} />,      label: 'Status Changed' },
  StageChange:  { color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  icon: <Edit3 size={13} />,      label: 'Stage Changed' },
  Convert:      { color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)',  icon: <ArrowRight size={13} />, label: 'Converted' },
};

function getActionCfg(action: string | null): ActionCfg {
  return ACTION_CONFIG[action ?? ''] ?? {
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.10)',
    icon: <History size={13} />,
    label: action ?? 'Action',
  };
}

function formatRelativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAbsoluteTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function groupByDate(logs: AuditLogEntry[]): { label: string; entries: AuditLogEntry[] }[] {
  const groups = new Map<string, AuditLogEntry[]>();
  const today     = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  for (const log of logs) {
    const d = new Date(log.changedAt);
    let label: string;
    if (d.toDateString() === today.toDateString())     label = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else label = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(log);
  }
  return Array.from(groups.entries()).map(([label, entries]) => ({ label, entries }));
}

function userInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
const SkeletonRow: React.FC = () => (
  <div style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem 0', alignItems: 'flex-start' }}>
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
    <div style={{ flex: 1 }}>
      <div style={{ height: 12, width: '45%', borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }} />
      <div style={{ height: 10, width: '70%', borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
    </div>
  </div>
);

// ── Value chip (old = red strikethrough, new = green) ────────────────────────
const ValueChip: React.FC<{ value: string; variant: 'old' | 'new' }> = ({ value, variant }) => {
  const isOld = variant === 'old';
  return (
    <span
      title={value}
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: '0.78rem',
        fontWeight: 500,
        maxWidth: 220,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        background: isOld ? 'rgba(248,113,113,0.10)' : 'rgba(52,211,153,0.10)',
        color:      isOld ? '#f87171'                  : '#34d399',
        border:     `1px solid ${isOld ? 'rgba(248,113,113,0.20)' : 'rgba(52,211,153,0.20)'}`,
        textDecoration: isOld ? 'line-through' : 'none',
        opacity: isOld ? 0.8 : 1,
      }}
    >
      {value || <em style={{ opacity: 0.5 }}>empty</em>}
    </span>
  );
};

// ── Single audit entry ────────────────────────────────────────────────────────
const AuditEntry: React.FC<{ log: AuditLogEntry }> = ({ log }) => {
  const cfg        = getActionCfg(log.auditActionType);
  const initials   = userInitials(log.changedByName);
  const fieldLabel = log.fieldName ? (FIELD_LABELS[log.fieldName] ?? log.fieldName) : null;
  const hasValues  = log.oldValue !== null || log.newValue !== null;

  return (
    <div style={{
      display: 'flex', gap: '0.75rem', padding: '0.85rem 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.7rem', fontWeight: 700, color: '#fff',
        boxShadow: '0 2px 8px rgba(99,102,241,0.28)',
      }}>
        {initials}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Row 1: badge + field + timestamp */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 9px', borderRadius: 20,
            background: cfg.bg, color: cfg.color,
            fontSize: '0.71rem', fontWeight: 600, letterSpacing: '0.02em',
            border: `1px solid ${cfg.color}30`,
          }}>
            {cfg.icon}{cfg.label}
          </span>

          {fieldLabel && (
            <span style={{
              padding: '2px 8px', borderRadius: 20,
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-secondary,#94a3b8)',
              fontSize: '0.71rem', fontWeight: 500,
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {fieldLabel}
            </span>
          )}

          <span style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3,
            color: 'var(--text-muted,#64748b)', fontSize: '0.71rem', whiteSpace: 'nowrap',
          }} title={formatAbsoluteTime(log.changedAt)}>
            <Clock size={11} />{formatRelativeTime(log.changedAt)}
          </span>
        </div>

        {/* Row 2: value diff */}
        {hasValues && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
            {log.oldValue !== null && <ValueChip value={log.oldValue} variant="old" />}
            {log.oldValue !== null && log.newValue !== null && (
              <ArrowRight size={13} style={{ color: 'var(--text-muted,#64748b)', flexShrink: 0 }} />
            )}
            {log.newValue !== null && <ValueChip value={log.newValue} variant="new" />}
          </div>
        )}

        {/* Row 3: who + when */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          color: 'var(--text-muted,#64748b)', fontSize: '0.71rem',
        }}>
          <User size={11} />
          <span>{log.changedByName ?? 'Unknown'}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{formatAbsoluteTime(log.changedAt)}</span>
        </div>
      </div>
    </div>
  );
};

// ── Main export ───────────────────────────────────────────────────────────────
export const AuditHistory: React.FC<AuditHistoryProps> = ({ entityType, entityId, refreshTrigger }) => {
  const [logs,       setLogs]       = useState<AuditLogEntry[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing,   setClearing]   = useState(false);

  const fetchLogs = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else        setLoading(true);
    setError(null);
    try {
      const plural   = PLURAL_MAP[entityType] ?? `${entityType}s`;
      const data     = await api.get<AuditLogEntry[]>(`/api/${plural}/${entityId}/audit`);
      setLogs(data ?? []);
    } catch {
      setError('Could not load audit history.');
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [entityType, entityId]);

  // Fetch on mount and when refreshTrigger changes
  useEffect(() => { fetchLogs(); }, [fetchLogs, refreshTrigger]);

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear the audit history? This action cannot be undone.')) return;
    setClearing(true);
    try {
      const plural = PLURAL_MAP[entityType] ?? `${entityType}s`;
      await api.delete(`/api/${plural}/${entityId}/audit`);
      setLogs([]);
    } catch {
      setError('Could not clear history.');
    } finally {
      setClearing(false);
    }
  };

  const grouped = groupByDate(logs);

  if (loading) {
    return (
      <div style={{ padding: '0.5rem 0' }}>
        {[0, 1, 2, 3].map(i => <SkeletonRow key={i} />)}
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>
        <History size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 0.75rem' }} />
        <p style={{ marginBottom: '0.75rem' }}>{error}</p>
        <button
          onClick={() => fetchLogs()}
          style={{
            padding: '6px 16px', borderRadius: 8,
            border: '1px solid rgba(248,113,113,0.3)',
            background: 'rgba(248,113,113,0.1)', color: '#f87171',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', margin: '0 auto 1rem',
          background: 'rgba(99,102,241,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <History size={24} style={{ color: '#6366f1', opacity: 0.6 }} />
        </div>
        <p style={{ color: 'var(--text-secondary,#94a3b8)', fontWeight: 500, marginBottom: '0.25rem' }}>
          No history yet
        </p>
        <p style={{ color: 'var(--text-muted,#64748b)', fontSize: '0.82rem' }}>
          Changes to this record will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: '0.5rem', marginBottom: '0.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary,#94a3b8)', fontSize: '0.82rem' }}>
          <History size={14} />{logs.length} event{logs.length !== 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleClearHistory}
            disabled={clearing}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 8,
              border: '1px solid rgba(248,113,113,0.2)',
              background: 'rgba(248,113,113,0.08)',
              color: '#f87171',
              cursor: clearing ? 'not-allowed' : 'pointer',
              fontSize: '0.78rem',
            }}
          >
            <X size={12} />
            Clear History
          </button>
          <button
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-secondary,#94a3b8)',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              fontSize: '0.78rem',
            }}
          >
            <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Grouped timeline */}
      {grouped.map(({ label, entries }) => (
        <div key={label}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0.8rem 0 0.2rem' }}>
            <Calendar size={11} style={{ color: 'var(--text-muted,#64748b)' }} />
            <span style={{
              color: 'var(--text-muted,#64748b)', fontSize: '0.7rem',
              fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
            }}>
              {label}
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
          </div>
          {entries.map(log => <AuditEntry key={log.auditLogId} log={log} />)}
        </div>
      ))}

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
};