# Proje Planı – FizyoPlan (Fizyoterapi Egzersiz Planlama Sistemi)

> Bu dosya projenin yol haritasıdır. Her oturumun başında "Nerede Kaldık?" bölümüne bak, işin sonunda checklist'i ve bu bölümü güncelle.
> Kaynak: `2209A_Proje_Formu10 (1).pdf` (TÜBİTAK 2209-A). Tasarım detayları: `Tasarim Plani.md`.

## 1. Proje Özeti
Kullanıcıların yaş, boy, kilo, günlük aktivite düzeyi ve ağrı bölgesi (bel, boyun, omuz, diz) bilgilerine göre **güvenli, kişiye özel günlük/haftalık fizyoterapi egzersiz planı** üreten web uygulaması. Her egzersiz için video/metin rehberi vardır.

**Temel güvenlik ilkeleri (PDF'ten):**
- Sistem tanı koymaz, muayene yerine geçmez.
- Riskli / değerlendirilemeyen kullanıcıya plan üretilmez → uzman yönlendirmesi.
- Yapay zekâ **sadece uzman onaylı egzersiz kütüphanesinden** seçer; çıktı klinik kurallardan geçmeden kullanıcıya gitmez.
- Egzersiz sonrası bildirilen ağrı/zorluk eşiği aşılırsa plan **askıya alınır**.
- Hedef kitle: 18 yaş ve üzeri. Hedef: en az 100 uzman onaylı egzersiz. Başarı: SUS testi (≥15 katılımcı, 68 ile t-testi).

**Takvim (PDF):** Mart 2027 – Temmuz 2027. Prototip hedefi: Haziran 2027.
**Ekip:** Şule Nur Gül, Melisa Şakır, Fehmi Can Günay, Sümeyra Ötken. Backend + AI entegrasyonu: Fehmi Can Günay, Sümeyra Ötken. Danışman: Prof. Dr. Ozan Artun.

## 2. Teknoloji Kararları
| Katman | Seçim |
|---|---|
| Frontend | React + TypeScript (Vite) |
| Backend | Node.js + Express + **TypeScript** |
| Veritabanı | MySQL 8.4 (Docker ile), ORM: **Sequelize** |
| Çalıştırma | Docker Compose (`fizyoplan`): mysql + backend + frontend (nginx) |
| Ekip akışı | GitHub, korumalı `main`, dal + Pull Request, CI (GitHub Actions) |
| Auth | JWT + bcrypt |
| Doğrulama | zod |
| Yapay zekâ | Hazır model/API, **sonradan** seçilecek. `AiProvider` arayüzü arkasında; şimdilik kural tabanlı yedek |

> Not: PDF'te MongoDB de geçiyor; karar MySQL (PDF özetinde "MySQL ya da MongoDB" denmiş).

## 3. Backend Klasör Yapısı
```
backend/
├─ docker-compose.yml
├─ package.json  tsconfig.json  .env.example  .gitignore
├─ src/
│  ├─ server.ts            # DB bağlan + listen
│  ├─ app.ts               # express, cors, helmet, rate-limit, route'lar, hata yakalayıcı
│  ├─ config/              # env.ts, database.ts
│  ├─ models/              # User, HealthProfile, BodyRegion, Exercise, ...
│  ├─ routes/  controllers/
│  ├─ services/            # riskService, aiService, clinicalFilter, planService, feedbackService
│  ├─ middlewares/         # auth, validate, errorHandler
│  ├─ validators/          # zod şemaları
│  ├─ types/
│  └─ utils/               # ApiError, asyncHandler, logger
├─ seeders/                # bölgeler + örnek egzersizler
└─ tests/
```
Katman kuralı: **route → controller (HTTP) → service (iş mantığı) → model (veri)**. İş mantığı controller'a yazılmaz.

## 4. Veri Modeli (özet)
- **User**(email, passwordHash, role: user|admin|physio)
- **HealthProfile**(userId, birthDate, heightCm, weightKg, activityLevel, redFlags, conditions)
- **BodyRegion**(neck, shoulder, lower_back, knee) + kullanıcı ağrı bölgeleri (M:N, şiddet)
- **Exercise**(title, description, videoUrl, difficulty, set/tekrar/süre min-max, approved, approvedBy); ExerciseRegion (M:N); ExerciseContraindication
- **Plan**(userId, type: daily|weekly, status: active|suspended|…); **PlanItem**(planId, exerciseId, day, sets, reps, duration)
- **SessionFeedback**(planItemId, pain 0-10, difficulty)

## 5. Plan Üretim Akışı (PDF Şekil 1)
1. Anket doğrulanır →
2. Risk değerlendirmesi: riskli/değerlendirilemedi ise **plan yok, uzman yönlendirmesi** →
3. Bölgeye uygun onaylı egzersiz ID'leri seçilir →
4. Öneri üretici (AI; şimdilik kural tabanlı) JSON öner →
5. Şema kontrolü (hata/zaman aşımı → plan kaydedilmez) →
6. Klinik doğrulama (Denklem 1): kütüphanede mi, kontrendikasyon kesişimi boş mu, set/tekrar/süre sınırları içinde mi →
7. Uygun öneri yoksa "plan oluşturulamadı", varsa plan kaydedilir →
8. Kullanıcı onayı → aktif plan → egzersiz sonrası ağrı `a ≥ θa` veya zorluk `z ≥ θz` ise **plan askıya** (Denklem 2).
Eşikler (θa, θz) ve sınır değerler uzman fizyoterapistle belirlenecek → `config`'te tutulur.

## 6. Aşamalar / Checklist
- [x] **Aşama 1 – İskelet:** `backend/` TS kurulumu, docker-compose (MySQL), `.env`, DB bağlantısı, `GET /api/health`
- [x] **Aşama 2 – Modeller + seeder:** tablolar, ilişkiler, bölgeler, örnek egzersizler
- [x] **Aşama 3 – Auth:** kayıt/giriş, bcryptjs + JWT, auth ve rol middleware
- [x] **Aşama 4 – Profil/anket + egzersiz kütüphanesi uçları** (sadece `approved`)
- [x] **Aşama 5 – Risk + clinicalFilter + kural tabanlı plan üretimi** (AI'sız tam akış)
- [x] **Aşama 6 – Feedback + plan askıya alma**, günlük/haftalık plan listeleme
- [x] **Aşama 7 – Test, güvenlik sertleştirme, API dokümanı** (+ uzman/admin egzersiz yönetimi)
- [ ] **Aşama 8 – Gerçek AI entegrasyonu** (`AiProvider` arkasına)
- [x] **Aşama 9 – React + TS frontend** (bkz. `Tasarim Plani.md`) — ilk sürüm; tarayıcıda görsel kontrol ve geri bildirimle iyileştirme sürüyor
- [ ] **Aşama 10 – Video içerikleri, SUS testi, sonuç raporu**

## 7. Nerede Kaldık?
- Durum: **Çalışan web sitesi Docker'da** — backend (Aşama 1-7) + frontend (Aşama 9) + admin paneli (giriş/aktivite kayıtları). 158 backend testi geçiyor.
- Repo: https://github.com/fehmi-gunay/FizyoPlan (**herkese açık**). `main` korumalı: ekip dal açıp PR gönderir, yalnızca proje sahibi onaylayıp birleştirir. Her PR'da CI (backend testleri + frontend derleme). Akış: `CONTRIBUTING.md`.
- Docker (kök `docker-compose.yml`, proje `fizyoplan`): `fizyoplan_mysql` (:3308), `fizyoplan_backend` (:4001, açılışta seed + DB_SYNC), `fizyoplan_frontend` (nginx, **http://localhost:8080**). Ayarlar kök `.env` (şablon `.env.example`).
- Geliştirme: `docker compose up -d mysql` → `backend: npm run dev` (:4000) + `frontend: npm run dev` (:5173). `backend/.env` DB_* değerleri kök `.env` ile aynı.
- Admin: `admin@fizyo.local` (parola kök `.env` → `SEED_ADMIN_PASSWORD`).
- Açık iş: tarayıcıda görsel kontrol (mobil, koyu tema, yüksek kontrast) — Claude in Chrome bağlanınca yapılacak.
- Sıradaki: görsel düzeltmeler → Aşama 8 (AI + animasyon videoları, kişiye göre filtreleyip program oluşturan model) → Aşama 10.

## 8. Açık Konular
- AI sağlayıcısı (hangi hazır model/API?) – Aşama 8'de kararlaştırılacak.
- Risk kuralları (kırmızı bayraklar listesi), eşik değerleri, set/tekrar sınırları – fizyoterapist/danışman onayı gerekli.
- Egzersiz içeriği ve video üretimi (hedef 100+) – uzman desteği; yetişmezse resim + metin (PDF B planı).
- Egzersiz onayı kaldırılır/düzenlenirse mevcut aktif planlardaki kalemler etkilenmiyor — uzmanla konuşulmalı (planı askıya alma?).
- Askıdan sonra yeni plan: anketin yeniden doldurulması şartı var; uzman ayrıca bekleme süresi isteyebilir.
- Production: HTTPS (sunucuda ters vekil/sertifika), Docker'daki `DB_SYNC` yerine migration.
- Veri güvenliği: sağlık verisi (KVKK) – şifreleme, yetkilendirme, bulut depolama (PDF risk tablosu).

## 9. Karar Günlüğü
| Tarih | Karar |
|---|---|
| 2026-10-27 | Backend Node + Express + TypeScript, MySQL (Docker), Sequelize; frontend React + TS |
| 2026-10-27 | AI entegrasyonu sonraya bırakıldı; `AiProvider` arayüzü + kural tabanlı yedek |
| 2026-10-27 | Kod GitHub'da gizli repoda; her aşama sonunda commit + push (geri dönüş noktası) |
| 2026-10-27 | Bir kullanıcının tek aktif planı olur; yeni plan onaylanınca eski `completed` |
| 2026-10-27 | Askıya alınan plan için yeni plan, ancak anket yeniden doldurulduktan sonra |
| 2026-10-27 | Yeni/düzenlenen egzersiz onaysız başlar; physio/admin onaylar |
| 2026-10-27 | Admin paneli + giriş/aktivite kayıtları (KVKK: sağlık verisi loglanmaz, silinen hesabın e-postası anonimleşir) |
| 2026-10-27 | Frontend: Vite + React + TS, TanStack Query, RHF + zod, kendi CSS token sistemi (Bootstrap/Tailwind yerine) |
| 2026-10-27 | Proje adı **FizyoPlan**; Docker Compose ile mysql + backend + frontend (YapYaptır yapısı örnek alındı) |
| 2026-10-27 | Repo herkese açık; `main` korumalı (PR + proje sahibinin onayı), CI zorunlu |
| 2026-10-27 | Risk: kırmızı bayrak, yaş >75, VKİ 16-40 dışı, ağrı ≥8 → uzman yönlendirmesi (taslak, uzman onayı bekliyor) |
