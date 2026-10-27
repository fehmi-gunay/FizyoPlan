import { Request, Response } from 'express';
import * as planService from '../services/planService';
import { ApiError } from '../utils/ApiError';
import { listPlansQuerySchema, todayQuerySchema } from '../validators/plan.validators';

function planIdFrom(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Geçersiz plan id');
  return id;
}

export async function generatePlan(req: Request, res: Response) {
  const result = await planService.generatePlan(req.user!.id, req.body);
  res.status(result.outcome === 'created' ? 201 : 200).json(result);
}

export async function listPlans(req: Request, res: Response) {
  const parsed = listPlansQuerySchema.safeParse(req.query);
  if (!parsed.success) throw ApiError.badRequest('Geçersiz sorgu', parsed.error.issues);
  const plans = await planService.listPlans(req.user!.id, parsed.data);
  res.json({ plans });
}

export async function getActivePlan(req: Request, res: Response) {
  const plan = await planService.getActivePlan(req.user!.id);
  res.json({ plan });
}

export async function getToday(req: Request, res: Response) {
  const parsed = todayQuerySchema.safeParse(req.query);
  if (!parsed.success) throw ApiError.badRequest('Geçersiz sorgu', parsed.error.issues);
  const today = await planService.getToday(req.user!.id, parsed.data.day);
  res.json(today);
}

export async function getPlan(req: Request, res: Response) {
  const plan = await planService.getPlan(req.user!.id, planIdFrom(req));
  res.json({ plan });
}

export async function activatePlan(req: Request, res: Response) {
  const plan = await planService.activatePlan(req.user!.id, planIdFrom(req));
  res.json({ plan });
}

export async function reassessPlan(req: Request, res: Response) {
  const result = await planService.reassessPlan(req.user!.id, planIdFrom(req));
  res.json(result);
}
