import { Request, Response } from 'express';
import * as adminService from '../services/adminService';
import * as auditService from '../services/auditService';
import * as statsService from '../services/statsService';
import { ApiError } from '../utils/ApiError';
import { requestContext } from '../utils/requestContext';
import { adminExerciseQuerySchema, auditQuerySchema } from '../validators/admin.validators';

const actorOf = (req: Request): adminService.Actor => ({ id: req.user!.id, ...requestContext(req) });

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
  const exercise = await adminService.createExercise(req.body, actorOf(req));
  res.status(201).json({ exercise });
}

export async function updateExercise(req: Request, res: Response) {
  const exercise = await adminService.updateExercise(idFrom(req), req.body, actorOf(req));
  res.json({ exercise });
}

export async function approveExercise(req: Request, res: Response) {
  const exercise = await adminService.setApproval(idFrom(req), true, actorOf(req));
  res.json({ exercise });
}

export async function unapproveExercise(req: Request, res: Response) {
  const exercise = await adminService.setApproval(idFrom(req), false, actorOf(req));
  res.json({ exercise });
}

export async function listUsers(_req: Request, res: Response) {
  const users = await adminService.listUsers();
  res.json({ users });
}

export async function updateUserRole(req: Request, res: Response) {
  const user = await adminService.updateUserRole(actorOf(req), idFrom(req), req.body.role);
  res.json({ user });
}

export async function listAuditLogs(req: Request, res: Response) {
  const parsed = auditQuerySchema.safeParse(req.query);
  if (!parsed.success) throw ApiError.badRequest('Geçersiz sorgu', parsed.error.issues);
  res.json(await auditService.listLogs(parsed.data));
}

export async function getStats(_req: Request, res: Response) {
  res.json(await statsService.getStats());
}
