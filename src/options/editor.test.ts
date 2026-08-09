import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../shared/settings'
import { createEditorState, reduceEditor } from './editor'

describe('settings editor workflow', () => {
  it('commits normalized numeric drafts and rejects non-numeric drafts locally', () => {
    const state = createEditorState()
    const invalid = reduceEditor(
      reduceEditor(state, { type: 'set-number-draft', id: 'speedStep', value: 'nope' }).state,
      { type: 'commit-number', id: 'speedStep' }
    )

    expect(invalid.effect).toBeUndefined()
    expect(invalid.state.draftNumbers.speedStep).toBe(String(DEFAULT_SETTINGS.speedStep))

    const committed = reduceEditor(
      reduceEditor(state, { type: 'set-number-draft', id: 'speedStep', value: '0.5' }).state,
      { type: 'commit-number', id: 'speedStep' }
    )
    expect(committed.state.settings.speedStep).toBe(0.5)
    expect(committed.effect).toEqual({ type: 'save', settings: committed.state.settings })
  })

  it('restores the last legal value when a numeric draft is cleared', () => {
    const state = createEditorState()
    const cleared = reduceEditor(
      reduceEditor(state, { type: 'set-number-draft', id: 'maximumSpeed', value: '' }).state,
      { type: 'commit-number', id: 'maximumSpeed' }
    )

    expect(cleared.effect).toBeUndefined()
    expect(cleared.state.settings.maximumSpeed).toBe(DEFAULT_SETTINGS.maximumSpeed)
    expect(cleared.state.draftNumbers.maximumSpeed).toBe(String(DEFAULT_SETTINGS.maximumSpeed))
  })

  it('keeps a conflicting shortcut in recording mode and saves a valid capture', () => {
    const state = reduceEditor(createEditorState(), { type: 'start-recording', action: 'speedUp' }).state
    const conflict = reduceEditor(state, {
      type: 'capture-binding',
      binding: DEFAULT_SETTINGS.bindings.speedDown,
    })

    expect(conflict.state.recordingAction).toBe('speedUp')
    expect(conflict.state.shortcutConflict).toBe('speedDown')
    expect(conflict.effect).toBeUndefined()

    const binding = { ...DEFAULT_SETTINGS.bindings.speedUp, code: 'KeyS', key: 's' }
    const captured = reduceEditor(conflict.state, { type: 'capture-binding', binding })
    expect(captured.state.recordingAction).toBeNull()
    expect(captured.state.shortcutConflict).toBeNull()
    expect(captured.state.settings.bindings.speedUp).toEqual(binding)
    expect(captured.effect?.type).toBe('save')
  })

  it('owns site-scope validation, duplicate detection, and mutations', () => {
    const invalid = reduceEditor(createEditorState(), { type: 'add-blacklist' })
    expect(invalid.state.blacklistError).toBe('invalid')

    const withDraft = reduceEditor(createEditorState(), {
      type: 'set-blacklist-draft',
      value: 'https://YouTube.com/watch?v=1',
    }).state
    const added = reduceEditor(withDraft, { type: 'add-blacklist' })
    expect(added.state.settings.blacklist).toEqual([{ host: 'youtube.com', enabled: true }])
    expect(added.state.blacklistDraft).toBe('')

    const duplicate = reduceEditor(
      reduceEditor(added.state, { type: 'set-blacklist-draft', value: 'youtube.com' }).state,
      { type: 'add-blacklist' }
    )
    expect(duplicate.state.blacklistError).toBe('duplicate')
  })

  it('keeps save status transitions separate from the edit policy', () => {
    const saved = reduceEditor(createEditorState(), { type: 'save-succeeded' })
    expect(saved.state.statusKey).toBe('saved')
    expect(reduceEditor(saved.state, { type: 'save-status-auto' }).state.statusKey).toBe('autoSave')
    expect(reduceEditor(saved.state, { type: 'save-failed' }).state.statusKey).toBe('saveFailed')
  })

  it('restores only the requested settings section', () => {
    const customized = createEditorState({
      ...DEFAULT_SETTINGS,
      enabled: false,
      minimumSpeed: 0.5,
      maximumSpeed: 8,
      speedStep: 0.5,
      holdSpeed: 3,
      holdDelayMs: 500,
      showIndicator: false,
      locale: 'en',
      theme: 'dark',
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        speedUp: { ...DEFAULT_SETTINGS.bindings.speedUp, code: 'KeyS', key: 's' },
      },
      blacklist: [{ host: 'youtube.com', enabled: true }],
    })

    const restored = reduceEditor(customized, { type: 'reset-section', section: 'quickControls' })

    expect(restored.state.settings).toEqual({
      ...customized.settings,
      minimumSpeed: DEFAULT_SETTINGS.minimumSpeed,
      maximumSpeed: DEFAULT_SETTINGS.maximumSpeed,
      speedStep: DEFAULT_SETTINGS.speedStep,
      holdSpeed: DEFAULT_SETTINGS.holdSpeed,
      holdDelayMs: DEFAULT_SETTINGS.holdDelayMs,
      showIndicator: DEFAULT_SETTINGS.showIndicator,
    })
    expect(restored.state.settings.enabled).toBe(false)
    expect(restored.state.settings.locale).toBe('en')
    expect(restored.state.settings.blacklist).toEqual([{ host: 'youtube.com', enabled: true }])
    expect(restored.effect).toEqual({ type: 'save', settings: restored.state.settings })
  })

  it('clears transient state when restoring shortcuts or blocked sites', () => {
    const recording = reduceEditor(createEditorState(), {
      type: 'start-recording',
      action: 'speedUp',
    }).state
    const shortcuts = reduceEditor(recording, { type: 'reset-section', section: 'shortcuts' })
    expect(shortcuts.state.recordingAction).toBeNull()
    expect(shortcuts.state.settings.bindings).toEqual(DEFAULT_SETTINGS.bindings)

    const blacklistState = {
      ...createEditorState({
        ...DEFAULT_SETTINGS,
        blacklist: [{ host: 'youtube.com', enabled: true }],
      }),
      blacklistDraft: 'example.com',
      blacklistError: 'duplicate' as const,
    }
    const blockedSites = reduceEditor(blacklistState, {
      type: 'reset-section',
      section: 'blockedSites',
    })
    expect(blockedSites.state.settings.blacklist).toEqual([])
    expect(blockedSites.state.blacklistDraft).toBe('')
    expect(blockedSites.state.blacklistError).toBeNull()
  })
})
