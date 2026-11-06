import { useRef, useState } from 'react'
import { NumberField } from './ui.jsx'
import Icon from './Icon.jsx'
import { t } from '../lib/i18n.js'
import './weight-picker.css'

// The ruler moves under a fixed marker. Its scale stays constant throughout a drag;
// typing keeps its own draft, including an empty field or an unfinished decimal.
export default function WeightPicker({ value, onChange, unit = 'kg', min = 30, max = 300, label = t('Weight'), ariaLabel = t('Weight ({0})', unit), invalid = false, describedBy, legacy = false }) {
  const gesture = useRef(null)
  const [dragging, setDragging] = useState(false)
  const validNumber = typeof value === 'number' && Number.isFinite(value)
  const selected = Math.min(max, Math.max(min, validNumber ? value : min))
  const snap = n => Math.min(max, Math.max(min, Math.round(n * 10) / 10))
  const change = n => onChange(snap(n))
  const rtl = () => document.documentElement.dir === 'rtl'
  const base = Math.floor(selected * 10)
  const ticks = Array.from({ length: 61 }, (_, i) => base + i - 30).filter(tick => tick >= Math.ceil(min * 10) && tick <= Math.floor(max * 10))
  const endDrag = () => { gesture.current = null; setDragging(false) }

  return <div className={'body-weight-picker' + (invalid ? ' is-invalid' : '')}>
    <div className="weight-picker-caption"><Icon name="scale" /><span>{label}</span><span className="weight-picker-edit"><Icon name="pencil" />{t('Tap to edit')}</span></div>
    <div className="weight-picker-readout">
      <button type="button" className="weight-picker-nudge" onClick={() => change((validNumber ? value : selected) - .1)} aria-label={t('Decrease by {0}', '0.1')}><Icon name="minus" /></button>
      <label className={'weight-picker-value' + (legacy ? ' bw-read' : '')}>
        <NumberField fit nullable value={value} onChange={onChange} placeholder="—" aria-label={ariaLabel} aria-required={legacy ? undefined : 'true'} aria-invalid={invalid ? 'true' : undefined} aria-describedby={describedBy} enterKeyHint="done" onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} />
        <span className="u">{unit}</span>
      </label>
      <button type="button" className="weight-picker-nudge" onClick={() => change((validNumber ? value : selected) + .1)} aria-label={t('Increase by {0}', '0.1')}><Icon name="plus" /></button>
    </div>
    <div className={'weight-picker-ruler' + (legacy ? ' sld' : '') + (dragging ? ' is-dragging' : '')} role="slider" tabIndex={0} aria-label={t('{0} ruler', ariaLabel)} aria-valuemin={min} aria-valuemax={max} aria-valuenow={selected} aria-valuetext={validNumber ? `${selected} ${unit}` : t('No weight entered')} aria-orientation="horizontal" data-nodrag
      onKeyDown={e => {
        let next
        if (e.key === 'ArrowUp' || e.key === (rtl() ? 'ArrowLeft' : 'ArrowRight')) next = selected + .1
        if (e.key === 'ArrowDown' || e.key === (rtl() ? 'ArrowRight' : 'ArrowLeft')) next = selected - .1
        if (e.key === 'PageUp') next = selected + 1
        if (e.key === 'PageDown') next = selected - 1
        if (e.key === 'Home') next = min
        if (e.key === 'End') next = max
        if (next !== undefined) { e.preventDefault(); change(next) }
      }}
      onPointerDown={e => {
        if (e.button !== 0 && e.button != null) return
        gesture.current = { x: e.clientX, y: e.clientY, value: selected, horizontal: false }
        e.currentTarget.setPointerCapture?.(e.pointerId)
      }}
      onPointerMove={e => {
        const g = gesture.current
        if (!g) return
        const dx = e.clientX - g.x, dy = e.clientY - g.y
        if (!g.horizontal) {
          if (Math.abs(dy) > Math.max(6, Math.abs(dx))) { endDrag(); return }
          if (Math.abs(dx) < 4) return
          g.horizontal = true; setDragging(true)
        }
        change(g.value - dx / 90 * (rtl() ? -1 : 1))
      }} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}>
      <div className="weight-picker-ticks" aria-hidden="true">
        {validNumber && ticks.map(tick => <span key={tick} className={'weight-picker-tick' + (tick % 10 === 0 ? ' major' : tick % 5 === 0 ? ' half' : '')} style={{ insetInlineStart: `calc(50% + ${(tick - selected * 10) * 9}px)` }}>{tick % 10 === 0 && <span>{tick / 10}</span>}</span>)}
      </div>
      <span className="weight-picker-marker" aria-hidden="true" />
    </div>
    <p className="weight-picker-hint">{t('Swipe the ruler or type your weight')}</p>
  </div>
}
