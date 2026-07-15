import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, Building, Plus, Search, Tag, UserCheck, Users, X } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import SearchableMultiSelect from '../components/ui/SearchableMultiSelect';
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
  const [bulkLoading, setBulkLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [repId, setRepId] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkTagId, setBulkTagId] = useState('');
  const [bulkRepId, setBulkRepId] = useState('');
  const [bulkCompanyId, setBulkCompanyId] = useState('');
  const [repRoleFilter, setRepRoleFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  interface UserLookup { id: number; name: string; role: string; }

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [customerData, companyData, sourceData, tagData, userData] = await Promise.all([
        api.get<{ data: CustomerApiResponse[] }>('/api/customers?page=1&pageSize=100'),
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
        tags: (customer.tags ?? []).map(tag => ({ tagId: tag.tagId, name: tag.name })),
      })));
      setCompanies((companyData.data ?? []).map(c => ({ id: c.companyId, name: c.name })));
      setSources(sourceData ?? []);
      setTags(tagData ?? []);
      setReps((userData ?? []).map(u => ({ id: u.id, name: u.name, role: u.role })));
    } catch {
      setError('Failed to load customers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isManagerOrAbove]);

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
  const selectAll = () => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(c => c.customerId)));

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

  if (loading) return <Layout><div className="dashboard-header"><div className="dashboard-title"><h1>Customers</h1><p>Loading customers…</p></div></div><div className="table-skeleton">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} variant="rect" height={46} />)}</div></Layout>;

  return <Layout>
    <div className="dashboard-header animate-fade-in"><div className="dashboard-title"><h1>Customers</h1><p>{filtered.length} contacts found</p></div><Button onClick={() => navigate('/customers/new')}><Plus size={16} /> New Customer</Button></div>
    {error && <div className="error-banner">{error}</div>}
    {message && <div className="success-banner">{message}</div>}
    <div className="filters-bar customer-filters">
      <div style={{ position: 'relative', flex: '1 1 230px' }}><Search size={16} className="filter-icon" /><input className="filter-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers…" /></div>
      <select className="filter-select" value={companyId} onChange={e => setCompanyId(e.target.value)}><option value="">All companies</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select className="filter-select" value={sourceId} onChange={e => setSourceId(e.target.value)}><option value="">All sources</option>{sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <div style={{ minWidth: 220 }}>
        <SearchableMultiSelect options={tags.map(t => ({ id: t.id, name: t.name }))} selectedIds={tagIds} onChange={setTagIds} placeholder="Filter tags…" />
      </div>
      {isManagerOrAbove && <select className="filter-select" value={repId} onChange={e => setRepId(e.target.value)}><option value="">All assigned reps</option>{reps.map(r => <option key={r.id} value={r.id}>{r.name}{r.role ? ` (${r.role})` : ''}</option>)}</select>}
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
        <select className="filter-select" disabled={bulkLoading} value={bulkRepId} onChange={e => setBulkRepId(e.target.value)}><option value="">Reassign to…</option>{filteredReps.map(r => <option key={r.id} value={r.id}>{r.name}{r.role ? ` (${r.role})` : ''}</option>)}</select>
        <Button size="sm" disabled={bulkLoading} onClick={() => bulk('reassign')}><UserCheck size={14} /> Reassign</Button>
        <select className="filter-select" disabled={bulkLoading} value={bulkCompanyId} onChange={e => setBulkCompanyId(e.target.value)}>
          <option value="">Assign to company…</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Button size="sm" disabled={bulkLoading} onClick={() => bulk('assign_company')}><Building size={14} /> Assign Company</Button>
      </>}
      <Button size="sm" variant="secondary" onClick={exportSelected}><Download size={14} /> Export CSV</Button>
      <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X size={14} /></Button>
    </div>}
    {filtered.length === 0 && !error ? <EmptyState title="No customers found" description="Adjust your filters or create a new customer." icon={Users} actionText="New Customer" onActionClick={() => navigate('/customers/new')} /> :
      <div className="customer-table-wrap"><table className="customer-table"><thead><tr><th><input type="checkbox" aria-label="Select all customers" checked={filtered.length > 0 && selected.size === filtered.length} onChange={selectAll} /></th><th>Name</th><th>Job Title</th><th>Company</th><th>Email</th><th>Phone</th><th>Assigned rep</th><th>Source</th><th>Tags</th></tr></thead><tbody>{filtered.map(customer => <tr key={customer.customerId} onClick={() => navigate(`/customers/${customer.customerId}`)}><td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selected.has(customer.customerId)} onChange={() => toggleSelection(customer.customerId)} aria-label={`Select ${customer.firstName} ${customer.lastName}`} /></td><td>{customer.firstName} {customer.lastName}</td><td>{customer.jobTitle ?? '—'}</td><td>{customer.companyName ?? '—'}</td><td>{customer.email}</td><td>{customer.phone ?? '—'}</td><td>{customer.assignedRepName}</td><td>{customer.sourceName ?? '—'}</td><td><div className="tag-list">{customer.tags.map(tag => <span className="tag-badge" key={tag.tagId}>{tag.name}</span>)}</div></td></tr>)}</tbody></table></div>}
  </Layout>;
};
