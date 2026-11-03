// portions.js — portion math and nutrient calculations for NXT FORM
// Normalizes nutrient basis (per100g vs perServing) and scales accurately without losing precision.

export const STANDARD_UNITS = {
  g: { label: 'g', toGrams: 1 },
  kg: { label: 'kg', toGrams: 1000 },
  ml: { label: 'ml', toGrams: 1 }, // assume 1g/ml for water/beverages by default
  l: { label: 'l', toGrams: 1000 },
  oz: { label: 'oz', toGrams: 28.3495 },
  lb: { label: 'lb', toGrams: 453.592 },
  serving: { label: 'serving', toGrams: null }
}

const NUTRIENT_KEYS = { kcal: 'calories', proteinG: 'protein', carbsG: 'carbs', fatG: 'fat', fiberG: 'fiber', sugarG: 'sugar', sodiumMg: 'sodium' }
const canonical = nutrients => Object.fromEntries(Object.entries(NUTRIENT_KEYS).map(([key, alias]) => [key, nutrients?.[key] ?? nutrients?.[alias] ?? null]))

// Older custom foods use `nutrients` for a per-100g basis and legacy field names.
export function normalizeFoodRecord(food) {
  if (!food) return food
  if (food.per100g || food.nutrients) return { ...food, per100g: canonical(food.per100g || food.nutrients) }
  if (food.serving?.nutrients) return { ...food, serving: { ...food.serving, nutrients: canonical(food.serving.nutrients) } }
  return food
}

// New entries retain the original basis. Older diary entries can recover it from
// their saved portion weight without rounding a scaled portion a second time.
export function foodForEntry(entry) {
  if (entry.foodRef) return normalizeFoodRecord(entry.foodRef)
  if (entry.per100g || entry.serving?.nutrients) return normalizeFoodRecord(entry)
  const qty = Number(entry.qty) > 0 ? Number(entry.qty) : 1
  const nutrients = canonical(entry.nutrients)
  const weight = Number(entry.weightGrams)
  const unit = entry.unit || 'serving'
  const base = { key: entry.foodKey || entry.key, name: entry.name, brand: entry.brand || null, portions: [] }
  if (weight > 0) {
    return { ...base, per100g: Object.fromEntries(Object.entries(nutrients).map(([key, value]) => [key, value == null ? null : value * 100 / weight])),
      defaultServingGrams: weight / qty, portions: STANDARD_UNITS[unit]?.toGrams ? [] : [{ label: unit, grams: weight / qty }] }
  }
  return { ...base, serving: { nutrients: Object.fromEntries(Object.entries(nutrients).map(([key, value]) => [key, value == null ? null : value / qty])) } }
}

/**
 * Scale nutrients of a food record based on selected portion quantity and unit.
 * @param {Object} food - Normalized Food object (must have either per100g or serving.nutrients)
 * @param {number} quantity - Number of units (e.g. 150 for 150g, 2 for 2 servings)
 * @param {string} unit - Unit identifier ('g', 'oz', 'serving', or custom portion label)
 * @returns {Object} Scaled nutrients object and calculated weight in grams
 */
export function scaleNutrients(food, quantity = 1, unit = 'g') {
  food = normalizeFoodRecord(food)
  const qty = Number.isFinite(Number(quantity)) ? Math.max(0, Number(quantity)) : 0
  if (!food || qty === 0) {
    return {
      weightGrams: 0,
      nutrients: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0 }
    }
  }

  let multiplier = 0
  let weightGrams = null

  // 1. Grams basis
  if (STANDARD_UNITS[unit]?.toGrams) {
    weightGrams = Math.round(qty * STANDARD_UNITS[unit].toGrams * 10) / 10
    if (food.per100g) {
      multiplier = weightGrams / 100
    } else if (food.serving?.grams) {
      multiplier = weightGrams / food.serving.grams
    }
  }
  // 3. Serving basis
  else if (unit === 'serving') {
    const defaultPortion = food.portions?.find(p => p.label === food.defaultServingUnit) || food.portions?.[0]
    const servingGrams = food.serving?.grams || food.defaultServingGrams
      || (food.defaultServingUnit === 'g' ? food.defaultServingQuantity : defaultPortion?.grams * (food.defaultServingQuantity || 1))
    if (servingGrams) weightGrams = Math.round(servingGrams * qty * 10) / 10
    multiplier = food.per100g ? (weightGrams ?? qty * 100) / 100 : qty
  }
  // 4. Custom portion (e.g. '1 cup', '1 large egg', '1 slice')
  else if (Array.isArray(food.portions)) {
    const matched = food.portions.find(p => p.label?.toLowerCase() === unit.toLowerCase())
    if (matched && matched.grams) {
      weightGrams = Math.round(matched.grams * qty * 10) / 10
      if (food.per100g) {
        multiplier = weightGrams / 100
      } else if (food.serving?.grams) {
        multiplier = weightGrams / food.serving.grams
      }
    }
  }

  // Fallback if basis could not be determined directly
  if (multiplier === 0 && qty > 0) {
    if (food.serving?.nutrients) {
      multiplier = qty
    } else if (food.per100g) {
      multiplier = qty / 100
      weightGrams = qty
    }
  }

  // Determine base nutrients (per100g or per serving)
  const base = food.per100g || food.serving?.nutrients || {}

  const scale = val => (val == null ? null : Math.round(Number(val) * multiplier * 10) / 10)
  const scaleWhole = val => (val == null ? null : Math.round(Number(val) * multiplier))

  return {
    weightGrams,
    nutrients: {
      kcal: scaleWhole(base.kcal),
      proteinG: scale(base.proteinG),
      carbsG: scale(base.carbsG),
      fatG: scale(base.fatG),
      fiberG: scale(base.fiberG),
      sugarG: scale(base.sugarG),
      sodiumMg: scaleWhole(base.sodiumMg)
    }
  }
}
