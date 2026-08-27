import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { AuditHistoryTable } from '../components/audit/AuditHistoryTable';
import { OpportunityCreateModal } from '../components/ui/OpportunityCreateModal';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { TaskListGroup, TaskReadDto } from '../components/tasks/TaskListGroup';
import { TimelineList } from '../components/activities/TimelineList';
import Attachments from '../components/attachments/Attachments';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { api } from '../lib/api';
import { formatDisplayDate } from '../lib/dateUtils';
import { showToast } from '../lib/toast';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Globe, MapPin, Briefcase, Mail, Phone, Tag, Link as LinkIcon,
  History, Plus, Trash2, Edit2, ExternalLink, Calendar,
  DollarSign, CheckSquare, Clock, Building2, Search, User,
  CheckCircle2, Layers, Award
} from 'lucide-react';
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
  assignedRepName?: string;
  assignedRepEmail?: string;
  totalOpenPipelineValue: number;
  contacts: Contact[];
  customFieldsJson?: string;
  createdAt?: string;
  isDeleted?: boolean;
}

interface CustomFieldDef {
  customFieldDefinitionId: number;
  entityType: string;
  fieldName: string;
  fieldType: string;
  optionsJson: string | null;
  sortOrder: number;
}

interface Contact {
  customerId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface OpportunityItem {
  opportunityId: number;
  title: string;
  estimatedValue: number;
  stageName: string;
  stageColor?: string;
  isWon?: boolean;
  isLost?: boolean;
  expectedCloseDate?: string;
  ownerName?: string;
  customerName?: string;
  customerId?: number;
}

type TabId = 'contacts' | 'deals' | 'activities' | 'tasks' | 'attachments' | 'audit';

export const CompanyDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('contacts');

  // Related Entities States
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [activityTypes, setActivityTypes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<TaskReadDto[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<any[]>([]);
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [attachmentsCount, setAttachmentsCount] = useState(0);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);

  // Modals
  const [isOpportunityModalOpen, setIsOpportunityModalOpen] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState<TaskReadDto | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [contactToRemove, setContactToRemove] = useState<Contact | null>(null);

  // Search filter inside tabs
  const [tabFilterText, setTabFilterText] = useState('');

  const companyIdNum = id ? parseInt(id, 10) : 0;

  // ── 1. Fetch Company Core Data ─────────────────────────────────────────────
  const fetchCompany = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const companyData = await api.get<CompanyDetail>(`/api/companies/${id}`);
      setCompany(companyData);
    } catch {
      showToast('Failed to load company details.', 'error');
      navigate('/companies');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  // ── 2. Fetch Related Data (Opportunities, Tasks, Activities) ───────────────
  const fetchRelatedData = useCallback(async () => {
    if (!companyIdNum) return;

    // Opportunities
    api.get<any[]>(`/api/opportunities?companyId=${companyIdNum}`)
      .then(res => {
        const mapped: OpportunityItem[] = (res ?? []).map(o => ({
          opportunityId: o.opportunityId,
          title: o.title,
          estimatedValue: o.estimatedValue ?? 0,
          stageName: o.stageName || o.opportunityStage?.name || 'Active',
          stageColor: o.stageColor || o.opportunityStage?.colorCode || '#6366f1',
          isWon: o.isWon || o.opportunityStage?.isWon,
          isLost: o.isLost || o.opportunityStage?.isLost,
          expectedCloseDate: o.expectedCloseDate,
          ownerName: o.ownerName,
          customerName: o.customerName,
          customerId: o.customerId
        }));
        setOpportunities(mapped);
      })
      .catch(() => setOpportunities([]));

    // Attachments count
    api.get<any[]>(`/api/attachments?companyId=${companyIdNum}`)
      .then(res => setAttachmentsCount(res?.length ?? 0))
      .catch(() => setAttachmentsCount(0));

    // Activities
    api.get<any[]>(`/api/activities`)
      .then(res => {
        setActivities(res ?? []);
      })
      .catch(() => setActivities([]));

    // Tasks
    api.get<TaskReadDto[]>(`/api/tasks/all`)
      .then(res => {
        const list = (res as any)?.tasks || (Array.isArray(res) ? res : []);
        setTasks(list);
      })
      .catch(() => setTasks([]));
  }, [companyIdNum]);

  // Initial Load
  useEffect(() => {
    fetchCompany();
    fetchRelatedData();

    // Lookups
    api.get<CustomFieldDef[]>('/api/custom-field-definitions?entityType=Company')
      .then(setCustomFieldDefs)
      .catch(() => { });

    api.get<any[]>('/api/activitytypes')
      .then(res => setActivityTypes(res.map(x => ({ id: x.id ?? x.Id, name: x.name ?? x.Name, icon: x.icon ?? x.Icon }))))
      .catch(() => { });

    api.get<any[]>('/api/taskstatuses')
      .then(res => setTaskStatuses(res.map(x => ({ id: x.id, name: x.name, isTerminal: x.isTerminal }))))
      .catch(() => { });

    api.get<any[]>('/api/users')
      .then(res => setUsers(res.map(x => ({ id: x.id || x.identityId, name: x.name }))))
      .catch(() => { });
  }, [fetchCompany, fetchRelatedData]);

  // Handle Remove Contact Association
  const handleConfirmRemoveContact = async () => {
    if (!contactToRemove) return;
    try {
      await api.post('/api/customers/bulk', {
        customerIds: [contactToRemove.customerId],
        action: 'remove_company'
      });
      showToast(`${contactToRemove.firstName} ${contactToRemove.lastName} removed from company contacts.`, 'success');
      setContactToRemove(null);
      fetchCompany();
    } catch (error: any) {
      showToast(error.message || 'Failed to remove contact.', 'error');
    }
  };

  // Delete Company Action
  const handleDeleteCompany = async () => {
    if (!company) return;
    try {
      await api.delete(`/api/companies/${company.companyId}`);
      showToast('Company deleted successfully.', 'success');
      navigate('/companies');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete company.', 'error');
    }
  };

  // Financial Metrics Computation
  const stats = useMemo(() => {
    const totalPipeline = opportunities
      .filter(o => !o.isWon && !o.isLost)
      .reduce((sum, o) => sum + (o.estimatedValue || 0), 0);

    const totalWon = opportunities
      .filter(o => o.isWon)
      .reduce((sum, o) => sum + (o.estimatedValue || 0), 0);

    const wonCount = opportunities.filter(o => o.isWon).length;

    const contactIds = new Set(company?.contacts?.map(c => c.customerId) || []);
    
    // Filter company-relevant activities
    const companyActivities = activities.filter(a => 
      a.customerId && contactIds.has(a.customerId)
    );

    // Filter company-relevant tasks
    const companyTasks = tasks.filter(t => 
      t.customerId && contactIds.has(t.customerId)
    );

    return {
      totalPipeline,
      totalWon,
      wonCount,
      companyActivities,
      companyTasks,
      activeDealsCount: opportunities.filter(o => !o.isWon && !o.isLost).length
    };
  }, [opportunities, company, activities, tasks]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  // Filtered Contacts
  const filteredContacts = useMemo(() => {
    if (!company?.contacts) return [];
    if (!tabFilterText.trim()) return company.contacts;
    const q = tabFilterText.toLowerCase();
    return company.contacts.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q))
    );
  }, [company?.contacts, tabFilterText]);

  // Loading Skeleton
  if (isLoading || !company) {
    return (
      <Layout>
        <div className="company-dashboard-container animate-fade-in" style={{ padding: '1.5rem 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <Skeleton variant="rect" style={{ width: 140, height: 36, borderRadius: '8px' }} />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Skeleton variant="rect" style={{ width: 100, height: 36, borderRadius: '8px' }} />
              <Skeleton variant="rect" style={{ width: 100, height: 36, borderRadius: '8px' }} />
            </div>
          </div>
          <Card className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <Skeleton variant="avatar" style={{ width: 64, height: 64, borderRadius: '14px' }} />
              <div style={{ flex: 1 }}>
                <Skeleton variant="text" style={{ width: '30%', height: 28, marginBottom: '8px' }} />
                <Skeleton variant="text" style={{ width: '50%', height: 18 }} />
              </div>
            </div>
          </Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} variant="rect" style={{ height: 90, borderRadius: '12px' }} />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const primaryContact = company.contacts.length > 0 ? company.contacts[0] : null;

  return (
    <Layout>
      <div className="company-dashboard-container animate-fade-in" style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3rem' }}>
        
        {/* ── TOP BREADCRUMB & HEADER ACTIONS ─────────────────────────────── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/companies')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={16} /> Back to Companies
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
            <Button
              size="sm"
              onClick={() => setIsOpportunityModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={15} /> New Deal
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/companies/${company.companyId}/edit`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Edit2 size={15} /> Edit
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Trash2 size={15} /> Delete
            </Button>
          </div>
        </div>

        {/* ── COMPANY HERO BANNER CARD ────────────────────────────────────── */}
        <Card className="glass-panel" style={{
          marginBottom: '1.25rem',
          padding: '1.5rem',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem'
          }}>
            {/* Left Identity Area */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: '280px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                fontWeight: 800,
                boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.35)',
                flexShrink: 0
              }}>
                {company.name ? company.name.charAt(0).toUpperCase() : 'C'}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                  <h1 style={{
                    margin: 0,
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: 'var(--text-primary)'
                  }}>
                    {company.name}
                  </h1>

                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: company.isDeleted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                    color: company.isDeleted ? '#ef4444' : '#10b981'
                  }}>
                    <CheckCircle2 size={12} />
                    {company.isDeleted ? 'Archived' : 'Active Account'}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginTop: '0.4rem',
                  flexWrap: 'wrap',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem'
                }}>
                  {company.industry && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Briefcase size={14} style={{ color: 'var(--accent-primary)' }} />
                      {company.industry}
                    </span>
                  )}
                  {company.companySize && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Tag size={14} style={{ color: '#06b6d4' }} />
                      {company.companySize} employees
                    </span>
                  )}
                  {company.sourceName && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Layers size={14} style={{ color: '#8b5cf6' }} />
                      Source: {company.sourceName}
                    </span>
                  )}
                  {company.createdAt && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                      Created {formatDisplayDate(company.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Quick Links Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}>
              {company.website && (
                <a
                  href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline-sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    textDecoration: 'none',
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)',
                    background: 'var(--bg-secondary)',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <Globe size={14} style={{ color: 'var(--accent-primary)' }} />
                  Visit Website
                  <ExternalLink size={12} style={{ opacity: 0.6 }} />
                </a>
              )}

              {company.email && (
                <a
                  href={`mailto:${company.email}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    textDecoration: 'none',
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)',
                    background: 'var(--bg-secondary)',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <Mail size={14} style={{ color: '#10b981' }} />
                  {company.email}
                </a>
              )}

              {company.phone && (
                <a
                  href={`tel:${company.phone}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    textDecoration: 'none',
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)',
                    background: 'var(--bg-secondary)',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <Phone size={14} style={{ color: '#06b6d4' }} />
                  {company.phone}
                </a>
              )}
            </div>
          </div>
        </Card>

        {/* ── EXECUTIVE KPI METRIC STRIP ──────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          {/* Card 1: Pipeline Value */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.12)',
              color: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <DollarSign size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Open Pipeline
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {formatCurrency(stats.totalPipeline)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {stats.activeDealsCount} active {stats.activeDealsCount === 1 ? 'deal' : 'deals'}
              </div>
            </div>
          </div>

          {/* Card 2: Contacts */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <User size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Key Contacts
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {company.contacts.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {primaryContact ? `Primary: ${primaryContact.firstName} ${primaryContact.lastName}` : 'No contacts linked'}
              </div>
            </div>
          </div>

          {/* Card 3: Lifetime Won Revenue */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Award size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Closed Won Revenue
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                {formatCurrency(stats.totalWon)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {stats.wonCount} won {stats.wonCount === 1 ? 'deal' : 'deals'}
              </div>
            </div>
          </div>

          {/* Card 4: Tasks */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(6, 182, 212, 0.12)',
              color: '#06b6d4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <CheckSquare size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Open Tasks
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {stats.companyTasks.filter(t => !t.isTerminal).length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Pending action items
              </div>
            </div>
          </div>
        </div>

        {/* ── TWO-COLUMN MAIN DASHBOARD WORKSPACE ─────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 340px) minmax(0, 1fr)',
          gap: '1.5rem',
          alignItems: 'start'
        }}>
          
          {/* ── LEFT SIDEBAR: PROFILE & ATTRIBUTES ────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Overview Card */}
            <Card className="glass-panel" style={{
              borderRadius: '14px',
              padding: '1.25rem',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Building2 size={16} style={{ color: 'var(--accent-primary)' }} />
                Company Overview
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Email */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Official Email</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {company.email ? (
                      <a href={`mailto:${company.email}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                        {company.email}
                      </a>
                    ) : '—'}
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Phone Number</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {company.phone ? (
                      <a href={`tel:${company.phone}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                        {company.phone}
                      </a>
                    ) : '—'}
                  </div>
                </div>

                {/* Website */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Website</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {company.website ? (
                      <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                        {company.website}
                      </a>
                    ) : '—'}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Headquarters Address</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                    {company.address ? (
                      <>
                        <MapPin size={14} style={{ color: 'var(--accent-primary)', marginTop: '3px', flexShrink: 0 }} />
                        <span>{company.address}</span>
                      </>
                    ) : '—'}
                  </div>
                </div>

                {/* Industry & Size */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Industry</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {company.industry || '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Company Size</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {company.companySize || '—'}
                    </div>
                  </div>
                </div>

                {/* Account Owner */}
                <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Account Owner / Rep</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--accent-primary)'
                    }}>
                      {company.assignedRepName ? company.assignedRepName.charAt(0) : 'U'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {company.assignedRepName || 'Unassigned'}
                      </div>
                      {company.assignedRepEmail && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {company.assignedRepEmail}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Custom Fields */}
                {customFieldDefs.length > 0 && (
                  <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                      Additional Information
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {customFieldDefs.map(def => {
                        let val = '';
                        if (company.customFieldsJson) {
                          try {
                            const parsed = JSON.parse(company.customFieldsJson);
                            val = parsed[def.fieldName] || '';
                          } catch { }
                        }
                        if (!val) val = '—';
                        if (def.fieldType === 'Boolean') {
                          val = val === 'true' ? 'Yes' : (val === 'false' ? 'No' : '—');
                        }
                        return (
                          <div key={def.customFieldDefinitionId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{def.fieldName}:</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Engagement Glance */}
            <Card className="glass-panel" style={{
              borderRadius: '14px',
              padding: '1.25rem',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                Account Health
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Lifetime Won Deals</span>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(stats.totalWon)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Active Deals</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{stats.activeDealsCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Attachments / Files</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{attachmentsCount}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* ── RIGHT MAIN WORKSPACE: TABBED MODULES ──────────────────────── */}
          <div style={{ minWidth: 0 }}>
            {/* Tabs Header Navigation */}
            <div className="tabs-bar" style={{
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              marginBottom: '1rem',
              paddingBottom: '4px',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <button
                className={`tab-btn ${activeTab === 'contacts' ? 'tab-active' : ''}`}
                onClick={() => { setActiveTab('contacts'); setTabFilterText(''); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem' }}
              >
                <User size={15} /> Contacts ({company.contacts.length})
              </button>

              <button
                className={`tab-btn ${activeTab === 'deals' ? 'tab-active' : ''}`}
                onClick={() => { setActiveTab('deals'); setTabFilterText(''); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem' }}
              >
                <DollarSign size={15} /> Deals ({opportunities.length})
              </button>

              <button
                className={`tab-btn ${activeTab === 'activities' ? 'tab-active' : ''}`}
                onClick={() => { setActiveTab('activities'); setTabFilterText(''); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem' }}
              >
                <Clock size={15} /> Timeline ({stats.companyActivities.length})
              </button>

              <button
                className={`tab-btn ${activeTab === 'tasks' ? 'tab-active' : ''}`}
                onClick={() => { setActiveTab('tasks'); setTabFilterText(''); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem' }}
              >
                <CheckSquare size={15} /> Tasks ({stats.companyTasks.filter(t => !t.isTerminal).length})
              </button>

              <button
                className={`tab-btn ${activeTab === 'attachments' ? 'tab-active' : ''}`}
                onClick={() => { setActiveTab('attachments'); setTabFilterText(''); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem' }}
              >
                <LinkIcon size={15} /> Files ({attachmentsCount})
              </button>

              <button
                className={`tab-btn ${activeTab === 'audit' ? 'tab-active' : ''}`}
                onClick={() => { setActiveTab('audit'); setTabFilterText(''); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem' }}
              >
                <History size={15} /> Audit History
              </button>
            </div>

            {/* TAB CONTENT CARDS */}
            <Card className="glass-panel" style={{
              borderRadius: '14px',
              padding: '1.25rem',
              border: '1px solid var(--border-color)',
              minHeight: '420px'
            }}>
              {/* ── TAB 1: CONTACTS ─────────────────────────────────────── */}
              {activeTab === 'contacts' && (
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ position: 'relative', width: '260px' }}>
                      <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Search company contacts..."
                        value={tabFilterText}
                        onChange={e => setTabFilterText(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.75rem 0.45rem 2rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>
                  </div>

                  {filteredContacts.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: '10px',
                      color: 'var(--text-muted)'
                    }}>
                      <User size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)' }}>No contacts found for this company</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem' }}>Contacts associated with this company in customer profiles will appear here.</p>
                    </div>
                  ) : (
                    <div className="bounded-scroll-container">
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                            <th style={{ padding: '0.75rem 0.5rem' }}>Name</th>
                            <th style={{ padding: '0.75rem 0.5rem' }}>Email</th>
                            <th style={{ padding: '0.75rem 0.5rem' }}>Phone</th>
                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredContacts.map(c => (
                            <tr
                              key={c.customerId}
                              style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }}
                              className="table-row-hover"
                            >
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <div
                                  onClick={() => navigate(`/customers/${c.customerId}`)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}
                                >
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'rgba(99, 102, 241, 0.15)',
                                    color: 'var(--accent-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.75rem'
                                  }}>
                                    {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                                  </div>
                                  <div>
                                    <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                                      {c.firstName} {c.lastName}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <a href={`mailto:${c.email}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                                  {c.email}
                                </a>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                                {c.phone ? (
                                  <a href={`tel:${c.phone}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                                    {c.phone}
                                  </a>
                                ) : '—'}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                  <button
                                    className="btn-ghost-sm"
                                    onClick={() => navigate(`/customers/${c.customerId}`)}
                                    title="View Profile"
                                    style={{ padding: '4px 8px', fontSize: '0.78rem', color: 'var(--accent-primary)' }}
                                  >
                                    View
                                  </button>
                                  <button
                                    className="btn-ghost-sm"
                                    onClick={() => setContactToRemove(c)}
                                    title="Remove from Company"
                                    style={{ padding: '4px 8px', fontSize: '0.78rem', color: '#ef4444' }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 2: DEALS & OPPORTUNITIES ─────────────────────────── */}
              {activeTab === 'deals' && (
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Linked Deals &amp; Opportunities
                    </h3>
                    <Button size="sm" onClick={() => setIsOpportunityModalOpen(true)}>
                      <Plus size={14} style={{ marginRight: 4 }} /> New Deal
                    </Button>
                  </div>

                  {opportunities.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: '10px',
                      color: 'var(--text-muted)'
                    }}>
                      <DollarSign size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)' }}>No deals recorded for this company</p>
                      <p style={{ margin: '4px 0 1rem 0', fontSize: '0.82rem' }}>Create commercial opportunities to track revenue potential.</p>
                      <Button size="sm" onClick={() => setIsOpportunityModalOpen(true)}>
                        <Plus size={14} style={{ marginRight: 4 }} /> Create Deal
                      </Button>
                    </div>
                  ) : (
                    <div className="bounded-scroll-container">
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                            <th style={{ padding: '0.75rem 0.5rem' }}>Deal Title</th>
                            <th style={{ padding: '0.75rem 0.5rem' }}>Contact</th>
                            <th style={{ padding: '0.75rem 0.5rem' }}>Stage</th>
                            <th style={{ padding: '0.75rem 0.5rem' }}>Value</th>
                            <th style={{ padding: '0.75rem 0.5rem' }}>Close Date</th>
                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Owner</th>
                          </tr>
                        </thead>
                        <tbody>
                          {opportunities.map(opp => (
                            <tr
                              key={opp.opportunityId}
                              style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                              onClick={() => navigate(`/pipeline`)}
                              className="table-row-hover"
                            >
                              <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                                {opp.title}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                                {opp.customerName || '—'}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <span style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  background: opp.isWon ? 'rgba(16, 185, 129, 0.15)' : (opp.isLost ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)'),
                                  color: opp.isWon ? '#10b981' : (opp.isLost ? '#ef4444' : '#6366f1')
                                }}>
                                  {opp.stageName}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {formatCurrency(opp.estimatedValue)}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                {formatDisplayDate(opp.expectedCloseDate)}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                {opp.ownerName || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 3: ACTIVITIES & TIMELINE ─────────────────────────── */}
              {activeTab === 'activities' && (
                <div>
                  <TimelineList
                    activities={stats.companyActivities}
                    activityTypes={activityTypes}
                    customerId={primaryContact?.customerId}
                    currentUserId={currentUser?.userId}
                    isAdmin={currentUser?.roles?.includes('Admin') ?? false}
                    maxHeight={480}
                    initialItemLimit={5}
                    onActivityLogged={(act) => {
                      setActivities(prev => [act, ...prev]);
                    }}
                    onActivityDeleted={(actId) => {
                      setActivities(prev => prev.filter(a => a.activityId !== actId));
                    }}
                  />
                </div>
              )}

              {/* ── TAB 4: TASKS ─────────────────────────────────────────── */}
              {activeTab === 'tasks' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Tasks &amp; Action Items
                    </h3>
                    <Button size="sm" onClick={() => navigate(primaryContact?.customerId ? `/tasks/new?customerId=${primaryContact.customerId}` : '/tasks/new')}>
                      <Plus size={14} style={{ marginRight: 4 }} /> New Task
                    </Button>
                  </div>

                  <div className="bounded-scroll-container" style={{ maxHeight: '480px' }}>
                    <TaskListGroup
                      overdue={stats.companyTasks.filter(t => !t.isTerminal && t.dueDate && new Date(t.dueDate) < new Date())}
                      dueToday={stats.companyTasks.filter(t => !t.isTerminal && t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString())}
                      upcoming={stats.companyTasks.filter(t => !t.isTerminal && (!t.dueDate || new Date(t.dueDate) > new Date()))}
                      completed={stats.companyTasks.filter(t => t.isTerminal)}
                      onTaskComplete={(taskId) => {
                        setTasks(prev => prev.filter(t => t.crmTaskId !== taskId));
                      }}
                      onTaskClick={(t) => navigate(`/tasks/${t.crmTaskId}/edit`)}
                      onTaskDelete={fetchRelatedData}
                    />
                  </div>
                </div>
              )}

              {/* ── TAB 5: ATTACHMENTS ───────────────────────────────────── */}
              {activeTab === 'attachments' && (
                <Attachments
                  entity="company"
                  entityId={companyIdNum}
                  onCountChange={setAttachmentsCount}
                />
              )}

              {/* ── TAB 6: AUDIT HISTORY ─────────────────────────────────── */}
              {activeTab === 'audit' && (
                <AuditHistoryTable
                  entityType="companies"
                  entityId={companyIdNum}
                  entityName={company.name}
                />
              )}
            </Card>
          </div>
        </div>

        {/* ── OPPORTUNITY CREATION MODAL ──────────────────────────────────── */}
        <OpportunityCreateModal
          isOpen={isOpportunityModalOpen}
          onCancel={() => setIsOpportunityModalOpen(false)}
          onCreated={() => {
            setIsOpportunityModalOpen(false);
            fetchRelatedData();
            showToast('Deal created successfully.', 'success');
          }}
          preselectedCustomerId={primaryContact?.customerId}
        />

        {/* ── DELETE COMPANY CONFIRM DIALOG ───────────────────────────────── */}
        <ConfirmDialog
          isOpen={isDeleteModalOpen}
          title="Delete Company"
          message={`Are you sure you want to delete ${company.name}? This will remove company associations for linked contacts.`}
          confirmText="Delete Company"
          onConfirm={handleDeleteCompany}
          onCancel={() => setIsDeleteModalOpen(false)}
        />

        {/* ── REMOVE CONTACT ASSOCIATION CONFIRM DIALOG ─────────────────────── */}
        <ConfirmDialog
          isOpen={contactToRemove !== null}
          title="Remove Contact from Company"
          message={`Remove ${contactToRemove?.firstName} ${contactToRemove?.lastName} from ${company.name}'s contact directory? The customer profile will remain in the CRM.`}
          confirmText="Remove"
          onConfirm={handleConfirmRemoveContact}
          onCancel={() => setContactToRemove(null)}
        />

      </div>
    </Layout>
  );
};
export default CompanyDetailScreen;