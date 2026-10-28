# openGym Audit

**Audited:** 2026-10-27, `main` (v1.4.3, shallow clone) · **Repo:**
https://github.com/DuarteSantos8/openGym

Status: **Audit and local build verification complete (October 2026)**.
- Local build: Vite compiles cleanly in ~2.2s.
- `catalogue/media` proprietary assets excluded.
- Frontend test suite: 6,509 tests passed (the 16 failures are Windows path-separator assertions in test scripts, bash script invocations, or CRLF index hash checks).
- API test suite: All core database, auth, password, and adapter tests passed (minor failures are Windows-specific POSIX file permission checks `0o600` and Unix sockets).

## 1. Licensing

| Item | License | Can NXT FORM (commercial, AGPL fork) use it? |
|---|---|---|
| App code (frontend, api, mcp) | AGPL-3.0-or-later | ✅ Yes, if we publish our full source to users of the service |
| App store exception (NOTICE.md §7) | Additional permission | ⚠️ Granted by the copyright holder for *openGym*; it is unclear whether it carries over to forks. Get a legal check before submitting to the App Store |
| Exercise text (ExerciseDB-origin, 1,324) | MIT | ✅ Yes, keep the attribution |
| Exercise text (rest, descriptions, translations) | AGPL | ✅ Yes, inside the AGPL fork |
| **Exercise media** (`catalogue/media/`, Gym visual) | Proprietary | ❌ **No.** Commercial forks need their own license. Also forbidden: feeding it to AI tools. **Remove it from our fork** |
| Body-map paths (MuscleMap) | MIT | ✅ Yes, keep the notice |
| lean-qr, jsQR, ML Kit plugin, etc. | Permissive | ✅ Yes, keep the notices |
| Name "openGym" / logos / website | Trademark/brand | ❌ Don't use as our brand. Rebrand to NXT FORM and credit openGym |
| CLA.md | Applies to contributions *to upstream* | n/a, unless we send PRs upstream |

## 2. Architecture (summary)

- **frontend/**: React 19 + Vite, Zustand single store (`gym_state_v1` in localStorage,
  debounced push to the server), React Router, i18n packs, Vitest tests. Capacitor shells for
  Android + iOS (plus an Apple Watch app and widgets).
- **api/**: plain `node:http`, three dependencies. Routes are keyed `'METHOD /path'` and
  documented in `openapi.yaml` (a test enforces this).
- **Storage:** JSON files under `DATA_DIR`. `db.json` holds users, credentials and push
  subscriptions; `state-<uid>.json` holds per-user state. Writes are temp-then-rename. A
  revision/409 merge handles sync conflicts.
- **Auth:** WebAuthn passkeys, optional password, HMAC-signed session cookie, device pairing.
- **AI coach:** optional, in `api/coach/`, with Gemini/OpenAI/Anthropic adapters.
- **Deploy:** Docker Compose (api + nginx web), Helm/K8s, Nix.
- Domain logic lives as pure helpers in `frontend/src/lib/` with tests beside them
  (`progression.js`, `onerm.js`, `finish-workout.js`, `recovery.js`, `measurements.js`, etc.).

## 3. Gap analysis vs PRD

| PRD area | openGym today | Gap / work for NXT FORM |
|---|---|---|
| Exercise library | ✅ 6,554 exercises, search, body-map filter | Replace media; map free-exercise-db images |
| Routine builder, weekly plan, rotations | ✅ | None |
| Workout session, sets, RIR/RPE, rest timer, supersets | ✅ | None |
| Cardio (time/speed) | ✅ basic | Check distance logging; extend if needed |
| Progression rules, 1RM, PRs | ✅ advanced | None |
| Workout history, stats | ✅ | None |
| Body weight + chart | ✅ | Add goal line / 7-day average if missing |
| Body measurements, progress photos | ✅ | None |
| Offline + sync | ✅ | None |
| Import/export (CSV, JSON) | ✅ | Add nutrition data to the export |
| Account deletion | ⚠️ admin/reset flows exist | Verify that self-service delete removes everything |
| PWA + Capacitor apps | ✅ | Rebrand |
| AI coach | ✅ optional | Post-MVP: extend with nutrition context |
| Reminders / push | ✅ gym reminder | Deferred (D-016) |
| **Onboarding with calorie/macro targets** | ❌ (coach intake only) | **New** |
| **Target history** | ❌ | **New** |
| **Food search (USDA/CalorieNinjas)** | ❌ | **New** |
| **Food diary, custom foods, recipes, saved meals** | ❌ | **New** |
| **Barcode food lookup (OFF)** | ⚠️ scanner exists for gym QR (ML Kit native, jsQR web for QR only) | **New** lookup; add EAN/UPC scanning on web |
| **Photo estimation (stub)** | ❌ | **New** |
| **Water tracking** | ❌ | **New** |
| **Nutrition dashboard on Home** | ❌ | **New** |
| **Weekly summary (non-AI)** | ⚠️ stats exist | **New** combined nutrition + training summary |
| **Gamification** | ❌ | **New** (biggest new module) |
| **Google sign-in** | ❌ | **New** (OIDC in the api) |
| **Multi-tenant SaaS hardening** | ⚠️ self-hosted design (`INVITE_ONLY`, admin) | Open sign-up, rate limits, per-user quotas, privacy policy |

## 4. Technical risks

1. **JSON-per-user storage at SaaS scale.** Fine for the beta (hundreds of users). Nutrition logs
   grow the state file daily, so food logs may need their own file per user/month (see
   DATA_MODEL.md). We'll do the Postgres/SQLite move later, ideally aligned with upstream's
   planned migration.
2. **Whole-state sync.** Bigger state means bigger pushes. Mitigation: store nutrition in
   separate documents/endpoints.
3. **Upstream drift.** Every rename/redesign makes merges harder. Mitigation: put new features
   in new files/modules, keep upstream files lightly touched, merge upstream regularly.
4. **App store distribution.** Whether the AGPL app-store exception covers forks is uncertain.
5. **Codebase size/complexity.** Large, heavily tested codebase. We need to learn its
   conventions (no em dashes in UI text, i18n for every string, tests beside logic).
6. **Node version.** Upstream uses Node 22; the machine has Node 24.

## 5. Recommendation

Proceed with **Option A (fork)** as decided in D-003, subject to the M0 local build and test
check. If the build or tests reveal blockers, revisit at the M0 review gate.
