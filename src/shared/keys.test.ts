import { describe, expect, it } from 'vitest'
import { DEFAULT_BINDINGS, bindingsEqual, formatBinding, formatBindingParts } from './keys'

describe('keyboard bindings', () => {
  it('formats the default shortcuts', () => {
    expect(formatBinding(DEFAULT_BINDINGS.holdSpeed)).toBe('Space')
    expect(formatBinding(DEFAULT_BINDINGS.speedUp)).toBe('Shift + .')
    expect(formatBinding(DEFAULT_BINDINGS.speedDown)).toBe('Shift + ,')
    expect(formatBinding(DEFAULT_BINDINGS.speedReset)).toBe('Shift + /')
    expect(formatBinding(DEFAULT_BINDINGS.toggleTargetSpeed)).toBe('Shift + "')
    expect(formatBindingParts(DEFAULT_BINDINGS.speedUp)).toEqual(['Shift', '.'])
  })

  it('compares physical key and modifiers', () => {
    expect(bindingsEqual(DEFAULT_BINDINGS.speedUp, { ...DEFAULT_BINDINGS.speedUp })).toBe(true)
    expect(bindingsEqual(DEFAULT_BINDINGS.speedUp, DEFAULT_BINDINGS.speedDown)).toBe(false)
  })

  it('preserves the recorded character for custom keyboard layouts', () => {
    expect(
      formatBindingParts({
        code: 'Period',
        key: ';',
        ctrl: false,
        alt: false,
        shift: false,
        meta: false,
      })
    ).toEqual([';'])
  })
})
