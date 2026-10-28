# Personal Plan Engine (v0.1, draft for owner review)

At signup, the user enters their stats and target weight. Deterministic formulas (no AI) produce a
complete personal plan. Every number is shown as an **estimate**, every number is editable, and
the inputs used are saved in `targetHistory` (see DATA_MODEL.md).

Code: `frontend/src/lib/plan/` (pure functions + unit tests). Constants live in one
config file so they can be tuned without code changes.

---

## 1. Signup inputs

| Input | Required | Notes |
|---|---|---|
| Sex (for the formula) | optional | If skipped, use the average of the male and female equations, and explain why |
| Age / date of birth | ✅ | Must be 18+ for MVP plans (see §10) |
| Height | ✅ | cm or ft/in |
| Current weight | ✅ | kg or lb |
| Target weight | ✅ (unless maintenance) | Validated: target BMI must be ≥ 18.5 |
| Goal | ✅ | Derived from target vs current (lose / maintain / gain), user can override |
| Pace | ✅ | Relaxed / Moderate / Aggressive (see §4) |
| Activity level (outside the gym) | ✅ | Plain-language options with examples |
| Training days per week | ✅ | 0–7 |
| Training experience | ✅ | Beginner / Intermediate / Advanced |
| Body fat % | optional | Enables the more accurate Katch–McArdle formula |
| Equipment access | ✅ | Full gym / Home dumbbells / Bodyweight only (for the workout plan) |
| Meals per day | optional | Default 3 + 1 snack |
| Diet preference | optional | Balanced / High-protein / Low-carb / Low-fat / Calories only |

## 2. BMR (resting energy)

- **Mifflin–St Jeor** (default):
  `BMR = 10·kg + 6.25·cm − 5·age + s`, where `s = +5` (male), `−161` (female), `−78` (not given, the average).
- **Katch–McArdle** (if body fat % is given):
  `BMR = 370 + 21.6 · leanMassKg`, where `leanMassKg = kg · (1 − bf%)`.

## 3. TDEE (daily maintenance)

`TDEE = BMR × activityFactor`

| Level | Factor | Example shown to the user |
|---|---|---|
| Sedentary | 1.2 | Desk job, little walking, training included below |
| Lightly active | 1.375 | Desk job + 1–3 workouts/week |
| Moderately active | 1.55 | 3–5 workouts/week or an on-your-feet job |
| Very active | 1.725 | 6–7 hard sessions/week or a physical job |
| Extremely active | 1.9 | Physical job + daily training / athlete |

## 4. Goal calories and timeline

**Rate of change** (as % of body weight, so it scales with the person):

| Goal | Relaxed | Moderate (default) | Aggressive |
|---|---|---|---|
| Lose | 0.25 %/week | 0.5 %/week | 0.75–1.0 %/week |
| Gain (lean bulk) | Beginner 1.0 %/month · Intermediate 0.5 %/month · Advanced 0.25 %/month, ×0.5 / ×1 / ×1.5 for pace |

- Energy per kg of body-weight change ≈ **7,700 kcal** (configurable).
- `dailyAdjust = weeklyRateKg × 7700 / 7` (negative for loss, positive for gain).
- `goalCalories = TDEE + dailyAdjust`, rounded to the nearest 10.

**Safety limits:**
- Deficit is capped at **25% of TDEE** (and 1,000 kcal/day).
- Floor: never below **max(BMR, 1,200 kcal female / 1,500 kcal male / 1,350 not given)**.
  If the floor overrides the pace, the timeline is recalculated and the user is told.
- Surplus is capped at **+20% of TDEE**.

**Timeline:** simulated week by week (the rate shrinks as weight drops), giving the **number of
weeks** and an **estimated goal date**. Milestones are shown at every 25% of the way. On reaching
the goal, the app suggests switching to maintenance (calories return to TDEE, with a +100–200
kcal/week reverse ramp).

## 5. Macros

| Macro | Fat loss | Maintenance | Muscle gain |
|---|---|---|---|
| **Protein** | 2.0 g/kg (range 1.8–2.4) | 1.6 g/kg (1.4–2.0) | 1.8 g/kg (1.6–2.2) |
| **Fat** | 25% kcal, min 0.6 g/kg | 30% kcal, min 0.6 g/kg | 25% kcal, min 0.6 g/kg |
| **Carbs** | Remainder | Remainder | Remainder |

- "kg" for protein = current weight, **but if BMI ≥ 30, use the weight at BMI 25** (avoids
  absurd protein targets).
- Diet preference adjusts the split (e.g. low-carb: fat 40%, carbs = remainder with a 50 g minimum
  warning; high-protein: +0.4 g/kg).
- Rounding: protein/carbs/fat to whole grams; macro kcal must reconcile with goal calories within ±2%.

## 6. Everything else a person needs

| Target | Formula / default |
|---|---|
| **Fibre** | 14 g per 1,000 kcal (min 25 g) |
| **Water** | 35 ml/kg body weight + 500 ml per training day hour (shown in L or oz) |
| **Added sugar** | < 10% of calories (guideline, shown as a limit) |
| **Saturated fat** | < 10% of calories (limit) |
| **Sodium** | < 2,300 mg/day (limit) |
| **Steps** | Default 8,000/day (6,000 sedentary start, +1,000/week ramp), informational |
| **Sleep** | 7–9 h guideline (informational, no tracking in MVP) |
| **Micronutrients** (P1) | Health Canada / US DRI tables by age + sex (calcium, iron, vitamin D, potassium, magnesium, B12...), shown only when food data includes them |

## 7. Meal distribution

Calories and protein are split across the chosen meals. Default for 3 meals + snack: breakfast 25%,
lunch 35%, dinner 30%, snack 10%. Protein per meal is at least 0.4 g/kg where possible. Shown as a
gentle guide on the Food tab ("Lunch: ~850 kcal, ~60 g protein").

**Optional (P1): training-day vs rest-day calories.** Same weekly total; training days +10%, rest
days lower to balance.

## 8. Workout plan at signup (deterministic, no AI)

Chosen from openGym's starter plans plus our own templates, by **days/week × experience ×
equipment × goal**:

| Days/week | Beginner | Intermediate/Advanced |
|---|---|---|
| 2 | Full Body A/B | Full Body A/B |
| 3 | Full Body A/B/C (or 5×5) | Full Body or Push/Pull/Legs |
| 4 | Upper/Lower | Upper/Lower |
| 5–6 | Upper/Lower + optional day | Push/Pull/Legs ×2 |

- Equipment filter swaps in dumbbell or bodyweight variants.
- Goal tweaks: fat loss adds 2× 20–30 min cardio/week; muscle gain uses the 8–12 rep double
  progression; maintenance keeps 2–3 days.
- The plan loads as normal editable routines (openGym's existing system).

## 9. Keeping the plan up to date

- **Re-evaluate** every 2 weeks, or after a 2 kg weight change (7-day average). The app
  **suggests** new targets; the user approves (never silent changes).
- **Plateau check (P1):** if the 7-day average weight hasn't moved for 3+ weeks while ≥ 80% of
  days are logged, suggest −100 to −150 kcal (loss) or +100 kcal (gain).
- **Adaptive TDEE (P1/P2):** estimate real maintenance from logged intake vs weight trend. This
  becomes the foundation for the AI coach later.

## 10. Safety rules (hard rules)

- Under 18: no deficit plans, maintenance only, with a message to involve a parent or doctor.
- Target BMI < 18.5: blocked.
- Current BMI < 18.5 with a fat-loss goal: blocked; suggest maintenance or gain.
- Optional health questions (pregnant/breastfeeding, eating-disorder history, medical
  conditions): if "yes", no deficit plan, and suggest seeing a professional.
- Disclaimer: estimates, not medical advice.

## 11. Worked example (unit-test fixture)

Male, 30 y, 180 cm, 90 kg, target 80 kg, moderately active, moderate pace, 4 days/week, intermediate, full gym.

| Step | Result |
|---|---|
| BMR (Mifflin) | 10·90 + 6.25·180 − 5·30 + 5 = **1,880 kcal** |
| TDEE | 1,880 × 1.55 = **2,914 kcal** |
| Rate | 0.5% × 90 = 0.45 kg/week → −495 kcal/day |
| Goal calories | 2,914 − 495 = **2,420 kcal** (17% deficit, under the 25% cap ✅) |
| Timeline | ≈ 23 weeks (simulated) |
| Protein | 2.0 × 90 = **180 g** (720 kcal) |
| Fat | 25% × 2,420 = 605 kcal → **67 g** (≥ 0.6 g/kg ✅) |
| Carbs | (2,420 − 720 − 605) / 4 = **274 g** |
| Fibre | 14 × 2.42 = **34 g** |
| Water | 35 × 90 = 3.15 L + training → **~3.2–3.7 L** |
| Workout | Upper/Lower 4-day + 2× cardio |
