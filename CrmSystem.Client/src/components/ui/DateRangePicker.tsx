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
        <div className="date-range-picker-container">
            <span className="date-range-label">
                <Calendar size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                <span>{label || 'Filter by Date:'}</span>
            </span>
            
            {showPresets && (
                <select
                    className="rpt-filter-select"
                    style={{ border: 'none', background: 'transparent', fontWeight: 600, color: 'var(--text-primary)', outline: 'none' }}
                    value={activePreset === '' ? (startDate || endDate ? '' : 'all') : activePreset}
                    onChange={(e) => applyPreset(e.target.value as any)}
                >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                    <option value="last30">Last 30 Days</option>
                    {activePreset === '' && (startDate || endDate) && <option value="">Custom Range</option>}
                </select>
            )}

            <div className="date-range-inputs-group">
                <input
                    type="date"
                    className="date-range-input"
                    value={localStart}
                    aria-label="Start date"
                    onChange={(e) => {
                        const val = e.target.value;
                        setLocalStart(val);
                        setActivePreset('');
                        handleApply(val, localEnd, '');
                    }}
                />
                <span className="date-range-to-text">to</span>
                <input
                    type="date"
                    className="date-range-input"
                    value={localEnd}
                    aria-label="End date"
                    onChange={(e) => {
                        const val = e.target.value;
                        setLocalEnd(val);
                        setActivePreset('');
                        handleApply(localStart, val, '');
                    }}
                />
            </div>

            <button
                type="button"
                className="date-range-apply-btn"
                onClick={() => handleApply(localStart, localEnd, '')}
                disabled={!isValid || (localStart === startDate && localEnd === endDate)}
                title="Apply date range filter"
            >
                Apply
            </button>

            {(startDate || endDate) && (
                <button
                    type="button"
                    className="date-range-clear-btn"
                    onClick={handleClear}
                    title="Clear date filter"
                >
                    <RotateCcw size={12} />
                    <span>Clear</span>
                </button>
            )}

            {!isValid && (
                <span style={{ color: 'var(--status-lost-text, #ef4444)', fontSize: '0.78rem', fontWeight: 600 }}>
                    Invalid range
                </span>
            )}
        </div>
    );
};

