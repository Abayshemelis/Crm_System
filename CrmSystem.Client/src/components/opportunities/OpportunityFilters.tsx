import React, { useState, useEffect } from 'react';
import { X, Filter } from 'lucide-react';
import { api } from '../../lib/api';

interface Customer {
  customerId: number;
  firstName: string;
  lastName: string;
}

interface Company {
  companyId: number;
  name: string;
}

interface User {
  identityId: number;
  name: string;
}

interface OpportunityStage {
  opportunityStageId: number;
  name: string;
}

interface Source {
  sourceId: number;
  name: string;
}

interface OpportunityFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

export interface FilterState {
  customerId?: number;
  companyId?: number;
  ownerId?: number;
  opportunityStageId?: number;
  expectedCloseDateFrom?: string;
  expectedCloseDateTo?: string;
  createdDateFrom?: string;
  createdDateTo?: string;
  minValue?: string;
  maxValue?: string;
  lastActivityFrom?: string;
  lastActivityTo?: string;
  sourceId?: number;
}

export const OpportunityFilters: React.FC<OpportunityFiltersProps> = ({
  onFilterChange,
  onClearFilters,
  activeFilterCount
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stages, setStages] = useState<OpportunityStage[]>([]);
  const [sources, setSources] = useState<Source[]>([]);

  const [filters, setFilters] = useState<FilterState>({});

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [custData, compData, userData, stageData, sourceData] = await Promise.all([
          api.get<{ data: Customer[] }>('/api/customers?page=1&pageSize=1000'),
          api.get<Company[]>('/api/companies'),
          api.get<User[]>('/api/users'),
          api.get<OpportunityStage[]>('/api/opportunitystages'),
          api.get<Source[]>('/api/sources')
        ]);
        setCustomers(custData.data ?? []);
        setCompanies(compData ?? []);
        setUsers(userData ?? []);
        setStages(stageData ?? []);
        setSources(sourceData ?? []);
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    };
    loadFilterOptions();
  }, []);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClear = () => {
    setFilters({});
    onClearFilters();
  };

  const getActiveCount = () => {
    return Object.values(filters).filter(v => v !== undefined && v !== '').length;
  };

  return (
    <div className="opportunity-filters">
      <button
        type="button"
        className="filter-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Filter size={16} />
        Filters
        {activeFilterCount > 0 && (
          <span className="filter-badge">{activeFilterCount}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="filter-backdrop" onClick={() => setIsOpen(false)} />
          <div className="filter-panel">
            <div className="filter-header">
              <h3>Filter Opportunities</h3>
              <button type="button" className="filter-close-btn" onClick={() => setIsOpen(false)}>
                <X size={16} />
              </button>
            </div>

          <div className="filter-grid">
            {/* Customer */}
            <div className="filter-field">
              <label>Customer</label>
              <select
                value={filters.customerId || ''}
                onChange={(e) => handleFilterChange('customerId', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">All Customers</option>
                {customers.map(c => (
                  <option key={c.customerId} value={c.customerId}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Company */}
            <div className="filter-field">
              <label>Company</label>
              <select
                value={filters.companyId || ''}
                onChange={(e) => handleFilterChange('companyId', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">All Companies</option>
                {companies.map(c => (
                  <option key={c.companyId} value={c.companyId}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Owner */}
            <div className="filter-field">
              <label>Assigned To</label>
              <select
                value={filters.ownerId || ''}
                onChange={(e) => handleFilterChange('ownerId', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">All Users</option>
                {users.map(u => (
                  <option key={u.identityId} value={u.identityId}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Stage */}
            <div className="filter-field">
              <label>Pipeline Stage</label>
              <select
                value={filters.opportunityStageId || ''}
                onChange={(e) => handleFilterChange('opportunityStageId', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">All Stages</option>
                {stages.map(s => (
                  <option key={s.opportunityStageId} value={s.opportunityStageId}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Source */}
            <div className="filter-field">
              <label>Source</label>
              <select
                value={filters.sourceId || ''}
                onChange={(e) => handleFilterChange('sourceId', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">All Sources</option>
                {sources.map(s => (
                  <option key={s.sourceId} value={s.sourceId}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Expected Close Date Range */}
            <div className="filter-field">
              <label>Expected Close Date From</label>
              <input
                type="date"
                value={filters.expectedCloseDateFrom || ''}
                onChange={(e) => handleFilterChange('expectedCloseDateFrom', e.target.value)}
              />
            </div>

            <div className="filter-field">
              <label>Expected Close Date To</label>
              <input
                type="date"
                value={filters.expectedCloseDateTo || ''}
                onChange={(e) => handleFilterChange('expectedCloseDateTo', e.target.value)}
              />
            </div>

            {/* Created Date Range */}
            <div className="filter-field">
              <label>Created Date From</label>
              <input
                type="date"
                value={filters.createdDateFrom || ''}
                onChange={(e) => handleFilterChange('createdDateFrom', e.target.value)}
              />
            </div>

            <div className="filter-field">
              <label>Created Date To</label>
              <input
                type="date"
                value={filters.createdDateTo || ''}
                onChange={(e) => handleFilterChange('createdDateTo', e.target.value)}
              />
            </div>

            {/* Deal Value Range */}
            <div className="filter-field">
              <label>Min Value</label>
              <input
                type="number"
                placeholder="0"
                value={filters.minValue || ''}
                onChange={(e) => handleFilterChange('minValue', e.target.value)}
              />
            </div>

            <div className="filter-field">
              <label>Max Value</label>
              <input
                type="number"
                placeholder="0"
                value={filters.maxValue || ''}
                onChange={(e) => handleFilterChange('maxValue', e.target.value)}
              />
            </div>

            {/* Last Activity Date Range */}
            <div className="filter-field">
              <label>Last Activity From</label>
              <input
                type="date"
                value={filters.lastActivityFrom || ''}
                onChange={(e) => handleFilterChange('lastActivityFrom', e.target.value)}
              />
            </div>

            <div className="filter-field">
              <label>Last Activity To</label>
              <input
                type="date"
                value={filters.lastActivityTo || ''}
                onChange={(e) => handleFilterChange('lastActivityTo', e.target.value)}
              />
            </div>
          </div>

          <div className="filter-footer">
            <button type="button" className="filter-clear-btn" onClick={handleClear}>
              Clear All Filters
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
};
