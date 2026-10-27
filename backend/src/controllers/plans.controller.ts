import { Request, Response } from 'express';
import * as planService from '../services/planService';
import { ApiError } from '../utils/ApiError';

function planIdFrom(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Geçersiz plan id');
  return id;
}

export async function generatePlan(req: Request, res: Response) {
  const result = await planService.generatePlan(req.user!.id, req.body);
  res.status(result.outcome === 'created' ? 201 : 200).json(result);
}

export async function getPlan(req: Request, res: Response) {
  const plan = await planService.getPlan(req.user!.id, planIdFrom(req));
  res.json({ plan });
}

export async function activatePlan(req: Request, res: Response) {
  const plan = await planService.activatePlan(req.user!.id, planIdFrom(req));
  res.json({ plan });
}
