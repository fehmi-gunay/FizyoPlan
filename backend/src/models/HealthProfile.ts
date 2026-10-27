import { CreationOptional, DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './User';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';

export class HealthProfile extends Model<InferAttributes<HealthProfile>, InferCreationAttributes<HealthProfile>> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<User['id']>;
  declare birthDate: string;
  declare heightCm: number;
  declare weightKg: number;
  declare activityLevel: ActivityLevel;
  declare redFlags: CreationOptional<string[]>;
  declare conditions: CreationOptional<string[]>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

HealthProfile.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    birthDate: { type: DataTypes.DATEONLY, allowNull: false },
    heightCm: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    weightKg: { type: DataTypes.DECIMAL(5, 1), allowNull: false },
    activityLevel: { type: DataTypes.ENUM('sedentary', 'light', 'moderate', 'active'), allowNull: false },
    redFlags: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    conditions: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'health_profiles' },
);
