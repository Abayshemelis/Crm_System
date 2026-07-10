import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { Plus, Search } from 'lucide-react';
import './screens.css';

interface LeadSummary {
    leadId: number;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    sourceName?: string;
    leadStatusName: string;
}

export const LeadsScreen: React.FC = () => {
    const [leads, setLeads] = useState<LeadSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    const loadLeads = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.get<{ data: LeadSummary[] }>('/api/leads?page=1&pageSize=100');
            setLeads(response.data ?? []);
        } catch {
            // Show empty list on error; do not redirect to login
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadLeads(); }, [loadLeads, location.key]);

    const filteredLeads = leads.filter(lead =>
        `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        (lead.email ?? '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Layout>
            <div className="dashboard-header animate-fade-in">
                <div className="dashboard-title">
                    <h1>Leads</h1>
                    <p>{filteredLeads.length} leads</p>
                </div>
                <Button onClick={() => navigate('/leads/new')}><Plus size={16} style={{ marginRight: 6 }} /> New Lead</Button>
            </div>

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
            </div>

            {isLoading ? (
                <div className="loading-state"><div className="spinner" /><p>Loading leads...</p></div>
            ) : (
                <div className="customers-grid">
                    {filteredLeads.map(lead => (
                        <Card key={lead.leadId} className="customer-card glass-panel animate-fade-in" style={{ cursor: 'pointer' }} onClick={() => navigate(`/leads/${lead.leadId}`)}>
                            <Card.Content>
                                <h3>{lead.firstName} {lead.lastName}</h3>
                                <p>{lead.email ?? 'No email'} · {lead.phone ?? 'No phone'}</p>
                                <p>{lead.sourceName ?? 'No source'} · {lead.leadStatusName}</p>
                            </Card.Content>
                        </Card>
                    ))}
                    {filteredLeads.length === 0 && <div className="loading-state" style={{ gridColumn: '1 / -1' }}><p>No leads found.</p></div>}
                </div>
            )}
        </Layout>
    );
};
