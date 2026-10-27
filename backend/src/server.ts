import app from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { syncDatabase } from './models';

async function main() {
  try {
    await connectDatabase();
    // Geliştirmede tabloları modellere göre oluşturur (production'da migration kullanılacak)
    if (env.NODE_ENV === 'development') await syncDatabase();
  } catch (err) {
    console.error('MySQL bağlantısı kurulamadı. `npm run db:up` ile veritabanını başlattın mı?');
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  app.listen(env.PORT, () => {
    console.log(`API http://localhost:${env.PORT}/api hazır`);
  });
}

main();
