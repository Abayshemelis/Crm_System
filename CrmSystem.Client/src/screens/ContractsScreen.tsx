import React, { useEffect, useState, useCallback } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ContractModal, ContractItem } from '../components/contracts/ContractModal';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';
import { Plus, Search, FileText, CheckCircle, Clock } from 'lucide-react';
import './screens.css';

export const ContractsScreen: React.FC = () => {
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Contract Form State
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [opportunities, setOpportunities] = useState<{ id: number; title: string; value: number; stage: string }[]>([]);
  const [loadingOpps, setLoadingOpps] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState(0);
  const [newOpportunityId, setNewOpportunityId] = useState(0);
  const [newTitle, setNewTitle] = useState('');
  const [newValue, setNewValue] = useState(10000);
  const [creating, setCreating] = useState(false);

  // Edit Contract State
  const [editingContract, setEditingContract] = useState<ContractItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editValue, setEditValue] = useState(0);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editOpportunityId, setEditOpportunityId] = useState<number | null>(null);
  const [editOpps, setEditOpps] = useState<{ id: number; title: string; value: number; stage: string }[]>([]);
  const [loadingEditOpps, setLoadingEditOpps] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchContracts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<ContractItem[]>(`/api/contracts?status=${statusFilter}`);
      setContracts(data);
    } catch {
      showToast('Failed to load contracts', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  useEffect(() => {
    api.get<{ data: any[] }>('/api/customers?pageSize=500').then(res => {
      const items = Array.isArray(res) ? res : (res?.data ?? []);
      setCustomers(items.map((c: any) => ({ id: c.customerId, name: `${c.firstName} ${c.lastName}`.trim() })));
    }).catch(() => {});
  }, []);

  // When customer changes, fetch deals in Negotiation / Closing / Won only
  useEffect(() => {
    setNewOpportunityId(0);
    setNewTitle('');
    setOpportunities([]);
    if (!newCustomerId) return;

    const CONTRACT_STAGES = ['negotiation', 'closing', 'won'];

    setLoadingOpps(true);
    api.get<any>(`/api/opportunities?customerId=${newCustomerId}`)
      .then(raw => {
        const list: any[] = Array.isArray(raw) ? raw : [];
        const mapped = list
          .filter((o: any) => {
            const s = (o.stageName ?? '').toLowerCase();
            return CONTRACT_STAGES.some(stage => s.includes(stage));
          })
          .map((o: any) => ({
            id:    Number(o.opportunityId),
            title: String(o.title ?? ''),
            value: Number(o.estimatedValue ?? 0),
            stage: String(o.stageName ?? 'Unknown'),
          }));
        setOpportunities(mapped);
      })
      .catch((err) => {
        console.error('Failed to load opportunities:', err);
        showToast('Could not load deals for this customer', 'error');
      })
      .finally(() => setLoadingOpps(false));
  }, [newCustomerId]);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerId || !newTitle.trim()) {
      showToast('Please select a customer and enter a contract title.', 'error');
      return;
    }
    setCreating(true);
    try {
      await api.post('/api/contracts', {
        customerId: newCustomerId,
        opportunityId: newOpportunityId || null,
        title: newTitle.trim(),
        contractValue: newValue,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
      showToast('Contract draft created successfully!');
      setShowCreateModal(false);
      setNewTitle('');
      setNewOpportunityId(0);
      setNewCustomerId(0);
      setOpportunities([]);
      fetchContracts();
    } catch {
      showToast('Failed to create contract', 'error');
    } finally {
      setCreating(false);
    }
  };

  const CONTRACT_STAGES = ['negotiation', 'closing', 'won'];

  const openEdit = (c: ContractItem) => {
    setEditingContract(c);
    setEditTitle(c.title);
    setEditValue(c.contractValue);
    setEditStartDate(c.startDate ? c.startDate.slice(0, 10) : '');
    setEditEndDate(c.endDate ? c.endDate.slice(0, 10) : '');
    setEditNotes(c.notes ?? '');
    setEditOpportunityId(c.opportunityId ?? null);
    setEditOpps([]);
    // Load eligible deals for this customer
    setLoadingEditOpps(true);
    api.get<any>(`/api/opportunities?customerId=${c.customerId}`)
      .then(raw => {
        const list: any[] = Array.isArray(raw) ? raw : [];
        setEditOpps(
          list
            .filter((o: any) => CONTRACT_STAGES.some(s => (o.stageName ?? '').toLowerCase().includes(s)))
            .map((o: any) => ({
              id: Number(o.opportunityId),
              title: String(o.title ?? ''),
              value: Number(o.estimatedValue ?? 0),
              stage: String(o.stageName ?? ''),
            }))
        );
      })
      .catch((err) => {
        console.error('Edit opps fetch failed:', err);
        showToast('Could not load deals for this contract\'s customer', 'error');
      })
      .finally(() => setLoadingEditOpps(false));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContract) return;
    if (!editTitle.trim()) { showToast('Title is required', 'error'); return; }
    setSaving(true);
    try {
      await api.put(`/api/contracts/${editingContract.contractId}`, {
        title: editTitle.trim(),
        contractValue: editValue,
        startDate: editStartDate ? new Date(editStartDate).toISOString() : editingContract.startDate,
        endDate:   editEndDate   ? new Date(editEndDate).toISOString()   : editingContract.endDate,
        status: editingContract.status,
        opportunityId: editOpportunityId ?? null,
        notes: editNotes || null,
      });
      showToast('Contract updated successfully!');
      setEditingContract(null);
      fetchContracts();
    } catch {
      showToast('Failed to update contract', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredContracts = contracts.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.contractNumber.toLowerCase().includes(term) ||
      c.title.toLowerCase().includes(term) ||
      c.customerName.toLowerCase().includes(term) ||
      (c.companyName && c.companyName.toLowerCase().includes(term))
    );
  });

  const totalContractValue = contracts.reduce((acc, c) => acc + c.contractValue, 0);
  const activeContractsCount = contracts.filter(c => c.status === 'Signed' || c.status === 'Active').length;
  const pendingSignatureCount = contracts.filter(c => c.status === 'Draft' || c.status === 'SentForSignature').length;

  const statusBadge = (status: string) => {
    const signed = status === 'Signed' || status === 'Active';
    return (
      <span style={{
        padding: '0.2rem 0.6rem', borderRadius: '0.4rem',
        fontSize: '0.75rem', fontWeight: 700,
        background: signed ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
        color: signed ? '#10b981' : '#f59e0b',
        whiteSpace: 'nowrap',
      }}>
        {signed ? '✅ Signed' : '📝 Draft'}
      </span>
    );
  };

  return (
    <Layout>
      {/* Header */}
      <div className="dashboard-header animate-fade-in">
        <div className="dashboard-title">
          <h1>Commercial Contracts &amp; E-Signatures</h1>
          <p>Manage sales agreements, digital signatures, and contract renewals</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={16} style={{ marginRight: 6 }} /> Create New Contract
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="metrics-grid animate-fade-in" style={{ marginBottom: '1.5rem' }}>
        <Card className="metric-card glass-panel">
          <Card.Content>
            <div className="metric-header">
              <span className="metric-title">Total Active Value</span>
              <FileText className="metric-icon" size={20} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div className="metric-value">${totalContractValue.toLocaleString()}</div>
            <div className="metric-subtitle">Across all commercial agreements</div>
          </Card.Content>
        </Card>
        <Card className="metric-card glass-panel">
          <Card.Content>
            <div className="metric-header">
              <span className="metric-title">Executed &amp; Signed</span>
              <CheckCircle className="metric-icon" size={20} style={{ color: '#10b981' }} />
            </div>
            <div className="metric-value" style={{ color: '#10b981' }}>{activeContractsCount}</div>
            <div className="metric-subtitle">Legally executed contracts</div>
          </Card.Content>
        </Card>
        <Card className="metric-card glass-panel">
          <Card.Content>
            <div className="metric-header">
              <span className="metric-title">Pending Signature</span>
              <Clock className="metric-icon" size={20} style={{ color: '#f59e0b' }} />
            </div>
            <div className="metric-value" style={{ color: '#f59e0b' }}>{pendingSignatureCount}</div>
            <div className="metric-subtitle">Drafts awaiting signature</div>
          </Card.Content>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="filters-bar customer-filters animate-fade-in" style={{ marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={16} className="filter-icon" />
          <input
            type="text"
            className="filter-input search-input"
            placeholder="Search by contract #, title, or client..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ width: '180px' }}
        >
          <option value="All">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Signed">Signed / Executed</option>
        </select>
      </div>

      {/* Contracts List */}
      <Card className="glass-panel animate-fade-in">
        <Card.Content style={{ padding: 0 }}>
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading contracts...</div>
          ) : filteredContracts.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No contracts found. Create your first contract above.
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="contracts-table-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Contract Ref</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Title &amp; Client</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Linked Deal</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Value</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Status</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Signatory</th>
                      <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.map(c => (
                      <tr key={c.contractId} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>
                          {c.contractNumber}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.title}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {c.customerName}{c.companyName ? ` (${c.companyName})` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.82rem' }}>
                          {c.opportunityTitle
                            ? <span style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', padding: '0.15rem 0.55rem', borderRadius: '0.35rem', fontWeight: 600 }}>🔗 {c.opportunityTitle}</span>
                            : <span style={{ color: 'var(--text-muted)' }}>—</span>
                          }
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          ${c.contractValue.toLocaleString()}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>{statusBadge(c.status)}</td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {c.signedByName ? `Signed by ${c.signedByName}` : 'Awaiting signature'}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            {c.status === 'Draft' && (
                              <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>✏️ Edit</Button>
                            )}
                            <Button size="sm" variant="secondary" onClick={() => setSelectedContract(c)}>
                              {c.status === 'Signed' ? 'View' : 'Sign & View'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="contracts-mobile-list">
                {filteredContracts.map(c => (
                  <div key={c.contractId} style={{
                    borderBottom: '1px solid var(--border-color)',
                    padding: '1rem',
                    display: 'flex', flexDirection: 'column', gap: '0.5rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.82rem' }}>{c.contractNumber}</div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>{c.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {c.customerName}{c.companyName ? ` · ${c.companyName}` : ''}
                        </div>
                      </div>
                      {statusBadge(c.status)}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>${c.contractValue.toLocaleString()}</span>
                      {c.opportunityTitle && (
                        <span style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', padding: '0.1rem 0.45rem', borderRadius: '0.3rem', fontWeight: 600, fontSize: '0.78rem' }}>
                          🔗 {c.opportunityTitle}
                        </span>
                      )}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {c.signedByName ? `Signed by ${c.signedByName}` : 'Awaiting signature'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                      {c.status === 'Draft' && (
                        <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>✏️ Edit</Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => setSelectedContract(c)}>
                        {c.status === 'Signed' ? 'View Contract' : 'Sign & View'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Contract Viewer & E-Sign Modal */}
      {selectedContract && (
        <ContractModal
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
          onUpdate={fetchContracts}
        />
      )}

      {/* Edit Contract Modal */}
      {editingContract && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999, padding: '1rem', backdropFilter: 'blur(4px)',
          overflowY: 'auto',
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-color)',
            width: '100%', maxWidth: '500px',
            padding: '1.5rem', margin: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem' }}>✏️ Edit Contract</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginTop: '0.2rem', fontWeight: 600 }}>
                  {editingContract.contractNumber}
                </div>
              </div>
              <button onClick={() => setEditingContract(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.4rem', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#f59e0b', marginBottom: '1rem' }}>
              ⚠️ Only <strong>Draft</strong> contracts can be edited. Signed contracts are legally binding.
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Linked Deal */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  🔗 Linked Deal / Opportunity
                  <span style={{ fontWeight: 400, marginLeft: '0.4rem', color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <select
                  className="filter-select"
                  value={editOpportunityId ?? 0}
                  onChange={e => {
                    const id = parseInt(e.target.value, 10);
                    setEditOpportunityId(id > 0 ? id : null);
                  }}
                  style={{ width: '100%' }}
                >
                  <option value={0}>— None (no linked deal) —</option>
                  {/* Show current deal as option even while loading */}
                  {editingContract?.opportunityTitle && (editOpportunityId === (editingContract?.opportunityId ?? null)) && !editOpps.find(o => o.id === editOpportunityId) && (
                    <option value={editingContract.opportunityId ?? 0}>
                      🏷️ {editingContract.opportunityTitle} (current)
                    </option>
                  )}
                  {editOpps.map(o => (
                    <option key={o.id} value={o.id}>
                      🏷️ {o.title} · {o.stage} · ${Number(o.value).toLocaleString()}
                    </option>
                  ))}
                </select>
                {loadingEditOpps && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                    ⏳ Loading eligible deals…
                  </div>
                )}
                {!loadingEditOpps && editOpps.length === 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                    No Negotiation/Closing/Won deals found for this customer.
                  </div>
                )}
                {!loadingEditOpps && editOpps.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.3rem' }}>
                    ✓ {editOpps.length} eligible deal{editOpps.length > 1 ? 's' : ''} available
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Contract Title *</label>
                <Input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="Contract title"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Contract Value ($)</label>
                <Input
                  type="number"
                  value={editValue}
                  onChange={e => setEditValue(Number(e.target.value))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Start Date</label>
                  <Input
                    type="date"
                    value={editStartDate}
                    onChange={e => setEditStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>End Date</label>
                  <Input
                    type="date"
                    value={editEndDate}
                    onChange={e => setEditEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Notes</label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Internal notes about this contract..."
                  rows={3}
                  style={{
                    width: '100%', padding: '0.6rem 0.8rem',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <Button variant="secondary" type="button" onClick={() => setEditingContract(null)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : '💾 Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Contract Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999, padding: '1rem', backdropFilter: 'blur(4px)',
          overflowY: 'auto',
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-color)',
            width: '100%', maxWidth: '500px',
            padding: '1.5rem',
            margin: 'auto',
          }}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: 'var(--text-primary)', fontSize: '1.1rem' }}>
              📜 Create New Commercial Contract
            </h3>
            <form onSubmit={handleCreateContract} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Customer */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  1. Select Client *
                </label>
                <select
                  className="filter-select"
                  value={newCustomerId}
                  onChange={e => setNewCustomerId(Number(e.target.value))}
                  style={{ width: '100%' }}
                >
                  <option value="0">— Choose a customer —</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Opportunity */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  2. Linked Deal / Opportunity
                  <span style={{ fontWeight: 400, marginLeft: '0.4rem', color: 'var(--text-muted)' }}>(optional — auto-fills title &amp; value)</span>
                </label>
                <select
                  className="filter-select"
                  value={newOpportunityId}
                  onChange={e => {
                    const selectedId = parseInt(e.target.value, 10);
                    setNewOpportunityId(selectedId);
                    if (selectedId > 0) {
                      const found = opportunities.find(o => o.id === selectedId);
                      if (found) {
                        setNewTitle(found.title);
                        if (found.value > 0) setNewValue(found.value);
                      }
                    } else {
                      setNewTitle('');
                    }
                  }}
                  style={{ width: '100%' }}
                  disabled={!newCustomerId || loadingOpps}
                >
                  <option value={0}>
                    {!newCustomerId
                      ? '— Select a customer first —'
                      : loadingOpps
                        ? '⏳ Loading deals…'
                        : opportunities.length === 0
                          ? '— No deals found for this customer —'
                          : `— Choose from ${opportunities.length} deal${opportunities.length > 1 ? 's' : ''} —`}
                  </option>
                  {opportunities.map(o => (
                    <option key={o.id} value={o.id}>
                      🏷️ {o.title} · {o.stage} · ${Number(o.value).toLocaleString()}
                    </option>
                  ))}
                </select>
                {newCustomerId > 0 && !loadingOpps && opportunities.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.3rem' }}>
                    ✓ {opportunities.length} deal{opportunities.length > 1 ? 's' : ''} loaded — select one to auto-fill
                  </div>
                )}
                {newCustomerId > 0 && !loadingOpps && opportunities.length === 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                    No active deals found. You can still enter the title manually below.
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  3. Contract Title *
                </label>
                <Input
                  placeholder="e.g. Master Enterprise Services Agreement"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                />
              </div>

              {/* Value */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  4. Contract Value ($)
                </label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={newValue}
                  onChange={e => setNewValue(Number(e.target.value))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={creating}>
                  {creating ? 'Creating…' : '✍️ Generate Contract Draft'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};
