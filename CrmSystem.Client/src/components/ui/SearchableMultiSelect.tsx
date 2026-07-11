import React, { useMemo, useState, useRef, useEffect } from 'react';
import './ui.css';

interface Option { id: number; name: string }
interface Props {
    options: Option[];
    selectedIds: string[]; // string ids for compatibility with existing screens
    onChange: (next: string[]) => void;
    placeholder?: string;
}

export const SearchableMultiSelect: React.FC<Props> = ({ options, selectedIds, onChange, placeholder }) => {
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState('');
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('click', onDoc);
        return () => document.removeEventListener('click', onDoc);
    }, []);

    const selectedSet = useMemo(() => new Set(selectedIds.map(s => Number(s))), [selectedIds]);

    const visible = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return q ? options.filter(o => o.name.toLowerCase().includes(q)) : options;
    }, [options, filter]);

    const toggle = (id: number) => {
        const next = new Set(selectedSet);
        if (next.has(id)) next.delete(id); else next.add(id);
        onChange([...next].map(n => String(n)));
    };

    const clearFilter = () => setFilter('');

    return (
        <div ref={wrapperRef} style={{ position: 'relative', minWidth: 220 }}>
            <div className="input-field" role="button" tabIndex={0} onClick={() => setOpen(s => !s)} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(s => !s); }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {options.filter(o => selectedSet.has(o.id)).map(o => (
                        <span key={o.id} className="tag-badge" style={{ margin: '2px 4px' }}>{o.name}</span>
                    ))}
                    <input
                        aria-label="Filter options"
                        placeholder={placeholder ?? 'Filter…'}
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        onFocus={() => setOpen(true)}
                        style={{ border: 'none', outline: 'none', flex: 1, minWidth: 60, background: 'transparent' }}
                    />
                </div>
            </div>

            {open && (
                <div style={{ position: 'absolute', zIndex: 1200, top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 6, maxHeight: 240, overflow: 'auto', boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }}>
                    <div style={{ padding: 8 }}>
                        <input className="input-field" placeholder="Search tags…" value={filter} onChange={e => setFilter(e.target.value)} />
                    </div>
                    <div>
                        {visible.length === 0 && <div style={{ padding: 12, color: 'var(--text-secondary)' }}>No results</div>}
                        {visible.map(o => (
                            <button key={o.id} type="button" onClick={() => { toggle(o.id); clearFilter(); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
                                <span>{o.name}</span>
                                <input type="checkbox" readOnly checked={selectedSet.has(o.id)} />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableMultiSelect;
