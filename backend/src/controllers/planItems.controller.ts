import { Request, Response } from 'express';
import * as feedbackService from '../services/feedbackService';
import { ApiError } from '../utils/ApiError';

export async function submitFeedback(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Geçersiz plan kalemi id');
  const result = await feedbackService.submitFeedback(req.user!.id, id, req.body);
  res.status(201).json(result);
}
