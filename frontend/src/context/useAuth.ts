import { createContext, useContext } from 'react';
import type { User } from '../types/api';

export type Status = 'loading' | 'authenticated' | 'anonymous';

export interface AuthValue {
  user: User | null;
  status: Status;
  login(email: string, password: string): Promise<User>;
  register(email: string, password: string): Promise<User>;
  logout(): void;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return ctx;
}
