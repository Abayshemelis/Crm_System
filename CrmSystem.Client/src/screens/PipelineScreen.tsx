import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DatePicker } from '../components/ui/DatePicker';
import { DateRangePicker } from '../components/ui/DateRangePicker';
import { OpportunityDetailPanel } from '../components/ui/OpportunityDetailPanel';
import { OpportunityCreateModal } from '../components/ui/OpportunityCreateModal';
import { api } from '../lib/api';
import { Plus, Filter, Search, X, Calendar } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { getExpectedCloseDateStatus } from '../lib/dateUtils';
import './screens.css';

interface Opportunity {
    opportunityId: number;
    customerId: number;
    customerFirstName: string;
    customerLastName: string;
    companyName?: string;
    title: string;
    opportunityStageId: number;
    stageName: string;
    estimatedValue: number;
    expectedCloseDate?: string;
    ownerId: number;
    ownerName: string;
    createdAt: string;
    updatedAt?: string;
}

interface OpportunityStage {
    opportunityStageId: number;
    name: string;
    sortOrder: number;
    isWon: boolean;
    isLost: boolean;
}

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
}

export const PipelineScreen: React.FC = () => {
    const navigate = useNavigate();
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [stages, setStages] = useState<OpportunityStage[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [dateFilterField, setDateFilterField] = useState<'created' | 'expectedClose'>('created');

    const [search, setSearch] = useState('');
    const [draggedOpportunity, setDraggedOpportunity] = useState<Opportunity | null>(null);
    const [selectedOpportunity, setSelectedOpportunity] = useState<number | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const loadOpportunities = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedCustomerId) params.append('customerId', selectedCustomerId);
            if (selectedCompanyId) params.append('companyId', selectedCompanyId);
            if (startDate) {
                if (dateFilterField === 'expectedClose') params.append('expectedCloseDateFrom', startDate);
                else params.append('createdDateFrom', startDate);
            }
            if (endDate) {
                if (dateFilterField === 'expectedClose') params.append('expectedCloseDateTo', endDate);
                else params.append('createdDateTo', endDate);
            }

            const queryString = params.toString();
            const url = queryString ? `/api/opportunities?${queryString}` : '/api/opportunities';

            const [oppData, stageData, userData, custData, compData] = await Promise.all([
                api.get<Opportunity[]>(url),
                api.get<OpportunityStage[]>('/api/opportunitystages'),
                api.get<User[]>('/api/users'),
                api.get<{ data: any[] }>('/api/customers?page=1&pageSize=1000'),
                api.get<{ data: any[] }>('/api/companies?page=1&pageSize=1000')
            ]);
            setOpportunities(oppData);
            setStages(stageData.sort((a, b) => a.sortOrder - b.sortOrder));
            setUsers(userData ?? []);
            setCustomers(custData.data ?? []);
            setCompanies(compData.data ?? []);
        } catch (error) {
            console.error('Failed to load pipeline data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedCustomerId, selectedCompanyId, startDate, endDate, dateFilterField]);

    useEffect(() => {
        loadOpportunities();
    }, [loadOpportunities]);

    const filteredOpportunities = opportunities.filter(opp => {
        if (!search.trim()) return true;
        const term = search.toLowerCase().trim();
        const firstName = (opp.customerFirstName || '').toLowerCase();
        const lastName = (opp.customerLastName || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        const company = (opp.companyName || '').toLowerCase();
        const title = (opp.title || '').toLowerCase();
        const owner = (opp.ownerName || '').toLowerCase();
        const stage = (opp.stageName || '').toLowerCase();

        return (
            fullName.includes(term) ||
            firstName.includes(term) ||
            lastName.includes(term) ||
            company.includes(term) ||
            title.includes(term) ||
            owner.includes(term) ||
            stage.includes(term)
        );
    });

    const handleStageChange = async (opportunityId: number, newStageId: number) => {
        try {
            await api.patch(`/api/opportunities/${opportunityId}/stage`, { stageId: newStageId });
            await loadOpportunities();
        } catch (error) {
            console.error('Failed to update stage:', error);
            await loadOpportunities();
            const event = new CustomEvent('app:toast', {
                detail: { message: 'Failed to update stage. Please try again.', type: 'error' as const }
            });
            window.dispatchEvent(event);
        }
    };

    const handleDragStart = (e: React.DragEvent, opportunity: Opportunity) => {
        setIsDragging(true);
        setDraggedOpportunity(opportunity);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', opportunity.opportunityId.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetStageId: number) => {
        e.preventDefault();
        setIsDragging(false);
        if (!draggedOpportunity || draggedOpportunity.opportunityStageId === targetStageId) {
            setDraggedOpportunity(null);
            return;
        }

        const updatedOpportunities = opportunities.map(opp =>
            opp.opportunityId === draggedOpportunity.opportunityId
                ? { ...opp, opportunityStageId: targetStageId }
                : opp
        );
        setOpportunities(updatedOpportunities);

        await handleStageChange(draggedOpportunity.opportunityId, targetStageId);
        setDraggedOpportunity(null);
    };

    const handleDragEnd = () => {
        setDraggedOpportunity(null);
        setIsDragging(false);
    };

    const handleCardClick = (opportunityId: number) => {
        if (!isDragging) {
            navigate(`/opportunities/${opportunityId}`);
        }
    };

    const getOpportunitiesByStage = (stageId: number) => {
        return filteredOpportunities.filter(opp => opp.opportunityStageId === stageId);
    };

    const getStageTotal = (stageId: number) => {
        return getOpportunitiesByStage(stageId).reduce((sum, opp) => sum + opp.estimatedValue, 0);
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="dashboard-header animate-fade-in">
                    <div className="dashboard-title"><h1>Pipeline</h1><p>Loading opportunities…</p></div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} style={{ minWidth: 260, flex: '0 0 260px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <Skeleton variant="rect" height={36} style={{ borderRadius: '8px', animationDelay: `${i * 0.08}s` }} />
                            {Array.from({ length: 3 }).map((__, j) => (
                                <Skeleton key={j} variant="card" style={{ animationDelay: `${(i + j) * 0.06}s` }} />
                            ))}
                        </div>
                    ))}
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="dashboard-header animate-fade-in">
                <div className="dashboard-title">
                    <h1>Pipeline</h1>
                    <p>{filteredOpportunities.length} {filteredOpportunities.length === 1 ? 'opportunity' : 'opportunities'}</p>
                </div>
                <Button onClick={() => navigate('/pipeline/new')}>
                    <Plus size={16} style={{ marginRight: 6 }} /> New Opportunity
                </Button>
            </div>

            <div className="filters-bar customer-filters animate-fade-in" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
                    <Search size={16} className="filter-icon" />
                    <input
                        className="filter-input"
                        placeholder="Search pipeline..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', zIndex: 1 }}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
                <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 0 }}>
                    <SearchableSelect
                        value={selectedCustomerId}
                        onChange={val => setSelectedCustomerId(String(val))}
                        options={[
                            { value: '', label: 'All Customers' },
                            ...customers.map(c => ({
                                value: String(c.customerId),
                                label: `${c.firstName} ${c.lastName}`
                            }))
                        ]}
                    />
                </div>
                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                    <SearchableSelect
                        value={selectedCompanyId}
                        onChange={val => setSelectedCompanyId(String(val))}
                        options={[
                            { value: '', label: 'All Companies' },
                            ...companies.map(c => ({
                                value: String(c.companyId),
                                label: c.name
                            }))
                        ]}
                    />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '140px' }}>
                        <SearchableSelect
                            value={dateFilterField}
                            onChange={val => setDateFilterField(String(val) as any)}
                            options={[
                                { value: 'expectedClose', label: 'Expected Close' },
                                { value: 'created', label: 'Created Date' }
                            ]}
                        />
                    </div>

                    <DateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onApply={(s, e) => {
                            setStartDate(s);
                            setEndDate(e);
                        }}
                    />
                </div>
            </div>

            <div className="pipeline-board">
                {stages.map(stage => {
                    const stageOpps = getOpportunitiesByStage(stage.opportunityStageId);
                    const stageTotal = getStageTotal(stage.opportunityStageId);
                    
                    return (
                        <div 
                            key={stage.opportunityStageId} 
                            className="pipeline-column"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, stage.opportunityStageId)}
                        >
                            <div className="pipeline-column-header">
                                <h3>{stage.name}</h3>
                                <div className="pipeline-column-stats">
                                    <span>{stageOpps.length}</span>
                                    <span>${stageTotal.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="pipeline-column-content">
                                {stageOpps.map(opp => (
                                    <div
                                        key={opp.opportunityId}
                                        draggable
                                        onDragStart={(e: React.DragEvent) => handleDragStart(e, opp)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => handleCardClick(opp.opportunityId)}
                                        style={{ cursor: 'grab', opacity: draggedOpportunity?.opportunityId === opp.opportunityId ? 0.5 : 1 }}
                                    >
                                        <Card 
                                            className="opportunity-card glass-panel animate-fade-in"
                                            style={{ 
                                                borderLeft: stage.isWon ? '4px solid #10b981' : stage.isLost ? '4px solid #ef4444' : 'none'
                                            }}
                                        >
                                            <Card.Content>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <h4 style={{ margin: 0 }}>{opp.title}</h4>
                                                    {!stage.isWon && !stage.isLost && (Math.floor((Date.now() - new Date(opp.updatedAt || opp.createdAt).getTime()) / (1000 * 60 * 60 * 24))) > 5 && (
                                                        <span style={{
                                                            fontSize: '0.65rem',
                                                            fontWeight: 700,
                                                            padding: '0.15rem 0.4rem',
                                                            borderRadius: '0.3rem',
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            color: '#ef4444',
                                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            ⚠️ Stalled ({Math.floor((Date.now() - new Date(opp.updatedAt || opp.createdAt).getTime()) / (1000 * 60 * 60 * 24))}d)
                                                        </span>
                                                    )}
                                                </div>
                                                <p>{opp.customerFirstName} {opp.customerLastName}</p>
                                                <p className="opportunity-value">${opp.estimatedValue.toLocaleString()}</p>
                                                
                                                {(() => {
                                                    const closeStatus = getExpectedCloseDateStatus(opp.expectedCloseDate, stage.isWon, stage.isLost);
                                                    return (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', paddingTop: '0.35rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                                                            <span className="opportunity-owner" style={{ margin: 0 }}>{opp.ownerName}</span>
                                                            {opp.expectedCloseDate && (
                                                                <span
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '3px',
                                                                        padding: '0.15rem 0.4rem',
                                                                        borderRadius: '4px',
                                                                        fontSize: '0.7rem',
                                                                        fontWeight: 600,
                                                                        background: closeStatus.bg || 'rgba(255, 255, 255, 0.05)',
                                                                        color: closeStatus.color,
                                                                        border: closeStatus.status === 'overdue' ? '1px solid rgba(239, 68, 68, 0.3)' : closeStatus.status === 'soon' || closeStatus.status === 'today' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent'
                                                                    }}
                                                                    title={closeStatus.label}
                                                                >
                                                                    <Calendar size={11} />
                                                                    {closeStatus.badge || new Date(opp.expectedCloseDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </Card.Content>
                                        </Card>
                                    </div>
                                ))}
                                {stageOpps.length === 0 && (
                                    <div className="empty-column">
                                        <p>No opportunities</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedOpportunity && (
                <OpportunityDetailPanel
                    opportunityId={selectedOpportunity}
                    onClose={() => setSelectedOpportunity(null)}
                    onUpdate={loadOpportunities}
                />
            )}

            <OpportunityCreateModal
                isOpen={isCreateModalOpen}
                onCancel={() => setIsCreateModalOpen(false)}
                onCreated={() => {
                    setIsCreateModalOpen(false);
                    loadOpportunities();
                }}
            />
        </Layout>
    );
};
