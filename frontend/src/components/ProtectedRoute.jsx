import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

const STAFF_ROLES = ['support', 'manager', 'admin', 'superadmin'];

export function AdminRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (!STAFF_ROLES.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}
