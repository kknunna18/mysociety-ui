import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Role } from '@/types';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: Role[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'selectingSociety') {
    return <Navigate to="/select-society" replace />;
  }

  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="state state--error" role="alert">
        <p>Your role ({user.role}) cannot access this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
