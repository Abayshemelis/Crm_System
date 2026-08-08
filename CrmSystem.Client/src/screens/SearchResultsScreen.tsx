import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { api } from '../lib/api';
import { Search, User, Building2, Target, ArrowRight } from 'lucide-react';
import './screens.css';

interface SearchResult {
  type: 'customer' | 'company' | 'opportunity';
  id: number;
  title: string;
  subtitle: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; route: string }> = {
  customer:    { label: 'Customers',      icon: <User size={16}/>,      color: '#34d399', bg: 'rgba(52,211,153,0.12)',   route: '/customers' },
  company:     { label: 'Companies',      icon: <Building2 size={16}/>, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',   route: '/companies' },
  opportunity: { label: 'Opportunities',  icon: <Target size={16}/>,    color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', route: '/opportunities' },
};

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(99,102,241,0.3)', color: 'inherit', borderRadius: 3, padding: '0 2px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export const SearchResultsScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') ?? '';

  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    setIsLoading(true);
    api.get<SearchResult[]>(`/api/search/global?query=${encodeURIComponent(query)}`)
      .then(data => setResults(data ?? []))
      .catch(() => setResults([]))
      .finally(() => setIsLoading(false));
  }, [query]);

  const grouped = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const handleSelect = (result: SearchResult) => {
    const cfg = TYPE_CONFIG[result.type];
    if (cfg) navigate(`${cfg.route}/${result.id}`);
  };

  return (
    <Layout>
      <div className="dashboard-header animate-fade-in">
        <div className="dashboard-title">
          <h1>Search Results</h1>
          <p>
            {query.length >= 2
              ? isLoading
                ? 'Searching…'
                : `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`
              : 'Enter at least 2 characters to search'}
          </p>
        </div>
      </div>

      {/* Skeleton */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rect" height={64} style={{ borderRadius: '10px', animationDelay: `${i * 0.06}s` }} />
          ))}
        </div>
      )}

      {/* No results */}
      {!isLoading && query.length >= 2 && results.length === 0 && (
        <EmptyState
          icon={Search}
          title={`No results for "${query}"`}
          description="Try a different keyword or check your spelling."
        />
      )}

      {/* Results grouped by type */}
      {!isLoading && Object.entries(grouped).map(([type, items]) => {
        const cfg = TYPE_CONFIG[type];
        return (
          <div key={type} style={{ marginBottom: '2rem' }}>
            {/* Group header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem',
              padding: '0 0.25rem',
            }}>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: '8px',
                background: cfg?.bg,
                color: cfg?.color,
              }}>
                {cfg?.icon}
              </span>
              <span style={{ fontWeight: 700, color: cfg?.color, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {cfg?.label}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 4 }}>
                {items.length} found
              </span>
            </div>

            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {items.map(item => (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = cfg?.color ?? 'var(--border-color)';
                    (e.currentTarget as HTMLElement).style.background = cfg?.bg ?? 'var(--bg-secondary)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      <HighlightMatch text={item.title} query={query} />
                    </div>
                    {item.subtitle && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        <HighlightMatch text={item.subtitle} query={query} />
                      </div>
                    )}
                  </div>
                  <ArrowRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </Layout>
  );
};
