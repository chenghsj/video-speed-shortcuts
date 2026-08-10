/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { hideIndicator, showIndicator, showPlaybackHint } from './indicator'

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

  it('shows the matching playback icon in the center of the visible video', () => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
    const video = document.createElement('video')
    video.getBoundingClientRect = () =>
      ({ left: 100, right: 900, top: 100, bottom: 700, width: 800, height: 600 }) as DOMRect
    document.body.append(video)

    showPlaybackHint('play', document, video)
    const hint = document.getElementById('video-speed-shortcuts-playback-hint')
    expect(hint?.style.left).toBe('454px')
    expect(hint?.style.top).toBe('354px')
    expect(hint?.style.opacity).toBe('0.82')
    expect(hint?.style.transform).toBe('scale(1)')
    expect(hint?.style.transition).toContain('100ms')
    expect(hint?.querySelector('[data-hint-icon="playback-play"]')).not.toBeNull()

    showPlaybackHint('pause', document, video)
    expect(hint?.querySelector('[data-hint-icon="playback-pause"]')).not.toBeNull()
    expect(hint?.querySelectorAll('rect')).toHaveLength(2)

    vi.advanceTimersByTime(440)
    expect(hint?.style.opacity).toBe('0')
    expect(hint?.style.transform).toBe('scale(0.96)')
    expect(hint?.style.transition).toContain('180ms')
  })

})
