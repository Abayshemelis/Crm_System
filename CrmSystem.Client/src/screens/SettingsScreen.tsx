import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Palette, Plus, Trash2, Edit2, Check, X,
  Layers, Tag, Globe, List, Bell, Activity, Package,
  Sparkles, Sun, Moon, Eye, Building2,
  Mail, Phone, MapPin, Hash, Clock, Image, Save, Building, Upload
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSystemProfile } from '../context/SystemProfileContext';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { PhoneInput } from '../components/ui/PhoneInput';
import { COUNTRIES, CURRENCIES, TIMEZONES } from '../lib/constants';
import './screens.css';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Stage { id: number; name: string; sortOrder: number; isWon: boolean; isLost: boolean; }
interface TagItem { id: number; name: string; }
interface Source { id: number; name: string; }
interface LeadStatus { id: number; name: string; sortOrder: number; isTerminal: boolean; }
interface TaskStatus { id: number; name: string; isTerminal: boolean; }
interface ActivityTypeItem { id: number; name: string; icon?: string; }
interface NotifType { id: number; name: string; defaultChannel?: string; }

interface Product {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  productCategoryId: number;
  productCategoryName: string;
  productStatusId: number;
  productStatusName: string;
  price: number;
  cost: number | null;
  stockQuantity: number;
}
interface ProductCategory { id: number; name: string; }
interface ProductStatus { id: number; name: string; isSelectable: boolean; }

type MainTab = 'system-profile' | 'pipeline' | 'tags' | 'products' | 'sources' | 'statuses' | 'theme' | 'custom-fields';
type StatusSubTab = 'lead' | 'task' | 'activity' | 'notification';

import { ThemePreset, ATTRACTIVE_THEMES, applyThemePreset } from '../lib/theme';
import { confirmAction } from '../lib/confirm';
export type { ThemePreset };

// ── Generic inline-edit row ────────────────────────────────────────────────────

// ── Generic inline-edit row ────────────────────────────────────────────────────
interface RowProps {
  label: string;
  badge?: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
}
const LookupRow: React.FC<RowProps> = ({ label, badge, onEdit, onDelete, canEdit }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.7rem 1rem',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-color)',
    flexWrap: 'wrap',
    minWidth: 0
  }}>
    <span style={{ flex: 1, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    {badge}
    {canEdit && (
      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
        <Button variant="ghost" size="sm" onClick={onEdit}><Edit2 size={14} /></Button>
        <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 size={14} /></Button>
      </div>
    )}
  </div>
);

// ── Badge helpers ──────────────────────────────────────────────────────────────
const Badge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20, background: `${color}1a`, color, border: `1px solid ${color}44`, fontWeight: 600 }}>
    {label}
  </span>
);

// ── Section wrapper ────────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: '2rem' }}>
    <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
      {title}
    </h3>
    {children}
  </div>
);

// ── Hook: generic CRUD for a lookup ───────────────────────────────────────────
function useLookup<T extends { id: number; name: string }>(endpoint: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>(endpoint);
      const mapped = (data ?? []).map(item => {
        const id = item.id ?? item.opportunityStageId ?? item.tagId ?? item.sourceId ?? item.leadStatusId ?? item.crmTaskStatusId ?? item.activityTypeId ?? item.notificationTypeId;
        return {
          ...item,
          id
        };
      });
      setItems(mapped as T[]);
    }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, [endpoint]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}

// ── Custom Field Definition Hook ────────────────────────────────────────────────
interface CustomFieldDef {
  customFieldDefinitionId: number;
  entityType: string;
  fieldName: string;
  fieldType: string;
  optionsJson: string | null;
  sortOrder: number;
}
function useCustomFieldDefs() {
  const [items, setItems] = useState<CustomFieldDef[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<CustomFieldDef[]>('/api/custom-field-definitions');
      setItems(data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}
// ── CustomFieldsAdminTab ────────────────────────────────────────────────────────
const CustomFieldsAdminTab: React.FC = () => {
  const { isManagerOrAboveSelected } = useAuth();
  const fields = useCustomFieldDefs();
  const [form, setForm] = useState({ entityType: 'Customer', fieldName: '', fieldType: 'Text', sortOrder: '0', optionsJson: '' });
  const [editingField, setEditingField] = useState<CustomFieldDef | null>(null);

  const addField = async () => {
    if (!form.fieldName.trim()) return toast('Field name is required', 'error');
    try {
      await api.post('/api/custom-field-definitions', {
        entityType: form.entityType,
        fieldName: form.fieldName.trim(),
        fieldType: form.fieldType,
        optionsJson: form.optionsJson.trim() || null,
        sortOrder: Number(form.sortOrder)
      });
      setForm({ ...form, fieldName: '', optionsJson: '', sortOrder: '0' });
      fields.refresh();
      toast('Custom field added');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const saveField = async () => {
    if (!editingField) return;
    try {
      await api.put(`/api/custom-field-definitions/${editingField.customFieldDefinitionId}`, {
        fieldName: editingField.fieldName.trim(),
        fieldType: editingField.fieldType,
        optionsJson: editingField.optionsJson || null,
        sortOrder: editingField.sortOrder
      });
      setEditingField(null);
      fields.refresh();
      toast('Custom field updated');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const deleteField = async (id: number) => {
    if (!await confirmAction('Delete this custom field? Existing data will not be removed from records, but the field will no longer appear in forms.')) return;
    try {
      await api.delete(`/api/custom-field-definitions/${id}`);
      fields.refresh();
      toast('Custom field deleted');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '0.5rem 0.75rem',
    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
    background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.875rem',
    outline: 'none',
  };

  const entities = ['Customer', 'Lead', 'Company'];
  const types = ['Text', 'Number', 'Date', 'Boolean', 'Select'];

  return (
    <Card className="glass-panel p-6">
      <Card.Content>
        <Section title="Custom Fields">
          {isManagerOrAboveSelected && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <select style={{ ...inputStyle, flex: 'none', width: '120px' }} value={form.entityType} onChange={e => setForm({ ...form, entityType: e.target.value })}>
                {entities.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <input style={inputStyle} placeholder="Field Name" value={form.fieldName} onChange={e => setForm({ ...form, fieldName: e.target.value })} />
              <select style={{ ...inputStyle, flex: 'none', width: '120px' }} value={form.fieldType} onChange={e => setForm({ ...form, fieldType: e.target.value })}>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {form.fieldType === 'Select' && (
                <input style={inputStyle} placeholder='["Opt1", "Opt2"]' value={form.optionsJson} onChange={e => setForm({ ...form, optionsJson: e.target.value })} />
              )}
              <input style={{ ...inputStyle, width: 80, flex: 'none' }} type="number" placeholder="Order" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: e.target.value })} />
              <Button onClick={addField} size="sm"><Plus size={14} style={{ marginRight: 4 }} />Add</Button>
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {entities.map(entity => {
              const entityFields = fields.items.filter(f => f.entityType === entity).sort((a, b) => a.sortOrder - b.sortOrder);
              if (entityFields.length === 0) return null;
              
              return (
                <div key={entity}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{entity} Fields</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {entityFields.map(f => (
                      editingField?.customFieldDefinitionId === f.customFieldDefinitionId ? (
                        <div key={f.customFieldDefinitionId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)44', flexWrap: 'wrap' }}>
                          <input style={inputStyle} value={editingField.fieldName} onChange={e => setEditingField({ ...editingField, fieldName: e.target.value })} />
                          <select style={{ ...inputStyle, flex: 'none', width: '120px' }} value={editingField.fieldType} onChange={e => setEditingField({ ...editingField, fieldType: e.target.value })}>
                            {types.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          {editingField.fieldType === 'Select' && (
                            <input style={inputStyle} placeholder='["Opt1", "Opt2"]' value={editingField.optionsJson || ''} onChange={e => setEditingField({ ...editingField, optionsJson: e.target.value })} />
                          )}
                          <input style={{ ...inputStyle, width: 80, flex: 'none' }} type="number" value={editingField.sortOrder} onChange={e => setEditingField({ ...editingField, sortOrder: Number(e.target.value) })} />
                          <Button size="sm" onClick={saveField}><Check size={14} /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}><X size={14} /></Button>
                        </div>
                      ) : (
                        <LookupRow key={f.customFieldDefinitionId} label={`${f.fieldName} (${f.fieldType})`}
                          badge={<>
                            <Badge label={`Order ${f.sortOrder}`} color="#a78bfa" />
                            {f.fieldType === 'Select' && <Badge label={f.optionsJson || '[]'} color="#06b6d4" />}
                          </>}
                          onEdit={() => setEditingField(f)}
                          onDelete={() => deleteField(f.customFieldDefinitionId)}
                          canEdit={isManagerOrAboveSelected}
                        />
                      )
                    ))}
                  </div>
                </div>
              );
            })}
            {fields.items.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No custom fields defined.</p>}
          </div>
        </Section>
      </Card.Content>
    </Card>
  );
};

// ── Toast helper ──────────────────────────────────────────────────────────────
const toast = (message: string, type: 'success' | 'error' = 'success') =>
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));

// ═══════════════════════════════════════════════════════════════════════════════
// Main SettingsScreen
// ═══════════════════════════════════════════════════════════════════════════════
export const SettingsScreen: React.FC = () => {
  const { isManagerOrAboveSelected } = useAuth();
  const [activeTab, setActiveTab] = useState<MainTab>('system-profile');
  const [statusSubTab, setStatusSubTab] = useState<StatusSubTab>('lead');

  // System Profile State
  const { profile, refreshProfile } = useSystemProfile();
  const [crmName, setCrmName] = useState('');
  const [crmShortName, setCrmShortName] = useState('');
  const [crmLogo, setCrmLogo] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('');
  const [timezone, setTimezone] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setCrmName(profile.systemName || '');
      setCrmShortName(profile.companyName || '');
      setCrmLogo(profile.logoUrl || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
      setWebsite(profile.website || '');
      setAddress(profile.address || '');
      setCountry(profile.country || '');
      setCurrency(profile.currency || '');
      setTimezone(profile.timezone || '');
    }
  }, [profile]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large. Maximum size is 5MB.');
      return;
    }

    try {
      setUploadingLogo(true);
      const res = await api.uploadSystemLogo(file);
      setCrmLogo(res.url);
    } catch (err: any) {
      console.error('Failed to upload logo', err);
      alert('Failed to upload logo: ' + err.message);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const validateSystemProfile = () => {
    const newErrors: Record<string, string> = {};
    if (!crmName || !crmName.trim()) {
      newErrors.systemName = 'System Name is required.';
    } else if (crmName.trim().length > 100) {
      newErrors.systemName = 'System Name cannot exceed 100 characters.';
    }
    
    if (crmShortName && crmShortName.trim().length > 100) {
      newErrors.companyName = 'Company Name cannot exceed 100 characters.';
    }
    
    if (email && email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address.';
      } else if (email.trim().length > 150) {
        newErrors.email = 'Email cannot exceed 150 characters.';
      }
    }
    
    if (website && website.trim()) {
      if (website.trim().length > 200) {
        newErrors.website = 'Website URL cannot exceed 200 characters.';
      }
    }

    if (address && address.trim().length > 250) {
      newErrors.address = 'Address cannot exceed 250 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveSystemProfile = async () => {
    if (!validateSystemProfile()) {
      toast('Please correct the highlighted errors.', 'error');
      return;
    }
    try {
      await api.updateSystemProfile({
        systemName: crmName,
        companyName: crmShortName,
        logoUrl: crmLogo,
        email,
        phone,
        website,
        address,
        country,
        currency,
        timezone
      });
      await refreshProfile();
      toast('System profile saved successfully!');
    } catch (err: any) {
      toast(err.message || 'Failed to save system profile.', 'error');
    }
  };

  // ── Theme State ──
  const [activePreset, setActivePreset] = useState<ThemePreset>(() => {
    try {
      const p = localStorage.getItem('crm-theme-preset');
      if (p) {
        const parsed = JSON.parse(p);
        if (parsed && parsed.id) return parsed;
      }
    } catch { /* ignore */ }
    return ATTRACTIVE_THEMES[0];
  });

  // ── Live Interactive Preview Controls ──
  const [previewTimeframe, setPreviewTimeframe] = useState<'Q3 2026' | 'YTD 2026'>('Q3 2026');
  const [previewActionCount, setPreviewActionCount] = useState(0);

  const handlePrimaryActionDemo = () => {
    setPreviewActionCount(prev => prev + 1);
    toast('✨ Primary Action Triggered! Added +$12.5k sample deal');
  };

  const handleSecondaryFilterToggle = () => {
    const nextTimeframe = previewTimeframe === 'Q3 2026' ? 'YTD 2026' : 'Q3 2026';
    setPreviewTimeframe(nextTimeframe);
    toast(`🔍 Secondary Filter Applied: Switched to ${nextTimeframe} View`);
  };

  const [themeModeFilter, setThemeModeFilter] = useState<'all' | 'dark' | 'light'>('all');

  const filteredPresets = ATTRACTIVE_THEMES.filter(t => {
    if (themeModeFilter === 'dark') return t.mode === 'dark';
    if (themeModeFilter === 'light') return t.mode === 'light';
    return true;
  });

  const handleAccentChange = (hexColor: string) => {
    const updated: ThemePreset = {
      ...activePreset,
      accentPrimary: hexColor,
      accentHover: hexColor,
      accentGlow: hexColor + '66'
    };
    setActivePreset(updated);
    applyThemePreset(updated);
    toast(`Custom Accent Color applied: ${hexColor}`);
  };

  const handleResetTheme = () => {
    const defaultPreset = ATTRACTIVE_THEMES[0];
    setActivePreset(defaultPreset);
    applyThemePreset(defaultPreset);
    toast('Reset to Midnight Cyber default theme');
  };

  const selectTheme = (preset: ThemePreset) => {
    setActivePreset(preset);
    applyThemePreset(preset);
    toast(`Theme activated: ${preset.name}`);
  };

  // ── Pipeline Stages ──────────────────────────────────────────────────────────
  const stages = useLookup<Stage>('/api/opportunitystages');
  const [stageForm, setStageForm] = useState({ name: '', sortOrder: '0', isWon: false, isLost: false });
  const [editingStage, setEditingStage] = useState<Stage | null>(null);

  const addStage = async () => {
    if (!stageForm.name.trim()) return toast('Stage name is required', 'error');
    if (stageForm.isWon && stageForm.isLost) return toast('A stage cannot be both Won and Lost', 'error');
    try {
      await api.post('/api/opportunitystages', { name: stageForm.name.trim(), sortOrder: Number(stageForm.sortOrder), isWon: stageForm.isWon, isLost: stageForm.isLost });
      setStageForm({ name: '', sortOrder: '0', isWon: false, isLost: false });
      stages.refresh();
      toast('Stage added');
    } catch (e: any) { toast(e?.message || 'Failed to add stage', 'error'); }
  };

  const saveStage = async () => {
    if (!editingStage) return;
    if (editingStage.isWon && editingStage.isLost) return toast('A stage cannot be both Won and Lost', 'error');
    try {
      await api.put(`/api/opportunitystages/${editingStage.id}`, { name: editingStage.name, sortOrder: editingStage.sortOrder, isWon: editingStage.isWon, isLost: editingStage.isLost });
      setEditingStage(null);
      stages.refresh();
      toast('Stage updated');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const deleteStage = async (id: number) => {
    if (!await confirmAction('Delete this stage?')) return;
    try { await api.delete(`/api/opportunitystages/${id}`); stages.refresh(); toast('Stage deleted'); }
    catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  // ── Tags ─────────────────────────────────────────────────────────────────────
  const tags = useLookup<TagItem>('/api/tags');
  const [tagName, setTagName] = useState('');
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);

  const addTag = async () => {
    if (!tagName.trim()) return toast('Tag name is required', 'error');
    try {
      await api.post('/api/tags', { name: tagName.trim() });
      setTagName('');
      tags.refresh();
      toast('Tag added');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const saveTag = async () => {
    if (!editingTag) return;
    try {
      await api.put(`/api/tags/${editingTag.id}`, { name: editingTag.name });
      setEditingTag(null);
      tags.refresh();
      toast('Tag updated');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const deleteTag = async (id: number) => {
    if (!await confirmAction('Delete this tag?')) return;
    try { await api.delete(`/api/tags/${id}`); tags.refresh(); toast('Tag deleted'); }
    catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  // ── Products ─────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [productStatuses, setProductStatuses] = useState<ProductStatus[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

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

  const refreshProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const [productsData, categoriesData, statusesData] = await Promise.all([
        api.get<any[]>('/api/products'),
        api.get<any[]>('/api/productcategories'),
        api.get<any[]>('/api/productstatuses')
      ]);
      setProducts((productsData ?? []).map(p => ({ ...p, id: p.id ?? p.productId, productCategoryName: p.productCategory?.name || 'Uncategorized', productStatusName: p.productStatus?.name || 'Unknown' })));
      setProductCategories((categoriesData ?? []).map(c => ({ ...c, id: c.id ?? c.productCategoryId })));
      setProductStatuses((statusesData ?? []).map(s => ({ ...s, id: s.id ?? s.productStatusId })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'products') {
      refreshProducts();
    }
  }, [activeTab, refreshProducts]);

  const addProduct = async () => {
    if (!newProductName.trim()) return toast('Please enter a product name', 'error');
    if (!newProductSku.trim()) return toast('Please enter a SKU', 'error');
    const categoryId = Number(newProductCategoryId);
    const statusId = Number(newProductStatusId);
    if (isNaN(categoryId) || categoryId === 0) return toast('Please select a category', 'error');
    if (isNaN(statusId) || statusId === 0) return toast('Please select a status', 'error');

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
      setNewProductName('');
      setNewProductSku('');
      setNewProductDescription('');
      setNewProductCategoryId('0');
      setNewProductStatusId('0');
      setNewProductPrice('0');
      setNewProductCost('');
      setNewProductStockQuantity('0');
      refreshProducts();
      toast('Product added successfully');
    } catch (e: any) {
      toast(e?.message || 'Failed to add product', 'error');
    }
  };

  const deleteProduct = async (id: number) => {
    if (!await confirmAction('Delete this product?')) return;
    try {
      await api.delete(`/api/products/${id}`);
      setProducts(prev => prev.filter(p => p.id !== id));
      toast('Product deleted');
    } catch (e: any) {
      toast(e?.message || 'Failed to delete product', 'error');
    }
  };

  const startEditProduct = (product: Product) => {
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

  const saveProduct = async (id: number) => {
    if (!editingProductName.trim()) return toast('Please enter a product name', 'error');
    if (!editingProductSku.trim()) return toast('Please enter a SKU', 'error');
    const categoryId = Number(editingProductCategoryId);
    const statusId = Number(editingProductStatusId);
    if (isNaN(categoryId) || categoryId === 0) return toast('Please select a category', 'error');
    if (isNaN(statusId) || statusId === 0) return toast('Please select a status', 'error');

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
      setEditingProductId(null);
      refreshProducts();
      toast('Product updated');
    } catch (e: any) {
      toast(e?.message || 'Failed to update product', 'error');
    }
  };

  const cancelEditProduct = () => {
    setEditingProductId(null);
  };

  // ── Sources ───────────────────────────────────────────────────────────────────
  const sources = useLookup<Source>('/api/sources');
  const [sourceName, setSourceName] = useState('');
  const [editingSource, setEditingSource] = useState<Source | null>(null);

  const addSource = async () => {
    if (!sourceName.trim()) return toast('Source name is required', 'error');
    try {
      await api.post('/api/sources', { name: sourceName.trim() });
      setSourceName('');
      sources.refresh();
      toast('Source added');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const saveSource = async () => {
    if (!editingSource) return;
    try {
      await api.put(`/api/sources/${editingSource.id}`, { name: editingSource.name });
      setEditingSource(null);
      sources.refresh();
      toast('Source updated');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const deleteSource = async (id: number) => {
    if (!await confirmAction('Delete this source?')) return;
    try { await api.delete(`/api/sources/${id}`); sources.refresh(); toast('Source deleted'); }
    catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  // ── Lead Statuses ─────────────────────────────────────────────────────────────
  const leadStatuses = useLookup<LeadStatus>('/api/leadstatuses');
  const [leadStatusForm, setLeadStatusForm] = useState({ name: '', sortOrder: '0', isTerminal: false });
  const [editingLeadStatus, setEditingLeadStatus] = useState<LeadStatus | null>(null);

  const addLeadStatus = async () => {
    if (!leadStatusForm.name.trim()) return toast('Name is required', 'error');
    try {
      await api.post('/api/leadstatuses', { name: leadStatusForm.name.trim(), sortOrder: Number(leadStatusForm.sortOrder), isTerminal: leadStatusForm.isTerminal });
      setLeadStatusForm({ name: '', sortOrder: '0', isTerminal: false });
      leadStatuses.refresh();
      toast('Lead status added');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const saveLeadStatus = async () => {
    if (!editingLeadStatus) return;
    try {
      await api.put(`/api/leadstatuses/${editingLeadStatus.id}`, { name: editingLeadStatus.name, sortOrder: editingLeadStatus.sortOrder, isTerminal: editingLeadStatus.isTerminal });
      setEditingLeadStatus(null);
      leadStatuses.refresh();
      toast('Lead status updated');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  // ── Task Statuses ─────────────────────────────────────────────────────────────
  const taskStatuses = useLookup<TaskStatus>('/api/taskstatuses');
  const [taskStatusForm, setTaskStatusForm] = useState({ name: '', isTerminal: false });
  const [editingTaskStatus, setEditingTaskStatus] = useState<TaskStatus | null>(null);

  const addTaskStatus = async () => {
    if (!taskStatusForm.name.trim()) return toast('Name is required', 'error');
    try {
      await api.post('/api/taskstatuses', { name: taskStatusForm.name.trim(), isTerminal: taskStatusForm.isTerminal });
      setTaskStatusForm({ name: '', isTerminal: false });
      taskStatuses.refresh();
      toast('Task status added');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const saveTaskStatus = async () => {
    if (!editingTaskStatus) return;
    try {
      await api.put(`/api/taskstatuses/${editingTaskStatus.id}`, { name: editingTaskStatus.name, isTerminal: editingTaskStatus.isTerminal });
      setEditingTaskStatus(null);
      taskStatuses.refresh();
      toast('Task status updated');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  // ── Activity Types ────────────────────────────────────────────────────────────
  const activityTypes = useLookup<ActivityTypeItem>('/api/activitytypes');
  const [activityForm, setActivityForm] = useState({ name: '', icon: '' });
  const [editingActivity, setEditingActivity] = useState<ActivityTypeItem | null>(null);

  const addActivity = async () => {
    if (!activityForm.name.trim()) return toast('Name is required', 'error');
    try {
      await api.post('/api/activitytypes', { name: activityForm.name.trim(), icon: activityForm.icon.trim() || null });
      setActivityForm({ name: '', icon: '' });
      activityTypes.refresh();
      toast('Activity type added');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const saveActivity = async () => {
    if (!editingActivity) return;
    try {
      await api.put(`/api/activitytypes/${editingActivity.id}`, { name: editingActivity.name, icon: editingActivity.icon || null });
      setEditingActivity(null);
      activityTypes.refresh();
      toast('Activity type updated');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  // ── Notification Types ────────────────────────────────────────────────────────
  const notifTypes = useLookup<NotifType>('/api/notificationtypes');
  const [notifForm, setNotifForm] = useState({ name: '', defaultChannel: '' });
  const [editingNotif, setEditingNotif] = useState<NotifType | null>(null);

  const addNotif = async () => {
    if (!notifForm.name.trim()) return toast('Name is required', 'error');
    try {
      await api.post('/api/notificationtypes', { name: notifForm.name.trim(), defaultChannel: notifForm.defaultChannel.trim() || null });
      setNotifForm({ name: '', defaultChannel: '' });
      notifTypes.refresh();
      toast('Notification type added');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const saveNotif = async () => {
    if (!editingNotif) return;
    try {
      await api.put(`/api/notificationtypes/${editingNotif.id}`, { name: editingNotif.name, defaultChannel: editingNotif.defaultChannel || null });
      setEditingNotif(null);
      notifTypes.refresh();
      toast('Notification type updated');
    } catch (e: any) { toast(e?.message || 'Failed', 'error'); }
  };

  const TABS: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: 'system-profile', label: 'System Profile', icon: <Building2 size={15} /> },
    { id: 'pipeline', label: 'Pipeline Stages', icon: <Layers size={15} /> },
    { id: 'tags', label: 'Tags', icon: <Tag size={15} /> },
    { id: 'products', label: 'Products', icon: <Package size={15} /> },
    { id: 'sources', label: 'Sources', icon: <Globe size={15} /> },
    { id: 'statuses', label: 'Statuses & Types', icon: <List size={15} /> },
    { id: 'theme', label: 'Theme', icon: <Palette size={15} /> },
    { id: 'custom-fields', label: 'Custom Fields', icon: <Layers size={15} /> },
  ];

  const STATUS_SUB_TABS: { id: StatusSubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'lead', label: 'Lead Statuses', icon: <List size={13} /> },
    { id: 'task', label: 'Task Statuses', icon: <Check size={13} /> },
    { id: 'activity', label: 'Activity Types', icon: <Activity size={13} /> },
    { id: 'notification', label: 'Notification Types', icon: <Bell size={13} /> },
  ];

  // ── Shared input style ────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '0.5rem 0.75rem',
    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
    background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.875rem',
    outline: 'none',
  };

  const checkboxRow = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );

  // ── Add row form ──────────────────────────────────────────────────────────────
  const AddForm: React.FC<{ children: React.ReactNode; onAdd: () => void; label?: string }> = ({ children, onAdd, label = 'Add' }) => (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
      {children}
      <Button onClick={onAdd} size="sm"><Plus size={14} style={{ marginRight: 4 }} />{label}</Button>
    </div>
  );

  return (
    <Layout>
      <div className="screen-header">
        <div>
          <h1 className="screen-title">Settings</h1>
          <p className="screen-subtitle">Configuration area for Managers and Admins.</p>
        </div>
      </div>

      {/* Main tab bar */}
      <div className="tabs-bar" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id}
            className={`tab-btn ${activeTab === t.id ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── System Profile ──────────────────────────────────────────────────── */}
      {activeTab === 'system-profile' && (
        <Card className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '2rem 2rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                <Building2 size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>System Profile</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
                  Manage the primary identity and global configuration for this CRM instance.
                </p>
              </div>
            </div>
          </div>
          
          <Card.Content style={{ padding: '2rem' }}>
            {isManagerOrAboveSelected ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px' }}>
                
                {/* Identity Section */}
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
                    <Building size={16} color="#3b82f6" /> Organization Identity
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>CRM System Name *</label>
                      <Input value={crmName} onChange={e => setCrmName(e.target.value)} error={errors.systemName} placeholder="e.g. KENOVA CRM" style={{ background: 'var(--bg-primary)' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Organization Name</label>
                      <Input value={crmShortName} onChange={e => setCrmShortName(e.target.value)} error={errors.companyName} placeholder="e.g. KENOVA" style={{ background: 'var(--bg-primary)' }} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                        <Image size={14} /> Logo Image (Local Upload or URL)
                      </label>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '250px' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <Button 
                              variant="secondary" 
                              onClick={() => fileInputRef.current?.click()} 
                              disabled={uploadingLogo}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
                            >
                              <Upload size={16} /> {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                            </Button>
                            <input 
                              type="file" 
                              accept="image/png, image/jpeg, image/gif, image/webp, image/svg+xml"
                              ref={fileInputRef} 
                              style={{ display: 'none' }} 
                              onChange={handleLogoUpload} 
                            />
                            <div style={{ flex: 1, minWidth: '150px' }}>
                              <Input value={crmLogo} onChange={e => setCrmLogo(e.target.value)} error={errors.logo} placeholder="Or enter image URL here (e.g. https://...)" style={{ background: 'var(--bg-primary)', width: '100%' }} />
                            </div>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Maximum file size: 5MB. Supported formats: PNG, JPG, WEBP, GIF, SVG.</span>
                        </div>
                        {crmLogo && (
                          <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                            <img src={crmLogo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Contact Section */}
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
                    <Mail size={16} color="#a855f7" /> Contact Information
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                        <Mail size={14} /> Official Email
                      </label>
                      <Input value={email} onChange={e => setEmail(e.target.value)} error={errors.email} placeholder="contact@example.com" style={{ background: 'var(--bg-primary)' }} />
                    </div>
                    <div>
                      <PhoneInput 
                        label="Phone Number"
                        value={phone} 
                        onChange={setPhone} 
                        error={errors.phone} 
                        className="bg-primary"
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                        <Globe size={14} /> Website URL (Optional)
                      </label>
                      <Input value={website} onChange={e => setWebsite(e.target.value)} error={errors.website} placeholder="https://example.com" style={{ background: 'var(--bg-primary)' }} />
                    </div>
                  </div>
                </div>
                
                {/* Regional Section */}
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
                    <MapPin size={16} color="#10b981" /> Regional Settings
                  </h3>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={14} /> Headquarters Address
                    </label>
                    <Input value={address} onChange={e => setAddress(e.target.value)} error={errors.address} placeholder="123 Main St, City, State, ZIP" style={{ background: 'var(--bg-primary)' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                        <Globe size={14} /> Country
                      </label>
                      <SearchableSelect
                        value={country}
                        onChange={setCountry}
                        options={COUNTRIES.map(c => ({ value: c, label: c }))}
                        placeholder="Select Country"
                        className="bg-primary"
                        style={{ width: '100%' }}
                        error={errors.country}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                        <Hash size={14} /> Base Currency
                      </label>
                      <SearchableSelect
                        value={currency}
                        onChange={setCurrency}
                        options={CURRENCIES}
                        placeholder="Select Currency"
                        className="bg-primary"
                        style={{ width: '100%' }}
                        error={errors.currency}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                        <Clock size={14} /> Default Timezone
                      </label>
                      <SearchableSelect
                        value={timezone}
                        onChange={setTimezone}
                        options={TIMEZONES}
                        placeholder="Select Timezone"
                        className="bg-primary"
                        style={{ width: '100%' }}
                        error={errors.timezone}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <Button variant="primary" onClick={handleSaveSystemProfile} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 600, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)', border: 'none' }}>
                    <Save size={16} /> Save System Profile
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                <Building2 size={64} style={{ margin: '0 auto 1.5rem', opacity: 0.15 }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>Restricted Access</h3>
                <p style={{ maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>
                  You do not have the required permissions to modify the System Profile. Please contact a System Administrator if changes are needed.
                </p>
              </div>
            )}
          </Card.Content>
        </Card>
      )}

      {/* ── Pipeline Stages ─────────────────────────────────────────────────── */}
      {activeTab === 'pipeline' && (
        <Card className="glass-panel p-6">
          <Card.Content>
            <Section title="Pipeline Stages">
              {isManagerOrAboveSelected && (
                <AddForm onAdd={addStage}>
                  <input style={inputStyle} placeholder="Stage name" value={stageForm.name} onChange={e => setStageForm(p => ({ ...p, name: e.target.value }))} />
                  <input style={{ ...inputStyle, width: 80, flex: 'none' }} type="number" placeholder="Order" value={stageForm.sortOrder} onChange={e => setStageForm(p => ({ ...p, sortOrder: e.target.value }))} />
                  {checkboxRow('Won', stageForm.isWon, v => setStageForm(p => ({ ...p, isWon: v })))}
                  {checkboxRow('Lost', stageForm.isLost, v => setStageForm(p => ({ ...p, isLost: v })))}
                </AddForm>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {[...stages.items].sort((a, b) => a.sortOrder - b.sortOrder).map(s => (
                  editingStage?.id === s.id ? (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)44', flexWrap: 'wrap' }}>
                      <input style={inputStyle} value={editingStage.name} onChange={e => setEditingStage(p => p ? { ...p, name: e.target.value } : p)} />
                      <input style={{ ...inputStyle, width: 80, flex: 'none' }} type="number" value={editingStage.sortOrder} onChange={e => setEditingStage(p => p ? { ...p, sortOrder: Number(e.target.value) } : p)} />
                      {checkboxRow('Won', editingStage.isWon, v => setEditingStage(p => p ? { ...p, isWon: v } : p))}
                      {checkboxRow('Lost', editingStage.isLost, v => setEditingStage(p => p ? { ...p, isLost: v } : p))}
                      <Button size="sm" onClick={saveStage}><Check size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingStage(null)}><X size={14} /></Button>
                    </div>
                  ) : (
                    <LookupRow key={s.id} label={`${s.name}  ·  Order ${s.sortOrder}`}
                      badge={<>
                        {s.isWon && <Badge label="Won" color="#10b981" />}
                        {s.isLost && <Badge label="Lost" color="#ef4444" />}
                      </>}
                      onEdit={() => setEditingStage(s)}
                      onDelete={() => deleteStage(s.id)}
                      canEdit={isManagerOrAboveSelected}
                    />
                  )
                ))}
              </div>
            </Section>
          </Card.Content>
        </Card>
      )}

      {/* ── Tags ──────────────────────────────────────────────────────────────── */}
      {activeTab === 'tags' && (
        <Card className="glass-panel p-6">
          <Card.Content>
            <Section title="Tags">
              {isManagerOrAboveSelected && (
                <AddForm onAdd={addTag}>
                  <input style={inputStyle} placeholder="Tag name" value={tagName} onChange={e => setTagName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTag()} />
                </AddForm>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {tags.items.map(t => (
                  editingTag?.id === t.id ? (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)44' }}>
                      <input style={inputStyle} value={editingTag.name} onChange={e => setEditingTag(p => p ? { ...p, name: e.target.value } : p)} />
                      <Button size="sm" onClick={saveTag}><Check size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingTag(null)}><X size={14} /></Button>
                    </div>
                  ) : (
                    <LookupRow key={t.id} label={t.name}
                      onEdit={() => setEditingTag(t)} onDelete={() => deleteTag(t.id)} canEdit={isManagerOrAboveSelected} />
                  )
                ))}
                {tags.items.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No tags yet.</p>}
              </div>
            </Section>
          </Card.Content>
        </Card>
      )}

      {/* ── Products ──────────────────────────────────────────────────────────── */}
      {activeTab === 'products' && (
        <Card className="glass-panel p-6">
          <Card.Content>
            <Section title="Products Catalog">
              {isManagerOrAboveSelected && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Add New Product</h4>
                  <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Product Name</label>
                      <input style={inputStyle} type="text" placeholder="e.g. Premium Plan" value={newProductName} onChange={e => setNewProductName(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SKU</label>
                      <input style={inputStyle} type="text" placeholder="e.g. PRE-01" value={newProductSku} onChange={e => setNewProductSku(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Category</label>
                      <select style={{ ...inputStyle, width: '100%' }} value={newProductCategoryId} onChange={e => setNewProductCategoryId(e.target.value)}>
                        <option value="0">Select Category</option>
                        {productCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status</label>
                      <select style={{ ...inputStyle, width: '100%' }} value={newProductStatusId} onChange={e => setNewProductStatusId(e.target.value)}>
                        <option value="0">Select Status</option>
                        {productStatuses.map(status => (
                          <option key={status.id} value={status.id}>{status.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Price ($)</label>
                      <input style={inputStyle} type="number" step="0.01" min="0" placeholder="0.00" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cost ($)</label>
                      <input style={inputStyle} type="number" step="0.01" min="0" placeholder="0.00" value={newProductCost} onChange={e => setNewProductCost(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Stock Quantity</label>
                      <input style={inputStyle} type="number" min="0" placeholder="0" value={newProductStockQuantity} onChange={e => setNewProductStockQuantity(e.target.value)} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Description</label>
                      <textarea style={{ ...inputStyle, width: '100%', minHeight: '60px', resize: 'vertical' }} placeholder="Product description..." value={newProductDescription} onChange={e => setNewProductDescription(e.target.value)} />
                    </div>
                  </div>
                  <Button onClick={addProduct} style={{ marginTop: '1rem' }} size="sm">
                    <Plus size={14} style={{ marginRight: 4 }} /> Add Product
                  </Button>
                </div>
              )}

              {loadingProducts ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading products...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {products.map(product => (
                    <div key={product.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                      {editingProductId === product.id ? (
                        <>
                          <input style={{ ...inputStyle, minWidth: '150px' }} placeholder="Name" value={editingProductName} onChange={e => setEditingProductName(e.target.value)} />
                          <input style={{ ...inputStyle, width: '100px' }} placeholder="SKU" value={editingProductSku} onChange={e => setEditingProductSku(e.target.value)} />
                          <select style={{ ...inputStyle, width: '130px' }} value={editingProductCategoryId} onChange={e => setEditingProductCategoryId(e.target.value)}>
                            <option value="0">Category</option>
                            {productCategories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                          <select style={{ ...inputStyle, width: '130px' }} value={editingProductStatusId} onChange={e => setEditingProductStatusId(e.target.value)}>
                            <option value="0">Status</option>
                            {productStatuses.map(status => (
                              <option key={status.id} value={status.id}>{status.name}</option>
                            ))}
                          </select>
                          <input style={{ ...inputStyle, width: '90px' }} type="number" step="0.01" placeholder="Price" value={editingProductPrice} onChange={e => setEditingProductPrice(e.target.value)} />
                          <input style={{ ...inputStyle, width: '90px' }} type="number" step="0.01" placeholder="Cost" value={editingProductCost} onChange={e => setEditingProductCost(e.target.value)} />
                          <input style={{ ...inputStyle, width: '80px' }} type="number" placeholder="Stock" value={editingProductStockQuantity} onChange={e => setEditingProductStockQuantity(e.target.value)} />
                          <Button size="sm" onClick={() => saveProduct(product.id)}><Check size={14} /></Button>
                          <Button size="sm" variant="ghost" onClick={cancelEditProduct}><X size={14} /></Button>
                        </>
                      ) : (
                        <>
                          <div style={{ flex: '2 1 200px' }}>
                            <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{product.name}</strong>
                            {product.description && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{product.description}</span>}
                          </div>
                          <span style={{ flex: '1 1 120px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>SKU: <code style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{product.sku}</code></span>
                          <span style={{ flex: '1 1 100px', fontSize: '0.8rem' }}><Badge label={product.productCategoryName} color="#3b82f6" /></span>
                          <span style={{ flex: '1 1 100px', fontSize: '0.8rem' }}><Badge label={product.productStatusName} color="#10b981" /></span>
                          <div style={{ display: 'flex', gap: '1rem', flex: '1 1 auto', justifyContent: 'flex-end', fontSize: '0.85rem' }}>
                            <span>Price: <strong>${product.price}</strong></span>
                            <span>Cost: <span style={{ color: 'var(--text-muted)' }}>${product.cost ?? '-'}</span></span>
                            <span>Stock: <strong>{product.stockQuantity}</strong></span>
                          </div>
                          {isManagerOrAboveSelected && (
                            <div style={{ display: 'flex', gap: '0.2rem' }}>
                              <Button variant="ghost" size="sm" onClick={() => startEditProduct(product)}><Edit2 size={13} /></Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteProduct(product.id)}><Trash2 size={13} /></Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                  {products.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No products yet.</p>}
                </div>
              )}
            </Section>
          </Card.Content>
        </Card>
      )}

      {/* ── Sources ───────────────────────────────────────────────────────────── */}
      {activeTab === 'sources' && (
        <Card className="glass-panel p-6">
          <Card.Content>
            <Section title="Lead & Customer Sources">
              {isManagerOrAboveSelected && (
                <AddForm onAdd={addSource}>
                  <input style={inputStyle} placeholder="e.g. Website, Referral, LinkedIn" value={sourceName} onChange={e => setSourceName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSource()} />
                </AddForm>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {sources.items.map(s => (
                  editingSource?.id === s.id ? (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)44' }}>
                      <input style={inputStyle} value={editingSource.name} onChange={e => setEditingSource(p => p ? { ...p, name: e.target.value } : p)} />
                      <Button size="sm" onClick={saveSource}><Check size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingSource(null)}><X size={14} /></Button>
                    </div>
                  ) : (
                    <LookupRow key={s.id} label={s.name}
                      onEdit={() => setEditingSource(s)} onDelete={() => deleteSource(s.id)} canEdit={isManagerOrAboveSelected} />
                  )
                ))}
              </div>
            </Section>
          </Card.Content>
        </Card>
      )}

      {/* ── Statuses & Types ──────────────────────────────────────────────────── */}
      {activeTab === 'statuses' && (
        <Card className="glass-panel p-6">
          <Card.Content>
            {/* Sub-tab bar */}
            <div className="tabs-bar" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              {STATUS_SUB_TABS.map(st => (
                <button key={st.id}
                  className={`tab-btn ${statusSubTab === st.id ? 'tab-active' : ''}`}
                  onClick={() => setStatusSubTab(st.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}
                >
                  {st.icon}{st.label}
                </button>
              ))}
            </div>

            {/* Lead Statuses */}
            {statusSubTab === 'lead' && (
              <Section title="Lead Statuses">
                {isManagerOrAboveSelected && (
                  <AddForm onAdd={addLeadStatus}>
                    <input style={inputStyle} placeholder="e.g. New, Qualified, Converted" value={leadStatusForm.name} onChange={e => setLeadStatusForm(p => ({ ...p, name: e.target.value }))} />
                    <input style={{ ...inputStyle, width: 80, flex: 'none' }} type="number" placeholder="Order" value={leadStatusForm.sortOrder} onChange={e => setLeadStatusForm(p => ({ ...p, sortOrder: e.target.value }))} />
                    {checkboxRow('Terminal', leadStatusForm.isTerminal, v => setLeadStatusForm(p => ({ ...p, isTerminal: v })))}
                  </AddForm>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {[...leadStatuses.items].sort((a, b) => a.sortOrder - b.sortOrder).map(s => (
                    editingLeadStatus?.id === s.id ? (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)44', flexWrap: 'wrap' }}>
                        <input style={inputStyle} value={editingLeadStatus.name} onChange={e => setEditingLeadStatus(p => p ? { ...p, name: e.target.value } : p)} />
                        <input style={{ ...inputStyle, width: 80, flex: 'none' }} type="number" value={editingLeadStatus.sortOrder} onChange={e => setEditingLeadStatus(p => p ? { ...p, sortOrder: Number(e.target.value) } : p)} />
                        {checkboxRow('Terminal', editingLeadStatus.isTerminal, v => setEditingLeadStatus(p => p ? { ...p, isTerminal: v } : p))}
                        <Button size="sm" onClick={saveLeadStatus}><Check size={14} /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingLeadStatus(null)}><X size={14} /></Button>
                      </div>
                    ) : (
                      <LookupRow key={s.id} label={`${s.name}  ·  Order ${s.sortOrder}`}
                        badge={s.isTerminal ? <Badge label="Terminal" color="#3b82f6" /> : undefined}
                        onEdit={() => setEditingLeadStatus(s)} onDelete={async () => { if (await confirmAction('Delete?')) { await api.delete(`/api/leadstatuses/${s.id}`); leadStatuses.refresh(); toast('Deleted'); } }} canEdit={isManagerOrAboveSelected} />
                    )
                  ))}
                </div>
              </Section>
            )}

            {/* Task Statuses */}
            {statusSubTab === 'task' && (
              <Section title="Task Statuses">
                {isManagerOrAboveSelected && (
                  <AddForm onAdd={addTaskStatus}>
                    <input style={inputStyle} placeholder="e.g. Pending, In Progress, Done" value={taskStatusForm.name} onChange={e => setTaskStatusForm(p => ({ ...p, name: e.target.value }))} />
                    {checkboxRow('Terminal', taskStatusForm.isTerminal, v => setTaskStatusForm(p => ({ ...p, isTerminal: v })))}
                  </AddForm>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {taskStatuses.items.map(s => (
                    editingTaskStatus?.id === s.id ? (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)44' }}>
                        <input style={inputStyle} value={editingTaskStatus.name} onChange={e => setEditingTaskStatus(p => p ? { ...p, name: e.target.value } : p)} />
                        {checkboxRow('Terminal', editingTaskStatus.isTerminal, v => setEditingTaskStatus(p => p ? { ...p, isTerminal: v } : p))}
                        <Button size="sm" onClick={saveTaskStatus}><Check size={14} /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingTaskStatus(null)}><X size={14} /></Button>
                      </div>
                    ) : (
                      <LookupRow key={s.id} label={s.name}
                        badge={s.isTerminal ? <Badge label="Terminal" color="#3b82f6" /> : undefined}
                        onEdit={() => setEditingTaskStatus(s)} onDelete={async () => { if (await confirmAction('Delete?')) { await api.delete(`/api/taskstatuses/${s.id}`); taskStatuses.refresh(); toast('Deleted'); } }} canEdit={isManagerOrAboveSelected} />
                    )
                  ))}
                </div>
              </Section>
            )}

            {/* Activity Types */}
            {statusSubTab === 'activity' && (
              <Section title="Activity Types">
                {isManagerOrAboveSelected && (
                  <AddForm onAdd={addActivity}>
                    <input style={inputStyle} placeholder="e.g. Call, Email, Meeting" value={activityForm.name} onChange={e => setActivityForm(p => ({ ...p, name: e.target.value }))} />
                    <input style={{ ...inputStyle, width: 120, flex: 'none' }} placeholder="Icon (optional)" value={activityForm.icon} onChange={e => setActivityForm(p => ({ ...p, icon: e.target.value }))} />
                  </AddForm>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {activityTypes.items.map(a => (
                    editingActivity?.id === a.id ? (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)44' }}>
                        <input style={inputStyle} value={editingActivity.name} onChange={e => setEditingActivity(p => p ? { ...p, name: e.target.value } : p)} />
                        <input style={{ ...inputStyle, width: 120, flex: 'none' }} placeholder="Icon" value={editingActivity.icon || ''} onChange={e => setEditingActivity(p => p ? { ...p, icon: e.target.value } : p)} />
                        <Button size="sm" onClick={saveActivity}><Check size={14} /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingActivity(null)}><X size={14} /></Button>
                      </div>
                    ) : (
                      <LookupRow key={a.id} label={a.name}
                        badge={a.icon ? <Badge label={a.icon} color="#a78bfa" /> : undefined}
                        onEdit={() => setEditingActivity(a)} onDelete={async () => { if (await confirmAction('Delete?')) { await api.delete(`/api/activitytypes/${a.id}`); activityTypes.refresh(); toast('Deleted'); } }} canEdit={isManagerOrAboveSelected} />
                    )
                  ))}
                </div>
              </Section>
            )}

            {/* Notification Types */}
            {statusSubTab === 'notification' && (
              <Section title="Notification Types">
                {isManagerOrAboveSelected && (
                  <AddForm onAdd={addNotif}>
                    <input style={inputStyle} placeholder="e.g. TaskDue, OpportunityWon" value={notifForm.name} onChange={e => setNotifForm(p => ({ ...p, name: e.target.value }))} />
                    <input style={{ ...inputStyle, width: 140, flex: 'none' }} placeholder="Channel (InApp/Email)" value={notifForm.defaultChannel} onChange={e => setNotifForm(p => ({ ...p, defaultChannel: e.target.value }))} />
                  </AddForm>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {notifTypes.items.map(n => (
                    editingNotif?.id === n.id ? (
                      <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)44' }}>
                        <input style={inputStyle} value={editingNotif.name} onChange={e => setEditingNotif(p => p ? { ...p, name: e.target.value } : p)} />
                        <input style={{ ...inputStyle, width: 140, flex: 'none' }} placeholder="Channel" value={editingNotif.defaultChannel || ''} onChange={e => setEditingNotif(p => p ? { ...p, defaultChannel: e.target.value } : p)} />
                        <Button size="sm" onClick={saveNotif}><Check size={14} /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingNotif(null)}><X size={14} /></Button>
                      </div>
                    ) : (
                      <LookupRow key={n.id} label={n.name}
                        badge={n.defaultChannel ? <Badge label={n.defaultChannel} color="#06b6d4" /> : undefined}
                        onEdit={() => setEditingNotif(n)} onDelete={async () => { if (await confirmAction('Delete?')) { await api.delete(`/api/notificationtypes/${n.id}`); notifTypes.refresh(); toast('Deleted'); } }} canEdit={isManagerOrAboveSelected} />
                    )
                  ))}
                </div>
              </Section>
            )}
          </Card.Content>
        </Card>
      )}

      {/* ── Theme Studio ───────────────────────────────────────────────────────── */}
      {activeTab === 'theme' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* 1. Theme Studio Header Banner */}
          <Card className="glass-panel p-6">
            <Card.Content>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>
                    <Sparkles size={18} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Enterprise UI Customizer</span>
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Appearance & Theme Studio
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0.25rem 0 0 0' }}>
                    Personalize your CRM system with high-contrast, modern glassmorphism aesthetic themes
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Theme:</span>
                  <span className="rpt-badge-chip" style={{ background: activePreset.accentGlow, color: activePreset.accentPrimary, borderColor: activePreset.accentPrimary, fontWeight: 700 }}>
                    {activePreset.name} ({activePreset.mode})
                  </span>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* 2. Theme Presets Grid */}
          <Card className="glass-panel p-6">
            <Card.Content>
              <Section title="Curated Theme Collections">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>

                  {/* Theme Mode Filter Pills */}
                  <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                    <button
                      onClick={() => setThemeModeFilter('all')}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: themeModeFilter === 'all' ? 'var(--accent-primary)' : 'transparent',
                        color: themeModeFilter === 'all' ? '#ffffff' : 'var(--text-secondary)',
                        transition: 'all 0.2s'
                      }}
                    >
                      All Themes ({ATTRACTIVE_THEMES.length})
                    </button>
                    <button
                      onClick={() => setThemeModeFilter('dark')}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: themeModeFilter === 'dark' ? 'var(--accent-primary)' : 'transparent',
                        color: themeModeFilter === 'dark' ? '#ffffff' : 'var(--text-secondary)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Moon size={12} /> Dark ({ATTRACTIVE_THEMES.filter(t => t.mode === 'dark').length})
                    </button>
                    <button
                      onClick={() => setThemeModeFilter('light')}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: themeModeFilter === 'light' ? 'var(--accent-primary)' : 'transparent',
                        color: themeModeFilter === 'light' ? '#ffffff' : 'var(--text-secondary)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Sun size={12} /> Light ({ATTRACTIVE_THEMES.filter(t => t.mode === 'light').length})
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', marginBottom: '1.5rem' }}>
                  {filteredPresets.map((preset) => {
                    const isActive = activePreset.id === preset.id;
                    const displayPreset = isActive ? activePreset : preset;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => selectTheme(displayPreset)}
                        style={{
                          background: displayPreset.pageBg,
                          borderRadius: 'var(--radius-xl)',
                          border: isActive ? `2px solid ${displayPreset.accentPrimary}` : '1px solid var(--border-color)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                          transform: isActive ? 'scale(1.02)' : 'scale(1)',
                          boxShadow: isActive ? `0 8px 24px ${displayPreset.accentGlow}` : '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      >
                        {/* Gradient Header Banner */}
                        <div style={{
                          height: 70,
                          background: displayPreset.previewGradient,
                          padding: '0.75rem 1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start'
                        }}>
                          <span style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: 20,
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            background: 'rgba(0,0,0,0.4)',
                            color: '#fff',
                            backdropFilter: 'blur(4px)'
                          }}>
                            {displayPreset.badge}
                          </span>

                          {isActive && (
                            <span style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: displayPreset.accentPrimary,
                              color: '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                            }}>
                              <Check size={14} />
                            </span>
                          )}
                        </div>

                        {/* Card Content Body */}
                        <div style={{ padding: '1rem', background: displayPreset.bgSecondary }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: displayPreset.textPrimary }}>
                              {displayPreset.name}
                            </h4>
                            <span style={{ fontSize: '0.72rem', color: displayPreset.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                              {displayPreset.mode === 'dark' ? <Moon size={12} /> : <Sun size={12} />}
                              {displayPreset.mode}
                            </span>
                          </div>

                          <p style={{ margin: '0 0 1rem 0', fontSize: '0.78rem', color: displayPreset.textSecondary, lineHeight: 1.4, height: 32, overflow: 'hidden' }}>
                            {displayPreset.tagline}
                          </p>

                          {/* Color Palette Swatches */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.68rem', color: displayPreset.textMuted, textTransform: 'uppercase', fontWeight: 700, marginRight: 4 }}>Colors</span>
                            <div style={{ width: 18, height: 18, borderRadius: '50%', background: displayPreset.pageBg, border: '1px solid rgba(255,255,255,0.2)' }} title="Background" />
                            <div style={{ width: 18, height: 18, borderRadius: '50%', background: displayPreset.bgSecondary, border: '1px solid rgba(255,255,255,0.2)' }} title="Card Container" />

                            {/* Interactive Accent Color Picker Swatch */}
                            <label title="Click to customize Accent Color for this theme" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative' }}>
                              <input
                                type="color"
                                value={displayPreset.accentPrimary}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const customHex = e.target.value;
                                  const updatedPreset = {
                                    ...displayPreset,
                                    accentPrimary: customHex,
                                    accentHover: customHex,
                                    accentGlow: customHex + '66'
                                  };
                                  selectTheme(updatedPreset);
                                }}
                                style={{
                                  position: 'absolute',
                                  opacity: 0,
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  cursor: 'pointer'
                                }}
                              />
                              <div style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: displayPreset.accentPrimary,
                                boxShadow: `0 0 10px ${displayPreset.accentGlow}`,
                                border: '2px solid #ffffff'
                              }} />
                            </label>

                            <div style={{ width: 18, height: 18, borderRadius: '50%', background: displayPreset.textPrimary, border: '1px solid rgba(255,255,255,0.2)' }} title="Text Header" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Color Overrider & Reset */}
                <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input
                      type="color"
                      value={activePreset.accentPrimary}
                      onChange={e => handleAccentChange(e.target.value)}
                      style={{ width: 44, height: 44, border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: 'none' }}
                    />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Custom Primary Accent Override</h4>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Fine-tune current preset accent color ({activePreset.accentPrimary})</span>
                    </div>
                  </div>

                  <Button variant="secondary" size="sm" onClick={handleResetTheme}>
                    Reset to Midnight Cyber Default
                  </Button>
                </div>
              </Section>
            </Card.Content>
          </Card>

          {/* 3. Live UI Theme Preview Box */}
          <Card className="glass-panel p-6">
            <Card.Content>
              <Section title="Live Interactive UI Preview">
                <div style={{
                  background: activePreset.pageBg,
                  borderRadius: 'var(--radius-xl)',
                  padding: '1.5rem',
                  border: `1px solid ${activePreset.borderColor}`,
                  boxShadow: `0 12px 36px ${activePreset.accentGlow}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: activePreset.accentPrimary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Eye size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: activePreset.textPrimary }}>
                          CRM Opportunity Preview ({previewTimeframe})
                        </h4>
                        <span style={{ fontSize: '0.78rem', color: activePreset.textSecondary }}>
                          Live interactive test of {activePreset.name} components & controls
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        padding: '0.3rem 0.8rem',
                        borderRadius: 20,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: activePreset.accentGlow,
                        color: activePreset.accentPrimary,
                        border: `1px solid ${activePreset.accentPrimary}44`
                      }}>
                        Pipeline Active
                      </span>
                      {previewActionCount > 0 && (
                        <span style={{
                          padding: '0.3rem 0.8rem',
                          borderRadius: 20,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.4)'
                        }}>
                          +{previewActionCount} Test Deals
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ background: activePreset.bgSecondary, padding: '1rem', borderRadius: 'var(--radius-lg)', border: `1px solid ${activePreset.borderColor}` }}>
                      <span style={{ fontSize: '0.72rem', color: activePreset.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>Pipeline Capital</span>
                      <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: activePreset.accentPrimary }}>
                        ${((previewTimeframe === 'Q3 2026' ? 148500 : 482000) + previewActionCount * 12500).toLocaleString()}
                      </h3>
                    </div>
                    <div style={{ background: activePreset.bgSecondary, padding: '1rem', borderRadius: 'var(--radius-lg)', border: `1px solid ${activePreset.borderColor}` }}>
                      <span style={{ fontSize: '0.72rem', color: activePreset.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>Conversion Win Rate</span>
                      <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
                        {previewTimeframe === 'Q3 2026' ? '68.4%' : '74.2%'}
                      </h3>
                    </div>
                    <div style={{ background: activePreset.bgSecondary, padding: '1rem', borderRadius: 'var(--radius-lg)', border: `1px solid ${activePreset.borderColor}` }}>
                      <span style={{ fontSize: '0.72rem', color: activePreset.textMuted, fontWeight: 600, textTransform: 'uppercase' }}>Deals In Pipeline</span>
                      <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: activePreset.textPrimary }}>
                        {previewTimeframe === 'Q3 2026' ? 24 + previewActionCount : 86 + previewActionCount}
                      </h3>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={handlePrimaryActionDemo}
                      style={{
                        padding: '0.65rem 1.35rem',
                        borderRadius: 'var(--radius-md)',
                        background: activePreset.accentPrimary,
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        boxShadow: `0 4px 14px ${activePreset.accentGlow}`,
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Sparkles size={16} />
                      Primary Action (+1 Deal)
                    </button>

                    <button
                      onClick={handleSecondaryFilterToggle}
                      style={{
                        padding: '0.65rem 1.35rem',
                        borderRadius: 'var(--radius-md)',
                        background: activePreset.bgTertiary,
                        color: activePreset.textPrimary,
                        border: `1px solid ${activePreset.borderColor}`,
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <Globe size={16} />
                      Secondary Filter ({previewTimeframe})
                    </button>
                  </div>
                </div>
              </Section>
            </Card.Content>
          </Card>
        </div>
      )}

      {/* ── Custom Fields Admin ─────────────────────────────────────────────── */}
      {activeTab === 'custom-fields' && <CustomFieldsAdminTab />}
    </Layout>
  );
};
