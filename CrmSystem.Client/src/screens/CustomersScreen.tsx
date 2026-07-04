import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Mail, Phone, MapPin, Plus, Search, Tag, UserCheck, X } from 'lucide-react';
import './screens.css';

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  source?: string;
  tags?: string[];
  assignedRepId?: number;
}

interface Tag { tagId: number; name: string; }

const SOURCES = ['', 'Referral', 'Website', 'Advertisement', 'ColdCall', 'TradeShow'];

export const CustomersScreen: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [tags, setTags] = useState<Tag[]>([]);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkTagId, setBulkTagId] = useState('');
  const navigate = useNavigate();
  const { isManagerOrAbove } = useAuth();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cData, tData] = await Promise.all([
        api.get<{ items: Customer[] }>('/api/customers?page=1&pageSize=100'),
        api.get<Tag[]>('/api/tags'),
      ]);
      setCustomers(cData.items ?? []);
      setTags(tData ?? []);
    } catch {
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let list = customers;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(s) ||
        c.email.toLowerCase().includes(s)
      );
    }
    if (sourceFilter) list = list.filter(c => c.source === sourceFilter);
    setFiltered(list);
  }, [customers, search, sourceFilter]);

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkAddTag = async () => {
    if (!bulkTagId) return;
    await api.post('/api/customers/bulk', {
      customerIds: Array.from(selected),
      actionType: 'AddTag',
      actionValue: bulkTagId,
    });
    setSelected(new Set());
    setShowBulkPanel(false);
    fetchData();
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading customers...</p>
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
            key={customer.id}
            className={`customer-card glass-panel animate-fade-in ${selected.has(customer.id) ? 'card-selected' : ''}`}
            style={{ animationDelay: `${i * 0.04}s` } as React.CSSProperties}
          >
            <Card.Content>
              <div className="customer-header">
                <input
                  type="checkbox"
                  className="customer-checkbox"
                  checked={selected.has(customer.id)}
                  onChange={() => toggleSelect(customer.id)}
                  onClick={e => e.stopPropagation()}
                />
                <div
                  className="customer-avatar"
                  onClick={() => navigate(`/customers/${customer.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {customer.firstName[0]}{customer.lastName[0]}
                </div>
                <div className="customer-info" onClick={() => navigate(`/customers/${customer.id}`)} style={{ cursor: 'pointer' }}>
                  <h3>{customer.firstName} {customer.lastName}</h3>
                  <p>{customer.source ?? 'No source'}</p>
                </div>
              </div>
              <div className="customer-details">
                <div className="detail-row"><Mail size={14} /><span>{customer.email}</span></div>
                {customer.phone && <div className="detail-row"><Phone size={14} /><span>{customer.phone}</span></div>}
                {customer.tags && customer.tags.length > 0 && (
                  <div className="detail-row tag-row">
                    <Tag size={14} />
                    <div className="tag-list">
                      {customer.tags.map(t => <span key={t} className="tag-badge">{t}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="loading-state" style={{ gridColumn: '1 / -1' }}>
            <p>No customers match your filters.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};
