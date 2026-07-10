import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { api } from '../lib/api';
import { ArrowLeft, Mail, Phone, Tag, ClipboardX } from 'lucide-react';
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
    notes?: string;
}

export const LeadDetailScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [lead, setLead] = useState<LeadDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
    }, [id, navigate]);

    const deleteLead = async () => {
        if (!id || !window.confirm('Delete this lead?')) return;
        await api.delete(`/api/leads/${id}`);
        navigate('/leads');
    };

    useEffect(() => { fetchLead(); }, [fetchLead]);

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
                        <p>{lead.leadStatusName} · {lead.sourceName ?? 'No source'}</p>
                    </div>
                </div>
                <Button onClick={() => navigate(`/leads/${id}/edit`)} size="sm">Edit</Button>
            </div>

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
                    <Card className="glass-panel">
                        <Card.Content>
                            <h3>Notes</h3>
                            <p>{lead.notes ?? 'No notes yet.'}</p>
                        </Card.Content>
                    </Card>
                </div>
            </div>
        </Layout>
    );
};