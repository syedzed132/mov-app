// pantry.js — instant local database of common staples for NXT FORM (USDA-sourced composition)
// Provides 0ms instant search offline or during network latency.

export const COMMON_PANTRY = [
  {
    key: 'pantry:egg',
    source: 'pantry',
    externalId: 'egg',
    name: 'Egg, whole, raw, fresh',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'large',
    per100g: { kcal: 143, proteinG: 12.6, carbsG: 0.7, fatG: 9.5, fiberG: 0, sugarG: 0.4, sodiumMg: 142 },
    portions: [
      { label: 'large', grams: 50 },
      { label: 'medium', grams: 44 },
      { label: 'small', grams: 38 },
      { label: 'egg', grams: 50 }
    ],
    dataQuality: 'measured'
  },
  {
    key: 'pantry:egg-white',
    source: 'pantry',
    externalId: 'egg-white',
    name: 'Egg white, raw, fresh',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'large',
    per100g: { kcal: 52, proteinG: 10.9, carbsG: 0.7, fatG: 0.2, fiberG: 0, sugarG: 0.7, sodiumMg: 166 },
    portions: [
      { label: 'large', grams: 33 },
      { label: 'cup', grams: 243 }
    ],
    dataQuality: 'measured'
  },
  {
    key: 'pantry:chicken-breast',
    source: 'pantry',
    externalId: 'chicken-breast',
    name: 'Chicken breast, skinless, boneless, raw',
    basis: 'per100g',
    defaultServingQuantity: 150,
    defaultServingUnit: 'g',
    per100g: { kcal: 120, proteinG: 22.5, carbsG: 0, fatG: 2.6, fiberG: 0, sugarG: 0, sodiumMg: 74 },
    portions: [
      { label: 'breast', grams: 172 },
      { label: 'half breast', grams: 86 }
    ],
    dataQuality: 'measured'
  },
  {
    key: 'pantry:chicken-breast-cooked',
    source: 'pantry',
    externalId: 'chicken-breast-cooked',
    name: 'Chicken breast, skinless, boneless, grilled/roasted',
    basis: 'per100g',
    defaultServingQuantity: 150,
    defaultServingUnit: 'g',
    per100g: { kcal: 165, proteinG: 31.0, carbsG: 0, fatG: 3.6, fiberG: 0, sugarG: 0, sodiumMg: 74 },
    portions: [
      { label: 'breast', grams: 120 },
      { label: 'cup, chopped', grams: 140 }
    ],
    dataQuality: 'measured'
  },
  {
    key: 'pantry:ground-beef-90-10',
    source: 'pantry',
    externalId: 'ground-beef-90-10',
    name: 'Ground beef, 90% lean / 10% fat, raw',
    basis: 'per100g',
    defaultServingQuantity: 150,
    defaultServingUnit: 'g',
    per100g: { kcal: 176, proteinG: 20.0, carbsG: 0, fatG: 10.0, fiberG: 0, sugarG: 0, sodiumMg: 66 },
    portions: [
      { label: 'patty', grams: 113 }
    ],
    dataQuality: 'measured'
  },
  {
    key: 'pantry:salmon',
    source: 'pantry',
    externalId: 'salmon',
    name: 'Salmon, Atlantic, wild, raw',
    basis: 'per100g',
    defaultServingQuantity: 150,
    defaultServingUnit: 'g',
    per100g: { kcal: 142, proteinG: 19.8, carbsG: 0, fatG: 6.3, fiberG: 0, sugarG: 0, sodiumMg: 44 },
    portions: [
      { label: 'fillet', grams: 178 }
    ],
    dataQuality: 'measured'
  },
  {
    key: 'pantry:white-rice-cooked',
    source: 'pantry',
    externalId: 'white-rice-cooked',
    name: 'White rice, long-grain, cooked',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'cup',
    per100g: { kcal: 130, proteinG: 2.7, carbsG: 28.2, fatG: 0.3, fiberG: 0.4, sugarG: 0.1, sodiumMg: 1 },
    portions: [
      { label: 'cup', grams: 158 }
    ],
    dataQuality: 'measured'
  },
  {
    key: 'pantry:oats',
    source: 'pantry',
    externalId: 'oats',
    name: 'Rolled oats, whole grain, raw',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'cup',
    per100g: { kcal: 379, proteinG: 13.2, carbsG: 67.7, fatG: 6.5, fiberG: 10.1, sugarG: 1.0, sodiumMg: 6 },
    portions: [
      { label: 'cup', grams: 81 },
      { label: '1/2 cup', grams: 40 }
    ],
    dataQuality: 'measured'
  },
  {
    key: 'pantry:banana',
    source: 'pantry',
    externalId: 'banana',
    name: 'Banana, raw, fresh',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'medium',
    per100g: { kcal: 89, proteinG: 1.1, carbsG: 22.8, fatG: 0.3, fiberG: 2.6, sugarG: 12.2, sodiumMg: 1 },
    portions: [
      { label: 'medium', grams: 118 },
      { label: 'large', grams: 136 }
    ],
    dataQuality: 'measured'
  },
  {
    key: 'pantry:apple',
    source: 'pantry',
    externalId: 'apple',
    name: 'Apple, with skin, raw, fresh',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'medium',
    per100g: { kcal: 52, proteinG: 0.3, carbsG: 13.8, fatG: 0.2, fiberG: 2.4, sugarG: 10.4, sodiumMg: 1 },
    portions: [
      { label: 'medium', grams: 182 },
      { label: 'large', grams: 223 }
    ],
    dataQuality: 'measured'
  },
  {
    key: 'pantry:milk-whole',
    source: 'pantry',
    externalId: 'milk-whole',
    name: 'Milk, whole, 3.25% milkfat',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'cup',
    per100g: { kcal: 61, proteinG: 3.2, carbsG: 4.8, fatG: 3.3, fiberG: 0, sugarG: 5.1, sodiumMg: 43 },
    portions: [
      { label: 'cup', grams: 244 }
    ],
    dataQuality: 'measured'
  },
  {
    key: 'pantry:whey-protein',
    source: 'pantry',
    externalId: 'whey-protein',
    name: 'Whey protein powder, standard isolate/blend',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'scoop',
    per100g: { kcal: 400, proteinG: 80.0, carbsG: 6.7, fatG: 3.3, fiberG: 0, sugarG: 3.3, sodiumMg: 160 },
    portions: [
      { label: 'scoop', grams: 30 }
    ],
    dataQuality: 'label'
  },
  {
    key: 'pantry:peanut-butter',
    source: 'pantry',
    externalId: 'peanut-butter',
    name: 'Peanut butter, smooth',
    basis: 'per100g',
    defaultServingQuantity: 2,
    defaultServingUnit: 'tbsp',
    per100g: { kcal: 588, proteinG: 25.1, carbsG: 20.0, fatG: 50.4, fiberG: 6.0, sugarG: 9.2, sodiumMg: 426 },
    portions: [
      { label: 'tbsp', grams: 16 }
    ],
    dataQuality: 'measured'
  },
  {
    key: 'pantry:greek-yogurt-0',
    source: 'pantry',
    externalId: 'greek-yogurt-0',
    name: 'Greek yogurt, plain, nonfat (0%)',
    basis: 'per100g',
    defaultServingQuantity: 170,
    defaultServingUnit: 'g',
    per100g: { kcal: 59, proteinG: 10.2, carbsG: 3.6, fatG: 0.4, fiberG: 0, sugarG: 3.2, sodiumMg: 36 },
    portions: [
      { label: 'container (170g)', grams: 170 },
      { label: 'cup', grams: 245 }
    ],
    dataQuality: 'measured'
  },
  {
    key: 'pantry:olive-oil',
    source: 'pantry',
    externalId: 'olive-oil',
    name: 'Olive oil, extra virgin',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'tbsp',
    per100g: { kcal: 884, proteinG: 0, carbsG: 0, fatG: 100.0, fiberG: 0, sugarG: 0, sodiumMg: 2 },
    portions: [
      { label: 'tbsp', grams: 14 },
      { label: 'tsp', grams: 4.5 }
    ],
    dataQuality: 'measured'
  }
]
