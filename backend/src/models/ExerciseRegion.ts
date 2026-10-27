import { ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import { BodyRegion } from './BodyRegion';
import { Exercise } from './Exercise';

export class ExerciseRegion extends Model<InferAttributes<ExerciseRegion>, InferCreationAttributes<ExerciseRegion>> {
  declare exerciseId: ForeignKey<Exercise['id']>;
  declare regionId: ForeignKey<BodyRegion['id']>;
}

ExerciseRegion.init({}, { sequelize, tableName: 'exercise_regions', timestamps: false });
