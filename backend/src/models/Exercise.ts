import { CreationOptional, DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './User';

export type Difficulty = 'easy' | 'medium' | 'hard';

export class Exercise extends Model<InferAttributes<Exercise>, InferCreationAttributes<Exercise>> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare description: string;
  declare videoUrl: string | null;
  declare difficulty: Difficulty;
  declare setsMin: number;
  declare setsMax: number;
  declare repsMin: number;
  declare repsMax: number;
  declare durationMin: number; // saniye
  declare durationMax: number;
  declare approved: CreationOptional<boolean>;
  declare approvedBy: ForeignKey<User['id']> | null;
}

Exercise.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    videoUrl: { type: DataTypes.STRING(500), allowNull: true },
    difficulty: { type: DataTypes.ENUM('easy', 'medium', 'hard'), allowNull: false },
    setsMin: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    setsMax: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    repsMin: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    repsMax: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    durationMin: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    durationMax: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    approved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { sequelize, tableName: 'exercises' },
);
