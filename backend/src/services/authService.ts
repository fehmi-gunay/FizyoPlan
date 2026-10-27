import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { User, UserRole } from '../models/User';
import { LoginInput, RegisterInput } from '../validators/auth.validators';
import { ApiError } from '../utils/ApiError';

export interface PublicUser {
  id: number;
  email: string;
  role: UserRole;
}

export interface TokenPayload {
  id: number;
  role: UserRole;
}

function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, role: user.role };
}

function signToken(user: User): string {
  const payload: TokenPayload = { id: user.id, role: user.role };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    return { id: decoded.id as number, role: decoded.role as UserRole };
  } catch {
    throw ApiError.unauthorized('Oturum geçersiz veya süresi dolmuş');
  }
}

export async function register(input: RegisterInput) {
  const existing = await User.findOne({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('Bu e-posta ile zaten bir hesap var');

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await User.create({ email: input.email, passwordHash });
  return { user: toPublicUser(user), token: signToken(user) };
}

export async function login(input: LoginInput) {
  const user = await User.findOne({ where: { email: input.email } });
  // Hangisinin yanlış olduğunu belli etmemek için tek mesaj
  const ok = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || !ok) throw ApiError.unauthorized('E-posta veya parola hatalı');

  return { user: toPublicUser(user), token: signToken(user) };
}

export async function getCurrentUser(id: number): Promise<PublicUser> {
  const user = await User.findByPk(id);
  if (!user) throw ApiError.unauthorized('Kullanıcı bulunamadı');
  return toPublicUser(user);
}
