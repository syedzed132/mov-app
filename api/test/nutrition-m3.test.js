import test from 'node:test'
import assert from 'node:assert/strict'
import { lookupBarcode } from '../food/off.js'
import { parseMealText } from '../food/nlp.js'
import { estimatePhotoMeal } from '../food/photo.js'

test('M3 OFF: lookupBarcode returns normalized food data for valid barcode', async () => {
  // Test with Nutella barcode (3017620422003)
  const res = await lookupBarcode('3017620422003')
  assert.equal(res.found, true)
  assert.ok(res.food)
  assert.equal(res.food.source, 'openfoodfacts')
  assert.ok(res.food.nutrients.calories > 0)
  assert.ok(res.food.nutrients.fat > 0)
})

test('M3 OFF: lookupBarcode handles non-existent barcode gracefully', async () => {
  const res = await lookupBarcode('0000000000001')
  assert.equal(res.found, false)
  assert.equal(res.barcode, '0000000000001')
})

test('M3 NLP: parseMealText parses complex multi-item meal', async () => {
  const text = '2 eggs, 150g oats, and 1 banana'
  const res = await parseMealText(text)
  assert.equal(res.items.length, 3)

  const egg = res.items.find(i => i.name.toLowerCase().includes('egg'))
  assert.ok(egg)
  assert.equal(egg.qty, 2)

  const oats = res.items.find(i => i.name.toLowerCase().includes('oat'))
  assert.ok(oats)
  assert.equal(oats.qty, 150)
  assert.equal(oats.unit, 'g')

  assert.ok(res.totals.calories > 300)
  assert.ok(res.totals.protein > 10)
})

test('M3 Photo: estimatePhotoMeal returns simulated breakdown with confirmation disclaimer', async () => {
  const res = await estimatePhotoMeal({ hint: 'breakfast eggs' })
  assert.ok(res.mealName)
  assert.ok(res.items.length >= 2)
  assert.ok(res.totals.calories > 0)
  assert.ok(res.disclaimer.includes('AI Nutrition Estimate'))
})
