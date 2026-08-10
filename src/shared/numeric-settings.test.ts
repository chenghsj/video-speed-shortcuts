import { describe, expect, it } from 'vitest'
import { resolveNumericDraft } from './numeric-settings'

describe('resolveNumericDraft', () => {
  it('restores the current value for an empty or invalid draft', () => {
    expect(resolveNumericDraft('', 2)).toBe(2)
    expect(resolveNumericDraft('   ', 2)).toBe(2)
    expect(resolveNumericDraft('not-a-number', 2)).toBe(2)
    expect(resolveNumericDraft('1.5', 2)).toBe(1.5)
  })
})
