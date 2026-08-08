import React, { useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { showToast } from '../../lib/toast';
import { Sparkles, CheckCircle2, AlertOctagon, ArrowRight, TrendingUp, ShieldAlert, RefreshCw } from 'lucide-react';

interface OpportunityAiPrediction {
    opportunityId: number;
    winProbability: number;
    riskLevel: string;
    projectedValue: number;
    analysisSummary: string;
    strengths: string[];
    warningFlags: string[];
    suggestedStrategy: string;
}

interface AiOpportunityAssistantProps {
    opportunityId: number;
}

export const AiOpportunityAssistant: React.FC<AiOpportunityAssistantProps> = ({ opportunityId }) => {
    const [prediction, setPrediction] = useState<OpportunityAiPrediction | null>(null);
    const [predicting, setPredicting] = useState<boolean>(false);

    const handlePredict = async () => {
        setPredicting(true);
        try {
            const res = await api.post<OpportunityAiPrediction>(`/api/ai/opportunities/${opportunityId}/predict-win`, {});
            setPrediction(res);
            showToast('AI Deal Win Prediction generated!', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to predict deal win probability', 'error');
        } finally {
            setPredicting(false);
        }
    };

    const fmtMoney = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

    const getRiskBadge = (level: string) => {
        switch (level?.toLowerCase()) {
            case 'high':
                return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'HIGH RISK ⚠️' };
            case 'medium':
                return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', label: 'MEDIUM RISK ⚡' };
            default:
                return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'LOW RISK ✅' };
        }
    };

    return (
        <Card className="glass-panel" style={{ borderRadius: '1rem', border: '1px solid rgba(16, 185, 129, 0.2)', background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.04) 0%, rgba(0,0,0,0) 100%)' }}>
            <Card.Content style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ padding: '0.4rem', borderRadius: '0.5rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                AI Deal Win Forecast <Sparkles size={16} color="#10b981" />
                            </h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pipeline Probability & Stalled Deal Analytics</span>
                        </div>
                    </div>

                    <Button
                        onClick={handlePredict}
                        disabled={predicting}
                        variant="secondary"
                        style={{ fontSize: '0.85rem', gap: '0.4rem' }}
                    >
                        <RefreshCw size={14} className={predicting ? 'animate-spin' : ''} />
                        {predicting ? 'Forecast…' : prediction ? 'Re-Forecast' : 'Predict Win Rate'}
                    </Button>
                </div>

                {!prediction ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px dashed var(--border-color)' }}>
                        <TrendingUp size={32} style={{ color: '#10b981', opacity: 0.8, margin: '0 auto 0.5rem auto' }} />
                        <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Predictive Revenue Intelligence</h4>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Evaluate deal velocity, line item quotes, and stage history to calculate weighted win probability.
                        </p>
                        <Button onClick={handlePredict} disabled={predicting} variant="primary" style={{ fontSize: '0.85rem' }}>
                            <Sparkles size={14} style={{ marginRight: 6 }} /> Run Deal Win Prediction
                        </Button>
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        {/* Prediction Metrics Box */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', marginBottom: '1.25rem' }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Win Probability</span>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '0.2rem' }}>
                                    {prediction.winProbability}%
                                </div>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Risk Assessment</span>
                                <div style={{ marginTop: '0.4rem' }}>
                                    <span style={{ padding: '0.3rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 800, ...getRiskBadge(prediction.riskLevel) }}>
                                        {getRiskBadge(prediction.riskLevel).label}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Weighted Revenue</span>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>
                                    {fmtMoney(prediction.projectedValue)}
                                </div>
                            </div>
                        </div>

                        {/* Factors Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div style={{ padding: '0.85rem', borderRadius: '0.65rem', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                                <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <CheckCircle2 size={14} /> Deal Strengths ({prediction.strengths.length})
                                </h5>
                                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                                    {prediction.strengths.map((s, i) => <li key={i} style={{ marginBottom: '0.2rem' }}>{s}</li>)}
                                </ul>
                            </div>

                            <div style={{ padding: '0.85rem', borderRadius: '0.65rem', background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                                <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <ShieldAlert size={14} /> Warnings & Objections ({prediction.warningFlags.length})
                                </h5>
                                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                                    {prediction.warningFlags.length === 0 ? (
                                        <li>No major warnings detected.</li>
                                    ) : (
                                        prediction.warningFlags.map((w, i) => <li key={i} style={{ marginBottom: '0.2rem' }}>{w}</li>)
                                    )}
                                </ul>
                            </div>
                        </div>

                        {/* Strategy Box */}
                        <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#10b981', display: 'block', marginBottom: '0.25rem' }}>
                                AI Closing Strategy
                            </span>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ArrowRight size={16} color="#10b981" /> {prediction.suggestedStrategy}
                            </div>
                        </div>
                    </div>
                )}
            </Card.Content>
        </Card>
    );
};
