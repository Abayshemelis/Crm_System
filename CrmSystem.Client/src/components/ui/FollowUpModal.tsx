import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Calendar, Clock, User, Tag, FileText, X } from 'lucide-react';
import './ui.css';

interface UserOption {
    id: number;
    name: string;
}

interface FollowUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSchedule: (data: {
        followUpDate: string;
        followUpType: string;
        notes?: string;
        assignedToId?: number;
    }) => Promise<void>;
    users: UserOption[];
    currentAssignedRepId?: number;
    initialType?: string;
    initialNotes?: string;
    initialDate?: string;
}

const FOLLOW_UP_TYPES = [
    'Phone Call',
    'Email',
    'Meeting',
    'Visit',
    'Demo',
    'Proposal',
    'Other'
];

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
    isOpen,
    onClose,
    onSchedule,
    users = [],
    currentAssignedRepId,
    initialType = 'Phone Call',
    initialNotes = '',
    initialDate = ''
}) => {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('10:00');
    const [type, setType] = useState(initialType || 'Phone Call');
    const [notes, setNotes] = useState(initialNotes || '');
    const [assignedToId, setAssignedToId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const defaultDateStr = tomorrow.toISOString().split('T')[0];

            let dateVal = defaultDateStr;
            let timeVal = '10:00';

            if (initialDate) {
                const parsed = new Date(initialDate);
                if (!isNaN(parsed.getTime())) {
                    dateVal = parsed.toISOString().split('T')[0];
                    const hours = String(parsed.getHours()).padStart(2, '0');
                    const mins = String(parsed.getMinutes()).padStart(2, '0');
                    timeVal = `${hours}:${mins}`;
                }
            }

            setDate(dateVal);
            setTime(timeVal);
            setType(initialType || 'Phone Call');
            setNotes(initialNotes || '');
            setAssignedToId(currentAssignedRepId ? String(currentAssignedRepId) : '');
            setError(null);
        }
    }, [isOpen, initialDate, initialType, initialNotes, currentAssignedRepId]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!date) {
            setError('Please select a date.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const dateObj = new Date(`${date}T${time}:00`);
            const isoDateTime = !isNaN(dateObj.getTime()) ? dateObj.toISOString() : `${date}T${time}:00Z`;

            await onSchedule({
                followUpDate: isoDateTime,
                followUpType: type || 'Phone Call',
                notes: notes.trim() || undefined,
                assignedToId: assignedToId ? parseInt(assignedToId, 10) : undefined
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to schedule follow-up.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                {/* Modal Header */}
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={20} style={{ color: 'var(--accent-primary)' }} />
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Schedule Next Follow-Up</h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} style={{ padding: '0.25rem' }}>
                        <X size={18} />
                    </Button>
                </div>

                {/* Modal Form */}
                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {error && (
                            <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#dc2626', fontSize: '0.85rem' }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                                    Date *
                                </label>
                                <input
                                    type="date"
                                    className="filter-input"
                                    style={{ width: '100%' }}
                                    value={date || ''}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                                    Time *
                                </label>
                                <input
                                    type="time"
                                    className="filter-input"
                                    style={{ width: '100%' }}
                                    value={time || '10:00'}
                                    onChange={(e) => setTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                                Follow-Up Type *
                            </label>
                            <select
                                className="filter-select"
                                style={{ width: '100%' }}
                                value={type || 'Phone Call'}
                                onChange={(e) => setType(e.target.value)}
                            >
                                {FOLLOW_UP_TYPES.map((t) => (
                                    <option key={`type-${t}`} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {users && users.length > 0 && (
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                                    Assign To
                                </label>
                                <select
                                    className="filter-select"
                                    style={{ width: '100%' }}
                                    value={assignedToId ?? ''}
                                    onChange={(e) => setAssignedToId(e.target.value)}
                                >
                                    <option key="user-default" value="">Keep current assigned rep</option>
                                    {users.map((u, idx) => (
                                        <option key={`user-${u.id ?? idx}`} value={u.id}>
                                            {u.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                                Follow-Up Notes & Plan
                            </label>
                            <textarea
                                className="filter-input"
                                style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                                value={notes || ''}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Details about what to discuss or prepare for this follow-up..."
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="modal-footer">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Scheduling...' : 'Save Follow-Up'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
