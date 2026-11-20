import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { clientLogin, clientSignup, trainerLogin, trainerSignup } from '@/api/auth';

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  specialization?: string;
  profileImage?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  userType: 'client' | 'trainer' | null;
  isLoading: boolean;
  login: (email: string, password: string, type: 'client' | 'trainer') => Promise<void>;
  signup: (userData: any, type: 'client' | 'trainer') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const clearStoredSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userType');
};

// Reads the expiry time (in ms) from a login token. The server still verifies the
// token on every request; this only lets the UI notice that a session has ended.
const getTokenExpiry = (token: string): number | null => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
};

const isTokenExpired = (token: string) => {
  const expiry = getTokenExpiry(token);
  return expiry !== null && expiry <= Date.now();
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userType, setUserType] = useState<'client' | 'trainer' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on app start
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedUserType = localStorage.getItem('userType');

    try {
      const validType = storedUserType === 'client' || storedUserType === 'trainer';
      if (storedToken && storedUser && validType && !isTokenExpired(storedToken)) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        setUserType(storedUserType);
      } else {
        // Missing, expired or incomplete session: start logged out
        clearStoredSession();
      }
    } catch {
      clearStoredSession();
    }
    setIsLoading(false);
  }, []);

  // Login function
  const login = async (email: string, password: string, type: 'client' | 'trainer') => {
    try {
      setIsLoading(true);
      
      let response;
      if (type === 'client') {
        response = await clientLogin({ email, password });
        setUser(response.user);
      } else {
        response = await trainerLogin({ email, password });
        setUser(response.trainer);
      }

      // Store in state and localStorage
      setToken(response.token);
      setUserType(type);
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(type === 'client' ? response.user : response.trainer));
      localStorage.setItem('userType', type);
      
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  // Signup function
  const signup = async (userData: any, type: 'client' | 'trainer') => {
    try {
      setIsLoading(true);
      
      if (type === 'client') {
        await clientSignup(userData);
      } else {
        await trainerSignup(userData);
      }
      
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      throw new Error(error.response?.data?.message || 'Signup failed');
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setToken(null);
    setUserType(null);
    clearStoredSession();
  };

  // Log out when the token runs out, or when the API rejects it (see api/axios.js)
  useEffect(() => {
    if (!token) return;

    const expiry = getTokenExpiry(token);
    const timer =
      expiry === null
        ? undefined
        : window.setTimeout(logout, Math.min(Math.max(expiry - Date.now(), 0), 2_000_000_000));

    window.addEventListener('auth:unauthorized', logout);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('auth:unauthorized', logout);
    };
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, userType, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};