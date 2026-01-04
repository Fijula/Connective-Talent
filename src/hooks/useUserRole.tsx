import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserRole {
  isAdmin: boolean;
  isManager: boolean;
  isRegularUser: boolean;
  loading: boolean;
}

export const useUserRole = (): UserRole => {
  const [userRole, setUserRole] = useState<UserRole>({
    isAdmin: false,
    isManager: false,
    isRegularUser: false,
    loading: true
  });
  
  const { user } = useAuth();

  useEffect(() => {
    const checkUserRole = async () => {
      console.log('Checking user role for:', user?.email);
      if (!user?.email) {
        setUserRole({
          isAdmin: false,
          isManager: false,
          isRegularUser: false,
          loading: false
        });
        return;
      }

      try {
        // Check if user is admin
        const { data: adminData, error: adminError } = await supabase
          .from('admin')
          .select('id')
          .eq('email', user.email)
          .single();

        if (adminError && adminError.code !== 'PGRST116') {
          console.error('Error checking admin status:', adminError);
        }

        const isAdmin = !!adminData;
        console.log('Admin check result:', { adminData, adminError, isAdmin });

        // Check if user is manager
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('is_manager')
          .eq('email', user.email)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.error('Error checking user status:', userError);
        }

        const isManager = userData?.is_manager || false;
        const isRegularUser = !isAdmin && !isManager;

        console.log('Role check results:', { isAdmin, isManager, isRegularUser, adminData, userData });

        setUserRole({
          isAdmin,
          isManager,
          isRegularUser,
          loading: false
        });
      } catch (error) {
        console.error('Error checking user role:', error);
        setUserRole({
          isAdmin: false,
          isManager: false,
          isRegularUser: true,
          loading: false
        });
      }
    };

    checkUserRole();
  }, [user?.email]);

  return userRole;
};
