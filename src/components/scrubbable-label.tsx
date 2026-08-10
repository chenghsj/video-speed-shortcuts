import { useRef } from 'react'
import { cn } from '../lib/utils'

const DRAG_THRESHOLD_PX = 4
const PIXELS_PER_STEP = 8

export const valueForHorizontalDrag = ({
  startValue,
  deltaX,
  min,
  max,
  step,
}: {
  startValue: number
  deltaX: number
  min: number
  max: number
  step: number
}): number => {
  const distance = Math.abs(deltaX)
  if (distance < DRAG_THRESHOLD_PX) return startValue

  const direction = Math.sign(deltaX)
  const stepCount = Math.floor((distance - DRAG_THRESHOLD_PX) / PIXELS_PER_STEP) + 1
  const nextValue = Math.min(max, Math.max(min, startValue + direction * stepCount * step))
  const precision = step.toString().split('.')[1]?.length ?? 0
  return Number(nextValue.toFixed(precision))
}

type DragState = {
  pointerId: number
  startX: number
  startValue: number
  lastValue: number
  moved: boolean
}

export const ScrubbableLabel = ({
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
  className,
  children,
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  onCommit: (value: number) => void
  className?: string
  children: React.ReactNode
}) => {
  const dragRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)

  const finishDrag = (event: React.PointerEvent<HTMLSpanElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (drag.moved) onCommit(drag.lastValue)
    dragRef.current = null
  }

  return (
    <span
      className={cn('cursor-ew-resize select-none', className)}
      onPointerDown={event => {
        if (event.pointerType !== 'mouse' || event.button !== 0 || !Number.isFinite(value)) return
        suppressClickRef.current = false
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startValue: value,
          lastValue: value,
          moved: false,
        }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={event => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return
        const deltaX = event.clientX - drag.startX
        if (!drag.moved && Math.abs(deltaX) < DRAG_THRESHOLD_PX) return

        drag.moved = true
        suppressClickRef.current = true
        event.preventDefault()
        const nextValue = valueForHorizontalDrag({
          startValue: drag.startValue,
          deltaX,
          min,
          max,
          step,
        })
        if (nextValue === drag.lastValue) return
        drag.lastValue = nextValue
        onChange(nextValue)
      }}
      onPointerUp={finishDrag}
      onPointerCancel={event => {
        finishDrag(event)
        suppressClickRef.current = false
      }}
      onClick={event => {
        if (!suppressClickRef.current) return
        event.preventDefault()
        event.stopPropagation()
        suppressClickRef.current = false
      }}
    >
      {children}
    </span>
  )
}
