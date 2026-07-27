import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../lib/toast';
import { GoogleSignInButton } from './GoogleSignInButton';

interface AuthLoginFormProps {
  onSuccess?: () => void;
}

export const AuthLoginForm: React.FC<AuthLoginFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter both email address and password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const data = await response.json();

      if (response.status === 401) {
        throw new Error(data.message || 'Incorrect email or password.');
      }

      if (response.status === 429) {
        throw new Error('Too many login attempts. Please try again in a minute.');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong during sign in.');
      }

      login({ accessToken: data.accessToken, roles: data.roles, refreshToken: data.refreshToken });
      showToast('Signed in successfully', 'success');
      if (onSuccess) onSuccess();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-login-form-wrapper">
      {/* ── Google Sign-In ── */}
      <GoogleSignInButton
        buttonId="google-btn-modal-container"
        onSuccess={onSuccess}
        onError={(msg) => setError(msg)}
      />

      {/* ── Visual OR Divider ── */}
      <div className="auth-divider">
        <span className="auth-divider-line"></span>
        <span className="auth-divider-text">OR EMAIL LOGIN</span>
        <span className="auth-divider-line"></span>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="auth-error-banner animate-shake">
          <span>{error}</span>
        </div>
      )}

      {/* ── Email & Password Form ── */}
      <form onSubmit={handleEmailLogin} className="login-form">
        <div className="form-group">
          <label className="form-label" htmlFor="email-input">Email Address</label>
          <input
            id="email-input"
            type="email"
            className="input-field"
            placeholder="admin@test.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password-input">Password</label>
          <input
            id="password-input"
            type="password"
            className="input-field"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          className="btn-primary auth-submit-btn"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="btn-spinner-wrapper">
              <span className="spinner-icon"></span>
              Signing in...
            </span>
          ) : (
            'Sign in with Email'
          )}
        </button>

        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <Link to="/forgot-password" className="forgot-password-link">
            Forgot password?
          </Link>
        </div>
      </form>
    </div>
  );
};
