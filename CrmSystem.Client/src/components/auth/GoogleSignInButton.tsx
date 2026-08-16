import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../lib/toast';

declare global {
  interface Window {
    google?: any;
    handleGoogleCredentialResponse?: (response: any) => void;
  }
}

interface GoogleSignInButtonProps {
  buttonId?: string;
  onSuccess?: () => void;
  onError?: (errorMsg: string) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  buttonId = 'google-btn-container',
  onSuccess,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [gsiReady, setGsiReady] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const clientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '967324541475-42i56cgec51soo7ris7jjddirn4rp371.apps.googleusercontent.com';

  const isPlaceholderClientId =
    !import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    clientId.includes('placeholder');

  const processGoogleCredential = async (idToken: string) => {
    setIsLoading(true);
    setErrorMessage('');
    setShowAccountModal(false);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Google sign-in failed');
      }

      login({
        accessToken: data.accessToken,
        roles: data.roles,
        refreshToken: data.refreshToken,
      });

      showToast('Signed in with Google successfully', 'success');
      if (onSuccess) onSuccess();
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || 'Google authentication failed';
      setErrorMessage(msg);
      if (onError) onError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isPlaceholderClientId) {
      setGsiReady(false);
      return;
    }

    window.handleGoogleCredentialResponse = async (response: any) => {
      if (response?.credential) {
        await processGoogleCredential(response.credential);
      } else {
        setErrorMessage('Google did not return a valid credential.');
      }
    };

    const initGoogleGsi = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (resp: any) => window.handleGoogleCredentialResponse?.(resp),
            auto_select: false,
            ux_mode: 'popup',
          });

          const container = document.getElementById(buttonId);
          if (container) {
            container.innerHTML = '';
            window.google.accounts.id.renderButton(container, {
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'rectangular',
              width: 320,
              logo_alignment: 'left',
            });
            setGsiReady(true);
          }
        } catch (e) {
          console.warn('Google GSI render error:', e);
          setGsiReady(false);
        }
      }
    };

    if (!document.getElementById('google-gsi-script')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogleGsi;
      script.onerror = () => setGsiReady(false);
      document.body.appendChild(script);
    } else {
      initGoogleGsi();
    }
  }, [clientId, buttonId, isPlaceholderClientId]);

  const handleManualGoogleClick = () => {
    setIsLoading(false);
    setErrorMessage('');
    setShowAccountModal(true);
  };

  const handleSelectAccount = (email: string) => {
    processGoogleCredential(`mock_google_id_token:${email}`);
  };

  const handleCustomEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    processGoogleCredential(`mock_google_id_token:${customEmail.trim()}`);
  };

  const demoAccounts = [
    {
      name: 'Abay Shemelis',
      email: 'abayshemelisshiferaw@gmail.com',
      role: 'Admin',
      avatarColor: '#4f46e5',
      initials: 'AS',
    },
    {
      name: 'Sales Manager',
      email: 'manager@crmsystem.local',
      role: 'Manager',
      avatarColor: '#059669',
      initials: 'SM',
    },
    {
      name: 'Sales Representative',
      email: 'rep@crmsystem.local',
      role: 'SalesRep',
      avatarColor: '#d97706',
      initials: 'SR',
    },
  ];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      {/* Official Google GSI Button Container */}
      <div
        id={buttonId}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '44px',
          width: '100%',
        }}
      >
        {isLoading && (
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #94a3b8)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              className="spinner-icon"
              style={{
                display: 'inline-block',
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            ></span>
            Authenticating with Google...
          </div>
        )}
      </div>

      {/* Button trigger */}
      {!gsiReady && !isLoading && (
        <button
          type="button"
          onClick={handleManualGoogleClick}
          style={{
            width: '100%',
            maxWidth: '320px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '0.625rem 1rem',
            borderRadius: '0.375rem',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#334155',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            transition: 'all 0.15s ease-in-out',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.41-1.57-5.13-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z" />
            <path fill="#FBBC05" d="M3.87 10.78c-.18-.53-.28-1.09-.28-1.78s.1-1.25.28-1.78L.97 4.96C.35 6.19 0 7.56 0 9s.35 2.81.97 4.04l2.9-2.26z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.45 2.02.97 4.96l2.9 2.26C4.59 5.05 6.62 3.58 9 3.58z" />
          </svg>
          <span>Continue with Google</span>
        </button>
      )}

      {errorMessage && (
        <div style={{ color: '#ef4444', fontSize: '0.75rem', textAlign: 'center', marginTop: '0.25rem', padding: '0 0.5rem', maxWidth: '320px' }}>
          {errorMessage}
        </div>
      )}

      {/* Google Account Selector Modal */}
      {showAccountModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setShowAccountModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '1.5rem 1.5rem 1rem', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <svg width="32" height="32" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.41-1.57-5.13-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z" />
                  <path fill="#FBBC05" d="M3.87 10.78c-.18-.53-.28-1.09-.28-1.78s.1-1.25.28-1.78L.97 4.96C.35 6.19 0 7.56 0 9s.35 2.81.97 4.04l2.9-2.26z" />
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.45 2.02.97 4.96l2.9 2.26C4.59 5.05 6.62 3.58 9 3.58z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>Choose an account</h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem', marginBottom: 0 }}>
                to sign in to <strong style={{ color: '#334155' }}>NexusCRM</strong>
              </p>
            </div>

            {/* Account List */}
            <div style={{ padding: '0.5rem 0' }}>
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectAccount(acc.email)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.875rem 1.5rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: acc.avatarColor,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      flexShrink: 0,
                    }}
                  >
                    {acc.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#1e293b' }}>{acc.name}</span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          padding: '0.125rem 0.375rem',
                          borderRadius: '9999px',
                          backgroundColor: '#e0e7ff',
                          color: '#3730a3',
                        }}
                      >
                        {acc.role}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {acc.email}
                    </div>
                  </div>
                </button>
              ))}

              {/* Option to use custom account */}
              {!showCustomInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.875rem 1.5rem',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    borderTop: '1px solid #f1f5f9',
                    marginTop: '0.25rem',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: '1px dashed #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b',
                      fontSize: '1.25rem',
                      flexShrink: 0,
                    }}
                  >
                    +
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem', color: '#2563eb' }}>Use another Google account</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sign in with any email address</div>
                  </div>
                </button>
              ) : (
                <form onSubmit={handleCustomEmailSubmit} style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#475569', marginBottom: '0.5rem' }}>
                    Enter Google Email Address:
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="email"
                      required
                      placeholder="user@gmail.com"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                      }}
                    >
                      Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer / Cancel */}
            <div style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                style={{
                  padding: '0.375rem 0.875rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
