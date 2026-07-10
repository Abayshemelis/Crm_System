import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AuthLayout } from '../components/auth/AuthLayout';
import { showToast } from '../lib/toast';
import './screens.css';

export const ResetPasswordScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Invalid or missing token.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || 'Something went wrong');
      }
      const data = await response.json();
      setMessage(data.message);
      showToast('Password reset successfully', 'success');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Create new password" subtitle="Please enter your new password">
      {message ? (
        <div className="login-form">
          <div style={{ padding: '1rem', background: 'rgba(34,197,94,0.1)', color: '#22c55e', borderRadius: '0.375rem', textAlign: 'center' }}>
            {message}
          </div>
          <Button onClick={() => navigate('/login')} fullWidth size="lg">
            Go to login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="login-form">
          <Input
            label="New Password"
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
          {error && <div className="error-message">{error}</div>}
          <Button type="submit" fullWidth size="lg" disabled={isLoading || newPassword.length < 8 || newPassword !== confirmPassword}>
            {isLoading ? 'Resetting...' : 'Reset password'}
          </Button>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Link to="/login" className="forgot-password-link" style={{ alignSelf: 'center' }}>Back to login</Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};
