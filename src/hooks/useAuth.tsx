import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  profile: any;
  roles: string[];
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile and roles
          setTimeout(async () => {
            try {
              // First try to get user profile with manager status
              const { data: managerData } = await supabase
                .from('users')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
              
              // If no user profile exists, create one
              if (!managerData) {
                try {
                  // Create user record in users table
                  const { data: newUserData, error: createError } = await supabase
                    .from('users')
                    .insert({
                      user_id: session.user.id,
                      email: session.user.email,
                      name: session.user.user_metadata?.full_name || 
                            `${session.user.user_metadata?.first_name || ''} ${session.user.user_metadata?.last_name || ''}`.trim() ||
                            session.user.email?.split('@')[0],
                      first_name: session.user.user_metadata?.first_name || null,
                      last_name: session.user.user_metadata?.last_name || null,
                      avatar_url: session.user.user_metadata?.avatar_url || null,
                      is_manager: false, // Default to regular user
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    })
                    .select()
                    .single();
                  
                  if (createError) {
                    console.error('Error creating user profile:', createError);
                    throw createError;
                  }
                  
                  if (newUserData) {
                    // Fetch user roles (should be empty for new users)
                    const { data: rolesData } = await supabase
                      .from('user_roles')
                      .select('role')
                      .eq('user_id', session.user.id);
                    
                    setProfile(newUserData);
                    setRoles(rolesData?.map(r => r.role) || []);
                  } else {
                    // Fallback to old profile method
                    const { data: profileData } = await supabase
                      .rpc('get_user_profile', { _user_id: session.user.id });
                    
                    if (profileData && profileData.length > 0) {
                      setProfile(profileData[0]);
                      setRoles(profileData[0].roles || []);
                    }
                  }
                } catch (error) {
                  console.error('Error creating user profile:', error);
                  // Fallback to old profile method
                  const { data: profileData } = await supabase
                    .rpc('get_user_profile', { _user_id: session.user.id });
                  
                  if (profileData && profileData.length > 0) {
                    setProfile(profileData[0]);
                    setRoles(profileData[0].roles || []);
                  }
                }
              } else {
                // Fetch user roles
                const { data: rolesData } = await supabase
                  .from('user_roles')
                  .select('role')
                  .eq('user_id', session.user.id);
                
                setProfile(managerData);
                setRoles(rolesData?.map(r => r.role) || []);
              }
            } catch (error) {
              console.error('Error fetching profile:', error);
            }
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });

    if (error) {
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      // If signup was successful and user was created, create user record
      if (data.user) {
        try {
          await supabase
            .from('users')
            .insert({
              user_id: data.user.id,
              email: data.user.email,
              name: `${firstName} ${lastName}`.trim(),
              first_name: firstName,
              last_name: lastName,
              is_manager: false, // Default to regular user
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        } catch (insertError) {
          console.error('Error creating user record during signup:', insertError);
          // Don't show error to user as auth was successful
        }
      }
      
      toast({
        title: 'Check your email',
        description: 'We sent you a confirmation link to complete your registration.',
      });
    }

    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      }
    });

    if (error) {
      toast({
        title: 'Google sign in failed',
        description: error.message,
        variant: 'destructive',
      });
    }

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: 'Sign out failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const hasRole = (role: string) => {
    return roles.includes(role);
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    profile,
    roles,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};