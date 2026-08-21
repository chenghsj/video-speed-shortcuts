import { bindingFromEvent, bindingsEqual } from '../shared/keys'
import { NUMERIC_SETTING_CONSTRAINTS } from '../shared/numeric-settings'
import { DEFAULT_SETTINGS, normalizeSettings } from '../shared/settings'
import { normalizeHostname } from '../shared/site-matching'
import {
  SHORTCUT_ACTIONS,
  type KeyBinding,
  type ShortcutAction,
  type SiteRule,
  type VideoSpeedSettings,
} from '../shared/types'

export const NUMBER_FIELDS = [
  { id: 'minimumSpeed', label: 'minimumSpeed', ...NUMERIC_SETTING_CONSTRAINTS.minimumSpeed },
  { id: 'maximumSpeed', label: 'maximumSpeed', ...NUMERIC_SETTING_CONSTRAINTS.maximumSpeed },
  { id: 'speedStep', label: 'speedStep', ...NUMERIC_SETTING_CONSTRAINTS.speedStep },
] as const

export const HOLD_FIELDS = [
  { id: 'holdSpeed', label: 'holdSpeed', ...NUMERIC_SETTING_CONSTRAINTS.holdSpeed },
  {
    id: 'holdDelayMs',
    label: 'holdDelay',
    ...NUMERIC_SETTING_CONSTRAINTS.holdDelayMs,
    suffix: 'ms',
  },
] as const

export const TARGET_SPEED_FIELD = {
  id: 'targetSpeed',
  label: 'targetSpeed',
  max: NUMERIC_SETTING_CONSTRAINTS.targetSpeed.max,
  step: NUMERIC_SETTING_CONSTRAINTS.targetSpeed.step,
} as const

export type NumberFieldId =
  | (typeof NUMBER_FIELDS)[number]['id']
  | (typeof HOLD_FIELDS)[number]['id']
  | typeof TARGET_SPEED_FIELD.id
export type EditorStatusKey = 'autoSave' | 'saveFailed'
export type EditorErrorKey = 'invalid' | 'duplicate'
export type EditorSiteRuleError = { key: EditorErrorKey; line: number }
export type NewSiteRule = Omit<SiteRule, 'host'>
export type EditorSection = 'quickControls' | 'shortcuts' | 'appearance'

export type EditorState = {
  settings: VideoSpeedSettings
  recordingAction: ShortcutAction | null
  shortcutConflict: ShortcutAction | null
  statusKey: EditorStatusKey
  siteRulesDraft: string
  siteRulesError: EditorSiteRuleError | null
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
  | { type: 'set-site-rules-draft'; value: string }
  | { type: 'add-site-rules'; rule?: NewSiteRule }
  | { type: 'toggle-site-rule'; host: string; enabled: boolean }
  | { type: 'patch-site-rule'; host: string; changes: Partial<Omit<SiteRule, 'host'>> }
  | { type: 'remove-site-rules'; hosts: string[] }
  | { type: 'save-succeeded'; siteRulesDraft?: string }
  | { type: 'save-failed' }
  | { type: 'replace-settings-succeeded'; settings: VideoSpeedSettings }
  | { type: 'reset-section'; section: EditorSection }

export type EditorEffect = {
  type: 'save'
  settings: VideoSpeedSettings
  siteRulesDraft?: string
}

export type EditorTransition = {
  state: EditorState
  effect?: EditorEffect
}

const draftNumbersFor = (settings: VideoSpeedSettings): Record<NumberFieldId, string> => ({
  minimumSpeed: String(settings.minimumSpeed),
  maximumSpeed: String(settings.maximumSpeed),
  speedStep: String(settings.speedStep),
  targetSpeed: String(settings.targetSpeed),
  holdSpeed: String(settings.holdSpeed),
  holdDelayMs: String(settings.holdDelayMs),
})

export const createEditorState = (settings: VideoSpeedSettings = DEFAULT_SETTINGS): EditorState => ({
  settings,
  recordingAction: null,
  shortcutConflict: null,
  statusKey: 'autoSave',
  siteRulesDraft: '',
  siteRulesError: null,
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
    case 'set-site-rules-draft':
      return {
        state: {
          ...state,
          siteRulesDraft: event.value,
          siteRulesError: null,
        },
      }
    case 'add-site-rules': {
      const rule = event.rule ?? {
        enabled: false,
        targetSpeed: null,
        showIndicator: null,
      }
      const drafts = state.siteRulesDraft
        .split(/\r?\n/)
        .map((value, index) => ({ value: value.trim(), line: index + 1 }))
        .filter(draft => Boolean(draft.value))
      if (drafts.length === 0) {
        return { state: { ...state, siteRulesError: { key: 'invalid', line: 1 } } }
      }

      const normalizedDrafts = drafts.map(draft => ({
        ...draft,
        host: normalizeHostname(draft.value),
      }))
      const invalidDraft = normalizedDrafts.find(draft => !draft.host)
      if (invalidDraft) {
        return {
          state: {
            ...state,
            siteRulesError: { key: 'invalid', line: invalidDraft.line },
          },
        }
      }

      const existingHosts = new Set(state.settings.siteRules.map(entry => entry.host))
      const seenHosts = new Set<string>()
      const duplicateDraft = normalizedDrafts.find(draft => {
        const host = draft.host as string
        if (existingHosts.has(host) || seenHosts.has(host)) return true
        seenHosts.add(host)
        return false
      })
      if (duplicateDraft) {
        return {
          state: {
            ...state,
            siteRulesError: { key: 'duplicate', line: duplicateDraft.line },
          },
        }
      }

      const normalizedHosts = normalizedDrafts.map(draft => draft.host as string)
      const transition = save(state, {
        ...state.settings,
        siteRules: [
          ...state.settings.siteRules,
          ...normalizedHosts.map(host => ({
            host,
            ...rule,
          })),
        ],
      })
      return {
        state: { ...transition.state, siteRulesError: null },
        effect: transition.effect
          ? { ...transition.effect, siteRulesDraft: state.siteRulesDraft }
          : undefined,
      }
    }
    case 'toggle-site-rule':
      return save(state, {
        ...state.settings,
        siteRules: state.settings.siteRules.map(entry =>
          entry.host === event.host ? { ...entry, enabled: event.enabled } : entry
        ),
      })
    case 'patch-site-rule':
      return save(state, normalizeSettings({
        ...state.settings,
        siteRules: state.settings.siteRules.map(entry =>
          entry.host === event.host ? { ...entry, ...event.changes } : entry
        ),
      }))
    case 'remove-site-rules':
      if (event.hosts.length === 0) return { state }
      {
        const hosts = new Set(event.hosts)
        return save(state, {
          ...state.settings,
          siteRules: state.settings.siteRules.filter(entry => !hosts.has(entry.host)),
        })
      }
    case 'save-succeeded':
      return {
        state: {
          ...state,
          statusKey: 'autoSave',
          siteRulesDraft:
            event.siteRulesDraft !== undefined && state.siteRulesDraft === event.siteRulesDraft
              ? ''
              : state.siteRulesDraft,
        },
      }
    case 'save-failed':
      return { state: { ...state, statusKey: 'saveFailed' } }
    case 'replace-settings-succeeded':
      return {
        state: {
          ...withSettings(state, event.settings),
          recordingAction: null,
          shortcutConflict: null,
          statusKey: 'autoSave',
          siteRulesDraft: '',
          siteRulesError: null,
        },
      }
    case 'reset-section': {
      switch (event.section) {
        case 'quickControls':
          return save(state, {
            ...state.settings,
            minimumSpeed: DEFAULT_SETTINGS.minimumSpeed,
            maximumSpeed: DEFAULT_SETTINGS.maximumSpeed,
            speedStep: DEFAULT_SETTINGS.speedStep,
            targetSpeed: DEFAULT_SETTINGS.targetSpeed,
            holdSpeed: DEFAULT_SETTINGS.holdSpeed,
            holdDelayMs: DEFAULT_SETTINGS.holdDelayMs,
          })
        case 'shortcuts':
          return save(
            { ...state, recordingAction: null, shortcutConflict: null },
            {
              ...state.settings,
              bindings: structuredClone(DEFAULT_SETTINGS.bindings),
              shortcutEnabled: structuredClone(DEFAULT_SETTINGS.shortcutEnabled),
            }
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
