import React, { useEffect, useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { DatePicker } from './DatePicker';
import { api } from '../../lib/api';
import { X, Plus, Trash2, Check, XCircle } from 'lucide-react';
import '../../screens/screens.css';

interface Opportunity {
    opportunityId: number;
    customerId: number;
    customerName: string;
    title: string;
    opportunityStageId: number;
    stageName: string;
    estimatedValue: number;
    expectedCloseDate?: string;
    ownerId: number;
    ownerName: string;
    description?: string;
    createdAt: string;
    updatedAt?: string;
}

interface OpportunityLineItem {
    lineItemId: number;
    opportunityId: number;
    productId: number;
    productName: string;
    productSku?: string;
    productCategory?: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    totalPrice: number;
}

interface Product {
    productId: number;
    name: string;
    sku?: string;
    productCategory?: string;
    price: number;
    productStatusId: number;
    productStatusName: string;
    isSelectable: boolean;
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
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedOpportunity, setEditedOpportunity] = useState<Partial<Opportunity>>({});
    const [newLineItem, setNewLineItem] = useState({
        productId: 0,
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0
    });

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [oppData, lineItemsData, productsData] = await Promise.all([
                api.get<Opportunity>(`/api/opportunities/${opportunityId}`),
                api.get<OpportunityLineItem[]>(`/api/opportunitylineitems/${opportunityId}`),
                api.get<Product[]>('/api/products')
            ]);
            setOpportunity(oppData);
            setLineItems(lineItemsData);
            setProducts(productsData.filter(p => p.isSelectable));
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

    const handleSave = async () => {
        if (!opportunity) return;
        try {
            await api.put(`/api/opportunities/${opportunityId}`, editedOpportunity);
            await loadData();
            setIsEditing(false);
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
            <div className="detail-panel glass-panel" onClick={e => e.stopPropagation()}>
                <div className="detail-panel-header">
                    <h2>{opportunity.title}</h2>
                    <Button variant="ghost" onClick={onClose}>
                        <X size={20} />
                    </Button>
                </div>

                <div className="detail-panel-content">
                    <Card className="glass-panel">
                        <Card.Content>
                            {isEditing ? (
                                <div className="form-grid">
                                    <div className="form-field">
                                        <label>Title</label>
                                        <Input
                                            value={editedOpportunity.title || ''}
                                            onChange={e => setEditedOpportunity(prev => ({ ...prev, title: e.target.value }))}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>Customer</label>
                                        <Input value={opportunity.customerName} disabled />
                                    </div>
                                    <div className="form-field">
                                        <label>Stage</label>
                                        <Input value={opportunity.stageName} disabled />
                                    </div>
                                    <div className="form-field">
                                        <label>Expected Close Date</label>
                                        <DatePicker
                                            value={editedOpportunity.expectedCloseDate?.split('T')[0] || ''}
                                            onChange={e => setEditedOpportunity(prev => ({ ...prev, expectedCloseDate: e }))}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>Description</label>
                                        <textarea
                                            value={editedOpportunity.description || ''}
                                            onChange={e => setEditedOpportunity(prev => ({ ...prev, description: e.target.value }))}
                                            className="form-textarea"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="profile-grid">
                                    <div className="profile-field">
                                        <label>Customer</label>
                                        <p>{opportunity.customerName}</p>
                                    </div>
                                    <div className="profile-field">
                                        <label>Stage</label>
                                        <p>{opportunity.stageName}</p>
                                    </div>
                                    <div className="profile-field">
                                        <label>Owner</label>
                                        <p>{opportunity.ownerName}</p>
                                    </div>
                                    <div className="profile-field">
                                        <label>Expected Close Date</label>
                                        <p>{opportunity.expectedCloseDate ? new Date(opportunity.expectedCloseDate).toLocaleDateString() : 'Not set'}</p>
                                    </div>
                                    <div className="profile-field" style={{ gridColumn: '1 / -1' }}>
                                        <label>Description</label>
                                        <p>{opportunity.description || 'No description'}</p>
                                    </div>
                                </div>
                            )}
                        </Card.Content>
                    </Card>

                    <div className="detail-panel-actions">
                        {isEditing ? (
                            <>
                                <Button onClick={handleSave}>
                                    <Check size={16} style={{ marginRight: 6 }} /> Save
                                </Button>
                                <Button variant="ghost" onClick={() => setIsEditing(false)}>
                                    <XCircle size={16} style={{ marginRight: 6 }} /> Cancel
                                </Button>
                            </>
                        ) : (
                            <Button onClick={() => setIsEditing(true)}>
                                Edit Details
                            </Button>
                        )}
                    </div>

                    <Card className="glass-panel">
                        <Card.Content>
                            <div className="line-items-header">
                                <h3>Line Items</h3>
                                <div className="line-items-total">
                                    <span>Total: ${calculatedTotal.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="line-items-table">
                                {lineItems.map(item => (
                                    <div key={item.lineItemId} className="line-item-row">
                                        <div className="line-item-product">
                                            <strong>{item.productName}</strong>
                                            {item.productSku && <span className="line-item-sku">SKU: {item.productSku}</span>}
                                            {item.productCategory && <span className="line-item-category">{item.productCategory}</span>}
                                        </div>
                                        <div className="line-item-quantity">{item.quantity}</div>
                                        <div className="line-item-price">${item.unitPrice.toLocaleString()}</div>
                                        <div className="line-item-discount">{item.discountPercent}%</div>
                                        <div className="line-item-total">${item.totalPrice.toLocaleString()}</div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteLineItem(item.lineItemId)}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="add-line-item">
                                <select
                                    value={newLineItem.productId}
                                    onChange={e => handleProductChange(Number(e.target.value))}
                                    className="form-select"
                                >
                                    <option value={0}>Select Product</option>
                                    {products.map(product => (
                                        <option key={product.productId} value={product.productId}>
                                            {product.name} - ${product.price.toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                                <Input
                                    type="number"
                                    min="1"
                                    value={newLineItem.quantity}
                                    onChange={e => setNewLineItem(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                                    placeholder="Qty"
                                />
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={newLineItem.unitPrice}
                                    onChange={e => setNewLineItem(prev => ({ ...prev, unitPrice: Number(e.target.value) }))}
                                    placeholder="Price"
                                />
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={newLineItem.discountPercent}
                                    onChange={e => setNewLineItem(prev => ({ ...prev, discountPercent: Number(e.target.value) }))}
                                    placeholder="Discount %"
                                />
                                <Button onClick={handleAddLineItem}>
                                    <Plus size={16} style={{ marginRight: 6 }} /> Add
                                </Button>
                            </div>
                        </Card.Content>
                    </Card>
                </div>
            </div>
        </div>
    );
};
