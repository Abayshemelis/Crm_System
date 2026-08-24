import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { api } from '../lib/api';
import { searchSidebarPages } from '../components/layout/searchPages';
import { 
  Search, User, Building2, Target, ArrowRight, 
  Package, CreditCard, FileText, CheckSquare, TrendingUp, Compass 
} from 'lucide-react';
import './screens.css';

interface SearchResult {
  type: 'page' | 'customer' | 'company' | 'lead' | 'opportunity' | 'task' | 'product' | 'invoice' | 'contract';
  id: number;
  title: string;
  subtitle: string;
  route?: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; route: string; hasDetailRoute?: boolean }> = {
  page:        { label: 'Navigation & Sidebar',  icon: <Compass size={16}/>,     color: '#06b6d4', bg: 'rgba(6,182,212,0.15)',   route: '',               hasDetailRoute: false },
  customer:    { label: 'Customers',             icon: <User size={16}/>,        color: '#10b981', bg: 'rgba(16,185,129,0.15)',  route: '/customers',     hasDetailRoute: true },
  company:     { label: 'Companies',             icon: <Building2 size={16}/>,   color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',   route: '/companies',     hasDetailRoute: true },
  lead:        { label: 'Leads',                 icon: <Target size={16}/>,      color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  route: '/leads',         hasDetailRoute: false },
  opportunity: { label: 'Opportunities',         icon: <TrendingUp size={16}/>,  color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)',  route: '/opportunities', hasDetailRoute: true },
  task:        { label: 'Tasks',                 icon: <CheckSquare size={16}/>, color: '#ec4899', bg: 'rgba(236,72,153,0.15)',  route: '/tasks',         hasDetailRoute: false },
  product:     { label: 'Products',              icon: <Package size={16}/>,     color: '#06b6d4', bg: 'rgba(6,182,212,0.15)',   route: '/products',      hasDetailRoute: false },
  invoice:     { label: 'Invoices',              icon: <CreditCard size={16}/>,  color: '#10b981', bg: 'rgba(16,185,129,0.15)',  route: '/invoices',      hasDetailRoute: false },
  contract:    { label: 'Contracts',             icon: <FileText size={16}/>,    color: '#6366f1', bg: 'rgba(99,102,241,0.15)',  route: '/contracts',     hasDetailRoute: false },
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
    
    const matchedPages = searchSidebarPages(query);
    setResults(matchedPages);
    setIsLoading(true);

    api.get<SearchResult[]>(`/api/search/global?query=${encodeURIComponent(query)}`)
      .then(data => {
        const combined = [...matchedPages, ...(data ?? [])];
        setResults(combined);
      })
      .catch(() => setResults(matchedPages))
      .finally(() => setIsLoading(false));
  }, [query]);

  const grouped = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'page' && result.route) {
      navigate(result.route);
      return;
    }

    const cfg = TYPE_CONFIG[result.type];
    if (cfg) {
      if (cfg.hasDetailRoute) {
        navigate(`${cfg.route}/${result.id}`);
      } else {
        navigate(cfg.route);
      }
    }
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
