import { Request, Response } from 'express';
import * as authService from '../services/authService';

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body);
  res.json(result);
}

export async function me(req: Request, res: Response) {
  const user = await authService.getCurrentUser(req.user!.id);
  res.json({ user });
}

export async function changePassword(req: Request, res: Response) {
  await authService.changePassword(req.user!.id, req.body);
  res.status(204).end();
}

export async function deleteAccount(req: Request, res: Response) {
  await authService.deleteAccount(req.user!.id, req.body);
  res.status(204).end();
}
