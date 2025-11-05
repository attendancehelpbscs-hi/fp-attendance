import { useEffect } from 'react';
import type { FC, ReactNode } from 'react';
import useStore from '../store/store';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthLayout: FC<{ children: ReactNode; routeType: 'auth' | 'noauth' }> = ({ children, routeType }) => {
  const isAuthenticated = useStore.use.isAuthenticated();
  const tokens = useStore.use.tokens();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check both store AND localStorage for auth
    const persistedData = localStorage.getItem('bas-persist');
    let isActuallyAuthenticated = isAuthenticated;
    
    if (persistedData) {
      try {
        const parsed = JSON.parse(persistedData);
        isActuallyAuthenticated = parsed.state?.isAuthenticated && !!parsed.state?.tokens;
        
        console.log('Auth check:', {
          fromStore: isAuthenticated,
          fromLocalStorage: isActuallyAuthenticated,
          hasTokens: !!tokens,
          routeType,
          currentPath: location.pathname
        });
      } catch (e) {
        console.error('Failed to parse persisted data:', e);
      }
    }

    // Auth route but not authenticated
    if (!isActuallyAuthenticated && routeType === 'auth') {
      console.log('Not authenticated, redirecting to login');
      navigate('/staff/login', { replace: true });
    } 
    // NoAuth route but authenticated
    else if (isActuallyAuthenticated && routeType === 'noauth') {
      console.log('Already authenticated, redirecting to home');
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, tokens, routeType, navigate, location.pathname]);

  return <>{children}</>;
};

export default AuthLayout;