import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, tokenStore, UNAUTHORIZED_EVENT } from '../api/client';
import type { AuthResponse, User } from '../types/api';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthValue {
  user: User | null;
  status: Status;
  login(email: string, password: string): Promise<User>;
  register(email: string, password: string): Promise<User>;
  logout(): void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>(() => (tokenStore.get() ? 'loading' : 'anonymous'));

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus('anonymous');
    queryClient.clear(); // başka kullanıcının verisi önbellekte kalmasın
  }, [queryClient]);

  // Sayfa yenilenince kayıtlı token ile oturumu geri yükle
  useEffect(() => {
    if (!tokenStore.get()) return;
    api<{ user: User }>('/auth/me')
      .then(({ user }) => {
        setUser(user);
        setStatus('authenticated');
      })
      .catch((err) => {
        // Yalnızca 401'de oturum kapanır (client UNAUTHORIZED_EVENT ile tetikler). Sunucu geçici olarak
        // ulaşılamazsa token silinmez; kullanıcı giriş ekranını görür, sayfa yenilenince oturum geri gelir.
        if (err instanceof ApiError && err.status === 401) logout();
        else setStatus('anonymous');
      });
  }, [logout]);

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  const handleAuth = useCallback((res: AuthResponse) => {
    tokenStore.set(res.token);
    setUser(res.user);
    setStatus('authenticated');
    return res.user;
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      status,
      login: (email, password) => api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }).then(handleAuth),
      register: (email, password) =>
        api<AuthResponse>('/auth/register', { method: 'POST', body: { email, password } }).then(handleAuth),
      logout,
    }),
    [user, status, handleAuth, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return ctx;
}
