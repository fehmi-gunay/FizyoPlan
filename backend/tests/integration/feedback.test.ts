import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { clinicalConfig } from '../../src/config/clinical';
import { api, auth, closeDb, createUser, resetDb, saveProfile } from '../helpers';

beforeAll(resetDb);
afterAll(closeDb);

type Item = { id: number; day: number };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Kullanıcı + profil + plan; activate=true ise aktif edilir
async function userWithPlan(opts: { type?: 'daily' | 'weekly'; activate?: boolean } = {}) {
  const u = await createUser();
  await saveProfile(u.token);
  const gen = await api().post('/api/plans/generate').set(auth(u.token)).send({ type: opts.type ?? 'weekly' });
  const plan = gen.body.plan as { id: number; items: Item[] };
  if (opts.activate !== false) await api().post(`/api/plans/${plan.id}/activate`).set(auth(u.token));
  return { ...u, plan };
}

const feedback = (token: string, itemId: number, body: object) =>
  api().post(`/api/plan-items/${itemId}/feedback`).set(auth(token)).send(body);

describe('POST /api/plan-items/:id/feedback (Denklem 2)', () => {
  it('eşik altı bildirim → 201, plan aktif kalır', async () => {
    const u = await userWithPlan();
    const res = await feedback(u.token, u.plan.items[0].id, { pain: 2, difficulty: 4 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ planStatus: 'active', suspended: false, feedback: { pain: 2, difficulty: 4 } });
    expect(res.body.message).toEqual(expect.any(String));
  });

  it.each([
    ['ağrı = θa', { pain: clinicalConfig.painThreshold, difficulty: 1 }],
    ['zorluk = θz', { pain: 0, difficulty: clinicalConfig.difficultyThreshold }],
    ['ağrı 10', { pain: 10, difficulty: 1 }],
  ])('eşik aşılınca plan askıya alınır (%s)', async (_n, body) => {
    const u = await userWithPlan();
    const res = await feedback(u.token, u.plan.items[0].id, body);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ planStatus: 'suspended', suspended: true });

    const plan = await api().get(`/api/plans/${u.plan.id}`).set(auth(u.token));
    expect(plan.body.plan.status).toBe('suspended');
  });

  it('eşiğin hemen altı askıya almaz', async () => {
    const u = await userWithPlan();
    const res = await feedback(u.token, u.plan.items[0].id, {
      pain: clinicalConfig.painThreshold - 1,
      difficulty: clinicalConfig.difficultyThreshold - 1,
    });
    expect(res.body.suspended).toBe(false);
  });

  it('askıdaki plana yeni bildirim → 409', async () => {
    const u = await userWithPlan();
    await feedback(u.token, u.plan.items[0].id, { pain: 9, difficulty: 1 });
    const res = await feedback(u.token, u.plan.items[1].id, { pain: 1, difficulty: 1 });
    expect(res.status).toBe(409);
  });

  it('taslak (aktif olmayan) plana bildirim → 409', async () => {
    const u = await userWithPlan({ activate: false });
    expect((await feedback(u.token, u.plan.items[0].id, { pain: 1, difficulty: 1 })).status).toBe(409);
  });

  it('başka kullanıcının kalemi → 404, olmayan kalem → 404, geçersiz id → 400', async () => {
    const owner = await userWithPlan();
    const other = await createUser();
    expect((await feedback(other.token, owner.plan.items[0].id, { pain: 1, difficulty: 1 })).status).toBe(404);
    expect((await feedback(owner.token, 999999, { pain: 1, difficulty: 1 })).status).toBe(404);
    expect((await api().post('/api/plan-items/abc/feedback').set(auth(owner.token)).send({ pain: 1, difficulty: 1 })).status).toBe(400);
  });

  it.each([
    ['ağrı > 10', { pain: 11, difficulty: 1 }],
    ['ağrı < 0', { pain: -1, difficulty: 1 }],
    ['zorluk 0', { pain: 1, difficulty: 0 }],
    ['ondalık', { pain: 1.5, difficulty: 1 }],
    ['eksik alan', { pain: 1 }],
  ])('geçersiz değer → 400 (%s)', async (_n, body) => {
    const u = await userWithPlan();
    const res = await feedback(u.token, u.plan.items[0].id, body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('tokensiz → 401', async () => {
    expect((await api().post('/api/plan-items/1/feedback').send({ pain: 1, difficulty: 1 })).status).toBe(401);
  });
});

describe('plan listeleme', () => {
  it('GET /plans yeniden eskiye, itemCount ile; status/type filtresi', async () => {
    const u = await createUser();
    await saveProfile(u.token);
    const weekly = (await api().post('/api/plans/generate').set(auth(u.token)).send({ type: 'weekly' })).body.plan;
    const daily = (await api().post('/api/plans/generate').set(auth(u.token)).send({ type: 'daily' })).body.plan;
    await api().post(`/api/plans/${weekly.id}/activate`).set(auth(u.token));

    const all = await api().get('/api/plans').set(auth(u.token));
    expect(all.status).toBe(200);
    expect(all.body.plans.map((p: { id: number }) => p.id)).toEqual([daily.id, weekly.id]);
    expect(all.body.plans[1].itemCount).toBe(weekly.items.length);
    expect(all.body.plans[0].items).toBeUndefined();

    const active = await api().get('/api/plans?status=active').set(auth(u.token));
    expect(active.body.plans.map((p: { id: number }) => p.id)).toEqual([weekly.id]);
    const dailies = await api().get('/api/plans?type=daily').set(auth(u.token));
    expect(dailies.body.plans.map((p: { id: number }) => p.id)).toEqual([daily.id]);
  });

  it('başka kullanıcının planları listelenmez; geçersiz filtre → 400', async () => {
    await userWithPlan();
    const other = await createUser();
    expect((await api().get('/api/plans').set(auth(other.token))).body.plans).toEqual([]);
    expect((await api().get('/api/plans?status=bilinmeyen').set(auth(other.token))).status).toBe(400);
  });

  it('GET /plans/active: yoksa {plan:null}, varsa kalemleriyle plan', async () => {
    const empty = await createUser();
    const none = await api().get('/api/plans/active').set(auth(empty.token));
    expect(none.status).toBe(200);
    expect(none.body.plan).toBeNull();

    const u = await userWithPlan();
    const res = await api().get('/api/plans/active').set(auth(u.token));
    expect(res.body.plan).toMatchObject({ id: u.plan.id, status: 'active' });
    expect(res.body.plan.items.length).toBe(u.plan.items.length);
  });

  it('GET /plans/:id kalemlere geri bildirimleri ekler', async () => {
    const u = await userWithPlan();
    await feedback(u.token, u.plan.items[0].id, { pain: 3, difficulty: 3 });
    const res = await api().get(`/api/plans/${u.plan.id}`).set(auth(u.token));
    const item = res.body.plan.items.find((i: Item) => i.id === u.plan.items[0].id);
    expect(item.feedback).toHaveLength(1);
    expect(item.feedback[0]).toMatchObject({ pain: 3, difficulty: 3 });
  });
});

describe('GET /api/plans/active/today', () => {
  it('aktif plan yoksa boş yanıt', async () => {
    const u = await createUser();
    const res = await api().get('/api/plans/active/today').set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ plan: null, day: null, items: [] });
  });

  it('haftalık plan: aktif edildiği gün = gün 1; ?day ile başka gün', async () => {
    const u = await userWithPlan();
    const today = await api().get('/api/plans/active/today').set(auth(u.token));
    expect(today.body.day).toBe(1);
    expect(today.body.items.length).toBe(u.plan.items.filter((i) => i.day === 1).length);

    const day3 = await api().get('/api/plans/active/today?day=3').set(auth(u.token));
    expect(day3.body.day).toBe(3);
    expect(day3.body.items.map((i: Item) => i.id).sort()).toEqual(u.plan.items.filter((i) => i.day === 3).map((i) => i.id).sort());
  });

  it('bugün bildirim verilen kalem completed olur', async () => {
    const u = await userWithPlan();
    const first = u.plan.items.find((i) => i.day === 1)!;
    await feedback(u.token, first.id, { pain: 1, difficulty: 2 });

    const res = await api().get('/api/plans/active/today').set(auth(u.token));
    const done = res.body.items.find((i: Item) => i.id === first.id);
    expect(done.completed).toBe(true);
    expect(done.todayFeedback).toHaveLength(1);
    expect(res.body.items.filter((i: { completed: boolean }) => !i.completed).length).toBe(res.body.items.length - 1);
  });

  it('günlük planda day her zaman 1', async () => {
    const u = await userWithPlan({ type: 'daily' });
    const res = await api().get('/api/plans/active/today?day=5').set(auth(u.token));
    expect(res.body.day).toBe(1);
  });

  it('day 1-7 dışı → 400', async () => {
    const u = await userWithPlan();
    expect((await api().get('/api/plans/active/today?day=8').set(auth(u.token))).status).toBe(400);
    expect((await api().get('/api/plans/active/today?day=0').set(auth(u.token))).status).toBe(400);
  });
});

describe('POST /api/plans/:id/reassess', () => {
  async function suspendedPlan() {
    const u = await userWithPlan();
    await feedback(u.token, u.plan.items[0].id, { pain: 9, difficulty: 1 });
    return u;
  }

  it('askıda olmayan plan → 409', async () => {
    const u = await userWithPlan();
    expect((await api().post(`/api/plans/${u.plan.id}/reassess`).set(auth(u.token))).status).toBe(409);
  });

  it('başka kullanıcının planı → 404', async () => {
    const u = await suspendedPlan();
    const other = await createUser();
    expect((await api().post(`/api/plans/${u.plan.id}/reassess`).set(auth(other.token))).status).toBe(404);
  });

  it('anket yeniden doldurulmadıysa canGenerate=false (unassessable)', async () => {
    const u = await suspendedPlan();
    const res = await api().post(`/api/plans/${u.plan.id}/reassess`).set(auth(u.token));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ canGenerate: false, riskLevel: 'unassessable' });
  });

  it('anket güncellendi ve risk uygun → canGenerate=true, plan completed', async () => {
    const u = await suspendedPlan();
    await sleep(1100); // DATETIME saniye hassasiyeti
    await saveProfile(u.token, { painRegions: [{ regionCode: 'lower_back', severity: 2 }] });

    const res = await api().post(`/api/plans/${u.plan.id}/reassess`).set(auth(u.token));
    expect(res.body.canGenerate).toBe(true);
    expect((await api().get(`/api/plans/${u.plan.id}`).set(auth(u.token))).body.plan.status).toBe('completed');
  });

  it('anket güncellendi ama riskli → canGenerate=false, plan askıda kalır', async () => {
    const u = await suspendedPlan();
    await sleep(1100);
    await saveProfile(u.token, { painRegions: [{ regionCode: 'lower_back', severity: 9 }] });

    const res = await api().post(`/api/plans/${u.plan.id}/reassess`).set(auth(u.token));
    expect(res.body).toMatchObject({ canGenerate: false, riskLevel: 'risky' });
    expect((await api().get(`/api/plans/${u.plan.id}`).set(auth(u.token))).body.plan.status).toBe('suspended');
  });
});
