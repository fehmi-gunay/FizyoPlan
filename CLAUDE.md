# FizyoPlan — Project rules

<!-- Team project: the shared working rules are in "General rules" in this file. Target <200 lines.
     Setup/flow for the team: README.md, CONTRIBUTING.md. Roadmap: "Proje Plani.md". -->

## General rules (whole team)

- **Language:** talk to the user in Turkish and explain a term the first time it appears. Text the user sees is Turkish.
  When reporting an error give the exact location: `[env.ts:12](src/config/env.ts#L12) — explanation`.
- **Starting:** say what you will do in 2-3 sentences, list the files you will touch, and do not write code without
  approval. If more than 5 files or unclear behavior are involved, give a short plan first.
- **Testing:** untested work does not reach `main`. Before saying "done" run the gates, read the output and show
  evidence (command + last lines, or a screenshot); report a red check with its output. A temporary (verification)
  test is deleted when the work is done.
- **Debugging:** read "Known issues" first, find the root cause, try one guess at a time.
- **UI:** follow the approved design and the design tokens, no hard-coded colors/sizes. No stock purple→blue
  gradients, neon, emoji, robot/sparkle icons or default fonts. On a changed page: 375px and desktop, no console
  errors, loading/empty/error states.
- **Database:** even locally, no `DROP`, `TRUNCATE`, or `UPDATE`/`DELETE` without `WHERE`. Before writing data by hand,
  show the SQL and the number of rows it will affect. An applied migration is never edited; a change is a new migration.
- **Red lines:** `.env*`, passwords, keys and `secrets/` are not committed and their contents are not written out.
  Look at a file before deleting/overwriting it. Before an irreversible command say in one line: what is being done,
  on which target, and what breaks if it goes wrong. A new package/dependency or a stack change is asked to Fehmi first.
- **Git:** one-line commit `type: subject` (`feat fix refactor style docs chore test`), files added by name (no
  `git add -A`). No `--force`, no deleting saved work with `git reset --hard`, no push to someone else's branch. Flow below.

## Project

- A web app that produces a safe, personalized exercise plan from age, height, weight, activity and pain region
  (lower back, neck, shoulder, knee). A TÜBİTAK 2209-A project; schedule March–July 2027, prototype June 2027.
- **Health app:** it does not diagnose. No plan is produced for a risky or unassessable user; they are referred to a
  specialist. Recommendations are chosen only from specialist-approved exercises and never reach the user without
  passing the clinical filter.
- Team: Şule Nur Gül, Melisa Şakır, Fehmi Can Günay, Sümeyra Ötken; advisor Prof. Dr. Ozan Artun.
  Repo owner and CODEOWNER: **Fehmi**.
- Board: `Proje Plani.md` (the "Nerede Kaldık?" (where did we stop) section at the start of a session, update the
  checklist at the end of work). Architecture and screens: `Tasarim Plani.md`. API: `backend/API.md`.

## Stack (do not change)

Backend Node 22 + Express + TypeScript + Sequelize + MySQL 8.4 + JWT/bcrypt + zod ·
Frontend React 19 + TypeScript + Vite + React Query · Docker Compose (mysql + backend + frontend behind nginx).
The AI provider is not chosen yet: it sits behind the `AiProvider` interface and is rule-based for now.

## Language (inside code)

Follow the existing convention: names (variables, functions, models) are English; **code comments and API error
messages are Turkish** (the team reads Turkish). Do not mix two languages in one file.

## Git flow (via PR)

1. From an up-to-date `main` create a `fehmi/<short-english-topic>` branch; commit a verified piece and push it to the branch (without asking).
2. When a package is done open a PR with `gh pr create --base main`; fill `.github/pull_request_template.md` in Turkish.
   A clinical threshold/rule change (`backend/src/config/clinical.ts`) is called out separately in the PR description.
3. No merge before `gh pr checks` is green. When Fehmi says "tamam" (ok): `gh pr merge --squash --admin`
   (only squash is enabled in the repo; the PR title becomes the one-line `type: subject`). `--admin` is needed because the PR author cannot approve.
   After merging, GitHub deletes the branch itself (repo setting); locally `git switch main && git pull --ff-only`.
- `main` is protected (13 Nov 2026): a PR is required, both CI checks (Backend, Frontend) green, CODEOWNER (Fehmi)
  approval for a team member's PR, linear history, force push and deletion disabled. The protection setting is not changed without asking Fehmi.
- A teammate's PR is not merged without Fehmi's explicit approval; no push to their branch.

## Commands

| Where | Command | What it does |
|---|---|---|
| root | `docker compose up -d mysql` | Database only (`127.0.0.1:3308`) |
| root | `docker compose up -d --build` | Full app, http://localhost:8080 |
| `backend/` | `npm run dev` | API, http://localhost:4000/api |
| `backend/` | `npm run db:seed` | Regions + sample exercises (+ admin) |
| `backend/` | `npx vitest run tests/unit/riskService.test.ts` | Single test file |
| `frontend/` | `npm run dev` | http://localhost:5173 (`/api` → 4000) |

**Gates** (same as CI): backend `npm run typecheck` + `npx tsc -p tests --noEmit` + `npm test`
(MySQL must be running, separate `fizyoplan_test` database) · frontend `npm run build` + `npm run lint` ·
look at the changed page in the browser (including the light/dark/high-contrast themes).

## Rules (not derivable from code)

- Health data (pain, illness, profile) is not written to logs or error messages.
- Clinical thresholds live only in `backend/src/config/clinical.ts` (pain ≥ 7, difficulty ≥ 9 → plan suspended; age 18–75).
  The values are a draft and will be updated with specialist/advisor approval. No hard-coded thresholds in code; a threshold change is asked to Fehmi.
- A new exercise starts unapproved; it becomes visible to users only after specialist approval.
- When the API changes, update `backend/API.md`. Request validation uses the zod schemas under `backend/src/validators/`.
- Colors and sizes live in the design tokens in `frontend/src/styles/`; accessibility preferences (high contrast) must not break.

## Critical tests

`backend/tests/` (vitest + supertest). Expensive when broken:
- Risk assessment: no plan is produced for a risky user (`riskService`).
- Clinical filter: an unapproved or region-mismatched exercise does not enter a plan (`clinicalFilter`).
- When the feedback threshold is exceeded the plan is suspended (`feedback`).
- Permissions: a user cannot see another user's profile/plan; admin/specialist endpoints require a role (`auth`, `admin`).
A test expectation is not changed to make a test pass; if a clinical rule changed, Fehmi approves.

## Known issues

- Port conflict → FizyoPlan's port is not changed (the team uses the same `.env.example`); if needed only change `DB_PORT` in the local `.env` (root and backend the same).
