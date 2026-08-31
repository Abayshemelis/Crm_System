import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { Loader2, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Eye, X, History, Clock, User, ArrowRight, Activity, Calendar, LayoutList, List, Edit3 } from 'lucide-react';

interface AuditLogEntry {
    auditLogId: number;
    actionType: string | null;
    auditActionType?: string | null;
    fieldName: string | null;
    oldValue: string | null;
    newValue: string | null;
    changedByName: string | null;
    changedBy: string | null;
    changedAt: string;
}

interface GroupedAuditLogEntry {
    groupId: string;
    actionType: string;
    changedByName: string | null;
    changedBy: string | null;
    changedAt: string;
    fields: { fieldName: string | null; oldValue: string | null; newValue: string | null }[];
    rawLogs: AuditLogEntry[];
}

interface AuditHistoryTableProps {
    entityType: 'customers' | 'companies' | 'opportunities' | 'leads' | 'customer' | 'company' | 'lead' | 'opportunity';
    entityId: number;
    entityName?: string;
    refreshTrigger?: number;
}

const PLURAL_MAP: Record<string, string> = {
    customer: 'customers', lead: 'leads', company: 'companies', opportunity: 'opportunities',
    customers: 'customers', leads: 'leads', companies: 'companies', opportunities: 'opportunities'
};

const getActionBadgeColor = (action: string | null) => {
    switch (action) {
        case 'Create': return { bg: 'rgba(52,211,153,0.15)', color: '#10b981' };
        case 'Update': return { bg: 'rgba(96,165,250,0.15)', color: '#3b82f6' };
        case 'Delete': return { bg: 'rgba(248,113,113,0.15)', color: '#ef4444' };
        case 'StatusChange': return { bg: 'rgba(251,191,36,0.15)', color: '#f59e0b' };
        case 'Assign': return { bg: 'rgba(167,139,250,0.15)', color: '#8b5cf6' };
        case 'Login':
        case 'Logout': return { bg: 'rgba(14,165,233,0.15)', color: '#0ea5e9' };
        case 'Restore': return { bg: 'rgba(168,85,247,0.15)', color: '#a855f7' };
        default: return { bg: 'rgba(148,163,184,0.15)', color: 'var(--text-secondary)' };
    }
};

const ValueChip: React.FC<{ value: string | null; variant: 'old' | 'new' | 'added' | 'removed' }> = ({ value, variant }) => {
    if (!value && value !== '') return <em style={{ opacity: 0.5, fontSize: '0.8rem' }}>empty</em>;
    const displayVal = value === '' ? <em style={{ opacity: 0.5, fontSize: '0.8rem' }}>empty</em> : value;
    
    let bg = 'rgba(148,163,184,0.10)';
    let color = 'var(--text-secondary)';
    let border = 'rgba(148,163,184,0.20)';
    let lineThrough = false;

    if (variant === 'old' || variant === 'removed') {
        bg = 'rgba(248,113,113,0.10)';
        color = '#f87171';
        border = 'rgba(248,113,113,0.20)';
        if (variant === 'old') lineThrough = true;
    } else if (variant === 'new' || variant === 'added') {
        bg = 'rgba(52,211,153,0.10)';
        color = '#34d399';
        border = 'rgba(52,211,153,0.20)';
    }

    return (
        <div style={{
            display: 'inline-flex',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '0.82rem',
            fontWeight: 500,
            maxWidth: '100%',
            wordBreak: 'break-word',
            whiteSpace: 'normal',
            background: bg,
            color: color,
            border: `1px solid ${border}`,
            textDecoration: lineThrough ? 'line-through' : 'none',
            opacity: variant === 'old' ? 0.85 : 1
        }} title={typeof value === 'string' ? value : ''}>
            {displayVal}
        </div>
    );
};

export const AuditHistoryTable: React.FC<AuditHistoryTableProps> = ({ entityType, entityId, entityName, refreshTrigger = 0 }) => {
    const [rawLogs, setRawLogs] = useState<AuditLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
    
    // Pagination
    const [page, setPage] = useState(1);
    const pageSize = 10;

    // Filtering
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAction, setFilterAction] = useState('All');
    
    // Sorting
    const [sortField, setSortField] = useState<'Date' | 'User' | 'Action'>('Date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Details Modal
    const [selectedGroup, setSelectedGroup] = useState<GroupedAuditLogEntry | null>(null);

    // Fetch Data
    useEffect(() => {
        const fetchAuditLogs = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const plural = PLURAL_MAP[entityType] || entityType;
                const data = await api.get<AuditLogEntry[]>(`/api/${plural}/${entityId}/audit`);
                setRawLogs(data || []);
            } catch (error) {
                console.error("Failed to fetch audit logs", error);
                setError("Could not load audit history.");
                setRawLogs([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAuditLogs();
    }, [entityType, entityId, refreshTrigger]);

    const getActionType = (log: AuditLogEntry) => log.actionType || log.auditActionType || 'Action';
    const getDisplayUser = (log: { changedByName: string | null; changedBy: string | null }) => log.changedByName || log.changedBy || 'Unknown';
    const getDisplayEntity = () => {
        const map: Record<string, string> = {
            customers: 'Customer', customer: 'Customer',
            companies: 'Company', company: 'Company',
            leads: 'Lead', lead: 'Lead',
            opportunities: 'Opportunity', opportunity: 'Opportunity'
        };
        return map[entityType] || 'Record';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Grouping Logic
    const groupedLogs = useMemo(() => {
        const sorted = [...rawLogs].sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
        const groups: GroupedAuditLogEntry[] = [];
        
        for (const log of sorted) {
            const actionType = getActionType(log);
            const changedBy = getDisplayUser(log);
            const timestamp = new Date(log.changedAt).getTime();
            
            const existingGroup = groups.find(g => {
                const gTime = new Date(g.changedAt).getTime();
                const timeDiff = Math.abs(gTime - timestamp);
                return timeDiff <= 2000 && g.actionType === actionType && getDisplayUser(g) === changedBy;
            });
            
            if (existingGroup) {
                existingGroup.rawLogs.push(log);
                if (log.fieldName || log.oldValue !== null || log.newValue !== null) {
                    existingGroup.fields.push({ fieldName: log.fieldName, oldValue: log.oldValue, newValue: log.newValue });
                }
            } else {
                groups.push({
                    groupId: log.auditLogId.toString(),
                    actionType,
                    changedByName: log.changedByName,
                    changedBy: log.changedBy,
                    changedAt: log.changedAt,
                    fields: (log.fieldName || log.oldValue !== null || log.newValue !== null) ? [{ fieldName: log.fieldName, oldValue: log.oldValue, newValue: log.newValue }] : [],
                    rawLogs: [log]
                });
            }
        }
        return groups;
    }, [rawLogs]);

    // Filter & Sort Logic
    const filteredAndSortedGroups = useMemo(() => {
        let result = [...groupedLogs];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(group => {
                if (getDisplayUser(group).toLowerCase().includes(query)) return true;
                if (group.actionType.toLowerCase().includes(query)) return true;
                
                return group.fields.some(f => 
                    (f.fieldName && f.fieldName.toLowerCase().includes(query)) ||
                    (f.oldValue && f.oldValue.toLowerCase().includes(query)) ||
                    (f.newValue && f.newValue.toLowerCase().includes(query))
                );
            });
        }

        if (filterAction !== 'All') {
            result = result.filter(group => group.actionType === filterAction);
        }

        result.sort((a, b) => {
            let valA: any;
            let valB: any;

            if (sortField === 'Date') {
                valA = new Date(a.changedAt).getTime();
                valB = new Date(b.changedAt).getTime();
            } else if (sortField === 'User') {
                valA = getDisplayUser(a).toLowerCase();
                valB = getDisplayUser(b).toLowerCase();
            } else if (sortField === 'Action') {
                valA = a.actionType.toLowerCase();
                valB = b.actionType.toLowerCase();
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [groupedLogs, searchQuery, filterAction, sortField, sortOrder]);

    const handleSort = (field: 'Date' | 'User' | 'Action') => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
        setPage(1);
    };

    const SortIcon = ({ field }: { field: 'Date' | 'User' | 'Action' }) => {
        if (sortField !== field) return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
        return sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
    };

    const totalPages = Math.ceil(filteredAndSortedGroups.length / pageSize) || 1;
    useEffect(() => {
        if (page > totalPages) setPage(Math.max(1, totalPages));
    }, [totalPages, page]);

    const paginatedGroups = filteredAndSortedGroups.slice((page - 1) * pageSize, page * pageSize);

    const uniqueActions = useMemo(() => {
        const actions = new Set(groupedLogs.map(g => g.actionType));
        return Array.from(actions);
    }, [groupedLogs]);

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', backgroundColor: 'var(--panel-bg)', borderRadius: '12px' }}>
                <Loader2 size={32} className="spinner" style={{ color: 'var(--primary-color)' }} />
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#f87171', backgroundColor: 'var(--panel-bg)', borderRadius: '12px' }}>
                <History size={40} style={{ opacity: 0.3, display: 'block', margin: '0 auto 1rem' }} />
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', overflowX: 'hidden' }}>
            {/* Toolbar: Search, Filters, View Toggle */}
            <div style={{ 
                display: 'flex', gap: '0.75rem', flexWrap: 'wrap', 
                alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: 'var(--panel-bg)',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
            }}>
                <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '280px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Styled Search Input */}
                    <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '380px', display: 'flex', alignItems: 'center' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <input
                            type="text"
                            placeholder="Search fields, users, or values..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                            style={{
                                width: '100%',
                                height: '38px',
                                paddingLeft: '38px',
                                paddingRight: '12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '0.875rem',
                                outline: 'none',
                                transition: 'border-color 0.2s, box-shadow 0.2s'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary-color)';
                                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(96,165,250,0.2)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    {/* Action Filter */}
                    <div style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem', 
                        background: 'var(--bg-secondary)', 
                        height: '38px',
                        padding: '0 0.75rem', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border-color)' 
                    }}>
                        <Filter size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <select 
                            value={filterAction} 
                            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                            style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                color: 'var(--text-primary)', 
                                outline: 'none', 
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="All">All Actions</option>
                            {uniqueActions.map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredAndSortedGroups.length}</strong> events
                    </div>
                    <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-color)', height: '38px', alignItems: 'center' }}>
                        <button 
                            onClick={() => setViewMode('table')}
                            style={{ 
                                height: '32px',
                                padding: '0 10px', borderRadius: '6px', border: 'none', 
                                background: viewMode === 'table' ? 'var(--primary-color)' : 'transparent',
                                color: viewMode === 'table' ? '#fff' : 'var(--text-muted)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem',
                                fontWeight: viewMode === 'table' ? 600 : 400
                            }}
                        >
                            <LayoutList size={14} /> Table
                        </button>
                        <button 
                            onClick={() => setViewMode('timeline')}
                            style={{ 
                                height: '32px',
                                padding: '0 10px', borderRadius: '6px', border: 'none', 
                                background: viewMode === 'timeline' ? 'var(--primary-color)' : 'transparent',
                                color: viewMode === 'timeline' ? '#fff' : 'var(--text-muted)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem',
                                fontWeight: viewMode === 'timeline' ? 600 : 400
                            }}
                        >
                            <List size={14} /> Timeline
                        </button>
                    </div>
                </div>
            </div>

            {/* View Mode Rendering */}
            {viewMode === 'table' ? (
                <div style={{ 
                    backgroundColor: 'var(--panel-bg)', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border-color)',
                    width: '100%',
                    overflowX: 'auto'
                }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                                <th onClick={() => handleSort('Date')} style={{ cursor: 'pointer', userSelect: 'none', width: '145px', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Date & Time <SortIcon field="Date" /></div>
                                </th>
                                <th onClick={() => handleSort('User')} style={{ cursor: 'pointer', userSelect: 'none', width: '90px', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>User <SortIcon field="User" /></div>
                                </th>
                                <th onClick={() => handleSort('Action')} style={{ cursor: 'pointer', userSelect: 'none', width: '85px', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Action <SortIcon field="Action" /></div>
                                </th>
                                <th style={{ whiteSpace: 'nowrap' }}>Changes (Old ➔ New)</th>
                                <th style={{ width: '75px', textAlign: 'center', whiteSpace: 'nowrap' }}>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedGroups.length > 0 ? (
                                paginatedGroups.map(group => {
                                    const badge = getActionBadgeColor(group.actionType);

                                    return (
                                        <tr key={group.groupId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'top' }}>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingTop: '0.9rem', whiteSpace: 'nowrap' }}>
                                                {formatDate(group.changedAt)}
                                            </td>
                                            <td style={{ fontWeight: 500, fontSize: '0.9rem', paddingTop: '0.9rem' }}>
                                                {getDisplayUser(group)}
                                            </td>
                                            <td style={{ paddingTop: '0.85rem' }}>
                                                <span style={{
                                                    backgroundColor: badge.bg, color: badge.color,
                                                    padding: '3px 8px', borderRadius: '6px',
                                                    fontSize: '0.75rem', fontWeight: 600, display: 'inline-block'
                                                }}>
                                                    {group.actionType}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>
                                                {group.fields.length > 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                        {group.fields.map((f, idx) => (
                                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem', minWidth: '85px' }}>
                                                                    {f.fieldName || 'Field'}:
                                                                </span>
                                                                {group.actionType === 'Update' || group.actionType === 'StatusChange' || group.actionType === 'Assign' ? (
                                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', maxWidth: '100%' }}>
                                                                        <ValueChip value={f.oldValue} variant="old" />
                                                                        <ArrowRight size={12} style={{ opacity: 0.5, color: 'var(--text-secondary)', flexShrink: 0 }} />
                                                                        <ValueChip value={f.newValue} variant="new" />
                                                                    </div>
                                                                ) : group.actionType === 'Create' ? (
                                                                    <ValueChip value={f.newValue} variant="added" />
                                                                ) : (
                                                                    <ValueChip value={f.oldValue} variant="removed" />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div style={{ opacity: 0.7, fontStyle: 'italic', fontSize: '0.85rem', paddingTop: '0.2rem' }}>
                                                        {group.actionType === 'Create' ? `Created new ${getDisplayEntity()}` : group.actionType === 'Delete' ? `Deleted ${getDisplayEntity()}` : 'No detailed fields recorded'}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center', paddingTop: '0.85rem' }}>
                                                <button 
                                                    type="button"
                                                    onClick={() => setSelectedGroup(group)}
                                                    className="crm-audit-inspect-btn"
                                                >
                                                    <Eye size={12} /> Inspect
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                        <History size={32} style={{ opacity: 0.3, margin: '0 auto 1rem', display: 'block' }} />
                                        No audit records found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                Page {page} of {totalPages}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn-outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Previous</button>
                                <button className="btn-outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Next</button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Timeline View */
                <div style={{ padding: '1rem' }}>
                    {paginatedGroups.length > 0 ? paginatedGroups.map((group, index) => {
                        const badge = getActionBadgeColor(group.actionType);
                        return (
                            <div key={group.groupId} style={{ position: 'relative', paddingLeft: '2.2rem', paddingBottom: '1.5rem' }}>
                                {index !== paginatedGroups.length - 1 && (
                                    <div style={{ position: 'absolute', left: '11px', top: '24px', bottom: 0, width: '2px', background: 'var(--border-color)' }} />
                                )}
                                <div style={{ 
                                    position: 'absolute', left: 0, top: '4px', width: '22px', height: '22px', 
                                    borderRadius: '50%', background: badge.bg, border: `2px solid ${badge.color}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }} />
                                
                                <div style={{ marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{getDisplayUser(group)}</span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {group.actionType.toLowerCase()} {getDisplayEntity()} {entityName && <strong>{entityName}</strong>}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                                        {formatDate(group.changedAt)}
                                    </span>
                                </div>
                                
                                <div style={{ 
                                    background: 'var(--panel-bg)', border: '1px solid var(--border-color)', 
                                    borderRadius: '8px', padding: '0.75rem 1rem', marginTop: '0.4rem' 
                                }}>
                                    {group.fields.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {group.fields.map((f, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                                                    <strong style={{ color: 'var(--text-primary)', minWidth: '85px' }}>{f.fieldName}:</strong>
                                                    {group.actionType === 'Update' || group.actionType === 'StatusChange' || group.actionType === 'Assign' ? (
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                            <ValueChip value={f.oldValue} variant="old" /> 
                                                            <ArrowRight size={12} style={{ opacity: 0.5, flexShrink: 0 }} /> 
                                                            <ValueChip value={f.newValue} variant="new" />
                                                        </div>
                                                    ) : group.actionType === 'Create' ? (
                                                        <ValueChip value={f.newValue} variant="added" />
                                                    ) : (
                                                        <ValueChip value={f.oldValue} variant="removed" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span style={{ fontStyle: 'italic', opacity: 0.7, fontSize: '0.85rem' }}>No detailed field data.</span>
                                    )}
                                </div>
                            </div>
                        );
                    }) : (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                            <History size={32} style={{ opacity: 0.3, margin: '0 auto 1rem', display: 'block' }} />
                            No audit records found matching your filters.
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
                            <button className="btn-outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Previous</button>
                            <button className="btn-outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Next</button>
                        </div>
                    )}
                </div>
            )}

            {/* View Details Modal */}
            {selectedGroup && (
                <div className="crm-modal-overlay">
                    <div 
                        className="crm-modal-container" 
                        style={{ maxWidth: '640px' }}
                    >
                        {/* Modal Header */}
                        <div style={{ 
                            paddingBottom: '1rem', 
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            marginBottom: '1.25rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ 
                                    width: '38px', height: '38px', borderRadius: '10px', 
                                    background: getActionBadgeColor(selectedGroup.actionType).bg,
                                    color: getActionBadgeColor(selectedGroup.actionType).color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: `1px solid ${getActionBadgeColor(selectedGroup.actionType).color}40`
                                }}>
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        Audit Record Inspection
                                    </h3>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                        {selectedGroup.actionType} Action Verification
                                    </div>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setSelectedGroup(null)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ maxHeight: '68vh', overflowY: 'auto', paddingRight: '4px' }}>
                            {/* Meta Info Grid */}
                            <div style={{ 
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', 
                                background: 'var(--bg-secondary)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                                marginBottom: '1.25rem'
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                                        <User size={11} /> User / Actor
                                    </div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{getDisplayUser(selectedGroup)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                                        <Clock size={11} /> Timestamp
                                    </div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{formatDate(selectedGroup.changedAt)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                                        <Activity size={11} /> Target Module
                                    </div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{getDisplayEntity()}</div>
                                </div>
                                {(entityName || entityName === "") && (
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                                            <Calendar size={11} /> Record Name
                                        </div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{entityName}</div>
                                    </div>
                                )}
                            </div>

                            {/* Changed Fields Section */}
                            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                Changed Fields ({selectedGroup.fields.length})
                            </h4>
                            
                            {selectedGroup.fields.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {selectedGroup.fields.map((field, idx) => (
                                        <div key={idx} style={{ 
                                            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                            borderRadius: '8px', padding: '0.85rem 1rem'
                                        }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.6rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Edit3 size={13} style={{ color: '#6366f1' }} />
                                                <span>Field: <span style={{ color: '#818cf8' }}>{field.fieldName || 'Unknown Field'}</span></span>
                                            </div>
                                            
                                            {selectedGroup.actionType === 'Update' || selectedGroup.actionType === 'StatusChange' || selectedGroup.actionType === 'Assign' ? (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', fontWeight: 700 }}>Previous Value</div>
                                                        <ValueChip value={field.oldValue} variant="old" />
                                                    </div>
                                                    <div style={{ color: 'var(--text-muted)', paddingTop: '14px', display: 'flex', justifyContent: 'center' }}>
                                                        <ArrowRight size={16} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', fontWeight: 700 }}>New Value</div>
                                                        <ValueChip value={field.newValue} variant="new" />
                                                    </div>
                                                </div>
                                            ) : selectedGroup.actionType === 'Create' ? (
                                                <div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', fontWeight: 700 }}>Added Value</div>
                                                    <ValueChip value={field.newValue} variant="added" />
                                                </div>
                                            ) : selectedGroup.actionType === 'Delete' ? (
                                                <div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', fontWeight: 700 }}>Removed Value</div>
                                                    <ValueChip value={field.oldValue} variant="removed" />
                                                </div>
                                            ) : (
                                                <div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', fontWeight: 700 }}>Value</div>
                                                    <ValueChip value={field.newValue || field.oldValue} variant="new" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)' }}>
                                    <Activity size={24} style={{ opacity: 0.3, margin: '0 auto 0.5rem', display: 'block' }} />
                                    No specific field changes recorded for this action.
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                            <button
                                type="button"
                                onClick={() => setSelectedGroup(null)}
                                className="crm-audit-inspect-btn"
                                style={{ padding: '0.45rem 1.25rem', fontSize: '0.85rem' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
