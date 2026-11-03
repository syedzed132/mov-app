// usda.js — USDA FoodData Central integration and food search provider for NXT FORM
import { COMMON_PANTRY, pantrySearch } from './pantry.js'

const USDA_KEY = process.env.USDA_API_KEY || 'DEMO_KEY'
const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search'
const USDA_DETAIL_URL = 'https://api.nal.usda.gov/fdc/v1/food'

// Simple in-memory search and detail cache to avoid rate limits
const searchCache = new Map()
const detailCache = new Map()

/**
 * Search foods across local pantry and USDA FoodData Central.
 * @param {string} query - Food name or query
 * @param {number} limit - Maximum results to return
 */
export async function searchFoods(query, limit = 15) {
  const cleanQ = (query || '').trim().toLowerCase()
  if (!cleanQ) return []

  const cacheKey = `${cleanQ}:${limit}`
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)
  }

  const results = pantrySearch(cleanQ)
  if (results.length) return results.slice(0, limit)

  // 2. Query USDA FoodData Central API
  try {
    const url = new URL(USDA_SEARCH_URL)
    url.searchParams.set('query', cleanQ)
    url.searchParams.set('pageSize', String(Math.min(25, limit * 2)))
    url.searchParams.set('dataType', 'Foundation,SR Legacy,Survey (FNDDS)')
    url.searchParams.set('api_key', USDA_KEY)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(4000) })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data.foods)) {
        for (const f of data.foods) {
          const normalized = normalizeUsdaFood(f)
          // Avoid duplicate keys
          if (normalized && !results.some(r => r.name.toLowerCase() === normalized.name.toLowerCase())) {
            results.push(normalized)
          }
        }
      }
    }
  } catch (err) {
    // If USDA is unreachable, offline, or timed out, local pantry results are safely returned
    console.warn('USDA search error (falling back to pantry):', err.message)
  }

  const finalResults = results.slice(0, limit)
  if (searchCache.size > 200) searchCache.clear()
  if (finalResults.length) searchCache.set(cacheKey, finalResults)

  return finalResults
}

/**
 * Get detailed food record by key.
 */
export async function getFoodByKey(key) {
  if (!key) return null
  if (detailCache.has(key)) return detailCache.get(key)

  if (key.startsWith('pantry:')) {
    const id = key.slice(7)
    return COMMON_PANTRY.find(p => p.externalId === id) || null
  }

  if (key.startsWith('usda:')) {
    const fdcId = key.slice(5)
    try {
      const url = `${USDA_DETAIL_URL}/${encodeURIComponent(fdcId)}?api_key=${USDA_KEY}`
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
      if (res.ok) {
        const data = await res.json()
        const normalized = normalizeUsdaFood(data)
        if (normalized) {
          if (detailCache.size > 300) detailCache.clear()
          detailCache.set(key, normalized)
          return normalized
        }
      }
    } catch (e) {
      console.warn('USDA detail error:', e.message)
    }
  }

  return null
}

/**
 * Normalize raw USDA FoodData Central record into NXT FORM standard Food model.
 */
function normalizeUsdaFood(raw) {
  if (!raw || !raw.fdcId) return null

  const nutrients = extractNutrients(raw.foodNutrients || [])

  // Portions: extract household measures if available
  const portions = []
  if (Array.isArray(raw.foodPortions)) {
    for (const p of raw.foodPortions) {
      const label = p.portionDescription || p.modifier || (p.measureUnit ? `${p.amount || 1} ${p.measureUnit.name}` : null)
      if (label && p.gramWeight) {
        portions.push({
          label: label.trim(),
          grams: Math.round(p.gramWeight * 10) / 10
        })
      }
    }
  }

  return {
    key: `usda:${raw.fdcId}`,
    source: 'usda',
    externalId: String(raw.fdcId),
    barcode: raw.gtinUpc || null,
    name: cleanFoodName(raw.description),
    brand: raw.brandOwner || raw.brandName || null,
    basis: 'per100g',
    defaultServingQuantity: 100,
    defaultServingUnit: 'g',
    per100g: nutrients,
    serving: portions[0] ? { label: portions[0].label, grams: portions[0].grams, nutrients: null } : null,
    portions,
    dataQuality: 'measured'
  }
}

/**
 * Extract macro and nutrient values from USDA nutrients array.
 */
function extractNutrients(nutrientsList) {
  const result = {
    kcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: 0,
    sugarG: 0,
    sodiumMg: 0
  }

  for (const n of nutrientsList) {
    const id = n.nutrientId || n.nutrient?.id
    const val = Number(n.value ?? n.amount ?? 0)

    // Nutrient IDs based on USDA FDC specs:
    // 1008 = Energy (kcal)
    if (id === 1008) result.kcal = Math.round(val)
    // 1003 = Protein (g)
    else if (id === 1003) result.proteinG = Math.round(val * 10) / 10
    // 1005 = Carbohydrate, by difference (g)
    else if (id === 1005) result.carbsG = Math.round(val * 10) / 10
    // 1004 = Total lipid (fat) (g)
    else if (id === 1004) result.fatG = Math.round(val * 10) / 10
    // 1079 = Fiber, total dietary (g)
    else if (id === 1079) result.fiberG = Math.round(val * 10) / 10
    // 2000 = Total Sugars (g)
    else if (id === 2000) result.sugarG = Math.round(val * 10) / 10
    // 1093 = Sodium, Na (mg)
    else if (id === 1093) result.sodiumMg = Math.round(val)
  }

  return result
}

function cleanFoodName(desc) {
  if (!desc) return 'Food Item'
  // Clean USDA uppercase or trailing commas (e.g. "EGGS, WHOLE, RAW, FRESH" -> "Eggs, whole, raw, fresh")
  const s = desc.trim()
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}
