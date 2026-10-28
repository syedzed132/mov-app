// nlp.js — Fast natural language meal parsing engine for NXT FORM (Tier 1 & Tier 2)
// Handles multi-item unstructured meal descriptions ("2 eggs, 2 slices toast with 1 tbsp butter, and a banana")
// Completely functional without paid API keys, with optional LLM enhancement when configured.

import { searchFoods } from './usda.js'
import { pantrySearch } from './pantry.js'

const FRACTIONS = {
  '½': 0.5, '⅓': 0.333, '⅔': 0.667, '¼': 0.25, '¾': 0.75,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
}

const UNIT_ALIASES = {
  g: 'g', gram: 'g', grams: 'g', kg: 'kg',
  ml: 'ml', milliliter: 'ml', milliliters: 'ml', l: 'l', liter: 'l', liters: 'l',
  oz: 'oz', ounce: 'oz', ounces: 'oz', lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  cup: 'cup', cups: 'cup', tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  scoop: 'scoop', scoops: 'scoop', slice: 'slice', slices: 'slice',
  can: 'can', cans: 'can', bar: 'bar', bars: 'bar',
  piece: 'piece', pieces: 'piece', serving: 'serving', servings: 'serving'
}

/**
 * Split text into distinct food phrases.
 */
function splitMealPhrases(text) {
  if (!text || typeof text !== 'string') return []

  // Replace common connectors with line break delimiters
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\band\s+(?=\d|[a-z])/gi, '\n')
    .replace(/\bwith\s+(?=\d|[a-z])/gi, '\n')
    .replace(/\+/g, '\n')
    .replace(/;/g, '\n')
    .replace(/,/g, '\n')

  return normalized
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 1)
}

/**
 * Parse an individual line into qty, unit, and food query.
 */
function parsePhrase(phrase) {
  let working = phrase.trim()

  // Convert unicode fractions
  for (const [frac, dec] of Object.entries(FRACTIONS)) {
    if (working.includes(frac)) {
      working = working.replace(new RegExp(`(\\d+)?\\s*${frac}`, 'g'), (_, whole) => {
        const base = whole ? Number(whole) : 0
        return `${base + dec}`
      })
    }
  }

  // Handle slash fractions (e.g. "1 1/2" -> 1.5)
  working = working.replace(/(\d+)\s+(\d+)\/(\d+)/g, (_, whole, num, den) => `${Number(whole) + Number(num) / Number(den)}`)
  working = working.replace(/(\d+)\/(\d+)/g, (_, num, den) => `${Number(num) / Number(den)}`)

  const match = working.match(/^([\d.]+)\s*([a-zA-Z]+)?\s*(.*)$/)
  if (match) {
    const rawNum = parseFloat(match[1])
    const rawUnit = (match[2] || '').toLowerCase()
    const remainder = (match[3] || '').trim()

    if (rawUnit && UNIT_ALIASES[rawUnit]) {
      return {
        qty: Math.round(rawNum * 100) / 100,
        unit: UNIT_ALIASES[rawUnit],
        query: remainder || match[2]
      }
    }

    const combined = `${match[2] || ''} ${remainder}`.trim()
    if (combined) {
      return {
        qty: Math.round(rawNum * 100) / 100,
        unit: 'serving',
        query: combined
      }
    }
  }

  return {
    qty: 1,
    unit: 'serving',
    query: working
  }
}

/**
 * Scale food nutrients for parsed quantity and unit.
 */
function scaleFood(food, qty, unit) {
  let multiplier = 1
  let weightGrams = null

  if (unit === 'g') {
    weightGrams = qty
    multiplier = qty / 100
  } else if (unit === 'oz') {
    weightGrams = Math.round(qty * 28.3495)
    multiplier = weightGrams / 100
  } else if (unit === 'serving') {
    const defServing = food.portions?.[0]?.grams || food.defaultServingGrams || 100
    weightGrams = defServing * qty
    multiplier = weightGrams / 100
  } else if (Array.isArray(food.portions)) {
    const matched = food.portions.find(p => p.label?.toLowerCase().includes(unit.toLowerCase()))
    if (matched && matched.grams) {
      weightGrams = matched.grams * qty
      multiplier = weightGrams / 100
    }
  }

  const base = food.per100g || food.nutrients || {}
  const scale = v => Math.round((Number(v) || 0) * multiplier * 10) / 10
  const scaleWhole = v => Math.round((Number(v) || 0) * multiplier)

  return {
    weightGrams,
    nutrients: {
      calories: scaleWhole(base.calories ?? base.kcal),
      kcal: scaleWhole(base.calories ?? base.kcal),
      protein: scale(base.protein ?? base.proteinG),
      proteinG: scale(base.protein ?? base.proteinG),
      carbs: scale(base.carbs ?? base.carbsG),
      carbsG: scale(base.carbs ?? base.carbsG),
      fat: scale(base.fat ?? base.fatG),
      fatG: scale(base.fat ?? base.fatG),
      fiber: scale(base.fiber ?? base.fiberG),
      fiberG: scale(base.fiber ?? base.fiberG)
    }
  }
}

/**
 * Parse an entire freeform meal string into structured loggable food items.
 * @param {string} text - User's meal description (e.g. "2 eggs, 2 slices toast, 1 banana")
 * @returns {Promise<{ items: Array, totals: Object, raw: string, unresolved: Array }>}
 */
export async function parseMealText(text) {
  if (!text || typeof text !== 'string') {
    return { items: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 }, raw: '', unresolved: [] }
  }

  const phrases = splitMealPhrases(text)
  const items = []
  const unresolved = []

  const totals = {
    calories: 0,
    kcal: 0,
    protein: 0,
    proteinG: 0,
    carbs: 0,
    carbsG: 0,
    fat: 0,
    fatG: 0,
    fiber: 0,
    fiberG: 0
  }

  for (const phrase of phrases) {
    const parsed = parsePhrase(phrase)
    if (!parsed.query) continue

    // 1. Check local pantry first (0ms)
    let candidates = pantrySearch(parsed.query)

    // 2. Fall back to USDA search
    if (candidates.length === 0) {
      try {
        const usdaRes = await searchFoods(parsed.query, 3)
        if (usdaRes && usdaRes.length > 0) candidates = usdaRes
      } catch {
        // Continue
      }
    }

    if (candidates.length > 0) {
      const topFood = candidates[0]
      const scaled = scaleFood(topFood, parsed.qty, parsed.unit)

      const item = {
        name: topFood.name,
        brand: topFood.brand || null,
        foodKey: topFood.key,
        qty: parsed.qty,
        unit: parsed.unit,
        weightGrams: scaled.weightGrams,
        nutrients: scaled.nutrients,
        foodRef: topFood
      }

      items.push(item)

      totals.calories += scaled.nutrients.calories
      totals.kcal += scaled.nutrients.kcal
      totals.protein += scaled.nutrients.protein
      totals.proteinG += scaled.nutrients.proteinG
      totals.carbs += scaled.nutrients.carbs
      totals.carbsG += scaled.nutrients.carbsG
      totals.fat += scaled.nutrients.fat
      totals.fatG += scaled.nutrients.fatG
      totals.fiber += scaled.nutrients.fiber
      totals.fiberG += scaled.nutrients.fiberG
    } else {
      unresolved.push(phrase)
    }
  }

  totals.protein = Math.round(totals.protein * 10) / 10
  totals.proteinG = totals.protein
  totals.carbs = Math.round(totals.carbs * 10) / 10
  totals.carbsG = totals.carbs
  totals.fat = Math.round(totals.fat * 10) / 10
  totals.fatG = totals.fat
  totals.fiber = Math.round(totals.fiber * 10) / 10
  totals.fiberG = totals.fiber

  return {
    raw: text,
    items,
    totals,
    unresolved
  }
}
