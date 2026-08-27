import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PhoneInput } from '../components/ui/PhoneInput';
import { validateName, validateEmail, validatePhone, validatePositiveNumber, validateMaxLength } from '../lib/validators';
import { api } from '../lib/api';
import { showToast } from '../lib/toast';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { useAuth } from '../context/AuthContext';
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

interface CustomFieldDef {
    customFieldDefinitionId: number;
    entityType: string;
    fieldName: string;
    fieldType: string;
    optionsJson: string | null;
    sortOrder: number;
}

export const LeadFormScreen: React.FC = () => {
    const { isManagerOrAboveSelected, user } = useAuth();
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
        assignedRepId: user?.userId ? String(user.userId) : '',
        priority: 'Medium',
        leadScore: 0,
        notes: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
    const [customFields, setCustomFields] = useState<Record<string, string>>({});
    const [sources, setSources] = useState<{ id: number; name: string }[]>([]);
    const [statuses, setStatuses] = useState<{ id: number; name: string }[]>([]);
    const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
    const isEdit = Boolean(id);

    useEffect(() => {
        api.get<{ id: number; name: string }[]>('/api/sources')
            .then(data => {
                const raw = data ?? [];
                const nonOther = raw.filter(s => s.name.trim().toLowerCase() !== 'other');
                const other = raw.find(s => s.name.trim().toLowerCase() === 'other') || { id: 999999, name: 'Other' };
                setSources([...nonOther, other]);
            })
            .catch(() => {
                setSources([{ id: 999999, name: 'Other' }]);
            });
        api.get<{ id: number; name: string }[]>('/api/leadstatuses')
            .then(data => setStatuses(data))
            .catch(() => { });
        api.get<any[]>('/api/users')
            .then(data => setUsers(data.map((u: any) => ({ id: u.id ?? u.identityId, name: u.name }))))
            .catch(() => { });
        api.get<CustomFieldDef[]>('/api/custom-field-definitions?entityType=Lead')
            .then(setCustomFieldDefs)
            .catch(() => setCustomFieldDefs([]));
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
                if (lead.customFieldsJson) {
                    try {
                        setCustomFields(JSON.parse(lead.customFieldsJson));
                    } catch { /* ignore */ }
                }
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
        
        const firstNameErr = validateName(form.firstName, 'First name', 2, 50);
        if (firstNameErr) tempErrors.firstName = firstNameErr;

        const lastNameErr = validateName(form.lastName, 'Last name', 2, 50);
        if (lastNameErr) tempErrors.lastName = lastNameErr;

        if (form.email.trim()) {
            const emailErr = validateEmail(form.email, false, 'Email address');
            if (emailErr) tempErrors.email = emailErr;
        }

        if (form.phone && form.phone.trim()) {
            const phoneErr = validatePhone(form.phone, false, 'Phone number');
            if (phoneErr) tempErrors.phone = phoneErr;
        }

        // At least one contact method (email or phone) is recommended
        if (!form.email.trim() && !form.phone.trim()) {
            tempErrors.email = 'Please provide either an email address or phone number';
        }

        if (form.companyName.trim()) {
            const compErr = validateMaxLength(form.companyName, 150, 'Company name');
            if (compErr) tempErrors.companyName = compErr;
        }

        const score = Number(form.leadScore);
        if (isNaN(score) || score < 0 || score > 100) {
            tempErrors.leadScore = 'Lead score must be between 0 and 100';
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
            notes: form.notes.trim() || null,
            customFieldsJson: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : null
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
    return (
        <Layout>
            <div className="detail-header animate-fade-in">
                <div className="detail-header-info">
                    <div>
                        <h1>{id ? 'Edit Lead' : 'New Lead'}</h1>
                        <p>Loading lead details…</p>
                    </div>
                </div>
            </div>
            <Card className="glass-panel">
                <Card.Content>
                    <div className="form-grid">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} variant="rect" height={60} style={{ borderRadius: '8px', animationDelay: `${i * 0.06}s` }} />
                        ))}
                    </div>
                </Card.Content>
            </Card>
        </Layout>
    );
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
                        <PhoneInput label="Phone" value={form.phone} onChange={val => handleChange('phone', val)} error={errors.phone} />
                        <Input label="Company" value={form.companyName} onChange={e => handleChange('companyName', e.target.value)} error={errors.companyName} />
                        <Input label="Job Title" value={form.jobTitle} onChange={e => handleChange('jobTitle', e.target.value)} error={errors.jobTitle} />

                        <div className="input-wrapper">
                            <label className="input-label">Priority</label>
                            <SearchableSelect
                                value={form.priority}
                                options={[
                                    { value: 'Low', label: 'Low' },
                                    { value: 'Medium', label: 'Medium' },
                                    { value: 'High', label: 'High' },
                                    { value: 'Urgent', label: 'Urgent' }
                                ]}
                                onChange={val => handleChange('priority', String(val))}
                            />
                        </div>

                        <Input 
                            label="Lead Score (% of total possible score: 0% - 100% — Leave 0 for Auto-Calculate)" 
                            type="number" 
                            min="0" 
                            max="100" 
                            value={String(form.leadScore)} 
                            onChange={e => handleChange('leadScore', e.target.value)} 
                        />

                        {users.length > 0 && (
                            <div className="input-wrapper">
                                <label className="input-label">Assigned Sales Rep</label>
                                <SearchableSelect
                                    value={form.assignedRepId}
                                    options={[
                                        { value: '', label: 'Unassigned' },
                                        ...users.map(u => ({ value: String(u.id), label: u.name }))
                                    ]}
                                    onChange={val => handleChange('assignedRepId', String(val))}
                                    disabled={!isManagerOrAboveSelected}
                                    placeholder="Unassigned"
                                />
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

                        {customFieldDefs.length > 0 && (
                            <div style={{ gridColumn: '1 / -1', marginTop: '1rem', marginBottom: '0.5rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Additional Information</h3>
                            </div>
                        )}
                        {customFieldDefs.map(def => {
                            const val = customFields[def.fieldName] || '';
                            const updateVal = (v: string) => setCustomFields(prev => ({ ...prev, [def.fieldName]: v }));
                            if (def.fieldType === 'Boolean') {
                                return (
                                    <div key={def.customFieldDefinitionId} className="input-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '100%' }}>
                                        <input type="checkbox" checked={val === 'true'} onChange={e => updateVal(e.target.checked ? 'true' : 'false')} id={`cf-${def.customFieldDefinitionId}`} style={{ cursor: 'pointer', width: 16, height: 16 }} />
                                        <label htmlFor={`cf-${def.customFieldDefinitionId}`} style={{ fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>{def.fieldName}</label>
                                    </div>
                                );
                            }
                            if (def.fieldType === 'Select') {
                                let options: string[] = [];
                                try { options = JSON.parse(def.optionsJson || '[]'); } catch { }
                                return (
                                    <div key={def.customFieldDefinitionId} className="input-wrapper">
                                        <label className="input-label">{def.fieldName}</label>
                                        <select className="input-field" value={val} onChange={e => updateVal(e.target.value)}>
                                            <option value="">Select...</option>
                                            {options.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                );
                            }
                            return (
                                <Input key={def.customFieldDefinitionId} label={def.fieldName} type={def.fieldType === 'Number' ? 'number' : def.fieldType === 'Date' ? 'date' : 'text'} value={val} onChange={e => updateVal(e.target.value)} />
                            );
                        })}

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
