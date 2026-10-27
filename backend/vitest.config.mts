import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    // Tüm dosyalar aynı test veritabanını kullandığı için sıralı çalışır
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
