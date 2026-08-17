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

  const navigate = useNavigate();
  const { login } = useAuth();

  const clientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '967324541475-42i56cgec51soo7ris7jjddirn4rp371.apps.googleusercontent.com';

  const processGoogleCredential = async (idToken: string) => {
    setIsLoading(true);
    setErrorMessage('');
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
  }, [clientId, buttonId]);

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
      {errorMessage && (
        <div style={{ color: '#ef4444', fontSize: '0.75rem', textAlign: 'center', marginTop: '0.25rem', padding: '0 0.5rem', maxWidth: '320px' }}>
          {errorMessage}
        </div>
      )}
    </div>
  );
};
