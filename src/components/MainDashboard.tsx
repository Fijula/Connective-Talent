import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';
import Dashboard from '../pages/Dashboard';
import AdminDashboard from '../pages/AdminDashboard';
import UserDashboard from '../pages/UserDashboard';

const MainDashboard = () => {
  const { isAdmin, isManager, isRegularUser, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isManager || isAdmin) {
    return <Dashboard />;
  }

  if (isRegularUser) {
    return <UserDashboard />;
  }

  // Fallback to regular dashboard if role is unclear
  return <Dashboard />;
};

export default MainDashboard;
