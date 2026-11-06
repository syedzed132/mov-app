// @vitest-environment happy-dom
import React, { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, afterEach, it, expect } from 'vitest'
import WeightPicker from './WeightPicker.jsx'

let host, root
function Harness() {
  const [value, setValue] = useState(80)
  return <WeightPicker value={value} onChange={setValue} ariaLabel="Current weight in kg" />
}
beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  document.documentElement.dir = 'ltr'
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(<Harness />))
})
afterEach(() => { act(() => root.unmount()); host.remove(); document.documentElement.dir = '' })
const ruler = () => host.querySelector('[role="slider"]')
const input = () => host.querySelector('input')
const pointer = async (type, x, y = 20) => act(async () => ruler().dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, clientX: x, clientY: y })))
const key = async value => act(async () => ruler().dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true })))

it('keeps a fixed scale during a horizontal drag and continues from the typed weight', async () => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(input().constructor.prototype, 'value').set.call(input(), '82.5')
    input().dispatchEvent(new Event('input', { bubbles: true }))
  })
  await pointer('pointerdown', 200)
  await pointer('pointermove', 110)
  expect(input().value).toBe('83.5')
  await pointer('pointermove', 20)
  expect(input().value).toBe('84.5')
  await pointer('pointerup', 20)
  await pointer('pointermove', 0)
  expect(input().value).toBe('84.5')
})

it('leaves the weight alone when the gesture scrolls the page vertically', async () => {
  await pointer('pointerdown', 200)
  await pointer('pointermove', 202, 70)
  await pointer('pointermove', 110, 70)
  expect(input().value).toBe('80')
})

it('supports fine and coarse keyboard changes and respects the ruler limits', async () => {
  await key('PageUp'); expect(input().value).toBe('81')
  await key('ArrowLeft'); expect(input().value).toBe('80.9')
  await key('Home'); await key('ArrowDown'); expect(input().value).toBe('30')
  await key('End'); await key('ArrowUp'); expect(input().value).toBe('300')
  expect(ruler().getAttribute('aria-valuetext')).toBe('300 kg')
})

it('mirrors horizontal adjustment in a right-to-left interface', async () => {
  document.documentElement.dir = 'rtl'
  await key('ArrowLeft'); expect(input().value).toBe('80.1')
  await pointer('pointerdown', 110)
  await pointer('pointermove', 200)
  expect(input().value).toBe('81.1')
})
