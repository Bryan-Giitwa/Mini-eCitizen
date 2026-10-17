import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewRequest from './pages/NewRequest';
import RequestDetail from './pages/RequestDetail';

// Admin screens are only needed by admins, so they are split into their own bundle.
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

/** Sends admins and citizens to their own home screen. */
function Home() {
  const { user } = useAuth();
  return user.role === 'admin' ? <Navigate to="/admin" replace /> : <Dashboard />;
}

export default function App() {
  return (
    <Suspense fallback={<p className="muted container page">Loading…</p>}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/requests/:id" element={<RequestDetail />} />
          </Route>

          <Route element={<ProtectedRoute role="citizen" />}>
            <Route path="/requests/new" element={<NewRequest />} />
          </Route>

          <Route element={<ProtectedRoute role="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
