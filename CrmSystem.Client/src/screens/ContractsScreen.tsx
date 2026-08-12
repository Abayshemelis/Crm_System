import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ContractModal, ContractItem } from '../components/contracts/ContractModal';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';
import { Plus, Search, FileText, CheckCircle, Clock, Receipt, MoreVertical, Eye, Edit3, Link as LinkIcon, FileCheck, Mail, Trash2 } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import './screens.css';

const ContractActionMenu: React.FC<{
  contract: ContractItem;
  onCopyLink: (c: ContractItem) => void;
  onSendEmail: (c: ContractItem) => void;
  onEdit: (c: ContractItem) => void;
  onDelete: (c: ContractItem) => void;
  onInvoice: (c: ContractItem) => void;
  onView: (c: ContractItem) => void;
}> = ({ contract, onCopyLink, onSendEmail, onEdit, onDelete, onInvoice, onView }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSigned = contract.status === 'Signed' || contract.status === 'Active' || !!contract.signatureDataUrl || !!contract.signedAt || !!contract.signedByName;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
      {/* Primary Action Button */}
      {isSigned ? (
        <button
          type="button"
          onClick={() => onInvoice(contract)}
          title="Generate billing invoice from signed contract"
          style={{
            padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
            background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap'
          }}
        >
          <Receipt size={14} /> 🧾 Invoice
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onView(contract)}
          title="View contract details"
          style={{
            padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
            background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap'
          }}
        >
          <Eye size={14} /> 👁️ View
        </button>
      )}

      {/* Action Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="More contract actions"
        style={{
          padding: '0.35rem 0.55rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
          background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)',
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.2rem'
        }}
      >
        <MoreVertical size={14} />
      </button>

      {/* Floating Action Menu Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: '0.35rem', zIndex: 99999,
          background: '#1e293b', border: '1px solid #334155',
          borderRadius: '8px', boxShadow: '0 12px 30px rgba(0,0,0,0.6)', width: '195px', padding: '0.35rem',
          display: 'flex', flexDirection: 'column', gap: '0.25rem'
        }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onView(contract); setOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.55rem', width: '100%', padding: '0.5rem 0.75rem',
              borderRadius: '6px', border: 'none', background: 'transparent', color: '#f8fafc',
              fontSize: '0.82rem', textAlign: 'left', cursor: 'pointer', fontWeight: 500
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Eye size={14} style={{ color: '#94a3b8' }} /> View Document
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCopyLink(contract); setOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.55rem', width: '100%', padding: '0.5rem 0.75rem',
              borderRadius: '6px', border: 'none', background: 'transparent', color: '#818cf8',
              fontSize: '0.82rem', textAlign: 'left', cursor: 'pointer', fontWeight: 500
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <LinkIcon size={14} /> Copy Signing Link
          </button>

          {!isSigned && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSendEmail(contract); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.55rem', width: '100%', padding: '0.5rem 0.75rem',
                borderRadius: '6px', border: 'none', background: 'transparent', color: '#38bdf8',
                fontSize: '0.82rem', textAlign: 'left', cursor: 'pointer', fontWeight: 500
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Mail size={14} /> Email Signing Link
            </button>
          )}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(contract); setOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.55rem', width: '100%', padding: '0.5rem 0.75rem',
              borderRadius: '6px', border: 'none', background: 'transparent', color: '#f59e0b',
              fontSize: '0.82rem', textAlign: 'left', cursor: 'pointer', fontWeight: 500
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Edit3 size={14} /> Edit Contract
          </button>

          {isSigned && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onInvoice(contract); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.55rem', width: '100%', padding: '0.5rem 0.75rem',
                borderRadius: '6px', border: 'none', background: 'transparent', color: '#10b981',
                fontSize: '0.82rem', textAlign: 'left', cursor: 'pointer', fontWeight: 500
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Receipt size={14} /> Generate Invoice
            </button>
          )}

          <div style={{ height: '1px', background: '#334155', margin: '0.2rem 0' }} />

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(contract); setOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.55rem', width: '100%', padding: '0.5rem 0.75rem',
              borderRadius: '6px', border: 'none', background: 'transparent', color: '#ef4444',
              fontSize: '0.82rem', textAlign: 'left', cursor: 'pointer', fontWeight: 500
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Trash2 size={14} /> Delete Contract
          </button>
        </div>
      )}
    </div>
  );
};

export const ContractsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Contract Form State
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [opportunities, setOpportunities] = useState<{ id: number; title: string; value: number; stage: string; customerId?: number; customerName?: string; companyName?: string }[]>([]);
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
  const [editStatus, setEditStatus] = useState('Draft');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editOpportunityId, setEditOpportunityId] = useState<number | null>(null);
  const [editOpps, setEditOpps] = useState<{ id: number; title: string; value: number; stage: string; customerName?: string; companyName?: string }[]>([]);
  const [loadingEditOpps, setLoadingEditOpps] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchContracts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<ContractItem[]>('/api/contracts');
      setContracts(data);
    } catch {
      showToast('Failed to load contracts', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts();

    // Auto-refresh contracts whenever staff switches back to the CRM tab
    const handleFocus = () => fetchContracts();
    window.addEventListener('focus', handleFocus);

    // Live-polling every 8 seconds to auto-detect client e-signatures in real-time
    const interval = setInterval(fetchContracts, 8000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [fetchContracts]);

  useEffect(() => {
    api.get<{ data: any[] }>('/api/customers?pageSize=500').then(res => {
      const items = Array.isArray(res) ? res : (res?.data ?? []);
      setCustomers(items.map((c: any) => ({ id: c.customerId, name: `${c.firstName} ${c.lastName}`.trim() })));
    }).catch(() => {});
  }, []);

  // When customer changes, fetch all deals for this customer (or all deals if no customer selected yet)
  useEffect(() => {
    setLoadingOpps(true);
    const url = newCustomerId ? `/api/opportunities?customerId=${newCustomerId}` : `/api/opportunities`;
    api.get<any>(url)
      .then(raw => {
        const list: any[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
        const mapped = list.map((o: any) => ({
          id:           Number(o.opportunityId),
          title:        String(o.title ?? ''),
          value:        Number(o.estimatedValue ?? 0),
          stage:        String(o.stageName ?? 'Deal'),
          customerId:   Number(o.customerId ?? 0),
          customerName: `${o.customerFirstName ?? ''} ${o.customerLastName ?? ''}`.trim(),
          companyName:  String(o.companyName ?? ''),
        }));
        setOpportunities(mapped);
      })
      .catch((err) => {
        console.error('Failed to load opportunities:', err);
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

  const openEdit = (c: ContractItem) => {
    setEditingContract(c);
    setEditTitle(c.title);
    setEditValue(c.contractValue);
    setEditStatus(c.status || 'Draft');
    setEditStartDate(c.startDate ? c.startDate.slice(0, 10) : '');
    setEditEndDate(c.endDate ? c.endDate.slice(0, 10) : '');
    setEditNotes(c.notes ?? '');
    setEditOpportunityId(c.opportunityId ?? null);
    setEditOpps([]);
    // Load all deals for this customer
    setLoadingEditOpps(true);
    api.get<any>(`/api/opportunities?customerId=${c.customerId}`)
      .then(raw => {
        const list: any[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
        setEditOpps(
          list.map((o: any) => ({
            id:           Number(o.opportunityId),
            title:        String(o.title ?? ''),
            value:        Number(o.estimatedValue ?? 0),
            stage:        String(o.stageName ?? 'Deal'),
            customerName: `${o.customerFirstName ?? ''} ${o.customerLastName ?? ''}`.trim(),
            companyName:  String(o.companyName ?? ''),
          }))
        );
      })
      .catch((err) => {
        console.error('Edit opps fetch failed:', err);
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
        status: editStatus,
        startDate: editStartDate ? new Date(editStartDate).toISOString() : editingContract.startDate,
        endDate: editEndDate ? new Date(editEndDate).toISOString() : editingContract.endDate,
        notes: editNotes.trim() || null,
        opportunityId: editOpportunityId,
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

  const handleDeleteContract = async (c: ContractItem) => {
    if (!window.confirm(`Are you sure you want to delete contract ${c.contractNumber} ("${c.title}")?\nThis action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/api/contracts/${c.contractId}`);
      showToast(`Contract ${c.contractNumber} deleted successfully!`);
      fetchContracts();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to delete contract', 'error');
    }
  };

  const handleGenerateInvoice = async (c: ContractItem) => {
    try {
      await api.post('/api/invoices', {
        customerId: c.customerId,
        contractId: c.contractId,
        opportunityId: c.opportunityId ?? null,
        amount: c.contractValue,
        taxRate: 10,
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        notes: `Generated from Contract #${c.contractNumber} (${c.title})`,
        terms: 'Standard commercial billing terms apply. Payment Net 30 days.',
      });
      showToast('Invoice generated successfully!');
      navigate('/invoices');
    } catch {
      showToast('Failed to generate invoice for contract', 'error');
    }
  };

  const handleCopyPublicLink = (c: ContractItem) => {
    const token = (c as any).signingToken || c.contractNumber;
    const url = `${window.location.origin}/sign/contract/${token}`;
    navigator.clipboard.writeText(url);
    showToast('Public signing link copied to clipboard!');
  };

  const handleSendSigningEmail = async (c: ContractItem) => {
    showToast(`Sending signing request email to ${c.customerName || 'client'}...`);
    try {
      const res = await api.post<{ message: string }>(`/api/contracts/${c.contractId}/send-email`, {});
      showToast(res.message || 'Signing invitation email sent successfully!');
      fetchContracts();
    } catch (err: any) {
      let msg = 'Failed to send email';
      if (err?.message) {
        try {
          const parsed = JSON.parse(err.message);
          msg = parsed.message || err.message;
        } catch {
          msg = err.message;
        }
      }
      showToast(msg, 'error');
    }
  };

  // Central "is signed" truth — mirrors statusBadge logic
  const contractIsSigned = (c: ContractItem) =>
    (c.status || '').toLowerCase() === 'signed' ||
    (c.status || '').toLowerCase() === 'active' ||
    !!c.signatureDataUrl || !!c.signedAt || !!c.signedByName;

  const filteredContracts = contracts.filter(c => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      c.contractNumber.toLowerCase().includes(term) ||
      c.title.toLowerCase().includes(term) ||
      c.customerName.toLowerCase().includes(term) ||
      (c.companyName && c.companyName.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (statusFilter === 'Draft' || statusFilter === 'Pending') {
      // Exclude contracts that are actually signed (even if DB status hasn't updated yet)
      return !contractIsSigned(c);
    }
    if (statusFilter === 'Signed') {
      return contractIsSigned(c);
    }
    return true;
  });

  // Metric Calculations — all use the same isSigned helper
  const totalContractValue = contracts.reduce((acc, c) => acc + c.contractValue, 0);
  const activeContractsCount = contracts.filter(contractIsSigned).length;
  const pendingSignatureCount = contracts.filter(c => !contractIsSigned(c)).length;
  const signedContractValue = contracts
    .filter(contractIsSigned)
    .reduce((acc, c) => acc + c.contractValue, 0);

  const avgContractValue = contracts.length > 0 ? totalContractValue / contracts.length : 0;
  const executionRate = contracts.length > 0 ? Math.round((activeContractsCount / contracts.length) * 100) : 0;

  const statusBadge = (c: ContractItem) => {
    const isSigned = (c.status || '').toLowerCase() === 'signed' || (c.status || '').toLowerCase() === 'active' || !!c.signatureDataUrl || !!c.signedAt || !!c.signedByName;
    const s = (c.status || 'Draft').toLowerCase();

    let bg = 'rgba(245, 158, 11, 0.12)';
    let color = '#f59e0b';
    let label = c.status || 'Draft';

    if (isSigned) {
      bg = 'rgba(16, 185, 129, 0.12)';
      color = '#10b981';
      label = s === 'active' ? 'Active' : 'Signed & Executed';
    } else if (s === 'draft') {
      label = 'Draft';
    } else if (s === 'sentforsignature' || s === 'pending' || s === 'awaiting') {
      bg = 'rgba(56, 189, 248, 0.12)';
      color = '#38bdf8';
      label = 'Pending Signature';
    } else if (s === 'cancelled') {
      bg = 'rgba(239, 68, 68, 0.12)';
      color = '#ef4444';
      label = 'Cancelled';
    } else if (s === 'expired') {
      bg = 'rgba(148, 163, 184, 0.12)';
      color = '#94a3b8';
      label = 'Expired';
    }

    return (
      <span style={{
        padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
        background: bg, color: color, display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        border: `1px solid ${color}33`, whiteSpace: 'nowrap'
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
        {label}
      </span>
    );
  };

  return (
    <Layout>
      {/* Header */}
      <div className="dashboard-header animate-fade-in" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="dashboard-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <FileText style={{ color: 'var(--accent-primary)' }} size={28} /> Commercial Contracts &amp; E-Signatures
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Draft commercial agreements, share customer e-signature links, and generate billing invoices
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)', fontWeight: 600 }}>
          <Plus size={18} style={{ marginRight: 6 }} /> Create New Contract
        </Button>
      </div>

      {/* Interactive E-Signature Workflow Guide Banner */}
      <div className="animate-fade-in" style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.06) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
          💡 How Contract E-Signatures Work:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--bg-secondary)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ background: '#6366f1', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>1</div>
            <div><strong>Draft Contract</strong><br /><span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Staff creates contract details</span></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--bg-secondary)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ background: '#6366f1', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>2</div>
            <div><strong>Send Public Link</strong><br /><span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Click 🔗 Link & email client</span></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--bg-secondary)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ background: '#10b981', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>3</div>
            <div><strong>Customer Signs</strong><br /><span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Client signs online without login</span></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--bg-secondary)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ background: '#10b981', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>4</div>
            <div><strong>1-Click Invoice</strong><br /><span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Convert signed deal to invoice</span></div>
          </div>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="metrics-grid animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <Card className="metric-card glass-panel" style={{ borderLeft: '4px solid #6366f1' }}>
          <Card.Content style={{ padding: '1.25rem' }}>
            <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="metric-title" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Contract Portfolio</span>
              <FileText className="metric-icon" size={20} style={{ color: '#6366f1' }} />
            </div>
            <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>${totalContractValue.toLocaleString()}</div>
            <div className="metric-subtitle" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Avg: <strong>${Math.round(avgContractValue).toLocaleString()}</strong> per deal
            </div>
          </Card.Content>
        </Card>

        <Card className="metric-card glass-panel" style={{ borderLeft: '4px solid #10b981' }}>
          <Card.Content style={{ padding: '1.25rem' }}>
            <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="metric-title" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Executed &amp; Signed</span>
              <CheckCircle className="metric-icon" size={20} style={{ color: '#10b981' }} />
            </div>
            <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{activeContractsCount}</div>
            <div className="metric-subtitle" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Value: <strong>${signedContractValue.toLocaleString()}</strong> ({executionRate}% rate)
            </div>
          </Card.Content>
        </Card>

        <Card className="metric-card glass-panel" style={{ borderLeft: '4px solid #f59e0b' }}>
          <Card.Content style={{ padding: '1.25rem' }}>
            <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="metric-title" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Awaiting Customer Sign</span>
              <Clock className="metric-icon" size={20} style={{ color: '#f59e0b' }} />
            </div>
            <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>{pendingSignatureCount}</div>
            <div className="metric-subtitle" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Drafts pending client approval
            </div>
          </Card.Content>
        </Card>

        <Card className="metric-card glass-panel" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <Card.Content style={{ padding: '1.25rem' }}>
            <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="metric-title" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Invoicing Readiness</span>
              <Receipt className="metric-icon" size={20} style={{ color: '#8b5cf6' }} />
            </div>
            <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5cf6' }}>{activeContractsCount} Ready</div>
            <div className="metric-subtitle" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Contracts ready for 1-click invoice
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        
        {/* Pill Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.3rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('All')}
            style={{
              padding: '0.45rem 1rem', borderRadius: '7px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: statusFilter === 'All' ? 'var(--accent-primary)' : 'transparent',
              color: statusFilter === 'All' ? '#fff' : 'var(--text-muted)'
            }}
          >
            All Contracts ({contracts.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Draft')}
            style={{
              padding: '0.45rem 1rem', borderRadius: '7px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: statusFilter === 'Draft' ? '#f59e0b' : 'transparent',
              color: statusFilter === 'Draft' ? '#fff' : 'var(--text-muted)'
            }}
          >
            📝 Drafts / Pending ({pendingSignatureCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Signed')}
            style={{
              padding: '0.45rem 1rem', borderRadius: '7px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: statusFilter === 'Signed' ? '#10b981' : 'transparent',
              color: statusFilter === 'Signed' ? '#fff' : 'var(--text-muted)'
            }}
          >
            ✅ Signed &amp; Executed ({activeContractsCount})
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="filter-input"
            placeholder="Search contract #, client, deal..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem', width: '100%', borderRadius: '8px', background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
          />
        </div>
      </div>

      {/* Contracts Table & Card Container */}
      <Card className="glass-panel animate-fade-in" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <Card.Content style={{ padding: 0 }}>
          {isLoading ? (
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} variant="rect" height={52} style={{ borderRadius: '8px', animationDelay: `${i * 0.07}s` }} />
              ))}
            </div>
          ) : filteredContracts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={searchTerm || statusFilter !== 'All' ? 'No contracts match your filters' : 'No contracts yet'}
              description={searchTerm || statusFilter !== 'All' ? 'Try clearing your search or changing the status filter.' : 'Create your first commercial contract and share a signing link with your customer.'}
              actionText={!searchTerm && statusFilter === 'All' ? 'Create Contract' : undefined}
              onActionClick={!searchTerm && statusFilter === 'All' ? () => setShowCreateModal(true) : undefined}
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="contracts-table-wrap" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Contract Ref</th>
                      <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Contract Title &amp; Client</th>
                      <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Linked Deal</th>
                      <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Contract Value</th>
                      <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Status</th>
                      <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Signatory Record</th>
                      <th style={{ padding: '1rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.map(c => (
                      <tr key={c.contractId} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem', transition: 'background 0.15s' }}>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>
                          {c.contractNumber}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', minWidth: '220px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.title}</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem', whiteSpace: 'nowrap' }}>
                            👤 {c.customerName}{c.companyName ? ` (${c.companyName})` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                          {c.opportunityTitle
                            ? <span style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600, border: '1px solid rgba(139, 92, 246, 0.3)' }}>💼 {c.opportunityTitle}</span>
                            : <span style={{ color: 'var(--text-muted)' }}>—</span>
                          }
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          ${c.contractValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>{statusBadge(c)}</td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {c.signedByName ? (
                            <div>
                              <strong style={{ color: '#10b981' }}>{c.signedByName}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.signedAt ? new Date(c.signedAt).toLocaleDateString() : ''}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Awaiting client signature</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <ContractActionMenu
                            contract={c}
                            onCopyLink={handleCopyPublicLink}
                            onSendEmail={handleSendSigningEmail}
                            onEdit={openEdit}
                            onDelete={handleDeleteContract}
                            onInvoice={handleGenerateInvoice}
                            onView={setSelectedContract}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="contracts-mobile-list">
                {filteredContracts.map(c => (
                  <div key={c.contractId} style={{
                    borderBottom: '1px solid var(--border-color)',
                    padding: '1.25rem',
                    display: 'flex', flexDirection: 'column', gap: '0.65rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.85rem' }}>{c.contractNumber}</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem', fontSize: '1rem' }}>{c.title}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          👤 {c.customerName}{c.companyName ? ` (${c.companyName})` : ''}
                        </div>
                      </div>
                      {statusBadge(c)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.65rem 0.85rem', borderRadius: '8px', margin: '0.25rem 0' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem' }}>${c.contractValue.toLocaleString()}</span>
                      {c.opportunityTitle && (
                        <span style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.78rem' }}>
                          💼 {c.opportunityTitle}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <ContractActionMenu
                        contract={c}
                        onCopyLink={handleCopyPublicLink}
                        onSendEmail={handleSendSigningEmail}
                        onEdit={openEdit}
                        onDelete={handleDeleteContract}
                        onInvoice={handleGenerateInvoice}
                        onView={setSelectedContract}
                      />
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
          onInvoice={handleGenerateInvoice}
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

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Contract Status */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  📌 Contract Status
                </label>
                <SearchableSelect
                  value={editStatus}
                  onChange={val => setEditStatus(String(val))}
                  options={[
                    { value: 'Draft', label: 'Draft' },
                    { value: 'SentForSignature', label: 'Sent for Signature' },
                    { value: 'Signed', label: 'Signed' },
                    { value: 'Active', label: 'Active' },
                    { value: 'Cancelled', label: 'Cancelled' },
                    { value: 'Expired', label: 'Expired' }
                  ]}
                />
              </div>

              {/* Linked Deal */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  🔗 Linked Deal / Opportunity
                  <span style={{ fontWeight: 400, marginLeft: '0.4rem', color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <SearchableSelect
                  value={editOpportunityId ?? 0}
                  onChange={val => {
                    const id = parseInt(String(val), 10);
                    setEditOpportunityId(id > 0 ? id : null);
                  }}
                  options={[
                    { value: 0, label: '— No deal linked —' },
                    ...editOpps.map(o => ({ value: String(o.id), label: o.title }))
                  ]}
                  placeholder="— No deal linked —"
                />
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
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Notes &amp; Internal Comments</label>
                <Input
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Internal notes or terms summary"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button type="button" variant="secondary" onClick={() => setEditingContract(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
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
                <SearchableSelect
                  value={newCustomerId}
                  onChange={val => setNewCustomerId(Number(val))}
                  options={[
                    { value: 0, label: '— Choose a customer —' },
                    ...customers.map(c => ({ value: String(c.id), label: c.name }))
                  ]}
                  placeholder="— Choose a customer —"
                />
              </div>

              {/* Opportunity */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  2. Linked Deal / Opportunity
                  <span style={{ fontWeight: 400, marginLeft: '0.4rem', color: 'var(--text-muted)' }}>(optional — auto-fills title &amp; value)</span>
                </label>
                <SearchableSelect
                  value={newOpportunityId}
                  onChange={val => {
                    const selectedId = parseInt(String(val), 10);
                    setNewOpportunityId(selectedId);
                    if (selectedId > 0) {
                      const found = opportunities.find(o => o.id === selectedId);
                      if (found) {
                        setNewTitle(found.title);
                        if (found.value > 0) setNewValue(found.value);
                        // Always auto-fill customer from the selected deal
                        if (found.customerId && found.customerId > 0) {
                          setNewCustomerId(found.customerId);
                        }
                      }
                    }
                  }}
                  options={[
                    { 
                      value: 0, 
                      label: loadingOpps ? '⏳ Loading deals…' : opportunities.length === 0 ? 'No deals available' : '— Select a related deal —' 
                    },
                    ...opportunities.map(o => ({ value: String(o.id), label: o.title }))
                  ]}
                  placeholder="— Select a related deal —"
                />
                {!loadingOpps && opportunities.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.3rem' }}>
                    ✓ {opportunities.length} deal{opportunities.length > 1 ? 's' : ''} available — select one to auto-link
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
