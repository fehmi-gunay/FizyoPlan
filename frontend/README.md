# FizyoPlan – Frontend

React 19 + TypeScript (Vite) · React Router · TanStack Query · React Hook Form + zod.

```bash
npm install
npm run dev     # http://localhost:5173 (backend localhost:4000'de çalışmalı)
npm run build
```

## Klasörler
- `src/api/` – `client.ts` (fetch + token + ApiError), `endpoints.ts` (tipli uçlar + React Query anahtarları), `hooks.ts`, `admin.ts`
- `src/context/` – oturum (`AuthContext`) ve erişilebilirlik tercihleri (`PreferencesContext`: tema, yazı boyutu)
- `src/components/` – ortak bileşenler (`ui.tsx`, `form.tsx`, `Layout.tsx`) ve alan bileşenleri
- `src/pages/` – sayfalar (`admin/` yönetim paneli)
- `src/styles/global.css` – tasarım tokenları (açık / koyu / yüksek kontrast) ve ortak sınıflar
- `src/types/api.ts` – backend DTO tipleri (`backend/API.md` ile uyumlu)
