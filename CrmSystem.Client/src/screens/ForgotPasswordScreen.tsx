import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AuthLayout } from '../components/auth/AuthLayout';
import { showToast } from '../lib/toast';
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
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        throw new Error('Something went wrong');
      }
      const data = await response.json();
      setMessage(data.message || 'If that email exists, a reset link has been sent.');
      showToast('If that email exists, a reset link has been sent.', 'success');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset password" subtitle="Enter your email to receive a reset link">
      {message ? (
        <div className="login-form">
          <div style={{ padding: '1rem', background: 'rgba(34,197,94,0.1)', color: '#22c55e', borderRadius: '0.375rem', textAlign: 'center' }}>
            {message}
          </div>
          <Button onClick={() => navigate('/login')} fullWidth size="lg">
            Back to login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="login-form">
          <Input label="Email address" type="email" placeholder="admin@test.com" value={email} onChange={e => setEmail(e.target.value)} required />
          {error && <div className="error-message">{error}</div>}
          <Button type="submit" fullWidth size="lg" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send reset link'}
          </Button>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Link to="/login" className="forgot-password-link" style={{ alignSelf: 'center' }}>Back to login</Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};
