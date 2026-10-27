# FizyoPlan – Fizyoterapi Egzersiz Planlama Sistemi

Kullanıcının yaş, boy, kilo, aktivite düzeyi ve ağrı bölgesine (bel, boyun, omuz, diz) göre **güvenli, kişiye özel** günlük/haftalık egzersiz planı üreten web uygulaması. TÜBİTAK 2209-A projesi.

> Uygulama tanı koymaz, muayenenin yerini almaz. Riskli kullanıcıya plan üretilmez, uzmana yönlendirilir.

## Yapı
| Klasör | İçerik |
|---|---|
| `backend/` | Node.js + Express + TypeScript, MySQL (Docker) + Sequelize, JWT. API: [`backend/API.md`](backend/API.md) |
| `frontend/` | React + TypeScript (Vite), React Router, TanStack Query |
| `Proje Plani.md` | Yol haritası, aşamalar, "Nerede kaldık?" |
| `Tasarim Plani.md` | Mimari, akış diyagramları, ekran tasarımı |

## Çalıştırma
Gereksinimler: Node.js 20+, Docker Desktop.

```bash
# 1) Backend
cd backend
npm install
cp .env.example .env      # değerleri düzenle (JWT_SECRET, isteğe bağlı SEED_ADMIN_*)
npm run db:up             # MySQL (port 3308)
npm run db:seed           # bölgeler + örnek egzersizler (+ admin hesabı)
npm run dev               # http://localhost:4000/api

# 2) Frontend (ayrı terminal)
cd frontend
npm install
npm run dev               # http://localhost:5173  (/api istekleri backend'e yönlenir)
```

Testler: `cd backend && npm test`

## Ekip
Şule Nur Gül, Melisa Şakır, Fehmi Can Günay, Sümeyra Ötken · Danışman: Prof. Dr. Ozan Artun
