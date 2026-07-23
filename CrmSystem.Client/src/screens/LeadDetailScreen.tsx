import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { LeadConvertModal } from '../components/ui/LeadConvertModal';
import { AuditHistory } from '../components/audit/AuditHistory';
import { api } from '../lib/api';
import { ArrowLeft, Mail, Phone, Tag, ClipboardX, CheckCircle, History, MessageSquare, CheckSquare, Plus } from 'lucide-react';
import { TimelineList } from '../components/activities/TimelineList';
import { TaskListGroup, TaskReadDto } from '../components/tasks/TaskListGroup';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
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
    leadStatusName: string;
    leadStatusId?: number;
    notes?: string;
    createdAt: string;
    createdById?: number;
    convertedAt?: string;
    convertedById?: number;
    convertedCustomerId?: number;
    convertedOpportunityId?: number;
}

type TabId = 'details' | 'activities' | 'tasks' | 'audit';

export const LeadDetailScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [lead, setLead] = useState<LeadDetail | null>(null);
    const [statuses, setStatuses] = useState<{ id: number; name: string }[]>([]);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('details');
    const [isLoading, setIsLoading] = useState(true);
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [editingStatusId, setEditingStatusId] = useState<string>('');
    const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);

    // Tasks & Activities states
    const [activities, setActivities] = useState<any[]>([]);
    const [allActivities, setAllActivities] = useState<any[]>([]);
    const [activityTypes, setActivityTypes] = useState<any[]>([]);
    const [tasks, setTasks] = useState<TaskReadDto[]>([]);
    const [taskStatuses, setTaskStatuses] = useState<any[]>([]);
    const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editTask, setEditTask] = useState<TaskReadDto | null>(null);

    const fetchActivities = useCallback(async () => {
        if (!id) return;
        try {
            const res = await api.get<any[]>(`/api/activities?leadId=${id}`);
            setActivities(res);
            setAllActivities(res);
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

    const fetchLead = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const data = await api.get<LeadDetail>(`/api/leads/${id}`);
            setLead(data);
        } catch {
            navigate('/leads');
        } finally {
            setIsLoading(false);
        }
    }, [id, navigate, fetchTasks, fetchActivities]);

    useEffect(() => {
        if (!id) return;
        fetchLead();
        fetchActivities();
        fetchTasks();
    }, [id]);

    const deleteLead = async () => {
        if (!id || !window.confirm('Delete this lead?')) return;
        await api.delete(`/api/leads/${id}`);
        navigate('/leads');
    };

    const handleConvert = (customerId: number) => {
        setShowConvertModal(false);
        navigate(`/customers/${customerId}`);
    };

    const handleStatusUpdate = async () => {
        if (!id || !lead) return;
        setStatusUpdateError(null);
        try {
            await api.put(`/api/leads/${id}`, {
                firstName: lead.firstName,
                lastName: lead.lastName,
                email: lead.email,
                phone: lead.phone,
                companyName: lead.companyName,
                jobTitle: lead.jobTitle,
                sourceId: null,
                leadStatusId: editingStatusId ? Number(editingStatusId) : lead.leadStatusId,
                notes: lead.notes
            });
            await fetchLead();
            setIsEditingStatus(false);
        } catch (error: any) {
            setStatusUpdateError(error.message || 'Failed to update status');
        }
    };

    useEffect(() => { fetchLead(); }, [fetchLead]);

    useEffect(() => {
        api.get<{ id: number; name: string }[]>('/api/leadstatuses')
            .then(data => setStatuses(data))
            .catch(() => setStatuses([]));
        
        // Fetch lookups
        api.get<any[]>('/api/activitytypes').then(setActivityTypes).catch(() => {});
        api.get<any[]>('/api/taskstatuses').then(setTaskStatuses).catch(() => {});
        api.get<any[]>('/api/users').then(data => {
            setUsers(data.map(u => ({ id: u.id, name: u.name })));
        }).catch(() => {});
    }, []);

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

    const handleTaskComplete = async () => {
        await fetchTasks();
    };

    // Loading state with skeleton
    if (isLoading || !lead) {
        return (
            <Layout>
                <div className="detail-skeleton">
                    {/* Header skeleton */}
                    <div className="skeleton-header" style={{ marginBottom: 'var(--space-6)' }}>
                        <Skeleton variant="avatar" className="skeleton-avatar-large" />
                        <div className="skeleton-header-text">
                            <Skeleton variant="text" className="skeleton-header-title" />
                            <Skeleton variant="text" className="skeleton-header-subtitle" />
                        </div>
                    </div>

                    {/* Sidebar skeleton */}
                    <Card className="glass-panel skeleton-sidebar">
                        <Card.Content>
                            <Skeleton variant="text" style={{ width: '60%', marginBottom: '1rem' }} />
                            <Skeleton variant="text" style={{ marginBottom: '8px' }} />
                            <Skeleton variant="text" style={{ marginBottom: '8px' }} />
                            <Skeleton variant="text" style={{ marginBottom: '8px' }} />
                        </Card.Content>
                    </Card>

                    {/* Main content skeleton */}
                    <div className="skeleton-main">
                        <Card className="glass-panel">
                            <Card.Content>
                                <Skeleton variant="text" style={{ width: '40%', marginBottom: '1rem' }} />
                                <Skeleton variant="text" style={{ marginBottom: '8px' }} />
                                <Skeleton variant="text" style={{ marginBottom: '8px' }} />
                                <Skeleton variant="text" style={{ width: '60%' }} />
                            </Card.Content>
                        </Card>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="detail-header animate-fade-in">
                <Button variant="ghost" size="sm" onClick={() => navigate('/leads')}>
                    <ArrowLeft size={16} style={{ marginRight: 6 }} /> Back
                </Button>
                <div className="detail-header-info">
                    <div>
                        <h1>{lead.firstName} {lead.lastName}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {isEditingStatus ? (
                                <>
                                    <select
                                        className="filter-input"
                                        value={editingStatusId}
                                        onChange={e => setEditingStatusId(e.target.value)}
                                        style={{ fontSize: '0.875rem', padding: '0.25rem 0.5rem', minWidth: '120px' }}
                                    >
                                        {statuses.filter(status => status.name !== 'Converted').map(status => (
                                            <option key={status.id} value={status.id}>{status.name}</option>
                                        ))}
                                    </select>
                                    <Button size="sm" onClick={handleStatusUpdate} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Save</Button>
                                    <Button variant="ghost" size="sm" onClick={() => { setIsEditingStatus(false); setStatusUpdateError(null); }} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Cancel</Button>
                                </>
                            ) : (
                                <>
                                    <span>{lead.leadStatusName}</span>
                                    {lead.leadStatusName !== 'Converted' && (
                                        <Button variant="ghost" size="sm" onClick={() => { setIsEditingStatus(true); setEditingStatusId(String(lead.leadStatusId || '')); setStatusUpdateError(null); }} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Change</Button>
                                    )}
                                </>
                            )}
                            <span>·</span>
                            <span>{lead.sourceName ?? 'No source'}</span>
                        </div>
                        {statusUpdateError && <p style={{ color: 'var(--accent-red, #ef4444)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{statusUpdateError}</p>}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {lead.leadStatusName === 'Qualified' && (
                        <Button onClick={() => setShowConvertModal(true)} size="sm">
                            <CheckCircle size={16} style={{ marginRight: 6 }} /> Convert
                        </Button>
                    )}
                    {lead.leadStatusName !== 'Converted' && (
                        <Button onClick={() => navigate(`/leads/${id}/edit`)} size="sm">Edit</Button>
                    )}
                </div>
            </div>

            {lead.convertedAt && (
                <div style={{
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    borderRadius: '10px',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                            <CheckCircle size={18} color="var(--accent-blue, #3b82f6)" /> Converted Lead Record
                        </div>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Converted on {new Date(lead.convertedAt).toLocaleDateString()} {users.find(u => u.id === lead.convertedById)?.name ? `by ${users.find(u => u.id === lead.convertedById)?.name}` : ''}.
                            All historical activities & tasks are preserved in this read-only lead record and linked to the converted entity.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {lead.convertedCustomerId && (
                            <Button size="sm" onClick={() => navigate(`/customers/${lead.convertedCustomerId}`)}>
                                View Customer #{lead.convertedCustomerId}
                            </Button>
                        )}
                        {lead.convertedOpportunityId && (
                            <Button size="sm" variant="secondary" onClick={() => navigate(`/opportunities/${lead.convertedOpportunityId}`)}>
                                View Opportunity #{lead.convertedOpportunityId}
                            </Button>
                        )}
                    </div>
                </div>
            )}

            <div className="detail-layout animate-fade-in">
                <Card className="glass-panel detail-sidebar">
                    <Card.Content>
                        <div className="customer-details">
                            {lead.email && <div className="detail-row"><Mail size={15} /><span>{lead.email}</span></div>}
                            {lead.phone && <div className="detail-row"><Phone size={15} /><span>{lead.phone}</span></div>}
                            {lead.companyName && <div className="detail-row"><ClipboardX size={15} /><span>{lead.companyName}</span></div>}
                            {lead.jobTitle && <div className="detail-row"><Tag size={15} /><span>{lead.jobTitle}</span></div>}
                        </div>
                    </Card.Content>
                </Card>

                <div className="detail-main">
                    <div className="tabs-bar">
                        {(['details', 'activities', 'tasks', 'audit'] as TabId[]).map(tab => (
                            <button key={tab} className={`tab-btn ${activeTab === tab ? 'tab-active' : ''}`} onClick={() => setActiveTab(tab)}>
                                {tab === 'details' && <span>Details</span>}
                                {tab === 'activities' && <span><MessageSquare size={14} style={{ marginRight: 4 }} /> Activities ({activities.length})</span>}
                                {tab === 'tasks' && <span><CheckSquare size={14} style={{ marginRight: 4 }} /> Tasks ({tasks.length})</span>}
                                {tab === 'audit' && <span><History size={14} style={{ marginRight: 4 }} /> Audit History</span>}
                            </button>
                        ))}
                    </div>

                    <Card className="glass-panel">
                        <Card.Content>
                            {activeTab === 'details' ? (
                                <>
                                    <div className="profile-grid">
                                        <div className="profile-field"><label>First Name</label><p>{lead.firstName}</p></div>
                                        <div className="profile-field"><label>Last Name</label><p>{lead.lastName}</p></div>
                                        <div className="profile-field"><label>Email</label><p>{lead.email || '—'}</p></div>
                                        <div className="profile-field"><label>Phone</label><p>{lead.phone || '—'}</p></div>
                                        <div className="profile-field"><label>Company</label><p>{lead.companyName || '—'}</p></div>
                                        <div className="profile-field"><label>Job Title</label><p>{lead.jobTitle || '—'}</p></div>
                                        <div className="profile-field"><label>Source</label><p>{lead.sourceName || '—'}</p></div>
                                        <div className="profile-field"><label>Status</label><p>{lead.leadStatusName || '—'}</p></div>
                                        <div className="profile-field"><label>Created At</label><p>{new Date(lead.createdAt).toLocaleDateString()}</p></div>
                                        <div className="profile-field"><label>Created By</label><p>{users.find(u => u.id === lead.createdById)?.name || '—'}</p></div>
                                        {lead.convertedAt && (
                                            <>
                                                <div className="profile-field"><label>Converted At</label><p>{new Date(lead.convertedAt).toLocaleDateString()}</p></div>
                                                <div className="profile-field"><label>Converted By</label><p>{users.find(u => u.id === lead.convertedById)?.name || '—'}</p></div>
                                            </>
                                        )}
                                        {lead.convertedCustomerId && (
                                            <div className="profile-field">
                                                <label>Converted Customer</label>
                                                <p>
                                                    <a href={`/customers/${lead.convertedCustomerId}`} onClick={(e) => { e.preventDefault(); navigate(`/customers/${lead.convertedCustomerId}`); }} style={{ color: 'var(--accent-blue, #3b82f6)', fontWeight: 500, textDecoration: 'underline' }}>
                                                        Customer #{lead.convertedCustomerId}
                                                    </a>
                                                </p>
                                            </div>
                                        )}
                                        {lead.convertedOpportunityId && (
                                            <div className="profile-field">
                                                <label>Converted Opportunity</label>
                                                <p>
                                                    <a href={`/opportunities/${lead.convertedOpportunityId}`} onClick={(e) => { e.preventDefault(); navigate(`/opportunities/${lead.convertedOpportunityId}`); }} style={{ color: 'var(--accent-blue, #3b82f6)', fontWeight: 500, textDecoration: 'underline' }}>
                                                        Opportunity #{lead.convertedOpportunityId}
                                                    </a>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <hr style={{ margin: '1.5rem 0', borderTop: '1px solid var(--border-color)' }} />
                                    <h3>Notes</h3>
                                    <p>{lead.notes ?? 'No notes yet.'}</p>
                                </>
                            ) : activeTab === 'activities' ? (
                                <>
                                    {lead.convertedAt && (
                                        <div style={{ background: 'var(--accent-blue, #3b82f6)15', border: '1px solid var(--accent-blue, #3b82f6)40', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            📋 This lead was converted. History is preserved as a read-only record.
                                        </div>
                                    )}
                                    <TimelineList
                                        activities={activities}
                                        activityTypes={activityTypes}
                                        leadId={Number(id)}
                                        currentUserId={currentUser?.userId}
                                        isAdmin={currentUser?.roles?.includes('Admin') ?? false}
                                        readOnly={!!lead.convertedAt}
                                        onActivityLogged={lead.convertedAt ? () => {} : (act) => setActivities(prev => [act, ...prev])}
                                        onActivityDeleted={lead.convertedAt ? () => {} : (id) => setActivities(prev => prev.filter(a => a.activityId !== id))}
                                    />
                                </>
                            ) : activeTab === 'tasks' ? (
                                <div className="animate-fade-in">
                                    {lead.convertedAt && (
                                        <div style={{ background: 'var(--accent-blue, #3b82f6)15', border: '1px solid var(--accent-blue, #3b82f6)40', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            📋 This lead was converted. Task history is preserved as a read-only record.
                                        </div>
                                    )}
                                    {!lead.convertedAt && (
                                        <div style={{ display: 'flex', justifySelf: 'end', marginBottom: '1rem' }}>
                                            <button
                                                type="button"
                                                className="btn-outline-sm"
                                                onClick={() => { setEditTask(null); setShowTaskModal(true); }}
                                            >
                                                <Plus size={14} /> New Task
                                            </button>
                                        </div>
                                    )}
                                    <TaskListGroup
                                        overdue={groupedTasks.overdue}
                                        dueToday={groupedTasks.dueToday}
                                        upcoming={groupedTasks.upcoming}
                                        completed={groupedTasks.completed}
                                        onTaskComplete={handleTaskComplete}
                                        onTaskClick={(t) => { setEditTask(t); setShowTaskModal(true); }}
                                    />
                                </div>
                            ) : (
                                <AuditHistory entityType="lead" entityId={Number(id)} />
                            )}
                        </Card.Content>
                    </Card>
                </div>
            </div>

            {lead && (
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
            
            {showTaskModal && (
                <TaskFormModal
                    task={editTask}
                    leadId={Number(id)}
                    currentUserId={currentUser?.userId ?? 0}
                    users={users.length > 0 ? users : (currentUser ? [{ id: currentUser.userId, name: currentUser.name }] : [])}
                    activities={allActivities.map(a => ({ id: a.activityId, name: a.subject }))}
                    activityTypes={activityTypes.map(at => ({ id: at.id, name: at.name }))}
                    statuses={taskStatuses}
                    onSaved={() => {
                        setShowTaskModal(false);
                        setEditTask(null);
                        fetchTasks();
                    }}
                    onDeleted={() => {
                        setShowTaskModal(false);
                        setEditTask(null);
                        fetchTasks();
                    }}
                    onClose={() => { setShowTaskModal(false); setEditTask(null); }}
                />
            )}
        </Layout>
    );
};