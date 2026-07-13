import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { api } from '../lib/api';
import { Building2, Globe, MapPin, Briefcase, Plus, Building } from 'lucide-react';
import './screens.css';

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
}

export const CompaniesScreen: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    api.get<CompanyApiEnvelope>('/api/companies?page=1&pageSize=100')
      .then((d) => {
        const items = (d.data ?? d.Data ?? []).map(company => ({
          companyId: company.companyId ?? company.CompanyId ?? 0,
          name: company.name ?? company.Name ?? 'Unnamed company',
          industry: company.industry ?? company.Industry,
          companySize: company.companySize ?? company.CompanySize,
          website: company.website ?? company.Website,
          address: company.address ?? company.Address,
          phone: company.phone ?? company.Phone,
          email: company.email ?? company.Email,
          sourceId: company.sourceId ?? company.SourceId,
          sourceName: company.sourceName ?? company.SourceName,
          assignedRepId: company.assignedRepId ?? company.AssignedRepId,
          assignedRepName: company.assignedRepName ?? company.AssignedRepName,
          contactCount: company.contactCount ?? company.ContactCount,
          createdAt: company.createdAt ?? company.CreatedAt,
        }));
        setCompanies(items);
      })
      .catch(() => setLoadError('Failed to load companies. Please try again.'))
      .finally(() => setIsLoading(false));
  }, [location.key]);

  // Loading state with skeleton cards
  if (isLoading) {
    return (
      <Layout>
        <div className="dashboard-header animate-fade-in">
          <div className="dashboard-title">
            <h1>Companies</h1>
            <p>Loading companies...</p>
          </div>
          <Button disabled><Plus size={16} style={{ marginRight: 6 }} /> New Company</Button>
        </div>
        <div className="skeleton-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` } as React.CSSProperties} />
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
          <p>{companies.length} accounts</p>
        </div>
        <Button onClick={() => navigate('/companies/new')}><Plus size={16} style={{ marginRight: 6 }} /> New Company</Button>
      </div>

      {loadError && (
        <div className="error-banner animate-fade-in">
          {loadError}
        </div>
      )}

      <div className="customers-grid">
        {companies.map((c, i) => (
          <Card
            key={c.companyId}
            className="customer-card glass-panel animate-fade-in"
            style={{ animationDelay: `${i * 0.04}s` } as React.CSSProperties}
            onClick={() => navigate(`/companies/${c.companyId}`)}
          >
            <Card.Content>
              <div className="customer-header">
                <div className="company-avatar">{c.name[0]}</div>
                <div className="customer-info">
                  <h3>{c.name}</h3>
                  <p>{c.industry ?? 'Unknown industry'}</p>
                  {c.companySize && <span className="badge" style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--accent-primary)', color: 'white' }}>{c.companySize}</span>}
                </div>
              </div>
              <div className="customer-details">
                {c.website && <div className="detail-row"><Globe size={14} /><span>{c.website}</span></div>}
                {c.address && <div className="detail-row"><MapPin size={14} /><span>{c.address}</span></div>}
                {c.phone && <div className="detail-row"><Briefcase size={14} /><span>{c.phone}</span></div>}
                {c.email && <div className="detail-row"><Building2 size={14} /><span>{c.email}</span></div>}
                {c.contactCount !== undefined && <div className="detail-row"><Building size={14} /><span>{c.contactCount} contacts</span></div>}
                {c.sourceName && <div className="detail-row"><span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Source: {c.sourceName}</span></div>}
              </div>
            </Card.Content>
          </Card>
        ))}
        {companies.length === 0 && !loadError && (
          <EmptyState
            title="No companies found"
            description="Get started by adding your first company to the CRM."
            icon={Building}
            actionText="New Company"
            onActionClick={() => navigate('/companies/new')}
          />
        )}
      </div>
    </Layout>
  );
};