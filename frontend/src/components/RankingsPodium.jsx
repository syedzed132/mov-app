import React from 'react'
import Icon from './Icon.jsx'
import './RankingsPodium.css'

export default function RankingsPodium({ topThree = [] }) {
  if (!topThree || topThree.length === 0) return null
  const p1 = topThree[0]
  const p2 = topThree[1]
  const p3 = topThree[2]

  return (
    <div className="rankings-podium-wrap" aria-label="Top Athletes Podium">
      {/* 2nd place (Left) */}
      {p2 ? (
        <div className="podium-col rank-2">
          <div className="podium-avatar">
            <Icon name={p2.formIcon || 'person'} />
          </div>
          <span className="podium-name">{p2.username}</span>
          <div className="podium-block block-2">
            <span className="podium-num">2</span>
          </div>
        </div>
      ) : <div className="podium-col rank-2 placeholder" />}

      {/* 1st place (Center - Tallest) */}
      {p1 && (
        <div className="podium-col rank-1">
          <div className="podium-avatar rank-1-avatar">
            <Icon name={p1.formIcon || 'person'} />
          </div>
          <span className="podium-name rank-1-name">{p1.username}</span>
          <div className="podium-block block-1">
            <span className="podium-num">1</span>
          </div>
        </div>
      )}

      {/* 3rd place (Right) */}
      {p3 ? (
        <div className="podium-col rank-3">
          <div className="podium-avatar">
            <Icon name={p3.formIcon || 'person'} />
          </div>
          <span className="podium-name">{p3.username}</span>
          <div className="podium-block block-3">
            <span className="podium-num">3</span>
          </div>
        </div>
      ) : <div className="podium-col rank-3 placeholder" />}
    </div>
  )
}
