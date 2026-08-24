import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DatePicker } from '../components/ui/DatePicker';
import { CustomerSearchSelect } from '../components/ui/CustomerSearchSelect';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Skeleton } from '../components/ui/Skeleton';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';
import { ArrowLeft, DollarSign, Calendar, Target, User as UserIcon, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { getExpectedCloseDateStatus, getStandardCloseDatePresets } from '../lib/dateUtils';
import './screens.css';

interface OpportunityStage {
  opportunityStageId: number;
  name: string;
  sortOrder: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export const OpportunityFormScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isEdit = Boolean(id);
  const preselectedCustomerId = searchParams.get('customerId') ? Number(searchParams.get('customerId')) : null;

  const [customerId, setCustomerId] = useState<number | null>(preselectedCustomerId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stageId, setStageId] = useState<string>('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [ownerId, setOwnerId] = useState<string>('');

  const [stages, setStages] = useState<OpportunityStage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const defaultPresets = getStandardCloseDatePresets();
    if (!isEdit && !expectedCloseDate) {
      setExpectedCloseDate(defaultPresets[1]?.value || '');
    }

    Promise.all([
      api.get<OpportunityStage[]>('/api/opportunitystages'),
      api.get<User[]>('/api/users')
    ])
      .then(([stageData, userData]) => {
        const sorted = (stageData ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
        setStages(sorted);
        setUsers(userData ?? []);

        if (!isEdit && sorted.length > 0 && !stageId) {
          setStageId(String(sorted[0].opportunityStageId));
        }
      })
      .catch(err => {
        console.error('Failed to load lookup data:', err);
      });

    if (isEdit && id) {
      setIsLoading(true);
      api.get<any>(`/api/opportunities/${id}`)
        .then(opp => {
          setCustomerId(opp.customerId);
          setTitle(opp.title || '');
          setDescription(opp.description || '');
          setStageId(String(opp.opportunityStageId || ''));
          setEstimatedValue(String(opp.estimatedValue || ''));
          setExpectedCloseDate(opp.expectedCloseDate ? opp.expectedCloseDate.substring(0, 10) : '');
          setOwnerId(String(opp.ownerId || ''));
        })
        .catch(err => {
          console.error(err);
          showToast('Failed to load opportunity details', 'error');
          navigate('/pipeline');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [id, isEdit, navigate]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customerId) newErrors.customerId = 'Please select a customer.';
    if (!title.trim()) newErrors.title = 'Opportunity title is required.';
    if (!stageId) newErrors.stageId = 'Pipeline stage is required.';
    if (!estimatedValue.trim()) {
      newErrors.estimatedValue = 'Estimated value is required.';
    } else if (isNaN(Number(estimatedValue)) || Number(estimatedValue) < 0) {
      newErrors.estimatedValue = 'Value must be a valid positive number.';
    }
    if (!ownerId) newErrors.ownerId = 'Deal owner is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: customerId,
        title: title.trim(),
        description: description.trim() || null,
        opportunityStageId: Number(stageId),
        estimatedValue: Number(estimatedValue),
        expectedCloseDate: expectedCloseDate || null,
        ownerId: Number(ownerId)
      };

      if (isEdit && id) {
        await api.put(`/api/opportunities/${id}`, payload);
        showToast('Opportunity updated successfully', 'success');
        navigate(`/opportunities/${id}`);
      } else {
        const created = await api.post<any>('/api/opportunities', payload);
        showToast('Opportunity created successfully', 'success');
        if (created?.opportunityId) {
          navigate(`/opportunities/${created.opportunityId}`);
        } else {
          navigate('/pipeline');
        }
      }
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'An error occurred while saving the opportunity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="detail-header animate-fade-in">
          <div className="detail-header-info">
            <div>
              <h1>{isEdit ? 'Edit Opportunity' : 'New Opportunity'}</h1>
              <p>Loading details…</p>
            </div>
          </div>
        </div>
        <Card className="glass-panel">
          <Card.Content>
            <div className="form-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} variant="rect" height={60} style={{ borderRadius: '8px', animationDelay: `${i * 0.06}s` }} />
              ))}
            </div>
          </Card.Content>
        </Card>
      </Layout>
    );
  }

  const closeDateStatus = expectedCloseDate ? getExpectedCloseDateStatus(expectedCloseDate) : null;
  const presets = getStandardCloseDatePresets();

  return (
    <Layout>
      <div className="detail-header animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => navigate(isEdit && id ? `/opportunities/${id}` : '/pipeline')}>
          <ArrowLeft size={16} style={{ marginRight: 6 }} /> Back
        </Button>
        <div className="detail-header-info">
          <div>
            <h1>{isEdit ? 'Edit Opportunity' : 'New Opportunity'}</h1>
            <p>{isEdit ? 'Update pipeline deal information' : 'Create a new opportunity in your sales pipeline'}</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '880px', margin: '0 auto' }}>
        <Card className="glass-panel">
          <Card.Content>
            {apiError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '8px',
                  color: 'var(--danger, #ef4444)',
                  fontSize: '0.9rem'
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{apiError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                {/* Customer Selector */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserIcon size={15} style={{ color: 'var(--accent, #6366f1)' }} /> Customer <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
                  </label>
                  <CustomerSearchSelect
                    value={customerId}
                    onChange={(val) => {
                      setCustomerId(val);
                      if (errors.customerId) {
                        setErrors(prev => { const n = { ...prev }; delete n.customerId; return n; });
                      }
                    }}
                    error={errors.customerId}
                  />
                  {errors.customerId && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--danger, #ef4444)', marginTop: 4, display: 'block' }}>
                      {errors.customerId}
                    </span>
                  )}
                </div>

                {/* Opportunity Title */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Target size={15} style={{ color: 'var(--accent, #6366f1)' }} /> Opportunity Title <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
                  </label>
                  <Input
                    placeholder="e.g. Enterprise Cloud Migration, Annual SaaS Renewal"
                    value={title}
                    onChange={e => {
                      setTitle(e.target.value);
                      if (errors.title) setErrors(prev => { const n = { ...prev }; delete n.title; return n; });
                    }}
                    error={errors.title}
                  />
                </div>

                {/* Pipeline Stage */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TrendingUp size={15} style={{ color: 'var(--accent, #6366f1)' }} /> Pipeline Stage <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
                  </label>
                  <SearchableSelect
                    value={stageId}
                    onChange={val => {
                      setStageId(String(val));
                      if (errors.stageId) setErrors(prev => { const n = { ...prev }; delete n.stageId; return n; });
                    }}
                    options={stages.map(s => ({ value: String(s.opportunityStageId), label: s.name }))}
                    placeholder="Select pipeline stage..."
                  />
                  {errors.stageId && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--danger, #ef4444)', marginTop: 4, display: 'block' }}>
                      {errors.stageId}
                    </span>
                  )}
                </div>

                {/* Estimated Value */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={15} style={{ color: 'var(--accent, #6366f1)' }} /> Estimated Value ($) <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={estimatedValue}
                    onChange={e => {
                      setEstimatedValue(e.target.value);
                      if (errors.estimatedValue) setErrors(prev => { const n = { ...prev }; delete n.estimatedValue; return n; });
                    }}
                    error={errors.estimatedValue}
                  />
                </div>

                {/* Deal Owner */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserIcon size={15} style={{ color: 'var(--accent, #6366f1)' }} /> Deal Owner (Sales Rep) <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
                  </label>
                  <SearchableSelect
                    value={ownerId}
                    onChange={val => {
                      setOwnerId(String(val));
                      if (errors.ownerId) setErrors(prev => { const n = { ...prev }; delete n.ownerId; return n; });
                    }}
                    options={users.map(u => ({ value: String(u.id), label: `${u.name} (${u.role})` }))}
                    placeholder="Select deal owner..."
                  />
                  {errors.ownerId && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--danger, #ef4444)', marginTop: 4, display: 'block' }}>
                      {errors.ownerId}
                    </span>
                  )}
                </div>

                {/* Expected Close Date with Presets */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={15} style={{ color: 'var(--accent, #6366f1)' }} /> Expected Close Date
                    </label>
                    {closeDateStatus && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: closeDateStatus.bg,
                          color: closeDateStatus.color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Clock size={11} /> {closeDateStatus.label}
                      </span>
                    )}
                  </div>
                  <DatePicker
                    value={expectedCloseDate}
                    onChange={val => setExpectedCloseDate(val)}
                  />
                  {/* Presets */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                    {presets.map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setExpectedCloseDate(p.value)}
                        style={{
                          fontSize: '0.72rem',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: expectedCloseDate === p.value ? '1px solid var(--accent, #6366f1)' : '1px solid var(--border-color)',
                          background: expectedCloseDate === p.value ? 'var(--accent-dim, rgba(99,102,241,0.15))' : 'var(--bg-secondary)',
                          color: expectedCloseDate === p.value ? 'var(--accent, #6366f1)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontWeight: 500,
                          transition: 'all 0.15s'
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Description / Scope Notes
                  </label>
                  <textarea
                    rows={4}
                    className="form-control"
                    placeholder="Enter deal background, buyer goals, proposal details..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginTop: '2rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border-color)'
                }}
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate(isEdit && id ? `/opportunities/${id}` : '/pipeline')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? (isEdit ? 'Saving Changes...' : 'Creating Opportunity...')
                    : (isEdit ? 'Save Changes' : 'Create Opportunity')}
                </Button>
              </div>
            </form>
          </Card.Content>
        </Card>
      </div>
    </Layout>
  );
};
