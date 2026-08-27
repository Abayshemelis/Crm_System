import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ManagerOnlyRoute } from './components/auth/ManagerOnlyRoute';
import { initTheme } from './lib/theme';
import { Toast } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { GlobalConfirmDialog } from './components/ui/GlobalConfirmDialog';
import { SignalRProvider } from './context/SignalRContext';
import { SystemProfileProvider } from './context/SystemProfileContext';

// Eagerly loaded public entry screens for instant first paint
import LandingPage from './screens/LandingPage';
import { LoginScreen } from './screens/LoginScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from './screens/ResetPasswordScreen';
import { PublicContractSignScreen } from './screens/PublicContractSignScreen';
import { PublicInvoicePayScreen } from './screens/PublicInvoicePayScreen';

// Code-split protected CRM screens (loaded on-demand when user navigates)
const DashboardScreen = lazy(() => import('./screens/DashboardScreen').then(m => ({ default: m.DashboardScreen })));
const CustomersScreen = lazy(() => import('./screens/CustomersScreen').then(m => ({ default: m.CustomersScreen })));
const CustomerDetailScreen = lazy(() => import('./screens/CustomerDetailScreen').then(m => ({ default: m.CustomerDetailScreen })));
const CustomerFormScreen = lazy(() => import('./screens/CustomerFormScreen').then(m => ({ default: m.CustomerFormScreen })));
const CompaniesScreen = lazy(() => import('./screens/CompaniesScreen').then(m => ({ default: m.CompaniesScreen })));
const CompanyDetailScreen = lazy(() => import('./screens/CompanyDetailScreen').then(m => ({ default: m.CompanyDetailScreen })));
const CompanyFormScreen = lazy(() => import('./screens/CompanyFormScreen').then(m => ({ default: m.CompanyFormScreen })));
const LeadsScreen = lazy(() => import('./screens/LeadsScreen').then(m => ({ default: m.LeadsScreen })));
const LeadFormScreen = lazy(() => import('./screens/LeadFormScreen').then(m => ({ default: m.LeadFormScreen })));
const LeadDetailScreen = lazy(() => import('./screens/LeadDetailScreen').then(m => ({ default: m.LeadDetailScreen })));
const PipelineScreen = lazy(() => import('./screens/PipelineScreen').then(m => ({ default: m.PipelineScreen })));
const PipelineStagesScreen = lazy(() => import('./screens/PipelineStagesScreen').then(m => ({ default: m.PipelineStagesScreen })));
const OpportunityDetailScreen = lazy(() => import('./screens/OpportunityDetailScreen').then(m => ({ default: m.OpportunityDetailScreen })));
const OpportunityFormScreen = lazy(() => import('./screens/OpportunityFormScreen').then(m => ({ default: m.OpportunityFormScreen })));
const ProductsScreen = lazy(() => import('./screens/ProductsScreen').then(m => ({ default: m.ProductsScreen })));
const TasksScreen = lazy(() => import('./screens/TasksScreen').then(m => ({ default: m.TasksScreen })));
const TaskFormScreen = lazy(() => import('./screens/TaskFormScreen').then(m => ({ default: m.TaskFormScreen })));
const ContractsScreen = lazy(() => import('./screens/ContractsScreen').then(m => ({ default: m.ContractsScreen })));
const ContractFormScreen = lazy(() => import('./screens/ContractFormScreen').then(m => ({ default: m.ContractFormScreen })));
const InvoicesScreen = lazy(() => import('./screens/InvoicesScreen').then(m => ({ default: m.InvoicesScreen })));
const InvoiceFormScreen = lazy(() => import('./screens/InvoiceFormScreen').then(m => ({ default: m.InvoiceFormScreen })));
const PaymentsScreen = lazy(() => import('./screens/PaymentsScreen').then(m => ({ default: m.PaymentsScreen })));
const UsersScreen = lazy(() => import('./screens/UsersScreen').then(m => ({ default: m.UsersScreen })));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const SearchResultsScreen = lazy(() => import('./screens/SearchResultsScreen').then(m => ({ default: m.SearchResultsScreen })));
const AuditLogsScreen = lazy(() => import('./screens/AuditLogsScreen').then(m => ({ default: m.AuditLogsScreen })));

// 11 Clean, Database-driven Reporting Screens
const ReportsOverviewScreen = lazy(() => import('./screens/reports/ReportsOverviewScreen').then(m => ({ default: m.ReportsOverviewScreen })));
const CustomerReportsScreen = lazy(() => import('./screens/reports/CustomerReportsScreen').then(m => ({ default: m.CustomerReportsScreen })));
const CompanyReportsScreen = lazy(() => import('./screens/reports/CompanyReportsScreen').then(m => ({ default: m.CompanyReportsScreen })));
const LeadReportsScreen = lazy(() => import('./screens/reports/LeadReportsScreen').then(m => ({ default: m.LeadReportsScreen })));
const PipelineReportsScreen = lazy(() => import('./screens/reports/PipelineReportsScreen').then(m => ({ default: m.PipelineReportsScreen })));
const OpportunityReportsScreen = lazy(() => import('./screens/reports/OpportunityReportsScreen').then(m => ({ default: m.OpportunityReportsScreen })));
const ContractReportsScreen = lazy(() => import('./screens/reports/ContractReportsScreen').then(m => ({ default: m.ContractReportsScreen })));
const InvoiceReportsScreen = lazy(() => import('./screens/reports/InvoiceReportsScreen').then(m => ({ default: m.InvoiceReportsScreen })));
const PaymentReportsScreen = lazy(() => import('./screens/reports/PaymentReportsScreen').then(m => ({ default: m.PaymentReportsScreen })));
const ActivityReportsScreen = lazy(() => import('./screens/reports/ActivityReportsScreen').then(m => ({ default: m.ActivityReportsScreen })));
const TaskReportsScreen = lazy(() => import('./screens/reports/TaskReportsScreen').then(m => ({ default: m.TaskReportsScreen })));
const TeamPerformanceReportsScreen = lazy(() => import('./screens/reports/TeamPerformanceReportsScreen').then(m => ({ default: m.TeamPerformanceReportsScreen })));

const UserReportsScreen = lazy(() => import('./screens/reports/UserReportsScreen').then(m => ({ default: m.UserReportsScreen })));
const AuditReportsScreen = lazy(() => import('./screens/reports/AuditReportsScreen').then(m => ({ default: m.AuditReportsScreen })));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <div
      className="spinner-icon"
      style={{
        width: '32px',
        height: '32px',
        border: '3px solid rgba(99,102,241,0.2)',
        borderTopColor: '#6366f1',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }}
    />
  </div>
);

function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
          <Route path="/reset-password" element={<ResetPasswordScreen />} />
          <Route path="/sign/contract/:token" element={<PublicContractSignScreen />} />
          <Route path="/contract/sign/:token" element={<PublicContractSignScreen />} />
          <Route path="/contracts/sign/:token" element={<PublicContractSignScreen />} />
          <Route path="/sign/:token" element={<PublicContractSignScreen />} />
          <Route path="/public/invoices/:id" element={<PublicInvoicePayScreen />} />
          <Route path="/invoice/pay/:id" element={<PublicInvoicePayScreen />} />
          <Route path="/invoices/pay/:id" element={<PublicInvoicePayScreen />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardScreen /></ProtectedRoute>} />

          {/* ── Master Reports Routes ────────────────────────────────────── */}
          <Route path="/reports" element={<ProtectedRoute><ReportsOverviewScreen /></ProtectedRoute>} />
          <Route path="/reports/overview" element={<ProtectedRoute><ReportsOverviewScreen /></ProtectedRoute>} />
          <Route path="/reports/customers" element={<ProtectedRoute><CustomerReportsScreen /></ProtectedRoute>} />
          <Route path="/reports/companies" element={<ProtectedRoute><CompanyReportsScreen /></ProtectedRoute>} />
          <Route path="/reports/leads" element={<ProtectedRoute><LeadReportsScreen /></ProtectedRoute>} />
          <Route path="/reports/pipeline" element={<ProtectedRoute><PipelineReportsScreen /></ProtectedRoute>} />
          <Route path="/reports/opportunities" element={<ProtectedRoute><OpportunityReportsScreen /></ProtectedRoute>} />
          <Route path="/reports/contracts" element={<ProtectedRoute><ContractReportsScreen /></ProtectedRoute>} />
          <Route path="/reports/invoices" element={<ProtectedRoute><InvoiceReportsScreen /></ProtectedRoute>} />
          <Route path="/reports/payments" element={<ProtectedRoute><PaymentReportsScreen /></ProtectedRoute>} />
          <Route path="/reports/activities" element={<ProtectedRoute><ActivityReportsScreen /></ProtectedRoute>} />
          <Route path="/reports/tasks" element={<ProtectedRoute><TaskReportsScreen /></ProtectedRoute>} />
          <Route path="/reports/team" element={<ProtectedRoute><TeamPerformanceReportsScreen /></ProtectedRoute>} />
          <Route path="/reports/team-performance" element={<ProtectedRoute><TeamPerformanceReportsScreen /></ProtectedRoute>} />
          <Route path="/reports/system-history" element={<ProtectedRoute><AuditReportsScreen /></ProtectedRoute>} />

          {/* ── Main CRM Entity Routes ──────────────────────────────────── */}
          <Route path="/customers" element={<ProtectedRoute><CustomersScreen /></ProtectedRoute>} />
          <Route path="/customers/new" element={<ProtectedRoute><CustomerFormScreen /></ProtectedRoute>} />
          <Route path="/customers/reports" element={<ProtectedRoute><CustomerReportsScreen /></ProtectedRoute>} />
          <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetailScreen /></ProtectedRoute>} />
          <Route path="/customers/:id/edit" element={<ProtectedRoute><CustomerFormScreen /></ProtectedRoute>} />

          <Route path="/companies" element={<ProtectedRoute><CompaniesScreen /></ProtectedRoute>} />
          <Route path="/companies/new" element={<ProtectedRoute><CompanyFormScreen /></ProtectedRoute>} />
          <Route path="/companies/reports" element={<ProtectedRoute><CompanyReportsScreen /></ProtectedRoute>} />
          <Route path="/companies/:id" element={<ProtectedRoute><CompanyDetailScreen /></ProtectedRoute>} />
          <Route path="/companies/:id/edit" element={<ProtectedRoute><CompanyFormScreen /></ProtectedRoute>} />

          <Route path="/products" element={<ProtectedRoute><ProductsScreen /></ProtectedRoute>} />

          <Route path="/leads" element={<ProtectedRoute><LeadsScreen /></ProtectedRoute>} />
          <Route path="/leads/new" element={<ProtectedRoute><LeadFormScreen /></ProtectedRoute>} />
          <Route path="/leads/reports" element={<ProtectedRoute><LeadReportsScreen /></ProtectedRoute>} />
          <Route path="/leads/:id" element={<ProtectedRoute><LeadDetailScreen /></ProtectedRoute>} />
          <Route path="/leads/:id/edit" element={<ProtectedRoute><LeadFormScreen /></ProtectedRoute>} />
          <Route path="/leads/sources" element={<ProtectedRoute><Navigate to="/settings" replace /></ProtectedRoute>} />
          <Route path="/leads/statuses" element={<ProtectedRoute><Navigate to="/settings" replace /></ProtectedRoute>} />

          <Route path="/pipeline" element={<ProtectedRoute><PipelineScreen /></ProtectedRoute>} />
          <Route path="/pipeline/new" element={<ProtectedRoute><OpportunityFormScreen /></ProtectedRoute>} />
          <Route path="/pipeline/reports" element={<ProtectedRoute><PipelineReportsScreen /></ProtectedRoute>} />
          <Route path="/pipeline/:id/edit" element={<ProtectedRoute><OpportunityFormScreen /></ProtectedRoute>} />
          <Route path="/pipeline/stages" element={<ProtectedRoute><PipelineStagesScreen /></ProtectedRoute>} />

          <Route path="/opportunities" element={<ProtectedRoute><PipelineScreen /></ProtectedRoute>} />
          <Route path="/opportunities/new" element={<ProtectedRoute><OpportunityFormScreen /></ProtectedRoute>} />
          <Route path="/opportunities/reports" element={<ProtectedRoute><OpportunityReportsScreen /></ProtectedRoute>} />
          <Route path="/opportunities/:id" element={<ProtectedRoute><OpportunityDetailScreen /></ProtectedRoute>} />
          <Route path="/opportunities/:id/edit" element={<ProtectedRoute><OpportunityFormScreen /></ProtectedRoute>} />

          <Route path="/contracts" element={<ProtectedRoute><ContractsScreen /></ProtectedRoute>} />
          <Route path="/contracts/new" element={<ProtectedRoute><ContractFormScreen /></ProtectedRoute>} />
          <Route path="/contracts/:id/edit" element={<ProtectedRoute><ContractFormScreen /></ProtectedRoute>} />
          <Route path="/contracts/reports" element={<ProtectedRoute><ContractReportsScreen /></ProtectedRoute>} />

          <Route path="/invoices" element={<ProtectedRoute><InvoicesScreen /></ProtectedRoute>} />
          <Route path="/invoices/new" element={<ProtectedRoute><InvoiceFormScreen /></ProtectedRoute>} />
          <Route path="/invoices/:id/edit" element={<ProtectedRoute><InvoiceFormScreen /></ProtectedRoute>} />
          <Route path="/invoices/reports" element={<ProtectedRoute><InvoiceReportsScreen /></ProtectedRoute>} />

          <Route path="/payments" element={<ProtectedRoute><PaymentsScreen /></ProtectedRoute>} />
          <Route path="/payments/reports" element={<ProtectedRoute><PaymentReportsScreen /></ProtectedRoute>} />

          <Route path="/tasks" element={<ProtectedRoute><TasksScreen /></ProtectedRoute>} />
          <Route path="/tasks/new" element={<ProtectedRoute><TaskFormScreen /></ProtectedRoute>} />
          <Route path="/tasks/:id/edit" element={<ProtectedRoute><TaskFormScreen /></ProtectedRoute>} />
          <Route path="/tasks/reports" element={<ProtectedRoute><TaskReportsScreen /></ProtectedRoute>} />

          <Route path="/activities" element={<ProtectedRoute><Navigate to="/reports/activities" replace /></ProtectedRoute>} />
          <Route path="/activities/reports" element={<ProtectedRoute><ActivityReportsScreen /></ProtectedRoute>} />

          <Route path="/team" element={<ProtectedRoute><Navigate to="/reports/team" replace /></ProtectedRoute>} />
          <Route path="/team/reports" element={<ProtectedRoute><TeamPerformanceReportsScreen /></ProtectedRoute>} />

          <Route path="/audit-logs" element={<ManagerOnlyRoute><AuditLogsScreen /></ManagerOnlyRoute>} />
          <Route path="/audit-logs/reports" element={<ProtectedRoute><AuditReportsScreen /></ProtectedRoute>} />

          <Route path="/users" element={<ManagerOnlyRoute><UsersScreen /></ManagerOnlyRoute>} />
          <Route path="/users/reports" element={<ProtectedRoute><TeamPerformanceReportsScreen /></ProtectedRoute>} />
          <Route path="/reports/users" element={<ProtectedRoute><TeamPerformanceReportsScreen /></ProtectedRoute>} />

          <Route path="/search" element={<ProtectedRoute><SearchResultsScreen /></ProtectedRoute>} />
          <Route path="/settings" element={<ManagerOnlyRoute><SettingsScreen /></ManagerOnlyRoute>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function AppShell() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmState, setConfirmState] = useState<{ message: string; resolve: (val: boolean) => void } | null>(null);

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    const handler = ((event: Event) => {
      const customEvent = event as CustomEvent<{ message: string; type: 'success' | 'error' }>;
      setToast(customEvent.detail);
    }) as EventListener;

    window.addEventListener('app:toast', handler);

    const confirmHandler = ((event: Event) => {
      const customEvent = event as CustomEvent<{ message: string; resolve: (val: boolean) => void }>;
      setConfirmState(customEvent.detail);
    }) as EventListener;

    window.addEventListener('app:confirm', confirmHandler);

    return () => {
      window.removeEventListener('app:toast', handler);
      window.removeEventListener('app:confirm', confirmHandler);
    };
  }, []);

  return (
    <ErrorBoundary>
      <AppRoutes />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirmState && (
        <GlobalConfirmDialog 
           message={confirmState.message} 
           onConfirm={() => { confirmState.resolve(true); setConfirmState(null); }}
           onCancel={() => { confirmState.resolve(false); setConfirmState(null); }}
        />
      )}
    </ErrorBoundary>
  );
}

function App() {
  useEffect(() => {
    initTheme();
  }, []);

  return (
    <ErrorBoundary>
      <SystemProfileProvider>
        <AuthProvider>
          <SignalRProvider>
            <AppShell />
          </SignalRProvider>
        </AuthProvider>
      </SystemProfileProvider>
    </ErrorBoundary>
  );
}

export default App;
