import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import useStore, { persistApi } from '../store/store';  // ✅ Import persistApi
import { useNavigate, useLocation } from 'react-router-dom';

// Helper function to check if JWT token is expired
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp;
    return Date.now() >= exp * 1000;
  } catch (error) {
    console.error('Error decoding token:', error);
    return true; // Assume expired if can't decode
  }
};

const AuthLayout: FC<{ children: ReactNode; routeType: 'auth' | 'noauth' }> = ({ children, routeType }) => {
  const isAuthenticated = useStore.use.isAuthenticated();
  const tokens = useStore.use.tokens();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRehydrated, setIsRehydrated] = useState(false);

  // Wait for Zustand to rehydrate from localStorage
  useEffect(() => {
    const unsubscribe = persistApi.onFinishHydration(() => {
      setIsRehydrated(true);
      console.log('🔍 Zustand hydration complete');
    });
    
    // If already hydrated, set immediately
    if (persistApi.hasHydrated()) {
      setIsRehydrated(true);
    }

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Don't do auth checks until rehydration is complete
    if (!isRehydrated) {
      console.log('⏳ Waiting for hydration...');
      return;
    }

    console.log('Auth check:', {
      isAuthenticated,
      hasTokens: !!tokens,
      tokensExpired: tokens?.accessToken ? isTokenExpired(tokens.accessToken) : 'no tokens',
      routeType,
      currentPath: location.pathname
    });

    // Auth route but not authenticated, no tokens, or tokens expired
    const tokensExpired = tokens?.accessToken ? isTokenExpired(tokens.accessToken) : true;
    if ((!isAuthenticated || !tokens || tokensExpired) && routeType === 'auth') {
      console.log('Not authenticated, no tokens, or tokens expired, redirecting to login');
      // Clear invalid state
      if (tokensExpired && tokens) {
        console.log('Clearing expired tokens');
        useStore.getState().logout();
      }
      navigate('/staff/login', { replace: true });
    }
    // NoAuth route but authenticated
    else if (isAuthenticated && routeType === 'noauth') {
      console.log('Already authenticated, redirecting to staff area');
      // Use window.location.replace instead of navigate for full page reload
      window.location.replace('/staff/profile');
    }
  }, [isRehydrated, isAuthenticated, tokens, routeType, navigate, location.pathname]);

  // Show loading while rehydrating
  if (!isRehydrated) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
};

export default AuthLayout;