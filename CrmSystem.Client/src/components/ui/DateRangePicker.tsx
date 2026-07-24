import React, { useState, useEffect } from 'react';
import { Button } from './Button';

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onApply: (start: string, end: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onApply }) => {
    const [localStart, setLocalStart] = useState(startDate);
    const [localEnd, setLocalEnd] = useState(endDate);

    useEffect(() => {
        setLocalStart(startDate);
        setLocalEnd(endDate);
    }, [startDate, endDate]);

    const isValid = !localStart || !localEnd || new Date(localStart) <= new Date(localEnd);

    const handleApply = () => {
        if (isValid) {
            onApply(localStart, localEnd);
        }
    };

    const handleReset = () => {
        const defaultEnd = new Date().toISOString().split('T')[0];
        const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setLocalStart(defaultStart);
        setLocalEnd(defaultEnd);
        onApply(defaultStart, defaultEnd);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>From:</label>
                <input
                    type="date"
                    className="form-input"
                    value={localStart}
                    onChange={(e) => setLocalStart(e.target.value)}
                    style={{ padding: '0.4rem', fontSize: '0.9rem' }}
                />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>To:</label>
                <input
                    type="date"
                    className="form-input"
                    value={localEnd}
                    onChange={(e) => setLocalEnd(e.target.value)}
                    style={{ padding: '0.4rem', fontSize: '0.9rem' }}
                />
            </div>
            <Button
                variant="primary"
                onClick={handleApply}
                disabled={!isValid || (localStart === startDate && localEnd === endDate)}
                style={{ padding: '0.4rem 1rem' }}
            >
                Apply
            </Button>
            <Button
                variant="secondary"
                onClick={handleReset}
                style={{ padding: '0.4rem 1rem' }}
            >
                Reset
            </Button>
            {!isValid && (
                <span style={{ color: 'var(--status-lost-text)', fontSize: '0.8rem' }}>
                    Start date must be before end date.
                </span>
            )}
        </div>
    );
};
