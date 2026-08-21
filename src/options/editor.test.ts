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

  it('commits target speed above the step-adjustment maximum', () => {
    const state = createEditorState({
      ...DEFAULT_SETTINGS,
      minimumSpeed: 0.5,
      maximumSpeed: 2,
    })
    const committed = reduceEditor(
      reduceEditor(state, { type: 'set-number-draft', id: 'targetSpeed', value: '3' }).state,
      { type: 'commit-number', id: 'targetSpeed' }
    )

    expect(committed.state.settings.targetSpeed).toBe(3)
    expect(committed.state.draftNumbers.targetSpeed).toBe('3')
  })

  it('keeps a conflicting shortcut in recording mode and saves a valid capture', () => {
    const state = reduceEditor(createEditorState(), { type: 'start-recording', action: 'speedUp' }).state
    const targetConflict = reduceEditor(state, {
      type: 'capture-binding',
      binding: DEFAULT_SETTINGS.bindings.toggleTargetSpeed,
    })

    expect(targetConflict.state.recordingAction).toBe('speedUp')
    expect(targetConflict.state.shortcutConflict).toBe('toggleTargetSpeed')

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
    const invalid = reduceEditor(createEditorState(), { type: 'add-site-rules' })
    expect(invalid.state.siteRulesError).toEqual({ key: 'invalid', line: 1 })

    const withDraft = reduceEditor(createEditorState(), {
      type: 'set-site-rules-draft',
      value: 'https://YouTube.com/watch?v=1',
    }).state
    const added = reduceEditor(withDraft, { type: 'add-site-rules' })
    expect(added.state.settings.siteRules).toEqual([
      { host: 'youtube.com', enabled: false, targetSpeed: null, showIndicator: null },
    ])
    expect(added.state.siteRulesDraft).toBe('https://YouTube.com/watch?v=1')
    expect(added.effect?.siteRulesDraft).toBe('https://YouTube.com/watch?v=1')
    expect(reduceEditor(added.state, {
      type: 'save-succeeded',
      siteRulesDraft: added.effect?.siteRulesDraft,
    }).state.siteRulesDraft).toBe('')

    const duplicate = reduceEditor(
      reduceEditor(added.state, { type: 'set-site-rules-draft', value: 'youtube.com' }).state,
      { type: 'add-site-rules' }
    )
    expect(duplicate.state.siteRulesError).toEqual({ key: 'duplicate', line: 1 })

    const duplicateWithinDraft = reduceEditor(
      reduceEditor(createEditorState(), {
        type: 'set-site-rules-draft',
        value: 'youtube.com\nhttps://youtube.com/watch',
      }).state,
      { type: 'add-site-rules' }
    )
    expect(duplicateWithinDraft.state.siteRulesError).toEqual({ key: 'duplicate', line: 2 })
    expect(duplicateWithinDraft.state.settings.siteRules).toEqual([])

    const multipleDrafts = reduceEditor(createEditorState(), {
      type: 'set-site-rules-draft',
      value: 'youtube.com\nhttps://Example.com/watch\n',
    }).state
    const multiple = reduceEditor(multipleDrafts, { type: 'add-site-rules' })
    expect(multiple.state.settings.siteRules).toEqual([
      { host: 'youtube.com', enabled: false, targetSpeed: null, showIndicator: null },
      { host: 'example.com', enabled: false, targetSpeed: null, showIndicator: null },
    ])
    expect(multiple.effect?.type).toBe('save')

    const customized = reduceEditor(multiple.state, {
      type: 'patch-site-rule',
      host: 'youtube.com',
      changes: { enabled: false, targetSpeed: 1.5, showIndicator: false },
    })
    expect(customized.state.settings.siteRules.find(entry => entry.host === 'youtube.com')).toEqual({
      host: 'youtube.com',
      enabled: false,
      targetSpeed: 1.5,
      showIndicator: false,
    })

    const batchEdited = reduceEditor(customized.state, {
      type: 'patch-site-rules',
      hosts: ['youtube.com', 'example.com'],
      changes: { enabled: true, targetSpeed: 1.75, showIndicator: true },
    })
    expect(batchEdited.state.settings.siteRules).toEqual([
      { host: 'example.com', enabled: true, targetSpeed: 1.75, showIndicator: true },
      { host: 'youtube.com', enabled: true, targetSpeed: 1.75, showIndicator: true },
    ])
    expect(batchEdited.effect).toEqual({ type: 'save', settings: batchEdited.state.settings })

    const configured = reduceEditor(
      reduceEditor(createEditorState(), {
        type: 'set-site-rules-draft',
        value: 'video.example.com',
      }).state,
      {
        type: 'add-site-rules',
        rule: { enabled: true, targetSpeed: 1.5, showIndicator: false },
      }
    )
    expect(configured.state.settings.siteRules).toEqual([{
      host: 'video.example.com',
      enabled: true,
      targetSpeed: 1.5,
      showIndicator: false,
    }])

    const partiallyInvalid = reduceEditor(
      reduceEditor(createEditorState(), {
        type: 'set-site-rules-draft',
        value: 'youtube.com\nnot-a-domain',
      }).state,
      { type: 'add-site-rules' }
    )
    expect(partiallyInvalid.state.siteRulesError).toEqual({ key: 'invalid', line: 2 })
    expect(partiallyInvalid.state.settings.siteRules).toEqual([])
    expect(partiallyInvalid.effect).toBeUndefined()

    const removed = reduceEditor(multiple.state, {
      type: 'remove-site-rules',
      hosts: ['youtube.com', 'example.com'],
    })
    expect(removed.state.settings.siteRules).toEqual([])
    expect(removed.effect?.type).toBe('save')
  })

  it('keeps save status transitions separate from the edit policy', () => {
    const failed = reduceEditor(createEditorState(), { type: 'save-failed' })
    expect(failed.state.statusKey).toBe('saveFailed')
    expect(reduceEditor(failed.state, { type: 'save-succeeded' }).state.statusKey).toBe('autoSave')
  })

  it('keeps a submitted site-rule draft available when saving fails', () => {
    const draft = 'youtube.com\nexample.com'
    const withDraft = reduceEditor(createEditorState(), {
      type: 'set-site-rules-draft',
      value: draft,
    }).state

    const submitted = reduceEditor(withDraft, { type: 'add-site-rules' })
    const failed = reduceEditor(submitted.state, { type: 'save-failed' })

    expect(failed.state.siteRulesDraft).toBe(draft)
    expect(failed.state.statusKey).toBe('saveFailed')
  })

  it('restores only the requested settings section', () => {
    const customized = createEditorState({
      ...DEFAULT_SETTINGS,
      enabled: false,
      minimumSpeed: 0.5,
      maximumSpeed: 8,
      speedStep: 0.5,
      targetSpeed: 3,
      holdSpeed: 3,
      holdDelayMs: 500,
      showIndicator: false,
      locale: 'en',
      theme: 'dark',
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        speedUp: { ...DEFAULT_SETTINGS.bindings.speedUp, code: 'KeyS', key: 's' },
      },
      shortcutEnabled: {
        ...DEFAULT_SETTINGS.shortcutEnabled,
        speedUp: false,
      },
      siteRules: [{ host: 'youtube.com', enabled: true, targetSpeed: null, showIndicator: null }],
    })

    const restored = reduceEditor(customized, { type: 'reset-section', section: 'quickControls' })

    expect(restored.state.settings).toEqual({
      ...customized.settings,
      minimumSpeed: DEFAULT_SETTINGS.minimumSpeed,
      maximumSpeed: DEFAULT_SETTINGS.maximumSpeed,
      speedStep: DEFAULT_SETTINGS.speedStep,
      targetSpeed: DEFAULT_SETTINGS.targetSpeed,
      holdSpeed: DEFAULT_SETTINGS.holdSpeed,
      holdDelayMs: DEFAULT_SETTINGS.holdDelayMs,
      showIndicator: false,
    })
    expect(restored.state.settings.enabled).toBe(false)
    expect(restored.state.settings.locale).toBe('en')
    expect(restored.state.settings.siteRules).toEqual([
      { host: 'youtube.com', enabled: true, targetSpeed: null, showIndicator: null },
    ])
    expect(restored.effect).toEqual({ type: 'save', settings: restored.state.settings })
  })

  it('clears transient state when restoring shortcuts', () => {
    const recording = reduceEditor(createEditorState(), {
      type: 'start-recording',
      action: 'speedUp',
    }).state
    const shortcuts = reduceEditor(recording, { type: 'reset-section', section: 'shortcuts' })
    expect(shortcuts.state.recordingAction).toBeNull()
    expect(shortcuts.state.settings.bindings).toEqual(DEFAULT_SETTINGS.bindings)
    expect(shortcuts.state.settings.shortcutEnabled).toEqual(DEFAULT_SETTINGS.shortcutEnabled)
  })

  it('replaces all settings and clears transient editor state after an import succeeds', () => {
    let state = reduceEditor(createEditorState(), {
      type: 'start-recording',
      action: 'speedUp',
    }).state
    state = reduceEditor(state, {
      type: 'capture-binding',
      binding: DEFAULT_SETTINGS.bindings.speedDown,
    }).state
    state = reduceEditor(state, { type: 'set-site-rules-draft', value: 'not-a-domain' }).state
    state = reduceEditor(state, { type: 'add-site-rules' }).state
    state = reduceEditor(state, { type: 'save-failed' }).state

    const imported = {
      ...DEFAULT_SETTINGS,
      enabled: false,
      locale: 'en' as const,
      theme: 'dark' as const,
      siteRules: [{ host: 'youtube.com', enabled: true, targetSpeed: 1.5, showIndicator: false }],
    }
    const replaced = reduceEditor(state, {
      type: 'replace-settings-succeeded',
      settings: imported,
    })

    expect(replaced.effect).toBeUndefined()
    expect(replaced.state.settings).toEqual(imported)
    expect(replaced.state.recordingAction).toBeNull()
    expect(replaced.state.shortcutConflict).toBeNull()
    expect(replaced.state.siteRulesDraft).toBe('')
    expect(replaced.state.siteRulesError).toBeNull()
    expect(replaced.state.statusKey).toBe('autoSave')
    expect(replaced.state.draftNumbers.targetSpeed).toBe(String(imported.targetSpeed))
  })
})
