import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import './screens.css';

export const ProductsScreen: React.FC = () => {
  const { isManagerOrAbove } = useAuth();
  const [products, setProducts] = useState<{ id: number; name: string; sku: string; description: string | null; productCategoryId: number; productCategoryName: string; productStatusId: number; productStatusName: string; price: number; cost: number | null; stockQuantity: number }[]>([]);
  const [productCategories, setProductCategories] = useState<{ id: number; name: string }[]>([]);
  const [productStatuses, setProductStatuses] = useState<{ id: number; name: string; isSelectable: boolean }[]>([]);
  
  const [newProductName, setNewProductName] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductCategoryId, setNewProductCategoryId] = useState('0');
  const [newProductStatusId, setNewProductStatusId] = useState('0');
  const [newProductPrice, setNewProductPrice] = useState('0');
  const [newProductCost, setNewProductCost] = useState('');
  const [newProductStockQuantity, setNewProductStockQuantity] = useState('0');
  
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editingProductName, setEditingProductName] = useState('');
  const [editingProductSku, setEditingProductSku] = useState('');
  const [editingProductDescription, setEditingProductDescription] = useState('');
  const [editingProductCategoryId, setEditingProductCategoryId] = useState('0');
  const [editingProductStatusId, setEditingProductStatusId] = useState('0');
  const [editingProductPrice, setEditingProductPrice] = useState('0');
  const [editingProductCost, setEditingProductCost] = useState('');
  const [editingProductStockQuantity, setEditingProductStockQuantity] = useState('0');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsData, categoriesData, statusesData] = await Promise.all([
          api.get<any[]>('/api/products'),
          api.get<any[]>('/api/productcategories'),
          api.get<any[]>('/api/productstatuses')
        ]);
        setProducts((productsData ?? []).map(p => ({ ...p, id: p.id ?? p.productId })));
        setProductCategories((categoriesData ?? []).map(c => ({ ...c, id: c.id ?? c.productCategoryId })));
        setProductStatuses((statusesData ?? []).map(s => ({ ...s, id: s.id ?? s.productStatusId })));
      } catch (error) {
        console.error('Failed to load products data:', error);
      }
    };
    loadData();
  }, []);

  const handleAddProduct = async () => {
    if (!newProductName.trim()) {
      alert('Please enter a product name');
      return;
    }
    if (!newProductSku.trim()) {
      alert('Please enter a SKU');
      return;
    }
    const categoryId = Number(newProductCategoryId);
    const statusId = Number(newProductStatusId);
    
    if (isNaN(categoryId) || categoryId === 0) {
      alert('Please select a category');
      return;
    }
    if (isNaN(statusId) || statusId === 0) {
      alert('Please select a status');
      return;
    }
    try {
      await api.post('/api/products', {
        name: newProductName.trim(),
        sku: newProductSku.trim(),
        description: newProductDescription.trim() || null,
        productCategoryId: categoryId,
        productStatusId: statusId,
        price: Number(newProductPrice),
        cost: newProductCost ? Number(newProductCost) : null,
        stockQuantity: Number(newProductStockQuantity)
      });
      const updated = await api.get<any[]>('/api/products');
      setProducts((updated ?? []).map(p => ({ ...p, id: p.id ?? p.productId })));
      setNewProductName('');
      setNewProductSku('');
      setNewProductDescription('');
      setNewProductCategoryId('0');
      setNewProductStatusId('0');
      setNewProductPrice('0');
      setNewProductCost('');
      setNewProductStockQuantity('0');
      alert('Product added successfully');
    } catch (error: any) {
      alert(error?.message || 'Failed to add product. You may not have permission (Manager/Admin required).');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete(`/api/products/${id}`);
      setProducts(products.filter(p => p.id !== id));
    } catch (error: any) {
      alert(error?.message || 'Failed to delete product');
    }
  };

  const handleStartEditProduct = (product: any) => {
    setEditingProductId(product.id);
    setEditingProductName(product.name);
    setEditingProductSku(product.sku);
    setEditingProductDescription(product.description || '');
    setEditingProductCategoryId(String(product.productCategoryId));
    setEditingProductStatusId(String(product.productStatusId));
    setEditingProductPrice(String(product.price));
    setEditingProductCost(String(product.cost || ''));
    setEditingProductStockQuantity(String(product.stockQuantity));
  };

  const handleSaveProduct = async (id: number) => {
    if (!editingProductName.trim()) {
      alert('Please enter a product name');
      return;
    }
    if (!editingProductSku.trim()) {
      alert('Please enter a SKU');
      return;
    }
    const categoryId = Number(editingProductCategoryId);
    const statusId = Number(editingProductStatusId);
    
    if (isNaN(categoryId) || categoryId === 0) {
      alert('Please select a category');
      return;
    }
    if (isNaN(statusId) || statusId === 0) {
      alert('Please select a status');
      return;
    }
    try {
      await api.put(`/api/products/${id}`, {
        name: editingProductName.trim(),
        sku: editingProductSku.trim(),
        description: editingProductDescription.trim() || null,
        productCategoryId: categoryId,
        productStatusId: statusId,
        price: Number(editingProductPrice),
        cost: editingProductCost ? Number(editingProductCost) : null,
        stockQuantity: Number(editingProductStockQuantity)
      });
      const updated = await api.get<any[]>('/api/products');
      setProducts((updated ?? []).map(p => ({ ...p, id: p.id ?? p.productId })));
      setEditingProductId(null);
      setEditingProductName('');
      setEditingProductSku('');
      setEditingProductDescription('');
      setEditingProductCategoryId('0');
      setEditingProductStatusId('0');
      setEditingProductPrice('0');
      setEditingProductCost('');
      setEditingProductStockQuantity('0');
    } catch (error: any) {
      alert(error?.message || 'Failed to update product');
    }
  };

  const handleCancelEditProduct = () => {
    setEditingProductId(null);
    setEditingProductName('');
    setEditingProductSku('');
    setEditingProductDescription('');
    setEditingProductCategoryId('0');
    setEditingProductStatusId('0');
    setEditingProductPrice('0');
    setEditingProductCost('');
    setEditingProductStockQuantity('0');
  };

  return (
    <Layout>
      <div className="dashboard-header animate-fade-in">
        <div className="dashboard-title">
          <h1>Products</h1>
          <p>Manage your product catalog</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="settings-section">
          {isManagerOrAbove && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h3 className="text-lg font-semibold mb-4">Add New Product</h3>
              <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Product Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Premium Plan"
                    value={newProductName}
                    onChange={e => setNewProductName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>SKU</label>
                  <input
                    type="text"
                    placeholder="e.g., PREM-001"
                    value={newProductSku}
                    onChange={e => setNewProductSku(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Category</label>
                  <select
                    value={newProductCategoryId}
                    onChange={e => setNewProductCategoryId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="0">Select Category</option>
                    {productCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Status</label>
                  <select
                    value={newProductStatusId}
                    onChange={e => setNewProductStatusId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="0">Select Status</option>
                    {productStatuses.map(status => (
                      <option key={status.id} value={status.id}>{status.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newProductPrice}
                    onChange={e => setNewProductPrice(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newProductCost}
                    onChange={e => setNewProductCost(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newProductStockQuantity}
                    onChange={e => setNewProductStockQuantity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Description</label>
                  <textarea
                    placeholder="Product description..."
                    value={newProductDescription}
                    onChange={e => setNewProductDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      minHeight: '60px'
                    }}
                  />
                </div>
              </div>
              <Button onClick={handleAddProduct} style={{ marginTop: '1rem' }}>
                <Plus size={16} style={{ marginRight: 6 }} /> Add Product
              </Button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {products.map(product => (
              <div
                key={product.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)'
                }}
              >
                {editingProductId === product.id ? (
                  <>
                    <Input
                      value={editingProductName}
                      onChange={e => setEditingProductName(e.target.value)}
                      style={{ flex: 2 }}
                    />
                    <Input
                      value={editingProductSku}
                      onChange={e => setEditingProductSku(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <select
                      value={editingProductCategoryId}
                      onChange={e => setEditingProductCategoryId(e.target.value)}
                      style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    >
                      <option value="0">Select Category</option>
                      {productCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <select
                      value={editingProductStatusId}
                      onChange={e => setEditingProductStatusId(e.target.value)}
                      style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    >
                      <option value="0">Select Status</option>
                      {productStatuses.map(status => (
                        <option key={status.id} value={status.id}>{status.name}</option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingProductPrice}
                      onChange={e => setEditingProductPrice(e.target.value)}
                      style={{ width: '80px' }}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={editingProductCost}
                      onChange={e => setEditingProductCost(e.target.value)}
                      style={{ width: '80px' }}
                    />
                    <Input
                      type="number"
                      value={editingProductStockQuantity}
                      onChange={e => setEditingProductStockQuantity(e.target.value)}
                      style={{ width: '80px' }}
                    />
                    <Button size="sm" onClick={() => handleSaveProduct(product.id)}>Save</Button>
                    <Button variant="ghost" size="sm" onClick={handleCancelEditProduct}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <div style={{ flex: 2 }}>
                      <strong>{product.name}</strong>
                      {product.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{product.description}</div>}
                    </div>
                    <span style={{ flex: 1, fontSize: '0.875rem' }}>SKU: {product.sku}</span>
                    <span style={{ flex: 1, fontSize: '0.875rem' }}>{product.productCategoryName}</span>
                    <span style={{ flex: 1, fontSize: '0.875rem' }}>{product.productStatusName}</span>
                    <span style={{ width: '80px', fontSize: '0.875rem', textAlign: 'right' }}>${product.price.toLocaleString()}</span>
                    <span style={{ width: '80px', fontSize: '0.875rem', textAlign: 'right', color: 'var(--text-muted)' }}>{product.cost ? `$${product.cost.toLocaleString()}` : '-'}</span>
                    <span style={{ width: '80px', fontSize: '0.875rem', textAlign: 'right' }}>{product.stockQuantity}</span>
                    {isManagerOrAbove && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleStartEditProduct(product)}>
                          <Edit2 size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </Layout>
  );
};
