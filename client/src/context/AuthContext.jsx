import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { tokenStore } from '../services/api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setPermissions(data.permissions);
    } catch {
      setUser(null);
      setPermissions(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // restore the session on page load
  useEffect(() => {
    if (tokenStore.getAccess() || tokenStore.getRefresh()) loadMe();
    else setLoading(false);
  }, [loadMe]);

  // axios interceptor fires this when the refresh token fails
  useEffect(() => {
    const onForcedLogout = () => {
      setUser(null);
      setPermissions(null);
    };
    window.addEventListener('auth:logout', onForcedLogout);
    return () => window.removeEventListener('auth:logout', onForcedLogout);
  }, []);

  const login = async (email, password, remember) => {
    const { data } = await api.post('/auth/login', { email, password });
    tokenStore.set(data, remember);
    const me = await api.get('/auth/me');
    setUser(me.data.user);
    setPermissions(me.data.permissions);
    return me.data.user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', { refreshToken: tokenStore.getRefresh() });
    } catch {
      /* ignore – we clear local state regardless */
    }
    tokenStore.clear();
    setUser(null);
    setPermissions(null);
  };

  // UI-only convenience; the real enforcement happens in the API middleware
  const can = useCallback((module, action = 'read') => !!permissions?.[module]?.[action], [permissions]);

  const value = useMemo(() => ({ user, permissions, loading, login, logout, can }), [user, permissions, loading, can]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
