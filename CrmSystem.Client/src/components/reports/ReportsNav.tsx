import React from 'react';
import '../../screens/reports/cleanReports.css';

export interface SubNavOption {
  id: string;
  label: string;
  badge?: string | number;
}

interface ReportsNavProps {
  activeCategory?: string;
  subTabs?: SubNavOption[];
  activeSubTab?: string;
  onSubTabChange?: (tabId: string) => void;
}

export const ReportsNav: React.FC<ReportsNavProps> = ({
  subTabs,
  activeSubTab,
  onSubTabChange,
}) => {
  if (!subTabs || subTabs.length === 0) {
    return null;
  }

  return (
    <div className="reports-nav-master-container" aria-label="Report Views Navigation">
      <div className="reports-subnav-bar">
        <div className="reports-subnav-label">
          <span className="reports-subnav-prefix">VIEW:</span>
        </div>
        <div className="reports-subnav-pills">
          {subTabs.map((sub) => {
            const isSubActive = activeSubTab === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSubTabChange?.(sub.id)}
                className={`reports-subnav-pill ${isSubActive ? 'active' : ''}`}
              >
                <span>{sub.label}</span>
                {sub.badge !== undefined && sub.badge !== null && (
                  <span className={`reports-subnav-badge ${isSubActive ? 'badge-active' : ''}`}>
                    {sub.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
