import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppWalkthrough from './AppWalkthrough';
import { useAuth } from '@/hooks/useAuth';

const WalkthroughDemo: React.FC = () => {
  const [showDemo, setShowDemo] = useState(false);
  const { user } = useAuth();
  

  const handleStartDemo = () => {
    setShowDemo(true);
  };

  const handleComplete = () => {
    setShowDemo(false);
    console.log('Walkthrough completed!');
  };

  const handleSkip = () => {
    setShowDemo(false);
    console.log('Walkthrough skipped!');
  };

  return (
    <div className="p-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Voice-Guided Walkthrough Demo</CardTitle>
          <CardDescription>
            Test the interactive walkthrough with voice explanations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            <p>This demo shows the voice-guided walkthrough that first-time users will see.</p>
            <p className="mt-2">
              <strong>Current User:</strong> {user?.email || 'Not logged in'}
            </p>
          </div>
          
          <Button 
            onClick={handleStartDemo}
            className="w-full"
            disabled={!user}
          >
            {user ? 'Start Walkthrough Demo' : 'Login Required'}
          </Button>
          
          <div className="text-xs text-gray-500">
            <p><strong>Features to test:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Voice explanations with text-to-speech</li>
              <li>Speed and pitch controls for speech</li>
              <li>Step-by-step walkthrough (6 steps)</li>
              <li>Clean bluish modal design</li>
              <li>Smooth animations and transitions</li>
              <li>Skip and complete functionality</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Demo Walkthrough */}
      {showDemo && (
        <AppWalkthrough
          isVisible={showDemo}
          onComplete={handleComplete}
          onSkip={handleSkip}
        />
      )}
    </div>
  );
};

export default WalkthroughDemo;
