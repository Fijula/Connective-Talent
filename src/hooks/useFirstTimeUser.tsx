import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FirstTimeUserHook {
  isFirstTimeUser: boolean;
  isLoading: boolean;
  showWalkthrough: boolean;
  completeWalkthrough: () => void;
  skipWalkthrough: () => void;
  resetWalkthrough: () => void;
}

export const useFirstTimeUser = (userId: string | undefined): FirstTimeUserHook => {
  const [isFirstTimeUser, setIsFirstTimeUser] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showWalkthrough, setShowWalkthrough] = useState<boolean>(false);

  useEffect(() => {
    const checkFirstTimeUser = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if user has completed walkthrough
        const { data: userPreferences, error } = await supabase
          .from('user_preferences')
          .select('walkthrough_completed')
          .eq('user_id', userId)
          .single();

        if (error && error.code === 'PGRST116') {
          // No preferences found - this is a first-time user
          setIsFirstTimeUser(true);
          setShowWalkthrough(true);
          
          // Create user preferences record
          await supabase
            .from('user_preferences')
            .insert({
              user_id: userId,
              walkthrough_completed: false,
              created_at: new Date().toISOString()
            });
        } else if (error) {
          console.error('Error checking user preferences:', error);
          // Default to showing walkthrough on error
          setIsFirstTimeUser(true);
          setShowWalkthrough(true);
        } else {
          // User exists, check if walkthrough was completed
          const isCompleted = userPreferences?.walkthrough_completed || false;
          setIsFirstTimeUser(!isCompleted);
          setShowWalkthrough(!isCompleted);
        }
      } catch (error) {
        console.error('Error in checkFirstTimeUser:', error);
        // Default to showing walkthrough on error
        setIsFirstTimeUser(true);
        setShowWalkthrough(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkFirstTimeUser();
  }, [userId]);

  const completeWalkthrough = async () => {
    if (!userId) return;

    try {
      // First try to update existing record
      const { error: updateError } = await supabase
        .from('user_preferences')
        .update({
          walkthrough_completed: true,
          walkthrough_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      // If update fails (no existing record), insert new one
      if (updateError) {
        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert({
            user_id: userId,
            walkthrough_completed: true,
            walkthrough_completed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error inserting walkthrough status:', insertError);
        }
      }

      // Always update local state regardless of database result
      setIsFirstTimeUser(false);
      setShowWalkthrough(false);
    } catch (error) {
      console.error('Error in completeWalkthrough:', error);
      // Still update local state even if database fails
      setIsFirstTimeUser(false);
      setShowWalkthrough(false);
    }
  };

  const skipWalkthrough = async () => {
    if (!userId) return;

    try {
      // First try to update existing record
      const { error: updateError } = await supabase
        .from('user_preferences')
        .update({
          walkthrough_completed: true,
          walkthrough_skipped: true,
          walkthrough_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      // If update fails (no existing record), insert new one
      if (updateError) {
        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert({
            user_id: userId,
            walkthrough_completed: true,
            walkthrough_skipped: true,
            walkthrough_completed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error inserting skip walkthrough status:', insertError);
        }
      }

      // Always update local state regardless of database result
      setIsFirstTimeUser(false);
      setShowWalkthrough(false);
    } catch (error) {
      console.error('Error in skipWalkthrough:', error);
      // Still update local state even if database fails
      setIsFirstTimeUser(false);
      setShowWalkthrough(false);
    }
  };

  const resetWalkthrough = async () => {
    if (!userId) return;

    try {
      // Reset walkthrough status
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          walkthrough_completed: false,
          walkthrough_skipped: false,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error resetting walkthrough:', error);
      } else {
        setIsFirstTimeUser(true);
        setShowWalkthrough(true);
      }
    } catch (error) {
      console.error('Error in resetWalkthrough:', error);
    }
  };

  return {
    isFirstTimeUser,
    isLoading,
    showWalkthrough,
    completeWalkthrough,
    skipWalkthrough,
    resetWalkthrough
  };
};
