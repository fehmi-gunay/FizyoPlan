# FizyoPlan — Proje kuralları

<!-- Ekip projesi: ortak çalışma kuralları "Genel kurallar"da, bu dosyada. Hedef <200 satır.
     Ekip için kurulum/akış: README.md, CONTRIBUTING.md. Yol haritası: "Proje Plani.md". -->

## Genel kurallar (tüm ekip)

- **Dil:** kullanıcıyla Türkçe konuş, terimi ilk geçtiği yerde açıkla.
  Kullanıcının gördüğü metin Türkçe. Hata bildirirken tam konum ver: `[env.ts:12](src/config/env.ts#L12) — açıklama`.
- **Başlarken:** işi 2-3 cümleyle söyle, dokunacağın dosyaları say, onay almadan kod yazma. 5'ten fazla dosya ya da
  belirsiz davranış varsa önce kısa plan.
- **Test:** test edilmeyen iş `main`'e girmez. "Bitti" demeden kapıları çalıştır, çıktıyı gör, kanıt göster (komut + son
  satırlar ya da ekran görüntüsü); kırmızı kontrolü çıktısıyla söyle. Geçici (doğrulama) testi iş bitince silinir.
- **Hata ayıklama:** önce "Bilinen sorunlar"a bak, kök sebebi bul, her seferinde tek tahmin dene.
- **Arayüz:** onaylı tasarıma ve tasarım tokenlarına uy, ekranda sabit renk/ölçü yok. Hazır mor→mavi geçiş, neon, emoji,
  robot/ışıltı ikonu ve varsayılan yazı tipi yok. Değişen sayfada: 375px ve masaüstü, konsolda hata yok,
  yükleniyor/boş/hata durumları.
- **Veritabanı:** yerelde bile `DROP`, `TRUNCATE`, `WHERE`'siz `UPDATE`/`DELETE` yok. Elle veri yazmadan önce SQL'i ve
  etkilenecek satır sayısını göster. Uygulanmış migration düzenlenmez, değişiklik yeni migration'dır.
- **Kırmızı çizgiler:** `.env*`, şifre, anahtar, `secrets/` commit edilmez, içeriği yazılmaz. Silmeden/üstüne yazmadan önce
  dosyaya bak. Geri alınamayan komuttan önce tek satırda söyle: ne yapılıyor, hangi hedefte, yanlış giderse ne bozulur.
  Yeni paket/bağımlılık ve stack değişikliği önce Fehmi'ye sorulur.
- **Git:** commit tek satır `type: subject` (`feat fix refactor style docs chore test`), dosyalar adla eklenir (`git add -A` yok).
  `--force`, kaydedilmiş işi `git reset --hard` ile silmek ve başkasının dalına push yok. Akış aşağıda.

## 📌 Proje

- Yaş, boy, kilo, aktivite ve ağrı bölgesine (bel, boyun, omuz, diz) göre güvenli, kişiye özel egzersiz planı
  üreten web uygulaması. TÜBİTAK 2209-A projesi; takvim Mart–Temmuz 2027, prototip Haziran 2027.
- **Sağlık uygulaması:** tanı koymaz. Riskli ya da değerlendirilemeyen kullanıcıya plan üretilmez, uzmana
  yönlendirilir. Öneri yalnız uzman onaylı egzersizlerden seçilir ve klinik filtreden geçmeden kullanıcıya gitmez.
- Ekip: Şule Nur Gül, Melisa Şakır, Fehmi Can Günay, Sümeyra Ötken; danışman Prof. Dr. Ozan Artun.
  Repo sahibi ve CODEOWNER **Fehmi**.
- Pano: `Proje Plani.md` (oturum başında "Nerede Kaldık?" bölümü, iş sonunda checklist güncellenir).
  Mimari ve ekranlar: `Tasarim Plani.md`. API: `backend/API.md`.

## 📦 Stack (değiştirme)

Backend Node 22 + Express + TypeScript + Sequelize + MySQL 8.4 + JWT/bcrypt + zod ·
Frontend React 19 + TypeScript + Vite + React Query · Docker Compose (mysql + backend + nginx'li frontend).
Yapay zekâ sağlayıcısı henüz seçilmedi: `AiProvider` arayüzü arkasında, şimdilik kural tabanlı.

## 🌐 Dil (kod içi)

Mevcut düzene uy: isimler (değişken, fonksiyon, model) İngilizce; **kod yorumları ve API hata mesajları Türkçe**
(ekip Türkçe okuyor). Aynı dosyada iki dil karıştırma.

## 🔀 Git akışı (PR ile)

1. Güncel `main`'den `fehmi/<kisa-ingilizce-konu>` dalı aç; doğrulanmış parçayı commit edip dala push et (sormadan).
2. Paket bitince `gh pr create --base main` ile PR aç; `.github/pull_request_template.md`'yi Türkçe doldur.
   Klinik eşik/kural değişikliği (`backend/src/config/clinical.ts`) PR açıklamasında ayrıca belirtilir.
3. `gh pr checks` yeşil olmadan birleştirme yok. Fehmi "tamam" deyince `gh pr merge --squash --admin`
   (repoda yalnız squash açık; PR başlığı tek satır `type: subject` olur). `--admin` gerekir çünkü PR'ı yazan onaylayamaz.
   Birleşince GitHub dalı kendisi siler (repo ayarı); yerelde `git switch main && git pull --ff-only`.
- `main` korumalı (13 Kas 2026): PR şart, iki CI kontrolü (Backend, Frontend) yeşil, ekip PR'ına CODEOWNER (Fehmi)
  onayı, düz geçmiş, force push ve silme kapalı. Koruma ayarı Fehmi'ye sormadan değiştirilmez.
- Ekip arkadaşının PR'ı Fehmi'nin açık onayı olmadan birleştirilmez; onların dalına push edilmez.

## ⌨️ Komutlar

| Yer | Komut | Ne yapar |
|---|---|---|
| kök | `docker compose up -d mysql` | Yalnız veritabanı (`127.0.0.1:3308`) |
| kök | `docker compose up -d --build` | Tam uygulama, http://localhost:8080 |
| `backend/` | `npm run dev` | API, http://localhost:4000/api |
| `backend/` | `npm run db:seed` | Bölgeler + örnek egzersizler (+ admin) |
| `backend/` | `npx vitest run tests/unit/riskService.test.ts` | Tek test dosyası |
| `frontend/` | `npm run dev` | http://localhost:5173 (`/api` → 4000) |

**Kapılar** (CI ile aynı): backend `npm run typecheck` + `npx tsc -p tests --noEmit` + `npm test`
(MySQL açık olmalı, ayrı `fizyoplan_test` veritabanı) · frontend `npm run build` + `npm run lint` ·
değişen sayfaya tarayıcıda bakmak (açık/koyu/yüksek kontrast temaları dahil).

## 🔒 Kurallar (koddan çıkmayan)

- Sağlık verisi (ağrı, hastalık, profil) loglara ve hata mesajlarına yazılmaz.
- Klinik eşikler yalnız `backend/src/config/clinical.ts`'de (ağrı ≥ 7, zorluk ≥ 9 → plan askıya; yaş 18–75).
  Değerler taslak, uzman/danışman onayıyla güncellenecek. Kodda sabit eşik yok; eşik değişikliği Fehmi'ye sorulur.
- Yeni egzersiz onaysız başlar; kullanıcıya yalnız uzman onayından sonra görünür.
- API değişince `backend/API.md` güncellenir. İstek doğrulaması `backend/src/validators/` altındaki zod şemalarıyla.
- Renkler ve ölçüler `frontend/src/styles/` tasarım tokenlarında; erişilebilirlik tercihleri (yüksek kontrast) bozulmaz.

## 🧪 Kritik testler

`backend/tests/` (vitest + supertest). Bozulursa pahalı olanlar:
- Risk değerlendirmesi: riskli kullanıcıya plan üretilmez (`riskService`).
- Klinik filtre: onaysız ya da bölgeye uymayan egzersiz plana girmez (`clinicalFilter`).
- Geri bildirim eşiği aşılınca plan askıya alınır (`feedback`).
- Yetki: kullanıcı başkasının profilini/planını göremez; admin/uzman uçları rol ister (`auth`, `admin`).
Test beklentisi testi geçirmek için değiştirilmez; klinik kural değiştiyse Fehmi onaylar.

## 🐞 Bilinen sorunlar

- Port çakışması → FizyoPlan'ın portu değiştirilmez (ekip aynı `.env.example`'ı kullanıyor); gerekirse yalnız yerel `.env`'de `DB_PORT` (kök ve backend aynı).
