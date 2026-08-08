import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { LeadConvertModal } from '../components/ui/LeadConvertModal';
import { FollowUpModal } from '../components/ui/FollowUpModal';
import { MarkLostModal } from '../components/ui/MarkLostModal';
import { EmailComposerModal } from '../components/email/EmailComposerModal';
import { AuditHistoryTable } from '../components/audit/AuditHistoryTable';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';
import {
    ArrowLeft, Mail, Phone, Tag, ClipboardX, CheckCircle, History, MessageSquare,
    CheckSquare, Plus, Trash2, Calendar, Clock, AlertTriangle, XCircle, UserCheck, ShieldAlert, Edit2
} from 'lucide-react';
import { TimelineList } from '../components/activities/TimelineList';
import { TaskListGroup, TaskReadDto } from '../components/tasks/TaskListGroup';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { AiLeadAssistant } from '../components/ai/AiLeadAssistant';
import Attachments from '../components/attachments/Attachments';
import { useAuth } from '../context/AuthContext';
import './screens.css';

interface LeadDetail {
    leadId: number;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    companyName?: string;
    jobTitle?: string;
    sourceName?: string;
    sourceId?: number;
    leadStatusName: string;
    leadStatusId?: number;
    assignedRepId?: number;
    assignedRepName?: string;
    priority?: string;
    leadScore: number;
    lostReason?: string;
    nextFollowUpDate?: string;
    nextFollowUpType?: string;
    nextFollowUpNotes?: string;
    nextFollowUpAssignedToId?: number;
    nextFollowUpAssignedToName?: string;
    lastActivityAt?: string;
    notes?: string;
    createdAt: string;
    createdById?: number;
    convertedAt?: string;
    convertedById?: number;
    convertedCustomerId?: number;
    convertedOpportunityId?: number;
    customFieldsJson?: string;
}

interface CustomFieldDef {
    customFieldDefinitionId: number;
    entityType: string;
    fieldName: string;
    fieldType: string;
    optionsJson: string | null;
    sortOrder: number;
}

type TabId = 'details' | 'activities' | 'tasks' | 'attachments' | 'audit';

export const LeadDetailScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [lead, setLead] = useState<LeadDetail | null>(null);
    const [statuses, setStatuses] = useState<{ id: number; name: string }[]>([]);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [showFollowUpModal, setShowFollowUpModal] = useState(false);
    const [showMarkLostModal, setShowMarkLostModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);

    const [activeTab, setActiveTab] = useState<TabId>('details');
    const [isLoading, setIsLoading] = useState(true);
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [editingStatusId, setEditingStatusId] = useState<string>('');
    const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);

    // Tasks & Activities states
    const [activities, setActivities] = useState<any[]>([]);
    const [activityTypes, setActivityTypes] = useState<any[]>([]);
    const [tasks, setTasks] = useState<TaskReadDto[]>([]);
    const [taskStatuses, setTaskStatuses] = useState<any[]>([]);
    const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editTask, setEditTask] = useState<TaskReadDto | null>(null);
    const [attachmentCount, setAttachmentCount] = useState<number>(0);
    const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);

    const fetchActivities = useCallback(async () => {
        if (!id) return;
        try {
            const res = await api.get<any[]>(`/api/activities?leadId=${id}`);
            setActivities(res);
        } catch { }
    }, [id]);

    const fetchTasks = useCallback(async () => {
        if (!id) return;
        try {
            const data = await api.get<TaskReadDto[]>(`/api/tasks?leadId=${id}`);
            setTasks(data);
        } catch (e) {
            console.error('Failed to load tasks', e);
        }
    }, [id]);

    const [scoreBreakdown, setScoreBreakdown] = useState<{
        score: number;
        rating: string;
        slaStatus: string;
        daysInactive: number;
        scoreFactors: string[];
    } | null>(null);

    const fetchLead = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const [data, scoreData] = await Promise.all([
                api.get<LeadDetail>(`/api/leads/${id}`),
                api.get<any>(`/api/leads/${id}/score-breakdown`).catch(() => null)
            ]);
            setLead(data);
            if (scoreData) setScoreBreakdown(scoreData);
        } catch {
            navigate('/leads');
        } finally {
            setIsLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        if (!id) return;
        fetchLead();
        fetchActivities();
        fetchTasks();
    }, [id, fetchLead, fetchActivities, fetchTasks]);

    useEffect(() => {
        api.get<{ id: number; name: string }[]>('/api/leadstatuses')
            .then(data => setStatuses(data))
            .catch(() => setStatuses([]));

        api.get<any[]>('/api/activitytypes').then(setActivityTypes).catch(() => { });
        api.get<any[]>('/api/taskstatuses').then(setTaskStatuses).catch(() => { });
        api.get<any[]>('/api/users').then(data => {
            setUsers(data.map((u: any) => ({ id: u.id ?? u.identityId, name: u.name })));
        }).catch(() => { });

        api.get<CustomFieldDef[]>('/api/custom-field-definitions?entityType=Lead')
            .then(setCustomFieldDefs)
            .catch(() => setCustomFieldDefs([]));
    }, []);

    const deleteLead = async () => {
        if (!id || !window.confirm('Are you sure you want to delete this lead?')) return;
        try {
            await api.delete(`/api/leads/${id}`);
            showToast('Lead deleted successfully', 'success');
            navigate('/leads');
        } catch (err: any) {
            showToast(err.message || 'Failed to delete lead', 'error');
        }
    };

    const handleConvert = (customerId: number) => {
        setShowConvertModal(false);
        navigate(`/customers/${customerId}`);
    };

    const handleScheduleFollowUp = async (data: {
        followUpDate: string;
        followUpType: string;
        notes?: string;
        assignedToId?: number;
    }) => {
        if (!id) return;
        try {
            const updated = await api.post<LeadDetail>(`/api/leads/${id}/follow-up`, data);
            setLead(updated);
            showToast('Next follow-up scheduled successfully!', 'success');
            fetchActivities();
            fetchTasks();
        } catch (err: any) {
            showToast(err.message || 'Failed to schedule follow-up.', 'error');
            throw err;
        }
    };

    const handleCompleteFollowUp = async () => {
        if (!id) return;
        try {
            const updated = await api.post<LeadDetail>(`/api/leads/${id}/complete-follow-up`, {});
            setLead(updated);
            showToast('Follow-up marked as completed!', 'success');
            fetchActivities();
            fetchTasks();
        } catch (err: any) {
            showToast(err.message || 'Failed to complete follow-up.', 'error');
        }
    };

    const handleMarkLost = async (lostReason: string) => {
        if (!id) return;
        try {
            const updated = await api.post<LeadDetail>(`/api/leads/${id}/lost`, { lostReason });
            setLead(updated);
            showToast('Lead marked as Lost.', 'success');
            fetchActivities();
        } catch (err: any) {
            showToast(err.message || 'Failed to mark lead as lost.', 'error');
            throw err;
        }
    };

    const handleStatusUpdate = async (newStatusId?: string) => {
        if (!id || !lead) return;
        setStatusUpdateError(null);
        const targetStatusId = newStatusId !== undefined ? newStatusId : editingStatusId;
        try {
            await api.put(`/api/leads/${id}`, {
                firstName: lead.firstName,
                lastName: lead.lastName,
                email: lead.email,
                phone: lead.phone,
                companyName: lead.companyName,
                jobTitle: lead.jobTitle,
                sourceId: lead.sourceId,
                leadStatusId: targetStatusId ? Number(targetStatusId) : lead.leadStatusId,
                assignedRepId: lead.assignedRepId,
                notes: lead.notes,
                priority: lead.priority,
                leadScore: lead.leadScore
            });
            await fetchLead();
            await fetchActivities();
            setIsEditingStatus(false);
            showToast('Status updated successfully.', 'success');
        } catch (error: any) {
            setStatusUpdateError(error.message || 'Failed to update status');
        }
    };

    const handlePriorityUpdate = async (newPriority: string) => {
        if (!id || !lead) return;
        try {
            await api.put(`/api/leads/${id}`, {
                firstName: lead.firstName,
                lastName: lead.lastName,
                email: lead.email,
                phone: lead.phone,
                companyName: lead.companyName,
                jobTitle: lead.jobTitle,
                sourceId: lead.sourceId,
                leadStatusId: lead.leadStatusId,
                assignedRepId: lead.assignedRepId,
                notes: lead.notes,
                priority: newPriority,
                leadScore: lead.leadScore
            });
            await fetchLead();
            await fetchActivities();
            showToast('Priority updated successfully.', 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to update priority', 'error');
        }
    };

    const handleRepUpdate = async (newRepId: string) => {
        if (!id || !lead) return;
        try {
            await api.put(`/api/leads/${id}`, {
                firstName: lead.firstName,
                lastName: lead.lastName,
                email: lead.email,
                phone: lead.phone,
                companyName: lead.companyName,
                jobTitle: lead.jobTitle,
                sourceId: lead.sourceId,
                leadStatusId: lead.leadStatusId,
                assignedRepId: newRepId ? Number(newRepId) : null,
                notes: lead.notes,
                priority: lead.priority,
                leadScore: lead.leadScore
            });
            await fetchLead();
            await fetchActivities();
            showToast('Assigned Sales Rep updated successfully.', 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to update sales rep', 'error');
        }
    };

    const groupedTasks = React.useMemo(() => {
        const overdue: TaskReadDto[] = [];
        const dueToday: TaskReadDto[] = [];
        const upcoming: TaskReadDto[] = [];
        const completed: TaskReadDto[] = [];

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        for (const t of tasks) {
            if (t.isTerminal) {
                completed.push(t);
                continue;
            }
            if (!t.dueDate) {
                upcoming.push(t);
                continue;
            }
            const due = new Date(t.dueDate);
            due.setHours(0, 0, 0, 0);
            if (due < now) overdue.push(t);
            else if (due.getTime() === now.getTime()) dueToday.push(t);
            else upcoming.push(t);
        }
        return { overdue, dueToday, upcoming, completed };
    }, [tasks]);

    const isFollowUpOverdue = lead?.nextFollowUpDate && lead.leadStatusName !== 'Converted' && lead.leadStatusName !== 'Lost' && lead.leadStatusName !== 'Closed' && new Date(lead.nextFollowUpDate) < new Date();
    const isFollowUpToday = lead?.nextFollowUpDate && new Date(lead.nextFollowUpDate).toDateString() === new Date().toDateString();

    if (isLoading || !lead) {
        return (
            <Layout>
                <div className="detail-skeleton">
                    <div className="skeleton-header" style={{ marginBottom: 'var(--space-6)' }}>
                        <Skeleton variant="avatar" className="skeleton-avatar-large" />
                        <div className="skeleton-header-text">
                            <Skeleton variant="text" className="skeleton-header-title" />
                            <Skeleton variant="text" className="skeleton-header-subtitle" />
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    const initials = `${lead.firstName[0] || ''}${lead.lastName[0] || ''}`.toUpperCase();

    return (
        <Layout>
            {/* Standard CRM Header */}
            <div className="detail-header animate-fade-in">
                <Button variant="ghost" size="sm" onClick={() => navigate('/leads')}>
                    <ArrowLeft size={16} style={{ marginRight: 6 }} /> Back
                </Button>

                <div className="detail-header-info">
                    <div className="customer-avatar large" style={{ background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)', color: '#ffffff' }}>
                        {initials}
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <h1 style={{ margin: 0 }}>{lead.firstName} {lead.lastName}</h1>
                            <span style={{
                                padding: '0.2rem 0.6rem',
                                borderRadius: '0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: lead.priority === 'Urgent' ? 'rgba(239, 68, 68, 0.12)' : lead.priority === 'High' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                color: lead.priority === 'Urgent' ? '#dc2626' : lead.priority === 'High' ? '#d97706' : '#2563eb',
                                border: '1px solid rgba(0, 0, 0, 0.08)'
                            }}>
                                {lead.priority || 'Medium'} Priority
                            </span>
                            {lead.leadScore > 0 && (
                                <span style={{
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    background: 'rgba(99, 102, 241, 0.12)',
                                    color: '#4f46e5',
                                    border: '1px solid rgba(99, 102, 241, 0.2)'
                                }}>
                                    Score {lead.leadScore}
                                </span>
                            )}
                        </div>
                        <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)' }}>
                            {lead.companyName ?? 'Independent Prospect'} {lead.jobTitle ? `· ${lead.jobTitle}` : ''} · Assigned: <strong>{lead.assignedRepName || 'Unassigned'}</strong>
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {lead.leadStatusName !== 'Converted' && lead.leadStatusName !== 'Lost' && (
                        <>
                            {lead.email && (
                                <Button size="sm" variant="secondary" onClick={() => setShowEmailModal(true)}>
                                    <Mail size={14} style={{ marginRight: 4 }} /> Send Email
                                </Button>
                            )}
                            <Button size="sm" variant="secondary" onClick={() => setShowFollowUpModal(true)}>
                                <Calendar size={14} style={{ marginRight: 4 }} /> {lead.nextFollowUpDate ? 'Reschedule Follow-Up' : 'Plan Follow-Up'}
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setShowMarkLostModal(true)} style={{ color: '#dc2626' }}>
                                <XCircle size={14} style={{ marginRight: 4 }} /> Mark Lost
                            </Button>
                            <Button size="sm" variant="primary" onClick={() => setShowConvertModal(true)}>
                                <CheckCircle size={14} style={{ marginRight: 4 }} /> Convert Lead
                            </Button>
                        </>
                    )}
                    {lead.leadStatusName !== 'Converted' && (
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/leads/${id}/edit`)}>Edit</Button>
                    )}
                    <Button variant="danger" size="sm" onClick={deleteLead}>Delete</Button>
                </div>
            </div>

            {/* Lead Score & SLA Intelligence Widget */}
            {scoreBreakdown && (
                <div className="glass-panel" style={{
                    padding: '1rem 1.25rem',
                    marginBottom: '1.5rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1.25rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-lg)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '50%',
                            background: scoreBreakdown.rating === 'Hot' ? 'rgba(239, 68, 68, 0.15)' : scoreBreakdown.rating === 'Warm' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: scoreBreakdown.rating === 'Hot' ? '#ef4444' : scoreBreakdown.rating === 'Warm' ? '#f59e0b' : '#3b82f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.25rem',
                            fontWeight: 800
                        }}>
                            {scoreBreakdown.score}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                                Lead Score Rating
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {scoreBreakdown.rating === 'Hot' ? '🔥 Hot Prospect' : scoreBreakdown.rating === 'Warm' ? '⚡ Warm Lead' : '❄️ Cold Lead'}
                            </div>
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                            SLA Response Status
                        </div>
                        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                                padding: '0.2rem 0.6rem',
                                borderRadius: '0.4rem',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                background: scoreBreakdown.slaStatus === 'OnTrack' ? 'rgba(16, 185, 129, 0.15)' : scoreBreakdown.slaStatus === 'Warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: scoreBreakdown.slaStatus === 'OnTrack' ? '#10b981' : scoreBreakdown.slaStatus === 'Warning' ? '#f59e0b' : '#ef4444'
                            }}>
                                {scoreBreakdown.slaStatus === 'OnTrack' ? '✅ SLA On Track' : scoreBreakdown.slaStatus === 'Warning' ? '⚠️ SLA Warning' : '🔴 SLA Breached'}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                ({scoreBreakdown.daysInactive}d inactive)
                            </span>
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                            Top Scoring Factors
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {scoreBreakdown.scoreFactors.slice(0, 3).map((factor, idx) => (
                                <div key={idx}>• {factor}</div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* AI Predictive Lead Insights */}
            <div style={{ marginBottom: '1.5rem' }}>
                <AiLeadAssistant leadId={lead.leadId} />
            </div>

            {/* Next Follow-Up Banner */}
            {lead.leadStatusName !== 'Converted' && lead.leadStatusName !== 'Lost' && (
                <div
                    className="glass-panel animate-fade-in"
                    style={{
                        padding: '1rem 1.25rem',
                        borderRadius: '1rem',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        background: isFollowUpOverdue ? 'rgba(239, 68, 68, 0.08)' : isFollowUpToday ? 'rgba(245, 158, 11, 0.08)' : 'rgba(99, 102, 241, 0.06)',
                        border: isFollowUpOverdue ? '1px solid rgba(239, 68, 68, 0.25)' : isFollowUpToday ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(99, 102, 241, 0.2)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            padding: '0.6rem',
                            borderRadius: '0.75rem',
                            background: isFollowUpOverdue ? '#fee2e2' : isFollowUpToday ? '#fef3c7' : '#e0e7ff',
                            color: isFollowUpOverdue ? '#dc2626' : isFollowUpToday ? '#b45309' : '#4f46e5'
                        }}>
                            {isFollowUpOverdue ? <AlertTriangle size={20} /> : <Clock size={20} />}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                    Next Follow-Up: {lead.nextFollowUpType || 'Phone Call'}
                                </strong>
                                {isFollowUpOverdue && <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', background: '#dc2626', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '1rem' }}>Overdue</span>}
                                {isFollowUpToday && <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', background: '#d97706', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '1rem' }}>Due Today</span>}
                            </div>
                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {lead.nextFollowUpDate ? (
                                    <>Scheduled for <strong>{new Date(lead.nextFollowUpDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</strong> {lead.nextFollowUpAssignedToName ? `(Assigned to ${lead.nextFollowUpAssignedToName})` : ''}</>
                                ) : (
                                    <span>No follow-up date scheduled. Best practice requires a planned next follow-up.</span>
                                )}
                            </p>
                            {lead.nextFollowUpNotes && (
                                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                    "{lead.nextFollowUpNotes}"
                                </p>
                            )}
                        </div>
                    </div>
                    {lead.nextFollowUpDate ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <Button size="sm" variant="primary" style={{ background: '#16a34a', borderColor: '#15803d' }} onClick={handleCompleteFollowUp}>
                                <CheckCircle size={14} style={{ marginRight: 4 }} /> Complete Follow-Up
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setShowFollowUpModal(true)}>
                                <Calendar size={14} style={{ marginRight: 4 }} /> Reschedule
                            </Button>
                        </div>
                    ) : (
                        <Button size="sm" variant="primary" onClick={() => setShowFollowUpModal(true)}>
                            <Calendar size={14} style={{ marginRight: 4 }} /> Schedule Now
                        </Button>
                    )}
                </div>
            )}

            {/* Lost Reason Banner */}
            {lead.leadStatusName === 'Lost' && lead.lostReason && (
                <div className="glass-panel animate-fade-in" style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <ShieldAlert size={20} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <strong style={{ color: '#991b1b', fontSize: '0.9rem' }}>Lead Marked as Lost</strong>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#7f1d1d' }}><strong>Reason:</strong> {lead.lostReason}</p>
                    </div>
                </div>
            )}

            {/* Main Detail Grid Layout */}
            <div className="detail-layout animate-fade-in">
                {/* Left Sidebar Info Card */}
                <Card className="glass-panel detail-sidebar">
                    <Card.Content style={{ padding: '1.25rem' }}>
                        {/* Status Change Section */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.5rem 0' }}>
                                Lifecycle Status
                            </h3>
                            {isEditingStatus ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <select
                                        className="filter-select"
                                        style={{ width: '100%' }}
                                        value={editingStatusId}
                                        onChange={e => setEditingStatusId(e.target.value)}
                                    >
                                        {statuses.filter(s => s.name !== 'Converted').map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <Button size="sm" onClick={() => handleStatusUpdate()}>Save</Button>
                                        <Button variant="ghost" size="sm" onClick={() => setIsEditingStatus(false)}>Cancel</Button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                    <span style={{
                                        padding: '0.3rem 0.75rem',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        background: 'rgba(59, 130, 246, 0.12)',
                                        color: '#2563eb',
                                        border: '1px solid rgba(59, 130, 246, 0.25)'
                                    }}>
                                        {lead.leadStatusName}
                                    </span>
                                    {lead.leadStatusName !== 'Converted' && (
                                        <Button variant="ghost" size="sm" onClick={() => { setIsEditingStatus(true); setEditingStatusId(String(lead.leadStatusId || '')); }}>
                                            <Edit2 size={12} style={{ marginRight: 4 }} /> Change
                                        </Button>
                                    )}
                                </div>
                            )}
                            {statusUpdateError && <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>{statusUpdateError}</p>}
                        </div>

                        {/* Priority Quick Change */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.35rem 0' }}>
                                Lead Priority
                            </h3>
                            <select
                                className="filter-select"
                                style={{ width: '100%', fontSize: '0.85rem' }}
                                value={lead.priority || 'Medium'}
                                onChange={e => handlePriorityUpdate(e.target.value)}
                            >
                                <option key="p-low" value="Low">Low Priority</option>
                                <option key="p-medium" value="Medium">Medium Priority</option>
                                <option key="p-high" value="High">High Priority</option>
                                <option key="p-urgent" value="Urgent">Urgent Priority</option>
                            </select>
                        </div>

                        {/* Sales Rep Quick Change */}
                        {users.length > 0 && (
                            <div style={{ marginBottom: '1.25rem' }}>
                                <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.35rem 0' }}>
                                    Assigned Sales Rep
                                </h3>
                                <select
                                    className="filter-select"
                                    style={{ width: '100%', fontSize: '0.85rem' }}
                                    value={lead.assignedRepId ?? ''}
                                    onChange={e => handleRepUpdate(e.target.value)}
                                >
                                    <option key="rep-none" value="">Unassigned</option>
                                    {users.map(u => (
                                        <option key={`rep-${u.id}`} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Contact Details List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                                Contact Details
                            </h3>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                                <Mail size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                <span>{lead.email || 'No email provided'}</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                <Phone size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                <span>{lead.phone || 'No phone number'}</span>
                            </div>

                            {lead.companyName && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                    <ClipboardX size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                    <span>{lead.companyName}</span>
                                </div>
                            )}

                            {lead.jobTitle && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                    <Tag size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                    <span>{lead.jobTitle}</span>
                                </div>
                            )}

                            {lead.sourceName && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                    <Tag size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                    <span>Source: {lead.sourceName}</span>
                                </div>
                            )}
                        </div>
                    </Card.Content>
                </Card>

                {/* Right Tabbed Panel */}
                <div className="detail-main">
                    <div className="tabs-bar">
                        {(['details', 'activities', 'tasks', 'attachments', 'audit'] as TabId[]).map(tab => (
                            <button key={tab} className={`tab-btn ${activeTab === tab ? 'tab-active' : ''}`} onClick={() => setActiveTab(tab)}>
                                {tab === 'details' && <span>Overview & Details</span>}
                                {tab === 'activities' && <span><MessageSquare size={14} style={{ marginRight: 4 }} /> Activity Timeline ({activities.length})</span>}
                                {tab === 'tasks' && <span><CheckSquare size={14} style={{ marginRight: 4 }} /> Follow-Up Tasks ({tasks.length})</span>}
                                {tab === 'attachments' && <span>📎 Attachments {attachmentCount > 0 ? `(${attachmentCount})` : ''}</span>}
                                {tab === 'audit' && <span><History size={14} style={{ marginRight: 4 }} /> Audit History</span>}
                            </button>
                        ))}
                    </div>

                    {/* Tab 1: Overview & Details Grid */}
                    {activeTab === 'details' && (
                        <Card className="glass-panel">
                            <Card.Content style={{ padding: '1.5rem' }}>
                                <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Lead Name</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{lead.firstName} {lead.lastName}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Email Address</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{lead.email || '—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Phone Number</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{lead.phone || '—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Company Name</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{lead.companyName || '—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Job Title</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{lead.jobTitle || '—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Lead Source</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{lead.sourceName || '—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Priority</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{lead.priority || 'Medium'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Lead Score</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{lead.leadScore}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Assigned Sales Rep</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{lead.assignedRepName || 'Unassigned'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Next Follow-Up Date</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleString() : '—'}
                                        </div>
                                    </div>
                                </div>
                                
                                {customFieldDefs.length > 0 && (
                                    <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Additional Information</div>
                                        <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                                            {customFieldDefs.map(def => {
                                                let val = '';
                                                if (lead.customFieldsJson) {
                                                    try {
                                                        const parsed = JSON.parse(lead.customFieldsJson);
                                                        val = parsed[def.fieldName] || '';
                                                    } catch { }
                                                }
                                                if (!val) val = '—';
                                                if (def.fieldType === 'Boolean') {
                                                    val = val === 'true' ? 'Yes' : (val === 'false' ? 'No' : '—');
                                                }
                                                return (
                                                    <div key={def.customFieldDefinitionId}>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{def.fieldName}</div>
                                                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{val}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {lead.notes && (
                                    <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Lead Background & Notes</div>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{lead.notes}</p>
                                    </div>
                                )}
                            </Card.Content>
                        </Card>
                    )}

                    {/* Tab 2: Activity Timeline */}
                    {activeTab === 'activities' && (
                        <Card className="glass-panel">
                            <Card.Content style={{ padding: '1.5rem' }}>
                                <TimelineList
                                    activities={activities}
                                    activityTypes={activityTypes}
                                    leadId={Number(id)}
                                    currentUserId={currentUser?.userId}
                                    onActivityLogged={() => fetchActivities()}
                                    onActivityDeleted={() => fetchActivities()}
                                />
                            </Card.Content>
                        </Card>
                    )}

                    {/* Tab 3: Follow-Up Tasks */}
                    {activeTab === 'tasks' && (
                        <Card className="glass-panel">
                            <Card.Content style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Lead Tasks</h3>
                                    <Button size="sm" onClick={() => { setEditTask(null); setShowTaskModal(true); }}>
                                        <Plus size={14} style={{ marginRight: 4 }} /> Add Task
                                    </Button>
                                </div>
                                <TaskListGroup
                                    overdue={groupedTasks.overdue}
                                    dueToday={groupedTasks.dueToday}
                                    upcoming={groupedTasks.upcoming}
                                    completed={groupedTasks.completed}
                                    onTaskComplete={async (taskId: number) => {
                                        const doneStatus = taskStatuses.find(s => s.isTerminal);
                                        if (doneStatus) {
                                            await api.put(`/api/tasks/${taskId}`, { crmTaskStatusId: doneStatus.crmTaskStatusId });
                                            fetchTasks();
                                        }
                                    }}
                                    onTaskClick={(t: TaskReadDto) => { setEditTask(t); setShowTaskModal(true); }}
                                />
                            </Card.Content>
                        </Card>
                    )}

                    {/* Tab 3.5: Attachments */}
                    {activeTab === 'attachments' && (
                        <Card className="glass-panel">
                            <Card.Content style={{ padding: '1.5rem' }}>
                                <Attachments entity="lead" entityId={Number(id)} canEdit={true} onCountChange={setAttachmentCount} />
                            </Card.Content>
                        </Card>
                    )}

                    {/* Tab 4: Audit History */}
                    {activeTab === 'audit' && (
                        <Card className="glass-panel">
                            <Card.Content style={{ padding: '1.5rem' }}>
                                <AuditHistoryTable entityType="lead" entityId={Number(id)} />
                            </Card.Content>
                        </Card>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showConvertModal && (
                <LeadConvertModal
                    isOpen={showConvertModal}
                    leadId={lead.leadId}
                    leadData={{
                        firstName: lead.firstName,
                        lastName: lead.lastName,
                        email: lead.email,
                        phone: lead.phone,
                        companyName: lead.companyName
                    }}
                    onCancel={() => setShowConvertModal(false)}
                    onConverted={handleConvert}
                />
            )}

            {showFollowUpModal && (
                <FollowUpModal
                    isOpen={showFollowUpModal}
                    onClose={() => setShowFollowUpModal(false)}
                    onSchedule={handleScheduleFollowUp}
                    users={users}
                    currentAssignedRepId={lead.assignedRepId}
                    initialType={lead.nextFollowUpType}
                    initialNotes={lead.nextFollowUpNotes}
                    initialDate={lead.nextFollowUpDate}
                />
            )}

            {showMarkLostModal && (
                <MarkLostModal
                    isOpen={showMarkLostModal}
                    leadName={`${lead.firstName} ${lead.lastName}`}
                    onClose={() => setShowMarkLostModal(false)}
                    onConfirm={handleMarkLost}
                />
            )}

            {showTaskModal && (
                <TaskFormModal
                    task={editTask}
                    leadId={Number(id)}
                    currentUserId={currentUser?.userId ?? 0}
                    statuses={taskStatuses}
                    users={users}
                    onSaved={() => { fetchTasks(); setShowTaskModal(false); setEditTask(null); }}
                    onClose={() => { setShowTaskModal(false); setEditTask(null); }}
                />
            )}

            {showEmailModal && lead && (
                <EmailComposerModal
                    isOpen={showEmailModal}
                    onClose={() => setShowEmailModal(false)}
                    defaultRecipient={lead.email || ''}
                    recipientName={`${lead.firstName} ${lead.lastName}`}
                    leadId={lead.leadId}
                    onEmailSent={() => { fetchActivities(); }}
                />
            )}
        </Layout>
    );
};