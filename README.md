# FizyoPlan – Fizyoterapi Egzersiz Planlama Sistemi

Kullanıcının yaş, boy, kilo, aktivite düzeyi ve ağrı bölgesine (bel, boyun, omuz, diz) göre **güvenli, kişiye özel** günlük/haftalık egzersiz planı üreten web uygulaması. TÜBİTAK 2209-A projesi.

> Uygulama tanı koymaz, muayenenin yerini almaz. Riskli kullanıcıya plan üretilmez, uzmana yönlendirilir.

## Hızlı başlangıç (Docker ile tüm sistem)
Gereksinim: [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone https://github.com/fehmi-gunay/FizyoPlan.git
cd FizyoPlan
cp .env.example .env          # parolaları ve JWT_SECRET'ı değiştir
docker compose up -d --build
```
- Uygulama: **http://localhost:8080**
- Admin: `.env`'deki `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
- Durdurmak: `docker compose down` (veriler korunur) · Veritabanını da silmek: `docker compose down -v`

## Geliştirme (kod değiştirirken, anında yenileme)
Gereksinim: Node.js 22+, Docker Desktop.

```bash
docker compose up -d mysql            # yalnızca veritabanı (localhost:3308)

cd backend
npm install
cp .env.example .env                  # DB_* değerleri kökteki .env ile aynı olmalı
npm run db:seed                       # bölgeler + örnek egzersizler (+ admin)
npm run dev                           # http://localhost:4000/api
npm test                              # 158 test (ayrı fizyoplan_test veritabanı)

cd ../frontend                        # ayrı terminal
npm install
npm run dev                           # http://localhost:5173  (/api → localhost:4000)
```
> Docker'daki backend/frontend açıksa `npm run dev` ile çakışmaz (Docker portları: 8080 ve 4001), ama aynı veritabanını paylaşırlar.

## Proje yapısı
```
FizyoPlan/
├─ docker-compose.yml        # mysql + backend + frontend (proje adı: fizyoplan)
├─ .env.example              # Docker ayarları şablonu (.env git'e girmez)
├─ docker/mysql/             # MySQL ilk açılış betikleri (test veritabanı)
├─ backend/                  # Node.js + Express + TypeScript API
│  ├─ src/
│  │  ├─ config/             # env doğrulama, veritabanı, klinik eşikler (clinical.ts)
│  │  ├─ models/             # Sequelize modelleri (User, HealthProfile, Exercise, Plan, AuditLog…)
│  │  ├─ routes/ → controllers/ → services/   # katmanlar: HTTP ↔ iş mantığı
│  │  ├─ services/           # risk, plan üretimi, klinik filtre, AI sağlayıcı, geri bildirim, admin, audit
│  │  ├─ middlewares/        # auth (JWT + rol), doğrulama, hata yakalayıcı
│  │  └─ validators/         # zod şemaları
│  ├─ seeders/               # bölgeler, örnek egzersizler, admin hesabı
│  ├─ tests/                 # vitest + supertest (unit + integration)
│  ├─ API.md                 # tüm uçlar, yanıtlar, hata kodları
│  └─ Dockerfile
├─ frontend/                 # React 19 + TypeScript (Vite)
│  ├─ src/
│  │  ├─ api/                # fetch istemcisi, tipli uçlar, React Query anahtarları
│  │  ├─ context/            # oturum, erişilebilirlik tercihleri
│  │  ├─ components/         # ortak + alan bileşenleri (plans, survey, admin)
│  │  ├─ pages/              # sayfalar (admin/ = yönetim paneli)
│  │  └─ styles/             # tasarım tokenları (açık/koyu/yüksek kontrast)
│  ├─ nginx.conf             # Docker'da: statik dosyalar + /api → backend
│  └─ Dockerfile
├─ .github/                  # CI (otomatik testler), CODEOWNERS, PR şablonu
├─ Proje Plani.md            # yol haritası, aşamalar, "Nerede kaldık?"
├─ Tasarim Plani.md          # mimari, akışlar, ekran tasarımı
└─ CONTRIBUTING.md           # dal (branch) ve Pull Request akışı
```

## Nasıl çalışır?
```
Tarayıcı → nginx (8080) ─┬─ statik React uygulaması
                         └─ /api → Express API (4000) → MySQL 8.4
```
Plan üretimi: **anket → risk değerlendirmesi** (riskliyse uzman yönlendirmesi) **→ uygun onaylı egzersizler → öneri üretici** (şimdilik kural tabanlı, ileride AI) **→ şema kontrolü → klinik filtre → taslak plan → kullanıcı onayı**. Egzersiz sonrası ağrı ≥ 7 veya zorluk ≥ 9 bildirilirse plan **askıya alınır**.

## Ekip çalışması
`main` korumalıdır; herkes kendi dalında çalışıp Pull Request açar. Ayrıntı: [CONTRIBUTING.md](CONTRIBUTING.md).

## Ekip
Şule Nur Gül, Melisa Şakır, Fehmi Can Günay, Sümeyra Ötken · Danışman: Prof. Dr. Ozan Artun
