import React, { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SimpleChart } from '../components/ui/SimpleChart';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Users, Building2, TrendingUp, Calendar, ArrowRight, LogIn, Shield, Target, DollarSign, X, Package, CheckCircle, Clock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import './screens.css';

interface DashboardStats {
    totalCustomers: number;
    totalCompanies: number;
    activeCompanies: number;
    createdCompanies: number;
    activeLeads: number;
    openDeals: number;
}

interface FilteredDashboardStats {
    totalCustomers: number;
    totalLeads: number;
    openDeals: number;
    pipelineValue: number;
    averageDealSize: number;
    totalRevenue: number;
    revenueByMonth: Array<{ month: string; revenue: number }>;
    conversionRate: number;
    completedTasksCount: number;
    pendingTasksCount: number;
    overdueTasksCount: number;
    dueTodayTasksCount: number;
    productsInStock: number;
    totalProducts: number;
    recentActivities?: Array<{
        activityId: number;
        subject: string;
        activityDate: string;
        customerName?: string;
        companyName?: string;
        opportunityTitle?: string;
    }>;
    topOpportunities?: Array<{
        opportunityId: number;
        title: string;
        customerName?: string;
        companyName?: string;
        stageName: string;
        estimatedValue: number;
    }>;
}

interface StatCard {
    title: string;
    value: number;
    icon: any;
    color: string;
    path: string;
    description: string;
    footer?: React.ReactNode;
    format?: 'currency' | 'percentage' | 'number';
}

interface UserStats {
    totalUsers: number;
    activeUsers: number;
    byRole: Array<{ role: string; count: number; activeCount: number }>;
}

interface OpportunitySummary {
    opportunityId: number;
    title?: string;
    customerFirstName?: string;
    customerLastName?: string;
    estimatedValue?: number;
    stageName?: string;
    actualCloseDate?: string | null;
}

interface TaskReadDto {
    crmTaskId: number;
    title: string;
    description?: string | null;
    dueDate?: string | null;
    statusName: string;
}

interface TaskGroupedDto {
    overdue: TaskReadDto[];
    dueToday: TaskReadDto[];
    upcoming: TaskReadDto[];
}

interface CompanySummaryResponse {
    totalCount?: number;
    data?: Array<{ isDeleted?: boolean }>;
}

const isOpenDeal = (opportunity: OpportunitySummary) => {
    const stageName = (opportunity.stageName ?? '').toLowerCase();
    const isClosed = stageName === 'won' || stageName === 'lost' || !!opportunity.actualCloseDate;
    return !isClosed;
};

const countOpenDeals = (opportunities: OpportunitySummary[]) =>
    opportunities.filter(isOpenDeal).length;

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    }).format(value);

const formatPercentage = (value: number) =>
    `${value.toFixed(1)}%`;

const getOpenTasksCount = (stats: FilteredDashboardStats | null) =>
    (stats?.pendingTasksCount ?? 0) + (stats?.overdueTasksCount ?? 0) + (stats?.dueTodayTasksCount ?? 0);

export const DashboardScreen: React.FC = () => {
    const { user, token, isAdmin, userRole, selectedRole } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [filteredStats, setFilteredStats] = useState<FilteredDashboardStats | null>(null);
    const [includeClosed, setIncludeClosed] = useState<boolean>(false);
    const [taskGroups, setTaskGroups] = useState<TaskGroupedDto>({ overdue: [], dueToday: [], upcoming: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [selectedKpiCard, setSelectedKpiCard] = useState<StatCard | null>(null);
    const [slaData, setSlaData] = useState<{ totalActive: number; scheduledCount: number; dueTodayCount: number; overdueCount: number; unscheduledCount: number; scheduledPercentage: number } | null>(null);
    const [priorityData, setPriorityData] = useState<Array<{ priority: string; total: number; active: number; converted: number; lost: number; avgScore: number }>>([]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedKpiCard(null);
            }
        };
        if (selectedKpiCard) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedKpiCard]);

    useEffect(() => {
        if (!token) {
            setIsLoading(false);
            return;
        }
        const fetchStats = async () => {
            try {
                // Fetch SLA and Priority report stats
                api.get<any>('/api/reports/followup-sla').then(setSlaData).catch(() => {});
                api.get<any[]>('/api/reports/lead-priority').then(setPriorityData).catch(() => {});

                // Fetch filtered stats for SalesRep, Manager, and Admin (for widgets)
                if (selectedRole === 'SalesRep' || selectedRole === 'Manager' || isAdmin) {
                    try {
                        const url = `/api/dashboard/stats${includeClosed ? '?includeClosed=true' : ''}`;
                        const filteredData = await api.get<FilteredDashboardStats>(url);
                        setFilteredStats(filteredData);
                    } catch {
                        setFilteredStats(null);
                    }
                }

                // Fetch additional data for widgets
                const taskGroups = await api.get<TaskGroupedDto>('/api/tasks/my');
                setTaskGroups(taskGroups);

                // Admin and Manager still get global stats
                if (isAdmin || selectedRole === 'Manager') {
                    const [customers, companiesFull, leads] = await Promise.all([
                        api.get<{ totalCount?: number }>('/api/customers?page=1&pageSize=1'),
                        api.get<CompanySummaryResponse>('/api/companies?page=1&pageSize=100'),
                        api.get<{ totalCount?: number }>('/api/leads?page=1&pageSize=1')
                    ]);
                    const createdCompanies = companiesFull.totalCount ?? 0;
                    const activeCompanies = companiesFull.data?.filter((company: { isDeleted?: boolean }) => !company.isDeleted).length ?? 0;
                    setStats({
                        totalCustomers: customers.totalCount ?? 0,
                        totalCompanies: createdCompanies,
                        activeCompanies,
                        createdCompanies,
                        activeLeads: leads.totalCount ?? 0,
                        openDeals: filteredStats?.openDeals ?? 0
                    });
                }

                // Fetch user stats only for Admin
                if (isAdmin && selectedRole === 'Admin') {
                    try {
                        const userStatsData = await api.get<UserStats>('/api/users/stats');
                        setUserStats(userStatsData);
                    } catch {
                        setUserStats(null);
                    }
                }
            } catch {
                setTaskGroups({ overdue: [], dueToday: [], upcoming: [] });
                setStats({
                    totalCustomers: 0,
                    totalCompanies: 0,
                    activeCompanies: 0,
                    createdCompanies: 0,
                    activeLeads: 0,
                    openDeals: 0
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, [token, location.key, isAdmin, selectedRole, includeClosed]);

    // Admin Dashboard Cards
    const adminStatCards: StatCard[] = [
        {
            title: 'Total Customers',
            value: stats?.totalCustomers ?? 0,
            icon: Users,
            color: 'var(--accent-primary)',
            path: '/customers',
            description: 'Active contacts in CRM'
        },
        {
            title: 'Companies',
            value: stats?.totalCompanies ?? 0,
            icon: Building2,
            color: 'var(--success)',
            path: '/companies',
            description: 'Created / Active accounts',
            footer: (
                <div className="dashboard-metric-detail">
                    <div className="dashboard-metric-footer">
                        <span>Active: {stats?.activeCompanies ?? 0}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="stat-action" onClick={() => navigate('/companies')}>
                        View all <ArrowRight size={14} />
                    </Button>
                </div>
            )
        },
        {
            title: 'Total Leads',
            value: filteredStats?.totalLeads ?? 0,
            icon: Target,
            color: '#f59e0b',
            path: '/leads',
            description: 'Total leads in pipeline'
        },
        {
            title: 'Pipeline Value',
            value: filteredStats?.pipelineValue ?? 0,
            icon: TrendingUp,
            color: 'var(--success)',
            path: '/opportunities',
            description: 'Open opportunity pipeline',
            format: 'currency' as const,
            footer: (
                <div className="dashboard-metric-detail">
                    <Button variant="ghost" size="sm" className="stat-action" onClick={() => navigate('/opportunities')}>
                        View opportunities <ArrowRight size={14} />
                    </Button>
                </div>
            )
        },
        {
            title: 'Open Tasks',
            value: getOpenTasksCount(filteredStats),
            icon: Clock,
            color: '#ec4899',
            path: '/tasks',
            description: 'Tasks awaiting action',
            footer: (
                <div className="dashboard-metric-detail">
                    <div className="dashboard-metric-footer">
                        <span style={{ cursor: 'pointer', color: 'var(--accent-primary)' }} onClick={() => navigate('/tasks?filter=overdue')}>Overdue: {filteredStats?.overdueTasksCount ?? 0}</span>
                        <span style={{ cursor: 'pointer', color: 'var(--accent-primary)' }} onClick={() => navigate('/tasks?filter=dueToday')}>Due today: {filteredStats?.dueTodayTasksCount ?? 0}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="stat-action" onClick={() => navigate('/tasks')}>
                        Open tasks <ArrowRight size={14} />
                    </Button>
                </div>
            )
        }
    ];

    // Manager Dashboard Cards
    const managerStatCards: StatCard[] = [
        {
            title: 'Total Customers',
            value: stats?.totalCustomers ?? 0,
            icon: Users,
            color: 'var(--accent-primary)',
            path: '/customers',
            description: 'Active contacts in CRM'
        },
        {
            title: 'Companies',
            value: stats?.totalCompanies ?? 0,
            icon: Building2,
            color: 'var(--success)',
            path: '/companies',
            description: 'Created / Active accounts',
            footer: (
                <div className="dashboard-metric-detail">
                    <div className="dashboard-metric-footer">
                        <span>Active: {stats?.activeCompanies ?? 0}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="stat-action" onClick={() => navigate('/companies')}>
                        View all <ArrowRight size={14} />
                    </Button>
                </div>
            )
        },
        {
            title: 'Total Leads',
            value: filteredStats?.totalLeads ?? 0,
            icon: Target,
            color: '#f59e0b',
            path: '/leads',
            description: 'Total leads in pipeline'
        },
        {
            title: 'Pipeline Value',
            value: filteredStats?.pipelineValue ?? 0,
            icon: TrendingUp,
            color: 'var(--success)',
            path: '/opportunities',
            description: 'Open opportunity pipeline',
            format: 'currency' as const,
            footer: (
                <div className="dashboard-metric-detail">
                    <Button variant="ghost" size="sm" className="stat-action" onClick={() => navigate('/opportunities')}>
                        View pipeline <ArrowRight size={14} />
                    </Button>
                </div>
            )
        },
        {
            title: 'Open Tasks',
            value: getOpenTasksCount(filteredStats),
            icon: Clock,
            color: '#ec4899',
            path: '/tasks',
            description: 'Tasks awaiting action',
            footer: (
                <div className="dashboard-metric-detail">
                    <div className="dashboard-metric-footer">
                        <span style={{ cursor: 'pointer', color: 'var(--accent-primary)' }} onClick={() => navigate('/tasks?filter=overdue')}>Overdue: {filteredStats?.overdueTasksCount ?? 0}</span>
                        <span style={{ cursor: 'pointer', color: 'var(--accent-primary)' }} onClick={() => navigate('/tasks?filter=dueToday')}>Due today: {filteredStats?.dueTodayTasksCount ?? 0}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="stat-action" onClick={() => navigate('/tasks')}>
                        Open tasks <ArrowRight size={14} />
                    </Button>
                </div>
            )
        }
    ];

    // SalesRep Dashboard Cards
    const salesRepStatCards: StatCard[] = [
        {
            title: 'My Customers',
            value: filteredStats?.totalCustomers ?? 0,
            icon: Users,
            color: 'var(--accent-primary)',
            path: '/customers',
            description: 'My assigned customers'
        },
        {
            title: 'Total Leads',
            value: filteredStats?.totalLeads ?? 0,
            icon: Target,
            color: '#f59e0b',
            path: '/leads',
            description: 'My pipeline prospects'
        },
        {
            title: 'Pipeline Value',
            value: filteredStats?.pipelineValue ?? 0,
            icon: TrendingUp,
            color: 'var(--success)',
            path: '/opportunities',
            description: 'Open opportunity pipeline',
            format: 'currency' as const,
            footer: (
                <div className="dashboard-metric-detail">
                    <Button variant="ghost" size="sm" className="stat-action" onClick={() => navigate('/opportunities')}>
                        View pipeline <ArrowRight size={14} />
                    </Button>
                </div>
            )
        },
        {
            title: 'Open Tasks',
            value: getOpenTasksCount(filteredStats),
            icon: Clock,
            color: '#ec4899',
            path: '/tasks',
            description: 'Tasks awaiting action',
            footer: (
                <div className="dashboard-metric-detail">
                    <div className="dashboard-metric-footer">
                        <span style={{ cursor: 'pointer', color: 'var(--accent-primary)' }} onClick={() => navigate('/tasks?filter=overdue')}>Overdue: {filteredStats?.overdueTasksCount ?? 0}</span>
                        <span style={{ cursor: 'pointer', color: 'var(--accent-primary)' }} onClick={() => navigate('/tasks?filter=dueToday')}>Due today: {filteredStats?.dueTodayTasksCount ?? 0}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="stat-action" onClick={() => navigate('/tasks')}>
                        Open tasks <ArrowRight size={14} />
                    </Button>
                </div>
            )
        }
    ];

    const getStatCards = () => {
        if (isAdmin && selectedRole === 'Admin') return adminStatCards;
        if (selectedRole === 'Manager') return managerStatCards;
        return salesRepStatCards;
    };

    const statCards = getStatCards();

    const handleStatCardAction = (card: StatCard) => {
        setSelectedKpiCard(card);
    };

    return (
        <Layout>
            <div className="dashboard-header animate-fade-in">
                <div className="dashboard-title">
                    <h1>Dashboard</h1>
                    <p>Welcome{user ? ' back,' : ''}{user?.name ? ` ${user.name}.` : ' to CRM Pro.'} Here's your {selectedRole === 'Admin' ? 'system' : selectedRole === 'Manager' ? 'team' : 'personal'} overview.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        <input type="checkbox" checked={includeClosed} onChange={(e) => setIncludeClosed(e.target.checked)} />
                        Include closed / Show won deals
                    </label>
                </div>
                {!user && (
                    <Button onClick={() => navigate('/login')} className="login-prompt-btn">
                        <LogIn size={16} style={{ marginRight: 6 }} />
                        Sign In to Access Full Features
                    </Button>
                )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
                {statCards.map((card, i) => (
                    <div
                        key={card.title}
                        className="glass-panel animate-fade-in"
                        style={{ 
                            animationDelay: `${i * 0.05}s`,
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            borderRadius: '1rem',
                            cursor: 'pointer',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            width: '240px',
                            minWidth: '240px',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
                        }}
                        onClick={() => handleStatCardAction(card)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)';
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ 
                                background: `color-mix(in srgb, ${card.color} 15%, transparent)`,
                                color: card.color,
                                padding: '0.75rem',
                                borderRadius: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {React.createElement(card.icon, { size: 24 })}
                            </div>
                            <div style={{ color: 'var(--text-muted)' }}>
                                <ArrowRight size={16} />
                            </div>
                        </div>

                        <div style={{ marginTop: '0.25rem' }}>
                            <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.1', letterSpacing: '-0.02em' }}>
                                {isLoading ? '—' : card.format === 'currency' ? formatCurrency(card.value) : card.format === 'percentage' ? formatPercentage(card.value) : card.value}
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                {card.title}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', marginTop: '0.25rem', fontWeight: '500' }}>
                                {card.description}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tasks Widget */}
            {(taskGroups.overdue.length > 0 || taskGroups.dueToday.length > 0 || taskGroups.upcoming.length > 0) && (
                <div className="dashboard-section animate-fade-in" style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Recent Tasks</h2>
                            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>
                                Overview of overdue, due today, and upcoming tasks.
                            </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
                            View all <ArrowRight size={14} />
                        </Button>
                    </div>

                    {taskGroups.overdue.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '600' }}>Overdue Tasks</h3>
                            <div className="dashboard-task-grid">
                                {taskGroups.overdue.map((task) => (
                                    <Card key={task.crmTaskId} className="glass-panel task-card-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
                                        <Card.Content>
                                            <div style={{ marginBottom: '0.5rem' }}>
                                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', wordBreak: 'break-word' }}>{task.title}</h4>
                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)', wordBreak: 'break-word' }}>
                                                    {task.description || 'No description'}
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                                <span className="deal-stage">{task.statusName || 'Overdue'}</span>
                                                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                                                </span>
                                            </div>
                                        </Card.Content>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {taskGroups.dueToday.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '600' }}>Due Today</h3>
                            <div className="dashboard-task-grid">
                                {taskGroups.dueToday.map((task) => (
                                    <Card key={task.crmTaskId} className="glass-panel task-card-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
                                        <Card.Content>
                                            <div style={{ marginBottom: '0.5rem' }}>
                                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', wordBreak: 'break-word' }}>{task.title}</h4>
                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)', wordBreak: 'break-word' }}>
                                                    {task.description || 'No description'}
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                                <span className="deal-stage">{task.statusName || 'Due Today'}</span>
                                                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                                                </span>
                                            </div>
                                        </Card.Content>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {taskGroups.upcoming.length > 0 && (
                        <div>
                            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '600' }}>Upcoming Tasks</h3>
                            <div className="dashboard-task-grid">
                                {taskGroups.upcoming.map((task) => (
                                    <Card key={task.crmTaskId} className="glass-panel task-card-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
                                        <Card.Content>
                                            <div style={{ marginBottom: '0.5rem' }}>
                                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', wordBreak: 'break-word' }}>{task.title}</h4>
                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)', wordBreak: 'break-word' }}>
                                                    {task.description || 'No description'}
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                                <span className="deal-stage">{task.statusName || 'Upcoming'}</span>
                                                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                                                </span>
                                            </div>
                                        </Card.Content>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}


            {/* Top Opportunities + Recent Activity Widgets */}
            {filteredStats && (
                <div className="dashboard-panel-row animate-fade-in" style={{ marginTop: '2rem' }}>
                    <div className="dashboard-panel-column">
                        <Card className="glass-panel dashboard-panel">
                            <Card.Content>
                                <div className="dashboard-panel-header">
                                    <div>
                                        <h2>Top Opportunities</h2>
                                        <p className="dashboard-panel-subtitle">Highest value open opportunities.</p>
                                    </div>
                                </div>
                                <div className="dashboard-list">
                                    {filteredStats.topOpportunities && filteredStats.topOpportunities.length > 0 ? (
                                        filteredStats.topOpportunities.map((opp) => (
                                            <div key={opp.opportunityId} className="dashboard-list-item" onClick={() => navigate(`/opportunities/${opp.opportunityId}`)}>
                                                <div>
                                                    <div className="dashboard-list-item-title">{opp.title}</div>
                                                    <div className="dashboard-list-item-meta">
                                                        {opp.companyName ? `${opp.companyName} · ${opp.stageName}` : opp.stageName}
                                                    </div>
                                                </div>
                                                <div className="dashboard-list-item-value">{formatCurrency(opp.estimatedValue)}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="dashboard-panel-empty">No opportunities to show.</div>
                                    )}
                                </div>
                            </Card.Content>
                        </Card>
                    </div>

                    <div className="dashboard-panel-column">
                        <Card className="glass-panel dashboard-panel">
                            <Card.Content>
                                <div className="dashboard-panel-header">
                                    <div>
                                        <h2>Recent Activity</h2>
                                        <p className="dashboard-panel-subtitle">Latest customer and opportunity updates.</p>
                                    </div>
                                </div>
                                <div className="dashboard-list">
                                    {filteredStats.recentActivities && filteredStats.recentActivities.length > 0 ? (
                                        filteredStats.recentActivities.map((activity) => (
                                            <div key={activity.activityId} className="dashboard-list-item">
                                                <div>
                                                    <div className="dashboard-list-item-title">{activity.subject}</div>
                                                    <div className="dashboard-list-item-meta">
                                                        {[activity.customerName, activity.companyName, activity.opportunityTitle]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </div>
                                                </div>
                                                <div className="dashboard-list-item-value">
                                                    {new Date(activity.activityDate).toLocaleDateString()}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="dashboard-panel-empty">No recent activity available.</div>
                                    )}
                                </div>
                            </Card.Content>
                        </Card>
                    </div>
                </div>
            )}

            {/* Lead Follow-Up SLA & Priority Insights (New Widget Row) */}
            <div className="dashboard-grid animate-fade-in" style={{ marginTop: '1.5rem' }}>
                {slaData && (
                    <Card className="glass-panel">
                        <Card.Content>
                            <div className="dashboard-panel-header">
                                <div>
                                    <h2>Follow-Up SLA Health</h2>
                                    <p className="dashboard-panel-subtitle">Scheduled vs overdue prospect follow-ups.</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
                                    View Report <ArrowRight size={14} style={{ marginLeft: 4 }} />
                                </Button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                                <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scheduled %</span>
                                    <h3 style={{ margin: '0.25rem 0 0 0', color: '#10b981', fontSize: '1.25rem' }}>{slaData.scheduledPercentage}%</h3>
                                </div>
                                <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due Today</span>
                                    <h3 style={{ margin: '0.25rem 0 0 0', color: '#f59e0b', fontSize: '1.25rem' }}>{slaData.dueTodayCount}</h3>
                                </div>
                                <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Overdue</span>
                                    <h3 style={{ margin: '0.25rem 0 0 0', color: '#ef4444', fontSize: '1.25rem' }}>{slaData.overdueCount}</h3>
                                </div>
                                <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unscheduled</span>
                                    <h3 style={{ margin: '0.25rem 0 0 0', color: '#6366f1', fontSize: '1.25rem' }}>{slaData.unscheduledCount}</h3>
                                </div>
                            </div>
                        </Card.Content>
                    </Card>
                )}

                {priorityData && priorityData.length > 0 && (
                    <Card className="glass-panel">
                        <Card.Content>
                            <div className="dashboard-panel-header">
                                <div>
                                    <h2>Lead Priority Breakdown</h2>
                                    <p className="dashboard-panel-subtitle">Prospect distribution by priority level.</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => navigate('/leads')}>
                                    All Leads <ArrowRight size={14} style={{ marginLeft: 4 }} />
                                </Button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1rem' }}>
                                {priorityData.map(p => (
                                    <div key={p.priority} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed var(--border-color)' }}>
                                        <span style={{
                                            padding: '0.15rem 0.5rem', borderRadius: '0.35rem', fontSize: '0.75rem', fontWeight: 700,
                                            background: p.priority === 'Urgent' ? 'rgba(239, 68, 68, 0.12)' : p.priority === 'High' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                            color: p.priority === 'Urgent' ? '#dc2626' : p.priority === 'High' ? '#d97706' : '#2563eb'
                                        }}>
                                            {p.priority} Priority
                                        </span>
                                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                                            <span><strong>{p.total}</strong> total</span>
                                            <span style={{ color: '#10b981' }}><strong>{p.converted}</strong> converted</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card.Content>
                    </Card>
                )}
            </div>

            {/* Standard Detail Modal Popup */}
            {selectedKpiCard && (
                <div className="modal-overlay" onClick={() => setSelectedKpiCard(null)}>
                    <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '340px' }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className="stat-icon" style={{ color: selectedKpiCard.color }}>
                                    {React.createElement(selectedKpiCard.icon, { size: 24 })}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1rem' }}>{selectedKpiCard.title}</h3>
                                </div>
                            </div>
                            <button className="icon-btn" onClick={() => setSelectedKpiCard(null)} aria-label="Close modal">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                {selectedKpiCard.description}
                            </p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Metric Value</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 700, color: selectedKpiCard.color }}>
                                        {isLoading ? '—' : selectedKpiCard.format === 'currency' ? formatCurrency(selectedKpiCard.value) : selectedKpiCard.format === 'percentage' ? formatPercentage(selectedKpiCard.value) : selectedKpiCard.value}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)' }}>Active Sync</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Data Scope</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{selectedRole === 'SalesRep' ? 'Assigned' : 'Organization'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedKpiCard(null)}>
                                Close
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                    const path = selectedKpiCard.path;
                                    setSelectedKpiCard(null);
                                    navigate(path);
                                }}
                            >
                                Open Full Page <ArrowRight size={14} style={{ marginLeft: 4 }} />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

        </Layout>
    );
};
