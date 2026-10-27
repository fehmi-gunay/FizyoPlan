import { Sequelize } from 'sequelize';
import { env } from './env';

export const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'mysql',
  logging: false,
  timezone: '+03:00',
});

export async function connectDatabase(): Promise<void> {
  await sequelize.authenticate();
  console.log('MySQL bağlantısı başarılı');
}
