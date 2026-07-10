import React, { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Users, Building2, TrendingUp, Calendar, ArrowRight, LogIn } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import './screens.css';

interface DashboardStats {
    totalCustomers: number;
    totalCompanies: number;
    activeLeads: number;
    openDeals: number;
}

export const DashboardScreen: React.FC = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            setIsLoading(false);
            return;
        }
        const fetchStats = async () => {
            try {
                const [customers, companies, leads] = await Promise.all([
                    api.get<{ totalCount: number }>('/api/customers?page=1&pageSize=1'),
                    api.get<{ totalCount: number }>('/api/companies?page=1&pageSize=1'),
                    api.get<{ totalCount: number }>('/api/leads?page=1&pageSize=1')
                ]);
                setStats({
                    totalCustomers: customers.totalCount ?? 0,
                    totalCompanies: companies.totalCount ?? 0,
                    activeLeads: leads.totalCount ?? 0,
                    openDeals: 0
                });
            } catch {
                // Use default values on error
                setStats({
                    totalCustomers: 0,
                    totalCompanies: 0,
                    activeLeads: 0,
                    openDeals: 0
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, [token, location.key]);

    const statCards = [
        {
            title: 'Total Customers',
            value: stats?.totalCustomers ?? 0,
            icon: Users,
            color: 'var(--accent-primary)',
            path: '/customers',
            description: 'Active contacts in your CRM'
        },
        {
            title: 'Total Companies',
            value: stats?.totalCompanies ?? 0,
            icon: Building2,
            color: 'var(--success)',
            path: '/companies',
            description: 'B2B accounts managed'
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

    return (
        <Layout>
            <div className="dashboard-header animate-fade-in">
                <div className="dashboard-title">
                    <h1>Dashboard</h1>
                    <p>Welcome{user ? ' back,' : ''}{user?.name ? ` ${user.name}.` : ' to CRM Pro.'} Here's your CRM overview.</p>
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
                                    <card.icon size={24} />
                                </div>
                                <div className="stat-value">{isLoading ? '—' : card.value}</div>
                            </div>
                            <div className="stat-info">
                                <h3>{card.title}</h3>
                                <p>{card.description}</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="stat-action"
                                onClick={() => navigate(card.path)}
                                disabled={!user}
                            >
                                View all <ArrowRight size={14} />
                            </Button>
                        </Card.Content>
                    </Card>
                ))}
            </div>

        </Layout>
    );
};
