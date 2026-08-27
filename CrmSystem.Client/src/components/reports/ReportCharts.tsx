import React from 'react';
import { BarChart2, Inbox } from 'lucide-react';
import '../../screens/reports/cleanReports.css';

interface ReportChartCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  height?: number;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

export const ReportChartCard: React.FC<ReportChartCardProps> = ({
  title,
  subtitle,
  badge,
  badgeColor,
  icon,
  loading = false,
  empty = false,
  emptyMessage = 'No chart data available for this selection',
  height = 280,
  children,
  headerAction,
}) => {
  return (
    <div className="clean-chart-card">
      <div className="clean-chart-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {icon && <span style={{ color: 'var(--color-primary, #6366f1)', display: 'flex', alignItems: 'center' }}>{icon}</span>}
            <h3 className="clean-chart-title">{title}</h3>
            {badge && (
              <span
                className="clean-badge clean-badge-primary"
                style={badgeColor ? { background: `${badgeColor}18`, color: badgeColor, borderColor: `${badgeColor}30` } : {}}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="clean-chart-desc">{subtitle}</p>}
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>

      <div className="clean-chart-body" style={{ minHeight: height, padding: '16px 20px', position: 'relative' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center', height: height - 40 }}>
            <div className="rpt-shimmer" style={{ width: '40%', height: '14px', borderRadius: '4px' }} />
            <div className="rpt-shimmer" style={{ width: '100%', height: '180px', borderRadius: '8px' }} />
          </div>
        ) : empty ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: height - 40, color: 'var(--text-muted, #94a3b8)', gap: '8px' }}>
            <Inbox size={28} opacity={0.6} />
            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{emptyMessage}</span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export const CustomChartTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rpt-custom-tooltip-card">
      {label && <p className="rpt-custom-tooltip-label">{label}</p>}
      <div className="rpt-custom-tooltip-items">
        {payload.map((item: any, idx: number) => (
          <div key={idx} className="rpt-custom-tooltip-row">
            <span className="rpt-custom-tooltip-dot" style={{ background: item.color || item.fill || '#6366f1' }} />
            <span className="rpt-custom-tooltip-name">{item.name || 'Value'}:</span>
            <span className="rpt-custom-tooltip-val">
              {formatter ? formatter(item.value, item.name) : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
