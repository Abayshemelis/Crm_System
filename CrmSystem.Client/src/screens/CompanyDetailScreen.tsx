import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import { ArrowLeft, Globe, MapPin, Briefcase, Mail, Phone, Paperclip, Upload, Trash2 } from 'lucide-react';
import './screens.css';

interface Company {
  companyId: number; name: string; industry?: string;
  website?: string; address?: string;
}
interface Contact { id: number; firstName: string; lastName: string; email: string; phone?: string; }
interface Attachment {
  attachmentId: number; fileName: string; fileUrl: string;
  fileSizeBytes: number; uploadedByName: string; uploadedAt: string;
}

type TabId = 'contacts' | 'attachments';

export const CompanyDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('contacts');
  const [isLoading, setIsLoading] = useState(true);
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [comp, atts] = await Promise.all([
        api.get<{ company: Company; contacts: Contact[] }>(`/api/companies/${id}`),
        api.get<Attachment[]>(`/api/attachments?companyId=${id}`),
      ]);
      setCompany(comp.company);
      setContacts(comp.contacts ?? []);
      setAttachments(atts ?? []);
    } catch {
      navigate('/companies');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const uploadFile = async () => {
    if (!fileInput) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', fileInput);
    form.append('CompanyId', id!);
    await api.upload('/api/attachments', form);
    setFileInput(null);
    setUploading(false);
    fetchAll();
  };

  const deleteAttachment = async (attId: number) => {
    await api.delete(`/api/attachments/${attId}`);
    fetchAll();
  };

  const formatBytes = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

  if (isLoading || !company) {
    return <Layout><div className="loading-state"><div className="spinner" /><p>Loading company...</p></div></Layout>;
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
      </div>

      <div className="detail-layout animate-fade-in">
        {/* Left sidebar */}
        <Card className="glass-panel detail-sidebar">
          <Card.Content>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Company Info</h3>
            <div className="customer-details">
              {company.industry && <div className="detail-row"><Briefcase size={15} /><span>{company.industry}</span></div>}
              {company.website && <div className="detail-row"><Globe size={15} /><a href={company.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>{company.website}</a></div>}
              {company.address && <div className="detail-row"><MapPin size={15} /><span>{company.address}</span></div>}
            </div>
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(59,130,246,0.07)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>CONTACTS</p>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{contacts.length}</p>
            </div>
          </Card.Content>
        </Card>

        {/* Right tabs */}
        <div className="detail-main">
          <div className="tabs-bar">
            <button className={`tab-btn ${activeTab === 'contacts' ? 'tab-active' : ''}`} onClick={() => setActiveTab('contacts')}>
              Contacts ({contacts.length})
            </button>
            <button className={`tab-btn ${activeTab === 'attachments' ? 'tab-active' : ''}`} onClick={() => setActiveTab('attachments')}>
              Attachments ({attachments.length})
            </button>
          </div>

          <Card className="glass-panel">
            <Card.Content>
              {activeTab === 'contacts' && (
                <div className="contact-list">
                  {contacts.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No contacts linked to this company.</p>}
                  {contacts.map(c => (
                    <div key={c.id} className="contact-row" onClick={() => navigate(`/customers/${c.id}`)}>
                      <div className="customer-avatar" style={{ width: 36, height: 36, fontSize: '0.875rem' }}>{c.firstName[0]}{c.lastName[0]}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{c.firstName} {c.lastName}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{c.email}</p>
                      </div>
                      {c.phone && <div className="detail-row" style={{ margin: 0 }}><Phone size={13} /><span style={{ fontSize: '0.8rem' }}>{c.phone}</span></div>}
                    </div>
                  ))}
                </div>
              )}

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
                    {fileInput && <Button size="sm" style={{ marginTop: 8 }} onClick={uploadFile} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</Button>}
                  </div>
                  <div className="attachment-list">
                    {attachments.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No attachments yet.</p>}
                    {attachments.map(att => (
                      <div key={att.attachmentId} className="attachment-row">
                        <Paperclip size={16} style={{ flexShrink: 0, color: 'var(--accent-primary)' }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{att.fileName}</p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {formatBytes(att.fileSizeBytes)} · {att.uploadedByName} · {new Date(att.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button className="icon-btn danger" onClick={() => deleteAttachment(att.attachmentId)}><Trash2 size={14} /></button>
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
