import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { showToast } from '../../lib/toast';
import { Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Brain, Zap, RefreshCw, Mail } from 'lucide-react';
import { EmailComposerModal } from '../email/EmailComposerModal';

interface LeadAiAnalysis {
    leadId: number;
    aiScore: number;
    conversionGrade: string;
    summary: string;
    keyPositiveFactors: string[];
    riskFactors: string[];
    recommendedNextAction: string;
    isGeminiPowered?: boolean;
}

interface AiStatus {
    isConfigured: boolean;
    provider: string;
    model: string;
    freeDailyQuota: string;
    activeEngine: string;
}

interface AiLeadAssistantProps {
    leadId: number;
    leadEmail?: string;
    leadName?: string;
}

export const AiLeadAssistant: React.FC<AiLeadAssistantProps> = ({ leadId, leadEmail, leadName }) => {
    const [analysis, setAnalysis] = useState<LeadAiAnalysis | null>(null);
    const [analyzing, setAnalyzing] = useState<boolean>(false);
    const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
    
    // Email drafting states
    const [showComposer, setShowComposer] = useState<boolean>(false);
    const [draftSubject, setDraftSubject] = useState<string>('');
    const [draftBody, setDraftBody] = useState<string>('');
    const [generatingEmail, setGeneratingEmail] = useState<boolean>(false);

    useEffect(() => {
        api.get<AiStatus>('/api/ai/status')
            .then(res => setAiStatus(res))
            .catch(() => setAiStatus(null));
    }, []);

    const handleAnalyze = async () => {
        setAnalyzing(true);
        try {
            const res = await api.post<LeadAiAnalysis>(`/api/ai/leads/${leadId}/analyze`, {});
            setAnalysis(res);
            showToast('AI Lead Analysis updated!', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to generate AI analysis', 'error');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleGenerateEmail = async () => {
        setGeneratingEmail(true);
        try {
            const res = await api.post<{ draft: string }>(`/api/ai/leads/${leadId}/generate-email`, {});
            const rawDraft = res.draft || '';
            let subject = 'Following up';
            let body = rawDraft;

            const subjectMatch = rawDraft.match(/^Subject:\s*(.*)/i);
            if (subjectMatch) {
                subject = subjectMatch[1].trim();
                body = rawDraft.replace(/^Subject:\s*.*\n*/i, '').trim();
            }

            setDraftSubject(subject);
            setDraftBody(body);
            setShowComposer(true);
        } catch (err: any) {
            showToast(err.message || 'Failed to generate AI sales email', 'error');
        } finally {
            setGeneratingEmail(false);
        }
    };

    const getGradeStyle = (grade: string) => {
        switch (grade?.toLowerCase()) {
            case 'hot':
                return { bg: 'linear-gradient(135deg, #ef4444, #f59e0b)', color: '#ffffff', label: 'HOT LEAD 🔥' };
            case 'warm':
                return { bg: 'linear-gradient(135deg, #f59e0b, #eab308)', color: '#ffffff', label: 'WARM LEAD ⚡' };
            default:
                return { bg: 'linear-gradient(135deg, #3b82f6, #06b6d4)', color: '#ffffff', label: 'COLD LEAD ❄️' };
        }
    };

    return (
        <>
            <Card className="glass-panel" style={{ borderRadius: '1rem', border: '1px solid rgba(99, 102, 241, 0.2)', background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.04) 0%, rgba(0,0,0,0) 100%)' }}>
                <Card.Content style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{ padding: '0.4rem', borderRadius: '0.5rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)' }}>
                                <Brain size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    AI Predictive Lead Insights <Sparkles size={16} color="var(--accent-primary)" />
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    <span>{aiStatus?.activeEngine || 'Free AI Engine'}</span>
                                    {aiStatus?.isConfigured && (
                                        <span style={{ padding: '0.1rem 0.4rem', borderRadius: '0.25rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700 }}>
                                            Gemini Active
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                                onClick={handleGenerateEmail}
                                variant="secondary"
                                size="sm"
                                style={{ fontSize: '0.82rem', gap: '0.4rem', borderColor: 'rgba(99, 102, 241, 0.3)', color: 'var(--accent-primary)' }}
                            >
                                <Mail size={14} /> Draft AI Sales Email
                            </Button>
                            <Button
                                onClick={handleAnalyze}
                                disabled={analyzing}
                                variant="secondary"
                                size="sm"
                                style={{ fontSize: '0.82rem', gap: '0.4rem' }}
                            >
                                <RefreshCw size={14} className={analyzing ? 'animate-spin' : ''} />
                                {analyzing ? 'Analyzing…' : analysis ? 'Re-Analyze' : 'Analyze Lead'}
                            </Button>
                        </div>
                    </div>

                    {!analysis ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px dashed var(--border-color)' }}>
                            <Zap size={32} style={{ color: 'var(--accent-primary)', opacity: 0.8, margin: '0 auto 0.5rem auto' }} />
                            <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Unlock AI Intelligence</h4>
                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Analyze domain verification, activity history, and engagement touchpoints with Google Gemini Flash AI.
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                <Button onClick={handleAnalyze} disabled={analyzing} variant="primary" style={{ fontSize: '0.85rem' }}>
                                    <Sparkles size={14} style={{ marginRight: 6 }} /> Run Predictive AI Scoring
                                </Button>
                                <Button onClick={handleGenerateEmail} disabled={generatingEmail} variant="secondary" style={{ fontSize: '0.85rem' }}>
                                    {generatingEmail ? <RefreshCw size={14} className="animate-spin" style={{ marginRight: 6 }} /> : <Mail size={14} style={{ marginRight: 6 }} />} 
                                    {generatingEmail ? 'Drafting...' : 'Draft AI Email'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            {/* Score Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', marginBottom: '1.25rem' }}>
                                <div style={{ position: 'relative', width: 64, height: 64, borderRadius: '50%', background: 'conic-gradient(var(--accent-primary) ' + analysis.aiScore + '%, var(--border-color) 0%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                                        {analysis.aiScore}%
                                    </div>
                                </div>

                                <div>
                                    <span style={{
                                        padding: '0.25rem 0.65rem',
                                        borderRadius: '1rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        ...getGradeStyle(analysis.conversionGrade)
                                    }}>
                                        {getGradeStyle(analysis.conversionGrade).label}
                                    </span>
                                    <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                        {analysis.summary}
                                    </p>
                                </div>
                            </div>

                            {/* Factors Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                                {/* Positives */}
                                <div style={{ padding: '0.85rem', borderRadius: '0.65rem', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                                    <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <CheckCircle2 size={14} /> Positive Indicators ({analysis.keyPositiveFactors.length})
                                    </h5>
                                    <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                                        {analysis.keyPositiveFactors.length === 0 ? (
                                            <li>No major positive indicators yet.</li>
                                        ) : (
                                            analysis.keyPositiveFactors.map((f, i) => <li key={i} style={{ marginBottom: '0.2rem' }}>{f}</li>)
                                        )}
                                    </ul>
                                </div>

                                {/* Risks */}
                                <div style={{ padding: '0.85rem', borderRadius: '0.65rem', background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                                    <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <AlertTriangle size={14} /> Risk Flags ({analysis.riskFactors.length})
                                    </h5>
                                    <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                                        {analysis.riskFactors.length === 0 ? (
                                            <li>No critical risk factors detected.</li>
                                        ) : (
                                            analysis.riskFactors.map((r, i) => <li key={i} style={{ marginBottom: '0.2rem' }}>{r}</li>)
                                        )}
                                    </ul>
                                </div>
                            </div>

                            {/* Recommendation */}
                            <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-primary)', display: 'block', marginBottom: '0.25rem' }}>
                                    Recommended Action
                                </span>
                                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <ArrowRight size={16} color="var(--accent-primary)" /> {analysis.recommendedNextAction}
                                </div>
                            </div>
                        </div>
                    )}
                </Card.Content>
            </Card>

            {showComposer && (
                <EmailComposerModal
                    isOpen={showComposer}
                    onClose={() => setShowComposer(false)}
                    defaultRecipient={leadEmail || ''}
                    recipientName={leadName}
                    initialSubject={draftSubject}
                    initialBody={draftBody}
                    leadId={leadId}
                />
            )}
        </>
    );
};
