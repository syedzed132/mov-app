import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createDailyBudget, createGeminiMealParser, validateMealEstimate } from '../food/gemini.js'
import { parseMealText, parseAudioMeal } from '../food/nlp.js'
import { scaleNutrients } from '../../shared/food-portions.mjs'

const toast = { name: 'Plain toast', quantity: 1, unit: 'slice', gramsPerUnit: 30,
  per100g: { kcal: 265, proteinG: 9, carbsG: 49, fatG: 3.2 }, assumption: 'Assumed one 30 g slice of plain white toast; no butter.' }
const estimate = () => ({ items: [structuredClone(toast)], unresolved: [] })
const response = (value = estimate()) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } }] }) })

test('conversational meals, number words, and fractions use local foods without sending text to Gemini', async () => {
  let calls = 0
  const result = await parseMealText('I had two eggs, half a cup of oats and one banana', { useAi: true, aiParser: { parse() { calls++ } } })
  assert.equal(result.items.length, 3)
  assert.equal(calls, 0)
  assert.equal(result.items[0].weightGrams, 100)
  assert.equal(result.items[1].weightGrams, 40.5)
  assert.ok(result.totals.kcal > 300)
})

test('unknown foods need explicit AI consent and remain visible beside local matches', async () => {
  let calls = 0
  const result = await parseMealText('I ate 2 eggs and a piece of toast', { aiParser: { parse() { calls++ } } })
  assert.equal(result.items.length, 1)
  assert.deepEqual(result.unresolved, ['a piece of toast'])
  assert.equal(calls, 0)
})

test('AI estimates keep per-100g nutrition and the same portion math for preview, edits and diary', async () => {
  let input
  const result = await parseMealText('I had 2 eggs and a piece of toast', { useAi: true,
    aiParser: { parse: async text => { input = text; return { ...estimate(), model: 'test', elapsedMs: 25 } } } })
  assert.equal(input, 'a piece of toast')
  assert.equal(result.items.length, 2)
  const item = result.items[1]
  assert.equal(item.foodRef.source, 'gemini')
  assert.equal(item.foodRef.dataQuality, 'ai-estimated')
  assert.equal(item.weightGrams, 30)
  assert.equal(item.nutrients.kcal, 80)
  assert.equal(scaleNutrients(item.foodRef, item.qty, item.unit).nutrients.kcal, item.nutrients.kcal)
  assert.equal(scaleNutrients(item.foodRef, 2, item.unit).nutrients.kcal, 159)
  assert.equal(result.totals.kcal, 223)
  assert.equal(result.unresolved.length, 0)
})

test('preparation-specific foods are not silently replaced with a different pantry entry', async () => {
  const result = await parseMealText('2 scrambled eggs and 200g roasted salmon')
  assert.equal(result.items.length, 0)
  assert.equal(result.unresolved.length, 2)
})

test('quantity and unit conversions remain accurate, including default multi-unit servings', async () => {
  const result = await parseMealText('0.2kg cooked chicken breast, 1/2 cup rice and 1 serving peanut butter')
  assert.equal(result.items.length, 3)
  assert.equal(result.items[0].weightGrams, 200)
  assert.equal(result.items[1].weightGrams, 79)
  assert.equal(result.items[2].weightGrams, 32)
})

test('invalid, nonfinite and excessive model values are rejected', () => {
  for (const update of [{ quantity: Infinity }, { quantity: -1 }, { gramsPerUnit: 0 }, { unit: 'g', gramsPerUnit: 30 }, { quantity: 10000, gramsPerUnit: 10000 },
    { per100g: { ...toast.per100g, kcal: 10000 } }, { per100g: { ...toast.per100g, proteinG: '9' } }]) {
    assert.throws(() => validateMealEstimate({ items: [{ ...toast, ...update }], unresolved: [] }), { code: 'invalid-result' })
  }
})

test('identical simultaneous requests share one provider call and later requests use a bounded cache', async () => {
  let calls = 0, release
  const parser = createGeminiMealParser({ apiKey: 'synthetic-test-key', fetchImpl: async (_url, options) => {
    calls++; assert.equal(options.headers['x-goog-api-key'], 'synthetic-test-key')
    assert.equal(JSON.parse(options.body).generationConfig.responseMimeType, 'application/json')
    await new Promise(resolve => { release = resolve }); return response()
  } })
  const first = parser.parse('a slice of toast'), second = parser.parse('a slice of toast')
  release()
  const [a, b] = await Promise.all([first, second])
  a.items[0].name = 'changed'
  assert.equal(b.items[0].name, 'Plain toast')
  const cached = await parser.parse('a slice of toast')
  assert.equal(cached.cached, true)
  assert.equal(cached.items[0].name, 'Plain toast')
  assert.equal(calls, 1)
})

test('timeout and provider quota errors are sanitized and partial local results are preserved', async () => {
  const timeout = createGeminiMealParser({ apiKey: 'synthetic-test-key', timeoutMs: 10, fetchImpl: async () => new Promise(() => {}) })
  await assert.rejects(timeout.parse('toast'), { code: 'timeout' })
  const quota = createGeminiMealParser({ apiKey: 'synthetic-test-key', fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({ error: 'secret should never escape' }) }) })
  const result = await parseMealText('2 eggs and toast', { useAi: true, aiParser: quota })
  assert.equal(result.items.length, 1)
  assert.deepEqual(result.unresolved, ['toast'])
  assert.equal(result.notices[0].code, 'quota')
  assert.ok(!JSON.stringify(result).includes('secret'))
})

test('truncated or malformed JSON is not accepted as a meal', async () => {
  for (const payload of [
    { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: JSON.stringify(estimate()) }] } }] },
    { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{broken' }] } }] }
  ]) {
    const parser = createGeminiMealParser({ apiKey: 'synthetic-test-key', fetchImpl: async () => ({ ok: true, json: async () => payload }) })
    await assert.rejects(parser.parse('toast'), { code: 'invalid-result' })
  }
})

test('the daily testing budget persists across parser restarts and resets on a new UTC day', async () => {
  const base = path.resolve(tmpdir())
  const directory = mkdtempSync(path.join(base, 'mov-food-ai-test-'))
  const file = path.join(directory, 'usage.json')
  let time = Date.UTC(2026, 9, 31)
  try {
    const options = { apiKey: 'synthetic-test-key', dailyLimit: 1, fetchImpl: async () => response() }
    const first = createGeminiMealParser({ ...options, takeBudget: createDailyBudget({ file, now: () => time }) })
    await first.parse('toast')
    const second = createGeminiMealParser({ ...options, takeBudget: createDailyBudget({ file, now: () => time }) })
    await assert.rejects(second.parse('rice'), { code: 'daily-limit' })
    time += 86400000
    assert.equal((await second.parse('rice')).items.length, 1)
  } finally {
    assert.ok(path.resolve(directory).startsWith(base + path.sep))
    rmSync(directory, { recursive: true })
  }
})

test('short audio produces an editable transcript and meal in one provider request', async () => {
  let calls = 0
  const parser = createGeminiMealParser({ apiKey: 'synthetic-test-key', fetchImpl: async (_url, options) => {
    calls++
    const payload = JSON.parse(options.body)
    assert.equal(payload.contents[0].parts[0].inlineData.mimeType, 'audio/webm')
    assert.ok(payload.generationConfig.responseJsonSchema.required.includes('transcript'))
    return response({ ...estimate(), transcript: 'I had a piece of toast.' })
  } })
  const result = await parseAudioMeal({ data: Buffer.from('synthetic audio bytes').toString('base64'), mimeType: 'audio/webm' }, { aiParser: parser })
  assert.equal(calls, 1)
  assert.equal(result.raw, 'I had a piece of toast.')
  assert.equal(result.items[0].weightGrams, 30)
  assert.equal(result.totals.kcal, 80)
  assert.equal(result.items[0].estimated, true)
})

test('audio rejects excess size, invalid MIME types, and missing speech without leaking provider output', async () => {
  let calls = 0
  const parser = createGeminiMealParser({ apiKey: 'synthetic-test-key', fetchImpl: async () => { calls++; return response() } })
  await assert.rejects(parser.parseAudio({ data: 'a'.repeat(400001), mimeType: 'audio/webm' }), { code: 'invalid-result' })
  await assert.rejects(parser.parseAudio({ data: 'a'.repeat(40), mimeType: 'application/javascript' }), { code: 'invalid-result' })
  assert.equal(calls, 0)
  await assert.rejects(parser.parseAudio({ data: 'a'.repeat(40), mimeType: 'audio/webm' }), { code: 'invalid-result' })
})

test('text and audio requests share the same daily provider budget', async () => {
  const parser = createGeminiMealParser({ apiKey: 'synthetic-test-key', dailyLimit: 1, fetchImpl: async () => response() })
  await parser.parse('toast')
  await assert.rejects(parser.parseAudio({ data: 'a'.repeat(40), mimeType: 'audio/webm' }), { code: 'daily-limit' })
})

test('an estimated liquid portion retains its density when the amount is edited', async () => {
  const result = await parseAudioMeal({}, { aiParser: { parseAudio: async () => ({ transcript: 'two hundred ml of milk', items: [{ ...toast,
    name: 'Whole milk', quantity: 200, unit: 'ml', gramsPerUnit: 1.03, per100g: { kcal: 61, proteinG: 3.2, carbsG: 4.8, fatG: 3.3 } }], unresolved: [] }) } })
  const item = result.items[0]
  assert.equal(item.weightGrams, 206)
  assert.equal(scaleNutrients(item.foodRef, 100, item.unit).weightGrams, 103)
})
