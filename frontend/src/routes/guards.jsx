import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Preloader from '../components/common/Preloader';

/** Only signed-in users. Remembers where they were going. */
export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Preloader />;
  if (!isAuthenticated) return <Navigate to="/signin" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Only signed-out users (sign in / sign up). */
export function GuestRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Preloader />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Only users with one of the given role slugs. */
export function RoleRoute({ roles }) {
  const { hasRole } = useAuth();
  if (!hasRole(...roles)) return <Navigate to="/" replace />;
  return <Outlet />;
}
