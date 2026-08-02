import React, { useState, useEffect } from 'react';
import { Calendar, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onApply: (start: string, end: string) => void;
    showPresets?: boolean;
    label?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
    startDate,
    endDate,
    onApply,
    showPresets = true,
    label
}) => {
    const [localStart, setLocalStart] = useState(startDate);
    const [localEnd, setLocalEnd] = useState(endDate);
    const [activePreset, setActivePreset] = useState<string>('');

    useEffect(() => {
        setLocalStart(startDate);
        setLocalEnd(endDate);
    }, [startDate, endDate]);

    const isValid = !localStart || !localEnd || new Date(localStart) <= new Date(localEnd);

    const handleApply = (start = localStart, end = localEnd, presetName = '') => {
        if (!start && !end) {
            setActivePreset('all');
            onApply('', '');
            return;
        }
        const startValid = !start || !end || new Date(start) <= new Date(end);
        if (startValid) {
            setActivePreset(presetName);
            onApply(start, end);
        }
    };

    const applyPreset = (preset: 'today' | 'week' | 'month' | 'quarter' | 'last30' | 'all') => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        if (preset === 'all') {
            setLocalStart('');
            setLocalEnd('');
            handleApply('', '', 'all');
            return;
        }

        if (preset === 'today') {
            setLocalStart(todayStr);
            setLocalEnd(todayStr);
            handleApply(todayStr, todayStr, 'today');
            return;
        }

        if (preset === 'week') {
            const dayOfWeek = now.getDay();
            const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const monday = new Date(now);
            monday.setDate(now.getDate() - distanceToMonday);
            const mondayStr = monday.toISOString().split('T')[0];

            setLocalStart(mondayStr);
            setLocalEnd(todayStr);
            handleApply(mondayStr, todayStr, 'week');
            return;
        }

        if (preset === 'month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const firstDayStr = firstDay.toISOString().split('T')[0];

            setLocalStart(firstDayStr);
            setLocalEnd(todayStr);
            handleApply(firstDayStr, todayStr, 'month');
            return;
        }

        if (preset === 'quarter') {
            const currentQuarter = Math.floor(now.getMonth() / 3);
            const firstDayOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
            const firstDayStr = firstDayOfQuarter.toISOString().split('T')[0];

            setLocalStart(firstDayStr);
            setLocalEnd(todayStr);
            handleApply(firstDayStr, todayStr, 'quarter');
            return;
        }

        if (preset === 'last30') {
            const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const past30Str = past30.toISOString().split('T')[0];

            setLocalStart(past30Str);
            setLocalEnd(todayStr);
            handleApply(past30Str, todayStr, 'last30');
            return;
        }
    };

    const handleClear = () => {
        setLocalStart('');
        setLocalEnd('');
        setActivePreset('all');
        onApply('', '');
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {label && (
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={14} /> {label}
                </span>
            )}
            
            {showPresets && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className={`btn-preset ${activePreset === 'all' || (!startDate && !endDate) ? 'active' : ''}`}
                        onClick={() => applyPreset('all')}
                        style={{
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.78rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            background: activePreset === 'all' || (!startDate && !endDate) ? 'var(--primary-color)' : 'transparent',
                            color: activePreset === 'all' || (!startDate && !endDate) ? '#fff' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        className={`btn-preset ${activePreset === 'today' ? 'active' : ''}`}
                        onClick={() => applyPreset('today')}
                        style={{
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.78rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            background: activePreset === 'today' ? 'var(--primary-color)' : 'transparent',
                            color: activePreset === 'today' ? '#fff' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        Today
                    </button>
                    <button
                        type="button"
                        className={`btn-preset ${activePreset === 'month' ? 'active' : ''}`}
                        onClick={() => applyPreset('month')}
                        style={{
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.78rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            background: activePreset === 'month' ? 'var(--primary-color)' : 'transparent',
                            color: activePreset === 'month' ? '#fff' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        This Month
                    </button>
                    <button
                        type="button"
                        className={`btn-preset ${activePreset === 'last30' ? 'active' : ''}`}
                        onClick={() => applyPreset('last30')}
                        style={{
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.78rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            background: activePreset === 'last30' ? 'var(--primary-color)' : 'transparent',
                            color: activePreset === 'last30' ? '#fff' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        Last 30 Days
                    </button>
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <input
                    type="date"
                    className="form-input"
                    value={localStart}
                    onChange={(e) => {
                        const val = e.target.value;
                        setLocalStart(val);
                        setActivePreset('');
                        handleApply(val, localEnd, '');
                    }}
                    style={{ padding: '0.3rem 0.5rem', fontSize: '0.82rem', borderRadius: '6px' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>to</span>
                <input
                    type="date"
                    className="form-input"
                    value={localEnd}
                    onChange={(e) => {
                        const val = e.target.value;
                        setLocalEnd(val);
                        setActivePreset('');
                        handleApply(localStart, val, '');
                    }}
                    style={{ padding: '0.3rem 0.5rem', fontSize: '0.82rem', borderRadius: '6px' }}
                />
            </div>

            <Button
                variant="primary"
                onClick={() => handleApply(localStart, localEnd, '')}
                disabled={!isValid || (localStart === startDate && localEnd === endDate)}
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}
            >
                Apply
            </Button>


            {(startDate || endDate) && (
                <button
                    type="button"
                    onClick={handleClear}
                    title="Clear date filter"
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        fontSize: '0.8rem',
                        padding: '0.2rem 0.4rem'
                    }}
                >
                    <RotateCcw size={13} /> Clear
                </button>
            )}

            {!isValid && (
                <span style={{ color: 'var(--status-lost-text, #ef4444)', fontSize: '0.78rem' }}>
                    Invalid range
                </span>
            )}
        </div>
    );
};

