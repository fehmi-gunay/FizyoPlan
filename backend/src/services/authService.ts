import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { User, UserRole } from '../models/User';
import { ChangePasswordInput, DeleteAccountInput, LoginInput, RegisterInput } from '../validators/auth.validators';
import { ApiError } from '../utils/ApiError';

const BCRYPT_ROUNDS = 12;
// Kullanıcı yokken de bcrypt çalışsın diye: yanıt süresinden e-postanın kayıtlı olup olmadığı anlaşılmaz
const DUMMY_HASH = bcrypt.hashSync('zamanlama-saldirisina-karsi', BCRYPT_ROUNDS);

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
  return jwt.sign({ id: user.id }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  } as SignOptions);
}

// Token yalnızca kimliği taşır; rol her istekte veritabanından okunur,
// böylece rol değişikliği veya hesap silme hemen geçerli olur.
export async function verifyToken(token: string): Promise<TokenPayload> {
  let id: unknown;
  try {
    id = (jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload).id;
  } catch {
    throw ApiError.unauthorized('Oturum geçersiz veya süresi dolmuş');
  }
  if (typeof id !== 'number') throw ApiError.unauthorized('Oturum geçersiz veya süresi dolmuş');

  const user = await User.findByPk(id, { attributes: ['id', 'role'] });
  if (!user) throw ApiError.unauthorized('Oturum geçersiz veya süresi dolmuş');
  return { id: user.id, role: user.role };
}

export async function register(input: RegisterInput) {
  const existing = await User.findOne({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('Bu e-posta ile zaten bir hesap var');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await User.create({ email: input.email, passwordHash });
  return { user: toPublicUser(user), token: signToken(user) };
}

export async function login(input: LoginInput) {
  const user = await User.findOne({ where: { email: input.email } });
  // Hangisinin yanlış olduğunu belli etmemek için tek mesaj
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw ApiError.unauthorized('E-posta veya parola hatalı');

  return { user: toPublicUser(user), token: signToken(user) };
}

export async function getCurrentUser(id: number): Promise<PublicUser> {
  const user = await User.findByPk(id);
  if (!user) throw ApiError.unauthorized('Kullanıcı bulunamadı');
  return toPublicUser(user);
}

async function verifyPassword(id: number, password: string): Promise<User> {
  const user = await User.findByPk(id);
  if (!user) throw ApiError.unauthorized('Kullanıcı bulunamadı');
  // 401 değil: oturum geçerli, yalnızca onay parolası yanlış (frontend oturumu kapatmasın)
  if (!(await bcrypt.compare(password, user.passwordHash))) throw new ApiError(403, 'INVALID_PASSWORD', 'Parola hatalı');
  return user;
}

export async function changePassword(id: number, input: ChangePasswordInput) {
  const user = await verifyPassword(id, input.currentPassword);
  await user.update({ passwordHash: await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS) });
}

// KVKK: hesap ve bağlı tüm sağlık verileri (profil, ağrı bölgeleri, planlar, geri bildirimler) silinir.
export async function deleteAccount(id: number, input: DeleteAccountInput) {
  const user = await verifyPassword(id, input.password);
  await user.destroy();
}
