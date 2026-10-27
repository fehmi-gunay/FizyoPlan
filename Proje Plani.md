# Proje Planı – Fizyoterapi Egzersiz Planlama Sistemi

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
| Veritabanı | MySQL (Docker ile), ORM: **Sequelize** |
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
- [ ] **Aşama 6 – Feedback + plan askıya alma**, günlük/haftalık plan listeleme
- [ ] **Aşama 7 – Test, güvenlik sertleştirme, API dokümanı**
- [ ] **Aşama 8 – Gerçek AI entegrasyonu** (`AiProvider` arkasına)
- [ ] **Aşama 9 – React + TS frontend** (bkz. `Tasarim Plani.md`)
- [ ] **Aşama 10 – Video içerikleri, SUS testi, sonuç raporu**

## 7. Nerede Kaldık?
- Durum: Aşama 1-5 tamam, gerçek isteklerle doğrulandı. Docker MySQL **3308** portunda (3306 yerel mysqld, 3307 başka proje kullanıyor).
- Repo: https://github.com/fehmi-gunay/fizyoterapi-projesi (gizli). Her aşama sonunda commit + push.
- Çalışan uçlar: `/health`, `/auth/register|login|me`, `/profile` (GET/PUT), `/regions`, `/exercises`, `/plans/generate`, `/plans/:id`, `/plans/:id/activate`.
- Aşama 5 yapısı: `config/clinical.ts` (eşikler + kırmızı bayrak kodları, **taslak**), `riskService` → `planService.selectCandidates` (bölge + onay + kontrendikasyon + şiddete göre zorluk) → `aiService` (`AiProvider`, zaman aşımı, zod şema kontrolü) → `clinicalFilter` (Denklem 1) → taslak plan. Onayda risk yeniden kontrol edilir; önceki aktif plan `completed` olur.
- `/plans/generate` yanıtı: riskli/değerlendirilemedi → 200 `{outcome:"referral", riskLevel, reasons}`; başarılı → 201 `{outcome:"created", plan, rejected}`; uygun öneri yok → 422 `NO_SUITABLE_*`; öneri hatası/şema/zaman aşımı → 502/504.
- Başlatma: `npm run db:up` → `npm run dev` (backend klasöründe).
- Bilinen küçük konu: `weightKg` yanıtta string ("72.0", DECIMAL) dönüyor.
- Sıradaki adım: Aşama 6 (feedback + askıya alma (Denklem 2), `GET /plans` günlük/haftalık listeleme).

## 8. Açık Konular
- AI sağlayıcısı (hangi hazır model/API?) – Aşama 8'de kararlaştırılacak.
- Risk kuralları (kırmızı bayraklar listesi), eşik değerleri, set/tekrar sınırları – fizyoterapist/danışman onayı gerekli.
- Egzersiz içeriği ve video üretimi (hedef 100+) – uzman desteği; yetişmezse resim + metin (PDF B planı).
- Veri güvenliği: sağlık verisi (KVKK) – şifreleme, yetkilendirme, bulut depolama (PDF risk tablosu).

## 9. Karar Günlüğü
| Tarih | Karar |
|---|---|
| 2026-10-27 | Backend Node + Express + TypeScript, MySQL (Docker), Sequelize; frontend React + TS |
| 2026-10-27 | AI entegrasyonu sonraya bırakıldı; `AiProvider` arayüzü + kural tabanlı yedek |
| 2026-10-27 | Kod GitHub'da gizli repoda; her aşama sonunda commit + push (geri dönüş noktası) |
| 2026-10-27 | Risk: kırmızı bayrak, yaş >75, VKİ 16-40 dışı, ağrı ≥8 → uzman yönlendirmesi (taslak, uzman onayı bekliyor) |
