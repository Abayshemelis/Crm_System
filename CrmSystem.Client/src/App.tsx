import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './screens/LoginScreen';
import { CustomersScreen } from './screens/CustomersScreen';
import { CustomerDetailScreen } from './screens/CustomerDetailScreen';
import { CompaniesScreen } from './screens/CompaniesScreen';
import { CompanyDetailScreen } from './screens/CompanyDetailScreen';
import { UsersScreen } from './screens/UsersScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/customers" element={<PrivateRoute><CustomersScreen /></PrivateRoute>} />
        <Route path="/customers/:id" element={<PrivateRoute><CustomerDetailScreen /></PrivateRoute>} />
        <Route path="/companies" element={<PrivateRoute><CompaniesScreen /></PrivateRoute>} />
        <Route path="/companies/:id" element={<PrivateRoute><CompanyDetailScreen /></PrivateRoute>} />
        <Route path="/users" element={<PrivateRoute><UsersScreen /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><SettingsScreen /></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/customers" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
