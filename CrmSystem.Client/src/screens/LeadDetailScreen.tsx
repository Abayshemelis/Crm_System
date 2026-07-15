import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { LeadConvertModal } from '../components/ui/LeadConvertModal';
import { AuditHistory } from '../components/audit/AuditHistory';
import { api } from '../lib/api';
import { ArrowLeft, Mail, Phone, Tag, ClipboardX, CheckCircle, History } from 'lucide-react';
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
}

type TabId = 'details' | 'audit';

export const LeadDetailScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [lead, setLead] = useState<LeadDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('details');
    const [statuses, setStatuses] = useState<{ id: number; name: string }[]>([]);
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [editingStatusId, setEditingStatusId] = useState<string>('');
    const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);

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
    }, []);

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
                                        {statuses.map(status => (
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
                    <Button onClick={() => navigate(`/leads/${id}/edit`)} size="sm">Edit</Button>
                </div>
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
                    <div className="tabs-bar">
                        {(['details', 'audit'] as TabId[]).map(tab => (
                            <button key={tab} className={`tab-btn ${activeTab === tab ? 'tab-active' : ''}`} onClick={() => setActiveTab(tab)}>
                                {tab === 'details' && <span>Details</span>}
                                {tab === 'audit' && <span><History size={14} style={{ marginRight: 4 }} /> Audit History</span>}
                            </button>
                        ))}
                    </div>

                    <Card className="glass-panel">
                        <Card.Content>
                            {activeTab === 'details' ? (
                                <>
                                    <h3>Contact Information</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Email</p>
                                            <p>{lead.email ?? 'No email'}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Phone</p>
                                            <p>{lead.phone ?? 'No phone'}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Company</p>
                                            <p>{lead.companyName ?? 'No company'}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Job Title</p>
                                            <p>{lead.jobTitle ?? 'No job title'}</p>
                                        </div>
                                    </div>
                                    <h3>Additional Information</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Status</p>
                                            <p>{lead.leadStatusName}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Source</p>
                                            <p>{lead.sourceName ?? 'No source'}</p>
                                        </div>
                                    </div>
                                    <h3>Notes</h3>
                                    <p>{lead.notes ?? 'No notes yet.'}</p>
                                </>
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
        </Layout>
    );
};