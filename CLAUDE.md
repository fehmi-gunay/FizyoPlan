# FizyoPlan — Proje kuralları

<!-- Ekip projesi: ortak çalışma kuralları bu dosyadaki "Genel kurallar" bölümünde. Hedef <200 satır.
     Ekip için kurulum ve akış: README.md, CONTRIBUTING.md. Yol haritası: "Proje Plani.md". -->

## Genel kurallar (tüm ekip)

- **Dil:** Kullanıcıyla Türkçe konuş ve bir terimi ilk geçtiği yerde açıkla. Kullanıcının gördüğü metin Türkçedir.
  Bir hatayı bildirirken tam konumunu ver: `[env.ts:12](src/config/env.ts#L12) — açıklama`.
- **Başlangıç:** Ne yapacağını 2-3 cümleyle söyle, dokunacağın dosyaları listele ve onay almadan kod yazma. 5'ten fazla
  dosya ya da belirsiz davranış söz konusuysa önce kısa bir plan ver.
- **Test:** Test edilmemiş iş `main`'e ulaşmaz. "Bitti" demeden önce kapıları çalıştır, çıktıyı oku ve kanıt göster
  (komut + son satırlar ya da ekran görüntüsü); kırmızı kontrolü çıktısıyla bildir. Geçici (doğrulama) test iş bitince silinir.
- **Hata ayıklama:** Önce "Bilinen sorunlar"ı oku, kök nedeni bul, seferde tek tahmin dene.
- **UI:** Onaylı tasarımı ve tasarım belirteçlerini (design tokens) izle; sabit renk ya da boyut yok. Mor→mavi hazır
  geçişler, neon, emoji, robot/parıltı ikonları ve varsayılan yazı tipleri yok. Değişen sayfada: 375px ve masaüstü,
  konsolda hata yok, yükleniyor/boş/hata durumları.
- **Veritabanı:** Yerelde bile `DROP`, `TRUNCATE` ya da `WHERE` olmadan `UPDATE`/`DELETE` yok. Veriyi elle yazmadan önce
  SQL'i ve etkilenecek satır sayısını göster. Uygulanmış bir migration asla düzenlenmez; değişiklik yeni bir migration'dır.
- **Kırmızı çizgiler:** `.env*`, şifreler, anahtarlar ve `secrets/` commit edilmez, içerikleri yazdırılmaz. Bir dosyayı
  silmeden ya da üzerine yazmadan önce içine bak. Geri döndürülemeyen bir komuttan önce tek satırda şunu söyle: ne
  yapılıyor, hangi hedefte, yanlış giderse ne bozulur. Yeni paket/bağımlılık veya yığın değişikliği önce Fehmi'ye sorulur.
- **Git:** Tek satır commit `type: subject` (`feat fix refactor style docs chore test`); dosyalar adıyla eklenir
  (`git add -A` yok). `--force` yok, `git reset --hard` ile kaydedilmiş işi silmek yok, başkasının dalına push yok.
  Akış aşağıda.

## Proje

- Yaşa, boya, kiloya, aktivite düzeyine ve ağrı bölgesine (bel, boyun, omuz, diz) göre güvenli ve kişiselleştirilmiş bir
  egzersiz planı üreten bir web uygulaması. TÜBİTAK 2209-A projesi; takvim Mart–Temmuz 2027, prototip Haziran 2027.
- **Sağlık uygulaması:** Teşhis koymaz. Riskli ya da değerlendirilemeyen kullanıcıya plan üretilmez; uzmana yönlendirilir.
  Öneriler yalnızca uzman onaylı egzersizlerden seçilir ve klinik filtreden geçmeden kullanıcıya ulaşmaz.
- Ekip: Şule Nur Gül, Melisa Şakır, Fehmi Can Günay, Sümeyra Ötken; danışman Prof. Dr. Ozan Artun.
  Repo sahibi ve CODEOWNER: **Fehmi**.
- Pano: `Proje Plani.md` (oturum başında "Nerede Kaldık?" bölümü; iş bitince kontrol listesini güncelle).
  Mimari ve ekranlar: `Tasarim Plani.md`. API: `backend/API.md`.

## Yığın (değiştirme)

Backend Node 22 + Express + TypeScript + Sequelize + MySQL 8.4 + JWT/bcrypt + zod ·
Frontend React 19 + TypeScript + Vite + React Query · Docker Compose (mysql + backend + frontend nginx arkasında).
AI sağlayıcısı henüz seçilmedi: `AiProvider` arayüzünün arkasında duruyor ve şimdilik kural tabanlı.

## Dil (kodun içinde)

Mevcut düzeni izle: isimler (değişken, fonksiyon, model) İngilizce; **kod yorumları ve API hata mesajları Türkçe**
(ekip Türkçe okur). Bir dosyada iki dili karıştırma.

## Git akışı (PR üzerinden)

1. Güncel `main`'den `fehmi/<kısa-İngilizce-konu>` dalı aç; doğrulanan parçayı commit'le ve dala push'la (sormadan).
2. Bir paket bittiğinde `gh pr create --base main` ile PR aç; `.github/pull_request_template.md` dosyasını Türkçe doldur.
   Klinik eşik/kural değişikliği (`backend/src/config/clinical.ts`) PR açıklamasında ayrıca belirtilir.
3. `gh pr checks` yeşil olmadan merge yok. Fehmi "tamam" derse: `gh pr merge --squash --admin` (repoda yalnızca squash
   açık; PR başlığı tek satırlık `type: subject` olur). `--admin` gerekli, çünkü PR yazarı kendi PR'ını onaylayamaz.
   Merge'den sonra GitHub dalı kendisi siler (repo ayarı); yerelde `git switch main && git pull --ff-only`.
- `main` korumalıdır (13 Kasım 2026): PR zorunlu, iki CI kontrolü (Backend, Frontend) yeşil, ekip üyesinin PR'ı için
  CODEOWNER (Fehmi) onayı, lineer geçmiş, force push ve silme kapalı. Koruma ayarı Fehmi'ye sorulmadan değiştirilmez.
- Bir takım arkadaşının PR'ı Fehmi'nin açık onayı olmadan merge edilmez; onun dalına push yapılmaz.

## Komutlar

| Nerede | Komut | Ne yapar |
|---|---|---|
| kök | `docker compose up -d mysql` | Yalnızca veritabanı (`127.0.0.1:3308`) |
| kök | `docker compose up -d --build` | Tüm uygulama, http://localhost:8080 |
| `backend/` | `npm run dev` | API, http://localhost:4000/api |
| `backend/` | `npm run db:seed` | Bölgeler + örnek egzersizler (+ admin) |
| `backend/` | `npx vitest run tests/unit/riskService.test.ts` | Tek test dosyası |
| `frontend/` | `npm run dev` | http://localhost:5173 (`/api` → 4000) |

**Kapılar** (CI ile aynı): backend `npm run typecheck` + `npx tsc -p tests --noEmit` + `npm test` (MySQL çalışıyor olmalı,
ayrı `fizyoplan_test` veritabanı) · frontend `npm run build` + `npm run lint` · değişen sayfayı tarayıcıda kontrol et
(açık/koyu/yüksek kontrast temalarında dahil).

## Kurallar (koddan türetilemeyenler)

- Sağlık verisi (ağrı, hastalık, profil) loglara ya da hata mesajlarına yazılmaz.
- Klinik eşikler yalnızca `backend/src/config/clinical.ts` içinde yaşar (ağrı ≥ 7, zorluk ≥ 9 → plan askıya alınır;
  yaş 18–75). Değerler taslaktır; uzman/danışman onayıyla güncellenecek. Kodda sabit eşik yazılmaz; eşik değişikliği
  Fehmi'ye sorulur.
- Yeni bir egzersiz onaysız başlar; uzman onayından sonra kullanıcılara görünür olur.
- API değişince `backend/API.md` güncellenir. İstek doğrulaması `backend/src/validators/` altındaki zod şemalarıyla yapılır.
- Renkler ve boyutlar `frontend/src/styles/` içindeki tasarım belirteçlerinde yaşar; erişilebilirlik tercihleri
  (yüksek kontrast) bozulmamalı.

## Kritik testler

`backend/tests/` (vitest + supertest). Bozulunca pahalıya patlayan yerler:
- Risk değerlendirmesi: riskli kullanıcıya plan üretilmez (`riskService`).
- Klinik filtre: onaysız ya da bölgesi uyuşmayan egzersiz plana girmez (`clinicalFilter`).
- Geri bildirim eşiği aşılınca plan askıya alınır (`feedback`).
- Yetkiler: kullanıcı başkasının profilini ya da planını göremez; admin/uzman uçları rol ister (`auth`, `admin`).

Bir testi geçirmek için test beklentisi değiştirilmez; klinik kural değiştiyse Fehmi onaylar.

## Bilinen sorunlar

- Port çakışması → FizyoPlan'ın portu değiştirilmez (ekip aynı `.env.example`'ı kullanır); gerekirse yalnızca yerel `.env`
  içindeki `DB_PORT` değiştirilir (kök ve backend aynı olmalı).
