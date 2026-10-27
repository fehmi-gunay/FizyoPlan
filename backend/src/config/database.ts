import { Sequelize } from 'sequelize';
import { env } from './env';

export const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'mysql',
  logging: false,
  timezone: '+03:00',
});

// Veritabanı henüz açılmadıysa (ör. Docker'da ilk açılış) birkaç kez yeniden dener
export async function connectDatabase(retries = 10, delayMs = 3000): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await sequelize.authenticate();
      console.log('MySQL bağlantısı başarılı');
      return;
    } catch (err) {
      if (attempt >= retries) throw err;
      console.warn(`MySQL'e bağlanılamadı (deneme ${attempt}/${retries}), ${delayMs / 1000} sn sonra tekrar denenecek…`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
