import React, { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Users, Building2, TrendingUp, Calendar, ArrowRight, LogIn, Shield, Target, DollarSign } from 'lucide-react';
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
}

interface StatCard {
    title: string;
    value: number;
    icon: any;
    color: string;
    path: string;
    description: string;
    footer?: React.ReactNode;
}

interface UserStats {
    totalUsers: number;
    activeUsers: number;
    byRole: Array<{ role: string; count: number; activeCount: number }>;
}

interface OpportunitySummary {
    opportunityId: number;
    stageName?: string;
    actualCloseDate?: string | null;
}

interface CompanySummaryResponse {
    totalCount?: number;
    data?: Array<{ isDeleted?: boolean }>;
}

const countOpenDeals = (opportunities: OpportunitySummary[]) =>
    opportunities.filter((opportunity) => {
        const stageName = (opportunity.stageName ?? '').toLowerCase();
        const isClosed = stageName === 'won' || stageName === 'lost' || !!opportunity.actualCloseDate;
        return !isClosed;
    }).length;

export const DashboardScreen: React.FC = () => {
    const { user, token, isAdmin, userRole } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [filteredStats, setFilteredStats] = useState<FilteredDashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            setIsLoading(false);
            return;
        }
        const fetchStats = async () => {
            try {
                // Fetch filtered stats for SalesRep and Manager
                if (userRole === 'SalesRep' || userRole === 'Manager') {
                    try {
                        const filteredData = await api.get<FilteredDashboardStats>('/api/dashboard/stats');
                        setFilteredStats(filteredData);
                    } catch {
                        setFilteredStats(null);
                    }
                }

                // Admin and Manager still get global stats
                if (isAdmin || userRole === 'Manager') {
                    const [customers, companies, leads, opportunities] = await Promise.all([
                        api.get<{ totalCount?: number }>('/api/customers?page=1&pageSize=1'),
                        api.get<CompanySummaryResponse>('/api/companies?page=1&pageSize=100'),
                        api.get<{ totalCount?: number }>('/api/leads?page=1&pageSize=1'),
                        api.get<OpportunitySummary[]>('/api/opportunities')
                    ]);
                    const createdCompanies = companies.totalCount ?? 0;
                    const activeCompanies = companies.data?.filter((company: { isDeleted?: boolean }) => !company.isDeleted).length ?? 0;
                    setStats({
                        totalCustomers: customers.totalCount ?? 0,
                        totalCompanies: createdCompanies,
                        activeCompanies,
                        createdCompanies,
                        activeLeads: leads.totalCount ?? 0,
                        openDeals: countOpenDeals(opportunities ?? [])
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
    }, [token, location.key, isAdmin, userRole]);

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
                        <span>Created: {stats?.createdCompanies ?? 0}</span>
                        <span>Active: {stats?.activeCompanies ?? 0}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="stat-action" onClick={() => navigate('/companies')}>
                        View all <ArrowRight size={14} />
                    </Button>
                </div>
            )
        },
        {
            title: 'Active Leads',
            value: stats?.activeLeads ?? 0,
            icon: TrendingUp,
            color: '#f59e0b',
            path: '/leads',
            description: 'Prospects in pipeline'
        },
        {
            title: 'Open Deals',
            value: stats?.openDeals ?? 0,
            icon: Calendar,
            color: '#8b5cf6',
            path: '/opportunities',
            description: 'Opportunities in progress'
        },
        {
            title: 'Total Users',
            value: userStats?.totalUsers ?? 0,
            icon: Shield,
            color: '#ec4899',
            path: '/users',
            description: 'Users in system',
            footer: (
                <div className="dashboard-metric-detail">
                    <div className="dashboard-metric-footer">
                        <span>Active: {userStats?.activeUsers ?? 0}</span>
                    </div>
                    {userStats?.byRole && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                            {userStats.byRole.map(r => `${r.role}: ${r.count}`).join(' | ')}
                        </div>
                    )}
                    <Button variant="ghost" size="sm" className="stat-action" onClick={() => navigate('/users')}>
                        Manage <ArrowRight size={14} />
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
                        <span>Created: {stats?.createdCompanies ?? 0}</span>
                        <span>Active: {stats?.activeCompanies ?? 0}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="stat-action" onClick={() => navigate('/companies')}>
                        View all <ArrowRight size={14} />
                    </Button>
                </div>
            )
        },
        {
            title: 'Active Leads',
            value: stats?.activeLeads ?? 0,
            icon: TrendingUp,
            color: '#f59e0b',
            path: '/leads',
            description: 'Prospects in pipeline'
        },
        {
            title: 'Open Deals',
            value: stats?.openDeals ?? 0,
            icon: Calendar,
            color: '#8b5cf6',
            path: '/opportunities',
            description: 'Opportunities in progress'
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
            title: 'My Leads',
            value: filteredStats?.totalLeads ?? 0,
            icon: Target,
            color: '#f59e0b',
            path: '/leads',
            description: 'My pipeline prospects'
        },
        {
            title: 'My Deals',
            value: filteredStats?.openDeals ?? 0,
            icon: DollarSign,
            color: '#8b5cf6',
            path: '/opportunities',
            description: 'My opportunities'
        }
    ];

    const getStatCards = () => {
        if (isAdmin) return adminStatCards;
        if (userRole === 'Manager') return managerStatCards;
        return salesRepStatCards;
    };

    const statCards = getStatCards();

    return (
        <Layout>
            <div className="dashboard-header animate-fade-in">
                <div className="dashboard-title">
                    <h1>Dashboard</h1>
                    <p>Welcome{user ? ' back,' : ''}{user?.name ? ` ${user.name}.` : ' to CRM Pro.'} Here's your {isAdmin ? 'system' : userRole === 'Manager' ? 'team' : 'personal'} overview.</p>
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
                    >
                        <Card.Content>
                            <div className="stat-header">
                                <div className="stat-icon" style={{ color: card.color }}>
                                    {React.createElement(card.icon, { size: 24 })}
                                </div>
                                <div className="stat-value">{isLoading ? '—' : card.value}</div>
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
                                    onClick={() => navigate(card.path)}
                                    disabled={!user}
                                >
                                    View all <ArrowRight size={14} />
                                </Button>
                            )}
                        </Card.Content>
                    </Card>
                ))}
            </div>

        </Layout>
    );
};
