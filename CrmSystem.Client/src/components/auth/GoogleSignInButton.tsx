import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../lib/toast';

// ── 1. GLOBAL TYPE DECLARATION ────────────────────────────────────────────────
// The Google Identity Services (GSI) JavaScript library injects a global `google` 
// object into `window`. We tell TypeScript about it so it won't throw compile errors.
declare global {
  interface Window {
    google?: any;
    handleGoogleCredentialResponse?: (response: any) => void;
  }
}

// ── 2. COMPONENT PROPS INTERFACE ──────────────────────────────────────────────
interface GoogleSignInButtonProps {
  buttonId?: string;           // HTML ID where the Google iframe button is rendered
  onSuccess?: () => void;      // Optional callback after successful login
  onError?: (errorMsg: string) => void; // Optional callback if authentication fails
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  buttonId = 'google-btn-container',
  onSuccess,
  onError,
}) => {
  // ── 3. LOCAL STATE ──────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);     // Shows spinner while backend verifies token
  const [errorMessage, setErrorMessage] = useState(''); // Holds error text to display under the button
  const [gsiReady, setGsiReady] = useState(false);       // Tracks if Google library script has loaded

  const navigate = useNavigate();
  const { login } = useAuth(); // AuthContext helper to store JWT tokens in localStorage & React state

  // Google OAuth Client ID (from environment variables, with fallback)
  const clientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '967324541475-42i56cgec51soo7ris7jjddirn4rp371.apps.googleusercontent.com';

  // ── 4. BACKEND VERIFICATION HANDLER ─────────────────────────────────────────
  // Once the user picks a Google account in the popup, Google returns a signed JWT `idToken`.
  // We send this `idToken` to our C# ASP.NET Core backend endpoint `POST /api/auth/google`.
  const processGoogleCredential = async (idToken: string) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      // Step A: Send Google's JWT token to our backend for cryptographic signature verification
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Google sign-in failed');
      }

      // Step B: Backend verified the user and returned our CRM's JWT accessToken + roles
      login({
        accessToken: data.accessToken,
        roles: data.roles,
        refreshToken: data.refreshToken,
      });

      // Step C: Show success message and redirect user into the dashboard
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

  // ── 5. GOOGLE SCRIPT & BUTTON INITIALIZATION ────────────────────────────────
  useEffect(() => {
    // Register the callback function that Google's popup will call when the user logs in
    window.handleGoogleCredentialResponse = async (response: any) => {
      if (response?.credential) {
        // response.credential is the raw Google ID Token string (JWT)
        await processGoogleCredential(response.credential);
      } else {
        setErrorMessage('Google did not return a valid credential.');
      }
    };

    // Initializes Google Identity Services and renders the official branded button
    const initGoogleGsi = () => {
      if (window.google?.accounts?.id) {
        try {
          // Initialize Google client with our Client ID & callback
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (resp: any) => window.handleGoogleCredentialResponse?.(resp),
            auto_select: false,
            ux_mode: 'popup',
          });

          // Render the official Google Sign-In button into our container <div>
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

    // Dynamically inject the Google GSI SDK script tag (<script src="https://accounts.google.com/gsi/client">)
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
      // If script is already in the document, initialize the button directly
      initGoogleGsi();
    }
  }, [clientId, buttonId]);

  // ── 6. UI RENDER ────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      {/* Container where the Google SDK renders the iframe button */}
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
        {/* Loading spinner shown while the backend verifies the token */}
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

      {/* Error message display if Google login or backend verification fails */}
      {errorMessage && (
        <div style={{ color: '#ef4444', fontSize: '0.75rem', textAlign: 'center', marginTop: '0.25rem', padding: '0 0.5rem', maxWidth: '320px' }}>
          {errorMessage}
        </div>
      )}
    </div>
  );
};

