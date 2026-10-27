import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Uç bulunamadı: ${req.method} ${req.originalUrl}`));
}

// body-parser hataları (bozuk JSON, çok büyük gövde) 500 değil 4xx dönmeli
function fromBodyParser(err: unknown): ApiError | null {
  const e = err as { type?: string };
  if (e?.type === 'entity.parse.failed') return ApiError.badRequest('İstek gövdesi geçerli bir JSON değil');
  if (e?.type === 'entity.too.large') return new ApiError(413, 'PAYLOAD_TOO_LARGE', 'İstek gövdesi çok büyük');
  return null;
}

// Tüm hatalar buraya düşer ve tek formatta döner:
// { error: { code, message, details? } }
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const known = err instanceof ApiError ? err : fromBodyParser(err);
  if (known) {
    return res.status(known.statusCode).json({
      error: { code: known.code, message: known.message, details: known.details },
    });
  }

  // SQL hataları sağlık verisi içerebilir; production'da yalnızca hata adı loglanır
  if (env.NODE_ENV === 'production') console.error('Beklenmeyen hata:', (err as Error)?.name);
  else console.error(err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Beklenmeyen bir hata oluştu' },
  });
}
