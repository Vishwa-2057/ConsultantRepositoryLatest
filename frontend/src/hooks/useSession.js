/**
 * React Hook for Session Management
 * Provides easy integration with the session manager
 */

import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import sessionManager from '@/utils/sessionManager';
import { useToast } from '@/hooks/use-toast';

// Session Context
const SessionContext = createContext();

// Session Provider Component
export const SessionProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      const token = await sessionManager.getToken();
      if (token) {
        const isValid = await sessionManager.validateSession();
        if (isValid) {
          setIsAuthenticated(true);
          await loadUserData();
          await loadSessionInfo();
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Session initialization failed:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const token = await sessionManager.getToken();
      if (!token) return;

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const loadSessionInfo = async () => {
    try {
      const info = await sessionManager.getSessionInfo();
      setSessionInfo(info);
    } catch (error) {
      console.error('Failed to load session info:', error);
    }
  };

  const login = async (email, password, rememberMe = false) => {
    try {
      setLoading(true);

      // Check if account is locked
      const isLocked = await sessionManager.isAccountLocked(email);
      if (isLocked) {
        throw new Error('Account is temporarily locked due to too many failed attempts. Please try again later.');
      }

      const response = await fetch('/api/auth/login-step2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, rememberMe })
      });

      const data = await response.json();

      if (data.success) {
        // Handle successful login
        await sessionManager.handleSuccessfulLogin(email);
        await sessionManager.setToken(data.token, data.refreshToken, data.expiresIn);
        
        setIsAuthenticated(true);
        await loadUserData();
        await loadSessionInfo();

        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });

        return { success: true, user: data.user };
      } else {
        // Handle failed login
        const failureInfo = await sessionManager.handleFailedLogin(email);
        
        let errorMessage = data.message || 'Login failed';
        if (failureInfo.locked) {
          errorMessage = `Account locked due to too many failed attempts. Try again in ${Math.ceil(failureInfo.lockoutDuration / 60000)} minutes.`;
        } else if (failureInfo.attemptsRemaining > 0) {
          errorMessage += ` ${failureInfo.attemptsRemaining} attempts remaining.`;
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive"
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // Call logout endpoint
      const token = await sessionManager.getToken();
      if (token) {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        } catch (error) {
          console.error('Logout API call failed:', error);
        }
      }

      // Clear session
      await sessionManager.clearSession();
      setIsAuthenticated(false);
      setUser(null);
      setSessionInfo(null);

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });

      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        title: "Logout Error",
        description: "There was an issue logging out. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    try {
      const newToken = await sessionManager.refreshAuthToken();
      if (newToken) {
        await loadSessionInfo();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  const extendSession = async () => {
    try {
      const extended = await sessionManager.extendSession();
      if (extended) {
        await loadSessionInfo();
        toast({
          title: "Session Extended",
          description: "Your session has been extended.",
        });
      }
      return extended;
    } catch (error) {
      console.error('Session extension failed:', error);
      return false;
    }
  };

  const value = {
    isAuthenticated,
    user,
    sessionInfo,
    loading,
    login,
    logout,
    refreshToken,
    extendSession,
    loadSessionInfo
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

// Custom hook to use session context
export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

// Hook for session-aware API calls
export const useSecureApi = () => {
  const { isAuthenticated, logout } = useSession();

  const secureRequest = useCallback(async (url, options = {}) => {
    if (!isAuthenticated) {
      throw new Error('Not authenticated');
    }

    try {
      // Get current token (with automatic refresh if needed)
      const token = await sessionManager.checkTokenRefresh();
      if (!token) {
        await logout();
        throw new Error('Authentication failed');
      }

      // Make request with token
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Handle authentication errors
      if (response.status === 401) {
        await logout();
        throw new Error('Authentication expired');
      }

      return response;
    } catch (error) {
      console.error('Secure API request failed:', error);
      throw error;
    }
  }, [isAuthenticated, logout]);

  return { secureRequest };
};

// Hook for session monitoring
export const useSessionMonitor = () => {
  const [timeUntilExpiry, setTimeUntilExpiry] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const { sessionInfo, extendSession, logout } = useSession();
  const { toast } = useToast();

  useEffect(() => {
    if (!sessionInfo) return;

    const updateTimer = () => {
      const now = Date.now();
      const expiry = sessionInfo.expiresAt.getTime();
      const timeLeft = expiry - now;

      setTimeUntilExpiry(timeLeft);

      // Show warning 5 minutes before expiry
      if (timeLeft <= 5 * 60 * 1000 && timeLeft > 0 && !showWarning) {
        setShowWarning(true);
        toast({
          title: "Session Expiring Soon",
          description: "Your session will expire in 5 minutes. Click to extend.",
          action: {
            label: "Extend Session",
            onClick: () => {
              extendSession();
              setShowWarning(false);
            }
          }
        });
      }

      // Auto logout when expired
      if (timeLeft <= 0) {
        logout();
      }
    };

    const interval = setInterval(updateTimer, 1000);
    updateTimer(); // Initial call

    return () => clearInterval(interval);
  }, [sessionInfo, showWarning, extendSession, logout, toast]);

  const formatTimeLeft = (milliseconds) => {
    if (!milliseconds || milliseconds <= 0) return '00:00';
    
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    timeUntilExpiry,
    formattedTimeLeft: formatTimeLeft(timeUntilExpiry),
    showWarning,
    dismissWarning: () => setShowWarning(false)
  };
};

// Hook for activity tracking
export const useActivityTracker = () => {
  const { loadSessionInfo } = useSession();

  useEffect(() => {
    const handleActivity = () => {
      sessionManager.updateLastActivity();
      loadSessionInfo();
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [loadSessionInfo]);
};

export default useSession;
