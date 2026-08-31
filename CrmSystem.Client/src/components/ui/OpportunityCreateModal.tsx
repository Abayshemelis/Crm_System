import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Input } from './Input';
import { DatePicker } from './DatePicker';
import { CustomerSearchSelect } from './CustomerSearchSelect';
import { SearchableSelect } from './SearchableSelect';
import { api } from '../../lib/api';
import {
  validateName,
  validatePositiveNumber,
  validateRequiredSelect,
  validateMaxLength,
} from '../../lib/validators';
import {
  X, AlertCircle, Briefcase, Building2, Mail,
  CheckCircle2, ArrowRight, User as UserIcon, ChevronDown,
} from 'lucide-react';
import { getStandardCloseDatePresets } from '../../lib/dateUtils';
import { useFormatCurrency } from '../../context/SystemProfileContext';
import { useAuth } from '../../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PreselectedCustomerInfo {
  customerId: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  assignedRepId?: number;
  assignedRepName?: string;
}

interface OpportunityStage {
  opportunityStageId: number;
  name: string;
  sortOrder: number;
  isWon?: boolean;
  isLost?: boolean;
}

interface ApiUser {
  id: number;
  name: string;
  role: string;
}

interface OpportunityCreateModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onCreated: (createdOpportunity?: any) => void;
  preselectedCustomerId?: number;
  preselectedCustomer?: PreselectedCustomerInfo;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const OpportunityCreateModal: React.FC<OpportunityCreateModalProps> = ({
  isOpen,
  onCancel,
  onCreated,
  preselectedCustomerId,
  preselectedCustomer,
}) => {
  const { user: currentUser } = useAuth();
  const { formatCurrency, currency } = useFormatCurrency();

  // Form state
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerDetails, setCustomerDetails] = useState<PreselectedCustomerInfo | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stageId, setStageId] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [ownerId, setOwnerId] = useState('');

  // Meta state
  const [stages, setStages] = useState<OpportunityStage[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Dropdowns
  const [showValueMenu, setShowValueMenu] = useState(false);
  const [showTitleMenu, setShowTitleMenu] = useState(false);
  const valueMenuRef = useRef<HTMLDivElement>(null);
  const titleMenuRef = useRef<HTMLDivElement>(null);

  const VALUE_PRESETS = [1000, 5000, 10000, 25000, 50000, 100000];

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (valueMenuRef.current && !valueMenuRef.current.contains(e.target as Node)) {
        setShowValueMenu(false);
      }
      if (titleMenuRef.current && !titleMenuRef.current.contains(e.target as Node)) {
        setShowTitleMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load data on open
  useEffect(() => {
    if (!isOpen) return;

    const activeCustId = preselectedCustomerId || preselectedCustomer?.customerId || null;
    setCustomerId(activeCustId);

    if (preselectedCustomer) {
      setCustomerDetails(preselectedCustomer);
    } else if (activeCustId) {
      api.get<any>(`/api/customers/${activeCustId}`)
        .then(c => setCustomerDetails({
          customerId: c.customerId,
          name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
          firstName: c.firstName, lastName: c.lastName,
          email: c.email, phone: c.phone,
          companyName: c.companyName,
          assignedRepId: c.assignedRepId,
          assignedRepName: c.assignedRepName,
        }))
        .catch(() => setCustomerDetails(null));
    } else {
      setCustomerDetails(null);
    }

    setTitle(''); setDescription(''); setEstimatedValue('');
    setError(null); setErrors({}); setShowValueMenu(false);

    const presets = getStandardCloseDatePresets();
    setExpectedCloseDate(presets[1]?.value ?? '');

    Promise.all([
      api.get<OpportunityStage[]>('/api/opportunitystages'),
      api.get<ApiUser[]>('/api/users'),
    ]).then(([stageData, userData]) => {
      const sorted = [...(stageData ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
      setStages(sorted);
      const allUsers = userData ?? [];
      setUsers(allUsers);
      if (sorted.length > 0) setStageId(String(sorted[0].opportunityStageId));

      const repIdStr = preselectedCustomer?.assignedRepId ? String(preselectedCustomer.assignedRepId) : '';
      const curIdStr = currentUser?.userId ? String(currentUser.userId) : '';
      if (repIdStr && allUsers.some(u => String(u.id) === repIdStr)) {
        setOwnerId(repIdStr);
      } else if (curIdStr && allUsers.some(u => String(u.id) === curIdStr)) {
        setOwnerId(curIdStr);
      } else if (allUsers.length > 0) {
        setOwnerId(String(allUsers[0].id));
      }
    }).catch(() => setError('Failed to load pipeline stages or users.'));
  }, [isOpen, preselectedCustomerId, preselectedCustomer, currentUser]);

  const customerDisplayName = useMemo(() => {
    if (customerDetails?.name) return customerDetails.name;
    return `${customerDetails?.firstName ?? ''} ${customerDetails?.lastName ?? ''}`.trim();
  }, [customerDetails]);

  const titleSuggestions = useMemo(() => {
    const base = customerDetails?.companyName || customerDisplayName || 'Client';
    return [
      `${base} - New Deal`,
      `${base} - Service Renewal`,
      `${base} - Annual Contract`,
      `${base} - Implementation`,
    ];
  }, [customerDetails, customerDisplayName]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const custErr = validateRequiredSelect(customerId, 'Customer');
    if (custErr) e.customerId = custErr;
    const titleErr = validateName(title, 'Deal title', 2, 150);
    if (titleErr) e.title = titleErr;
    const stageErr = validateRequiredSelect(stageId, 'Pipeline stage');
    if (stageErr) e.stageId = stageErr;
    const valErr = validatePositiveNumber(estimatedValue, 'Estimated deal value', true);
    if (valErr) e.estimatedValue = valErr;
    const ownerErr = validateRequiredSelect(ownerId, 'Deal owner');
    if (ownerErr) e.ownerId = ownerErr;
    const descErr = validateMaxLength(description, 1000, 'Description');
    if (descErr) e.description = descErr;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setLoading(true); setError(null);
    try {
      const created = await api.post('/api/opportunities', {
        customerId, title: title.trim(),
        description: description.trim() || null,
        opportunityStageId: Number(stageId),
        estimatedValue: Number(estimatedValue),
        expectedCloseDate: expectedCloseDate || null,
        ownerId: Number(ownerId),
      });
      onCreated(created);
    } catch (err: any) {
      setError(err?.message || 'Failed to create deal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  const isPreselected = Boolean(preselectedCustomerId || preselectedCustomer?.customerId);

  // ── Styles ────────────────────────────────────────────────────────────────

  const S: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(15,23,42,0.45)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', zIndex: 99999,
    },
    container: {
      width: '100%', maxWidth: '700px', maxHeight: '92vh',
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '20px',
      boxShadow: '0 25px 60px -15px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.04)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    },
    header: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '1.35rem 1.75rem',
      background: '#ffffff',
      borderBottom: '1px solid #f1f5f9',
      flexShrink: 0,
    },
    body: {
      padding: '1.25rem 1.75rem',
      overflowY: 'auto', flex: 1,
      display: 'flex', flexDirection: 'column', gap: '1rem',
      background: '#f8fafc',
    },
    footer: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '1rem 1.75rem',
      background: '#ffffff',
      borderTop: '1px solid #f1f5f9',
      flexShrink: 0,
    },
    iconBox: {
      width: '44px', height: '44px', borderRadius: '12px',
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
    },
    closeBtn: {
      background: '#f1f5f9', border: '1px solid #e2e8f0',
      borderRadius: '10px', padding: '7px',
      color: '#64748b', cursor: 'pointer',
      display: 'flex', alignItems: 'center', lineHeight: 1,
    },
    errorBanner: {
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      padding: '0.75rem 1rem', borderRadius: '10px',
      background: '#fef2f2', border: '1px solid #fecaca',
      color: '#dc2626', fontSize: '0.84rem', fontWeight: 500,
    },
    card: {
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '14px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    },
    customerCard: {
      background: '#ffffff', border: '1px solid #e2e8f0',
      borderRadius: '14px', padding: '1rem 1.25rem',
      display: 'flex', alignItems: 'center', gap: '0.85rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    },
    avatar: {
      width: '40px', height: '40px', borderRadius: '12px',
      background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
      color: '#7c3aed', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontWeight: 800, fontSize: '1rem', flexShrink: 0,
    },
    linkedChip: {
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.15rem 0.5rem', borderRadius: '6px',
      fontSize: '0.69rem', fontWeight: 700,
      background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0',
    },
    label: {
      display: 'block', marginBottom: '0.4rem',
      fontWeight: 600, fontSize: '0.82rem', color: '#374151',
    },
    fieldHint: { fontSize: '0.72rem', color: '#94a3b8' },
    chipRow: { display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.45rem' },
    fieldError: { color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 500 },
    textarea: {
      width: '100%', minHeight: '80px', resize: 'vertical',
      padding: '0.65rem 0.85rem', borderRadius: '10px',
      border: '1.5px solid #e2e8f0',
      background: '#ffffff', color: '#1e293b',
      fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none',
      boxSizing: 'border-box',
    },
    createBtn: {
      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      color: '#fff', fontWeight: 700,
      padding: '0.6rem 1.35rem', fontSize: '0.9rem',
      border: 'none', borderRadius: '10px', cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
      boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
      opacity: loading ? 0.7 : 1,
    },
    cancelBtn: {
      background: 'transparent', border: '1.5px solid #e2e8f0',
      borderRadius: '10px', color: '#64748b',
      fontWeight: 600, padding: '0.6rem 1.1rem',
      fontSize: '0.9rem', cursor: 'pointer',
    },
  };

  const dateChip = (active: boolean): React.CSSProperties => ({
    padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 600,
    borderRadius: '7px',
    border: active ? '1.5px solid #6366f1' : '1.5px solid #e2e8f0',
    background: active ? '#ede9fe' : '#ffffff',
    color: active ? '#4f46e5' : '#64748b',
    cursor: 'pointer',
    boxShadow: active ? '0 2px 8px rgba(99,102,241,0.18)' : 'none',
  });

  const titleChip: React.CSSProperties = {
    fontSize: '0.73rem', padding: '0.22rem 0.6rem',
    borderRadius: '7px', border: '1.5px dashed #cbd5e1',
    background: '#f8fafc', color: '#475569',
    cursor: 'pointer', fontFamily: 'inherit',
  };

  // ── Portal render ─────────────────────────────────────────────────────────

  return ReactDOM.createPortal(
    <div style={S.overlay} onClick={onCancel}>
      <style>{`
        .ocm .input-field, .ocm input[type="date"],
        .ocm input[type="number"], .ocm input[type="text"] {
          background: #ffffff !important; color: #1e293b !important;
          border: 1.5px solid #e2e8f0 !important; border-radius: 10px !important;
        }
        .ocm .input-field:focus, .ocm input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12) !important;
          outline: none !important;
        }
        .ocm .input-label, .ocm label {
          color: #374151 !important; font-weight: 600 !important; font-size: 0.82rem !important;
        }
        .ocm .input-error-text { color: #dc2626 !important; }
        .ocm .input-field.input-error {
          border-color: #fca5a5 !important; background: #fff7f7 !important;
        }
      `}</style>

      <div className="ocm" style={S.container} onClick={e => e.stopPropagation()}>

        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={S.iconBox}><Briefcase size={21} /></div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
                Create New Deal
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.79rem', color: '#94a3b8' }}>
                {isPreselected && customerDisplayName
                  ? <>For <strong style={{ color: '#6366f1' }}>{customerDisplayName}</strong>{customerDetails?.companyName ? ` · ${customerDetails.companyName}` : ''}</>
                  : 'Add a sales opportunity to your pipeline'}
              </p>
            </div>
          </div>
          <button type="button" style={S.closeBtn} onClick={onCancel}><X size={18} /></button>
        </div>

        {/* ── BODY ────────────────────────────────────────────────── */}
        <div style={S.body}>

          {/* Error banner */}
          {error && (
            <div style={S.errorBanner}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* ── Customer ── */}
          {isPreselected && customerDetails ? (
            <div style={S.customerCard}>
              <div style={S.avatar}>{customerDisplayName.charAt(0) || 'C'}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.94rem', fontWeight: 700, color: '#0f172a' }}>{customerDisplayName}</span>
                  <span style={S.linkedChip}><CheckCircle2 size={11} /> Linked Customer</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.76rem', color: '#64748b', marginTop: '3px', flexWrap: 'wrap' }}>
                  {customerDetails.companyName && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Building2 size={12} /> {customerDetails.companyName}</span>}
                  {customerDetails.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={12} /> {customerDetails.email}</span>}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ ...S.card, padding: '1.1rem 1.25rem' }}>
              <CustomerSearchSelect
                label="Customer Account *"
                value={customerId}
                onChange={cId => { setCustomerId(cId); if (errors.customerId) setErrors(p => ({ ...p, customerId: '' })); }}
                error={errors.customerId}
                placeholder="Search and select a customer..."
              />
            </div>
          )}

          {/* ── Deal Title ── */}
          <div style={{ ...S.card, padding: '1.1rem 1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={S.label}>Deal Title *</label>
              <span style={S.fieldHint}>Give this deal a recognizable name</span>
            </div>

            {/* Input + Suggestions dropdown trigger */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Input
                  value={title}
                  onChange={e => { setTitle(e.target.value); if (errors.title) setErrors(p => ({ ...p, title: '' })); }}
                  error={errors.title}
                  placeholder="e.g., Enterprise Software Package"
                />
              </div>

              {/* Suggestions dropdown */}
              <div ref={titleMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setShowTitleMenu(v => !v)}
                  style={{
                    height: '38px', padding: '0 0.75rem',
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    fontSize: '0.79rem', fontWeight: 700,
                    color: showTitleMenu ? '#4f46e5' : '#475569',
                    background: showTitleMenu ? '#ede9fe' : '#f8fafc',
                    border: showTitleMenu ? '1.5px solid #6366f1' : '1.5px solid #e2e8f0',
                    borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}
                >
                  Suggestions
                  <ChevronDown size={13} style={{ transform: showTitleMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>

                {showTitleMenu && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                    background: '#fff', border: '1.5px solid #e2e8f0',
                    borderRadius: '12px', boxShadow: '0 8px 24px -6px rgba(0,0,0,0.15)',
                    minWidth: '230px', zIndex: 200, padding: '0.35rem',
                  }}>
                    <p style={{
                      margin: '0 0 0.2rem', padding: '0.3rem 0.6rem',
                      fontSize: '0.67rem', fontWeight: 700, color: '#94a3b8',
                      textTransform: 'uppercase', letterSpacing: '0.07em',
                    }}>
                      Quick Titles
                    </p>
                    {titleSuggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setTitle(s); setShowTitleMenu(false); if (errors.title) setErrors(p => ({ ...p, title: '' })); }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          width: '100%', padding: '0.5rem 0.7rem',
                          fontSize: '0.85rem', fontWeight: title === s ? 700 : 500,
                          color: title === s ? '#4f46e5' : '#1e293b',
                          background: title === s ? '#ede9fe' : 'transparent',
                          border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <span>{s}</span>
                        {title === s && <CheckCircle2 size={14} style={{ color: '#6366f1' }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Deal Value + Pipeline Stage ── */}
          <div style={{ ...S.card, padding: 0, overflow: 'visible' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>

              {/* Deal Value */}
              <div style={{ flex: '1 1 260px', padding: '1.1rem 1.25rem', borderRight: '1px solid #f1f5f9' }}>
                <label style={S.label}>Deal Value ({currency}) *</label>

                {/* Input row with Presets dropdown trigger */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Input
                      type="number" step="0.01" min="0"
                      value={estimatedValue}
                      onChange={e => { setEstimatedValue(e.target.value); if (errors.estimatedValue) setErrors(p => ({ ...p, estimatedValue: '' })); }}
                      error={errors.estimatedValue}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Presets dropdown */}
                  <div ref={valueMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => setShowValueMenu(v => !v)}
                      style={{
                        height: '38px', padding: '0 0.75rem',
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        fontSize: '0.79rem', fontWeight: 700,
                        color: showValueMenu ? '#4f46e5' : '#475569',
                        background: showValueMenu ? '#ede9fe' : '#f8fafc',
                        border: showValueMenu ? '1.5px solid #6366f1' : '1.5px solid #e2e8f0',
                        borderRadius: '10px', cursor: 'pointer', whiteSpace: 'nowrap',
                        transition: 'all 0.15s',
                      }}
                    >
                      Presets
                      <ChevronDown
                        size={13}
                        style={{ transform: showValueMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                      />
                    </button>

                    {showValueMenu && (
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                        background: '#fff', border: '1.5px solid #e2e8f0',
                        borderRadius: '12px', boxShadow: '0 8px 24px -6px rgba(0,0,0,0.15)',
                        minWidth: '165px', zIndex: 200, padding: '0.35rem',
                      }}>
                        <p style={{
                          margin: '0 0 0.2rem', padding: '0.3rem 0.6rem',
                          fontSize: '0.67rem', fontWeight: 700, color: '#94a3b8',
                          textTransform: 'uppercase', letterSpacing: '0.07em',
                        }}>
                          Quick Amounts
                        </p>
                        {VALUE_PRESETS.map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setEstimatedValue(String(p));
                              setShowValueMenu(false);
                              if (errors.estimatedValue) setErrors(prev => ({ ...prev, estimatedValue: '' }));
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              width: '100%', padding: '0.5rem 0.7rem',
                              fontSize: '0.86rem', fontWeight: estimatedValue === String(p) ? 700 : 500,
                              color: estimatedValue === String(p) ? '#4f46e5' : '#1e293b',
                              background: estimatedValue === String(p) ? '#ede9fe' : 'transparent',
                              border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                            }}
                          >
                            <span>{formatCurrency(p)}</span>
                            {estimatedValue === String(p) && <CheckCircle2 size={14} style={{ color: '#6366f1' }} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pipeline Stage */}
              <div style={{ flex: '1 1 220px', padding: '1.1rem 1.25rem' }}>
                <label style={S.label}>Pipeline Stage *</label>
                <SearchableSelect
                  value={stageId}
                  onChange={val => { setStageId(String(val)); if (errors.stageId) setErrors(p => ({ ...p, stageId: '' })); }}
                  options={[
                    { value: '', label: 'Select a stage' },
                    ...stages.map(s => ({
                      value: String(s.opportunityStageId),
                      label: s.name + (s.isWon ? ' ✓' : s.isLost ? ' ✗' : ''),
                    })),
                  ]}
                  placeholder="Select a stage"
                />
                {errors.stageId && <div style={S.fieldError}>{errors.stageId}</div>}
              </div>

            </div>
          </div>

          {/* ── Close Date + Owner ── */}
          <div style={{ ...S.card, padding: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>

              {/* Close Date */}
              <div style={{ flex: '1 1 240px', padding: '1.1rem 1.25rem', borderRight: '1px solid #f1f5f9' }}>
                <DatePicker
                  label="Target Close Date"
                  value={expectedCloseDate}
                  onChange={v => setExpectedCloseDate(v)}
                />
                <div style={S.chipRow}>
                  {getStandardCloseDatePresets().map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      style={dateChip(expectedCloseDate === preset.value)}
                      onClick={() => setExpectedCloseDate(preset.value)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assigned Owner */}
              <div style={{ flex: '1 1 220px', padding: '1.1rem 1.25rem' }}>
                <label style={{ ...S.label, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <UserIcon size={13} style={{ color: '#6366f1' }} /> Assigned Owner *
                </label>
                <SearchableSelect
                  value={ownerId}
                  onChange={val => { setOwnerId(String(val)); if (errors.ownerId) setErrors(p => ({ ...p, ownerId: '' })); }}
                  options={[
                    { value: '', label: 'Select deal owner' },
                    ...users.map(u => ({ value: String(u.id), label: `${u.name} (${u.role})` })),
                  ]}
                  placeholder="Select deal owner"
                />
                {errors.ownerId && <div style={S.fieldError}>{errors.ownerId}</div>}
              </div>

            </div>
          </div>

          {/* ── Notes ── */}
          <div style={{ ...S.card, padding: '1.1rem 1.25rem' }}>
            <label style={S.label}>Deal Scope &amp; Notes</label>
            <textarea
              style={S.textarea}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Key customer requirements, contract terms, or special deal context..."
            />
            {errors.description && <div style={S.fieldError}>{errors.description}</div>}
          </div>

        </div>

        {/* ── FOOTER ──────────────────────────────────────────────── */}
        <div style={S.footer}>
          <button type="button" style={S.cancelBtn} onClick={onCancel} disabled={loading}>Cancel</button>
          <button type="button" style={S.createBtn} onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : <><span>Create Deal</span><ArrowRight size={15} /></>}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default OpportunityCreateModal;
