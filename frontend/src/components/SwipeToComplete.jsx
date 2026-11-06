import { useState, useRef, useEffect, useCallback } from 'react'
import Icon from './Icon.jsx'
import './SwipeToComplete.css'

export default function SwipeToComplete({ onComplete, label = 'Swipe to complete set', ariaLabel, disabled = false }) {
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [completed, setCompleted] = useState(false)
  const trackRef = useRef(null)
  const startXRef = useRef(0)

  const maxDrag = useCallback(() => {
    if (!trackRef.current) return 200
    const trackWidth = trackRef.current.offsetWidth
    const thumbWidth = 52
    return Math.max(0, trackWidth - thumbWidth - 8)
  }, [])

  const handleTouchStart = e => {
    if (disabled || completed) return
    setIsDragging(true)
    startXRef.current = e.touches ? e.touches[0].clientX : e.clientX
  }

  const handleTouchMove = useCallback(e => {
    if (!isDragging || disabled || completed) return
    const currentX = e.touches ? e.touches[0].clientX : e.clientX
    const delta = currentX - startXRef.current
    const max = maxDrag()
    const clamped = Math.min(max, Math.max(0, delta))
    setDragX(clamped)

    // Trigger completion if dragged past 78%
    if (clamped >= max * 0.78) {
      setIsDragging(false)
      setCompleted(true)
      setDragX(max)
      if (navigator.vibrate) {
        try { navigator.vibrate([15, 30, 20]) } catch {}
      }
      onComplete?.()
      setTimeout(() => {
        setCompleted(false)
        setDragX(0)
      }, 750)
    }
  }, [isDragging, disabled, completed, maxDrag, onComplete])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    if (!completed) {
      // Spring snap back
      setDragX(0)
    }
  }, [isDragging, completed])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleTouchMove)
      window.addEventListener('mouseup', handleTouchEnd)
      window.addEventListener('touchmove', handleTouchMove)
      window.addEventListener('touchend', handleTouchEnd)
    }
    return () => {
      window.removeEventListener('mousemove', handleTouchMove)
      window.removeEventListener('mouseup', handleTouchEnd)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, handleTouchMove, handleTouchEnd])

  const progress = maxDrag() > 0 ? dragX / maxDrag() : 0

  return (
    <div
      ref={trackRef}
      className={`swipe-complete-track ${completed ? 'completed' : ''} ${disabled ? 'disabled' : ''}`}
      aria-label={ariaLabel || label}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled && !completed) {
          e.preventDefault()
          setCompleted(true)
          onComplete?.()
          setTimeout(() => setCompleted(false), 750)
        }
      }}
    >
      <div
        className="swipe-complete-fill"
        style={{ width: `${dragX + 28}px`, opacity: progress > 0.1 ? 0.25 : 0 }}
      />
      <span className="swipe-complete-label" style={{ opacity: Math.max(0.15, 1 - progress * 1.5) }}>
        {completed ? 'Set Completed!' : label}
      </span>
      <div
        className={`swipe-complete-thumb ${isDragging ? 'dragging' : ''}`}
        style={{ transform: `translateX(${dragX}px)` }}
        onMouseDown={handleTouchStart}
        onTouchStart={handleTouchStart}
      >
        <Icon name={completed ? 'check' : 'arrowRight'} />
      </div>
    </div>
  )
}
