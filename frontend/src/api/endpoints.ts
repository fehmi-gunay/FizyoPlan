import type {
  Exercise,
  FeedbackResult,
  GenerateResult,
  Plan,
  PlanStatus,
  PlanSummary,
  PlanType,
  Profile,
  ProfileInput,
  ReassessResult,
  Region,
  TodayResponse,
  User,
} from '../types/api';
import { api } from './client';

// Kullanıcı tarafı uçlar (admin uçları: api/admin.ts). Ayrıntı: backend/API.md

// React Query anahtarları – geçersiz kılma (invalidate) için tek kaynak
export const qk = {
  profile: ['profile'] as const,
  regions: ['regions'] as const,
  plans: ['plans'] as const, // tüm plan sorgularının öneki
  planList: (filters: object = {}) => ['plans', 'list', filters] as const,
  activePlan: ['plans', 'active'] as const,
  today: (day?: number) => ['plans', 'today', day ?? 'auto'] as const,
  plan: (id: number) => ['plans', 'detail', id] as const,
  exercise: (id: number) => ['exercise', id] as const,
};

// Profil yoksa backend 404 döner; burada null'a çevrilir
export async function getProfile(): Promise<Profile | null> {
  try {
    return (await api<{ profile: Profile }>('/profile')).profile;
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

export const saveProfile = (input: ProfileInput) =>
  api<{ profile: Profile }>('/profile', { method: 'PUT', body: input }).then((r) => r.profile);

export const getRegions = () => api<{ regions: Region[] }>('/regions').then((r) => r.regions);

export const getExercise = (id: number) => api<{ exercise: Exercise }>(`/exercises/${id}`).then((r) => r.exercise);

export const generatePlan = (type: PlanType) => api<GenerateResult>('/plans/generate', { method: 'POST', body: { type } });

export function listPlans(filters: { status?: PlanStatus; type?: PlanType } = {}) {
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString();
  return api<{ plans: PlanSummary[] }>(`/plans${qs ? `?${qs}` : ''}`).then((r) => r.plans);
}

export const getActivePlan = () => api<{ plan: Plan | null }>('/plans/active').then((r) => r.plan);

export const getToday = (day?: number) => api<TodayResponse>(`/plans/active/today${day ? `?day=${day}` : ''}`);

export const getPlan = (id: number) => api<{ plan: Plan }>(`/plans/${id}`).then((r) => r.plan);

export const activatePlan = (id: number) => api<{ plan: Plan }>(`/plans/${id}/activate`, { method: 'POST' }).then((r) => r.plan);

export const reassessPlan = (id: number) => api<ReassessResult>(`/plans/${id}/reassess`, { method: 'POST' });

export const sendFeedback = (planItemId: number, body: { pain: number; difficulty: number }) =>
  api<FeedbackResult>(`/plan-items/${planItemId}/feedback`, { method: 'POST', body });

export const changePassword = (body: { currentPassword: string; newPassword: string }) =>
  api<void>('/auth/password', { method: 'PUT', body });

export const deleteAccount = (password: string) => api<void>('/auth/me', { method: 'DELETE', body: { password } });

export const getMe = () => api<{ user: User }>('/auth/me').then((r) => r.user);
