import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, auth, closeDb, createUser, resetDb } from '../helpers';

let admin: Awaited<ReturnType<typeof createUser>>;
let physio: Awaited<ReturnType<typeof createUser>>;
let user: Awaited<ReturnType<typeof createUser>>;

beforeAll(async () => {
  await resetDb();
  admin = await createUser('admin');
  physio = await createUser('physio');
  user = await createUser();
});
afterAll(closeDb);

const newExercise = (over: object = {}) => ({
  title: 'Yeni Diz Egzersizi',
  description: 'Uzman tarafından eklenen test egzersizi.',
  difficulty: 'easy',
  setsMin: 2,
  setsMax: 3,
  repsMin: 8,
  repsMax: 12,
  durationMin: 5,
  durationMax: 10,
  regionCodes: ['knee'],
  contraindications: ['akut_diz'],
  ...over,
});

const create = (token: string, body: object = newExercise()) => api().post('/api/admin/exercises').set(auth(token)).send(body);
const publicTitles = async () =>
  (await api().get('/api/exercises').set(auth(user.token))).body.exercises.map((e: { title: string }) => e.title);

describe('yetkilendirme', () => {
  it('normal kullanıcı admin uçlarına 403 alır', async () => {
    expect((await api().get('/api/admin/exercises').set(auth(user.token))).status).toBe(403);
    expect((await create(user.token)).status).toBe(403);
    expect((await api().get('/api/admin/users').set(auth(user.token))).status).toBe(403);
  });

  it('tokensiz → 401', async () => {
    expect((await api().get('/api/admin/exercises')).status).toBe(401);
  });

  it('physio egzersizleri yönetebilir ama kullanıcı listesini göremez', async () => {
    expect((await api().get('/api/admin/exercises').set(auth(physio.token))).status).toBe(200);
    expect((await api().get('/api/admin/users').set(auth(physio.token))).status).toBe(403);
  });
});

describe('egzersiz yönetimi', () => {
  it('oluşturulan egzersiz onaysız başlar ve kullanıcıya görünmez', async () => {
    const res = await create(physio.token);
    expect(res.status).toBe(201);
    expect(res.body.exercise).toMatchObject({ title: 'Yeni Diz Egzersizi', approved: false });
    expect(await publicTitles()).not.toContain('Yeni Diz Egzersizi');
  });

  it('admin listesi onaylı + onaysızları gösterir, approved filtresi çalışır', async () => {
    const all = await api().get('/api/admin/exercises').set(auth(admin.token));
    const titles = all.body.exercises.map((e: { title: string }) => e.title);
    expect(titles).toContain('Test Onaysız Boyun');
    expect(titles).toContain('Test Pelvik Tilt');

    const unapproved = await api().get('/api/admin/exercises?approved=false').set(auth(admin.token));
    expect(unapproved.body.exercises.every((e: { approved: boolean }) => !e.approved)).toBe(true);

    const knee = await api().get('/api/admin/exercises?region=knee').set(auth(admin.token));
    expect(knee.body.exercises.length).toBeGreaterThan(0);
    expect(knee.body.exercises.every((e: { regions: { code: string }[] }) => e.regions.some((r) => r.code === 'knee'))).toBe(true);
  });

  it('onay → kullanıcıya görünür, approvedBy onaylayan; onay kaldırma → görünmez', async () => {
    const created = (await create(physio.token, newExercise({ title: 'Onay Akışı Egzersizi' }))).body.exercise;

    const approved = await api().post(`/api/admin/exercises/${created.id}/approve`).set(auth(physio.token));
    expect(approved.status).toBe(200);
    expect(approved.body.exercise).toMatchObject({ approved: true, approvedBy: physio.id });
    expect(await publicTitles()).toContain('Onay Akışı Egzersizi');

    const unapproved = await api().post(`/api/admin/exercises/${created.id}/unapprove`).set(auth(admin.token));
    expect(unapproved.body.exercise.approved).toBe(false);
    expect(await publicTitles()).not.toContain('Onay Akışı Egzersizi');
  });

  it('onaylı egzersiz düzenlenince onay düşer', async () => {
    const created = (await create(physio.token, newExercise({ title: 'Düzenlenecek Egzersiz' }))).body.exercise;
    await api().post(`/api/admin/exercises/${created.id}/approve`).set(auth(physio.token));

    const res = await api()
      .put(`/api/admin/exercises/${created.id}`)
      .set(auth(physio.token))
      .send({ description: 'Güncellenmiş açıklama metni.', regionCodes: ['knee', 'lower_back'] });
    expect(res.status).toBe(200);
    expect(res.body.exercise).toMatchObject({ description: 'Güncellenmiş açıklama metni.', approved: false, approvedBy: null });
    expect(res.body.exercise.regions.map((r: { code: string }) => r.code).sort()).toEqual(['knee', 'lower_back']);
    expect(await publicTitles()).not.toContain('Düzenlenecek Egzersiz');
  });

  it.each([
    ['min > max', newExercise({ setsMin: 5, setsMax: 2 })],
    ['bölge yok', newExercise({ regionCodes: [] })],
    ['bilinmeyen bölge', newExercise({ regionCodes: ['el'] })],
    ['zorluk geçersiz', newExercise({ difficulty: 'cok_zor' })],
    ['başlık eksik', newExercise({ title: undefined })],
  ])('geçersiz oluşturma → 400 (%s)', async (_n, body) => {
    expect((await create(admin.token, body)).status).toBe(400);
  });

  it('güncellemede tek tarafı verilen aralık mevcut değerle çelişirse 400', async () => {
    const created = (await create(admin.token, newExercise({ title: 'Aralık Testi' }))).body.exercise;
    const res = await api().put(`/api/admin/exercises/${created.id}`).set(auth(admin.token)).send({ setsMin: 10 });
    expect(res.status).toBe(400);
  });

  it('boş güncelleme → 400; olmayan egzersiz → 404', async () => {
    const created = (await create(admin.token, newExercise({ title: 'Boş Güncelleme' }))).body.exercise;
    expect((await api().put(`/api/admin/exercises/${created.id}`).set(auth(admin.token)).send({})).status).toBe(400);
    expect((await api().post('/api/admin/exercises/999999/approve').set(auth(admin.token))).status).toBe(404);
  });
});

describe('kullanıcı yönetimi (yalnız admin)', () => {
  it('GET /users sağlık verisi ve parola hash içermez', async () => {
    const res = await api().get('/api/admin/users').set(auth(admin.token));
    expect(res.status).toBe(200);
    for (const u of res.body.users) {
      expect(Object.keys(u).sort()).toEqual(['createdAt', 'email', 'id', 'role']);
    }
  });

  it('rol değiştirme: yeni rol hemen geçerli olur', async () => {
    const target = await createUser();
    const res = await api().patch(`/api/admin/users/${target.id}/role`).set(auth(admin.token)).send({ role: 'physio' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('physio');
    expect((await api().get('/api/admin/exercises').set(auth(target.token))).status).toBe(200);
  });

  it('admin kendi rolünü değiştiremez → 400; geçersiz rol → 400; olmayan kullanıcı → 404', async () => {
    expect((await api().patch(`/api/admin/users/${admin.id}/role`).set(auth(admin.token)).send({ role: 'user' })).status).toBe(400);
    expect((await api().patch(`/api/admin/users/${user.id}/role`).set(auth(admin.token)).send({ role: 'superuser' })).status).toBe(400);
    expect((await api().patch('/api/admin/users/999999/role').set(auth(admin.token)).send({ role: 'user' })).status).toBe(404);
  });
});
