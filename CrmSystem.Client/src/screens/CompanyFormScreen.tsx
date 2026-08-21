import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PhoneInput } from '../components/ui/PhoneInput';
import { IndustrySelect } from '../components/ui/IndustrySelect';
import { CompanySizeSelect } from '../components/ui/CompanySizeSelect';
import { validatePhoneNumber } from '../components/ui/countryData';
import { api } from '../lib/api';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { showToast } from '../lib/toast';
import './screens.css';

interface FormState {
    name: string;
    industry: string;
    companySize: string;
    sourceId: string;
    website: string;
    address: string;
    phone: string;
    email: string;
}

interface Lookup {
    id: number;
    name: string;
}

interface CustomFieldDef {
    customFieldDefinitionId: number;
    entityType: string;
    fieldName: string;
    fieldType: string;
    optionsJson: string | null;
    sortOrder: number;
}

export const CompanyFormScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [form, setForm] = useState<FormState>({
        name: '',
        industry: '',
        companySize: '',
        sourceId: '',
        website: '',
        address: '',
        phone: '',
        email: ''
    });
    const [sources, setSources] = useState<Lookup[]>([]);
    const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
    const [customFields, setCustomFields] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const isEdit = Boolean(id);

    useEffect(() => {
        api.get<Lookup[]>('/api/sources')
            .then(data => {
                const raw = data ?? [];
                const nonOther = raw.filter(s => s.name.trim().toLowerCase() !== 'other');
                const other = raw.find(s => s.name.trim().toLowerCase() === 'other') || { id: 999999, name: 'Other' };
                setSources([...nonOther, other]);
            })
            .catch(() => setSources([{ id: 999999, name: 'Other' }]));

        api.get<CustomFieldDef[]>('/api/custom-field-definitions?entityType=Company')
            .then(setCustomFieldDefs)
            .catch(() => setCustomFieldDefs([]));

        if (!id) return;
        setIsLoading(true);
        api.get<any>(`/api/companies/${id}`)
            .then(company => {
                setForm({
                    name: company.name,
                    industry: company.industry ?? '',
                    companySize: company.companySize ?? '',
                    sourceId: company.sourceId ? String(company.sourceId) : '',
                    website: company.website ?? '',
                    address: company.address ?? '',
                    phone: company.phone ?? '',
                    email: company.email ?? ''
                });
                if (company.customFieldsJson) {
                    try {
                        setCustomFields(JSON.parse(company.customFieldsJson));
                    } catch { /* ignore */ }
                }
            })
            .catch(() => navigate('/companies'))
            .finally(() => setIsLoading(false));
    }, [id, navigate]);

    const handleChange = (field: keyof FormState, value: string) => {
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
        if (!form.name.trim()) tempErrors.name = 'Company name is required';
        if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            tempErrors.email = 'Email address is invalid';
        }
        if (form.phone && form.phone.trim()) {
            const phoneErr = validatePhoneNumber(form.phone);
            if (phoneErr) {
                tempErrors.phone = phoneErr;
            }
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleSubmit = async () => {
        setApiError(null);
        if (!validate()) return;

        const payload = {
            name: form.name.trim(),
            industry: form.industry.trim() || null,
            companySize: form.companySize.trim() || null,
            website: form.website.trim() || null,
            address: form.address.trim() || null,
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            sourceId: form.sourceId ? Number(form.sourceId) : null,
            assignedRepId: null,
            customFieldsJson: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : null
        };

        try {
            if (isEdit) {
                await api.put(`/api/companies/${id}`, payload);
                showToast('Company updated successfully', 'success');
            } else {
                await api.post('/api/companies', payload);
                showToast('Company created successfully', 'success');
            }
            navigate('/companies');
        } catch (error: any) {
            console.error(error);
            setApiError(error.message || 'An error occurred while saving the company record.');
        }
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="detail-header animate-fade-in">
                    <div className="detail-header-info">
                        <div>
                            <h1>{isEdit ? 'Edit Company' : 'New Company'}</h1>
                            <p>Loading company details…</p>
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
                <Button variant="ghost" size="sm" onClick={() => navigate('/companies')}>
                    <ArrowLeft size={16} style={{ marginRight: 6 }} /> Back
                </Button>
                <div className="detail-header-info">
                    <div>
                        <h1>{isEdit ? 'Edit Company' : 'New Company'}</h1>
                        <p>{isEdit ? 'Update company details' : 'Create a new company record'}</p>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: '880px', margin: '0 auto' }}>
                <Card className="glass-panel" style={{ padding: '0.5rem' }}>
                    <Card.Content>
                        {apiError && (
                            <div className="form-error-banner animate-fade-in" style={{ marginBottom: '1.25rem' }}>
                                {apiError}
                            </div>
                        )}
                        <div className="form-grid" style={{ gap: '1.25rem 1.5rem' }}>
                            <Input label="Company Name" placeholder="e.g. Acme Corp" value={form.name} onChange={e => handleChange('name', e.target.value)} error={errors.name} />
                            <IndustrySelect label="Industry" placeholder="Search or type industry..." value={form.industry} onChange={val => handleChange('industry', val)} error={errors.industry} />
                            <CompanySizeSelect label="Company Size" placeholder="Select or type company size..." value={form.companySize} onChange={val => handleChange('companySize', val)} error={errors.companySize} />
                            <div className="input-wrapper">
                                <label className="input-label">Source</label>
                                <select className="input-field" value={form.sourceId} onChange={e => handleChange('sourceId', e.target.value)}>
                                    <option value="">None</option>
                                    {sources.map(source => (
                                        <option key={source.id} value={source.id}>{source.name}</option>
                                    ))}
                                </select>
                            </div>
                            <Input label="Website" placeholder="https://example.com" value={form.website} onChange={e => handleChange('website', e.target.value)} error={errors.website} />
                            <Input label="Email" type="email" placeholder="contact@company.com" value={form.email} onChange={e => handleChange('email', e.target.value)} error={errors.email} />
                            <PhoneInput label="Phone" value={form.phone} onChange={val => handleChange('phone', val)} error={errors.phone} />
                            <Input label="Address" placeholder="Street, City, State, ZIP" value={form.address} onChange={e => handleChange('address', e.target.value)} error={errors.address} />

                            {customFieldDefs.length > 0 && (
                                <div style={{ gridColumn: '1 / -1', marginTop: '0.75rem', marginBottom: '0.25rem' }}>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Additional Information</h3>
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
                        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <Button onClick={handleSubmit}>{isEdit ? 'Save Changes' : 'Create Company'}</Button>
                            <Button variant="ghost" onClick={() => navigate('/companies')}>Cancel</Button>
                        </div>
                    </Card.Content>
                </Card>
            </div>
        </Layout>
    );
};
