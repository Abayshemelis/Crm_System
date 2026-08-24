import React, { useState, useEffect } from 'react';
import { Target, Award, Clock, UserCheck, X, ArrowRight, AlertTriangle, Eye, Filter, CheckCircle2, ChevronRight, Mail, Phone } from 'lucide-react';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import '../ui/ui.css';

export type LeadSectionType = 'active' | 'hot' | 'due' | 'converted';

export interface LeadItemSummary {
    leadId: number;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    companyName?: string;
    jobTitle?: string;
    leadStatusName: string;
    leadScore: number;
    priority?: string;
    assignedRepName?: string;
    nextFollowUpDate?: string;
    nextFollowUpType?: string;
    isDeleted?: boolean;
}

export interface LeadSectionModalProps {
    isOpen: boolean;
    initialSection?: LeadSectionType;
    leads?: LeadItemSummary[];
    stats?: {
        totalActive?: number;
        totalHot?: number;
        totalDue?: number;
        totalConverted?: number;
        totalAll?: number;
        conversionRate?: number;
    };
    onClose: () => void;
    onApplyFilter?: (section: LeadSectionType) => void;
    onNavigateToLead?: (leadId: number) => void;
    onOpenFullPage?: (section: LeadSectionType) => void;
}

interface SectionConfig {
    key: LeadSectionType;
    title: string;
    badgeLabel: string;
    subtitle: string;
    icon: React.ElementType;
    color: string;
    bgGradient: string;
    borderColor: string;
    glowColor: string;
    description: string;
    criteria: string;
}

const SECTION_CONFIGS: Record<LeadSectionType, SectionConfig> = {
    active: {
        key: 'active',
        title: 'Active Leads',
        badgeLabel: '🎯 Active Leads Section',
        subtitle: 'Pipeline Prospects (All un-converted leads)',
        icon: Target,
        color: '#f59e0b',
        bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(217, 119, 6, 0.06) 100%)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
        glowColor: 'rgba(245, 158, 11, 0.25)',
        description: 'All prospective clients currently active in the sales pipeline who have not yet reached converted or lost status.',
        criteria: 'Status: All Pipeline (Excludes Converted & Disqualified)'
    },
    hot: {
        key: 'hot',
        title: 'Hot Prospects',
        badgeLabel: '🔥 Hot Prospects Section (Score ≥ 70%)',
        subtitle: 'High-Scoring Leads Ready to Close',
        icon: Award,
        color: '#ef4444',
        bgGradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.16) 0%, rgba(220, 38, 38, 0.06) 100%)',
        borderColor: 'rgba(239, 68, 68, 0.35)',
        glowColor: 'rgba(239, 68, 68, 0.25)',
        description: 'High-intent prospects with an engagement & qualification score of 70% or above (out of 100%). These leads require top priority outreach for fast conversion.',
        criteria: 'Lead Engagement Score: 70% - 100%'
    },
    due: {
        key: 'due',
        title: 'Due / Overdue',
        badgeLabel: '⏰ Due / Overdue Section',
        subtitle: 'Follow-ups Needing Immediate Action',
        icon: Clock,
        color: '#d97706',
        bgGradient: 'linear-gradient(135deg, rgba(217, 119, 6, 0.16) 0%, rgba(180, 83, 9, 0.06) 100%)',
        borderColor: 'rgba(217, 119, 6, 0.35)',
        glowColor: 'rgba(217, 119, 6, 0.25)',
        description: 'Prospects with scheduled follow-up activities due today or past their target SLA date that require immediate sales rep action.',
        criteria: 'Follow-Up Date: Overdue or Due Today'
    },
    converted: {
        key: 'converted',
        title: 'Converted Leads',
        badgeLabel: '✅ Converted Leads Section',
        subtitle: 'Won Accounts & Customer Conversions',
        icon: UserCheck,
        color: '#10b981',
        bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, rgba(5, 150, 105, 0.06) 100%)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
        glowColor: 'rgba(16, 185, 129, 0.25)',
        description: 'Prospects successfully converted into permanent customer records with linked organization profiles and initial deal opportunities.',
        criteria: 'Lead Status: Converted (Official Customers)'
    }
};

export const LeadSectionModal: React.FC<LeadSectionModalProps> = ({
    isOpen,
    initialSection = 'active',
    leads = [],
    stats,
    onClose,
    onApplyFilter,
    onNavigateToLead,
    onOpenFullPage
}) => {
    const [currentSection, setCurrentSection] = useState<LeadSectionType>(initialSection);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && initialSection) {
            setCurrentSection(initialSection);
        }
    }, [isOpen, initialSection]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const parseUtcDate = (dateStr?: string | null): Date | null => {
        if (!dateStr) return null;
        const iso = dateStr.endsWith('Z') || dateStr.includes('+') || (dateStr.includes('-') && dateStr.length > 19)
            ? dateStr
            : dateStr + 'Z';
        return new Date(iso);
    };

    const isOverdue = (dateStr?: string, statusName?: string) => {
        if (!dateStr || statusName === 'Converted' || statusName === 'Lost' || statusName === 'Closed') return false;
        return parseUtcDate(dateStr)!.getTime() < Date.now();
    };

    const isToday = (dateStr?: string) => {
        if (!dateStr) return false;
        const d = parseUtcDate(dateStr)!;
        return d.toDateString() === new Date().toDateString();
    };

    // Calculate dynamic counts from passed leads
    const activeLeadsList = leads.filter(l => l.leadStatusName !== 'Converted' && !l.isDeleted);
    const hotLeadsList = leads.filter(l => (l.leadScore ?? 0) >= 70 && !l.isDeleted);
    const dueLeadsList = leads.filter(l => (isOverdue(l.nextFollowUpDate, l.leadStatusName) || isToday(l.nextFollowUpDate)) && !l.isDeleted);
    const convertedLeadsList = leads.filter(l => l.leadStatusName === 'Converted' && !l.isDeleted);

    const counts = {
        active: stats?.totalActive ?? activeLeadsList.length,
        hot: stats?.totalHot ?? hotLeadsList.length,
        due: stats?.totalDue ?? dueLeadsList.length,
        converted: stats?.totalConverted ?? convertedLeadsList.length
    };

    const config = SECTION_CONFIGS[currentSection];
    const IconComponent = config.icon;

    // Get matching leads for preview in currently selected section
    const getMatchingLeadsForSection = () => {
        switch (currentSection) {
            case 'hot':
                return hotLeadsList;
            case 'due':
                return dueLeadsList;
            case 'converted':
                return convertedLeadsList;
            case 'active':
            default:
                return activeLeadsList;
        }
    };

    const matchingLeads = getMatchingLeadsForSection();

    const handleActionClick = () => {
        if (onApplyFilter) {
            onApplyFilter(currentSection);
        } else if (onOpenFullPage) {
            onOpenFullPage(currentSection);
        } else {
            // Default navigation with section query
            onClose();
            navigate(`/leads?section=${currentSection}`);
        }
    };

    const handleLeadClick = (leadId: number) => {
        onClose();
        if (onNavigateToLead) {
            onNavigateToLead(leadId);
        } else {
            navigate(`/leads/${leadId}`);
        }
    };

    const totalPortfolio = (counts.active + counts.converted) || 1;
    const conversionRate = stats?.conversionRate 
        ? stats.conversionRate 
        : Math.round((counts.converted / totalPortfolio) * 100);

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100, backdropFilter: 'blur(8px)' }}>
            <div
                className="modal-content glass-panel animate-fade-in"
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '680px',
                    width: '95%',
                    maxHeight: '90vh',
                    borderRadius: '16px',
                    border: `1px solid ${config.borderColor}`,
                    boxShadow: `0 20px 50px rgba(0, 0, 0, 0.35), 0 0 25px ${config.glowColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                {/* Modal Header with Section Indicator & Close Button */}
                <div
                    className="modal-header"
                    style={{
                        padding: '1.25rem 1.5rem',
                        background: config.bgGradient,
                        borderBottom: `1px solid ${config.borderColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div
                            style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '12px',
                                background: 'var(--bg-card)',
                                border: `1px solid ${config.borderColor}`,
                                color: config.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: `0 4px 12px ${config.glowColor}`
                            }}
                        >
                            <IconComponent size={22} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span
                                    style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        letterSpacing: '0.05em',
                                        textTransform: 'uppercase',
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '6px',
                                        background: config.color,
                                        color: '#ffffff'
                                    }}
                                >
                                    {config.badgeLabel}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                    Leads Dashboard Section Detail
                                </span>
                            </div>
                            <h2 style={{ margin: '0.2rem 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                {config.title}
                            </h2>
                        </div>
                    </div>

                    <button
                        className="icon-btn"
                        onClick={onClose}
                        aria-label="Close modal"
                        style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Section Switcher Tabs */}
                <div
                    style={{
                        padding: '0.65rem 1.5rem',
                        background: 'var(--bg-secondary)',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '0.4rem'
                    }}
                >
                    {(Object.keys(SECTION_CONFIGS) as LeadSectionType[]).map((secKey) => {
                        const sec = SECTION_CONFIGS[secKey];
                        const isSelected = currentSection === secKey;
                        const SecIcon = sec.icon;
                        return (
                            <button
                                key={secKey}
                                type="button"
                                onClick={() => setCurrentSection(secKey)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0.45rem 0.5rem',
                                    borderRadius: '8px',
                                    border: isSelected ? `1.5px solid ${sec.color}` : '1px solid transparent',
                                    background: isSelected ? sec.bgGradient : 'transparent',
                                    color: isSelected ? sec.color : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    gap: '2px'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <SecIcon size={14} />
                                    <span style={{ fontSize: '0.78rem', fontWeight: isSelected ? 700 : 500 }}>
                                        {sec.title}
                                    </span>
                                </div>
                                <span
                                    style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        padding: '1px 6px',
                                        borderRadius: '10px',
                                        background: isSelected ? sec.color : 'rgba(148, 163, 184, 0.15)',
                                        color: isSelected ? '#ffffff' : 'var(--text-muted)'
                                    }}
                                >
                                    {counts[secKey]}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Modal Body */}
                <div className="modal-body" style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Active Section Identification Banner */}
                    <div
                        style={{
                            padding: '1rem 1.25rem',
                            borderRadius: '12px',
                            background: config.bgGradient,
                            border: `1px solid ${config.borderColor}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span
                                    style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                        padding: '0.15rem 0.55rem',
                                        borderRadius: '6px',
                                        background: 'var(--bg-card)',
                                        color: config.color,
                                        border: `1px solid ${config.borderColor}`
                                    }}
                                >
                                    Viewing Section
                                </span>
                                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {config.title} ({counts[currentSection]} total)
                                </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                {config.criteria}
                            </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                            {config.description}
                        </p>
                    </div>

                    {/* Section Key Metrics Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                        <div
                            style={{
                                padding: '0.85rem 1rem',
                                borderRadius: '10px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>
                                {currentSection === 'converted' ? 'Converted Total' : 'Section Count'}
                            </span>
                            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: config.color, marginTop: '0.2rem' }}>
                                {counts[currentSection]}
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {currentSection === 'converted' 
                                    ? `${conversionRate}% conversion rate` 
                                    : `${Math.round((counts[currentSection] / Math.max(1, counts.active + counts.converted)) * 100)}% of total leads`}
                            </span>
                        </div>

                        <div
                            style={{
                                padding: '0.85rem 1rem',
                                borderRadius: '10px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>
                                {currentSection === 'hot' ? 'Avg Score' : currentSection === 'due' ? 'Overdue SLA' : 'High Priority'}
                            </span>
                            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                                {currentSection === 'hot' 
                                    ? (matchingLeads.length > 0 ? `${Math.round(matchingLeads.reduce((acc, l) => acc + (l.leadScore ?? 0), 0) / matchingLeads.length)}%` : '70%+')
                                    : currentSection === 'due'
                                    ? matchingLeads.filter(l => isOverdue(l.nextFollowUpDate, l.leadStatusName)).length
                                    : matchingLeads.filter(l => l.priority === 'High' || l.priority === 'Urgent').length}
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {currentSection === 'hot' ? 'Readiness rating' : currentSection === 'due' ? 'Past scheduled date' : 'Urgent & High Tier'}
                            </span>
                        </div>

                        <div
                            style={{
                                padding: '0.85rem 1rem',
                                borderRadius: '10px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block' }}>
                                {currentSection === 'converted' ? 'Active Pipeline' : 'Assigned Reps'}
                            </span>
                            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                                {currentSection === 'converted' 
                                    ? counts.active 
                                    : matchingLeads.filter(l => !!l.assignedRepName).length}
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {currentSection === 'converted' ? 'Remaining in funnel' : 'Active team reps'}
                            </span>
                        </div>
                    </div>

                    {/* Matching Leads Preview List */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <IconComponent size={15} style={{ color: config.color }} />
                                Preview: Top {config.title} ({matchingLeads.length > 0 ? `Showing ${Math.min(5, matchingLeads.length)} of ${matchingLeads.length}` : '0'})
                            </h4>
                            {matchingLeads.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleActionClick}
                                    style={{
                                        border: 'none',
                                        background: 'none',
                                        color: config.color,
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px'
                                    }}
                                >
                                    View All {matchingLeads.length} <ChevronRight size={14} />
                                </button>
                            )}
                        </div>

                        {matchingLeads.length === 0 ? (
                            <div
                                style={{
                                    padding: '1.75rem',
                                    borderRadius: '10px',
                                    background: 'var(--bg-secondary)',
                                    border: '1px dashed var(--border-color)',
                                    textAlign: 'center'
                                }}
                            >
                                <IconComponent size={28} style={{ color: config.color, opacity: 0.5, marginBottom: '0.4rem' }} />
                                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    No {config.title} Found
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                    No records currently match the criteria for {config.title}.
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                {matchingLeads.slice(0, 5).map(lead => {
                                    const score = lead.leadScore ?? 0;
                                    const overdue = isOverdue(lead.nextFollowUpDate, lead.leadStatusName);
                                    const dueToday = isToday(lead.nextFollowUpDate);

                                    return (
                                        <div
                                            key={lead.leadId}
                                            onClick={() => handleLeadClick(lead.leadId)}
                                            style={{
                                                padding: '0.65rem 0.85rem',
                                                borderRadius: '10px',
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-color)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.borderColor = config.color;
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                                e.currentTarget.style.transform = 'none';
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '8px',
                                                        background: 'linear-gradient(135deg, var(--accent-primary), #6366f1)',
                                                        color: '#ffffff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    {`${lead.firstName[0] || ''}${lead.lastName[0] || ''}`.toUpperCase()}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {lead.firstName} {lead.lastName}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {lead.companyName || 'Individual'} {lead.assignedRepName ? `· Rep: ${lead.assignedRepName}` : ''}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                                <span
                                                    style={{
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        padding: '0.15rem 0.45rem',
                                                        borderRadius: '5px',
                                                        background: score >= 70 ? 'rgba(239, 68, 68, 0.12)' : score >= 40 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                                        color: score >= 70 ? '#ef4444' : score >= 40 ? '#d97706' : '#2563eb'
                                                    }}
                                                >
                                                    {score >= 70 ? '🔥 Hot' : score >= 40 ? '⚡ Warm' : '❄️ Cold'} ({score}%)
                                                </span>

                                                {overdue && (
                                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#dc2626' }}>
                                                        Overdue
                                                    </span>
                                                )}
                                                {dueToday && (
                                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}>
                                                        Today
                                                    </span>
                                                )}

                                                <Eye size={14} style={{ color: 'var(--text-muted)', marginLeft: 4 }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer with Actions */}
                <div
                    className="modal-footer"
                    style={{
                        padding: '1rem 1.5rem',
                        borderTop: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Section: <strong style={{ color: config.color }}>{config.title}</strong>
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            Close
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleActionClick}
                            style={{
                                background: config.color,
                                borderColor: config.color,
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                fontWeight: 700
                            }}
                        >
                            <Filter size={14} />
                            View & Filter {config.title} ({counts[currentSection]})
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
