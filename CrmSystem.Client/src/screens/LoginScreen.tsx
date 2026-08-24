import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/auth/AuthLayout';
import { showToast } from '../lib/toast';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { ArrowLeft } from 'lucide-react';
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
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const data = await response.json();

      if (response.status === 401) {
        throw new Error(data.message || 'Incorrect email or password');
      }
      if (response.status === 429) {
        throw new Error('Too many attempts, please try again in a minute');
      }
      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Google Sign In Button */}
        <GoogleSignInButton
          buttonId="google-btn-container"
          onError={(msg) => setError(msg)}
        />

        <div className="auth-divider">
          <span className="auth-divider-line"></span>
          <span className="auth-divider-text">OR EMAIL LOGIN</span>
          <span className="auth-divider-line"></span>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <Input
            label="Email address"
            type="email"
            placeholder="admin@test.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
          {error && <div className="error-message">{error}</div>}
          <Button type="submit" fullWidth size="lg" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <Link to="/forgot-password" className="forgot-password-link">Forgot password?</Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
};

export default LoginScreen;
