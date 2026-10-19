import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  // Restore the session from a stored token on first load.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api('/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const authenticate = useCallback(async (path, body) => {
    const { token, user } = await api(path, { method: 'POST', body });
    tokenStore.set(token);
    setUser(user);
    return user;
  }, []);

  const syncUser = useCallback((updatedUser) => {
    setUser((current) =>
      current?.id === updatedUser.id ? updatedUser : current
    );
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login: (email, password) => authenticate('/auth/login', { email, password }),
      register: (name, email, phone, password) => authenticate('/auth/register', { name, email, phone, password }),
      updateProfile: async (profile) => {
        const { user } = await api('/auth/profile', { method: 'PATCH', body: profile });
        setUser(user);
        return user;
      },
      syncUser,
      logout: () => {
        tokenStore.clear();
        setUser(null);
      },
    }),
    [user, loading, authenticate, syncUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
