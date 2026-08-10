import { bindingFromEvent } from '../shared/keys'
import { DEFAULT_SETTINGS, getSettings, subscribeSettings } from '../shared/settings'
import { resolveSitePreferences } from '../shared/site-matching'
import type { VideoSpeedSettings } from '../shared/types'
import { claimContentScriptInitialization } from './bootstrap'
import { hideIndicator, showIndicator, showPlaybackHint } from './indicator'
import {
  createContentShortcutRuntime,
  type RuntimeEffect,
  type RuntimeInput,
  type RuntimeVideo,
} from './runtime'
import { findActiveVideo } from './video-target'

const runtime = createContentShortcutRuntime()
const holdTimers = new Map<number, number>()

const isTypingTarget = (event: KeyboardEvent): boolean => {
  const target = event.composedPath()[0]
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

const toRuntimeVideo = (video: HTMLVideoElement | null): RuntimeVideo | null =>
  video
    ? {
        element: video,
        playbackRate: video.playbackRate,
        paused: video.paused,
      }
    : null

const intercept = (event: KeyboardEvent): void => {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

const videoFromEffect = (effect: { video: RuntimeVideo }): HTMLVideoElement =>
  effect.video.element

const applyEffects = (effects: RuntimeEffect[], event?: KeyboardEvent): void => {
  for (const effect of effects) {
    switch (effect.type) {
      case 'intercept':
        if (event) intercept(event)
        break
      case 'schedule-hold': {
        const timer = window.setTimeout(() => {
          holdTimers.delete(effect.holdId)
          applyEffects(runtime.dispatch({ type: 'hold-delay-elapsed', holdId: effect.holdId }))
        }, effect.delayMs)
        holdTimers.set(effect.holdId, timer)
        break
      }
      case 'cancel-hold': {
        const timer = holdTimers.get(effect.holdId)
        if (timer !== undefined) window.clearTimeout(timer)
        holdTimers.delete(effect.holdId)
        break
      }
      case 'play':
        void videoFromEffect(effect).play().catch(() => undefined)
        break
      case 'pause':
        videoFromEffect(effect).pause()
        break
      case 'toggle-playback': {
        const video = videoFromEffect(effect)
        const willPlay = video.paused
        if (willPlay) void video.play().catch(() => undefined)
        else video.pause()
        if (effect.showIndicator) {
          showPlaybackHint(willPlay ? 'play' : 'pause', video.ownerDocument, video)
        }
        break
      }
      case 'set-speed': {
        const video = videoFromEffect(effect)
        video.playbackRate = effect.speed
        if (effect.updateDefaultPlaybackRate) video.defaultPlaybackRate = effect.speed
        if (effect.showIndicator) {
          showIndicator(
            `${effect.speed.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}×`,
            video.ownerDocument,
            video,
            { persist: effect.persistIndicator }
          )
        }
        break
      }
      case 'hide-indicator':
        hideIndicator()
        break
    }
  }
}

const settingsReadyInput = (settings: VideoSpeedSettings): RuntimeInput => ({
  type: 'settings-changed',
  settings,
  ready: true,
})

const handleKeydown = (event: KeyboardEvent): void => {
  const input: RuntimeInput = {
    type: 'keydown',
    binding: bindingFromEvent(event),
    repeat: event.repeat,
    isTypingTarget: isTypingTarget(event),
    isSiteBlocked: currentSiteBlocked,
    video: toRuntimeVideo(findActiveVideo()),
  }
  applyEffects(runtime.dispatch(input), event)
}

const handleKeyup = (event: KeyboardEvent): void => {
  applyEffects(runtime.dispatch({ type: 'keyup', code: event.code }), event)
}

let currentSettings: VideoSpeedSettings = DEFAULT_SETTINGS
let currentSiteBlocked = false

const applySettings = (nextSettings: VideoSpeedSettings): void => {
  const preferences = resolveSitePreferences(location.hostname, nextSettings.siteRules, nextSettings)
  currentSiteBlocked = preferences.blocked
  currentSettings = {
    ...nextSettings,
    targetSpeed: preferences.targetSpeed,
    showIndicator: preferences.showIndicator,
  }
  applyEffects(runtime.dispatch(settingsReadyInput(currentSettings)))
}

if (claimContentScriptInitialization(globalThis)) {
  void getSettings()
    .then(applySettings)
    .catch(() => {
      applySettings(DEFAULT_SETTINGS)
    })

  subscribeSettings(applySettings)

  window.addEventListener('keydown', handleKeydown, true)
  window.addEventListener('keyup', handleKeyup, true)
  window.addEventListener('blur', () => applyEffects(runtime.dispatch({ type: 'focus-lost' })))
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) applyEffects(runtime.dispatch({ type: 'focus-lost' }))
  })
}
