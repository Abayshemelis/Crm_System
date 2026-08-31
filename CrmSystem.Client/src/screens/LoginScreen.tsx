import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import { showToast } from '../lib/toast';
import { buildUrl } from '../lib/api';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import {
  Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, UserCheck
} from 'lucide-react';
import './screens.css';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();


  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('crm_remember_email');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter your registered email address (or username) and password.');
      return;
    }

    if (rememberMe) {
      localStorage.setItem('crm_remember_email', trimmedEmail);
    } else {
      localStorage.removeItem('crm_remember_email');
    }

    setIsLoading(true);
    try {
      const response = await fetch(buildUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const data = await response.json();

      if (response.status === 401) {
        throw new Error(data.message || 'Invalid email/username or password. Please check your credentials.');
      }
      if (response.status === 429) {
        throw new Error('Too many login attempts. Please wait a minute and try again.');
      }
      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed. Please try again.');
      }

      login({
        accessToken: data.accessToken,
        roles: data.roles,
        refreshToken: data.refreshToken
      });

      showToast('Welcome back! Signed in successfully.', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Something went wrong during sign-in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your CRM workspace &amp; commercial pipeline"
    >
      <div className="login-content-flow">
        {/* Error Alert Banner */}
        {error && (
          <div className="auth-error-banner animate-fade-in" role="alert">
            <AlertCircle size={17} className="auth-error-icon" />
            <div className="auth-error-text">{error}</div>
          </div>
        )}

        {/* ── Main Registered Email & Password Form ── */}
        <form onSubmit={handleLogin} className="auth-custom-form" noValidate>
          {/* Email Field */}
          <div className="auth-form-group">
            <label htmlFor="login-email" className="auth-field-label">
              Registered Email Address
            </label>
            <div className="auth-input-container">
              <span className="auth-input-icon">
                <UserCheck size={16} />
              </span>
              <input
                id="login-email"
                type="email"
                className="auth-input-field"
                placeholder="name@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="auth-form-group">
            <div className="auth-label-row">
              <label htmlFor="login-password" className="auth-field-label">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="auth-forgot-link"
                tabIndex={0}
              >
                Forgot password?
              </Link>
            </div>
            <div className="auth-input-container">
              <span className="auth-input-icon">
                <Lock size={16} />
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input-field auth-password-input"
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-eye-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember Me Options */}
          <div className="auth-options-row">
            <label className="auth-checkbox-label">
              <input
                type="checkbox"
                className="auth-custom-checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />
              <span className="auth-checkbox-text">Keep me signed in</span>
            </label>
          </div>

          {/* Primary Submit Action Button */}
          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="auth-btn-loading">
                <span className="auth-btn-spinner" />
                <span>Authenticating...</span>
              </span>
            ) : (
              <span className="auth-btn-content">
                <span>Sign in with Email</span>
                <LogIn size={16} className="auth-btn-icon" />
              </span>
            )}
          </button>
        </form>

        {/* ── Modern "or" Divider ── */}
        <div className="auth-divider-modern">
          <span className="auth-divider-line" />
          <span className="auth-divider-badge">or continue with</span>
          <span className="auth-divider-line" />
        </div>

        {/* ── Google 1-Tap / OAuth Button ── */}
        <div className="auth-google-wrapper">
          <GoogleSignInButton
            buttonId="google-btn-container"
            onError={(msg) => setError(msg)}
          />
        </div>

        {/* Registration / Account Help Link */}
        <div className="auth-register-note" style={{ marginTop: '1rem' }}>
          <span>Need an account?</span>{' '}
          <Link to="/" className="auth-register-link">
            Explore CRM Platform
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LoginScreen;
