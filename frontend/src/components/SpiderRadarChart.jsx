import React, { useMemo } from 'react'
import './SpiderRadarChart.css'

export default function SpiderRadarChart({
  stats = { strength: 65, endurance: 45, agility: 75, vitality: 55, discipline: 60 },
  size = 280
}) {
  const axes = [
    { key: 'strength', label: 'STR', angle: -Math.PI / 2 },
    { key: 'endurance', label: 'END', angle: -Math.PI / 2 + (2 * Math.PI) / 5 },
    { key: 'agility', label: 'AGI', angle: -Math.PI / 2 + (4 * Math.PI) / 5 },
    { key: 'vitality', label: 'VIT', angle: -Math.PI / 2 + (6 * Math.PI) / 5 },
    { key: 'discipline', label: 'DIS', angle: -Math.PI / 2 + (8 * Math.PI) / 5 }
  ]

  const center = size / 2
  const maxRadius = (size / 2) * 0.72

  // Concentric pentagon rings (3 levels: 33%, 66%, 100%)
  const rings = [0.33, 0.66, 1.0]

  const getCoordinates = (angle, radius) => {
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    }
  }

  // Polygon points for data
  const dataPoints = useMemo(() => {
    return axes.map(axis => {
      const val = Math.max(15, Math.min(100, stats[axis.key] || 50))
      const r = (val / 100) * maxRadius
      const coords = getCoordinates(axis.angle, r)
      return `${coords.x},${coords.y}`
    }).join(' ')
  }, [stats, maxRadius])

  return (
    <div className="spider-chart-wrap" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="spider-chart-svg">
        <defs>
          <radialGradient id="spiderGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF6A13" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FF6A13" stopOpacity="0.05" />
          </radialGradient>
        </defs>

        {/* Concentric grid rings */}
        {rings.map((pct, ringIdx) => {
          const r = pct * maxRadius
          const points = axes.map(a => {
            const { x, y } = getCoordinates(a.angle, r)
            return `${x},${y}`
          }).join(' ')
          return (
            <polygon
              key={`ring-${ringIdx}`}
              points={points}
              className="spider-grid-ring"
              strokeDasharray={ringIdx < 2 ? '3 3' : 'none'}
            />
          )
        })}

        {/* Axis spoke lines */}
        {axes.map(axis => {
          const outer = getCoordinates(axis.angle, maxRadius)
          return (
            <line
              key={`spoke-${axis.key}`}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              className="spider-grid-spoke"
            />
          )
        })}

        {/* Data polygon with orange glow */}
        <polygon
          points={dataPoints}
          className="spider-data-polygon"
        />

        {/* Vertex points */}
        {axes.map(axis => {
          const val = Math.max(15, Math.min(100, stats[axis.key] || 50))
          const r = (val / 100) * maxRadius
          const { x, y } = getCoordinates(axis.angle, r)
          return (
            <circle
              key={`point-${axis.key}`}
              cx={x}
              cy={y}
              r={4}
              className="spider-vertex-dot"
            />
          )
        })}

        {/* Labels at outer edge */}
        {axes.map(axis => {
          const labelDist = maxRadius + 22
          const { x, y } = getCoordinates(axis.angle, labelDist)
          return (
            <text
              key={`label-${axis.key}`}
              x={x}
              y={y + 4}
              textAnchor="middle"
              className="spider-axis-label"
            >
              {axis.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
