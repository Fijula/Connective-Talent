import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';

interface RoleBasedRouteProps {
  children: ReactNode;
  allowedRoles: ('admin' | 'manager' | 'user')[];
  fallbackPath?: string;
}

export const RoleBasedRoute = ({ 
  children, 
  allowedRoles, 
  fallbackPath = '/' 
}: RoleBasedRouteProps) => {
  const { isAdmin, isManager, isRegularUser, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasAccess = 
    (isAdmin && allowedRoles.includes('admin')) ||
    (isManager && allowedRoles.includes('manager')) ||
    (isRegularUser && allowedRoles.includes('user'));

  if (!hasAccess) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};
