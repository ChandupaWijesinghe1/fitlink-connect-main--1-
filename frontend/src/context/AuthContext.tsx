import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { clientLogin, clientSignup, trainerLogin, trainerSignup } from '@/api/auth';

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  specialization?: string;
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

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setUserType(storedUserType as 'client' | 'trainer');
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
  };

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