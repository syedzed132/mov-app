# NXT FORM: Product Requirements (v2)

**Version:** 2.0 · **Date:** 2026-10-27 · **Status:** Approved for planning, pending owner review
**Supersedes:** "Fitness & Calorie Coach MVP PRD v1.0". Changes are driven by
[DECISIONS.md](DECISIONS.md).

**Platform:** Mobile-first PWA (fork of openGym), with Capacitor iOS/Android later
**Budget:** ≤ CAD $50/month during development/testing · **AI:** after the MVP · **License:** AGPL-3.0

---

## 1. Vision

A simple, motivating app that combines **gym tracking**, **calorie/macro counting** and
**RPG-style gamification**. Every day you log, you get closer to your *next form*. Later, an AI
coach turns your data into weekly recommendations and workout plans.

The app must deliver full value **without AI**. All calculations, tracking, progression,
gamification and summaries are deterministic code.

### Users and goals
Self-directed fitness enthusiasts with one of three goals: **fat loss**, **maintenance**,
**muscle building**.

### Principles
- **Simple and motivating, never overwhelming.** Advanced options are hidden by default.
- Minimal taps for frequent actions (log food, log set).
- User-controlled goals, targets and routines.
- Transparent calculations. Clear labels for measured vs imported vs estimated vs user-entered data.
- Reward honest logging, never extreme behaviour.
- Privacy-first. Data is exportable and the account can be deleted.
- Cheap infrastructure.

## 2. Scope

### P0: MVP
**Inherited from openGym (verify, rebrand, simplify the UI):**
exercise library · routine builder and weekly plan · workout sessions, sets, rest timer ·
progression and PRs · workout history/stats · body weight + measurements · cardio ·
offline/sync · CSV/JSON export.

**New:**
1. Sign-in: email + password and **Google**. Self-service account deletion.
2. **Onboarding**: goal, body stats, activity, experience, units, which produce calorie + macro
   targets (editable). Target history is preserved.
3. **Nutrition**: food search (USDA + CalorieNinjas natural language), food detail, portions,
   meal diary (breakfast/lunch/dinner/snacks), custom foods, recipes, saved meals,
   favourites/recent, copy meals, edit past days.
4. **Barcode** lookup via Open Food Facts, with an unknown-barcode fallback to manual entry and
   saving as a custom food.
5. **Photo estimate (stub)**: full flow with a fake estimator and mandatory confirmation.
6. **Water** tracking.
7. **Home dashboard**: calories consumed/target/remaining, macros, meals, water, today's workout,
   latest weight, XP/level/streak, quick actions.
8. **Gamification**: XP, levels, streaks, freezes, badges, titles, daily/weekly quests, RPG stats,
   evolving form (see [GAMIFICATION.md](GAMIFICATION.md)).
9. **Weekly summary (non-AI)**: averages, logged days, workouts, weight trend, improvements, data gaps.
10. Nutrition included in data export. Food-data attribution screen.
11. Rebrand to NXT FORM, plus a "Source code" link (AGPL).

### P1: after P0 is stable
Advanced recipe nutrition · custom dashboard · health platform calorie sync · deload suggestions
beyond openGym's · more import formats.

### P2: post-MVP
AI weekly reports · AI workout plan generation · conversational coach (reuse openGym's coach) ·
real photo recognition · **reminders/notifications** · leaderboards/friends · subscriptions and
billing · full UI redesign · Postgres storage · trainer features.

## 3. Navigation (5 tabs, simplified)

| Tab | Contents |
|---|---|
| **Home** | Daily summary, XP ring/level/streak, quests, quick actions (Log food, Scan, Log weight, Start workout) |
| **Food** | Diary by meal, search, scan, photo, custom foods, recipes, saved meals, water |
| **Train** | Today's workout, routines/plan, library, history |
| **Progress** | Weight chart (goal line, 7-day avg), nutrition history, strength, measurements, weekly summary |
| **Profile** | Character sheet (stats, form, badges, title), goals/targets, units, settings, export, delete account, attribution, source code |

## 4. Onboarding and targets

**Inputs:** age/DOB, height, weight, units, goal, activity level, training experience, target
weight and pace (if fat loss or muscle gain). Sex is optional; if it's not given, explain that
the estimate uses an average of the male/female equations.

**Calculation (deterministic, unit-tested):**
1. Validate ranges.
2. BMR via **Mifflin–St Jeor**.
3. × activity multiplier (1.2 / 1.375 / 1.55 / 1.725 / 1.9) → TDEE.
4. Goal adjustment: fat loss −10% to −25% (by pace), maintenance 0, muscle +5% to +15%.
5. Safety floor: never below max(BMR, 1,200 kcal) without a manual override plus a warning.
6. Macros: protein 1.6–2.2 g/kg (goal-based), fat ≥ 0.6 g/kg (~25–30%), carbs = remainder.
7. Show the result as an **estimate**. The user can edit it, and a "calories only" mode is available.

Every target change creates a new `targetHistory` entry (`effectiveFrom`). Past days are judged
against the target that applied on that day.

## 5. Nutrition requirements

- **Provider layer** in the api: `usda`, `off`, `calorieninjas`, `custom`. Each is normalized to
  one internal `Food` shape. Keys stay server-side. Search is debounced (≥ 300 ms) and results are
  limited and cached briefly.
- **Nutrient basis:** per 100 g or per serving. `per100g × grams / 100` or `perServing × qty`.
  Household units only when the source provides gram weights.
- **Missing nutrients stay `null`**, never 0.
- **Every log entry stores a nutrient snapshot**, so editing a food never rewrites history.
- **Diary:** add, edit qty, move between meals, duplicate, copy a meal from another date, delete,
  totals per meal and per day.
- **Recipes:** ingredients → totals → per serving (by servings or final weight).
- **Saved meals:** logging one creates new independent entries.
- **Barcode:** camera permission → scan EAN/UPC (native ML Kit; web BarcodeDetector with a
  fallback library) → OFF lookup → review → portion → confirm. Handle: denied permission,
  unsupported device, not found, missing nutrition, timeout, rate limit.
- **Photo stub:** take/upload → `estimator.estimate()` returns candidates with an uncertainty label
  → edit → confirm or cancel. The photo is not stored after estimation.
- **Water:** quick-add buttons (250 ml / 500 ml / custom; oz in imperial) and a daily target.
- **Attribution:** USDA FDC, Open Food Facts (ODbL), CalorieNinjas (dev only).

## 6. Workouts

openGym's existing features cover the PRD v1 §6 requirements (library, routines, sessions,
lifecycle, rest timer, history, 1RM, PRs, double progression, suggestions without silent changes).

MVP work:
- Remove the licensed media and add free-exercise-db images where they can be mapped.
- Confirm cardio distance logging.
- Simplify: default to a "basic mode" that hides structural balance, plate math, recovery maps
  and similar until the user enables them.
- Emit events for gamification (workout completed, PR, cardio).

## 7. Progress and weekly summary

- Weight: raw entries, 7-day rolling average (only when ≥ 4 entries in the window), goal line,
  rate of change over the selected range. Missing data is shown as gaps, never zeros.
- Weekly summary (Mon–Sun, follows the week-start setting): average calories and protein *on
  logged days*, number of logged days, workouts completed, weight trend with entry count,
  PRs/improvements, XP earned, streak, data-quality warnings ("only 3 of 7 days logged").
- Never claim fat gain or loss from short-term fluctuations.

## 8. Security, privacy, reliability

- Server-side authorization on every route. Users can only touch their own state.
- Rate limits on auth and food-provider proxy routes (openGym has `rate-limit.js`).
- Secrets in server env only. Separate dev and prod keys. Never commit `.env`.
- Export everything (JSON + CSV). Self-service account deletion removes the user's state files
  and uploads.
- Privacy policy before public launch. Review Canadian privacy law (PIPEDA, Quebec Law 25).
- Backups of `DATA_DIR` (daily, off-server), with periodic restore tests.
- Don't log health data in server logs.

## 9. Testing / Definition of Done

Unit tests (Vitest/node:test) for: target calculation, portion scaling, recipe totals, daily
totals, target-history lookup, XP/level/streak/freeze/quest logic, weekly summary, timezone date
boundaries.

Flow tests: onboarding · food logging (add/edit/delete updates totals and XP) · barcode
(found/unknown/failure) · workout (refresh mid-session, complete, PR) · progress (edit a past
weight) · security (user A can't read user B; unauthenticated requests rejected; deletion wipes data).

A feature is **done** when: it works on mobile and desktop; loading/empty/error states exist;
inputs are validated; data persists; tests pass; existing openGym tests still pass; docs are updated.

## 10. Success criteria (MVP)

A new user can sign up (email or Google), finish onboarding, see targets, log food via search,
barcode, natural language and photo stub, track water, run a workout, log weight, earn XP and
level up, see streaks/badges/quests/stats, read the weekly summary, edit history, export data,
and delete the account. All of this without any paid AI and within budget.
