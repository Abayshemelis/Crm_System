import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { AuditHistoryTable } from '../components/audit/AuditHistoryTable';
import { api } from '../lib/api';
import Attachments from '../components/attachments/Attachments';
import { ArrowLeft, Globe, MapPin, Briefcase, Mail, Phone, Tag, Link, X, History } from 'lucide-react';
import './screens.css';

interface CompanyDetail {
  companyId: number;
  name: string;
  industry?: string;
  companySize?: string;
  website?: string;
  address?: string;
  phone?: string;
  email?: string;
  sourceId?: number;
  sourceName?: string;
  assignedRepId?: number | null;
  totalOpenPipelineValue: number;
  contacts: Contact[];
}

interface Contact {
  customerId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface Attachment {
  attachmentId: number;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  uploadedByName: string;
  uploadedAt: string;
}

interface Lookup {
  id: number;
  name: string;
}

interface EditFormState {
  name: string;
  industry: string;
  companySize: string;
  website: string;
  address: string;
  phone: string;
  email: string;
  sourceId: string;
}

type TabId = 'contacts' | 'attachments' | 'audit';

export const CompanyDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [attachmentsCount, setAttachmentsCount] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>('contacts');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [sources, setSources] = useState<Lookup[]>([]);
  const [editForm, setEditForm] = useState<EditFormState>({
    name: '',
    industry: '',
    companySize: '',
    website: '',
    address: '',
    phone: '',
    email: '',
    sourceId: ''
  });

  const fetchSources = useCallback(() => {
    api.get<Lookup[]>('/api/sources')
      .then(setSources)
      .catch(() => setSources([]));
  }, []);

  const fetchCompany = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const companyData = await api.get<CompanyDetail>(`/api/companies/${id}`);
      setCompany(companyData);
      setEditForm({
        name: companyData.name,
        industry: companyData.industry ?? '',
        companySize: companyData.companySize ?? '',
        website: companyData.website ?? '',
        address: companyData.address ?? '',
        phone: companyData.phone ?? '',
        email: companyData.email ?? '',
        sourceId: companyData.sourceId ? String(companyData.sourceId) : ''
      });
    } catch {
      navigate('/companies');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  const handleRemoveCustomer = async (customerId: number, name: string) => {
    if (!window.confirm(`Remove ${name} from this company's contacts?`)) return;
    try {
      await api.post('/api/customers/bulk', {
        customerIds: [customerId],
        action: 'remove_company'
      });
      fetchCompany();
    } catch (error: any) {
      console.error('Error removing customer:', error);
      alert(error.message || 'Failed to remove customer.');
    }
  };

  const fetchAttachmentsCount = useCallback(async () => {
    if (!id) return;
    try {
      const attachments = await api.get<Attachment[]>(`/api/attachments?companyId=${id}`);
      setAttachmentsCount(attachments?.length ?? 0);
    } catch {
      setAttachmentsCount(0);
    }
  }, [id]);

  useEffect(() => {
    fetchSources();
    fetchCompany();
    fetchAttachmentsCount();
  }, [fetchSources, fetchCompany, fetchAttachmentsCount]);

  const handleEditChange = (field: keyof EditFormState, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    setSaveError(null);
    setSuccessMessage(null);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!editForm.name.trim()) errors.name = 'Company name is required.';
    if (editForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      errors.email = 'Email address is invalid.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveCompany = async () => {
    if (!company || !id) return;
    if (!validateForm()) return;
    setSaving(true);
    setSaveError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        name: editForm.name.trim(),
        industry: editForm.industry.trim() || null,
        companySize: editForm.companySize.trim() || null,
        website: editForm.website.trim() || null,
        address: editForm.address.trim() || null,
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null,
        sourceId: editForm.sourceId ? Number(editForm.sourceId) : null,
        assignedRepId: company.assignedRepId ?? null
      };

      const updated = await api.put<CompanyDetail>(`/api/companies/${id}`, payload);
      setCompany(updated);
      setSuccessMessage('Company updated successfully.');
      setIsEditing(false);
      setEditForm({
        name: updated.name,
        industry: updated.industry ?? '',
        companySize: updated.companySize ?? '',
        website: updated.website ?? '',
        address: updated.address ?? '',
        phone: updated.phone ?? '',
        email: updated.email ?? '',
        sourceId: updated.sourceId ? String(updated.sourceId) : ''
      });
    } catch (error: any) {
      setSaveError(error?.message ?? 'Unable to save company details.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCompany = async () => {
    if (!company || !window.confirm('Delete this company? This cannot be undone.')) return;
    await api.delete(`/api/companies/${company.companyId}`);
    navigate('/companies');
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  if (isLoading || !company) {
    return (
      <Layout>
        <div className="detail-skeleton">
          <div className="skeleton-header" style={{ marginBottom: 'var(--space-6)' }}>
            <Skeleton variant="avatar" className="skeleton-avatar-large" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }} />
            <div className="skeleton-header-text">
              <Skeleton variant="text" className="skeleton-header-title" />
              <Skeleton variant="text" className="skeleton-header-subtitle" />
            </div>
          </div>

          <Card className="glass-panel skeleton-sidebar">
            <Card.Content>
              <Skeleton variant="text" style={{ width: '60%', marginBottom: '1rem' }} />
              <Skeleton variant="text" style={{ marginBottom: '8px' }} />
              <Skeleton variant="text" style={{ marginBottom: '8px' }} />
              <Skeleton variant="text" style={{ marginBottom: '8px' }} />
              <Skeleton variant="text" style={{ marginBottom: '8px' }} />
            </Card.Content>
          </Card>

          <div className="skeleton-main">
            <div className="tabs-bar">
              <Skeleton variant="rect" style={{ width: 100, height: 30, borderRadius: 'var(--radius-sm)' }} />
              <Skeleton variant="rect" style={{ width: 120, height: 30, borderRadius: 'var(--radius-sm)' }} />
            </div>
            <Card className="glass-panel">
              <Card.Content>
                <Skeleton variant="text" style={{ width: '40%', marginBottom: '1rem' }} />
                <Skeleton variant="text" style={{ marginBottom: '8px' }} />
                <Skeleton variant="text" style={{ marginBottom: '8px' }} />
                <Skeleton variant="text" style={{ width: '60%' }} />
              </Card.Content>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="detail-header animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => navigate('/companies')}>
          <ArrowLeft size={16} style={{ marginRight: 6 }} /> Back
        </Button>
        <div className="detail-header-info">
          <div className="company-avatar">{company.name[0]}</div>
          <div>
            <h1>{company.name}</h1>
            <p>{company.industry ?? 'No industry specified'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {!isEditing ? (
            <Button onClick={() => { setIsEditing(true); setSuccessMessage(null); setSaveError(null); }}>Edit</Button>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button size="sm" disabled={saving} onClick={saveCompany}>Save</Button>
              <Button variant="ghost" size="sm" disabled={saving} onClick={() => {
                setIsEditing(false);
                setFormErrors({});
                setSaveError(null);
                setEditForm({
                  name: company.name,
                  industry: company.industry ?? '',
                  companySize: company.companySize ?? '',
                  website: company.website ?? '',
                  address: company.address ?? '',
                  phone: company.phone ?? '',
                  email: company.email ?? '',
                  sourceId: company.sourceId ? String(company.sourceId) : ''
                });
              }}>
                Cancel
              </Button>
            </div>
          )}
          <Button variant="danger" size="sm" onClick={deleteCompany}>Delete</Button>
        </div>
      </div>

      <div className="detail-layout animate-fade-in">
        <Card className="glass-panel detail-sidebar">
          <Card.Content>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Company details</h3>
            </div>

            {saveError && <div className="form-error-banner" style={{ marginBottom: '1rem' }}>{saveError}</div>}
            {successMessage && <div className="form-success-banner" style={{ marginBottom: '1rem' }}>{successMessage}</div>}

            {isEditing ? (
              <div className="form-grid">
                <Input label="Name" value={editForm.name} onChange={e => handleEditChange('name', e.target.value)} error={formErrors.name} />
                <Input label="Industry" value={editForm.industry} onChange={e => handleEditChange('industry', e.target.value)} error={formErrors.industry} />
                <Input label="Company Size" value={editForm.companySize} onChange={e => handleEditChange('companySize', e.target.value)} error={formErrors.companySize} />
                <div className="input-wrapper">
                  <label className="input-label">Source</label>
                  <select className="input-field" value={editForm.sourceId} onChange={e => handleEditChange('sourceId', e.target.value)}>
                    <option value="">None</option>
                    {sources.map(source => (
                      <option key={source.id} value={source.id}>{source.name}</option>
                    ))}
                  </select>
                </div>
                <Input label="Website" value={editForm.website} onChange={e => handleEditChange('website', e.target.value)} error={formErrors.website} />
                <Input label="Address" value={editForm.address} onChange={e => handleEditChange('address', e.target.value)} error={formErrors.address} />
                <Input label="Phone" value={editForm.phone} onChange={e => handleEditChange('phone', e.target.value)} error={formErrors.phone} />
                <Input label="Email" type="email" value={editForm.email} onChange={e => handleEditChange('email', e.target.value)} error={formErrors.email} />
              </div>
            ) : (
              <>
                <div className="customer-details">
                  {company.companySize && <div className="detail-row"><Tag size={15} /><span>{company.companySize}</span></div>}
                  {company.sourceName && <div className="detail-row"><Briefcase size={15} /><span>{company.sourceName}</span></div>}
                  {company.website && <div className="detail-row"><Link size={15} /><a href={company.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>{company.website}</a></div>}
                  {company.phone && <div className="detail-row"><Phone size={15} /><span>{company.phone}</span></div>}
                  {company.email && <div className="detail-row"><Mail size={15} /><span>{company.email}</span></div>}
                  {company.address && <div className="detail-row"><MapPin size={15} /><span>{company.address}</span></div>}
                </div>

                <div style={{ marginTop: '1.5rem', display: 'grid', gap: '0.75rem' }}>
                  <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.07)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>OPEN PIPELINE</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCurrency(company.totalOpenPipelineValue)}</p>
                  </div>
                  <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.07)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>CONTACTS</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{company.contacts.length}</p>
                  </div>
                </div>
              </>
            )}
          </Card.Content>
        </Card>

        <div className="detail-main">
          <div className="tabs-bar">
            <button className={`tab-btn ${activeTab === 'contacts' ? 'tab-active' : ''}`} onClick={() => setActiveTab('contacts')}>
              Contacts ({company.contacts.length})
            </button>
            <button className={`tab-btn ${activeTab === 'attachments' ? 'tab-active' : ''}`} onClick={() => setActiveTab('attachments')}>
              Attachments ({attachmentsCount})
            </button>
            <button className={`tab-btn ${activeTab === 'audit' ? 'tab-active' : ''}`} onClick={() => setActiveTab('audit')}>
              <History size={14} style={{ marginRight: 4 }} /> Audit History
            </button>
          </div>

          <Card className="glass-panel">
            <Card.Content>
              {activeTab === 'contacts' && (
                <div className="contact-list">
                  {company.contacts.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No contacts linked to this company.</p>}
                  {company.contacts.map(c => (
                    <div key={c.customerId} className="contact-row" onClick={() => navigate(`/customers/${c.customerId}`)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center' }}>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          style={{ color: 'var(--accent-red, #ef4444)', fontSize: '0.75rem', padding: '4px 8px', height: 'auto' }} 
                          onClick={() => handleRemoveCustomer(c.customerId, `${c.firstName} ${c.lastName}`)}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="customer-avatar" style={{ width: 36, height: 36, fontSize: '0.875rem' }}>{c.firstName[0]}{c.lastName[0]}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{c.firstName} {c.lastName}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{c.email}</p>
                      </div>
                      {c.phone && (
                        <div style={{ display: 'flex', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                          <div className="detail-row" style={{ margin: 0 }}><Phone size={13} /><span style={{ fontSize: '0.8rem' }}>{c.phone}</span></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'attachments' && (
                <Attachments entity="company" entityId={Number(id)} onCountChange={setAttachmentsCount} />
              )}

              {activeTab === 'audit' && (
                <AuditHistoryTable entityType="companies" entityId={Number(id)} />
              )}
            </Card.Content>
          </Card>
        </div>
      </div>
    </Layout>
  );
};