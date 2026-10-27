import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export type RegionCode = 'neck' | 'shoulder' | 'lower_back' | 'knee';

export class BodyRegion extends Model<InferAttributes<BodyRegion>, InferCreationAttributes<BodyRegion>> {
  declare id: CreationOptional<number>;
  declare code: RegionCode;
  declare name: string;
}

BodyRegion.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(60), allowNull: false },
  },
  { sequelize, tableName: 'body_regions', timestamps: false },
);
