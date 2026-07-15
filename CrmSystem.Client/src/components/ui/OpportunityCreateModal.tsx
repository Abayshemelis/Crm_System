import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { DatePicker } from './DatePicker';
import { api } from '../../lib/api';
import { X } from 'lucide-react';
import '../../screens/screens.css';

interface Customer {
  customerId: number;
  firstName: string;
  lastName: string;
  companyName?: string;
}

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
}

export const OpportunityCreateModal: React.FC<OpportunityCreateModalProps> = ({
  isOpen,
  onCancel,
  onCreated
}) => {
  const [customerId, setCustomerId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stageId, setStageId] = useState<string>('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [ownerId, setOwnerId] = useState<string>('');
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stages, setStages] = useState<OpportunityStage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setCustomerId('');
      setTitle('');
      setDescription('');
      setStageId('');
      setEstimatedValue('');
      setExpectedCloseDate('');
      setOwnerId('');
      setError(null);
      setErrors({});
      
      // Load dropdown data
      Promise.all([
        api.get<{ data: Customer[] }>('/api/customers?page=1&pageSize=100'),
        api.get<OpportunityStage[]>('/api/opportunitystages'),
        api.get<User[]>('/api/users')
      ]).then(([custResponse, stageData, userData]) => {
        setCustomers(custResponse.data ?? []);
        setStages((stageData ?? []).sort((a, b) => a.sortOrder - b.sortOrder));
        setUsers(userData ?? []);
        
        // Set default stage to first stage (usually "New")
        if (stageData && stageData.length > 0) {
          const firstStage = stageData.sort((a, b) => a.sortOrder - b.sortOrder)[0];
          setStageId(String(firstStage.opportunityStageId));
        }
      }).catch(err => {
        console.error('Failed to load dropdown data:', err);
        setError('Failed to load required data. Please try again.');
      });
    }
  }, [isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!customerId) newErrors.customerId = 'Customer is required.';
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
        customerId: Number(customerId),
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
        </div>
        
        <div className="modal-body">
          {error && (
            <div className="error-banner" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}
          
          <div className="form-grid">
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Customer *</label>
              <select
                className="input-field"
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
              >
                <option value="">Select a customer</option>
                {customers.map(c => (
                  <option key={c.customerId} value={c.customerId}>
                    {c.firstName} {c.lastName} {c.companyName ? `(${c.companyName})` : ''}
                  </option>
                ))}
              </select>
              {errors.customerId && <div className="field-error">{errors.customerId}</div>}
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
