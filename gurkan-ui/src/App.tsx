import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
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

// ── Placeholder pages (will be built in T04) ─────────

function PropertyListPlaceholder() {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, marginBottom: 8 }}>
        Mülkler
      </h1>
      <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
        Mülk listesi burada görüntülenecek.
      </p>
    </div>
  );
}

function PropertyDetailPlaceholder() {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, marginBottom: 8 }}>
        Mülk Detayı
      </h1>
      <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
        Mülk detayları burada görüntülenecek.
      </p>
    </div>
  );
}

function PropertyNewPlaceholder() {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, marginBottom: 8 }}>
        Yeni Mülk
      </h1>
      <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>
        Yeni mülk formu burada görüntülenecek.
      </p>
    </div>
  );
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
        <Route path="/properties" element={<PropertyListPlaceholder />} />
        <Route path="/properties/new" element={<PropertyNewPlaceholder />} />
        <Route path="/properties/:id" element={<PropertyDetailPlaceholder />} />
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
