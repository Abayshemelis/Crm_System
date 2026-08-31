import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';
import { confirmAction } from '../lib/confirm';
import { useAuth } from '../context/AuthContext';
import { useFormatCurrency, useSystemProfile } from '../context/SystemProfileContext';
import {
  CreditCard, Search, DollarSign, CheckCircle2, Clock, 
  AlertCircle, RefreshCw, Plus, Landmark, Receipt, ExternalLink, 
  Eye, Check, X, ShieldCheck, Filter, ArrowUpRight, RotateCcw,
  Building2, UserCheck, ArrowDownLeft, Printer, Trash2
} from 'lucide-react';
import { formatDisplayDate, getLocalDateString } from '../lib/dateUtils';
import { validatePositiveNumber, validateRequiredSelect, validateMaxLength } from '../lib/validators';
import './screens.css';

interface PaymentItem {
  paymentId: number;
  paymentNumber: string;
  invoiceId: number;
  invoiceNumber: string;
  customerId: number;
  payerName: string;
  payerEmail: string;
  payerCompanyName?: string;
  receiverName?: string;
  contractId?: number;
  contractNumber?: string;
  opportunityId?: number;
  opportunityTitle?: string;
  amount: number;
  currency: string;
  invoiceTotalAmount: number;
  invoiceAmountPaid: number;
  invoiceBalanceDue: number;
  paymentMethod: string;
  provider?: string;
  status: string;
  transactionReference?: string;
  receiptUrl?: string;
  notes?: string;
  paymentDate: string;
  verifiedById?: number;
  verifiedByName?: string;
  verifiedAt?: string;
  createdAt: string;
}

interface PaymentMetrics {
  totalCollected: number;
  totalPending: number;
  totalRefunded: number;
  totalReceivable: number;
  completedCount: number;
  pendingCount: number;
  partiallyPaidInvoices?: number;
  totalTransactions: number;
}

export const PaymentsScreen: React.FC = () => {
  const { isManagerOrAboveSelected } = useAuth();
  const { profile } = useSystemProfile();
  const { formatCurrency, currency } = useFormatCurrency();

  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [metrics, setMetrics] = useState<PaymentMetrics>({
    totalCollected: 0,
    totalPending: 0,
    totalRefunded: 0,
    totalReceivable: 0,
    completedCount: 0,
    pendingCount: 0,
    partiallyPaidInvoices: 0,
    totalTransactions: 0
  });

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataScope, setDataScope] = useState<'personal' | 'team'>(isManagerOrAboveSelected ? 'team' : 'personal');

  // Manual Payment Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [invoicesList, setInvoicesList] = useState<{ id: number; number: string; customerName: string; amount: number; balanceDue: number; status: string }[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState<boolean>(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number>(0);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [manualAmount, setManualAmount] = useState<number>(0);
  const [manualPaymentDate, setManualPaymentDate] = useState<string>(() => getLocalDateString(new Date()));
  const [manualMethod, setManualMethod] = useState<string>('Bank Transfer');
  const [manualBankName, setManualBankName] = useState<string>('Commercial Bank of Ethiopia (Nigd Bank)');
  const [manualTxnRef, setManualTxnRef] = useState<string>('');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [submittingManual, setSubmittingManual] = useState<boolean>(false);

  // Wire Verification Modal State
  const [verifyingPayment, setVerifyingPayment] = useState<PaymentItem | null>(null);
  const [processingVerify, setProcessingVerify] = useState<boolean>(false);

  // Internal Payment Inspection Modal State
  const [inspectingPayment, setInspectingPayment] = useState<PaymentItem | null>(null);

  const printPaymentReceipt = (p: PaymentItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Popup blocker prevented opening print window. Please allow popups.', 'error');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt #${p.paymentNumber}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; margin: 0; padding: 40px; }
          .receipt-box { max-width: 700px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 24px; }
          .logo-text { font-size: 24px; font-weight: 800; color: #10b981; }
          .doc-title { font-size: 14px; font-weight: 700; color: #64748b; text-transform: uppercase; text-align: right; }
          .doc-number { font-size: 20px; font-weight: 800; color: #0f172a; text-align: right; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
          .info-block h4 { margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .info-block p { margin: 2px 0; font-size: 14px; }
          .amount-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
          .amount-title { font-size: 15px; font-weight: 700; color: #166534; }
          .amount-val { font-size: 24px; font-weight: 800; color: #15803d; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #f8fafc; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
          td { padding: 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
          .footer { text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <div class="header">
            <div>
              ${profile?.logoUrl ? `<img src="${profile.logoUrl}" style="max-height: 48px; max-width: 180px; object-fit: contain; margin-bottom: 6px;" alt="Logo" />` : `<div class="logo-text">⚡ ${profile?.companyName || profile?.systemName || 'Enterprise CRM Solutions'}</div>`}
              <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Official Payment Ledger Receipt</div>
            </div>
            <div>
              <div class="doc-title">PAYMENT RECEIPT</div>
              <div class="doc-number">#${p.paymentNumber}</div>
              <div style="font-size: 13px; color: #64748b; text-align: right; margin-top: 4px;">Date: ${formatDisplayDate(p.paymentDate)}</div>
            </div>
          </div>

          <div class="grid">
            <div class="info-block">
              <h4>Received By (Beneficiary / Company):</h4>
              <p><strong>${profile?.companyName || profile?.systemName || 'Enterprise CRM Solutions Inc.'}</strong></p>
              ${profile?.address ? `<p>${profile.address}</p>` : ''}
              ${profile?.country ? `<p>${profile.country}</p>` : ''}
              ${profile?.email ? `<p>✉️ ${profile.email}</p>` : ''}
              ${profile?.phone ? `<p>📞 ${profile.phone}</p>` : ''}
            </div>
            <div class="info-block" style="text-align: right;">
              <h4>Received From (Payer / Customer):</h4>
              <p><strong>${p.payerName}</strong></p>
              ${p.payerCompanyName ? `<p>🏢 ${p.payerCompanyName}</p>` : ''}
              <p>✉️ ${p.payerEmail || 'N/A'}</p>
            </div>
          </div>

          <div class="amount-box">
            <div>
              <div class="amount-title">Total Verified Amount Received:</div>
              <div style="font-size: 12px; color: #166534; margin-top: 2px;">Method: ${p.paymentMethod}</div>
            </div>
            <div class="amount-val">${formatCurrency(Number(p.amount), profile?.currency || currency, 2)}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Invoice Reference</strong></td>
                <td>#${p.invoiceNumber}</td>
              </tr>
              <tr>
                <td><strong>Transaction / Check Reference</strong></td>
                <td><span style="font-family: monospace; font-weight: 700;">${p.transactionReference || 'N/A'}</span></td>
              </tr>
              <tr>
                <td><strong>Accounting Remarks</strong></td>
                <td>${p.notes || 'Payment recorded and verified in company accounts ledger.'}</td>
              </tr>
              <tr>
                <td><strong>Status</strong></td>
                <td><strong style="color: #10b981;">VERIFIED &amp; COMPLETED</strong></td>
              </tr>
              ${p.verifiedByName ? `
              <tr>
                <td><strong>Verified By</strong></td>
                <td>${p.verifiedByName} on ${formatDisplayDate(p.verifiedAt)}</td>
              </tr>
              ` : ''}
            </tbody>
          </table>

          ${p.notes ? `<div style="font-size: 13px; color: #64748b; background: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 20px;"><strong>Notes:</strong> ${p.notes}</div>` : ''}

          <div class="footer">
            <p>This is an official transaction receipt generated from the Enterprise CRM Financial Ledger.</p>
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

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsData, metricsData] = await Promise.all([
        api.get<PaymentItem[]>('/api/payments'),
        api.get<PaymentMetrics>('/api/payments/metrics')
      ]);
      setPayments(paymentsData || []);
      setMetrics(metricsData || {
        totalCollected: 0,
        totalPending: 0,
        totalRefunded: 0,
        totalReceivable: 0,
        completedCount: 0,
        pendingCount: 0,
        partiallyPaidInvoices: 0,
        totalTransactions: 0
      });
    } catch (err: any) {
      showToast(err?.message || 'Failed to load payments history', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();

    const handleRefresh = () => {
      fetchPayments();
    };

    window.addEventListener('focus', handleRefresh);
    window.addEventListener('app:role-switched', handleRefresh);
    window.addEventListener('app:payment-updated', handleRefresh);
    window.addEventListener('app:invoice-updated', handleRefresh);

    const interval = setInterval(handleRefresh, 15000);

    return () => {
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('app:role-switched', handleRefresh);
      window.removeEventListener('app:payment-updated', handleRefresh);
      window.removeEventListener('app:invoice-updated', handleRefresh);
      clearInterval(interval);
    };
  }, [fetchPayments]);

  const openManualModal = async () => {
    try {
      const rawInvoices = await api.get<any[]>('/api/invoices?scope=company');
      const formatted = (Array.isArray(rawInvoices) ? rawInvoices : [])
        .filter((inv: any) => inv.status !== 'Paid' && inv.status !== 'Cancelled')
        .map((inv: any) => ({
          id: inv.invoiceId,
          number: inv.invoiceNumber,
          customerName: inv.customerName || 'Customer',
          amount: inv.totalAmount || inv.amount,
          balanceDue: inv.balanceDue ?? (inv.totalAmount || inv.amount),
          status: inv.status
        }));
      setInvoicesList(formatted);
      if (formatted.length > 0) {
        setSelectedInvoiceId(formatted[0].id);
        setManualAmount(formatted[0].balanceDue);
      }
      setManualPaymentDate(getLocalDateString(new Date()));
      setManualMethod('Bank Transfer');
      setManualBankName('Commercial Bank of Ethiopia (Nigd Bank)');
      setManualTxnRef('');
      setManualNotes('');
      setShowManualModal(true);
    } catch {
      showToast('Failed to load pending invoices list', 'error');
    }
  };

  const handleInvoiceSelectChange = (invId: number) => {
    setSelectedInvoiceId(invId);
    const target = invoicesList.find(i => i.id === invId);
    if (target) {
      setManualAmount(target.balanceDue);
    }
  };

  const handleRecordManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const invErr = validateRequiredSelect(selectedInvoiceId, 'Unpaid invoice');
    if (invErr) {
      showToast(invErr, 'error');
      return;
    }
    const amtErr = validatePositiveNumber(manualAmount, 'Payment amount');
    if (amtErr) {
      showToast(amtErr, 'error');
      return;
    }
    const notesErr = validateMaxLength(manualNotes, 1000, 'Accounting remarks');
    if (notesErr) {
      showToast(notesErr, 'error');
      return;
    }

    setSubmittingManual(true);
    try {
      const showBank = manualMethod === 'Bank Transfer' || manualMethod === 'Check' || manualMethod === 'SWIFT Wire Transfer';
      await api.post('/api/payments/manual', {
        invoiceId: selectedInvoiceId,
        amount: manualAmount,
        paymentMethod: manualMethod,
        bankName: showBank ? manualBankName : undefined,
        transactionReference: manualTxnRef.trim() || undefined,
        notes: manualNotes.trim() || undefined,
        paymentDate: manualPaymentDate || undefined
      });

      showToast('Payment recorded & verified into Company account!', 'success');
      setShowManualModal(false);
      setManualTxnRef('');
      setManualNotes('');
      fetchPayments();
      window.dispatchEvent(new CustomEvent('app:payment-updated'));
      window.dispatchEvent(new CustomEvent('app:invoice-updated'));
    } catch (err: any) {
      showToast(err?.message || 'Failed to record payment', 'error');
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleVerifyWire = async (p: PaymentItem) => {
    setProcessingVerify(true);
    try {
      await api.post(`/api/payments/${p.paymentId}/verify-wire`, {});
      showToast(`Bank wire transfer #${p.paymentNumber} verified and settled!`, 'success');
      setVerifyingPayment(null);
      fetchPayments();
      window.dispatchEvent(new CustomEvent('app:payment-updated'));
      window.dispatchEvent(new CustomEvent('app:invoice-updated'));
    } catch (err: any) {
      showToast(err?.message || 'Failed to verify bank wire transfer', 'error');
    } finally {
      setProcessingVerify(false);
    }
  };

  const handleRefund = async (p: PaymentItem) => {
    const ok = await confirmAction(
      `Are you sure you want to refund payment #${p.paymentNumber} ($${p.amount.toLocaleString()}) for ${p.payerName}? This will reopen Invoice #${p.invoiceNumber}.`
    );
    if (!ok) return;

    try {
      await api.post(`/api/payments/${p.paymentId}/refund`, {
        body: JSON.stringify("Customer requested refund")
      });
      showToast(`Payment #${p.paymentNumber} has been refunded.`, 'success');
      fetchPayments();
      window.dispatchEvent(new CustomEvent('app:payment-updated'));
      window.dispatchEvent(new CustomEvent('app:invoice-updated'));
    } catch (err: any) {
      showToast(err?.message || 'Failed to refund payment', 'error');
    }
  };

  const handleDeletePayment = async (p: PaymentItem) => {
    const ok = await confirmAction(
      `Are you sure you want to delete payment #${p.paymentNumber} ($${p.amount.toLocaleString()}) for invoice #${p.invoiceNumber}? This will permanently remove it from active revenue and adjust the invoice balance.`
    );
    if (!ok) return;

    try {
      await api.delete(`/api/payments/${p.paymentId}`);
      showToast(`Payment #${p.paymentNumber} deleted successfully.`, 'success');
      fetchPayments();
      window.dispatchEvent(new CustomEvent('app:payment-updated'));
      window.dispatchEvent(new CustomEvent('app:invoice-updated'));
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete payment record', 'error');
    }
  };

  const fmtMoney = (v: number) => formatCurrency(v, profile?.currency || currency, 2);

  const filteredPayments = payments.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      p.paymentNumber.toLowerCase().includes(term) ||
      p.invoiceNumber.toLowerCase().includes(term) ||
      (p.payerName && p.payerName.toLowerCase().includes(term)) ||
      (p.payerCompanyName && p.payerCompanyName.toLowerCase().includes(term)) ||
      (p.transactionReference && p.transactionReference.toLowerCase().includes(term)) ||
      (p.contractNumber && p.contractNumber.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (statusFilter === 'Completed') return (p.status || '').toLowerCase() === 'completed';
    if (statusFilter === 'Pending') return (p.status || '').toLowerCase().includes('pending');
    if (statusFilter === 'Refunded') return (p.status || '').toLowerCase() === 'refunded';

    return true;
  });

  const getMethodBadge = (method: string) => {
    const m = (method || '').toLowerCase();
    if (m.includes('stripe') || m.includes('card')) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
          <CreditCard size={12} /> Card / Stripe
        </span>
      );
    }
    if (m.includes('wire') || m.includes('ach') || m.includes('bank')) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
          <Landmark size={12} /> Bank Wire
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(148, 163, 184, 0.12)', color: 'var(--text-secondary)', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
        <DollarSign size={12} /> {method || 'Manual'}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
          <CheckCircle2 size={12} /> Completed
        </span>
      );
    }
    if (s.includes('pending')) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid rgba(245, 158, 11, 0.25)' }}>
          <Clock size={12} /> Pending Verification
        </span>
      );
    }
    if (s === 'refunded') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid rgba(168, 85, 247, 0.25)' }}>
          <RotateCcw size={12} /> Refunded
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.25)' }}>
        <AlertCircle size={12} /> {status}
      </span>
    );
  };

  return (
    <Layout>
      {/* Header */}
      <div className="dashboard-header animate-fade-in" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="dashboard-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <CreditCard style={{ color: 'var(--accent-primary)' }} size={28} /> Payment Transactions &amp; Receipts Ledger
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Real-time ledger of received customer payments, online Stripe checkouts, bank wires, and milestone settlements
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button onClick={fetchPayments} variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={15} /> Refresh
          </Button>
          <Button onClick={openManualModal} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)', fontWeight: 600 }}>
            <Plus size={18} style={{ marginRight: 6 }} /> Record Offline Payment
          </Button>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="crm-metrics-responsive-grid animate-fade-in">
        <Card className="metric-card glass-panel" style={{ borderLeft: '4px solid #10b981' }}>
          <Card.Content style={{ padding: '1.25rem' }}>
            <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="metric-title" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Revenue Collected</span>
              <DollarSign className="metric-icon" size={20} style={{ color: '#10b981' }} />
            </div>
            <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{fmtMoney(metrics.totalCollected)}</div>
            <div className="metric-subtitle" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {metrics.completedCount} verified transactions
            </div>
          </Card.Content>
        </Card>

        <Card className="metric-card glass-panel" style={{ borderLeft: '4px solid #6366f1' }}>
          <Card.Content style={{ padding: '1.25rem' }}>
            <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="metric-title" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Accounts Receivable</span>
              <Building2 className="metric-icon" size={20} style={{ color: '#6366f1' }} />
            </div>
            <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#6366f1' }}>{fmtMoney(metrics.totalReceivable)}</div>
            <div className="metric-subtitle" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Unpaid balances across open invoices
            </div>
          </Card.Content>
        </Card>

        <Card className="metric-card glass-panel" style={{ borderLeft: '4px solid #f59e0b' }}>
          <Card.Content style={{ padding: '1.25rem' }}>
            <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="metric-title" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Pending Wire Approval</span>
              <Clock className="metric-icon" size={20} style={{ color: '#f59e0b' }} />
            </div>
            <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>{fmtMoney(metrics.totalPending)}</div>
            <div className="metric-subtitle" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {metrics.pendingCount} wires awaiting verification
            </div>
          </Card.Content>
        </Card>

        <Card className="metric-card glass-panel" style={{ borderLeft: '4px solid #c084fc' }}>
          <Card.Content style={{ padding: '1.25rem' }}>
            <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="metric-title" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Transactions</span>
              <Receipt className="metric-icon" size={20} style={{ color: '#c084fc' }} />
            </div>
            <div className="metric-value" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{metrics.totalTransactions}</div>
            <div className="metric-subtitle" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              All payment entries across channels
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="crm-filter-toolbar-wrap animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Filter Tabs */}
        <div className="crm-filter-tabs-bar">
          <button
            type="button"
            onClick={() => setStatusFilter('All')}
            className={`crm-filter-tab-btn ${statusFilter === 'All' ? 'active-all' : ''}`}
          >
            All Payments ({payments.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Completed')}
            className={`crm-filter-tab-btn ${statusFilter === 'Completed' ? 'active-paid' : ''}`}
          >
            ✅ Completed ({metrics.completedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Pending')}
            className={`crm-filter-tab-btn ${statusFilter === 'Pending' ? 'active-draft' : ''}`}
          >
            ⏳ Pending Verification ({metrics.pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Refunded')}
            className={`crm-filter-tab-btn ${statusFilter === 'Refunded' ? 'active-all' : ''}`}
          >
            🔄 Refunded
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="filter-input"
            placeholder="Search payment #, invoice, customer, txn ref..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem', width: '100%', borderRadius: '8px', background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
          />
        </div>
      </div>

      {/* Payments Ledger Table */}
      <Card className="glass-panel animate-fade-in" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <Card.Content style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} variant="rect" height={52} style={{ borderRadius: '8px', animationDelay: `${i * 0.07}s` }} />
              ))}
            </div>
          ) : filteredPayments.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={searchTerm || statusFilter !== 'All' ? 'No payment records match your filters' : 'No payments recorded yet'}
              description={searchTerm || statusFilter !== 'All' ? 'Try adjusting your search keywords or status filter.' : 'When customers pay invoices online via Stripe, Card, or Bank Wire, their transaction ledger will appear here.'}
              actionText={!searchTerm && statusFilter === 'All' ? 'Record First Payment' : undefined}
              onActionClick={!searchTerm && statusFilter === 'All' ? openManualModal : undefined}
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '1050px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Payment Ref</th>
                    <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Payer (Customer)</th>
                    <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Receiver (Company)</th>
                    <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Amount</th>
                    <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Linked Invoice</th>
                    <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Method</th>
                    <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Date</th>
                    <th style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>Status</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map(p => (
                    <tr key={p.paymentId} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem', transition: 'background 0.15s' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>
                        <div>{p.paymentNumber}</div>
                        {p.transactionReference && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.15rem' }}>
                            Txn: {p.transactionReference}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', minWidth: '180px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.payerName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {p.payerCompanyName ? `🏢 ${p.payerCompanyName} · ` : ''}{p.payerEmail}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', minWidth: '160px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.receiverName || 'Enterprise CRM Solutions Inc.'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Seller Account</div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 800, fontSize: '1rem', color: '#10b981', whiteSpace: 'nowrap' }}>
                        {fmtMoney(p.amount)}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>#{p.invoiceNumber}</div>
                        {p.invoiceTotalAmount > 0 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Inv Total: {fmtMoney(p.invoiceTotalAmount)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        {getMethodBadge(p.paymentMethod)}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        <div>{new Date(p.paymentDate).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(p.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                        {getStatusBadge(p.status)}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                          {p.status?.toLowerCase().includes('pending') && (
                            <Button
                              size="sm"
                              onClick={() => setVerifyingPayment(p)}
                              style={{ background: '#10b981', color: '#fff', fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                            >
                              <Check size={13} style={{ marginRight: 3 }} /> Verify Wire
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setInspectingPayment(p)}
                            style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                          >
                            <Receipt size={13} style={{ marginRight: 4 }} /> View Details
                          </Button>
                          {p.status?.toLowerCase() === 'completed' && isManagerOrAboveSelected && (
                            <button
                              type="button"
                              onClick={() => handleRefund(p)}
                              title="Refund Payment"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#c084fc',
                                cursor: 'pointer',
                                padding: '0.3rem',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                          {isManagerOrAboveSelected && (
                            <button
                              type="button"
                              onClick={() => handleDeletePayment(p)}
                              title="Delete Payment Record"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '0.3rem',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* RECORD / VERIFY OFFLINE PAYMENT MODAL */}
      {showManualModal && (() => {
        const selectedInv = invoicesList.find(i => i.id === selectedInvoiceId);
        const maxDue = selectedInv?.balanceDue || 0;
        const isBankMethod = manualMethod === 'Bank Transfer' || manualMethod === 'Check' || manualMethod === 'SWIFT Wire Transfer' || manualMethod === 'Telebirr / CBE Birr';

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
            onClick={() => setShowManualModal(false)}
          >
            <style>{`
              .rpm-modal input:focus, .rpm-modal select:focus {
                border-color: #10b981 !important;
                box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12) !important;
                outline: none !important;
              }
            `}</style>
            <div
              className="rpm-modal"
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
                      Verify cash, bank wire, check, or mobile settlement into company ledger
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
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
              <form onSubmit={handleRecordManualPayment} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
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
                      <strong style={{ color: '#14532d' }}>Direct Ledger Credit:</strong> Submitting will record this payment as{' '}
                      <span style={{ color: '#16a34a', fontWeight: 700 }}>Completed</span>, credit the customer invoice, and adjust accounts receivable.
                    </div>
                  </div>

                  {/* Select Invoice Card */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.45rem' }}>
                      Select Unpaid / Open Invoice *
                    </label>
                    {invoicesList.length === 0 ? (
                      <div style={{ padding: '0.75rem', background: '#fff7ed', borderRadius: '10px', border: '1px dashed #fed7aa', color: '#c2410c', fontSize: '0.85rem' }}>
                        ⚠️ No open unpaid invoices found. Create or send an invoice first.
                      </div>
                    ) : (
                      <select
                        value={selectedInvoiceId}
                        onChange={e => handleInvoiceSelectChange(Number(e.target.value))}
                        required
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '10px',
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          color: '#1e293b',
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      >
                        {invoicesList.map(inv => (
                          <option key={inv.id} value={inv.id}>
                            Invoice #{inv.number} — {inv.customerName} (Bal: {fmtMoney(inv.balanceDue)})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Payer vs Receiver Block */}
                  {selectedInv && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                      <div style={{ background: '#ffffff', padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>
                          👤 Payer (Customer)
                        </div>
                        <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '0.25rem', fontSize: '0.94rem' }}>{selectedInv.customerName}</div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Invoice #{selectedInv.number}</div>
                      </div>
                      <div style={{ background: '#ffffff', padding: '0.9rem 1.1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>
                          🏢 Receiver (Our Company)
                        </div>
                        <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '0.25rem', fontSize: '0.94rem' }}>Enterprise CRM Solutions</div>
                        <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700, marginTop: '2px' }}>Balance Due: {fmtMoney(selectedInv.balanceDue)}</div>
                      </div>
                    </div>
                  )}

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
                          onClick={() => setManualMethod(m.id)}
                          style={{
                            padding: '0.5rem 0.6rem',
                            borderRadius: '10px',
                            border: manualMethod === m.id ? '1.5px solid #10b981' : '1.5px solid #e2e8f0',
                            background: manualMethod === m.id ? '#f0fdf4' : '#ffffff',
                            color: manualMethod === m.id ? '#16a34a' : '#475569',
                            fontSize: '0.8rem',
                            fontWeight: manualMethod === m.id ? 700 : 500,
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s ease',
                            boxShadow: manualMethod === m.id ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none',
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
                      {maxDue > 0 && (
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => setManualAmount(maxDue)}
                            style={{
                              background: manualAmount === maxDue ? '#dcfce7' : '#f0fdf4',
                              border: manualAmount === maxDue ? '1.5px solid #16a34a' : '1px solid #bbf7d0',
                              color: '#16a34a',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            Full ({fmtMoney(maxDue)})
                          </button>
                          <button
                            type="button"
                            onClick={() => setManualAmount(Math.round((maxDue / 2) * 100) / 100)}
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
                            50% ({fmtMoney(maxDue / 2)})
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
                          max={maxDue > 0 ? maxDue : undefined}
                          value={manualAmount}
                          onChange={e => setManualAmount(Number(e.target.value))}
                          required
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Input
                          type="date"
                          value={manualPaymentDate}
                          onChange={e => setManualPaymentDate(e.target.value)}
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
                        value={manualBankName}
                        onChange={val => setManualBankName(String(val))}
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
                      Transaction / Slip / Check Reference
                    </label>
                    <Input
                      value={manualTxnRef}
                      onChange={e => setManualTxnRef(e.target.value)}
                      placeholder="e.g. Bank Deposit Slip #TXN-928374, Check #4092, or Telebirr ID"
                    />
                  </div>

                  {/* Remarks */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
                        Accounting Remarks / Notes
                      </label>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        {['Direct Bank Deposit', 'Cash in Office', 'Verified on Statement'].map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setManualNotes(tag)}
                            style={{
                              background: manualNotes === tag ? '#ede9fe' : '#f8fafc',
                              border: manualNotes === tag ? '1px solid #6366f1' : '1px solid #e2e8f0',
                              color: manualNotes === tag ? '#4f46e5' : '#64748b',
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
                      value={manualNotes}
                      onChange={e => setManualNotes(e.target.value)}
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
                    onClick={() => setShowManualModal(false)}
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
                    disabled={submittingManual || invoicesList.length === 0}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      fontWeight: 700,
                      padding: '0.6rem 1.35rem',
                      fontSize: '0.9rem',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: submittingManual || invoicesList.length === 0 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                      opacity: submittingManual ? 0.7 : 1,
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{submittingManual ? 'Recording…' : 'Confirm & Verify Payment'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* VERIFY WIRE TRANSFER MODAL */}
      {verifyingPayment && ReactDOM.createPortal(
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
          onClick={() => setVerifyingPayment(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              maxHeight: '92vh',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.35rem 1.75rem', background: '#ffffff', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
                }}>
                  <Landmark size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    Verify Bank Wire Transfer
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                    Payment #{verifyingPayment.paymentNumber}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVerifyingPayment(null)}
                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '7px', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc' }}>
              <div style={{ background: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Invoice Reference:</span><span style={{ fontWeight: 700, color: '#0f172a' }}>#{verifyingPayment.invoiceNumber}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Payer (Customer):</span><span style={{ fontWeight: 700, color: '#0f172a' }}>{verifyingPayment.payerName}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Amount Transferred:</span><span style={{ color: '#16a34a', fontWeight: 800, fontSize: '1.1rem' }}>{fmtMoney(verifyingPayment.amount)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Submitted Wire Ref:</span><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366f1' }}>{verifyingPayment.transactionReference || 'N/A'}</span></div>
                {verifyingPayment.notes && <div><span style={{ color: '#64748b' }}>Customer Notes:</span> {verifyingPayment.notes}</div>}
              </div>

              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Clicking <strong>"Confirm &amp; Credit Payment"</strong> verifies that the funds have arrived in the company bank account, marks this payment as <strong>Completed</strong>, and credits Invoice <strong>#{verifyingPayment.invoiceNumber}</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.75rem', background: '#ffffff', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setVerifyingPayment(null)}
                style={{ background: 'transparent', border: '1.5px solid #e2e8f0', borderRadius: '10px', color: '#64748b', fontWeight: 600, padding: '0.6rem 1.1rem', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                onClick={() => handleVerifyWire(verifyingPayment)}
                disabled={processingVerify}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  padding: '0.6rem 1.35rem',
                  fontSize: '0.9rem',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: processingVerify ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                }}
              >
                <ShieldCheck size={16} />
                <span>{processingVerify ? 'Verifying…' : 'Confirm & Credit Payment'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* INTERNAL PAYMENT INSPECTION MODAL */}
      {inspectingPayment && ReactDOM.createPortal(
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
          onClick={() => setInspectingPayment(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '580px',
              maxHeight: '92vh',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.35rem 1.75rem', background: '#ffffff', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                }}>
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    Payment Ledger Details
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                    Reference #{inspectingPayment.paymentNumber}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingPayment(null)}
                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '7px', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc' }}>
              <div style={{ background: '#ffffff', padding: '1.1rem 1.25rem', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Payment Reference:</span>
                  <span style={{ fontWeight: 800, color: '#6366f1' }}>#{inspectingPayment.paymentNumber}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Invoice Reference:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>#{inspectingPayment.invoiceNumber}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Payer (Customer):</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{inspectingPayment.payerName} {inspectingPayment.payerCompanyName ? `(${inspectingPayment.payerCompanyName})` : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Beneficiary (Receiver):</span>
                  <span style={{ fontWeight: 700, color: '#16a34a' }}>Enterprise CRM Solutions Inc.</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Amount Credited:</span>
                  <span style={{ fontWeight: 800, color: '#16a34a', fontSize: '1.1rem' }}>{fmtMoney(inspectingPayment.amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Payment Method:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{inspectingPayment.paymentMethod}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Transaction / Check Ref:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{inspectingPayment.transactionReference || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Payment Date:</span>
                  <span style={{ color: '#0f172a' }}>{formatDisplayDate(inspectingPayment.paymentDate)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Verification Status:</span>
                  <span>{getStatusBadge(inspectingPayment.status)}</span>
                </div>
                {inspectingPayment.verifiedByName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                    <span style={{ color: '#64748b' }}>Verified By:</span>
                    <span style={{ color: '#0f172a' }}>{inspectingPayment.verifiedByName} on {formatDisplayDate(inspectingPayment.verifiedAt)}</span>
                  </div>
                )}
              </div>

              {inspectingPayment.notes && (
                <div style={{ background: '#ffffff', padding: '0.85rem 1.1rem', borderRadius: '12px', fontSize: '0.82rem', color: '#475569', border: '1px solid #e2e8f0' }}>
                  <strong style={{ color: '#0f172a' }}>Accounting Remarks:</strong> {inspectingPayment.notes}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.75rem', background: '#ffffff', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => printPaymentReceipt(inspectingPayment)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '10px',
                  color: '#475569',
                  fontWeight: 600,
                  padding: '0.6rem 1.1rem',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
              >
                <Printer size={15} /> Print Receipt (PDF)
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {inspectingPayment.status?.toLowerCase().includes('pending') && (
                  <button
                    onClick={() => {
                      const target = inspectingPayment;
                      setInspectingPayment(null);
                      setVerifyingPayment(target);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      fontWeight: 700,
                      padding: '0.6rem 1.25rem',
                      fontSize: '0.88rem',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    <ShieldCheck size={15} /> Verify Wire
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setInspectingPayment(null)}
                  style={{
                    background: 'transparent',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '10px',
                    color: '#64748b',
                    fontWeight: 600,
                    padding: '0.6rem 1.1rem',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </Layout>
  );
};
