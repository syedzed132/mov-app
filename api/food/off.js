// off.js — Open Food Facts provider for barcode nutrition lookups in NXT FORM
// Open Food Facts data is licensed under the Open Database License (ODbL).

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const cache = new Map()

/**
 * Look up a product by barcode string in Open Food Facts.
 * @param {string} barcode - Raw barcode string (e.g. "3017620422003", "0737628064502")
 * @returns {Promise<{ found: boolean, food?: Object, barcode: string, message?: string }>}
 */
export async function lookupBarcode(barcode) {
  if (!barcode || typeof barcode !== 'string') {
    return { found: false, barcode: '', message: 'Invalid barcode' }
  }

  const clean = barcode.trim().replace(/[^0-9a-zA-Z]/g, '')
  if (!clean) {
    return { found: false, barcode, message: 'Invalid barcode' }
  }

  // Check cache
  const cached = cache.get(clean)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.result
  }

  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(clean)}.json`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'NXTFORM-FitnessApp - dev@nxtform.app'
      }
    })

    if (!res.ok) {
      const result = { found: false, barcode: clean, message: `Open Food Facts returned ${res.status}` }
      return result
    }

    const data = await res.json()
    if (data.status !== 1 || !data.product) {
      const result = { found: false, barcode: clean, message: 'Product not found in Open Food Facts' }
      cache.set(clean, { result, ts: Date.now() })
      return result
    }

    const p = data.product
    const n = p.nutriments || {}

    // Parse nutrients per 100g
    let kcal = n['energy-kcal_100g'] ?? n['energy-kcal']
    if (kcal == null && n['energy_100g']) {
      kcal = Math.round(n['energy_100g'] / 4.184)
    }

    const proteinG = Math.round((n['proteins_100g'] ?? 0) * 10) / 10
    const carbsG = Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10
    const fatG = Math.round((n['fat_100g'] ?? 0) * 10) / 10
    const fiberG = Math.round((n['fiber_100g'] ?? 0) * 10) / 10
    const sugarG = Math.round((n['sugars_100g'] ?? 0) * 10) / 10

    let sodiumMg = 0
    if (n['sodium_100g'] != null) {
      sodiumMg = Math.round(n['sodium_100g'] * 1000)
    } else if (n['salt_100g'] != null) {
      sodiumMg = Math.round((n['salt_100g'] / 2.5) * 1000)
    }

    // Determine portions
    const portions = [
      { label: '100g', grams: 100 },
      { label: '1g', grams: 1 }
    ]

    let servingGrams = null
    if (p.serving_quantity) {
      servingGrams = Math.round(Number(p.serving_quantity) * 10) / 10
    } else if (p.serving_size) {
      const match = String(p.serving_size).match(/([\d.]+)\s*(g|ml|oz)/i)
      if (match) {
        const val = parseFloat(match[1])
        const u = match[2].toLowerCase()
        servingGrams = u === 'oz' ? Math.round(val * 28.3495) : Math.round(val)
      }
    }

    if (servingGrams && servingGrams > 0) {
      const label = p.serving_size ? `1 serving (${p.serving_size})` : `1 serving (${servingGrams}g)`
      portions.unshift({ label, grams: servingGrams })
    }

    const food = {
      key: `off:${clean}`,
      barcode: clean,
      source: 'openfoodfacts',
      attribution: 'Open Food Facts (ODbL)',
      name: p.product_name || p.product_name_en || 'Packaged Food',
      brand: p.brands || null,
      imageUrl: p.image_front_small_url || p.image_url || null,
      basis: 'per100g',
      per100g: {
        kcal: Math.round(Number(kcal) || 0),
        proteinG,
        carbsG,
        fatG,
        fiberG,
        sugarG,
        sodiumMg
      },
      nutrients: {
        calories: Math.round(Number(kcal) || 0),
        kcal: Math.round(Number(kcal) || 0),
        protein: proteinG,
        proteinG,
        carbs: carbsG,
        carbsG,
        fat: fatG,
        fatG,
        fiber: fiberG,
        fiberG
      },
      portions,
      defaultServingQuantity: servingGrams ? 1 : 100,
      defaultServingUnit: servingGrams ? portions[0].label : 'g'
    }

    const result = { found: true, food, barcode: clean }
    cache.set(clean, { result, ts: Date.now() })
    return result
  } catch (err) {
    return {
      found: false,
      barcode: clean,
      message: err.message || 'Error querying Open Food Facts'
    }
  }
}
