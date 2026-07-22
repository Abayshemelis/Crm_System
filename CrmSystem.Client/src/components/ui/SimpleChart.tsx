import React from 'react';

interface SimpleChartProps {
  data: Array<{ month: string; revenue: number }>;
  height?: number;
}

export const SimpleChart: React.FC<SimpleChartProps> = ({ data, height = 100 }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: `${height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        No data available
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue));
  const minRevenue = 0;

  return (
    <div style={{ height: `${height}px`, position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '8px 0' }}>
      {data.map((point, index) => {
        const barHeight = maxRevenue > 0 ? (point.revenue / maxRevenue) * (height - 20) : 0;
        return (
          <div
            key={point.month}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <div
              style={{
                width: '100%',
                height: `${barHeight}px`,
                backgroundColor: 'var(--accent-primary)',
                borderRadius: '4px 4px 0 0',
                minHeight: '4px',
                transition: 'height 0.3s ease'
              }}
              title={`${point.month}: $${point.revenue.toLocaleString()}`}
            />
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              {point.month.split('-')[1]}
            </span>
          </div>
        );
      })}
    </div>
  );
};
