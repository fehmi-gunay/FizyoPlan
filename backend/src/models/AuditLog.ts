import { CreationOptional, DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './User';

export const AUDIT_ACTIONS = [
  'login_success',
  'login_failed',
  'register',
  'password_change',
  'account_delete',
  'role_change',
  'exercise_create',
  'exercise_update',
  'exercise_approve',
  'exercise_unapprove',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// Güvenlik amaçlı giriş/aktivite kaydı. Sağlık verisi içermez.
export class AuditLog extends Model<InferAttributes<AuditLog>, InferCreationAttributes<AuditLog>> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<User['id']> | null;
  declare email: string | null;
  declare action: AuditAction;
  declare ip: string | null;
  declare userAgent: string | null;
  declare meta: Record<string, unknown> | null;
  declare createdAt: CreationOptional<Date>;
}

AuditLog.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING(255), allowNull: true },
    action: { type: DataTypes.ENUM(...AUDIT_ACTIONS), allowNull: false },
    ip: { type: DataTypes.STRING(45), allowNull: true },
    userAgent: { type: DataTypes.STRING(255), allowNull: true },
    meta: { type: DataTypes.JSON, allowNull: true },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'audit_logs',
    updatedAt: false,
    indexes: [{ fields: ['createdAt'] }, { fields: ['userId'] }, { fields: ['action'] }],
  },
);
