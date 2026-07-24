import React from 'react';
import { Card } from './Card';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

export type ChartType = 'bar' | 'line';

interface ChartWidgetProps {
    title: string;
    type: ChartType;
    data: any[];
    dataKey: string;
    xAxisKey: string;
    isLoading?: boolean;
    emptyMessage?: string;
    valueFormatter?: (value: any) => string;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({
    title,
    type,
    data,
    dataKey,
    xAxisKey,
    isLoading = false,
    emptyMessage = "No data available in this range.",
    valueFormatter
}) => {
    // Basic distinct colors for bar segments
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    const renderSkeleton = () => (
        <div style={{ height: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '20px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '100%' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="skeleton-pulse" style={{ width: '40px', height: `${Math.random() * 60 + 20}%`, backgroundColor: 'var(--border-color)', borderRadius: '4px 4px 0 0' }}></div>
                ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="skeleton-pulse" style={{ width: '40px', height: '10px', backgroundColor: 'var(--border-color)', borderRadius: '2px' }}></div>
                ))}
            </div>
        </div>
    );

    const renderEmpty = () => (
        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            {emptyMessage}
        </div>
    );

    const renderChart = () => {
        if (!data || data.length === 0) return renderEmpty();

        const commonProps = {
            data,
            margin: { top: 20, right: 30, left: 20, bottom: 5 }
        };

        const renderTooltipContent = ({ active, payload, label }: any) => {
            if (active && payload && payload.length) {
                return (
                    <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{label}</p>
                        <p style={{ margin: 0, color: payload[0].color || COLORS[0] }}>
                            {valueFormatter ? valueFormatter(payload[0].value) : payload[0].value}
                        </p>
                    </div>
                );
            }
            return null;
        };

        return (
            <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    {type === 'bar' ? (
                        <BarChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey={xAxisKey} stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                            <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} tickFormatter={valueFormatter} />
                            <Tooltip content={renderTooltipContent} cursor={{ fill: 'var(--hover-bg)' }} />
                            <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    ) : (
                        <LineChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                            <XAxis dataKey={xAxisKey} stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                            <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} tickFormatter={valueFormatter} />
                            <Tooltip content={renderTooltipContent} />
                            <Line type="monotone" dataKey={dataKey} stroke={COLORS[0]} strokeWidth={3} dot={{ r: 4, fill: COLORS[0], strokeWidth: 2, stroke: 'var(--panel-bg)' }} activeDot={{ r: 6 }} />
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <Card className="glass-panel" style={{ height: '100%' }}>
            <Card.Header>
                <h3 style={{ margin: 0 }}>{title}</h3>
            </Card.Header>
            <Card.Content>
                {isLoading ? renderSkeleton() : renderChart()}
            </Card.Content>
        </Card>
    );
};
