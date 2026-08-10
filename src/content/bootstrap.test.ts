import { describe, expect, it } from 'vitest'
import { claimContentScriptInitialization } from './bootstrap'

describe('content-script bootstrap', () => {
  it('allows only one initialization per frame global', () => {
    const frameGlobal = {} as typeof globalThis

    expect(claimContentScriptInitialization(frameGlobal)).toBe(true)
    expect(claimContentScriptInitialization(frameGlobal)).toBe(false)
  })
})
