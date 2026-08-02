import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { DateRangePicker } from '../components/ui/DateRangePicker';
import { api } from '../lib/api';
import {
    Plus, Search, UserPlus, Calendar, Clock, AlertTriangle,
    Users, Target, UserCheck, Award, Mail, Phone
} from 'lucide-react';
import './screens.css';

interface LeadSummary {
    leadId: number;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    companyName?: string;
    sourceId?: number;
    sourceName?: string;
    leadStatusId?: number;
    leadStatusName: string;
    assignedRepId?: number;
    assignedRepName?: string;
    priority?: string;
    leadScore: number;
    lostReason?: string;
    nextFollowUpDate?: string;
    nextFollowUpType?: string;
    nextFollowUpNotes?: string;
    nextFollowUpAssignedToName?: string;
    lastActivityAt?: string;
    createdAt: string;
}

export const LeadsScreen: React.FC = () => {
    const [leads, setLeads] = useState<LeadSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statuses, setStatuses] = useState<{ id: number; name: string }[]>([]);
    const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
    const [sources, setSources] = useState<{ id: number; name: string }[]>([]);

    // Filters
    const [selectedStatusId, setSelectedStatusId] = useState<string>('');
    const [selectedPriority, setSelectedPriority] = useState<string>('');
    const [selectedFollowUpFilter, setSelectedFollowUpFilter] = useState<string>('');
    const [selectedRepId, setSelectedRepId] = useState<string>('');
    const [selectedSourceId, setSelectedSourceId] = useState<string>('');
    const [showConverted, setShowConverted] = useState(false);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const navigate = useNavigate();
    const location = useLocation();

    const loadLeads = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const params = new URLSearchParams();
            params.append('page', '1');
            params.append('pageSize', '100');

            if (search.trim()) params.append('search', search.trim());
            if (selectedStatusId) params.append('leadStatusId', selectedStatusId);
            if (selectedPriority) params.append('priority', selectedPriority);
            if (selectedFollowUpFilter) params.append('followUpFilter', selectedFollowUpFilter);
            if (selectedRepId) params.append('repId', selectedRepId);
            if (selectedSourceId) params.append('sourceId', selectedSourceId);
            if (showConverted) params.append('showConverted', 'true');
            if (startDate) params.append('createdFrom', startDate);
            if (endDate) params.append('createdTo', endDate);

            const queryString = params.toString();
            const response = await api.get<{ data: LeadSummary[] }>(`/api/leads?${queryString}`);
            setLeads(response.data ?? []);
        } catch {
            setLoadError('Failed to load leads. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [search, selectedStatusId, selectedPriority, selectedFollowUpFilter, selectedRepId, selectedSourceId, showConverted, startDate, endDate]);

    useEffect(() => {
        loadLeads();
    }, [loadLeads, location.key]);

    useEffect(() => {
        api.get<{ id: number; name: string }[]>('/api/leadstatuses')
            .then(data => setStatuses(data))
            .catch(() => setStatuses([]));

        api.get<{ id: number; name: string }[]>('/api/sources')
            .then(data => setSources(data))
            .catch(() => setSources([]));

        api.get<any[]>('/api/users')
            .then(data => setUsers(data.map((u: any) => ({ id: u.id ?? u.identityId, name: u.name }))))
            .catch(() => setUsers([]));
    }, []);

    const isOverdue = (dateStr?: string, statusName?: string) => {
        if (!dateStr || statusName === 'Converted' || statusName === 'Lost' || statusName === 'Closed') return false;
        return new Date(dateStr) < new Date();
    };

    const isToday = (dateStr?: string) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    };

    if (isLoading && leads.length === 0) {
        return (
            <Layout>
                <div className="dashboard-header animate-fade-in">
                    <div className="dashboard-title">
                        <h1>Leads</h1>
                        <p>Manage prospects, follow-up planning, qualification, and sales conversions</p>
                    </div>
                    <Button disabled><Plus size={16} style={{ marginRight: 6 }} /> New Lead</Button>
                </div>
                <div className="customers-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} variant="card" className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` } as React.CSSProperties} />
                    ))}
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="dashboard-header animate-fade-in">
                <div className="dashboard-title">
                    <h1>Leads</h1>
                    <p>Manage prospects, follow-up planning, qualification, and sales conversions</p>
                </div>
                <Button onClick={() => navigate('/leads/new')} variant="primary">
                    <Plus size={16} style={{ marginRight: 6 }} /> New Lead
                </Button>
            </div>

            {loadError && (
                <div className="error-message animate-fade-in" style={{ marginBottom: '1.5rem' }}>
                    {loadError}
                </div>
            )}

            {/* Standard CRM Search and Filters Bar */}
            <div className="filters-bar glass-panel" style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative', flex: '1 1 240px' }}>
                    <Search size={16} className="filter-icon" />
                    <input
                        className="filter-input"
                        placeholder="Search by lead name, company, email, phone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <select className="filter-select" value={selectedStatusId} onChange={e => setSelectedStatusId(e.target.value)}>
                    <option key="status-all" value="">All Statuses</option>
                    {statuses.map((s, idx) => (
                        <option key={`status-${s.id ?? idx}`} value={s.id}>{s.name}</option>
                    ))}
                </select>

                <select className="filter-select" value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)}>
                    <option key="priority-all" value="">All Priorities</option>
                    <option key="priority-low" value="Low">Low</option>
                    <option key="priority-medium" value="Medium">Medium</option>
                    <option key="priority-high" value="High">High</option>
                    <option key="priority-urgent" value="Urgent">Urgent</option>
                </select>

                <select className="filter-select" value={selectedFollowUpFilter} onChange={e => setSelectedFollowUpFilter(e.target.value)}>
                    <option key="followup-all" value="">All Follow-Ups</option>
                    <option key="followup-today" value="today">Follow-Up Due Today</option>
                    <option key="followup-overdue" value="overdue">Overdue Follow-Ups</option>
                    <option key="followup-upcoming" value="upcoming">Upcoming Follow-Ups</option>
                </select>

                {users.length > 0 && (
                    <select className="filter-select" value={selectedRepId} onChange={e => setSelectedRepId(e.target.value)}>
                        <option key="rep-all" value="">All Sales Reps</option>
                        {users.map((u, idx) => (
                            <option key={`rep-${u.id ?? idx}`} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                )}

                {sources.length > 0 && (
                    <select className="filter-select" value={selectedSourceId} onChange={e => setSelectedSourceId(e.target.value)}>
                        <option key="source-all" value="">All Sources</option>
                        {sources.map((s, idx) => (
                            <option key={`source-${s.id ?? idx}`} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                )}

                <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onApply={(s, e) => {
                        setStartDate(s);
                        setEndDate(e);
                    }}
                />

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                        type="checkbox"
                        checked={showConverted}
                        onChange={e => setShowConverted(e.target.checked)}
                    />
                    Include Converted
                </label>
            </div>

            {/* Standard CRM Customers Grid for Leads */}
            <div className="customers-grid">
                {leads.map(lead => {
                    const overdue = isOverdue(lead.nextFollowUpDate, lead.leadStatusName);
                    const dueToday = isToday(lead.nextFollowUpDate);
                    const initials = `${lead.firstName[0] || ''}${lead.lastName[0] || ''}`.toUpperCase();

                    return (
                        <Card
                            key={lead.leadId}
                            className="glass-panel customer-card animate-fade-in"
                            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                            onClick={() => navigate(`/leads/${lead.leadId}`)}
                        >
                            <Card.Content>
                                {/* Card Header: Avatar & Badges */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div className="customer-avatar" style={{ background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)', color: '#ffffff' }}>
                                            {initials}
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {lead.firstName} {lead.lastName}
                                            </h3>
                                            {lead.companyName && (
                                                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    {lead.companyName} {lead.jobTitle ? `· ${lead.jobTitle}` : ''}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                                        <span style={{
                                            padding: '0.2rem 0.6rem',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            background: lead.leadStatusName === 'Converted' ? 'rgba(16, 185, 129, 0.12)' : lead.leadStatusName === 'Qualified' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                            color: lead.leadStatusName === 'Converted' ? '#059669' : lead.leadStatusName === 'Qualified' ? '#4f46e5' : '#2563eb',
                                            border: '1px solid rgba(0, 0, 0, 0.08)'
                                        }}>
                                            {lead.leadStatusName}
                                        </span>
                                        <span style={{
                                            padding: '0.15rem 0.5rem',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            background: lead.priority === 'Urgent' ? 'rgba(239, 68, 68, 0.12)' : lead.priority === 'High' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                                            color: lead.priority === 'Urgent' ? '#dc2626' : lead.priority === 'High' ? '#d97706' : '#475569',
                                            border: '1px solid rgba(0, 0, 0, 0.05)'
                                        }}>
                                            {lead.priority || 'Medium'} Priority
                                        </span>
                                    </div>
                                </div>

                                {/* Contact & Assigned Information */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.75rem 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <Mail size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                        <span className="truncate">{lead.email || 'No email provided'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Phone size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                        <span>{lead.phone || 'No phone number'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <UserCheck size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                        <span>Assigned: <strong>{lead.assignedRepName || 'Unassigned'}</strong></span>
                                    </div>
                                    {lead.sourceName && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Target size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                            <span>Source: {lead.sourceName}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Next Follow-Up Banner */}
                                <div style={{ marginTop: '0.75rem' }}>
                                    {lead.nextFollowUpDate ? (
                                        <div style={{
                                            padding: '0.6rem 0.75rem',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.8rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            background: overdue ? 'rgba(239, 68, 68, 0.08)' : dueToday ? 'rgba(245, 158, 11, 0.08)' : 'rgba(241, 245, 249, 0.8)',
                                            border: overdue ? '1px solid rgba(239, 68, 68, 0.2)' : dueToday ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(226, 232, 240, 0.8)',
                                            color: overdue ? '#dc2626' : dueToday ? '#b45309' : 'var(--text-secondary)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {overdue ? <AlertTriangle size={15} /> : <Clock size={15} />}
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{lead.nextFollowUpType || 'Follow-Up'}</div>
                                                    <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>{new Date(lead.nextFollowUpDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                                </div>
                                            </div>
                                            {overdue && <span style={{ fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', background: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>Overdue</span>}
                                            {dueToday && <span style={{ fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', background: 'rgba(245, 158, 11, 0.15)', color: '#b45309', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>Today</span>}
                                        </div>
                                    ) : (
                                        <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                            No follow-up planned
                                        </div>
                                    )}
                                </div>
                            </Card.Content>
                        </Card>
                    );
                })}

                {leads.length === 0 && !loadError && (
                    <div style={{ gridColumn: '1 / -1' }}>
                        <EmptyState
                            title="No leads found"
                            description="Try adjusting your search filters or schedule a new lead to get started."
                            icon={UserPlus}
                            actionText="New Lead"
                            onActionClick={() => navigate('/leads/new')}
                        />
                    </div>
                )}
            </div>
        </Layout>
    );
};