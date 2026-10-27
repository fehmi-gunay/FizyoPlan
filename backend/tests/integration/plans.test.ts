import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Exercise } from '../../src/models';
import { api, auth, closeDb, createUser, resetDb, saveProfile } from '../helpers';

beforeAll(resetDb);
afterAll(closeDb);

type Item = { day: number; sets: number; reps: number; durationSec: number; exercise: { id: number; title: string; difficulty: string } };

const generate = (token: string, body: object = {}) => api().post('/api/plans/generate').set(auth(token)).send(body);

describe('POST /api/plans/generate – uzman yönlendirmesi', () => {
  it('profil yoksa referral (unassessable), plan kaydedilmez', async () => {
    const u = await createUser();
    const res = await generate(u.token);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ outcome: 'referral', riskLevel: 'unassessable' });
  });

  it.each([
    ['kırmızı bayrak', { redFlags: ['night_pain'] }],
    ['ağrı ≥ 8', { painRegions: [{ regionCode: 'knee', severity: 9 }] }],
    ['VKİ > 40', { weightKg: 140 }],
  ])('riskli profil → referral (%s)', async (_n, override) => {
    const u = await createUser();
    await saveProfile(u.token, override as never);
    const res = await generate(u.token);
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('referral');
    expect(res.body.riskLevel).toBe('risky');
    expect(res.body.reasons.length).toBeGreaterThan(0);
    expect(res.body.plan).toBeUndefined();
  });

  it('sadece şiddeti 0 olan bölge → unassessable', async () => {
    const u = await createUser();
    await saveProfile(u.token, { painRegions: [{ regionCode: 'knee', severity: 0 }] });
    expect((await generate(u.token)).body).toMatchObject({ outcome: 'referral', riskLevel: 'unassessable' });
  });
});

describe('POST /api/plans/generate – plan oluşturma', () => {
  it('haftalık plan: 7 gün, taslak, sadece onaylı ve uygun egzersizler', async () => {
    const u = await createUser();
    await saveProfile(u.token, { painRegions: [{ regionCode: 'lower_back', severity: 3 }] });
    const res = await generate(u.token, { type: 'weekly' });
    expect(res.status).toBe(201);
    expect(res.body.outcome).toBe('created');
    expect(res.body.plan).toMatchObject({ type: 'weekly', status: 'draft' });

    const items: Item[] = res.body.plan.items;
    expect(new Set(items.map((i) => i.day))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]));
    const ids = [...new Set(items.map((i) => i.exercise.id))];
    const exercises = await Exercise.findAll({ where: { id: ids } });
    expect(exercises.every((e) => e.approved)).toBe(true);
    for (const i of items) {
      const e = exercises.find((x) => x.id === i.exercise.id)!;
      expect(i.sets).toBeGreaterThanOrEqual(e.setsMin);
      expect(i.sets).toBeLessThanOrEqual(e.setsMax);
    }
  });

  it('varsayılan tip weekly', async () => {
    const u = await createUser();
    await saveProfile(u.token);
    expect((await generate(u.token)).body.plan.type).toBe('weekly');
  });

  it('günlük plan: tüm kalemler gün 1', async () => {
    const u = await createUser();
    await saveProfile(u.token);
    const res = await generate(u.token, { type: 'daily' });
    expect(res.status).toBe(201);
    expect(res.body.plan.type).toBe('daily');
    expect(res.body.plan.items.every((i: Item) => i.day === 1)).toBe(true);
  });

  it('ağrı ≥ 6 → sadece kolay egzersizler (Test Köprü hard elenir)', async () => {
    const u = await createUser();
    await saveProfile(u.token, { painRegions: [{ regionCode: 'lower_back', severity: 6 }] });
    const res = await generate(u.token);
    const items: Item[] = res.body.plan.items;
    expect(items.every((i) => i.exercise.difficulty === 'easy')).toBe(true);
  });

  it('kontrendikasyonu olan egzersiz plana girmez', async () => {
    const u = await createUser();
    await saveProfile(u.token, { conditions: ['akut_diz'], painRegions: [{ regionCode: 'knee', severity: 2 }] });
    const res = await generate(u.token);
    expect(res.status).toBe(201);
    const titles = res.body.plan.items.map((i: Item) => i.exercise.title);
    expect(titles).not.toContain('Test Duvar Squat');
    expect(titles).toContain('Test Düz Bacak');
  });

  it('onaysız egzersiz asla plana girmez', async () => {
    const u = await createUser();
    await saveProfile(u.token, { painRegions: [{ regionCode: 'neck', severity: 2 }] });
    const res = await generate(u.token);
    const titles = res.body.plan.items.map((i: Item) => i.exercise.title);
    expect(titles).not.toContain('Test Onaysız Boyun');
  });

  it('uygun egzersiz yoksa (omuz) → 422 NO_SUITABLE_EXERCISES', async () => {
    const u = await createUser();
    await saveProfile(u.token, { painRegions: [{ regionCode: 'shoulder', severity: 3 }] });
    const res = await generate(u.token);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('NO_SUITABLE_EXERCISES');
  });

  it('geçersiz tip → 400', async () => {
    const u = await createUser();
    await saveProfile(u.token);
    expect((await generate(u.token, { type: 'monthly' })).status).toBe(400);
  });

  it('tokensiz → 401', async () => {
    expect((await api().post('/api/plans/generate').send({})).status).toBe(401);
  });
});

describe('GET /api/plans/:id ve POST /api/plans/:id/activate', () => {
  it('plan sahibi planı görür; başka kullanıcı 404 alır', async () => {
    const owner = await createUser();
    const other = await createUser();
    await saveProfile(owner.token);
    const plan = (await generate(owner.token)).body.plan;

    expect((await api().get(`/api/plans/${plan.id}`).set(auth(owner.token))).status).toBe(200);
    expect((await api().get(`/api/plans/${plan.id}`).set(auth(other.token))).status).toBe(404);
    expect((await api().post(`/api/plans/${plan.id}/activate`).set(auth(other.token))).status).toBe(404);
  });

  it('geçersiz id → 400, olmayan id → 404', async () => {
    const u = await createUser();
    expect((await api().get('/api/plans/abc').set(auth(u.token))).status).toBe(400);
    expect((await api().get('/api/plans/999999').set(auth(u.token))).status).toBe(404);
  });

  it('taslak plan aktif olur; ikinci kez onay → 409', async () => {
    const u = await createUser();
    await saveProfile(u.token);
    const plan = (await generate(u.token)).body.plan;

    const first = await api().post(`/api/plans/${plan.id}/activate`).set(auth(u.token));
    expect(first.status).toBe(200);
    expect(first.body.plan.status).toBe('active');

    const second = await api().post(`/api/plans/${plan.id}/activate`).set(auth(u.token));
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('CONFLICT');
  });

  it('yeni plan onaylanınca önceki aktif plan completed olur', async () => {
    const u = await createUser();
    await saveProfile(u.token);
    const p1 = (await generate(u.token)).body.plan;
    const p2 = (await generate(u.token)).body.plan;
    await api().post(`/api/plans/${p1.id}/activate`).set(auth(u.token));
    await api().post(`/api/plans/${p2.id}/activate`).set(auth(u.token));

    expect((await api().get(`/api/plans/${p1.id}`).set(auth(u.token))).body.plan.status).toBe('completed');
    expect((await api().get(`/api/plans/${p2.id}`).set(auth(u.token))).body.plan.status).toBe('active');
  });

  it('profil sonradan riskli olduysa onay → 422 REFERRAL_REQUIRED', async () => {
    const u = await createUser();
    await saveProfile(u.token);
    const plan = (await generate(u.token)).body.plan;
    await saveProfile(u.token, { redFlags: ['fever'] });

    const res = await api().post(`/api/plans/${plan.id}/activate`).set(auth(u.token));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('REFERRAL_REQUIRED');
    expect((await api().get(`/api/plans/${plan.id}`).set(auth(u.token))).body.plan.status).toBe('draft');
  });
});
