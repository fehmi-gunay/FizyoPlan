import { sequelize } from '../config/database';
import { BodyRegion, HealthProfile, UserPainRegion } from '../models';
import { ApiError } from '../utils/ApiError';
import { ProfileInput } from '../validators/profile.validators';

export async function getProfile(userId: number) {
  const profile = await HealthProfile.findOne({ where: { userId } });
  if (!profile) return null;

  const pains = await UserPainRegion.findAll({ where: { userId } });
  const regions = await BodyRegion.findAll();
  const codeById = new Map(regions.map((r) => [r.id, r.code]));

  return {
    ...profile.toJSON(),
    painRegions: pains.map((p) => ({ regionCode: codeById.get(p.regionId), severity: p.severity })),
  };
}

// Profil yoksa oluşturur, varsa günceller; ağrı bölgelerini baştan yazar.
export async function saveProfile(userId: number, input: ProfileInput) {
  const { painRegions, ...data } = input;

  const regions = await BodyRegion.findAll();
  const idByCode = new Map(regions.map((r) => [r.code as string, r.id]));
  for (const p of painRegions) {
    if (!idByCode.has(p.regionCode)) throw ApiError.badRequest(`Bilinmeyen bölge: ${p.regionCode}`);
  }

  await sequelize.transaction(async (transaction) => {
    const existing = await HealthProfile.findOne({ where: { userId }, transaction });
    if (existing) await existing.update(data, { transaction });
    else await HealthProfile.create({ ...data, userId }, { transaction });

    await UserPainRegion.destroy({ where: { userId }, transaction });
    if (painRegions.length > 0) {
      await UserPainRegion.bulkCreate(
        painRegions.map((p) => ({ userId, regionId: idByCode.get(p.regionCode)!, severity: p.severity })),
        { transaction },
      );
    }
  });

  return getProfile(userId);
}
