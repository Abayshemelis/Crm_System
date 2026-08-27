import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { showToast } from '../lib/toast';
import {
    Receipt, CheckCircle2, ShieldCheck, DollarSign, Calendar,
    Building2, Mail, Phone, CreditCard, Lock, ArrowRight, Clock,
    Landmark, Copy, Check, ExternalLink, Printer, Sparkles, AlertCircle,
    ArrowDownLeft, HelpCircle, Smartphone
} from 'lucide-react';
import { formatDisplayDate } from '../lib/dateUtils';
import './screens.css';

interface SellerInfo {
    name: string;
    taxId: string;
    email: string;
    phone: string;
    address: string;
    bankName: string;
    accountIban: string;
    swiftBic: string;
}

interface BuyerInfo {
    customerId: number;
    name: string;
    email: string;
    phone?: string;
    companyName?: string;
}

interface PaymentRecord {
    paymentId: number;
    paymentNumber: string;
    amount: number;
    currency: string;
    status: string;
    paymentMethod: string;
    transactionReference?: string;
    paymentDate: string;
    notes?: string;
}

interface InvoiceData {
    invoiceId: number;
    invoiceNumber: string;
    status: string;
    amount: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    issueDate: string;
    dueDate: string;
    paidAt?: string;
    paymentMethod?: string;
    notes?: string;
    terms?: string;
    contractNumber?: string;
    opportunityTitle?: string;
    seller: SellerInfo;
    buyer: BuyerInfo;
    payments: PaymentRecord[];
}

interface BankChannel {
    id: string;
    name: string;
    accountNumber: string;
    accountHolder: string;
    branch?: string;
    type: 'ethiopian' | 'international' | 'mobile';
    logoIcon: string;
}

const SUPPORTED_BANKS: BankChannel[] = [
    {
        id: 'cbe',
        name: 'Commercial Bank of Ethiopia (Nigd Bank)',
        accountNumber: '1000192837465',
        accountHolder: 'Enterprise CRM Solutions Inc.',
        branch: 'Finfinnee Corporate Branch',
        type: 'ethiopian',
        logoIcon: '🏦'
    },
    {
        id: 'awash',
        name: 'Awash Bank',
        accountNumber: '01304857291000',
        accountHolder: 'Enterprise CRM Solutions Inc.',
        branch: 'Head Office Branch, Addis Ababa',
        type: 'ethiopian',
        logoIcon: '🏦'
    },
    {
        id: 'boa',
        name: 'Bank of Abyssinia (BOA)',
        accountNumber: '84739201',
        accountHolder: 'Enterprise CRM Solutions Inc.',
        branch: 'Legehar Branch',
        type: 'ethiopian',
        logoIcon: '🏦'
    },
    {
        id: 'dashen',
        name: 'Dashen Bank',
        accountNumber: '5082736451011',
        accountHolder: 'Enterprise CRM Solutions Inc.',
        branch: 'Kazanchis Main Branch',
        type: 'ethiopian',
        logoIcon: '🏦'
    },
    {
        id: 'telebirr',
        name: 'Telebirr / CBE Birr (Merchant Payment)',
        accountNumber: 'ET-CRM-94829',
        accountHolder: 'Enterprise CRM Solutions Inc.',
        branch: 'Merchant Code',
        type: 'mobile',
        logoIcon: '📱'
    },
    {
        id: 'global_wire',
        name: 'Global Commercial Bank (SWIFT / International)',
        accountNumber: 'US89370400440532013000',
        accountHolder: 'Enterprise CRM Solutions Inc.',
        branch: 'SWIFT: GCBIUS33 · Routing: 121000358',
        type: 'international',
        logoIcon: '🌐'
    }
];

export const PublicInvoicePayScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const sessionIdParam = searchParams.get('session_id');
    const navigate = useNavigate();
    const { user, token, userRole } = useAuth();
    const isInternalWorker = Boolean(token || user);

    const [invoice, setInvoice] = useState<InvoiceData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Payment Amount Selection: 'full' or 'custom'
    const [amountMode, setAmountMode] = useState<'full' | 'custom'>('full');
    const [customAmount, setCustomAmount] = useState<string>('');

    // Payment Method Main Tab: 'bank_transfer' | 'stripe_card'
    const [paymentTab, setPaymentTab] = useState<'bank_transfer' | 'stripe_card'>('bank_transfer');

    // Selected Bank in Bank Transfer tab
    const [selectedBankId, setSelectedBankId] = useState<string>('cbe');
    const selectedBank = SUPPORTED_BANKS.find(b => b.id === selectedBankId) || SUPPORTED_BANKS[0];

    // Card Form State
    const [cardHolder, setCardHolder] = useState<string>('');
    const [cardNumber, setCardNumber] = useState<string>('');
    const [cardExpiry, setCardExpiry] = useState<string>('');
    const [cardCvc, setCardCvc] = useState<string>('');
    const [cardZip, setCardZip] = useState<string>('');

    // Bank Wire / Transfer Form State
    const [wireRef, setWireRef] = useState<string>('');
    const [senderName, setSenderName] = useState<string>('');
    const [senderPhone, setSenderPhone] = useState<string>('');
    const [wireNotes, setWireNotes] = useState<string>('');
    const [copiedAcc, setCopiedAcc] = useState<boolean>(false);

    // Processing State
    const [processing, setProcessing] = useState<boolean>(false);
    const [lastSuccessfulPayment, setLastSuccessfulPayment] = useState<PaymentRecord | null>(null);

    const fetchInvoice = async () => {
        if (!id) return;
        try {
            const data = await api.get<InvoiceData>(`/api/public/invoices/${id}`);
            setInvoice(data);
            if (data.buyer?.name && !cardHolder) {
                setCardHolder(data.buyer.name);
            }
            if (data.buyer?.name && !senderName) {
                setSenderName(data.buyer.name);
            }
            if (data.buyer?.phone && !senderPhone) {
                setSenderPhone(data.buyer.phone);
            }
            if (data.balanceDue > 0 && !customAmount) {
                setCustomAmount(Math.round(data.balanceDue / 2).toString());
            }

            // Verify Stripe Session if redirected back
            if (sessionIdParam && data.balanceDue > 0) {
                try {
                    const verifyRes = await api.get<any>(`/api/public/invoices/${id}/verify-stripe-session?sessionId=${encodeURIComponent(sessionIdParam)}`);
                    if (verifyRes.success) {
                        showToast('Stripe payment verified and credited to invoice!', 'success');
                        const refreshed = await api.get<InvoiceData>(`/api/public/invoices/${id}`);
                        setInvoice(refreshed);
                    }
                } catch (err: any) {
                    console.error('Session verify error:', err);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Invoice not found or expired.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchInvoice();
    }, [id, sessionIdParam]);

    const getSelectedPayAmount = (): number => {
        if (!invoice) return 0;
        if (amountMode === 'full') return invoice.balanceDue;
        const val = parseFloat(customAmount);
        return isNaN(val) ? 0 : val;
    };

    const handleStripeCheckoutRedirect = async () => {
        if (!id || !invoice) return;
        const payAmount = getSelectedPayAmount();
        if (payAmount <= 0) {
            showToast('Please enter a valid payment amount', 'error');
            return;
        }

        setProcessing(true);
        try {
            const res = await api.post<any>(`/api/public/invoices/${id}/stripe-checkout`, {
                amount: payAmount
            });
            if (res.checkoutUrl) {
                window.location.href = res.checkoutUrl;
            } else {
                throw new Error('Could not generate Stripe Checkout URL');
            }
        } catch (err: any) {
            showToast(err.message || 'Failed to initialize Stripe checkout. Please use Bank Transfer option.', 'error');
            setProcessing(false);
        }
    };

    const handleDirectCardPay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !invoice) return;

        const payAmount = getSelectedPayAmount();
        if (payAmount <= 0) {
            showToast('Please enter a valid payment amount greater than zero', 'error');
            return;
        }
        if (payAmount > invoice.balanceDue + 0.01) {
            showToast(`Payment amount cannot exceed remaining balance due of ${fmtMoney(invoice.balanceDue)}`, 'error');
            return;
        }

        if (!cardHolder.trim()) {
            showToast('Please enter cardholder full name', 'error');
            return;
        }

        const cleanCard = cardNumber.replace(/\s+/g, '');
        if (cleanCard.length < 12) {
            showToast('Please enter a valid card number (at least 12 digits)', 'error');
            return;
        }

        setProcessing(true);
        try {
            const res = await api.post<any>(`/api/public/invoices/${id}/pay`, {
                amount: payAmount,
                cardHolderName: cardHolder.trim(),
                cardNumberLast4: cleanCard.slice(-4),
                paymentMethod: 'CreditCard'
            });

            showToast(`Payment of ${fmtMoney(payAmount)} processed successfully!`, 'success');
            await fetchInvoice();
            setLastSuccessfulPayment({
                paymentId: 0,
                paymentNumber: res.paymentNumber,
                amount: payAmount,
                currency: 'USD',
                status: 'Completed',
                paymentMethod: 'CreditCard',
                paymentDate: new Date().toISOString()
            });
        } catch (err: any) {
            showToast(err.message || 'Payment processing failed. Please check your card information.', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleBankTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !invoice) return;

        const payAmount = getSelectedPayAmount();
        if (payAmount <= 0) {
            showToast('Please enter a valid transfer amount', 'error');
            return;
        }
        if (!wireRef.trim()) {
            showToast('Please enter the bank transfer transaction reference / receipt number', 'error');
            return;
        }

        setProcessing(true);
        try {
            await api.post<any>(`/api/public/invoices/${id}/pay-wire`, {
                amount: payAmount,
                wireReference: wireRef.trim(),
                senderBankName: selectedBank.name,
                senderAccountName: `${senderName.trim()}${senderPhone ? ` (${senderPhone.trim()})` : ''}`,
                notes: wireNotes.trim() || `Transferred to ${selectedBank.name}`
            });

            showToast('Transfer confirmation submitted! Our accounting team will verify the incoming funds with the bank.', 'success');
            setWireRef('');
            await fetchInvoice();
        } catch (err: any) {
            showToast(err.message || 'Failed to submit bank transfer details.', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const copyAccountNumber = (acc: string) => {
        navigator.clipboard.writeText(acc);
        setCopiedAcc(true);
        showToast(`Account number copied: ${acc}`, 'success');
        setTimeout(() => setCopiedAcc(false), 3000);
    };

    const fmtMoney = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: '#fff' }}>
                <Card style={{ width: '100%', maxWidth: 500, padding: '3rem', textAlign: 'center', background: '#1e293b', border: '1px solid #334155' }}>
                    <Receipt size={48} className="rpt-spin" style={{ color: '#818cf8', margin: '0 auto 1rem auto' }} />
                    <h3 style={{ margin: 0, color: '#f8fafc' }}>Securing Billing Session…</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem' }}>Loading verified invoice and payment settlement details</p>
                </Card>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: '#fff' }}>
                <Card style={{ width: '100%', maxWidth: 500, padding: '3rem', textAlign: 'center', background: '#1e293b', border: '1px solid #ef4444' }}>
                    <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 1rem auto' }} />
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc' }}>Invoice Unavailable</h3>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>{error || 'This invoice URL is invalid or has expired.'}</p>
                </Card>
            </div>
        );
    }

    const isFullyPaid = invoice.status === 'Paid' || invoice.balanceDue <= 0.01;
    const isPartiallyPaid = invoice.status === 'PartiallyPaid' || (invoice.amountPaid > 0 && invoice.balanceDue > 0.01);
    const hasPendingWire = invoice.payments.some(p => p.status === 'PendingVerification');
    const percentPaid = Math.min(100, Math.round((invoice.amountPaid / (invoice.totalAmount || 1)) * 100));

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '2rem 1rem', fontFamily: 'Segoe UI, sans-serif' }}>
            <div style={{ maxWidth: 880, margin: '0 auto' }}>

                {/* Top Brand Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 42, height: 42, borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>
                            💳
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>Official Commercial Billing Portal</h2>
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Enterprise CRM Solutions Inc. · Verified Payment Gateway</span>
                        </div>
                    </div>
                    <div style={{
                        padding: '0.4rem 0.95rem',
                        borderRadius: '2rem',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        background: isFullyPaid ? 'rgba(16, 185, 129, 0.15)' : isPartiallyPaid ? 'rgba(99, 102, 241, 0.18)' : hasPendingWire ? 'rgba(56, 189, 248, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                        color: isFullyPaid ? '#34d399' : isPartiallyPaid ? '#818cf8' : hasPendingWire ? '#38bdf8' : '#fbbf24',
                        border: isFullyPaid ? '1px solid rgba(16, 185, 129, 0.35)' : isPartiallyPaid ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                    }}>
                        {isFullyPaid ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                        {isFullyPaid ? 'PAID IN FULL' : isPartiallyPaid ? `PARTIALLY PAID (${percentPaid}%)` : hasPendingWire ? 'PENDING BANK VERIFICATION' : 'PAYMENT DUE'}
                    </div>
                </div>

                {/* Main Billing Paper */}
                <div style={{ background: '#ffffff', color: '#0f172a', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '2.5rem' }}>

                        {/* Top Invoice Overview */}
                        <div style={{ borderBottom: '2px solid #6366f1', paddingBottom: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6366f1', fontWeight: 700 }}>
                                    COMMERCIAL INVOICE
                                </span>
                                <h1 style={{ margin: '0.2rem 0 0 0', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
                                    #{invoice.invoiceNumber}
                                </h1>
                                {invoice.contractNumber && (
                                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.25rem' }}>
                                        Contract Agreement Ref: <strong>#{invoice.contractNumber}</strong>
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 700 }}>
                                    TOTAL INVOICE VALUE
                                </span>
                                <div style={{ margin: '0.2rem 0 0 0', fontSize: '1.85rem', fontWeight: 800, color: '#1e1b4b' }}>
                                    {fmtMoney(invoice.totalAmount)}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Due Date: {formatDisplayDate(invoice.dueDate)}</div>
                            </div>
                        </div>

                        {/* EXPLICIT PAYER VS RECEIVER SECTION */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
                            
                            {/* Box 1: Receiver (Seller / Company) */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#4338ca', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                    <Building2 size={15} />
                                    <span>RECEIVER / BENEFICIARY (OUR COMPANY)</span>
                                </div>
                                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{invoice.seller?.name || 'Enterprise CRM Solutions Inc.'}</div>
                                <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '0.2rem' }}>Tax ID: {invoice.seller?.taxId || 'US-94829471'}</div>
                                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{invoice.seller?.address || '100 Enterprise Way, Suite 400, San Francisco, CA'}</div>
                                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{invoice.seller?.email || 'billing@enterprisecrm.io'}</div>
                            </div>

                            {/* Box 2: Payer (Customer / Buyer) */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0369a1', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                    <ArrowDownLeft size={15} />
                                    <span>PAYER / CUSTOMER (YOU)</span>
                                </div>
                                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{invoice.buyer?.name}</div>
                                {invoice.buyer?.companyName && <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>🏢 {invoice.buyer.companyName}</div>}
                                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.2rem' }}>{invoice.buyer?.email}</div>
                                {invoice.buyer?.phone && <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{invoice.buyer.phone}</div>}
                            </div>
                        </div>

                        {/* FINANCIAL INSTALLMENT PROGRESS BAR & BALANCE SUMMARY */}
                        <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                                    Payment Settlement Status
                                </span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isFullyPaid ? '#16a34a' : '#4338ca' }}>
                                    {fmtMoney(invoice.amountPaid)} paid of {fmtMoney(invoice.totalAmount)} ({percentPaid}%)
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div style={{ height: '10px', width: '100%', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                                <div style={{ height: '100%', width: `${percentPaid}%`, background: isFullyPaid ? '#16a34a' : 'linear-gradient(90deg, #6366f1, #4338ca)', borderRadius: '5px', transition: 'width 0.4s ease' }} />
                            </div>

                            {/* 3 Metric Summary Boxes */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                                <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Invoice Total</div>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{fmtMoney(invoice.totalAmount)}</div>
                                </div>
                                <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>Total Verified Paid</div>
                                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>{fmtMoney(invoice.amountPaid)}</div>
                                </div>
                                <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: isFullyPaid ? '1px solid #e2e8f0' : '2px solid #6366f1' }}>
                                    <div style={{ fontSize: '0.72rem', color: isFullyPaid ? '#64748b' : '#4338ca', fontWeight: 800, textTransform: 'uppercase' }}>Remaining Balance Due</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: isFullyPaid ? '#16a34a' : '#4338ca', marginTop: '0.2rem' }}>{fmtMoney(invoice.balanceDue)}</div>
                                </div>
                            </div>
                        </div>

                        {/* PENDING VERIFICATION BANNER IF CUSTOMER SUBMITTED WIRE */}
                        {hasPendingWire && !isFullyPaid && (
                            <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #0284c7', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.75rem', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Clock size={22} style={{ color: '#0284c7', flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Bank Transfer Confirmation Received &amp; Pending Verification</div>
                                    <div style={{ fontSize: '0.82rem', marginTop: '0.2rem', color: '#334155' }}>
                                        Our accounting department is verifying the incoming bank funds. Once confirmed with our bank, your invoice status will be officially updated to Paid.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PAYMENT SELECTION & EXECUTION AREA */}
                        {isInternalWorker ? (
                            /* INTERNAL STAFF RESTRICTION CARD */
                            <div style={{ background: '#f8fafc', border: '2px solid #6366f1', borderRadius: '14px', padding: '1.75rem', marginTop: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#4338ca' }}>
                                    <ShieldCheck size={28} />
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e1b4b', fontWeight: 800 }}>
                                            Internal Staff View — Payment Operations Restricted
                                        </h3>
                                        <span style={{ fontSize: '0.82rem', color: '#6366f1', fontWeight: 600 }}>
                                            Signed in as {user?.name || 'Internal Staff'} ({userRole || 'Staff'})
                                        </span>
                                    </div>
                                </div>

                                <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.88rem', color: '#312e81', lineHeight: '1.5' }}>
                                    <p style={{ margin: '0 0 0.5rem 0' }}>
                                        <strong>Enterprise Security Policy:</strong> Internal company staff (Admins, Managers, Sales Representatives) are strictly prohibited from acting as the customer, submitting payments, or authorizing credit card charges on company invoices.
                                    </p>
                                    <p style={{ margin: 0 }}>
                                        Only the external customer can authorize and complete payments from their own session.
                                    </p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                                        Available Internal Actions:
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        <Button
                                            variant="primary"
                                            onClick={() => {
                                                const url = `${window.location.origin}/invoices/pay/${invoice.invoiceNumber}`;
                                                navigator.clipboard.writeText(url);
                                                showToast('Customer payment link copied to clipboard!', 'success');
                                            }}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.75rem 1.25rem', fontWeight: 700 }}
                                        >
                                            <Copy size={16} /> Copy Payment Link for Customer
                                        </Button>

                                        <Button
                                            variant="secondary"
                                            onClick={() => window.print()}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.75rem 1.25rem', fontWeight: 700 }}
                                        >
                                            <Printer size={16} /> Print Commercial Invoice
                                        </Button>

                                        <Button
                                            variant="secondary"
                                            onClick={() => navigate('/invoices')}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.75rem 1.25rem', fontWeight: 700 }}
                                        >
                                            <ArrowRight size={16} /> Return to CRM Dashboard
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : !isFullyPaid ? (
                            <div>
                                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CreditCard size={20} color="#6366f1" />
                                    <span>Select Payment Method to Pay Our Company</span>
                                </h3>

                                {/* Step 1: Amount Selection */}
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                                        Step 1: Choose Amount to Pay
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        <label style={{
                                            flex: '1 1 200px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.6rem',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '8px',
                                            border: amountMode === 'full' ? '2px solid #6366f1' : '1px solid #cbd5e1',
                                            background: amountMode === 'full' ? '#eef2ff' : '#ffffff',
                                            cursor: 'pointer'
                                        }}>
                                            <input
                                                type="radio"
                                                name="amountMode"
                                                checked={amountMode === 'full'}
                                                onChange={() => setAmountMode('full')}
                                            />
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Pay Full Balance Due</div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4338ca' }}>{fmtMoney(invoice.balanceDue)}</div>
                                            </div>
                                        </label>

                                        <label style={{
                                            flex: '1 1 200px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.6rem',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '8px',
                                            border: amountMode === 'custom' ? '2px solid #6366f1' : '1px solid #cbd5e1',
                                            background: amountMode === 'custom' ? '#eef2ff' : '#ffffff',
                                            cursor: 'pointer'
                                        }}>
                                            <input
                                                type="radio"
                                                name="amountMode"
                                                checked={amountMode === 'custom'}
                                                onChange={() => setAmountMode('custom')}
                                            />
                                            <div style={{ width: '100%' }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Partial Milestone Deposit ($)</div>
                                                {amountMode === 'custom' && (
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="1"
                                                        max={invoice.balanceDue}
                                                        value={customAmount}
                                                        onChange={e => setCustomAmount(e.target.value)}
                                                        placeholder="Enter amount"
                                                        style={{ width: '100%', marginTop: '0.35rem', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #6366f1', fontSize: '0.88rem' }}
                                                    />
                                                )}
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Step 2: Payment Channel Tabs */}
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentTab('bank_transfer')}
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem 1rem',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: paymentTab === 'bank_transfer' ? '#6366f1' : '#f1f5f9',
                                            color: paymentTab === 'bank_transfer' ? '#ffffff' : '#475569',
                                            fontWeight: 700,
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <Landmark size={18} />
                                        <span>🏦 Ethiopian Bank Transfer / Telebirr / Wire</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPaymentTab('stripe_card')}
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem 1rem',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: paymentTab === 'stripe_card' ? '#6366f1' : '#f1f5f9',
                                            color: paymentTab === 'stripe_card' ? '#ffffff' : '#475569',
                                            fontWeight: 700,
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <CreditCard size={18} />
                                        <span>💳 Stripe Checkout &amp; Card</span>
                                    </button>
                                </div>

                                {paymentTab === 'bank_transfer' ? (
                                    /* TAB 1: BANK TRANSFER & ETHIOPIAN BANKS */
                                    <div style={{ background: '#f8fafc', padding: '1.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        
                                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                                            Select Company Bank / Account to Transfer To:
                                        </div>

                                        {/* Bank Channel Cards Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                            {SUPPORTED_BANKS.map(bank => (
                                                <div
                                                    key={bank.id}
                                                    onClick={() => setSelectedBankId(bank.id)}
                                                    style={{
                                                        padding: '0.85rem 1rem',
                                                        borderRadius: '8px',
                                                        border: selectedBankId === bank.id ? '2px solid #6366f1' : '1px solid #cbd5e1',
                                                        background: selectedBankId === bank.id ? '#ffffff' : '#ffffff',
                                                        boxShadow: selectedBankId === bank.id ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                                                        <span>{bank.logoIcon}</span>
                                                        <span>{bank.name}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.3rem', fontFamily: 'monospace' }}>
                                                        Acc: <strong>{bank.accountNumber}</strong>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Active Selected Bank Beneficiary Details Box */}
                                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Landmark size={18} color="#6366f1" />
                                                    <span>{selectedBank.name} — Company Account</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => copyAccountNumber(selectedBank.accountNumber)}
                                                    style={{
                                                        background: '#e0e7ff',
                                                        border: 'none',
                                                        color: '#4338ca',
                                                        padding: '0.35rem 0.75rem',
                                                        borderRadius: '6px',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.3rem'
                                                    }}
                                                >
                                                    {copiedAcc ? <Check size={13} /> : <Copy size={13} />}
                                                    <span>{copiedAcc ? 'Copied!' : 'Copy Account #'}</span>
                                                </button>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.82rem' }}>
                                                <div>
                                                    <div style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Beneficiary Name (Receiver)</div>
                                                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedBank.accountHolder}</div>
                                                </div>
                                                <div>
                                                    <div style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Account / Merchant ID</div>
                                                    <div style={{ fontWeight: 800, color: '#4338ca', fontFamily: 'monospace', fontSize: '0.95rem' }}>{selectedBank.accountNumber}</div>
                                                </div>
                                                <div>
                                                    <div style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Branch / Instructions</div>
                                                    <div style={{ fontWeight: 600, color: '#475569' }}>{selectedBank.branch || 'Main Branch'}</div>
                                                </div>
                                                <div>
                                                    <div style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Mandatory Invoice Ref Code</div>
                                                    <div style={{ fontWeight: 800, color: '#6366f1', fontFamily: 'monospace' }}>{invoice.invoiceNumber}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bank Transfer Confirmation Submission Form */}
                                        <form onSubmit={handleBankTransferSubmit}>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                                                Submit Transfer Confirmation ({fmtMoney(getSelectedPayAmount())})
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                                                        Bank Transfer Transaction Reference ID / FT Receipt # *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={wireRef}
                                                        onChange={e => setWireRef(e.target.value)}
                                                        placeholder="e.g. FT2608192840 or CBE-REF-994821 or Bank Txn ID"
                                                        required
                                                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                                    />
                                                    <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                                                        Found on your bank SMS confirmation or mobile banking app transfer receipt.
                                                    </span>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>Sender Name</label>
                                                        <input
                                                            type="text"
                                                            value={senderName}
                                                            onChange={e => setSenderName(e.target.value)}
                                                            placeholder={invoice.buyer.name}
                                                            style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>Sender Phone</label>
                                                        <input
                                                            type="text"
                                                            value={senderPhone}
                                                            onChange={e => setSenderPhone(e.target.value)}
                                                            placeholder={invoice.buyer.phone || '+251 9...'}
                                                            style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>Additional Remarks (Optional)</label>
                                                    <input
                                                        type="text"
                                                        value={wireNotes}
                                                        onChange={e => setWireNotes(e.target.value)}
                                                        placeholder="e.g. Transferred via CBE Mobile App"
                                                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={processing || getSelectedPayAmount() <= 0}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.95rem 1.5rem',
                                                    borderRadius: '10px',
                                                    border: 'none',
                                                    background: '#16a34a',
                                                    color: '#ffffff',
                                                    fontWeight: 800,
                                                    fontSize: '1rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem',
                                                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)'
                                                }}
                                            >
                                                <CheckCircle2 size={18} />
                                                <span>{processing ? 'Submitting Transfer Details…' : `Submit ${selectedBank.name} Transfer Confirmation`}</span>
                                            </button>
                                        </form>
                                    </div>
                                ) : (
                                    /* TAB 2: STRIPE & CREDIT CARD */
                                    <div style={{ background: '#f8fafc', padding: '1.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        
                                        {/* Stripe One-Click Express Checkout */}
                                        <div style={{ marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px dashed #cbd5e1' }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                                                Option A: Stripe Instant Checkout (Cards, Apple Pay, Google Pay)
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleStripeCheckoutRedirect}
                                                disabled={processing || getSelectedPayAmount() <= 0}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.85rem 1.5rem',
                                                    borderRadius: '10px',
                                                    border: 'none',
                                                    background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                                                    color: '#ffffff',
                                                    fontWeight: 800,
                                                    fontSize: '0.95rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.6rem',
                                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
                                                }}
                                            >
                                                <Sparkles size={18} />
                                                <span>Pay {fmtMoney(getSelectedPayAmount())} via Stripe Checkout</span>
                                                <ExternalLink size={16} />
                                            </button>
                                        </div>

                                        {/* Direct Secure Card Form */}
                                        <form onSubmit={handleDirectCardPay}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span>Option B: Direct Encrypted Card Form</span>
                                                <span style={{ fontSize: '0.75rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <Lock size={12} /> 256-Bit Encrypted
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Cardholder Full Name *</label>
                                                    <input
                                                        type="text"
                                                        value={cardHolder}
                                                        onChange={e => setCardHolder(e.target.value)}
                                                        placeholder="Full Name on card"
                                                        required
                                                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                                    />
                                                </div>

                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Card Number *</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type="text"
                                                            value={cardNumber}
                                                            onChange={e => setCardNumber(e.target.value)}
                                                            placeholder="4000 1234 5678 9010"
                                                            required
                                                            style={{ width: '100%', padding: '0.65rem 0.85rem 0.65rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', letterSpacing: '0.05em' }}
                                                        />
                                                        <CreditCard size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Expiry *</label>
                                                        <input
                                                            type="text"
                                                            value={cardExpiry}
                                                            onChange={e => setCardExpiry(e.target.value)}
                                                            placeholder="MM / YY"
                                                            maxLength={7}
                                                            required
                                                            style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>CVC *</label>
                                                        <input
                                                            type="password"
                                                            value={cardCvc}
                                                            onChange={e => setCardCvc(e.target.value)}
                                                            placeholder="123"
                                                            maxLength={4}
                                                            required
                                                            style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Zip Code</label>
                                                        <input
                                                            type="text"
                                                            value={cardZip}
                                                            onChange={e => setCardZip(e.target.value)}
                                                            placeholder="90210"
                                                            style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={processing || getSelectedPayAmount() <= 0}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.95rem 1.5rem',
                                                    borderRadius: '10px',
                                                    border: 'none',
                                                    background: '#16a34a',
                                                    color: '#ffffff',
                                                    fontWeight: 800,
                                                    fontSize: '1rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem',
                                                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)'
                                                }}
                                            >
                                                <Lock size={18} />
                                                <span>{processing ? 'Processing Payment…' : `Authorize & Pay ${fmtMoney(getSelectedPayAmount())} to ${invoice.seller?.name || 'Company'}`}</span>
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* FULLY PAID SETTLED SCREEN */
                            <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '12px', padding: '2rem', textAlign: 'center' }}>
                                <CheckCircle2 size={56} style={{ color: '#16a34a', margin: '0 auto 1rem auto' }} />
                                <h2 style={{ margin: 0, color: '#166534', fontSize: '1.5rem' }}>Invoice Fully Settled &amp; Paid</h2>
                                <p style={{ color: '#15803d', fontSize: '0.95rem', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                                    Thank you! All balances for Invoice #{invoice.invoiceNumber} have been confirmed and credited into the company account.
                                </p>
                                <Button
                                    variant="primary"
                                    onClick={() => window.print()}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#16a34a', border: 'none', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 700 }}
                                >
                                    <Printer size={18} /> Print Official Settlement Receipt
                                </Button>
                            </div>
                        )}

                        {/* TRANSACTION HISTORY & SETTLEMENT LEDGER */}
                        {invoice.payments.length > 0 && (
                            <div style={{ marginTop: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                                        Receipts &amp; Transaction History
                                    </h4>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{invoice.payments.length} record(s)</span>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                                                <th style={{ padding: '0.6rem 0.5rem' }}>Payment #</th>
                                                <th style={{ padding: '0.6rem 0.5rem' }}>Amount</th>
                                                <th style={{ padding: '0.6rem 0.5rem' }}>Method / Bank</th>
                                                <th style={{ padding: '0.6rem 0.5rem' }}>Reference</th>
                                                <th style={{ padding: '0.6rem 0.5rem' }}>Date</th>
                                                <th style={{ padding: '0.6rem 0.5rem' }}>Verification</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoice.payments.map((p) => (
                                                <tr key={p.paymentId || p.paymentNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '0.6rem 0.5rem', fontWeight: 700, color: '#4338ca' }}>{p.paymentNumber}</td>
                                                    <td style={{ padding: '0.6rem 0.5rem', fontWeight: 700, color: '#16a34a' }}>{fmtMoney(p.amount)}</td>
                                                    <td style={{ padding: '0.6rem 0.5rem' }}>{p.paymentMethod}</td>
                                                    <td style={{ padding: '0.6rem 0.5rem', fontFamily: 'monospace', color: '#64748b' }}>{p.transactionReference || '—'}</td>
                                                    <td style={{ padding: '0.6rem 0.5rem', color: '#64748b' }}>{formatDisplayDate(p.paymentDate)}</td>
                                                    <td style={{ padding: '0.6rem 0.5rem' }}>
                                                        <span style={{
                                                            padding: '0.2rem 0.5rem',
                                                            borderRadius: '12px',
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700,
                                                            background: (p.status || '').toLowerCase() === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                                                            color: (p.status || '').toLowerCase() === 'completed' ? '#16a34a' : '#0284c7'
                                                        }}>
                                                            {(p.status || '').toLowerCase() === 'completed' ? 'Verified' : 'Pending Verification'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Footer Security Notice */}
                <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                    🔒 All transactions are encrypted and audited. Enterprise CRM Solutions Inc. &copy; {new Date().getFullYear()}
                </div>

            </div>
        </div>
    );
};
