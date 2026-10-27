import { Request } from 'express';
import type { RequestContext } from '../services/auditService';

// Aktivite kaydı için istek bilgisi (IP + tarayıcı)
export function requestContext(req: Request): RequestContext {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}
