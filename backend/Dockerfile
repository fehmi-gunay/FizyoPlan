# --- 1) Derleme: TypeScript → JavaScript (src + seeders) ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY seeders ./seeders
RUN npm run build

# --- 2) Çalıştırma: yalnızca üretim bağımlılıkları + derlenmiş kod ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
# root yerine yerleşik "node" kullanıcısıyla çalış
RUN chown -R node:node /app
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -q -O /dev/null http://localhost:4000/api/health || exit 1
# Önce seed (tablolar + bölgeler + örnek egzersizler + admin; tekrar çalıştırmak güvenli), sonra API
CMD ["sh", "-c", "node dist/seeders/seed.js && node dist/src/server.js"]
