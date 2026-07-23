import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DatePicker } from '../components/ui/DatePicker';
import { SelectDown } from '../components/ui/SelectDown';
import { AuditHistory } from '../components/audit/AuditHistory';
import { TimelineList } from '../components/activities/TimelineList';
import { TaskListGroup, TaskReadDto } from '../components/tasks/TaskListGroup';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Mail, Phone, Building2, Tag, X, Plus, History, Check, XCircle, Trash2, Calendar, FileText, User } from 'lucide-react';
import './screens.css';

interface Opportunity {
  opportunityId: number;
  customerId: number;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone?: string;
  title: string;
  opportunityStageId: number;
  stageName?: string;
  estimatedValue: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  ownerId: number;
  ownerName?: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

interface Stage {
  opportunityStageId: number;
  name: string;
  isWon: boolean;
  isLost: boolean;
}

interface UserLookup {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface OpportunityLineItem {
  lineItemId: number;
  opportunityId: number;
  productId: number;
  product?: {
    name: string;
    sku?: string;
    productCategory?: { name: string };
  };
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  totalPrice: number;
}

interface Product {
  productId: number;
  name: string;
  sku?: string;
  productCategory?: { name: string };
  productStatus?: { isSelectable: boolean };
  price: number;
}

type TabId = 'details' | 'lineItems' | 'activities' | 'tasks' | 'audit';

export const OpportunityDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [lineItems, setLineItems] = useState<OpportunityLineItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [users, setUsers] = useState<UserLookup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Phase 4 states
  const [activities, setActivities] = useState<any[]>([]);
  const [activityTypes, setActivityTypes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<TaskReadDto[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<any[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState<TaskReadDto | null>(null);
  const [allActivities, setAllActivities] = useState<any[]>([]);

  const [editedOpportunity, setEditedOpportunity] = useState<Partial<Opportunity>>({});
  const [newLineItem, setNewLineItem] = useState({
    productId: 0,
    quantity: 1,
    unitPrice: 0,
    discountPercent: 0
  });

  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [auditRefreshTrigger, setAuditRefreshTrigger] = useState(0);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [oppData, lineItemsData, productsData, stagesData, usersData, actTypes, taskStats] = await Promise.all([
        api.get<Opportunity>(`/api/opportunities/${id}`),
        api.get<OpportunityLineItem[]>(`/api/opportunitylineitems/${id}`),
        api.get<Product[]>('/api/products'),
        api.get<Stage[]>('/api/opportunitystages'),
        api.get<UserLookup[]>('/api/users'),
        api.get<any[]>('/api/activitytypes'),
        api.get<any[]>('/api/taskstatuses')
      ]);
      setOpportunity(oppData);
      setEditedOpportunity(oppData);
      setLineItems(lineItemsData);
      setProducts(productsData.filter(p => p.productStatus?.isSelectable));
      setStages(stagesData);
      setUsers(usersData);
      setActivityTypes(actTypes.map(x => ({ id: x.id ?? x.Id, name: x.name ?? x.Name, icon: x.icon ?? x.Icon })));
      setTaskStatuses(taskStats.map(x => ({ id: x.id, name: x.name, isTerminal: x.isTerminal })));

      // Load activities & tasks
      const [activitiesData, tasksData, allActivitiesData] = await Promise.all([
        api.get<any[]>(`/api/activities?opportunityId=${id}`),
        api.get<TaskReadDto[]>(`/api/tasks?opportunityId=${id}`),
        api.get<any[]>('/api/activities')
      ]);
      setActivities(activitiesData);
      setTasks(tasksData);
      setAllActivities(allActivitiesData);
    } catch (error) {
      console.error('Failed to load opportunity details:', error);
      navigate('/pipeline');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFieldChange = (field: keyof Opportunity, value: any) => {
    setEditedOpportunity(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!id || !opportunity) return;
    setSaving(true);
    try {
      await api.put(`/api/opportunities/${id}`, {
        title: editedOpportunity.title,
        description: editedOpportunity.description,
        opportunityStageId: editedOpportunity.opportunityStageId,
        estimatedValue: editedOpportunity.estimatedValue,
        expectedCloseDate: editedOpportunity.expectedCloseDate,
        actualCloseDate: editedOpportunity.actualCloseDate,
        ownerId: editedOpportunity.ownerId,
      });
      await loadData();
      setAuditRefreshTrigger(t => t + 1);
      triggerToast('Opportunity updated successfully', 'success');
    } catch (error) {
      console.error('Failed to update opportunity:', error);
      triggerToast('Failed to update opportunity', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsWon = async () => {
    if (!id || !opportunity) return;
    const wonStage = stages.find(s => s.isWon);
    if (!wonStage) return;
    try {
      await api.patch(`/api/opportunities/${id}/stage`, { stageId: wonStage.opportunityStageId });
      await loadData();
      setAuditRefreshTrigger(t => t + 1);
      triggerToast('Opportunity marked as Won 🎉', 'success');
    } catch (error) {
      console.error('Failed to mark as won:', error);
      triggerToast('Failed to update stage', 'error');
    }
  };

  const handleMarkAsLost = async () => {
    if (!id || !opportunity) return;
    const lostStage = stages.find(s => s.isLost);
    if (!lostStage) return;
    try {
      await api.patch(`/api/opportunities/${id}/stage`, { stageId: lostStage.opportunityStageId });
      await loadData();
      setAuditRefreshTrigger(t => t + 1);
      triggerToast('Opportunity marked as Lost', 'error');
    } catch (error) {
      console.error('Failed to mark as lost:', error);
      triggerToast('Failed to update stage', 'error');
    }
  };

  const handleAddLineItem = async () => {
    if (newLineItem.productId === 0) {
      triggerToast('Please select a product first', 'error');
      return;
    }
    if (newLineItem.quantity <= 0) {
      triggerToast('Quantity must be greater than 0', 'error');
      return;
    }
    try {
      await api.post('/api/opportunitylineitems', {
        opportunityId: Number(id),
        ...newLineItem
      });
      setNewLineItem({ productId: 0, quantity: 1, unitPrice: 0, discountPercent: 0 });
      await loadData();
      triggerToast('Line item added successfully', 'success');
    } catch (error) {
      console.error('Failed to add line item:', error);
      triggerToast('Failed to add line item', 'error');
    }
  };

  const handleDeleteLineItem = async (lineItemId: number) => {
    try {
      await api.delete(`/api/opportunitylineitems/${lineItemId}`);
      await loadData();
      triggerToast('Line item removed', 'success');
    } catch (error) {
      console.error('Failed to delete line item:', error);
      triggerToast('Failed to remove line item', 'error');
    }
  };

  const handleProductChange = (productId: number) => {
    const product = products.find(p => p.productId === productId);
    if (product) {
      setNewLineItem(prev => ({
        ...prev,
        productId,
        unitPrice: product.price
      }));
    }
  };

  const handleTaskComplete = (taskId: number) => {
    setTasks(prev => prev.filter(t => t.crmTaskId !== taskId));
  };

  const handleTaskSaved = () => {
    setShowTaskModal(false);
    setEditTask(null);
    loadData();
  };

  const triggerToast = (message: string, type: 'success' | 'error') => {
    const event = new CustomEvent('app:toast', {
      detail: { message, type }
    });
    window.dispatchEvent(event);
  };

  const calculatedTotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);

  const groupedTasks = (() => {
    const now = new Date();
    const today = now.toDateString();

    const overdue: TaskReadDto[] = [];
    const dueToday: TaskReadDto[] = [];
    const upcoming: TaskReadDto[] = [];
    const completed: TaskReadDto[] = [];

    tasks.forEach(t => {
      if (t.isTerminal) {
        completed.push(t);
        return;
      }
      if (!t.dueDate) {
        upcoming.push(t);
      } else {
        const due = new Date(t.dueDate);
        const dueDateStr = due.toDateString();
        if (due < now) {
          overdue.push(t);
        } else if (dueDateStr === today && due <= now) {
          dueToday.push(t);
        } else {
          upcoming.push(t);
        }
      }
    });
    return { overdue, dueToday, upcoming, completed };
  })();

  if (isLoading || !opportunity) {
    return (
      <Layout>
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading opportunity...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="detail-header animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => navigate('/pipeline')}>
          <ArrowLeft size={16} style={{ marginRight: 6 }} /> Back
        </Button>
        <div className="detail-header-info">
          <div>
            <h1>{opportunity.title}</h1>
            <p>
              Customer: <Link to={`/customers/${opportunity.customerId}`} style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                {opportunity.customerFirstName} {opportunity.customerLastName}
              </Link>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="ghost" onClick={handleMarkAsWon} style={{ border: '1px solid var(--success)', color: 'var(--success)' }}>
            <Check size={16} style={{ marginRight: 4 }} /> Mark Won
          </Button>
          <Button variant="ghost" onClick={handleMarkAsLost} style={{ border: '1px solid var(--danger)', color: 'var(--danger)' }}>
            <XCircle size={16} style={{ marginRight: 4 }} /> Mark Lost
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Details'}
          </Button>
        </div>
      </div>

      <div className="detail-layout animate-fade-in">
        {/* Left Info Panel */}
        <Card className="glass-panel detail-sidebar">
          <Card.Content>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', marginTop: 0 }}>
              Opportunity Info
            </h3>
            <div className="customer-details">
              <div className="detail-row">
                <Tag size={15} />
                <span>Stage: <strong>{opportunity.stageName}</strong></span>
              </div>
              <div className="detail-row">
                <Building2 size={15} />
                <span>Value: <strong>${opportunity.estimatedValue.toLocaleString()}</strong></span>
              </div>
              <div className="detail-row">
                <Calendar size={15} />
                <span>Expected Close: <strong>{opportunity.expectedCloseDate ? new Date(opportunity.expectedCloseDate).toLocaleDateString() : '—'}</strong></span>
              </div>
              <div className="detail-row">
                <User size={15} />
                <span>Owner: <strong>{opportunity.ownerName}</strong></span>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Right Main Panel */}
        <div className="detail-main">
          <div className="tabs-bar">
            {(['details', 'lineItems', 'activities', 'tasks', 'audit'] as TabId[]).map(tab => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'tab-active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'details' && <span>Details</span>}
                {tab === 'lineItems' && <span>Line Items ({lineItems.length})</span>}
                {tab === 'activities' && <span>Activities ({activities.length})</span>}
                {tab === 'tasks' && <span>Tasks ({tasks.filter(t => !t.isTerminal).length})</span>}
                {tab === 'audit' && <span><History size={14} style={{ marginRight: 4 }} /> Audit History</span>}
              </button>
            ))}
          </div>

          <Card className="glass-panel">
            <Card.Content>
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="profile-grid">
                  <div className="profile-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Title</label>
                    <Input
                      value={editedOpportunity.title || ''}
                      onChange={e => handleFieldChange('title', e.target.value)}
                    />
                  </div>

                  <div className="profile-field">
                    <label>Stage</label>
                    <SelectDown
                      value={editedOpportunity.opportunityStageId || opportunity.opportunityStageId}
                      options={stages.map(s => ({ value: s.opportunityStageId, label: s.name }))}
                      onChange={val => handleFieldChange('opportunityStageId', Number(val))}
                    />
                  </div>

                  <div className="profile-field">
                    <label>Owner</label>
                    <SelectDown
                      value={editedOpportunity.ownerId || opportunity.ownerId}
                      options={users.filter(u => u.isActive).map(u => ({ value: u.id, label: u.name }))}
                      onChange={val => handleFieldChange('ownerId', Number(val))}
                    />
                  </div>

                  <div className="profile-field">
                    <label>Estimated Value</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editedOpportunity.estimatedValue ?? opportunity.estimatedValue}
                      onChange={e => handleFieldChange('estimatedValue', Number(e.target.value))}
                    />
                  </div>

                  <div className="profile-field">
                    <label>Expected Close Date</label>
                    <DatePicker
                      value={editedOpportunity.expectedCloseDate?.split('T')[0] || opportunity.expectedCloseDate?.split('T')[0] || ''}
                      onChange={e => handleFieldChange('expectedCloseDate', e)}
                    />
                  </div>

                  <div className="profile-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Description</label>
                    <textarea
                      value={editedOpportunity.description || ''}
                      onChange={e => handleFieldChange('description', e.target.value)}
                      className="input-field"
                      style={{ minHeight: '100px' }}
                    />
                  </div>
                </div>
              )}

              {/* Line Items Tab */}
              {activeTab === 'lineItems' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Opportunity Products</h3>
                    <strong style={{ fontSize: '1rem', color: 'var(--accent-primary)' }}>
                      Total Value: ${calculatedTotal.toLocaleString()}
                    </strong>
                  </div>

                  <div className="add-line-item" style={{ marginBottom: '1.5rem' }}>
                    <select
                      className="filter-select"
                      value={newLineItem.productId}
                      onChange={e => handleProductChange(Number(e.target.value))}
                    >
                      <option value="0">Select Product…</option>
                      {products.map(p => (
                        <option key={p.productId} value={p.productId}>
                          {p.name} (${p.price})
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={newLineItem.quantity}
                      onChange={e => setNewLineItem(prev => ({ ...prev, quantity: Math.max(1, Number(e.target.value)) }))}
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={newLineItem.unitPrice}
                      onChange={e => setNewLineItem(prev => ({ ...prev, unitPrice: Number(e.target.value) }))}
                    />
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Disc %"
                      value={newLineItem.discountPercent}
                      onChange={e => setNewLineItem(prev => ({ ...prev, discountPercent: Number(e.target.value) }))}
                    />
                    <Button onClick={handleAddLineItem} size="sm">Add</Button>
                  </div>

                  {lineItems.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No line items added yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {lineItems.map(item => (
                        <div key={item.lineItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                          <div>
                            <strong style={{ color: 'var(--text-primary)' }}>{item.product?.name}</strong>
                            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              SKU: {item.product?.sku || 'N/A'} · Category: {item.product?.productCategory?.name || 'N/A'}
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                              {item.quantity} × ${item.unitPrice}
                              {item.discountPercent > 0 && ` (-${item.discountPercent}%)`}
                            </span>
                            <strong style={{ color: 'var(--text-primary)', minWidth: '70px', textAlign: 'right' }}>
                              ${item.totalPrice.toLocaleString()}
                            </strong>
                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() => handleDeleteLineItem(item.lineItemId)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Activities Tab */}
              {activeTab === 'activities' && (
                <TimelineList
                  activities={activities}
                  activityTypes={activityTypes}
                  opportunityId={opportunity.opportunityId}
                  currentUserId={currentUser?.userId}
                  isAdmin={currentUser?.roles?.includes('Admin') ?? false}
                  onActivityLogged={(act) => setActivities(prev => [act, ...prev])}
                  onActivityDeleted={(id) => setActivities(prev => prev.filter(a => a.activityId !== id))}
                />
              )}

              {/* Tasks Tab */}
              {activeTab === 'tasks' && (
                <div>
                  <div style={{ display: 'flex', justifySelf: 'end', marginBottom: '1rem' }}>
                    <button
                      type="button"
                      className="btn-outline-sm"
                      onClick={() => { setEditTask(null); setShowTaskModal(true); }}
                    >
                      <Plus size={14} /> New Task
                    </button>
                  </div>
                  <TaskListGroup
                    overdue={groupedTasks.overdue}
                    dueToday={groupedTasks.dueToday}
                    upcoming={groupedTasks.upcoming}
                    completed={groupedTasks.completed}
                    onTaskComplete={handleTaskComplete}
                    onTaskClick={(t) => { setEditTask(t); setShowTaskModal(true); }}
                  />
                </div>
              )}

              {/* Audit History Tab */}
              {activeTab === 'audit' && (
                <AuditHistory entityType="opportunity" entityId={opportunity.opportunityId} refreshTrigger={auditRefreshTrigger} />
              )}
            </Card.Content>
          </Card>
        </div>
      </div>

      {showTaskModal && (
        <TaskFormModal
          task={editTask}
          opportunityId={opportunity.opportunityId}
          currentUserId={currentUser?.userId ?? 0}
          users={users.length > 0 ? users : (currentUser ? [{ id: currentUser.userId, name: currentUser.name }] : [])}
          activities={allActivities.map(a => ({ id: a.activityId, name: a.subject }))}
          activityTypes={activityTypes.map(at => ({ id: at.id, name: at.name }))}
          statuses={taskStatuses}
          onSaved={handleTaskSaved}
          onDeleted={() => {
            setShowTaskModal(false);
            setEditTask(null);
            loadData();
          }}
          onClose={() => { setShowTaskModal(false); setEditTask(null); }}
        />
      )}
    </Layout>
  );
};
