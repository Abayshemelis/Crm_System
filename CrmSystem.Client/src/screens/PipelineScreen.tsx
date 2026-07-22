import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DatePicker } from '../components/ui/DatePicker';
import { OpportunityDetailPanel } from '../components/ui/OpportunityDetailPanel';
import { OpportunityCreateModal } from '../components/ui/OpportunityCreateModal';
import { OpportunityFilters, FilterState } from '../components/opportunities/OpportunityFilters';
import { api } from '../lib/api';
import { Plus, Filter } from 'lucide-react';
import './screens.css';

interface Opportunity {
    opportunityId: number;
    customerId: number;
    customerFirstName: string;
    customerLastName: string;
    title: string;
    opportunityStageId: number;
    stageName: string;
    estimatedValue: number;
    expectedCloseDate?: string;
    ownerId: number;
    ownerName: string;
    createdAt: string;
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
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
    const [dateFilter, setDateFilter] = useState<string>('all');
    const [draggedOpportunity, setDraggedOpportunity] = useState<Opportunity | null>(null);
    const [selectedOpportunity, setSelectedOpportunity] = useState<number | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [activeFilters, setActiveFilters] = useState<FilterState>({});
    const [activeFilterCount, setActiveFilterCount] = useState(0);

    const loadOpportunities = useCallback(async (filters?: FilterState) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters?.customerId) params.append('customerId', filters.customerId.toString());
            if (filters?.companyId) params.append('companyId', filters.companyId.toString());
            if (filters?.ownerId) params.append('ownerId', filters.ownerId.toString());
            if (filters?.opportunityStageId) params.append('opportunityStageId', filters.opportunityStageId.toString());
            if (filters?.expectedCloseDateFrom) params.append('expectedCloseDateFrom', filters.expectedCloseDateFrom);
            if (filters?.expectedCloseDateTo) params.append('expectedCloseDateTo', filters.expectedCloseDateTo);
            if (filters?.createdDateFrom) params.append('createdDateFrom', filters.createdDateFrom);
            if (filters?.createdDateTo) params.append('createdDateTo', filters.createdDateTo);
            if (filters?.minValue) params.append('minValue', filters.minValue);
            if (filters?.maxValue) params.append('maxValue', filters.maxValue);
            if (filters?.lastActivityFrom) params.append('lastActivityFrom', filters.lastActivityFrom);
            if (filters?.lastActivityTo) params.append('lastActivityTo', filters.lastActivityTo);
            if (filters?.sourceId) params.append('sourceId', filters.sourceId.toString());

            const queryString = params.toString();
            const url = queryString ? `/api/opportunities?${queryString}` : '/api/opportunities';

            const [oppData, stageData, userData] = await Promise.all([
                api.get<Opportunity[]>(url),
                api.get<OpportunityStage[]>('/api/opportunitystages'),
                api.get<User[]>('/api/users')
            ]);
            setOpportunities(oppData);
            setStages(stageData.sort((a, b) => a.sortOrder - b.sortOrder));
            setUsers(userData ?? []);
        } catch (error) {
            console.error('Failed to load pipeline data:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOpportunities(activeFilters);
    }, [loadOpportunities, activeFilters]);

    const handleFilterChange = (filters: FilterState) => {
        setActiveFilters(filters);
        const count = Object.values(filters).filter(v => v !== undefined && v !== '').length;
        setActiveFilterCount(count);
    };

    const handleClearFilters = () => {
        setActiveFilters({});
        setActiveFilterCount(0);
        loadOpportunities();
    };

    const handleStageChange = async (opportunityId: number, newStageId: number) => {
        try {
            await api.patch(`/api/opportunities/${opportunityId}/stage`, { stageId: newStageId });
            await loadOpportunities();
        } catch (error) {
            console.error('Failed to update stage:', error);
            // Revert optimistic update on error
            await loadOpportunities();
            // Show toast error
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

        // Optimistic update
        const updatedOpportunities = opportunities.map(opp =>
            opp.opportunityId === draggedOpportunity.opportunityId
                ? { ...opp, opportunityStageId: targetStageId }
                : opp
        );
        setOpportunities(updatedOpportunities);

        // API call
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
        let filtered = opportunities.filter(opp => opp.opportunityStageId === stageId);

        // Filter by owner
        if (selectedOwnerId) {
            filtered = filtered.filter(opp => opp.ownerId === Number(selectedOwnerId));
        }

        // Filter by date
        if (dateFilter !== 'all') {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            const currentQuarter = Math.floor(currentMonth / 3);

            filtered = filtered.filter(opp => {
                if (!opp.expectedCloseDate) return false;

                const closeDate = new Date(opp.expectedCloseDate);
                const closeYear = closeDate.getFullYear();
                const closeMonth = closeDate.getMonth();
                const closeQuarter = Math.floor(closeMonth / 3);

                switch (dateFilter) {
                    case 'overdue':
                        return closeDate < now;
                    case 'thisMonth':
                        return closeYear === currentYear && closeMonth === currentMonth;
                    case 'thisQuarter':
                        return closeYear === currentYear && closeQuarter === currentQuarter;
                    case 'nextMonth':
                        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
                        const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
                        return closeYear === nextMonthYear && closeMonth === nextMonth;
                    case 'nextQuarter':
                        const nextQuarter = currentQuarter === 3 ? 0 : currentQuarter + 1;
                        const nextQuarterYear = currentQuarter === 3 ? currentYear + 1 : currentYear;
                        return closeYear === nextQuarterYear && closeQuarter === nextQuarter;
                    default:
                        return true;
                }
            });
        }

        return filtered;
    };

    const getStageTotal = (stageId: number) => {
        return getOpportunitiesByStage(stageId).reduce((sum, opp) => sum + opp.estimatedValue, 0);
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="loading-state">
                    <div className="spinner" />
                    <p>Loading pipeline...</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="dashboard-header animate-fade-in">
                <div className="dashboard-title">
                    <h1>Pipeline</h1>
                    <p>{opportunities.length} opportunities</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                    <OpportunityFilters
                        onFilterChange={handleFilterChange}
                        onClearFilters={handleClearFilters}
                        activeFilterCount={activeFilterCount}
                    />
                    <Button onClick={() => setIsCreateModalOpen(true)}><Plus size={16} style={{ marginRight: 6 }} /> New Opportunity</Button>
                </div>
            </div>

            <div className="filters-bar animate-fade-in">
                <div style={{ position: 'relative', flex: 1 }}>
                    <Filter size={16} className="filter-icon" />
                    <select
                        className="filter-input"
                        value={selectedOwnerId}
                        onChange={e => setSelectedOwnerId(e.target.value)}
                        style={{ minWidth: '150px' }}
                    >
                        <option value="">All Owners</option>
                        {users.filter(u => u.isActive).map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                    </select>
                </div>
                <div style={{ marginLeft: '1rem' }}>
                    <select
                        className="filter-input"
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value)}
                        style={{ minWidth: '150px' }}
                    >
                        <option value="all">All Dates</option>
                        <option value="overdue">Overdue</option>
                        <option value="thisMonth">This Month</option>
                        <option value="thisQuarter">This Quarter</option>
                        <option value="nextMonth">Next Month</option>
                        <option value="nextQuarter">Next Quarter</option>
                    </select>
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
                                                <h4>{opp.title}</h4>
                                                <p>{opp.customerFirstName} {opp.customerLastName}</p>
                                                <p className="opportunity-value">${opp.estimatedValue.toLocaleString()}</p>
                                                <p className="opportunity-owner">{opp.ownerName}</p>
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
