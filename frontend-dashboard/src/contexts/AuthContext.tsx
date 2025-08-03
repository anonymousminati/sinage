/**
 * Authentication Context
 * Provides authentication state management and token handling throughout the app
 */

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { 
  login as apiLogin, 
  register as apiRegister, 
  logout as apiLogout,
  getProfile,
  isAuthApiError,
  getErrorMessage,
  getValidationErrors
} from '../services/auth';
import type { 
  User, 
  AuthResponse, 
  LoginRequest,
  RegisterRequest
} from '../services/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (data: LoginRequest) => Promise<{ success: boolean; error?: string; validationErrors?: Record<string, string> }>;
  register: (data: RegisterRequest) => Promise<{ success: boolean; error?: string; validationErrors?: Record<string, string> }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Token storage utilities
 * Using memory storage for security - tokens are lost on page refresh
 * In production, consider httpOnly cookies for better security
 */
class TokenStorage {
  private static token: string | null = null;

  static setToken(token: string): void {
    this.token = token;
    // Store in sessionStorage as backup for page refreshes
    // Note: In production, prefer httpOnly cookies
    try {
      sessionStorage.setItem('auth_token', token);
    } catch (error) {
      console.warn('Failed to store token in sessionStorage:', error);
    }
  }

  static getToken(): string | null {
    if (this.token) {
      return this.token;
    }
    
    // Try to recover from sessionStorage
    try {
      const storedToken = sessionStorage.getItem('auth_token');
      if (storedToken) {
        this.token = storedToken;
        return storedToken;
      }
    } catch (error) {
      console.warn('Failed to retrieve token from sessionStorage:', error);
    }
    
    return null;
  }

  static clearToken(): void {
    this.token = null;
    try {
      sessionStorage.removeItem('auth_token');
    } catch (error) {
      console.warn('Failed to clear token from sessionStorage:', error);
    }
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  /**
   * Initialize authentication state on app start
   */
  useEffect(() => {
    const initAuth = async () => {
      const token = TokenStorage.getToken();
      
      if (!token) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        // Validate token by fetching user profile
        const response = await getProfile(token);
        setAuthState({
          user: response.data.user,
          token,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch (error) {
        // Token is invalid, clear it
        TokenStorage.clearToken();
        setAuthState({
          user: null,
          token: null,
          isLoading: false,
          isAuthenticated: false,
        });
        console.warn('Token validation failed:', getErrorMessage(error));
      }
    };

    initAuth();
  }, []);

  /**
   * Login function
   */
  const login = async (data: LoginRequest): Promise<{ success: boolean; error?: string; validationErrors?: Record<string, string> }> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response: AuthResponse = await apiLogin(data);
      
      if (response.success) {
        const { user, tokens } = response.data;
        
        TokenStorage.setToken(tokens.accessToken);
        
        setAuthState({
          user,
          token: tokens.accessToken,
          isLoading: false,
          isAuthenticated: true,
        });
        
        return { success: true };
      }
      
      return { success: false, error: response.message };
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      if (isAuthApiError(error)) {
        return {
          success: false,
          error: getErrorMessage(error),
          validationErrors: getValidationErrors(error),
        };
      }
      
      return { success: false, error: getErrorMessage(error) };
    }
  };

  /**
   * Register function
   * Note: Registration does NOT auto-login, user must log in after registration
   */
  const register = async (data: RegisterRequest): Promise<{ success: boolean; error?: string; validationErrors?: Record<string, string> }> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const response: AuthResponse = await apiRegister(data);
      
      if (response.success) {
        // Registration successful - do NOT auto-login
        // User should be redirected to login page
        setAuthState(prev => ({ ...prev, isLoading: false }));
        
        return { success: true };
      }
      
      return { success: false, error: response.message };
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      if (isAuthApiError(error)) {
        return {
          success: false,
          error: getErrorMessage(error),
          validationErrors: getValidationErrors(error),
        };
      }
      
      return { success: false, error: getErrorMessage(error) };
    }
  };

  /**
   * Logout function
   */
  const logout = async (): Promise<void> => {
    const currentToken = authState.token;
    
    // Clear state immediately for better UX
    setAuthState({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
    });
    
    TokenStorage.clearToken();

    // Try to notify backend about logout
    if (currentToken) {
      try {
        await apiLogout(currentToken);
      } catch (error) {
        // Logout failed on backend, but we've already cleared local state
        console.warn('Backend logout failed:', getErrorMessage(error));
      }
    }
  };

  /**
   * Clear any errors (placeholder for future error state)
   */
  const clearError = (): void => {
    // Future implementation for error state management
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Hook to get the current authentication token
 * Useful for making authenticated API requests
 */
export function useAuthToken(): string | null {
  const { token } = useAuth();
  return token;
}