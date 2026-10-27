import { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';
import { ApiError } from '../utils/ApiError';

// İstek gövdesini zod şemasıyla doğrular; başarılıysa temizlenmiş veriyi req.body'ye yazar.
export function validate(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      return next(ApiError.badRequest('Geçersiz istek verisi', details));
    }
    req.body = result.data;
    next();
  };
}
