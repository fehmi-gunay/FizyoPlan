import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuditLog } from '../../src/models';
import { api, auth, closeDb, createUser, PASSWORD, resetDb, saveProfile } from '../helpers';

let admin: Awaited<ReturnType<typeof createUser>>;
let physio: Awaited<ReturnType<typeof createUser>>;

beforeAll(async () => {
  await resetDb();
  admin = await createUser('admin');
  physio = await createUser('physio');
});
afterAll(closeDb);

const logs = (token: string, query = '') => api().get(`/api/admin/audit-logs${query}`).set(auth(token));
const login = (email: string, password: string) =>
  api().post('/api/auth/login').set('User-Agent', 'vitest-agent').send({ email, password });

describe('aktivite kaydı oluşturma', () => {
  it('kayıt, başarılı ve başarısız giriş kaydedilir (IP + tarayıcı ile)', async () => {
    const u = await createUser();
    expect((await login(u.email, 'yanlisParola1')).status).toBe(401);
    expect((await login(u.email, PASSWORD)).status).toBe(200);

    const rows = await AuditLog.findAll({ where: { email: u.email }, order: [['id', 'ASC']] });
    expect(rows.map((r) => r.action)).toEqual(['register', 'login_failed', 'login_success']);
    expect(rows[2].userId).toBe(u.id);
    expect(rows[2].userAgent).toBe('vitest-agent');
    expect(rows[2].ip).toBeTruthy();
  });

  it('kayıtlı olmayan e-postayla deneme de kaydedilir (userId boş)', async () => {
    await login('olmayan@test.com', 'herhangi1');
    const row = await AuditLog.findOne({ where: { email: 'olmayan@test.com' } });
    expect(row?.action).toBe('login_failed');
    expect(row?.userId).toBeNull();
  });

  it('parola değişikliği, rol değişikliği ve egzersiz işlemleri kaydedilir', async () => {
    const u = await createUser();
    await api().put('/api/auth/password').set(auth(u.token)).send({ currentPassword: PASSWORD, newPassword: 'yeniParola99' });
    await api().patch(`/api/admin/users/${u.id}/role`).set(auth(admin.token)).send({ role: 'physio' });

    const created = await api()
      .post('/api/admin/exercises')
      .set(auth(physio.token))
      .send({
        title: 'Kayıt Testi',
        description: 'Aktivite kaydı testi.',
        difficulty: 'easy',
        setsMin: 1,
        setsMax: 2,
        repsMin: 5,
        repsMax: 10,
        durationMin: 5,
        durationMax: 10,
        regionCodes: ['neck'],
      });
    const exId = created.body.exercise.id;
    await api().put(`/api/admin/exercises/${exId}`).set(auth(physio.token)).send({ title: 'Kayıt Testi 2' });
    await api().post(`/api/admin/exercises/${exId}/approve`).set(auth(physio.token));
    await api().post(`/api/admin/exercises/${exId}/unapprove`).set(auth(physio.token));

    expect(await AuditLog.count({ where: { action: 'password_change', userId: u.id } })).toBe(1);
    const role = await AuditLog.findOne({ where: { action: 'role_change', userId: admin.id } });
    expect(role?.meta).toMatchObject({ targetUserId: u.id, previousRole: 'user', role: 'physio' });
    for (const action of ['exercise_create', 'exercise_update', 'exercise_approve', 'exercise_unapprove'] as const) {
      const row = await AuditLog.findOne({ where: { action, userId: physio.id } });
      expect(row?.meta).toMatchObject({ exerciseId: exId });
    }
  });

  it('hesap silinince eski kayıtlarda e-posta ve kullanıcı bağı kalmaz', async () => {
    const u = await createUser();
    await login(u.email, PASSWORD);
    expect((await api().delete('/api/auth/me').set(auth(u.token)).send({ password: PASSWORD })).status).toBe(204);

    expect(await AuditLog.count({ where: { email: u.email } })).toBe(0);
    expect(await AuditLog.count({ where: { userId: u.id } })).toBe(0);
    const del = await AuditLog.findOne({ where: { action: 'account_delete' }, order: [['id', 'DESC']] });
    expect(del?.email).toBeNull();
    expect(del?.userId).toBeNull();
  });
});

describe('GET /api/admin/audit-logs', () => {
  it('yalnız admin erişir', async () => {
    const u = await createUser();
    expect((await logs(physio.token)).status).toBe(403);
    expect((await logs(u.token)).status).toBe(403);
    expect((await api().get('/api/admin/audit-logs')).status).toBe(401);
  });

  it('yeniden eskiye sıralı, kullanıcı bilgisiyle döner', async () => {
    const res = await logs(admin.token);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, pageSize: 25 });
    expect(res.body.total).toBeGreaterThan(0);
    const ids = res.body.logs.map((l: { id: number }) => l.id);
    expect([...ids].sort((a, b) => b - a)).toEqual(ids);
    const withUser = res.body.logs.find((l: { user: unknown }) => l.user);
    expect(Object.keys(withUser.user).sort()).toEqual(['email', 'id', 'role']);
  });

  it('işlem, kullanıcı ve e-posta filtresi', async () => {
    const failed = await logs(admin.token, '?action=login_failed');
    expect(failed.body.logs.length).toBeGreaterThan(0);
    expect(failed.body.logs.every((l: { action: string }) => l.action === 'login_failed')).toBe(true);

    const byUser = await logs(admin.token, `?userId=${physio.id}`);
    expect(byUser.body.logs.every((l: { userId: number }) => l.userId === physio.id)).toBe(true);

    const byEmail = await logs(admin.token, '?email=olmayan@');
    expect(byEmail.body.total).toBe(1);
  });

  it('sayfalama: toplam sabit, sayfalar çakışmaz', async () => {
    const p1 = await logs(admin.token, '?pageSize=2&page=1');
    const p2 = await logs(admin.token, '?pageSize=2&page=2');
    expect(p1.body.logs).toHaveLength(2);
    expect(p1.body.total).toBe(p2.body.total);
    const ids1 = p1.body.logs.map((l: { id: number }) => l.id);
    expect(p2.body.logs.some((l: { id: number }) => ids1.includes(l.id))).toBe(false);
  });

  it('tarih aralığı filtresi ve geçersiz sorgular', async () => {
    expect((await logs(admin.token, '?from=2000-01-01&to=2000-01-02')).body.total).toBe(0);
    const today = new Date().toISOString().slice(0, 10);
    expect((await logs(admin.token, `?from=${today}`)).body.total).toBeGreaterThan(0);
    expect((await logs(admin.token, '?from=gecersiz')).status).toBe(400);
    expect((await logs(admin.token, '?pageSize=500')).status).toBe(400);
    expect((await logs(admin.token, '?action=yok')).status).toBe(400);
  });
});

describe('GET /api/admin/stats', () => {
  it('admin ve physio erişir, kullanıcı 403', async () => {
    const u = await createUser();
    expect((await api().get('/api/admin/stats').set(auth(admin.token))).status).toBe(200);
    expect((await api().get('/api/admin/stats').set(auth(physio.token))).status).toBe(200);
    expect((await api().get('/api/admin/stats').set(auth(u.token))).status).toBe(403);
  });

  it('şekil ve sayılar tutarlı', async () => {
    const u = await createUser();
    await saveProfile(u.token);
    const gen = await api().post('/api/plans/generate').set(auth(u.token)).send({ type: 'daily' });
    await api().post(`/api/plans/${gen.body.plan.id}/activate`).set(auth(u.token));
    const itemId = gen.body.plan.items[0].id;
    await api().post(`/api/plan-items/${itemId}/feedback`).set(auth(u.token)).send({ pain: 9, difficulty: 2 });

    const { body } = await api().get('/api/admin/stats').set(auth(physio.token));
    expect(body.users.total).toBe(body.users.byRole.user + body.users.byRole.physio + body.users.byRole.admin);
    expect(body.users.byRole.admin).toBeGreaterThanOrEqual(1);
    expect(body.users.newLast7Days).toBe(body.users.total);
    expect(body.profiles.total).toBeGreaterThanOrEqual(1);
    expect(Object.keys(body.plans.byStatus).sort()).toEqual(['active', 'completed', 'draft', 'suspended']);
    expect(body.plans.byStatus.suspended).toBeGreaterThanOrEqual(1);
    expect(body.feedback.last7Days).toBeGreaterThanOrEqual(1);
    expect(body.feedback.suspensionsLast7Days).toBeGreaterThanOrEqual(1);
    expect(body.exercises.approved + body.exercises.pending).toBeGreaterThan(0);
    expect(body.logins.successLast7Days).toBeGreaterThanOrEqual(1);
    expect(body.logins.failedLast7Days).toBeGreaterThanOrEqual(1);
    expect(typeof body.logins.last24h).toBe('number');
  });
});
