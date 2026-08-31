import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';
import {
  Plus, Search, Receipt, CheckCircle, CheckCircle2, Clock, AlertTriangle, Download,
  Printer, DollarSign, CreditCard, MoreVertical, FileText, ArrowUpRight,
  Edit3, Trash2, RefreshCw, Users, UserCheck, Send, Link, ExternalLink,
  ShieldCheck, Landmark, Copy, Check, X
} from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { useAuth } from '../context/AuthContext';
import { useSystemProfile, useFormatCurrency } from '../context/SystemProfileContext';
import { validatePositiveNumber, validateRequiredSelect, validateDateRange, validateMaxLength } from '../lib/validators';
import './screens.css';
import { confirmAction } from '../lib/confirm';

export interface InvoiceItem {
  invoiceId: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  companyName?: string;
  contractId?: number;
  contractNumber?: string;
  contractTitle?: string;
  opportunityId?: number;
  opportunityTitle?: string;
  amount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: string; // Draft, Sent, PartiallyPaid, Paid, PendingVerification, Overdue, Cancelled
  paymentStatus: string;
  paymentCount: number;
  paymentUrl?: string;
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  paymentMethod?: string;
  notes?: string;
  terms?: string;
  createdByName: string;
  createdAt: string;
  ownerName?: string;
}

const InvoiceActionMenu: React.FC<{
  invoice: InvoiceItem;
  onRecordPayment: (inv: InvoiceItem) => void;
  onSendPaymentRequest: (inv: InvoiceItem) => void;
  onCopyPaymentLink: (inv: InvoiceItem) => void;
  onEdit: (inv: InvoiceItem) => void;
  onDelete: (inv: InvoiceItem) => void;
  onView: (inv: InvoiceItem) => void;
  onPrint: (inv: InvoiceItem) => void;
  onSyncPricing?: (inv: InvoiceItem) => void;
}> = ({ invoice, onRecordPayment, onSendPaymentRequest, onCopyPaymentLink, onEdit, onDelete, onView, onPrint, onSyncPricing }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const invStatus = (invoice.status || '').toLowerCase();
  const isPaid = invStatus === 'paid' || (invoice.balanceDue !== undefined && invoice.balanceDue <= 0.01 && (invoice.amountPaid || 0) > 0);
  const isPartiallyPaid = invStatus === 'partiallypaid' || ((invoice.amountPaid || 0) > 0 && (invoice.balanceDue || 0) > 0.01);
  const isCancelledOrRefunded = invStatus === 'cancelled' || invStatus === 'refunded';
  const isPayable = !isPaid && !isCancelledOrRefunded && invStatus !== 'pendingverification';

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
        title="Invoice Options"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div className="crm-action-menu-dropdown animate-fade-in" style={{ right: 0, top: '100%', marginTop: '4px', minWidth: '220px' }}>
          <button
            type="button"
            className="crm-action-menu-item"
            onClick={(e) => { e.stopPropagation(); onView(invoice); setOpen(false); }}
          >
            <FileText size={14} /> View Details
          </button>

          <button
            type="button"
            className="crm-action-menu-item"
            onClick={(e) => { e.stopPropagation(); onPrint(invoice); setOpen(false); }}
          >
            <Printer size={14} /> Print / Save PDF
          </button>

          <div className="crm-action-menu-divider" />

          {isPayable && (
            <button
              type="button"
              className="crm-action-menu-item"
              onClick={(e) => { e.stopPropagation(); onSendPaymentRequest(invoice); setOpen(false); }}
              style={{ color: 'var(--accent-primary)', fontWeight: 600 }}
            >
              <Send size={14} /> Send Payment Request
            </button>
          )}

          {isPayable && (
            <button
              type="button"
              className="crm-action-menu-item"
              onClick={(e) => { e.stopPropagation(); onCopyPaymentLink(invoice); setOpen(false); }}
            >
              <Copy size={14} />
              <span>
                {isPartiallyPaid
                  ? `Copy Pay Link ($${(invoice.balanceDue ?? 0).toLocaleString()} Due)`
                  : 'Copy Payment Link'}
              </span>
            </button>
          )}

          {!isPaid && !isCancelledOrRefunded && onSyncPricing && (
            <button
              type="button"
              className="crm-action-menu-item"
              onClick={(e) => { e.stopPropagation(); onSyncPricing(invoice); setOpen(false); }}
              style={{ color: '#f59e0b' }}
            >
              <RefreshCw size={14} /> Sync Catalog Pricing
            </button>
          )}

          {!isPaid && !isCancelledOrRefunded && (
            <button
              type="button"
              className="crm-action-menu-item"
              onClick={(e) => { e.stopPropagation(); onRecordPayment(invoice); setOpen(false); }}
              style={{ color: '#10b981', fontWeight: 600 }}
            >
              <DollarSign size={14} /> Record Received Payment
            </button>
          )}

          <div className="crm-action-menu-divider" />

          {!isPaid && !isCancelledOrRefunded && (
            <button
              type="button"
              className="crm-action-menu-item"
              onClick={(e) => { e.stopPropagation(); onEdit(invoice); setOpen(false); }}
              style={{ color: '#d97706' }}
            >
              <Edit3 size={14} /> Edit Invoice
            </button>
          )}

          <button
            type="button"
            className="crm-action-menu-item"
            onClick={(e) => { e.stopPropagation(); onDelete(invoice); setOpen(false); }}
            style={{ color: '#ef4444' }}
          >
            <Trash2 size={14} /> Delete Invoice
          </button>
        </div>
      )}
    </div>
  );
};

// Local date string helper (YYYY-MM-DD) avoiding UTC day-shifting
const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Safe date formatter for display (e.g. "Aug 25, 2026")
const formatDisplayDate = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '—';
  if (typeof dateStr === 'string') {
    const dateOnly = dateStr.split('T')[0];
    const parts = dateOnly.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const InvoicesScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isManagerOrAboveSelected, selectedRole } = useAuth();
  const { profile } = useSystemProfile();
  const { formatCurrency, currency } = useFormatCurrency();

  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dataScope, setDataScope] = useState<'personal' | 'team'>(isManagerOrAboveSelected ? 'team' : 'personal');
  const [selectedRepId, setSelectedRepId] = useState<string>('all');
  const [usersList, setUsersList] = useState<any[]>([]);

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Invoice Form State
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [contractsList, setContractsList] = useState<{ id: number; number: string; title: string; value: number }[]>([]);
  const [opportunitiesList, setOpportunitiesList] = useState<{ id: number; title: string; value: number; stage?: string }[]>([]);
  const [newCustomerId, setNewCustomerId] = useState(0);
  const [newContractId, setNewContractId] = useState<number | null>(null);
  const [newOpportunityId, setNewOpportunityId] = useState<number | null>(null);
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newTaxRate, setNewTaxRate] = useState<number>(10);
  const [newIssueDate, setNewIssueDate] = useState(() => getLocalDateString(new Date()));
  const [newDueDate, setNewDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return getLocalDateString(d);
  });
  const [newNotes, setNewNotes] = useState('');
  const [newTerms, setNewTerms] = useState('Payment due within 30 days of issue date.');
  const [creating, setCreating] = useState(false);

  // Offline / Bank Payment Recording Modal State
  const [recordingPaymentInvoice, setRecordingPaymentInvoice] = useState<InvoiceItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(() => getLocalDateString(new Date()));
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentBankName, setPaymentBankName] = useState('Commercial Bank of Ethiopia (Nigd Bank)');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Send Payment Request Modal State
  const [sendingRequestInvoice, setSendingRequestInvoice] = useState<InvoiceItem | null>(null);
  const [customRequestMsg, setCustomRequestMsg] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  // Edit Invoice State
  const [editingInvoice, setEditingInvoice] = useState<InvoiceItem | null>(null);
  const [editAmount, setEditAmount] = useState(0);
  const [editTaxRate, setEditTaxRate] = useState(10);
  const [editStatus, setEditStatus] = useState('Draft');
  const [editIssueDate, setEditIssueDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editContractId, setEditContractId] = useState<number | null>(null);
  const [editOpportunityId, setEditOpportunityId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editTerms, setEditTerms] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Load team users for Managers/Admins
  useEffect(() => {
    if (isManagerOrAboveSelected) {
      api.get<any[]>('/api/users')
        .then(res => setUsersList(Array.isArray(res) ? res : []))
        .catch(() => {});
    }
  }, [isManagerOrAboveSelected]);

  // Auto-sync scope when role switcher toggles
  useEffect(() => {
    if (!isManagerOrAboveSelected) {
      setDataScope('personal');
      setSelectedRepId('all');
    } else {
      setDataScope('team');
    }
  }, [isManagerOrAboveSelected, selectedRole]);

  const fetchInvoices = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const q = new URLSearchParams();
      if (dataScope === 'personal') {
        q.append('scope', 'personal');
      } else {
        q.append('scope', 'company');
        if (selectedRepId && selectedRepId !== 'all') {
          q.append('repId', selectedRepId);
        }
      }

      const data = await api.get<InvoiceItem[]>(`/api/invoices?${q.toString()}`);
      setInvoices(data || []);
    } catch {
      if (isInitial) showToast('Failed to load invoices', 'error');
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, [dataScope, selectedRepId]);

  useEffect(() => {
    fetchInvoices(true);
    loadCustomers();

    const handleFocus = () => {
      fetchInvoices(false);
      loadCustomers();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('app:role-switched', handleFocus);

    const interval = setInterval(() => fetchInvoices(false), 15000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('app:role-switched', handleFocus);
      clearInterval(interval);
    };
  }, [fetchInvoices]);

  const loadCustomers = async () => {
    try {
      const res = await api.get<any>('/api/customers?pageSize=500');
      const items = Array.isArray(res) ? res : (res?.items ?? res?.data ?? []);
      setCustomers(items.map((c: any) => ({
        id: c.customerId ?? c.id,
        name: `${c.firstName || ''} ${c.lastName || ''}${c.companyName ? ` (${c.companyName})` : ''}`.trim()
      })));
    } catch {
      showToast('Failed to load customer list', 'error');
    }
  };

  const handleOpenCreateModal = async () => {
    setShowCreateModal(true);
    setNewCustomerId(0);
    setNewContractId(null);
    setNewOpportunityId(null);
    setContractsList([]);
    setOpportunitiesList([]);
    setNewAmount(0);
    setNewTaxRate(10);
    const today = getLocalDateString(new Date());
    const due = new Date();
    due.setDate(due.getDate() + 30);
    setNewIssueDate(today);
    setNewDueDate(getLocalDateString(due));
    setNewNotes('');
    setNewTerms('Payment due within 30 days of issue date.');
    await loadCustomers();
  };

  const handleCustomerChange = async (customerId: number) => {
    setNewCustomerId(customerId);
    setNewContractId(null);
    setNewOpportunityId(null);
    setContractsList([]);
    setOpportunitiesList([]);

    if (customerId <= 0) return;

    // Load Contracts for Customer
    try {
      const res = await api.get<any>(`/api/contracts?customerId=${customerId}&pageSize=100`);
      const items = Array.isArray(res) ? res : (res?.items ?? res?.data ?? []);
      const signedContracts = items
        .filter((c: any) => c.status === 'Signed' || c.status === 'Active' || c.isFullyExecuted)
        .map((c: any) => ({
          id: c.contractId ?? c.id,
          number: c.contractNumber ?? `CTR-${c.contractId}`,
          title: c.title,
          value: c.contractValue ?? c.value ?? 0
        }));
      setContractsList(signedContracts);
    } catch {
      // optional
    }

    // Load Opportunities / Deals for Customer
    try {
      const res = await api.get<any>(`/api/opportunities?customerId=${customerId}&pageSize=100`);
      const items = Array.isArray(res) ? res : (res?.items ?? res?.data ?? []);
      const opps = items.map((o: any) => ({
        id: o.opportunityId ?? o.id,
        title: o.title,
        value: o.estimatedValue ?? 0,
        stage: o.stageName
      }));
      setOpportunitiesList(opps);
    } catch {
      // optional
    }
  };

  const handleOpportunitySelect = (oppId: number) => {
    setNewOpportunityId(oppId > 0 ? oppId : null);
    if (oppId > 0) {
      const opp = opportunitiesList.find(item => item.id === oppId);
      if (opp && opp.value > 0 && newAmount <= 0) {
        setNewAmount(opp.value);
      }
      if (opp && !newNotes.trim()) {
        setNewNotes(`Invoice for deal: ${opp.title}`);
      }
    }
  };

  const handleContractSelect = (contractId: number) => {
    setNewContractId(contractId > 0 ? contractId : null);
    if (contractId > 0) {
      const c = contractsList.find(item => item.id === contractId);
      if (c && c.value > 0) {
        setNewAmount(c.value);
      }
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const custErr = validateRequiredSelect(newCustomerId, 'Customer (payer)');
    if (custErr) {
      showToast(custErr, 'error');
      return;
    }
    const amtErr = validatePositiveNumber(newAmount, 'Invoice amount');
    if (amtErr) {
      showToast(amtErr, 'error');
      return;
    }
    const taxErr = validatePositiveNumber(newTaxRate, 'Tax rate', true, 100);
    if (taxErr) {
      showToast(taxErr, 'error');
      return;
    }
    if (newIssueDate && newDueDate) {
      const dateErr = validateDateRange(newIssueDate, newDueDate, 'Issue date', 'Due date');
      if (dateErr) {
        showToast(dateErr, 'error');
        return;
      }
    }
    const notesErr = validateMaxLength(newNotes, 1000, 'Scope / Notes');
    if (notesErr) {
      showToast(notesErr, 'error');
      return;
    }

    setCreating(true);
    try {
      await api.post('/api/invoices', {
        customerId: newCustomerId,
        contractId: newContractId || undefined,
        opportunityId: newOpportunityId || undefined,
        amount: newAmount,
        taxRate: newTaxRate,
        issueDate: newIssueDate,
        dueDate: newDueDate,
        notes: newNotes.trim() || undefined,
        terms: newTerms.trim() || undefined,
      });

      showToast('Invoice generated successfully! Ready for billing & e-payment.', 'success');
      setShowCreateModal(false);
      fetchInvoices();
    } catch (err: any) {
      showToast(err?.message || 'Failed to create invoice', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenRecordPayment = (inv: InvoiceItem) => {
    setRecordingPaymentInvoice(inv);
    const balance = inv.balanceDue ?? (inv.status === 'Paid' ? 0 : inv.totalAmount);
    setPaymentAmount(balance > 0 ? balance : inv.totalAmount);
    setPaymentDate(getLocalDateString(new Date()));
    setPaymentMethod('Bank Transfer');
    setPaymentBankName('Commercial Bank of Ethiopia (Nigd Bank)');
    setPaymentRef('');
    setPaymentNotes('');
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordingPaymentInvoice) return;
    const amtErr = validatePositiveNumber(paymentAmount, 'Payment amount');
    if (amtErr) {
      showToast(amtErr, 'error');
      return;
    }

    setRecordingPayment(true);
    try {
      const showBank = paymentMethod === 'Bank Transfer' || paymentMethod === 'Check' || paymentMethod === 'SWIFT Wire Transfer';
      const res = await api.post<any>(`/api/invoices/${recordingPaymentInvoice.invoiceId}/pay`, {
        amount: paymentAmount,
        paymentMethod,
        bankName: showBank ? paymentBankName : undefined,
        paymentDate: paymentDate || undefined,
        transactionReference: paymentRef.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
      });

      showToast(res.message || 'Payment recorded & verified into Company account!', 'success');
      setRecordingPaymentInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      showToast(err?.message || 'Failed to record payment', 'error');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleSendPaymentRequest = async (inv: InvoiceItem) => {
    setSendingRequestInvoice(inv);
    setCustomRequestMsg('');
  };

  const handleConfirmSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendingRequestInvoice) return;

    setSendingRequest(true);
    try {
      const res = await api.post<any>(`/api/invoices/${sendingRequestInvoice.invoiceId}/send-payment-request`, {
        customMessage: customRequestMsg.trim() || undefined
      });
      if (res?.emailSent) {
        showToast(res.message || `Payment request sent to ${sendingRequestInvoice.customerEmail}!`, 'success');
      } else {
        if (res?.paymentUrl) {
          navigator.clipboard.writeText(res.paymentUrl);
        }
        showToast(res?.message || 'Payment link generated and copied to clipboard! (Email server credentials not configured).', 'info');
      }
      setSendingRequestInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      showToast(err?.message || 'Failed to process payment request', 'error');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleCopyPaymentLink = (inv: InvoiceItem) => {
    const origin = window.location.origin;
    const url = `${origin}/invoices/pay/${inv.invoiceNumber}`;
    navigator.clipboard.writeText(url);
    showToast(`Payment portal link copied: ${url}`, 'success');
  };

  const handleSyncPricing = async (inv: InvoiceItem) => {
    try {
      await api.post(`/api/invoices/${inv.invoiceId}/sync-pricing`, {});
      showToast(`Invoice #${inv.invoiceNumber} amount synchronized with product catalog and quotation!`);
      fetchInvoices();
    } catch (err: any) {
      showToast(err?.message || 'Failed to sync invoice pricing', 'error');
    }
  };

  const handleOpenEditModal = async (inv: InvoiceItem) => {
    setEditingInvoice(inv);
    setEditAmount(inv.amount);
    setEditTaxRate(inv.taxRate);
    setEditStatus(inv.status);
    setEditIssueDate(inv.issueDate ? inv.issueDate.split('T')[0] : getLocalDateString(new Date()));
    setEditDueDate(inv.dueDate ? inv.dueDate.split('T')[0] : getLocalDateString(new Date()));
    setEditContractId(inv.contractId ?? null);
    setEditOpportunityId(inv.opportunityId ?? null);
    setEditNotes(inv.notes || '');
    setEditTerms(inv.terms || '');

    if (inv.customerId > 0) {
      try {
        const [contractsRes, oppsRes] = await Promise.all([
          api.get<any>(`/api/contracts?customerId=${inv.customerId}&pageSize=100`),
          api.get<any>(`/api/opportunities?customerId=${inv.customerId}&pageSize=100`)
        ]);
        const contractItems = Array.isArray(contractsRes) ? contractsRes : (contractsRes?.items ?? contractsRes?.data ?? []);
        setContractsList(contractItems.map((c: any) => ({
          id: c.contractId ?? c.id,
          number: c.contractNumber ?? `CTR-${c.contractId}`,
          title: c.title,
          value: c.contractValue ?? c.value ?? 0
        })));
        const oppItems = Array.isArray(oppsRes) ? oppsRes : (oppsRes?.items ?? oppsRes?.data ?? []);
        setOpportunitiesList(oppItems.map((o: any) => ({
          id: o.opportunityId ?? o.id,
          title: o.title,
          value: o.estimatedValue ?? 0,
          stage: o.stageName
        })));
      } catch {
        // optional
      }
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    const amtErr = validatePositiveNumber(editAmount, 'Invoice amount');
    if (amtErr) {
      showToast(amtErr, 'error');
      return;
    }
    const taxErr = validatePositiveNumber(editTaxRate, 'Tax rate', true, 100);
    if (taxErr) {
      showToast(taxErr, 'error');
      return;
    }
    if (editIssueDate && editDueDate) {
      const dateErr = validateDateRange(editIssueDate, editDueDate, 'Issue date', 'Due date');
      if (dateErr) {
        showToast(dateErr, 'error');
        return;
      }
    }
    const notesErr = validateMaxLength(editNotes, 1000, 'Notes');
    if (notesErr) {
      showToast(notesErr, 'error');
      return;
    }

    setSavingEdit(true);
    try {
      await api.put(`/api/invoices/${editingInvoice.invoiceId}`, {
        amount: editAmount,
        taxRate: editTaxRate,
        status: editStatus,
        issueDate: editIssueDate,
        dueDate: editDueDate,
        contractId: editContractId,
        opportunityId: editOpportunityId,
        notes: editNotes || undefined,
        terms: editTerms || undefined
      });
      showToast('Invoice updated successfully', 'success');
      setEditingInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update invoice', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteInvoice = async (inv: InvoiceItem) => {
    const ok = await confirmAction(`Are you sure you want to delete Invoice #${inv.invoiceNumber}?`);
    if (!ok) return;

    try {
      await api.delete(`/api/invoices/${inv.invoiceId}`);
      showToast(`Invoice #${inv.invoiceNumber} deleted.`, 'success');
      fetchInvoices();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete invoice', 'error');
    }
  };

  const isInvoiceOverdue = (inv: InvoiceItem) => {
    const status = (inv.status || '').toLowerCase();
    if (status === 'paid' || status === 'cancelled' || status === 'refunded' || status === 'pendingverification') {
      return false;
    }
    if (!inv.dueDate) return false;

    const dateOnly = typeof inv.dueDate === 'string' ? inv.dueDate.split('T')[0] : '';
    const parts = dateOnly.split('-');
    let dueEndOfDay: number;
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      dueEndOfDay = new Date(y, m, d, 23, 59, 59, 999).getTime();
    } else {
      const dueDateObj = new Date(inv.dueDate);
      dueEndOfDay = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), dueDateObj.getDate(), 23, 59, 59, 999).getTime();
    }

    return Date.now() > dueEndOfDay;
  };

  const getDaysOverdue = (dueDateStr?: string) => {
    if (!dueDateStr) return 0;
    const dateOnly = dueDateStr.split('T')[0];
    const parts = dateOnly.split('-');
    let dueEndOfDay: number;
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      dueEndOfDay = new Date(y, m, d, 23, 59, 59, 999).getTime();
    } else {
      const dueDateObj = new Date(dueDateStr);
      dueEndOfDay = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), dueDateObj.getDate(), 23, 59, 59, 999).getTime();
    }
    const diff = Date.now() - dueEndOfDay;
    if (diff <= 0) return 0;
    return Math.ceil(diff / 86400000);
  };

  const filteredInvoices = invoices.filter(inv => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(term) ||
      inv.customerName.toLowerCase().includes(term) ||
      inv.customerEmail.toLowerCase().includes(term) ||
      (inv.companyName && inv.companyName.toLowerCase().includes(term)) ||
      (inv.contractNumber && inv.contractNumber.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (statusFilter === 'Paid') return inv.status === 'Paid';
    if (statusFilter === 'PartiallyPaid') return inv.status === 'PartiallyPaid';
    if (statusFilter === 'PendingVerification') return inv.status === 'PendingVerification';
    if (statusFilter === 'Sent') return inv.status === 'Sent' && !isInvoiceOverdue(inv);
    if (statusFilter === 'Draft') return inv.status === 'Draft';
    if (statusFilter === 'Overdue') return isInvoiceOverdue(inv);

    return true;
  });

  const totalInvoiced = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalCollected = invoices.reduce((sum, i) => sum + (Number(i.amountPaid) || 0), 0);
  const totalReceivable = invoices.reduce((sum, i) => sum + (i.status !== 'Paid' && i.status !== 'Cancelled' ? (i.balanceDue ?? i.totalAmount) : 0), 0);
  const overdueCount = invoices.filter(isInvoiceOverdue).length;

  const statusBadge = (inv: InvoiceItem) => {
    if (inv.status === 'Paid') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', whiteSpace: 'nowrap' }}>
          <CheckCircle size={13} /> Paid &amp; Settled
        </span>
      );
    }
    if (inv.status === 'PartiallyPaid') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', whiteSpace: 'nowrap' }}>
          <Clock size={13} /> Partially Paid (${inv.amountPaid.toLocaleString()} / ${inv.totalAmount.toLocaleString()})
        </span>
      );
    }
    if (inv.status === 'PendingVerification') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', whiteSpace: 'nowrap' }}>
          <Landmark size={13} /> Pending Wire Approval
        </span>
      );
    }
    if (isInvoiceOverdue(inv)) {
      const days = getDaysOverdue(inv.dueDate);
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', whiteSpace: 'nowrap' }}>
          <AlertTriangle size={13} /> 🔴 Overdue {days > 0 ? `(${days}d late)` : ''}
        </span>
      );
    }
    if (inv.status === 'Sent') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', whiteSpace: 'nowrap' }}>
          <Send size={13} /> Payment Requested
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', whiteSpace: 'nowrap' }}>
        <Clock size={13} /> Draft (Unsent)
      </span>
    );
  };

  const printInvoicePDF = (inv: InvoiceItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download or print the PDF invoice.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${inv.invoiceNumber}</title>
        <style>
          body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
          .invoice-box { max-width: 800px; margin: auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 12px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 20px; }
          .logo { font-size: 24px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px; }
          .inv-title { font-size: 28px; font-weight: 700; color: #0f172a; text-align: right; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-top: 6px; }
          .status-paid { background: #dcfce7; color: #15803d; }
          .status-sent { background: #dbeafe; color: #1d4ed8; }
          .status-overdue { background: #fee2e2; color: #b91c1c; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .info-block h4 { margin: 0 0 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
          .info-block p { margin: 2px 0; font-size: 14px; color: #334155; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f8fafc; color: #475569; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
          td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
          .total-box { margin-left: auto; width: 300px; }
          .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
          .total-grand { font-size: 18px; font-weight: 800; color: #6366f1; border-top: 2px solid #6366f1; padding-top: 10px; margin-top: 6px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
          @media print { body { padding: 0; } .invoice-box { border: none; } }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div>
              ${profile?.logoUrl ? `<img src="${profile.logoUrl}" style="max-height: 48px; max-width: 180px; object-fit: contain; margin-bottom: 6px;" alt="Logo" />` : `<div class="logo">⚡ ${profile?.companyName || profile?.systemName || 'Enterprise CRM'}</div>`}
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Commercial Invoicing &amp; Accounts Receivable</div>
            </div>
            <div>
              <div class="inv-title">COMMERCIAL INVOICE</div>
              <div style="text-align: right; color: #64748b; font-weight: 600; margin-top: 2px;">#${inv.invoiceNumber}</div>
              <div style="text-align: right;">
                <span class="status status-${inv.status.toLowerCase()}">${inv.status}</span>
              </div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-block">
              <h4>Remit Payment To (Company / Receiver):</h4>
              <p><strong>${profile?.companyName || profile?.systemName || 'Enterprise CRM Solutions'}</strong></p>
              ${profile?.address ? `<p>${profile.address}</p>` : ''}
              ${profile?.country ? `<p>${profile.country}</p>` : ''}
              ${profile?.email ? `<p>✉️ ${profile.email}</p>` : ''}
              ${profile?.phone ? `<p>📞 ${profile.phone}</p>` : ''}
            </div>
            <div class="info-block" style="text-align: right;">
              <h4>Bill To (Customer / Payer):</h4>
              <p><strong>${inv.customerName}</strong></p>
              ${inv.companyName ? `<p>🏢 ${inv.companyName}</p>` : ''}
              <p>✉️ ${inv.customerEmail}</p>
              <p style="margin-top: 10px;"><strong>Issue Date:</strong> ${formatDisplayDate(inv.issueDate)}</p>
              <p><strong>Payment Due:</strong> ${formatDisplayDate(inv.dueDate)}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Professional Services &amp; Settlement</strong>
                  ${inv.opportunityTitle ? `<div style="font-size: 12px; color: #4f46e5; font-weight: 600; margin-top: 2px;">Ref Deal: 💼 ${inv.opportunityTitle}</div>` : ''}
                  ${inv.contractNumber ? `<div style="font-size: 12px; color: #64748b;">Ref Contract: 📄 ${inv.contractNumber} (${inv.contractTitle || ''})</div>` : ''}
                  ${inv.notes ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">${inv.notes}</div>` : ''}
                </td>
                <td style="text-align: right; font-weight: 600;">${formatCurrency(inv.amount, profile?.currency || currency, 2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="total-box">
            <div class="total-row"><span>Subtotal:</span><span>${formatCurrency(inv.amount, profile?.currency || currency, 2)}</span></div>
            <div class="total-row"><span>Tax (${inv.taxRate}%):</span><span>${formatCurrency(inv.taxAmount, profile?.currency || currency, 2)}</span></div>
            <div class="total-row total-grand"><span>Total Amount:</span><span>${formatCurrency(inv.totalAmount, profile?.currency || currency, 2)}</span></div>
            <div class="total-row" style="color: #10b981; font-weight: 700; margin-top: 4px;"><span>Amount Paid:</span><span>${formatCurrency(inv.amountPaid || 0, profile?.currency || currency, 2)}</span></div>
            <div class="total-row" style="color: #6366f1; font-weight: 800; font-size: 16px;"><span>Balance Due:</span><span>${formatCurrency(inv.balanceDue ?? inv.totalAmount, profile?.currency || currency, 2)}</span></div>
          </div>

          <div class="footer">
            <p><strong>Payment Terms:</strong> ${inv.terms || 'Payment due within 30 days of invoice issue date.'}</p>
            <p style="margin-top: 6px;">To pay online via Card, Stripe, or Bank Wire, visit: <strong>${window.location.origin}/invoices/pay/${inv.invoiceNumber}</strong></p>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <Layout>
      {/* Header */}
      <div className="dashboard-header animate-fade-in" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="dashboard-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <Receipt style={{ color: 'var(--accent-primary)' }} size={28} /> Invoices &amp; Receivables Management
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Issue commercial invoices to customers, send secure payment requests, and record incoming wire &amp; offline settlements
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button onClick={() => fetchInvoices(true)} variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={15} /> Refresh
          </Button>
          <Button onClick={() => navigate('/invoices/new')} style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)', fontWeight: 600 }}>
            <Plus size={18} style={{ marginRight: 6 }} /> Create Invoice
          </Button>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="crm-metrics-responsive-grid animate-fade-in">
        <Card className="metric-card glass-panel" style={{ borderLeft: '4px solid #6366f1' }}>
          <Card.Content style={{ padding: '1.25rem' }}>
            <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="metric-title" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Invoiced</span>
              <Receipt className="metric-icon" size={20} style={{ color: '#6366f1' }} />
            </div>
            <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {formatCurrency(totalInvoiced, profile?.currency || currency, 2)}
            </div>
            <div className="metric-subtitle" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {invoices.length} total issued invoices
            </div>
          </Card.Content>
        </Card>

        <Card className="metric-card glass-panel" style={{ borderLeft: '4px solid #10b981' }}>
          <Card.Content style={{ padding: '1.25rem' }}>
            <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="metric-title" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Revenue Collected</span>
              <DollarSign className="metric-icon" size={20} style={{ color: '#10b981' }} />
            </div>
            <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
              {formatCurrency(totalCollected, profile?.currency || currency, 2)}
            </div>
            <div className="metric-subtitle" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Settled into Company bank account
            </div>
          </Card.Content>
        </Card>

        <Card className="metric-card glass-panel" style={{ borderLeft: '4px solid #f59e0b' }}>
          <Card.Content style={{ padding: '1.25rem' }}>
            <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="metric-title" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Accounts Receivable</span>
              <Clock className="metric-icon" size={20} style={{ color: '#f59e0b' }} />
            </div>
            <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>
              {formatCurrency(totalReceivable, profile?.currency || currency, 2)}
            </div>
            <div className="metric-subtitle" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Unpaid balance due from customers
            </div>
          </Card.Content>
        </Card>

        <Card className="metric-card glass-panel" style={{ borderLeft: '4px solid #ef4444' }}>
          <Card.Content style={{ padding: '1.25rem' }}>
            <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="metric-title" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Overdue Invoices</span>
              <AlertTriangle className="metric-icon" size={20} style={{ color: '#ef4444' }} />
            </div>
            <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444' }}>
              {overdueCount}
            </div>
            <div className="metric-subtitle" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Requires immediate follow-up
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="crm-filter-toolbar-wrap animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Status Filters */}
        <div className="crm-filter-tabs-bar">
          <button
            type="button"
            onClick={() => setStatusFilter('All')}
            className={`crm-filter-tab-btn ${statusFilter === 'All' ? 'active-all' : ''}`}
          >
            All Invoices ({invoices.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Paid')}
            className={`crm-filter-tab-btn ${statusFilter === 'Paid' ? 'active-paid' : ''}`}
          >
            ✅ Paid ({invoices.filter(i => i.status === 'Paid').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PartiallyPaid')}
            className={`crm-filter-tab-btn ${statusFilter === 'PartiallyPaid' ? 'active-paid' : ''}`}
          >
            ⏳ Partially Paid ({invoices.filter(i => i.status === 'PartiallyPaid').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Sent')}
            className={`crm-filter-tab-btn ${statusFilter === 'Sent' ? 'active-draft' : ''}`}
          >
            📬 Requested ({invoices.filter(i => i.status === 'Sent' && !isInvoiceOverdue(i)).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Overdue')}
            className={`crm-filter-tab-btn ${statusFilter === 'Overdue' ? 'active-overdue' : ''}`}
          >
            ⚠️ Overdue ({overdueCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Draft')}
            className={`crm-filter-tab-btn ${statusFilter === 'Draft' ? 'active-draft' : ''}`}
          >
            📝 Draft ({invoices.filter(i => i.status === 'Draft').length})
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="filter-input"
            placeholder="Search invoice #, customer..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem', width: '100%', borderRadius: '8px', background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
          />
        </div>
      </div>

      {/* Invoices Table */}
      <Card className="glass-panel animate-fade-in" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <Card.Content style={{ padding: 0 }}>
          {isLoading ? (
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} variant="rect" height={52} style={{ borderRadius: '8px', animationDelay: `${i * 0.07}s` }} />
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={searchTerm || statusFilter !== 'All' ? 'No invoices match your filters' : 'No invoices yet'}
              description={searchTerm || statusFilter !== 'All' ? 'Try clearing your search or changing the status filter.' : 'Create your first invoice or generate one directly from a signed contract.'}
              actionText={!searchTerm && statusFilter === 'All' ? 'Create Invoice' : undefined}
              onActionClick={!searchTerm && statusFilter === 'All' ? handleOpenCreateModal : undefined}
            />
          ) : (
            <>
              <div className="contracts-table-wrap" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap', minWidth: '160px' }}>Invoice #</th>
                    <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap', minWidth: '220px' }}>Payer (Customer)</th>
                    <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap', minWidth: '190px' }}>Contract / Deal Ref</th>
                    <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap', minWidth: '135px' }}>Total Invoiced</th>
                    <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap', minWidth: '130px' }}>Balance Due</th>
                    <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap', minWidth: '150px' }}>Payment Status</th>
                    <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap', minWidth: '130px' }}>Due Date</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap', minWidth: '130px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(inv => (
                    <tr
                      key={inv.invoiceId}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }}
                      className="contract-table-row"
                    >
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.9rem', display: 'inline-block', letterSpacing: '0.02em' }}>
                          {inv.invoiceNumber}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', whiteSpace: 'nowrap' }}>
                          Issued: {formatDisplayDate(inv.issueDate)}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', minWidth: '220px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem', whiteSpace: 'nowrap' }}>
                          {inv.customerName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }} title={inv.customerEmail}>
                          {inv.companyName ? `🏢 ${inv.companyName} · ` : ''}{inv.customerEmail}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', minWidth: '190px' }}>
                        {inv.contractNumber ? (
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                              📄 {inv.contractNumber}
                            </span>
                            {inv.contractTitle && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '190px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inv.contractTitle}>
                                {inv.contractTitle}
                              </div>
                            )}
                            {inv.opportunityTitle && (
                              <div style={{ fontSize: '0.72rem', color: '#818cf8', marginTop: '2px', fontWeight: 600, maxWidth: '190px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                💼 {inv.opportunityTitle}
                              </div>
                            )}
                          </div>
                        ) : inv.opportunityTitle ? (
                          <div>
                            <span style={{ fontWeight: 600, color: '#818cf8', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                              💼 {inv.opportunityTitle}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Linked Opportunity</div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>— Direct Invoice —</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.98rem' }}>
                          {formatCurrency(inv.totalAmount, profile?.currency || currency, 2)}
                        </div>
                        {inv.amountPaid > 0 && (
                          <div style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            Paid: {formatCurrency(inv.amountPaid, profile?.currency || currency, 2)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 800, color: (inv.balanceDue ?? inv.totalAmount) > 0 ? 'var(--accent-primary)' : '#10b981', fontSize: '0.98rem' }}>
                          {formatCurrency(inv.balanceDue ?? (inv.status === 'Paid' ? 0 : inv.totalAmount), profile?.currency || currency, 2)}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        {statusBadge(inv)}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const overdue = isInvoiceOverdue(inv);
                          const daysOverdue = getDaysOverdue(inv.dueDate);
                          return (
                            <div>
                              <div style={{ color: overdue ? '#ef4444' : 'var(--text-secondary)', fontWeight: overdue ? 700 : 500, whiteSpace: 'nowrap' }}>
                                {formatDisplayDate(inv.dueDate)}
                              </div>
                              {overdue && (
                                <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                  ⚠️ {daysOverdue > 1 ? `${daysOverdue} days late` : 'Due today'}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                          {(() => {
                            const invStatus = (inv.status || '').toLowerCase();
                            const isPaid = invStatus === 'paid' || (inv.balanceDue !== undefined && inv.balanceDue <= 0.01 && (inv.amountPaid || 0) > 0);
                            const isCancelledOrRefunded = invStatus === 'cancelled' || invStatus === 'refunded';
                            const isPayable = !isPaid && !isCancelledOrRefunded && invStatus !== 'pendingverification';

                            return isPayable ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleSendPaymentRequest(inv)}
                                title="Send Payment Request Link to Customer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', padding: '0.35rem 0.65rem', whiteSpace: 'nowrap', flexShrink: 0 }}
                              >
                                <Send size={13} style={{ color: 'var(--accent-primary)' }} /> Send Link
                              </Button>
                            ) : null;
                          })()}
                          <InvoiceActionMenu
                            invoice={inv}
                            onRecordPayment={handleOpenRecordPayment}
                            onSendPaymentRequest={handleSendPaymentRequest}
                            onCopyPaymentLink={handleCopyPaymentLink}
                            onPrint={printInvoicePDF}
                            onEdit={(invoiceItem) => navigate(`/invoices/${invoiceItem.invoiceId}/edit`)}
                            onDelete={handleDeleteInvoice}
                            onView={setSelectedInvoice}
                            onSyncPricing={handleSyncPricing}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards View */}
            <div className="contracts-mobile-list">
              {filteredInvoices.map(inv => {
                const invStatus = (inv.status || '').toLowerCase();
                const isPaid = invStatus === 'paid' || (inv.balanceDue !== undefined && inv.balanceDue <= 0.01 && (inv.amountPaid || 0) > 0);
                const isCancelledOrRefunded = invStatus === 'cancelled' || invStatus === 'refunded';
                const isPayable = !isPaid && !isCancelledOrRefunded && invStatus !== 'pendingverification';
                const overdue = isInvoiceOverdue(inv);
                const daysOverdue = getDaysOverdue(inv.dueDate);

                return (
                  <div key={inv.invoiceId} style={{
                    borderBottom: '1px solid var(--border-color)',
                    padding: '1.15rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.88rem' }}>
                          {inv.invoiceNumber}
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem', fontSize: '0.98rem' }}>
                          👤 {inv.customerName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          {inv.companyName ? `🏢 ${inv.companyName} · ` : ''}{inv.customerEmail}
                        </div>
                      </div>
                      {statusBadge(inv)}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.65rem 0.85rem', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Invoiced</div>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem', marginTop: '0.1rem' }}>
                          {formatCurrency(inv.totalAmount, profile?.currency || currency, 2)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Balance Due</div>
                        <div style={{ fontWeight: 800, color: (inv.balanceDue ?? inv.totalAmount) > 0 ? 'var(--accent-primary)' : '#10b981', fontSize: '1rem', marginTop: '0.1rem' }}>
                          {formatCurrency(inv.balanceDue ?? (inv.status === 'Paid' ? 0 : inv.totalAmount), profile?.currency || currency, 2)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem' }}>
                      <div style={{ color: overdue ? '#ef4444' : 'var(--text-secondary)', fontWeight: overdue ? 700 : 500, fontSize: '0.78rem' }}>
                        📅 Due: {formatDisplayDate(inv.dueDate)} {overdue && `(⚠️ ${daysOverdue > 0 ? `${daysOverdue}d late` : 'Today'})`}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginLeft: 'auto' }}>
                        {isPayable && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleSendPaymentRequest(inv)}
                            title="Send Payment Request Link to Customer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', padding: '0.35rem 0.65rem', whiteSpace: 'nowrap' }}
                          >
                            <Send size={13} style={{ color: 'var(--accent-primary)' }} /> Send Link
                          </Button>
                        )}
                        <InvoiceActionMenu
                          invoice={inv}
                          onRecordPayment={handleOpenRecordPayment}
                          onSendPaymentRequest={handleSendPaymentRequest}
                          onCopyPaymentLink={handleCopyPaymentLink}
                          onPrint={printInvoicePDF}
                          onEdit={(invoiceItem) => navigate(`/invoices/${invoiceItem.invoiceId}/edit`)}
                          onDelete={handleDeleteInvoice}
                          onView={setSelectedInvoice}
                          onSyncPricing={handleSyncPricing}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card.Content>
    </Card>

      {/* RECORD / VERIFY CUSTOMER PAYMENT MODAL */}
      {recordingPaymentInvoice && (() => {
        const recInv = recordingPaymentInvoice;
        const remainingBal = recInv.balanceDue ?? (recInv.status === 'Paid' ? 0 : recInv.totalAmount);
        const isBankMethod = paymentMethod === 'Bank Transfer' || paymentMethod === 'Check' || paymentMethod === 'SWIFT Wire Transfer' || paymentMethod === 'Telebirr / CBE Birr';

        return ReactDOM.createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              zIndex: 99999,
            }}
            onClick={() => setRecordingPaymentInvoice(null)}
          >
            <style>{`
              .rpm-inv-modal input:focus, .rpm-inv-modal select:focus {
                border-color: #10b981 !important;
                box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12) !important;
                outline: none !important;
              }
            `}</style>
            <div
              className="rpm-inv-modal"
              style={{
                width: '100%',
                maxWidth: '640px',
                maxHeight: '92vh',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                boxShadow: '0 25px 60px -15px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.35rem 1.75rem',
                  background: '#ffffff',
                  borderBottom: '1px solid #f1f5f9',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
                      Record Offline / Manual Payment
                    </h3>
                    <div style={{ fontSize: '0.79rem', color: '#94a3b8', marginTop: '2px' }}>
                      Invoice #{recInv.invoiceNumber} · Internal Ledger Verification
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRecordingPaymentInvoice(null)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '7px',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    lineHeight: 1,
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form with scrollable body */}
              <form onSubmit={handleRecordPaymentSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '1.25rem 1.75rem',
                    overflowY: 'auto',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    background: '#f8fafc',
                  }}
                >
                  {/* Direct Ledger Notice */}
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '12px',
                      padding: '0.85rem 1.1rem',
                      fontSize: '0.83rem',
                      color: '#166534',
                      display: 'flex',
                      gap: '0.65rem',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🛡️</span>
                    <div>
                      <strong style={{ color: '#14532d' }}>Direct Ledger Credit:</strong> Record that the{' '}
                      <strong>Customer (Payer)</strong> has made a verified offline payment to <strong>Our Company (Receiver)</strong>.
                    </div>
                  </div>

                  {/* Payer vs Receiver Block */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ background: '#ffffff', padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>
                        👤 Payer (Customer)
                      </div>
                      <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '0.25rem', fontSize: '0.94rem' }}>{recInv.customerName}</div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>{recInv.companyName || recInv.customerEmail}</div>
                    </div>
                    <div style={{ background: '#ffffff', padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>
                        🏢 Receiver (Our Company)
                      </div>
                      <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '0.25rem', fontSize: '0.94rem' }}>Enterprise CRM Solutions</div>
                      <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700, marginTop: '2px' }}>
                        Balance Due: {formatCurrency(remainingBal)}
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Quick Selector */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                      Payment Method / Channel *
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.45rem' }}>
                      {[
                        { id: 'Bank Transfer', label: '🏦 Bank Wire' },
                        { id: 'Cash', label: '💵 Cash' },
                        { id: 'Check', label: '📑 Cheque' },
                        { id: 'Telebirr / CBE Birr', label: '📱 Telebirr/CBE' },
                        { id: 'Stripe', label: '💳 Card / POS' },
                        { id: 'SWIFT Wire Transfer', label: '🌐 SWIFT Int.' },
                      ].map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id)}
                          style={{
                            padding: '0.5rem 0.6rem',
                            borderRadius: '10px',
                            border: paymentMethod === m.id ? '1.5px solid #10b981' : '1.5px solid #e2e8f0',
                            background: paymentMethod === m.id ? '#f0fdf4' : '#ffffff',
                            color: paymentMethod === m.id ? '#16a34a' : '#475569',
                            fontSize: '0.8rem',
                            fontWeight: paymentMethod === m.id ? 700 : 500,
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s ease',
                            boxShadow: paymentMethod === m.id ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none',
                          }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount & Date */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
                        Amount Paid &amp; Date *
                      </label>
                      {remainingBal > 0 && (
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => setPaymentAmount(remainingBal)}
                            style={{
                              background: paymentAmount === remainingBal ? '#dcfce7' : '#f0fdf4',
                              border: paymentAmount === remainingBal ? '1.5px solid #16a34a' : '1px solid #bbf7d0',
                              color: '#16a34a',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            Full ({formatCurrency(remainingBal)})
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentAmount(Math.round((remainingBal / 2) * 100) / 100)}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              color: '#64748b',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            50% ({formatCurrency(remainingBal / 2)})
                          </button>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={remainingBal > 0 ? remainingBal : recInv.totalAmount}
                          value={paymentAmount}
                          onChange={e => setPaymentAmount(Number(e.target.value))}
                          required
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Input
                          type="date"
                          value={paymentDate}
                          onChange={e => setPaymentDate(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bank name (if bank method) */}
                  {isBankMethod && (
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.45rem' }}>
                        Receiving / Customer Bank Name
                      </label>
                      <SearchableSelect
                        value={paymentBankName}
                        onChange={val => setPaymentBankName(String(val))}
                        options={[
                          { value: 'Commercial Bank of Ethiopia (Nigd Bank)', label: 'Commercial Bank of Ethiopia (Nigd Bank)' },
                          { value: 'Awash Bank', label: 'Awash Bank' },
                          { value: 'Bank of Abyssinia', label: 'Bank of Abyssinia' },
                          { value: 'Dashen Bank', label: 'Dashen Bank' },
                          { value: 'Nib International Bank', label: 'Nib International Bank' },
                          { value: 'Zemen Bank', label: 'Zemen Bank' },
                          { value: 'United Bank / Hibret Bank', label: 'United Bank / Hibret Bank' },
                          { value: 'Cooperative Bank of Oromia', label: 'Cooperative Bank of Oromia' },
                          { value: 'Telebirr / Ethio Telecom', label: 'Telebirr / Ethio Telecom' },
                          { value: 'Other Supported Bank', label: 'Other Supported Bank' },
                        ]}
                      />
                    </div>
                  )}

                  {/* Transaction Ref */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.45rem' }}>
                      Transaction / Slip / Check Reference (Optional)
                    </label>
                    <Input
                      value={paymentRef}
                      onChange={e => setPaymentRef(e.target.value)}
                      placeholder="e.g. Bank Deposit Slip #TXN-928374, Check #4092, or Telebirr ID"
                    />
                  </div>

                  {/* Remarks */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
                        Accounting Remarks / Verification Notes
                      </label>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        {['Direct Bank Deposit', 'Cash in Office', 'Verified on Statement'].map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setPaymentNotes(tag)}
                            style={{
                              background: paymentNotes === tag ? '#ede9fe' : '#f8fafc',
                              border: paymentNotes === tag ? '1px solid #6366f1' : '1px solid #e2e8f0',
                              color: paymentNotes === tag ? '#4f46e5' : '#64748b',
                              fontSize: '0.7rem',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Input
                      value={paymentNotes}
                      onChange={e => setPaymentNotes(e.target.value)}
                      placeholder="e.g. Deposit payment / Verified against bank statement"
                    />
                  </div>
                </div>

                {/* Fixed Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.75rem',
                    background: '#ffffff',
                    borderTop: '1px solid #f1f5f9',
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setRecordingPaymentInvoice(null)}
                    style={{
                      background: 'transparent',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '10px',
                      color: '#64748b',
                      fontWeight: 600,
                      padding: '0.6rem 1.1rem',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recordingPayment}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      fontWeight: 700,
                      padding: '0.6rem 1.35rem',
                      fontSize: '0.9rem',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: recordingPayment ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                      opacity: recordingPayment ? 0.7 : 1,
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{recordingPayment ? 'Recording…' : 'Confirm & Verify Payment'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* SEND PAYMENT REQUEST MODAL */}
      {sendingRequestInvoice && (() => {
        const sendInv = sendingRequestInvoice;
        const currentPayUrl = `${window.location.origin}/invoices/pay/${sendInv.invoiceNumber}`;
        const balanceVal = (sendInv.balanceDue ?? (sendInv.status === 'Paid' ? 0 : sendInv.totalAmount));
        const emailSubject = encodeURIComponent(`Payment Request: Invoice #${sendInv.invoiceNumber} ($${balanceVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} due)`);
        const emailBody = encodeURIComponent(
          `Dear ${sendInv.customerName},\n\nPlease find your official payment link for Invoice #${sendInv.invoiceNumber} ($${balanceVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} due):\n\n${currentPayUrl}\n\n${customRequestMsg ? customRequestMsg + '\n\n' : ''}You can complete payment securely online via Credit/Debit Card, Stripe, or Bank Wire Transfer.\n\nBest regards,\nEnterprise CRM Solutions`
        );
        const waText = encodeURIComponent(
          `Hello ${sendInv.customerName}, here is the secure payment link for Invoice #${sendInv.invoiceNumber} ($${balanceVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}): ${currentPayUrl}`
        );

        return (
          <div className="crm-modal-overlay">
            <div className="crm-modal-container" style={{ maxWidth: '540px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Send size={18} style={{ color: 'var(--accent-primary)' }} /> Send Payment Request
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Send or share the official payment portal link with {sendInv.customerName}
                  </div>
                </div>
                <button onClick={() => setSendingRequestInvoice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.4rem' }}>×</button>
              </div>

              <form onSubmit={handleConfirmSendRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid var(--border-color)' }}>
                  <div><strong>Recipient:</strong> {sendInv.customerName} ({sendInv.customerEmail || 'No email set'})</div>
                  <div><strong>Invoice Reference:</strong> #{sendInv.invoiceNumber}</div>
                  <div><strong>Balance Due:</strong> <strong style={{ color: '#10b981' }}>${balanceVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></div>
                </div>

                {/* Direct Payment Link Box */}
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Official Payment Portal Link (Direct URL)
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      readOnly
                      value={currentPayUrl}
                      style={{ flex: 1, padding: '0.55rem 0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--accent-primary)', fontFamily: 'monospace' }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(currentPayUrl);
                        showToast('Payment link copied to clipboard!', 'success');
                      }}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <Copy size={14} style={{ marginRight: 4 }} /> Copy
                    </Button>
                  </div>
                </div>

                {/* Quick Sharing Options */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <a
                    href={`https://wa.me/?text=${waText}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', textDecoration: 'none', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.3)' }}
                  >
                    💬 Share via WhatsApp
                  </a>
                  <a
                    href={`mailto:${sendInv.customerEmail || ''}?subject=${emailSubject}&body=${emailBody}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem', background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', textDecoration: 'none', fontWeight: 600, border: '1px solid rgba(99, 102, 241, 0.3)' }}
                  >
                    ✉️ Open in Mail Client
                  </a>
                  <a
                    href={currentPayUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem', background: 'rgba(148, 163, 184, 0.12)', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, border: '1px solid var(--border-color)' }}
                  >
                    🌐 Open Portal
                  </a>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Custom Message to Customer (Optional)</label>
                  <textarea
                    value={customRequestMsg}
                    onChange={e => setCustomRequestMsg(e.target.value)}
                    placeholder="e.g. Please find the payment link for project milestone 1. Let us know once remitted."
                    rows={2}
                    style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <Button variant="secondary" type="button" onClick={() => setSendingRequestInvoice(null)}>Cancel</Button>
                  <Button type="submit" variant="primary" disabled={sendingRequest} style={{ fontWeight: 700 }}>
                    <Send size={15} style={{ marginRight: 6 }} /> {sendingRequest ? 'Sending…' : 'Send Payment Email'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* VIEW INVOICE DETAIL MODAL */}
      {selectedInvoice && (() => {
        const viewInv = selectedInvoice;
        const invStatus = (viewInv.status || '').toLowerCase();
        const isPaid = invStatus === 'paid' || (viewInv.balanceDue !== undefined && viewInv.balanceDue <= 0.01 && (viewInv.amountPaid || 0) > 0);
        const isPartiallyPaid = invStatus === 'partiallypaid' || ((viewInv.amountPaid || 0) > 0 && (viewInv.balanceDue || 0) > 0.01);
        const isCancelledOrRefunded = invStatus === 'cancelled' || invStatus === 'refunded';
        const isPayable = !isPaid && !isCancelledOrRefunded && invStatus !== 'pendingverification';

        return (
          <div className="crm-modal-overlay">
            <div className="crm-modal-container" style={{ maxWidth: '580px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Invoice #{viewInv.invoiceNumber}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Issued {formatDisplayDate(viewInv.issueDate)}
                  </div>
                </div>
                <button onClick={() => setSelectedInvoice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.4rem' }}>×</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                <div className="crm-form-2col">
                  <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Receiver (Our Company)</div>
                    <div style={{ fontWeight: 700, marginTop: '0.25rem' }}>Enterprise CRM Solutions Inc.</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>San Francisco, CA · Tax ID: US-94829471</div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Payer (Customer)</div>
                    <div style={{ fontWeight: 700, marginTop: '0.25rem' }}>{viewInv.customerName}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{viewInv.companyName || viewInv.customerEmail}</div>
                  </div>
                </div>

                {(viewInv.contractNumber || viewInv.opportunityTitle) && (
                  <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '8px', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                    {viewInv.opportunityTitle && (
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>💼 Linked Deal / Opp: </span>
                        <strong style={{ color: '#818cf8' }}>{viewInv.opportunityTitle}</strong>
                      </div>
                    )}
                    {viewInv.contractNumber && (
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>📜 Linked Contract: </span>
                        <strong>{viewInv.contractNumber} {viewInv.contractTitle ? `(${viewInv.contractTitle})` : ''}</strong>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Invoice Total</div>
                    <div style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--text-primary)' }}>${viewInv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Amount Paid</div>
                    <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#10b981' }}>${(viewInv.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Balance Due</div>
                    <div style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--accent-primary)' }}>${(viewInv.balanceDue ?? viewInv.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {isPayable && (
                    <Button
                      variant="secondary"
                      onClick={() => handleCopyPaymentLink(viewInv)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Copy size={15} />
                      <span>{isPartiallyPaid ? `Copy Link ($${(viewInv.balanceDue ?? 0).toLocaleString()} Due)` : 'Copy Customer Link'}</span>
                    </Button>
                  )}
                  {isPayable && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        setSelectedInvoice(null);
                        setSendingRequestInvoice(viewInv);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Send size={15} /> Send Payment Request
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => printInvoicePDF(viewInv)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Printer size={15} /> Print Commercial Invoice
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </Layout>
  );
};
