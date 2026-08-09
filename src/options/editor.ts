import { bindingFromEvent, bindingsEqual } from '../shared/keys'
import { DEFAULT_SETTINGS, normalizeSettings } from '../shared/settings'
import { normalizeHostname } from '../shared/site-matching'
import {
  SHORTCUT_ACTIONS,
  type KeyBinding,
  type ShortcutAction,
  type VideoSpeedSettings,
} from '../shared/types'

export const NUMBER_FIELDS = [
  { id: 'minimumSpeed', label: 'minimumSpeed', min: 0.1, max: 1, step: 0.05 },
  { id: 'maximumSpeed', label: 'maximumSpeed', min: 1, max: 16, step: 0.05 },
  { id: 'speedStep', label: 'speedStep', min: 0.05, max: 4, step: 0.05 },
] as const

export const HOLD_FIELDS = [
  { id: 'holdSpeed', label: 'holdSpeed', min: 0.1, max: 16, step: 0.05 },
  { id: 'holdDelayMs', label: 'holdDelay', min: 100, max: 1000, step: 10, suffix: 'ms' },
] as const

export type NumberFieldId = (typeof NUMBER_FIELDS)[number]['id'] | (typeof HOLD_FIELDS)[number]['id']
export type EditorStatusKey = 'autoSave' | 'saveFailed'
export type EditorErrorKey = 'invalid' | 'duplicate'
export type EditorSection = 'quickControls' | 'shortcuts' | 'blockedSites' | 'appearance'

export type EditorState = {
  settings: VideoSpeedSettings
  recordingAction: ShortcutAction | null
  shortcutConflict: ShortcutAction | null
  statusKey: EditorStatusKey
  blacklistDraft: string
  blacklistError: EditorErrorKey | null
  draftNumbers: Record<NumberFieldId, string>
}

export type EditorEvent =
  | { type: 'settings-changed'; settings: VideoSpeedSettings }
  | { type: 'patch-settings'; changes: Partial<VideoSpeedSettings> }
  | { type: 'set-number-draft'; id: NumberFieldId; value: string }
  | { type: 'commit-number'; id: NumberFieldId }
  | { type: 'start-recording'; action: ShortcutAction }
  | { type: 'cancel-recording' }
  | { type: 'capture-binding'; binding: KeyBinding | null }
  | { type: 'set-blacklist-draft'; value: string }
  | { type: 'add-blacklist' }
  | { type: 'toggle-blacklist'; host: string; enabled: boolean }
  | { type: 'remove-blacklist'; host: string }
  | { type: 'save-succeeded' }
  | { type: 'save-failed' }
  | { type: 'reset-section'; section: EditorSection }

export type EditorEffect = { type: 'save'; settings: VideoSpeedSettings }

export type EditorTransition = {
  state: EditorState
  effect?: EditorEffect
}

const draftNumbersFor = (settings: VideoSpeedSettings): Record<NumberFieldId, string> => ({
  minimumSpeed: String(settings.minimumSpeed),
  maximumSpeed: String(settings.maximumSpeed),
  speedStep: String(settings.speedStep),
  holdSpeed: String(settings.holdSpeed),
  holdDelayMs: String(settings.holdDelayMs),
})

export const createEditorState = (settings: VideoSpeedSettings = DEFAULT_SETTINGS): EditorState => ({
  settings,
  recordingAction: null,
  shortcutConflict: null,
  statusKey: 'autoSave',
  blacklistDraft: '',
  blacklistError: null,
  draftNumbers: draftNumbersFor(settings),
})

const withSettings = (state: EditorState, settings: VideoSpeedSettings): EditorState => ({
  ...state,
  settings,
  draftNumbers: draftNumbersFor(settings),
})

const save = (state: EditorState, settings: VideoSpeedSettings): EditorTransition => ({
  state: withSettings(state, settings),
  effect: { type: 'save', settings },
})

export const reduceEditor = (state: EditorState, event: EditorEvent): EditorTransition => {
  switch (event.type) {
    case 'settings-changed':
      return { state: withSettings(state, event.settings) }
    case 'patch-settings':
      return save(state, { ...state.settings, ...event.changes })
    case 'set-number-draft':
      return {
        state: {
          ...state,
          draftNumbers: { ...state.draftNumbers, [event.id]: event.value },
        },
      }
    case 'commit-number': {
      const draft = state.draftNumbers[event.id].trim()
      const value = Number(draft)
      if (!draft || !Number.isFinite(value)) {
        return {
          state: {
            ...state,
            draftNumbers: { ...state.draftNumbers, [event.id]: String(state.settings[event.id]) },
          },
        }
      }
      return save(state, normalizeSettings({ ...state.settings, [event.id]: value }))
    }
    case 'start-recording':
      return {
        state: {
          ...state,
          recordingAction: event.action,
          shortcutConflict: null,
        },
      }
    case 'cancel-recording':
      return { state: { ...state, recordingAction: null, shortcutConflict: null } }
    case 'capture-binding': {
      if (!state.recordingAction || !event.binding) return { state }
      const conflict = SHORTCUT_ACTIONS.find(
        action =>
          action !== state.recordingAction &&
          bindingsEqual(state.settings.bindings[action], event.binding as KeyBinding)
      )
      if (conflict) return { state: { ...state, shortcutConflict: conflict } }

      return save(
        { ...state, recordingAction: null, shortcutConflict: null },
        {
        ...state.settings,
        bindings: { ...state.settings.bindings, [state.recordingAction]: event.binding },
        }
      )
    }
    case 'set-blacklist-draft':
      return {
        state: {
          ...state,
          blacklistDraft: event.value,
          blacklistError: null,
        },
      }
    case 'add-blacklist': {
      const host = normalizeHostname(state.blacklistDraft)
      if (!host) return { state: { ...state, blacklistError: 'invalid' } }
      if (state.settings.blacklist.some(entry => entry.host === host)) {
        return { state: { ...state, blacklistError: 'duplicate' } }
      }

      const transition = save(state, {
        ...state.settings,
        blacklist: [...state.settings.blacklist, { host, enabled: true }],
      })
      return {
        state: { ...transition.state, blacklistDraft: '', blacklistError: null },
        effect: transition.effect,
      }
    }
    case 'toggle-blacklist':
      return save(state, {
        ...state.settings,
        blacklist: state.settings.blacklist.map(entry =>
          entry.host === event.host ? { ...entry, enabled: event.enabled } : entry
        ),
      })
    case 'remove-blacklist':
      return save(state, {
        ...state.settings,
        blacklist: state.settings.blacklist.filter(entry => entry.host !== event.host),
      })
    case 'save-succeeded':
      return { state: { ...state, statusKey: 'autoSave' } }
    case 'save-failed':
      return { state: { ...state, statusKey: 'saveFailed' } }
    case 'reset-section': {
      switch (event.section) {
        case 'quickControls':
          return save(state, {
            ...state.settings,
            minimumSpeed: DEFAULT_SETTINGS.minimumSpeed,
            maximumSpeed: DEFAULT_SETTINGS.maximumSpeed,
            speedStep: DEFAULT_SETTINGS.speedStep,
            holdSpeed: DEFAULT_SETTINGS.holdSpeed,
            holdDelayMs: DEFAULT_SETTINGS.holdDelayMs,
            showIndicator: DEFAULT_SETTINGS.showIndicator,
          })
        case 'shortcuts':
          return save(
            { ...state, recordingAction: null, shortcutConflict: null },
            { ...state.settings, bindings: structuredClone(DEFAULT_SETTINGS.bindings) }
          )
        case 'blockedSites':
          return save(
            { ...state, blacklistDraft: '', blacklistError: null },
            { ...state.settings, blacklist: [] }
          )
        case 'appearance':
          return save(state, {
            ...state.settings,
            locale: DEFAULT_SETTINGS.locale,
            theme: DEFAULT_SETTINGS.theme,
          })
      }
    }
  }
}

export const bindingFromKeyboardEvent = (event: KeyboardEvent): KeyBinding => bindingFromEvent(event)
