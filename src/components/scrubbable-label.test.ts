import { describe, expect, it } from 'vitest'
import { valueForHorizontalDrag } from './scrubbable-label'

describe('valueForHorizontalDrag', () => {
  const input = { startValue: 1, min: 0.1, max: 4, step: 0.05 }

  it('does not change before the drag threshold', () => {
    expect(valueForHorizontalDrag({ ...input, deltaX: 3 })).toBe(1)
  })

  it('adjusts by one step after the threshold', () => {
    expect(valueForHorizontalDrag({ ...input, deltaX: 4 })).toBe(1.05)
    expect(valueForHorizontalDrag({ ...input, deltaX: -4 })).toBe(0.95)
  })

  it('clamps values to the configured range', () => {
    expect(valueForHorizontalDrag({ ...input, deltaX: 1000 })).toBe(4)
    expect(valueForHorizontalDrag({ ...input, deltaX: -1000 })).toBe(0.1)
  })
})
