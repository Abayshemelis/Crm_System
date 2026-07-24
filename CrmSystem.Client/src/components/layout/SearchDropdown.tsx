import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Building2, Target, Loader2, ArrowRight, Clock } from 'lucide-react';
import { api } from '../../lib/api';
import './search.css';

interface SearchResult {
  type: 'customer' | 'company' | 'opportunity';
  id: number;
  title: string;
  subtitle: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; route: string }> = {
  customer:    { label: 'Customers',    icon: <User size={14}/>,      color: '#34d399', bg: 'rgba(52,211,153,0.12)',   route: '/customers' },
  company:     { label: 'Companies',    icon: <Building2 size={14}/>, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',   route: '/companies' },
  opportunity: { label: 'Opportunities', icon: <Target size={14}/>,  color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', route: '/opportunities' },
};

/** Bold-highlight the matching portion of a string */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(99,102,241,0.35)', color: 'inherit', borderRadius: 3, padding: '0 2px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export const SearchDropdown: React.FC = () => {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen,    setIsOpen]    = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef    = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate    = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults([]); setIsLoading(false); setIsOpen(false); return; }
    setIsLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await api.get<SearchResult[]>(`/api/search/global?query=${encodeURIComponent(query)}`);
        setResults(data ?? []);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const handleSelect = useCallback((result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    setActiveIdx(-1);
    const cfg = TYPE_CONFIG[result.type];
    if (cfg) navigate(`${cfg.route}/${result.id}`);
  }, [navigate]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); handleSelect(results[activeIdx]); }
    if (e.key === 'Escape')    { setIsOpen(false); setActiveIdx(-1); inputRef.current?.blur(); }
  };

  const grouped = results.reduce((acc, r, idx) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push({ ...r, _idx: idx });
    return acc;
  }, {} as Record<string, (SearchResult & { _idx: number })[]>);

  const showDropdown = isOpen && query.length >= 2;

  return (
    <div ref={dropdownRef} className="gs-root">
      {/* Input */}
      <div className="gs-input-wrap">
        <span className="gs-search-icon">
          {isLoading
            ? <Loader2 size={16} className="gs-spin" style={{ color: 'var(--accent-primary)' }}/>
            : <Search size={16}/>
          }
        </span>
        <input
          ref={inputRef}
          type="text"
          className="gs-input"
          placeholder="Search anything…"
          value={query}
          onChange={e => { setQuery(e.target.value); if (e.target.value.length >= 2) setIsOpen(true); }}
          onFocus={() => { if (query.length >= 2) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <kbd className="gs-kbd">⌘K</kbd>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="gs-dropdown">
          {/* Header */}
          <div className="gs-dropdown-header">
            <span className="gs-dropdown-hint">
              <Clock size={11}/> Results for <strong>"{query}"</strong>
            </span>
            <span className="gs-dropdown-count">{results.length} found</span>
          </div>

          {results.length === 0 && !isLoading ? (
            <div className="gs-empty">
              <Search size={28} style={{ opacity: 0.25, display: 'block', margin: '0 auto 0.5rem' }}/>
              <p>No results for "<strong>{query}</strong>"</p>
              <p style={{ fontSize: '0.78rem', opacity: 0.5 }}>Try a different keyword</p>
            </div>
          ) : (
            Object.entries(grouped).map(([type, items]) => {
              const cfg = TYPE_CONFIG[type];
              return (
                <div key={type}>
                  {/* Group heading */}
                  <div className="gs-group-label" style={{ color: cfg?.color }}>
                    <span className="gs-group-icon" style={{ background: cfg?.bg, color: cfg?.color }}>
                      {cfg?.icon}
                    </span>
                    {cfg?.label}
                  </div>

                  {/* Items */}
                  {items.map(item => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className={`gs-item${item._idx === activeIdx ? ' gs-item-active' : ''}`}
                      onMouseEnter={() => setActiveIdx(item._idx)}
                      onMouseLeave={() => setActiveIdx(-1)}
                      onClick={() => handleSelect(item)}
                    >
                      <div className="gs-item-content">
                        <span className="gs-item-title">
                          <HighlightMatch text={item.title} query={query}/>
                        </span>
                        {item.subtitle && (
                          <span className="gs-item-subtitle">
                            <HighlightMatch text={item.subtitle} query={query}/>
                          </span>
                        )}
                      </div>
                      <ArrowRight size={13} className="gs-item-arrow"/>
                    </div>
                  ))}
                </div>
              );
            })
          )}

          {/* Footer */}
          <div className="gs-footer">
            <span><kbd className="gs-kbd-sm">↑↓</kbd> navigate</span>
            <span><kbd className="gs-kbd-sm">↵</kbd> select</span>
            <span><kbd className="gs-kbd-sm">Esc</kbd> close</span>
          </div>
        </div>
      )}
    </div>
  );
};
