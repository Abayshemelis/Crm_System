import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary, #0f172a)',
          padding: '2rem',
        }}>
          <div style={{
            maxWidth: 480,
            width: '100%',
            background: 'var(--bg-secondary, #1e293b)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '1rem',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              marginBottom: '1.5rem',
            }}>
              <AlertTriangle size={30} color="#ef4444" />
            </div>

            <h2 style={{
              fontSize: '1.375rem',
              fontWeight: 700,
              color: 'var(--text-primary, #f1f5f9)',
              margin: '0 0 0.75rem',
            }}>
              Something went wrong
            </h2>

            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary, #94a3b8)',
              lineHeight: 1.6,
              margin: '0 0 0.5rem',
            }}>
              An unexpected error occurred. This has been logged.
            </p>

            {this.state.error && (
              <p style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted, #64748b)',
                fontFamily: 'monospace',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                margin: '1rem 0 1.5rem',
                textAlign: 'left',
                wordBreak: 'break-word',
              }}>
                {this.state.error.message}
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.6rem 1.25rem', borderRadius: '0.5rem',
                  background: 'var(--accent-primary, #3b82f6)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                }}
              >
                <RefreshCw size={15} /> Try Again
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.6rem 1.25rem', borderRadius: '0.5rem',
                  background: 'var(--bg-tertiary, #334155)', color: 'var(--text-primary, #f1f5f9)',
                  border: '1px solid var(--border-color, rgba(148,163,184,0.2))',
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
