import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { DateRangePicker } from '../components/ui/DateRangePicker';
import { api } from '../lib/api';
import {
    Plus, Search, UserPlus, Calendar, Clock, AlertTriangle,
    Users, Target, UserCheck, Award, Mail, Phone, CheckCircle, LayoutGrid, List, Eye, ArrowRight, ChevronRight, Filter, Info, X
} from 'lucide-react';
import { LeadConvertModal } from '../components/ui/LeadConvertModal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { LeadSectionModal, LeadSectionType } from '../components/leads/LeadSectionModal';
import './screens.css';

interface LeadSummary {
    leadId: number;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    companyName?: string;
    sourceId?: number;
    sourceName?: string;
    leadStatusId?: number;
    leadStatusName: string;
    assignedRepId?: number;
    assignedRepName?: string;
    priority?: string;
    leadScore: number;
    lostReason?: string;
    nextFollowUpDate?: string;
    nextFollowUpType?: string;
    nextFollowUpNotes?: string;
    nextFollowUpAssignedToName?: string;
    lastActivityAt?: string;
    createdAt: string;
    isDeleted?: boolean;
}

export const LeadsScreen: React.FC = () => {
    const [leads, setLeads] = useState<LeadSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [convertingLead, setConvertingLead] = useState<LeadSummary | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [search, setSearch] = useState('');
    const [statuses, setStatuses] = useState<{ id: number; name: string }[]>([]);
    const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
    const [sources, setSources] = useState<{ id: number; name: string }[]>([]);

    // Filters
    const [selectedStatusId, setSelectedStatusId] = useState<string>('');
    const [selectedPriority, setSelectedPriority] = useState<string>('');
    const [selectedRating, setSelectedRating] = useState<string>('');
    const [selectedFollowUpFilter, setSelectedFollowUpFilter] = useState<string>('');
    const [selectedRepId, setSelectedRepId] = useState<string>('');
    const [selectedSourceId, setSelectedSourceId] = useState<string>('');
    const [showConverted, setShowConverted] = useState(false);
    const [includeDeleted, setIncludeDeleted] = useState(false);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Dashboard Section State & Modal
    const [selectedSectionModal, setSelectedSectionModal] = useState<LeadSectionType | null>(null);
    const [activeDashboardSection, setActiveDashboardSection] = useState<LeadSectionType | null>(null);

    const navigate = useNavigate();
    const location = useLocation();

    const handleApplySection = (section: LeadSectionType) => {
        setActiveDashboardSection(section);
        if (section === 'active') {
            setSelectedStatusId('');
            setSelectedRating('');
            setSelectedFollowUpFilter('');
            setShowConverted(false);
        } else if (section === 'hot') {
            setSelectedRating('Hot');
            setSelectedStatusId('');
            setSelectedFollowUpFilter('');
            setShowConverted(false);
        } else if (section === 'due') {
            setSelectedFollowUpFilter('today');
            setSelectedRating('');
            setSelectedStatusId('');
            setShowConverted(false);
        } else if (section === 'converted') {
            setShowConverted(true);
            setSelectedRating('');
            setSelectedFollowUpFilter('');
            setSelectedStatusId('');
        }
    };

    const handleClearSectionFilter = () => {
        setActiveDashboardSection(null);
        setSelectedStatusId('');
        setSelectedRating('');
        setSelectedFollowUpFilter('');
        setShowConverted(false);
    };

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const sectionParam = queryParams.get('section') as LeadSectionType | null;
        const ratingParam = queryParams.get('rating');
        const followUpParam = queryParams.get('followUpFilter') || queryParams.get('followUp');
        const showConvertedParam = queryParams.get('showConverted');

        if (sectionParam && ['active', 'hot', 'due', 'converted'].includes(sectionParam)) {
            handleApplySection(sectionParam);
        } else if (ratingParam === 'Hot') {
            setActiveDashboardSection('hot');
            setSelectedRating('Hot');
        } else if (followUpParam) {
            setActiveDashboardSection('due');
            setSelectedFollowUpFilter(followUpParam);
        } else if (showConvertedParam === 'true') {
            setActiveDashboardSection('converted');
            setShowConverted(true);
        }
    }, [location.search]);

    const getLeadRating = (score: number) => {
        if (score >= 70) return { label: '🔥 Hot', rating: 'Hot', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)' };
        if (score >= 40) return { label: '⚡ Warm', rating: 'Warm', color: '#d97706', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)' };
        return { label: '❄️ Cold', rating: 'Cold', color: '#2563eb', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.25)' };
    };

    const getLeadStatusStyle = (name?: string) => {
        switch (name) {
            case 'Converted':
                return { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: 'rgba(16, 185, 129, 0.25)' };
            case 'Qualified':
                return { bg: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5', border: 'rgba(99, 102, 241, 0.25)' };
            case 'Contacted':
                return { bg: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: 'rgba(245, 158, 11, 0.25)' };
            case 'Follow-up Scheduled':
                return { bg: 'rgba(14, 165, 233, 0.12)', color: '#0284c7', border: 'rgba(14, 165, 233, 0.25)' };
            case 'Lost':
            case 'Disqualified':
            case 'Closed':
                return { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: 'rgba(239, 68, 68, 0.25)' };
            default: // New
                return { bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', border: 'rgba(59, 130, 246, 0.25)' };
        }
    };

    const loadLeads = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const params = new URLSearchParams();
            params.append('page', '1');
            params.append('pageSize', '100');

            if (search.trim()) params.append('search', search.trim());
            if (selectedStatusId) params.append('leadStatusId', selectedStatusId);
            if (selectedPriority) params.append('priority', selectedPriority);
            if (selectedRating) params.append('rating', selectedRating);
            if (selectedFollowUpFilter) params.append('followUpFilter', selectedFollowUpFilter);
            if (selectedRepId) params.append('repId', selectedRepId);
            if (selectedSourceId) params.append('sourceId', selectedSourceId);
            if (showConverted) params.append('showConverted', 'true');
            if (includeDeleted) params.append('includeDeleted', 'true');
            if (startDate) params.append('createdFrom', startDate);
            if (endDate) params.append('createdTo', endDate);

            const queryString = params.toString();
            const response = await api.get<{ data: LeadSummary[] }>(`/api/leads?${queryString}`);
            setLeads(response.data ?? []);
        } catch {
            setLoadError('Failed to load leads. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [search, selectedStatusId, selectedPriority, selectedRating, selectedFollowUpFilter, selectedRepId, selectedSourceId, showConverted, includeDeleted, startDate, endDate]);

    useEffect(() => {
        loadLeads();
    }, [loadLeads, location.key]);

    useEffect(() => {
        api.get<{ id: number; name: string }[]>('/api/leadstatuses')
            .then(data => setStatuses(data))
            .catch(() => setStatuses([]));

        api.get<{ id: number; name: string }[]>('/api/sources')
            .then(data => setSources(data))
            .catch(() => setSources([]));

        api.get<any[]>('/api/users')
            .then(data => setUsers(data.map((u: any) => ({ id: u.id ?? u.identityId, name: u.name }))))
            .catch(() => setUsers([]));
    }, []);

    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    const parseUtcDate = (dateStr?: string | null): Date | null => {
        if (!dateStr) return null;
        const iso = dateStr.endsWith('Z') || dateStr.includes('+') || (dateStr.includes('-') && dateStr.length > 19)
            ? dateStr
            : dateStr + 'Z';
        return new Date(iso);
    };

    const isOverdue = (dateStr?: string, statusName?: string) => {
        if (!dateStr || statusName === 'Converted' || statusName === 'Lost' || statusName === 'Closed') return false;
        return parseUtcDate(dateStr)!.getTime() < now.getTime();
    };

    const isToday = (dateStr?: string) => {
        if (!dateStr) return false;
        const d = parseUtcDate(dateStr)!;
        return d.toDateString() === now.toDateString();
    };

    if (isLoading && leads.length === 0) {
        return (
            <Layout>
                <div className="dashboard-header animate-fade-in">
                    <div className="dashboard-title">
                        <h1>Leads</h1>
                        <p>Manage prospects, follow-up planning, qualification, and sales conversions</p>
                    </div>
                    <Button disabled><Plus size={16} style={{ marginRight: 6 }} /> New Lead</Button>
                </div>
                <div className="customers-grid">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} variant="card" className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` } as React.CSSProperties} />
                    ))}
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="dashboard-header animate-fade-in">
                <div className="dashboard-title">
                    <h1>Leads</h1>
                    <p>Manage prospects, follow-up planning, qualification, and sales conversions</p>
                </div>
                <Button onClick={() => navigate('/leads/new')} variant="primary">
                    <Plus size={16} style={{ marginRight: 6 }} /> New Lead
                </Button>
            </div>

            {loadError && (
                <div className="error-message animate-fade-in" style={{ marginBottom: '1.5rem' }}>
                    {loadError}
                </div>
            )}

            {/* Leads Dashboard KPI Summary Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                {/* 1. Active Leads Card */}
                <div
                    className="glass-panel animate-fade-in"
                    style={{
                        padding: '1.15rem 1.25rem',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        background: activeDashboardSection === 'active' 
                            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(217, 119, 6, 0.05) 100%)' 
                            : 'var(--bg-card)',
                        border: activeDashboardSection === 'active' 
                            ? '1.5px solid #f59e0b' 
                            : '1px solid var(--border-color)',
                        transition: 'all 0.2s ease',
                        boxShadow: activeDashboardSection === 'active' 
                            ? '0 6px 20px rgba(245, 158, 11, 0.22)' 
                            : '0 4px 10px rgba(0, 0, 0, 0.03)',
                        position: 'relative'
                    }}
                    onClick={() => handleApplySection('active')}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: activeDashboardSection === 'active' ? '#f59e0b' : 'var(--text-primary)' }}>
                                Active Leads
                            </span>
                            {activeDashboardSection === 'active' && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: '#f59e0b', color: '#ffffff' }}>
                                    VIEWING
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                                type="button"
                                title="Open Active Leads Section Popup"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSectionModal('active');
                                }}
                                style={{
                                    border: 'none',
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    color: '#f59e0b',
                                    borderRadius: '6px',
                                    padding: '0.2rem 0.45rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                }}
                            >
                                <Eye size={12} /> Popup
                            </button>
                            <div style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Target size={16} />
                            </div>
                        </div>
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                        {leads.filter(l => l.leadStatusName !== 'Converted').length}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#f59e0b', marginTop: '0.15rem', fontWeight: 600 }}>
                        Pipeline prospects (Active)
                    </div>
                </div>

                {/* 2. Hot Prospects Card */}
                <div
                    className="glass-panel animate-fade-in"
                    style={{
                        padding: '1.15rem 1.25rem',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        background: activeDashboardSection === 'hot' 
                            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.16) 0%, rgba(220, 38, 38, 0.05) 100%)' 
                            : 'var(--bg-card)',
                        border: activeDashboardSection === 'hot' 
                            ? '1.5px solid #ef4444' 
                            : '1px solid var(--border-color)',
                        transition: 'all 0.2s ease',
                        boxShadow: activeDashboardSection === 'hot' 
                            ? '0 6px 20px rgba(239, 68, 68, 0.22)' 
                            : '0 4px 10px rgba(0, 0, 0, 0.03)',
                        position: 'relative'
                    }}
                    onClick={() => handleApplySection('hot')}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: activeDashboardSection === 'hot' ? '#ef4444' : 'var(--text-primary)' }}>
                                🔥 Hot Prospects
                            </span>
                            {activeDashboardSection === 'hot' && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: '#ef4444', color: '#ffffff' }}>
                                    VIEWING
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                                type="button"
                                title="Open Hot Prospects Section Popup"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSectionModal('hot');
                                }}
                                style={{
                                    border: 'none',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    color: '#ef4444',
                                    borderRadius: '6px',
                                    padding: '0.2rem 0.45rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                }}
                            >
                                <Eye size={12} /> Popup
                            </button>
                            <div style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Award size={16} />
                            </div>
                        </div>
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444', marginTop: '0.35rem' }}>
                        {leads.filter(l => (l.leadScore ?? 0) >= 70).length}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#ef4444', marginTop: '0.15rem', fontWeight: 600 }}>
                        Score ≥ 70% (Ready to close)
                    </div>
                </div>

                {/* 3. Due / Overdue Card */}
                <div
                    className="glass-panel animate-fade-in"
                    style={{
                        padding: '1.15rem 1.25rem',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        background: activeDashboardSection === 'due' 
                            ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.16) 0%, rgba(180, 83, 9, 0.05) 100%)' 
                            : 'var(--bg-card)',
                        border: activeDashboardSection === 'due' 
                            ? '1.5px solid #d97706' 
                            : '1px solid var(--border-color)',
                        transition: 'all 0.2s ease',
                        boxShadow: activeDashboardSection === 'due' 
                            ? '0 6px 20px rgba(217, 119, 6, 0.22)' 
                            : '0 4px 10px rgba(0, 0, 0, 0.03)',
                        position: 'relative'
                    }}
                    onClick={() => handleApplySection('due')}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: activeDashboardSection === 'due' ? '#d97706' : 'var(--text-primary)' }}>
                                ⏰ Due / Overdue
                            </span>
                            {activeDashboardSection === 'due' && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: '#d97706', color: '#ffffff' }}>
                                    VIEWING
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                                type="button"
                                title="Open Due & Overdue Section Popup"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSectionModal('due');
                                }}
                                style={{
                                    border: 'none',
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    color: '#d97706',
                                    borderRadius: '6px',
                                    padding: '0.2rem 0.45rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                }}
                            >
                                <Eye size={12} /> Popup
                            </button>
                            <div style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Clock size={16} />
                            </div>
                        </div>
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706', marginTop: '0.35rem' }}>
                        {leads.filter(l => isOverdue(l.nextFollowUpDate, l.leadStatusName) || isToday(l.nextFollowUpDate)).length}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#d97706', marginTop: '0.15rem', fontWeight: 600 }}>
                        Follow-ups needing action
                    </div>
                </div>

                {/* 4. Converted Leads Card */}
                <div
                    className="glass-panel animate-fade-in"
                    style={{
                        padding: '1.15rem 1.25rem',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        background: activeDashboardSection === 'converted' 
                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, rgba(5, 150, 105, 0.05) 100%)' 
                            : 'var(--bg-card)',
                        border: activeDashboardSection === 'converted' 
                            ? '1.5px solid #10b981' 
                            : '1px solid var(--border-color)',
                        transition: 'all 0.2s ease',
                        boxShadow: activeDashboardSection === 'converted' 
                            ? '0 6px 20px rgba(16, 185, 129, 0.22)' 
                            : '0 4px 10px rgba(0, 0, 0, 0.03)',
                        position: 'relative'
                    }}
                    onClick={() => handleApplySection('converted')}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: activeDashboardSection === 'converted' ? '#10b981' : 'var(--text-primary)' }}>
                                ✅ Converted Leads
                            </span>
                            {activeDashboardSection === 'converted' && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: '#10b981', color: '#ffffff' }}>
                                    VIEWING
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                                type="button"
                                title="Open Converted Leads Section Popup"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSectionModal('converted');
                                }}
                                style={{
                                    border: 'none',
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    color: '#10b981',
                                    borderRadius: '6px',
                                    padding: '0.2rem 0.45rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                }}
                            >
                                <Eye size={12} /> Popup
                            </button>
                            <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <UserCheck size={16} />
                            </div>
                        </div>
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '0.35rem' }}>
                        {leads.filter(l => l.leadStatusName === 'Converted').length}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#10b981', marginTop: '0.15rem', fontWeight: 600 }}>
                        Sales conversions (Won)
                    </div>
                </div>
            </div>

            {/* Active Section Filter Indicator Banner */}
            {activeDashboardSection && (
                <div
                    className="glass-panel animate-fade-in"
                    style={{
                        marginBottom: '1.25rem',
                        padding: '0.75rem 1.25rem',
                        borderRadius: '12px',
                        background: activeDashboardSection === 'hot' 
                            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.04) 100%)'
                            : activeDashboardSection === 'due'
                            ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.12) 0%, rgba(180, 83, 9, 0.04) 100%)'
                            : activeDashboardSection === 'converted'
                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.04) 100%)'
                            : 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.04) 100%)',
                        border: `1px solid ${
                            activeDashboardSection === 'hot' ? 'rgba(239, 68, 68, 0.35)'
                            : activeDashboardSection === 'due' ? 'rgba(217, 119, 6, 0.35)'
                            : activeDashboardSection === 'converted' ? 'rgba(16, 185, 129, 0.35)'
                            : 'rgba(245, 158, 11, 0.35)'
                        }`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: activeDashboardSection === 'hot' ? '#ef4444' : activeDashboardSection === 'due' ? '#d97706' : activeDashboardSection === 'converted' ? '#10b981' : '#f59e0b',
                            color: '#ffffff'
                        }}>
                            Active Section
                        </span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {activeDashboardSection === 'hot' ? '🔥 Hot Prospects (Score 70%+)' 
                             : activeDashboardSection === 'due' ? '⏰ Due & Overdue Follow-Ups'
                             : activeDashboardSection === 'converted' ? '✅ Converted Customers'
                             : '🎯 Active Pipeline Leads'}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            · {leads.length} matching leads shown
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedSectionModal(activeDashboardSection)}
                            style={{
                                fontSize: '0.78rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                borderColor: activeDashboardSection === 'hot' ? '#ef4444' : activeDashboardSection === 'due' ? '#d97706' : activeDashboardSection === 'converted' ? '#10b981' : '#f59e0b',
                                color: activeDashboardSection === 'hot' ? '#ef4444' : activeDashboardSection === 'due' ? '#d97706' : activeDashboardSection === 'converted' ? '#10b981' : '#f59e0b'
                            }}
                        >
                            <Eye size={13} /> View Section Details Popup
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearSectionFilter}
                            style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}
                        >
                            <X size={13} style={{ marginRight: 3 }} /> Clear Filter
                        </Button>
                    </div>
                </div>
            )}

            {/* Standard CRM Search and Filters Bar */}
            <div className="filters-bar glass-panel" style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative', flex: '1 1 240px' }}>
                    <Search size={16} className="filter-icon" />
                    <input
                        className="filter-input"
                        placeholder="Search by lead name, company, email, phone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div style={{ minWidth: 140, flex: '1 1 140px' }}>
                    <SearchableSelect
                        value={selectedStatusId}
                        options={[
                            { value: '', label: 'All Statuses' },
                            ...statuses.map(s => ({ value: String(s.id), label: s.name }))
                        ]}
                        onChange={val => setSelectedStatusId(String(val))}
                        placeholder="All Statuses"
                    />
                </div>

                <div style={{ minWidth: 130, flex: '1 1 130px' }}>
                    <SearchableSelect
                        value={selectedPriority}
                        options={[
                            { value: '', label: 'All Priorities' },
                            { value: 'Low', label: 'Low Priority' },
                            { value: 'Medium', label: 'Medium Priority' },
                            { value: 'High', label: 'High Priority' },
                            { value: 'Urgent', label: 'Urgent Priority' }
                        ]}
                        onChange={val => setSelectedPriority(String(val))}
                        placeholder="All Priorities"
                    />
                </div>

                <div style={{ minWidth: 160, flex: '1 1 160px' }}>
                    <SearchableSelect
                        value={selectedRating}
                        options={[
                            { value: '', label: 'All Score Ratings' },
                            { value: 'Hot', label: '🔥 Hot Prospect (≥ 70%)' },
                            { value: 'Warm', label: '⚡ Warm Lead (40% - 69%)' },
                            { value: 'Cold', label: '❄️ Cold Lead (< 40%)' }
                        ]}
                        onChange={val => setSelectedRating(String(val))}
                        placeholder="All Score Ratings"
                    />
                </div>

                <div style={{ minWidth: 150, flex: '1 1 150px' }}>
                    <SearchableSelect
                        value={selectedFollowUpFilter}
                        options={[
                            { value: '', label: 'All Follow-Ups' },
                            { value: 'today', label: 'Follow-Up Due Today' },
                            { value: 'overdue', label: 'Overdue Follow-Ups' },
                            { value: 'upcoming', label: 'Upcoming Follow-Ups' }
                        ]}
                        onChange={val => setSelectedFollowUpFilter(String(val))}
                        placeholder="All Follow-Ups"
                    />
                </div>

                {users.length > 0 && (
                    <div style={{ minWidth: 150, flex: '1 1 150px' }}>
                        <SearchableSelect
                            value={selectedRepId}
                            options={[
                                { value: '', label: 'All Sales Reps' },
                                ...users.map(u => ({ value: String(u.id), label: u.name }))
                            ]}
                            onChange={val => setSelectedRepId(String(val))}
                            placeholder="All Sales Reps"
                        />
                    </div>
                )}

                {sources.length > 0 && (
                    <div style={{ minWidth: 140, flex: '1 1 140px' }}>
                        <SearchableSelect
                            value={selectedSourceId}
                            options={[
                                { value: '', label: 'All Sources' },
                                ...sources.map(s => ({ value: String(s.id), label: s.name }))
                            ]}
                            onChange={val => setSelectedSourceId(String(val))}
                            placeholder="All Sources"
                        />
                    </div>
                )}

                <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onApply={(s, e) => {
                        setStartDate(s);
                        setEndDate(e);
                    }}
                />

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                        type="checkbox"
                        checked={showConverted}
                        onChange={e => setShowConverted(e.target.checked)}
                    />
                    Include Converted
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0 1rem', height: '42px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <input
                        type="checkbox"
                        id="includeDeleted"
                        checked={includeDeleted}
                        onChange={e => setIncludeDeleted(e.target.checked)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                    />
                    <label htmlFor="includeDeleted" style={{ fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Show Deleted
                    </label>
                </div>

                {/* Grid / Table View Mode Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--bg-secondary)', padding: '0.2rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', marginLeft: 'auto' }}>
                    <button
                        type="button"
                        style={{ padding: '0.35rem 0.65rem', border: 'none', background: viewMode === 'grid' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'grid' ? '#ffffff' : 'var(--text-secondary)', borderRadius: '0.375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600 }}
                        onClick={() => setViewMode('grid')}
                        title="Card Grid View"
                    >
                        <LayoutGrid size={14} /> Cards
                    </button>
                    <button
                        type="button"
                        style={{ padding: '0.35rem 0.65rem', border: 'none', background: viewMode === 'table' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'table' ? '#ffffff' : 'var(--text-secondary)', borderRadius: '0.375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600 }}
                        onClick={() => setViewMode('table')}
                        title="Compact Data Table View"
                    >
                        <List size={14} /> Data Table
                    </button>
                </div>
            </div>

            {/* View Mode: Compact Data Table View for High Volume */}
            {viewMode === 'table' ? (
                <div className="customer-table-wrap glass-panel animate-fade-in" style={{ borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <table className="customer-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary)', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '0.85rem 1rem' }}>Lead Name</th>
                                <th style={{ padding: '0.85rem 1rem' }}>Company & Job Title</th>
                                <th style={{ padding: '0.85rem 1rem' }}>Contact Info</th>
                                <th style={{ padding: '0.85rem 1rem' }}>Score Rating</th>
                                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                                <th style={{ padding: '0.85rem 1rem' }}>Priority</th>
                                <th style={{ padding: '0.85rem 1rem' }}>Assigned Rep</th>
                                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map(lead => {
                                const rating = getLeadRating(lead.leadScore ?? 0);
                                return (
                                    <tr
                                        key={lead.leadId}
                                        style={lead.isDeleted ? { cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', opacity: 0.6, background: 'var(--bg-secondary)' } : { cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                                        onClick={() => navigate(`/leads/${lead.leadId}`)}
                                    >
                                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {lead.firstName} {lead.lastName} {lead.isDeleted && <span className="deleted-badge" style={{ marginLeft: 6, fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>Deleted</span>}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                                            {lead.companyName ? `${lead.companyName} ${lead.jobTitle ? `· ${lead.jobTitle}` : ''}` : '—'}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <span>{lead.email || '—'}</span>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{lead.phone || ''}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem' }}>
                                            <span style={{ padding: '0.15rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.7rem', fontWeight: 700, background: rating.bg, color: rating.color, border: `1px solid ${rating.border}` }}>
                                                {rating.label} ({lead.leadScore ?? 0}%)
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem' }}>
                                            {(() => {
                                                const st = getLeadStatusStyle(lead.leadStatusName);
                                                return (
                                                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                                                        {lead.leadStatusName}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: lead.priority === 'Urgent' ? '#dc2626' : lead.priority === 'High' ? '#d97706' : 'var(--text-secondary)' }}>
                                            {lead.priority || 'Medium'}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                                            {lead.assignedRepName || 'Unassigned'}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                                            {lead.leadStatusName === 'Converted' ? (
                                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <CheckCircle size={13} /> Converted
                                                </span>
                                            ) : lead.leadStatusName === 'Lost' ? (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lost</span>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    disabled={lead.isDeleted}
                                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', borderColor: '#10b981', color: '#059669', background: 'rgba(16, 185, 129, 0.08)' }}
                                                    onClick={() => setConvertingLead(lead)}
                                                >
                                                    <CheckCircle size={12} style={{ marginRight: 4 }} /> Convert
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Card Grid View */
                <div className="customers-grid">
                    {leads.map(lead => {
                        const overdue = isOverdue(lead.nextFollowUpDate, lead.leadStatusName);
                        const dueToday = isToday(lead.nextFollowUpDate);
                        const initials = `${lead.firstName[0] || ''}${lead.lastName[0] || ''}`.toUpperCase();
                        const rating = getLeadRating(lead.leadScore ?? 0);

                        return (
                            <Card
                                key={lead.leadId}
                                className="glass-panel customer-card animate-fade-in"
                                style={lead.isDeleted ? {
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    borderRadius: '14px',
                                    border: '1px solid var(--border-color)',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    opacity: 0.6
                                } : {
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    borderRadius: '14px',
                                    border: '1px solid var(--border-color)',
                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                                onClick={() => navigate(`/leads/${lead.leadId}`)}
                            >
                                <Card.Content style={{ padding: '1.25rem' }}>
                                    {/* Card Header: Avatar, Name & Status Badges */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.85rem', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div className="customer-avatar" style={{ background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)', color: '#ffffff', width: '42px', height: '42px', borderRadius: '10px', fontSize: '1rem', fontWeight: 700 }}>
                                                {initials}
                                            </div>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                                    {lead.firstName} {lead.lastName}
                                                    {lead.isDeleted && <span className="deleted-badge" style={{ marginLeft: 6, fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b', fontWeight: 600, verticalAlign: 'middle' }}>Deleted</span>}
                                                </h3>
                                                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                    {lead.companyName || 'Individual Contact'} {lead.jobTitle ? `· ${lead.jobTitle}` : ''}
                                                </p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            {(() => {
                                                const st = getLeadStatusStyle(lead.leadStatusName);
                                                return (
                                                    <span style={{
                                                        padding: '0.2rem 0.6rem',
                                                        borderRadius: '6px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        background: st.bg,
                                                        color: st.color,
                                                        border: `1px solid ${st.border}`
                                                    }}>
                                                        {lead.leadStatusName}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Score Rating & Priority Bar */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', padding: '0.4rem 0.65rem', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            color: rating.color
                                        }}>
                                            {rating.label} ({lead.leadScore ?? 0}%)
                                        </span>
                                        <span style={{
                                            fontSize: '0.72rem',
                                            fontWeight: 600,
                                            color: lead.priority === 'Urgent' ? '#dc2626' : lead.priority === 'High' ? '#d97706' : 'var(--text-secondary)'
                                        }}>
                                            {lead.priority || 'Medium'} Priority
                                        </span>
                                    </div>

                                    {/* Contact & Assigned Details */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--text-secondary)', padding: '0.65rem 0', borderTop: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <Mail size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                            <span className="truncate">{lead.email || 'No email provided'}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Phone size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                            <span>{lead.phone || 'No phone number'}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <UserCheck size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                            <span>Rep: <strong>{lead.assignedRepName || 'Unassigned'}</strong></span>
                                        </div>
                                    </div>

                                    {/* Next Follow-Up Banner */}
                                    <div style={{ marginTop: '0.65rem' }}>
                                        {lead.nextFollowUpDate ? (
                                            <div style={{
                                                padding: '0.55rem 0.75rem',
                                                borderRadius: '8px',
                                                fontSize: '0.78rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: overdue ? 'rgba(239, 68, 68, 0.08)' : dueToday ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-secondary)',
                                                border: overdue ? '1px solid rgba(239, 68, 68, 0.25)' : dueToday ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid var(--border-color)',
                                                color: overdue ? '#dc2626' : dueToday ? '#b45309' : 'var(--text-secondary)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    {overdue ? <AlertTriangle size={14} /> : <Clock size={14} />}
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.78rem' }}>{lead.nextFollowUpType || 'Follow-Up'}</div>
                                                        <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>{new Date(lead.nextFollowUpDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                                    </div>
                                                </div>
                                                {overdue && <span style={{ fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', background: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>Overdue</span>}
                                                {dueToday && <span style={{ fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', background: 'rgba(245, 158, 11, 0.15)', color: '#b45309', padding: '0.15rem 0.4rem', borderRadius: '0.25rem' }}>Today</span>}
                                            </div>
                                        ) : (
                                            <div style={{ padding: '0.45rem', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                                No follow-up planned
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Toolbar */}
                                    <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.6rem', borderTop: '1px solid var(--border-color)' }}>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/leads/${lead.leadId}`);
                                            }}
                                        >
                                            <Eye size={13} style={{ marginRight: 4 }} /> View Details
                                        </Button>

                                        {lead.leadStatusName === 'Converted' ? (
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <CheckCircle size={13} /> Converted
                                            </span>
                                        ) : lead.leadStatusName === 'Lost' ? (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lost</span>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem', borderColor: '#10b981', color: '#059669', background: 'rgba(16, 185, 129, 0.08)' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConvertingLead(lead);
                                                }}
                                            >
                                                <CheckCircle size={13} style={{ marginRight: 4, color: '#10b981' }} /> Convert
                                            </Button>
                                        )}
                                    </div>
                                </Card.Content>
                            </Card>
                        );
                    })}

                    {leads.length === 0 && !loadError && (
                        <div style={{ gridColumn: '1 / -1' }}>
                            <EmptyState
                                title="No leads found"
                                description="Try adjusting your search filters or schedule a new lead to get started."
                                icon={UserPlus}
                                actionText="New Lead"
                                onActionClick={() => navigate('/leads/new')}
                            />
                        </div>
                    )}
                </div>
            )}

            {convertingLead && (
                <LeadConvertModal
                    isOpen={!!convertingLead}
                    leadId={convertingLead.leadId}
                    leadData={{
                        firstName: convertingLead.firstName,
                        lastName: convertingLead.lastName,
                        email: convertingLead.email,
                        phone: convertingLead.phone,
                        companyName: convertingLead.companyName
                    }}
                    onCancel={() => setConvertingLead(null)}
                    onConverted={() => {
                        setConvertingLead(null);
                        loadLeads();
                    }}
                />
            )}

            {/* Leads Dashboard Section Detail Popup Modal */}
            <LeadSectionModal
                isOpen={!!selectedSectionModal}
                initialSection={selectedSectionModal || 'active'}
                leads={leads}
                onClose={() => setSelectedSectionModal(null)}
                onApplyFilter={(sec) => {
                    handleApplySection(sec);
                    setSelectedSectionModal(null);
                }}
                onNavigateToLead={(id) => {
                    setSelectedSectionModal(null);
                    navigate(`/leads/${id}`);
                }}
            />
        </Layout>
    );
};