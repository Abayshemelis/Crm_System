import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { api } from '../lib/api';
import { ArrowLeft, Mail, Phone, MapPin, Building2, Tag, Paperclip, Trash2, Upload, X, Plus } from 'lucide-react';
import './screens.css';

interface Customer {
  id: number; firstName: string; lastName: string;
  email: string; phone?: string; address?: string;
  source?: string; companyId?: number; companyName?: string;
  tags?: CustomerTag[];
}
interface CustomerTag { tagId: number; name: string; }
interface TagItem { tagId: number; name: string; }
interface Attachment {
  attachmentId: number; fileName: string; fileUrl: string;
  fileSizeBytes: number; uploadedByName: string; uploadedAt: string;
}

type TabId = 'profile' | 'tags' | 'attachments';

export const CustomerDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fileInput, setFileInput] = useState<File | null>(null);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [cust, tags, atts] = await Promise.all([
        api.get<Customer>(`/api/customers/${id}`),
        api.get<TagItem[]>('/api/tags'),
        api.get<Attachment[]>(`/api/attachments?customerId=${id}`),
      ]);
      setCustomer(cust);
      setAllTags(tags ?? []);
      setAttachments(atts ?? []);
    } catch {
      navigate('/customers');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addTag = async (tagId: number) => {
    await api.post(`/api/customers/${id}/tags`, tagId);
    fetchAll();
  };

  const removeTag = async (tagId: number) => {
    await api.delete(`/api/customers/${id}/tags/${tagId}`);
    fetchAll();
  };

  const uploadFile = async () => {
    if (!fileInput) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', fileInput);
    form.append('CustomerId', id!);
    await api.upload('/api/attachments', form);
    setFileInput(null);
    setUploading(false);
    fetchAll();
  };

  const deleteAttachment = async (attId: number) => {
    await api.delete(`/api/attachments/${attId}`);
    fetchAll();
  };

  const formatBytes = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  if (isLoading || !customer) {
    return <Layout><div className="loading-state"><div className="spinner" /><p>Loading customer...</p></div></Layout>;
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
            <p>{customer.source ?? 'No source'} {customer.companyName ? `· ${customer.companyName}` : ''}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button onClick={() => navigate(`/customers/${customer.id}/edit`)} size="sm">Edit</Button>
          <Button variant="danger" size="sm" onClick={async () => {
            if (!window.confirm('Delete this customer?')) return;
            await api.delete(`/api/customers/${customer.id}`);
            navigate('/customers');
          }}>Delete</Button>
        </div>
      </div>

      <div className="detail-layout animate-fade-in">
        {/* Left: static info */}
        <Card className="glass-panel detail-sidebar">
          <Card.Content>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Contact Info</h3>
            <div className="customer-details">
              <div className="detail-row"><Mail size={15} /><span>{customer.email}</span></div>
              {customer.phone && <div className="detail-row"><Phone size={15} /><span>{customer.phone}</span></div>}
              {customer.address && <div className="detail-row"><MapPin size={15} /><span>{customer.address}</span></div>}
              {customer.companyName && <div className="detail-row"><Building2 size={15} /><span>{customer.companyName}</span></div>}
            </div>
            {customer.tags && customer.tags.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>TAGS</p>
                <div className="tag-list">{customer.tags.map(tag => <span key={tag.tagId} className="tag-badge">{tag.name}</span>)}</div>
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Right: tabs */}
        <div className="detail-main">
          <div className="tabs-bar">
            {(['profile', 'tags', 'attachments'] as TabId[]).map(tab => (
              <button key={tab} className={`tab-btn ${activeTab === tab ? 'tab-active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab === 'profile' && 'Profile'}
                {tab === 'tags' && `Tags (${customer.tags?.length ?? 0})`}
                {tab === 'attachments' && `Attachments (${attachments.length})`}
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
                  <div className="profile-field"><label>Source</label><p>{customer.source ?? '—'}</p></div>
                  <div className="profile-field"><label>Company</label><p>{customer.companyName ?? 'Individual (B2C)'}</p></div>
                  <div className="profile-field" style={{ gridColumn: '1 / -1' }}><label>Address</label><p>{customer.address ?? '—'}</p></div>
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
                <div>
                  <div className="upload-zone">
                    <Upload size={20} style={{ marginBottom: 8 }} />
                    <p style={{ marginBottom: 8, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {fileInput ? fileInput.name : 'Select a file to upload'}
                    </p>
                    <label className="upload-label">
                      Browse
                      <input type="file" style={{ display: 'none' }} onChange={e => setFileInput(e.target.files?.[0] ?? null)} />
                    </label>
                    {fileInput && (
                      <Button size="sm" style={{ marginTop: 8 }} onClick={uploadFile} disabled={uploading}>
                        {uploading ? 'Uploading...' : 'Upload'}
                      </Button>
                    )}
                  </div>
                  <div className="attachment-list">
                    {attachments.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No attachments yet.</p>}
                    {attachments.map(att => (
                      <div key={att.attachmentId} className="attachment-row">
                        <Paperclip size={16} style={{ flexShrink: 0, color: 'var(--accent-primary)' }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{att.fileName}</p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {formatBytes(att.fileSizeBytes)} · Uploaded by {att.uploadedByName} · {new Date(att.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button className="icon-btn danger" onClick={() => deleteAttachment(att.attachmentId)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card.Content>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
