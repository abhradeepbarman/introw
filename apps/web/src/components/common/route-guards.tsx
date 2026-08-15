import { useAuth } from '@/contexts/auth-context';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

function SessionCheck() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <p
        className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground"
        role="status"
      >
        Checking session
      </p>
    </main>
  );
}

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <SessionCheck />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return <Outlet />;
}

export function GuestRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <SessionCheck />;
  if (user) return <Navigate to="/" replace />;

  return <Outlet />;
}
