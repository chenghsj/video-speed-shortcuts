import { bindingsEqual } from '../shared/keys'
import { DEFAULT_SETTINGS } from '../shared/settings'
import { resolveNextSpeed } from '../shared/speed'
import { SHORTCUT_ACTIONS, type KeyBinding, type VideoSpeedSettings } from '../shared/types'

export type RuntimeVideo = {
  element: HTMLVideoElement
  playbackRate: number
  paused: boolean
}

export type RuntimeInput =
  | {
      type: 'keydown'
      binding: KeyBinding
      repeat: boolean
      isTypingTarget: boolean
      isSiteBlocked: boolean
      video: RuntimeVideo | null
    }
  | { type: 'keyup'; code: string }
  | { type: 'hold-delay-elapsed'; holdId: number }
  | { type: 'focus-lost' }
  | { type: 'settings-changed'; settings: VideoSpeedSettings; ready?: boolean }

export type RuntimeEffect =
  | { type: 'intercept' }
  | { type: 'schedule-hold'; holdId: number; delayMs: number }
  | { type: 'cancel-hold'; holdId: number }
  | { type: 'play'; video: RuntimeVideo }
  | { type: 'pause'; video: RuntimeVideo }
  | { type: 'toggle-playback'; video: RuntimeVideo; showIndicator: boolean }
  | {
      type: 'set-speed'
      video: RuntimeVideo
      speed: number
      showIndicator: boolean
      persistIndicator: boolean
      updateDefaultPlaybackRate: boolean
    }
  | { type: 'hide-indicator' }

type HoldState = {
  id: number
  video: RuntimeVideo
  bindingCode: string
  originalSpeed: number
  wasPaused: boolean
  active: boolean
}

export type ContentShortcutRuntime = {
  dispatch: (input: RuntimeInput) => RuntimeEffect[]
}

export const shouldResolveShortcutTarget = (
  settings: VideoSpeedSettings,
  binding: KeyBinding,
  isTypingTarget: boolean,
  isSiteBlocked: boolean
): boolean =>
  settings.enabled &&
  !isTypingTarget &&
  !isSiteBlocked &&
  SHORTCUT_ACTIONS.some(
    action => settings.shortcutEnabled[action] && bindingsEqual(binding, settings.bindings[action])
  )

const setSpeedEffect = (
  settings: VideoSpeedSettings,
  video: RuntimeVideo,
  speed: number,
  options: { indicate?: boolean; persistIndicator?: boolean; updateDefaultPlaybackRate?: boolean } = {}
): RuntimeEffect => ({
  type: 'set-speed',
  video,
  speed,
  showIndicator: options.indicate !== false && settings.showIndicator,
  persistIndicator: options.persistIndicator ?? false,
  updateDefaultPlaybackRate: options.updateDefaultPlaybackRate ?? false,
})

export const createContentShortcutRuntime = (
  initialSettings: VideoSpeedSettings = DEFAULT_SETTINGS
): ContentShortcutRuntime => {
  let settings = initialSettings
  let settingsReady = false
  let holdState: HoldState | null = null
  let consumedHoldKeyupCode: string | null = null
  let nextHoldId = 1

  const restoreActiveHold = (current: HoldState): RuntimeEffect[] => {
    const effects: RuntimeEffect[] = [
      setSpeedEffect(settings, current.video, current.originalSpeed, { indicate: false }),
    ]
    if (current.wasPaused) effects.push({ type: 'pause', video: current.video })
    effects.push({ type: 'hide-indicator' })
    return effects
  }

  const restoreHold = (): RuntimeEffect[] => {
    const current = holdState
    holdState = null
    if (!current) return []

    const effects: RuntimeEffect[] = [{ type: 'cancel-hold', holdId: current.id }]
    if (!current.active) return effects

    effects.push(...restoreActiveHold(current))
    return effects
  }

  const beginHold = (input: Extract<RuntimeInput, { type: 'keydown' }>): RuntimeEffect[] => {
    if (holdState || input.repeat || !input.video) return []

    const video = input.video
    const holdId = nextHoldId++
    holdState = {
      id: holdId,
      video,
      bindingCode: input.binding.code,
      originalSpeed:
        Number.isFinite(video.playbackRate) && video.playbackRate > 0 ? video.playbackRate : 1,
      wasPaused: video.paused,
      active: false,
    }

    return [
      { type: 'intercept' },
      { type: 'schedule-hold', holdId, delayMs: settings.holdDelayMs },
    ]
  }

  const completeHold = (code: string): RuntimeEffect[] => {
    const current = holdState
    if (!current || current.bindingCode !== code) {
      if (consumedHoldKeyupCode !== code) return []
      consumedHoldKeyupCode = null
      return [{ type: 'intercept' }]
    }

    holdState = null
    consumedHoldKeyupCode = null
    const effects: RuntimeEffect[] = [
      { type: 'intercept' },
      { type: 'cancel-hold', holdId: current.id },
    ]

    if (!current.active) {
      effects.push({
        type: 'toggle-playback',
        video: current.video,
        showIndicator: settings.showIndicator,
      })
      return effects
    }

    effects.push(...restoreActiveHold(current))
    return effects
  }

  const activateHold = (holdId: number): RuntimeEffect[] => {
    const current = holdState
    if (!current || current.id !== holdId || current.active) return []

    current.active = true
    const effects: RuntimeEffect[] = []
    if (current.video.paused) effects.push({ type: 'play', video: current.video })
    effects.push(
      setSpeedEffect(settings, current.video, settings.holdSpeed, { persistIndicator: true })
    )
    return effects
  }

  const handleKeydown = (
    input: Extract<RuntimeInput, { type: 'keydown' }>
  ): RuntimeEffect[] => {
    const matches = (action: keyof VideoSpeedSettings['bindings']): boolean =>
      settings.shortcutEnabled[action] && bindingsEqual(input.binding, settings.bindings[action])

    if (
      !settingsReady ||
      !settings.enabled ||
      input.isSiteBlocked ||
      input.isTypingTarget
    ) {
      return []
    }

    if (holdState && input.binding.code === holdState.bindingCode) {
      return [{ type: 'intercept' }]
    }

    if (consumedHoldKeyupCode === input.binding.code) {
      return [{ type: 'intercept' }]
    }

    if (
      holdState &&
      (matches('speedUp') ||
        matches('speedDown') ||
        matches('speedReset') ||
        matches('toggleTargetSpeed'))
    ) {
      const current = holdState
      consumedHoldKeyupCode = current.bindingCode
      const effects = restoreHold()
      const restoredVideo: RuntimeVideo = {
        ...current.video,
        playbackRate: current.originalSpeed,
        paused: current.wasPaused,
      }
      const replacementVideo =
        input.video?.element === current.video.element ? restoredVideo : input.video

      return [
        ...effects,
        ...handleKeydown({
          ...input,
          video: replacementVideo,
        }),
      ]
    }

    const video = input.video
    if (!video) return []

    if (matches('holdSpeed')) return beginHold(input)

    if (matches('speedUp')) {
      return [
        { type: 'intercept' },
        setSpeedEffect(settings, video, resolveNextSpeed(video.playbackRate, 1, settings), {
          updateDefaultPlaybackRate: true,
        }),
      ]
    }

    if (matches('speedDown')) {
      return [
        { type: 'intercept' },
        setSpeedEffect(settings, video, resolveNextSpeed(video.playbackRate, -1, settings), {
          updateDefaultPlaybackRate: true,
        }),
      ]
    }

    if (!input.repeat && matches('speedReset')) {
      return [
        { type: 'intercept' },
        setSpeedEffect(settings, video, 1, { updateDefaultPlaybackRate: true }),
      ]
    }

    if (matches('toggleTargetSpeed')) {
      if (input.repeat) return [{ type: 'intercept' }]
      return [
        { type: 'intercept' },
        setSpeedEffect(settings, video, settings.targetSpeed, { updateDefaultPlaybackRate: true }),
      ]
    }

    return []
  }

  const dispatch = (input: RuntimeInput): RuntimeEffect[] => {
    switch (input.type) {
      case 'keydown':
        return handleKeydown(input)
      case 'keyup':
        return completeHold(input.code)
      case 'hold-delay-elapsed':
        return activateHold(input.holdId)
      case 'focus-lost': {
        const effects = restoreHold()
        consumedHoldKeyupCode = null
        return effects
      }
      case 'settings-changed': {
        const effects = [...restoreHold(), { type: 'hide-indicator' } as RuntimeEffect]
        settings = input.settings
        if (input.ready) settingsReady = true
        return effects
      }
    }
  }

  return { dispatch }
}
