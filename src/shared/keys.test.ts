import { describe, expect, it } from 'vitest'
import { DEFAULT_BINDINGS, bindingsEqual, formatBinding } from './keys'

describe('keyboard bindings', () => {
  it('formats the default shortcuts', () => {
    expect(formatBinding(DEFAULT_BINDINGS.holdSpeed)).toBe('Space')
    expect(formatBinding(DEFAULT_BINDINGS.speedUp)).toBe('Shift + >')
    expect(formatBinding(DEFAULT_BINDINGS.speedDown)).toBe('Shift + <')
    expect(formatBinding(DEFAULT_BINDINGS.speedReset)).toBe('Shift + /')
  })

  it('compares physical key and modifiers', () => {
    expect(bindingsEqual(DEFAULT_BINDINGS.speedUp, { ...DEFAULT_BINDINGS.speedUp })).toBe(true)
    expect(bindingsEqual(DEFAULT_BINDINGS.speedUp, DEFAULT_BINDINGS.speedDown)).toBe(false)
  })
})
