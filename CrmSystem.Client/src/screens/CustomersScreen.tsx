import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, Building, Plus, Search, Tag, UserCheck, Users, X, Trash2, Filter, RotateCcw } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { DateRangePicker } from '../components/ui/DateRangePicker';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import SearchableMultiSelect from '../components/ui/SearchableMultiSelect';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { showToast } from '../lib/toast';
import { confirmAction } from '../lib/confirm';
import './screens.css';

interface TagItem { id: number; name: string; }
interface Lookup { id: number; name: string; role?: string; }
interface CustomerApiResponse {
  customerId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  companyId?: number;
  companyName?: string;
  sourceId?: number;
  sourceName?: string;
  assignedRepId: number;
  assignedRepName: string;
  assignedRepEmail?: string;
  createdAt: string;
  isDeleted: boolean;
  tags: { tagId: number; name: string }[];
}
interface Customer {
  customerId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  companyId?: number;
  companyName?: string;
  sourceId?: number;
  sourceName?: string;
  assignedRepId: number;
  assignedRepName: string;
  assignedRepEmail?: string;
  createdAt: string;
  isDeleted: boolean;
  tags: { tagId: number; name: string }[];
}

const csvCell = (value: string | undefined) => `"${(value ?? '').replace(/"/g, '""')}"`;

export const CustomersScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isManagerOrAbove } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companies, setCompanies] = useState<Lookup[]>([]);
  const [sources, setSources] = useState<Lookup[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [reps, setReps] = useState<Lookup[]>([]);
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [repId, setRepId] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkTagId, setBulkTagId] = useState('');
  const [bulkRepId, setBulkRepId] = useState('');
  const [bulkCompanyId, setBulkCompanyId] = useState('');
  const [repRoleFilter, setRepRoleFilter] = useState('All');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  interface UserLookup { id: number; name: string; role: string; }

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const dateFromParam = startDate ? `&createdFrom=${startDate}` : '';
      const dateToParam = endDate ? `&createdTo=${endDate}` : '';
      const includeDeletedParam = includeDeleted ? '&includeDeleted=true' : '';
      const [customerData, companyData, sourceData, tagData, userData] = await Promise.all([
        api.get<{ data: CustomerApiResponse[] }>(`/api/customers?page=1&pageSize=100${dateFromParam}${dateToParam}${includeDeletedParam}`),
        api.get<{ data: { companyId: number; name: string }[] }>('/api/companies?page=1&pageSize=100'),
        api.get<{ id: number; name: string }[]>('/api/sources'),
        api.get<TagItem[]>('/api/tags'),
        isManagerOrAbove ? api.get<UserLookup[]>('/api/users') : Promise.resolve([] as UserLookup[]),
      ]);
      setCustomers((customerData.data ?? []).map(customer => ({
        customerId: customer.customerId,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        jobTitle: customer.jobTitle,
        companyId: customer.companyId,
        companyName: customer.companyName,
        sourceId: customer.sourceId,
        sourceName: customer.sourceName,
        assignedRepId: customer.assignedRepId,
        assignedRepName: customer.assignedRepName,
        assignedRepEmail: customer.assignedRepEmail,
        createdAt: customer.createdAt,
        isDeleted: customer.isDeleted,
        tags: (customer.tags ?? []).map(tag => ({ tagId: tag.tagId, name: tag.name })),
      })));
      const rawCompanies = (companyData.data ?? []).map(c => ({ id: c.companyId, name: c.name }));
      const nonOtherCompanies = rawCompanies.filter(c => c.name.trim().toLowerCase() !== 'other');
      const otherCompany = rawCompanies.find(c => c.name.trim().toLowerCase() === 'other');
      setCompanies(otherCompany ? [...nonOtherCompanies, otherCompany] : [...nonOtherCompanies, { id: 999999, name: 'Other' }]);
      const rawSources = sourceData ?? [];
      const nonOtherSources = rawSources.filter(s => s.name.trim().toLowerCase() !== 'other');
      const otherSource = rawSources.find(s => s.name.trim().toLowerCase() === 'other');
      setSources(otherSource ? [...nonOtherSources, otherSource] : nonOtherSources);
      setTags(tagData ?? []);
      setReps((userData ?? []).map(u => ({ id: u.id, name: u.name, role: u.role })));
    } catch (err) {
      // Capture specific error message for debugging
      const errMsg = (err as any)?.message ?? 'Failed to load customers. Please try again.';
      console.error('Customers load error:', err);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [isManagerOrAbove, startDate, endDate, includeDeleted]);

  useEffect(() => { load(); }, [load, location.key]);

  const filtered = useMemo(() => customers.filter(customer => {
    const term = search.trim().toLowerCase();
    return (!term || `${customer.firstName} ${customer.lastName} ${customer.email}`.toLowerCase().includes(term)) &&
      (!companyId || customer.companyId === Number(companyId)) &&
      (!sourceId || customer.sourceId === Number(sourceId)) &&
      (!repId || customer.assignedRepId === Number(repId)) &&
      (tagIds.length === 0 || tagIds.every(id => customer.tags.some(tag => tag.tagId === Number(id))));
  }), [customers, search, companyId, sourceId, tagIds, repId]);

  const toggleSelection = (id: number) => setSelected(current => {
    const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const selectAll = () => {
    const selectable = filtered.filter(c => !c.isDeleted);
    if (selectable.length === 0) return;
    if (selected.size === selectable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectable.map(c => c.customerId)));
    }
  };

  const handleDeleteSingle = async (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    const confirmed = await confirmAction(
      `Are you sure you want to delete customer "${customer.firstName} ${customer.lastName}"?`
    );
    if (!confirmed) return;

    const prev = customers.slice();
    if (!includeDeleted) {
      setCustomers(cs => cs.filter(c => c.customerId !== customer.customerId));
    } else {
      setCustomers(cs => cs.map(c => c.customerId === customer.customerId ? { ...c, isDeleted: true } : c));
    }

    try {
      await api.delete(`/api/customers/${customer.customerId}`);
      showToast(`Customer "${customer.firstName} ${customer.lastName}" deleted.`, 'success');
      load();
    } catch (err: any) {
      setCustomers(prev);
      showToast(err?.message || 'Failed to delete customer.', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    const count = selected.size;
    const confirmed = await confirmAction(
      `Are you sure you want to delete all ${count} selected customer${count > 1 ? 's' : ''}? This will move them to the deleted archive.`
    );
    if (!confirmed) return;

    setBulkLoading(true);
    const prev = customers.slice();
    if (!includeDeleted) {
      setCustomers(cs => cs.filter(c => !selected.has(c.customerId)));
    } else {
      setCustomers(cs => cs.map(c => selected.has(c.customerId) ? { ...c, isDeleted: true } : c));
    }

    try {
      await api.post('/api/customers/bulk', {
        customerIds: [...selected],
        action: 'delete'
      });
      showToast(`Successfully deleted ${count} customer${count > 1 ? 's' : ''}.`, 'success');
      setSelected(new Set());
      load();
    } catch (e: any) {
      setCustomers(prev);
      showToast(e?.message || 'Failed to delete selected customers.', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const filteredReps = reps.filter(rep => repRoleFilter === 'All' || rep.role === repRoleFilter);

  const bulk = async (action: 'tag' | 'reassign' | 'assign_company') => {
    const value = action === 'tag' ? bulkTagId : action === 'reassign' ? bulkRepId : bulkCompanyId;
    if (!value || selected.size === 0) return;
    setBulkLoading(true); setMessage(null);

    // optimistic update
    const prev = customers.slice();
    try {
      if (action === 'tag') {
        const tagObj = tags.find(t => String(t.id) === value);
        if (tagObj) {
          setCustomers(cs => cs.map(c => {
            if (!selected.has(c.customerId)) return c;
            if (c.tags.some(t => t.tagId === tagObj.id)) return c;
            return { ...c, tags: [...c.tags, { tagId: tagObj.id, name: tagObj.name }] };
          }));
        }
      } else if (action === 'reassign') {
        const repObj = reps.find(r => String(r.id) === value);
        if (repObj) {
          setCustomers(cs => cs.map(c => selected.has(c.customerId) ? ({ ...c, assignedRepId: Number(repObj.id), assignedRepName: repObj.name }) : c));
        }
      } else if (action === 'assign_company') {
        const companyObj = companies.find(c => String(c.id) === value);
        if (companyObj) {
          setCustomers(cs => cs.map(c => selected.has(c.customerId) ? ({ ...c, companyId: Number(companyObj.id), companyName: companyObj.name }) : c));
        }
      }

      await api.post('/api/customers/bulk', {
        customerIds: [...selected],
        action,
        ...(action === 'tag' ? { tagId: Number(value) } : {}),
        ...(action === 'reassign' ? { newRepId: Number(value) } : {}),
        ...(action === 'assign_company' ? { newCompanyId: Number(value) } : {})
      });
      setMessage('Bulk action completed successfully.');
      setSelected(new Set()); setBulkTagId(''); setBulkRepId(''); setBulkCompanyId('');
    } catch (e) {
      setCustomers(prev);
      setMessage('Bulk action failed; changes reverted.');
    } finally {
      setBulkLoading(false);
    }
  };

  const exportSelected = () => {
    const rows = filtered.filter(c => selected.has(c.customerId));
    const csv = [['Name', 'Company', 'Email', 'Phone', 'Assigned rep', 'Source', 'Tags'].map(csvCell).join(','), ...rows.map(c =>
      [`${c.firstName} ${c.lastName}`, c.companyName, c.email, c.phone, c.assignedRepName, c.sourceName, c.tags.map(t => t.name).join('; ')].map(csvCell).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'customers.csv'; link.click(); URL.revokeObjectURL(url);
  };

  if (loading && !customers.length) {
    return (
      <Layout>
        <div className="dashboard-header animate-fade-in">
          <div className="dashboard-title">
            <h1>Customers</h1>
            <p>Loading customer contacts...</p>
          </div>
          <Button disabled><Plus size={16} style={{ marginRight: 6 }} /> New Customer</Button>
        </div>
        <div className="table-skeleton animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} variant="rect" height={52} style={{ borderRadius: '8px', animationDelay: `${i * 0.05}s` }} />
          ))}
        </div>
      </Layout>
    );
  }

  return <Layout>
    <div className="dashboard-header animate-fade-in"><div className="dashboard-title"><h1>Customers</h1><p>{filtered.length} contacts found</p></div><Button onClick={() => navigate('/customers/new')}><Plus size={16} /> New Customer</Button></div>
    {error && <div className="error-banner">{error}</div>}
    {message && <div className="success-banner">{message}</div>}
    {/* Ultra-Attractive Search & Filter Bar */}
    <div className="glass-panel animate-fade-in" style={{ padding: '1.25rem 1.5rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid var(--border-color)', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)' }}>
      {/* Top Search Input Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
        {/* Search Input Box */}
        <div style={{ position: 'relative', flex: '1 1 280px', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="filter-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customers by name, email, or company..."
            style={{
              paddingLeft: '2.75rem',
              paddingRight: search ? '2.5rem' : '1rem',
              height: '42px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              width: '100%',
              transition: 'all 0.2s ease'
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '0.75rem',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.2rem',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Dropdowns Group */}
        <div style={{ minWidth: 160, flex: '1 1 160px' }}>
          <SearchableSelect
            value={companyId}
            options={[
              { value: '', label: '🏢 All Companies' },
              ...companies.map(c => ({ value: String(c.id), label: c.name }))
            ]}
            onChange={val => setCompanyId(String(val))}
            placeholder="🏢 All Companies"
          />
        </div>

        <div style={{ minWidth: 150, flex: '1 1 150px' }}>
          <SearchableSelect
            value={sourceId}
            options={[
              { value: '', label: '🎯 All Sources' },
              ...sources.map(s => ({ value: String(s.id), label: s.name }))
            ]}
            onChange={val => setSourceId(String(val))}
            placeholder="🎯 All Sources"
          />
        </div>

        <div style={{ minWidth: 190, flex: '1 1 190px' }}>
          <SearchableMultiSelect
            options={tags.map(t => ({ id: t.id, name: t.name }))}
            selectedIds={tagIds}
            onChange={setTagIds}
            placeholder="🏷️ Filter tags…"
          />
        </div>

        {isManagerOrAbove && (
          <div style={{ minWidth: 170, flex: '1 1 170px' }}>
            <SearchableSelect
              value={repId}
              options={[
                { value: '', label: '👤 All Assigned Reps' },
                ...reps.map(r => ({ value: String(r.id), label: `${r.name}${r.role ? ` (${r.role})` : ''}` }))
              ]}
              onChange={val => setRepId(String(val))}
              placeholder="👤 All Assigned Reps"
            />
          </div>
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

        {(Boolean(search.trim() || companyId || sourceId || tagIds.length > 0 || repId || startDate || endDate)) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearch('');
              setCompanyId('');
              setSourceId('');
              setTagIds([]);
              setRepId('');
              setStartDate('');
              setEndDate('');
            }}
            style={{ height: '42px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '0 0.85rem' }}
          >
            <RotateCcw size={14} style={{ marginRight: 4 }} /> Reset All
          </Button>
        )}
      </div>

      {/* Active Filter Chips / Pills Bar */}
      {(Boolean(search.trim() || companyId || sourceId || tagIds.length > 0 || repId || startDate || endDate || includeDeleted)) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--border-color)' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={13} /> Active Filters:
          </span>

          {search.trim() && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
              Search: "{search.trim()}"
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />
            </span>
          )}

          {companyId && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              Company: {companies.find(c => String(c.id) === companyId)?.name || companyId}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setCompanyId('')} />
            </span>
          )}

          {sourceId && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              Source: {sources.find(s => String(s.id) === sourceId)?.name || sourceId}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSourceId('')} />
            </span>
          )}

          {repId && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(139, 92, 246, 0.12)', color: '#7c3aed', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
              Rep: {reps.find(r => String(r.id) === repId)?.name || repId}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setRepId('')} />
            </span>
          )}

          {tagIds.length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(236, 72, 153, 0.12)', color: '#db2777', border: '1px solid rgba(236, 72, 153, 0.25)' }}>
              Tags: {tagIds.map(id => tags.find(t => String(t.id) === id)?.name || id).join(', ')}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setTagIds([])} />
            </span>
          )}

          {(startDate || endDate) && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(100, 116, 139, 0.12)', color: '#475569', border: '1px solid rgba(100, 116, 139, 0.25)' }}>
              Date: {startDate || 'Start'} to {endDate || 'End'}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => { setStartDate(''); setEndDate(''); }} />
            </span>
          )}
          
          {includeDeleted && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              Show Deleted
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => setIncludeDeleted(false)} />
            </span>
          )}
        </div>
      )}
    </div>
    {selected.size > 0 && <div className="bulk-panel"><span>{selected.size} selected</span>
      <select className="filter-select" disabled={bulkLoading} value={bulkTagId} onChange={e => setBulkTagId(e.target.value)}><option value="">Add tag…</option>{tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <Button size="sm" disabled={bulkLoading} onClick={() => bulk('tag')}><Tag size={14} /> Add tag</Button>
      {isManagerOrAbove && <>
        <select className="filter-select" value={repRoleFilter} onChange={e => setRepRoleFilter(e.target.value)}>
          <option value="All">All reps</option>
          <option value="SalesRep">As user</option>
          <option value="Manager">As manager</option>
        </select>
        <select className="filter-select" disabled={bulkLoading} value={bulkRepId} onChange={e => setBulkRepId(e.target.value)}><option value="">Reassign to…</option>{filteredReps.map((r, index) => <option key={r.id != null ? `rep-${r.id}` : `rep-${index}`} value={r.id}>{r.name}{r.role ? ` (${r.role})` : ''}</option>)}</select>
        <Button size="sm" disabled={bulkLoading} onClick={() => bulk('reassign')}><UserCheck size={14} /> Reassign</Button>
        <select className="filter-select" disabled={bulkLoading} value={bulkCompanyId} onChange={e => setBulkCompanyId(e.target.value)}>
          <option value="">Assign to company…</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Button size="sm" disabled={bulkLoading} onClick={() => bulk('assign_company')}><Building size={14} /> Assign Company</Button>
      </>}
      <Button 
        size="sm" 
        disabled={bulkLoading} 
        onClick={handleBulkDelete}
        style={{ 
          background: 'rgba(239, 68, 68, 0.15)', 
          color: '#ef4444', 
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontWeight: 600
        }}
      >
        <Trash2 size={14} /> Delete ({selected.size})
      </Button>
      <Button size="sm" variant="secondary" onClick={exportSelected}><Download size={14} /> Export CSV</Button>
      <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X size={14} /></Button>
    </div>}
    {filtered.length === 0 && !error ? <EmptyState title="No customers found" description="Adjust your filters or create a new customer." icon={Users} actionText="New Customer" onActionClick={() => navigate('/customers/new')} /> :
      <div className="customer-table-wrap"><table className="customer-table"><thead><tr><th><input type="checkbox" aria-label="Select all customers" checked={filtered.filter(c => !c.isDeleted).length > 0 && selected.size === filtered.filter(c => !c.isDeleted).length} onChange={selectAll} /></th><th>Name</th><th>Job Title</th><th>Company</th><th>Email</th><th>Phone</th><th>Assigned rep</th><th>Source</th><th>Tags</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead><tbody>{filtered.map(customer => <tr key={customer.customerId} onClick={() => navigate(`/customers/${customer.customerId}`)} style={customer.isDeleted ? { opacity: 0.6, background: 'var(--bg-secondary)' } : {}}><td onClick={e => e.stopPropagation()}><input type="checkbox" disabled={customer.isDeleted} checked={selected.has(customer.customerId)} onChange={() => toggleSelection(customer.customerId)} aria-label={`Select ${customer.firstName} ${customer.lastName}`} /></td><td>{customer.firstName} {customer.lastName} {customer.isDeleted && <span className="deleted-badge" style={{ marginLeft: 6, fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>Deleted</span>}</td><td>{customer.jobTitle ?? '—'}</td><td>{customer.companyName ?? '—'}</td><td>{customer.email}</td><td>{customer.phone ?? '—'}</td><td>{customer.assignedRepName}</td><td>{customer.sourceName ?? '—'}</td><td><div className="tag-list">{customer.tags.map(tag => <span className="tag-badge" key={tag.tagId}>{tag.name}</span>)}</div></td><td onClick={e => e.stopPropagation()} style={{ textAlign: 'right' }}>{!customer.isDeleted && <button type="button" onClick={e => handleDeleteSingle(e, customer)} title="Delete customer" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center' }} onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}><Trash2 size={15} /></button>}</td></tr>)}</tbody></table></div>}
  </Layout>;
};
