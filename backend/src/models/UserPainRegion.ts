import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import { BodyRegion } from './BodyRegion';
import { User } from './User';

// Kullanıcı <-> bölge (M:N), ağrı şiddeti 0-10
export class UserPainRegion extends Model<InferAttributes<UserPainRegion>, InferCreationAttributes<UserPainRegion>> {
  declare userId: ForeignKey<User['id']>;
  declare regionId: ForeignKey<BodyRegion['id']>;
  declare severity: number;
}

UserPainRegion.init(
  { severity: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false } },
  { sequelize, tableName: 'user_pain_regions', timestamps: false },
);
