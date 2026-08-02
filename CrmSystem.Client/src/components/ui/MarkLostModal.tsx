import React, { useState } from 'react';
import { Button } from './Button';
import { AlertTriangle, FileText, X } from 'lucide-react';
import './ui.css';

interface MarkLostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (lostReason: string) => Promise<void>;
    leadName: string;
}

export const MarkLostModal: React.FC<MarkLostModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    leadName
}) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            setError('Lost reason is required.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await onConfirm(reason.trim());
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to mark lead as lost.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
                {/* Header */}
                <div className="modal-header" style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}>
                        <AlertTriangle size={20} />
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#b91c1c' }}>Mark Lead as Lost</h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} style={{ padding: '0.25rem' }}>
                        <X size={18} />
                    </Button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {error && (
                            <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#dc2626', fontSize: '0.85rem' }}>
                                {error}
                            </div>
                        )}

                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            Are you sure you want to mark <strong>{leadName}</strong> as lost? Please provide a reason to help track sales analytics.
                        </p>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                                Reason for Loss *
                            </label>
                            <textarea
                                className="filter-input"
                                style={{ width: '100%', minHeight: '85px', resize: 'vertical' }}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g. Budget constraints, chose competitor, unreachable..."
                                required
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="modal-footer">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="danger" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Mark as Lost'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
