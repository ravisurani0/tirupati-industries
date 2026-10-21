import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, getAuthToken, setAuthSession, clearAuthSession } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await authApi.getMe();
        setUser(data.user);
        setAuthSession(token, data.user);
      } catch (err) {
        clearAuthSession();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (username, password) => {
    const data = await authApi.login(username, password);
    setAuthSession(data.token, data.user);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    authApi.logout();
    clearAuthSession();
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
