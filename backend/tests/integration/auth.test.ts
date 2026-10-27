import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HealthProfile, Plan, UserPainRegion } from '../../src/models';
import { api, auth, closeDb, createUser, PASSWORD, resetDb, saveProfile } from '../helpers';

beforeAll(resetDb);
afterAll(closeDb);

describe('GET /api/health', () => {
  it('sunucu ve veritabanı ayakta', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
  });
});

describe('genel hata davranışı', () => {
  it('bilinmeyen uç → 404 NOT_FOUND', async () => {
    const res = await api().get('/api/yok-boyle-bir-uc');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('bozuk JSON → 400 BAD_REQUEST', async () => {
    const res = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('100kb üstü gövde → 413 PAYLOAD_TOO_LARGE', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'a@b.com', password: 'x'.repeat(150_000) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});

describe('kayıt / giriş', () => {
  const email = 'Ayse@Test.com';

  it('kayıt 201 + token döner, e-posta küçük harfe çevrilir, parola hash dönmez', async () => {
    const res = await api().post('/api/auth/register').send({ email, password: PASSWORD });
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: 'ayse@test.com', role: 'user' });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('aynı e-posta ile tekrar kayıt → 409', async () => {
    const res = await api().post('/api/auth/register').send({ email: 'ayse@test.com', password: PASSWORD });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it.each([
    ['kısa parola', { email: 'k1@test.com', password: 'abc12' }],
    ['rakamsız parola', { email: 'k2@test.com', password: 'sadeceharf' }],
    ['harfsiz parola', { email: 'k3@test.com', password: '12345678' }],
    ['geçersiz e-posta', { email: 'eposta-degil', password: PASSWORD }],
  ])('geçersiz kayıt → 400 (%s)', async (_n, body) => {
    const res = await api().post('/api/auth/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('doğru bilgilerle giriş 200', async () => {
    const res = await api().post('/api/auth/login').send({ email, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('yanlış parola ve olmayan kullanıcı aynı 401 hatasını alır', async () => {
    const wrong = await api().post('/api/auth/login').send({ email, password: 'yanlis1234' });
    const missing = await api().post('/api/auth/login').send({ email: 'yok@test.com', password: PASSWORD });
    expect(wrong.status).toBe(401);
    expect(missing.status).toBe(401);
    expect(wrong.body.error.message).toBe(missing.body.error.message);
  });
});

describe('GET /api/auth/me', () => {
  it('token ile kullanıcıyı döner', async () => {
    const u = await createUser();
    const res = await api().get('/api/auth/me').set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: u.id, email: u.email, role: 'user' });
  });

  it('tokensiz → 401, geçersiz token → 401', async () => {
    expect((await api().get('/api/auth/me')).status).toBe(401);
    expect((await api().get('/api/auth/me').set(auth('bozuk.token.degeri'))).status).toBe(401);
  });

  it('rol DB den okunur: rol değişince aynı token yeni rolü taşır', async () => {
    const u = await createUser('physio');
    const res = await api().get('/api/auth/me').set(auth(u.token));
    expect(res.body.user.role).toBe('physio');
  });
});

describe('PUT /api/auth/password', () => {
  it('doğru mevcut parola ile değişir → 204, yeni parolayla giriş yapılır', async () => {
    const u = await createUser();
    const res = await api().put('/api/auth/password').set(auth(u.token)).send({ currentPassword: PASSWORD, newPassword: 'yeniParola99' });
    expect(res.status).toBe(204);
    expect((await api().post('/api/auth/login').send({ email: u.email, password: PASSWORD })).status).toBe(401);
    expect((await api().post('/api/auth/login').send({ email: u.email, password: 'yeniParola99' })).status).toBe(200);
  });

  it('yanlış mevcut parola → 403 INVALID_PASSWORD', async () => {
    const u = await createUser();
    const res = await api().put('/api/auth/password').set(auth(u.token)).send({ currentPassword: 'yanlis1234', newPassword: 'yeniParola99' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INVALID_PASSWORD');
  });

  it('zayıf yeni parola → 400', async () => {
    const u = await createUser();
    const res = await api().put('/api/auth/password').set(auth(u.token)).send({ currentPassword: PASSWORD, newPassword: 'kisa' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/auth/me (hesap silme, KVKK)', () => {
  it('yanlış onay parolası → 403 INVALID_PASSWORD, hesap durur', async () => {
    const u = await createUser();
    const res = await api().delete('/api/auth/me').set(auth(u.token)).send({ password: 'yanlis1234' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INVALID_PASSWORD');
    expect((await api().get('/api/auth/me').set(auth(u.token))).status).toBe(200);
  });

  it('hesap ve tüm sağlık verisi silinir; eski token 401 alır', async () => {
    const u = await createUser();
    expect((await saveProfile(u.token)).status).toBe(200);
    const gen = await api().post('/api/plans/generate').set(auth(u.token)).send({ type: 'daily' });
    expect(gen.status).toBe(201);

    const res = await api().delete('/api/auth/me').set(auth(u.token)).send({ password: PASSWORD });
    expect(res.status).toBe(204);

    expect((await api().get('/api/auth/me').set(auth(u.token))).status).toBe(401);
    expect(await HealthProfile.count({ where: { userId: u.id } })).toBe(0);
    expect(await UserPainRegion.count({ where: { userId: u.id } })).toBe(0);
    expect(await Plan.count({ where: { userId: u.id } })).toBe(0);
  });
});
