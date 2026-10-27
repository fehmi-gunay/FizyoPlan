import { Request, Response } from 'express';
import * as adminService from '../services/adminService';
import { ApiError } from '../utils/ApiError';
import { adminExerciseQuerySchema } from '../validators/admin.validators';

function idFrom(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Geçersiz id');
  return id;
}

export async function listExercises(req: Request, res: Response) {
  const parsed = adminExerciseQuerySchema.safeParse(req.query);
  if (!parsed.success) throw ApiError.badRequest('Geçersiz sorgu', parsed.error.issues);
  const exercises = await adminService.listExercises(parsed.data);
  res.json({ exercises });
}

export async function createExercise(req: Request, res: Response) {
  const exercise = await adminService.createExercise(req.body);
  res.status(201).json({ exercise });
}

export async function updateExercise(req: Request, res: Response) {
  const exercise = await adminService.updateExercise(idFrom(req), req.body);
  res.json({ exercise });
}

export async function approveExercise(req: Request, res: Response) {
  const exercise = await adminService.setApproval(idFrom(req), true, req.user!.id);
  res.json({ exercise });
}

export async function unapproveExercise(req: Request, res: Response) {
  const exercise = await adminService.setApproval(idFrom(req), false, req.user!.id);
  res.json({ exercise });
}

export async function listUsers(_req: Request, res: Response) {
  const users = await adminService.listUsers();
  res.json({ users });
}

export async function updateUserRole(req: Request, res: Response) {
  const user = await adminService.updateUserRole(req.user!.id, idFrom(req), req.body.role);
  res.json({ user });
}
