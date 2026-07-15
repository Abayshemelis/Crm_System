import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { DatePicker } from './DatePicker';
import { ConfirmDialog } from './ConfirmDialog';
import { api } from '../../lib/api';
import './ui.css';

interface Company {
  companyId: number;
  name: string;
}

interface LeadConvertModalProps {
  isOpen: boolean;
  leadId: number;
  leadData: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    companyName?: string;
  };
  onCancel: () => void;
  onConverted: (customerId: number) => void;
}

export const LeadConvertModal: React.FC<LeadConvertModalProps> = ({
  isOpen,
  leadId,
  leadData,
  onCancel,
  onConverted
}) => {
  const [firstName, setFirstName] = useState(leadData.firstName);
  const [lastName, setLastName] = useState(leadData.lastName);
  const [email, setEmail] = useState(leadData.email || '');
  const [phone, setPhone] = useState(leadData.phone || '');
  const [companyId, setCompanyId] = useState<string>('');
  const [createCompany, setCreateCompany] = useState(false);
  const [companyName, setCompanyName] = useState(leadData.companyName || '');
  const [createInitialOpportunity, setCreateInitialOpportunity] = useState(false);
  const [opportunityTitle, setOpportunityTitle] = useState('');
  const [opportunityEstimatedValue, setOpportunityEstimatedValue] = useState('');
  const [opportunityExpectedCloseDate, setOpportunityExpectedCloseDate] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFirstName(leadData.firstName);
      setLastName(leadData.lastName);
      setEmail(leadData.email || '');
      setPhone(leadData.phone || '');
      setCompanyName(leadData.companyName || '');
      setCompanyId('');
      setCreateCompany(false);
      setCreateInitialOpportunity(false);
      setOpportunityTitle('');
      setOpportunityEstimatedValue('');
      setOpportunityExpectedCloseDate('');
      setError(null);
      setErrors({});
      
      // Load companies
      api.get<{ data: Company[] }>('/api/companies?page=1&pageSize=100')
        .then(res => setCompanies(res.data ?? []))
        .catch(() => setCompanies([]));
    }
  }, [isOpen, leadData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!firstName.trim()) newErrors.firstName = 'First name is required.';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required.';
    if (!email.trim()) newErrors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Email is invalid.';
    
    if (createCompany && !companyName.trim()) {
      newErrors.companyName = 'Company name is required when creating a company.';
    }
    
    if (createInitialOpportunity) {
      if (!opportunityTitle.trim()) {
        newErrors.opportunityTitle = 'Opportunity title is required.';
      }
      if (!opportunityEstimatedValue.trim()) {
        newErrors.opportunityEstimatedValue = 'Estimated value is required.';
      }
      if (!opportunityExpectedCloseDate.trim()) {
        newErrors.opportunityExpectedCloseDate = 'Expected close date is required.';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConvert = async () => {
    if (!validate()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        companyId: createCompany ? null : (companyId ? Number(companyId) : null),
        createCompany: createCompany,
        companyName: createCompany ? companyName.trim() : null,
        createInitialOpportunity: createInitialOpportunity,
        opportunityTitle: createInitialOpportunity ? opportunityTitle.trim() : null,
        opportunityEstimatedValue: createInitialOpportunity ? Number(opportunityEstimatedValue) : null,
        opportunityExpectedCloseDate: createInitialOpportunity ? opportunityExpectedCloseDate || null : null
      };
      
      const response = await api.post<{ customerId: number; companyId?: number }>(
        `/api/leads/${leadId}/convert`,
        payload
      );
      
      onConverted(response.customerId);
    } catch (err: any) {
      setError(err?.message || 'Failed to convert lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>Convert Lead to Customer</h3>
        </div>
        
        <div className="modal-body">
          {error && (
            <div className="error-banner" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}
          
          <div className="form-grid">
            <Input
              label="First Name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              error={errors.firstName}
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              error={errors.lastName}
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              error={errors.email}
            />
            <Input
              label="Phone"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              error={errors.phone}
            />
          </div>
          
          <div style={{ marginTop: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Company
            </label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={!createCompany}
                  onChange={() => setCreateCompany(false)}
                />
                <span>Link to existing company</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={createCompany}
                  onChange={() => setCreateCompany(true)}
                />
                <span>Create new company</span>
              </label>
            </div>
            
            {!createCompany ? (
              <select
                className="input-field"
                value={companyId}
                onChange={e => setCompanyId(e.target.value)}
              >
                <option value="">No company (B2C)</option>
                {companies.map(c => (
                  <option key={c.companyId} value={c.companyId}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                label="Company Name"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                error={errors.companyName}
                placeholder="Enter company name"
              />
            )}
          </div>
          
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-md)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={createInitialOpportunity}
                onChange={e => setCreateInitialOpportunity(e.target.checked)}
              />
              <span style={{ fontSize: '0.875rem' }}>
                Create an initial opportunity
              </span>
            </label>
          </div>
          
          {createInitialOpportunity && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', fontWeight: 500 }}>Opportunity Details</h4>
              <Input
                label="Title"
                value={opportunityTitle}
                onChange={e => setOpportunityTitle(e.target.value)}
                error={errors.opportunityTitle}
                placeholder="e.g., BrightPath Logistics — Initial Deal"
              />
              <Input
                label="Estimated Value ($)"
                type="number"
                value={opportunityEstimatedValue}
                onChange={e => setOpportunityEstimatedValue(e.target.value)}
                error={errors.opportunityEstimatedValue}
                placeholder="15000"
                style={{ marginTop: '0.75rem' }}
              />
              <DatePicker
                label="Expected Close Date"
                value={opportunityExpectedCloseDate}
                onChange={e => setOpportunityExpectedCloseDate(e)}
                error={errors.opportunityExpectedCloseDate}
              />
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConvert}
            disabled={loading}
          >
            {loading ? 'Converting...' : 'Convert to Customer'}
          </Button>
        </div>
      </div>
    </div>
  );
};
