import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Loader2 } from 'lucide-react';

interface AuditLogEntry {
    auditLogId: number;
    actionType: string;
    fieldName: string;
    oldValue: string | null;
    newValue: string | null;
    changedBy: string;
    changedAt: string;
}

interface AuditHistoryTableProps {
    entityType: 'customers' | 'companies' | 'opportunities';
    entityId: number;
}

export const AuditHistoryTable: React.FC<AuditHistoryTableProps> = ({ entityType, entityId }) => {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const pageSize = 10;

    useEffect(() => {
        const fetchAuditLogs = async () => {
            setIsLoading(true);
            try {
                // If backend does not support pagination for audit logs, we fetch all and paginate locally.
                const data = await api.get<AuditLogEntry[]>(`/api/${entityType}/${entityId}/audit`);
                setLogs(data);
            } catch (error) {
                console.error("Failed to fetch audit logs", error);
                setLogs([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAuditLogs();
    }, [entityType, entityId]);

    const getActionBadgeColor = (action: string) => {
        switch (action) {
            case 'Create': return { bg: 'var(--status-won-bg)', color: 'var(--status-won-text)' };
            case 'Update': return { bg: 'var(--status-in-progress-bg)', color: 'var(--status-in-progress-text)' };
            case 'Delete': return { bg: 'var(--status-lost-bg)', color: 'var(--status-lost-text)' };
            case 'StatusChange': return { bg: 'var(--status-new-bg)', color: 'var(--status-new-text)' };
            default: return { bg: 'var(--border-color)', color: 'var(--text-secondary)' };
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const paginatedLogs = logs.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.ceil(logs.length / pageSize);

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <Loader2 size={24} className="spinner" style={{ color: 'var(--primary-color)' }} />
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', backgroundColor: 'var(--panel-bg)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                No history available for this record.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ overflowX: 'auto', backgroundColor: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <table className="data-table" style={{ width: '100%', minWidth: '800px' }}>
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Action</th>
                            <th>Field</th>
                            <th>Old Value</th>
                            <th>New Value</th>
                            <th>Changed By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedLogs.map(log => {
                            const badge = getActionBadgeColor(log.actionType);
                            return (
                                <tr key={log.auditLogId}>
                                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        {formatDate(log.changedAt)}
                                    </td>
                                    <td>
                                        <span style={{
                                            backgroundColor: badge.bg,
                                            color: badge.color,
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600
                                        }}>
                                            {log.actionType}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{log.fieldName}</td>
                                    <td style={{ color: 'var(--text-secondary)', textDecoration: log.oldValue ? 'line-through' : 'none' }}>
                                        {log.oldValue || '-'}
                                    </td>
                                    <td style={{ color: 'var(--text-color)' }}>
                                        {log.newValue || '-'}
                                    </td>
                                    <td style={{ color: 'var(--primary-color)', fontWeight: 500 }}>
                                        {log.changedBy}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Showing {(page - 1) * pageSize + 1} to Math.min(page * pageSize, logs.length) of {logs.length} entries
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            className="btn-outline"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            style={{ padding: '0.25rem 0.75rem' }}
                        >
                            Previous
                        </button>
                        <span style={{ padding: '0.25rem 0.75rem', backgroundColor: 'var(--hover-bg)', borderRadius: '4px' }}>
                            {page} / {totalPages}
                        </span>
                        <button
                            className="btn-outline"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            style={{ padding: '0.25rem 0.75rem' }}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
