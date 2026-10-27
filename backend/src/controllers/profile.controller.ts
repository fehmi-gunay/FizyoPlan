import { Request, Response } from 'express';
import * as profileService from '../services/profileService';
import { ApiError } from '../utils/ApiError';
import { profileSchema } from '../validators/profile.validators';

export async function getProfile(req: Request, res: Response) {
  const profile = await profileService.getProfile(req.user!.id);
  if (!profile) throw ApiError.notFound('Sağlık profili henüz oluşturulmadı');
  res.json({ profile });
}

export async function saveProfile(req: Request, res: Response) {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) throw ApiError.badRequest('Geçersiz profil verisi', parsed.error.issues);
  const profile = await profileService.saveProfile(req.user!.id, parsed.data);
  res.json({ profile });
}
