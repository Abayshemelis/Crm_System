import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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
        assignedRepId: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [sources, setSources] = useState<Source[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [reps, setReps] = useState<UserLookup[]>([]);
    const isEdit = Boolean(id);

    useEffect(() => {
        api.get<{ Data: Company[] }>('/api/companies?page=1&pageSize=100')
            .then(res => setCompanies(res.Data ?? []))
            .catch(() => { /* non-critical, continue without company list */ });

        api.get<Source[]>('/api/sources')
            .then(data => setSources(data))
            .catch(() => { });

        if (isManagerOrAbove) {
            api.get<UserLookup[]>('/api/users')
                .then(data => setReps(data ?? []))
                .catch(() => setReps([]));
        }
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

        // Only require assigned rep if user is manager AND there are reps available
        if (isManagerOrAbove && reps.length > 0 && !form.assignedRepId) {
            tempErrors.assignedRepId = 'Please select an assigned rep.';
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
            } else {
                await api.post('/api/customers', payload);
            }
            console.log('Customer saved successfully');
            navigate('/customers');
        } catch (error: any) {
            console.error('Error saving customer:', error);
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
                        {isManagerOrAbove && (
                            <div className="input-wrapper">
                                <label className="input-label">Assigned Rep</label>
                                <select value={form.assignedRepId} onChange={e => handleChange('assignedRepId', e.target.value)} className="input-field">
                                    <option value="">Select rep</option>
                                    {reps.map((rep, index) => (
                                        <option key={rep.id != null ? `rep-${rep.id}` : `rep-${index}`} value={rep.id}>{rep.name}{rep.role ? ` (${rep.role})` : ''}</option>
                                    ))}
                                </select>
                                {errors.assignedRepId && <div className="input-error">{errors.assignedRepId}</div>}
                            </div>
                        )}
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <Button onClick={handleSubmit}>{isEdit ? 'Save changes' : 'Create customer'}</Button>
                    </div>
                </Card.Content>
            </Card>
        </Layout>
    );
};
