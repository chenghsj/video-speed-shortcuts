/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { hideIndicator, showIndicator } from './indicator'

describe('showIndicator', () => {
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('centers the hint within the visible video area on pages with a side rail', () => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1900 })

    const video = document.createElement('video')
    video.getBoundingClientRect = () =>
      ({
        left: 16,
        right: 1339,
        top: 120,
        bottom: 864,
        width: 1323,
        height: 744,
      }) as DOMRect
    document.body.append(video)

    showIndicator('1.25×', document, video)

    const indicator = document.getElementById('video-speed-shortcuts-indicator')
    expect(indicator).not.toBeNull()
    expect(indicator?.style.left).toBe('677.5px')
    expect(indicator?.style.top).toBe('136px')
    expect(indicator?.style.transform).toBe('')
  })

  it('keeps the hint visible while a hold action is active', () => {
    vi.useFakeTimers()

    showIndicator('2×', document, null, { persist: true })
    vi.advanceTimersByTime(2000)

    const indicator = document.getElementById('video-speed-shortcuts-indicator')
    expect(indicator?.style.opacity).toBe('0.82')

    hideIndicator()
    expect(indicator?.style.opacity).toBe('0')
  })
})
