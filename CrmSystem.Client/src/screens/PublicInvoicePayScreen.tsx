import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { showToast } from '../lib/toast';
import {
    Receipt, CheckCircle2, ShieldCheck, DollarSign, Calendar,
    Building2, Mail, Phone, CreditCard, Lock, ArrowRight, Clock
} from 'lucide-react';
import './screens.css';

interface InvoiceData {
    invoiceId: number;
    invoiceNumber: string;
    status: string;
    amount: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
    issueDate: string;
    dueDate: string;
    paidAt?: string;
    paymentMethod?: string;
    notes?: string;
    terms?: string;
    customer: {
        customerId: number;
        name: string;
        email: string;
        phone?: string;
    };
}

export const PublicInvoicePayScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [invoice, setInvoice] = useState<InvoiceData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [cardHolder, setCardHolder] = useState<string>('');
    const [cardNumber, setCardNumber] = useState<string>('•••• •••• •••• 4242');
    const [processing, setProcessing] = useState<boolean>(false);
    const [paidSuccess, setPaidSuccess] = useState<boolean>(false);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        api.get<InvoiceData>(`/api/public/invoices/${id}`)
            .then(data => {
                setInvoice(data);
                if (data.customer?.name) {
                    setCardHolder(data.customer.name);
                }
                if (data.status === 'Paid') {
                    setPaidSuccess(true);
                }
            })
            .catch(err => {
                setError(err.message || 'Invoice not found or expired.');
            })
            .finally(() => setLoading(false));
    }, [id]);

    const handlePayInvoice = async () => {
        if (!id || !invoice) return;
        if (!cardHolder.trim()) {
            showToast('Please enter cardholder name', 'error');
            return;
        }

        setProcessing(true);
        try {
            const res = await api.post<any>(`/api/public/invoices/${id}/pay`, {
                cardHolderName: cardHolder.trim(),
                paymentMethod: 'Stripe Online Credit Card'
            });

            setInvoice(prev => prev ? { ...prev, status: 'Paid', paidAt: res.paidAt } : null);
            setPaidSuccess(true);
            showToast('Payment completed successfully!', 'success');
        } catch (err: any) {
            showToast(err.message || 'Payment processing failed', 'error');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <Card className="glass-panel" style={{ width: '100%', maxWidth: 540, padding: '3rem', textAlign: 'center' }}>
                    <Receipt size={48} className="animate-spin" style={{ color: 'var(--accent-primary)', margin: '0 auto 1rem auto' }} />
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Loading Secure Payment Portal…</h3>
                </Card>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <Card className="glass-panel" style={{ width: '100%', maxWidth: 540, padding: '3rem', textAlign: 'center' }}>
                    <Receipt size={48} style={{ color: '#ef4444', margin: '0 auto 1rem auto' }} />
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>Invoice Not Available</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{error || 'This invoice URL is invalid or has expired.'}</p>
                </Card>
            </div>
        );
    }

    const fmtMoney = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '2rem 1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: 680 }} className="animate-fade-in">
                {/* Brand Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 42, height: 42, borderRadius: '0.75rem', background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>CRM Billing Portal</h2>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Encrypted SSL Secured Payment</span>
                        </div>
                    </div>
                    <div style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: '2rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        background: paidSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: paidSuccess ? '#10b981' : '#b45309',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                    }}>
                        {paidSuccess ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                        {paidSuccess ? 'PAID' : 'PAYMENT DUE'}
                    </div>
                </div>

                <Card className="glass-panel" style={{ borderRadius: '1.25rem', overflow: 'hidden' }}>
                    <Card.Content style={{ padding: '2.5rem' }}>
                        {/* Invoice Summary Header */}
                        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
                                    Invoice Reference
                                </span>
                                <h1 style={{ margin: '0.2rem 0 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    #{invoice.invoiceNumber}
                                </h1>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
                                    Total Amount Due
                                </span>
                                <h1 style={{ margin: '0.2rem 0 0 0', fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                    {fmtMoney(invoice.totalAmount)}
                                </h1>
                            </div>
                        </div>

                        {/* Customer & Date Details */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem', padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: '0.85rem' }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Billed To</span>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{invoice.customer.name}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{invoice.customer.email}</div>
                                {invoice.customer.phone && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{invoice.customer.phone}</div>}
                            </div>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Dates & Terms</span>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                    <strong>Issued:</strong> {new Date(invoice.issueDate).toLocaleDateString()}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                    <strong>Due Date:</strong> {new Date(invoice.dueDate).toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        {/* Financial Line Breakdown */}
                        <div style={{ marginBottom: '2rem' }}>
                            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Summary Breakdown</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                    <span>Subtotal Amount</span>
                                    <span>{fmtMoney(invoice.amount)}</span>
                                </div>
                                {invoice.taxRate > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                        <span>Tax ({invoice.taxRate}%)</span>
                                        <span>{fmtMoney(invoice.taxAmount)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                                    <span>Total Due</span>
                                    <span style={{ color: 'var(--accent-primary)' }}>{fmtMoney(invoice.totalAmount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Paid Success View */}
                        {paidSuccess ? (
                            <div style={{ textAlign: 'center', padding: '2rem 1.5rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '1rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                <CheckCircle2 size={44} color="#10b981" style={{ margin: '0 auto 0.75rem auto' }} />
                                <h3 style={{ margin: '0 0 0.25rem 0', color: '#10b981', fontWeight: 800 }}>Invoice Paid in Full</h3>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    Thank you! Payment of {fmtMoney(invoice.totalAmount)} was received on {invoice.paidAt ? new Date(invoice.paidAt).toLocaleString() : new Date().toLocaleString()}.
                                </p>
                            </div>
                        ) : (
                            /* Credit Card Payment Form */
                            <div style={{ background: 'var(--bg-secondary)', padding: '1.75rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                                        <CreditCard size={18} color="var(--accent-primary)" /> Pay Online via Credit Card / Stripe
                                    </h4>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Lock size={12} /> 256-bit Encryption
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <Input
                                        label="Cardholder Name"
                                        value={cardHolder}
                                        onChange={e => setCardHolder(e.target.value)}
                                        placeholder="Full Name on Card"
                                    />
                                    <Input
                                        label="Card Number"
                                        value={cardNumber}
                                        onChange={e => setCardNumber(e.target.value)}
                                        placeholder="•••• •••• •••• ••••"
                                    />
                                </div>

                                <Button
                                    onClick={handlePayInvoice}
                                    disabled={processing}
                                    variant="primary"
                                    style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem', fontWeight: 700 }}
                                >
                                    {processing ? 'Processing Secure Payment…' : (
                                        <>Pay {fmtMoney(invoice.totalAmount)} Now <ArrowRight size={18} style={{ marginLeft: 8 }} /></>
                                    )}
                                </Button>
                            </div>
                        )}
                    </Card.Content>
                </Card>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <ShieldCheck size={16} /> Powered by CRM Secure Online Billing Gateway
                </div>
            </div>
        </div>
    );
};
