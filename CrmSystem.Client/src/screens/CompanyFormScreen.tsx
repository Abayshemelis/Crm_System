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
    };

    const handleSubmit = async () => {
        const payload = {
            name: form.name,
            industry: form.industry || null,
            companySize: null,
            website: form.website || null,
            address: form.address || null,
            phone: form.phone || null,
            email: form.email || null,
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
        } catch (error) {
            console.error(error);
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
                    <div className="form-grid">
                        <Input label="Name" value={form.name} onChange={e => handleChange('name', e.target.value)} />
                        <Input label="Industry" value={form.industry} onChange={e => handleChange('industry', e.target.value)} />
                        <Input label="Website" value={form.website} onChange={e => handleChange('website', e.target.value)} />
                        <Input label="Address" value={form.address} onChange={e => handleChange('address', e.target.value)} />
                        <Input label="Phone" value={form.phone} onChange={e => handleChange('phone', e.target.value)} />
                        <Input label="Email" type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} />
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <Button onClick={handleSubmit}>{isEdit ? 'Save changes' : 'Create company'}</Button>
                    </div>
                </Card.Content>
            </Card>
        </Layout>
    );
};
