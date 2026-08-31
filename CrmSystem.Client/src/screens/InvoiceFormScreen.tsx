import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';
import { useFormatCurrency, useSystemProfile } from '../context/SystemProfileContext';
import { ArrowLeft, Receipt, DollarSign, Calendar, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import { validatePositiveNumber, validateRequiredSelect, validateDateRange } from '../lib/validators';
import './screens.css';

interface FormState {
  customerId: number;
  contractId: number | null;
  opportunityId: number | null;
  amount: number;
  taxRate: number;
  status: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  terms: string;
}

const getLocalDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const InvoiceFormScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { formatCurrency, currency } = useFormatCurrency();
  const { profile } = useSystemProfile();

  const initialCustomerId = searchParams.get('customerId') ? Number(searchParams.get('customerId')) : 0;
  const initialContractId = searchParams.get('contractId') ? Number(searchParams.get('contractId')) : null;
  const initialOpportunityId = searchParams.get('opportunityId') ? Number(searchParams.get('opportunityId')) : null;

  const [form, setForm] = useState<FormState>({
    customerId: initialCustomerId,
    contractId: initialContractId,
    opportunityId: initialOpportunityId,
    amount: 0,
    taxRate: 10,
    status: 'Draft',
    issueDate: getLocalDateString(new Date()),
    dueDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return getLocalDateString(d);
    })(),
    notes: '',
    terms: 'Payment due within 30 days of invoice issue date.'
  });

  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [contractsList, setContractsList] = useState<{ id: number; number: string; title: string; value: number }[]>([]);
  const [opportunitiesList, setOpportunitiesList] = useState<{ id: number; title: string; value: number; stage?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Fetch Customers
  useEffect(() => {
    api.get<{ data: any[] }>('/api/customers?pageSize=500')
      .then(res => {
        const items = Array.isArray(res) ? res : (res?.data ?? []);
        setCustomers(items.map((c: any) => ({
          id: c.customerId ?? c.id,
          name: `${c.firstName || ''} ${c.lastName || ''}${c.companyName ? ` (${c.companyName})` : ''}`.trim()
        })));
      })
      .catch(() => {});
  }, []);

  // 2. Fetch Customer Contracts and Deals when customer is selected
  useEffect(() => {
    if (!form.customerId) {
      setContractsList([]);
      setOpportunitiesList([]);
      return;
    }

    // Contracts
    api.get<any[]>(`/api/contracts?customerId=${form.customerId}`)
      .then(res => {
        const mapped = (res || []).map(c => ({
          id: c.contractId,
          number: c.contractNumber,
          title: c.title,
          value: c.contractValue
        }));
        setContractsList(mapped);
      })
      .catch(() => setContractsList([]));

    // Opportunities
    api.get<any[]>(`/api/opportunities?customerId=${form.customerId}`)
      .then(res => {
        const list = Array.isArray(res) ? res : (res as any)?.data ?? [];
        const mapped = list.map((o: any) => ({
          id: o.opportunityId,
          title: o.title,
          value: o.estimatedValue || 0,
          stage: o.stageName
        }));
        setOpportunitiesList(mapped);
      })
      .catch(() => setOpportunitiesList([]));
  }, [form.customerId]);

  // 3. Fetch Existing Invoice on Edit
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    api.get<any>(`/api/invoices/${id}`)
      .then(inv => {
        setForm({
          customerId: inv.customerId,
          contractId: inv.contractId || null,
          opportunityId: inv.opportunityId || null,
          amount: inv.amount ?? 0,
          taxRate: inv.taxRate ?? 10,
          status: inv.status || 'Draft',
          issueDate: inv.issueDate ? inv.issueDate.slice(0, 10) : getLocalDateString(new Date()),
          dueDate: inv.dueDate ? inv.dueDate.slice(0, 10) : getLocalDateString(new Date()),
          notes: inv.notes || '',
          terms: inv.terms || 'Payment due within 30 days of invoice issue date.'
        });
      })
      .catch(() => {
        showToast('Failed to load invoice details', 'error');
        navigate('/invoices');
      })
      .finally(() => setIsLoading(false));
  }, [id, navigate]);

  // Auto-fill amount from selected contract
  const handleContractChange = (contractIdVal: number | null) => {
    setForm(prev => {
      const selectedContract = contractsList.find(c => c.id === contractIdVal);
      return {
        ...prev,
        contractId: contractIdVal,
        amount: selectedContract ? selectedContract.value : prev.amount
      };
    });
  };

  // Auto-fill amount from selected opportunity
  const handleOpportunityChange = (oppIdVal: number | null) => {
    setForm(prev => {
      const selectedOpp = opportunitiesList.find(o => o.id === oppIdVal);
      return {
        ...prev,
        opportunityId: oppIdVal,
        amount: selectedOpp && prev.amount === 0 ? selectedOpp.value : prev.amount
      };
    });
  };

  // Tax calculations
  const taxAmount = (Number(form.amount) || 0) * ((Number(form.taxRate) || 0) / 100);
  const totalAmount = (Number(form.amount) || 0) + taxAmount;

  const validate = () => {
    const errs: Record<string, string> = {};

    const custErr = validateRequiredSelect(form.customerId, 'Customer');
    if (custErr) errs.customerId = custErr;

    const amtErr = validatePositiveNumber(form.amount, 'Invoice amount', false);
    if (amtErr) errs.amount = amtErr;

    const taxErr = validatePositiveNumber(form.taxRate, 'Tax rate', true, 100);
    if (taxErr) errs.taxRate = taxErr;

    const dateErr = validateDateRange(form.issueDate, form.dueDate, 'Issue Date', 'Due Date');
    if (dateErr) errs.dueDate = dateErr;

    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showToast(Object.values(validationErrors)[0], 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (isEdit) {
        await api.put(`/api/invoices/${id}`, {
          amount: Number(form.amount) || 0,
          taxRate: Number(form.taxRate) || 0,
          status: form.status,
          issueDate: new Date(form.issueDate).toISOString(),
          dueDate: new Date(form.dueDate).toISOString(),
          contractId: form.contractId || null,
          opportunityId: form.opportunityId || null,
          notes: form.notes.trim() || null,
          terms: form.terms.trim() || null
        });
        showToast('Invoice updated successfully.', 'success');
      } else {
        await api.post('/api/invoices', {
          customerId: form.customerId,
          contractId: form.contractId || null,
          opportunityId: form.opportunityId || null,
          amount: Number(form.amount) || 0,
          taxRate: Number(form.taxRate) || 0,
          issueDate: new Date(form.issueDate).toISOString(),
          dueDate: new Date(form.dueDate).toISOString(),
          notes: form.notes.trim() || null,
          terms: form.terms.trim() || null
        });
        showToast('Invoice created successfully.', 'success');
      }
      navigate('/invoices');
    } catch (err: any) {
      showToast(err.message || 'Failed to save invoice.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="invoice-form-container animate-fade-in" style={{ maxWidth: '860px', margin: '0 auto', paddingBottom: '3rem' }}>
        
        {/* Header Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/invoices')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={16} /> Back to Invoices
          </Button>
        </div>

        <Card className="glass-panel" style={{ borderRadius: '16px', padding: '2rem', border: '1px solid var(--border-color)' }}>
          {/* Card Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Receipt size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {isEdit ? 'Edit Commercial Invoice' : 'Create Commercial Invoice'}
              </h1>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {isEdit ? 'Update line items, tax rate, and payment schedule.' : 'Issue a new billing statement with online payment checkout and bank transfer tracking.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Customer Selection */}
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                Customer Account *
              </label>
              <SearchableSelect
                options={customers.map(c => ({ value: String(c.id), label: c.name }))}
                value={form.customerId ? String(form.customerId) : ''}
                onChange={val => setForm(f => ({ ...f, customerId: Number(val), contractId: null, opportunityId: null }))}
                placeholder="Search and select customer..."
                disabled={isEdit}
              />
              {errors.customerId && <span className="form-error" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.customerId}</span>}
            </div>

            {/* Linked Contract & Opportunity Selectors */}
            {form.customerId > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    Linked Signed Contract (Optional)
                  </label>
                  <SearchableSelect
                    options={[
                      { value: '0', label: 'None (Standalone Invoice)' },
                      ...contractsList.map(c => ({
                        value: String(c.id),
                        label: `#${c.number} — ${c.title} ($${c.value.toLocaleString()})`
                      }))
                    ]}
                    value={String(form.contractId || '0')}
                    onChange={val => handleContractChange(val === '0' ? null : Number(val))}
                    placeholder="Select signed contract..."
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    Linked Opportunity / Deal (Optional)
                  </label>
                  <SearchableSelect
                    options={[
                      { value: '0', label: 'None' },
                      ...opportunitiesList.map(o => ({
                        value: String(o.id),
                        label: `${o.title} ($${o.value.toLocaleString()})`
                      }))
                    ]}
                    value={String(form.opportunityId || '0')}
                    onChange={val => handleOpportunityChange(val === '0' ? null : Number(val))}
                    placeholder="Select associated deal..."
                  />
                </div>
              </div>
            )}

            {/* Financial Amounts Strip */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              background: 'var(--bg-secondary)',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                  Base Amount ($ USD) *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={form.amount || ''}
                  onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                />
                {errors.amount && <span className="form-error" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.amount}</span>}
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                  Tax Rate (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  placeholder="10"
                  value={form.taxRate}
                  onChange={e => setForm(f => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))}
                />
                {errors.taxRate && <span className="form-error" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.taxRate}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Calculated Total Due
                </span>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                  {formatCurrency(totalAmount)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Includes {formatCurrency(taxAmount)} tax
                </span>
              </div>
            </div>

            {/* Date Range: Issue Date & Due Date */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                  Issue Date *
                </label>
                <Input
                  type="date"
                  value={form.issueDate}
                  onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                  Payment Due Date *
                </label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                />
                {errors.dueDate && <span className="form-error" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.dueDate}</span>}
              </div>
            </div>

            {/* Status Selector for Edit Mode */}
            {isEdit && (
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                  Invoice Status
                </label>
                <select
                  className="filter-select"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent (Unpaid)</option>
                  <option value="PartiallyPaid">Partially Paid</option>
                  <option value="Paid">Paid in Full</option>
                  <option value="PendingVerification">Pending Bank Verification</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            )}

            {/* Terms & Conditions */}
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                Payment Terms &amp; Conditions
              </label>
              <Input
                placeholder="e.g. Net 30. Wire transfer or online card checkout."
                value={form.terms}
                onChange={e => setForm(f => ({ ...f, terms: e.target.value }))}
                maxLength={200}
              />
            </div>

            {/* Internal Notes */}
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                Internal Notes (Optional)
              </label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Add purchase order numbers, internal references, or milestone notes..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {/* Form Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1.25rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border-color)'
            }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/invoices')}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || isLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {isSaving ? 'Saving Invoice...' : (isEdit ? 'Update Invoice' : 'Create Invoice')}
              </Button>
            </div>

          </form>
        </Card>
      </div>
    </Layout>
  );
};
export default InvoiceFormScreen;
