import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Uç bulunamadı: ${req.method} ${req.originalUrl}`));
}

// Tüm hatalar buraya düşer ve tek formatta döner:
// { error: { code, message, details? } }
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  console.error(err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Beklenmeyen bir hata oluştu' },
  });
}
