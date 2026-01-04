import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFirstTimeUser } from '@/hooks/useFirstTimeUser';
import AppWalkthrough from './AppWalkthrough';

interface WalkthroughProviderProps {
  children: React.ReactNode;
}

const WalkthroughProvider: React.FC<WalkthroughProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const {
    isLoading,
    showWalkthrough,
    completeWalkthrough,
    skipWalkthrough
  } = useFirstTimeUser(user?.id);
  

  if (isLoading) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {showWalkthrough && (
        <AppWalkthrough
          isVisible={showWalkthrough}
          onComplete={completeWalkthrough}
          onSkip={skipWalkthrough}
        />
      )}
    </>
  );
};

export default WalkthroughProvider;
