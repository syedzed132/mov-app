import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchFoods, getFoodByKey } from '../food/usda.js';

test('Nutrition API: search returns pantry staples instantly', async () => {
  const eggResults = await searchFoods('egg');
  assert.ok(Array.isArray(eggResults));
  assert.ok(eggResults.length > 0);
  const egg = eggResults.find(e => e.name.toLowerCase().includes('egg'));
  assert.ok(egg);
  assert.equal(egg.per100g.kcal, 143);
  assert.equal(egg.per100g.proteinG, 12.6);
});

test('Nutrition API: search returns chicken breast with portions', async () => {
  const chicken = await searchFoods('chicken breast');
  assert.ok(chicken.length > 0);
  assert.ok(chicken[0].portions.length > 0);
});

test('Nutrition API: getFoodByKey retrieves food record', async () => {
  const food = await getFoodByKey('pantry:banana');
  assert.ok(food);
  assert.equal(food.name, 'Banana, raw, fresh');
  assert.equal(food.per100g.kcal, 89);
});
