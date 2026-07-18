import React, { useEffect, useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { DatePicker } from './DatePicker';
import { SelectDown } from './SelectDown';
import { api } from '../../lib/api';
import { X, Plus, Trash2, Check, XCircle } from 'lucide-react';
import '../../screens/screens.css';

interface Opportunity {
    opportunityId: number;
    customerId: number;
    customerFirstName: string;
    customerLastName: string;
    customerEmail: string;
    customerPhone?: string;
    customerJobTitle?: string;
    title: string;
    opportunityStageId: number;
    stageName?: string;
    estimatedValue: number;
    expectedCloseDate?: string;
    actualCloseDate?: string;
    ownerId: number;
    ownerName?: string;
    description?: string;
    createdAt: string;
    updatedAt?: string;
}

interface Stage {
    opportunityStageId: number;
    name: string;
    isWon: boolean;
    isLost: boolean;
}

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
}

interface OpportunityLineItem {
    lineItemId: number;
    opportunityId: number;
    productId: number;
    product?: {
        name: string;
        sku?: string;
        productCategory?: { name: string };
    };
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    totalPrice: number;
}

interface Product {
    productId: number;
    name: string;
    sku?: string;
    productCategory?: { name: string };
    productStatus?: { isSelectable: boolean };
    price: number;
}

interface OpportunityDetailPanelProps {
    opportunityId: number;
    onClose: () => void;
    onUpdate: () => void;
}

export const OpportunityDetailPanel: React.FC<OpportunityDetailPanelProps> = ({
    opportunityId,
    onClose,
    onUpdate
}) => {
    const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
    const [lineItems, setLineItems] = useState<OpportunityLineItem[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [stages, setStages] = useState<Stage[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editedOpportunity, setEditedOpportunity] = useState<Partial<Opportunity>>({});
    const [newLineItem, setNewLineItem] = useState({
        productId: 0,
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0
    });
    const [activeTab, setActiveTab] = useState<'details' | 'lineItems'>('details');

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [oppData, lineItemsData, productsData, stagesData, usersData] = await Promise.all([
                api.get<Opportunity>(`/api/opportunities/${opportunityId}`),
                api.get<OpportunityLineItem[]>(`/api/opportunitylineitems/${opportunityId}`),
                api.get<Product[]>('/api/products'),
                api.get<Stage[]>('/api/opportunitystages'),
                api.get<User[]>('/api/users')
            ]);
            setOpportunity(oppData);
            setLineItems(lineItemsData);
            setProducts(productsData.filter(p => p.productStatus?.isSelectable));
            setStages(stagesData);
            setUsers(usersData);
            setEditedOpportunity(oppData);
        } catch (error) {
            console.error('Failed to load opportunity details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [opportunityId]);

    const handleFieldChange = (field: keyof Opportunity, value: any) => {
        setEditedOpportunity(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!opportunity) return;
        try {
            await api.put(`/api/opportunities/${opportunityId}`, {
                title: editedOpportunity.title,
                description: editedOpportunity.description,
                opportunityStageId: editedOpportunity.opportunityStageId,
                estimatedValue: editedOpportunity.estimatedValue,
                expectedCloseDate: editedOpportunity.expectedCloseDate,
                actualCloseDate: editedOpportunity.actualCloseDate,
                ownerId: editedOpportunity.ownerId,
            });
            await loadData();
            onUpdate();
            const event = new CustomEvent('app:toast', {
                detail: { message: 'Opportunity updated successfully', type: 'success' as const }
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.error('Failed to update opportunity:', error);
            const event = new CustomEvent('app:toast', {
                detail: { message: 'Failed to update opportunity', type: 'error' as const }
            });
            window.dispatchEvent(event);
        }
    };

    const handleAddLineItem = async () => {
        if (newLineItem.productId === 0) {
            const event = new CustomEvent('app:toast', {
                detail: { message: 'Please select a product first', type: 'error' as const }
            });
            window.dispatchEvent(event);
            return;
        }
        if (newLineItem.quantity <= 0) {
            const event = new CustomEvent('app:toast', {
                detail: { message: 'Quantity must be greater than 0', type: 'error' as const }
            });
            window.dispatchEvent(event);
            return;
        }
        try {
            await api.post('/api/opportunitylineitems', {
                opportunityId,
                ...newLineItem
            });
            setNewLineItem({ productId: 0, quantity: 1, unitPrice: 0, discountPercent: 0 });
            await loadData();
            onUpdate();
            const event = new CustomEvent('app:toast', {
                detail: { message: 'Line item added successfully', type: 'success' as const }
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.error('Failed to add line item:', error);
            const event = new CustomEvent('app:toast', {
                detail: { message: 'Failed to add line item', type: 'error' as const }
            });
            window.dispatchEvent(event);
        }
    };

    const handleDeleteLineItem = async (lineItemId: number) => {
        try {
            await api.delete(`/api/opportunitylineitems/${lineItemId}`);
            await loadData();
            onUpdate();
        } catch (error) {
            console.error('Failed to delete line item:', error);
            const event = new CustomEvent('app:toast', {
                detail: { message: 'Failed to delete line item', type: 'error' as const }
            });
            window.dispatchEvent(event);
        }
    };

    const handleProductChange = (productId: number) => {
        const product = products.find(p => p.productId === productId);
        if (product) {
            setNewLineItem(prev => ({
                ...prev,
                productId,
                unitPrice: product.price
            }));
        }
    };

    const handleMarkAsWon = async () => {
        if (!opportunity) return;
        const wonStage = stages.find(s => s.isWon);
        if (!wonStage) return;
        try {
            await api.patch(`/api/opportunities/${opportunityId}/stage`, { stageId: wonStage.opportunityStageId });
            await loadData();
            onUpdate();
            const event = new CustomEvent('app:toast', {
                detail: { message: 'Opportunity marked as Won', type: 'success' as const }
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.error('Failed to mark as won:', error);
            const event = new CustomEvent('app:toast', {
                detail: { message: 'Failed to mark as won', type: 'error' as const }
            });
            window.dispatchEvent(event);
        }
    };

    const handleMarkAsLost = async () => {
        if (!opportunity) return;
        const lostStage = stages.find(s => s.isLost);
        if (!lostStage) return;
        try {
            await api.patch(`/api/opportunities/${opportunityId}/stage`, { stageId: lostStage.opportunityStageId });
            await loadData();
            onUpdate();
            const event = new CustomEvent('app:toast', {
                detail: { message: 'Opportunity marked as Lost', type: 'success' as const }
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.error('Failed to mark as lost:', error);
            const event = new CustomEvent('app:toast', {
                detail: { message: 'Failed to mark as lost', type: 'error' as const }
            });
            window.dispatchEvent(event);
        }
    };

    if (isLoading) {
        return (
            <div className="detail-panel-overlay">
                <div className="detail-panel glass-panel">
                    <div className="loading-state">
                        <div className="spinner" />
                        <p>Loading...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!opportunity) {
        return null;
    }

    const hasLineItems = lineItems.length > 0;
    const calculatedTotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);

    return (
        <div className="detail-panel-overlay" onClick={onClose}>
            <div className="card-detail-panel glass-panel" onClick={e => e.stopPropagation()}>
                <div className="card-detail-panel-header">
                    <div className="card-detail-panel-header-left">
                        <div className="card-detail-title-section">
                            <h2 className="card-detail-title">{opportunity.title}</h2>
                            <p className="card-detail-subtitle">
                                {opportunity.customerFirstName} {opportunity.customerLastName}
                                {opportunity.customerEmail ? ` · ${opportunity.customerEmail}` : ''}
                            </p>
                        </div>
                    </div>
                    <div className="card-detail-panel-header-right">
                        <div className="card-detail-value-section">
                            <span className="card-detail-value">${opportunity.estimatedValue.toLocaleString()}</span>
                            <span className="card-detail-tag">{opportunity.stageName || 'No Stage'}</span>
                        </div>
                        <div className="card-detail-actions">
                            <div className="card-view-actions">
                                <Button onClick={handleSave} className="card-save-btn">
                                    Save
                                </Button>
                                <Button variant="ghost" onClick={handleMarkAsWon} className="card-mark-won-btn">
                                    <Check size={16} style={{ marginRight: 6 }} /> Mark Won
                                </Button>
                                <Button variant="ghost" onClick={handleMarkAsLost} className="card-mark-lost-btn">
                                    <XCircle size={16} style={{ marginRight: 6 }} /> Mark Lost
                                </Button>
                                <Button variant="ghost" onClick={onClose} className="card-close-btn">
                                    <X size={20} />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card-detail-panel-content">
                    <div className="card-detail-tabs">
                        <button 
                            className={`card-tab-btn ${activeTab === 'details' ? 'card-tab-active' : ''}`}
                            onClick={() => setActiveTab('details')}
                        >
                            Details
                        </button>
                        <button 
                            className={`card-tab-btn ${activeTab === 'lineItems' ? 'card-tab-active' : ''}`}
                            onClick={() => setActiveTab('lineItems')}
                        >
                            Line Items ({lineItems.length})
                        </button>
                    </div>

                    <div className="card-detail-layout">
                        {activeTab === 'details' && (
                            <Card className="glass-panel card-detail-section">
                                <Card.Content>
                                    <div className="card-detail-section-header">
                                        <h3 className="card-detail-section-title">Opportunity Details</h3>
                                    </div>
                                    <div className="card-form-grid">
                                        <div className="card-form-field-full">
                                            <label className="card-form-label">Title</label>
                                            <Input
                                                value={editedOpportunity.title || ''}
                                                onChange={e => handleFieldChange('title', e.target.value)}
                                            />
                                        </div>

                                        <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', marginBottom: '0.25rem' }}>
                                            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                                Customer Information
                                            </h4>
                                        </div>

                                        <div className="card-form-field">
                                            <label className="card-form-label">Customer</label>
                                            <p className="card-detail-field-value">
                                                {opportunity.customerFirstName} {opportunity.customerLastName}
                                                {opportunity.customerEmail ? ` · ${opportunity.customerEmail}` : ''}
                                            </p>
                                        </div>

                                        <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', marginBottom: '0.25rem' }}>
                                            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                                Opportunity Info
                                            </h4>
                                        </div>

                                        <div className="card-form-field">
                                            <label className="card-form-label">Stage</label>
                                            <SelectDown
                                                value={editedOpportunity.opportunityStageId || opportunity.opportunityStageId}
                                                options={stages.map(s => ({ value: s.opportunityStageId, label: s.name }))}
                                                onChange={val => handleFieldChange('opportunityStageId', Number(val))}
                                            />
                                        </div>
                                        <div className="card-form-field">
                                            <label className="card-form-label">Owner</label>
                                            <SelectDown
                                                value={editedOpportunity.ownerId || opportunity.ownerId}
                                                options={users.filter(u => u.isActive).map(u => ({ value: u.id, label: u.name }))}
                                                onChange={val => handleFieldChange('ownerId', Number(val))}
                                            />
                                        </div>
                                        <div className="card-form-field">
                                            <label className="card-form-label">Estimated Value</label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={editedOpportunity.estimatedValue ?? opportunity.estimatedValue}
                                                onChange={e => handleFieldChange('estimatedValue', Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="card-form-field">
                                            <label className="card-form-label">Expected Close Date</label>
                                            <DatePicker
                                                value={editedOpportunity.expectedCloseDate?.split('T')[0] || opportunity.expectedCloseDate?.split('T')[0] || ''}
                                                onChange={e => handleFieldChange('expectedCloseDate', e)}
                                            />
                                        </div>
                                        <div className="card-form-field-full">
                                            <label className="card-form-label">Description</label>
                                            <textarea
                                                value={editedOpportunity.description || ''}
                                                onChange={e => handleFieldChange('description', e.target.value)}
                                                className="card-form-textarea"
                                                rows={3}
                                            />
                                        </div>
                                        <div className="card-form-field">
                                            <label className="card-form-label">Created Date</label>
                                            <p className="card-detail-field-value">{new Date(opportunity.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </Card.Content>
                            </Card>
                        )}

                        {activeTab === 'lineItems' && (
                            <Card className="glass-panel card-detail-section">
                                <Card.Content>
                                    <div className="card-detail-section-header">
                                        <h3 className="card-detail-section-title">Products</h3>
                                        <div className="card-detail-section-total">
                                            Total: ${calculatedTotal.toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="card-line-items-table">
                                        <div className="card-line-items-header">
                                            <div>Product</div>
                                            <div>Qty</div>
                                            <div>Unit Price</div>
                                            <div>Discount</div>
                                            <div>Total</div>
                                            <div></div>
                                        </div>

                                        {lineItems.map((item, index) => (
                                            <div key={item.lineItemId} className="card-line-item-row">
                                                <div className="card-line-item-product">
                                                    <div className="card-line-item-name">{item.product?.name}</div>
                                                    {item.product?.sku && <div className="card-line-item-sku">SKU: {item.product.sku}</div>}
                                                    {item.product?.productCategory && <div className="card-line-item-category">{item.product.productCategory.name}</div>}
                                                </div>
                                                <div className="card-line-item-qty">{item.quantity}</div>
                                                <div className="card-line-item-price">${item.unitPrice.toLocaleString()}</div>
                                                <div className="card-line-item-discount">{item.discountPercent}%</div>
                                                <div className="card-line-item-total">${item.totalPrice.toLocaleString()}</div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteLineItem(item.lineItemId)}
                                                    className="card-line-item-delete"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="card-line-item-add-compact">
                                        <SelectDown
                                            value={newLineItem.productId}
                                            options={[
                                                { value: 0, label: 'Select Product' },
                                                ...products.map(p => ({ value: p.productId, label: p.name }))
                                            ]}
                                            onChange={val => handleProductChange(Number(val))}
                                            compact
                                            className="card-line-item-select-wrapper"
                                        />
                                        <Input
                                            type="number"
                                            min="1"
                                            value={newLineItem.quantity}
                                            onChange={e => setNewLineItem(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                                            placeholder="Qty"
                                            className="card-line-item-input-compact"
                                        />
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={newLineItem.unitPrice}
                                            onChange={e => setNewLineItem(prev => ({ ...prev, unitPrice: Number(e.target.value) }))}
                                            placeholder="Price"
                                            className="card-line-item-input-compact"
                                        />
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            value={newLineItem.discountPercent}
                                            onChange={e => setNewLineItem(prev => ({ ...prev, discountPercent: Number(e.target.value) }))}
                                            placeholder="%"
                                            className="card-line-item-input-compact"
                                        />
                                        <Button onClick={handleAddLineItem} className="card-line-item-add-btn-compact">
                                            <Plus size={14} />
                                        </Button>
                                    </div>
                                </Card.Content>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
