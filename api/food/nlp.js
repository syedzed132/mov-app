import { createHash } from 'node:crypto'
import { COMMON_PANTRY } from './pantry.js'
import { scaleNutrients, STANDARD_UNITS } from '../../shared/food-portions.mjs'
import { FoodAiError, validateMealEstimate } from './gemini.js'

const WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, half: .5, quarter: .25 }
const FRACTIONS = { '½': .5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': .25, '¾': .75, '⅛': .125, '⅜': .375, '⅝': .625, '⅞': .875 }
const ALIASES = {
  egg: ['egg', 'whole egg'], 'egg-white': ['egg white'],
  'chicken-breast': ['chicken breast', 'raw chicken breast'],
  'chicken-breast-cooked': ['cooked chicken breast', 'grilled chicken breast', 'roasted chicken breast', 'grilled chicken'],
  'ground-beef-90-10': ['ground beef', 'lean ground beef'], salmon: ['salmon', 'raw salmon'],
  'white-rice-cooked': ['rice', 'white rice', 'cooked rice', 'cooked white rice'],
  oats: ['oat', 'rolled oat', 'dry oat'], banana: ['banana'], apple: ['apple'],
  'milk-whole': ['milk', 'whole milk'], 'whey-protein': ['whey', 'whey protein', 'protein powder', 'whey protein powder'],
  'peanut-butter': ['peanut butter'], 'greek-yogurt-0': ['greek yogurt', 'nonfat greek yogurt', 'plain nonfat greek yogurt'],
  'olive-oil': ['olive oil', 'extra virgin olive oil']
}
const normalize = text => text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\b([a-z]+)s\b/g, '$1').replace(/\s+/g, ' ').trim()
const nutrientAliases = n => ({ ...n, calories: n.kcal || 0, protein: n.proteinG || 0, carbs: n.carbsG || 0, fat: n.fatG || 0, fiber: n.fiberG || 0 })

function localFood(query) {
  const q = normalize(query)
  return COMMON_PANTRY.find(food => normalize(food.name) === q || (ALIASES[food.externalId] || []).some(alias => normalize(alias) === q))
}

function phrases(text) {
  return text.replace(/\r/g, '').replace(/\b(?:and|with)\b|[+,;]/gi, '\n').split('\n')
    .map(phrase => phrase.trim().replace(/^(?:for\s+)?(?:breakfast|lunch|dinner|a snack)[:,]?\s+/i, '')
      .replace(/^(?:i\s+(?:just\s+)?(?:had|ate|have eaten|have|want to log|am having)|i['’]ve had|log|add)\s+/i, '')
      .replace(/[.!?]+$/, '').trim()).filter(Boolean)
}

function parsePhrase(phrase) {
  let value = phrase.replace(/^(a|an)\s+(half|quarter)\b/i, '$2').replace(/^(half|quarter)\s+(?:a|an)\s+/i, '$1 ')
  value = value.replace(/(\d+)?\s*([½⅓⅔¼¾⅛⅜⅝⅞])/g, (_, whole, fraction) => String(Number(whole || 0) + FRACTIONS[fraction]))
    .replace(/(\d+)\s+(\d+)\/(\d+)/g, (_, whole, n, d) => String(Number(whole) + Number(n) / Number(d)))
    .replace(/(\d+)\/(\d+)/g, (_, n, d) => String(Number(n) / Number(d)))
    .replace(/^(a|an|one|two|three|four|five|six|seven|eight|nine|ten|half|quarter)\b/i, word => String(WORDS[word.toLowerCase()]))
  const amount = value.match(/^(\d+(?:\.\d+)?)\s*/)
  const qty = amount ? Number(amount[1]) : 1
  if (amount) value = value.slice(amount[0].length)
  const unitMatch = value.match(/^(kilograms?|kg|grams?|g|millilit(?:er|re)s?|ml|lit(?:er|re)s?|l|ounces?|oz|pounds?|lbs?|cups?|tablespoons?|tbsp|teaspoons?|tsp|scoops?|slices?|pieces?|servings?|large|medium|small)\b\s*(?:of\s+)?/i)
  let unit = 'serving'
  if (unitMatch) {
    const raw = unitMatch[1].toLowerCase()
    unit = /^kilogram|^kg$/.test(raw) ? 'kg' : /^gram|^g$/.test(raw) ? 'g'
      : /^millilit|^ml$/.test(raw) ? 'ml' : /^lit|^l$/.test(raw) ? 'l'
      : /^ounce|^oz$/.test(raw) ? 'oz' : /^pound|^lbs?$/.test(raw) ? 'lb'
      : /^tablespoon|^tbsp$/.test(raw) ? 'tbsp' : /^teaspoon|^tsp$/.test(raw) ? 'tsp'
      : raw.replace(/s$/, '')
    value = value.slice(unitMatch[0].length)
  }
  value = value.replace(/^of\s+/i, '')
  return { qty, unit, query: value.trim(), assumedAmount: !amount }
}

function resolveUnit(food, unit) {
  if (STANDARD_UNITS[unit]?.toGrams || unit === 'serving') return unit
  const portion = food.portions?.find(p => normalize(p.label) === normalize(unit) || normalize(p.label).startsWith(normalize(unit) + ' '))
  if (portion) return portion.label
  if (unit === 'piece' && ['large', 'medium', 'small', 'slice', 'egg'].includes(food.defaultServingUnit)) return food.defaultServingUnit
  return null
}

function toItem(food, qty, unit, assumption = '') {
  const scaled = scaleNutrients(food, qty, unit)
  return { name: food.name, brand: food.brand || null, foodKey: food.key, qty, unit,
    weightGrams: scaled.weightGrams, nutrients: nutrientAliases(scaled.nutrients), foodRef: food, assumption,
    estimated: food.dataQuality === 'ai-estimated' }
}

function estimatedItem(item) {
  const id = createHash('sha256').update(JSON.stringify([item.name, item.unit, item.gramsPerUnit, item.per100g])).digest('hex').slice(0, 20)
  // Keep the model's exact portion definition for all edits and diary calculations.
  const standardWeight = STANDARD_UNITS[item.unit]?.toGrams
  const standard = standardWeight && Math.abs(standardWeight - item.gramsPerUnit) <= Math.min(.05, standardWeight * .001)
  const label = standard ? item.unit : standardWeight ? `${item.unit} portion` : item.unit === 'serving' ? 'portion' : item.unit
  const food = { key: `ai:${id}`, source: 'gemini', externalId: id, name: item.name, basis: 'per100g',
    per100g: item.per100g, defaultServingQuantity: 1, defaultServingUnit: label,
    defaultServingGrams: item.gramsPerUnit, portions: standard ? [] : [{ label, grams: item.gramsPerUnit }],
    dataQuality: 'ai-estimated', assumption: item.assumption }
  return toItem(food, item.quantity, label, item.assumption)
}

export async function parseAudioMeal(audio, { aiParser } = {}) {
  if (!aiParser) throw new FoodAiError('not-configured')
  const answer = await aiParser.parseAudio(audio)
  const validated = validateMealEstimate(answer)
  const items = validated.items.map(estimatedItem)
  return { raw: validated.transcript, items, totals: sumItems(items), unresolved: validated.unresolved,
    notices: [], ai: { used: true, model: answer.model, elapsedMs: answer.elapsedMs, cached: Boolean(answer.cached) } }
}

function sumItems(items) {
  const totals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }
  for (const item of items) for (const key of Object.keys(totals)) totals[key] += item.nutrients[key] || 0
  for (const key of Object.keys(totals)) totals[key] = Math.round(totals[key] * 10) / 10
  return nutrientAliases(totals)
}

export async function parseMealText(text, { useAi = false, aiParser } = {}) {
  if (typeof text !== 'string' || text.length > 800) throw new TypeError('Describe a meal in 800 characters or fewer.')
  const started = Date.now()
  const items = [], unresolved = [], notices = []
  const parts = phrases(text)
  let ai = { used: false }
  if (parts.length > 12) {
    return { raw: text, items, unresolved: parts, totals: nutrientAliases({}), ai,
      notices: [{ code: 'too-many-items', message: 'Please split this into meals of up to 12 items.' }] }
  }
  for (const phrase of parts) {
    const parsed = parsePhrase(phrase)
    const food = localFood(parsed.query)
    const unit = food && resolveUnit(food, parsed.unit)
    if (!food || !unit || !Number.isFinite(parsed.qty) || parsed.qty <= 0 || parsed.qty > 10000) {
      unresolved.push(phrase); continue
    }
    const assumption = parsed.assumedAmount ? 'Amount not specified; assumed one serving.' : ''
    items.push(toItem(food, parsed.qty, unit, assumption))
  }
  if (unresolved.length && useAi && aiParser) {
    try {
      const answer = await aiParser.parse(unresolved.join('; '))
      const validated = validateMealEstimate(answer)
      const estimates = validated.items.map(estimatedItem)
      if (estimates.length + items.length > 12) throw new FoodAiError('invalid-result')
      items.push(...estimates)
      const stillUnknown = validated.unresolved
      // A model returning no items and no explanation must not make missing food disappear.
      if (estimates.length || stillUnknown.length) unresolved.splice(0, unresolved.length, ...stillUnknown)
      ai = { used: true, model: answer.model, elapsedMs: answer.elapsedMs, cached: Boolean(answer.cached) }
    } catch (error) {
      const safe = error instanceof FoodAiError ? error : new FoodAiError('unavailable')
      notices.push({ code: safe.code, message: safe.message })
    }
  }
  return { raw: text, items, totals: sumItems(items), unresolved, notices, ai, elapsedMs: Date.now() - started }
}
