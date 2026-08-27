import React, { useEffect, useState, useCallback } from 'react';
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

  // Manual Payment Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [invoicesList, setInvoicesList] = useState<{ id: number; number: string; customerName: string; amount: number; balanceDue: number; status: string }[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number>(0);
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
              <div class="logo-text">Enterprise CRM Solutions</div>
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
              <p><strong>Enterprise CRM Solutions Inc.</strong></p>
              <p>100 Enterprise Way, Suite 400</p>
              <p>San Francisco, CA 94105, USA</p>
              <p>Tax ID: US-94829471</p>
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
            <div class="amount-val">$${Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
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

  const fmtMoney = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);

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

      {/* RECORD / VERIFY PAYMENT MODAL */}
      {showManualModal && (() => {
        const selectedInv = invoicesList.find(i => i.id === selectedInvoiceId);
        const isBankMethod = manualMethod === 'Bank Transfer' || manualMethod === 'Check' || manualMethod === 'SWIFT Wire Transfer';

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <Card className="glass-panel" style={{ width: '100%', maxWidth: 540, borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              <Card.Content style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <ShieldCheck size={22} style={{ color: '#10b981' }} />
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Record &amp; Verify Payment</h3>
                  </div>
                  <button type="button" onClick={() => setShowManualModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>

                {/* Clarification Notice */}
                <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🛡️</span>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Internal Company Verification:</strong> You are recording that the <strong>Customer (Payer)</strong> has made a verified payment to <strong>Our Company (Receiver)</strong>.
                  </div>
                </div>

                <form onSubmit={handleRecordManualPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Select Unpaid / Open Invoice *</label>
                    <select
                      value={selectedInvoiceId}
                      onChange={e => handleInvoiceSelectChange(Number(e.target.value))}
                      required
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                    >
                      {invoicesList.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          Invoice #{inv.number} — {inv.customerName} (Bal: {fmtMoney(inv.balanceDue)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Explicit Payer vs Receiver Block */}
                  {selectedInv && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>👤 Payer (Customer)</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem', fontSize: '0.88rem' }}>{selectedInv.customerName}</div>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>🏢 Receiver (Our Company)</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem', fontSize: '0.88rem' }}>Enterprise CRM Solutions</div>
                        <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Bal: {fmtMoney(selectedInv.balanceDue)}</div>
                      </div>
                    </div>
                  )}

                  <div className="crm-form-2col">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Payment Amount ($) *</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={selectedInv?.balanceDue}
                        value={manualAmount}
                        onChange={e => setManualAmount(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Payment Date *</label>
                      <Input
                        type="date"
                        value={manualPaymentDate}
                        onChange={e => setManualPaymentDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      Payment Method (How Customer Paid) *
                    </label>
                    <SearchableSelect
                      value={manualMethod}
                      onChange={val => setManualMethod(String(val))}
                      options={[
                        { value: 'Bank Transfer', label: '🏦 Bank Transfer' },
                        { value: 'Stripe', label: '💳 Stripe (Credit / Debit Card)' },
                        { value: 'Cash', label: '💵 Cash Settlement' },
                        { value: 'Check', label: '📑 Business Check / Cheque' },
                        { value: 'Telebirr / CBE Birr', label: '📱 Telebirr / CBE Birr' },
                        { value: 'SWIFT Wire Transfer', label: '🌐 SWIFT International Wire' },
                        { value: 'Other', label: '⚡ Other Supported Method' }
                      ]}
                    />
                  </div>

                  {isBankMethod && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        Bank Name (Customer's / Receiving Bank)
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
                          { value: 'Other Supported Bank', label: 'Other Supported Bank' }
                        ]}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Transaction / Check Reference (Optional)</label>
                    <Input
                      value={manualTxnRef}
                      onChange={e => setManualTxnRef(e.target.value)}
                      placeholder="e.g. Bank Ref #TXN-928374, Stripe ID, or Check #4092"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Accounting Remarks (Optional)</label>
                    <Input
                      value={manualNotes}
                      onChange={e => setManualNotes(e.target.value)}
                      placeholder="e.g. Deposit payment / Verified against bank statement"
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <Button type="button" variant="secondary" onClick={() => setShowManualModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submittingManual} style={{ background: '#10b981', color: '#fff', fontWeight: 700 }}>
                      <CheckCircle2 size={16} style={{ marginRight: 6 }} /> {submittingManual ? 'Recording…' : 'Confirm & Verify Payment'}
                    </Button>
                  </div>
                </form>
              </Card.Content>
            </Card>
          </div>
        );
      })()}

      {/* VERIFY WIRE TRANSFER MODAL */}
      {verifyingPayment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <Card className="glass-panel" style={{ width: '100%', maxWidth: 500, borderRadius: '16px', border: '1px solid #10b981' }}>
            <Card.Content style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Landmark size={22} style={{ color: '#38bdf8' }} />
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Verify Bank Wire Transfer</h3>
                </div>
                <button type="button" onClick={() => setVerifyingPayment(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem' }}>
                <div><strong>Payment Number:</strong> #{verifyingPayment.paymentNumber}</div>
                <div><strong>Invoice Reference:</strong> #{verifyingPayment.invoiceNumber}</div>
                <div><strong>Payer (Customer):</strong> {verifyingPayment.payerName}</div>
                <div><strong>Amount Transferred:</strong> <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1.1rem' }}>{fmtMoney(verifyingPayment.amount)}</span></div>
                <div><strong>Submitted Wire Ref:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>{verifyingPayment.transactionReference || 'N/A'}</span></div>
                {verifyingPayment.notes && <div><strong>Customer Notes:</strong> {verifyingPayment.notes}</div>}
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 1.5rem 0' }}>
                Clicking <strong>"Confirm &amp; Credit Payment"</strong> verifies that the funds have arrived in the company bank account, marks this payment as <strong>Completed</strong>, and credits Invoice <strong>#{verifyingPayment.invoiceNumber}</strong>.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Button type="button" variant="secondary" onClick={() => setVerifyingPayment(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => handleVerifyWire(verifyingPayment)}
                  disabled={processingVerify}
                  style={{ background: '#10b981', color: '#fff', fontWeight: 700 }}
                >
                  <ShieldCheck size={16} style={{ marginRight: 6 }} /> {processingVerify ? 'Verifying…' : 'Confirm & Credit Payment'}
                </Button>
              </div>
            </Card.Content>
          </Card>
        </div>
      )}

      {/* INTERNAL PAYMENT INSPECTION MODAL */}
      {inspectingPayment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <Card className="glass-panel" style={{ width: '100%', maxWidth: 580, borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <Card.Content style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Receipt size={22} style={{ color: 'var(--accent-primary)' }} />
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Payment Ledger Details</h3>
                </div>
                <button type="button" onClick={() => setInspectingPayment(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '10px', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Payment Reference:</span>
                  <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>#{inspectingPayment.paymentNumber}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Invoice Reference:</span>
                  <span style={{ fontWeight: 700 }}>#{inspectingPayment.invoiceNumber}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Payer (Customer):</span>
                  <span style={{ fontWeight: 700 }}>{inspectingPayment.payerName} {inspectingPayment.payerCompanyName ? `(${inspectingPayment.payerCompanyName})` : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Beneficiary (Receiver):</span>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>Enterprise CRM Solutions Inc.</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Amount Credited:</span>
                  <span style={{ fontWeight: 800, color: '#10b981', fontSize: '1.1rem' }}>{fmtMoney(inspectingPayment.amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Payment Method (Channel):</span>
                  <span style={{ fontWeight: 600 }}>{inspectingPayment.paymentMethod}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Transaction / Check Ref:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{inspectingPayment.transactionReference || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Payment Date:</span>
                  <span>{formatDisplayDate(inspectingPayment.paymentDate)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Verification Status:</span>
                  <span>{getStatusBadge(inspectingPayment.status)}</span>
                </div>
                {inspectingPayment.verifiedByName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Verified By:</span>
                    <span>{inspectingPayment.verifiedByName} on {formatDisplayDate(inspectingPayment.verifiedAt)}</span>
                  </div>
                )}
              </div>

              {inspectingPayment.notes && (
                <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <strong>Accounting Remarks:</strong> {inspectingPayment.notes}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => printPaymentReceipt(inspectingPayment)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Printer size={15} /> Print Receipt (PDF)
                </Button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {inspectingPayment.status?.toLowerCase().includes('pending') && (
                    <Button
                      onClick={() => {
                        const target = inspectingPayment;
                        setInspectingPayment(null);
                        setVerifyingPayment(target);
                      }}
                      style={{ background: '#10b981', color: '#fff', fontWeight: 700 }}
                    >
                      <ShieldCheck size={15} style={{ marginRight: 4 }} /> Verify Wire
                    </Button>
                  )}
                  <Button type="button" variant="secondary" onClick={() => setInspectingPayment(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>
      )}

    </Layout>
  );
};
