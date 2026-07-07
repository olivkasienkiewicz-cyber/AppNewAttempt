'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { setCurrentUser } from '@/lib/store';

// Bridges the Auth.js session into the existing store, so every page that
// already reads `state.currentUserId` keeps working unchanged.
function AuthBridge() {
  const { data: session, status } = useSession();
  useEffect(() => {
    if (status === 'loading') return;
    setCurrentUser(session?.user?.id ?? null);
  }, [status, session?.user?.id]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthBridge />
      {children}
    </SessionProvider>
  );
}
