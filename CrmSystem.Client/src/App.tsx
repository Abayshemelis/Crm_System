import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
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
        <Route path="/users" element={<ProtectedRoute><UsersScreen /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function AppShell() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
