import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { AuditHistory } from '../components/audit/AuditHistory';
import { api } from '../lib/api';
import { ArrowLeft, Mail, Phone, MapPin, Building2, Tag, X, Plus, History } from 'lucide-react';
import Attachments from '../components/attachments/Attachments';
import './screens.css';

interface Customer {
  customerId: number; firstName: string; lastName: string;
  email: string; phone?: string; jobTitle?: string;
  sourceId?: number; sourceName?: string;
  companyId?: number; companyName?: string;
  assignedRepId: number;
  tags?: CustomerTag[];
}
interface CustomerTag { tagId: number; name: string; }
interface TagItem { tagId: number; name: string; }
interface Attachment {
  attachmentId: number; fileName: string; fileUrl: string;
  fileSizeBytes: number; uploadedByName: string; uploadedAt: string;
  contentType?: string | null;
}
interface Lookup { id: number; name: string }
interface EditFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  companyId: string;
  sourceId: string;
}

type TabId = 'profile' | 'tags' | 'attachments' | 'audit';

export const CustomerDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [attachmentsCount, setAttachmentsCount] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Lookup[]>([]);
  const [sources, setSources] = useState<Lookup[]>([]);
  const [editForm, setEditForm] = useState<EditFormState>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
    companyId: '',
    sourceId: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [auditRefreshTrigger, setAuditRefreshTrigger] = useState(0);

  const fetchAttachmentCount = useCallback(async () => {
    if (!id) return;
    try {
      const attachments = await api.get<Attachment[]>(`/api/attachments?customerId=${id}`);
      setAttachmentsCount(attachments?.length ?? 0);
    } catch {
      setAttachmentsCount(0);
    }
  }, [id]);

  useEffect(() => {
    api.get<Lookup[]>('/api/sources')
      .then(setSources)
      .catch(() => { });
    api.get<{ data: { companyId: number; name: string }[] }>('/api/companies?page=1&pageSize=100')
      .then(res => setCompanies((res.data ?? []).map(c => ({ id: c.companyId, name: c.name }))))
      .catch(() => { });
  }, []);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [cust, tags] = await Promise.all([
        api.get<Customer>(`/api/customers/${id}`),
        api.get<TagItem[]>('/api/tags')
      ]);
      setCustomer(cust);
      setAllTags(tags ?? []);
      setEditForm({
        firstName: cust.firstName,
        lastName: cust.lastName,
        email: cust.email,
        phone: cust.phone ?? '',
        jobTitle: cust.jobTitle ?? '',
        companyId: cust.companyId ? String(cust.companyId) : '',
        sourceId: cust.sourceId ? String(cust.sourceId) : ''
      });
      await fetchAttachmentCount();
    } catch {
      navigate('/customers');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate, fetchAttachmentCount]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addTag = async (tagId: number) => {
    await api.post(`/api/customers/${id}/tags`, tagId);
    fetchAll();
  };

  const removeTag = async (tagId: number) => {
    await api.delete(`/api/customers/${id}/tags/${tagId}`);
    fetchAll();
  };

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

  const validateEditForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!editForm.firstName.trim()) nextErrors.firstName = 'First name is required.';
    if (!editForm.lastName.trim()) nextErrors.lastName = 'Last name is required.';
    if (!editForm.email.trim()) nextErrors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) nextErrors.email = 'Email is invalid.';
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveChanges = async () => {
    if (!id) return;
    if (!validateEditForm()) return;
    setSaving(true); setSaveError(null); setSuccessMessage(null);

    try {
      await api.put(`/api/customers/${id}`, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        jobTitle: editForm.jobTitle.trim() || null,
        companyId: editForm.companyId ? Number(editForm.companyId) : null,
        sourceId: editForm.sourceId ? Number(editForm.sourceId) : null,
        assignedRepId: customer?.assignedRepId ?? null
      });
      setSuccessMessage('Customer updated successfully.');
      setIsEditing(false);
      fetchAll();
      // Trigger audit history refresh
      setAuditRefreshTrigger(t => t + 1);
    } catch (error: any) {
      setSaveError(error?.message ?? 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  };

  // Attachment upload/delete handled by Attachments component

  const formatBytes = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  // Loading state with skeleton
  if (isLoading || !customer) {
    return (
      <Layout>
        <div className="detail-skeleton">
          {/* Header skeleton */}
          <div className="skeleton-header" style={{ marginBottom: 'var(--space-6)' }}>
            <Skeleton variant="avatar" className="skeleton-avatar-large" />
            <div className="skeleton-header-text">
              <Skeleton variant="text" className="skeleton-header-title" />
              <Skeleton variant="text" className="skeleton-header-subtitle" />
            </div>
          </div>

          {/* Sidebar skeleton */}
          <Card className="glass-panel skeleton-sidebar">
            <Card.Content>
              <Skeleton variant="text" style={{ width: '60%', marginBottom: '1rem' }} />
              <Skeleton variant="text" style={{ marginBottom: '8px' }} />
              <Skeleton variant="text" style={{ marginBottom: '8px' }} />
              <Skeleton variant="text" style={{ marginBottom: '8px' }} />
            </Card.Content>
          </Card>

          {/* Main content skeleton */}
          <div className="skeleton-main">
            <div className="tabs-bar">
              <Skeleton variant="rect" style={{ width: 80, height: 30, borderRadius: 'var(--radius-sm)' }} />
              <Skeleton variant="rect" style={{ width: 60, height: 30, borderRadius: 'var(--radius-sm)' }} />
              <Skeleton variant="rect" style={{ width: 100, height: 30, borderRadius: 'var(--radius-sm)' }} />
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

  const assignedTagIds = new Set(customer.tags?.map(t => t.tagId) ?? []);
  const availableTags = allTags.filter(t => !assignedTagIds.has(t.tagId));

  return (
    <Layout>
      <div className="detail-header animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}>
          <ArrowLeft size={16} style={{ marginRight: 6 }} /> Back
        </Button>
        <div className="detail-header-info">
          <div className="customer-avatar large">{customer.firstName[0]}{customer.lastName[0]}</div>
          <div>
            <h1>{customer.firstName} {customer.lastName}</h1>
            <p>{customer.sourceName ?? 'No source'} {customer.companyName ? `· ${customer.companyName}` : ''}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button onClick={() => navigate(`/customers/${customer.customerId}/edit`)} size="sm">Edit</Button>
          <Button variant="danger" size="sm" onClick={async () => {
            if (!window.confirm('Delete this customer?')) return;
            await api.delete(`/api/customers/${customer.customerId}`);
            navigate('/customers');
          }}>Delete</Button>
        </div>
      </div>

      <div className="detail-layout animate-fade-in">
        {/* Left: inline edit info */}
        <Card className="glass-panel detail-sidebar">
          <Card.Content>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Contact Info</h3>
              {!isEditing ? (
                <Button variant="secondary" size="sm" onClick={() => { setIsEditing(true); setSuccessMessage(null); setSaveError(null); }}>
                  Edit
                </Button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button size="sm" disabled={saving} onClick={saveChanges}>Save</Button>
                  <Button variant="ghost" size="sm" disabled={saving} onClick={() => {
                    setIsEditing(false); setFormErrors({}); setSaveError(null); setEditForm({
                      firstName: customer.firstName,
                      lastName: customer.lastName,
                      email: customer.email,
                      phone: customer.phone ?? '',
                      jobTitle: customer.jobTitle ?? '',
                      companyId: customer.companyId ? String(customer.companyId) : '',
                      sourceId: customer.sourceId ? String(customer.sourceId) : ''
                    });
                  }}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
            {saveError && <div className="error-banner" style={{ marginBottom: '1rem' }}>{saveError}</div>}
            {successMessage && <div className="success-banner" style={{ marginBottom: '1rem' }}>{successMessage}</div>}
            {isEditing ? (
              <div className="profile-grid">
                <Input label="First Name" value={editForm.firstName} onChange={e => handleEditChange('firstName', e.target.value)} error={formErrors.firstName} />
                <Input label="Last Name" value={editForm.lastName} onChange={e => handleEditChange('lastName', e.target.value)} error={formErrors.lastName} />
                <Input label="Email" type="email" value={editForm.email} onChange={e => handleEditChange('email', e.target.value)} error={formErrors.email} />
                <Input label="Phone" value={editForm.phone} onChange={e => handleEditChange('phone', e.target.value)} error={formErrors.phone} />
                <Input label="Job Title" value={editForm.jobTitle} onChange={e => handleEditChange('jobTitle', e.target.value)} error={formErrors.jobTitle} />
                <div className="input-wrapper">
                  <label className="input-label">Source</label>
                  <select className="input-field" value={editForm.sourceId} onChange={e => handleEditChange('sourceId', e.target.value)}>
                    <option value="">None</option>
                    {sources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}
                  </select>
                </div>
                <div className="input-wrapper">
                  <label className="input-label">Company</label>
                  <select className="input-field" value={editForm.companyId} onChange={e => handleEditChange('companyId', e.target.value)}>
                    <option value="">None</option>
                    {companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <>
                <div className="customer-details">
                  <div className="detail-row"><Mail size={15} /><span>{customer.email}</span></div>
                  {customer.phone && <div className="detail-row"><Phone size={15} /><span>{customer.phone}</span></div>}
                  {customer.companyName && <div className="detail-row"><Building2 size={15} /><span>{customer.companyName}</span></div>}
                </div>
                {customer.tags && customer.tags.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>TAGS</p>
                    <div className="tag-list">{customer.tags.map(tag => <span key={tag.tagId} className="tag-badge">{tag.name}</span>)}</div>
                  </div>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Right: tabs */}
        <div className="detail-main">
          <div className="tabs-bar">
            {(['profile', 'tags', 'attachments', 'audit'] as TabId[]).map(tab => (
              <button key={tab} className={`tab-btn ${activeTab === tab ? 'tab-active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab === 'profile' && <span>Profile</span>}
                {tab === 'tags' && <span>Tags ({customer.tags?.length ?? 0})</span>}
                {tab === 'attachments' && <span>Attachments ({attachmentsCount})</span>}
                {tab === 'audit' && <span><History size={14} style={{ marginRight: 4 }} /> Audit History</span>}
              </button>
            ))}
          </div>

          <Card className="glass-panel">
            <Card.Content>
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="profile-grid">
                  <div className="profile-field"><label>First Name</label><p>{customer.firstName}</p></div>
                  <div className="profile-field"><label>Last Name</label><p>{customer.lastName}</p></div>
                  <div className="profile-field"><label>Email</label><p>{customer.email}</p></div>
                  <div className="profile-field"><label>Phone</label><p>{customer.phone ?? '—'}</p></div>
                  <div className="profile-field"><label>Job Title</label><p>{customer.jobTitle ?? '—'}</p></div>
                  <div className="profile-field"><label>Source</label><p>{customer.sourceName ?? '—'}</p></div>
                  <div className="profile-field" style={{ gridColumn: '1 / -1' }}><label>Company</label><p>{customer.companyName ?? 'Individual (B2B)'}</p></div>
                </div>
              )}

              {/* Tags Tab */}
              {activeTab === 'tags' && (
                <div>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.875rem' }}>Current tags</p>
                  <div className="tag-list" style={{ marginBottom: '1.5rem' }}>
                    {customer.tags && customer.tags.length > 0
                      ? customer.tags.map(tag => {
                          const t = allTags.find(x => x.name === tag.name);
                          return (
                            <span key={tag.tagId} className="tag-badge tag-badge-removable">
                              {tag.name}
                              {t && <button onClick={() => removeTag(t.tagId)}><X size={10} /></button>}
                            </span>
                          );
                        })
                      : <p style={{ color: 'var(--text-muted)' }}>No tags assigned.</p>
                    }
                  </div>
                  {availableTags.length > 0 && (
                    <>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '0.875rem' }}>Add a tag</p>
                      <div className="tag-list">
                        {availableTags.map(t => (
                          <button key={t.tagId} className="tag-add-btn" onClick={() => addTag(t.tagId)}>
                            <Plus size={12} /> {t.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Attachments Tab */}
              {activeTab === 'attachments' && (
                <Attachments entity="customer" entityId={Number(id)} onCountChange={setAttachmentsCount} />
              )}

              {/* Audit History Tab - using reusable component with refresh trigger */}
              {activeTab === 'audit' && (
                <AuditHistory entityType="customer" entityId={Number(id)} refreshTrigger={auditRefreshTrigger} />
              )}
            </Card.Content>
          </Card>
        </div>
      </div>
    </Layout>
  );
};