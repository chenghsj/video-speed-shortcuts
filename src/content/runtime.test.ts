import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../shared/settings'
import { createContentShortcutRuntime, type RuntimeInput, type RuntimeVideo } from './runtime'

const videoElement = {} as HTMLVideoElement
const video: RuntimeVideo = { element: videoElement, playbackRate: 1, paused: true }

const readyRuntime = () => {
  const runtime = createContentShortcutRuntime()
  runtime.dispatch({ type: 'settings-changed', settings: DEFAULT_SETTINGS, ready: true })
  return runtime
}

const keydown = (
  action: keyof typeof DEFAULT_SETTINGS.bindings,
  overrides: Partial<Extract<RuntimeInput, { type: 'keydown' }>> = {}
): Extract<RuntimeInput, { type: 'keydown' }> => ({
  type: 'keydown',
  binding: DEFAULT_SETTINGS.bindings[action],
  repeat: false,
  isTypingTarget: false,
  isSiteBlocked: false,
  video,
  ...overrides,
})

describe('content shortcut runtime', () => {
  it('keeps keyboard handling inert until settings are ready', () => {
    const runtime = createContentShortcutRuntime()

    expect(runtime.dispatch(keydown('speedUp'))).toEqual([])
    expect(runtime.dispatch({ type: 'settings-changed', settings: DEFAULT_SETTINGS })).toEqual([
      { type: 'hide-indicator' },
    ])
    expect(runtime.dispatch(keydown('speedUp'))).toEqual([])
  })

  it('changes playback speed through effects instead of touching a video', () => {
    const runtime = readyRuntime()

    expect(runtime.dispatch(keydown('speedUp'))).toEqual([
      { type: 'intercept' },
      {
        type: 'set-speed',
        video,
        speed: 1.25,
        showIndicator: true,
        persistIndicator: false,
        updateDefaultPlaybackRate: true,
      },
    ])
  })

  it('does not intercept a disabled shortcut action', () => {
    const runtime = createContentShortcutRuntime()
    runtime.dispatch({
      type: 'settings-changed',
      settings: {
        ...DEFAULT_SETTINGS,
        shortcutEnabled: { ...DEFAULT_SETTINGS.shortcutEnabled, speedUp: false },
      },
      ready: true,
    })

    expect(runtime.dispatch(keydown('speedUp'))).toEqual([])
    expect(runtime.dispatch(keydown('speedDown'))[0]).toEqual({ type: 'intercept' })
  })

  it('sets the target speed even when it is already active', () => {
    const runtime = readyRuntime()

    expect(runtime.dispatch(keydown('toggleTargetSpeed'))).toEqual([
      { type: 'intercept' },
      {
        type: 'set-speed',
        video,
        speed: 2,
        showIndicator: true,
        persistIndicator: false,
        updateDefaultPlaybackRate: true,
      },
    ])

    const targetVideo = { ...video, playbackRate: 2 }
    expect(runtime.dispatch(keydown('toggleTargetSpeed', { video: targetVideo }))).toEqual([
      { type: 'intercept' },
      {
        type: 'set-speed',
        video: targetVideo,
        speed: 2,
        showIndicator: true,
        persistIndicator: false,
        updateDefaultPlaybackRate: true,
      },
    ])
  })

  it('intercepts target-speed repeats without toggling again', () => {
    const runtime = readyRuntime()

    expect(runtime.dispatch(keydown('toggleTargetSpeed', { repeat: true }))).toEqual([
      { type: 'intercept' },
    ])
  })

  it('ignores target-speed toggles while the hold interaction owns playback', () => {
    const runtime = readyRuntime()
    runtime.dispatch(keydown('holdSpeed'))

    expect(runtime.dispatch(keydown('toggleTargetSpeed'))).toEqual([
      { type: 'intercept' },
    ])
  })

  it('models short press and long press as separate hold transitions', () => {
    const runtime = readyRuntime()

    expect(runtime.dispatch(keydown('holdSpeed'))).toEqual([
      { type: 'intercept' },
      { type: 'schedule-hold', holdId: 1, delayMs: 250 },
    ])
    expect(runtime.dispatch({ type: 'keyup', code: 'Space' })).toEqual([
      { type: 'intercept' },
      { type: 'cancel-hold', holdId: 1 },
      { type: 'toggle-playback', video, showIndicator: true },
    ])

    expect(runtime.dispatch(keydown('holdSpeed'))).toEqual([
      { type: 'intercept' },
      { type: 'schedule-hold', holdId: 2, delayMs: 250 },
    ])
    expect(runtime.dispatch({ type: 'hold-delay-elapsed', holdId: 2 })).toEqual([
      { type: 'play', video },
      {
        type: 'set-speed',
        video,
        speed: 2,
        showIndicator: true,
        persistIndicator: true,
        updateDefaultPlaybackRate: false,
      },
    ])
    expect(runtime.dispatch({ type: 'keyup', code: 'Space' })).toEqual([
      { type: 'intercept' },
      { type: 'cancel-hold', holdId: 2 },
      {
        type: 'set-speed',
        video,
        speed: 1,
        showIndicator: false,
        persistIndicator: false,
        updateDefaultPlaybackRate: false,
      },
      { type: 'pause', video },
      { type: 'hide-indicator' },
    ])
  })

  it('cancels stale hold timers when focus is lost', () => {
    const runtime = readyRuntime()
    runtime.dispatch(keydown('holdSpeed'))

    expect(runtime.dispatch({ type: 'focus-lost' })).toEqual([
      { type: 'cancel-hold', holdId: 1 },
    ])
    expect(runtime.dispatch({ type: 'hold-delay-elapsed', holdId: 1 })).toEqual([])
  })

  it('ignores typing targets, blocked sites, and disabled settings', () => {
    const runtime = readyRuntime()

    expect(runtime.dispatch(keydown('speedUp', { isTypingTarget: true }))).toEqual([])
    expect(runtime.dispatch(keydown('speedUp', { isSiteBlocked: true }))).toEqual([])

    const disabled = { ...DEFAULT_SETTINGS, enabled: false }
    runtime.dispatch({ type: 'settings-changed', settings: disabled })
    expect(runtime.dispatch(keydown('speedUp'))).toEqual([])
  })
})
