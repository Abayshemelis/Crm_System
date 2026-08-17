import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { DateRangePicker } from '../components/ui/DateRangePicker';
import { api } from '../lib/api';
import { Building2, Globe, MapPin, Briefcase, Plus, Building, Search, X, Trash2, LayoutGrid, List, Eye } from 'lucide-react';
import { showToast } from '../lib/toast';
import './screens.css';
import { confirmAction } from '../lib/confirm';

interface CompanyApiResponse {
  companyId?: number;
  CompanyId?: number;
  name?: string;
  Name?: string;
  industry?: string;
  Industry?: string;
  companySize?: string;
  CompanySize?: string;
  website?: string;
  Website?: string;
  address?: string;
  Address?: string;
  phone?: string;
  Phone?: string;
  email?: string;
  Email?: string;
  sourceId?: number;
  SourceId?: number;
  sourceName?: string;
  SourceName?: string;
  assignedRepId?: number;
  AssignedRepId?: number;
  assignedRepName?: string;
  AssignedRepName?: string;
  contactCount?: number;
  ContactCount?: number;
  createdAt?: string;
  CreatedAt?: string;
  isDeleted?: boolean;
  IsDeleted?: boolean;
}
interface CompanyApiEnvelope {
  data?: CompanyApiResponse[];
  Data?: CompanyApiResponse[];
}
interface Company {
  companyId: number; 
  name: string; 
  industry?: string; 
  companySize?: string;
  website?: string; 
  address?: string;
  phone?: string;
  email?: string;
  sourceId?: number;
  sourceName?: string;
  assignedRepId?: number;
  assignedRepName?: string;
  contactCount?: number;
  createdAt?: string;
  isDeleted?: boolean;
}

export const CompaniesScreen: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const loadData = useCallback(async (sDate?: string, eDate?: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const queryParams = new URLSearchParams({ page: '1', pageSize: '100' });
      if (sDate) queryParams.append('createdFrom', sDate);
      if (eDate) queryParams.append('createdTo', eDate);
      if (includeDeleted) queryParams.append('includeDeleted', 'true');
      
      const res = await api.get<CompanyApiEnvelope | CompanyApiResponse[]>(`/api/companies?${queryParams.toString()}`);
      
      let rawList: CompanyApiResponse[] = [];
      if (Array.isArray(res)) {
        rawList = res;
      } else if (res && Array.isArray((res as CompanyApiEnvelope).data)) {
        rawList = (res as CompanyApiEnvelope).data!;
      } else if (res && Array.isArray((res as CompanyApiEnvelope).Data)) {
        rawList = (res as CompanyApiEnvelope).Data!;
      }
      
      const mappedList: Company[] = rawList.map(c => ({
        companyId: c.companyId ?? c.CompanyId ?? 0,
        name: c.name ?? c.Name ?? 'Unnamed Company',
        industry: c.industry ?? c.Industry,
        companySize: c.companySize ?? c.CompanySize,
        website: c.website ?? c.Website,
        address: c.address ?? c.Address,
        phone: c.phone ?? c.Phone,
        email: c.email ?? c.Email,
        sourceId: c.sourceId ?? c.SourceId,
        sourceName: c.sourceName ?? c.SourceName,
        assignedRepId: c.assignedRepId ?? c.AssignedRepId,
        assignedRepName: c.assignedRepName ?? c.AssignedRepName,
        contactCount: c.contactCount ?? c.ContactCount ?? 0,
        createdAt: c.createdAt ?? c.CreatedAt,
        isDeleted: c.isDeleted ?? c.IsDeleted ?? false
      })).filter(c => c.companyId > 0);

      setCompanies(mappedList);
    } catch (err: any) {
      console.error('Failed to load companies:', err);
      setLoadError(err.message || 'Failed to load company profiles.');
    } finally {
      setLoading(false);
    }
  }, [includeDeleted]);

  useEffect(() => {
    loadData(startDate, endDate);
  }, [loadData, startDate, endDate, location.key]);

  const industries = useMemo(() => {
    const set = new Set<string>();
    companies.forEach(c => {
      if (c.industry) set.add(c.industry);
    });
    return Array.from(set).sort();
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.industry && c.industry.toLowerCase().includes(search.toLowerCase())) ||
        (c.website && c.website.toLowerCase().includes(search.toLowerCase())) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase()));

      const matchIndustry = !selectedIndustry || c.industry === selectedIndustry;

      return matchSearch && matchIndustry;
    });
  }, [companies, search, selectedIndustry]);

  const handleDeleteCompany = async (e: React.MouseEvent, id: number, name: string) => {
    e.stopPropagation();
    if (!await confirmAction(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`/api/companies/${id}`);
      showToast('Company deleted successfully', 'success');
      setCompanies(prev => prev.filter(c => c.companyId !== id));
    } catch (err: any) {
      showToast(err.message || 'Failed to delete company', 'error');
    }
  };

  if (loading && companies.length === 0) {
    return (
      <Layout>
        <div className="dashboard-header animate-fade-in">
          <div className="dashboard-title">
            <h1>Companies</h1>
            <p>Loading company accounts...</p>
          </div>
          <Button disabled><Plus size={16} style={{ marginRight: 6 }} /> New Company</Button>
        </div>
        <div className="table-skeleton animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rect" height={52} style={{ borderRadius: '8px', animationDelay: `${i * 0.05}s` }} />
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="dashboard-header animate-fade-in">
        <div className="dashboard-title">
          <h1>Companies</h1>
          <p>{filteredCompanies.length} accounts</p>
        </div>
        <Button onClick={() => navigate('/companies/new')}><Plus size={16} style={{ marginRight: 6 }} /> New Company</Button>
      </div>

      {loadError && (
        <div className="error-banner animate-fade-in">
          {loadError}
        </div>
      )}

      {/* Responsive Filter Bar */}
      <div className="filters-bar customer-filters animate-fade-in" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
          <Search size={16} className="filter-icon" />
          <input
            className="filter-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search companies by name, email, website..."
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {industries.length > 0 && (
          <select
            className="filter-select"
            value={selectedIndustry}
            onChange={e => setSelectedIndustry(e.target.value)}
            style={{ flex: '0 1 160px' }}
          >
            <option value="">All Industries</option>
            {industries.map(ind => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        )}

        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onApply={(s, e) => {
            setStartDate(s);
            setEndDate(e);
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0 1rem', height: '42px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <input
            type="checkbox"
            id="includeDeleted"
            checked={includeDeleted}
            onChange={e => setIncludeDeleted(e.target.checked)}
            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
          />
          <label htmlFor="includeDeleted" style={{ fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Show Deleted
          </label>
        </div>

        {/* View Switcher Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-secondary)', padding: '0.2rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', marginLeft: 'auto' }}>
          <button
            type="button"
            style={{ padding: '0.35rem 0.65rem', border: 'none', background: viewMode === 'grid' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'grid' ? '#ffffff' : 'var(--text-secondary)', borderRadius: '0.375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600 }}
            onClick={() => setViewMode('grid')}
            title="Card Grid View"
          >
            <LayoutGrid size={14} /> Cards
          </button>
          <button
            type="button"
            style={{ padding: '0.35rem 0.65rem', border: 'none', background: viewMode === 'table' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'table' ? '#ffffff' : 'var(--text-secondary)', borderRadius: '0.375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600 }}
            onClick={() => setViewMode('table')}
            title="Compact Data Table View"
          >
            <List size={14} /> Data Table
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="customer-table-wrap glass-panel animate-fade-in" style={{ borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <table className="customer-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Company Name</th>
                <th style={{ padding: '0.85rem 1rem' }}>Industry</th>
                <th style={{ padding: '0.85rem 1rem' }}>Company Size</th>
                <th style={{ padding: '0.85rem 1rem' }}>Website / Email</th>
                <th style={{ padding: '0.85rem 1rem' }}>Contacts Count</th>
                <th style={{ padding: '0.85rem 1rem' }}>Assigned Rep</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map(c => (
                <tr
                  key={c.companyId}
                  style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                  onClick={() => navigate(`/companies/${c.companyId}`)}
                >
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div className="company-avatar" style={{ width: 28, height: 28, fontSize: '0.75rem' }}>{c.name[0]}</div>
                      <span>{c.name} {c.isDeleted && <span className="deleted-badge" style={{ marginLeft: 6, fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>Deleted</span>}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                    {c.industry || '—'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                    {c.companySize || '—'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {c.website ? <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>{c.website}</a> : <span>{c.email || '—'}</span>}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                    {c.contactCount ?? 0} contacts
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                    {c.assignedRepName || 'Unassigned'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <Button size="sm" variant="ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }} onClick={() => navigate(`/companies/${c.companyId}`)}>
                        <Eye size={13} style={{ marginRight: 4 }} /> View
                      </Button>
                      <Button size="sm" variant="ghost" disabled={c.isDeleted} style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', color: '#ef4444' }} onClick={(e) => handleDeleteCompany(e, c.companyId, c.name)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="customers-grid">
          {filteredCompanies.map((c, i) => (
            <Card
              key={c.companyId}
              className="customer-card glass-panel animate-fade-in"
              style={{ animationDelay: `${i * 0.04}s`, cursor: 'pointer' } as React.CSSProperties}
              onClick={() => navigate(`/companies/${c.companyId}`)}
            >
              <Card.Content>
                <div className="customer-header">
                  <div className="company-avatar">{c.name[0]}</div>
                  <div className="customer-info" style={{ minWidth: 0 }}>
                    <h3 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                      {c.isDeleted && <span className="deleted-badge" style={{ marginLeft: 6, fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b', fontWeight: 600, verticalAlign: 'middle' }}>Deleted</span>}
                    </h3>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', margin: '0.15rem 0 0 0' }}>
                      <Briefcase size={13} style={{ flexShrink: 0 }} />
                      <span className="truncate">{c.industry || 'No industry set'}</span>
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteCompany(e, c.companyId, c.name)}
                    disabled={c.isDeleted}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: c.isDeleted ? 'default' : 'pointer', padding: 4, borderRadius: 4, opacity: c.isDeleted ? 0.3 : 1 }}
                    title="Delete company"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="customer-details">
                  {c.website && (
                    <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.35rem 0' }}>
                      <Globe size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <a
                        href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}
                        className="truncate"
                      >
                        {c.website}
                      </a>
                    </p>
                  )}
                  {c.address && (
                    <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.35rem 0' }}>
                      <MapPin size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span className="truncate">{c.address}</span>
                    </p>
                  )}
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.35rem 0' }}>
                    <Building size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span>{c.companySize ? `${c.companySize} employees` : 'Size not specified'}</span>
                  </p>
                </div>

                <div className="customer-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="source-badge">
                    {c.contactCount ? `${c.contactCount} contacts` : '0 contacts'}
                  </span>
                  {c.assignedRepName && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Rep: {c.assignedRepName}
                    </span>
                  )}
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      {filteredCompanies.length === 0 && !loadError && (
        <EmptyState
          title="No companies found"
          description="Adjust your search query or add a new company profile."
          icon={Building2}
          actionText="New Company"
          onActionClick={() => navigate('/companies/new')}
        />
      )}
    </Layout>
  );
};