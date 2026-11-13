# FizyoPlan — Proje kuralları

<!-- Ortak kurallar C:\Dev\CLAUDE.md'de; burada yalnız koddan çıkarılamayan, projeye özel olanlar durur.
     Ekip için kurulum/akış: README.md, CONTRIBUTING.md. Yol haritası: "Proje Plani.md". -->

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

## 🌐 Dil (kök kuraldan istisna)

Mevcut düzene uy: isimler (değişken, fonksiyon, model) İngilizce; **kod yorumları ve API hata mesajları Türkçe**
(ekip Türkçe okuyor). Aynı dosyada iki dil karıştırma. Commit mesajları kök kuraldaki gibi İngilizce `type: subject`.

## 🔀 Git akışı (kök kuraldan istisna: PR ile)

1. Güncel `main`'den `fehmi/<kisa-ingilizce-konu>` dalı aç; doğrulanmış parçayı commit edip dala push et (sormadan).
2. Paket bitince `gh pr create --base main` ile PR aç; `.github/pull_request_template.md`'yi Türkçe doldur.
   Klinik eşik/kural değişikliği (`backend/src/config/clinical.ts`) PR açıklamasında ayrıca belirtilir.
3. `gh pr checks` yeşil olmadan birleştirme yok. Fehmi "tamam" deyince `gh pr merge --rebase` (merge commit yok).
- Ekip arkadaşının PR'ı Fehmi'nin açık onayı olmadan birleştirilmez; onların dalına push edilmez.
- Not: CONTRIBUTING "main korumalı" diyor ama GitHub'da dal koruması açık değil. Yine de `main`'e doğrudan push yok.

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
- API değişince `backend/API.md` güncellenir. İstek doğrulaması `validators/` altındaki zod şemalarıyla.
- Renkler ve ölçüler `frontend/src/styles/` tasarım tokenlarında; erişilebilirlik tercihleri (yüksek kontrast) bozulmaz.

## 🧪 Kritik testler

`backend/tests/` (vitest + supertest). Bozulursa pahalı olanlar:
- Risk değerlendirmesi: riskli kullanıcıya plan üretilmez (`riskService`).
- Klinik filtre: onaysız ya da bölgeye uymayan egzersiz plana girmez (`clinicalFilter`).
- Geri bildirim eşiği aşılınca plan askıya alınır (`feedback`).
- Yetki: kullanıcı başkasının profilini/planını göremez; admin/uzman uçları rol ister (`auth`, `admin`).
Test beklentisi testi geçirmek için değiştirilmez; klinik kural değiştiyse Fehmi onaylar.

## 🐞 Bilinen sorunlar

- MySQL portu `3308` Refakatçim'in yerel MySQL'iyle aynı → ikisi aynı anda açılamaz → önce diğer projede
  `docker compose stop mysql`, ya da kökteki `.env`'de `DB_PORT`'u değiştir (backend `.env`'deki `DB_PORT` de aynı olmalı).
