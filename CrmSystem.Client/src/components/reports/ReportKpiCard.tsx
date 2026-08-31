import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import '../../screens/reports/cleanReports.css';

export interface ReportKpiItem {
  id?: string;
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  delta?: string;
  deltaUp?: boolean;
}

interface ReportKpiCardProps {
  item: ReportKpiItem;
  loading?: boolean;
}

export const ReportKpiCard: React.FC<ReportKpiCardProps> = ({ item, loading = false }) => {
  const { label, value, sub, icon, color, delta, deltaUp } = item;

  return (
    <div className="clean-stat-card" style={{ '--card-accent': color } as any}>
      <div className="clean-stat-top">
        <span className="clean-stat-label">{label}</span>
        <span className="clean-stat-icon" style={{ background: `${color}18`, color }}>
          {icon}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0' }}>
          <div className="rpt-shimmer" style={{ width: '60%', height: '28px', borderRadius: '6px' }} />
          <div className="rpt-shimmer" style={{ width: '80%', height: '14px', borderRadius: '4px' }} />
        </div>
      ) : (
        <>
          <div className="clean-stat-value">{value}</div>
          <div className="clean-stat-footer">
            {delta && (
              <span className={`clean-pill-delta ${deltaUp ? 'clean-pill-green' : 'clean-pill-blue'}`}>
                {deltaUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {delta}
              </span>
            )}
            {sub && <span className="clean-stat-sub-text">{sub}</span>}
          </div>
        </>
      )}
    </div>
  );
};

export const ReportKpiGrid: React.FC<{ items: ReportKpiItem[]; loading?: boolean; columns?: number }> = ({ items, loading, columns }) => (
  <div
    className="clean-stat-grid"
    style={columns ? { '--grid-cols': columns } as React.CSSProperties : undefined}
  >
    {items.map((item, idx) => (
      <ReportKpiCard key={item.id || item.label || idx} item={item} loading={loading} />
    ))}
  </div>
);

export const ReportSummaryBanner: React.FC<{ items: ReportKpiItem[]; loading?: boolean }> = ({ items, loading }) => {
  return (
    <div className="report-summary-banner">
      {items.map((item, idx) => {
        const { label, value, sub, icon, color, delta, deltaUp } = item;
        return (
          <div key={idx} className="report-summary-item" style={{ '--item-color': color } as React.CSSProperties}>
            <div className="report-summary-item-header">
              <span className="report-summary-item-label">{label}</span>
              <span className="report-summary-item-icon">{icon}</span>
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0' }}>
                <div className="rpt-shimmer" style={{ width: '60%', height: '24px', borderRadius: '4px' }} />
                <div className="rpt-shimmer" style={{ width: '80%', height: '12px', borderRadius: '4px' }} />
              </div>
            ) : (
              <>
                <div className="report-summary-item-value">{value}</div>
                <div className="report-summary-item-footer">
                  {delta && (
                    <span className={`clean-pill-delta ${deltaUp ? 'clean-pill-green' : 'clean-pill-blue'}`} style={{ marginRight: '6px' }}>
                      {deltaUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                      {delta}
                    </span>
                  )}
                  {sub && <span className="report-summary-item-sub">{sub}</span>}
                </div>
              </>
            )}
            {/* Divider line except for the last item (handled by CSS) */}
          </div>
        );
      })}
    </div>
  );
};

