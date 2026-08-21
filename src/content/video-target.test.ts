/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { findActiveVideo } from './video-target'

describe('findActiveVideo', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.replaceChildren()
  })

  it('finds a video nested inside open shadow roots', () => {
    const player = document.createElement('mux-player')
    const playerRoot = player.attachShadow({ mode: 'open' })
    const media = document.createElement('mux-video')
    const mediaRoot = media.attachShadow({ mode: 'open' })
    const video = document.createElement('video')

    mediaRoot.append(video)
    playerRoot.append(media)
    document.body.append(player)

    expect(document.querySelector('video')).toBeNull()
    expect(findActiveVideo()).toBe(video)
  })

  it('keeps active-video scoring across the document and shadow roots', () => {
    const lightVideo = document.createElement('video')
    const player = document.createElement('mux-player')
    const shadowVideo = document.createElement('video')

    Object.defineProperty(lightVideo, 'paused', { configurable: true, value: true })
    Object.defineProperty(shadowVideo, 'paused', { configurable: true, value: false })
    Object.defineProperty(shadowVideo, 'ended', { configurable: true, value: false })

    player.attachShadow({ mode: 'open' }).append(shadowVideo)
    document.body.append(lightVideo, player)

    expect(findActiveVideo()).toBe(shadowVideo)
  })

  it('reuses discovered shadow roots while a physical key is repeating', () => {
    const player = document.createElement('mux-player')
    const video = document.createElement('video')
    player.attachShadow({ mode: 'open' }).append(video)
    document.body.append(player)

    findActiveVideo(document, true)
    const querySelectorAll = vi.spyOn(document, 'querySelectorAll')

    expect(findActiveVideo(document, false)).toBe(video)
    expect(querySelectorAll).not.toHaveBeenCalledWith('*')
  })

  it('does not keep scanning unrelated page mutations after resolving a target', async () => {
    document.body.append(document.createElement('video'))
    findActiveVideo(document, true)

    const addedSubtree = document.createElement('div')
    const querySelectorAll = vi.spyOn(addedSubtree, 'querySelectorAll')
    document.body.append(addedSubtree)
    await Promise.resolve()

    expect(querySelectorAll).not.toHaveBeenCalled()
  })

  it('refreshes stale shadow roots while a physical key is repeating', () => {
    const player = document.createElement('mux-player')
    player.attachShadow({ mode: 'open' }).append(document.createElement('video'))
    document.body.append(player)
    findActiveVideo(document, true)

    const replacementPlayer = document.createElement('mux-player')
    const replacementVideo = document.createElement('video')
    replacementPlayer.attachShadow({ mode: 'open' }).append(replacementVideo)
    player.replaceWith(replacementPlayer)

    expect(findActiveVideo(document, false)).toBe(replacementVideo)
  })

  it('periodically discovers a nested shadow-root player added while a key is repeating', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000)
    const player = document.createElement('mux-player')
    const playerRoot = player.attachShadow({ mode: 'open' })
    const originalVideo = document.createElement('video')
    Object.defineProperty(originalVideo, 'paused', { configurable: true, value: true })
    playerRoot.append(originalVideo)
    document.body.append(player)
    findActiveVideo(document, true)

    const media = document.createElement('mux-video')
    const replacementVideo = document.createElement('video')
    Object.defineProperty(replacementVideo, 'paused', { configurable: true, value: false })
    Object.defineProperty(replacementVideo, 'ended', { configurable: true, value: false })
    media.attachShadow({ mode: 'open' }).append(replacementVideo)
    playerRoot.append(media)
    now.mockReturnValue(1_500)

    expect(findActiveVideo(document, false)).toBe(replacementVideo)
  })

  it('periodically discovers a shadow root attached after its host is connected', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000)
    const player = document.createElement('mux-player')
    const playerRoot = player.attachShadow({ mode: 'open' })
    const originalVideo = document.createElement('video')
    const media = document.createElement('mux-video')
    Object.defineProperty(originalVideo, 'paused', { configurable: true, value: true })
    playerRoot.append(originalVideo, media)
    document.body.append(player)
    findActiveVideo(document, true)

    const replacementVideo = document.createElement('video')
    Object.defineProperty(replacementVideo, 'paused', { configurable: true, value: false })
    Object.defineProperty(replacementVideo, 'ended', { configurable: true, value: false })
    media.attachShadow({ mode: 'open' }).append(replacementVideo)
    now.mockReturnValue(1_500)

    expect(findActiveVideo(document, false)).toBe(replacementVideo)
  })
})
