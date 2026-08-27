import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PhoneInput } from '../components/ui/PhoneInput';
import { validateName, validateEmail, validatePhone, validateMaxLength } from '../lib/validators';
import { api } from '../lib/api';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/ui/Skeleton';
import { showToast } from '../lib/toast';
import './screens.css';

interface FormState {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    jobTitle: string;
    companyId: string;
    companyName: string;
    sourceId: string;
    assignedRepId: string;
}

interface Company { companyId: number; name: string; }
interface Source { id: number; name: string; }
interface UserLookup { id: number; name: string; role: string; }

interface CustomFieldDef {
    customFieldDefinitionId: number;
    entityType: string;
    fieldName: string;
    fieldType: string;
    optionsJson: string | null;
    sortOrder: number;
}

export const CustomerFormScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, isManagerOrAbove } = useAuth();
    const [form, setForm] = useState<FormState>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        jobTitle: '',
        companyId: '',
        companyName: '',
        sourceId: '',
        assignedRepId: user?.userId ? String(user.userId) : ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [sources, setSources] = useState<Source[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [reps, setReps] = useState<UserLookup[]>([]);
    const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
    const [customFields, setCustomFields] = useState<Record<string, string>>({});
    const isEdit = Boolean(id);

    useEffect(() => {
        api.get<{ Data: Company[] }>('/api/companies?page=1&pageSize=100')
            .then(res => {
                const raw = res.Data ?? [];
                const nonOther = raw.filter(c => c.name.trim().toLowerCase() !== 'other');
                const other = raw.find(c => c.name.trim().toLowerCase() === 'other') || { companyId: 999999, name: 'Other' };
                setCompanies([...nonOther, other]);
            })
            .catch(() => {
                setCompanies([{ companyId: 999999, name: 'Other' }]);
            });

        api.get<Source[]>('/api/sources')
            .then(data => {
                const raw = data ?? [];
                const nonOther = raw.filter(s => s.name.trim().toLowerCase() !== 'other');
                const other = raw.find(s => s.name.trim().toLowerCase() === 'other') || { id: 999999, name: 'Other' };
                setSources([...nonOther, other]);
            })
            .catch(() => {
                setSources([{ id: 999999, name: 'Other' }]);
            });

        if (isManagerOrAbove) {
            api.get<UserLookup[]>('/api/users')
                .then(data => setReps(data ?? []))
                .catch(() => setReps([]));
        }

        api.get<CustomFieldDef[]>('/api/custom-field-definitions?entityType=Customer')
            .then(setCustomFieldDefs)
            .catch(() => setCustomFieldDefs([]));
    }, [navigate, isManagerOrAbove]);

    useEffect(() => {
        if (!id) return;
        setIsLoading(true);
        api.get<any>(`/api/customers/${id}`)
            .then(customer => {
                setForm({
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    email: customer.email,
                    phone: customer.phone ?? '',
                    jobTitle: customer.jobTitle ?? '',
                    companyId: customer.companyId ? String(customer.companyId) : '',
                    companyName: customer.companyName ?? '',
                    sourceId: customer.sourceId ? String(customer.sourceId) : '',
                    assignedRepId: customer.assignedRepId ? String(customer.assignedRepId) : '',
                });
                if (customer.customFieldsJson) {
                    try {
                        setCustomFields(JSON.parse(customer.customFieldsJson));
                    } catch { /* ignore */ }
                }
            })
            .catch(() => navigate('/customers'))
            .finally(() => setIsLoading(false));
    }, [id, navigate]);

    const handleChange = (field: keyof FormState, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        // clear errors on change
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

        const emailErr = validateEmail(form.email, true, 'Email address');
        if (emailErr) tempErrors.email = emailErr;

        const phoneErr = validatePhone(form.phone, false, 'Phone number');
        if (phoneErr) tempErrors.phone = phoneErr;

        const jobTitleErr = validateMaxLength(form.jobTitle, 100, 'Job title');
        if (jobTitleErr) tempErrors.jobTitle = jobTitleErr;

        // Only require assigned rep if user is manager AND there are reps available
        if (isManagerOrAbove && reps.length > 0 && !form.assignedRepId) {
            tempErrors.assignedRepId = 'Please select an assigned sales representative';
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleSubmit = async () => {
        setApiError(null);
        if (!validate()) return;

        const payload: any = {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || null,
            jobTitle: form.jobTitle.trim() || null,
            companyId: form.companyId ? Number(form.companyId) : null,
            sourceId: form.sourceId ? Number(form.sourceId) : null,
            customFieldsJson: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : null
        };

        // Always send assignedRepId - use current user if not selected
        if (isManagerOrAbove && form.assignedRepId) {
            payload.assignedRepId = Number(form.assignedRepId);
        } else {
            // Default to current user
            payload.assignedRepId = user?.userId;
        }

        console.log('Submitting customer form:', { isEdit, payload, user, userId: user?.userId });

        try {
            if (isEdit) {
                await api.put(`/api/customers/${id}`, payload);
                showToast('Customer updated successfully', 'success');
            } else {
                await api.post('/api/customers', payload);
                showToast('Customer created successfully', 'success');
            }
            navigate('/customers');
        } catch (error: any) {
            console.error('Error saving customer:', error);
            setApiError(error.message || 'An error occurred while saving the customer record.');
        }
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="detail-header animate-fade-in">
                    <div className="detail-header-info">
                        <div>
                            <h1>{isEdit ? 'Edit Customer' : 'New Customer'}</h1>
                            <p>Loading customer details…</p>
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
                <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}>
                    <ArrowLeft size={16} style={{ marginRight: 6 }} /> Back
                </Button>
                <div className="detail-header-info">
                    <div>
                        <h1>{isEdit ? 'Edit Customer' : 'New Customer'}</h1>
                        <p>{isEdit ? 'Update customer details' : 'Create a new customer record'}</p>
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
                        <Input
                            label="First Name"
                            value={form.firstName}
                            onChange={e => handleChange('firstName', e.target.value)}
                            error={errors.firstName}
                        />
                        <Input
                            label="Last Name"
                            value={form.lastName}
                            onChange={e => handleChange('lastName', e.target.value)}
                            error={errors.lastName}
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={form.email}
                            onChange={e => handleChange('email', e.target.value)}
                            error={errors.email}
                        />
                        <PhoneInput
                            label="Phone"
                            value={form.phone}
                            onChange={val => handleChange('phone', val)}
                            error={errors.phone}
                        />
                        <Input
                            label="Job Title"
                            value={form.jobTitle}
                            onChange={e => handleChange('jobTitle', e.target.value)}
                            error={errors.jobTitle}
                        />
                        <div className="input-wrapper">
                            <label className="input-label">Source</label>
                            <select value={form.sourceId} onChange={e => handleChange('sourceId', e.target.value)} className="input-field">
                                <option value="">None</option>
                                {sources.map(source => (
                                    <option key={source.id} value={source.id}>{source.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="input-wrapper">
                            <label className="input-label">Company</label>
                            <select value={form.companyId} onChange={e => handleChange('companyId', e.target.value)} className="input-field">
                                <option value="">None</option>
                                {companies.map(company => (
                                    <option key={company.companyId} value={company.companyId}>{company.name}</option>
                                ))}
                            </select>
                        </div>
                        {isManagerOrAbove && (
                            <div className="input-wrapper">
                                <label className="input-label">Assigned Rep</label>
                                <select 
                                    value={form.assignedRepId} 
                                    onChange={e => handleChange('assignedRepId', e.target.value)} 
                                    className="input-field"
                                    disabled={!isManagerOrAbove}
                                >
                                    <option value="">Select rep</option>
                                    {reps.map((rep, index) => (
                                        <option key={rep.id != null ? `rep-${rep.id}` : `rep-${index}`} value={rep.id}>{rep.name}{rep.role ? ` (${rep.role})` : ''}</option>
                                    ))}
                                </select>
                                {errors.assignedRepId && <span className="input-error-text">{errors.assignedRepId}</span>}
                            </div>
                        )}

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
                    <div style={{ marginTop: '1rem' }}>
                        <Button onClick={handleSubmit}>{isEdit ? 'Save changes' : 'Create customer'}</Button>
                    </div>
                </Card.Content>
            </Card>
        </Layout>
    );
};
