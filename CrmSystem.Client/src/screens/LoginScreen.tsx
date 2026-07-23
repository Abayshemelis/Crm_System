import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import { showToast } from '../lib/toast';
import './screens.css';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (response.status === 401) {
        throw new Error('Incorrect email or password');
      }
      if (response.status === 429) {
        throw new Error('Too many attempts, please try again in a minute');
      }
      if (!response.ok) {
        throw new Error('Something went wrong');
      }
      const data = await response.json();
      // Prefer server-provided roles array and refreshToken when available
      login({ accessToken: data.accessToken, roles: data.roles, refreshToken: data.refreshToken });
      showToast('Signed in successfully', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your CRM account">
      <form onSubmit={handleLogin} className="login-form">
        <Input label="Email address" type="email" placeholder="admin@test.com" value={email} onChange={e => setEmail(e.target.value)} required />
        <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <div className="error-message">{error}</div>}
        <Button type="submit" fullWidth size="lg" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
        <div style={{ textAlign: 'center' }}>
          <Link to="/forgot-password" className="forgot-password-link">Forgot password?</Link>
        </div>
      </form>
    </AuthLayout>
  );
};
