# Decision Log

Format: each decision has an ID, date, status, the decision, and the reasoning. Never delete
entries; supersede them with a new entry instead.

---

## D-001: Product name is **NXT FORM**
- **Date:** 2026-10-27 · **Status:** Accepted
- Gamified fitness + calorie app. Users "level up" into their next form.

## D-002: Commercial product, open source under AGPL-3.0
- **Date:** 2026-10-27 · **Status:** Accepted
- The app is commercial from the start (subscriptions later). It is a fork of openGym, so the
  entire codebase stays **AGPL-3.0-or-later**. Revenue comes from hosted service and
  subscriptions, not from closed code.
- **Obligations:** offer the full corresponding source to every user of the hosted service (a
  "Source code" link in the app plus a public repo), keep the copyright and license notices,
  and mark our modifications.

## D-003: Fork openGym (Option A in PRD §10.4)
- **Date:** 2026-10-27 · **Status:** Accepted (pending the M0 build check)
- openGym already covers most of the workout half of the PRD (see
  [OPENGYM_AUDIT.md](OPENGYM_AUDIT.md)). Forking saves roughly 4–6 weeks.

## D-004: Keep openGym's architecture (Stack option A)
- **Date:** 2026-10-27 · **Status:** Accepted
- JavaScript (no TypeScript), React 19 + Vite + Zustand + React Router frontend, Capacitor for
  iOS/Android, plain `node:http` API, JSON-per-user storage under `DATA_DIR`.
- Supabase/Postgres from PRD v1 is **dropped for the MVP**. Upstream already plans a database
  storage migration; we will adopt or do it when user count requires.
- Hosting: one small VPS (about CAD $6–10/month).
- Rejected: B (frontend + Supabase backend rewrite, +2–3 weeks, breaks upstream merges),
  C (two backends).

## D-005: Keep JavaScript
- **Date:** 2026-10-27 · **Status:** Accepted
- Matches upstream so we can keep merging openGym improvements.

## D-006: Exercise library
- **Date:** 2026-10-27 · **Status:** Accepted
- Keep openGym's catalogue **text** (about 6,500 exercises; AGPL plus an MIT-licensed
  ExerciseDB portion, all usable in an AGPL fork).
- **Remove the Gym visual media** (`catalogue/media/`). Commercial forks may not use it.
- Use **free-exercise-db** (public domain) images where an exercise can be mapped; otherwise
  show a placeholder.
- Later: optionally buy a Gym visual / ExerciseDB media license for animations.

## D-007: Food data sources (updated)
- **Date:** 2026-10-27 · **Status:** Accepted (superseded by D-020)
- **USDA FoodData Central** (public domain) for generic foods.
- **Open Food Facts** (ODbL) for barcodes. Requires attribution; any redistributed derived
  database must be share-alike.
- Dropped CalorieNinjas in favor of dual-layer parsing (D-020).
- All providers are called **server-side only** (API keys never ship to the client) and
  normalized into our own food model.

## D-008: Photo food estimation is a stub in the MVP
- **Date:** 2026-10-27 · **Status:** Accepted
- Build the full UI and confirmation flow with a fake estimator behind an interface. Plug in a
  real vision model (e.g. Gemini Flash) after the MVP.

## D-009: Build workouts and nutrition in parallel (minimal versions of each)
- **Date:** 2026-10-27 · **Status:** Accepted
- Workouts come mostly from openGym, so nutrition gets most of the new work.

## D-010: Units: metric and imperial, user-selectable, default metric
- **Date:** 2026-10-27 · **Status:** Accepted (openGym already supports kg/lb and cm/in)

## D-011: Sign-in: email + password and Google sign-in
- **Date:** 2026-10-27 · **Status:** Accepted
- openGym has passkeys + optional password. We add **Google OIDC** sign-in and make
  email + password a first-class option. Passkeys stay available.

## D-012: AI provider: decide later
- **Date:** 2026-10-27 · **Status:** Deferred
- Note: openGym already ships an optional AI coach with Gemini (default), OpenAI and Anthropic
  adapters. Evaluate reusing it after the MVP.

## D-013: Extra MVP features
- **Date:** 2026-10-27 · **Status:** Accepted
- Included: water intake, cardio (distance/time), body measurements.
- Reminders/notifications: **deferred until after the MVP** (D-016 supersedes the earlier
  answer). openGym's existing gym reminder stays as-is but is not extended.

## D-014: No billing in the MVP
- **Date:** 2026-10-27 · **Status:** Accepted
- Design the data model so subscription tiers (`plan`, entitlements) can be added later.

## D-015: Docs live in `docs/` in the repo
- **Date:** 2026-10-27 · **Status:** Accepted

## D-016: Reminders/notifications deferred until after the MVP
- **Date:** 2026-10-27 · **Status:** Accepted

## D-017: Gamification model
- **Date:** 2026-10-27 · **Status:** Accepted (details in [GAMIFICATION.md](GAMIFICATION.md))
- XP-based levels. XP is earned for actions, with bonus XP for hitting targets.
- MVP elements: streaks, streak freeze / rest-day protection, badges, titles/ranks,
  daily/weekly quests, evolving avatar "form", **RPG-style stats** (Strength, Endurance,
  Agility, etc.).
- Later: leaderboards/friends (needs social features).
- Missed days: **mild penalty**. The streak resets and a small amount of XP is lost; **levels
  never go down**.
- Honest logging is rewarded: any logged day earns XP, so users aren't pushed into
  under-reporting food.

## D-018: UI: simple first, full redesign later
- **Date:** 2026-10-27 · **Status:** Accepted
- Rename/rebrand to NXT FORM now (name, icon, colors). A complete design overhaul comes after
  the MVP. Guiding principle: **simple and motivating, never overwhelming**. Hide openGym's
  advanced options behind "Advanced" settings.

## D-019: Local development without Docker
- **Date:** 2026-10-27 · **Status:** Accepted
- Docker is not installed. Run `api` (Node) and `frontend` (Vite dev server) directly.
  Node 24 is installed; upstream targets Node 22 (install 22 via nvm-windows if issues
  appear). Use `npm.cmd` in PowerShell (script execution policy blocks `npm.ps1`).

## D-020: Dual-layer food parser (USDA Local Regex + Open-Weight/Fast LLM)
- **Date:** 2026-10-27 · **Status:** Accepted
- Drop CalorieNinjas. Instead implement a 2-tier parsing architecture:
  - **Tier 1 (Instant & $0):** Local regex quantity parser + USDA FoodData Central direct search.
    Handles standard expressions like "2 eggs", "150g oats", "1 cup milk" with zero API cost,
    zero rate limits, and 100% public domain data.
  - **Tier 2 (AI natural language):** Fast open-weight / efficient LLM (e.g., Gemma 27B / 31B, or
    Gemini Flash) called server-side when Tier 1 confidence is low or complex conversational text
    is entered. Returns structured ingredient breakdowns and macros.

## D-021: Personal plan engine on onboarding
- **Date:** 2026-10-27 · **Status:** Accepted
- On signup, users provide stats and target weight. Formulas in `docs/PLAN_ENGINE.md` calculate
  BMR (Mifflin–St Jeor), TDEE, a safe deficit/surplus scaled by % body weight per week, safe floors
  (capped at 25% TDEE, never < 1,200/1,500 kcal), complete macro splits (protein 1.8–2.2g/kg, fat
  25–30%, carbs remainder), water, fibre, and match an initial workout plan from the exercise library.
- Everything is editable and saved with historical provenance.

