# Fizyoterapi API

Temel adres: `http://localhost:4000/api` · Gövde: JSON · Kimlik: `Authorization: Bearer <token>`

## Başlatma
```bash
cd backend
npm install
cp .env.example .env        # değerleri düzenle
npm run db:up               # MySQL (Docker, port 3308)
npm run db:seed             # bölgeler + örnek egzersizler (+ SEED_ADMIN_* varsa admin hesabı)
npm run dev                 # http://localhost:4000/api
npm test                    # testler (ayrı fizyoterapi_test veritabanı)
```

## Genel kurallar
- **Hata formatı** (her hata aynı): `{ "error": { "code": "BAD_REQUEST", "message": "…", "details": [...] } }`
  - `details` doğrulama hatalarında `[{ field, message }]` listesidir. Mesajlar Türkçedir.
- **Durum kodları:** 400 geçersiz veri · 401 giriş gerekli / oturum geçersiz (frontend oturumu kapatmalı) · 403 yetki yok veya onay parolası yanlış (`INVALID_PASSWORD`) · 404 bulunamadı · 409 durum çakışması · 413 gövde > 100 KB · 422 plan üretilemedi · 429 çok fazla istek · 502/504 öneri üretici hatası.
- **Rate limit:** genel 300 istek / 15 dk; production'da giriş 10 / 15 dk, kayıt 10 / saat.
- **Roller:** `user` (varsayılan), `physio` (uzman fizyoterapist), `admin`. Rol her istekte veritabanından okunur.
- Kullanıcıya her ekranda gösterilecek uyarı: *"Bu uygulama tanı koymaz, muayenenin yerini almaz."*

## Uç özeti
| Method | Uç | Auth | Açıklama |
|---|---|---|---|
| GET | `/health` | – | Sunucu + DB durumu |
| POST | `/auth/register` | – | Kayıt → `{ user, token }` |
| POST | `/auth/login` | – | Giriş → `{ user, token }` |
| GET | `/auth/me` | user | `{ user }` |
| PUT | `/auth/password` | user | Parola değiştir → 204 |
| DELETE | `/auth/me` | user | Hesabı ve tüm sağlık verilerini sil (KVKK) → 204 |
| GET / PUT | `/profile` | user | Sağlık anketi |
| GET | `/regions` | – | Vücut bölgeleri |
| GET | `/exercises?region=&difficulty=` | user | Onaylı egzersizler |
| GET | `/exercises/:id` | user | Egzersiz detayı |
| POST | `/plans/generate` | user | Plan üret (taslak) |
| GET | `/plans?status=&type=` | user | Planlarım (özet) |
| GET | `/plans/active` | user | Aktif plan |
| GET | `/plans/active/today?day=` | user | Bugünün egzersizleri |
| GET | `/plans/:id` | user | Plan detayı |
| POST | `/plans/:id/activate` | user | Taslağı onayla → aktif |
| POST | `/plans/:id/reassess` | user | Askıdaki planı yeniden değerlendir |
| POST | `/plan-items/:id/feedback` | user | Ağrı/zorluk bildirimi |
| GET / POST | `/admin/exercises` | physio, admin | Tüm egzersizler / yeni egzersiz |
| PUT | `/admin/exercises/:id` | physio, admin | Egzersiz düzenle (onay düşer) |
| POST | `/admin/exercises/:id/approve` · `/unapprove` | physio, admin | Onayla / onayı kaldır |
| GET | `/admin/users` | admin | Kullanıcılar (sağlık verisi yok) |
| PATCH | `/admin/users/:id/role` | admin | Rol değiştir |

---

## Kimlik doğrulama
**POST `/auth/register`** · `{ "email": "a@b.com", "password": "parola1234" }`
Parola 8-72 karakter, en az bir harf ve bir rakam. → 201 `{ user: { id, email, role }, token }` · 409 e-posta kayıtlı.

**POST `/auth/login`** · `{ email, password }` → 200 `{ user, token }` · 401 `E-posta veya parola hatalı`.

**PUT `/auth/password`** · `{ currentPassword, newPassword }` → 204 · 403 `INVALID_PASSWORD`.

**DELETE `/auth/me`** · `{ password }` → 204. Profil, ağrı bölgeleri, planlar ve geri bildirimler kalıcı olarak silinir; token geçersiz olur.

## Sağlık anketi
**PUT `/profile`** (oluşturur veya günceller)
```json
{
  "birthDate": "1995-05-10",
  "heightCm": 175,
  "weightKg": 72.5,
  "activityLevel": "sedentary | light | moderate | active",
  "redFlags": ["night_pain"],
  "conditions": ["akut_bel_fitigi"],
  "painRegions": [{ "regionCode": "lower_back", "severity": 6 }]
}
```
- 18 yaş altı → 400. `heightCm` 100-250, `weightKg` 30-300, `severity` 0-10.
- `regionCode`: `neck`, `shoulder`, `lower_back`, `knee`.
- `redFlags` kodları (ankette evet/hayır sorusu olarak sorulur; herhangi biri işaretliyse plan üretilmez): `unexplained_weight_loss`, `night_pain`, `numbness_weakness`, `bladder_bowel_dysfunction`, `recent_trauma`, `fever`, `cancer_history`, `chest_pain` (`src/config/clinical.ts`).
- `conditions`: egzersiz kontrendikasyon kodlarıyla eşleşen tanılı durumlar.

**GET `/profile`** → `{ profile: { ...yukarıdakiler, id, userId, createdAt, updatedAt } }` · 404 anket doldurulmamış.

## Egzersizler
**GET `/exercises?region=knee&difficulty=easy`** → `{ exercises: [{ id, title, description, videoUrl, difficulty, setsMin, setsMax, repsMin, repsMax, durationMin, durationMax, regions: [{ id, code, name }], contraindications: [{ condition }] }] }`. Yalnızca onaylı egzersizler döner. `duration*` saniyedir.

## Planlar
**POST `/plans/generate`** · `{ "type": "weekly" | "daily" }` (varsayılan `weekly`)

Akış: risk değerlendirmesi → uygun onaylı egzersizler → öneri üretici → şema kontrolü → klinik doğrulama → taslak plan.

| Sonuç | Yanıt |
|---|---|
| Plan oluştu | 201 `{ outcome: "created", plan, rejected: [{ exerciseId, day, reason }] }` |
| Uzman yönlendirmesi | 200 `{ outcome: "referral", riskLevel: "risky" \| "unassessable", reasons: [...] }` → **Uzman Yönlendirme ekranı** |
| Uygun egzersiz/öneri yok | 422 `NO_SUITABLE_EXERCISES` / `NO_SUITABLE_PLAN` |
| Öneri üretici hatası | 502 `SUGGESTION_FAILED` / `SUGGESTION_INVALID`, 504 `SUGGESTION_TIMEOUT` (plan kaydedilmez) |

Uzman yönlendirme nedenleri: anket yok, ağrı bölgesi yok, kırmızı bayrak, yaş > 75, VKİ 16-40 dışı, herhangi bir bölgede ağrı ≥ 8.

**Plan nesnesi**
```json
{
  "id": 1, "type": "weekly", "status": "draft | active | suspended | completed",
  "activatedAt": null, "suspendedAt": null, "createdAt": "…", "updatedAt": "…",
  "items": [{
    "id": 10, "exerciseId": 7, "day": 1, "sets": 2, "reps": 10, "durationSec": 5,
    "exercise": { "id": 7, "title": "Pelvik Tilt", "description": "…", "videoUrl": null, "difficulty": "easy" },
    "feedback": [{ "id": 1, "pain": 2, "difficulty": 4, "createdAt": "…" }]
  }]
}
```
`day`: haftalık planda 1-7, günlük planda 1.

**GET `/plans?status=active&type=weekly`** → `{ plans: [{ id, type, status, activatedAt, suspendedAt, createdAt, updatedAt, itemCount }] }` (yeniden eskiye).

**GET `/plans/active`** → `{ plan }` (kalemler ve geri bildirimlerle) veya `{ plan: null }`.

**GET `/plans/active/today?day=3`** → `{ plan: { id, type, status, activatedAt }, day, items: [{ ...kalem, completed, todayFeedback }] }`.
Gün, haftalık planda aktifleştirme tarihinden hesaplanır (`(geçen gün % 7) + 1`). `day` (1-7) ile başka bir gün istenebilir. Aktif plan yoksa `{ plan: null, day: null, items: [] }`.

**POST `/plans/:id/activate`** → `{ plan }`. Yalnızca `draft` (değilse 409). Risk yeniden kontrol edilir (uygun değilse 422 `REFERRAL_REQUIRED`). Önceki aktif plan `completed` olur.

**POST `/plan-items/:id/feedback`** · `{ "pain": 0-10, "difficulty": 1-10 }` → 201 `{ feedback, planStatus, suspended, message }`.
Ağrı ≥ 7 veya zorluk ≥ 9 ise plan **askıya alınır** (`suspended: true`) → **Plan Askıya Alındı ekranı**. Plan aktif değilse 409.

**POST `/plans/:id/reassess`** (yalnızca `suspended`, değilse 409)
- Plan askıya alındıktan sonra anket yeniden doldurulmadıysa → `{ canGenerate: false, riskLevel: "unassessable", reasons }`.
- Anket güncel ama risk uygun değil → `{ canGenerate: false, riskLevel, reasons }` (uzman yönlendirmesi).
- Uygun → `{ canGenerate: true, message }`, plan `completed` olur; kullanıcı yeni plan üretebilir.

## Admin / uzman
**POST `/admin/exercises`**
```json
{
  "title": "Pelvik Tilt", "description": "…", "videoUrl": "https://…",
  "difficulty": "easy", "setsMin": 2, "setsMax": 3, "repsMin": 10, "repsMax": 15,
  "durationMin": 5, "durationMax": 10,
  "regionCodes": ["lower_back"], "contraindications": ["akut_bel_fitigi"]
}
```
→ 201 `{ exercise }`. Yeni egzersiz `approved: false` başlar; onaylanana kadar kullanıcılara görünmez ve planlara girmez.

**PUT `/admin/exercises/:id`** — alanların herhangi biri (kısmi). `regionCodes`/`contraindications` gönderilirse baştan yazılır. Her düzenlemede onay düşer.

**POST `/admin/exercises/:id/approve`** / **`/unapprove`** → `{ exercise }` (`approvedBy` = onaylayan).

**GET `/admin/exercises?approved=false&region=neck`** → `{ exercises }` (onaysızlar dahil).

**GET `/admin/users`** → `{ users: [{ id, email, role, createdAt }] }` · **PATCH `/admin/users/:id/role`** `{ role }` → `{ user }` (admin kendi rolünü değiştiremez).

Admin hesabı: `.env`'e `SEED_ADMIN_EMAIL` ve `SEED_ADMIN_PASSWORD` yazıp `npm run db:seed`.
