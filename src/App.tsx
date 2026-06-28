import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { AuthProvider, useAuth } from './lib/AuthContext';
import AuthPage from './pages/AuthPage';
import AppPage from './pages/AppPage';

// Only import the updater when running inside Tauri
const isTauri = '__TAURI_INTERNALS__' in window;

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="d-flex align-items-center justify-content-center vh-100"
      style={{ background: '#0b0d14', color: '#5865F2', gap: 12, fontFamily: "'Inter', sans-serif", fontSize: 18 }}>
      <Spinner animation="border" size="sm" style={{ color: '#5865F2' }} />
      Loading Nexus…
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function UpdateChecker() {
  useEffect(() => {
    if (!isTauri) return;
    // Dynamically import so the browser build never pulls in Tauri APIs
    import('./lib/updater').then(({ checkForUpdates }) => {
      checkForUpdates(true); // silent = true, no popup if already up to date
    });
  }, []);
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <UpdateChecker />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
          <Route path="/app"  element={<ProtectedRoute><AppPage /></ProtectedRoute>} />
          <Route path="*"     element={<Navigate to="/auth" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
