import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, auth, closeDb, createUser, FIXTURE_EXERCISES, resetDb, saveProfile } from '../helpers';

beforeAll(resetDb);
afterAll(closeDb);

function birthDateForAge(age: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  d.setDate(d.getDate() + 1); // doğum günü yarın → henüz bu yaşa girmedi
  return d.toISOString().slice(0, 10);
}

describe('profil / anket', () => {
  it('profil yokken GET → 404', async () => {
    const u = await createUser();
    const res = await api().get('/api/profile').set(auth(u.token));
    expect(res.status).toBe(404);
  });

  it('PUT profili oluşturur, GET aynı veriyi döner (weightKg sayı)', async () => {
    const u = await createUser();
    const put = await saveProfile(u.token, { painRegions: [{ regionCode: 'knee', severity: 3 }] });
    expect(put.status).toBe(200);

    const res = await api().get('/api/profile').set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body.profile).toMatchObject({
      birthDate: '1995-05-10',
      heightCm: 175,
      weightKg: 72,
      activityLevel: 'moderate',
      painRegions: [{ regionCode: 'knee', severity: 3 }],
    });
  });

  it('ikinci PUT günceller ve ağrı bölgelerini baştan yazar', async () => {
    const u = await createUser();
    await saveProfile(u.token, { painRegions: [{ regionCode: 'knee', severity: 3 }] });
    await saveProfile(u.token, { weightKg: 80, painRegions: [{ regionCode: 'neck', severity: 5 }] });
    const res = await api().get('/api/profile').set(auth(u.token));
    expect(res.body.profile.weightKg).toBe(80);
    expect(res.body.profile.painRegions).toEqual([{ regionCode: 'neck', severity: 5 }]);
  });

  it('18 yaş altı → 400', async () => {
    const u = await createUser();
    const res = await saveProfile(u.token, { birthDate: birthDateForAge(18) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it.each([
    ['boy aralık dışı', { heightCm: 50 }],
    ['bilinmeyen bölge', { painRegions: [{ regionCode: 'el', severity: 2 }] }],
    ['şiddet > 10', { painRegions: [{ regionCode: 'knee', severity: 11 }] }],
    ['tarih formatı', { birthDate: '10.05.1995' }],
  ])('geçersiz anket → 400 (%s)', async (_n, override) => {
    const u = await createUser();
    const res = await saveProfile(u.token, override as never);
    expect(res.status).toBe(400);
  });

  it('kullanıcılar birbirinin profilini göremez', async () => {
    const a = await createUser();
    const b = await createUser();
    await saveProfile(a.token, { weightKg: 90 });
    expect((await api().get('/api/profile').set(auth(b.token))).status).toBe(404);
  });

  it('tokensiz → 401', async () => {
    expect((await api().get('/api/profile')).status).toBe(401);
  });
});

describe('bölgeler ve egzersiz kütüphanesi', () => {
  it('GET /regions herkese açık, 4 bölge', async () => {
    const res = await api().get('/api/regions');
    expect(res.status).toBe(200);
    expect(res.body.regions.map((r: { code: string }) => r.code).sort()).toEqual(['knee', 'lower_back', 'neck', 'shoulder']);
  });

  it('GET /exercises sadece onaylıları döner', async () => {
    const u = await createUser();
    const res = await api().get('/api/exercises').set(auth(u.token));
    expect(res.status).toBe(200);
    const titles = res.body.exercises.map((e: { title: string }) => e.title);
    expect(titles).toHaveLength(FIXTURE_EXERCISES.filter((f) => f.approved !== false).length);
    expect(titles).not.toContain('Test Onaysız Boyun');
  });

  it('bölge ve zorluk filtresi çalışır', async () => {
    const u = await createUser();
    const res = await api().get('/api/exercises?region=knee&difficulty=easy').set(auth(u.token));
    expect(res.body.exercises.map((e: { title: string }) => e.title)).toEqual(['Test Düz Bacak']);
  });

  it('geçersiz filtre → 400', async () => {
    const u = await createUser();
    expect((await api().get('/api/exercises?region=el').set(auth(u.token))).status).toBe(400);
  });

  it('onaysız egzersiz detayı → 404, onaylı → 200 (kontrendikasyonlarla)', async () => {
    const u = await createUser();
    const all = await api().get('/api/exercises').set(auth(u.token));
    const squat = all.body.exercises.find((e: { title: string }) => e.title === 'Test Duvar Squat');
    const detail = await api().get(`/api/exercises/${squat.id}`).set(auth(u.token));
    expect(detail.status).toBe(200);
    expect(detail.body.exercise.contraindications).toEqual([{ condition: 'akut_diz' }]);

    const maxId = Math.max(...all.body.exercises.map((e: { id: number }) => e.id));
    // Onaysız fixture en son eklendi → onaylıların en büyük id'sinden sonra gelir
    expect((await api().get(`/api/exercises/${maxId + 1}`).set(auth(u.token))).status).toBe(404);
  });

  it('egzersizler tokensiz → 401', async () => {
    expect((await api().get('/api/exercises')).status).toBe(401);
  });
});
