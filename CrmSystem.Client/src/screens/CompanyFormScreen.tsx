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
    name: string;
    industry: string;
    website: string;
    address: string;
    phone: string;
    email: string;
}

export const CompanyFormScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [form, setForm] = useState<FormState>({
        name: '',
        industry: '',
        website: '',
        address: '',
        phone: '',
        email: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const isEdit = Boolean(id);

    useEffect(() => {
        if (!id) return;
        setIsLoading(true);
        api.get<any>(`/api/companies/${id}`)
            .then(company => {
                setForm({
                    name: company.name,
                    industry: company.industry ?? '',
                    website: company.website ?? '',
                    address: company.address ?? '',
                    phone: company.phone ?? '',
                    email: company.email ?? ''
                });
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

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleSubmit = async () => {
        setApiError(null);
        if (!validate()) return;

        const payload = {
            name: form.name.trim(),
            industry: form.industry.trim() || null,
            companySize: null,
            website: form.website.trim() || null,
            address: form.address.trim() || null,
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            sourceId: null,
            assignedRepId: null
        };

        try {
            if (isEdit) {
                await api.put(`/api/companies/${id}`, payload);
            } else {
                await api.post('/api/companies', payload);
            }
            navigate('/companies');
        } catch (error: any) {
            console.error(error);
            setApiError(error.message || 'An error occurred while saving the company record.');
        }
    };

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

            <Card className="glass-panel">
                <Card.Content>
                    {apiError && (
                        <div className="form-error-banner animate-fade-in">
                            {apiError}
                        </div>
                    )}
                    <div className="form-grid">
                        <Input label="Name" value={form.name} onChange={e => handleChange('name', e.target.value)} error={errors.name} />
                        <Input label="Industry" value={form.industry} onChange={e => handleChange('industry', e.target.value)} error={errors.industry} />
                        <Input label="Website" value={form.website} onChange={e => handleChange('website', e.target.value)} error={errors.website} />
                        <Input label="Address" value={form.address} onChange={e => handleChange('address', e.target.value)} error={errors.address} />
                        <Input label="Phone" value={form.phone} onChange={e => handleChange('phone', e.target.value)} error={errors.phone} />
                        <Input label="Email" type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} error={errors.email} />
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <Button onClick={handleSubmit}>{isEdit ? 'Save changes' : 'Create company'}</Button>
                    </div>
                </Card.Content>
            </Card>
        </Layout>
    );
};
