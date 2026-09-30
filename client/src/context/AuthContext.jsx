import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, setAccessToken, clearSession } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [ready, setReady] = useState(false);

  const loadMe = useCallback(async () => {
    try {
      const { user: u, subscription: s } = await auth.me();
      setUser(u);
      setSubscription(s);
      return true;
    } catch {
      return false;
    }
  }, []);

  // On first paint, restore the session from the stored refresh token. The access
  // token is never persisted — a fresh one is minted here on every load.
  useEffect(() => {
    (async () => {
      const ok = await auth.bootstrap();
      if (ok) await loadMe();
      setReady(true);
    })();
  }, [loadMe]);

  const login = useCallback(
    async (payload) => {
      const data = await auth.login(payload);
      setAccessToken(data.accessToken);
      setUser(data.user);
      await loadMe();
      return data;
    },
    [loadMe]
  );

  const register = useCallback(
    async (payload) => {
      const data = await auth.register(payload);
      setAccessToken(data.accessToken);
      setUser(data.user);
      await loadMe();
      return data;
    },
    [loadMe]
  );

  const logout = useCallback(async () => {
    await auth.logout();
    clearSession();
    setUser(null);
    setSubscription(null);
  }, []);

  const refreshEntitlement = useCallback(async () => {
    await loadMe();
  }, [loadMe]);

  const value = {
    user,
    subscription,
    entitled: Boolean(subscription?.entitled),
    ready,
    login,
    register,
    logout,
    refreshEntitlement,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
