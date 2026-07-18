import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { DatePicker } from './DatePicker';
import { CustomerSearchSelect } from './CustomerSearchSelect';
import { api } from '../../lib/api';
import { X } from 'lucide-react';
import '../../screens/screens.css';

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

interface OpportunityCreateModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onCreated: () => void;
  preselectedCustomerId?: number;
}

export const OpportunityCreateModal: React.FC<OpportunityCreateModalProps> = ({
  isOpen,
  onCancel,
  onCreated,
  preselectedCustomerId
}) => {
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stageId, setStageId] = useState<string>('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [ownerId, setOwnerId] = useState<string>('');

  const [stages, setStages] = useState<OpportunityStage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setCustomerId(preselectedCustomerId || null);
      setTitle('');
      setDescription('');
      setStageId('');
      setEstimatedValue('');
      setExpectedCloseDate('');
      setOwnerId('');
      setError(null);
      setErrors({});

      // Load dropdown data (stages, users)
      Promise.all([
        api.get<OpportunityStage[]>('/api/opportunitystages'),
        api.get<User[]>('/api/users')
      ]).then(([stageData, userData]) => {
        const sorted = (stageData ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
        setStages(sorted);
        setUsers(userData ?? []);

        // Set default stage to first stage (usually "New")
        if (sorted.length > 0) {
          setStageId(String(sorted[0].opportunityStageId));
        }
      }).catch(err => {
        console.error('Failed to load dropdown data:', err);
        setError('Failed to load required data. Please try again.');
      });
    }
  }, [isOpen, preselectedCustomerId]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customerId) newErrors.customerId = 'Please select an existing customer.';
    if (!title.trim()) newErrors.title = 'Title is required.';
    if (!stageId) newErrors.stageId = 'Stage is required.';
    if (!estimatedValue.trim()) newErrors.estimatedValue = 'Estimated value is required.';
    else if (Number(estimatedValue) < 0) newErrors.estimatedValue = 'Estimated value must be positive.';
    if (!ownerId) newErrors.ownerId = 'Owner is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;

    setLoading(true);
    setError(null);

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

      await api.post('/api/opportunities', payload);
      onCreated();
    } catch (err: any) {
      setError(err?.message || 'Failed to create opportunity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>Create New Opportunity</h3>
          <button className="icon-btn" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-banner" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div className="form-grid">
            {/* ── Customer section ── */}
            <div style={{ gridColumn: '1 / -1', marginBottom: '0.25rem' }}>
              <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Customer Information
              </h4>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <CustomerSearchSelect
                label="Customer *"
                value={customerId}
                onChange={setCustomerId}
                error={errors.customerId}
                disabled={!!preselectedCustomerId}
                placeholder="Search for an existing customer..."
              />
              {preselectedCustomerId && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Customer is pre-selected from the detail page and cannot be changed.
                </p>
              )}
            </div>

            {/* ── Opportunity section ── */}
            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', marginBottom: '0.25rem' }}>
              <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Opportunity Details
              </h4>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <Input
                label="Title *"
                value={title}
                onChange={e => setTitle(e.target.value)}
                error={errors.title}
                placeholder="e.g., Q4 Software License Deal"
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Description</label>
              <textarea
                className="input-field"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Opportunity description..."
                style={{ minHeight: '80px' }}
              />
            </div>

            <div>
              <label className="input-label">Stage *</label>
              <select
                className="input-field"
                value={stageId}
                onChange={e => setStageId(e.target.value)}
              >
                <option value="">Select a stage</option>
                {stages.map(s => (
                  <option key={s.opportunityStageId} value={s.opportunityStageId}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.stageId && <div className="field-error">{errors.stageId}</div>}
            </div>

            <div>
              <Input
                label="Estimated Value ($) *"
                type="number"
                step="0.01"
                min="0"
                value={estimatedValue}
                onChange={e => setEstimatedValue(e.target.value)}
                error={errors.estimatedValue}
                placeholder="0.00"
              />
            </div>

            <div>
              <DatePicker
                label="Expected Close Date"
                value={expectedCloseDate}
                onChange={e => setExpectedCloseDate(e)}
              />
            </div>

            <div>
              <label className="input-label">Owner *</label>
              <select
                className="input-field"
                value={ownerId}
                onChange={e => setOwnerId(e.target.value)}
              >
                <option value="">Select an owner</option>
                {users.filter(u => u.isActive).map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              {errors.ownerId && <div className="field-error">{errors.ownerId}</div>}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Opportunity'}
          </Button>
        </div>
      </div>
    </div>
  );
};
