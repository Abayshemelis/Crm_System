import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Mail, Phone, MapPin, Plus, Search, Tag, UserCheck, X, Users } from 'lucide-react';
import './screens.css';

interface Customer {
    customerId: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    sourceName?: string;
    tags?: Tag[];
    assignedRepId?: number;
}

interface Tag { tagId: number; name: string; colorHex?: string; }

const SOURCES = ['', 'Referral', 'Website', 'Advertisement', 'ColdCall', 'TradeShow'];

export const CustomersScreen: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [tags, setTags] = useState<Tag[]>([]);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkTagId, setBulkTagId] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { isManagerOrAbove } = useAuth();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [cData, tData] = await Promise.all([
        api.get<{ data: Customer[] }>('/api/customers?page=1&pageSize=100'),
        api.get<Tag[]>('/api/tags'),
      ]);
      setCustomers(cData.data ?? []);
      setTags(tData ?? []);
    } catch (error: any) {
      setLoadError('Failed to load customers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData, location.key]);

  useEffect(() => {
    let list = customers;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(s) ||
        c.email.toLowerCase().includes(s)
      );
    }
    if (sourceFilter) list = list.filter(c => c.sourceName === sourceFilter);
    setFiltered(list);
  }, [customers, search, sourceFilter]);

  const toggleSelect = (customerId: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(customerId) ? next.delete(customerId) : next.add(customerId);
      return next;
    });
  };

  const handleBulkAddTag = async () => {
    if (!bulkTagId || selected.size === 0) return;
    await api.post('/api/customers/bulk', {
      customerIds: Array.from(selected),
      action: 'tag',
      tagId: Number(bulkTagId),
    });
    setSelected(new Set());
    setShowBulkPanel(false);
    fetchData();
  };

  // Loading state with skeleton cards
  if (isLoading) {
    return (
      <Layout>
        <div className="dashboard-header animate-fade-in">
          <div className="dashboard-title">
            <h1>Customers</h1>
            <p>Loading customers...</p>
          </div>
          <Button disabled><Plus size={16} style={{ marginRight: 6 }} /> New Customer</Button>
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
          <h1>Customers</h1>
          <p>{filtered.length} contacts found</p>
        </div>
        <Button onClick={() => navigate('/customers/new')}>
          <Plus size={16} style={{ marginRight: 6 }} /> New Customer
        </Button>
      </div>

      {loadError && (
        <div className="error-banner animate-fade-in">
          {loadError}
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar animate-fade-in">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} className="filter-icon" />
          <input
            className="filter-input"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
          {SOURCES.map(s => <option key={s} value={s}>{s || 'All Sources'}</option>)}
        </select>
        {selected.size > 0 && (
          <Button variant="secondary" size="sm" onClick={() => setShowBulkPanel(true)}>
            <Tag size={14} style={{ marginRight: 6 }} /> Bulk Action ({selected.size})
          </Button>
        )}
      </div>

      {/* Bulk Action Panel */}
      {showBulkPanel && (
        <div className="bulk-panel animate-fade-in">
          <span>{selected.size} customers selected</span>
          <select className="filter-select" value={bulkTagId} onChange={e => setBulkTagId(e.target.value)}>
            <option value="">Select tag to add...</option>
            {tags.map(t => <option key={t.tagId} value={String(t.tagId)}>{t.name}</option>)}
          </select>
          <Button size="sm" onClick={handleBulkAddTag}><Tag size={14} style={{ marginRight: 6 }} /> Apply Tag</Button>
          <Button variant="ghost" size="sm" onClick={() => { setShowBulkPanel(false); setSelected(new Set()); }}>
            <X size={14} />
          </Button>
        </div>
      )}

      {/* Customer Grid */}
      <div className="customers-grid">
        {filtered.map((customer, i) => (
          <Card
            key={customer.customerId}
            className={`customer-card glass-panel animate-fade-in ${selected.has(customer.customerId) ? 'card-selected' : ''}`}
            style={{ animationDelay: `${i * 0.04}s` } as React.CSSProperties}
          >
            <Card.Content>
              <div className="customer-header">
                <input
                  type="checkbox"
                  className="customer-checkbox"
                  checked={selected.has(customer.customerId)}
                  onChange={() => toggleSelect(customer.customerId)}
                  onClick={e => e.stopPropagation()}
                />
                <div
                  className="customer-avatar"
                  onClick={() => navigate(`/customers/${customer.customerId}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {customer.firstName[0]}{customer.lastName[0]}
                </div>
                <div className="customer-info" onClick={() => navigate(`/customers/${customer.customerId}`)} style={{ cursor: 'pointer' }}>
                  <h3>{customer.firstName} {customer.lastName}</h3>
                  <p>{customer.sourceName ?? 'No source'}</p>
                </div>
              </div>
              <div className="customer-details">
                <div className="detail-row"><Mail size={14} /><span>{customer.email}</span></div>
                {customer.phone && <div className="detail-row"><Phone size={14} /><span>{customer.phone}</span></div>}
                {customer.tags && customer.tags.length > 0 && (
                  <div className="detail-row tag-row">
                    <Tag size={14} />
                    <div className="tag-list">
                      {customer.tags.map(t => <span key={t.tagId} className="tag-badge">{t.name}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>
        ))}
        {filtered.length === 0 && !loadError && (
          <EmptyState
            title="No customers found"
            description="Try adjusting your search or filter criteria, or create a new customer."
            icon={Users}
            actionText="New Customer"
            onActionClick={() => navigate('/customers/new')}
          />
        )}
      </div>
    </Layout>
  );
};