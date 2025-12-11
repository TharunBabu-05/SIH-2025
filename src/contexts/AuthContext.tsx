import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { apiService } from '../services/apiService';

interface User {
  id: number;
  username: string;
  role: 'engineer' | 'worker';
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isEngineer: boolean;
  isWorker: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const savedToken = apiService.getToken();
    if (savedToken) {
      verifyToken(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await apiService.verifyToken(token);
      if (response.valid) {
        setUser(response.user);
        setToken(token);
      } else {
        apiService.clearToken();
      }
    } catch (error) {
      apiService.clearToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      console.log('AuthContext: Attempting login for:', username);
      const response = await apiService.login(username, password);
      console.log('AuthContext: Login response:', response);
      setUser(response.user);
      setToken(response.token);
    } catch (error: any) {
      console.error('AuthContext: Login error:', error);
      throw new Error(error.message || 'Invalid credentials');
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user,
        isEngineer: user?.role === 'engineer',
        isWorker: user?.role === 'worker',
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
