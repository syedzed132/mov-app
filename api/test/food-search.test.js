import test from 'node:test'
import assert from 'node:assert/strict'
import { searchFoods } from '../food/usda.js'

test('food search returns plural pantry matches without waiting for the network', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('must not fetch') }
  try {
    const foods = await searchFoods('eggs')
    assert.equal(foods[0].key, 'pantry:egg')
    assert.equal(foods[0].per100g.kcal, 143)
    assert.equal(calls, 0)
  } finally { globalThis.fetch = originalFetch }
})

test('an unsuccessful food lookup is retried rather than cached as permanently empty', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    calls++
    return calls === 1 ? { ok: false } : { ok: true, json: async () => ({ foods: [{ fdcId: 123, description: 'Test grain', foodNutrients: [] }] }) }
  }
  try {
    assert.deepEqual(await searchFoods('unique-test-grain'), [])
    const found = await searchFoods('unique-test-grain')
    assert.equal(found[0].key, 'usda:123')
    assert.equal(calls, 2)
  } finally { globalThis.fetch = originalFetch }
})
