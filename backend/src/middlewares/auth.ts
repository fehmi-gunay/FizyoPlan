import { NextFunction, Request, Response } from 'express';
import { UserRole } from '../models/User';
import { verifyToken } from '../services/authService';
import { ApiError } from '../utils/ApiError';

// "Authorization: Bearer <token>" başlığını doğrular, kullanıcıyı req.user'a koyar.
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(ApiError.unauthorized());

  try {
    req.user = await verifyToken(header.slice(7));
    next();
  } catch (err) {
    next(err);
  }
}

// authenticate'ten sonra kullanılır: requireRole('admin', 'physio')
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };
}
