import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ManagerOnlyRoute } from './components/auth/ManagerOnlyRoute';
import { initTheme } from './lib/theme';
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
import { ProductsScreen } from './screens/ProductsScreen';
import { TasksScreen } from './screens/TasksScreen';
import { OpportunityDetailScreen } from './screens/OpportunityDetailScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { ContractsScreen } from './screens/ContractsScreen';
import { Toast } from './components/ui/Toast';
import LandingPage from './screens/LandingPage';
import { PipelineStagesScreen } from './screens/PipelineStagesScreen';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/reset-password" element={<ResetPasswordScreen />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardScreen /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><ReportsScreen /></ProtectedRoute>} />
        <Route path="/customers" element={<ProtectedRoute><CustomersScreen /></ProtectedRoute>} />
        <Route path="/customers/new" element={<ProtectedRoute><CustomerFormScreen /></ProtectedRoute>} />
        <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetailScreen /></ProtectedRoute>} />
        <Route path="/customers/:id/edit" element={<ProtectedRoute><CustomerFormScreen /></ProtectedRoute>} />
        <Route path="/companies" element={<ProtectedRoute><CompaniesScreen /></ProtectedRoute>} />
        <Route path="/companies/new" element={<ProtectedRoute><CompanyFormScreen /></ProtectedRoute>} />
        <Route path="/companies/:id" element={<ProtectedRoute><CompanyDetailScreen /></ProtectedRoute>} />
        <Route path="/companies/:id/edit" element={<ProtectedRoute><CompanyFormScreen /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><ProductsScreen /></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><LeadsScreen /></ProtectedRoute>} />
        <Route path="/leads/new" element={<ProtectedRoute><LeadFormScreen /></ProtectedRoute>} />
        <Route path="/leads/:id" element={<ProtectedRoute><LeadDetailScreen /></ProtectedRoute>} />
        <Route path="/leads/:id/edit" element={<ProtectedRoute><LeadFormScreen /></ProtectedRoute>} />
        <Route path="/leads/sources" element={<ProtectedRoute><Navigate to="/settings" replace /></ProtectedRoute>} />
        <Route path="/leads/statuses" element={<ProtectedRoute><Navigate to="/settings" replace /></ProtectedRoute>} />
        <Route path="/pipeline" element={<ProtectedRoute><PipelineScreen /></ProtectedRoute>} />
        <Route path="/opportunities" element={<ProtectedRoute><PipelineScreen /></ProtectedRoute>} />
        <Route path="/pipeline/products" element={<ProtectedRoute><Navigate to="/settings" replace /></ProtectedRoute>} />
        <Route path="/pipeline/stages" element={<ProtectedRoute><PipelineStagesScreen /></ProtectedRoute>} />
        <Route path="/contracts" element={<ProtectedRoute><ContractsScreen /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><TasksScreen /></ProtectedRoute>} />
        <Route path="/opportunities/:id" element={<ProtectedRoute><OpportunityDetailScreen /></ProtectedRoute>} />
        <Route path="/users" element={<ManagerOnlyRoute><UsersScreen /></ManagerOnlyRoute>} />
        <Route path="/settings" element={<ManagerOnlyRoute><SettingsScreen /></ManagerOnlyRoute>} />
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
    initTheme();
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
