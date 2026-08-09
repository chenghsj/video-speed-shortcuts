import { describe, expect, it } from 'vitest'
import { resolveNextSpeed } from './speed'

const settings = { minimumSpeed: 0.25, maximumSpeed: 4, speedStep: 0.25 }

describe('resolveNextSpeed', () => {
  it('steps speed in either direction', () => {
    expect(resolveNextSpeed(1, 1, settings)).toBe(1.25)
    expect(resolveNextSpeed(1, -1, settings)).toBe(0.75)
  })

  it('clamps values to the configured range', () => {
    expect(resolveNextSpeed(4, 1, settings)).toBe(4)
    expect(resolveNextSpeed(0.25, -1, settings)).toBe(0.25)
  })

  it('lands on normal speed when a step crosses 1x', () => {
    expect(resolveNextSpeed(0.9, 1, settings)).toBe(1)
    expect(resolveNextSpeed(1.1, -1, settings)).toBe(1)
  })

  it('supports repeated adjustments while a speed key is held', () => {
    const afterFirstPress = resolveNextSpeed(1, 1, settings)
    expect(resolveNextSpeed(afterFirstPress, 1, settings)).toBe(1.5)
    expect(resolveNextSpeed(afterFirstPress, -1, settings)).toBe(1)
  })
})
