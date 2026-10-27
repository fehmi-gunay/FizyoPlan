import type { Difficulty, Exercise, RegionCode, Role } from '../types/api';
import { api } from './client';

// Yönetim paneli uçları (backend/API.md → Admin / uzman)

export type AuditAction =
  | 'login_success'
  | 'login_failed'
  | 'register'
  | 'password_change'
  | 'account_delete'
  | 'role_change'
  | 'exercise_create'
  | 'exercise_update'
  | 'exercise_approve'
  | 'exercise_unapprove';

export interface AuditLog {
  id: number;
  action: AuditAction;
  email: string | null;
  userId: number | null;
  ip: string | null;
  userAgent: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  user: { id: number; email: string; role: Role } | null;
}

export interface AuditPage {
  logs: AuditLog[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AuditFilters {
  action?: AuditAction;
  email?: string;
  from?: string; // YYYY-MM-DD
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminStats {
  users: { total: number; byRole: Record<Role, number>; newLast7Days: number };
  profiles: { total: number };
  plans: { byStatus: { draft: number; active: number; suspended: number; completed: number } };
  feedback: { last7Days: number; suspensionsLast7Days: number };
  exercises: { approved: number; pending: number };
  logins: { successLast7Days: number; failedLast7Days: number; last24h: number };
}

export interface AdminUser {
  id: number;
  email: string;
  role: Role;
  createdAt: string;
}

export interface ExerciseInput {
  title: string;
  description: string;
  videoUrl?: string | null;
  difficulty: Difficulty;
  setsMin: number;
  setsMax: number;
  repsMin: number;
  repsMax: number;
  durationMin: number;
  durationMax: number;
  regionCodes: RegionCode[];
  contraindications: string[];
}

export interface AdminExerciseFilters {
  approved?: boolean;
  region?: RegionCode;
}

export const adminKeys = {
  all: ['admin'] as const,
  stats: ['admin', 'stats'] as const,
  exercises: (filters: AdminExerciseFilters = {}) => ['admin', 'exercises', filters] as const,
  exercisesAll: ['admin', 'exercises'] as const,
  exercise: (id: number) => ['admin', 'exercise', id] as const,
  users: ['admin', 'users'] as const,
  logs: (filters: AuditFilters = {}) => ['admin', 'logs', filters] as const,
};

function query(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const getStats = () => api<AdminStats>('/admin/stats');

export const getAuditLogs = (filters: AuditFilters = {}) => api<AuditPage>(`/admin/audit-logs${query({ ...filters })}`);

export const listAdminExercises = (filters: AdminExerciseFilters = {}) =>
  api<{ exercises: Exercise[] }>(`/admin/exercises${query({ ...filters })}`).then((r) => r.exercises);

// Tek egzersiz ucu yok; listeden bulunur (kütüphane küçük)
export const getAdminExercise = async (id: number) => {
  const found = (await listAdminExercises()).find((e) => e.id === id);
  if (!found) throw new Error('Egzersiz bulunamadı');
  return found;
};

export const createExercise = (input: ExerciseInput) =>
  api<{ exercise: Exercise }>('/admin/exercises', { method: 'POST', body: input }).then((r) => r.exercise);

export const updateExercise = (id: number, input: Partial<ExerciseInput>) =>
  api<{ exercise: Exercise }>(`/admin/exercises/${id}`, { method: 'PUT', body: input }).then((r) => r.exercise);

export const setExerciseApproval = (id: number, approved: boolean) =>
  api<{ exercise: Exercise }>(`/admin/exercises/${id}/${approved ? 'approve' : 'unapprove'}`, { method: 'POST' }).then(
    (r) => r.exercise,
  );

export const listUsers = () => api<{ users: AdminUser[] }>('/admin/users').then((r) => r.users);

export const updateUserRole = (id: number, role: Role) =>
  api<{ user: AdminUser }>(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } }).then((r) => r.user);

export const AUDIT_ACTION_LABELS: Record<AuditAction, { label: string; tone?: 'primary' | 'success' | 'warning' | 'danger' }> = {
  login_success: { label: 'Başarılı giriş', tone: 'success' },
  login_failed: { label: 'Başarısız giriş', tone: 'danger' },
  register: { label: 'Kayıt', tone: 'primary' },
  password_change: { label: 'Parola değişikliği', tone: 'warning' },
  account_delete: { label: 'Hesap silme', tone: 'warning' },
  role_change: { label: 'Rol değişikliği', tone: 'warning' },
  exercise_create: { label: 'Egzersiz eklendi' },
  exercise_update: { label: 'Egzersiz düzenlendi' },
  exercise_approve: { label: 'Egzersiz onaylandı', tone: 'success' },
  exercise_unapprove: { label: 'Onay kaldırıldı', tone: 'warning' },
};

// User-Agent'tan kısa özet: "Chrome · Windows"
export function summarizeUserAgent(ua: string | null): string {
  if (!ua) return '–';
  const browser =
    /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : null;
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad/.test(ua)
        ? 'iOS'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : null;
  if (!browser && !os) return ua.slice(0, 40);
  return [browser, os].filter(Boolean).join(' · ');
}
