import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ManagerOnlyRoute } from './components/auth/ManagerOnlyRoute';
import { LoginScreen } from './screens/LoginScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from './screens/ResetPasswordScreen';
import { CustomersScreen } from './screens/CustomersScreen';
import { CustomerDetailScreen } from './screens/CustomerDetailScreen';
import { CustomerFormScreen } from './screens/CustomerFormScreen';
import { CompaniesScreen } from './screens/CompaniesScreen';
import { CompanyDetailScreen } from './screens/CompanyDetailScreen';
import { CompanyFormScreen } from './screens/CompanyFormScreen';
import { LeadsScreen } from './screens/LeadsScreen';
import { LeadFormScreen } from './screens/LeadFormScreen';
import { LeadDetailScreen } from './screens/LeadDetailScreen';
import { UsersScreen } from './screens/UsersScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { PipelineScreen } from './screens/PipelineScreen';
import { Toast } from './components/ui/Toast';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/reset-password" element={<ResetPasswordScreen />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardScreen /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><CustomersScreen /></ProtectedRoute>} />
        <Route path="/customers/new" element={<ProtectedRoute><CustomerFormScreen /></ProtectedRoute>} />
        <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetailScreen /></ProtectedRoute>} />
        <Route path="/customers/:id/edit" element={<ProtectedRoute><CustomerFormScreen /></ProtectedRoute>} />
        <Route path="/companies" element={<ProtectedRoute><CompaniesScreen /></ProtectedRoute>} />
        <Route path="/companies/new" element={<ProtectedRoute><CompanyFormScreen /></ProtectedRoute>} />
        <Route path="/companies/:id" element={<ProtectedRoute><CompanyDetailScreen /></ProtectedRoute>} />
        <Route path="/companies/:id/edit" element={<ProtectedRoute><CompanyFormScreen /></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><LeadsScreen /></ProtectedRoute>} />
        <Route path="/leads/new" element={<ProtectedRoute><LeadFormScreen /></ProtectedRoute>} />
        <Route path="/leads/:id" element={<ProtectedRoute><LeadDetailScreen /></ProtectedRoute>} />
        <Route path="/leads/:id/edit" element={<ProtectedRoute><LeadFormScreen /></ProtectedRoute>} />
        <Route path="/pipeline" element={<ProtectedRoute><PipelineScreen /></ProtectedRoute>} />
        <Route path="/users" element={<ManagerOnlyRoute><UsersScreen /></ManagerOnlyRoute>} />
        <Route path="/settings" element={<ManagerOnlyRoute><SettingsScreen /></ManagerOnlyRoute>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function AppShell() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Initialize theme from localStorage on mount
  const isHexColor = (value: string) => /^#([a-f\d]{6})$/i.test(value);
  const isLightBackground = (background: string): boolean => {
    if (!isHexColor(background)) return false;
    const r = parseInt(background.slice(1, 3), 16);
    const g = parseInt(background.slice(3, 5), 16);
    const b = parseInt(background.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 190;
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('crm-theme');
    if (savedTheme) {
      try {
        const theme = JSON.parse(savedTheme);
        const root = document.documentElement;
        root.style.setProperty('--page-background', theme.background ?? 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f172a 100%)');
        root.style.setProperty('--accent-primary', theme.accentColor);

        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(theme.accentColor);
        if (result) {
          const rgb = `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
          root.style.setProperty('--accent-glow', `rgba(${rgb}, 0.5)`);
        }

        if (isLightBackground(theme.background)) {
          root.setAttribute('data-theme', 'light');
          root.style.setProperty('--text-primary', '#1f2937');
          root.style.setProperty('--text-secondary', '#6b7280');
          root.style.setProperty('--text-muted', '#9ca3af');
          root.style.setProperty('--sidebar-text-primary', '#1f2937');
          root.style.setProperty('--sidebar-text-secondary', '#6b7280');
          root.style.setProperty('--glass-bg', '#ffffff');
          root.style.setProperty('--glass-border', 'rgba(148, 163, 184, 0.3)');
          root.style.setProperty('--border-color', '#e5e7eb');
          root.style.setProperty('--bg-primary', '#ffffff');
          root.style.setProperty('--bg-secondary', '#f9fafb');
        } else {
          root.removeAttribute('data-theme');
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      }
    }
  }, []);

  useEffect(() => {
    const handler = ((event: Event) => {
      const customEvent = event as CustomEvent<{ message: string; type: 'success' | 'error' }>;
      setToast(customEvent.detail);
    }) as EventListener;

    window.addEventListener('app:toast', handler);
    return () => window.removeEventListener('app:toast', handler);
  }, []);

  return (
    <>
      <AppRoutes />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
