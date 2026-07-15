import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Palette, Plus, Trash2, Edit2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import './screens.css';

interface ThemeSettings {
  mode: 'dark' | 'light';
  accentColor: string;
}

const PRESET_THEMES = [
  {
    name: 'Cyan Ocean',
    description: 'Modern cyan with deep navy',
    mode: 'dark' as const,
    previewBackground: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f172a 100%)',
    accentColor: '#06b6d4'
  },
  {
    name: 'Purple Galaxy',
    description: 'Rich purple tones',
    mode: 'dark' as const,
    previewBackground: 'linear-gradient(135deg, #1a0033 0%, #330066 50%, #1a0033 100%)',
    accentColor: '#a78bfa'
  },
  {
    name: 'Emerald Forest',
    description: 'Calm green tones',
    mode: 'dark' as const,
    previewBackground: 'linear-gradient(135deg, #0d2818 0%, #1a4d2e 50%, #0d2818 100%)',
    accentColor: '#10b981'
  },
  {
    name: 'Rose Gold',
    description: 'Elegant rose and gold',
    mode: 'dark' as const,
    previewBackground: 'linear-gradient(135deg, #3d1a1a 0%, #5a2a2a 50%, #3d1a1a 100%)',
    accentColor: '#f87171'
  },
  {
    name: 'Slate Professional',
    description: 'Classic professional look',
    mode: 'dark' as const,
    previewBackground: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    accentColor: '#3b82f6'
  },
  {
    name: 'Light Clean',
    description: 'Clean light theme',
    mode: 'light' as const,
    previewBackground: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)',
    accentColor: '#0284c7'
  }
];

export const SettingsScreen: React.FC = () => {
  const { isManagerOrAbove } = useAuth();
  const [activeTab, setActiveTab] = useState<'theme' | 'sources' | 'statuses' | 'pipeline' | 'products'>('theme');
  
  const [theme, setTheme] = useState<ThemeSettings>(() => {
    const mode = localStorage.getItem('theme') as 'dark' | 'light' | null;
    return {
      mode: mode || 'dark',
      accentColor: PRESET_THEMES[0].accentColor
    };
  });
  const [customAccentColor, setCustomAccentColor] = useState(theme.accentColor);

  // Sources state
  const [sources, setSources] = useState<{ id: number; name: string }[]>([]);
  const [newSourceName, setNewSourceName] = useState('');
  const [editingSourceId, setEditingSourceId] = useState<number | null>(null);
  const [editingSourceName, setEditingSourceName] = useState('');

  // LeadStatuses state
  const [leadStatuses, setLeadStatuses] = useState<{ id: number; name: string; sortOrder: number; isTerminal: boolean }[]>([]);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusSortOrder, setNewStatusSortOrder] = useState('0');
  const [newStatusIsTerminal, setNewStatusIsTerminal] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [editingStatusName, setEditingStatusName] = useState('');
  const [editingStatusSortOrder, setEditingStatusSortOrder] = useState('0');
  const [editingStatusIsTerminal, setEditingStatusIsTerminal] = useState(false);

  // OpportunityStages state
  const [opportunityStages, setOpportunityStages] = useState<{ id: number; name: string; sortOrder: number; isWon: boolean; isLost: boolean }[]>([]);
  const [newStageName, setNewStageName] = useState('');
  const [newStageSortOrder, setNewStageSortOrder] = useState('0');
  const [newStageIsWon, setNewStageIsWon] = useState(false);
  const [newStageIsLost, setNewStageIsLost] = useState(false);
  const [editingStageId, setEditingStageId] = useState<number | null>(null);
  const [editingStageName, setEditingStageName] = useState('');
  const [editingStageSortOrder, setEditingStageSortOrder] = useState('0');
  const [editingStageIsWon, setEditingStageIsWon] = useState(false);
  const [editingStageIsLost, setEditingStageIsLost] = useState(false);

  // Products state
  const [products, setProducts] = useState<{ id: number; name: string; sku: string; productCategoryId: number; productCategoryName: string; productStatusId: number; productStatusName: string; price: number; cost: number; stockQuantity: number }[]>([]);
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
    // Load sources, lead statuses, opportunity stages, and products
    const loadData = async () => {
      try {
        const [sourcesData, statusesData, stagesData, productsData, categoriesData, statusesData2] = await Promise.all([
          api.get<{ id: number; name: string }[]>('/api/sources'),
          api.get<{ id: number; name: string; sortOrder: number; isTerminal: boolean }[]>('/api/leadstatuses'),
          api.get<{ id: number; name: string; sortOrder: number; isWon: boolean; isLost: boolean }[]>('/api/opportunitystages'),
          api.get<{ id: number; name: string; sku: string; productCategoryId: number; productCategoryName: string; productStatusId: number; productStatusName: string; price: number; cost: number; stockQuantity: number }[]>('/api/products'),
          api.get<{ id: number; name: string }[]>('/api/productcategories'),
          api.get<{ id: number; name: string; isSelectable: boolean }[]>('/api/productstatuses')
        ]);
        setSources(sourcesData ?? []);
        setLeadStatuses(statusesData ?? []);
        setOpportunityStages(stagesData ?? []);
        setProducts(productsData ?? []);
        setProductCategories(categoriesData ?? []);
        setProductStatuses(statusesData2 ?? []);
      } catch (error) {
        console.error('Failed to load settings data:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    // Set the theme mode (dark/light)
    root.setAttribute('data-theme', theme.mode);
    localStorage.setItem('theme', theme.mode);

    // Update accent color CSS variables
    root.style.setProperty('--accent-primary', theme.accentColor);
    root.style.setProperty('--accent-hover', adjustColorBrightness(theme.accentColor, -20));
    root.style.setProperty('--accent-glow', `rgba(${hexToRgb(theme.accentColor)}, ${theme.mode === 'light' ? '0.3' : '0.5'})`);

    // Save to localStorage
    localStorage.setItem('crm-theme', JSON.stringify(theme));
  }, [theme]);

  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
    }
    return '6, 182, 212';
  };

  const handlePresetTheme = (preset: typeof PRESET_THEMES[0]) => {
    setTheme({
      mode: preset.mode,
      accentColor: preset.accentColor
    });
    setCustomAccentColor(preset.accentColor);
  };

  const handleAccentColorChange = (color: string) => {
    setCustomAccentColor(color);
    setTheme(prev => ({
      ...prev,
      accentColor: color
    }));
  };

  const handleModeChange = (mode: 'dark' | 'light') => {
    setTheme(prev => ({
      ...prev,
      mode
    }));
  };

  const resetTheme = () => {
    const defaultTheme = PRESET_THEMES[0];
    setTheme({
      mode: defaultTheme.mode,
      accentColor: defaultTheme.accentColor
    });
    setCustomAccentColor(defaultTheme.accentColor);
  };

  // Sources handlers
  const handleAddSource = async () => {
    console.log('handleAddSource called, newSourceName:', newSourceName);
    if (!newSourceName.trim()) {
      alert('Please enter a source name');
      return;
    }
    try {
      console.log('Adding source:', { name: newSourceName.trim() });
      const response = await api.post('/api/sources', { name: newSourceName.trim() });
      console.log('Source added response:', response);
      const updated = await api.get<{ id: number; name: string }[]>('/api/sources');
      setSources(updated ?? []);
      setNewSourceName('');
      alert('Source added successfully');
    } catch (error: any) {
      console.error('Failed to add source:', error);
      alert(error?.message || 'Failed to add source. You may not have permission (Manager/Admin required).');
    }
  };

  const handleDeleteSource = async (id: number) => {
    if (!window.confirm('Delete this source?')) return;
    try {
      await api.delete(`/api/sources/${id}`);
      setSources(sources.filter(s => s.id !== id));
    } catch (error: any) {
      alert(error?.message || 'Failed to delete source');
    }
  };

  const handleStartEditSource = (id: number, name: string) => {
    setEditingSourceId(id);
    setEditingSourceName(name);
  };

  const handleSaveSource = async (id: number) => {
    if (!editingSourceName.trim()) return;
    try {
      await api.put(`/api/sources/${id}`, { name: editingSourceName.trim() });
      setSources(sources.map(s => s.id === id ? { ...s, name: editingSourceName.trim() } : s));
      setEditingSourceId(null);
      setEditingSourceName('');
    } catch (error: any) {
      alert(error?.message || 'Failed to update source');
    }
  };

  const handleCancelEditSource = () => {
    setEditingSourceId(null);
    setEditingSourceName('');
  };

  // LeadStatuses handlers
  const handleAddStatus = async () => {
    console.log('handleAddStatus called, newStatusName:', newStatusName);
    if (!newStatusName.trim()) {
      alert('Please enter a status name');
      return;
    }
    try {
      console.log('Adding status:', { 
        name: newStatusName.trim(),
        sortOrder: Number(newStatusSortOrder),
        isTerminal: newStatusIsTerminal
      });
      const response = await api.post('/api/leadstatuses', {
        name: newStatusName.trim(),
        sortOrder: Number(newStatusSortOrder),
        isTerminal: newStatusIsTerminal
      });
      console.log('Status added response:', response);
      const updated = await api.get<{ id: number; name: string; sortOrder: number; isTerminal: boolean }[]>('/api/leadstatuses');
      setLeadStatuses(updated ?? []);
      setNewStatusName('');
      setNewStatusSortOrder('0');
      setNewStatusIsTerminal(false);
      alert('Status added successfully');
    } catch (error: any) {
      console.error('Failed to add status:', error);
      alert(error?.message || 'Failed to add status. You may not have permission (Manager/Admin required).');
    }
  };

  const handleDeleteStatus = async (id: number) => {
    if (!window.confirm('Delete this status?')) return;
    try {
      await api.delete(`/api/leadstatuses/${id}`);
      setLeadStatuses(leadStatuses.filter(s => s.id !== id));
    } catch (error: any) {
      alert(error?.message || 'Failed to delete status');
    }
  };

  const handleStartEditStatus = (id: number, name: string, sortOrder: number, isTerminal: boolean) => {
    setEditingStatusId(id);
    setEditingStatusName(name);
    setEditingStatusSortOrder(String(sortOrder));
    setEditingStatusIsTerminal(isTerminal);
  };

  const handleSaveStatus = async (id: number) => {
    if (!editingStatusName.trim()) return;
    try {
      await api.put(`/api/leadstatuses/${id}`, {
        name: editingStatusName.trim(),
        sortOrder: Number(editingStatusSortOrder),
        isTerminal: editingStatusIsTerminal
      });
      setLeadStatuses(leadStatuses.map(s => s.id === id ? {
        ...s,
        name: editingStatusName.trim(),
        sortOrder: Number(editingStatusSortOrder),
        isTerminal: editingStatusIsTerminal
      } : s));
      setEditingStatusId(null);
      setEditingStatusName('');
      setEditingStatusSortOrder('0');
      setEditingStatusIsTerminal(false);
    } catch (error: any) {
      alert(error?.message || 'Failed to update status');
    }
  };

  const handleCancelEditStatus = () => {
    setEditingStatusId(null);
    setEditingStatusName('');
    setEditingStatusSortOrder('0');
    setEditingStatusIsTerminal(false);
  };

  // OpportunityStages handlers
  const handleAddStage = async () => {
    if (!newStageName.trim()) {
      alert('Please enter a stage name');
      return;
    }
    if (newStageIsWon && newStageIsLost) {
      alert('A stage cannot be both Won and Lost');
      return;
    }
    try {
      await api.post('/api/opportunitystages', {
        name: newStageName.trim(),
        sortOrder: Number(newStageSortOrder),
        isWon: newStageIsWon,
        isLost: newStageIsLost
      });
      const updated = await api.get<{ id: number; name: string; sortOrder: number; isWon: boolean; isLost: boolean }[]>('/api/opportunitystages');
      setOpportunityStages(updated ?? []);
      setNewStageName('');
      setNewStageSortOrder('0');
      setNewStageIsWon(false);
      setNewStageIsLost(false);
      alert('Stage added successfully');
    } catch (error: any) {
      alert(error?.message || 'Failed to add stage. You may not have permission (Manager/Admin required).');
    }
  };

  const handleDeleteStage = async (id: number) => {
    if (!window.confirm('Delete this stage?')) return;
    try {
      await api.delete(`/api/opportunitystages/${id}`);
      setOpportunityStages(opportunityStages.filter(s => s.id !== id));
    } catch (error: any) {
      alert(error?.message || 'Failed to delete stage');
    }
  };

  const handleStartEditStage = (id: number, name: string, sortOrder: number, isWon: boolean, isLost: boolean) => {
    setEditingStageId(id);
    setEditingStageName(name);
    setEditingStageSortOrder(String(sortOrder));
    setEditingStageIsWon(isWon);
    setEditingStageIsLost(isLost);
  };

  const handleSaveStage = async (id: number) => {
    if (!editingStageName.trim()) return;
    if (editingStageIsWon && editingStageIsLost) {
      alert('A stage cannot be both Won and Lost');
      return;
    }
    try {
      await api.put(`/api/opportunitystages/${id}`, {
        name: editingStageName.trim(),
        sortOrder: Number(editingStageSortOrder),
        isWon: editingStageIsWon,
        isLost: editingStageIsLost
      });
      setOpportunityStages(opportunityStages.map(s => s.id === id ? {
        ...s,
        name: editingStageName.trim(),
        sortOrder: Number(editingStageSortOrder),
        isWon: editingStageIsWon,
        isLost: editingStageIsLost
      } : s));
      setEditingStageId(null);
      setEditingStageName('');
      setEditingStageSortOrder('0');
      setEditingStageIsWon(false);
      setEditingStageIsLost(false);
    } catch (error: any) {
      alert(error?.message || 'Failed to update stage');
    }
  };

  const handleCancelEditStage = () => {
    setEditingStageId(null);
    setEditingStageName('');
    setEditingStageSortOrder('0');
    setEditingStageIsWon(false);
    setEditingStageIsLost(false);
  };

  // Products handlers
  const handleAddProduct = async () => {
    if (!newProductName.trim()) {
      alert('Please enter a product name');
      return;
    }
    if (!newProductSku.trim()) {
      alert('Please enter a SKU');
      return;
    }
    if (Number(newProductCategoryId) === 0) {
      alert('Please select a category');
      return;
    }
    if (Number(newProductStatusId) === 0) {
      alert('Please select a status');
      return;
    }
    try {
      await api.post('/api/products', {
        name: newProductName.trim(),
        sku: newProductSku.trim(),
        description: newProductDescription.trim() || null,
        productCategoryId: Number(newProductCategoryId),
        productStatusId: Number(newProductStatusId),
        price: Number(newProductPrice),
        cost: newProductCost ? Number(newProductCost) : null,
        stockQuantity: Number(newProductStockQuantity)
      });
      const updated = await api.get<{ id: number; name: string; sku: string; productCategoryId: number; productCategoryName: string; productStatusId: number; productStatusName: string; price: number; cost: number; stockQuantity: number }[]>('/api/products');
      setProducts(updated ?? []);
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
    if (!editingProductName.trim()) return;
    if (!editingProductSku.trim()) return;
    try {
      await api.put(`/api/products/${id}`, {
        name: editingProductName.trim(),
        sku: editingProductSku.trim(),
        description: editingProductDescription.trim() || null,
        productCategoryId: Number(editingProductCategoryId),
        productStatusId: Number(editingProductStatusId),
        price: Number(editingProductPrice),
        cost: editingProductCost ? Number(editingProductCost) : null,
        stockQuantity: Number(editingProductStockQuantity)
      });
      const updated = await api.get<{ id: number; name: string; sku: string; productCategoryId: number; productCategoryName: string; productStatusId: number; productStatusName: string; price: number; cost: number; stockQuantity: number }[]>('/api/products');
      setProducts(updated ?? []);
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

  const adjustColorBrightness = (hex: string, amount: number): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;
    
    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);
    
    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  return (
    <Layout>
      <div className="screen-header">
        <div>
          <h1 className="screen-title">Settings</h1>
          <p className="screen-subtitle">Customize your CRM experience.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs-bar" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'theme' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('theme')}
        >
          Theme
        </button>
        <button
          className={`tab-btn ${activeTab === 'sources' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('sources')}
        >
          Sources
        </button>
        <button
          className={`tab-btn ${activeTab === 'statuses' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('statuses')}
        >
          Statuses & Types
        </button>
        <button
          className={`tab-btn ${activeTab === 'pipeline' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('pipeline')}
        >
          Pipeline Stages
        </button>
        <button
          className={`tab-btn ${activeTab === 'products' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          Products
        </button>
      </div>

      {/* Theme Tab */}
      {activeTab === 'theme' && (
        <Card className="p-6">
          <div className="settings-section">
            <div className="flex items-center gap-3 mb-6">
              <Palette size={24} style={{ color: 'var(--accent-primary)' }} />
              <h2 className="text-xl font-semibold">Theme Customization</h2>
            </div>

            {/* Preset Themes */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Preset Themes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PRESET_THEMES.map((preset, idx) => (
                  <div
                    key={idx}
                    onClick={() => handlePresetTheme(preset)}
                    style={{
                      background: preset.previewBackground,
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      border: theme.mode === preset.mode && theme.accentColor === preset.accentColor 
                        ? `2px solid ${preset.accentColor}` 
                        : '2px solid transparent',
                      borderRadius: 'var(--radius-lg)',
                      padding: '1rem',
                      transform: theme.mode === preset.mode && theme.accentColor === preset.accentColor ? 'scale(1.05)' : 'scale(1)'
                    }}
                    className="preset-theme hover:shadow-lg"
                  >
                    <div style={{ color: 'white' }}>
                      <p className="font-semibold text-sm">{preset.name}</p>
                      <p className="text-xs opacity-80">{preset.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Theme Mode Toggle */}
            <div className="mt-8 pt-8" style={{ borderTop: '1px solid var(--border-color)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Theme Mode</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleModeChange('dark')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: theme.mode === 'dark' ? `2px solid ${theme.accentColor}` : '2px solid var(--border-color)',
                    background: theme.mode === 'dark' ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Dark Mode
                </button>
                <button
                  onClick={() => handleModeChange('light')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: theme.mode === 'light' ? `2px solid ${theme.accentColor}` : '2px solid var(--border-color)',
                    background: theme.mode === 'light' ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Light Mode
                </button>
              </div>
            </div>

            {/* Custom Accent Color */}
            <div className="mt-8 pt-8" style={{ borderTop: '1px solid var(--border-color)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Custom Accent Color</h3>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={customAccentColor}
                  onChange={(e) => handleAccentColorChange(e.target.value)}
                  style={{
                    width: '80px',
                    height: '80px',
                    border: 'none',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer'
                  }}
                />
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Accent Color</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Select the accent color used for buttons, highlights, and UI elements.
                  </p>
                  <p style={{ color: theme.accentColor, marginTop: '0.5rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {customAccentColor}
                  </p>
                </div>
              </div>
              <Button variant="secondary" onClick={resetTheme} className="mt-4">Reset to Default</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Sources Tab */}
      {activeTab === 'sources' && (
        <Card className="p-6">
          <div className="settings-section">
            <h2 className="text-xl font-semibold mb-6">Lead Sources</h2>
            
            {isManagerOrAbove && (
              <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="New source name"
                  value={newSourceName}
                  onChange={e => {
                    console.log('Input changed:', e.target.value);
                    setNewSourceName(e.target.value);
                  }}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
                <Button onClick={() => {
                  console.log('Add button clicked');
                  handleAddSource();
                }}>
                  <Plus size={16} style={{ marginRight: 6 }} /> Add
                </Button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {sources.map(source => (
                <div
                  key={source.id}
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
                  {editingSourceId === source.id ? (
                    <>
                      <Input
                        value={editingSourceName}
                        onChange={e => setEditingSourceName(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <Button size="sm" onClick={() => handleSaveSource(source.id)}>Save</Button>
                      <Button variant="ghost" size="sm" onClick={handleCancelEditSource}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1 }}>{source.name}</span>
                      {isManagerOrAbove && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleStartEditSource(source.id, source.name)}>
                            <Edit2 size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteSource(source.id)}>
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
      )}

      {/* LeadStatuses Tab */}
      {activeTab === 'statuses' && (
        <Card className="p-6">
          <div className="settings-section">
            <h2 className="text-xl font-semibold mb-6">Lead Statuses</h2>
            
            {isManagerOrAbove && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Status Name</label>
                    <input
                      type="text"
                      placeholder="e.g., New Lead"
                      value={newStatusName}
                      onChange={e => {
                        console.log('Status name input changed:', e.target.value);
                        setNewStatusName(e.target.value);
                      }}
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
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Sort Order</label>
                    <input
                      type="number"
                      value={newStatusSortOrder}
                      onChange={e => setNewStatusSortOrder(e.target.value)}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
                    <input
                      type="checkbox"
                      id="newTerminal"
                      checked={newStatusIsTerminal}
                      onChange={e => setNewStatusIsTerminal(e.target.checked)}
                    />
                    <label htmlFor="newTerminal" style={{ fontSize: '0.875rem' }}>Terminal Status</label>
                  </div>
                </div>
                <Button onClick={() => {
                  console.log('Add Status button clicked');
                  handleAddStatus();
                }} style={{ marginTop: '1rem' }}>
                  <Plus size={16} style={{ marginRight: 6 }} /> Add Status
                </Button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {leadStatuses.sort((a, b) => a.sortOrder - b.sortOrder).map(status => (
                <div
                  key={status.id}
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
                  {editingStatusId === status.id ? (
                    <>
                      <Input
                        value={editingStatusName}
                        onChange={e => setEditingStatusName(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <Input
                        type="number"
                        value={editingStatusSortOrder}
                        onChange={e => setEditingStatusSortOrder(e.target.value)}
                        style={{ width: '80px' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={editingStatusIsTerminal}
                          onChange={e => setEditingStatusIsTerminal(e.target.checked)}
                        />
                        <label style={{ fontSize: '0.75rem' }}>Terminal</label>
                      </div>
                      <Button size="sm" onClick={() => handleSaveStatus(status.id)}>Save</Button>
                      <Button variant="ghost" size="sm" onClick={handleCancelEditStatus}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1 }}>{status.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Order: {status.sortOrder}</span>
                      {status.isTerminal && <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: '4px' }}>Terminal</span>}
                      {isManagerOrAbove && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleStartEditStatus(status.id, status.name, status.sortOrder, status.isTerminal)}>
                            <Edit2 size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteStatus(status.id)}>
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
      )}

      {/* Pipeline Stages Tab */}
      {activeTab === 'pipeline' && (
        <Card className="p-6">
          <div className="settings-section">
            <h2 className="text-xl font-semibold mb-6">Pipeline Stages</h2>
            
            {isManagerOrAbove && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Stage Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Qualified"
                      value={newStageName}
                      onChange={e => setNewStageName(e.target.value)}
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
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Sort Order</label>
                    <input
                      type="number"
                      value={newStageSortOrder}
                      onChange={e => setNewStageSortOrder(e.target.value)}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
                    <input
                      type="checkbox"
                      id="newWon"
                      checked={newStageIsWon}
                      onChange={e => setNewStageIsWon(e.target.checked)}
                    />
                    <label htmlFor="newWon" style={{ fontSize: '0.875rem' }}>Won Stage</label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
                    <input
                      type="checkbox"
                      id="newLost"
                      checked={newStageIsLost}
                      onChange={e => setNewStageIsLost(e.target.checked)}
                    />
                    <label htmlFor="newLost" style={{ fontSize: '0.875rem' }}>Lost Stage</label>
                  </div>
                </div>
                <Button onClick={handleAddStage} style={{ marginTop: '1rem' }}>
                  <Plus size={16} style={{ marginRight: 6 }} /> Add Stage
                </Button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {opportunityStages.sort((a, b) => a.sortOrder - b.sortOrder).map(stage => (
                <div
                  key={stage.id}
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
                  {editingStageId === stage.id ? (
                    <>
                      <Input
                        value={editingStageName}
                        onChange={e => setEditingStageName(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <Input
                        type="number"
                        value={editingStageSortOrder}
                        onChange={e => setEditingStageSortOrder(e.target.value)}
                        style={{ width: '80px' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={editingStageIsWon}
                          onChange={e => setEditingStageIsWon(e.target.checked)}
                        />
                        <label style={{ fontSize: '0.75rem' }}>Won</label>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={editingStageIsLost}
                          onChange={e => setEditingStageIsLost(e.target.checked)}
                        />
                        <label style={{ fontSize: '0.75rem' }}>Lost</label>
                      </div>
                      <Button size="sm" onClick={() => handleSaveStage(stage.id)}>Save</Button>
                      <Button variant="ghost" size="sm" onClick={handleCancelEditStage}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1 }}>{stage.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Order: {stage.sortOrder}</span>
                      {stage.isWon && <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '4px' }}>Won</span>}
                      {stage.isLost && <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: '4px' }}>Lost</span>}
                      {isManagerOrAbove && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleStartEditStage(stage.id, stage.name, stage.sortOrder, stage.isWon, stage.isLost)}>
                            <Edit2 size={14} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteStage(stage.id)}>
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
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <Card className="p-6">
          <div className="settings-section">
            <h2 className="text-xl font-semibold mb-6">Products</h2>
            
            {isManagerOrAbove && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
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
      )}

      {/* Info Card */}
      <Card className="p-6 mt-6" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          ✓ Your settings are automatically saved and will persist across sessions.
        </p>
      </Card>
    </Layout>
  );
};
