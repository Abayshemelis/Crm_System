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
    jobTitle: string;
    companyId: string;
    companyName: string;
    sourceId: string;
}

interface Company { companyId: number; name: string; }
interface Source { id: number; name: string; }

export const CustomerFormScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [form, setForm] = useState<FormState>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        jobTitle: '',
        companyId: '',
        companyName: '',
        sourceId: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [sources, setSources] = useState<Source[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const isEdit = Boolean(id);

    useEffect(() => {
        api.get<{ data: Company[] }>('/api/companies?page=1&pageSize=100')
            .then(res => setCompanies(res.data ?? []))
            .catch(() => { /* non-critical, continue without company list */ });

        api.get<Source[]>('/api/sources')
            .then(data => setSources(data))
            .catch(() => { });
    }, [navigate]);

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
                });
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
        if (!form.firstName.trim()) tempErrors.firstName = 'First name is required';
        if (!form.lastName.trim()) tempErrors.lastName = 'Last name is required';
        if (!form.email.trim()) {
            tempErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
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
            email: form.email.trim(),
            phone: form.phone.trim() || null,
            jobTitle: form.jobTitle.trim() || null,
            companyId: form.companyId ? Number(form.companyId) : null,
            sourceId: form.sourceId ? Number(form.sourceId) : null,
            assignedRepId: null
        };

        try {
            if (isEdit) {
                await api.put(`/api/customers/${id}`, payload);
            } else {
                await api.post('/api/customers', payload);
            }
            navigate('/customers');
        } catch (error: any) {
            console.error(error);
            setApiError(error.message || 'An error occurred while saving the customer record.');
        }
    };

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
                        <Input 
                            label="Phone" 
                            value={form.phone} 
                            onChange={e => handleChange('phone', e.target.value)} 
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
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <Button onClick={handleSubmit}>{isEdit ? 'Save changes' : 'Create customer'}</Button>
                    </div>
                </Card.Content>
            </Card>
        </Layout>
    );
};
