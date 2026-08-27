import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, CheckSquare, Calendar, Clock, User, Briefcase,
  Layers, AlertCircle, Trash2, Plus, CheckCircle2
} from 'lucide-react';
import { validateName, validateMaxLength } from '../lib/validators';
import './screens.css';

interface Lookup {
  id: number;
  name: string;
}

interface StatusLookup {
  id: number;
  name: string;
  isTerminal: boolean;
}

function formatLocalDateTime(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export const TaskFormScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isEdit = Boolean(id);

  const initialCustomerId = searchParams.get('customerId') ? Number(searchParams.get('customerId')) : 0;
  const initialOpportunityId = searchParams.get('opportunityId') ? Number(searchParams.get('opportunityId')) : 0;
  const initialLeadId = searchParams.get('leadId') ? Number(searchParams.get('leadId')) : 0;
  const initialDueDate = searchParams.get('dueDate') ? `${searchParams.get('dueDate')}T10:00` : (() => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    return formatLocalDateTime(now);
  })();

  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: initialDueDate,
    crmTaskStatusId: '1',
    assignedToId: currentUser?.userId ? String(currentUser.userId) : '',
    customerId: initialCustomerId ? String(initialCustomerId) : '',
    opportunityId: initialOpportunityId ? String(initialOpportunityId) : '',
    leadId: initialLeadId ? String(initialLeadId) : '',
    activityId: ''
  });

  const [users, setUsers] = useState<Lookup[]>([]);
  const [customers, setCustomers] = useState<Lookup[]>([]);
  const [opportunities, setOpportunities] = useState<Lookup[]>([]);
  const [leads, setLeads] = useState<Lookup[]>([]);
  const [statuses, setStatuses] = useState<StatusLookup[]>([]);
  const [activityTypes, setActivityTypes] = useState<Lookup[]>([]);
  const [activities, setActivities] = useState<Lookup[]>([]);

  const [activityMode, setActivityMode] = useState<'none' | 'link' | 'create'>('none');
  const [newActivity, setNewActivity] = useState({
    activityTypeId: '1',
    subject: '',
    description: '',
    activityDate: formatLocalDateTime(new Date())
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Load Lookups
  useEffect(() => {
    // Users
    api.get<any[]>('/api/users')
      .then(res => setUsers((res || []).map(u => ({ id: u.id || u.identityId, name: u.name }))))
      .catch(() => {});

    // Customers
    api.get<any>('/api/customers?pageSize=500')
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data ?? res?.items ?? []);
        setCustomers(list.map((c: any) => ({
          id: c.customerId ?? c.id,
          name: `${c.firstName || ''} ${c.lastName || ''}${c.companyName ? ` (${c.companyName})` : ''}`.trim()
        })));
      })
      .catch(() => {});

    // Leads
    api.get<any>('/api/leads?pageSize=500')
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data ?? res?.items ?? []);
        setLeads(list.map((l: any) => ({
          id: l.leadId ?? l.id,
          name: `${l.firstName || ''} ${l.lastName || ''}${l.companyName ? ` (${l.companyName})` : ''}`.trim()
        })));
      })
      .catch(() => {});

    // Task Statuses
    api.get<any[]>('/api/taskstatuses')
      .then(res => {
        const list = (res || []).map(s => ({ id: s.id, name: s.name, isTerminal: Boolean(s.isTerminal) }));
        setStatuses(list);
        if (!isEdit && list.length > 0) {
          const firstNonTerminal = list.find(s => !s.isTerminal) || list[0];
          setForm(f => ({ ...f, crmTaskStatusId: String(firstNonTerminal.id) }));
        }
      })
      .catch(() => {});

    // Activity Types
    api.get<any[]>('/api/activitytypes')
      .then(res => setActivityTypes((res || []).map(at => ({ id: at.id ?? at.Id, name: at.name ?? at.Name }))))
      .catch(() => {});

    // Activities
    api.get<any[]>('/api/activities')
      .then(res => setActivities((res || []).map(a => ({ id: a.activityId, name: a.subject }))))
      .catch(() => {});
  }, [isEdit]);

  // 2. Load Opportunities when customer changes
  useEffect(() => {
    if (!form.customerId) {
      setOpportunities([]);
      return;
    }
    api.get<any>(`/api/opportunities?customerId=${form.customerId}`)
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        setOpportunities(list.map((o: any) => ({
          id: o.opportunityId,
          name: `${o.title} ($${(o.estimatedValue || 0).toLocaleString()})`
        })));
      })
      .catch(() => setOpportunities([]));
  }, [form.customerId]);

  // 3. Load Existing Task on Edit
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    api.get<any>(`/api/tasks/${id}`)
      .then(t => {
        setForm({
          title: t.title || '',
          description: t.description || '',
          dueDate: t.dueDate ? t.dueDate.slice(0, 16) : formatLocalDateTime(new Date()),
          crmTaskStatusId: String(t.crmTaskStatusId || '1'),
          assignedToId: String(t.assignedToId || currentUser?.userId || ''),
          customerId: t.customerId ? String(t.customerId) : '',
          opportunityId: t.opportunityId ? String(t.opportunityId) : '',
          leadId: t.leadId ? String(t.leadId) : '',
          activityId: t.activityId ? String(t.activityId) : ''
        });
      })
      .catch(() => {
        showToast('Failed to load task details', 'error');
        navigate('/tasks');
      })
      .finally(() => setIsLoading(false));
  }, [id, navigate, currentUser?.userId]);

  // Quick Date Presets
  const applyDatePreset = (type: 'plus1h' | 'today5pm' | 'tomorrow9am' | 'in2days' | 'nextweek') => {
    const d = new Date();
    if (type === 'plus1h') {
      d.setHours(d.getHours() + 1, 0, 0, 0);
    } else if (type === 'today5pm') {
      d.setHours(17, 0, 0, 0);
    } else if (type === 'tomorrow9am') {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    } else if (type === 'in2days') {
      d.setDate(d.getDate() + 2);
      d.setHours(10, 0, 0, 0);
    } else if (type === 'nextweek') {
      d.setDate(d.getDate() + 7);
      d.setHours(9, 0, 0, 0);
    }
    const val = formatLocalDateTime(d);
    setForm(f => ({ ...f, dueDate: val }));
    setErrors(e => ({ ...e, dueDate: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};

    const titleErr = validateName(form.title, 'Task title', 2, 150);
    if (titleErr) errs.title = titleErr;

    if (!form.dueDate || !form.dueDate.trim()) {
      errs.dueDate = 'Due date and time are required';
    } else {
      const d = new Date(form.dueDate);
      if (isNaN(d.getTime())) {
        errs.dueDate = 'Invalid date format';
      }
    }

    const descErr = validateMaxLength(form.description, 1000, 'Description');
    if (descErr) errs.description = descErr;

    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showToast(Object.values(validationErrors)[0], 'error');
      return;
    }

    setIsSaving(true);
    try {
      let linkedActivityId: number | null = form.activityId ? Number(form.activityId) : null;

      // Handle on-the-fly activity creation
      if (activityMode === 'create' && newActivity.subject.trim()) {
        const actRes = await api.post<any>('/api/activities', {
          activityTypeId: Number(newActivity.activityTypeId) || 1,
          subject: newActivity.subject.trim(),
          description: newActivity.description.trim() || null,
          activityDate: new Date(newActivity.activityDate).toISOString(),
          customerId: form.customerId ? Number(form.customerId) : null,
          opportunityId: form.opportunityId ? Number(form.opportunityId) : null,
          leadId: form.leadId ? Number(form.leadId) : null
        });
        linkedActivityId = actRes.activityId;
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        dueDate: new Date(form.dueDate).toISOString(),
        crmTaskStatusId: Number(form.crmTaskStatusId) || 1,
        assignedToId: Number(form.assignedToId) || currentUser?.userId,
        customerId: form.customerId ? Number(form.customerId) : null,
        opportunityId: form.opportunityId ? Number(form.opportunityId) : null,
        leadId: form.leadId ? Number(form.leadId) : null,
        activityId: linkedActivityId
      };

      if (isEdit) {
        await api.put(`/api/tasks/${id}`, payload);
        showToast('Task updated successfully.', 'success');
      } else {
        await api.post('/api/tasks', payload);
        showToast('Task created successfully.', 'success');
      }
      navigate('/tasks');
    } catch (err: any) {
      showToast(err.message || 'Failed to save task.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="task-form-container animate-fade-in" style={{ maxWidth: '860px', margin: '0 auto', paddingBottom: '3rem' }}>
        
        {/* Header Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/tasks')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={16} /> Back to Tasks
          </Button>
        </div>

        <Card className="glass-panel" style={{ borderRadius: '16px', padding: '2rem', border: '1px solid var(--border-color)' }}>
          {/* Card Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(6, 182, 212, 0.12)',
              color: '#06b6d4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <CheckSquare size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {isEdit ? 'Edit Task & Action Item' : 'Create Task & Action Item'}
              </h1>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {isEdit ? 'Update follow-up deadlines, assignee, and related CRM entity associations.' : 'Schedule team follow-ups, calls, client demos, and closing actions.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Task Title */}
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                Task Title *
              </label>
              <Input
                placeholder="e.g. Schedule product demo with technical decision maker"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                maxLength={150}
              />
              {errors.title && <span className="form-error" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.title}</span>}
            </div>

            {/* Due Date & Time with Quick Presets */}
            <div style={{
              background: 'var(--bg-secondary)',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem' }}>
                  Due Date &amp; Time *
                </label>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => applyDatePreset('plus1h')} className="btn-outline-sm" style={{ fontSize: '0.72rem', padding: '2px 7px' }}>+1h</button>
                  <button type="button" onClick={() => applyDatePreset('today5pm')} className="btn-outline-sm" style={{ fontSize: '0.72rem', padding: '2px 7px' }}>Today 5PM</button>
                  <button type="button" onClick={() => applyDatePreset('tomorrow9am')} className="btn-outline-sm" style={{ fontSize: '0.72rem', padding: '2px 7px' }}>Tomorrow 9AM</button>
                  <button type="button" onClick={() => applyDatePreset('in2days')} className="btn-outline-sm" style={{ fontSize: '0.72rem', padding: '2px 7px' }}>In 2 Days</button>
                  <button type="button" onClick={() => applyDatePreset('nextweek')} className="btn-outline-sm" style={{ fontSize: '0.72rem', padding: '2px 7px' }}>Next Week</button>
                </div>
              </div>

              <Input
                type="datetime-local"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              />
              {errors.dueDate && <span className="form-error" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.dueDate}</span>}
            </div>

            {/* Status & Assignee */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                  Status *
                </label>
                <select
                  className="filter-select"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  value={form.crmTaskStatusId}
                  onChange={e => setForm(f => ({ ...f, crmTaskStatusId: e.target.value }))}
                >
                  {statuses.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                  Assignee
                </label>
                <select
                  className="filter-select"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  value={form.assignedToId}
                  onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}
                >
                  <option value="">Select staff assignee...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Entity Links: Customer, Opportunity, Lead */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--border-color)'
            }}>
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                  Customer Association (Optional)
                </label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'None' },
                    ...customers.map(c => ({ value: String(c.id), label: c.name }))
                  ]}
                  value={form.customerId}
                  onChange={val => setForm(f => ({ ...f, customerId: String(val || ''), opportunityId: '', leadId: '' }))}
                  placeholder="Select customer..."
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                  Opportunity / Deal (Optional)
                </label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'None' },
                    ...opportunities.map(o => ({ value: String(o.id), label: o.name }))
                  ]}
                  value={form.opportunityId}
                  onChange={val => setForm(f => ({ ...f, opportunityId: String(val || ''), leadId: '' }))}
                  placeholder="Select deal..."
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                  Lead Association (Optional)
                </label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'None' },
                    ...leads.map(l => ({ value: String(l.id), label: l.name }))
                  ]}
                  value={form.leadId}
                  onChange={val => setForm(f => ({ ...f, leadId: String(val || ''), customerId: '', opportunityId: '' }))}
                  placeholder="Select lead..."
                />
              </div>
            </div>

            {/* Task Description / Notes */}
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                Task Description &amp; Action Notes
              </label>
              <textarea
                className="input-field"
                rows={4}
                placeholder="Include agenda items, call objectives, follow-up checklist, or customer requirements..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {/* Form Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1.25rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border-color)'
            }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/tasks')}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || isLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {isSaving ? 'Saving Task...' : (isEdit ? 'Update Task' : 'Create Task')}
              </Button>
            </div>

          </form>
        </Card>
      </div>
    </Layout>
  );
};
export default TaskFormScreen;
