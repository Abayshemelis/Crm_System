import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';
import { Plus, Search, Receipt, CheckCircle, Clock, AlertTriangle, Download, Printer, DollarSign, CreditCard, MoreVertical, FileText, ArrowUpRight, Edit3, Trash2 } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import './screens.css';

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
  status: string; // Draft, Sent, Paid, Overdue, Cancelled
  issueDate: string;
  dueDate: string;
  paidAt?: string;
  paymentMethod?: string;
  notes?: string;
  terms?: string;
  createdByName: string;
  createdAt: string;
}

const InvoiceActionMenu: React.FC<{
  invoice: InvoiceItem;
  onPay: (inv: InvoiceItem) => void;
  onPrint: (inv: InvoiceItem) => void;
  onEdit: (inv: InvoiceItem) => void;
  onDelete: (inv: InvoiceItem) => void;
}> = ({ invoice, onPay, onPrint, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      {invoice.status !== 'Paid' ? (
        <button
          type="button"
          onClick={() => onPay(invoice)}
          title="Record payment for invoice"
          style={{
            padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
            background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap'
          }}
        >
          <CreditCard size={14} /> 💳 Pay Invoice
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onPrint(invoice)}
          title="Print & export PDF receipt"
          style={{
            padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
            background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap'
          }}
        >
          <Printer size={14} /> 🖨️ PDF Invoice
        </button>
      )}

      {/* Action Menu Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="More invoice options"
        style={{
          padding: '0.35rem 0.55rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600,
          background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)',
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.2rem'
        }}
      >
        <MoreVertical size={14} />
      </button>

      {/* Dropdown Options */}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: '0.35rem', zIndex: 99999,
          background: '#1e293b', border: '1px solid #334155',
          borderRadius: '8px', boxShadow: '0 12px 30px rgba(0,0,0,0.6)', width: '195px', padding: '0.35rem',
          display: 'flex', flexDirection: 'column', gap: '0.25rem'
        }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onPrint(invoice); setOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.75rem',
              borderRadius: '6px', border: 'none', background: 'transparent', color: '#818cf8',
              fontSize: '0.82rem', textAlign: 'left', cursor: 'pointer', fontWeight: 500
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Printer size={14} /> Print / Export PDF
          </button>

          {invoice.status !== 'Paid' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPay(invoice); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.75rem',
                borderRadius: '6px', border: 'none', background: 'transparent', color: '#10b981',
                fontSize: '0.82rem', textAlign: 'left', cursor: 'pointer', fontWeight: 500
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <CreditCard size={14} /> Record Payment
            </button>
          )}

          {invoice.status !== 'Paid' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(invoice); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.75rem',
                borderRadius: '6px', border: 'none', background: 'transparent', color: '#f59e0b',
                fontSize: '0.82rem', textAlign: 'left', cursor: 'pointer', fontWeight: 500
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Edit3 size={14} /> Edit Invoice
            </button>
          )}

          <div style={{ height: '1px', background: '#334155', margin: '0.2rem 0' }} />

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(invoice); setOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.75rem',
              borderRadius: '6px', border: 'none', background: 'transparent', color: '#ef4444',
              fontSize: '0.82rem', textAlign: 'left', cursor: 'pointer', fontWeight: 500
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Trash2 size={14} /> Delete Invoice
          </button>
        </div>
      )}
    </div>
  );
};

export const InvoicesScreen: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Invoice Form State
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [contractsList, setContractsList] = useState<{ id: number; number: string; title: string; value: number }[]>([]);
  const [newCustomerId, setNewCustomerId] = useState(0);
  const [newContractId, setNewContractId] = useState<number | null>(null);
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newTaxRate, setNewTaxRate] = useState<number>(10);
  const [newIssueDate, setNewIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [newDueDate, setNewDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [newNotes, setNewNotes] = useState('');
  const [newTerms, setNewTerms] = useState('Payment due within 30 days of issue date.');
  const [creating, setCreating] = useState(false);

  // Payment Modal State
  const [payingInvoice, setPayingInvoice] = useState<InvoiceItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Edit Invoice State
  const [editingInvoice, setEditingInvoice] = useState<InvoiceItem | null>(null);
  const [editAmount, setEditAmount] = useState(0);
  const [editTaxRate, setEditTaxRate] = useState(10);
  const [editStatus, setEditStatus] = useState('Draft');
  const [editIssueDate, setEditIssueDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTerms, setEditTerms] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<InvoiceItem[]>('/api/invoices');
      setInvoices(data);
    } catch {
      showToast('Failed to load invoices', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const loadCustomers = async () => {
    try {
      const res = await api.get<any>('/api/customers?pageSize=100');
      const list = Array.isArray(res) ? res : res.data || [];
      setCustomers(list.map((c: any) => ({
        id: c.customerId,
        name: `${c.firstName} ${c.lastName}`.trim() + (c.companyName ? ` (${c.companyName})` : ''),
      })));
    } catch { }
  };

  const handleCustomerChange = async (cid: number) => {
    setNewCustomerId(cid);
    setNewContractId(null);
    if (!cid) {
      setContractsList([]);
      return;
    }
    try {
      const contracts = await api.get<any[]>(`/api/contracts?customerId=${cid}`);
      setContractsList((contracts || []).map(c => ({
        id: c.contractId,
        number: c.contractNumber,
        title: c.title,
        value: c.contractValue,
      })));
    } catch {
      setContractsList([]);
    }
  };

  const handleContractSelect = (contractId: number) => {
    setNewContractId(contractId > 0 ? contractId : null);
    if (contractId > 0) {
      const found = contractsList.find(c => c.id === contractId);
      if (found) {
        setNewAmount(found.value);
      }
    }
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    loadCustomers();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerId) { showToast('Please select a customer', 'error'); return; }
    if (newAmount <= 0) { showToast('Invoice amount must be greater than $0', 'error'); return; }

    setCreating(true);
    try {
      await api.post('/api/invoices', {
        customerId: newCustomerId,
        contractId: newContractId ?? null,
        amount: newAmount,
        taxRate: newTaxRate,
        issueDate: new Date(newIssueDate).toISOString(),
        dueDate: new Date(newDueDate).toISOString(),
        notes: newNotes || null,
        terms: newTerms || null,
      });
      showToast('Invoice generated successfully!');
      setShowCreateModal(false);
      setNewCustomerId(0);
      setNewContractId(null);
      setNewAmount(0);
      setNewNotes('');
      fetchInvoices();
    } catch {
      showToast('Failed to create invoice', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;

    setProcessingPayment(true);
    try {
      await api.post(`/api/invoices/${payingInvoice.invoiceId}/pay`, {
        paymentMethod,
        notes: paymentNotes || null,
      });
      showToast('Payment recorded successfully!');
      setPayingInvoice(null);
      fetchInvoices();
    } catch {
      showToast('Failed to record payment', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleOpenEditModal = (inv: InvoiceItem) => {
    setEditingInvoice(inv);
    setEditAmount(inv.amount);
    setEditTaxRate(inv.taxRate);
    setEditStatus(inv.status);
    setEditIssueDate(inv.issueDate ? inv.issueDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEditDueDate(inv.dueDate ? inv.dueDate.slice(0, 10) : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
    setEditNotes(inv.notes || '');
    setEditTerms(inv.terms || 'Payment due within 30 days of issue date.');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    if (editAmount <= 0) { showToast('Invoice amount must be greater than $0', 'error'); return; }

    setSavingEdit(true);
    try {
      const parseDate = (dStr: string) => {
        if (!dStr) return new Date().toISOString();
        const d = new Date(dStr);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      };

      await api.put(`/api/invoices/${editingInvoice.invoiceId}`, {
        amount: editAmount,
        taxRate: editTaxRate,
        status: editStatus,
        issueDate: parseDate(editIssueDate),
        dueDate: parseDate(editDueDate),
        notes: editNotes || null,
        terms: editTerms || null,
      });
      showToast('Invoice updated successfully!');
      setEditingInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      console.error('Failed to update invoice:', err);
      showToast(err?.message || 'Failed to update invoice', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteInvoice = async (inv: InvoiceItem) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${inv.invoiceNumber}? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/api/invoices/${inv.invoiceId}`);
      showToast(`Invoice ${inv.invoiceNumber} deleted`);
      fetchInvoices();
    } catch (err: any) {
      console.error('Failed to delete invoice:', err);
      showToast(err?.message || 'Failed to delete invoice', 'error');
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(term) ||
      inv.customerName.toLowerCase().includes(term) ||
      (inv.companyName && inv.companyName.toLowerCase().includes(term)) ||
      (inv.contractNumber && inv.contractNumber.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (statusFilter === 'Paid') return inv.status === 'Paid';
    if (statusFilter === 'Sent') return inv.status === 'Sent';
    if (statusFilter === 'Overdue') return inv.status === 'Overdue';
    if (statusFilter === 'Draft') return inv.status === 'Draft';
    return true;
  });

  // Financial KPI Metrics
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalCollected = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.totalAmount, 0);
  const totalOutstanding = invoices.filter(i => i.status !== 'Paid' && i.status !== 'Cancelled').reduce((sum, i) => sum + i.totalAmount, 0);
  const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;
  const paidCount = invoices.filter(i => i.status === 'Paid').length;
  const pendingCount = invoices.filter(i => i.status !== 'Paid' && i.status !== 'Cancelled').length;

  const statusBadge = (status: string) => {
    if (status === 'Paid') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', whiteSpace: 'nowrap' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
          Paid &amp; Settled
        </span>
      );
    }
    if (status === 'Overdue') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', whiteSpace: 'nowrap' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />
          Overdue
        </span>
      );
    }
    if (status === 'Sent') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', whiteSpace: 'nowrap' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 6px #3b82f6' }} />
          Sent to Client
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.7rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', whiteSpace: 'nowrap' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }} />
        Draft
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
              <div class="logo">⚡ CRM Enterprise</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Official Invoice Document</div>
            </div>
            <div>
              <div class="inv-title">INVOICE</div>
              <div style="text-align: right; color: #64748b; font-weight: 600; margin-top: 2px;">${inv.invoiceNumber}</div>
              <div style="text-align: right;">
                <span class="status status-${inv.status.toLowerCase()}">${inv.status}</span>
              </div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-block">
              <h4>Billed To</h4>
              <p><strong>${inv.customerName}</strong></p>
              ${inv.companyName ? `<p>${inv.companyName}</p>` : ''}
              <p>${inv.customerEmail}</p>
            </div>
            <div class="info-block" style="text-align: right;">
              <h4>Invoice Details</h4>
              <p><strong>Issue Date:</strong> ${new Date(inv.issueDate).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${new Date(inv.dueDate).toLocaleDateString()}</p>
              ${inv.paidAt ? `<p><strong>Paid On:</strong> ${new Date(inv.paidAt).toLocaleDateString()} (${inv.paymentMethod || 'Bank Transfer'})</p>` : ''}
              ${inv.contractNumber ? `<p><strong>Ref Contract:</strong> ${inv.contractNumber}</p>` : ''}
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
                  <strong>${inv.contractTitle || 'Professional Commercial Services'}</strong>
                  <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Standard commercial billing item.</div>
                </td>
                <td style="text-align: right;">$${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          <div class="total-box">
            <div class="total-row"><span>Subtotal:</span> <span>$${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            <div class="total-row"><span>Tax (${inv.taxRate}%):</span> <span>$${inv.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            <div class="total-row total-grand"><span>Total Due:</span> <span>$${inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          </div>

          ${inv.notes ? `
            <div style="margin-top: 30px; background: #f8fafc; padding: 15px; border-radius: 8px;">
              <h4 style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Notes</h4>
              <div style="font-size: 13px; color: #334155;">${inv.notes}</div>
            </div>
          ` : ''}

          <div class="footer">
            <p>Thank you for your business! For billing inquiries, please contact accounting@crmsystem.com</p>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <Layout>
      {/* Header */}
      <div className="dashboard-header animate-fade-in" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="dashboard-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <Receipt style={{ color: 'var(--accent-primary)' }} size={28} /> Financial Invoices &amp; Billing
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Generate customer invoices, record payment collections, and print PDF receipts
          </p>
        </div>
        <Button onClick={handleOpenCreateModal} style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)', fontWeight: 600 }}>
          <Plus size={18} style={{ marginRight: 6 }} /> Create New Invoice
        </Button>
      </div>

      {/* Interactive Billing Workflow Guide Banner */}
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
          💡 Invoicing &amp; Payment Collection Workflow:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--bg-secondary)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ background: '#6366f1', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>1</div>
            <div><strong>Generate Invoice</strong><br /><span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Create manual or 1-click contract invoice</span></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--bg-secondary)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ background: '#6366f1', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>2</div>
            <div><strong>Issue to Client</strong><br /><span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Sent status with due dates</span></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--bg-secondary)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ background: '#10b981', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>3</div>
            <div><strong>Record Payment</strong><br /><span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Mark paid with Bank/Credit card method</span></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--bg-secondary)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ background: '#10b981', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>4</div>
            <div><strong>Export PDF</strong><br /><span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Print receipt or download PDF copy</span></div>
          </div>
        </div>
      </div>

      {/* 4 Financial Metric KPI Cards */}
      <div className="metrics-grid animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <Card className="metric-card glass-panel" style={{ borderLeft: '4px solid #6366f1' }}>
          <Card.Content style={{ padding: '1.25rem' }}>
            <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="metric-title" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Invoiced Portfolio</span>
              <Receipt className="metric-icon" size={20} style={{ color: '#6366f1' }} />
            </div>
            <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>${totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="metric-subtitle" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Across <strong>{invoices.length}</strong> total invoice records
            </div>
          </Card.Content>
        </Card>

        <Card className="metric-card glass-panel" style={{ borderLeft: '4px solid #10b981' }}>
          <Card.Content style={{ padding: '1.25rem' }}>
            <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="metric-title" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Collected Revenue</span>
              <CheckCircle className="metric-icon" size={20} style={{ color: '#10b981' }} />
            </div>
            <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="metric-subtitle" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Collection rate: <strong>{collectionRate.toFixed(1)}%</strong> ({paidCount} paid)
            </div>
          </Card.Content>
        </Card>

        <Card className="metric-card glass-panel" style={{ borderLeft: '4px solid #f59e0b' }}>
          <Card.Content style={{ padding: '1.25rem' }}>
            <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="metric-title" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Outstanding Balance</span>
              <Clock className="metric-icon" size={20} style={{ color: '#f59e0b' }} />
            </div>
            <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="metric-subtitle" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Pending collection: <strong>{pendingCount}</strong> invoices
            </div>
          </Card.Content>
        </Card>

        <Card className="metric-card glass-panel" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <Card.Content style={{ padding: '1.25rem' }}>
            <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="metric-title" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Payment Settlement Rate</span>
              <DollarSign className="metric-icon" size={20} style={{ color: '#8b5cf6' }} />
            </div>
            <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5cf6' }}>{collectionRate.toFixed(0)}% Settled</div>
            <div className="metric-subtitle" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              <strong>{paidCount}</strong> of {invoices.length} invoices settled
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>

        {/* Pill Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.3rem', borderRadius: '10px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('All')}
            style={{
              padding: '0.45rem 1rem', borderRadius: '7px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: statusFilter === 'All' ? 'var(--accent-primary)' : 'transparent',
              color: statusFilter === 'All' ? '#fff' : 'var(--text-muted)'
            }}
          >
            All Invoices ({invoices.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Sent')}
            style={{
              padding: '0.45rem 1rem', borderRadius: '7px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: statusFilter === 'Sent' ? '#3b82f6' : 'transparent',
              color: statusFilter === 'Sent' ? '#fff' : 'var(--text-muted)'
            }}
          >
            📬 Sent / Pending ({invoices.filter(i => i.status === 'Sent').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Paid')}
            style={{
              padding: '0.45rem 1rem', borderRadius: '7px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: statusFilter === 'Paid' ? '#10b981' : 'transparent',
              color: statusFilter === 'Paid' ? '#fff' : 'var(--text-muted)'
            }}
          >
            ✅ Paid &amp; Settled ({paidCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Overdue')}
            style={{
              padding: '0.45rem 1rem', borderRadius: '7px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: statusFilter === 'Overdue' ? '#ef4444' : 'transparent',
              color: statusFilter === 'Overdue' ? '#fff' : 'var(--text-muted)'
            }}
          >
            ⚠️ Overdue ({invoices.filter(i => i.status === 'Overdue').length})
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
            📝 Drafts ({invoices.filter(i => i.status === 'Draft').length})
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

      {/* Invoices Table & Card Container */}
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
              {/* Desktop Table View */}
              <div className="contracts-table-wrap" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Invoice Ref</th>
                      <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Customer &amp; Company</th>
                      <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Ref Contract</th>
                      <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Total Amount</th>
                      <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Status</th>
                      <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Due Date</th>
                      <th style={{ padding: '1rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map(inv => (
                      <tr key={inv.invoiceId} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem', transition: 'background 0.15s' }}>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>
                          {inv.invoiceNumber}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', minWidth: '220px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>👤 {inv.customerName}</div>
                          {inv.companyName && (
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              🏢 {inv.companyName}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                          {inv.contractNumber ? (
                            <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 600, border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                              📄 {inv.contractNumber}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          ${inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>{statusBadge(inv.status)}</td>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <InvoiceActionMenu
                            invoice={inv}
                            onPay={setPayingInvoice}
                            onPrint={printInvoicePDF}
                            onEdit={handleOpenEditModal}
                            onDelete={handleDeleteInvoice}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="contracts-mobile-list">
                {filteredInvoices.map(inv => (
                  <div key={inv.invoiceId} style={{
                    borderBottom: '1px solid var(--border-color)',
                    padding: '1.25rem',
                    display: 'flex', flexDirection: 'column', gap: '0.65rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.85rem' }}>{inv.invoiceNumber}</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem', fontSize: '1rem' }}>👤 {inv.customerName}</div>
                        {inv.companyName && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>🏢 {inv.companyName}</div>}
                      </div>
                      {statusBadge(inv.status)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.65rem 0.85rem', borderRadius: '8px', margin: '0.25rem 0' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.15rem' }}>
                        ${inv.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Due: {new Date(inv.dueDate).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <InvoiceActionMenu
                        invoice={inv}
                        onPay={setPayingInvoice}
                        onPrint={printInvoicePDF}
                        onEdit={handleOpenEditModal}
                        onDelete={handleDeleteInvoice}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem', backdropFilter: 'blur(4px)', overflowY: 'auto' }}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '520px', padding: '1.5rem', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Create New Invoice</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.4rem' }}>×</button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Customer *</label>
                <select
                  className="filter-select"
                  value={newCustomerId}
                  onChange={e => handleCustomerChange(parseInt(e.target.value, 10))}
                  style={{ width: '100%' }}
                  required
                >
                  <option value={0}>— Select Customer —</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {newCustomerId > 0 && (
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Link Signed Contract (optional)
                  </label>
                  <select
                    className="filter-select"
                    value={newContractId ?? 0}
                    onChange={e => handleContractSelect(parseInt(e.target.value, 10))}
                    style={{ width: '100%' }}
                  >
                    <option value={0}>— None (Manual Billing) —</option>
                    {contractsList.map(c => (
                      <option key={c.id} value={c.id}>
                        📜 {c.number} — {c.title} (${c.value.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Subtotal Amount ($) *</label>
                  <Input
                    type="number"
                    value={newAmount}
                    onChange={e => setNewAmount(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Tax Rate (%)</label>
                  <Input
                    type="number"
                    value={newTaxRate}
                    onChange={e => setNewTaxRate(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Issue Date</label>
                  <Input
                    type="date"
                    value={newIssueDate}
                    onChange={e => setNewIssueDate(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Due Date</label>
                  <Input
                    type="date"
                    value={newDueDate}
                    onChange={e => setNewDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Invoice Notes & Particulars</label>
                <textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Enter description of goods or services..."
                  rows={2}
                  style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create & Send Invoice'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {payingInvoice && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '440px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>💳 Record Payment</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600, marginTop: '0.2rem' }}>
                  {payingInvoice.invoiceNumber} — ${payingInvoice.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <button onClick={() => setPayingInvoice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.4rem' }}>×</button>
            </div>

            <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Payment Method</label>
                <select
                  className="filter-select"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="Bank Transfer">Bank Transfer (ACH / Wire)</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Check">Check</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Payment Reference / Notes</label>
                <Input
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Wire confirmation #129381"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button variant="secondary" type="button" onClick={() => setPayingInvoice(null)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={processingPayment}>
                  {processingPayment ? 'Processing...' : 'Confirm Paid'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {editingInvoice && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem', backdropFilter: 'blur(4px)', overflowY: 'auto' }}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '520px', padding: '1.5rem', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>✏️ Edit Invoice</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600, marginTop: '0.2rem' }}>
                  {editingInvoice.invoiceNumber} — {editingInvoice.customerName}
                </div>
              </div>
              <button onClick={() => setEditingInvoice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.4rem' }}>×</button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Base Amount ($) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editAmount}
                    onChange={e => setEditAmount(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Tax Rate (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editTaxRate}
                    onChange={e => setEditTaxRate(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Invoice Status</label>
                <select
                  className="filter-select"
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Issue Date</label>
                  <Input
                    type="date"
                    value={editIssueDate}
                    onChange={e => setEditIssueDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Due Date</label>
                  <Input
                    type="date"
                    value={editDueDate}
                    onChange={e => setEditDueDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Notes / Memo</label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>Payment Terms</label>
                <textarea
                  value={editTerms}
                  onChange={e => setEditTerms(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '0.6rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button variant="secondary" type="button" onClick={() => setEditingInvoice(null)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </Layout>
  );
};
