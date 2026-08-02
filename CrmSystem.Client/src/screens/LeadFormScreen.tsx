import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';
import { ArrowLeft } from 'lucide-react';
import './screens.css';

interface FormState {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    companyName: string;
    jobTitle: string;
    sourceId: string;
    leadStatusId: string;
    assignedRepId: string;
    priority: string;
    leadScore: number;
    notes: string;
}

export const LeadFormScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [form, setForm] = useState<FormState>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        companyName: '',
        jobTitle: '',
        sourceId: '',
        leadStatusId: '',
        assignedRepId: '',
        priority: 'Medium',
        leadScore: 0,
        notes: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [sources, setSources] = useState<{ id: number; name: string }[]>([]);
    const [statuses, setStatuses] = useState<{ id: number; name: string }[]>([]);
    const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
    const isEdit = Boolean(id);

    useEffect(() => {
        api.get<{ id: number; name: string }[]>('/api/sources')
            .then(data => setSources(data))
            .catch(() => { });
        api.get<{ id: number; name: string }[]>('/api/leadstatuses')
            .then(data => setStatuses(data))
            .catch(() => { });
        api.get<any[]>('/api/users')
            .then(data => setUsers(data.map((u: any) => ({ id: u.id ?? u.identityId, name: u.name }))))
            .catch(() => { });
    }, []);

    useEffect(() => {
        if (!id) return;
        setIsLoading(true);
        api.get<any>(`/api/leads/${id}`)
            .then(lead => {
                setForm({
                    firstName: lead.firstName,
                    lastName: lead.lastName,
                    email: lead.email ?? '',
                    phone: lead.phone ?? '',
                    companyName: lead.companyName ?? '',
                    jobTitle: lead.jobTitle ?? '',
                    sourceId: String(lead.sourceId ?? ''),
                    leadStatusId: String(lead.leadStatusId ?? ''),
                    assignedRepId: String(lead.assignedRepId ?? ''),
                    priority: lead.priority ?? 'Medium',
                    leadScore: lead.leadScore ?? 0,
                    notes: lead.notes ?? ''
                });
            })
            .catch(() => navigate('/leads'))
            .finally(() => setIsLoading(false));
    }, [id, navigate]);

    const handleChange = (field: keyof FormState, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
        setApiError(null);
    };

    const validate = (): boolean => {
        const tempErrors: Record<string, string> = {};
        if (!form.firstName.trim()) tempErrors.firstName = 'First name is required';
        if (!form.lastName.trim()) tempErrors.lastName = 'Last name is required';
        if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            tempErrors.email = 'Email address is invalid';
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleSubmit = async () => {
        setApiError(null);
        if (!validate()) return;

        const payload = {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim() || null,
            phone: form.phone.trim() || null,
            companyName: form.companyName.trim() || null,
            jobTitle: form.jobTitle.trim() || null,
            sourceId: form.sourceId ? Number(form.sourceId) : null,
            priority: form.priority,
            leadScore: Number(form.leadScore) || 0,
            assignedRepId: form.assignedRepId ? Number(form.assignedRepId) : null,
            notes: form.notes.trim() || null
        };

        try {
            if (isEdit) {
                await api.put(`/api/leads/${id}`, { ...payload, leadStatusId: form.leadStatusId ? Number(form.leadStatusId) : null });
                showToast('Lead updated successfully', 'success');
            } else {
                await api.post('/api/leads', payload);
                showToast('Lead created successfully', 'success');
            }
            navigate('/leads');
        } catch (error: any) {
            console.error(error);
            setApiError(error.message || 'An error occurred while saving the lead record.');
        }
    };

    if (isLoading) {
        return <Layout><div className="loading-state"><div className="spinner" /><p>Loading lead...</p></div></Layout>;
    }

    return (
        <Layout>
            <div className="detail-header animate-fade-in">
                <Button variant="ghost" size="sm" onClick={() => navigate('/leads')}>
                    <ArrowLeft size={16} style={{ marginRight: 6 }} /> Back
                </Button>
                <div className="detail-header-info">
                    <div>
                        <h1>{isEdit ? 'Edit Lead' : 'New Lead'}</h1>
                        <p>{isEdit ? 'Update lead details & priority' : 'Create a new prospect lead'}</p>
                    </div>
                </div>
            </div>

            <Card className="glass-panel">
                <Card.Content>
                    {apiError && (
                        <div className="form-error-banner animate-fade-in">
                            {apiError}
                        </div>
                    )}
                    <div className="form-grid">
                        <Input label="First Name *" value={form.firstName} onChange={e => handleChange('firstName', e.target.value)} error={errors.firstName} />
                        <Input label="Last Name *" value={form.lastName} onChange={e => handleChange('lastName', e.target.value)} error={errors.lastName} />
                        <Input label="Email" type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} error={errors.email} />
                        <Input label="Phone" value={form.phone} onChange={e => handleChange('phone', e.target.value)} error={errors.phone} />
                        <Input label="Company" value={form.companyName} onChange={e => handleChange('companyName', e.target.value)} error={errors.companyName} />
                        <Input label="Job Title" value={form.jobTitle} onChange={e => handleChange('jobTitle', e.target.value)} error={errors.jobTitle} />

                        <div className="input-wrapper">
                            <label className="input-label">Priority</label>
                            <select className="input-field" value={form.priority} onChange={e => handleChange('priority', e.target.value)}>
                                <option key="priority-low" value="Low">Low</option>
                                <option key="priority-medium" value="Medium">Medium</option>
                                <option key="priority-high" value="High">High</option>
                                <option key="priority-urgent" value="Urgent">Urgent</option>
                            </select>
                        </div>

                        <Input label="Lead Score (0-100)" type="number" min="0" max="100" value={String(form.leadScore)} onChange={e => handleChange('leadScore', e.target.value)} />

                        {users.length > 0 && (
                            <div className="input-wrapper">
                                <label className="input-label">Assigned Sales Rep</label>
                                <select className="input-field" value={form.assignedRepId} onChange={e => handleChange('assignedRepId', e.target.value)}>
                                    <option key="rep-unassigned" value="">Unassigned</option>
                                    {users.map(u => (
                                        <option key={`rep-${u.id}`} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="input-wrapper">
                            <label className="input-label">Source</label>
                            <select className="input-field" value={form.sourceId} onChange={e => handleChange('sourceId', e.target.value)}>
                                <option key="source-default" value="">Select source</option>
                                {sources.map(source => (
                                    <option key={`source-${source.id}`} value={source.id}>{source.name}</option>
                                ))}
                            </select>
                        </div>

                        {isEdit && (
                            <div className="input-wrapper">
                                <label className="input-label">Status</label>
                                <select className="input-field" value={form.leadStatusId} onChange={e => handleChange('leadStatusId', e.target.value)}>
                                    <option key="status-default" value="">Select status</option>
                                    {statuses.map(status => (
                                        <option key={`status-${status.id}`} value={status.id}>{status.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="input-wrapper" style={{ gridColumn: '1 / -1' }}>
                            <label className="input-label">Notes</label>
                            <textarea className="input-field" rows={5} value={form.notes} onChange={e => handleChange('notes', e.target.value)} placeholder="Add any background or notes for this prospect..." />
                        </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                        <Button onClick={handleSubmit}>{isEdit ? 'Save Changes' : 'Create Lead'}</Button>
                        <Button variant="ghost" onClick={() => navigate('/leads')}>Cancel</Button>
                    </div>
                </Card.Content>
            </Card>
        </Layout>
    );
};
