import { UserRole } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; role: UserRole };
    }
  }
}

export {};
