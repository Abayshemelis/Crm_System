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
    const { user, token, isAdmin, userRole } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [filteredStats, setFilteredStats] = useState<FilteredDashboardStats | null>(null);
    const [includeClosed, setIncludeClosed] = useState<boolean>(false);
    const [taskGroups, setTaskGroups] = useState<TaskGroupedDto>({ overdue: [], dueToday: [], upcoming: [] });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            setIsLoading(false);
            return;
        }
        const fetchStats = async () => {
            try {
                // Fetch filtered stats for SalesRep, Manager, and Admin (for widgets)
                if (userRole === 'SalesRep' || userRole === 'Manager' || isAdmin) {
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
                if (isAdmin || userRole === 'Manager') {
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
                if (isAdmin) {
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
    }, [token, location.key, isAdmin, userRole, includeClosed]);

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
        if (isAdmin) return adminStatCards;
        if (userRole === 'Manager') return managerStatCards;
        return salesRepStatCards;
    };

    const statCards = getStatCards();

    const handleStatCardAction = (card: StatCard) => {
        navigate(card.path);
    };

    return (
        <Layout>
            <div className="dashboard-header animate-fade-in">
                <div className="dashboard-title">
                    <h1>Dashboard</h1>
                    <p>Welcome{user ? ' back,' : ''}{user?.name ? ` ${user.name}.` : ' to CRM Pro.'} Here's your {isAdmin ? 'system' : userRole === 'Manager' ? 'team' : 'personal'} overview.</p>
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

            <div className="stats-grid">
                {statCards.map((card, i) => (
                    <Card
                        key={card.title}
                        className="stat-card glass-panel animate-fade-in"
                        style={{ animationDelay: `${i * 0.05}s` } as React.CSSProperties}
                        onClick={() => handleStatCardAction(card)}
                    >
                        <Card.Content>
                            <div className="stat-header">
                                <div className="stat-icon" style={{ color: card.color }}>
                                    {React.createElement(card.icon, { size: 24 })}
                                </div>
                                <div className="stat-value">
                                    {isLoading ? '—' : card.format === 'currency' ? formatCurrency(card.value) : card.format === 'percentage' ? formatPercentage(card.value) : card.value}
                                </div>
                            </div>
                            <div className="stat-info">
                                <h3>{card.title}</h3>
                                <p>{card.description}</p>
                            </div>
                            {card.footer ? card.footer : (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="stat-action"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatCardAction(card);
                                    }}
                                    disabled={!user}
                                >
                                    View all <ArrowRight size={14} />
                                </Button>
                            )}
                        </Card.Content>
                    </Card>
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
                            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                                {taskGroups.overdue.map((task) => (
                                    <Card key={task.crmTaskId} className="glass-panel" style={{ cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
                                        <Card.Content>
                                            <div style={{ marginBottom: '0.5rem' }}>
                                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{task.title}</h4>
                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
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
                            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                                {taskGroups.dueToday.map((task) => (
                                    <Card key={task.crmTaskId} className="glass-panel" style={{ cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
                                        <Card.Content>
                                            <div style={{ marginBottom: '0.5rem' }}>
                                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{task.title}</h4>
                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
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
                            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                                {taskGroups.upcoming.map((task) => (
                                    <Card key={task.crmTaskId} className="glass-panel" style={{ cursor: 'pointer' }} onClick={() => navigate('/tasks')}>
                                        <Card.Content>
                                            <div style={{ marginBottom: '0.5rem' }}>
                                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{task.title}</h4>
                                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
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

        </Layout>
    );
};
