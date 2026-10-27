import { CreationOptional, DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import { Exercise } from './Exercise';
import { Plan } from './Plan';

export class PlanItem extends Model<InferAttributes<PlanItem>, InferCreationAttributes<PlanItem>> {
  declare id: CreationOptional<number>;
  declare planId: ForeignKey<Plan['id']>;
  declare exerciseId: ForeignKey<Exercise['id']>;
  declare day: number; // 1-7
  declare sets: number;
  declare reps: number;
  declare durationSec: number;
}

PlanItem.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    day: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    sets: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    reps: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    durationSec: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
  },
  { sequelize, tableName: 'plan_items', timestamps: false },
);
