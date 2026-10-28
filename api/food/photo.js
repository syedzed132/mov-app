// photo.js — Photo-assisted meal estimation service for NXT FORM (M3 Stub & Interface)
// Complies with PRD §1.4 / D-008: Full estimation UI & confirmation flow with safe defaults.
// Designed to plug in a multimodal vision model (e.g. Gemini Flash) without client changes.

import { pantrySearch } from './pantry.js'

/**
 * Standard simulated meal templates for photo estimation stub
 */
const STUB_MEAL_TEMPLATES = [
  {
    name: 'Grilled Chicken & Rice Bowl',
    items: [
      { query: 'chicken breast', qty: 180, unit: 'g', confidence: 0.94 },
      { query: 'white rice', qty: 150, unit: 'g', confidence: 0.89 },
      { query: 'olive oil', qty: 10, unit: 'g', confidence: 0.72 }
    ]
  },
  {
    name: 'Steak with Sweet Potato & Greens',
    items: [
      { query: 'salmon', qty: 170, unit: 'g', confidence: 0.91 },
      { query: 'white rice', qty: 140, unit: 'g', confidence: 0.88 },
      { query: 'olive oil', qty: 10, unit: 'g', confidence: 0.80 }
    ]
  },
  {
    name: 'High-Protein Breakfast Plate',
    items: [
      { query: 'eggs', qty: 3, unit: 'serving', confidence: 0.96 },
      { query: 'rolled oats', qty: 60, unit: 'g', confidence: 0.87 },
      { query: 'banana', qty: 1, unit: 'serving', confidence: 0.95 }
    ]
  }
]

/**
 * Analyze an uploaded meal photo and return estimated food items and macronutrients.
 * @param {Object} params - { imageBase64, mimeType, hint }
 * @returns {Promise<{ mealName: string, items: Array, totals: Object, disclaimer: string }>}
 */
export async function estimatePhotoMeal({ imageBase64, mimeType = 'image/jpeg', hint = '' } = {}) {
  // Simulate rapid vision analysis latency (150ms)
  await new Promise(r => setTimeout(r, 150))

  let template
  const cleanHint = (hint || '').toLowerCase()

  if (cleanHint.includes('egg') || cleanHint.includes('breakfast') || cleanHint.includes('oat')) {
    template = STUB_MEAL_TEMPLATES[2]
  } else if (cleanHint.includes('fish') || cleanHint.includes('salmon')) {
    template = STUB_MEAL_TEMPLATES[1]
  } else {
    // Pick based on image hash/length or default to template 0
    const idx = (imageBase64?.length || 0) % STUB_MEAL_TEMPLATES.length
    template = STUB_MEAL_TEMPLATES[idx] || STUB_MEAL_TEMPLATES[0]
  }

  const items = []
  const totals = {
    calories: 0,
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0
  }

  for (const spec of template.items) {
    const hits = pantrySearch(spec.query)
    const food = hits[0] || {
      name: spec.query,
      nutrients: { calories: 150, protein: 15, carbs: 10, fat: 5 }
    }

    const grams = spec.unit === 'g' ? spec.qty : (spec.qty * 60)
    const factor = grams / 100

    const cal = Math.round((food.nutrients?.calories || 150) * factor)
    const prot = Math.round((food.nutrients?.protein || 15) * factor * 10) / 10
    const carb = Math.round((food.nutrients?.carbs || 10) * factor * 10) / 10
    const fat = Math.round((food.nutrients?.fat || 5) * factor * 10) / 10

    items.push({
      id: `pe_${Math.random().toString(36).slice(2, 7)}`,
      name: food.name,
      foodKey: food.key || null,
      confidence: spec.confidence,
      qty: spec.qty,
      unit: spec.unit,
      weightGrams: grams,
      nutrients: {
        calories: cal,
        kcal: cal,
        protein: prot,
        carbs: carb,
        fat
      }
    })

    totals.calories += cal
    totals.kcal += cal
    totals.protein += prot
    totals.carbs += carb
    totals.fat += fat
  }

  totals.protein = Math.round(totals.protein * 10) / 10
  totals.carbs = Math.round(totals.carbs * 10) / 10
  totals.fat = Math.round(totals.fat * 10) / 10

  return {
    mealName: template.name,
    confidence: 0.88,
    items,
    totals,
    disclaimer: 'AI Nutrition Estimate (Beta) — Confirm and adjust portions before saving to diary.'
  }
}
