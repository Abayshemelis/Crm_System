import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { api } from '../lib/api';
import { Plus, Search, UserPlus, CheckCircle } from 'lucide-react';
import './screens.css';

interface LeadSummary {
    leadId: number;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    sourceName?: string;
    leadStatusName: string;
    leadStatusId?: number;
}

export const LeadsScreen: React.FC = () => {
    const [leads, setLeads] = useState<LeadSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statuses, setStatuses] = useState<{ id: number; name: string }[]>([]);
    const [selectedStatusId, setSelectedStatusId] = useState<string>('');
    const navigate = useNavigate();
    const location = useLocation();

    const loadLeads = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const statusFilter = selectedStatusId ? `&leadStatusId=${selectedStatusId}` : '';
            const response = await api.get<{ data: LeadSummary[] }>(`/api/leads?page=1&pageSize=100${statusFilter}`);
            setLeads(response.data ?? []);
        } catch {
            setLoadError('Failed to load leads. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedStatusId]);

    useEffect(() => { loadLeads(); }, [loadLeads, location.key]);

    useEffect(() => {
        api.get<{ id: number; name: string }[]>('/api/leadstatuses')
            .then(data => setStatuses(data))
            .catch(() => setStatuses([]));
    }, []);

    const filteredLeads = leads.filter(lead =>
        `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        (lead.email ?? '').toLowerCase().includes(search.toLowerCase())
    );

    const handleConvertClick = (e: React.MouseEvent, leadId: number) => {
        e.stopPropagation();
        navigate(`/leads/${leadId}`);
    };

    // Loading state with skeleton cards
    if (isLoading) {
        return (
            <Layout>
                <div className="dashboard-header animate-fade-in">
                    <div className="dashboard-title">
                        <h1>Leads</h1>
                        <p>Loading leads...</p>
                    </div>
                    <Button disabled><Plus size={16} style={{ marginRight: 6 }} /> New Lead</Button>
                </div>
                <div className="skeleton-grid">
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
                    <p>{filteredLeads.length} leads</p>
                </div>
                <Button onClick={() => navigate('/leads/new')}><Plus size={16} style={{ marginRight: 6 }} /> New Lead</Button>
            </div>

            {loadError && (
                <div className="error-banner animate-fade-in">
                    {loadError}
                </div>
            )}

            <div className="filters-bar animate-fade-in">
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} className="filter-icon" />
                    <input
                        className="filter-input"
                        placeholder="Search leads..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div style={{ marginLeft: '1rem' }}>
                    <select
                        className="filter-input"
                        value={selectedStatusId}
                        onChange={e => setSelectedStatusId(e.target.value)}
                        style={{ minWidth: '150px' }}
                    >
                        <option value="">All Statuses</option>
                        {statuses.map(status => (
                            <option key={status.id} value={status.id}>{status.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="customers-grid">
                {filteredLeads.map(lead => (
                    <Card key={lead.leadId} className="customer-card glass-panel animate-fade-in" style={{ cursor: 'pointer' }} onClick={() => navigate(`/leads/${lead.leadId}`)}>
                        <Card.Content>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <h3>{lead.firstName} {lead.lastName}</h3>
                                    <p>{lead.email ?? 'No email'} · {lead.phone ?? 'No phone'}</p>
                                    <p>{lead.sourceName ?? 'No source'} · {lead.leadStatusName}</p>
                                </div>
                                {lead.leadStatusName === 'Qualified' && (
                                    <Button
                                        size="sm"
                                        onClick={(e) => handleConvertClick(e, lead.leadId)}
                                        style={{ marginLeft: '0.5rem' }}
                                    >
                                        <CheckCircle size={14} style={{ marginRight: 4 }} /> Convert
                                    </Button>
                                )}
                            </div>
                        </Card.Content>
                    </Card>
                ))}
                {filteredLeads.length === 0 && !loadError && (
                    <EmptyState
                        title="No leads found"
                        description="Try adjusting your search, or create a new lead to get started."
                        icon={UserPlus}
                        actionText="New Lead"
                        onActionClick={() => navigate('/leads/new')}
                    />
                )}
            </div>
        </Layout>
    );
};