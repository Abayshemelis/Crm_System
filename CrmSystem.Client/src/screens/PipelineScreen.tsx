import React, { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DatePicker } from '../components/ui/DatePicker';
import { OpportunityDetailPanel } from '../components/ui/OpportunityDetailPanel';
import { OpportunityCreateModal } from '../components/ui/OpportunityCreateModal';
import { api } from '../lib/api';
import { Plus, Filter } from 'lucide-react';
import './screens.css';

interface Opportunity {
    opportunityId: number;
    customerId: number;
    customerName: string;
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

export const PipelineScreen: React.FC = () => {
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [stages, setStages] = useState<OpportunityStage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [draggedOpportunity, setDraggedOpportunity] = useState<Opportunity | null>(null);
    const [selectedOpportunity, setSelectedOpportunity] = useState<number | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const loadOpportunities = useCallback(async () => {
        setIsLoading(true);
        try {
            const [oppData, stageData] = await Promise.all([
                api.get<Opportunity[]>('/api/opportunities'),
                api.get<OpportunityStage[]>('/api/opportunitystages')
            ]);
            setOpportunities(oppData);
            setStages(stageData.sort((a, b) => a.sortOrder - b.sortOrder));
        } catch (error) {
            console.error('Failed to load pipeline data:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOpportunities();
    }, [loadOpportunities]);

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
            setSelectedOpportunity(opportunityId);
        }
    };

    const getOpportunitiesByStage = (stageId: number) => {
        return opportunities.filter(opp => opp.opportunityStageId === stageId);
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
                <Button onClick={() => setIsCreateModalOpen(true)}><Plus size={16} style={{ marginRight: 6 }} /> New Opportunity</Button>
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
                        {/* TODO: Load and display owners */}
                    </select>
                </div>
                <div style={{ marginLeft: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <DatePicker
                        value={dateRange.start}
                        onChange={e => setDateRange(prev => ({ ...prev, start: e }))}
                        placeholder="Start date"
                    />
                    <span style={{ alignSelf: 'center' }}>to</span>
                    <DatePicker
                        value={dateRange.end}
                        onChange={e => setDateRange(prev => ({ ...prev, end: e }))}
                        placeholder="End date"
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
                                                <h4>{opp.title}</h4>
                                                <p>{opp.customerName}</p>
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
