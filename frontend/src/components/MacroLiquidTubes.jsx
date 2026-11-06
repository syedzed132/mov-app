import React from 'react'
import Icon from './Icon.jsx'
import './MacroLiquidTubes.css'

export default function MacroLiquidTubes({ proteinPct = 0, carbsPct = 0, fatPct = 0, proteinG, carbsG, fatG }) {
  const macros = [
    {
      key: 'protein',
      label: 'PROTEIN',
      pct: Math.min(100, Math.max(0, Math.round(proteinPct))),
      grams: proteinG,
      icon: 'bolt',
      color: '#FF6A13',
      tint: 'orange'
    },
    {
      key: 'carbs',
      label: 'CARBS',
      pct: Math.min(100, Math.max(0, Math.round(carbsPct))),
      grams: carbsG,
      icon: 'utensils',
      color: '#FFB347',
      tint: 'amber'
    },
    {
      key: 'fat',
      label: 'FAT',
      pct: Math.min(100, Math.max(0, Math.round(fatPct))),
      grams: fatG,
      icon: 'drop',
      color: '#4ECDC4',
      tint: 'teal'
    }
  ]

  return (
    <div className="macro-tubes-container" aria-label="Daily Macro Breakdown">
      {macros.map(m => (
        <div key={m.key} className="macro-tube-col">
          <div className="macro-tube-vessel">
            <div className="macro-tube-icon-wrap" style={{ color: m.color }}>
              <Icon name={m.icon} />
            </div>
            <div className="macro-tube-chamber">
              <div
                className={`macro-tube-liquid ${m.tint}`}
                style={{
                  height: `${m.pct}%`,
                  background: m.color
                }}
              >
                <div className="macro-tube-liquid-wave" />
              </div>
            </div>
          </div>
          <div className="macro-tube-meta">
            <span className="macro-tube-pct">{m.pct}%</span>
            <span className="macro-tube-name">{m.label}</span>
            {m.grams != null && <small className="macro-tube-grams">{Math.round(m.grams)}g</small>}
          </div>
        </div>
      ))}
    </div>
  )
}
