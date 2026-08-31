import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ContractModal, ContractItem } from '../components/contracts/ContractModal';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';
import { Plus, Search, FileText, CheckCircle, Clock, Receipt, MoreVertical, Eye, Edit3, Link as LinkIcon, FileCheck, Mail, Trash2, Users, UserCheck, CreditCard, RefreshCw } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { useAuth } from '../context/AuthContext';
import { useSystemProfile, useFormatCurrency } from '../context/SystemProfileContext';
import { validateName, validatePositiveNumber, validateRequiredSelect, validateDateRange } from '../lib/validators';
import './screens.css';
import { confirmAction } from '../lib/confirm';

const ContractActionMenu: React.FC<{
  contract: ContractItem;
  onCopyLink: (c: ContractItem) => void;
  onCopyPaymentLink?: (c: ContractItem) => void;
  onSendEmail: (c: ContractItem) => void;
  onEdit: (c: ContractItem) => void;
  onDelete: (c: ContractItem) => void;
  onInvoice: (c: ContractItem) => void;
  onView: (c: ContractItem) => void;
  onSyncPricing?: (c: ContractItem) => void;
}> = ({ contract, onCopyLink, onCopyPaymentLink, onSendEmail, onEdit, onDelete, onInvoice, onView, onSyncPricing }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSigned = contract.status === 'Signed' || contract.status === 'Active' || !!contract.signatureDataUrl || !!contract.signedAt || !!contract.signedByName;
  const hasInvoice = !!contract.invoiceId || !!contract.invoiceNumber;
  const invStatus = (contract.invoiceStatus || '').toLowerCase();
  const isPaid = invStatus === 'paid' || (contract.invoiceBalanceDue !== undefined && contract.invoiceBalanceDue <= 0.01 && (contract.invoiceAmountPaid || 0) > 0);
  const isPartiallyPaid = invStatus === 'partiallypaid' || ((contract.invoiceAmountPaid || 0) > 0 && (contract.invoiceBalanceDue || 0) > 0.01);
  const isCancelledOrRefunded = invStatus === 'cancelled' || invStatus === 'refunded';
  const isPayable = hasInvoice && !isPaid && !isCancelledOrRefunded && invStatus !== 'pendingverification';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="crm-action-menu-trigger"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        title="Contract Options"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div className="crm-action-menu-dropdown animate-fade-in" style={{ right: 0, top: '100%', marginTop: '4px', minWidth: '220px' }}>
          <button
            type="button"
            className="crm-action-menu-item"
            onClick={(e) => { e.stopPropagation(); onView(contract); setOpen(false); }}
          >
            <Eye size={14} /> View Contract
          </button>

          <button
            type="button"
            className="crm-action-menu-item"
            onClick={(e) => { e.stopPropagation(); onEdit(contract); setOpen(false); }}
          >
            <Edit3 size={14} /> Edit Details
          </button>

          {!isSigned && onSyncPricing && (
            <button
              type="button"
              className="crm-action-menu-item"
              onClick={(e) => { e.stopPropagation(); onSyncPricing(contract); setOpen(false); }}
            >
              <RefreshCw size={14} style={{ color: '#f59e0b' }} /> Sync Catalog Pricing
            </button>
          )}

          <button
            type="button"
            className="crm-action-menu-item"
            onClick={(e) => { e.stopPropagation(); onCopyLink(contract); setOpen(false); }}
          >
            <LinkIcon size={14} style={{ color: '#6366f1' }} /> Copy Signing Link
          </button>

          {isPayable && onCopyPaymentLink && (
            <button
              type="button"
              className="crm-action-menu-item"
              onClick={(e) => { e.stopPropagation(); onCopyPaymentLink(contract); setOpen(false); }}
            >
              <CreditCard size={14} style={{ color: '#10b981' }} />
              <span>
                {isPartiallyPaid
                  ? `Copy Pay Link (${contract.invoiceBalanceDue ? `$${contract.invoiceBalanceDue.toLocaleString()} Due` : 'Partial'})`
                  : 'Copy Payment Link'}
              </span>
            </button>
          )}

          <button
            type="button"
            className="crm-action-menu-item"
            onClick={(e) => { e.stopPropagation(); onSendEmail(contract); setOpen(false); }}
          >
            <Mail size={14} style={{ color: '#3b82f6' }} /> Email Invitation
          </button>

          {isSigned && (
            <button
              type="button"
              className="crm-action-menu-item"
              onClick={(e) => { e.stopPropagation(); onInvoice(contract); setOpen(false); }}
            >
              <Receipt size={14} style={{ color: '#10b981' }} /> {hasInvoice ? (isPaid ? 'View Paid Invoice' : 'View Commercial Invoice') : 'Generate Invoice'}
            </button>
          )}

          <div className="crm-action-menu-divider" />

          <button
            type="button"
            className="crm-action-menu-item"
            onClick={(e) => { e.stopPropagation(); onDelete(contract); setOpen(false); }}
            style={{ color: '#ef4444' }}
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
  const { isManagerOrAboveSelected, selectedRole } = useAuth();
  const { profile } = useSystemProfile();
  const { formatCurrency, currency } = useFormatCurrency();

  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dataScope, setDataScope] = useState<'personal' | 'team'>(isManagerOrAboveSelected ? 'team' : 'personal');

  // Auto-sync scope when role switches
  useEffect(() => {
    if (!isManagerOrAboveSelected) {
      setDataScope('personal');
    }
  }, [isManagerOrAboveSelected, selectedRole]);

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

  const fetchContracts = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const q = new URLSearchParams();
      if (!isManagerOrAboveSelected || dataScope === 'personal') {
        q.append('scope', 'personal');
      } else {
        q.append('scope', 'company');
      }
      const data = await api.get<ContractItem[]>(`/api/contracts?${q.toString()}`);
      setContracts(data || []);
    } catch {
      if (isInitial) showToast('Failed to load contracts', 'error');
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, [dataScope, isManagerOrAboveSelected, selectedRole]);

  useEffect(() => {
    fetchContracts(true);

    // Auto-refresh contracts whenever staff switches back to the CRM tab (silent, no blinking)
    const handleFocus = () => fetchContracts(false);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('app:role-switched', handleFocus);

    // Silent background poll every 15s to update signatures/statuses without re-rendering skeleton or blinking
    const interval = setInterval(() => fetchContracts(false), 15000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('app:role-switched', handleFocus);
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
  }, [newCustomerId]);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    const custErr = validateRequiredSelect(newCustomerId, 'Customer');
    if (custErr) { showToast(custErr, 'error'); return; }

    const titleErr = validateName(newTitle, 'Contract title', 2, 150);
    if (titleErr) { showToast(titleErr, 'error'); return; }

    const valErr = validatePositiveNumber(newValue, 'Contract value', true);
    if (valErr) { showToast(valErr, 'error'); return; }

    setCreating(true);
    try {
      const existingOppContract = newOpportunityId > 0 ? contracts.find(c => c.opportunityId === newOpportunityId) : null;
      await api.post('/api/contracts', {
        customerId: newCustomerId,
        opportunityId: newOpportunityId || null,
        title: newTitle.trim(),
        contractValue: newValue,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
      showToast(existingOppContract ? `Existing contract (${existingOppContract.contractNumber}) updated & reused!` : 'Contract draft created successfully!');
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
    
    const titleErr = validateName(editTitle, 'Contract title', 2, 150);
    if (titleErr) { showToast(titleErr, 'error'); return; }

    const valErr = validatePositiveNumber(editValue, 'Contract value', true);
    if (valErr) { showToast(valErr, 'error'); return; }

    if (editStartDate && editEndDate) {
      const dateErr = validateDateRange(editStartDate, editEndDate, 'Start date', 'End date');
      if (dateErr) { showToast(dateErr, 'error'); return; }
    }

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
    if (!await confirmAction(`Are you sure you want to delete contract ${c.contractNumber} ("${c.title}")?\nThis action cannot be undone.`)) {
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
      const res = await api.post<any>(`/api/contracts/${c.contractId}/generate-invoice`, {});
      showToast(res?.message || `Invoice #${res?.invoiceNumber || ''} generated successfully!`, 'success');
      fetchContracts();
      if (res?.invoiceNumber) {
        navigate(`/invoices?search=${encodeURIComponent(res.invoiceNumber)}`);
      } else {
        navigate('/invoices');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to process invoice for contract', 'error');
    }
  };

  const handleCopyPaymentLink = (c: ContractItem) => {
    const invNumber = c.invoiceNumber || `INV-${c.contractNumber.replace('CNT-', '')}`;
    const url = `${window.location.origin}/invoices/pay/${invNumber}`;
    navigator.clipboard.writeText(url);
    showToast('Customer payment link copied to clipboard!');
  };

  const handleCopyPublicLink = (c: ContractItem) => {
    const token = (c as any).signingToken || c.contractNumber;
    const url = `${window.location.origin}/sign/contract/${token}`;
    navigator.clipboard.writeText(url);
    showToast('Public signing link copied to clipboard!');
  };

  const handleSendSigningEmail = async (c: ContractItem) => {
    let targetEmail = (c.customerEmail || '').trim();
    if (!targetEmail) {
      const input = window.prompt(`Please enter the customer email address to send Contract #${c.contractNumber} to:`);
      if (!input || !input.trim()) return;
      targetEmail = input.trim();
    }

    showToast(`Sending signing request email to ${targetEmail}...`, 'info');
    try {
      const res = await api.post<{ message: string }>(`/api/contracts/${c.contractId}/send-email`, {
        recipientEmail: targetEmail
      });
      showToast(res.message || `Signing invitation email sent successfully to ${targetEmail}!`);
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

  const handleSyncPricing = async (c: ContractItem) => {
    try {
      await api.post(`/api/contracts/${c.contractId}/sync-pricing`, {});
      showToast(`Contract ${c.contractNumber} pricing synchronized with product catalog!`);
      fetchContracts();
    } catch (err: any) {
      showToast(err?.message || 'Failed to sync contract pricing', 'error');
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
    } else if (s === 'pendingcustomer') {
      bg = 'rgba(99, 102, 241, 0.12)';
      color = '#818cf8';
      label = 'Pending Client Sign';
    } else if (s === 'pendingseller') {
      bg = 'rgba(245, 158, 11, 0.12)';
      color = '#f59e0b';
      label = 'Pending Company Sign';
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
        <Button onClick={() => navigate('/contracts/new')} style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)', fontWeight: 600 }}>
          <Plus size={18} style={{ marginRight: 6 }} /> Create New Contract
        </Button>
      </div>

      {/* Interactive E-Signature Workflow Guide Banner */}
      <div className="crm-workflow-guide-banner animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
          💡 How Contract E-Signatures Work:
        </div>
        <div className="crm-workflow-guide-grid">
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
            <div><strong>Instant Invoice &amp; Payment</strong><br /><span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Client pays instantly via Stripe/Card</span></div>
          </div>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="crm-metrics-responsive-grid animate-fade-in">
        <Card className="metric-card glass-panel" style={{ borderLeft: '4px solid #6366f1' }}>
          <Card.Content style={{ padding: '1.25rem' }}>
            <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="metric-title" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Contract Portfolio</span>
              <FileText className="metric-icon" size={20} style={{ color: '#6366f1' }} />
            </div>
            <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(totalContractValue, profile?.currency || currency)}</div>
            <div className="metric-subtitle" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Avg: <strong>{formatCurrency(Math.round(avgContractValue), profile?.currency || currency)}</strong> per deal
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
              Value: <strong>{formatCurrency(signedContractValue, profile?.currency || currency)}</strong> ({executionRate}% rate)
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
      <div className="crm-filter-toolbar-wrap animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Pill Filter Tabs */}
          <div className="crm-filter-tabs-bar">
            <button
              type="button"
              onClick={() => setStatusFilter('All')}
              className={`crm-filter-tab-btn ${statusFilter === 'All' ? 'active-all' : ''}`}
            >
              All Contracts ({contracts.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Draft')}
              className={`crm-filter-tab-btn ${statusFilter === 'Draft' ? 'active-draft' : ''}`}
            >
              📝 Drafts / Pending ({pendingSignatureCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Signed')}
              className={`crm-filter-tab-btn ${statusFilter === 'Signed' ? 'active-paid' : ''}`}
            >
              ✅ Signed &amp; Executed ({activeContractsCount})
            </button>
          </div>

          {/* Scope Toggle for Managers & Admins */}
          {isManagerOrAboveSelected && (
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setDataScope('personal')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: dataScope === 'personal' ? 'var(--accent-primary)' : 'transparent',
                  color: dataScope === 'personal' ? '#fff' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <UserCheck size={14} /> My Contracts
              </button>
              <button
                type="button"
                onClick={() => setDataScope('team')}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: dataScope === 'team' ? 'var(--accent-primary)' : 'transparent',
                  color: dataScope === 'team' ? '#fff' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Users size={14} /> All Company
              </button>
            </div>
          )}
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
                      <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Invoice &amp; Settlement</th>
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
                          {formatCurrency(c.contractValue, profile?.currency || currency, 2)}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>{statusBadge(c)}</td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {(() => {
                            const isSigned = c.status === 'Signed' || c.status === 'Active' || !!c.customerSignedByName || !!c.signedByName;
                            const hasCompany = !!c.companySignatureDataUrl || !!c.companySignedByName;
                            const hasCustomer = !!c.customerSignatureDataUrl || !!c.customerSignedByName || !!c.signatureDataUrl || !!c.signedByName;

                            if (isSigned || (hasCompany && hasCustomer)) {
                              return (
                                <div>
                                  <strong style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle size={13} /> {c.customerSignedByName || c.signedByName || c.customerName}
                                  </strong>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {c.customerSignedAt || c.signedAt ? new Date(c.customerSignedAt || c.signedAt || '').toLocaleDateString() : 'Fully Executed'}
                                    {c.companySignedByName && ` · Rep: ${c.companySignedByName}`}
                                  </div>
                                </div>
                              );
                            }

                            if (c.status === 'PendingCustomer' || hasCompany) {
                              return (
                                <div>
                                  <div style={{ color: '#818cf8', fontWeight: 600, fontSize: '0.78rem' }}>
                                    🏢 Signed by {c.companySignedByName || 'Company'}
                                  </div>
                                  <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>⏳ Awaiting client signature</span>
                                </div>
                              );
                            }

                            if (c.status === 'PendingSeller' || hasCustomer) {
                              return (
                                <div>
                                  <div style={{ color: '#10b981', fontWeight: 600, fontSize: '0.78rem' }}>
                                    👤 Signed by {c.customerSignedByName || c.customerName}
                                  </div>
                                  <span style={{ color: '#818cf8', fontSize: '0.75rem' }}>✍️ Awaiting company sign</span>
                                </div>
                              );
                            }

                            return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>⚪ Draft (Unsigned)</span>;
                          })()}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                          {c.invoiceNumber ? (() => {
                            const invStatus = (c.invoiceStatus || '').toLowerCase();
                            const isPaid = invStatus === 'paid' || (c.invoiceBalanceDue !== undefined && c.invoiceBalanceDue <= 0.01 && (c.invoiceAmountPaid || 0) > 0);
                            const isPartiallyPaid = invStatus === 'partiallypaid' || ((c.invoiceAmountPaid || 0) > 0 && (c.invoiceBalanceDue || 0) > 0.01);
                            const isPendingVerification = invStatus === 'pendingverification';
                            const isCancelled = invStatus === 'cancelled';
                            const isRefunded = invStatus === 'refunded';

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <span style={{
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  background: isPaid ? 'rgba(16, 185, 129, 0.15)' : isPartiallyPaid ? 'rgba(99, 102, 241, 0.15)' : isPendingVerification ? 'rgba(56, 189, 248, 0.15)' : isCancelled || isRefunded ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                  color: isPaid ? '#10b981' : isPartiallyPaid ? '#818cf8' : isPendingVerification ? '#38bdf8' : isCancelled || isRefunded ? '#ef4444' : '#f59e0b',
                                  border: isPaid ? '1px solid rgba(16, 185, 129, 0.3)' : isPartiallyPaid ? '1px solid rgba(99, 102, 241, 0.3)' : isPendingVerification ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  width: 'fit-content'
                                }}>
                                  <span>{isPaid ? '✅ Paid' : isPartiallyPaid ? '💳 Partially Paid' : isPendingVerification ? '⏳ Pending Verification' : isCancelled ? '🚫 Cancelled' : isRefunded ? '↩️ Refunded' : '💳 Invoiced'}</span>
                                  <span style={{ opacity: 0.8 }}>({c.invoiceNumber})</span>
                                </span>

                                {!isPaid && !isCancelled && !isRefunded && !isPendingVerification ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPaymentLink(c)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--accent-primary)',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                      padding: 0,
                                      textAlign: 'left',
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem'
                                    }}
                                  >
                                    <CreditCard size={11} />
                                    <span>{isPartiallyPaid && c.invoiceBalanceDue ? `Copy Pay Link (${formatCurrency(c.invoiceBalanceDue, profile?.currency || currency)} Due)` : 'Copy Pay Link'}</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/invoices?search=${encodeURIComponent(c.invoiceNumber || '')}`)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--text-muted)',
                                      fontSize: '0.74rem',
                                      cursor: 'pointer',
                                      padding: 0,
                                      textAlign: 'left',
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem'
                                    }}
                                  >
                                    <Receipt size={11} /> View Invoice Details
                                  </button>
                                )}
                              </div>
                            );
                          })() : (contractIsSigned(c) ? (
                            <button
                              type="button"
                              onClick={() => handleGenerateInvoice(c)}
                              style={{
                                background: 'rgba(99, 102, 241, 0.12)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                color: 'var(--accent-primary)',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <Receipt size={12} /> Generate Invoice
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Pending sign</span>
                          ))}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <ContractActionMenu
                            contract={c}
                            onCopyLink={handleCopyPublicLink}
                            onCopyPaymentLink={handleCopyPaymentLink}
                            onSendEmail={handleSendSigningEmail}
                            onEdit={(contractItem) => navigate(`/contracts/${contractItem.contractId}/edit`)}
                            onDelete={handleDeleteContract}
                            onInvoice={handleGenerateInvoice}
                            onView={setSelectedContract}
                            onSyncPricing={handleSyncPricing}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.85rem' }}>{c.contractNumber}</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem', fontSize: '1rem' }}>{c.title}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          👤 {c.customerName}{c.companyName ? ` (${c.companyName})` : ''}
                        </div>
                      </div>
                      {statusBadge(c)}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.65rem 0.85rem', borderRadius: '8px', margin: '0.25rem 0' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>{formatCurrency(c.contractValue, profile?.currency || currency)}</span>
                      {c.opportunityTitle && (
                        <span style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                          💼 {c.opportunityTitle}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <ContractActionMenu
                        contract={c}
                        onCopyLink={handleCopyPublicLink}
                        onCopyPaymentLink={handleCopyPaymentLink}
                        onSendEmail={handleSendSigningEmail}
                        onEdit={(contractItem) => navigate(`/contracts/${contractItem.contractId}/edit`)}
                        onDelete={handleDeleteContract}
                        onInvoice={handleGenerateInvoice}
                        onView={setSelectedContract}
                        onSyncPricing={handleSyncPricing}
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
    </Layout>
  );
};
