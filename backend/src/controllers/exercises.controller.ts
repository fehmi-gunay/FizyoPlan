import { Request, Response } from 'express';
import * as exerciseService from '../services/exerciseService';
import { ApiError } from '../utils/ApiError';
import { exerciseQuerySchema } from '../validators/profile.validators';

export async function listExercises(req: Request, res: Response) {
  const parsed = exerciseQuerySchema.safeParse(req.query);
  if (!parsed.success) throw ApiError.badRequest('Geçersiz sorgu', parsed.error.issues);
  const exercises = await exerciseService.listExercises(parsed.data);
  res.json({ exercises });
}

export async function getExercise(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Geçersiz egzersiz id');
  const exercise = await exerciseService.getExercise(id);
  if (!exercise) throw ApiError.notFound('Egzersiz bulunamadı');
  res.json({ exercise });
}
