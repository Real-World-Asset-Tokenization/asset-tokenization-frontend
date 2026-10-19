import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';
import { resolveUserWallet } from '../lib/walletResolver';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check for stored user data on mount
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const resolved = resolveUserWallet(parsed);
        if (resolved) {
          parsed.walletAddress = resolved;
        }
        setUser(parsed);
        localStorage.setItem('user', JSON.stringify(parsed));

        // Refresh user profile from backend (reads authoritative walletAddress from DB)
        if (parsed.token) {
          authAPI.getMe().then((res) => {
            if (res.data?.data?.user) {
              const fresh = { ...parsed, ...res.data.data.user };
              const freshResolved = resolveUserWallet(fresh);
              if (freshResolved) {
                fresh.walletAddress = freshResolved;
              }
              setUser(fresh);
              localStorage.setItem('user', JSON.stringify(fresh));
            }
          }).catch((e) => console.warn('Could not refresh user profile:', e.message));
        }
      } catch (e) {
        console.warn('Error reading stored user:', e);
      }
    }
  }, []);

  const login = (userData) => {
    const resolved = resolveUserWallet(userData);
    if (resolved) {
      userData.walletAddress = resolved;
    }
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userData.token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const updateUserWallet = (walletAddress) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, walletAddress: walletAddress ? walletAddress.toLowerCase().trim() : null };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const linkWallet = async (walletAddress) => {
    const normalized = (walletAddress || '').toLowerCase().trim();
    const res = await authAPI.updateWallet(normalized);
    const serverWallet = res.data?.data?.user?.walletAddress || normalized;
    updateUserWallet(serverWallet);
    return res.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateUserWallet,
        linkWallet,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
