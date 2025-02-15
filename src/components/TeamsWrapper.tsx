import { useState, useEffect } from 'react';
import { app, UserInfo } from '@microsoft/teams-js';

interface TeamsWrapperProps {
  children: React.ReactNode;
}

export function TeamsWrapper({ children }: TeamsWrapperProps) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTeamsEnvironment, setIsTeamsEnvironment] = useState(false);

  useEffect(() => {
    const initializeTeams = async () => {
      try {
        // Check if we're running in Teams
        if (window.parent === window.self) {
          // Not in Teams - running standalone
          setIsTeamsEnvironment(false);
          setIsLoading(false);
          return;
        }

        setIsTeamsEnvironment(true);
        await app.initialize();
        const context = await app.getContext();
        setUser(context.user);
      } catch (error) {
        console.log('Running in standalone mode');
        setIsTeamsEnvironment(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeTeams();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not in Teams or Teams initialization failed, render normally
  if (!isTeamsEnvironment) {
    return <>{children}</>;
  }

  // In Teams but failed to get user context
  if (isTeamsEnvironment && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error: Could not initialize Teams app</p>
          <p className="text-gray-600 mt-2">Please ensure you're running this app within Microsoft Teams</p>
        </div>
      </div>
    );
  }

  // Successfully running in Teams with user context
  return (
    <div className="teams-wrapper">
      {children}
    </div>
  );
}