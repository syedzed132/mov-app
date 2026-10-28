# Data Model (new modules)

openGym's existing state shape (workouts, sets, routines, weigh-ins, measurements, custom
exercises) is unchanged. These are **additions**. Storage is JSON (D-004). Shapes are written
so they map cleanly to relational tables later.

Conventions: IDs are random strings (`crypto.randomUUID()`). Timestamps are ISO-8601 UTC.
Diary dates are `YYYY-MM-DD` **in the user's timezone**. Weights are canonical kg, lengths cm,
volumes ml (converted for display). Missing nutrient = `null`.

## 1. In user state (`state-<uid>.json`)

```js
profile: {            // extends openGym's profile
  birthDate, sex /* 'male'|'female'|null */, heightCm, timezone,
  units /* existing kg|lb, cm|in */, onboardedAt
}
goal: {
  type /* 'fat_loss'|'maintenance'|'muscle_gain' */, targetWeightKg,
  pace /* 'slow'|'moderate'|'fast' */, activityLevel, experience, updatedAt
}
targetHistory: [{
  id, effectiveFrom /* YYYY-MM-DD */, calories, proteinG, carbsG, fatG, waterMl,
  mode /* 'macros'|'calories_only' */, method: 'mifflin_st_jeor_v1',
  inputs: { ...snapshot of profile/goal used }, manualOverride: bool
}]
customFoods: [Food]          // source: 'custom'
recipes: [{ id, name, servings, totalWeightG|null,
            ingredients: [{ foodSnapshot: Food, grams|null, qty, unit }], createdAt, updatedAt }]
savedMeals: [{ id, name, items: [{ foodSnapshot: Food, qty, unit, grams|null }] }]
favouriteFoods: [foodKey]    // foodKey = `${source}:${externalId}`
recentFoods: [foodKey]       // capped at 50
gamification: {
  freezesBanked, freezesUsed: [date], questAssignments: { [date]: [questId] },
  weeklyQuests: { [weekStart]: [questId] }, badgeAwards: { [badgeId]: date }
}
plan: 'free'                 // reserved for future subscription tiers (D-014)
```

## 2. Nutrition documents (`nutrition-<uid>-YYYY-MM.json`)

```js
{
  month: 'YYYY-MM', rev: number,
  days: {
    'YYYY-MM-DD': {
      waterMl: number,
      entries: [{
        id, meal /* 'breakfast'|'lunch'|'dinner'|'snack' */, position,
        source /* 'search'|'barcode'|'nl_parse'|'photo'|'custom'|'recipe'|'saved_meal'|'manual' */,
        foodKey | null, recipeId | null,
        name, brand | null,
        qty, unit /* 'g'|'ml'|'serving'|household label */, grams | null,
        nutrients: { kcal, proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg, ... }, // snapshot, null = unknown
        estimated: bool,   // true for photo/NL estimates
        createdAt, updatedAt
      }]
    }
  }
}
```

## 3. Normalized `Food` (provider output and snapshot)

```js
{
  key: 'usda:173944' | 'off:3017620422003' | 'cn:<hash>' | 'custom:<id>',
  source: 'usda'|'off'|'calorieninjas'|'custom',
  externalId, barcode | null, name, brand | null,
  basis: 'per100g' | 'perServing',
  per100g: { kcal, proteinG, carbsG, fatG, fiberG, ... } | null,
  serving: { label: '1 cup', grams: 240 | null, nutrients: {...} | null } | null,
  portions: [{ label, grams }],      // household units with known grams only
  dataQuality: 'measured'|'label'|'estimated'|'user',
  fetchedAt
}
```

## 4. Derived (never stored as truth)

Daily totals · weekly summary · XP per day · level · streak · RPG stats · badge eligibility.
All are computed by pure functions in `frontend/src/lib/` with unit tests.

## 5. Future relational mapping

`profile`, `user_goals`, `target_history`, `foods`, `recipes`, `recipe_ingredients`,
`meal_templates`, `food_logs`, `water_logs` and `gamification_*` map 1:1 to PRD v1 §8 tables
when we move to Postgres/SQLite.
