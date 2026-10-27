// Backend DTO'ları. Kaynak: backend/API.md

export type Role = 'user' | 'admin' | 'physio';
export type RegionCode = 'neck' | 'shoulder' | 'lower_back' | 'knee';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
export type PlanType = 'daily' | 'weekly';
export type PlanStatus = 'draft' | 'active' | 'suspended' | 'completed';
export type RiskLevel = 'ok' | 'risky' | 'unassessable';

export interface User {
  id: number;
  email: string;
  role: Role;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PainRegion {
  regionCode: RegionCode;
  severity: number; // 0-10
}

export interface ProfileInput {
  birthDate: string; // YYYY-MM-DD
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  redFlags: string[];
  conditions: string[];
  painRegions: PainRegion[];
}

export interface Profile extends ProfileInput {
  id: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Region {
  id: number;
  code: RegionCode;
  name: string;
}

export interface Exercise {
  id: number;
  title: string;
  description: string;
  videoUrl: string | null;
  difficulty: Difficulty;
  setsMin: number;
  setsMax: number;
  repsMin: number;
  repsMax: number;
  durationMin: number; // saniye
  durationMax: number;
  approved?: boolean;
  approvedBy?: number | null;
  regions: Region[];
  contraindications: { condition: string }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Feedback {
  id: number;
  pain: number; // 0-10
  difficulty: number; // 1-10
  createdAt: string;
}

export interface PlanItem {
  id: number;
  exerciseId: number;
  day: number;
  sets: number;
  reps: number;
  durationSec: number;
  exercise: Pick<Exercise, 'id' | 'title' | 'description' | 'videoUrl' | 'difficulty'>;
  feedback?: Feedback[];
}

export interface Plan {
  id: number;
  type: PlanType;
  status: PlanStatus;
  activatedAt: string | null;
  suspendedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: PlanItem[];
}

export type PlanSummary = Omit<Plan, 'items'> & { itemCount: number };

export type GenerateResult =
  | { outcome: 'created'; plan: Plan; rejected: { exerciseId: number; day: number; reason: string }[] }
  | { outcome: 'referral'; riskLevel: Exclude<RiskLevel, 'ok'>; reasons: string[] };

export interface TodayItem extends PlanItem {
  completed: boolean;
  todayFeedback: Feedback[];
}

export interface TodayResponse {
  plan: Pick<Plan, 'id' | 'type' | 'status' | 'activatedAt'> | null;
  day: number | null;
  items: TodayItem[];
}

export interface FeedbackResult {
  feedback: Feedback;
  planStatus: PlanStatus;
  suspended: boolean;
  message: string;
}

export type ReassessResult =
  | { canGenerate: true; message: string }
  | { canGenerate: false; riskLevel: Exclude<RiskLevel, 'ok'>; reasons: string[] };

// Uzman yönlendirme ekranına (/yonlendirme) navigate state olarak geçilir
export interface ReferralState {
  riskLevel: Exclude<RiskLevel, 'ok'>;
  reasons: string[];
}
