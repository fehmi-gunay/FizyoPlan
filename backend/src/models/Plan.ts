import { CreationOptional, DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './User';

export type PlanType = 'daily' | 'weekly';
export type PlanStatus = 'draft' | 'active' | 'suspended' | 'completed';

export class Plan extends Model<InferAttributes<Plan>, InferCreationAttributes<Plan>> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<User['id']>;
  declare type: PlanType;
  declare status: CreationOptional<PlanStatus>;
}

Plan.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    type: { type: DataTypes.ENUM('daily', 'weekly'), allowNull: false },
    status: { type: DataTypes.ENUM('draft', 'active', 'suspended', 'completed'), allowNull: false, defaultValue: 'draft' },
  },
  { sequelize, tableName: 'plans' },
);
