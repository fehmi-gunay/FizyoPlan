import { sequelize } from '../config/database';
import { AuditLog } from './AuditLog';
import { BodyRegion } from './BodyRegion';
import { Exercise } from './Exercise';
import { ExerciseContraindication } from './ExerciseContraindication';
import { ExerciseRegion } from './ExerciseRegion';
import { HealthProfile } from './HealthProfile';
import { Plan } from './Plan';
import { PlanItem } from './PlanItem';
import { SessionFeedback } from './SessionFeedback';
import { User } from './User';
import { UserPainRegion } from './UserPainRegion';

// Kullanıcı 1:1 sağlık profili, 1:N planlar
User.hasOne(HealthProfile, { foreignKey: { name: 'userId', allowNull: false }, onDelete: 'CASCADE' });
HealthProfile.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Plan, { foreignKey: { name: 'userId', allowNull: false }, onDelete: 'CASCADE' });
Plan.belongsTo(User, { foreignKey: 'userId' });

// Kullanıcı <-> ağrı bölgesi (M:N, severity)
User.belongsToMany(BodyRegion, { through: UserPainRegion, foreignKey: 'userId', otherKey: 'regionId', as: 'painRegions' });
BodyRegion.belongsToMany(User, { through: UserPainRegion, foreignKey: 'regionId', otherKey: 'userId' });

// Egzersiz <-> bölge (M:N)
Exercise.belongsToMany(BodyRegion, { through: ExerciseRegion, foreignKey: 'exerciseId', otherKey: 'regionId', as: 'regions' });
BodyRegion.belongsToMany(Exercise, { through: ExerciseRegion, foreignKey: 'regionId', otherKey: 'exerciseId', as: 'exercises' });

Exercise.hasMany(ExerciseContraindication, {
  foreignKey: { name: 'exerciseId', allowNull: false },
  as: 'contraindications',
  onDelete: 'CASCADE',
});
ExerciseContraindication.belongsTo(Exercise, { foreignKey: 'exerciseId' });
Exercise.belongsTo(User, { foreignKey: { name: 'approvedBy', allowNull: true }, as: 'approver' });

// Plan -> kalemler -> geri bildirim
Plan.hasMany(PlanItem, { foreignKey: { name: 'planId', allowNull: false }, as: 'items', onDelete: 'CASCADE' });
PlanItem.belongsTo(Plan, { foreignKey: 'planId' });
Exercise.hasMany(PlanItem, { foreignKey: { name: 'exerciseId', allowNull: false } });
PlanItem.belongsTo(Exercise, { foreignKey: 'exerciseId', as: 'exercise' });
PlanItem.hasMany(SessionFeedback, { foreignKey: { name: 'planItemId', allowNull: false }, as: 'feedback', onDelete: 'CASCADE' });
SessionFeedback.belongsTo(PlanItem, { foreignKey: 'planItemId' });

// Aktivite kaydı: kullanıcı silinince kayıt kalır, userId boşalır
User.hasMany(AuditLog, { foreignKey: { name: 'userId', allowNull: true }, onDelete: 'SET NULL' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Geliştirme için: tabloları modellere göre oluşturur. { alter: true } eksik sütunları günceller.
export async function syncDatabase(options: { force?: boolean; alter?: boolean } = {}): Promise<void> {
  await sequelize.sync(options);
}

export {
  AuditLog,
  BodyRegion,
  Exercise,
  ExerciseContraindication,
  ExerciseRegion,
  HealthProfile,
  Plan,
  PlanItem,
  SessionFeedback,
  User,
  UserPainRegion,
};
