import { Request, Response } from 'express';
import * as authService from '../services/authService';
import { requestContext } from '../utils/requestContext';

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body, requestContext(req));
  res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body, requestContext(req));
  res.json(result);
}

export async function me(req: Request, res: Response) {
  const user = await authService.getCurrentUser(req.user!.id);
  res.json({ user });
}

export async function changePassword(req: Request, res: Response) {
  await authService.changePassword(req.user!.id, req.body, requestContext(req));
  res.status(204).end();
}

export async function deleteAccount(req: Request, res: Response) {
  await authService.deleteAccount(req.user!.id, req.body, requestContext(req));
  res.status(204).end();
}
