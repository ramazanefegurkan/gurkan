import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import PropertyList from './pages/Properties/PropertyList';
import PropertyForm from './pages/Properties/PropertyForm';
import PropertyDetail from './pages/Properties/PropertyDetail';
import PropertyLayout from './pages/Properties/PropertyLayout';
import TenantList from './pages/Tenants/TenantList';
import TenantForm from './pages/Tenants/TenantForm';
import TenantDetail from './pages/Tenants/TenantDetail';
import ShortTermRentalList from './pages/ShortTermRentals/ShortTermRentalList';
import ShortTermRentalForm from './pages/ShortTermRentals/ShortTermRentalForm';
import ExpenseList from './pages/Expenses/ExpenseList';
import ExpenseForm from './pages/Expenses/ExpenseForm';
import BillList from './pages/Bills/BillList';
import BillForm from './pages/Bills/BillForm';
import DocumentList from './pages/Documents/DocumentList';
import type { ReactNode } from 'react';

// ── Route guards ─────────────────────────────────────

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// ── App ──────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/properties" replace />} />
        <Route path="/properties" element={<PropertyList />} />
        <Route path="/properties/new" element={<PropertyForm />} />
        <Route path="/properties/:id/edit" element={<PropertyForm />} />

        {/* Property sub-pages with shared tab layout */}
        <Route path="/properties/:id" element={<PropertyLayout />}>
          <Route index element={<PropertyDetail />} />
          <Route path="tenants" element={<TenantList />} />
          <Route path="tenants/new" element={<TenantForm />} />
          <Route path="tenants/:tenantId" element={<TenantDetail />} />
          <Route path="tenants/:tenantId/edit" element={<TenantForm />} />
          <Route path="short-term-rentals" element={<ShortTermRentalList />} />
          <Route path="short-term-rentals/new" element={<ShortTermRentalForm />} />
          <Route path="short-term-rentals/:rentalId/edit" element={<ShortTermRentalForm />} />
          <Route path="expenses" element={<ExpenseList />} />
          <Route path="expenses/new" element={<ExpenseForm />} />
          <Route path="expenses/:expenseId/edit" element={<ExpenseForm />} />
          <Route path="bills" element={<BillList />} />
          <Route path="bills/new" element={<BillForm />} />
          <Route path="bills/:billId/edit" element={<BillForm />} />
          <Route path="documents" element={<DocumentList />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/properties" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
