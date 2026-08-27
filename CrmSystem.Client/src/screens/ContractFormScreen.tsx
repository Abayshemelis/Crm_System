import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';
import { ArrowLeft, FileText, Calendar, DollarSign, User, Briefcase, FileCheck } from 'lucide-react';
import { validateName, validatePositiveNumber, validateRequiredSelect, validateDateRange } from '../lib/validators';
import './screens.css';

interface FormState {
  customerId: number;
  opportunityId: number;
  title: string;
  contractValue: number;
  status: string;
  startDate: string;
  endDate: string;
  notes: string;
}

export const ContractFormScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const initialCustomerId = searchParams.get('customerId') ? Number(searchParams.get('customerId')) : 0;
  const initialOpportunityId = searchParams.get('opportunityId') ? Number(searchParams.get('opportunityId')) : 0;

  const [form, setForm] = useState<FormState>({
    customerId: initialCustomerId,
    opportunityId: initialOpportunityId,
    title: '',
    contractValue: 10000,
    status: 'Draft',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    notes: ''
  });

  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [opportunities, setOpportunities] = useState<{ id: number; title: string; value: number; stage: string }[]>([]);
  const [loadingOpps, setLoadingOpps] = useState(false);
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

  // 2. Fetch Opportunities when customer changes
  useEffect(() => {
    if (!form.customerId) {
      setOpportunities([]);
      return;
    }
    setLoadingOpps(true);
    api.get<any>(`/api/opportunities?customerId=${form.customerId}`)
      .then(raw => {
        const list: any[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
        setOpportunities(list.map((o: any) => ({
          id: Number(o.opportunityId),
          title: String(o.title ?? ''),
          value: Number(o.estimatedValue ?? 0),
          stage: String(o.stageName ?? 'Deal')
        })));
      })
      .catch(() => setOpportunities([]))
      .finally(() => setLoadingOpps(false));
  }, [form.customerId]);

  // 3. Fetch Existing Contract on Edit
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    api.get<any>(`/api/contracts/${id}`)
      .then(c => {
        setForm({
          customerId: c.customerId,
          opportunityId: c.opportunityId || 0,
          title: c.title || '',
          contractValue: c.contractValue ?? 0,
          status: c.status || 'Draft',
          startDate: c.startDate ? c.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
          endDate: c.endDate ? c.endDate.slice(0, 10) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          notes: c.notes || ''
        });
      })
      .catch(() => {
        showToast('Failed to load contract details', 'error');
        navigate('/contracts');
      })
      .finally(() => setIsLoading(false));
  }, [id, navigate]);

  // Auto-fill value & title when opportunity is picked
  const handleOpportunityChange = (oppId: number) => {
    setForm(prev => {
      const selectedOpp = opportunities.find(o => o.id === oppId);
      return {
        ...prev,
        opportunityId: oppId,
        contractValue: selectedOpp?.value ? selectedOpp.value : prev.contractValue,
        title: prev.title.trim() === '' && selectedOpp?.title ? `${selectedOpp.title} - Service Contract` : prev.title
      };
    });
  };

  const validate = () => {
    const errs: Record<string, string> = {};

    const custErr = validateRequiredSelect(form.customerId, 'Customer');
    if (custErr) errs.customerId = custErr;

    const titleErr = validateName(form.title, 'Contract title', 2, 150);
    if (titleErr) errs.title = titleErr;

    const valErr = validatePositiveNumber(form.contractValue, 'Contract value', true);
    if (valErr) errs.contractValue = valErr;

    const dateErr = validateDateRange(form.startDate, form.endDate, 'Start Date', 'End Date');
    if (dateErr) errs.endDate = dateErr;

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
        await api.put(`/api/contracts/${id}`, {
          title: form.title.trim(),
          contractValue: Number(form.contractValue) || 0,
          status: form.status,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          notes: form.notes.trim() || null,
          opportunityId: form.opportunityId || null
        });
        showToast('Contract updated successfully.', 'success');
      } else {
        await api.post('/api/contracts', {
          customerId: form.customerId,
          opportunityId: form.opportunityId || null,
          title: form.title.trim(),
          contractValue: Number(form.contractValue) || 0,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          notes: form.notes.trim() || null
        });
        showToast('Contract created successfully.', 'success');
      }
      navigate('/contracts');
    } catch (err: any) {
      showToast(err.message || 'Failed to save contract.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="contract-form-container animate-fade-in" style={{ maxWidth: '860px', margin: '0 auto', paddingBottom: '3rem' }}>
        
        {/* Header Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/contracts')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={16} /> Back to Contracts
          </Button>
        </div>

        <Card className="glass-panel" style={{ borderRadius: '16px', padding: '2rem', border: '1px solid var(--border-color)' }}>
          {/* Card Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.12)',
              color: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FileCheck size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {isEdit ? 'Edit Contract' : 'Create New Contract'}
              </h1>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {isEdit ? 'Update commercial terms, timeline, and deal association.' : 'Generate a formal contract document with electronic signing capability.'}
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
                onChange={val => setForm(f => ({ ...f, customerId: Number(val), opportunityId: 0 }))}
                placeholder="Search and select customer..."
                disabled={isEdit}
              />
              {errors.customerId && <span className="form-error" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.customerId}</span>}
            </div>

            {/* Linked Deal / Opportunity */}
            {form.customerId > 0 && (
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                  Linked Opportunity / Deal (Optional)
                </label>
                <SearchableSelect
                  options={[
                    { value: '0', label: 'None (Standalone Contract)' },
                    ...opportunities.map(o => ({
                      value: String(o.id),
                      label: `${o.title} — $${o.value.toLocaleString()} (${o.stage})`
                    }))
                  ]}
                  value={String(form.opportunityId || '0')}
                  onChange={val => handleOpportunityChange(Number(val))}
                  placeholder={loadingOpps ? 'Loading deals...' : 'Select associated deal...'}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Linking a deal automatically synchronizes contract value and links the sales closing lifecycle.
                </span>
              </div>
            )}

            {/* Contract Title */}
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                Contract Title *
              </label>
              <Input
                placeholder="e.g. Master Services Agreement — Annual Retainer"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                maxLength={150}
              />
              {errors.title && <span className="form-error" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.title}</span>}
            </div>

            {/* Contract Value & Status */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                  Contract Value ($ USD) *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={form.contractValue}
                  onChange={e => setForm(f => ({ ...f, contractValue: parseFloat(e.target.value) || 0 }))}
                />
                {errors.contractValue && <span className="form-error" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.contractValue}</span>}
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                  Status
                </label>
                <select
                  className="filter-select"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  <option value="Draft">Draft (Unsigned)</option>
                  <option value="Active">Active</option>
                  <option value="Signed">Signed</option>
                  <option value="Expired">Expired</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Date Range: Start & End Date */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                  Effective Start Date *
                </label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={e => {
                    const newStart = e.target.value;
                    setForm(f => {
                      const updates: any = { startDate: newStart };
                      // Auto-push end date forward if start date surpasses it
                      if (f.endDate && newStart && new Date(f.endDate) < new Date(newStart)) {
                        updates.endDate = newStart;
                      }
                      return { ...f, ...updates };
                    });
                  }}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                  Expiration / End Date *
                </label>
                <Input
                  type="date"
                  min={form.startDate}
                  value={form.endDate}
                  onChange={e => {
                    const newEnd = e.target.value;
                    if (newEnd && form.startDate && new Date(newEnd) < new Date(form.startDate)) {
                      setForm(f => ({ ...f, endDate: form.startDate }));
                    } else {
                      setForm(f => ({ ...f, endDate: newEnd }));
                    }
                  }}
                />
                {errors.endDate && <span className="form-error" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.endDate}</span>}
              </div>
            </div>

            {/* Notes / Special Terms */}
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                Contract Notes &amp; Terms (Optional)
              </label>
              <textarea
                className="input-field"
                rows={4}
                placeholder="Include commercial terms, deliverables, SLA specifications, or renewal milestones..."
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
                onClick={() => navigate('/contracts')}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || isLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {isSaving ? 'Saving Contract...' : (isEdit ? 'Update Contract' : 'Create Contract')}
              </Button>
            </div>

          </form>
        </Card>
      </div>
    </Layout>
  );
};
export default ContractFormScreen;
