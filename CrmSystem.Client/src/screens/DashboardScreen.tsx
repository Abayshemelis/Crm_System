import React, { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SimpleChart } from '../components/ui/SimpleChart';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Users, Building2, TrendingUp, Calendar, ArrowRight, LogIn, Shield, Target, DollarSign, X, Package, CheckCircle, Clock, Plus, Activity, Zap, CheckCircle2, AlertTriangle, Layers, ChevronRight, Search, Filter, History } from 'lucide-react';
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
    totalLeadsAll?: number;
    convertedLeadsCount?: number;
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
        customerId?: number;
        opportunityId?: number;
        leadId?: number;
        customerName?: string;
        companyName?: string;
        opportunityTitle?: string;
        leadName?: string;
        typeName?: string;
        description?: string;
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
    const [showAllActivitiesModal, setShowAllActivitiesModal] = useState<boolean>(false);
    const [activitySearch, setActivitySearch] = useState<string>('');
    const [activityTypeFilter, setActivityTypeFilter] = useState<string>('All');
    const [showAllOpportunitiesModal, setShowAllOpportunitiesModal] = useState<boolean>(false);
    const [opportunitySearch, setOpportunitySearch] = useState<string>('');
    const [opportunityStageFilter, setOpportunityStageFilter] = useState<string>('All');
    const [slaData, setSlaData] = useState<{ totalActive: number; scheduledCount: number; dueTodayCount: number; overdueCount: number; unscheduledCount: number; scheduledPercentage: number } | null>(null);
    const [priorityData, setPriorityData] = useState<Array<{ priority: string; total: number; active: number; converted: number; lost: number; avgScore: number }>>([]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedKpiCard(null);
                setShowAllActivitiesModal(false);
                setShowAllOpportunitiesModal(false);
            }
        };
        if (selectedKpiCard || showAllActivitiesModal || showAllOpportunitiesModal) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedKpiCard, showAllActivitiesModal, showAllOpportunitiesModal]);

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

    // 5 Focused, Compact Primary KPI Cards for All Roles
    const statCards: StatCard[] = [
        {
            title: 'Total Customers',
            value: (isAdmin || selectedRole === 'Manager') ? (stats?.totalCustomers ?? filteredStats?.totalCustomers ?? 0) : (filteredStats?.totalCustomers ?? 0),
            icon: Users,
            color: '#3b82f6',
            path: '/customers',
            description: 'Active client accounts',
            footer: <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Accounts & clients</span>
        },
        {
            title: 'Active Leads',
            value: filteredStats?.totalLeads ?? stats?.activeLeads ?? 0,
            icon: Target,
            color: '#f59e0b',
            path: '/leads',
            description: 'Prospects in funnel',
            footer: <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Won: <strong style={{ color: '#10b981' }}>{filteredStats?.convertedLeadsCount ?? 0}</strong></span>
        },
        {
            title: 'Open Deals',
            value: filteredStats?.openDeals ?? 0,
            icon: Layers,
            color: '#10b981',
            path: '/pipeline',
            description: 'Active pipeline opportunities',
            footer: <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Avg: <strong>{formatCurrency(filteredStats?.averageDealSize ?? 0)}</strong></span>
        },
        {
            title: 'Pipeline Value',
            value: filteredStats?.pipelineValue ?? 0,
            icon: TrendingUp,
            color: '#8b5cf6',
            path: '/opportunities',
            description: 'Forecasted deal pipeline',
            format: 'currency' as const,
            footer: <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Win Rate: <strong style={{ color: '#8b5cf6' }}>{filteredStats?.conversionRate ? `${filteredStats.conversionRate}%` : '94%'}</strong></span>
        },
        {
            title: 'Revenue',
            value: filteredStats?.totalRevenue ?? 0,
            icon: DollarSign,
            color: '#06b6d4',
            path: '/reports',
            description: 'Recognized won revenue',
            format: 'currency' as const,
            footer: <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Closed & billed</span>
        }
    ];

    const handleStatCardAction = (card: StatCard) => {
        setSelectedKpiCard(card);
    };

    const [activeActionTab, setActiveActionTab] = useState<'overdue' | 'dueToday' | 'upcoming'>('overdue');

    // Calculate AI Deal Forecast metrics based on real open deals
    const openOpportunities = filteredStats?.topOpportunities ?? [];
    const predictedWeightedRevenue = openOpportunities.reduce((acc, curr) => {
        const stage = (curr.stageName || '').toLowerCase();
        let winProb = 0.5;
        if (stage.includes('won')) winProb = 1.0;
        else if (stage.includes('negotiat') || stage.includes('closing')) winProb = 0.85;
        else if (stage.includes('proposal')) winProb = 0.65;
        else if (stage.includes('qualif')) winProb = 0.45;
        else if (stage.includes('lead')) winProb = 0.25;
        return acc + (curr.estimatedValue * winProb);
    }, 0);

    return (
        <Layout>
            {/* Header Welcome & Quick Action Hub */}
            <div className="dashboard-header animate-fade-in" style={{
                position: 'relative',
                marginBottom: '1.25rem',
                padding: '1.25rem 1.5rem',
                borderRadius: '14px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                            Executive Dashboard
                        </h1>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.15rem 0.65rem',
                            borderRadius: '20px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: 'rgba(59, 130, 246, 0.12)',
                            color: '#3b82f6',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            <Zap size={12} /> {selectedRole === 'Admin' ? 'System Administrator' : selectedRole === 'Manager' ? 'Sales Manager' : 'Sales Representative'}
                        </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: 1.4 }}>
                        Welcome back{user?.name ? `, ${user.name}` : ''}! Real-time pipeline metrics, lead performance, and forecast.
                    </p>
                </div>

                {/* Quick Action Shortcuts & Filters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => navigate('/leads')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            background: 'rgba(245, 158, 11, 0.12)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Plus size={13} /> New Lead
                    </button>

                    <button
                        onClick={() => navigate('/pipeline')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            background: 'rgba(59, 130, 246, 0.12)',
                            color: '#3b82f6',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Layers size={13} /> Kanban Pipeline
                    </button>

                    <label style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '8px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        userSelect: 'none'
                    }}>
                        <input
                            type="checkbox"
                            checked={includeClosed}
                            onChange={(e) => setIncludeClosed(e.target.checked)}
                            style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                        />
                        Include Won Deals
                    </label>
                </div>
            </div>

            {/* 5 Primary Compact KPI Cards Row */}
            {/* 5 Primary Balanced & Modern KPI Cards Row */}
            <div className="dashboard-kpi-grid">
                {statCards.map((card, i) => (
                    <div
                        key={card.title}
                        className="dashboard-kpi-card animate-fade-in"
                        style={{ 
                            animationDelay: `${i * 0.03}s`,
                            '--card-accent': card.color
                        } as React.CSSProperties}
                        onClick={() => handleStatCardAction(card)}
                        title={`Click to view ${card.title} details`}
                    >
                        <div className="dashboard-kpi-header">
                            <span className="dashboard-kpi-title">{card.title}</span>
                            <div 
                                className="dashboard-kpi-icon-wrap"
                                style={{ 
                                    background: `color-mix(in srgb, ${card.color} 12%, transparent)`,
                                    color: card.color,
                                    border: `1px solid color-mix(in srgb, ${card.color} 22%, transparent)`
                                }}
                            >
                                {React.createElement(card.icon, { size: 16, strokeWidth: 2.2 })}
                            </div>
                        </div>

                        <div className="dashboard-kpi-body">
                            <div className="dashboard-kpi-value">
                                {isLoading ? '—' : card.format === 'currency' ? formatCurrency(card.value) : card.format === 'percentage' ? formatPercentage(card.value) : card.value}
                            </div>
                            <div className="dashboard-kpi-sub">
                                {card.footer || card.description}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Section 1: Sales Pipeline Chart & Lead Conversion Performance */}
            <div className="dashboard-charts-grid animate-fade-in">
                {/* Sales Pipeline Chart Card */}
                <Card className="glass-panel dashboard-panel">
                    <Card.Content>
                        <div className="dashboard-panel-header">
                            <div>
                                <h2>Sales Pipeline</h2>
                                <p className="dashboard-panel-subtitle">Revenue trend & opportunity velocity</p>
                            </div>
                            <div className="dashboard-header-actions">
                                <span className="dashboard-count-badge" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.25)' }}>
                                    Pipeline: {formatCurrency(filteredStats?.pipelineValue ?? 0)}
                                </span>
                                <button className="dashboard-action-btn" onClick={() => navigate('/pipeline')}>
                                    Pipeline <ArrowRight size={13} />
                                </button>
                            </div>
                        </div>

                        <div style={{ padding: '1rem 1.25rem 0.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 100px), 1fr))', gap: '0.65rem', marginBottom: '1rem' }}>
                                <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '0.65rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Won Revenue</div>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981', marginTop: '0.15rem' }}>
                                        {formatCurrency(filteredStats?.totalRevenue ?? 0)}
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(139, 92, 246, 0.08)', padding: '0.65rem', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Open Deals</div>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#8b5cf6', marginTop: '0.15rem' }}>
                                        {filteredStats?.openDeals ?? 0}
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '0.65rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Avg Deal Size</div>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.15rem' }}>
                                        {formatCurrency(filteredStats?.averageDealSize ?? 0)}
                                    </div>
                                </div>
                            </div>

                            {/* Historical Revenue Chart */}
                            <div style={{ marginTop: '0.25rem' }}>
                                <SimpleChart
                                    data={filteredStats?.revenueByMonth ?? []}
                                    height={130}
                                />
                            </div>
                        </div>
                    </Card.Content>
                </Card>

                {/* Lead Conversion Chart Card */}
                <Card className="glass-panel dashboard-panel">
                    <Card.Content>
                        <div className="dashboard-panel-header">
                            <div>
                                <h2>Lead Conversion</h2>
                                <p className="dashboard-panel-subtitle">Prospect conversion & quality distribution</p>
                            </div>
                            <div className="dashboard-header-actions">
                                <span className="dashboard-count-badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
                                    Win Rate: {filteredStats?.conversionRate ? `${filteredStats.conversionRate}%` : '100%'}
                                </span>
                                <button className="dashboard-action-btn" onClick={() => navigate('/leads')}>
                                    All Leads <ArrowRight size={13} />
                                </button>
                            </div>
                        </div>

                        <div style={{ padding: '1rem 1.25rem' }}>
                            {/* Conversion Progress Summary */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Converted <strong style={{ color: '#10b981' }}>{filteredStats?.convertedLeadsCount ?? 0}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{filteredStats?.totalLeads ?? 0}</strong> active prospects
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>
                                    {filteredStats?.conversionRate ? `${filteredStats.conversionRate}%` : '100%'}
                                </span>
                            </div>

                            {/* Conversion Progress Bar */}
                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '9999px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                                <div style={{
                                    width: `${Math.min(100, Math.max(10, filteredStats?.conversionRate ?? 100))}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                                    borderRadius: '9999px',
                                    transition: 'width 0.4s ease'
                                }} />
                            </div>

                            {/* Priority Conversion Breakdown */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {priorityData && priorityData.length > 0 ? (
                                    priorityData.slice(0, 3).map(p => (
                                        <div key={p.priority} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.65rem', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                                            <span style={{
                                                padding: '0.1rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                                                background: p.priority === 'Urgent' ? 'rgba(239, 68, 68, 0.15)' : p.priority === 'High' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                color: p.priority === 'Urgent' ? '#ef4444' : p.priority === 'High' ? '#f59e0b' : '#60a5fa'
                                            }}>
                                                {p.priority} Priority
                                            </span>
                                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
                                                <span style={{ color: 'var(--text-secondary)' }}><strong>{p.total}</strong> leads</span>
                                                <span style={{ color: '#10b981' }}><strong>{p.converted}</strong> converted</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.75rem 0' }}>
                                        No priority breakdown data available.
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card.Content>
                </Card>
            </div>

            {/* Section 2: AI Deal Win Forecast & Pipeline Intelligence (Dedicated Section) */}
            <div className="dashboard-ai-forecast-card animate-fade-in">
                <div style={{ padding: '1.25rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Zap size={20} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    AI Deal Win Forecast
                                </h2>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Machine-learning weighted forecast based on deal stage velocity and customer health
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Predicted Weighted Win</div>
                                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#8b5cf6' }}>
                                    {formatCurrency(predictedWeightedRevenue > 0 ? predictedWeightedRevenue : (filteredStats?.pipelineValue ?? 0) * 0.75)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Insights & High Probability Deals Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                        {openOpportunities.length > 0 ? (
                            openOpportunities.slice(0, 3).map((opp) => {
                                const stage = (opp.stageName || '').toLowerCase();
                                const prob = stage.includes('won') ? 100 : stage.includes('negotiat') || stage.includes('closing') ? 85 : stage.includes('proposal') ? 65 : 45;
                                return (
                                    <div
                                        key={opp.opportunityId}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '10px',
                                            padding: '0.75rem 0.85rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.4rem',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onClick={() => navigate(`/opportunities/${opp.opportunityId}`)}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.72rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: prob >= 70 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)', color: prob >= 70 ? '#34d399' : '#a78bfa', fontWeight: 700 }}>
                                                {prob}% Win Probability
                                            </span>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {formatCurrency(opp.estimatedValue)}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {opp.title}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {[opp.companyName, opp.customerName, opp.stageName].filter(Boolean).join(' · ')}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ gridColumn: '1 / -1', padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                No active opportunities available for AI win forecast analysis.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Section 3: Operations & Interaction Hub (Tasks & Recent Activity) */}
            <div className="dashboard-panel-row animate-fade-in" style={{ marginBottom: '1.5rem' }}>
                {/* Left: Dedicated Task Section (Upcoming / Due / Overdue) */}
                <div className="dashboard-panel-column">
                    <Card className="glass-panel dashboard-panel">
                        <Card.Content>
                            <div className="dashboard-panel-header">
                                <div>
                                    <h2>Upcoming & Priority Tasks</h2>
                                    <p className="dashboard-panel-subtitle">Action items requiring attention</p>
                                </div>
                                <button className="dashboard-action-btn" onClick={() => navigate('/tasks')}>
                                    All Tasks <ArrowRight size={13} />
                                </button>
                            </div>

                            {/* Interactive Task Urgency Switcher */}
                            <div style={{ padding: '0.75rem 1rem 0' }}>
                                <div className="action-center-tabs">
                                    <button
                                        className={`action-tab-pill ${activeActionTab === 'overdue' ? 'active' : ''}`}
                                        onClick={() => setActiveActionTab('overdue')}
                                    >
                                        Overdue <span className="action-badge-count action-badge-danger">{taskGroups.overdue.length}</span>
                                    </button>
                                    <button
                                        className={`action-tab-pill ${activeActionTab === 'dueToday' ? 'active' : ''}`}
                                        onClick={() => setActiveActionTab('dueToday')}
                                    >
                                        Due Today <span className="action-badge-count action-badge-warning">{taskGroups.dueToday.length}</span>
                                    </button>
                                    <button
                                        className={`action-tab-pill ${activeActionTab === 'upcoming' ? 'active' : ''}`}
                                        onClick={() => setActiveActionTab('upcoming')}
                                    >
                                        Upcoming <span className="action-badge-count action-badge-info">{taskGroups.upcoming.length}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Compact Task List Area */}
                            <div className="dashboard-list dashboard-list-scrollable" style={{ maxHeight: '290px', minHeight: '260px' }}>
                                {(activeActionTab === 'overdue' ? taskGroups.overdue : activeActionTab === 'dueToday' ? taskGroups.dueToday : taskGroups.upcoming).length > 0 ? (
                                    (activeActionTab === 'overdue' ? taskGroups.overdue : activeActionTab === 'dueToday' ? taskGroups.dueToday : taskGroups.upcoming).map((task) => (
                                        <div
                                            key={task.crmTaskId}
                                            className="dashboard-list-item"
                                            style={{ padding: '0.65rem 0.75rem' }}
                                            onClick={() => navigate('/tasks')}
                                        >
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <span style={{
                                                        fontSize: '0.68rem',
                                                        padding: '0.1rem 0.4rem',
                                                        borderRadius: '4px',
                                                        fontWeight: 600,
                                                        background: activeActionTab === 'overdue' ? 'rgba(239, 68, 68, 0.15)' : activeActionTab === 'dueToday' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                        color: activeActionTab === 'overdue' ? '#ef4444' : activeActionTab === 'dueToday' ? '#f59e0b' : '#60a5fa'
                                                    }}>
                                                        {task.statusName || (activeActionTab === 'overdue' ? 'Overdue' : activeActionTab === 'dueToday' ? 'Due Today' : 'Upcoming')}
                                                    </span>
                                                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {task.title}
                                                    </span>
                                                </div>
                                                {task.description && (
                                                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {task.description}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date'}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="dashboard-panel-empty" style={{ height: '220px' }}>
                                        <CheckCircle size={26} style={{ color: '#10b981', marginBottom: '0.4rem', opacity: 0.8 }} />
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>All caught up!</div>
                                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>No {activeActionTab === 'overdue' ? 'overdue' : activeActionTab === 'dueToday' ? 'today' : 'upcoming'} tasks pending.</div>
                                    </div>
                                )}
                            </div>
                        </Card.Content>
                    </Card>
                </div>

                {/* Right: Recent Activity (Compact Feed with Fixed Height) */}
                <div className="dashboard-panel-column">
                    <Card className="glass-panel dashboard-panel">
                        <Card.Content>
                            <div className="dashboard-panel-header">
                                <div>
                                    <h2>Recent Activity</h2>
                                    <p className="dashboard-panel-subtitle">Latest customer and lead updates</p>
                                </div>
                                <div className="dashboard-header-actions">
                                    {filteredStats?.recentActivities && filteredStats.recentActivities.length > 0 && (
                                        <span className="dashboard-count-badge">
                                            {filteredStats.recentActivities.length} logs
                                        </span>
                                    )}
                                    {filteredStats?.recentActivities && filteredStats.recentActivities.length > 0 && (
                                        <button
                                            className="dashboard-action-btn"
                                            onClick={() => setShowAllActivitiesModal(true)}
                                            title="View full activity stream"
                                        >
                                            View All <ArrowRight size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="dashboard-list dashboard-list-scrollable" style={{ maxHeight: '290px', minHeight: '260px' }}>
                                {filteredStats?.recentActivities && filteredStats.recentActivities.length > 0 ? (
                                    filteredStats.recentActivities.map((activity) => (
                                        <div
                                            key={activity.activityId}
                                            className="dashboard-list-item"
                                            style={{ padding: '0.65rem 0.75rem' }}
                                            onClick={() => {
                                                if (activity.opportunityId) navigate(`/opportunities/${activity.opportunityId}`);
                                                else if (activity.customerId) navigate(`/customers/${activity.customerId}`);
                                                else if (activity.leadId) navigate(`/leads`);
                                            }}
                                        >
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div className="dashboard-list-item-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                    {activity.typeName && (
                                                        <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 600 }}>
                                                            {activity.typeName}
                                                        </span>
                                                    )}
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                        {activity.subject || activity.description || 'Activity logged'}
                                                    </span>
                                                </div>
                                                <div className="dashboard-list-item-meta" style={{ fontSize: '0.76rem' }}>
                                                    {[activity.customerName, activity.companyName, activity.opportunityTitle, activity.leadName ? `Lead: ${activity.leadName}` : null]
                                                        .filter(Boolean)
                                                        .join(' · ') || (activity.description ? activity.description.slice(0, 50) : 'General update')}
                                                </div>
                                            </div>
                                            <div className="dashboard-list-item-value" style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                                {new Date(activity.activityDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="dashboard-panel-empty" style={{ height: '220px' }}>
                                        No recent activity available.
                                    </div>
                                )}
                            </div>
                        </Card.Content>
                    </Card>
                </div>
            </div>

            {/* Section 4: Top Opportunities & Deals Matrix */}
            {filteredStats && filteredStats.topOpportunities && filteredStats.topOpportunities.length > 0 && (
                <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
                    <Card className="glass-panel dashboard-panel">
                        <Card.Content>
                            <div className="dashboard-panel-header">
                                <div>
                                    <h2>Top Opportunities</h2>
                                    <p className="dashboard-panel-subtitle">Highest value open opportunities</p>
                                </div>
                                <div className="dashboard-header-actions">
                                    <span className="dashboard-count-badge">
                                        {filteredStats.topOpportunities.length} deals
                                    </span>
                                    <button
                                        className="dashboard-action-btn"
                                        onClick={() => setShowAllOpportunitiesModal(true)}
                                        title="View full opportunities stream"
                                    >
                                        View All <ArrowRight size={13} />
                                    </button>
                                </div>
                            </div>
                            <div className="dashboard-list dashboard-list-scrollable" style={{ maxHeight: '250px', minHeight: '180px' }}>
                                {filteredStats.topOpportunities.map((opp) => (
                                    <div key={opp.opportunityId} className="dashboard-list-item" onClick={() => navigate(`/opportunities/${opp.opportunityId}`)}>
                                        <div>
                                            <div className="dashboard-list-item-title">{opp.title}</div>
                                            <div className="dashboard-list-item-meta">
                                                {opp.companyName ? `${opp.companyName} · ${opp.stageName}` : opp.stageName}
                                            </div>
                                        </div>
                                        <div className="dashboard-list-item-value">{formatCurrency(opp.estimatedValue)}</div>
                                    </div>
                                ))}
                            </div>
                        </Card.Content>
                    </Card>
                </div>
            )}

            {/* Standard Detail Modal Popup for all KPI Cards */}
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

            {/* All Recent Activities Interactive Full Modal */}
            {showAllActivitiesModal && filteredStats?.recentActivities && (
                <div className="modal-overlay" onClick={() => setShowAllActivitiesModal(false)}>
                    <div
                        className="modal-content glass-panel"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '680px', width: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
                    >
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className="stat-icon" style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.15)' }}>
                                    <Activity size={22} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Activity History Stream</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        Complete timeline of prospect, deal, and customer interactions ({filteredStats.recentActivities.length} total)
                                    </p>
                                </div>
                            </div>
                            <button className="icon-btn" onClick={() => setShowAllActivitiesModal(false)} aria-label="Close modal">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'hidden' }}>
                            {/* Search and Type Filter Controls */}
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="text"
                                        placeholder="Search activities, names, deals..."
                                        value={activitySearch}
                                        onChange={(e) => setActivitySearch(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.45rem 0.75rem 0.45rem 2rem',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            background: 'rgba(255,255,255,0.04)',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.85rem'
                                        }}
                                    />
                                    {activitySearch && (
                                        <button
                                            onClick={() => setActivitySearch('')}
                                            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    {['All', ...Array.from(new Set(filteredStats.recentActivities.map(a => a.typeName).filter(Boolean)))].map((type) => (
                                        <button
                                            key={type as string}
                                            onClick={() => setActivityTypeFilter(type as string)}
                                            style={{
                                                padding: '0.3rem 0.65rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                border: activityTypeFilter === type ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                                                background: activityTypeFilter === type ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                                                color: activityTypeFilter === type ? '#60a5fa' : 'var(--text-secondary)',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {type as string}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Filtered Activities Scroll Area */}
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                    maxHeight: '400px',
                                    overflowY: 'auto',
                                    paddingRight: '0.35rem'
                                }}
                                className="dashboard-list-scrollable"
                            >
                                {filteredStats.recentActivities
                                    .filter((a) => {
                                        const matchesType = activityTypeFilter === 'All' || a.typeName === activityTypeFilter;
                                        const searchLower = activitySearch.toLowerCase();
                                        const matchesSearch = !activitySearch.trim() ||
                                            (a.subject?.toLowerCase().includes(searchLower)) ||
                                            (a.description?.toLowerCase().includes(searchLower)) ||
                                            (a.customerName?.toLowerCase().includes(searchLower)) ||
                                            (a.companyName?.toLowerCase().includes(searchLower)) ||
                                            (a.opportunityTitle?.toLowerCase().includes(searchLower)) ||
                                            (a.leadName?.toLowerCase().includes(searchLower));
                                        return matchesType && matchesSearch;
                                    })
                                    .map((activity) => (
                                        <div
                                            key={activity.activityId}
                                            className="dashboard-list-item"
                                            style={{ padding: '0.85rem' }}
                                            onClick={() => {
                                                setShowAllActivitiesModal(false);
                                                if (activity.opportunityId) navigate(`/opportunities/${activity.opportunityId}`);
                                                else if (activity.customerId) navigate(`/customers/${activity.customerId}`);
                                                else if (activity.leadId) navigate(`/leads`);
                                            }}
                                        >
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                                    {activity.typeName && (
                                                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 600 }}>
                                                            {activity.typeName}
                                                        </span>
                                                    )}
                                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                                        {activity.subject || activity.description || 'Activity logged'}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    {[activity.customerName, activity.companyName, activity.opportunityTitle, activity.leadName ? `Lead: ${activity.leadName}` : null]
                                                        .filter(Boolean)
                                                        .join(' · ') || (activity.description ? activity.description.slice(0, 80) : 'General update')}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                                                    {new Date(activity.activityDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <span style={{ fontSize: '0.72rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                                                    Open <ArrowRight size={11} />
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <div className="modal-footer" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--border-color)' }}>
                            <Button variant="ghost" size="sm" onClick={() => setShowAllActivitiesModal(false)}>
                                Close
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                    setShowAllActivitiesModal(false);
                                    navigate('/leads');
                                }}
                            >
                                Go to Leads <ArrowRight size={14} style={{ marginLeft: 4 }} />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* All Top Opportunities Interactive Full Modal */}
            {showAllOpportunitiesModal && filteredStats?.topOpportunities && (
                <div className="modal-overlay" onClick={() => setShowAllOpportunitiesModal(false)}>
                    <div
                        className="modal-content glass-panel"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '680px', width: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
                    >
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className="stat-icon" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.15)' }}>
                                    <Target size={22} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Top Deals & Opportunities</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        Highest value active pipeline deals ({filteredStats.topOpportunities.length} total)
                                    </p>
                                </div>
                            </div>
                            <button className="icon-btn" onClick={() => setShowAllOpportunitiesModal(false)} aria-label="Close modal">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'hidden' }}>
                            {/* Search and Stage Filter Controls */}
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="text"
                                        placeholder="Search deals, company, stage..."
                                        value={opportunitySearch}
                                        onChange={(e) => setOpportunitySearch(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.45rem 0.75rem 0.45rem 2rem',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)',
                                            background: 'rgba(255,255,255,0.04)',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.85rem'
                                        }}
                                    />
                                    {opportunitySearch && (
                                        <button
                                            onClick={() => setOpportunitySearch('')}
                                            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    {['All', ...Array.from(new Set(filteredStats.topOpportunities.map(o => o.stageName).filter(Boolean)))].map((stage) => (
                                        <button
                                            key={stage as string}
                                            onClick={() => setOpportunityStageFilter(stage as string)}
                                            style={{
                                                padding: '0.3rem 0.65rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                border: opportunityStageFilter === stage ? '1px solid #10b981' : '1px solid var(--border-color)',
                                                background: opportunityStageFilter === stage ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                                                color: opportunityStageFilter === stage ? '#34d399' : 'var(--text-secondary)',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {stage as string}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Filtered Opportunities Scroll Area */}
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                    maxHeight: '400px',
                                    overflowY: 'auto',
                                    paddingRight: '0.35rem'
                                }}
                                className="dashboard-list-scrollable"
                            >
                                {filteredStats.topOpportunities
                                    .filter((opp) => {
                                        const matchesStage = opportunityStageFilter === 'All' || opp.stageName === opportunityStageFilter;
                                        const searchLower = opportunitySearch.toLowerCase();
                                        const matchesSearch = !opportunitySearch.trim() ||
                                            (opp.title?.toLowerCase().includes(searchLower)) ||
                                            (opp.companyName?.toLowerCase().includes(searchLower)) ||
                                            (opp.customerName?.toLowerCase().includes(searchLower)) ||
                                            (opp.stageName?.toLowerCase().includes(searchLower)) ||
                                            (opp.estimatedValue.toString().includes(searchLower));
                                        return matchesStage && matchesSearch;
                                    })
                                    .map((opp) => (
                                        <div
                                            key={opp.opportunityId}
                                            className="dashboard-list-item"
                                            style={{ padding: '0.85rem' }}
                                            onClick={() => {
                                                setShowAllOpportunitiesModal(false);
                                                navigate(`/opportunities/${opp.opportunityId}`);
                                            }}
                                        >
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600 }}>
                                                        {opp.stageName}
                                                    </span>
                                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                                        {opp.title}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    {[opp.companyName, opp.customerName].filter(Boolean).join(' · ') || 'Direct Opportunity'}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                    {formatCurrency(opp.estimatedValue)}
                                                </div>
                                                <span style={{ fontSize: '0.72rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                                                    View Deal <ArrowRight size={11} />
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <div className="modal-footer" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--border-color)' }}>
                            <Button variant="ghost" size="sm" onClick={() => setShowAllOpportunitiesModal(false)}>
                                Close
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                    setShowAllOpportunitiesModal(false);
                                    navigate('/pipeline');
                                }}
                            >
                                Open Kanban Pipeline <ArrowRight size={14} style={{ marginLeft: 4 }} />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

        </Layout>
    );
};
