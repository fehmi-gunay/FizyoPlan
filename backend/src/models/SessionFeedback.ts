import { CreationOptional, DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import { PlanItem } from './PlanItem';

export class SessionFeedback extends Model<InferAttributes<SessionFeedback>, InferCreationAttributes<SessionFeedback>> {
  declare id: CreationOptional<number>;
  declare planItemId: ForeignKey<PlanItem['id']>;
  declare pain: number; // a: 0-10
  declare difficulty: number; // z: 1-10
}

SessionFeedback.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    pain: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    difficulty: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
  },
  { sequelize, tableName: 'session_feedback' },
);
