import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { showToast } from '../lib/toast';
import { buildUrl } from '../lib/api';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import './screens.css';

export const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your account email address.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(buildUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      if (!response.ok) {
        throw new Error('Failed to request password reset. Please try again.');
      }
      const data = await response.json();
      setMessage(data.message || 'If an account exists with that email, a password reset link has been sent.');
      showToast('Reset link sent! Check your inbox.', 'success');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your registered email to receive a recovery link"
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
              <span>Back to Sign In</span>
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
              <label htmlFor="reset-email" className="auth-field-label">
                Account Email Address
              </label>
              <div className="auth-input-container">
                <span className="auth-input-icon">
                  <Mail size={16} />
                </span>
                <input
                  id="reset-email"
                  type="email"
                  className="auth-input-field"
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="auth-btn-loading">
                  <span className="auth-btn-spinner" />
                  <span>Sending Recovery Link...</span>
                </span>
              ) : (
                <span className="auth-btn-content">
                  <span>Send Reset Link</span>
                  <Send size={15} className="auth-btn-icon" />
                </span>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
              <Link to="/login" className="auth-forgot-link">
                Remember your password? Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
};

export default ForgotPasswordScreen;
