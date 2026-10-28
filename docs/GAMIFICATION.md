# Gamification Design (v0.1, draft numbers, tune during beta)

Goal: make showing up and logging honestly feel rewarding. **Never reward starving,
over-training, or under-reporting food.**

## 1. Core loop

Log something → earn XP → fill the daily ring → level up → unlock title/badge/form → come
back tomorrow (streak).

## 2. XP sources (daily caps prevent grinding)

| Action | XP | Daily cap |
|---|---|---|
| Log at least one meal | 10 | once |
| Log all main meals (breakfast, lunch, dinner) | +15 | once |
| Calories within ±10% of target | +20 | once |
| Protein target reached | +15 | once |
| Water target reached | +10 | once |
| Complete a workout (≥ 1 working set, status "completed") | 40 | 1 workout/day earns full XP; a 2nd earns 50% |
| New personal record | 15 each | 3 |
| Cardio session (≥ 10 min) | 20 | once |
| Log body weight | 5 | once |
| Weekly measurements check-in | 10 | once a week |
| Complete a daily quest | 15–30 | 3 quests/day |
| Complete a weekly quest | 75–150 | 2 quests/week |

Rules:
- Logging any food earns XP **regardless of calories**. Bonus XP for "within target" is a
  ±10% band, so going far *under* target earns no bonus.
- Planned rest days count as "on plan" for streaks when the user logs food or weight.
- Edits/deletions recompute that day's XP (no farming by add-then-delete).

## 3. Levels

- XP needed for level *n → n+1*: `round(100 × n^1.5)` (L1→2: 100, L5→6: 1,118, L10→11: 3,162).
- An engaged user (~120 XP/day) reaches about level 10 in month one, then progress slows.
- **Levels never go down.**

## 4. Missed days (mild penalty, D-017)

- A day with **no logging at all** is a missed day (planned rest days with any log don't count).
- Missed day: the streak resets to 0 and the user loses **10 XP**. XP never drops below the
  current level's floor, so no de-leveling.
- **Streak freeze:** earn 1 freeze per 7-day streak (max 2 banked). It is used automatically on
  a missed day, keeps the streak and prevents the XP loss.

## 5. Streaks

- Daily streak: consecutive days with at least one log (food, workout or weight).
- Milestones at 3, 7, 14, 30, 60, 100 and 365 days award badges and bonus XP.

## 6. RPG stats (character sheet)

Each stat has its own level (1–99), based on rolling activity so it reflects current fitness.

| Stat | Driven by |
|---|---|
| **Strength** | Strength-training volume and PRs (estimated 1RM trends) |
| **Endurance** | Cardio minutes / distance |
| **Agility** | Bodyweight, plyometric and mobility exercises (by catalogue category) |
| **Vitality** | Nutrition: protein, water, calories in range |
| **Discipline** | Streaks, logging consistency, quests |

Stats rise with activity and **slowly decay** after 14+ inactive days (stat level only; account
XP never decays apart from the missed-day rule).

## 7. Titles / ranks (by account level)

| Level | Title |
|---|---|
| 1 | Rookie |
| 5 | Trainee |
| 10 | Athlete |
| 20 | Contender |
| 30 | Elite |
| 45 | Champion |
| 60 | Legend |
| 80 | Mythic |

## 8. Forms (evolving avatar, the "NXT FORM" hook)

A new avatar form unlocks every ~10 levels (Form I–VIII). The MVP uses simple
illustrated/silhouette placeholders; final art comes with the design overhaul. Each form's look
can lean toward the user's highest stat (strength-leaning vs endurance-leaning variants) in a
later version.

## 9. Badges (MVP set, about 20)

First meal logged · First workout · First PR · 10/50/100 workouts · 7/30/100-day streak ·
Protein target 7 days in a row · Hydrated (water target 7 days) · First recipe · Barcode
scanner · 10 cardio sessions · First weigh-in · Measurements logged 4 weeks running · Level
10/25/50 · Quest master (25 quests).

## 10. Quests

- **Daily (3 per day):** chosen from a pool such as "Log breakfast", "Drink 2 L water", "Hit your
  protein", "Finish today's workout", "Log your weight". On rest days, no workout quests.
- **Weekly (2 per week):** e.g. "Complete 3 workouts", "Log food 5 days", "Hit protein 4 days".
- Quests are deterministic and rule-based (no AI in the MVP).

## 11. Later (post-MVP)

Leaderboards and friends, seasonal events, cosmetic unlocks, AI-generated personal quests.

## 12. Implementation notes

- All XP is **derived from logged data** by a pure function (`lib/gamification/`), with unit
  tests. It is not a separately mutated counter. This makes edits and deletes safe, and makes
  cheating via the API harder.
- Store only what can't be derived: freezes used, quest assignments, badge award dates (for
  display).
