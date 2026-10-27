import { CreationOptional, DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import { Exercise } from './Exercise';

// K(e): egzersizin kontrendikasyon kümesi (kullanıcının conditions/redFlags değerleriyle karşılaştırılır)
export class ExerciseContraindication extends Model<
  InferAttributes<ExerciseContraindication>,
  InferCreationAttributes<ExerciseContraindication>
> {
  declare id: CreationOptional<number>;
  declare exerciseId: ForeignKey<Exercise['id']>;
  declare condition: string;
}

ExerciseContraindication.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    condition: { type: DataTypes.STRING(100), allowNull: false },
  },
  { sequelize, tableName: 'exercise_contraindications', timestamps: false },
);
