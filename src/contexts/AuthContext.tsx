import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

interface User {
  id: number;
  discord_id: string;
  username: string;
  discriminator: string;
  avatar: string;
  roles: Array<{ id: string; name: string }>;
  is_admin: boolean;
  is_hub_banned?: boolean;
  hub_ban_reason?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      console.log('?? AuthContext: Fetching user...');
      console.log('?? Current cookies:', document.cookie);
      
      const userData = await authAPI.getCurrentUser();
      console.log('? AuthContext: User fetched successfully:', { id: userData.id, username: userData.username });
      setUser(userData);
    } catch (error: any) {
      console.error('? AuthContext: Failed to fetch user:', error);
      console.log('?? Cookies during error:', document.cookie);
      
      // Handle hub ban specifically
      if (error.response?.status === 403 && error.response?.data?.error === 'Hub banned') {
        console.log('?? User is hub banned, redirecting to login with error');
        setUser(null);
        window.location.href = `/login?error=hub_banned&reason=${encodeURIComponent(error.response.data.reason || 'You have been banned from the hub.')}`;
        return;
      }
      
      // CRITICAL: Only clear user if it's actually an auth error
      if (error.response?.status === 401) {
        console.log('?? AuthContext: User not authenticated, clearing user state');
        setUser(null);
      } else {
        console.warn('?? AuthContext: Network or other error, keeping current user state');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('?? AuthContext: Logging out...');
      await authAPI.logout();
      setUser(null);
      console.log('? AuthContext: Logout successful');
    } catch (error) {
      console.error('? AuthContext: Logout failed:', error);
      // Even if logout fails on server, clear local state
      setUser(null);
    }
  };

  const refreshUser = async () => {
    console.log('?? AuthContext: Refreshing user...');
    await fetchUser();
  };

  useEffect(() => {
    console.log('?? AuthContext: Initializing...');
    console.log('?? Initial cookies:', document.cookie);
    
    // CRITICAL: Check for auth success parameter
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth');
    
    if (authSuccess === 'success') {
      console.log('?? AuthContext: Auth success detected, waiting for session to establish...');
      // Wait longer for session to be fully established across domains
      setTimeout(() => {
        console.log('?? AuthContext: Attempting to fetch user after auth success...');
        fetchUser();
      }, 2000); // Increased delay for cross-domain session establishment
    } else {
      fetchUser();
    }
  }, []);

  const value = {
    user,
    loading,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};