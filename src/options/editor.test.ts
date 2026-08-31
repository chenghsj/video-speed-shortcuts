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

  it('keeps shortcut captures as a draft until explicitly saved', () => {
    const state = reduceEditor(createEditorState(), {
      type: 'start-recording',
      action: 'speedUp',
    }).state
    expect(state.recordingDraft).toEqual(DEFAULT_SETTINGS.bindings.speedUp)

    const targetConflict = reduceEditor(state, {
      type: 'capture-binding',
      binding: DEFAULT_SETTINGS.bindings.toggleTargetSpeed,
    })

    expect(targetConflict.state.recordingAction).toBe('speedUp')
    expect(targetConflict.state.recordingDraft).toEqual(DEFAULT_SETTINGS.bindings.toggleTargetSpeed)
    expect(targetConflict.state.shortcutConflict).toBe('toggleTargetSpeed')

    const conflict = reduceEditor(state, {
      type: 'capture-binding',
      binding: DEFAULT_SETTINGS.bindings.speedDown,
    })

    expect(conflict.state.recordingAction).toBe('speedUp')
    expect(conflict.state.recordingDraft).toEqual(DEFAULT_SETTINGS.bindings.speedDown)
    expect(conflict.state.shortcutConflict).toBe('speedDown')
    expect(conflict.effect).toBeUndefined()

    const blockedSave = reduceEditor(conflict.state, {
      type: 'save-recording',
    })
    expect(blockedSave.state).toBe(conflict.state)
    expect(blockedSave.effect).toBeUndefined()

    const binding = {
      ...DEFAULT_SETTINGS.bindings.speedUp,
      code: 'KeyS',
      key: 's',
    }
    const captured = reduceEditor(conflict.state, {
      type: 'capture-binding',
      binding,
    })
    expect(captured.state.recordingAction).toBe('speedUp')
    expect(captured.state.recordingDraft).toEqual(binding)
    expect(captured.state.shortcutConflict).toBeNull()
    expect(captured.state.settings.bindings.speedUp).toEqual(DEFAULT_SETTINGS.bindings.speedUp)
    expect(captured.effect).toBeUndefined()

    const saved = reduceEditor(captured.state, { type: 'save-recording' })
    expect(saved.state.recordingAction).toBe('speedUp')
    expect(saved.state.recordingDraft).toEqual(binding)
    expect(saved.state.settings.bindings.speedUp).toEqual(binding)
    expect(saved.effect?.type).toBe('save')

    const completed = reduceEditor(saved.state, {
      type: 'save-succeeded',
      recording: saved.effect?.recording,
    })
    expect(completed.state.recordingAction).toBeNull()
    expect(completed.state.recordingDraft).toBeNull()
  })

  it('restores or cancels a shortcut recording draft without saving', () => {
    const recording = reduceEditor(createEditorState(), {
      type: 'start-recording',
      action: 'speedUp',
    }).state
    const changed = reduceEditor(recording, {
      type: 'capture-binding',
      binding: { ...DEFAULT_SETTINGS.bindings.speedUp, code: 'KeyS', key: 's' },
    }).state

    const restored = reduceEditor(changed, { type: 'restore-recording' })
    expect(restored.state.recordingDraft).toEqual(DEFAULT_SETTINGS.bindings.speedUp)
    expect(restored.state.shortcutConflict).toBeNull()
    expect(restored.effect).toBeUndefined()

    const cancelled = reduceEditor(changed, { type: 'cancel-recording' })
    expect(cancelled.state.recordingAction).toBeNull()
    expect(cancelled.state.recordingDraft).toBeNull()
    expect(cancelled.state.settings.bindings.speedUp).toEqual(DEFAULT_SETTINGS.bindings.speedUp)
    expect(cancelled.effect).toBeUndefined()
  })

  it('adopts a synced binding when the recording draft is untouched', () => {
    const syncedBinding = {
      ...DEFAULT_SETTINGS.bindings.speedUp,
      code: 'KeyS',
      key: 's',
    }
    const recording = reduceEditor(createEditorState(), {
      type: 'start-recording',
      action: 'speedUp',
    }).state

    const synced = reduceEditor(recording, {
      type: 'settings-changed',
      settings: {
        ...recording.settings,
        bindings: {
          ...recording.settings.bindings,
          speedUp: syncedBinding,
        },
      },
    }).state

    expect(synced.recordingDraft).toEqual(syncedBinding)

    const saved = reduceEditor(synced, { type: 'save-recording' })
    expect(saved.state.settings.bindings.speedUp).toEqual(syncedBinding)
  })

  it('preserves an edited recording draft when the same binding syncs externally', () => {
    const draft = {
      ...DEFAULT_SETTINGS.bindings.speedUp,
      code: 'KeyD',
      key: 'd',
    }
    const recording = reduceEditor(createEditorState(), {
      type: 'start-recording',
      action: 'speedUp',
    }).state
    const captured = reduceEditor(recording, {
      type: 'capture-binding',
      binding: draft,
    }).state

    const synced = reduceEditor(captured, {
      type: 'settings-changed',
      settings: {
        ...captured.settings,
        bindings: {
          ...captured.settings.bindings,
          speedUp: {
            ...DEFAULT_SETTINGS.bindings.speedUp,
            code: 'KeyS',
            key: 's',
          },
        },
      },
    }).state

    expect(synced.recordingDraft).toEqual(draft)
  })

  it('rechecks a recording draft against the latest settings before saving', () => {
    const draft = {
      ...DEFAULT_SETTINGS.bindings.speedUp,
      code: 'KeyS',
      key: 's',
    }
    const recording = reduceEditor(createEditorState(), {
      type: 'start-recording',
      action: 'speedUp',
    }).state
    const captured = reduceEditor(recording, {
      type: 'capture-binding',
      binding: draft,
    }).state
    const externallyChanged = reduceEditor(captured, {
      type: 'settings-changed',
      settings: {
        ...captured.settings,
        bindings: {
          ...captured.settings.bindings,
          speedDown: draft,
        },
      },
    }).state

    expect(externallyChanged.shortcutConflict).toBe('speedDown')

    const saved = reduceEditor(externallyChanged, { type: 'save-recording' })

    expect(saved.state.recordingAction).toBe('speedUp')
    expect(saved.state.recordingDraft).toEqual(draft)
    expect(saved.state.shortcutConflict).toBe('speedDown')
    expect(saved.state.settings.bindings.speedUp).toEqual(DEFAULT_SETTINGS.bindings.speedUp)
    expect(saved.effect).toBeUndefined()
  })

  it('clears a recording conflict when synced settings free the draft binding', () => {
    const recording = reduceEditor(createEditorState(), {
      type: 'start-recording',
      action: 'speedUp',
    }).state
    const conflicting = reduceEditor(recording, {
      type: 'capture-binding',
      binding: DEFAULT_SETTINGS.bindings.speedDown,
    }).state

    const externallyChanged = reduceEditor(conflicting, {
      type: 'settings-changed',
      settings: {
        ...conflicting.settings,
        bindings: {
          ...conflicting.settings.bindings,
          speedDown: {
            ...DEFAULT_SETTINGS.bindings.speedDown,
            code: 'KeyD',
            key: 'd',
          },
        },
      },
    }).state

    expect(externallyChanged.shortcutConflict).toBeNull()
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

  it('keeps a submitted shortcut draft available when saving fails', () => {
    const binding = {
      ...DEFAULT_SETTINGS.bindings.speedUp,
      code: 'KeyS',
      key: 's',
    }
    const recording = reduceEditor(createEditorState(), {
      type: 'start-recording',
      action: 'speedUp',
    }).state
    const captured = reduceEditor(recording, {
      type: 'capture-binding',
      binding,
    }).state
    const submitted = reduceEditor(captured, { type: 'save-recording' })

    const failed = reduceEditor(submitted.state, { type: 'save-failed' })

    expect(failed.state.recordingAction).toBe('speedUp')
    expect(failed.state.recordingDraft).toEqual(binding)
    expect(failed.state.statusKey).toBe('saveFailed')
  })

  it('does not close a newer recording when an older save succeeds', () => {
    const firstRecording = reduceEditor(createEditorState(), {
      type: 'start-recording',
      action: 'speedUp',
    }).state
    const submitted = reduceEditor(firstRecording, { type: 'save-recording' })
    const cancelled = reduceEditor(submitted.state, { type: 'cancel-recording' }).state
    const reopened = reduceEditor(cancelled, {
      type: 'start-recording',
      action: 'speedUp',
    }).state

    const staleSuccess = reduceEditor(reopened, {
      type: 'save-succeeded',
      recording: submitted.effect?.recording,
    })

    expect(staleSuccess.state.recordingAction).toBe('speedUp')
    expect(staleSuccess.state.recordingDraft).toEqual(reopened.recordingDraft)
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
    expect(shortcuts.state.recordingDraft).toBeNull()
    expect(shortcuts.state.settings.bindings).toEqual(DEFAULT_SETTINGS.bindings)
    expect(shortcuts.state.settings.shortcutEnabled).toEqual(DEFAULT_SETTINGS.shortcutEnabled)
  })

  it('restores only the requested shortcut binding and enabled state', () => {
    const customized = createEditorState({
      ...DEFAULT_SETTINGS,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        speedUp: {
          ...DEFAULT_SETTINGS.bindings.speedUp,
          code: 'KeyS',
          key: 's',
        },
        speedDown: {
          ...DEFAULT_SETTINGS.bindings.speedDown,
          code: 'KeyD',
          key: 'd',
        },
      },
      shortcutEnabled: {
        ...DEFAULT_SETTINGS.shortcutEnabled,
        speedUp: false,
        speedDown: false,
      },
    })

    const restored = reduceEditor(customized, {
      type: 'reset-shortcut',
      action: 'speedUp',
    })

    expect(restored.state.settings.bindings.speedUp).toEqual(DEFAULT_SETTINGS.bindings.speedUp)
    expect(restored.state.settings.shortcutEnabled.speedUp).toBe(DEFAULT_SETTINGS.shortcutEnabled.speedUp)
    expect(restored.state.settings.bindings.speedDown).toEqual(customized.settings.bindings.speedDown)
    expect(restored.state.settings.shortcutEnabled.speedDown).toBe(false)
    expect(restored.effect).toEqual({
      type: 'save',
      settings: restored.state.settings,
    })
  })

  it('opens a conflicting default binding as a recording draft instead of saving a duplicate', () => {
    const customized = createEditorState({
      ...DEFAULT_SETTINGS,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        speedUp: {
          ...DEFAULT_SETTINGS.bindings.speedUp,
          code: 'KeyS',
          key: 's',
        },
        speedDown: structuredClone(DEFAULT_SETTINGS.bindings.speedUp),
      },
    })

    const restored = reduceEditor(customized, {
      type: 'reset-shortcut',
      action: 'speedUp',
    })

    expect(restored.state.settings).toBe(customized.settings)
    expect(restored.state.recordingAction).toBe('speedUp')
    expect(restored.state.recordingDraft).toEqual(DEFAULT_SETTINGS.bindings.speedUp)
    expect(restored.state.shortcutConflict).toBe('speedDown')
    expect(restored.effect).toBeUndefined()
  })

  it('keeps the saved enabled state after restoring a conflicting reset draft', () => {
    const customized = createEditorState({
      ...DEFAULT_SETTINGS,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        speedUp: {
          ...DEFAULT_SETTINGS.bindings.speedUp,
          code: 'KeyS',
          key: 's',
        },
        speedDown: structuredClone(DEFAULT_SETTINGS.bindings.speedUp),
      },
      shortcutEnabled: {
        ...DEFAULT_SETTINGS.shortcutEnabled,
        speedUp: false,
      },
    })
    const resetting = reduceEditor(customized, {
      type: 'reset-shortcut',
      action: 'speedUp',
    }).state
    const restored = reduceEditor(resetting, { type: 'restore-recording' }).state

    const saved = reduceEditor(restored, { type: 'save-recording' })

    expect(saved.state.settings.bindings.speedUp).toEqual(customized.settings.bindings.speedUp)
    expect(saved.state.settings.shortcutEnabled.speedUp).toBe(false)
  })

  it('restores the enabled default after resolving a reset binding conflict', () => {
    const customized = createEditorState({
      ...DEFAULT_SETTINGS,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        speedUp: {
          ...DEFAULT_SETTINGS.bindings.speedUp,
          code: 'KeyS',
          key: 's',
        },
        speedDown: structuredClone(DEFAULT_SETTINGS.bindings.speedUp),
      },
      shortcutEnabled: {
        ...DEFAULT_SETTINGS.shortcutEnabled,
        speedUp: false,
      },
    })
    const resetting = reduceEditor(customized, {
      type: 'reset-shortcut',
      action: 'speedUp',
    }).state
    const resolved = reduceEditor(resetting, {
      type: 'capture-binding',
      binding: {
        ...DEFAULT_SETTINGS.bindings.speedUp,
        code: 'KeyU',
        key: 'u',
      },
    }).state

    const saved = reduceEditor(resolved, { type: 'save-recording' })

    expect(saved.state.settings.shortcutEnabled.speedUp).toBe(
      DEFAULT_SETTINGS.shortcutEnabled.speedUp
    )
    expect(saved.effect).toEqual({
      type: 'save',
      settings: saved.state.settings,
      recording: {
        action: 'speedUp',
        binding: resolved.recordingDraft,
        revision: resolved.recordingRevision,
      },
    })
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
    expect(replaced.state.recordingDraft).toBeNull()
    expect(replaced.state.shortcutConflict).toBeNull()
    expect(replaced.state.siteRulesDraft).toBe('')
    expect(replaced.state.siteRulesError).toBeNull()
    expect(replaced.state.statusKey).toBe('autoSave')
    expect(replaced.state.draftNumbers.targetSpeed).toBe(String(imported.targetSpeed))
  })
})
