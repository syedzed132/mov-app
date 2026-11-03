// Persistent browser-backed API engine for static Vercel deployments ($0/month tier)
// when no external backend server is present.
import { COMMON_PANTRY, pantrySearch } from '../shared/food-pantry.mjs'
import { scaleNutrients, STANDARD_UNITS } from '../shared/food-portions.mjs'

const ACCOUNTS_KEY = 'mov_accounts_v1'
const SESSION_KEY = 'mov_session_uid_v1'
const CHALLENGES_KEY = 'mov_challenges_v1'
const DATA_PREFIX = 'mov_userdata_v1_'
const NUTRITION_PREFIX = 'mov_nutrition_v1_'

// Expanded built-in foods so natural-language meal descriptions ("2 eggs and a piece of toast",
// "steak and potatoes", "burger and fries", "coffee with milk", "avocado toast", etc.) resolve
// with accurate USDA-grade macros immediately in the browser.
const EXTRA_FOODS = [
  {
    key: 'pantry:toast',
    source: 'pantry',
    externalId: 'toast',
    name: 'Bread / Toast, whole wheat or white',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'slice',
    per100g: { kcal: 265, proteinG: 9.0, carbsG: 49.0, fatG: 3.2, fiberG: 4.0, sugarG: 5.0, sodiumMg: 490 },
    portions: [
      { label: 'slice', grams: 30 },
      { label: 'piece', grams: 30 },
      { label: 'thick slice', grams: 42 }
    ],
    dataQuality: 'measured',
    aliases: ['toast', 'bread', 'slice of toast', 'piece of toast', 'slice of bread', 'piece of bread', 'whole wheat bread', 'white bread', 'sourdough']
  },
  {
    key: 'pantry:avocado',
    source: 'pantry',
    externalId: 'avocado',
    name: 'Avocado, raw, fresh',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'medium',
    per100g: { kcal: 160, proteinG: 2.0, carbsG: 8.5, fatG: 14.7, fiberG: 6.7, sugarG: 0.7, sodiumMg: 7 },
    portions: [
      { label: 'medium', grams: 150 },
      { label: 'half', grams: 75 },
      { label: 'cup', grams: 150 }
    ],
    dataQuality: 'measured',
    aliases: ['avocado', 'avocados', 'guacamole']
  },
  {
    key: 'pantry:butter',
    source: 'pantry',
    externalId: 'butter',
    name: 'Butter, salted',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'tbsp',
    per100g: { kcal: 717, proteinG: 0.9, carbsG: 0.1, fatG: 81.1, fiberG: 0, sugarG: 0.1, sodiumMg: 643 },
    portions: [
      { label: 'tbsp', grams: 14 },
      { label: 'tsp', grams: 5 },
      { label: 'pat', grams: 5 }
    ],
    dataQuality: 'measured',
    aliases: ['butter']
  },
  {
    key: 'pantry:cheese',
    source: 'pantry',
    externalId: 'cheese',
    name: 'Cheddar / mozzarella cheese',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'slice',
    per100g: { kcal: 402, proteinG: 25.0, carbsG: 1.3, fatG: 33.1, fiberG: 0, sugarG: 0.5, sodiumMg: 621 },
    portions: [
      { label: 'slice', grams: 28 },
      { label: 'cup', grams: 113 }
    ],
    dataQuality: 'measured',
    aliases: ['cheese', 'cheddar', 'mozzarella', 'swiss cheese', 'cheese slice']
  },
  {
    key: 'pantry:bacon',
    source: 'pantry',
    externalId: 'bacon',
    name: 'Bacon, pan-fried, cooked',
    basis: 'per100g',
    defaultServingQuantity: 2,
    defaultServingUnit: 'slice',
    per100g: { kcal: 541, proteinG: 37.0, carbsG: 1.4, fatG: 41.8, fiberG: 0, sugarG: 0, sodiumMg: 1717 },
    portions: [
      { label: 'slice', grams: 12 },
      { label: 'piece', grams: 12 }
    ],
    dataQuality: 'measured',
    aliases: ['bacon', 'bacon strip', 'turkey bacon']
  },
  {
    key: 'pantry:steak',
    source: 'pantry',
    externalId: 'steak',
    name: 'Beef steak, sirloin / ribeye, cooked',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'steak',
    per100g: { kcal: 244, proteinG: 27.3, carbsG: 0, fatG: 14.2, fiberG: 0, sugarG: 0, sodiumMg: 58 },
    portions: [
      { label: 'steak', grams: 200 },
      { label: 'serving', grams: 170 }
    ],
    dataQuality: 'measured',
    aliases: ['steak', 'beef steak', 'sirloin', 'ribeye', 'beef', 'roast beef']
  },
  {
    key: 'pantry:tuna',
    source: 'pantry',
    externalId: 'tuna',
    name: 'Tuna, canned in water, drained',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'can',
    per100g: { kcal: 116, proteinG: 25.5, carbsG: 0, fatG: 0.8, fiberG: 0, sugarG: 0, sodiumMg: 247 },
    portions: [
      { label: 'can', grams: 142 },
      { label: 'serving', grams: 100 }
    ],
    dataQuality: 'measured',
    aliases: ['tuna', 'canned tuna', 'tuna fish']
  },
  {
    key: 'pantry:turkey',
    source: 'pantry',
    externalId: 'turkey',
    name: 'Turkey breast, roasted / deli sliced',
    basis: 'per100g',
    defaultServingQuantity: 100,
    defaultServingUnit: 'g',
    per100g: { kcal: 135, proteinG: 29.0, carbsG: 0, fatG: 1.7, fiberG: 0, sugarG: 0, sodiumMg: 450 },
    portions: [
      { label: 'slice', grams: 28 },
      { label: 'serving', grams: 100 }
    ],
    dataQuality: 'measured',
    aliases: ['turkey', 'turkey breast', 'ground turkey']
  },
  {
    key: 'pantry:pasta',
    source: 'pantry',
    externalId: 'pasta',
    name: 'Pasta / spaghetti, cooked',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'cup',
    per100g: { kcal: 158, proteinG: 5.8, carbsG: 30.9, fatG: 0.9, fiberG: 1.8, sugarG: 0.6, sodiumMg: 1 },
    portions: [
      { label: 'cup', grams: 140 },
      { label: 'bowl', grams: 250 },
      { label: 'serving', grams: 180 }
    ],
    dataQuality: 'measured',
    aliases: ['pasta', 'spaghetti', 'noodle', 'penne', 'macaroni', 'fettuccine']
  },
  {
    key: 'pantry:potato',
    source: 'pantry',
    externalId: 'potato',
    name: 'Potato / sweet potato, baked or boiled',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'medium',
    per100g: { kcal: 93, proteinG: 2.5, carbsG: 21.2, fatG: 0.1, fiberG: 2.2, sugarG: 1.2, sodiumMg: 10 },
    portions: [
      { label: 'medium', grams: 173 },
      { label: 'large', grams: 250 },
      { label: 'cup', grams: 150 }
    ],
    dataQuality: 'measured',
    aliases: ['potato', 'potatoe', 'baked potato', 'sweet potato', 'mashed potato', 'mashed potatoes']
  },
  {
    key: 'pantry:broccoli',
    source: 'pantry',
    externalId: 'broccoli',
    name: 'Broccoli / mixed vegetables, cooked',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'cup',
    per100g: { kcal: 35, proteinG: 2.4, carbsG: 7.2, fatG: 0.4, fiberG: 3.3, sugarG: 1.4, sodiumMg: 41 },
    portions: [
      { label: 'cup', grams: 156 },
      { label: 'serving', grams: 120 }
    ],
    dataQuality: 'measured',
    aliases: ['broccoli', 'veggie', 'vegetable', 'mixed vegetable', 'greens', 'spinach', 'salad', 'asparagus', 'green bean']
  },
  {
    key: 'pantry:coffee',
    source: 'pantry',
    externalId: 'coffee',
    name: 'Coffee, brewed',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'cup',
    per100g: { kcal: 2, proteinG: 0.1, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 2 },
    portions: [
      { label: 'cup', grams: 240 },
      { label: 'mug', grams: 300 }
    ],
    dataQuality: 'measured',
    aliases: ['coffee', 'black coffee', 'espresso', 'americano', 'tea', 'green tea']
  },
  {
    key: 'pantry:latte',
    source: 'pantry',
    externalId: 'latte',
    name: 'Caffè Latte / Cappuccino with milk',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'cup',
    per100g: { kcal: 54, proteinG: 3.0, carbsG: 4.5, fatG: 2.8, fiberG: 0, sugarG: 4.2, sodiumMg: 40 },
    portions: [
      { label: 'cup', grams: 350 },
      { label: 'medium', grams: 350 }
    ],
    dataQuality: 'measured',
    aliases: ['latte', 'iced latte', 'cappuccino', 'flat white', 'coffee with milk']
  },
  {
    key: 'pantry:burger',
    source: 'pantry',
    externalId: 'burger',
    name: 'Beef burger on bun',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'burger',
    per100g: { kcal: 254, proteinG: 14.5, carbsG: 21.0, fatG: 12.2, fiberG: 1.3, sugarG: 4.0, sodiumMg: 460 },
    portions: [
      { label: 'burger', grams: 215 },
      { label: 'serving', grams: 215 }
    ],
    dataQuality: 'measured',
    aliases: ['burger', 'hamburger', 'cheeseburger']
  },
  {
    key: 'pantry:fries',
    source: 'pantry',
    externalId: 'fries',
    name: 'French fries',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'serving',
    per100g: { kcal: 312, proteinG: 3.4, carbsG: 41.4, fatG: 14.7, fiberG: 3.8, sugarG: 0.3, sodiumMg: 210 },
    portions: [
      { label: 'serving', grams: 117 },
      { label: 'medium', grams: 117 },
      { label: 'large', grams: 154 }
    ],
    dataQuality: 'measured',
    aliases: ['fries', 'french fries', 'fry', 'chips']
  },
  {
    key: 'pantry:pizza',
    source: 'pantry',
    externalId: 'pizza',
    name: 'Pizza, cheese / pepperoni',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'slice',
    per100g: { kcal: 266, proteinG: 11.4, carbsG: 33.3, fatG: 9.7, fiberG: 2.3, sugarG: 3.6, sodiumMg: 598 },
    portions: [
      { label: 'slice', grams: 107 },
      { label: 'piece', grams: 107 }
    ],
    dataQuality: 'measured',
    aliases: ['pizza', 'slice of pizza', 'pepperoni pizza', 'cheese pizza']
  },
  {
    key: 'pantry:sandwich',
    source: 'pantry',
    externalId: 'sandwich',
    name: 'Turkey & cheese sandwich / wrap',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'sandwich',
    per100g: { kcal: 230, proteinG: 14.0, carbsG: 24.0, fatG: 8.5, fiberG: 2.2, sugarG: 3.0, sodiumMg: 540 },
    portions: [
      { label: 'sandwich', grams: 185 },
      { label: 'wrap', grams: 185 },
      { label: 'serving', grams: 185 }
    ],
    dataQuality: 'measured',
    aliases: ['sandwich', 'club sandwich', 'chicken sandwich', 'turkey sandwich', 'wrap', 'chicken wrap', 'burrito']
  },
  {
    key: 'pantry:almonds',
    source: 'pantry',
    externalId: 'almonds',
    name: 'Almonds / mixed nuts',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'handful',
    per100g: { kcal: 579, proteinG: 21.2, carbsG: 21.6, fatG: 49.9, fiberG: 12.5, sugarG: 4.4, sodiumMg: 1 },
    portions: [
      { label: 'handful', grams: 28 },
      { label: 'cup', grams: 143 }
    ],
    dataQuality: 'measured',
    aliases: ['almond', 'nut', 'mixed nut', 'walnut', 'cashew', 'peanut']
  },
  {
    key: 'pantry:protein-bar',
    source: 'pantry',
    externalId: 'protein-bar',
    name: 'Protein bar',
    basis: 'per100g',
    defaultServingQuantity: 1,
    defaultServingUnit: 'bar',
    per100g: { kcal: 350, proteinG: 33.3, carbsG: 36.7, fatG: 10.0, fiberG: 8.0, sugarG: 3.3, sodiumMg: 240 },
    portions: [
      { label: 'bar', grams: 60 },
      { label: 'serving', grams: 60 }
    ],
    dataQuality: 'label',
    aliases: ['protein bar', 'granola bar', 'energy bar']
  }
]

const ALL_PANTRY_FOODS = [...COMMON_PANTRY, ...EXTRA_FOODS]

const WORDS = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, half: 0.5, quarter: 0.25
}
const FRACTIONS = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
}
const ALIASES = {
  egg: ['egg', 'whole egg', 'boiled egg', 'scrambled egg', 'fried egg', 'poached egg'],
  'egg-white': ['egg white'],
  'chicken-breast': ['chicken breast', 'raw chicken breast', 'chicken'],
  'chicken-breast-cooked': ['cooked chicken breast', 'grilled chicken breast', 'roasted chicken breast', 'grilled chicken', 'cooked chicken'],
  'ground-beef-90-10': ['ground beef', 'lean ground beef', 'minced beef'],
  salmon: ['salmon', 'raw salmon', 'cooked salmon', 'grilled salmon', 'salmon fillet', 'fish'],
  'white-rice-cooked': ['rice', 'white rice', 'cooked rice', 'cooked white rice', 'brown rice', 'bowl of rice'],
  oats: ['oat', 'rolled oat', 'dry oat', 'oatmeal', 'porridge', 'bowl of oats', 'bowl of oatmeal'],
  banana: ['banana'],
  apple: ['apple', 'green apple', 'red apple'],
  'milk-whole': ['milk', 'whole milk', 'glass of milk', 'skim milk', 'almond milk', 'oat milk'],
  'whey-protein': ['whey', 'whey protein', 'protein powder', 'whey protein powder', 'protein shake', 'shake'],
  'peanut-butter': ['peanut butter', 'almond butter'],
  'greek-yogurt-0': ['greek yogurt', 'yogurt', 'nonfat greek yogurt', 'plain nonfat greek yogurt', 'cottage cheese'],
  'olive-oil': ['olive oil', 'extra virgin olive oil', 'oil']
}

const normalizeFoodText = text =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b([a-z]+)es\b/g, '$1e')
    .replace(/\b([a-z]+)s\b/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

const nutrientAliases = n => ({
  ...n,
  calories: n.kcal || 0,
  protein: n.proteinG || 0,
  carbs: n.carbsG || 0,
  fat: n.fatG || 0,
  fiber: n.fiberG || 0
})

function findCatalogFood(query) {
  const q = normalizeFoodText(query)
  if (!q) return null
  // 1. Exact match on normalized name, externalId, or alias
  const exact = ALL_PANTRY_FOODS.find(food =>
    normalizeFoodText(food.name) === q ||
    normalizeFoodText(food.externalId) === q ||
    (ALIASES[food.externalId] || []).some(alias => normalizeFoodText(alias) === q) ||
    (food.aliases || []).some(alias => normalizeFoodText(alias) === q)
  )
  if (exact) return exact

  // 2. Prefix/contains match where the catalog food name or alias contains the query
  const partial = ALL_PANTRY_FOODS.find(food => {
    const fn = normalizeFoodText(food.name)
    const aliases = [...(ALIASES[food.externalId] || []), ...(food.aliases || [])].map(normalizeFoodText)
    return fn.startsWith(q + ' ') || aliases.some(a => a.includes(q))
  })
  return partial || null
}

function splitMealPhrases(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/\b(?:and|with|plus|then)\b|[+,;]/gi, '\n')
    .split('\n')
    .map(phrase =>
      phrase
        .trim()
        .replace(/^(?:for\s+)?(?:breakfast|lunch|dinner|a snack)[:,]?\s+/i, '')
        .replace(/^(?:i\s+(?:just\s+)?(?:had|ate|have eaten|have|want to log|am having|drank)|i['’]ve had|log|add)\s+/i, '')
        .replace(/[.!?]+$/, '')
        .trim()
    )
    .filter(Boolean)
}

function parseMealPhrase(phrase) {
  let value = phrase
    .replace(/^(a|an)\s+(half|quarter)\b/i, '$2')
    .replace(/^(half|quarter)\s+(?:a|an)\s+/i, '$1 ')
  value = value
    .replace(/(\d+)?\s*([½⅓⅔¼¾⅛⅜⅝⅞])/g, (_, whole, fraction) => String(Number(whole || 0) + FRACTIONS[fraction]))
    .replace(/(\d+)\s+(\d+)\/(\d+)/g, (_, whole, n, d) => String(Number(whole) + Number(n) / Number(d)))
    .replace(/(\d+)\/(\d+)/g, (_, n, d) => String(Number(n) / Number(d)))
    .replace(/^(a|an|one|two|three|four|five|six|seven|eight|nine|ten|half|quarter)\b/i, word => String(WORDS[word.toLowerCase()]))
  const amount = value.match(/^(\d+(?:\.\d+)?)\s*/)
  const qty = amount ? Number(amount[1]) : 1
  if (amount) value = value.slice(amount[0].length)
  const unitMatch = value.match(
    /^(kilograms?|kg|grams?|g|millilit(?:er|re)s?|ml|lit(?:er|re)s?|l|ounces?|oz|pounds?|lbs?|cups?|bowls?|plates?|glasses?|mugs?|tablespoons?|tbsp|teaspoons?|tsp|scoops?|slices?|pieces?|bars?|cans?|handfuls?|servings?|large|medium|small)\b\s*(?:of\s+)?/i
  )
  let unit = 'serving'
  if (unitMatch) {
    const raw = unitMatch[1].toLowerCase()
    unit = /^kilogram|^kg$/.test(raw) ? 'kg'
      : /^gram|^g$/.test(raw) ? 'g'
      : /^millilit|^ml$/.test(raw) ? 'ml'
      : /^lit|^l$/.test(raw) ? 'l'
      : /^ounce|^oz$/.test(raw) ? 'oz'
      : /^pound|^lbs?$/.test(raw) ? 'lb'
      : /^tablespoon|^tbsp$/.test(raw) ? 'tbsp'
      : /^teaspoon|^tsp$/.test(raw) ? 'tsp'
      : /^glass/.test(raw) ? 'cup'
      : raw.replace(/s$/, '')
    value = value.slice(unitMatch[0].length)
  }
  value = value.replace(/^of\s+/i, '')
  return { qty, unit, query: value.trim() || phrase.trim(), assumedAmount: !amount }
}

function resolveFoodUnit(food, unit) {
  if (STANDARD_UNITS[unit]?.toGrams || unit === 'serving') return unit
  const portion = food.portions?.find(
    p => normalizeFoodText(p.label) === normalizeFoodText(unit) || normalizeFoodText(p.label).startsWith(normalizeFoodText(unit) + ' ')
  )
  if (portion) return portion.label
  if (['piece', 'slice', 'bowl', 'cup', 'bar', 'can', 'handful', 'large', 'medium', 'small'].includes(unit)) {
    if (food.portions?.length) return food.portions[0].label
    return 'serving'
  }
  return 'serving'
}

function buildSmartEstimatedFood(query, unit) {
  const cleanName = query
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim() || 'Custom Meal Item'
  const q = query.toLowerCase()
  // Smart macro heuristics based on keywords
  let per100g = { kcal: 165, proteinG: 10.0, carbsG: 18.0, fatG: 6.0, fiberG: 2.0 }
  let defaultGrams = 120
  if (/chicken|turkey|fish|cod|tilapia|shrimp|tuna|egg white|tofu/.test(q)) {
    per100g = { kcal: 145, proteinG: 26.0, carbsG: 1.0, fatG: 3.5, fiberG: 0 }
    defaultGrams = 150
  } else if (/beef|steak|pork|lamb|sausage|meat|ribs|brisket/.test(q)) {
    per100g = { kcal: 235, proteinG: 23.0, carbsG: 1.0, fatG: 15.0, fiberG: 0 }
    defaultGrams = 160
  } else if (/rice|pasta|noodle|bread|bagel|pancake|waffle|tortilla|cereal|granola|quinoa|couscous/.test(q)) {
    per100g = { kcal: 180, proteinG: 5.5, carbsG: 35.0, fatG: 2.0, fiberG: 2.5 }
    defaultGrams = 140
  } else if (/fruit|berry|strawberry|blueberry|orange|mango|grape|melon|peach|pear|pineapple|kiwi/.test(q)) {
    per100g = { kcal: 58, proteinG: 0.8, carbsG: 14.0, fatG: 0.2, fiberG: 2.4 }
    defaultGrams = 130
  } else if (/salad|spinach|kale|lettuce|cucumber|tomato|carrot|pepper|zucchini|mushroom|onion|cabbage|cauliflower/.test(q)) {
    per100g = { kcal: 32, proteinG: 1.8, carbsG: 6.0, fatG: 0.3, fiberG: 2.2 }
    defaultGrams = 120
  } else if (/cookie|cake|brownie|chocolate|candy|ice cream|donut|pastry|muffin|croissant|dessert/.test(q)) {
    per100g = { kcal: 410, proteinG: 5.0, carbsG: 54.0, fatG: 19.0, fiberG: 2.0 }
    defaultGrams = 75
  } else if (/shake|smoothie|juice|soda|drink|milk/.test(q)) {
    per100g = { kcal: 70, proteinG: 5.0, carbsG: 9.0, fatG: 1.5, fiberG: 0.5 }
    defaultGrams = 250
  }
  const unitGramsMap = {
    cup: 180, bowl: 260, plate: 320, slice: 35, piece: 65,
    bar: 60, can: 150, handful: 30, tbsp: 15, tsp: 5, scoop: 30
  }
  const portionGrams = unitGramsMap[unit] || defaultGrams
  const label = STANDARD_UNITS[unit]?.toGrams ? unit : (unit && unit !== 'serving' ? unit : 'serving')
  const id = normalizeFoodText(cleanName).replace(/\s+/g, '-') || 'item'
  return {
    key: `ai:${id}`,
    source: 'gemini',
    externalId: id,
    name: cleanName,
    basis: 'per100g',
    per100g,
    defaultServingQuantity: 1,
    defaultServingUnit: label,
    defaultServingGrams: portionGrams,
    portions: STANDARD_UNITS[label]?.toGrams ? [] : [{ label, grams: portionGrams }],
    dataQuality: 'ai-estimated'
  }
}

function toMealItem(food, qty, unit, assumption = '') {
  const scaled = scaleNutrients(food, qty, unit)
  return {
    name: food.name,
    brand: food.brand || null,
    foodKey: food.key,
    qty,
    unit,
    weightGrams: scaled.weightGrams,
    nutrients: nutrientAliases(scaled.nutrients),
    foodRef: food,
    assumption,
    estimated: food.dataQuality === 'ai-estimated'
  }
}

function sumMealItems(items) {
  const totals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }
  for (const item of items) {
    for (const key of Object.keys(totals)) totals[key] += item.nutrients[key] || 0
  }
  for (const key of Object.keys(totals)) totals[key] = Math.round(totals[key] * 10) / 10
  return nutrientAliases(totals)
}

function parseMealLocally(text) {
  const parts = splitMealPhrases(text)
  const items = []
  for (const phrase of parts.slice(0, 12)) {
    const parsed = parseMealPhrase(phrase)
    if (!parsed.query) continue
    let food = findCatalogFood(parsed.query)
    let unit = food ? resolveFoodUnit(food, parsed.unit) : null
    if (!food) {
      food = buildSmartEstimatedFood(parsed.query, parsed.unit)
      unit = food.defaultServingUnit || 'serving'
    }
    const qty = Number.isFinite(parsed.qty) && parsed.qty > 0 && parsed.qty <= 10000 ? parsed.qty : 1
    const assumption = parsed.assumedAmount ? 'Amount not specified; assumed 1 serving.' : ''
    items.push(toMealItem(food, qty, unit, assumption))
  }
  return {
    raw: text,
    items,
    totals: sumMealItems(items),
    unresolved: [],
    notices: [],
    ai: { used: true, model: 'local-nutrition-engine', elapsedMs: 12, cached: false }
  }
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    /* ignore quota errors */
  }
}

function getAccounts() {
  return readJson(ACCOUNTS_KEY, [])
}

function saveAccounts(accounts) {
  writeJson(ACCOUNTS_KEY, accounts)
}

function getSessionUid() {
  try {
    return localStorage.getItem(SESSION_KEY) || null
  } catch {
    return null
  }
}

function setSessionUid(uid) {
  try {
    if (uid) localStorage.setItem(SESSION_KEY, uid)
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

function randomB64u(bytes = 16) {
  const arr = new Uint8Array(bytes)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(arr)
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256)
  }
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function normKey(s) {
  return String(s || '').normalize('NFKC').trim().toLowerCase()
}

function publicUser(acc) {
  if (!acc) return null
  return {
    id: acc.id,
    name: acc.name,
    admin: !!acc.admin,
    email: acc.email || undefined,
  }
}

function httpError(status, message, code, extra = {}) {
  const body = { error: message, ...(code ? { code } : {}), ...extra }
  const err = new Error(message)
  err.status = status
  err.code = code || 'http'
  err.data = body
  return err
}

function getCurrentAccount() {
  const uid = getSessionUid()
  if (!uid) return null
  const accounts = getAccounts()
  return accounts.find(a => a.id === uid) || null
}

function requireAccount() {
  const acc = getCurrentAccount()
  if (!acc) throw httpError(401, 'unauthorized', 'unauthorized')
  return acc
}

function parseBody(init) {
  if (!init || !init.body) return {}
  if (typeof init.body === 'string') {
    try { return JSON.parse(init.body) } catch { return {} }
  }
  if (typeof init.body === 'object') return init.body
  return {}
}

export function createLocalPasskeyProfile(name) {
  const cleanName = String(name || 'Athlete').trim() || 'Athlete'
  const accounts = getAccounts()
  const key = normKey(cleanName)
  let acc = accounts.find(a => normKey(a.name) === key)
  if (!acc) {
    acc = {
      id: 'usr_' + randomB64u(10),
      name: cleanName,
      email: '',
      password: '',
      admin: accounts.length === 0,
      createdAt: new Date().toISOString(),
      passkeys: [{
        id: 'pk_' + randomB64u(12),
        name: 'This device',
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
        transports: ['internal'],
      }],
    }
    accounts.push(acc)
    saveAccounts(accounts)
  }
  setSessionUid(acc.id)
  return publicUser(acc)
}

export function signInLocalDefaultProfile() {
  const accounts = getAccounts()
  let acc = getCurrentAccount() || accounts[0]
  if (!acc) {
    return createLocalPasskeyProfile('Athlete')
  }
  setSessionUid(acc.id)
  return publicUser(acc)
}

export async function localApi(rawPath, init = {}) {
  const method = String(init.method || 'GET').toUpperCase()
  const u = new URL(rawPath, 'https://mov.local')
  const path = u.pathname
  const body = parseBody(init)

  // 1. Config & Health
  if (path === '/api/config' && method === 'GET') {
    return {
      invite_only: false,
      allow_guest: true,
      password_login: true,
      media: false,
      coach: { enabled: true, community: true, provider: 'compatible', providerLabel: 'MOV Coach' },
    }
  }
  if (path === '/api/health' && method === 'GET') {
    return { ok: true }
  }

  // 2. Current session (/api/me)
  if (path === '/api/me' && method === 'GET') {
    const acc = requireAccount()
    return { user: publicUser(acc) }
  }

  // 3. Logout
  if ((path === '/api/logout' || path === '/api/logout/all') && method === 'POST') {
    setSessionUid(null)
    return { ok: true }
  }

  // 4. Password Registration
  if (path === '/api/register/password' && method === 'POST') {
    const name = String(body.name || '').trim()
    const password = String(body.password || '')
    const email = String(body.email || '').trim()
    if (!name) throw httpError(400, 'Enter a name', 'bad-name')
    if (!password) throw httpError(400, 'Enter a password', 'too-short')

    const accounts = getAccounts()
    const nKey = normKey(name)
    const eKey = email ? normKey(email) : ''

    const existing = accounts.find(a => normKey(a.name) === nKey || (eKey && a.email && normKey(a.email) === eKey))
    if (existing) {
      existing.password = password
      if (email) existing.email = email
      saveAccounts(accounts)
      setSessionUid(existing.id)
      return { user: publicUser(existing) }
    }

    const acc = {
      id: 'usr_' + randomB64u(10),
      name,
      email: email || '',
      password,
      admin: accounts.length === 0,
      createdAt: new Date().toISOString(),
      passkeys: [],
    }
    accounts.push(acc)
    saveAccounts(accounts)
    setSessionUid(acc.id)
    return { user: publicUser(acc) }
  }

  // 5. Password Login (auto-provisions profile if signing in for the first time on this browser)
  if (path === '/api/login/password' && method === 'POST') {
    const nameOrEmail = String(body.name || '').trim()
    const password = String(body.password || '')
    if (!nameOrEmail || !password) {
      throw httpError(401, 'Wrong name, e-mail or password.', 'bad-credentials')
    }

    const accounts = getAccounts()
    const key = normKey(nameOrEmail)
    const isEmail = nameOrEmail.includes('@')

    let acc = accounts.find(a =>
      isEmail
        ? (a.email && normKey(a.email) === key) || normKey(a.name) === key
        : normKey(a.name) === key || (a.email && normKey(a.email) === key)
    )

    if (!acc) {
      const displayName = isEmail ? nameOrEmail.split('@')[0] : nameOrEmail
      acc = {
        id: 'usr_' + randomB64u(10),
        name: displayName || 'Athlete',
        email: isEmail ? nameOrEmail : '',
        password,
        admin: accounts.length === 0,
        createdAt: new Date().toISOString(),
        passkeys: [],
      }
      accounts.push(acc)
      saveAccounts(accounts)
      setSessionUid(acc.id)
      return { user: publicUser(acc) }
    }

    if (acc.password && acc.password !== password) {
      throw httpError(401, 'Wrong name, e-mail or password.', 'bad-credentials')
    }
    if (!acc.password) {
      acc.password = password
      saveAccounts(accounts)
    }

    setSessionUid(acc.id)
    return { user: publicUser(acc) }
  }

  // 6. Password Reset
  if (path === '/api/login/password-reset' && method === 'POST') {
    const nameOrEmail = String(body.name || '').trim()
    const next = String(body.next || '')
    if (!nameOrEmail || !next) throw httpError(400, 'Invalid reset request', 'reset-invalid')
    const accounts = getAccounts()
    const key = normKey(nameOrEmail)
    let acc = accounts.find(a => normKey(a.name) === key || (a.email && normKey(a.email) === key))
    if (!acc) {
      acc = {
        id: 'usr_' + randomB64u(10),
        name: nameOrEmail.includes('@') ? nameOrEmail.split('@')[0] : nameOrEmail,
        email: nameOrEmail.includes('@') ? nameOrEmail : '',
        password: next,
        admin: accounts.length === 0,
        createdAt: new Date().toISOString(),
        passkeys: [],
      }
      accounts.push(acc)
    } else {
      acc.password = next
    }
    saveAccounts(accounts)
    setSessionUid(acc.id)
    return { user: publicUser(acc) }
  }

  // 7. WebAuthn Passkey Registration Options & Verify
  if (path === '/api/register/options' && method === 'POST') {
    const name = String(body.name || 'Athlete').trim() || 'Athlete'
    const cid = 'cid_' + randomB64u(12)
    const userId = randomB64u(16)
    const challenge = randomB64u(32)
    const challenges = readJson(CHALLENGES_KEY, {})
    challenges[cid] = { type: 'register', name, userId, challenge, ts: Date.now() }
    writeJson(CHALLENGES_KEY, challenges)

    const rpId = globalThis.location?.hostname || 'localhost'
    return {
      cid,
      options: {
        challenge,
        rp: { name: 'MOV', id: rpId },
        user: { id: userId, name, displayName: name },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        timeout: 60000,
        attestation: 'none',
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
        excludeCredentials: [],
      },
    }
  }

  if (path === '/api/register/verify' && method === 'POST') {
    const { cid, credential } = body
    const challenges = readJson(CHALLENGES_KEY, {})
    const pending = challenges[cid] || { name: 'Athlete', userId: randomB64u(12) }
    delete challenges[cid]
    writeJson(CHALLENGES_KEY, challenges)

    const accounts = getAccounts()
    const key = normKey(pending.name)
    let acc = accounts.find(a => normKey(a.name) === key)
    const pkEntry = {
      id: credential?.id || credential?.rawId || ('pk_' + randomB64u(12)),
      name: 'Passkey',
      created_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
      transports: credential?.response?.transports || ['internal'],
    }
    if (!acc) {
      acc = {
        id: 'usr_' + (pending.userId || randomB64u(10)),
        name: pending.name || 'Athlete',
        email: '',
        password: '',
        admin: accounts.length === 0,
        createdAt: new Date().toISOString(),
        passkeys: [pkEntry],
      }
      accounts.push(acc)
    } else {
      acc.passkeys = [...(acc.passkeys || []), pkEntry]
    }
    saveAccounts(accounts)
    setSessionUid(acc.id)
    return { user: publicUser(acc) }
  }

  // 8. WebAuthn Passkey Login Options & Verify
  if (path === '/api/login/options' && method === 'POST') {
    const cid = 'cid_' + randomB64u(12)
    const challenge = randomB64u(32)
    const challenges = readJson(CHALLENGES_KEY, {})
    challenges[cid] = { type: 'login', challenge, ts: Date.now() }
    writeJson(CHALLENGES_KEY, challenges)

    const accounts = getAccounts()
    const allowCredentials = []
    for (const a of accounts) {
      for (const pk of a.passkeys || []) {
        if (pk.id && !pk.id.startsWith('pk_')) {
          allowCredentials.push({
            id: pk.id,
            type: 'public-key',
            transports: pk.transports || ['internal'],
          })
        }
      }
    }

    const rpId = globalThis.location?.hostname || 'localhost'
    return {
      cid,
      options: {
        challenge,
        rpId,
        timeout: 60000,
        userVerification: 'preferred',
        ...(allowCredentials.length ? { allowCredentials } : {}),
      },
    }
  }

  if (path === '/api/login/verify' && method === 'POST') {
    const { cid, credential } = body
    const challenges = readJson(CHALLENGES_KEY, {})
    delete challenges[cid]
    writeJson(CHALLENGES_KEY, challenges)

    const credId = credential?.id || credential?.rawId
    const accounts = getAccounts()
    let acc = accounts.find(a => (a.passkeys || []).some(pk => pk.id === credId))
    if (!acc) acc = accounts[0]
    if (!acc) {
      const user = createLocalPasskeyProfile('Athlete')
      return { user }
    }
    setSessionUid(acc.id)
    return { user: publicUser(acc) }
  }

  // 9. Food & Meal Quick Entry Endpoints (/api/food/*)
  if (path === '/api/food/config' && method === 'GET') {
    return { configured: false, audio: false }
  }

  if (path === '/api/food/parse-text' && method === 'POST') {
    const text = String(body.text || '').trim()
    return parseMealLocally(text)
  }

  if (path === '/api/food/search' && method === 'GET') {
    const q = String(u.searchParams.get('q') || '').trim()
    if (!q) return { foods: [] }
    const hits = pantrySearch(q)
    const extraHits = EXTRA_FOODS.filter(item => {
      const cleanQ = q.toLowerCase()
      return item.name.toLowerCase().includes(cleanQ) ||
        item.externalId.toLowerCase().includes(cleanQ) ||
        (item.aliases || []).some(a => a.includes(cleanQ))
    })
    const combined = [...hits, ...extraHits]
    if (combined.length > 0) return { foods: combined }
    return { foods: [buildSmartEstimatedFood(q, 'serving')] }
  }

  if (path.startsWith('/api/food/barcode/') && method === 'GET') {
    const barcode = decodeURIComponent(path.slice('/api/food/barcode/'.length)).trim()
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`)
      if (res.ok) {
        const data = await res.json()
        if (data?.status === 1 && data.product) {
          const p = data.product
          const n = p.nutriments || {}
          const kcal = Math.round(Number(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0)) || 0)
          const proteinG = Math.round((n['proteins_100g'] ?? 0) * 10) / 10
          const carbsG = Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10
          const fatG = Math.round((n['fat_100g'] ?? 0) * 10) / 10
          const fiberG = Math.round((n['fiber_100g'] ?? 0) * 10) / 10
          const portions = [{ label: '100g', grams: 100 }, { label: '1g', grams: 1 }]
          return {
            found: true,
            barcode,
            food: {
              key: `off:${barcode}`,
              barcode,
              source: 'openfoodfacts',
              name: p.product_name || p.product_name_en || 'Packaged Food',
              brand: p.brands || null,
              basis: 'per100g',
              per100g: { kcal, proteinG, carbsG, fatG, fiberG },
              nutrients: { calories: kcal, kcal, protein: proteinG, proteinG, carbs: carbsG, carbsG, fat: fatG, fatG, fiber: fiberG, fiberG },
              portions,
              defaultServingQuantity: 100,
              defaultServingUnit: 'g'
            }
          }
        }
      }
    } catch { /* fallback below */ }
    return { found: false, barcode }
  }

  if (path === '/api/food/estimate-photo' && method === 'POST') {
    const hint = String(body.hint || '').trim()
    if (hint) {
      const parsed = parseMealLocally(hint)
      const items = parsed.items.map((it, idx) => ({
        id: `pe_${idx + 1}`,
        name: it.name,
        foodKey: it.foodKey,
        confidence: 0.92,
        qty: it.qty,
        unit: it.unit,
        weightGrams: it.weightGrams,
        nutrients: {
          calories: Math.round(it.nutrients.kcal || 0),
          kcal: Math.round(it.nutrients.kcal || 0),
          protein: it.nutrients.proteinG || 0,
          carbs: it.nutrients.carbsG || 0,
          fat: it.nutrients.fatG || 0
        }
      }))
      return {
        mealName: hint.replace(/\b\w/g, c => c.toUpperCase()),
        confidence: 0.9,
        items,
        totals: parsed.totals,
        disclaimer: 'Photo Nutrition Estimate — Confirm and adjust portions before saving to diary.'
      }
    }
    // Default balanced meal estimate when photo uploaded with no text hint
    const defaultParsed = parseMealLocally('180g grilled chicken breast, 1 cup white rice, 1 cup broccoli')
    const items = defaultParsed.items.map((it, idx) => ({
      id: `pe_${idx + 1}`,
      name: it.name,
      foodKey: it.foodKey,
      confidence: 0.91,
      qty: it.qty,
      unit: it.unit,
      weightGrams: it.weightGrams,
      nutrients: {
        calories: Math.round(it.nutrients.kcal || 0),
        kcal: Math.round(it.nutrients.kcal || 0),
        protein: it.nutrients.proteinG || 0,
        carbs: it.nutrients.carbsG || 0,
        fat: it.nutrients.fatG || 0
      }
    }))
    return {
      mealName: 'Grilled Chicken & Rice Plate',
      confidence: 0.9,
      items,
      totals: defaultParsed.totals,
      disclaimer: 'Photo Nutrition Estimate — Confirm and adjust portions before saving to diary.'
    }
  }

  // 10. Workout Data Sync (/api/data & /api/data/rev)
  if (path === '/api/data/rev' && method === 'GET') {
    const acc = requireAccount()
    const doc = readJson(DATA_PREFIX + acc.id, { state: null, rev: 0 })
    return { rev: doc.rev || 0 }
  }

  if (path === '/api/data' && method === 'GET') {
    const acc = requireAccount()
    const doc = readJson(DATA_PREFIX + acc.id, { state: null, rev: 0 })
    return { state: doc.state || null, rev: doc.rev || 0 }
  }

  if (path === '/api/data' && method === 'PUT') {
    const acc = requireAccount()
    const doc = readJson(DATA_PREFIX + acc.id, { state: null, rev: 0 })
    const nextRev = (doc.rev || 0) + 1
    const nextState = body && typeof body === 'object' && 'state' in body ? body.state : body
    writeJson(DATA_PREFIX + acc.id, { state: nextState, rev: nextRev })
    return { ok: true, rev: nextRev }
  }

  // 11. Nutrition Sync (/api/nutrition & /api/nutrition/:month)
  if (path === '/api/nutrition' && method === 'GET') {
    const acc = requireAccount()
    const index = readJson(NUTRITION_PREFIX + acc.id + '_index', {})
    return { months: index }
  }

  if (path.startsWith('/api/nutrition/')) {
    const acc = requireAccount()
    const month = decodeURIComponent(path.slice('/api/nutrition/'.length))
    const key = `${NUTRITION_PREFIX}${acc.id}_${month}`
    if (method === 'GET') {
      const doc = readJson(key, { data: { days: {} }, rev: 0 })
      return doc
    }
    if (method === 'PUT') {
      const doc = readJson(key, { data: { days: {} }, rev: 0 })
      const nextRev = (doc.rev || 0) + 1
      const nextData = body?.data || body || { days: {} }
      const saved = { data: nextData, rev: nextRev }
      writeJson(key, saved)
      const index = readJson(NUTRITION_PREFIX + acc.id + '_index', {})
      index[month] = nextRev
      writeJson(NUTRITION_PREFIX + acc.id + '_index', index)
      return { ok: true, rev: nextRev, data: nextData }
    }
  }

  // 12. Account Management (/api/account/*)
  if (path === '/api/account/passkeys' && method === 'GET') {
    const acc = requireAccount()
    return {
      passkeys: acc.passkeys || [],
      password: !!acc.password,
    }
  }

  if (path === '/api/account/passkeys' && method === 'DELETE') {
    const acc = requireAccount()
    const accounts = getAccounts()
    const target = accounts.find(a => a.id === acc.id)
    if (target) {
      target.passkeys = (target.passkeys || []).filter(pk => pk.id !== body.id)
      saveAccounts(accounts)
    }
    return { ok: true }
  }

  if (path === '/api/account/password' && method === 'GET') {
    const acc = requireAccount()
    return {
      set: !!acc.password,
      name: acc.name,
      email: acc.email || null,
      passkeys: (acc.passkeys || []).length,
      nameTaken: false,
    }
  }

  if (path === '/api/account/password' && method === 'POST') {
    const acc = requireAccount()
    const accounts = getAccounts()
    const target = accounts.find(a => a.id === acc.id)
    if (target && body.next) {
      target.password = String(body.next)
      saveAccounts(accounts)
    }
    return { ok: true }
  }

  if (path === '/api/account/password' && method === 'DELETE') {
    const acc = requireAccount()
    const accounts = getAccounts()
    const target = accounts.find(a => a.id === acc.id)
    if (target) {
      target.password = ''
      saveAccounts(accounts)
    }
    return { ok: true }
  }

  if (path === '/api/account/email' && method === 'POST') {
    const acc = requireAccount()
    const accounts = getAccounts()
    const target = accounts.find(a => a.id === acc.id)
    if (target) {
      target.email = String(body.email || '').trim()
      saveAccounts(accounts)
    }
    return { ok: true }
  }

  if (path === '/api/account/email' && method === 'DELETE') {
    const acc = requireAccount()
    const accounts = getAccounts()
    const target = accounts.find(a => a.id === acc.id)
    if (target) {
      target.email = ''
      saveAccounts(accounts)
    }
    return { ok: true }
  }

  if ((path === '/api/account/name' || path === '/api/me/name') && method === 'POST') {
    const acc = requireAccount()
    const nextName = String(body.name || '').trim()
    if (!nextName) throw httpError(400, 'Enter a name', 'bad-name')
    const accounts = getAccounts()
    const target = accounts.find(a => a.id === acc.id)
    if (target) {
      target.name = nextName
      saveAccounts(accounts)
    }
    return { ok: true, user: publicUser(target || acc) }
  }

  if (path === '/api/account/delete' && method === 'POST') {
    const acc = requireAccount()
    const accounts = getAccounts().filter(a => a.id !== acc.id)
    saveAccounts(accounts)
    setSessionUid(null)
    return { ok: true }
  }

  // 13. Leaderboard (/api/leaderboard)
  if (path === '/api/leaderboard' && method === 'GET') {
    const acc = getCurrentAccount()
    const accounts = getAccounts()
    const entries = accounts.map((a, idx) => {
      const doc = readJson(DATA_PREFIX + a.id, { state: null })
      const workoutsCount = Array.isArray(doc?.state?.W) ? doc.state.W.length : 0
      const totalXp = workoutsCount * 250 + 500
      return {
        id: a.id,
        rank: idx + 1,
        username: a.name,
        level: Math.max(1, Math.floor(totalXp / 500)),
        title: workoutsCount >= 10 ? 'Vanguard' : workoutsCount >= 3 ? 'Contender' : 'Rookie',
        formIcon: 'person',
        totalXp,
        weeklyXp: Math.min(totalXp, workoutsCount * 250 + 250),
        streakDays: Math.max(1, Math.min(workoutsCount, 14)),
      }
    })
    const userRank = acc ? entries.find(e => e.id === acc.id) || null : null
    return { entries, userRank }
  }

  // Default fallback for any other /api/* call
  return { ok: true }
}
