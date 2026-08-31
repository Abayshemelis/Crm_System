import React, { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
    Users, TrendingUp, ArrowRight, Target, DollarSign, X, CheckCircle,
    Clock, Plus, Activity, Zap, CheckCircle2, AlertTriangle, Layers,
    Search, History, Receipt, ShieldCheck, Landmark,
    ArrowUpRight, RefreshCw, Sparkles, Building2, ChevronRight, Eye
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFormatCurrency } from '../context/SystemProfileContext';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    BarChart, Bar, CartesianGrid
} from 'recharts';
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
    totalInvoiced?: number;
    totalCollected?: number;
    totalReceivable?: number;
    overdueInvoicesCount?: number;
    pendingWireCount?: number;
    activeContractsCount?: number;
    totalContractValue?: number;
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
    badgeColor?: string;
    badgeText?: string;
    path: string;
    description: string;
    subtext?: string;
    format?: 'currency' | 'percentage' | 'number';
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

export const DashboardScreen: React.FC = () => {
    const { formatCurrency } = useFormatCurrency();
    const { user, token, isAdmin, selectedRole } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [filteredStats, setFilteredStats] = useState<FilteredDashboardStats | null>(null);
    const [includeClosed, setIncludeClosed] = useState<boolean>(false);
    const [taskGroups, setTaskGroups] = useState<TaskGroupedDto>({ overdue: [], dueToday: [], upcoming: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [chartMode, setChartMode] = useState<'area' | 'bar'>('area');
    const [selectedKpiCard, setSelectedKpiCard] = useState<StatCard | null>(null);
    const [showAllActivitiesModal, setShowAllActivitiesModal] = useState<boolean>(false);
    const [activitySearch, setActivitySearch] = useState<string>('');
    const [activityTypeFilter, setActivityTypeFilter] = useState<string>('All');
    const [activeActionTab, setActiveActionTab] = useState<'overdue' | 'dueToday' | 'upcoming' | 'activity'>('overdue');

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedKpiCard(null);
                setShowAllActivitiesModal(false);
            }
        };
        if (selectedKpiCard || showAllActivitiesModal) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedKpiCard, showAllActivitiesModal]);

    const fetchStats = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const url = `/api/dashboard/stats${includeClosed ? '?includeClosed=true' : ''}`;
            const [filteredData, taskGroupsRes] = await Promise.all([
                api.get<FilteredDashboardStats>(url).catch(() => null),
                api.get<TaskGroupedDto>('/api/tasks/my').catch(() => ({ overdue: [], dueToday: [], upcoming: [] }))
            ]);

            setFilteredStats(filteredData);
            setTaskGroups(taskGroupsRes);

            if (isAdmin || selectedRole === 'Manager') {
                const [customers, companiesFull, leads] = await Promise.all([
                    api.get<{ totalCount?: number }>('/api/customers?page=1&pageSize=1').catch(() => ({ totalCount: 0 })),
                    api.get<CompanySummaryResponse>('/api/companies?page=1&pageSize=100').catch(() => ({ totalCount: 0, data: [] })),
                    api.get<{ totalCount?: number }>('/api/leads?page=1&pageSize=1').catch(() => ({ totalCount: 0 }))
                ]);
                const createdCompanies = companiesFull.totalCount ?? 0;
                const activeCompanies = companiesFull.data?.filter((c: { isDeleted?: boolean }) => !c.isDeleted).length ?? 0;
                setStats({
                    totalCustomers: customers.totalCount ?? 0,
                    totalCompanies: createdCompanies,
                    activeCompanies,
                    createdCompanies,
                    activeLeads: leads.totalCount ?? 0,
                    openDeals: filteredData?.openDeals ?? 0
                });
            }
        } catch {
            // Keep state intact
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [token, location.key, isAdmin, selectedRole, includeClosed]);

    // Financial & Pipeline Calculations
    const revenueVal = filteredStats?.totalRevenue ?? filteredStats?.totalCollected ?? 0;
    const invoicedVal = filteredStats?.totalInvoiced ?? 0;
    const receivableVal = filteredStats?.totalReceivable ?? 0;
    const pendingWires = filteredStats?.pendingWireCount ?? 0;
    const overdueInvoices = filteredStats?.overdueInvoicesCount ?? 0;
    const activeContracts = filteredStats?.activeContractsCount ?? 0;
    const contractVal = filteredStats?.totalContractValue ?? 0;

    // 5 High-Impact Modern Executive KPI Cards
    const statCards: StatCard[] = [
        {
            title: 'Revenue Collected',
            value: revenueVal,
            icon: DollarSign,
            color: '#10b981',
            badgeColor: 'rgba(16, 185, 129, 0.15)',
            badgeText: 'Settled Funds',
            path: '/payments',
            description: 'Total verified funds collected into company accounts.',
            subtext: `Invoiced: ${formatCurrency(invoicedVal)}`,
            format: 'currency'
        },
        {
            title: 'Active Pipeline Value',
            value: filteredStats?.pipelineValue ?? 0,
            icon: TrendingUp,
            color: '#6366f1',
            badgeColor: 'rgba(99, 102, 241, 0.15)',
            badgeText: `${filteredStats?.openDeals ?? 0} Deals Open`,
            path: '/pipeline',
            description: 'Total estimated value of current active pipeline opportunities.',
            subtext: `Avg Deal: ${formatCurrency(filteredStats?.averageDealSize ?? 0)}`,
            format: 'currency'
        },
        {
            title: 'Billing & Receivables',
            value: receivableVal,
            icon: Receipt,
            color: receivableVal > 0 ? '#f59e0b' : '#10b981',
            badgeColor: pendingWires > 0 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(245, 158, 11, 0.15)',
            badgeText: pendingWires > 0 ? `🏦 ${pendingWires} Wire Pending` : (overdueInvoices > 0 ? `⚠️ ${overdueInvoices} Overdue` : 'Clear Balance'),
            path: '/invoices',
            description: 'Outstanding invoice balance due from customers awaiting payment.',
            subtext: `Total Billed: ${formatCurrency(invoicedVal)}`,
            format: 'currency'
        },
        {
            title: 'Lead Funnel & SLA',
            value: filteredStats?.totalLeads ?? stats?.activeLeads ?? 0,
            icon: Target,
            color: '#ec4899',
            badgeColor: 'rgba(236, 72, 153, 0.15)',
            badgeText: `Win Rate: ${filteredStats?.conversionRate ?? 100}%`,
            path: '/leads',
            description: 'Active prospects currently in the sales intake pipeline.',
            subtext: `Converted: ${filteredStats?.convertedLeadsCount ?? 0} accounts`,
            format: 'number'
        },
        {
            title: 'Active Contracts',
            value: activeContracts > 0 ? activeContracts : (stats?.totalCustomers ?? filteredStats?.totalCustomers ?? 0),
            icon: ShieldCheck,
            color: '#3b82f6',
            badgeColor: 'rgba(59, 130, 246, 0.15)',
            badgeText: activeContracts > 0 ? `${formatCurrency(contractVal)} Value` : 'Clients',
            path: '/contracts',
            description: 'Active commercial agreements and customer client accounts.',
            subtext: `${stats?.totalCustomers ?? filteredStats?.totalCustomers ?? 0} active clients`,
            format: 'number'
        }
    ];

    // Deal Forecast Probability
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

    // Chart Data Preparation
    const rawChartData = filteredStats?.revenueByMonth ?? [];
    const formattedChartData = rawChartData.map(item => {
        const [year, month] = (item.month || '').split('-');
        const dateObj = year && month ? new Date(Number(year), Number(month) - 1, 1) : new Date();
        return {
            month: dateObj.toLocaleDateString(undefined, { month: 'short' }),
            fullMonth: item.month,
            revenue: item.revenue || 0
        };
    });

    return (
        <Layout>
            {/* 1. EXECUTIVE WELCOME & COMMAND HUB */}
            <div className="crm-exec-hero-banner animate-fade-in">
                <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                            Executive Command Center
                        </h1>
                        <span className="crm-exec-role-pill">
                            <Zap size={13} /> {selectedRole === 'Admin' ? 'System Administrator' : selectedRole === 'Manager' ? 'Sales Manager' : 'Sales Representative'}
                        </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        Welcome back, <strong>{user?.name || 'Executive'}</strong>. Unified revenue analytics, billing collections, and pipeline intelligence.
                    </p>
                </div>

                {/* Quick Action Buttons */}
                <div className="crm-exec-actions-bar">
                    <button onClick={() => navigate('/leads/new')} className="crm-exec-action-btn lead-btn" title="Create New Lead">
                        <Plus size={14} /> New Lead
                    </button>
                    <button onClick={() => navigate('/pipeline/new')} className="crm-exec-action-btn deal-btn" title="Create New Opportunity">
                        <Layers size={14} /> New Deal
                    </button>
                    <button onClick={() => navigate('/invoices/new')} className="crm-exec-action-btn invoice-btn" title="Create Commercial Invoice">
                        <Receipt size={14} /> Issue Invoice
                    </button>
                    <button onClick={() => navigate('/reports')} className="crm-exec-action-btn report-btn" title="Open Complete Analytics Suite">
                        <Sparkles size={14} /> Full Reports
                    </button>

                    <label className="crm-exec-toggle-label" title="Include won & closed deals in calculations">
                        <input
                            type="checkbox"
                            checked={includeClosed}
                            onChange={(e) => setIncludeClosed(e.target.checked)}
                            style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                        />
                        <span>Include Won</span>
                    </label>

                    <button onClick={fetchStats} className="crm-exec-icon-refresh" title="Refresh Live Data">
                        <RefreshCw size={15} />
                    </button>
                </div>
            </div>

            {/* 2. MODERN EXECUTIVE KPI BENTO GRID */}
            <div className="crm-exec-kpi-grid animate-fade-in">
                {statCards.map((card, idx) => (
                    <div
                        key={card.title}
                        className="crm-exec-kpi-card"
                        onClick={() => setSelectedKpiCard(card)}
                        style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {card.title}
                            </span>
                            <div className="crm-exec-kpi-icon-wrap" style={{ color: card.color, background: `rgba(255,255,255,0.04)` }}>
                                {React.createElement(card.icon, { size: 18 })}
                            </div>
                        </div>

                        <div className="crm-exec-kpi-value" style={{ color: 'var(--text-primary)' }}>
                            {isLoading ? '—' : card.format === 'currency' ? formatCurrency(card.value) : card.value}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {card.subtext}
                            </span>
                            {card.badgeText && (
                                <span className="crm-exec-kpi-badge" style={{ background: card.badgeColor, color: card.color }}>
                                    {card.badgeText}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* 3. INTERACTIVE ANALYTICS & PIPELINE INTELLIGENCE ROW */}
            <div className="crm-exec-analytics-row animate-fade-in">
                
                {/* 6-Month Revenue & Cash Flow Trends Chart */}
                <div className="crm-exec-chart-panel">
                    <div className="crm-exec-panel-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                Revenue &amp; Collections Velocity
                            </h2>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <button
                                onClick={() => setChartMode('area')}
                                className={`crm-exec-chart-toggle ${chartMode === 'area' ? 'active' : ''}`}
                            >
                                Trend Area
                            </button>
                            <button
                                onClick={() => setChartMode('bar')}
                                className={`crm-exec-chart-toggle ${chartMode === 'bar' ? 'active' : ''}`}
                            >
                                Monthly Bars
                            </button>
                            <button
                                onClick={() => navigate('/reports/payments')}
                                className="crm-exec-chart-link-btn"
                                title="Open Full Financial Report"
                            >
                                <ArrowUpRight size={14} />
                            </button>
                        </div>
                    </div>

                    <div style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>6-Month Total Settled</span>
                                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981' }}>
                                    {formatCurrency(formattedChartData.reduce((acc, curr) => acc + curr.revenue, 0))}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Accounts Receivable</span>
                                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: receivableVal > 0 ? '#f59e0b' : '#10b981' }}>
                                    {formatCurrency(receivableVal)}
                                </div>
                            </div>
                        </div>

                        <div style={{ height: 210, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                {chartMode === 'area' ? (
                                    <AreaChart data={formattedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                        <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                                        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`} />
                                        <Tooltip
                                            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '0.82rem' }}
                                            formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Revenue']}
                                        />
                                        <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#revenueGrad)" />
                                    </AreaChart>
                                ) : (
                                    <BarChart data={formattedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                        <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                                        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`} />
                                        <Tooltip
                                            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '0.82rem' }}
                                            formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Revenue']}
                                        />
                                        <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Pipeline Stage Distribution & AI Forecast */}
                <div className="crm-exec-chart-panel">
                    <div className="crm-exec-panel-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Zap size={16} style={{ color: '#8b5cf6' }} />
                            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                Pipeline Flow &amp; AI Deal Forecast
                            </h2>
                        </div>
                        <button onClick={() => navigate('/pipeline')} className="crm-exec-chart-link-btn" title="Open Pipeline Kanban">
                            <ArrowRight size={14} />
                        </button>
                    </div>

                    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(139, 92, 246, 0.08)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: '#a78bfa', textTransform: 'uppercase', fontWeight: 700 }}>Weighted Probability Win</span>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#c4b5fd' }}>
                                    {formatCurrency(predictedWeightedRevenue > 0 ? predictedWeightedRevenue : (filteredStats?.pipelineValue ?? 0) * 0.75)}
                                </div>
                            </div>
                            <span style={{ fontSize: '0.78rem', color: '#a78bfa', fontWeight: 700 }}>
                                {filteredStats?.openDeals ?? 0} Live Deals
                            </span>
                        </div>

                        {/* Pipeline Stages Progress Bar */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            {['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won'].map((stageName, idx) => {
                                const stageOpps = openOpportunities.filter(o => (o.stageName || '').toLowerCase().includes(stageName.toLowerCase()));
                                const count = stageOpps.length;
                                const stageColors = ['#94a3b8', '#38bdf8', '#818cf8', '#f59e0b', '#10b981'];
                                const pct = openOpportunities.length > 0 ? Math.round((count / openOpportunities.length) * 100) : (idx === 0 ? 30 : idx === 1 ? 25 : idx === 2 ? 20 : idx === 3 ? 15 : 10);

                                return (
                                    <div key={stageName} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ width: '80px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            {stageName}
                                        </span>
                                        <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${Math.max(6, pct)}%`, height: '100%', background: stageColors[idx], borderRadius: '4px', transition: 'width 0.4s ease' }} />
                                        </div>
                                        <span style={{ width: '35px', textAlign: 'right', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {count}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. FINANCIAL COMMAND, STRATEGIC DEALS & ACTION CENTER (3-COLUMN BENTO) */}
            <div className="crm-exec-bottom-bento animate-fade-in">

                {/* Column 1: Financial & Billing Hub */}
                <div className="crm-exec-bento-panel">
                    <div className="crm-exec-panel-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Receipt size={16} style={{ color: '#06b6d4' }} />
                            <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                Invoicing &amp; Bank Collections
                            </h2>
                        </div>
                        <button onClick={() => navigate('/invoices')} className="crm-exec-chart-link-btn" title="View Invoices">
                            <ArrowRight size={14} />
                        </button>
                    </div>

                    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Financial Metrics Split */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Invoiced</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                                    {formatCurrency(invoicedVal)}
                                </div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unpaid Due</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: receivableVal > 0 ? '#f59e0b' : '#10b981', marginTop: '0.2rem' }}>
                                    {formatCurrency(receivableVal)}
                                </div>
                            </div>
                        </div>

                        {/* Pending Wire Transfers Warning / Alert */}
                        {pendingWires > 0 ? (
                            <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #0284c7', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8' }}>
                                        🏦 {pendingWires} Bank Wire{pendingWires > 1 ? 's' : ''} Pending
                                    </div>
                                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                        Awaiting accounting verification
                                    </div>
                                </div>
                                <Button size="sm" onClick={() => navigate('/payments')} style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}>
                                    Verify Wire
                                </Button>
                            </div>
                        ) : overdueInvoices > 0 ? (
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ef4444' }}>
                                        ⚠️ {overdueInvoices} Overdue Invoice{overdueInvoices > 1 ? 's' : ''}
                                    </div>
                                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                        Requires payment request follow-up
                                    </div>
                                </div>
                                <Button size="sm" variant="secondary" onClick={() => navigate('/invoices')} style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}>
                                    View Invoices
                                </Button>
                            </div>
                        ) : (
                            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                                <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                                    All bank settlements and invoices up to date.
                                </div>
                            </div>
                        )}

                        {/* Quick Invoicing Actions */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => navigate('/invoices/new')}
                                style={{ flex: 1, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                            >
                                <Plus size={13} /> New Invoice
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => navigate('/payments')}
                                style={{ flex: 1, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                            >
                                <Landmark size={13} /> Payment Log
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Column 2: Top High-Value Deals Matrix */}
                <div className="crm-exec-bento-panel">
                    <div className="crm-exec-panel-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Layers size={16} style={{ color: '#6366f1' }} />
                            <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                Strategic Opportunities
                            </h2>
                        </div>
                        <button onClick={() => navigate('/opportunities')} className="crm-exec-chart-link-btn" title="View All Opportunities">
                            <ArrowRight size={14} />
                        </button>
                    </div>

                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {openOpportunities.length > 0 ? (
                            openOpportunities.slice(0, 4).map((opp) => {
                                const stage = (opp.stageName || '').toLowerCase();
                                const prob = stage.includes('won') ? 100 : stage.includes('negotiat') ? 85 : stage.includes('proposal') ? 65 : 45;
                                return (
                                    <div
                                        key={opp.opportunityId}
                                        onClick={() => navigate(`/opportunities/${opp.opportunityId}`)}
                                        className="crm-exec-opp-row"
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {opp.title}
                                            </div>
                                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {opp.companyName ? `🏢 ${opp.companyName} · ` : ''}{opp.customerName || 'Direct Deal'}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#6366f1' }}>
                                                {formatCurrency(opp.estimatedValue)}
                                            </div>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: prob >= 70 ? '#10b981' : '#f59e0b' }}>
                                                {prob}% win prob
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="executive-panel-empty">
                                <Layers size={22} style={{ color: 'var(--text-muted)', marginBottom: '0.35rem' }} />
                                <div>No open deals in pipeline.</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 3: Action Center & Live Activity Feed */}
                <div className="crm-exec-bento-panel">
                    <div className="crm-exec-panel-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Activity size={16} style={{ color: '#f59e0b' }} />
                            <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                Action Center &amp; Schedule
                            </h2>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <button onClick={() => navigate('/tasks/new')} className="crm-exec-chart-link-btn" title="Create New Task">
                                <Plus size={14} />
                            </button>
                            {filteredStats?.recentActivities && filteredStats.recentActivities.length > 0 && (
                                <button onClick={() => setShowAllActivitiesModal(true)} className="crm-exec-chart-link-btn" title="View Full Activity Stream">
                                    <History size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {/* 4 Interactive Tab Switcher */}
                        <div className="executive-tabs">
                            <button className={`exec-tab ${activeActionTab === 'overdue' ? 'active' : ''}`} onClick={() => setActiveActionTab('overdue')}>
                                Overdue {taskGroups.overdue.length > 0 && <span className="exec-badge danger">{taskGroups.overdue.length}</span>}
                            </button>
                            <button className={`exec-tab ${activeActionTab === 'dueToday' ? 'active' : ''}`} onClick={() => setActiveActionTab('dueToday')}>
                                Today {taskGroups.dueToday.length > 0 && <span className="exec-badge warning">{taskGroups.dueToday.length}</span>}
                            </button>
                            <button className={`exec-tab ${activeActionTab === 'upcoming' ? 'active' : ''}`} onClick={() => setActiveActionTab('upcoming')}>
                                Next {taskGroups.upcoming.length > 0 && <span className="exec-badge info">{taskGroups.upcoming.length}</span>}
                            </button>
                            <button className={`exec-tab ${activeActionTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveActionTab('activity')}>
                                Activity
                            </button>
                        </div>

                        {/* Task List / Activity Stream Content */}
                        <div className="executive-scrollable" style={{ maxHeight: '200px' }}>
                            {activeActionTab === 'activity' ? (
                                filteredStats?.recentActivities && filteredStats.recentActivities.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                        {filteredStats.recentActivities.slice(0, 5).map((act) => (
                                            <div
                                                key={act.activityId}
                                                className="crm-exec-task-row"
                                                onClick={() => {
                                                    if (act.opportunityId) navigate(`/opportunities/${act.opportunityId}`);
                                                    else if (act.customerId) navigate(`/customers/${act.customerId}`);
                                                    else navigate('/leads');
                                                }}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}
                                            >
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {act.subject || act.description || 'Activity'}
                                                    </div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {act.customerName || act.opportunityTitle || 'Client'}
                                                    </div>
                                                </div>
                                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                                                    {new Date(act.activityDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="executive-panel-empty" style={{ height: 120 }}>
                                        <Activity size={18} style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }} />
                                        <div>No recent activity recorded.</div>
                                    </div>
                                )
                            ) : (activeActionTab === 'overdue' ? taskGroups.overdue : activeActionTab === 'dueToday' ? taskGroups.dueToday : taskGroups.upcoming).length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                    {(activeActionTab === 'overdue' ? taskGroups.overdue : activeActionTab === 'dueToday' ? taskGroups.dueToday : taskGroups.upcoming).map((task) => (
                                        <div
                                            key={task.crmTaskId}
                                            className="crm-exec-task-row"
                                            onClick={() => navigate('/tasks')}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}
                                        >
                                            <button
                                                type="button"
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    setTaskGroups(prev => ({
                                                        overdue: prev.overdue.filter(t => t.crmTaskId !== task.crmTaskId),
                                                        dueToday: prev.dueToday.filter(t => t.crmTaskId !== task.crmTaskId),
                                                        upcoming: prev.upcoming.filter(t => t.crmTaskId !== task.crmTaskId)
                                                    }));
                                                    try {
                                                        await api.patch(`/api/tasks/${task.crmTaskId}/complete`, { completionNote: 'Completed via Executive Action Center' });
                                                    } catch {
                                                        fetchStats();
                                                    }
                                                }}
                                                className="crm-exec-task-checkbox"
                                                title="Mark Complete"
                                            >
                                                <CheckCircle2 size={15} />
                                            </button>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {task.title}
                                                </div>
                                                {task.description && (
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {task.description}
                                                    </div>
                                                )}
                                            </div>

                                            <span style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                padding: '0.12rem 0.4rem',
                                                borderRadius: '4px',
                                                background: activeActionTab === 'overdue' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255,255,255,0.05)',
                                                color: activeActionTab === 'overdue' ? '#ef4444' : 'var(--text-secondary)',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="executive-panel-empty" style={{ height: 120 }}>
                                    <CheckCircle size={20} style={{ color: '#10b981', marginBottom: '0.35rem' }} />
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>All clear for {activeActionTab}!</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No pending tasks in this view.</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* 5. STANDARD DETAIL MODAL POPUP FOR KPI CARDS */}
            {selectedKpiCard && (
                <div className="modal-overlay" onClick={() => setSelectedKpiCard(null)}>
                    <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px' }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className="stat-icon" style={{ color: selectedKpiCard.color }}>
                                    {React.createElement(selectedKpiCard.icon, { size: 24 })}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>{selectedKpiCard.title}</h3>
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
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Current Value</span>
                                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: selectedKpiCard.color }}>
                                        {isLoading ? '—' : selectedKpiCard.format === 'currency' ? formatCurrency(selectedKpiCard.value) : selectedKpiCard.value}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Status</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>Live Synchronized</span>
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
                                View Module <ArrowRight size={14} style={{ marginLeft: 4 }} />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. ALL RECENT ACTIVITIES MODAL */}
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
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Complete Activity Feed</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        Recent customer, deal, and lead interactions
                                    </p>
                                </div>
                            </div>
                            <button className="icon-btn" onClick={() => setShowAllActivitiesModal(false)} aria-label="Close modal">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="text"
                                    placeholder="Filter by subject, customer, deal..."
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
                            </div>

                            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {filteredStats.recentActivities
                                    .filter(a => !activitySearch || (a.subject || '').toLowerCase().includes(activitySearch.toLowerCase()) || (a.customerName || '').toLowerCase().includes(activitySearch.toLowerCase()))
                                    .map(activity => (
                                        <div
                                            key={activity.activityId}
                                            className="crm-exec-opp-row"
                                            onClick={() => {
                                                setShowAllActivitiesModal(false);
                                                if (activity.opportunityId) navigate(`/opportunities/${activity.opportunityId}`);
                                                else if (activity.customerId) navigate(`/customers/${activity.customerId}`);
                                                else navigate('/leads');
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                                    {activity.subject || activity.description || 'Customer Activity'}
                                                </div>
                                                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                                    {[activity.customerName, activity.opportunityTitle].filter(Boolean).join(' · ')}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                {new Date(activity.activityDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};
