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
import { EmailComposerModal } from '../components/email/EmailComposerModal';
import Attachments from '../components/attachments/Attachments';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { api } from '../lib/api';
import { formatDisplayDate } from '../lib/dateUtils';
import { showToast } from '../lib/toast';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Mail, Phone, Building2, Plus, Trash2, Edit2, ExternalLink, Calendar,
  DollarSign, CheckSquare, Clock, User, CheckCircle2, Layers, Award,
  CreditCard, FileText, Link as LinkIcon, History, Tag, Send, X, Briefcase
} from 'lucide-react';
import './screens.css';

interface CustomerTag {
  tagId?: number;
  name: string;
}

interface TagItem {
  tagId: number;
  name: string;
}

interface CustomerDetail {
  customerId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  companyId?: number;
  companyName?: string;
  sourceId?: number;
  sourceName?: string;
  assignedRepId?: number;
  assignedRepName?: string;
  assignedRepEmail?: string;
  createdAt?: string;
  isDeleted?: boolean;
  tags?: CustomerTag[];
  customFieldsJson?: string;
}

interface CustomFieldDef {
  customFieldDefinitionId: number;
  entityType: string;
  fieldName: string;
  fieldType: string;
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
}

interface ContractItem {
  contractId: number;
  contractNumber: string;
  title: string;
  contractValue: number;
  status: string;
  startDate?: string;
  endDate?: string;
}

interface PaymentItem {
  paymentId: number;
  paymentNumber: string;
  invoiceId: number;
  invoiceNumber: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  status: string;
  transactionReference?: string;
}

type TabId = 'deals' | 'payments' | 'contracts' | 'activities' | 'tasks' | 'attachments' | 'audit';

export const CustomerDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('deals');

  // Related Entities States
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [activityTypes, setActivityTypes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<TaskReadDto[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<any[]>([]);
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [attachmentsCount, setAttachmentsCount] = useState(0);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);

  // Modals & Action States
  const [isOpportunityModalOpen, setIsOpportunityModalOpen] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState<TaskReadDto | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);

  const customerIdNum = id ? parseInt(id, 10) : 0;

  // ── 1. Fetch Customer Core Profile ─────────────────────────────────────────
  const fetchCustomer = useCallback(async () => {
    if (!id) return;
    try {
      const cust = await api.get<CustomerDetail>(`/api/customers/${id}`);
      setCustomer(cust);
    } catch {
      showToast('Failed to load customer profile.', 'error');
      navigate('/customers');
    }
  }, [id, navigate]);

  // ── 2. Fetch Related Customer Data ─────────────────────────────────────────
  const fetchRelatedData = useCallback(async () => {
    if (!customerIdNum) return;

    // Opportunities
    api.get<any[]>(`/api/opportunities?customerId=${customerIdNum}`)
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
          ownerName: o.ownerName
        }));
        setOpportunities(mapped);
      })
      .catch(() => setOpportunities([]));

    // Contracts
    api.get<any[]>(`/api/contracts?customerId=${customerIdNum}`)
      .then(res => {
        const mapped: ContractItem[] = (res ?? []).map(c => ({
          contractId: c.contractId,
          contractNumber: c.contractNumber,
          title: c.title,
          contractValue: c.contractValue ?? 0,
          status: c.status || 'Draft',
          startDate: c.startDate,
          endDate: c.endDate
        }));
        setContracts(mapped);
      })
      .catch(() => setContracts([]));

    // Payments
    api.get<any[]>(`/api/payments?customerId=${customerIdNum}`)
      .then(res => setPayments(res ?? []))
      .catch(() => setPayments([]));

    // Activities
    api.get<any[]>(`/api/activities?customerId=${customerIdNum}`)
      .then(res => setActivities(res ?? []))
      .catch(() => setActivities([]));

    // Tasks
    api.get<TaskReadDto[]>(`/api/tasks?customerId=${customerIdNum}`)
      .then(res => setTasks(res ?? []))
      .catch(() => setTasks([]));

    // Attachments
    api.get<any[]>(`/api/attachments?customerId=${customerIdNum}`)
      .then(res => setAttachmentsCount(res?.length ?? 0))
      .catch(() => setAttachmentsCount(0));
  }, [customerIdNum]);

  // Initial Load
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchCustomer(),
      fetchRelatedData(),
      api.get<any[]>('/api/tags').then(res => setAllTags((res ?? []).map(t => ({ tagId: t.tagId ?? t.id, name: t.name })))),
      api.get<CustomFieldDef[]>('/api/custom-field-definitions?entityType=Customer').then(setCustomFieldDefs),
      api.get<any[]>('/api/activitytypes').then(res => setActivityTypes(res.map(x => ({ id: x.id ?? x.Id, name: x.name ?? x.Name, icon: x.icon ?? x.Icon })))),
      api.get<any[]>('/api/taskstatuses').then(res => setTaskStatuses(res.map(x => ({ id: x.id, name: x.name, isTerminal: x.isTerminal })))),
      api.get<any[]>('/api/users').then(res => setUsers(res.map(x => ({ id: x.id || x.identityId, name: x.name }))))
    ]).finally(() => setIsLoading(false));
  }, [fetchCustomer, fetchRelatedData]);

  // Tag Operations
  const handleAddTag = async (tagId: number) => {
    try {
      await api.post(`/api/customers/${id}/tags`, tagId);
      showToast('Tag added.', 'success');
      setIsAddingTag(false);
      fetchCustomer();
    } catch {
      showToast('Failed to add tag.', 'error');
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    try {
      await api.delete(`/api/customers/${id}/tags/${tagId}`);
      showToast('Tag removed.', 'success');
      fetchCustomer();
    } catch {
      showToast('Failed to remove tag.', 'error');
    }
  };

  // Delete Customer Action
  const handleDeleteCustomer = async () => {
    if (!customer) return;
    try {
      await api.delete(`/api/customers/${customer.customerId}`);
      showToast('Customer deleted successfully.', 'success');
      navigate('/customers');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete customer.', 'error');
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

    const totalSettledPayments = payments
      .filter(p => (p.status || '').toLowerCase() === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const activeDealsCount = opportunities.filter(o => !o.isWon && !o.isLost).length;
    const openTasksCount = tasks.filter(t => !t.isTerminal).length;

    return {
      totalPipeline,
      totalWon,
      totalSettledPayments,
      activeDealsCount,
      openTasksCount
    };
  }, [opportunities, payments, tasks]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  // Loading Skeleton
  if (isLoading || !customer) {
    return (
      <Layout>
        <div className="customer-dashboard-container animate-fade-in" style={{ padding: '1.5rem 0' }}>
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

  const assignedTagIds = new Set(customer.tags?.map(t => t.tagId).filter(Boolean) as number[]);
  const availableTagsToAdd = allTags.filter(t => !assignedTagIds.has(t.tagId));

  return (
    <Layout>
      <div className="customer-dashboard-container animate-fade-in" style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3rem' }}>
        
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
            onClick={() => navigate('/customers')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={16} /> Back to Customers
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button
              size="sm"
              onClick={() => setIsOpportunityModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Plus size={14} /> New Deal
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/tasks/new?customerId=${customer.customerId}`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <CheckSquare size={14} /> New Task
            </Button>

            {customer.email && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEmailModalOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Send size={14} /> Email
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/customers/${customer.customerId}/edit`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Edit2 size={14} /> Edit
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        </div>

        {/* ── CUSTOMER HERO BANNER CARD ───────────────────────────────────── */}
        <Card className="glass-panel" style={{
          marginBottom: '1.25rem',
          padding: '1.35rem 1.5rem',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.25rem'
          }}>
            {/* Left Identity Area */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: '280px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 800,
                boxShadow: '0 8px 16px -4px rgba(16, 185, 129, 0.35)',
                flexShrink: 0
              }}>
                {customer.firstName[0]}{customer.lastName[0]}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                  <h1 style={{
                    margin: 0,
                    fontSize: '1.45rem',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: 'var(--text-primary)'
                  }}>
                    {customer.firstName} {customer.lastName}
                  </h1>

                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: customer.isDeleted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                    color: customer.isDeleted ? '#ef4444' : '#10b981'
                  }}>
                    <CheckCircle2 size={12} />
                    {customer.isDeleted ? 'Archived' : 'Active Customer'}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  marginTop: '0.35rem',
                  flexWrap: 'wrap',
                  color: 'var(--text-secondary)',
                  fontSize: '0.84rem'
                }}>
                  {customer.jobTitle && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Briefcase size={13} style={{ color: 'var(--accent-primary)' }} />
                      {customer.jobTitle}
                    </span>
                  )}

                  {customer.companyName && (
                    <span
                      onClick={() => customer.companyId && navigate(`/companies/${customer.companyId}`)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        cursor: customer.companyId ? 'pointer' : 'default',
                        color: customer.companyId ? 'var(--accent-primary)' : 'inherit',
                        fontWeight: customer.companyId ? 600 : 400
                      }}
                    >
                      <Building2 size={13} />
                      {customer.companyName}
                    </span>
                  )}

                  {customer.sourceName && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Layers size={13} style={{ color: '#8b5cf6' }} />
                      Source: {customer.sourceName}
                    </span>
                  )}

                  {customer.createdAt && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                      Since {formatDisplayDate(customer.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Quick Links Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              flexWrap: 'wrap'
            }}>
              {customer.email && (
                <a
                  href={`mailto:${customer.email}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    textDecoration: 'none',
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)',
                    background: 'var(--bg-secondary)',
                    padding: '0.38rem 0.7rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <Mail size={13} style={{ color: '#10b981' }} />
                  {customer.email}
                </a>
              )}

              {customer.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    textDecoration: 'none',
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)',
                    background: 'var(--bg-secondary)',
                    padding: '0.38rem 0.7rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <Phone size={13} style={{ color: '#06b6d4' }} />
                  {customer.phone}
                </a>
              )}
            </div>
          </div>
        </Card>

        {/* ── EXECUTIVE KPI METRIC STRIP ──────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}>
          {/* Card 1: Open Pipeline */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '0.9rem 1.15rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.12)',
              color: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <DollarSign size={19} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Open Pipeline
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {formatCurrency(stats.totalPipeline)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {stats.activeDealsCount} active {stats.activeDealsCount === 1 ? 'deal' : 'deals'}
              </div>
            </div>
          </div>

          {/* Card 2: Closed Won Deals */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '0.9rem 1.15rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Award size={19} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Closed Won Revenue
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                {formatCurrency(stats.totalWon)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {opportunities.filter(o => o.isWon).length} won {opportunities.filter(o => o.isWon).length === 1 ? 'deal' : 'deals'}
              </div>
            </div>
          </div>

          {/* Card 3: Payments Settled */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '0.9rem 1.15rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <CreditCard size={19} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Settled Payments
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {formatCurrency(stats.totalSettledPayments)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {payments.length} {payments.length === 1 ? 'payment' : 'payments'} processed
              </div>
            </div>
          </div>

          {/* Card 4: Open Action Items */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '0.9rem 1.15rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(6, 182, 212, 0.12)',
              color: '#06b6d4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <CheckSquare size={19} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Open Tasks
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {stats.openTasksCount}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Pending action items
              </div>
            </div>
          </div>
        </div>

        {/* ── TWO-COLUMN MAIN DASHBOARD WORKSPACE ─────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(290px, 330px) minmax(0, 1fr)',
          gap: '1.25rem',
          alignItems: 'start'
        }}>
          
          {/* ── LEFT SIDEBAR: PROFILE & ATTRIBUTES ────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Overview Card */}
            <Card className="glass-panel" style={{
              borderRadius: '14px',
              padding: '1.25rem',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <User size={15} style={{ color: 'var(--accent-primary)' }} />
                Customer Information
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {/* Email */}
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Email Address</div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    <a href={`mailto:${customer.email}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                      {customer.email}
                    </a>
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Phone Number</div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {customer.phone ? (
                      <a href={`tel:${customer.phone}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                        {customer.phone}
                      </a>
                    ) : '—'}
                  </div>
                </div>

                {/* Company */}
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Company</div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {customer.companyName ? (
                      <span
                        onClick={() => customer.companyId && navigate(`/companies/${customer.companyId}`)}
                        style={{
                          cursor: customer.companyId ? 'pointer' : 'default',
                          color: customer.companyId ? 'var(--accent-primary)' : 'inherit',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Building2 size={13} />
                        {customer.companyName}
                      </span>
                    ) : 'Individual (B2C)'}
                  </div>
                </div>

                {/* Job Title */}
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Job Title / Role</div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {customer.jobTitle || '—'}
                  </div>
                </div>

                {/* Source */}
                <div style={{ paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Acquisition Source</div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {customer.sourceName || 'Direct / Organic'}
                  </div>
                </div>

                {/* Account Rep / Owner */}
                <div style={{ paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Assigned Sales Rep</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--accent-primary)'
                    }}>
                      {customer.assignedRepName ? customer.assignedRepName.charAt(0) : 'U'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {customer.assignedRepName || 'Unassigned'}
                      </div>
                      {customer.assignedRepEmail && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {customer.assignedRepEmail}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tags Section */}
                <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      Tags ({customer.tags?.length ?? 0})
                    </div>
                    {availableTagsToAdd.length > 0 && (
                      <button
                        type="button"
                        className="btn-ghost-sm"
                        onClick={() => setIsAddingTag(prev => !prev)}
                        style={{ fontSize: '0.72rem', padding: '2px 6px', color: 'var(--accent-primary)' }}
                      >
                        {isAddingTag ? 'Cancel' : '+ Add Tag'}
                      </button>
                    )}
                  </div>

                  {/* Add Tag Dropdown Picker */}
                  {isAddingTag && availableTagsToAdd.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.35rem',
                      marginBottom: '0.5rem',
                      padding: '0.4rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: '6px'
                    }}>
                      {availableTagsToAdd.map(t => (
                        <button
                          key={t.tagId}
                          type="button"
                          onClick={() => handleAddTag(t.tagId)}
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            color: 'var(--text-primary)'
                          }}
                        >
                          + {t.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tag List */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {customer.tags && customer.tags.length > 0 ? (
                      customer.tags.map((tag, idx) => {
                        const matchedTag = allTags.find(x => x.name === tag.name);
                        return (
                          <span
                            key={tag.tagId ?? tag.name ?? idx}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-primary)'
                            }}
                          >
                            <Tag size={10} style={{ color: 'var(--accent-primary)' }} />
                            {tag.name}
                            {matchedTag && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(matchedTag.tagId)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  color: 'var(--text-muted)',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <X size={10} />
                              </button>
                            )}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No tags assigned</span>
                    )}
                  </div>
                </div>

                {/* Custom Fields */}
                {customFieldDefs.length > 0 && (
                  <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                      Additional Details
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {customFieldDefs.map(def => {
                        let val = '';
                        if (customer.customFieldsJson) {
                          try {
                            const parsed = JSON.parse(customer.customFieldsJson);
                            val = parsed[def.fieldName] || '';
                          } catch { }
                        }
                        if (!val) val = '—';
                        if (def.fieldType === 'Boolean') {
                          val = val === 'true' ? 'Yes' : (val === 'false' ? 'No' : '—');
                        }
                        return (
                          <div key={def.customFieldDefinitionId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
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
              padding: '1.15rem',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.65rem' }}>
                Customer Account Health
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Won Revenue</span>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(stats.totalWon)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Active Deals</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{stats.activeDealsCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Active Contracts</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{contracts.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Documents / Files</span>
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
              gap: '0.4rem',
              overflowX: 'auto',
              marginBottom: '0.85rem',
              paddingBottom: '4px',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <button
                className={`tab-btn ${activeTab === 'deals' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('deals')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.8rem' }}
              >
                <DollarSign size={14} /> Deals ({opportunities.length})
              </button>

              <button
                className={`tab-btn ${activeTab === 'payments' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('payments')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.8rem' }}
              >
                <CreditCard size={14} /> Payments ({payments.length})
              </button>

              <button
                className={`tab-btn ${activeTab === 'contracts' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('contracts')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.8rem' }}
              >
                <FileText size={14} /> Contracts ({contracts.length})
              </button>

              <button
                className={`tab-btn ${activeTab === 'activities' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('activities')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.8rem' }}
              >
                <Clock size={14} /> Timeline ({activities.length})
              </button>

              <button
                className={`tab-btn ${activeTab === 'tasks' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('tasks')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.8rem' }}
              >
                <CheckSquare size={14} /> Tasks ({tasks.filter(t => !t.isTerminal).length})
              </button>

              <button
                className={`tab-btn ${activeTab === 'attachments' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('attachments')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.8rem' }}
              >
                <LinkIcon size={14} /> Files ({attachmentsCount})
              </button>

              <button
                className={`tab-btn ${activeTab === 'audit' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('audit')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.8rem' }}
              >
                <History size={14} /> Audit History
              </button>
            </div>

            {/* TAB CONTENT CONTAINER */}
            <Card className="glass-panel" style={{
              borderRadius: '14px',
              padding: '1.25rem',
              border: '1px solid var(--border-color)',
              minHeight: '400px'
            }}>
              {/* ── TAB 1: DEALS & OPPORTUNITIES ─────────────────────────── */}
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
                      Customer Deals &amp; Opportunities
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
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)' }}>No deals recorded for this customer</p>
                      <p style={{ margin: '4px 0 1rem 0', fontSize: '0.82rem' }}>Create sales opportunities to track and close revenue.</p>
                      <Button size="sm" onClick={() => setIsOpportunityModalOpen(true)}>
                        <Plus size={14} style={{ marginRight: 4 }} /> Create Deal
                      </Button>
                    </div>
                  ) : (
                    <div className="bounded-scroll-container">
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                            <th style={{ padding: '0.75rem 0.5rem' }}>Deal Title</th>
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
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <span style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '12px',
                                  fontSize: '0.72rem',
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

              {/* ── TAB 2: PAYMENTS & BILLING ────────────────────────────── */}
              {activeTab === 'payments' && (
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
                      Customer Payments &amp; Settlement Ledger
                    </h3>
                    <Button size="sm" onClick={() => navigate('/payments')}>
                      <CreditCard size={14} style={{ marginRight: 4 }} /> View Payments Screen
                    </Button>
                  </div>

                  {payments.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: '10px',
                      color: 'var(--text-muted)'
                    }}>
                      <CreditCard size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)' }}>No payments recorded for this customer</p>
                      <p style={{ margin: '4px 0 1rem 0', fontSize: '0.82rem' }}>Payments logged through invoice checkout or direct transfers will appear here.</p>
                      <Button size="sm" onClick={() => navigate('/payments')}>
                        Go to Payments
                      </Button>
                    </div>
                  ) : (
                    <div className="bounded-scroll-container">
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                            <th style={{ padding: '0.75rem 0.5rem' }}>Payment #</th>
                            <th style={{ padding: '0.75rem 0.5rem' }}>Invoice</th>
                            <th style={{ padding: '0.75rem 0.5rem' }}>Amount</th>
                            <th style={{ padding: '0.75rem 0.5rem' }}>Method</th>
                            <th style={{ padding: '0.75rem 0.5rem' }}>Date</th>
                            <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Reference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map(p => (
                            <tr
                              key={p.paymentId}
                              style={{ borderBottom: '1px solid var(--border-color)' }}
                              className="table-row-hover"
                            >
                              <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                #{p.paymentNumber}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                #{p.invoiceNumber}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#10b981' }}>
                                {formatCurrency(p.amount)}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.82rem' }}>
                                {p.paymentMethod}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                {formatDisplayDate(p.paymentDate)}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <span style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '12px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: (p.status || '').toLowerCase() === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                  color: (p.status || '').toLowerCase() === 'completed' ? '#10b981' : '#f59e0b'
                                }}>
                                  {p.status}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {p.transactionReference || p.paymentNumber}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 3: CONTRACTS ─────────────────────────────────────── */}
              {activeTab === 'contracts' && (
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
                      Commercial Contracts
                    </h3>
                    <Button size="sm" onClick={() => navigate('/contracts')}>
                      <FileText size={14} style={{ marginRight: 4 }} /> View Contracts
                    </Button>
                  </div>

                  {contracts.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: '10px',
                      color: 'var(--text-muted)'
                    }}>
                      <FileText size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)' }}>No contracts signed with this customer</p>
                      <p style={{ margin: '4px 0 1rem 0', fontSize: '0.82rem' }}>Contracts associated with this customer will appear here.</p>
                      <Button size="sm" onClick={() => navigate('/contracts')}>
                        Go to Contracts
                      </Button>
                    </div>
                  ) : (
                    <div className="bounded-scroll-container">
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                            <th style={{ padding: '0.75rem 0.5rem' }}>Contract #</th>
                            <th style={{ padding: '0.75rem 0.5rem' }}>Title</th>
                            <th style={{ padding: '0.75rem 0.5rem' }}>Value</th>
                            <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Period</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contracts.map(c => (
                            <tr
                              key={c.contractId}
                              style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                              onClick={() => navigate('/contracts')}
                              className="table-row-hover"
                            >
                              <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                #{c.contractNumber}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>
                                {c.title}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#10b981' }}>
                                {formatCurrency(c.contractValue)}
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem' }}>
                                <span style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '12px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: (c.status || '').toLowerCase() === 'signed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                  color: (c.status || '').toLowerCase() === 'signed' ? '#10b981' : '#f59e0b'
                                }}>
                                  {c.status}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                {formatDisplayDate(c.startDate)} – {formatDisplayDate(c.endDate)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 4: ACTIVITIES & TIMELINE ─────────────────────────── */}
              {activeTab === 'activities' && (
                <div>
                  <TimelineList
                    activities={activities}
                    activityTypes={activityTypes}
                    customerId={customer.customerId}
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

              {/* ── TAB 5: TASKS ─────────────────────────────────────────── */}
              {activeTab === 'tasks' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Tasks &amp; Action Items
                    </h3>
                    <Button size="sm" onClick={() => navigate(`/tasks/new?customerId=${customer.customerId}`)}>
                      <Plus size={14} style={{ marginRight: 4 }} /> New Task
                    </Button>
                  </div>

                  <div className="bounded-scroll-container" style={{ maxHeight: '480px' }}>
                    <TaskListGroup
                      overdue={tasks.filter(t => !t.isTerminal && t.dueDate && new Date(t.dueDate) < new Date())}
                      dueToday={tasks.filter(t => !t.isTerminal && t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString())}
                      upcoming={tasks.filter(t => !t.isTerminal && (!t.dueDate || new Date(t.dueDate) > new Date()))}
                      completed={tasks.filter(t => t.isTerminal)}
                      onTaskComplete={(taskId) => {
                        setTasks(prev => prev.filter(t => t.crmTaskId !== taskId));
                      }}
                      onTaskClick={(t) => navigate(`/tasks/${t.crmTaskId}/edit`)}
                      onTaskDelete={fetchRelatedData}
                    />
                  </div>
                </div>
              )}

              {/* ── TAB 6: ATTACHMENTS ───────────────────────────────────── */}
              {activeTab === 'attachments' && (
                <Attachments
                  entity="customer"
                  entityId={customerIdNum}
                  onCountChange={setAttachmentsCount}
                />
              )}

              {/* ── TAB 7: AUDIT HISTORY ─────────────────────────────────── */}
              {activeTab === 'audit' && (
                <AuditHistoryTable
                  entityType="customers"
                  entityId={customerIdNum}
                  entityName={`${customer.firstName} ${customer.lastName}`}
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
          preselectedCustomerId={customer.customerId}
        />

        {/* ── EMAIL COMPOSER MODAL ────────────────────────────────────────── */}
        {isEmailModalOpen && customer.email && (
          <EmailComposerModal
            isOpen={isEmailModalOpen}
            onClose={() => setIsEmailModalOpen(false)}
            defaultRecipient={customer.email}
            recipientName={`${customer.firstName} ${customer.lastName}`}
            customerId={customer.customerId}
            onEmailSent={() => {
              setIsEmailModalOpen(false);
              fetchRelatedData();
              showToast('Email sent successfully.', 'success');
            }}
          />
        )}

        {/* ── DELETE CUSTOMER CONFIRM DIALOG ──────────────────────────────── */}
        <ConfirmDialog
          isOpen={isDeleteModalOpen}
          title="Delete Customer"
          message={`Are you sure you want to delete ${customer.firstName} ${customer.lastName}?`}
          confirmText="Delete Customer"
          onConfirm={handleDeleteCustomer}
          onCancel={() => setIsDeleteModalOpen(false)}
        />

      </div>
    </Layout>
  );
};
export default CustomerDetailScreen;