# Katkı Rehberi – FizyoPlan

## Dal (branch) düzeni
- **`main`**: her zaman çalışan, incelenmiş kod. **Doğrudan push kapalıdır.** Değişiklikler yalnızca Pull Request (PR) ile ve proje sahibinin onayıyla girer.
- Herkes kendi işini **ayrı bir dalda** yapar. Dal adları:
  - `feature/<kisa-aciklama>` – yeni özellik (ör. `feature/egzersiz-videolari`)
  - `fix/<kisa-aciklama>` – hata düzeltme (ör. `fix/anket-yas-kontrolu`)
  - `docs/...`, `chore/...` – doküman / bakım

## Adım adım
```bash
# 1) main'i güncelle ve kendi dalını aç
git checkout main
git pull
git checkout -b feature/egzersiz-videolari

# 2) Çalış, küçük ve anlamlı commit'ler at
git add .
git commit -m "Egzersiz detayına video oynatıcı eklendi"

# 3) Dalını GitHub'a gönder
git push -u origin feature/egzersiz-videolari
```
4. GitHub'da **Pull Request** aç (`base: main` ← `compare: senin dalın`), şablonu doldur.
5. **CI** (otomatik testler) yeşil olmalı. Proje sahibi inceler, gerekirse değişiklik ister; onaylayınca `main`'e birleştirir.
6. Birleşmeden önce `main` ilerlediyse dalını güncelle:
   ```bash
   git checkout main && git pull
   git checkout feature/egzersiz-videolari && git merge main
   ```

## Kurallar
- `.env` dosyalarını, parola ve API anahtarlarını **asla** commit'leme (şablonlar: `.env.example`).
- Göndermeden önce: `backend` → `npm test`, `frontend` → `npm run build`.
- API değiştirirsen `backend/API.md`'yi güncelle.
- Sağlık verilerini loglara yazma; klinik eşik/kural değişikliklerini (`backend/src/config/clinical.ts`) PR açıklamasında belirt.

## Projeyi çalıştırma
Bkz. [README.md](README.md).
