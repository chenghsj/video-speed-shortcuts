/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { hideIndicator, showIndicator, showPlaybackHint } from './indicator'

describe('showIndicator', () => {
  afterEach(() => {
    hideIndicator()
    document.getElementById('video-speed-shortcuts-indicator')?.remove()
    document.getElementById('video-speed-shortcuts-playback-hint')?.remove()
    document.querySelectorAll('[data-video-speed-shortcuts-overlay]').forEach(element => {
      element.remove()
    })
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

  it('mounts both hints in one overlay owned by the positioned player', () => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })

    const player = document.createElement('div')
    player.style.position = 'relative'
    player.style.overflow = 'hidden'
    player.getBoundingClientRect = () =>
      ({ left: 100, right: 900, top: 100, bottom: 700, width: 800, height: 600 }) as DOMRect
    const video = document.createElement('video')
    video.getBoundingClientRect = player.getBoundingClientRect
    player.append(video)
    document.body.append(player)

    showIndicator('1.25×', document, video)
    showPlaybackHint('play', document, video)

    const indicator = document.getElementById('video-speed-shortcuts-indicator')
    const playbackHint = document.getElementById('video-speed-shortcuts-playback-hint')
    const overlay = indicator?.parentElement
    expect(overlay?.dataset.videoSpeedShortcutsOverlay).toBe('true')
    expect(playbackHint?.parentElement).toBe(overlay)
    expect(overlay?.parentElement).toBe(player)
    expect(overlay?.style.position).toBe('absolute')
    expect(overlay?.style.overflow).toBe('visible')
    expect(Number(overlay?.style.zIndex)).toBeGreaterThan(10)
    expect(overlay?.style.zIndex).not.toBe('2147483647')
  })

  it('positions hints in the actual coordinate space of a scrolled player overlay', () => {
    vi.useFakeTimers()

    const player = document.createElement('div')
    player.style.position = 'relative'
    player.style.overflow = 'auto'
    player.getBoundingClientRect = () =>
      ({ left: 100, right: 900, top: 100, bottom: 700, width: 800, height: 600 }) as DOMRect
    const video = document.createElement('video')
    video.getBoundingClientRect = () =>
      ({ left: 100, right: 900, top: 100, bottom: 700, width: 800, height: 600 }) as DOMRect
    player.append(video)
    document.body.append(player)

    showPlaybackHint('play', document, video)
    const overlay = document.querySelector<HTMLElement>('[data-video-speed-shortcuts-overlay]')
    expect(overlay).not.toBeNull()
    overlay!.getBoundingClientRect = () =>
      ({ left: 100, right: 900, top: -100, bottom: 500, width: 800, height: 600 }) as DOMRect
    Object.defineProperty(overlay, 'offsetWidth', { configurable: true, value: 800 })
    Object.defineProperty(overlay, 'offsetHeight', { configurable: true, value: 600 })

    showPlaybackHint('play', document, video)

    expect(document.getElementById('video-speed-shortcuts-playback-hint')?.style.top).toBe('454px')
  })

  it('converts viewport coordinates through a scaled player overlay', () => {
    vi.useFakeTimers()

    const player = document.createElement('div')
    player.style.position = 'relative'
    player.style.overflow = 'hidden'
    player.getBoundingClientRect = () =>
      ({ left: 100, right: 900, top: 100, bottom: 700, width: 800, height: 600 }) as DOMRect
    const video = document.createElement('video')
    video.getBoundingClientRect = player.getBoundingClientRect
    player.append(video)
    document.body.append(player)

    showPlaybackHint('play', document, video)
    const overlay = document.querySelector<HTMLElement>('[data-video-speed-shortcuts-overlay]')
    expect(overlay).not.toBeNull()
    overlay!.getBoundingClientRect = player.getBoundingClientRect
    Object.defineProperty(overlay, 'offsetWidth', { configurable: true, value: 400 })
    Object.defineProperty(overlay, 'offsetHeight', { configurable: true, value: 300 })

    showPlaybackHint('play', document, video)

    const hint = document.getElementById('video-speed-shortcuts-playback-hint')
    expect(hint?.style.left).toBe('154px')
    expect(hint?.style.top).toBe('104px')
  })

  it('reuses and hides one speed hint inside a player shadow root', () => {
    vi.useFakeTimers()

    const host = document.createElement('mux-player')
    const shadowRoot = host.attachShadow({ mode: 'open' })
    const player = document.createElement('div')
    player.style.position = 'relative'
    player.style.overflow = 'hidden'
    player.getBoundingClientRect = () =>
      ({ left: 100, right: 900, top: 100, bottom: 700, width: 800, height: 600 }) as DOMRect
    const video = document.createElement('video')
    video.getBoundingClientRect = player.getBoundingClientRect
    player.append(video)
    shadowRoot.append(player)
    document.body.append(host)

    showIndicator('1.25×', document, video)
    showIndicator('1.5×', document, video)

    const indicators = shadowRoot.querySelectorAll('#video-speed-shortcuts-indicator')
    expect(indicators).toHaveLength(1)
    expect(indicators[0]?.textContent).toBe('1.5×')

    vi.advanceTimersByTime(850)
    expect((indicators[0] as HTMLElement | undefined)?.style.opacity).toBe('0')
  })

  it('keeps a fallback overlay inside the player shadow root', () => {
    vi.useFakeTimers()

    const host = document.createElement('mux-player')
    host.style.position = 'relative'
    host.getBoundingClientRect = () =>
      ({ left: 100, right: 900, top: 100, bottom: 700, width: 800, height: 600 }) as DOMRect
    const shadowRoot = host.attachShadow({ mode: 'open' })
    const wrapper = document.createElement('div')
    const video = document.createElement('video')
    video.getBoundingClientRect = host.getBoundingClientRect
    wrapper.append(video)
    shadowRoot.append(wrapper)
    document.body.append(host)

    showIndicator('1.25×', document, video)

    const overlay = shadowRoot.querySelector<HTMLElement>('[data-video-speed-shortcuts-overlay]')
    expect(overlay?.parentNode).toBe(shadowRoot)
    expect(host.children).toHaveLength(0)
    expect(shadowRoot.getElementById('video-speed-shortcuts-indicator')?.textContent).toBe('1.25×')
  })

  it('mounts a slotted video overlay in the rendered shadow tree', () => {
    vi.useFakeTimers()

    const outer = document.createElement('div')
    outer.style.position = 'relative'
    const host = document.createElement('mux-player')
    host.getBoundingClientRect = () =>
      ({ left: 100, right: 900, top: 100, bottom: 700, width: 800, height: 600 }) as DOMRect
    const shadowRoot = host.attachShadow({ mode: 'open' })
    const slot = document.createElement('slot')
    slot.name = 'media'
    shadowRoot.append(slot)
    const video = document.createElement('video')
    video.slot = 'media'
    video.getBoundingClientRect = host.getBoundingClientRect
    host.append(video)
    outer.append(host)
    document.body.append(outer)

    showIndicator('1.25×', document, video)

    expect(video.assignedSlot).toBe(slot)
    expect(shadowRoot.querySelector('[data-video-speed-shortcuts-overlay]')).not.toBeNull()
    expect(host.querySelector('[data-video-speed-shortcuts-overlay]')).toBeNull()
  })

  it('ignores clipping ancestors outside a slotted fullscreen player', () => {
    vi.useFakeTimers()

    const outerClip = document.createElement('div')
    outerClip.style.overflow = 'hidden'
    outerClip.getBoundingClientRect = () =>
      ({ left: 700, right: 900, top: 500, bottom: 600, width: 200, height: 100 }) as DOMRect

    const host = document.createElement('mux-player')
    const shadowRoot = host.attachShadow({ mode: 'open' })
    const fullscreenPlayer = document.createElement('div')
    fullscreenPlayer.style.position = 'relative'
    fullscreenPlayer.style.overflow = 'hidden'
    fullscreenPlayer.getBoundingClientRect = () =>
      ({ left: 0, right: 1000, top: 0, bottom: 800, width: 1000, height: 800 }) as DOMRect
    const originalMatches = fullscreenPlayer.matches.bind(fullscreenPlayer)
    vi.spyOn(fullscreenPlayer, 'matches').mockImplementation(
      selector => selector === ':fullscreen' || originalMatches(selector)
    )
    const slot = document.createElement('slot')
    slot.name = 'media'
    fullscreenPlayer.append(slot)
    shadowRoot.append(fullscreenPlayer)

    const video = document.createElement('video')
    video.slot = 'media'
    video.getBoundingClientRect = fullscreenPlayer.getBoundingClientRect
    host.append(video)
    outerClip.append(host)
    document.body.append(outerClip)

    showIndicator('1.25×', document, video)

    const indicator = shadowRoot.getElementById('video-speed-shortcuts-indicator')
    expect(indicator?.style.left).toBe('500px')
    expect(indicator?.style.top).toBe('16px')
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

  it('keeps an offscreen speed indicator at its original position in the video', () => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })

    const video = document.createElement('video')
    video.getBoundingClientRect = () =>
      ({ left: 100, right: 900, top: 900, bottom: 1500, width: 800, height: 600 }) as DOMRect
    document.body.append(video)

    showIndicator('1.25×', document, video)

    const indicator = document.getElementById('video-speed-shortcuts-indicator')
    expect(indicator?.style.top).toBe('916px')
    expect(indicator?.style.opacity).toBe('0.82')
  })

  it('moves a speed indicator with its video and restores its original position', () => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })

    let videoTop = 100
    const video = document.createElement('video')
    video.getBoundingClientRect = () =>
      ({
        left: 100,
        right: 900,
        top: videoTop,
        bottom: videoTop + 600,
        width: 800,
        height: 600,
      }) as DOMRect
    document.body.append(video)

    showIndicator('1.25×', document, video)
    const indicator = document.getElementById('video-speed-shortcuts-indicator')
    expect(indicator?.style.opacity).toBe('0.82')

    videoTop = 900
    window.dispatchEvent(new Event('scroll'))
    expect(indicator?.style.top).toBe('916px')

    videoTop = 100
    window.dispatchEvent(new Event('scroll'))
    expect(indicator?.style.top).toBe('116px')
    expect(indicator?.style.opacity).toBe('0.82')
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

  it('does not recenter the playback hint within the remaining visible slice', () => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
    const video = document.createElement('video')
    video.getBoundingClientRect = () =>
      ({ left: 100, right: 900, top: -500, bottom: 100, width: 800, height: 600 }) as DOMRect
    document.body.append(video)

    showPlaybackHint('play', document, video)

    const hint = document.getElementById('video-speed-shortcuts-playback-hint')
    expect(hint?.style.left).toBe('454px')
    expect(hint?.style.top).toBe('-246px')
  })

  it('keeps normal playback hint positioning unchanged inside a player', () => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })

    const player = document.createElement('div')
    player.style.overflow = 'hidden'
    player.getBoundingClientRect = () =>
      ({ left: 50, right: 950, top: 50, bottom: 750, width: 900, height: 700 }) as DOMRect

    const video = document.createElement('video')
    video.getBoundingClientRect = () =>
      ({ left: 100, right: 900, top: 100, bottom: 700, width: 800, height: 600 }) as DOMRect
    player.append(video)
    document.body.append(player)

    showPlaybackHint('play', document, video)

    const hint = document.getElementById('video-speed-shortcuts-playback-hint')
    expect(hint?.style.left).toBe('454px')
    expect(hint?.style.top).toBe('354px')
  })

  it('centers the playback hint within all nested clipping ancestors', () => {
    vi.useFakeTimers()

    const outerPlayer = document.createElement('div')
    outerPlayer.style.overflow = 'hidden'
    outerPlayer.getBoundingClientRect = () =>
      ({ left: 100, right: 500, top: 100, bottom: 500, width: 400, height: 400 }) as DOMRect

    const innerPlayer = document.createElement('div')
    innerPlayer.style.position = 'relative'
    innerPlayer.style.overflow = 'hidden'
    innerPlayer.getBoundingClientRect = () =>
      ({ left: 100, right: 900, top: 100, bottom: 700, width: 800, height: 600 }) as DOMRect

    const video = document.createElement('video')
    video.getBoundingClientRect = innerPlayer.getBoundingClientRect
    innerPlayer.append(video)
    outerPlayer.append(innerPlayer)
    document.body.append(outerPlayer)

    showPlaybackHint('play', document, video)

    const hint = document.getElementById('video-speed-shortcuts-playback-hint')
    expect(hint?.style.left).toBe('154px')
    expect(hint?.style.top).toBe('154px')
  })

  it('honors an ancestor that clips only the horizontal axis', () => {
    vi.useFakeTimers()

    const player = document.createElement('div')
    player.style.overflowX = 'clip'
    player.style.overflowY = 'visible'
    player.getBoundingClientRect = () =>
      ({ left: 100, right: 500, top: 100, bottom: 700, width: 400, height: 600 }) as DOMRect
    const video = document.createElement('video')
    video.getBoundingClientRect = () =>
      ({ left: 100, right: 900, top: 100, bottom: 700, width: 800, height: 600 }) as DOMRect
    player.append(video)
    document.body.append(player)

    showPlaybackHint('play', document, video)

    const hint = document.getElementById('video-speed-shortcuts-playback-hint')
    expect(hint?.style.left).toBe('254px')
    expect(hint?.style.top).toBe('354px')
  })

  it('keeps the playback hint inside a visible player when the video rect is stale', () => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })

    const player = document.createElement('div')
    player.style.overflow = 'hidden'
    player.getBoundingClientRect = () =>
      ({ left: 100, right: 900, top: 100, bottom: 700, width: 800, height: 600 }) as DOMRect

    const video = document.createElement('video')
    video.getBoundingClientRect = () =>
      ({ left: 100, right: 900, top: -500, bottom: 100, width: 800, height: 600 }) as DOMRect
    player.append(video)
    document.body.append(player)

    showPlaybackHint('play', document, video)

    const hint = document.getElementById('video-speed-shortcuts-playback-hint')
    expect(hint?.style.left).toBe('454px')
    expect(hint?.style.top).toBe('354px')
  })

  it('keeps an offscreen playback hint at its original position in the video', () => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })

    const video = document.createElement('video')
    video.getBoundingClientRect = () =>
      ({ left: 100, right: 900, top: 900, bottom: 1500, width: 800, height: 600 }) as DOMRect
    document.body.append(video)

    showPlaybackHint('play', document, video)

    const hint = document.getElementById('video-speed-shortcuts-playback-hint')
    expect(hint?.style.top).toBe('1154px')
    expect(hint?.style.opacity).toBe('0.82')
  })

  it('moves a playback hint with its video and restores its original position', () => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })

    let videoTop = 100
    const video = document.createElement('video')
    video.getBoundingClientRect = () =>
      ({
        left: 100,
        right: 900,
        top: videoTop,
        bottom: videoTop + 600,
        width: 800,
        height: 600,
      }) as DOMRect
    document.body.append(video)

    showPlaybackHint('play', document, video)
    const hint = document.getElementById('video-speed-shortcuts-playback-hint')
    expect(hint?.style.opacity).toBe('0.82')

    videoTop = 900
    window.dispatchEvent(new Event('scroll'))
    expect(hint?.style.top).toBe('1154px')

    videoTop = 100
    window.dispatchEvent(new Event('scroll'))
    expect(hint?.style.top).toBe('354px')
    expect(hint?.style.opacity).toBe('0.82')
  })

})
