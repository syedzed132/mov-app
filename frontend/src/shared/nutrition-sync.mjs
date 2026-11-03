const stamp = value => Number(value) || 0
const when = entry => stamp(entry?.updatedAt ? Date.parse(entry.updatedAt) : Date.parse(entry?.createdAt || ''))
const list = value => Array.isArray(value) ? value : []
export const LIBRARY_FIELDS = ['customFoods', 'recipes', 'savedMeals', 'recentFoods', 'favouriteFoods']
export const emptyNutrition = () => ({ days: {}, customFoods: [], recipes: [], savedMeals: [], recentFoods: [], favouriteFoods: [], _dirtyMonths: [], _libraryUpdatedAt: 0, _monthVersions: {} })
export function nutritionLibrary(state) {
  return { updatedAt: stamp(state._libraryUpdatedAt), ...Object.fromEntries(LIBRARY_FIELDS.map(key => [key, list(state[key]).slice(0, key === 'recentFoods' ? 50 : 1000)])) }
}
export function mergeLibrary(a, b) {
  const chosen = stamp(a?.updatedAt) >= stamp(b?.updatedAt) ? a : b
  return { updatedAt: stamp(chosen?.updatedAt), ...Object.fromEntries(LIBRARY_FIELDS.map(key => [key, list(chosen?.[key])])) }
}
export function mergeNutritionDay(a = {}, b = {}) {
  const deletedEntries = { ...(a.deletedEntries || {}) }
  for (const [id, time] of Object.entries(b.deletedEntries || {})) deletedEntries[id] = Math.max(stamp(deletedEntries[id]), stamp(time))
  const entries = new Map()
  for (const entry of [...list(b.entries), ...list(a.entries)]) {
    if (!entry || typeof entry !== 'object') continue
    const key = entry.id || JSON.stringify(entry)
    const previous = entries.get(key)
    if (!previous || when(entry) >= when(previous)) entries.set(key, entry)
  }
  const waterEvents = { ...(b.waterEvents || {}), ...(a.waterEvents || {}) }
  const base = day => day.waterEvents ? stamp(day.waterBaseMl) : Math.max(0, stamp(day.waterMl))
  const waterBaseMl = Math.max(base(a), base(b))
  const waterMl = Math.max(0, waterBaseMl + Object.values(waterEvents).reduce((sum, event) => sum + stamp(event?.delta), 0))
  return {
    entries: [...entries.values()].filter(entry => !deletedEntries[entry.id] || stamp(deletedEntries[entry.id]) < when(entry))
      .sort((x, y) => when(x) - when(y) || String(x.id || '').localeCompare(String(y.id || ''))),
    deletedEntries, waterBaseMl, waterEvents, waterMl
  }
}
export function mergeNutritionDays(a = {}, b = {}) {
  return Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].sort().map(date => [date, mergeNutritionDay(a[date], b[date])]))
}
export function daysForMonth(days, month) {
  return Object.fromEntries(Object.entries(days || {}).filter(([date]) => date.startsWith(month + '-')))
}
