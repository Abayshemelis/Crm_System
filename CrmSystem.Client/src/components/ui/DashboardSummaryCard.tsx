import React from 'react';
import { Card } from './Card';
import { Target, DollarSign, CheckSquare, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActivityItem {
    id: number;
    title: string;
    date: string;
    subtitle?: string;
}

interface DashboardSummaryCardProps {
    title: string;
    openTasksCount: number;
    overdueTasksCount: number;
    pipelineValue: number;
    recentActivities: ActivityItem[];
    onTasksClick?: () => void;
    onPipelineClick?: () => void;
}

export const DashboardSummaryCard: React.FC<DashboardSummaryCardProps> = ({
    title,
    openTasksCount,
    overdueTasksCount,
    pipelineValue,
    recentActivities,
    onTasksClick,
    onPipelineClick
}) => {
    const navigate = useNavigate();

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    return (
        <Card className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Card.Header>
                <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {title}
                </h2>
            </Card.Header>
            <Card.Content style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                    {/* Tasks Summary */}
                    <div 
                        className="stat-box" 
                        onClick={onTasksClick}
                        style={{ cursor: onTasksClick ? 'pointer' : 'default', padding: '1rem', backgroundColor: 'var(--hover-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                            <CheckSquare size={18} />
                            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Open Tasks</span>
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                            {openTasksCount}
                        </div>
                        {overdueTasksCount > 0 && (
                            <div style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--status-lost-text)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 600 }}>
                                <AlertCircle size={14} />
                                {overdueTasksCount} Overdue
                            </div>
                        )}
                    </div>

                    {/* Pipeline Summary */}
                    <div 
                        className="stat-box"
                        onClick={onPipelineClick}
                        style={{ cursor: onPipelineClick ? 'pointer' : 'default', padding: '1rem', backgroundColor: 'var(--hover-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                            <DollarSign size={18} />
                            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Open Pipeline</span>
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--status-won-text)' }}>
                            {formatCurrency(pipelineValue)}
                        </div>
                    </div>
                </div>

                {/* Recent Activity List */}
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1rem', margin: '0 0 1rem 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Target size={16} /> Recent Activity
                    </h3>
                    {recentActivities && recentActivities.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {recentActivities.slice(0, 5).map(activity => (
                                <div key={activity.id} style={{ padding: '0.75rem', borderLeft: '3px solid var(--primary-color)', backgroundColor: 'var(--hover-bg)', borderRadius: '0 4px 4px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                        <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>{activity.title}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatDate(activity.date)}</div>
                                    </div>
                                    {activity.subtitle && (
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            {activity.subtitle}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                            No recent activity found.
                        </div>
                    )}
                </div>
            </Card.Content>
        </Card>
    );
};
