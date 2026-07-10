import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
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
        notes: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [sources, setSources] = useState<{ id: number; name: string }[]>([]);
    const [statuses, setStatuses] = useState<{ id: number; name: string }[]>([]);
    const isEdit = Boolean(id);

    useEffect(() => {
        api.get<{ id: number; name: string }[]>('/api/sources')
            .then(data => setSources(data))
            .catch(() => { /* non-critical */ });
        api.get<{ id: number; name: string }[]>('/api/leadstatuses')
            .then(data => setStatuses(data))
            .catch(() => { });
    }, [navigate]);

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
                    notes: lead.notes ?? ''
                });
            })
            .catch(() => navigate('/leads'))
            .finally(() => setIsLoading(false));
    }, [id, navigate]);

    const handleChange = (field: keyof FormState, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        const payload = {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone || null,
            companyName: form.companyName || null,
            jobTitle: form.jobTitle || null,
            sourceId: form.sourceId ? Number(form.sourceId) : null,
            assignedRepId: null,
            notes: form.notes || null
        };

        try {
            if (isEdit) {
                await api.put(`/api/leads/${id}`, { ...payload, leadStatusId: Number(form.leadStatusId) });
            } else {
                await api.post('/api/leads', payload);
            }
            navigate('/leads');
        } catch (error) {
            console.error(error);
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
                        <p>{isEdit ? 'Update lead information' : 'Create a new lead'}</p>
                    </div>
                </div>
            </div>

            <Card className="glass-panel">
                <Card.Content>
                    <div className="form-grid">
                        <Input label="First Name" value={form.firstName} onChange={e => handleChange('firstName', e.target.value)} />
                        <Input label="Last Name" value={form.lastName} onChange={e => handleChange('lastName', e.target.value)} />
                        <Input label="Email" type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} />
                        <Input label="Phone" value={form.phone} onChange={e => handleChange('phone', e.target.value)} />
                        <Input label="Company" value={form.companyName} onChange={e => handleChange('companyName', e.target.value)} />
                        <Input label="Job Title" value={form.jobTitle} onChange={e => handleChange('jobTitle', e.target.value)} />
                        <div className="input-wrapper">
                            <label className="input-label">Source</label>
                            <select className="input-field" value={form.sourceId} onChange={e => handleChange('sourceId', e.target.value)}>
                                <option value="">Select source</option>
                                {sources.map(source => (
                                    <option key={source.id} value={source.id}>{source.name}</option>
                                ))}
                            </select>
                        </div>
                        {isEdit && (
                            <div className="input-wrapper">
                                <label className="input-label">Status</label>
                                <select className="input-field" value={form.leadStatusId} onChange={e => handleChange('leadStatusId', e.target.value)}>
                                    <option value="">Select status</option>
                                    {statuses.map(status => (
                                        <option key={status.id} value={status.id}>{status.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="input-wrapper" style={{ gridColumn: '1 / -1' }}>
                            <label className="input-label">Notes</label>
                            <textarea className="input-field" rows={5} value={form.notes} onChange={e => handleChange('notes', e.target.value)} />
                        </div>
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <Button onClick={handleSubmit}>{isEdit ? 'Save changes' : 'Create lead'}</Button>
                    </div>
                </Card.Content>
            </Card>
        </Layout>
    );
};
