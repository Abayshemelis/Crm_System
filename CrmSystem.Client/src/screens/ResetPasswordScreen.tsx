import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { showToast } from '../lib/toast';
import { buildUrl } from '../lib/api';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import './screens.css';

export const ResetPasswordScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Invalid or expired password reset token.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify and try again.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(buildUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ token, newPassword }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || 'Password reset failed. The link may have expired.');
      }
      const data = await response.json();
      setMessage(data.message || 'Your password has been reset successfully!');
      showToast('Password updated! You can now sign in.', 'success');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create New Password"
      subtitle="Set a secure password to access your CRM account"
    >
      <div className="login-content-flow">
        {message ? (
          <div className="auth-custom-form" style={{ gap: '1.25rem' }}>
            <div style={{
              padding: '1rem',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem'
            }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 2, color: '#10b981' }} />
              <div style={{ fontSize: '0.85rem', lineHeight: 1.45 }}>{message}</div>
            </div>
            <button
              type="button"
              className="auth-submit-btn"
              onClick={() => navigate('/login')}
            >
              <ArrowLeft size={16} />
              <span>Proceed to Sign In</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-custom-form" noValidate>
            {error && (
              <div className="auth-error-banner animate-fade-in" role="alert">
                <AlertCircle size={17} className="auth-error-icon" />
                <div className="auth-error-text">{error}</div>
              </div>
            )}

            <div className="auth-form-group">
              <label htmlFor="reset-new-password" className="auth-field-label">
                New Password (min 8 chars)
              </label>
              <div className="auth-input-container">
                <span className="auth-input-icon">
                  <Lock size={16} />
                </span>
                <input
                  id="reset-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  className="auth-input-field auth-password-input"
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-eye-toggle-btn"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-form-group">
              <label htmlFor="reset-confirm-password" className="auth-field-label">
                Confirm New Password
              </label>
              <div className="auth-input-container">
                <span className="auth-input-icon">
                  <Lock size={16} />
                </span>
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="auth-input-field auth-password-input"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-eye-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading || !newPassword || newPassword !== confirmPassword}
            >
              {isLoading ? (
                <span className="auth-btn-loading">
                  <span className="auth-btn-spinner" />
                  <span>Updating Password...</span>
                </span>
              ) : (
                <span className="auth-btn-content">
                  <span>Reset &amp; Save Password</span>
                  <KeyRound size={15} className="auth-btn-icon" />
                </span>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
              <Link to="/login" className="auth-forgot-link">
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
};

export default ResetPasswordScreen;
